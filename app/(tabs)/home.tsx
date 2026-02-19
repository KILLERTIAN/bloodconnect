import { getDonorAvatar } from '@/constants/AvatarMapping';
import { useAuth } from '@/context/AuthContext';
import { sync } from '@/lib/database';
import { Event, getAllEvents, getEventsByManager } from '@/lib/events.service';
import { getDonors, getLiveHelplines, HelplineRequest } from '@/lib/helpline.service';
import { Image } from 'expo-image';
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
import { Text, useTheme } from 'react-native-paper';
import Animated, {
    FadeInDown,
    FadeInRight,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

// Premium SVG Decorator for Background
const BackgroundDoodles = () => (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg height={height} width={width} style={StyleSheet.absoluteFill}>
            {/* Top Right Wavy Layers */}
            <Path
                d={`M${width * 0.4} 0 Q${width * 0.7} 100 ${width} 40 L${width} 0 Z`}
                fill="#E63946"
                fillOpacity={0.07}
            />
            <Path
                d={`M${width * 0.6} 0 Q${width * 0.8} 180 ${width} 120 L${width} 0 Z`}
                fill="#E63946"
                fillOpacity={0.12}
            />

            {/* Bottom Wavy Layers */}
            <Path
                d={`M0 ${height * 0.7} Q ${width * 0.3} ${height * 0.65} ${width} ${height * 0.75} L ${width} ${height} L 0 ${height} Z`}
                fill="#ffeaeaff"
                opacity="0.4"
            />
            <Path
                d={`M0 ${height * 0.8} Q ${width * 0.6} ${height * 0.7} ${width} ${height * 0.85} L ${width} ${height} L 0 ${height} Z`}
                fill="#ffe3e3ff"
                opacity="0.6"
            />
        </Svg>
    </View>
);

const FloatingDroplet = () => {
    const translateY = useSharedValue(0);

    useEffect(() => {
        translateY.value = withRepeat(
            withSequence(
                withTiming(-15, { duration: 2500 }),
                withTiming(0, { duration: 2500 })
            ),
            -1,
            true
        );
    }, []);

    return (
        <Animated.View style={[styles.floatingDroplet]}>
            <Svg width="180" height="200" viewBox="0 0 20 40">
                <Path
                    d="M20 0C20 0 0 16.6667 0 30C0 41.0457 8.9543 50 20 50C31.0457 50 40 41.0457 40 30C40 16.6667 20 0 20 0Z"
                    fill="rgba(255, 253, 253, 0.12)"
                />
            </Svg>
        </Animated.View>
    );
};

const FloatingSiren = () => {
    return (
        <View style={styles.floatingSiren}>
            <Siren size={120} color="rgba(255, 255, 255, 0.25)" strokeWidth={2} />
        </View>
    );
};

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
            const isStaff = role && ['admin', 'manager', 'hr', 'outreach', 'helpline'].includes(role);

            if (isStaff) {
                // Fetch events based on role
                const events = role === 'admin' ? await getAllEvents() : await getEventsByManager(user!.id);
                setActiveEvents(events.filter(e => e.status !== 'closed'));

                // Fetch global system stats
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
        await sync();
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
                    <Image source={{ uri: avatarUri }} style={[styles.avatarBorder, { width: 48, height: 48, borderRadius: 24 }]} />
                </TouchableOpacity>
            </View>
        </View>
    );

    const DashboardContent = () => {
        const userName = user?.name || 'User';
        const userAvatar = user?.avatar_url || getDonorAvatar(userName, 'male');

        const roleLabels: Record<string, { title: string; sub: string }> = {
            admin: { title: userName, sub: 'System Admin' },
            manager: { title: userName, sub: 'Branch Manager' },
            hr: { title: userName, sub: 'HR Manager' },
            outreach: { title: userName, sub: 'Outreach Coordinator' },
            helpline: { title: userName, sub: 'Helpline Executive' },
            volunteer: { title: userName, sub: 'Lead Volunteer' },
            donor: { title: `Welcome, ${userName.split(' ')[0]}`, sub: 'Good Morning' }
        };

        const config = roleLabels[role || 'donor'] || roleLabels.donor;

        if (role === 'donor') {
            return (
                <View style={styles.donorContainer}>
                    {renderHeader(config.title, config.sub, userAvatar)}

                    <Animated.View
                        entering={FadeInDown.delay(200).duration(800)}
                        style={styles.heroSection}
                    >
                        <LinearGradient
                            colors={['#E53935', '#C62828']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.heroCardPremium}
                        >
                            <FloatingDroplet />
                            <View style={styles.heroRow}>
                                <View style={styles.heroInfo}>
                                    <View style={styles.bloodTagPremium}>
                                        <Droplet size={14} color="#E53935" fill="#E53935" />
                                        <Text style={styles.bloodTagTextPremium}>A+ DONOR</Text>
                                    </View>
                                    <Text style={styles.heroTitlePremium}>A Hero is Ready!</Text>
                                    <Text style={styles.heroSubPremium}>You saved 3 lives last October. You can help again today.</Text>

                                    <TouchableOpacity
                                        style={styles.heroBtnPremium}
                                        activeOpacity={0.9}
                                        onPress={() => router.push('/schedule-donation')}
                                    >
                                        <Text style={styles.heroBtnTextPremium}>Schedule Now</Text>
                                        <ChevronRight size={18} color="#E53935" strokeWidth={3} />
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.heroProgressPremium}>
                                    <View style={styles.progressCirclePremium}>
                                        <Svg width="85" height="85" viewBox="0 0 100 100">
                                            <Circle
                                                cx="50"
                                                cy="50"
                                                r="45"
                                                stroke="rgba(255,255,255,0.2)"
                                                strokeWidth="8"
                                                fill="none"
                                            />
                                            <Circle
                                                cx="50"
                                                cy="50"
                                                r="45"
                                                stroke="white"
                                                strokeWidth="8"
                                                fill="none"
                                                strokeDasharray="282.7"
                                                strokeDashoffset="0"
                                                strokeLinecap="round"
                                            />
                                        </Svg>
                                        <View style={styles.progressValueContainer}>
                                            <Text style={styles.progressTextPremium}>100%</Text>
                                            <Text style={styles.progressLabelPremium}>Ready</Text>
                                        </View>
                                    </View>
                                </View>
                            </View>
                        </LinearGradient>
                    </Animated.View>

                    <View style={styles.statsStripContainerPremium}>
                        <Animated.View
                            entering={FadeInRight.delay(400).duration(800)}
                            style={styles.statsRowPremium}
                        >
                            {[
                                { val: '12', lab: 'Lives Saved', icon: Heart, color: '#FF2D55' },
                                { val: '5', lab: 'Donations', icon: Droplet, color: '#007AFF' },
                                { val: '850', lab: 'Points', icon: Zap, color: '#FFCC00' },
                            ].map((stat, i) => (
                                <View key={i} style={styles.statCardPremium}>
                                    <View style={[styles.statIconCircle, { backgroundColor: `${stat.color}15` }]}>
                                        <stat.icon size={20} color={stat.color} fill={i === 0 ? stat.color : 'none'} />
                                    </View>
                                    <Text style={styles.statValPremium}>{stat.val}</Text>
                                    <Text style={styles.statLabPremium}>{stat.lab}</Text>
                                </View>
                            ))}
                        </Animated.View>
                    </View>

                    <View style={styles.actionGridPremium}>
                        <Animated.View entering={FadeInDown.delay(600).duration(800)} style={{ flex: 1 }}>
                            <TouchableOpacity
                                style={styles.actionCardPremium}
                                activeOpacity={0.8}
                                onPress={() => router.push('/(tabs)/management')}
                            >
                                <LinearGradient
                                    colors={['#F0F7FF', '#FFFFFF']}
                                    style={[StyleSheet.absoluteFill, { borderRadius: 24 }]}
                                />
                                <View style={[styles.actionIconCirclePremium, { backgroundColor: '#007AFF15' }]}>
                                    <Search size={24} color="#007AFF" />
                                </View>
                                <Text style={styles.actionTitlePremium}>Find Camps</Text>
                                <Text style={styles.actionSubPremium}>Locate nearby drives</Text>
                                <View style={styles.actionArrow}>
                                    <ChevronRight size={16} color="#007AFF" />
                                </View>
                            </TouchableOpacity>
                        </Animated.View>

                        <Animated.View entering={FadeInDown.delay(750).duration(800)} style={{ flex: 1 }}>
                            <TouchableOpacity style={styles.actionCardPremium} activeOpacity={0.8}>
                                <LinearGradient
                                    colors={['#FFF9F0', '#FFFFFF']}
                                    style={[StyleSheet.absoluteFill, { borderRadius: 24 }]}
                                />
                                <View style={[styles.actionIconCirclePremium, { backgroundColor: '#FF950015' }]}>
                                    <Award size={24} color="#FF9500" />
                                </View>
                                <Text style={styles.actionTitlePremium}>My Pass</Text>
                                <Text style={styles.actionSubPremium}>View donor card</Text>
                                <View style={styles.actionArrow}>
                                    <ChevronRight size={16} color="#FF9500" />
                                </View>
                            </TouchableOpacity>
                        </Animated.View>
                    </View>

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
                                    <Text style={styles.impactDate}>Oct 24, 2026 • City Hospital</Text>
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
                    {renderHeader(config.title, config.sub, userAvatar)}
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
                        </View>
                    </View>
                </View>
            );
        }

        return (
            <View style={styles.adminContainer}>
                {renderHeader(config.title, config.sub, userAvatar)}
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
                            <FloatingSiren />
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

                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Modules</Text>
                    </View>
                    <View style={styles.moduleGrid}>
                        {[
                            { label: 'Camp Manager', icon: Building2, color: '#007AFF', bg: '#EAF6FF', route: '/camp-manager', roles: ['admin', 'manager'] },
                            { label: 'Outreach', icon: MapPin, color: '#FF9500', bg: '#FFF4E5', route: '/outreach', roles: ['admin', 'outreach'] },
                            { label: 'HR Dashboard', icon: BarChart2, color: '#5856D6', bg: '#F0EEFF', route: '/hr-dashboard', roles: ['admin', 'hr'] },
                            { label: 'Helpline', icon: Radio, color: '#FF3B30', bg: '#FFEBEA', route: '/(tabs)/helpline', roles: ['admin', 'manager', 'helpline'] },
                        ]
                            .filter(mod => role && (mod.roles as string[]).includes(role))
                            .map((mod) => (
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
        backgroundColor: '#EAFFCF0',
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
        paddingHorizontal: 20,
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
        paddingBottom: 12,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.02,
        shadowRadius: 10,
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
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1.2,
    },
    userName: {
        fontSize: 22,
        fontWeight: '900',
        color: '#1C1C1E',
        letterSpacing: -0.5,
        marginTop: 4,
    },
    avatarBorder: {
        borderWidth: 2,
        borderColor: '#F2F2F7',
        backgroundColor: '#F2F2F7',
        borderRadius: 24,
        overflow: 'hidden',
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
        overflow: 'hidden',
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
    missionContainer: {
        paddingHorizontal: 24,
        paddingVertical: 8,
        marginBottom: 8,
    },
    missionCard: {
        borderRadius: 24,
        padding: 20,
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
    impactCardModern: {
        marginHorizontal: 20,
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 12,
    },
    impactRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    impactIconModern: {
        width: 48,
        height: 48,
        borderRadius: 16,
        backgroundColor: '#FF2D55',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    impactContent: {
        flex: 1,
    },
    impactTitleModern: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1C1C1E',
    },
    impactDate: {
        fontSize: 13,
        color: '#8E8E93',
        marginTop: 4,
        fontWeight: '600',
    },
    impactBadge: {
        backgroundColor: '#EAFCF0',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
    },
    impactBadgeText: {
        color: '#34C759',
        fontSize: 11,
        fontWeight: '900',
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
        fontSize: 14,
        fontWeight: '700',
        color: '#1C1C1E',
    },
    // Premium Redesign Styles
    heroCardPremium: {
        borderRadius: 24,
        padding: 20,
        paddingBottom: 24,
        overflow: 'hidden',
        shadowColor: '#C62828',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 15,
        marginBottom: 24,
    },
    floatingDroplet: {
        position: 'absolute',
        right: -10,
        bottom: -15,
    },
    floatingSiren: {
        position: 'absolute',
        right: -30,
        bottom: -30,
        transform: [{ rotate: '-20deg' }],
    },
    bloodTagPremium: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.9)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
        alignSelf: 'flex-start',
        marginBottom: 16,
        gap: 6,
    },
    bloodTagTextPremium: {
        fontSize: 12,
        fontWeight: '900',
        color: '#E53935',
        letterSpacing: 0.5,
    },
    heroTitlePremium: {
        fontSize: 24,
        fontWeight: '900',
        color: '#FFFFFF',
        lineHeight: 30,
        marginBottom: 6,
        letterSpacing: -0.5,
    },
    heroSubPremium: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.85)',
        fontWeight: '600',
        marginBottom: 20,
        lineHeight: 18,
    },
    heroBtnPremium: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 14,
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
    },
    heroBtnTextPremium: {
        fontSize: 16,
        fontWeight: '800',
        color: '#E53935',
    },
    heroProgressPremium: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    progressCirclePremium: {
        width: 85,
        height: 85,
        justifyContent: 'center',
        alignItems: 'center',
    },
    progressValueContainer: {
        position: 'absolute',
        justifyContent: 'center',
        alignItems: 'center',
    },
    progressTextPremium: {
        fontSize: 18,
        fontWeight: '900',
        color: '#FFFFFF',
    },
    progressLabelPremium: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.8)',
        fontWeight: '700',
        marginTop: -2,
    },
    statsStripContainerPremium: {
        paddingHorizontal: 20,
        marginTop: -20,
        marginBottom: 28,
        zIndex: 10,
    },
    statsRowPremium: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    statCardPremium: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 12,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.06,
        shadowRadius: 15,
    },
    statIconCircle: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    statValPremium: {
        fontSize: 20,
        fontWeight: '900',
        color: '#1C1C1E',
        letterSpacing: -0.5,
    },
    statLabPremium: {
        fontSize: 11,
        color: '#8E8E93',
        fontWeight: '700',
        marginTop: 2,
    },
    actionGridPremium: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        gap: 12,
        marginBottom: 24,
    },
    actionCardPremium: {
        height: 120,
        borderRadius: 22,
        padding: 10,
        justifyContent: 'flex-start',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.03)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
        overflow: 'hidden',
    },
    actionIconCirclePremium: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    actionTitlePremium: {
        fontSize: 17,
        fontWeight: '900',
        color: '#1C1C1E',
        marginBottom: 4,
        letterSpacing: -0.3,
    },
    actionSubPremium: {
        fontSize: 12,
        color: '#8E8E93',
        fontWeight: '600',
    },
    actionArrow: {
        position: 'absolute',
        right: 14,
        bottom: 14,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    heroRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    heroInfo: {
        flex: 1,
        paddingRight: 20,
    },
    sectionContainer: {
        marginBottom: 32,
    },
});
