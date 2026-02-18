import { getDonorAvatar } from '@/constants/AvatarMapping';
import { useAuth } from '@/context/AuthContext';
import { sync } from '@/lib/database';
import { Event, getAllEvents, getEventsByManager } from '@/lib/events.service';
import { getDonors, getLiveHelplines, HelplineRequest } from '@/lib/helpline.service';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
    Award,
    BarChart2,
    Bell,
    Building2,
    ChevronRight,
    Clock,
    Droplet,
    Heart,
    MapPin,
    Radio,
    Search,
    Siren,
    Users,
    Zap
} from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { Dimensions, RefreshControl, ScrollView, StatusBar, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Avatar, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function DashboardScreen() {
    const { role, user } = useAuth();
    const router = useRouter();
    const theme = useTheme();
    const insets = useSafeAreaInsets();

    const [refreshing, setRefreshing] = useState(false);
    const [activeEvents, setActiveEvents] = useState<Event[]>([]);
    const [criticalRequests, setCriticalRequests] = useState<HelplineRequest[]>([]);
    const [stats, setStats] = useState({ cases: 0, donors: 0 });

    const loadData = useCallback(async () => {
        try {
            // Role specific data loading
            if (role === 'admin' || role === 'manager') {
                const events = role === 'admin' ? await getAllEvents() : await getEventsByManager(user!.id);
                setActiveEvents(events.filter(e => e.status !== 'closed'));

                const helplines = await getLiveHelplines();
                setCriticalRequests(helplines.filter(r => r.urgency === 'critical'));

                const donors = await getDonors();
                setStats({ cases: helplines.length, donors: donors.length });
            } else if (role === 'volunteer') {
                const helplines = await getLiveHelplines();
                setCriticalRequests(helplines);
            }
        } catch (e) {
            console.error('Home load error:', e);
        } finally {
            setRefreshing(false);
        }
    }, [role, user]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const onRefresh = async () => {
        setRefreshing(true);
        await sync(); // Sync with Turso if available
        await loadData();
    };

    const renderHeader = (title: string, subtitle: string, avatarUri: string) => (
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
            <View style={{ flex: 1 }}>
                <Text style={styles.dateText}>{subtitle}</Text>
                <Text style={styles.userName} numberOfLines={1}>{title}</Text>
            </View>
            <View style={styles.headerRight}>
                <TouchableOpacity
                    style={styles.notificationBtn}
                    activeOpacity={0.7}
                    onPress={() => router.push('/notifications')}
                >
                    <Bell size={22} color="#1C1C1E" strokeWidth={2.5} />
                    <View style={styles.notificationDot} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push('/profile')} activeOpacity={0.7}>
                    <Avatar.Image size={48} source={{ uri: avatarUri }} style={styles.avatarBorder} />
                </TouchableOpacity>
            </View>
        </View>
    );

    const DashboardContent = () => {
        const currentUserAvatar = getDonorAvatar('Rahul Sharma', 'male');

        if (role === 'donor') {
            return (
                <View style={styles.donorContainer}>
                    {renderHeader('Welcome, Rahul', 'Good Morning', currentUserAvatar)}

                    {/* Modern Hero Section */}
                    <View style={styles.heroSection}>
                        <LinearGradient
                            colors={['#D32F2F', '#B71C1C']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.heroCard}
                        >
                            <View style={styles.heroRow}>
                                <View style={styles.heroInfo}>
                                    <View style={styles.bloodTag}>
                                        <Droplet size={12} color="#D32F2F" fill="#D32F2F" />
                                        <Text style={styles.bloodTagText}>A+ DONOR</Text>
                                    </View>
                                    <Text style={styles.heroTitleModern}>You are eligible to donate!</Text>
                                    <Text style={styles.heroSubModern}>Last donation was 3 months ago.</Text>

                                    <TouchableOpacity
                                        style={styles.heroBtnModern}
                                        activeOpacity={0.9}
                                        onPress={() => router.push('/schedule-donation')}
                                    >
                                        <Text style={styles.heroBtnTextModern}>Schedule Now</Text>
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.heroProgress}>
                                    <View style={styles.progressCircle}>
                                        <Text style={styles.progressText}>100%</Text>
                                        <Text style={styles.progressLabel}>Ready</Text>
                                    </View>
                                </View>
                            </View>
                        </LinearGradient>
                    </View>

                    {/* Quick Stats - Modern Strip */}
                    <View style={styles.statsStripContainer}>
                        <View style={styles.statsStrip}>
                            <View style={styles.statItemModern}>
                                <Text style={styles.statValModern}>12</Text>
                                <Text style={styles.statLabModern}>Lives Saved</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItemModern}>
                                <Text style={styles.statValModern}>5</Text>
                                <Text style={styles.statLabModern}>Donations</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItemModern}>
                                <Text style={styles.statValModern}>850</Text>
                                <Text style={styles.statLabModern}>Points</Text>
                            </View>
                        </View>
                    </View>

                    {/* Primary Actions Grid */}
                    <View style={styles.actionGrid}>
                        <TouchableOpacity
                            style={styles.actionCardBig}
                            activeOpacity={0.8}
                            onPress={() => router.push('/(tabs)/management')} // Links to the new feed
                        >
                            <View style={[styles.actionIconCircle, { backgroundColor: '#EAF6FF' }]}>
                                <Search size={24} color="#007AFF" />
                            </View>
                            <Text style={styles.actionTitle}>Find Camps</Text>
                            <Text style={styles.actionSub}>Locate nearby drives</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionCardBig} activeOpacity={0.8}>
                            <View style={[styles.actionIconCircle, { backgroundColor: '#FFF4E5' }]}>
                                <Award size={24} color="#FF9500" />
                            </View>
                            <Text style={styles.actionTitle}>My Pass</Text>
                            <Text style={styles.actionSub}>View donor card</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Recent & Health */}
                    <View style={styles.sectionContainer}>
                        <View style={styles.sectionHeaderCompact}>
                            <Text style={styles.sectionTitleSmall}>Recent Impact</Text>
                        </View>
                        <View style={styles.impactCardModern}>
                            <View style={styles.impactRow}>
                                <View style={styles.impactIconModern}>
                                    <Heart size={20} color="#FFFFFF" fill="#FFFFFF" />
                                </View>
                                <View style={styles.impactContent}>
                                    <Text style={styles.impactTitleModern}>Blood Donation</Text>
                                    <Text style={styles.impactDate}>Oct 24, 2024 • City Hospital</Text>
                                </View>
                                <View style={styles.impactBadge}>
                                    <Text style={styles.impactBadgeText}>+1 LIFE</Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    <View style={[styles.sectionContainer, { marginBottom: 40 }]}>
                        <View style={styles.sectionHeaderCompact}>
                            <Text style={styles.sectionTitleSmall}>Health Tips</Text>
                            <TouchableOpacity><Text style={styles.seeAllSmall}>View All</Text></TouchableOpacity>
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tipsScroll}>
                            {[
                                { label: 'Hydrate well', icon: Droplet, color: '#007AFF' },
                                { label: 'Iron rich food', icon: Zap, color: '#FF9500' },
                                { label: 'Good sleep', icon: Clock, color: '#AF52DE' },
                            ].map((tip, idx) => (
                                <View key={idx} style={styles.tipCard}>
                                    <View style={[styles.tipIcon, { backgroundColor: `${tip.color}15` }]}>
                                        <tip.icon size={20} color={tip.color} />
                                    </View>
                                    <Text style={styles.tipText}>{tip.label}</Text>
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            );
        }

        if (role === 'volunteer') {
            return (
                <View style={styles.volunteerContainer}>
                    {renderHeader('Lead Volunteer', 'Active Responder', currentUserAvatar)}

                    <View style={styles.missionContainer}>
                        <Text style={styles.sectionTitle}>Your Active Missions</Text>
                        <TouchableOpacity activeOpacity={0.9} onPress={() => router.push('/request-details')}>
                            <LinearGradient
                                colors={['#007AFF', '#0051A8']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.missionCard}
                            >
                                <View style={styles.missionHeader}>
                                    <View style={styles.missionBadge}>
                                        <Zap size={14} color="#FFFFFF" strokeWidth={2.5} />
                                        <Text style={styles.missionBadgeText}>IN PROGRESS</Text>
                                    </View>
                                    <Text style={styles.missionTime}>02:14:59</Text>
                                </View>
                                <Text style={styles.missionTitle}>Coordinate O- for City Trauma ICU</Text>
                                <View style={styles.missionFooter}>
                                    <View style={styles.locationGroup}>
                                        <MapPin size={14} color="#FFFFFF" opacity={0.8} />
                                        <Text style={styles.missionLocation}>Indiranagar • 1.2km away</Text>
                                    </View>
                                    <ChevronRight size={20} color="#FFFFFF" />
                                </View>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.roleStatsGrid}>
                        <View style={styles.roleStatItem}>
                            <Text style={styles.roleStatVal}>28</Text>
                            <Text style={styles.roleStatLab}>Completed</Text>
                        </View>
                        <View style={styles.roleStatItem}>
                            <Text style={[styles.roleStatVal, { color: '#FF9500' }]}>850</Text>
                            <Text style={styles.roleStatLab}>XP Points</Text>
                        </View>
                        <View style={styles.roleStatItem}>
                            <Text style={[styles.roleStatVal, { color: '#34C759' }]}>#12</Text>
                            <Text style={styles.roleStatLab}>Ranking</Text>
                        </View>
                    </View>

                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Nearby Alerts</Text>
                            <TouchableOpacity><Text style={styles.seeAll}>Update Range</Text></TouchableOpacity>
                        </View>
                        <View style={styles.alertList}>
                            {criticalRequests.slice(0, 3).map((alert, idx) => (
                                <TouchableOpacity
                                    key={idx}
                                    activeOpacity={0.9}
                                    style={styles.alertCardModern}
                                    onPress={() => router.push({ pathname: '/(tabs)/helpline', params: { id: alert.id } })}
                                >
                                    <View style={styles.alertLeft}>
                                        <View style={[styles.bloodSquare, { backgroundColor: '#FFEBEA' }]}>
                                            <Text style={[styles.bloodSquareText, { color: '#FF3B30' }]}>{alert.blood_group}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.alertContentModern}>
                                        <View style={styles.alertHeaderRow}>
                                            <Text style={styles.hospitalNameSmall} numberOfLines={1}>{alert.hospital}</Text>
                                            {alert.urgency === 'critical' && (
                                                <View style={styles.urgentBadgeMini}>
                                                    <Text style={styles.urgentBadgeText}>URGENT</Text>
                                                </View>
                                            )}
                                        </View>
                                        <View style={styles.alertMetaRow}>
                                            <View style={styles.metaItemMini}>
                                                <MapPin size={12} color="#8E8E93" />
                                                <Text style={styles.metaTextMini}>{alert.city}</Text>
                                            </View>
                                            <View style={styles.metaDot} />
                                            <View style={styles.metaItemMini}>
                                                <Droplet size={12} color="#8E8E93" />
                                                <Text style={styles.metaTextMini}>{alert.units_required} Units</Text>
                                            </View>
                                        </View>
                                    </View>
                                    <TouchableOpacity style={styles.acceptBtnMini}>
                                        <ChevronRight size={18} color="#007AFF" strokeWidth={3} />
                                    </TouchableOpacity>
                                </TouchableOpacity>
                            ))}
                            {criticalRequests.length === 0 && (
                                <Text style={styles.emptyFeedText}>No active alerts at the moment.</Text>
                            )}
                        </View>
                    </View>
                </View>
            );
        }

        return (
            <View style={styles.adminContainer}>
                {renderHeader('System Admin', 'Node Master', currentUserAvatar)}

                <TouchableOpacity style={styles.searchBar} activeOpacity={0.9}>
                    <Search size={20} color="#8E8E93" />
                    <Text style={styles.searchText}>Search cases, donors or hubs...</Text>
                </TouchableOpacity>

                <View style={styles.emergencyContainer}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Critical Alerts</Text>
                        <TouchableOpacity onPress={() => router.push('/(tabs)/helpline')}><Text style={styles.seeAll}>Manage</Text></TouchableOpacity>
                    </View>
                    {criticalRequests.length > 0 ? (
                        <TouchableOpacity
                            style={styles.emergencyCard}
                            activeOpacity={0.9}
                            onPress={() => router.push({ pathname: '/(tabs)/helpline', params: { id: criticalRequests[0].id } })}
                        >
                            <LinearGradient
                                colors={['#FF3B30', '#FF2D55']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={StyleSheet.absoluteFill}
                            />
                            <View style={styles.emergencyHeader}>
                                <View style={styles.urgentBadge}>
                                    <Siren size={14} color="#FFFFFF" strokeWidth={2.5} />
                                    <Text style={styles.urgentText}>URGENT NEED</Text>
                                </View>
                                <View style={styles.arrowCircle}>
                                    <ChevronRight size={20} color="#FFFFFF" strokeWidth={3} />
                                </View>
                            </View>
                            <Text style={styles.emergencyTitle} numberOfLines={2}>
                                {criticalRequests[0].hospital} needs {criticalRequests[0].units_required} units of {criticalRequests[0].blood_group}
                            </Text>
                            <Text style={styles.emergencySub} numberOfLines={2}>
                                {criticalRequests[0].notes || `Critical case at ${criticalRequests[0].hospital}. Contacting nearby donors.`}
                            </Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={[styles.emergencyCard, { backgroundColor: '#F2F2F7', shadowColor: 'transparent' }]}>
                            <Text style={[styles.emergencyTitle, { color: '#8E8E93', fontSize: 16 }]}>No critical alerts reported today.</Text>
                        </View>
                    )}
                </View>

                <View style={styles.statsGrid}>
                    <View style={styles.adminStatCard}>
                        <View style={[styles.adminStatIconBox, { backgroundColor: '#FFEBEA' }]}>
                            <Droplet size={20} color="#FF3B30" />
                        </View>
                        <View>
                            <Text style={styles.adminStatValue}>{stats.cases}</Text>
                            <Text style={styles.adminStatLabel}>Active Cases</Text>
                        </View>
                    </View>
                    <View style={styles.adminStatCard}>
                        <View style={[styles.adminStatIconBox, { backgroundColor: '#EAF6FF' }]}>
                            <Users size={20} color="#007AFF" />
                        </View>
                        <View>
                            <Text style={styles.adminStatValue}>{stats.donors}</Text>
                            <Text style={styles.adminStatLabel}>Total Donors</Text>
                        </View>
                    </View>
                </View>

                {/* Module Quick Access */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Modules</Text>
                    </View>
                    <View style={styles.moduleGrid}>
                        {[
                            { label: 'Camp Manager', icon: Building2, color: '#007AFF', bg: '#EAF6FF', route: '/camp-manager' },
                            { label: 'Outreach', icon: MapPin, color: '#FF9500', bg: '#FFF4E5', route: '/outreach' },
                            { label: 'HR Dashboard', icon: BarChart2, color: '#5856D6', bg: '#F0EEFF', route: '/hr-dashboard' },
                            { label: 'Helpline', icon: Radio, color: '#FF3B30', bg: '#FFEBEA', route: '/(tabs)/helpline' },
                        ].map((mod) => (
                            <TouchableOpacity
                                key={mod.label}
                                style={styles.moduleCard}
                                activeOpacity={0.8}
                                onPress={() => router.push(mod.route as any)}
                            >
                                <View style={[styles.moduleIconBox, { backgroundColor: mod.bg }]}>
                                    <mod.icon size={24} color={mod.color} />
                                </View>
                                <Text style={styles.moduleLabel}>{mod.label}</Text>
                                <ChevronRight size={14} color="#C7C7CC" />
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Live Activity Feed</Text>
                        <TouchableOpacity><Text style={styles.seeAll}>View All</Text></TouchableOpacity>
                    </View>
                    <ScrollView contentContainerStyle={styles.feedScroll}>
                        {[1, 2, 3].map(i => (
                            <View key={i} style={styles.feedItem}>
                                <View style={styles.feedLine} />
                                <View style={styles.feedDot} />
                                <View style={styles.feedContent}>
                                    <Text style={styles.feedUser}>New donation at City Hub</Text>
                                    <Text style={styles.feedTime}>2 mins ago • O+ Positive</Text>
                                </View>
                                <ChevronRight size={16} color="#C7C7CC" />
                            </View>
                        ))}
                    </ScrollView>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="#FF3B30"
                        colors={['#FF3B30']}
                    />
                }
            >
                <DashboardContent />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FCFCFD',
    },
    emptyFeedText: {
        textAlign: 'center',
        padding: 40,
        color: '#8E8E93',
        fontWeight: '600',
        fontSize: 14,
    },
    donorContainer: {
        flex: 1,
    },
    volunteerContainer: {
        flex: 1,
    },
    adminContainer: {
        flex: 1,
    },
    heroSection: {
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    heroGradient: {
        borderRadius: 24,
        padding: 24,
        shadowColor: '#FF5F6D',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.12,
        shadowRadius: 20,
        elevation: 6,
    },
    heroContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    heroMain: {
        flex: 1,
    },
    bloodBadge: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 12,
    },
    bloodBadgeText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    heroTitleCompact: {
        color: '#FFFFFF',
        fontSize: 22,
        fontWeight: '900',
        letterSpacing: -0.8,
    },
    heroSubCompact: {
        color: 'rgba(255, 255, 255, 0.9)',
        fontSize: 14,
        marginTop: 6,
        fontWeight: '600',
    },
    heroActionBtn: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 18,
        paddingVertical: 12,
        borderRadius: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 4,
    },
    heroActionText: {
        color: '#FF5F6D',
        fontWeight: '800',
        fontSize: 14,
    },
    quickStatsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        gap: 12,
        marginBottom: 24,
    },
    statBox: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
        elevation: 2,
    },
    statIconBox: {
        width: 36,
        height: 36,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statValSmall: {
        fontSize: 16,
        fontWeight: '900',
        color: '#1C1C1E',
    },
    statLabSmall: {
        fontSize: 10,
        color: '#8E8E93',
        fontWeight: '700',
        marginTop: 0,
    },
    donorSection: {
        marginBottom: 24,
    },
    sectionHeaderCompact: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        marginBottom: 12,
    },
    sectionTitleSmall: {
        fontSize: 18,
        fontWeight: '900',
        color: '#1C1C1E',
        letterSpacing: -0.5,
    },
    seeAllSmall: {
        fontSize: 13,
        color: '#007AFF',
        fontWeight: '700',
    },
    prepScrollCompact: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        gap: 12,
    },
    prepCardCompact: {
        width: 105,
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 14,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
    },
    prepIconSmall: {
        width: 36,
        height: 36,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    prepTitleSmall: {
        fontSize: 13,
        fontWeight: '800',
        color: '#1C1C1E',
    },
    prepSubSmall: {
        fontSize: 11,
        color: '#8E8E93',
        fontWeight: '700',
        marginTop: 4,
    },
    medicalCardCompact: {
        marginHorizontal: 20,
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.04,
        shadowRadius: 12,
        elevation: 2,
    },
    medicalHeaderCompact: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    medicalTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    medicalTitleSmall: {
        fontSize: 15,
        fontWeight: '800',
        color: '#1C1C1E',
    },
    readinessBadge: {
        backgroundColor: '#EAFCF0',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    readinessText: {
        fontSize: 11,
        fontWeight: '900',
        color: '#34C759',
    },
    healthBarSmall: {
        height: 10,
        backgroundColor: '#F2F2F7',
        borderRadius: 5,
        overflow: 'hidden',
        marginBottom: 14,
    },
    healthProgressSmall: {
        width: '92%',
        height: '100%',
        borderRadius: 4,
    },
    healthInfoSmall: {
        fontSize: 12,
        color: '#8E8E93',
        fontWeight: '600',
    },
    impactCardCompact: {
        marginHorizontal: 20,
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 16,
        paddingRight: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
        elevation: 2,
    },
    impactIconBox: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: '#F2F2F7',
        justifyContent: 'center',
        alignItems: 'center',
    },
    impactDetails: {
        flex: 1,
    },
    impactTitleSmall: {
        fontSize: 15,
        fontWeight: '800',
        color: '#1C1C1E',
    },
    impactMetaSmall: {
        fontSize: 13,
        color: '#8E8E93',
        fontWeight: '600',
        marginTop: 2,
    },
    scrollContent: {
        paddingBottom: 32,
    },
    header: {
        flexDirection: 'row',
        paddingHorizontal: 24,
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
        paddingBottom: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.02,
        shadowRadius: 10,
        elevation: 2,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    notificationBtn: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: '#F2F2F7',
        justifyContent: 'center',
        alignItems: 'center',
    },
    notificationDot: {
        position: 'absolute',
        top: 10,
        right: 12,
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#FF3B30',
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    dateText: {
        color: '#8E8E93',
        fontSize: 13,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1.2,
    },
    userName: {
        fontSize: 26,
        fontWeight: '900',
        color: '#1C1C1E',
        letterSpacing: -1,
        marginTop: 6,
    },
    avatarBorder: {
        borderWidth: 3,
        borderColor: '#F2F2F7',
        backgroundColor: '#F2F2F7',
    },
    searchBar: {
        backgroundColor: '#FFFFFF',
        marginHorizontal: 24,
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 56,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 12,
        elevation: 2,
    },
    searchText: {
        flex: 1,
        color: '#8E8E93',
        fontSize: 16,
        fontWeight: '600',
    },
    emergencyContainer: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        marginBottom: 12,
    },
    emergencyCard: {
        borderRadius: 28,
        padding: 24,
        elevation: 8,
        shadowColor: '#FF3B30',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
    },
    emergencyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    urgentBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        gap: 8,
    },
    urgentText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    arrowCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    emergencyTitle: {
        color: '#FFFFFF',
        fontSize: 22,
        fontWeight: '900',
        lineHeight: 28,
        letterSpacing: -0.5,
    },
    emergencySub: {
        color: 'rgba(255, 255, 255, 0.9)',
        fontSize: 14,
        marginTop: 10,
        fontWeight: '600',
        lineHeight: 20,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 18,
        paddingVertical: 12,
        justifyContent: 'space-between',
        gap: 12,
    },
    adminStatCard: {
        width: (width - 60) / 2,
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 12,
        elevation: 2,
    },
    adminStatIconBox: {
        width: 48,
        height: 48,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    adminStatValue: {
        fontSize: 22,
        fontWeight: '900',
        color: '#1C1C1E',
        letterSpacing: -0.5,
    },
    adminStatLabel: {
        fontSize: 12,
        color: '#8E8E93',
        fontWeight: '700',
        marginTop: 1,
    },
    section: {
        marginTop: 36,
        paddingHorizontal: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 22,
        fontWeight: '900',
        color: '#1C1C1E',
        letterSpacing: -0.8,
        marginBottom: 10,
    },
    seeAll: {
        fontSize: 15,
        color: '#007AFF',
        fontWeight: '700',
    },
    feedScroll: {
        gap: 0,
    },
    feedItem: {
        flexDirection: 'row',
        gap: 20,
        paddingBottom: 24,
    },
    feedLine: {
        position: 'absolute',
        left: 5,
        top: 12,
        bottom: 0,
        width: 2,
        backgroundColor: '#E5E5EA',
    },
    feedDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#007AFF',
        marginTop: 8,
        borderWidth: 3,
        borderColor: '#FFFFFF',
        zIndex: 1,
    },
    feedContent: {
        flex: 1,
    },
    feedUser: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1C1C1E',
    },
    feedTime: {
        fontSize: 13,
        color: '#8E8E93',
        marginTop: 4,
        fontWeight: '600',
    },

    // Donor Specific Styles
    heroContainer: {
        paddingHorizontal: 24,
        marginBottom: 24,
    },

    heroBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
        gap: 6,
        marginBottom: 16,
    },
    heroBadgeText: {
        color: '#FFFFFF',
        fontWeight: '900',
        fontSize: 11,
        letterSpacing: 0.5,
    },
    heroTitle: {
        color: '#FFFFFF',
        fontSize: 24,
        fontWeight: '900',
        lineHeight: 30,
        marginBottom: 24,
        letterSpacing: -0.5,
    },
    heroBtn: {
        backgroundColor: '#FFFFFF',
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 16,
        gap: 10,
    },
    heroBtnText: {
        color: '#FF3B30',
        fontWeight: '800',
        fontSize: 16,
    },
    statsRowLarge: {
        flexDirection: 'row',
        paddingHorizontal: 24,
        gap: 16,
        marginBottom: 24,
    },
    donorStatCard: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 28,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.04,
        shadowRadius: 15,
        elevation: 3,
    },
    donorStatIcon: {
        width: 60,
        height: 60,
        borderRadius: 20,
        backgroundColor: '#FFEBEA',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    donorStatValue: {
        fontSize: 30,
        fontWeight: '900',
        color: '#1C1C1E',
        letterSpacing: -0.5,
    },
    donorStatLabel: {
        fontSize: 14,
        color: '#8E8E93',
        fontWeight: '700',
        marginTop: 6,
    },
    historyCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.02,
        shadowRadius: 8,
        elevation: 2,
    },
    historyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    historyIcon: {
        width: 48,
        height: 48,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    historyInfo: {
        flex: 1,
    },
    historyTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1C1C1E',
    },
    historyMeta: {
        fontSize: 14,
        color: '#8E8E93',
        marginTop: 4,
        fontWeight: '600',
    },
    prepScroll: {
        paddingHorizontal: 24,
        paddingBottom: 20,
        gap: 12,
    },
    prepCard: {
        width: 150,
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.02,
        shadowRadius: 10,
        elevation: 2,
    },
    prepIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    prepTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: '#1C1C1E',
    },
    prepSub: {
        fontSize: 12,
        color: '#8E8E93',
        fontWeight: '600',
        marginTop: 4,
        lineHeight: 16,
    },
    sectionHeaderInside: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        paddingHorizontal: 24,
    },
    medicalCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.02,
        shadowRadius: 10,
        elevation: 2,
    },
    medicalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 12,
    },
    medicalTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1C1C1E',
    },
    medicalDesc: {
        fontSize: 14,
        color: '#8E8E93',
        lineHeight: 20,
        fontWeight: '600',
        marginBottom: 20,
    },
    healthBar: {
        height: 8,
        backgroundColor: '#F2F2F7',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 12,
    },
    healthProgress: {
        width: '92%',
        height: '100%',
        backgroundColor: '#34C759',
    },
    healthScore: {
        fontSize: 13,
        color: '#34C759',
        fontWeight: '800',
    },

    // Volunteer Specific Styles
    missionContainer: {
        paddingHorizontal: 24,
        paddingVertical: 8,
        marginBottom: 8,
    },
    missionCard: {
        borderRadius: 24,
        padding: 20,
        elevation: 6,
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 15,
    },
    missionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    missionBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        gap: 8,
    },
    missionBadgeText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    missionTime: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '800',
    },
    missionTitle: {
        color: '#FFFFFF',
        fontSize: 22,
        fontWeight: '900',
        marginBottom: 16,
        lineHeight: 28,
        letterSpacing: -0.5,
    },
    missionFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    locationGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    missionLocation: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
        opacity: 0.9,
    },
    roleStatsGrid: {
        flexDirection: 'row',
        paddingHorizontal: 24,
        paddingVertical: 8,
        justifyContent: 'space-between',
        gap: 12,
    },
    roleStatItem: {
        backgroundColor: '#FFFFFF',
        flex: 1,
        paddingVertical: 18,
        paddingHorizontal: 8,
        borderRadius: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 12,
        elevation: 3,
    },
    roleStatVal: {
        fontSize: 24,
        fontWeight: '900',
        color: '#007AFF',
        letterSpacing: -0.5,
    },
    roleStatLab: {
        fontSize: 12,
        color: '#8E8E93',
        fontWeight: '700',
        marginTop: 4,
    },
    alertList: {
        gap: 16,
        paddingBottom: 24,
        paddingTop: 8,
    },
    alertCardModern: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 14,
        paddingVertical: 16,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 12,
        elevation: 3,
        marginBottom: 10,
    },
    alertLeft: {
        marginRight: 14,
    },
    bloodSquare: {
        width: 48,
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    bloodSquareText: {
        fontSize: 16,
        fontWeight: '900',
    },
    alertContentModern: {
        flex: 1,
    },
    alertHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    hospitalNameSmall: {
        fontSize: 15,
        fontWeight: '800',
        color: '#1C1C1E',
        flex: 1,
    },
    urgentBadgeMini: {
        backgroundColor: '#FFEBEA',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    urgentBadgeText: {
        fontSize: 9,
        fontWeight: '900',
        color: '#FF3B30',
    },
    alertMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    metaItemMini: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metaTextMini: {
        fontSize: 12,
        color: '#8E8E93',
        fontWeight: '600',
    },
    metaDot: {
        width: 3,
        height: 3,
        borderRadius: 1.5,
        backgroundColor: '#C7C7CC',
        marginHorizontal: 8,
    },
    acceptBtnMini: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: '#EAF6FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    moduleGrid: {
        gap: 10,
    },
    moduleCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    moduleIconBox: {
        width: 48,
        height: 48,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    moduleLabel: {
        flex: 1,
        fontSize: 16,
        fontWeight: '800',
        color: '#1C1C1E',
    },
    // Modern Donor UI Styles
    heroCard: {
        borderRadius: 24,
        padding: 24,
        shadowColor: '#D32F2F',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 8,
    },
    heroRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    heroInfo: {
        flex: 1,
        paddingRight: 16,
    },
    bloodTag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        alignSelf: 'flex-start',
        marginBottom: 12,
        gap: 6,
    },
    bloodTagText: {
        fontSize: 11,
        fontWeight: '900',
        color: '#D32F2F',
    },
    heroTitleModern: {
        fontSize: 22,
        fontWeight: '900',
        color: '#FFFFFF',
        lineHeight: 28,
        marginBottom: 4,
    },
    heroSubModern: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.8)',
        fontWeight: '500',
        marginBottom: 20,
    },
    heroBtnModern: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        alignSelf: 'flex-start',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    heroBtnTextModern: {
        fontSize: 14,
        fontWeight: '800',
        color: '#D32F2F',
    },
    heroProgress: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    progressCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 6,
        borderColor: 'rgba(255,255,255,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    progressText: {
        fontSize: 18,
        fontWeight: '900',
        color: '#FFFFFF',
    },
    progressLabel: {
        fontSize: 10,
        color: 'rgba(255,255,255,0.8)',
        fontWeight: '600',
    },
    statsStripContainer: {
        paddingHorizontal: 20,
        marginBottom: 24,
    },
    statsStrip: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        paddingVertical: 16,
        paddingHorizontal: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 10,
        elevation: 2,
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    statItemModern: {
        alignItems: 'center',
        flex: 1,
    },
    statValModern: {
        fontSize: 20,
        fontWeight: '900',
        color: '#1C1C1E',
    },
    statLabModern: {
        fontSize: 11,
        color: '#8E8E93',
        fontWeight: '600',
        marginTop: 2,
    },
    statDivider: {
        width: 1,
        height: 24,
        backgroundColor: '#F2F2F7',
    },
    actionGrid: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        gap: 16,
        marginBottom: 32,
    },
    actionCardBig: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 10,
        elevation: 2,
    },
    actionIconCircle: {
        width: 48,
        height: 48,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    actionTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1C1C1E',
        marginBottom: 4,
    },
    actionSub: {
        fontSize: 12,
        color: '#8E8E93',
        fontWeight: '500',
    },
    sectionContainer: {
        marginBottom: 24,
    },
    tipsScroll: {
        paddingHorizontal: 20,
        gap: 12,
    },
    tipCard: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderWidth: 1,
        borderColor: '#F2F2F7',
    },
    tipIcon: {
        width: 32,
        height: 32,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tipText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#1C1C1E',
    },
    impactCardModern: {
        marginHorizontal: 20,
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
        elevation: 2,
    },
    impactRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    impactIconModern: {
        width: 48,
        height: 48,
        borderRadius: 16,
        backgroundColor: '#FF3B30',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    impactContent: {
        flex: 1,
    },
    impactTitleModern: {
        fontSize: 16,
        fontWeight: '900',
        color: '#1C1C1E',
    },
    impactDate: {
        fontSize: 13,
        color: '#8E8E93',
        fontWeight: '500',
        marginTop: 2,
    },
    impactBadge: {
        backgroundColor: '#EAFCF0',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    impactBadgeText: {
        fontSize: 11,
        fontWeight: '900',
        color: '#34C759',
    },
});
