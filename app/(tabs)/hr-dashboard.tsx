import { getDonorAvatar } from '@/constants/AvatarMapping';
import { useAuth } from '@/context/AuthContext';
import { getAllUsers } from '@/lib/auth.service';
import { getManagerStats, getVolunteerStats, setScheduleEditingEnabled } from '@/lib/hr.service';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Bell, ChevronLeft, ChevronRight, Download, Filter, Heart, LogOut, Mail, MessageCircle, MoreHorizontal, Phone, PieChart, Search, Settings, Shield, Star, Target, TrendingUp, Users } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator, Alert,
    Dimensions,
    RefreshControl, ScrollView,
    StyleSheet, Switch, Text, TouchableOpacity, View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

const { width } = Dimensions.get('window');

const TopWavyDecor = ({ color = '#E63946' }) => (
    <View style={styles.svgContainer}>
        <Svg height="260" width={width + 10} viewBox={`0 0 ${width} 260`} style={styles.svgStyle}>
            {/* Layer 2 - Lighter */}
            <Path
                d={`M${width * 0.4} 0 Q${width * 0.7} 40 ${width} 20 L${width} 0 Z`}
                fill={color}
                fillOpacity={0.08}
            />
            {/* Layer 1 - Main Wavy */}
            <Path
                d={`M${width * 0.6} 0 Q${width * 0.8} 120 ${width} 80 L${width} 0 Z`}
                fill={color}
                fillOpacity={0.15}
            />
        </Svg>
    </View>
);
type Tab = 'overview' | 'reports' | 'roles' | 'more';

