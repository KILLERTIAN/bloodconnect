import { useAuth } from '@/context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
    Activity,
    Bell,
    ChevronLeft,
    LayoutGrid,
    MessageCircle,
    Settings,
    Shield,
    Siren,
    Star,
    Zap
} from 'lucide-react-native';
import React, { useState } from 'react';
import { FlatList, ScrollView, StatusBar, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Card, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const NOTIFICATION_FILTERS = ['All', 'Priority', 'System', 'Activity'];

const ROLE_NOTIFICATIONS = {
    donor: [
        {
            id: 'd1',
            type: 'emergency',
            title: 'SO+ Emergency Request',
            description: 'Critical need for O+ blood at Fortis Hospital. You are 4km away. Can you help?',
            time: '2m ago',
            category: 'Priority',
            urgent: true,
            bloodGroup: 'O+'
        },
        {
            id: 'd2',
            type: 'activity',
            title: 'Points Earned!',
            description: 'You earned 50 points for your last donation at the City Hub. Check your rewards.',
            time: '3h ago',
            category: 'Activity',
            icon: Zap,
            color: '#FF9500',
            bg: '#FFF4E5'
        },
        {
            id: 'd3',
            type: 'system',
            title: 'Health Tip',
            description: 'Remember to stay hydrated! Drink at least 3 liters of water today.',
            time: '1d ago',
            category: 'System',
            icon: Activity,
            color: '#34C759',
            bg: '#EAFCF0'
        }
    ],
    volunteer: [
        {
            id: 'v1',
            type: 'emergency',
            title: 'New Rescue Mission',
            description: 'Emergency transportation needed for units from Blood Bank A to Apollo Hospital.',
            time: 'Just now',
            category: 'Priority',
            urgent: true,
            missionType: 'Transport'
        },
        {
            id: 'v2',
            type: 'activity',
            title: 'Mission Success',
            description: 'Case #4092 has been successfully completed. 5 lives were saved. Great job!',
            time: '4h ago',
            category: 'Activity',
            icon: Star,
            color: '#007AFF',
            bg: '#EAF6FF'
        },
        {
            id: 'v3',
            type: 'system',
            title: 'Roster Update',
            description: 'New duty shifts for the Indiranagar region have been released. Please review.',
            time: '1d ago',
            category: 'System',
            icon: LayoutGrid,
            color: '#5856D6',
            bg: '#F0EFFF'
        }
    ],
    admin: [
        {
            id: 'a1',
            type: 'emergency',
            title: 'System Alert: Low Stock',
            description: 'Regional Hub East is below 20% capacity for B+ and O- groups.',
            time: '1m ago',
            category: 'Priority',
            urgent: true,
            alertLevel: 'Critical'
        },
        {
            id: 'a2',
            type: 'activity',
            title: 'Broadcast Complete',
            description: 'Emergency ping reached 452 donors in the 5km radius of Max Hospital.',
            time: '1h ago',
            category: 'Activity',
            icon: MessageCircle,
            color: '#32ADE6',
            bg: '#EAFCF0'
        },
        {
            id: 'a3',
            type: 'system',
            title: 'Server Maintenance',
            description: 'Scheduled maintenance tonight at 02:00 AM. Systems may be offline for 30 mins.',
            time: '6h ago',
            category: 'System',
            icon: Shield,
            color: '#8E8E93',
            bg: '#F2F2F7'
        }
    ]
};

export default function NotificationsScreen() {
    const { role } = useAuth();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [activeFilter, setActiveFilter] = useState('All');

    const userRole = (role && ROLE_NOTIFICATIONS[role as keyof typeof ROLE_NOTIFICATIONS]) ? role : 'donor';
    const notificationsRaw = ROLE_NOTIFICATIONS[userRole as keyof typeof ROLE_NOTIFICATIONS];

    const filteredNotifications = notificationsRaw.filter(n =>
        activeFilter === 'All' || n.category === activeFilter
    );

    const renderNotificationItem = ({ item }: { item: any }) => {
        if (item.urgent) {
            return (
                <View style={styles.urgentWrapper}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.emergencyDot} />
                        <Text style={styles.sectionLabel}>URGENT ACTION REQUIRED</Text>
                    </View>
                    <Card style={styles.urgentCard} mode="contained">
                        <View style={styles.urgentHeader}>
                            <View style={styles.urgentIconBox}>
                                <Siren size={24} color="#FF3B30" strokeWidth={2.5} />
                            </View>
                            <View style={styles.urgentHeaderText}>
                                <Text style={styles.urgentCategory}>{item.title}</Text>
                                <Text style={styles.urgentTime}>{item.time}</Text>
                            </View>
                            <View style={styles.urgentTag}>
                                <Text style={styles.urgentTagText}>{item.bloodGroup || item.alertLevel || 'SOS'}</Text>
                            </View>
                        </View>
                        <View style={styles.urgentContent}>
                            <Text style={styles.urgentDesc}>{item.description}</Text>
                        </View>
                        <View style={styles.urgentActions}>
                            <TouchableOpacity style={styles.primaryAction} activeOpacity={0.8}>
                                <LinearGradient colors={['#FF3B30', '#FF2D55']} style={styles.actionGradient}>
                                    <Text style={styles.actionTextMain}>
                                        {userRole === 'donor' ? 'Confirm Response' : 'Accept Mission'}
                                    </Text>
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
            <TouchableOpacity style={styles.notifItem} activeOpacity={0.7}>
                <View style={[styles.iconBox, { backgroundColor: item.bg }]}>
                    <item.icon size={22} color={item.color} />
                </View>
                <View style={styles.notifContent}>
                    <View style={styles.notifTop}>
                        <Text style={[styles.notifCategory, { color: item.color }]}>{item.category.toUpperCase()}</Text>
                        <Text style={styles.notifTime}>{item.time}</Text>
                    </View>
                    <Text style={styles.notifTitle}>{item.title}</Text>
                    <Text style={styles.notifDesc}>{item.description}</Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />

            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <ChevronLeft size={28} color="#1C1C1E" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Inbox</Text>
                    <TouchableOpacity style={styles.settingsBtn}>
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
                ListEmptyComponent={() => (
                    <View style={styles.emptyContainer}>
                        <Bell size={64} color="#E5E5EA" />
                        <Text style={styles.emptyText}>All caught up!</Text>
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
        marginBottom: 16,
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
