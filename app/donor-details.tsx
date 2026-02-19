import { getDonorAvatar } from '@/constants/AvatarMapping';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
    Activity,
    Award,
    Calendar,
    ChevronLeft,
    Heart,
    MapPin,
    MessageSquare,
    Phone,
    ShieldCheck,
    Star,
    Zap
} from 'lucide-react-native';
import React from 'react';
import {
    Dimensions,
    Image,
    ScrollView,
    StatusBar,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';
import {
    Card,
    Divider,
    Text
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function DonorDetailsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { name, group, city, score, gender } = useLocalSearchParams();

    // Themed avatar URL based on gender/name for realism
    const avatarUrl = getDonorAvatar(name as string, gender as 'male' | 'female');

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />

            {/* Premium Header */}
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
                    <ChevronLeft size={26} color="#1C1C1E" strokeWidth={2.5} />
                </TouchableOpacity>
                <View style={styles.headerTitleBox}>
                    <Text style={styles.headerLabel}>DONOR PROFILE</Text>
                    <Text style={styles.headerMainTitle} numberOfLines={1}>{name || 'Sanya Gupta'}</Text>
                </View>
                <TouchableOpacity style={styles.favBtn}>
                    <Star size={22} color="#FF9500" fill="#FF9500" />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* Profile Hero Section */}
                <View style={styles.heroSection}>
                    <View style={styles.avatarContainer}>
                        <View style={styles.avatarGlow} />
                        <Image source={{ uri: avatarUrl }} style={styles.mainAvatar} />
                        <LinearGradient
                            colors={['#FF3B30', '#FF2D55']}
                            style={styles.heroBadge}
                        >
                            <Text style={styles.heroBadgeText}>{group || 'O-'}</Text>
                        </LinearGradient>
                    </View>

                    <View style={styles.heroText}>
                        <Text style={styles.heroName}>{name || 'Sanya Gupta'}</Text>
                        <View style={styles.heroLocRow}>
                            <MapPin size={14} color="#8E8E93" />
                            <Text style={styles.heroLoc}>{city || 'Delhi, India'}</Text>
                        </View>
                    </View>

                    {/* Stats Lush Card */}
                    <Card style={styles.statsCard} mode="contained">
                        <View style={styles.statsRow}>
                            <View style={styles.statItem}>
                                <Text style={styles.statVal}>{score || '92'}</Text>
                                <Text style={styles.statLabel}>Health Score</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <Text style={styles.statVal}>12</Text>
                                <Text style={styles.statLabel}>Donations</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <Text style={[styles.statVal, { color: '#FF9500' }]}>Gold</Text>
                                <Text style={styles.statLabel}>Tier</Text>
                            </View>
                        </View>
                    </Card>
                </View>

                {/* Primary Action Buttons */}
                <View style={styles.actionRow}>
                    <TouchableOpacity
                        style={styles.primaryAction}
                        activeOpacity={0.8}
                        onPress={() => { /* Open Phone dialer */ }}
                    >
                        <LinearGradient colors={['#FF3B30', '#FF2D55']} style={styles.actionGradient}>
                            <Phone size={20} color="#FFFFFF" strokeWidth={2.5} />
                            <Text style={styles.actionTextMain}>Call</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.secondaryAction}
                        activeOpacity={0.7}
                        onPress={() => { /* Open Messaging */ }}
                    >
                        <MessageSquare size={20} color="#FFFFFF" strokeWidth={2.5} />
                        <Text style={styles.actionTextMain}>Message</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.tertiaryAction}
                        activeOpacity={0.7}
                        onPress={() => router.push('/schedule-donation')}
                    >
                        <Calendar size={20} color="#1C1C1E" strokeWidth={2.5} />
                        <Text style={styles.actionTextAlt}>Schedule</Text>
                    </TouchableOpacity>
                </View>

                {/* Medical Readiness Card */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <ShieldCheck size={18} color="#8E8E93" />
                        <Text style={styles.sectionTitle}>MEDICAL READINESS</Text>
                    </View>
                    <Card style={styles.infoCard} mode="contained">
                        <View style={styles.infoItem}>
                            <View style={[styles.infoIconBox, { backgroundColor: '#EAFCF0' }]}>
                                <Heart size={20} color="#34C759" />
                            </View>
                            <Text style={styles.infoItemText}>Eligible to donate today</Text>
                            <ShieldCheck size={18} color="#34C759" fill="#EAFCF0" />
                        </View>
                        <Divider style={styles.cardSeparator} />
                        <View style={styles.infoItem}>
                            <View style={[styles.infoIconBox, { backgroundColor: '#EAF6FF' }]}>
                                <Calendar size={20} color="#007AFF" />
                            </View>
                            <Text style={styles.infoItemText}>Last donated: 4 months ago</Text>
                        </View>
                        <Divider style={styles.cardSeparator} />
                        <View style={styles.infoItem}>
                            <View style={[styles.infoIconBox, { backgroundColor: '#F0EFFF' }]}>
                                <Activity size={20} color="#5856D6" />
                            </View>
                            <Text style={styles.infoItemText}>Hemoglobin: 14.5 g/dL</Text>
                        </View>
                    </Card>
                </View>

                {/* Recent Missions Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Zap size={18} color="#8E8E93" />
                        <Text style={styles.sectionTitle}>RECENT MISSIONS</Text>
                    </View>
                    <Card style={styles.infoCard} mode="contained">
                        <View style={styles.missionItem}>
                            <View style={[styles.missionIcon, { backgroundColor: '#FFEBEA' }]}>
                                <Award size={18} color="#FF3B30" />
                            </View>
                            <View style={styles.missionContent}>
                                <Text style={styles.missionTitle}>Emergency Trauma Support</Text>
                                <Text style={styles.missionMeta}>Oct 12, 2026 • Max Hospital</Text>
                            </View>
                            <View style={styles.pointsBadge}>
                                <Text style={styles.pointsText}>+12 Pts</Text>
                            </View>
                        </View>
                        <Divider style={styles.cardSeparator} />
                        <View style={styles.missionItem}>
                            <View style={[styles.missionIcon, { backgroundColor: '#F2F2F7' }]}>
                                <Zap size={18} color="#8E8E93" />
                            </View>
                            <View style={styles.missionContent}>
                                <Text style={styles.missionTitle}>Scheduled Platelet Hub</Text>
                                <Text style={styles.missionMeta}>Aug 05, 2026 • City Plaza</Text>
                            </View>
                            <View style={styles.pointsBadgeAlt}>
                                <Text style={styles.pointsTextAlt}>+8 Pts</Text>
                            </View>
                        </View>
                    </Card>
                </View>

                <View style={{ height: 60 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FB',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 20,
        backgroundColor: '#FFFFFF',
    },
    backBtn: {
        width: 48,
        height: 48,
        borderRadius: 16,
        backgroundColor: '#F2F2F7',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitleBox: {
        alignItems: 'center',
        flex: 1,
    },
    headerLabel: {
        fontSize: 11,
        fontWeight: '900',
        color: '#8E8E93',
        letterSpacing: 2,
    },
    headerMainTitle: {
        fontSize: 20,
        fontWeight: '900',
        color: '#1C1C1E',
        letterSpacing: -0.5,
    },
    favBtn: {
        width: 48,
        height: 48,
        borderRadius: 16,
        backgroundColor: '#F2F2F7',
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        paddingTop: 24,
    },
    heroSection: {
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 32,
    },
    avatarContainer: {
        position: 'relative',
        width: 120,
        height: 120,
    },
    avatarGlow: {
        position: 'absolute',
        width: 130,
        height: 130,
        borderRadius: 65,
        backgroundColor: '#FFEBEA',
        top: -5,
        left: -5,
        opacity: 0.5,
    },
    mainAvatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 4,
        borderColor: '#FFFFFF',
    },
    heroBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 3,
        borderColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    heroBadgeText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '900',
    },
    heroText: {
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 28,
    },
    heroName: {
        fontSize: 32,
        fontWeight: '900',
        color: '#1C1C1E',
        letterSpacing: -1,
    },
    heroLocRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 4,
    },
    heroLoc: {
        fontSize: 16,
        fontWeight: '600',
        color: '#8E8E93',
    },
    statsCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 32,
        padding: 24,
        width: '100%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.05,
        shadowRadius: 20,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statVal: {
        fontSize: 24,
        fontWeight: '900',
        color: '#1C1C1E',
    },
    statLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#8E8E93',
        marginTop: 2,
    },
    statDivider: {
        width: 1,
        height: 30,
        backgroundColor: '#F2F2F7',
    },
    actionRow: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        gap: 12,
        marginBottom: 32,
    },
    primaryAction: {
        flex: 1,
        height: 60,
        borderRadius: 20,
        overflow: 'hidden',
    },
    actionGradient: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    secondaryAction: {
        flex: 1,
        height: 60,
        borderRadius: 20,
        backgroundColor: '#1C1C1E',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    tertiaryAction: {
        flex: 1,
        height: 60,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        borderWidth: 2,
        borderColor: '#F2F2F7',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    actionTextMain: {
        color: '#FFFFFF',
        fontWeight: '900',
        fontSize: 14,
    },
    actionTextAlt: {
        color: '#1C1C1E',
        fontWeight: '900',
        fontSize: 14,
    },
    section: {
        paddingHorizontal: 20,
        marginBottom: 32,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 16,
        paddingLeft: 4,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '900',
        color: '#8E8E93',
        letterSpacing: 1.5,
    },
    infoCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 32,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.02,
        shadowRadius: 15,
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    infoIconBox: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    infoItemText: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1C1C1E',
        flex: 1,
    },
    cardSeparator: {
        marginVertical: 18,
        backgroundColor: '#F2F2F7',
    },
    missionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    missionIcon: {
        width: 48,
        height: 48,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    missionContent: {
        flex: 1,
    },
    missionTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1C1C1E',
    },
    missionMeta: {
        fontSize: 13,
        fontWeight: '600',
        color: '#8E8E93',
        marginTop: 2,
    },
    pointsBadge: {
        backgroundColor: '#EAFCF0',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    pointsText: {
        color: '#34C759',
        fontSize: 12,
        fontWeight: '900',
    },
    pointsBadgeAlt: {
        backgroundColor: '#F2F2F7',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    pointsTextAlt: {
        color: '#8E8E93',
        fontSize: 12,
        fontWeight: '900',
    },
});
