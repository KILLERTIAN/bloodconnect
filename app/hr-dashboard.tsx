import { useAuth } from '@/context/AuthContext';
import { getAllUsers } from '@/lib/auth.service';
import { getManagerStats, getVolunteerStats, setScheduleEditingEnabled } from '@/lib/hr.service';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Award, BarChart2, Calendar, ChevronLeft, Lock, Unlock, User, Users } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator, Alert, FlatList, RefreshControl,
    StyleSheet, Switch, Text, TouchableOpacity, View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Tab = 'volunteers' | 'managers' | 'schedules';

export default function HRDashboardScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [tab, setTab] = useState<Tab>('volunteers');
    const [volunteerStats, setVolunteerStats] = useState<any[]>([]);
    const [managerStats, setManagerStats] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [scheduleSettings, setScheduleSettings] = useState<Record<number, boolean>>({});
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadData = useCallback(async () => {
        try {
            const [vs, ms, us] = await Promise.all([
                getVolunteerStats(),
                getManagerStats(),
                getAllUsers(),
            ]);
            setVolunteerStats(vs);
            setManagerStats(ms);
            setUsers(us.filter(u => ['volunteer', 'helpline', 'outreach', 'manager'].includes(u.role)));
            // Default all to enabled
            const settings: Record<number, boolean> = {};
            us.forEach(u => { settings[u.id] = true; });
            setScheduleSettings(settings);
        } catch (e) { console.error(e); }
        finally { setLoading(false); setRefreshing(false); }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const handleToggleSchedule = async (targetUserId: number, enabled: boolean) => {
        try {
            await setScheduleEditingEnabled(targetUserId, enabled, user!.id);
            setScheduleSettings(prev => ({ ...prev, [targetUserId]: enabled }));
            Alert.alert(
                enabled ? 'Unlocked' : 'Locked',
                `Schedule editing ${enabled ? 'enabled' : 'disabled'} for this user.`
            );
        } catch (e: any) {
            Alert.alert('Error', e.message);
        }
    };

    const ROLE_COLORS: Record<string, string> = {
        volunteer: '#34C759', helpline: '#FF2D55', outreach: '#FF9500', manager: '#007AFF',
    };

    const renderVolunteerStat = ({ item }: { item: any }) => (
        <View style={styles.statCard}>
            <View style={styles.statCardHeader}>
                <View style={[styles.avatarCircle, { backgroundColor: (ROLE_COLORS[item.role] || '#8E8E93') + '20' }]}>
                    <User size={20} color={ROLE_COLORS[item.role] || '#8E8E93'} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.statName}>{item.name}</Text>
                    <Text style={[styles.statRole, { color: ROLE_COLORS[item.role] || '#8E8E93' }]}>
                        {item.role.charAt(0).toUpperCase() + item.role.slice(1)}
                    </Text>
                </View>
            </View>
            <View style={styles.statMetrics}>
                <View style={styles.metric}>
                    <Text style={styles.metricValue}>{item.events_participated || 0}</Text>
                    <Text style={styles.metricLabel}>Events</Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metric}>
                    <Text style={styles.metricValue}>{item.attended_events || 0}</Text>
                    <Text style={styles.metricLabel}>Attended</Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metric}>
                    <Text style={styles.metricValue}>{item.schedule_entries || 0}</Text>
                    <Text style={styles.metricLabel}>Schedules</Text>
                </View>
            </View>
        </View>
    );

    const renderManagerStat = ({ item }: { item: any }) => (
        <View style={styles.statCard}>
            <View style={styles.statCardHeader}>
                <View style={[styles.avatarCircle, { backgroundColor: '#EAF6FF' }]}>
                    <Award size={20} color="#007AFF" />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.statName}>{item.name}</Text>
                    <Text style={[styles.statRole, { color: '#007AFF' }]}>Camp Manager</Text>
                </View>
            </View>
            <View style={styles.statMetrics}>
                <View style={styles.metric}>
                    <Text style={styles.metricValue}>{item.total_camps || 0}</Text>
                    <Text style={styles.metricLabel}>Total Camps</Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metric}>
                    <Text style={styles.metricValue}>{item.completed_camps || 0}</Text>
                    <Text style={styles.metricLabel}>Completed</Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metric}>
                    <Text style={styles.metricValue}>{item.total_donations_collected || 0}</Text>
                    <Text style={styles.metricLabel}>Donations</Text>
                </View>
            </View>
        </View>
    );

    const renderScheduleControl = ({ item }: { item: any }) => {
        const enabled = scheduleSettings[item.id] ?? true;
        return (
            <View style={styles.scheduleRow}>
                <View style={[styles.avatarCircle, { backgroundColor: (ROLE_COLORS[item.role] || '#8E8E93') + '20' }]}>
                    <User size={18} color={ROLE_COLORS[item.role] || '#8E8E93'} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.scheduleName}>{item.name}</Text>
                    <Text style={styles.scheduleRole}>{item.role}</Text>
                </View>
                <View style={styles.lockRow}>
                    {enabled ? <Unlock size={16} color="#34C759" /> : <Lock size={16} color="#FF3B30" />}
                    <Switch
                        value={enabled}
                        onValueChange={(val) => handleToggleSchedule(item.id, val)}
                        trackColor={{ false: '#FF3B30', true: '#34C759' }}
                        thumbColor="#FFFFFF"
                    />
                </View>
            </View>
        );
    };

    const totalEvents = volunteerStats.reduce((s, v) => s + (v.events_participated || 0), 0);
    const totalAttended = volunteerStats.reduce((s, v) => s + (v.attended_events || 0), 0);
    const totalCamps = managerStats.reduce((s, m) => s + (m.total_camps || 0), 0);

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#5856D6', '#AF52DE']} style={[styles.header, { paddingTop: insets.top + 16 }]}>
                <View style={styles.headerTitleRow}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtnHeader}>
                        <ChevronLeft size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                    <View>
                        <Text style={styles.headerSub}>HR Module</Text>
                        <Text style={styles.headerTitle}>HR Dashboard</Text>
                    </View>
                </View>
                <BarChart2 size={28} color="rgba(255,255,255,0.6)" />
            </LinearGradient>

            {/* Summary */}
            <View style={styles.summaryRow}>
                {[
                    { label: 'Volunteers', value: volunteerStats.length, color: '#34C759', icon: Users },
                    { label: 'Total Events', value: totalEvents, color: '#007AFF', icon: Calendar },
                    { label: 'Camps Managed', value: totalCamps, color: '#5856D6', icon: Award },
                ].map(s => (
                    <View key={s.label} style={styles.summaryCard}>
                        <s.icon size={18} color={s.color} />
                        <Text style={[styles.summaryValue, { color: s.color }]}>{s.value}</Text>
                        <Text style={styles.summaryLabel}>{s.label}</Text>
                    </View>
                ))}
            </View>

            {/* Tabs */}
            <View style={styles.tabBar}>
                {([
                    { key: 'volunteers', label: 'Volunteers' },
                    { key: 'managers', label: 'Managers' },
                    { key: 'schedules', label: 'Schedules' },
                ] as { key: Tab; label: string }[]).map(t => (
                    <TouchableOpacity
                        key={t.key}
                        style={[styles.tab, tab === t.key && styles.tabActive]}
                        onPress={() => setTab(t.key)}
                    >
                        <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {loading ? (
                <View style={styles.centered}><ActivityIndicator size="large" color="#5856D6" /></View>
            ) : (
                <>
                    {tab === 'volunteers' && (
                        <FlatList
                            data={volunteerStats}
                            keyExtractor={item => String(item.id)}
                            renderItem={renderVolunteerStat}
                            contentContainerStyle={styles.list}
                            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
                            ListEmptyComponent={<View style={styles.emptyState}><Users size={48} color="#C7C7CC" /><Text style={styles.emptyText}>No volunteer data</Text></View>}
                        />
                    )}
                    {tab === 'managers' && (
                        <FlatList
                            data={managerStats}
                            keyExtractor={item => String(item.id)}
                            renderItem={renderManagerStat}
                            contentContainerStyle={styles.list}
                            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
                            ListEmptyComponent={<View style={styles.emptyState}><Award size={48} color="#C7C7CC" /><Text style={styles.emptyText}>No manager data</Text></View>}
                        />
                    )}
                    {tab === 'schedules' && (
                        <FlatList
                            data={users}
                            keyExtractor={item => String(item.id)}
                            renderItem={renderScheduleControl}
                            contentContainerStyle={styles.list}
                            ListHeaderComponent={
                                <Text style={styles.scheduleHint}>Toggle to enable/disable schedule editing for each user.</Text>
                            }
                        />
                    )}
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FB' },
    header: { paddingHorizontal: 20, paddingBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    backBtnHeader: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '700', letterSpacing: 1 },
    headerTitle: { color: '#FFFFFF', fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
    summaryRow: { flexDirection: 'row', backgroundColor: '#FFFFFF', paddingVertical: 16, paddingHorizontal: 16, gap: 8, borderBottomWidth: 1, borderBottomColor: '#F2F2F7' },
    summaryCard: { flex: 1, alignItems: 'center', gap: 4 },
    summaryValue: { fontSize: 20, fontWeight: '900' },
    summaryLabel: { fontSize: 11, color: '#8E8E93', fontWeight: '700' },
    tabBar: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F2F2F7' },
    tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
    tabActive: { borderBottomWidth: 3, borderBottomColor: '#5856D6' },
    tabText: { fontSize: 14, fontWeight: '700', color: '#8E8E93' },
    tabTextActive: { color: '#5856D6' },
    list: { padding: 16, gap: 12 },
    statCard: { backgroundColor: '#FFFFFF', borderRadius: 28, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 3, borderWidth: 1, borderColor: '#F2F2F7' },
    statCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
    avatarCircle: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    statName: { fontSize: 16, fontWeight: '800', color: '#1C1C1E' },
    statRole: { fontSize: 12, fontWeight: '900', marginTop: 2, textTransform: 'uppercase', letterSpacing: 1 },
    statMetrics: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FB', borderRadius: 20, paddingVertical: 12 },
    metric: { flex: 1, alignItems: 'center' },
    metricValue: { fontSize: 20, fontWeight: '900', color: '#1C1C1E' },
    metricLabel: { fontSize: 10, color: '#8E8E93', fontWeight: '800', marginTop: 2, textTransform: 'uppercase' },
    metricDivider: { width: 1, height: 24, backgroundColor: '#E5E5EA' },
    scheduleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: '#F2F2F7' },
    scheduleName: { fontSize: 15, fontWeight: '800', color: '#1C1C1E' },
    scheduleRole: { fontSize: 12, color: '#8E8E93', fontWeight: '600', marginTop: 2 },
    lockRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    scheduleHint: { fontSize: 13, color: '#8E8E93', fontWeight: '600', marginBottom: 16, textAlign: 'center', paddingHorizontal: 20 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyState: { alignItems: 'center', paddingVertical: 80 },
    emptyText: { fontSize: 18, fontWeight: '800', color: '#1C1C1E', marginTop: 20 },
});