export default function HRDashboardScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [tab, setTab] = useState<Tab>('overview');
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [volunteerStats, setVolunteerStats] = useState<any[]>([]);
    const [managerStats, setManagerStats] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [scheduleSettings, setScheduleSettings] = useState<Record<number, boolean>>({});
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const ROLE_THEMES: Record<string, { color: string; bg: string }> = {
        volunteer: { color: '#34C759', bg: '#EAFFCF' },
        helpline: { color: '#E63946', bg: '#FFEBEA' },
        outreach: { color: '#FF9500', bg: '#FFF4E5' },
        manager: { color: '#007AFF', bg: '#EAF6FF' },
    };

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
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
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

    const renderReportView = () => {
        if (!selectedUser) return null;
        const theme = ROLE_THEMES[selectedUser.role] || { color: '#8E8E93', bg: '#F2F2F7' };

        return (
            <View style={styles.fullScreenReport}>
                <View style={[styles.reportHeader, { paddingTop: insets.top + 12 }]}>
                    <TouchableOpacity onPress={() => setSelectedUser(null)} style={styles.backFab}>
                        <ChevronLeft size={24} color="#1C1C1E" />
                    </TouchableOpacity>
                    <Text style={styles.reportTitle}>Member Report</Text>
                    <TouchableOpacity style={styles.moreFab}>
                        <MoreHorizontal size={20} color="#1C1C1E" />
                    </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20 }}>
                    <View style={styles.reportProfileCard}>
                        <View style={styles.reportAvatarWrapper}>
                            <Image
                                source={{ uri: selectedUser.avatar_url || getDonorAvatar(selectedUser.name) }}
                                style={{ width: 110, height: 110, borderRadius: 55 }}
                            />
                            <View style={[styles.statusIndicator, { backgroundColor: '#34C759' }]} />
                        </View>
                        <Text style={styles.reportName}>{selectedUser.name}</Text>
                        <View style={[styles.reportBadge, { backgroundColor: theme.bg }]}>
                            <Text style={[styles.reportBadgeText, { color: theme.color }]}>{selectedUser.role.toUpperCase()}</Text>
                        </View>

                        <View style={styles.contactRow}>
                            <TouchableOpacity style={styles.contactCircle}>
                                <Phone size={20} color="#1C1C1E" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.contactCircle}>
                                <MessageCircle size={20} color="#1C1C1E" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.contactCircle}>
                                <Mail size={20} color="#1C1C1E" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.metricsRowGroup}>
                        <View style={styles.metricSquare}>
                            <Text style={styles.metricSquareVal}>{selectedUser.events_participated || 0}</Text>
                            <Text style={styles.metricSquareLab}>Total Events</Text>
                        </View>
                        <View style={styles.metricSquare}>
                            <Text style={[styles.metricSquareVal, { color: '#E63946' }]}>{selectedUser.attended_events || 0}</Text>
                            <Text style={styles.metricSquareLab}>Attended</Text>
                        </View>
                        <View style={styles.metricSquare}>
                            <Text style={[styles.metricSquareVal, { color: '#34C759' }]}>
                                {Math.min((selectedUser.attended_events / (selectedUser.events_participated || 1)) * 100, 100).toFixed(0)}%
                            </Text>
                            <Text style={styles.metricSquareLab}>Yield Rate</Text>
                        </View>
                    </View>

                    <Text style={styles.sectionHeaderTitle}>Efficiency Analysis</Text>
                    <View style={styles.ratingOverview}>
                        <View style={styles.ratingCircle}>
                            <Text style={styles.ratingBigText}>4.8</Text>
                            <Text style={styles.ratingSmallText}>Avg Performance</Text>
                        </View>
                        <View style={styles.ratingBreakdown}>
                            {[
                                { lab: 'Reliability', val: 92, color: '#34C759' },
                                { lab: 'Activity', val: 78, color: '#FF9500' },
                                { lab: 'Efficiency', val: 85, color: '#E63946' }
                            ].map((item, idx) => (
                                <View key={idx} style={styles.ratingBarRow}>
                                    <View style={{ flex: 1 }}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                            <Text style={styles.ratingBarLab}>{item.lab}</Text>
                                            <Text style={styles.ratingBarValText}>{item.val}%</Text>
                                        </View>
                                        <View style={styles.ratingBarBg}>
                                            <View style={[styles.ratingBarFill, { width: `${item.val}%`, backgroundColor: item.color }]} />
                                        </View>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </View>

                    <TouchableOpacity style={styles.downloadReportBtn}>
                        <Download size={20} color="#FFFFFF" />
                        <Text style={styles.downloadReportBtnText}>Download Full PDF Report</Text>
                    </TouchableOpacity>
                    <View style={{ height: 40 }} />
                </ScrollView>
            </View>
        );
    };

    const renderPersonnelTab = () => (
        <View style={{ gap: 12 }}>
            <Text style={styles.sectionHeaderTitle}>Team Members</Text>
            {volunteerStats.map(item => (
                <TouchableOpacity key={item.id} style={styles.proCard} onPress={() => setSelectedUser(item)} activeOpacity={0.9}>
                    <View style={styles.proCardHeader}>
                        <View style={styles.avatarContainer}>
                            <Image
                                source={{ uri: item.avatar_url || getDonorAvatar(item.name) }}
                                style={[styles.avatarBorderSmall, { width: 48, height: 48, borderRadius: 24 }]}
                            />
                            <View style={styles.nameSection}>
                                <Text style={styles.proName}>{item.name}</Text>
                                <Text style={styles.proSub}>{item.role.toUpperCase()}</Text>
                            </View>
                        </View>
                        <View style={styles.ratingRow}>
                            <Star size={14} color="#FF9500" fill="#FF9500" />
                            <Text style={styles.ratingText}>4.9</Text>
                        </View>
                    </View>
                    <View style={styles.proMetricsRow}>
                        <View style={styles.proMetric}>
                            <Text style={styles.proMetricVal}>{item.events_participated || 0}</Text>
                            <Text style={styles.proMetricLab}>Events</Text>
                        </View>
                        <View style={styles.proMetric}>
                            <Text style={[styles.proMetricVal, { color: '#34C759' }]}>+{item.attended_events || 0}</Text>
                            <Text style={styles.proMetricLab}>Attended</Text>
                        </View>
                        <View style={styles.proMetric}>
                            <View style={styles.progressContainer}>
                                <View style={[styles.progressBar, { width: `${Math.min((item.attended_events / (item.events_participated || 1)) * 100, 100)}%`, backgroundColor: '#E63946' }]} />
                            </View>
                            <Text style={styles.proMetricLab}>Engagement</Text>
                        </View>
                    </View>
                    <ChevronRight size={18} color="#C7C7CC" style={styles.cardArrow} />
                </TouchableOpacity>
            ))}
        </View>
    );

    const renderReportsTab = () => (
        <View style={{ gap: 20 }}>
            <Text style={styles.sectionHeaderTitle}>Organization Insights</Text>
            <View style={styles.insightBox}>
                <View style={styles.insightHeader}>
                    <PieChart size={20} color="#E63946" />
                    <Text style={styles.insightTitle}>Role Distribution</Text>
                </View>
                <View style={styles.distributionRow}>
                    {['VOL', 'HLP', 'OUT', 'MNG'].map((r, i) => (
                        <View key={r} style={styles.distCol}>
                            <View style={[styles.distBar, { height: 40 + (i * 15), backgroundColor: '#E63946' }]} />
                            <Text style={styles.distLab}>{r}</Text>
                        </View>
                    ))}
                </View>
            </View>

            <View style={styles.impactCardWhite}>
                <Heart size={32} color="#E63946" fill="#E63946" style={{ opacity: 0.1, position: 'absolute', right: 20, top: 20 }} />
                <Text style={styles.impactTitle}>Community Impact</Text>
                <Text style={styles.impactVal}>12,450+</Text>
                <Text style={styles.impactSub}>Lives influenced this quarter</Text>
                <View style={styles.impactTrend}>
                    <TrendingUp size={14} color="#34C759" />
                    <Text style={styles.impactTrendText}>14% increase from last period</Text>
                </View>
            </View>
        </View>
    );

    const renderControlRow = ({ item }: { item: any }) => {
        const enabled = scheduleSettings[item.id] ?? true;
        const theme = ROLE_THEMES[item.role] || { color: '#8E8E93', bg: '#F2F2F7' };
        return (
            <View style={styles.controlCard}>
                <View style={styles.avatarContainer}>
                    <Image
                        source={{ uri: item.avatar_url || getDonorAvatar(item.name) }}
                        style={{ width: 40, height: 40, borderRadius: 20 }}
                    />
                    <View style={styles.nameSection}>
                        <Text style={styles.proName}>{item.name}</Text>
                        <Text style={styles.proSub}>{item.role.toUpperCase()}</Text>
                    </View>
                </View>

                <View style={styles.accessActions}>
                    <View style={[styles.accessBadge, { backgroundColor: enabled ? '#E6F9EA' : '#FFEBEA' }]}>
                        <View style={[styles.accessDot, { backgroundColor: enabled ? '#34C759' : '#FF3B30' }]} />
                        <Text style={[styles.accessText, { color: enabled ? '#34C759' : '#FF3B30' }]}>
                            {enabled ? 'ACCESS' : 'LOCKED'}
                        </Text>
                    </View>
                    <Switch
                        value={enabled}
                        onValueChange={(val) => handleToggleSchedule(item.id, val)}
                        trackColor={{ false: '#E5E5EA', true: '#34C759' }}
                        thumbColor="#FFFFFF"
                    />
                </View>
            </View>
        );
    };

    const renderMoreTab = () => (
        <View style={{ gap: 12 }}>
            <Text style={styles.sectionHeaderTitle}>Administration</Text>
            {[
                { label: 'Bulk Export Data', icon: Download, color: '#007AFF' },
                { label: 'HR Settings', icon: Settings, color: '#5856D6' },
                { label: 'Audit Logs', icon: Shield, color: '#1C1C1E' },
                { label: 'Announcements', icon: Bell, color: '#FF9500' },
            ].map((item, idx) => (
                <TouchableOpacity key={idx} style={styles.moreActionRow}>
                    <View style={[styles.moreIconWrap, { backgroundColor: item.color + '15' }]}>
                        <item.icon size={20} color={item.color} />
                    </View>
                    <Text style={styles.moreActionText}>{item.label}</Text>
                    <ChevronRight size={18} color="#C7C7CC" />
                </TouchableOpacity>
            ))}
            <TouchableOpacity style={[styles.moreActionRow, { marginTop: 20 }]}>
                <View style={styles.moreIconWrap}>
                    <LogOut size={20} color="#E63946" />
                </View>
                <Text style={[styles.moreActionText, { color: '#E63946' }]}>Logout Sessions</Text>
            </TouchableOpacity>
        </View>
    );

    const totalEvents = volunteerStats.reduce((s, v) => s + (v.events_participated || 0), 0);
    const totalCamps = managerStats.reduce((s, m) => s + (m.total_camps || 0), 0);

    return (
        <View style={styles.container}>
            <TopWavyDecor color="#E63946" />
            {!selectedUser ? (
                <>
                    <View style={[styles.proHeader, { paddingTop: insets.top + 12 }]}>
                        <View style={styles.proHeaderTop}>
                            <View>
                                <Text style={styles.proHeaderTitle}>HR Management</Text>
                            </View>
                            <TouchableOpacity
                                style={styles.headerAvatarWrapper}
                                onPress={() => router.push('/profile')}
                            >
                                <Image
                                    source={{ uri: user?.avatar_url || getDonorAvatar(user?.name || 'User') }}
                                    style={[styles.avatarBorder, { width: 48, height: 48, borderRadius: 24 }]}
                                />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.searchFilterRow}>
                            <View style={styles.searchBar}>
                                <Search size={18} color="#8E8E93" />
                                <Text style={styles.searchPlaceholder}>Search for members...</Text>
                            </View>
                            <TouchableOpacity style={styles.filterBtn}>
                                <Filter size={18} color="#1C1C1E" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
                        contentContainerStyle={{ paddingBottom: 40 }}
                    >
                        <View style={styles.metricsGrid}>
                            <View style={styles.metricCardPro}>
                                <View style={styles.metricCardHeader}>
                                    <Text style={styles.metricCardLabel}>Head Count</Text>
                                    <View style={[styles.metricIconWrap, { backgroundColor: '#EAF6FF' }]}>
                                        <Users size={16} color="#007AFF" />
                                    </View>
                                </View>
                                <Text style={styles.metricCardVal}>{volunteerStats.length + managerStats.length}</Text>
                                <View style={styles.metricTrend}>
                                    <View style={[styles.trendBadge, { backgroundColor: '#E6F9EA' }]}>
                                        <Text style={[styles.trendText, { color: '#34C759' }]}>+4.7%</Text>
                                    </View>
                                    <Text style={styles.trendSub}>New Joiners</Text>
                                </View>
                            </View>

                            <View style={styles.metricCardPro}>
                                <View style={styles.metricCardHeader}>
                                    <Text style={styles.metricCardLabel}>Active Camps</Text>
                                    <View style={[styles.metricIconWrap, { backgroundColor: '#F0EEFF' }]}>
                                        <Target size={16} color="#5856D6" />
                                    </View>
                                </View>
                                <Text style={styles.metricCardVal}>{totalCamps}</Text>
                                <View style={styles.metricTrend}>
                                    <View style={[styles.trendBadge, { backgroundColor: '#FFEBEA' }]}>
                                        <Text style={[styles.trendText, { color: '#FF3B30' }]}>-1.2%</Text>
                                    </View>
                                    <Text style={trendSubStyle(volunteerStats.length).trendSub}>vs Last Month</Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.mainTabNav}>
                            {([
                                { key: 'overview', label: 'Team' },
                                { key: 'reports', label: 'Reports' },
                                { key: 'roles', label: 'Permissions' },
                                { key: 'more', label: 'Utilities' },
                            ] as { key: Tab; label: string }[]).map(t => (
                                <TouchableOpacity
                                    key={t.key}
                                    style={[styles.mainTab, tab === t.key && styles.mainTabActive]}
                                    onPress={() => setTab(t.key)}
                                >
                                    <Text style={[styles.mainTabText, tab === t.key && styles.mainTabTextActive]}>{t.label}</Text>
                                    {tab === t.key && <View style={styles.tabDot} />}
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={styles.listContainer}>
                            {loading ? (
                                <View style={styles.centered}><ActivityIndicator size="large" color="#E63946" /></View>
                            ) : (
                                <>
                                    {tab === 'overview' && renderPersonnelTab()}
                                    {tab === 'reports' && renderReportsTab()}
                                    {tab === 'roles' && (
                                        <>
                                            <Text style={styles.sectionHeaderTitle}>System Controls</Text>
                                            {users.map(item => (
                                                <View key={item.id}>{renderControlRow({ item })}</View>
                                            ))}
                                        </>
                                    )}
                                    {tab === 'more' && renderMoreTab()}
                                </>
                            )}
                        </View>
                    </ScrollView>
                </>
            ) : (
                renderReportView()
            )}
        </View>
    );
}

const trendSubStyle = (val: number) => StyleSheet.create({
    trendSub: { fontSize: 10, fontWeight: '700', color: '#8E8E93' }
});

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    proHeader: { backgroundColor: '#FFFFFF', paddingHorizontal: 20, paddingBottom: 24, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
    proHeaderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    badgeProRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
    proDashboardLab: { fontSize: 13, fontWeight: '700', color: '#1C1C1E', opacity: 0.8 },
    proBadge: { backgroundColor: '#E63946', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    proBadgeText: { fontSize: 10, fontWeight: '900', color: '#FFFFFF' },
    proHeaderTitle: { fontSize: 28, fontWeight: '900', color: '#1C1C1E', letterSpacing: -1 },
    headerAvatarWrapper: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    avatarBorder: {
        borderWidth: 2,
        borderColor: '#FFFFFF',
        backgroundColor: '#F2F2F7',
    },
    avatarBorderSmall: {
        borderWidth: 2,
        borderColor: '#F2F2F7',
        backgroundColor: '#F2F2F7',
    },
    avatarShadow: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        backgroundColor: '#FFFFFF',
    },

    searchFilterRow: { flexDirection: 'row', gap: 12 },
    searchBar: { flex: 1, height: 48, backgroundColor: '#F2F2F7', borderRadius: 16, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 12 },
    searchPlaceholder: { fontSize: 14, color: '#8E8E93', fontWeight: '600' },
    filterBtn: { width: 48, height: 48, backgroundColor: '#FFFFFF', borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#F2F2F7' },

    metricsGrid: { flexDirection: 'row', paddingHorizontal: 20, gap: 16, marginTop: 20 },
    metricCardPro: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 24, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.02, shadowRadius: 10, elevation: 1 },
    metricCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    metricCardLabel: { fontSize: 12, fontWeight: '700', color: '#8E8E93' },
    metricIconWrap: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    metricCardVal: { fontSize: 28, fontWeight: '900', color: '#1C1C1E', marginBottom: 8 },
    metricTrend: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    trendBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    trendText: { fontSize: 10, fontWeight: '900' },
    trendSub: { fontSize: 10, fontWeight: '700', color: '#8E8E93' },

    mainTabNav: { flexDirection: 'row', paddingHorizontal: 20, marginTop: 24, gap: 24, paddingBottom: 8 },
    mainTab: { alignItems: 'center' },
    mainTabActive: {},
    mainTabText: { fontSize: 15, fontWeight: '700', color: '#8E8E93' },
    mainTabTextActive: { color: '#E63946' },
    tabDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#E63946', marginTop: 4 },

    listContainer: { paddingHorizontal: 20, marginTop: 16 },
    sectionHeaderTitle: { fontSize: 17, fontWeight: '900', color: '#1C1C1E', marginBottom: 16 },

    proCard: { backgroundColor: '#FFFFFF', borderRadius: 28, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 12, elevation: 2 },
    proCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
    avatarContainer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatarMock: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    nameSection: { gap: 2 },
    proName: { fontSize: 16, fontWeight: '800', color: '#1C1C1E' },
    proSub: { fontSize: 10, fontWeight: '900', color: '#8E8E93', letterSpacing: 0.5 },
    ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFF9F0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
    ratingText: { fontSize: 12, fontWeight: '800', color: '#FF9500' },

    proMetricsRow: { flexDirection: 'row', gap: 20 },
    proMetric: { flex: 1, gap: 4 },
    proMetricVal: { fontSize: 18, fontWeight: '900', color: '#1C1C1E' },
    proMetricLab: { fontSize: 10, fontWeight: '700', color: '#8E8E93' },
    progressContainer: { width: '100%', height: 6, backgroundColor: '#F2F2F7', borderRadius: 3, marginTop: 6, overflow: 'hidden' },
    progressBar: { height: '100%', borderRadius: 3 },
    cardArrow: { position: 'absolute', right: 16, top: '50%', marginTop: -9 },

    controlCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', borderRadius: 24, padding: 16, marginBottom: 12 },
    accessActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    accessBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
    accessDot: { width: 6, height: 6, borderRadius: 3 },
    accessText: { fontSize: 11, fontWeight: '900' },

    fullScreenReport: { ...StyleSheet.absoluteFillObject, backgroundColor: '#F8F9FA', zIndex: 999 },
    svgContainer: { position: 'absolute', top: -5, right: -5, width: width + 10, height: 260, zIndex: 0 },
    svgStyle: { transform: [{ scaleX: 1 }] },
    reportHeader: { paddingHorizontal: 20, paddingBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'transparent' },
    backFab: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
    reportTitle: { fontSize: 18, fontWeight: '900', color: '#1C1C1E' },
    moreFab: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },

    reportProfileCard: { alignItems: 'center', backgroundColor: '#FFFFFF', padding: 30, borderRadius: 32, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.05, shadowRadius: 20, elevation: 5 },
    reportAvatarWrapper: { marginBottom: 16, position: 'relative' },
    statusIndicator: { position: 'absolute', bottom: 5, right: 5, width: 22, height: 22, borderRadius: 11, borderWidth: 4, borderColor: '#FFFFFF' },
    reportAvatar: { width: 100, height: 100, borderRadius: 36, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    reportName: { fontSize: 24, fontWeight: '900', color: '#1C1C1E', marginBottom: 8 },
    reportBadge: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 12, marginBottom: 20 },
    reportBadgeText: { fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },

    contactRow: { flexDirection: 'row', gap: 16 },
    contactCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F2F2F7', justifyContent: 'center', alignItems: 'center' },


    metricsRowGroup: { flexDirection: 'row', gap: 12, marginBottom: 30 },
    metricSquare: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 24, padding: 12, alignItems: 'center', gap: 4 },
    metricSquareVal: { fontSize: 20, fontWeight: '900', color: '#1C1C1E' },
    metricSquareLab: { fontSize: 10, color: '#8E8E93', fontWeight: '700', textAlign: 'center' },

    ratingOverview: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 32, flexDirection: 'row', alignItems: 'center', gap: 20, marginBottom: 20 },
    ratingCircle: { width: 90, height: 90, borderRadius: 45, borderWidth: 4, borderColor: '#FFEBEA', justifyContent: 'center', alignItems: 'center' },
    ratingBigText: { fontSize: 24, fontWeight: '900', color: '#E63946' },
    ratingSmallText: { fontSize: 9, color: '#8E8E93', fontWeight: '700', textAlign: 'center' },
    ratingBreakdown: { flex: 1, gap: 12 },
    ratingBarRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    ratingBarLab: { fontSize: 12, fontWeight: '700', color: '#8E8E93' },
    ratingBarValText: { fontSize: 12, fontWeight: '900', color: '#1C1C1E' },
    ratingBarBg: { flex: 1, height: 6, backgroundColor: '#F2F2F7', borderRadius: 3 },
    ratingBarFill: { height: '100%', borderRadius: 3 },

    downloadReportBtn: { backgroundColor: '#1C1C1E', height: 56, borderRadius: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 10 },
    downloadReportBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },

    insightBox: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 32 },
    insightHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
    insightTitle: { fontSize: 16, fontWeight: '800', color: '#1C1C1E' },
    distributionRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', height: 120, paddingBottom: 10 },
    distCol: { alignItems: 'center', gap: 8 },
    distBar: { width: 12, borderRadius: 6 },
    distLab: { fontSize: 9, fontWeight: '900', color: '#8E8E93' },

    impactCardWhite: { backgroundColor: '#FFFFFF', padding: 24, borderRadius: 32, overflow: 'hidden' },
    impactTitle: { fontSize: 14, fontWeight: '700', color: '#8E8E93', marginBottom: 4 },
    impactVal: { fontSize: 32, fontWeight: '900', color: '#E63946', marginBottom: 8 },
    impactSub: { fontSize: 13, fontWeight: '700', color: '#1C1C1E', marginBottom: 12 },
    impactTrend: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    impactTrendText: { fontSize: 11, fontWeight: '700', color: '#34C759' },

    moreActionRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 16, borderRadius: 20, gap: 16 },
    moreIconWrap: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    moreActionText: { flex: 1, fontSize: 16, fontWeight: '700', color: '#1C1C1E' },

    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 100 },
    emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12 },
    emptyText: { fontSize: 16, fontWeight: '700', color: '#C7C7CC' },
});
