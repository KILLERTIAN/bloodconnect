import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

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
        importance: Notifications.AndroidImportance.DEFAULT,
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

export async function sendLocalNotification(title: string, body: string, data: Record<string, any> = {}) {
    await Notifications.scheduleNotificationAsync({
        content: {
            title,
            body,
            data,
            sound: 'default',
        },
        trigger: null, // immediate
    });
}

// Specific notification types for key app events:

export async function notifyEventCreated(eventTitle: string, userRole: string = 'admin') {
    const isSpecialAction = userRole === 'admin';
    await Notifications.scheduleNotificationAsync({
        content: {
            title: isSpecialAction ? '🚀 Admin: New Camp Approved' : '📅 New Blood Drive Created',
            body: `"${eventTitle}" has been scheduled. Managers and Volunteers have been notified for coordination.`,
            data: { type: 'event_created' },
            sound: 'default',
            ...(Platform.OS === 'android' && { channelId: 'updates' }),
        },
        trigger: null,
    });
}

/**
 * Simulates notifying donors in a specific area
 */
export async function notifyDonorsNearCamp(eventTitle: string, location: string) {
    await Notifications.scheduleNotificationAsync({
        content: {
            title: '🩸 Blood Donation Camp Near You!',
            body: `Help save lives! "${eventTitle}" is coming to ${location}. Are you available to donate?`,
            data: { type: 'near_donor_alert' },
            sound: 'default',
            ...(Platform.OS === 'android' && { channelId: 'emergency' }),
        },
        trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: 3, // slightly delayed for realism
        } as any,
    });
}

export async function notifyHelplineRequest(patientName: string, bloodGroup: string, hospital: string, urgency: string) {
    const isEmergency = urgency === 'critical';
    await Notifications.scheduleNotificationAsync({
        content: {
            title: isEmergency ? '🚨 SOS: Emergency Blood Request!' : '🩸 New Helpline Case',
            body: `${patientName} needs ${bloodGroup} blood at ${hospital}. ${isEmergency ? 'CRITICAL — respond now!' : 'Tap to help.'}`,
            data: { type: 'helpline_request', urgency },
            sound: 'default',
            ...(Platform.OS === 'android' && { channelId: isEmergency ? 'emergency' : 'updates' }),
        },
        trigger: null,
    });
}

export async function notifyHelplineAssigned(caseTitle: string, assigneeName: string) {
    await Notifications.scheduleNotificationAsync({
        content: {
            title: '👤 Case Assigned to You',
            body: `You've been assigned to help with "${caseTitle}". ${assigneeName}, please respond.`,
            data: { type: 'helpline_assigned' },
            sound: 'default',
            ...(Platform.OS === 'android' && { channelId: 'updates' }),
        },
        trigger: null,
    });
}

export async function notifyEventStatusChange(eventTitle: string, newStatus: string) {
    const statusLabels: Record<string, string> = {
        'contacting_poc': 'Contacting POC',
        'lead_received': 'Lead Received',
        'scheduling': 'Being Scheduled',
        'confirmed': 'Confirmed ✅',
        'closed': 'Completed 🎉',
    };
    await Notifications.scheduleNotificationAsync({
        content: {
            title: '📋 Event Status Updated',
            body: `"${eventTitle}" is now: ${statusLabels[newStatus] || newStatus}`,
            data: { type: 'event_status', status: newStatus },
            sound: 'default',
            ...(Platform.OS === 'android' && { channelId: 'updates' }),
        },
        trigger: null,
    });
}

export async function notifySyncComplete(eventCount: number) {
    await Notifications.scheduleNotificationAsync({
        content: {
            title: '🔄 Data Synced',
            body: `${eventCount} events synced from cloud.`,
            data: { type: 'sync' },
            ...(Platform.OS === 'android' && { channelId: 'sync' }),
        },
        trigger: null,
    });
}

// ─── Schedule a reminder for an upcoming event ──────────────────────

export async function scheduleEventReminder(eventTitle: string, eventDateStr: string) {
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
