import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { DeviceEventEmitter, Platform } from 'react-native';
import { flushPendingWrites, getSyncStatus, manualSync, query, stopAutoSync, sync } from './database';

// Tracking variables
let isOnline = true;
let networkUnsubscribe: (() => void) | null = null;
let NetInfo: any = null;
let autoSyncInterval: ReturnType<typeof setInterval> | null = null;

// Sync queue for offline operations
interface QueuedOperation {
    id: string;
    timestamp: number;
    operation: () => Promise<any>;
    retries: number;
}

const syncQueue: QueuedOperation[] = [];
const MAX_RETRIES = 3;
const AUTO_SYNC_INTERVAL_MS = 30000; // 30 seconds
const LAST_ALERT_ID_KEY = 'bloodconnect_last_alert_id';
const LAST_CASE_ID_KEY = 'bloodconnect_last_emergency_case_id';
const LAST_EVENT_ID_KEY = 'bloodconnect_last_event_id';

// Add session-level tracking to prevent duplicate firing within the same app session
const sessionAlertedIds = new Set<string>();

/**
 * Initialize network monitoring and sync management
 */
export async function initializeSyncManager() {
    if (Platform.OS === 'web') {
        console.log('⚠️ Sync manager not available on web');
        return;
    }

    try {
        // Lazy load NetInfo to avoid crashes if native module is missing
        NetInfo = require('@react-native-community/netinfo').default;

        // Monitor network status
        networkUnsubscribe = NetInfo.addEventListener((state: any) => {
            const wasOffline = !isOnline;
            isOnline = state.isConnected ?? false;

            console.log(`📡 Network status: ${isOnline ? 'Online' : 'Offline'}`);

            // Emit events for UI consumers
            DeviceEventEmitter.emit(isOnline ? 'network_online' : 'network_offline');

            // When coming back online, trigger sync
            if (wasOffline && isOnline) {
                console.log('🔄 Back online, triggering sync...');
                handleOnlineSync();
            }
        });

        // Get initial network status
        const state = await NetInfo.fetch();
        isOnline = state.isConnected ?? false;

        // Set up the interval for auto sync every 30 seconds
        if (!autoSyncInterval) {
            autoSyncInterval = setInterval(() => {
                if (isOnline) {
                    console.log('🔄 Running scheduled auto-sync...');
                    handleOnlineSync();
                }
            }, AUTO_SYNC_INTERVAL_MS);
        }

        console.log('✅ Sync manager initialized');
    } catch (e) {
        console.warn('⚠️ NetInfo module not found or failed to initialize. Sync will default to online mode, but auto-detection may fail. Please rebuild the app.');
        console.error(e);
        isOnline = true; // Default to assuming online if check fails
    }
}

/**
 * Cleanup sync manager
 */
export function cleanupSyncManager() {
    if (networkUnsubscribe) {
        networkUnsubscribe();
        networkUnsubscribe = null;
    }
    if (autoSyncInterval) {
        clearInterval(autoSyncInterval);
        autoSyncInterval = null;
    }
    stopAutoSync();
    console.log('🛑 Sync manager cleaned up');
}

/**
 * Handle sync when device comes back online
 */
async function handleOnlineSync() {
    try {
        // First, flush any writes that were queued while offline
        await flushPendingWrites();

        // Sync with cloud (pulls remote → local)
        const result = await sync();

        if (result.success) {
            console.log('✅ Online sync successful');
            // Notify the UI to refresh without user interaction
            DeviceEventEmitter.emit('db_synced');

            // Check for new emergency data to trigger OS notifications
            console.log('🔍 Checking for new emergency alerts/cases/camps...');
            await checkForNewEmergencyAlerts();
            await checkForNewCamps();

            // Process any queued operations
            await processQueue();
        }
    } catch (e) {
        console.error('❌ Online sync failed:', e);
    }
}

/**
 * Add operation to sync queue (for manual retry logic)
 */
