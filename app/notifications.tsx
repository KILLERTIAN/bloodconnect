import { useAuth } from '@/context/AuthContext';
import { getDB, syncDatabase } from '@/lib/database';
import {
    deleteNotificationFromInbox,
    getInboxNotifications,
    seedDummyNotifications
} from '@/lib/notifications.service';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
    Bell,
    ChevronLeft,
    Settings,
    Shield,
    Siren,
    Star,
    Trash2,
    Zap
} from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { Alert, DeviceEventEmitter, FlatList, Platform, ScrollView, StatusBar, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Card, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const NOTIFICATION_FILTERS = ['All', 'Priority', 'System', 'Activity'];

export default function NotificationsScreen() {
    const { role, user } = useAuth();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [activeFilter, setActiveFilter] = useState('All');
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const loadNotifications = useCallback(async () => {
        setLoading(true);
        let data = await getInboxNotifications(user?.id);

        // If empty and we have a user, seed some initial ones
        if (data.length === 0 && user?.id && role) {
            await seedDummyNotifications(user.id, role);
            data = await getInboxNotifications(user.id);
        }

        setNotifications(data);
        setLoading(false);
    }, [user?.id, role]);

    useFocusEffect(
        useCallback(() => {
            loadNotifications();
        }, [loadNotifications])
    );

    // Listen for background syncs to auto-refresh the UI
    React.useEffect(() => {
        const sub = DeviceEventEmitter.addListener('db_synced', () => {
            console.log('🔄 Sync complete, refreshing inbox...');
            loadNotifications();
        });
        return () => sub.remove();
    }, [loadNotifications]);

    const handleRefresh = async () => {
        setLoading(true);
        try {
            const db = await getDB();
            await syncDatabase(db);
        } catch (e) {
            console.warn('Refresh sync failed:', e);
        }
        await loadNotifications();
    };

    const handleDelete = async (id: string) => {
        const ok = await deleteNotificationFromInbox(id);
        if (ok) {
            setNotifications(prev => prev.filter(n => n.id !== id));
        }
    };

    const confirmDelete = (id: string) => {
        Alert.alert(
            'Delete Notification',
            'Are you sure you want to remove this notification?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => handleDelete(id) }
            ]
        );
    };

    const getIconForType = (type: string) => {
        switch (type) {
            case 'emergency': return { icon: Siren, color: '#FF3B30', bg: '#FFEBEA' };
            case 'activity': return { icon: Zap, color: '#FF9500', bg: '#FFF4E5' };
            case 'event_created': return { icon: Star, color: '#007AFF', bg: '#EAF6FF' };
            case 'system': return { icon: Shield, color: '#8E8E93', bg: '#F2F2F7' };
            default: return { icon: Bell, color: '#5856D6', bg: '#F0EFFF' };
        }
    };

    const filteredNotifications = notifications.filter(n => {
        if (activeFilter === 'All') return true;
        if (activeFilter === 'Priority') return n.type === 'emergency';
        if (activeFilter === 'System') return n.type === 'system';
        if (activeFilter === 'Activity') return n.type === 'activity' || n.type === 'event_created';
        return true;
    });

    const formatTime = (ts: string) => {
        if (!ts) return '';
        const date = new Date(ts);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        return date.toLocaleDateString();
    };

    const renderNotificationItem = ({ item }: { item: any }) => {
        const { icon: Icon, color, bg } = getIconForType(item.type);
        const isUrgent = item.type === 'emergency';

        if (isUrgent) {
            return (
                <View style={styles.urgentWrapper}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.emergencyDot} />
                        <Text style={styles.sectionLabel}>URGENT ACTION REQUIRED</Text>
                        <TouchableOpacity onPress={() => confirmDelete(item.id)} style={styles.deleteBtnSmall}>
                            <Trash2 size={16} color="#FF3B30" />
                        </TouchableOpacity>
                    </View>
                    <Card style={styles.urgentCard} mode="contained">
                        <View style={styles.urgentHeader}>
                            <View style={styles.urgentIconBox}>
                                <Siren size={24} color="#FF3B30" strokeWidth={2.5} />
                            </View>
                            <View style={styles.urgentHeaderText}>
                                <Text style={styles.urgentCategory}>{item.title}</Text>
                                <Text style={styles.urgentTime}>{formatTime(item.created_at)}</Text>
                            </View>
                            <View style={styles.urgentTag}>
                                <Text style={styles.urgentTagText}>SOS</Text>
                            </View>
                        </View>
                        <View style={styles.urgentContent}>
                            <Text style={styles.urgentDesc}>{item.body}</Text>
                        </View>
                        <View style={styles.urgentActions}>
                            <TouchableOpacity style={styles.primaryAction} activeOpacity={0.8}>
                                <LinearGradient colors={['#FF3B30', '#FF2D55']} style={styles.actionGradient}>
                                    <Text style={styles.actionTextMain}>Respond Now</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.secondaryAction} activeOpacity={0.7}>
                                <Text style={styles.actionTextSec}>Details</Text>
                            </TouchableOpacity>
                        </View>
                    </Card>
                </View>
            );
        }

        return (
            <TouchableOpacity style={styles.notifItem} activeOpacity={0.7} onLongPress={() => confirmDelete(item.id)}>
                <View style={[styles.iconBox, { backgroundColor: bg }]}>
                    <Icon size={22} color={color} />
                </View>
                <View style={styles.notifContent}>
                    <View style={styles.notifTop}>
                        <Text style={[styles.notifCategory, { color }]}>{item.type?.toUpperCase() || 'INFO'}</Text>
                        <Text style={styles.notifTime}>{formatTime(item.created_at)}</Text>
                    </View>
                    <Text style={styles.notifTitle}>{item.title}</Text>
                    <Text style={styles.notifDesc}>{item.body}</Text>
                </View>
                <TouchableOpacity onPress={() => confirmDelete(item.id)} style={styles.deleteBtn}>
                    <Trash2 size={18} color="#C7C7CC" />
                </TouchableOpacity>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />

            <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? insets.top * 0.4 : insets.top + 10 }]}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <ChevronLeft size={28} color="#1C1C1E" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Inbox</Text>
                    <TouchableOpacity
                        style={styles.settingsBtn}
                        onPress={() => router.push('/test-notifications')}
                    >
                        <Settings size={22} color="#1C1C1E" />
                    </TouchableOpacity>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterBar}>
                    {NOTIFICATION_FILTERS.map(filter => (
                        <TouchableOpacity
                            key={filter}
                            onPress={() => setActiveFilter(filter)}
                            style={[styles.filterChip, activeFilter === filter && styles.filterChipActive]}
                        >
                            <Text style={[styles.filterText, activeFilter === filter && styles.filterTextActive]}>{filter}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <FlatList
                data={filteredNotifications}
                renderItem={renderNotificationItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
                refreshing={loading}
                onRefresh={handleRefresh}
                ListEmptyComponent={() => (
                    <View style={styles.emptyContainer}>
                        <Bell size={64} color="#E5E5EA" />
                        <Text style={styles.emptyText}>{loading ? 'Checking for updates...' : 'All caught up!'}</Text>
                    </View>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFBFC',
    },
    header: {
        backgroundColor: '#FFFFFF',
        paddingBottom: 16,
        borderBottomLeftRadius: 40,
        borderBottomRightRadius: 40,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.03,
        shadowRadius: 20,
        zIndex: 10,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        marginBottom: 8,
    },
    backBtn: {
        width: 48,
        height: 48,
        borderRadius: 16,
        backgroundColor: '#F2F2F7',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: '900',
        color: '#1C1C1E',
        letterSpacing: -1,
    },
    settingsBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#F2F2F7',
        justifyContent: 'center',
        alignItems: 'center',
    },
    filterBar: {
        paddingHorizontal: 24,
        gap: 8,
    },
    filterChip: {
        paddingHorizontal: 22,
        paddingVertical: 12,
        borderRadius: 16,
        backgroundColor: '#F2F2F7',
    },
    filterChipActive: {
        backgroundColor: '#FF3B30',
        shadowColor: '#FF3B30',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
    },
    filterText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#8E8E93',
    },
    filterTextActive: {
        color: '#FFFFFF',
    },
    listContainer: {
        padding: 24,
        paddingBottom: 100,
    },
    urgentWrapper: {
        marginBottom: 32,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
    },
    emergencyDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#FF3B30',
    },
    sectionLabel: {
        fontSize: 12,
        fontWeight: '900',
        color: '#FF3B30',
        letterSpacing: 1,
        flex: 1,
    },
    deleteBtnSmall: {
        padding: 4,
    },
    urgentCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 32,
        padding: 24,
        shadowColor: '#FF3B30',
        shadowOffset: { width: 0, height: 15 },
        shadowOpacity: 0.08,
        shadowRadius: 25,
        borderWidth: 1,
        borderColor: '#FFEBEA',
    },
    urgentHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginBottom: 20,
    },
    urgentIconBox: {
        width: 56,
        height: 56,
        borderRadius: 20,
        backgroundColor: '#FFEBEA',
        justifyContent: 'center',
        alignItems: 'center',
    },
    urgentHeaderText: {
        flex: 1,
    },
    urgentCategory: {
        fontSize: 18,
        fontWeight: '900',
        color: '#1C1C1E',
        letterSpacing: -0.5,
    },
    urgentTime: {
        fontSize: 13,
        color: '#8E8E93',
        fontWeight: '700',
        marginTop: 2,
    },
    urgentTag: {
        backgroundColor: '#FF3B30',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    urgentTagText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '900',
    },
    urgentContent: {
        marginBottom: 24,
    },
    urgentDesc: {
        fontSize: 16,
        color: '#48484A',
        lineHeight: 24,
        fontWeight: '600',
    },
    urgentActions: {
        flexDirection: 'row',
        gap: 12,
    },
    primaryAction: {
        flex: 2,
        borderRadius: 18,
        overflow: 'hidden',
    },
    actionGradient: {
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionTextMain: {
        color: '#FFFFFF',
        fontWeight: '900',
        fontSize: 16,
    },
    secondaryAction: {
        flex: 1,
        height: 56,
        borderRadius: 18,
        backgroundColor: '#F2F2F7',
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionTextSec: {
        color: '#1C1C1E',
        fontWeight: '700',
        fontSize: 15,
    },
    notifItem: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderRadius: 28,
        padding: 20,
        marginBottom: 16,
        gap: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.02,
        shadowRadius: 10,
    },
    iconBox: {
        width: 52,
        height: 52,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    notifContent: {
        flex: 1,
    },
    notifTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    notifCategory: {
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 1,
    },
    notifTime: {
        fontSize: 12,
        color: '#C7C7CC',
        fontWeight: '700',
    },
    notifTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1C1C1E',
        marginBottom: 4,
    },
    notifDesc: {
        fontSize: 14,
        color: '#8E8E93',
        lineHeight: 20,
        fontWeight: '600',
    },
    deleteBtn: {
        padding: 8,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 100,
        gap: 20,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#C7C7CC',
    },
});
