import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { execute, query } from './database';
import { generateUniqueId } from './id';
import { markNotificationAsAlerted } from './sync.service';

// ─── Notification Handler (controls how notifications appear when app is foreground) ─

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

// ─── Notification Channels (Android) ────────────────────────────────

export async function setupNotificationChannels() {
    if (Platform.OS !== 'android') return;

    await Notifications.setNotificationChannelAsync('default', {
        name: 'General Notifications',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('emergency', {
        name: 'Emergency Alerts',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 200, 500],
        lightColor: '#FF3B30',
        sound: 'default',
        enableLights: true,
        enableVibrate: true,
    });

    await Notifications.setNotificationChannelAsync('updates', {
        name: 'Task & Status Updates',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF9500',
        sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('sync', {
        name: 'Sync Notifications',
        importance: Notifications.AndroidImportance.LOW,
        sound: null,
    });
}

// ─── Push Token Registration ────────────────────────────────────────

export async function registerForPushNotificationsAsync() {
    let token;

    // Set up Android channels
    await setupNotificationChannels();

    if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
        if (finalStatus !== 'granted') {
            console.log('Push notification permission not granted');
            return;
        }
        try {
            const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
            if (!projectId) {
                console.log('Project ID not found in expo config. Push tokens might fail.');
            }
            token = (await Notifications.getExpoPushTokenAsync({
                projectId
            })).data;
            console.log("📱 Expo Push Token:", token);
        } catch (e) {
            console.log('Failed to get push token:', e);
        }
    } else {
        console.log('Must use physical device for Push Notifications');
    }

    return token;
}

// ─── Local Notification Triggers ────────────────────────────────────

export async function sendLocalNotification(title: string, body: string, userId?: string, data: Record<string, any> = {}) {
    // 1. Show the OS notification
    await Notifications.scheduleNotificationAsync({
        content: {
            title,
            body,
            data: { ...data, userId },
            sound: 'default',
            ...(Platform.OS === 'android' && { channelId: 'default' }),
        },
        trigger: null, // immediate
    });

    // 2. Save to Inbox for UI
    await saveNotificationToInbox(title, body, data.type || 'general', userId, data.reference_id);
}

// Specific notification types for key app events:

export async function notifyEventCreated(eventTitle: string, eventId: string, userId?: string, userRole: string = 'admin') {
    const isSpecialAction = userRole === 'admin';
    const title = isSpecialAction ? '🚀 Admin: New Camp Approved' : '📅 New Blood Drive Created';
    const body = `"${eventTitle}" has been scheduled. Managers and Volunteers have been notified for coordination.`;

    await Notifications.scheduleNotificationAsync({
        content: {
            title,
            body,
            data: {
                type: 'event_created',
                userId,
                reference_id: eventId,
                url: `/event-details?id=${eventId}`
            },
            sound: 'default',
            ...(Platform.OS === 'android' && { channelId: 'updates' }),
        },
        trigger: null,
    });

    await saveNotificationToInbox(title, body, 'event_created', userId, eventId);
}

/**
 * Simulates notifying donors in a specific area
 */
export async function notifyDonorsNearCamp(eventTitle: string, location: string, eventId: string) {
    await Notifications.scheduleNotificationAsync({
        content: {
            title: '🩸 Blood Donation Camp Near You!',
            body: `Help save lives! "${eventTitle}" is coming to ${location}. Are you available to donate ? `,
            data: {
                type: 'near_donor_alert',
                url: `/event-details?id=${eventId}`
            },
            sound: 'default',
            ...(Platform.OS === 'android' && { channelId: 'emergency' }),
        },
        trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: 3, // slightly delayed for realism
        } as any,
    });
}

export async function notifyHelplineRequest(patientName: string, bloodGroup: string, hospital: string, urgency: string, userId?: string, helplineId?: string) {
    const isEmergency = urgency === 'critical';
    const title = isEmergency ? '🚨 SOS: Emergency Blood Request!' : '🩸 New Helpline Case';
    const body = `${patientName} needs ${bloodGroup} blood at ${hospital}. ${isEmergency ? 'CRITICAL — respond now!' : 'Tap to help.'} `;

    await Notifications.scheduleNotificationAsync({
        content: {
            title,
            body,
            data: {
                type: 'helpline_request',
                urgency,
                userId,
                reference_id: helplineId,
                url: `/request-details?id=${helplineId}`
            },
            sound: 'default',
            ...(Platform.OS === 'android' && { channelId: isEmergency ? 'emergency' : 'updates' }),
        },
        trigger: null,
    });

    const notifId = await saveNotificationToInbox(title, body, 'emergency', userId, helplineId);

    // Mark as alerted immediately on this device
    if (notifId) {
        await markNotificationAsAlerted(notifId);
    }
}

export async function notifyHelplineAssigned(caseTitle: string, assigneeName: string, helplineId: string) {
    await Notifications.scheduleNotificationAsync({
        content: {
            title: '👤 Case Assigned to You',
            body: `You've been assigned to help with "${caseTitle}". ${assigneeName}, please respond.`,
            data: {
                type: 'helpline_assigned',
                url: `/request-details?id=${helplineId}`
            },
            sound: 'default',
            ...(Platform.OS === 'android' && { channelId: 'updates' }),
        },
        trigger: null,
    });
}

export async function notifyEventStatusChange(eventTitle: string, newStatus: string, userId?: string) {
    const statusLabels: Record<string, string> = {
        'contacting_poc': 'Contacting POC',
        'lead_received': 'Lead Received',
        'scheduling': 'Being Scheduled',
        'confirmed': 'Confirmed ✅',
        'closed': 'Completed 🎉',
    };
    const title = '📋 Event Status Updated';
    const body = `"${eventTitle}" is now: ${statusLabels[newStatus] || newStatus}`;

    await Notifications.scheduleNotificationAsync({
        content: {
            title,
            body,
            data: { type: 'event_status', status: newStatus, userId },
            sound: 'default',
            ...(Platform.OS === 'android' && { channelId: 'updates' }),
        },
        trigger: null,
    });

    await saveNotificationToInbox(title, body, 'activity', userId);
}

export async function notifySyncComplete(eventCount: number, userId?: string) {
    const title = '🔄 Data Synced';
    const body = `${eventCount} events synced from cloud.`;

    await Notifications.scheduleNotificationAsync({
        content: {
            title,
            body,
            data: { type: 'sync', userId },
            ...(Platform.OS === 'android' && { channelId: 'sync' }),
        },
        trigger: null,
    });

    await saveNotificationToInbox(title, body, 'system', userId);
}

// ─── Schedule a reminder for an upcoming event ──────────────────────

export async function scheduleEventReminder(eventTitle: string, eventDateStr: string, userId?: string) {
    try {
        const eventDate = new Date(eventDateStr + 'T00:00:00');
        const reminderDate = new Date(eventDate.getTime() - 24 * 60 * 60 * 1000); // 1 day before

        if (reminderDate <= new Date()) return; // Don't schedule past reminders

        await Notifications.scheduleNotificationAsync({
            content: {
                title: '⏰ Event Tomorrow!',
                body: `"${eventTitle}" is scheduled for tomorrow. Get ready!`,
                data: { type: 'event_reminder' },
                sound: 'default',
                ...(Platform.OS === 'android' && { channelId: 'updates' }),
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: reminderDate,
            },
        });

        console.log(`📅 Reminder scheduled for ${eventTitle} on ${reminderDate.toISOString()}`);
    } catch (e) {
        console.log('Failed to schedule reminder:', e);
    }
}

// ─── Get badge count ────────────────────────────────────────────────

export async function setBadgeCount(count: number) {
    await Notifications.setBadgeCountAsync(count);
}

export async function clearBadge() {
    await Notifications.setBadgeCountAsync(0);
}
// ─── Inbox Management (Database) ────────────────────────────────────

/**
 * Saves a notification to the local SQLite database for the Inbox UI.
 */
export async function saveNotificationToInbox(title: string, body: string, type: string = 'general', userId?: string, referenceId?: string) {
    try {
        const id = generateUniqueId();
        await execute(
            `INSERT INTO notifications (id, user_id, title, body, type, reference_id, is_read, created_at) 
             VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
            [id, userId || null, title, body, type, referenceId || null, new Date().toISOString()]
        );
        console.log('📬 Notification saved to local inbox');
        return id;
    } catch (e) {
        console.error('Failed to save notification to inbox:', e);
        return null;
    }
}

export async function getInboxNotifications(userId?: string) {
    try {
        const sql = userId
            ? 'SELECT * FROM notifications WHERE user_id = ? OR user_id IS NULL ORDER BY created_at DESC'
            : 'SELECT * FROM notifications ORDER BY created_at DESC';
        const args = userId ? [userId] : [];
        const result = await query(sql, args);
        return result.rows;
    } catch (e) {
        console.error('Failed to fetch inbox notifications:', e);
        return [];
    }
}

export async function deleteNotificationFromInbox(id: string) {
    try {
        await execute('DELETE FROM notifications WHERE id = ?', [id]);
        return true;
    } catch (e) {
        console.error('Failed to delete notification:', e);
        return false;
    }
}

export async function markNotificationAsRead(id: string) {
    try {
        await execute('UPDATE notifications SET is_read = 1 WHERE id = ?', [id]);
    } catch (e) {
        console.error('Failed to mark notification as read:', e);
    }
}

export async function clearAllNotifications() {
    try {
        await execute('DELETE FROM notifications');
    } catch (e) {
        console.error('Failed to clear notifications:', e);
    }
}

/**
 * Seeds dummy notifications for a user based on their role.
 * Useful for new users or testing.
 */
export async function seedDummyNotifications(userId: string, role: string) {
    try {
        const existing = await getInboxNotifications(userId);
        if (existing.length > 0) return; // Already has notifications

        console.log(`🌱 Seeding dummy notifications for ${role}...`);

        const dummyData: Record<string, Array<{ title: string; body: string; type: string }>> = {
            admin: [
                { title: 'System Alert: Low Stock', body: 'Regional Hub East is below 20% capacity for B+ and O- groups.', type: 'emergency' },
                { title: 'Server Maintenance', body: 'Scheduled maintenance tonight at 02:00 AM.', type: 'system' },
            ],
            manager: [
                { title: 'New Camp Approved', body: 'The Annual Blood Drive at Infosys has been approved.', type: 'event_created' },
                { title: 'Volunteer Shortage', body: 'We need 5 more volunteers for the Indiranagar camp.', type: 'emergency' },
            ],
            volunteer: [
                { title: 'New Mission Assigned', body: 'Emergency transport needed for units to Apollo Hospital.', type: 'emergency' },
                { title: 'Points Earned!', body: 'You earned 50 points for your last donation.', type: 'activity' },
            ],
            donor: [
                { title: 'Welcome to BloodConnect!', body: 'Help save lives by donating blood today.', type: 'system' },
                { title: 'Nearby Camp', body: 'A blood donation camp is starting near you tomorrow.', type: 'event_created' },
            ],
        };

        const notifications = dummyData[role] || dummyData.donor;

        for (const n of notifications) {
            await saveNotificationToInbox(n.title, n.body, n.type, userId);
        }

        console.log(`✅ Seeded ${notifications.length} notifications for ${role}`);
    } catch (e) {
        console.error('Failed to seed dummy notifications:', e);
    }
}
