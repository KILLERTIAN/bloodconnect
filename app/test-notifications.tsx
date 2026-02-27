import { useAuth } from '@/context/AuthContext';
import {
    notifyEventCreated,
    notifyHelplineRequest,
    notifySyncComplete,
    saveNotificationToInbox,
    sendLocalNotification
} from '@/lib/notifications.service';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import {
    Bell,
    CheckCircle2,
    ChevronLeft,
    Clock,
    FileWarning,
    Shield,
    ShieldAlert,
    Siren,
    Smartphone,
    Zap
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Platform, ScrollView, StatusBar, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Card, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function NotificationTestScreen() {
    const { user, role } = useAuth();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [lastAction, setLastAction] = useState<string | null>(null);
    const [status, setStatus] = useState<{
        permission: string;
        isDevice: boolean;
        platform: string;
    }>({
        permission: 'loading',
        isDevice: Device.isDevice,
        platform: Platform.OS
    });

    const checkPermission = async () => {
        const { status: currentStatus } = await Notifications.getPermissionsAsync();
        setStatus(prev => ({ ...prev, permission: currentStatus }));
    };

    useEffect(() => {
        checkPermission();
    }, []);

    const adminActions = [
        {
            title: 'System Alert',
            subtitle: 'Critical stock warning',
            icon: Siren,
            color: '#FF3B30',
            action: async () => {
                await sendLocalNotification('System Alert: Low Stock', 'Regional Hub East is below 20% capacity.', user?.id, { type: 'emergency' });
                setLastAction('Sent: Admin Alert');
            }
        },
        {
            title: 'Maintenance',
            subtitle: 'System update ping',
            icon: Shield,
            color: '#8E8E93',
            action: async () => {
                await notifySyncComplete(12, user?.id);
                setLastAction('Sent: Sync Logic');
            }
        }
    ];

    const managerActions = [
        {
            title: 'Camp Approval',
            subtitle: 'New camp notification',
            icon: CheckCircle2,
            color: '#34C759',
            action: async () => {
                await notifyEventCreated('Annual Drive 2024', user?.id, 'manager');
                setLastAction('Sent: Camp Approved');
            }
        },
        {
            title: 'Case Assigned',
            subtitle: 'Helpline coordination',
            icon: Bell,
            color: '#FF9500',
            action: async () => {
                await notifyHelplineRequest('Jane Doe', 'A+', 'City Hospital', 'normal', user?.id);
                setLastAction('Sent: Helpline Case');
            }
        }
    ];

    const genericActions = [
        {
            title: 'Immediate Test',
            subtitle: 'Check push delivery',
            icon: Bell,
            color: '#007AFF',
            action: async () => {
                await sendLocalNotification('Test Notification', 'Basic notification working!', user?.id);
                setLastAction('Sent: Basic');
            }
        },
        {
            title: '3s Delay Test',
            subtitle: 'Wait 3s after tapping',
            icon: Clock,
            color: '#5856D6',
            action: async () => {
                setLastAction('Scheduled: 3s Delay...');
                const title = '⏰ Timer Work!';
                const body = 'This appeared after a 3s delay.';
                await Notifications.scheduleNotificationAsync({
                    content: { title, body, sound: 'default', ...(Platform.OS === 'android' && { channelId: 'default' }) },
                    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 3 } as any,
                });
                await saveNotificationToInbox(title, body, 'activity', user?.id);
            }
        }
    ];

    const testActions = [
        ...genericActions,
        ...(role === 'admin' ? adminActions : []),
        ...(role === 'manager' ? managerActions : []),
    ];

    const handleRequestPermission = async () => {
        const { status: newStatus } = await Notifications.requestPermissionsAsync();
        setStatus(prev => ({ ...prev, permission: newStatus }));
        setLastAction(`Request Result: ${newStatus.toUpperCase()}`);
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />

            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <ChevronLeft size={28} color="#1C1C1E" />
                </TouchableOpacity>
                <View style={styles.headerTextContainer}>
                    <Text style={styles.headerTitle}>System Diagnostics</Text>
                    <Text style={styles.headerSubtitle}>Notifications & Permissions</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* Diagnostic Info */}
                <Card style={styles.statusCard} mode="contained">
                    <View style={styles.statusRow}>
                        <View style={styles.statusItem}>
                            <ShieldAlert size={20} color={status.permission === 'granted' ? '#34C759' : '#FF3B30'} />
                            <Text style={styles.statusLabel}>Permission</Text>
                            <Text style={[styles.statusValue, { color: status.permission === 'granted' ? '#34C759' : '#FF3B30' }]}>
                                {status.permission.toUpperCase()}
                            </Text>
                        </View>
                        <View style={styles.statusDivider} />
                        <View style={styles.statusItem}>
                            <Smartphone size={20} color="#007AFF" />
                            <Text style={styles.statusLabel}>Device</Text>
                            <Text style={styles.statusValue}>{status.isDevice ? 'Physical' : 'Simulator'}</Text>
                        </View>
                        <View style={styles.statusDivider} />
                        <View style={styles.statusItem}>
                            <Zap size={20} color="#AF52DE" />
                            <Text style={styles.statusLabel}>OS</Text>
                            <Text style={styles.statusValue}>{status.platform === 'ios' ? 'iOS' : 'Android'}</Text>
                        </View>
                    </View>

                    {status.permission !== 'granted' && (
                        <TouchableOpacity style={styles.permissionBtn} onPress={handleRequestPermission}>
                            <Text style={styles.permissionBtnText}>Request Permission Now</Text>
                        </TouchableOpacity>
                    )}
                </Card>

                {lastAction && (
                    <View style={styles.actionBanner}>
                        <CheckCircle2 size={16} color="#039855" />
                        <Text style={styles.actionBannerText}>{lastAction}</Text>
                    </View>
                )}

                <Text style={styles.sectionTitle}>Manual Tests</Text>
                <View style={styles.grid}>
                    {testActions.map((item, index) => (
                        <TouchableOpacity
                            key={index}
                            style={styles.cardWrapper}
                            activeOpacity={0.8}
                            onPress={item.action}
                        >
                            <Card style={styles.testCard} mode="contained">
                                <View style={[styles.testIconContainer, { backgroundColor: `${item.color}15` }]}>
                                    <item.icon size={26} color={item.color} strokeWidth={2.5} />
                                </View>
                                <Text style={styles.testCardTitle}>{item.title}</Text>
                                <Text style={styles.testCardSubtitle}>{item.subtitle}</Text>
                            </Card>
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={styles.troubleshootBox}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <FileWarning size={20} color="#8E8E93" />
                        <Text style={styles.troubleshootTitle}>Still no notification?</Text>
                    </View>
                    <Text style={styles.troubleshootItem}>1. Go to System Settings → Blood Connect → Notifications and verify toggle is ON.</Text>
                    <Text style={styles.troubleshootItem}>2. Ensure Focus Mode or Do Not Disturb is OFF.</Text>
                    <Text style={styles.troubleshootItem}>3. On Android, check if "General Notifications" channel is allowed.</Text>
                    <Text style={styles.troubleshootItem}>4. Close and re-open the app to re-trigger internal listeners.</Text>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F2F2F7',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 20,
        backgroundColor: '#FFFFFF',
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
        elevation: 3,
    },
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: '#F2F2F7',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    headerTextContainer: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '900',
        color: '#1C1C1E',
        letterSpacing: -0.5,
    },
    headerSubtitle: {
        fontSize: 13,
        color: '#8E8E93',
        fontWeight: '600',
    },
    scrollContent: {
        padding: 20,
    },
    statusCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 20,
        marginBottom: 20,
    },
    statusRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statusItem: {
        flex: 1,
        alignItems: 'center',
    },
    statusDivider: {
        width: 1,
        height: 30,
        backgroundColor: '#E5E5EA',
    },
    statusLabel: {
        fontSize: 10,
        color: '#8E8E93',
        fontWeight: '700',
        textTransform: 'uppercase',
        marginTop: 6,
    },
    statusValue: {
        fontSize: 13,
        fontWeight: '800',
        color: '#1C1C1E',
        marginTop: 2,
    },
    permissionBtn: {
        backgroundColor: '#FF3B30',
        marginTop: 20,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
    },
    permissionBtnText: {
        color: '#FFFFFF',
        fontWeight: '900',
        fontSize: 14,
    },
    actionBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#D1FADF15',
        padding: 12,
        borderRadius: 12,
        marginBottom: 20,
        gap: 8,
        borderWidth: 1,
        borderColor: '#D1FADF',
    },
    actionBannerText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#039855',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: '#1C1C1E',
        marginBottom: 16,
        marginLeft: 4,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 30,
    },
    cardWrapper: {
        width: '48%',
    },
    testCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 16,
        height: 150,
        alignItems: 'center',
        justifyContent: 'center',
    },
    testIconContainer: {
        width: 52,
        height: 52,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    testCardTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: '#1C1C1E',
        marginBottom: 2,
    },
    testCardSubtitle: {
        fontSize: 10,
        color: '#8E8E93',
        fontWeight: '600',
        textAlign: 'center',
    },
    troubleshootBox: {
        backgroundColor: '#FFFFFF',
        padding: 20,
        borderRadius: 20,
        marginBottom: 40,
    },
    troubleshootTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1C1C1E',
    },
    troubleshootItem: {
        fontSize: 13,
        color: '#48484A',
        lineHeight: 20,
        fontWeight: '500',
        marginBottom: 10,
    }
});