export function queueOperation(operation: () => Promise<any>): string {
    const id = `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    syncQueue.push({
        id,
        timestamp: Date.now(),
        operation,
        retries: 0,
    });

    console.log(`📝 Operation queued: ${id}`);

    // Try to process immediately if online
    if (isOnline) {
        processQueue();
    }

    return id;
}

/**
 * Process queued operations
 */
async function processQueue() {
    if (syncQueue.length === 0) {
        return;
    }

    console.log(`🔄 Processing ${syncQueue.length} queued operations...`);

    const operations = [...syncQueue];
    syncQueue.length = 0; // Clear queue

    for (const op of operations) {
        try {
            await op.operation();
            console.log(`✅ Queued operation ${op.id} completed`);
        } catch (e) {
            console.error(`❌ Queued operation ${op.id} failed:`, e);

            // Retry logic
            if (op.retries < MAX_RETRIES) {
                op.retries++;
                syncQueue.push(op);
                console.log(`🔄 Requeued operation ${op.id} (retry ${op.retries}/${MAX_RETRIES})`);
            } else {
                console.error(`❌ Operation ${op.id} failed after ${MAX_RETRIES} retries`);
            }
        }
    }
}

/**
 * Checks for new notifications of type 'emergency' that haven't been alerted yet
 */
async function checkForNewEmergencyAlerts() {
    try {
        const lastAlertedId = await AsyncStorage.getItem(LAST_ALERT_ID_KEY);
        const lastCaseId = await AsyncStorage.getItem(LAST_CASE_ID_KEY);

        // 1. Check for dedicated emergency notifications
        const notifResult = await query(
            "SELECT id, title, body, created_at FROM notifications WHERE type = 'emergency' ORDER BY created_at DESC LIMIT 1"
        );

        if (notifResult.rows.length > 0) {
            const latest = notifResult.rows[0] as any;

            // Validate "Freshness" — don't alert on old data (older than 15 mins)
            const createdTime = new Date(latest.created_at).getTime();
            const now = Date.now();
            const IS_FRESH = (now - createdTime) < 15 * 60 * 1000;

            if (latest.id !== lastAlertedId && !sessionAlertedIds.has(latest.id) && IS_FRESH) {
                console.log(`🚨 ALERTING NOTIFICATION: ${latest.title}`);

                // Clean title - don't add sirens if they already exist
                const cleanTitle = latest.title.startsWith('🚨') ? latest.title : `🚨 ${latest.title}`;

                await Notifications.scheduleNotificationAsync({
                    content: {
                        title: cleanTitle,
                        body: latest.body,
                        sound: 'default',
                        data: {
                            type: 'emergency_broadcast',
                            id: latest.id,
                            url: '/notifications' // Generic link to inbox
                        },
                        ...(Platform.OS === 'android' && { channelId: 'emergency' }),
                    },
                    trigger: null,
                });

                sessionAlertedIds.add(latest.id);
                await AsyncStorage.setItem(LAST_ALERT_ID_KEY, latest.id);
                return; // Only one emergency alert per sync is usually plenty
            }
        }

        // 2. Fallback: Check for critical helpline cases if no notification broadcast exists
        const caseResult = await query(
            "SELECT id, patient_name, blood_group, hospital, created_at FROM helpline_requests WHERE urgency = 'critical' ORDER BY created_at DESC LIMIT 1"
        );

        if (caseResult.rows.length > 0) {
            const latest = caseResult.rows[0] as any;
            const createdTime = new Date(latest.created_at).getTime();
            const IS_FRESH = (Date.now() - createdTime) < 15 * 60 * 1000;

            if (latest.id !== lastCaseId && !sessionAlertedIds.has(latest.id) && IS_FRESH) {
                console.log(`🚨 ALERTING CRITICAL CASE: ${latest.patient_name}`);

                await Notifications.scheduleNotificationAsync({
                    content: {
                        title: '🚨 CRITICAL: Blood Requirement',
                        body: `Emergency: ${latest.blood_group} for ${latest.patient_name} at ${latest.hospital}.`,
                        sound: 'default',
                        data: {
                            type: 'critical_case',
                            id: latest.id,
                            url: `/request-details?id=${latest.id}`
                        },
                        ...(Platform.OS === 'android' && { channelId: 'emergency' }),
                    },
                    trigger: null,
                });

                sessionAlertedIds.add(latest.id);
                await AsyncStorage.setItem(LAST_CASE_ID_KEY, latest.id);
            }
        }
    } catch (e) {
        console.error('❌ Error checking alerts:', e);
    }
}

/**
 * Checks for new blood donation camps
 */
async function checkForNewCamps() {
    try {
        const lastEventId = await AsyncStorage.getItem(LAST_EVENT_ID_KEY);

        // Find latest camp (event)
        const result = await query(
            "SELECT id, location, city, event_date, created_at FROM events ORDER BY created_at DESC LIMIT 1"
        );

        if (result.rows.length === 0) return;

        const latest = result.rows[0] as any;
        const createdDate = new Date(latest.created_at || Date.now()).getTime();
        const IS_RECENT = (Date.now() - createdDate) < 24 * 60 * 60 * 1000; // Within 24 hours for camps

        if (latest.id !== lastEventId && IS_RECENT) {
            console.log(`🏕️ New Camp detected: ${latest.location}`);

            await Notifications.scheduleNotificationAsync({
                content: {
                    title: '🏕️ New Blood Donation Camp!',
                    body: `A new camp is scheduled at ${latest.location}, ${latest.city} on ${latest.event_date}.`,
                    data: {
                        type: 'new_camp',
                        id: latest.id,
                        url: `/event-details?id=${latest.id}`
                    },
                    sound: 'default',
                },
                trigger: null,
            });

            await AsyncStorage.setItem(LAST_EVENT_ID_KEY, latest.id);
        }
    } catch (e) {
        console.error('❌ Error checking new camps:', e);
    }
}

/**
 * Marks a notification/case ID as already alerted locally
 */
export async function markNotificationAsAlerted(id: string, key: string = LAST_ALERT_ID_KEY) {
    sessionAlertedIds.add(id);
    await AsyncStorage.setItem(key, id);
}

/**
 * Get current sync state
 */
export function getSyncState() {
    const status = getSyncStatus();

    return {
        isOnline,
        queuedOperations: syncQueue.length,
        ...status,
    };
}

/**
 * Force manual sync (for pull-to-refresh)
 */
export async function forceSyncNow() {
    if (!isOnline) {
        throw new Error('Cannot sync while offline');
    }

    return await manualSync();
}

/**
 * Check if device is online
 */
export function isDeviceOnline(): boolean {
    return isOnline;
}
