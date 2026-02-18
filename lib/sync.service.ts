import { Platform } from 'react-native';
import { getSyncStatus, manualSync, stopAutoSync, sync } from './database';

// Track network status
let isOnline = true;
let networkUnsubscribe: (() => void) | null = null;
let NetInfo: any = null;

// Sync queue for offline operations
interface QueuedOperation {
    id: string;
    timestamp: number;
    operation: () => Promise<any>;
    retries: number;
}

const syncQueue: QueuedOperation[] = [];
const MAX_RETRIES = 3;

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

            // When coming back online, trigger sync
            if (wasOffline && isOnline) {
                console.log('🔄 Back online, triggering sync...');
                handleOnlineSync();
            }
        });

        // Get initial network status
        const state = await NetInfo.fetch();
        isOnline = state.isConnected ?? false;

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
    stopAutoSync();
    console.log('🛑 Sync manager cleaned up');
}

/**
 * Handle sync when device comes back online
 */
async function handleOnlineSync() {
    try {
        // Sync with cloud
        const result = await sync();

        if (result.success) {
            console.log('✅ Online sync successful');
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
