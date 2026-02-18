import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
    Activity,
    AlertCircle,
    CheckCircle2,
    ChevronLeft,
    Circle,
    Clock,
    Hospital,
    MapPin,
    MessageCircle,
    Phone,
    Siren,
    Star,
    User2
} from 'lucide-react-native';
import React from 'react';
import {
    Dimensions,
    ScrollView,
    StatusBar,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';
import {
    Avatar,
    Card,
    Divider,
    Text
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function RequestDetailsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

            {/* Header */}
            <View style={[styles.headerContainer, { paddingTop: insets.top + 10 }]}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
                        <ChevronLeft size={24} color="#1C1C1E" strokeWidth={2.5} />
                    </TouchableOpacity>
                    <View style={styles.headerTitleCenter}>
                        <Text style={styles.headerSubtitle}>CASE #3928</Text>
                        <Text style={styles.headerTitle}>Blood Request</Text>
                    </View>
                    <View style={styles.statusBadgeHeader}>
                        <Clock size={14} color="#FF9500" strokeWidth={2.5} />
                        <Text style={styles.statusTextHeader}>Active</Text>
                    </View>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* Time & Urgency Card */}
                <View style={styles.heroSection}>
                    <LinearGradient
                        colors={['#FF3B30', '#FF2D55']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.timeCard}
                    >
                        <View style={styles.timeHeader}>
                            <Text style={styles.timeLabel}>ELAPSED TIME</Text>
                            <Text style={styles.timeValue}>02:14:59</Text>
                        </View>
                        <View style={styles.urgentRow}>
                            <Siren size={24} color="#FFFFFF" strokeWidth={2.5} />
                            <Text style={styles.urgentText}>CRITICAL</Text>
                        </View>
                    </LinearGradient>
                </View>

                {/* Tracking Timeline */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>MISSION PROGRESS</Text>
                    <Card style={styles.premiumCard} mode="contained">
                        <View style={styles.timelineContainer}>
                            <View style={styles.timelineStep}>
                                <CheckCircle2 size={24} color="#34C759" fill="#EAFCF0" />
                                <Text style={styles.stepLabelActive}>Logged</Text>
                            </View>
                            <View style={styles.timelineConnectorActive} />
                            <View style={styles.timelineStep}>
                                <CheckCircle2 size={24} color="#34C759" fill="#EAFCF0" />
                                <Text style={styles.stepLabelActive}>Assigned</Text>
                            </View>
                            <View style={styles.timelineConnectorActive} />
                            <View style={styles.timelineStep}>
                                <View style={styles.pulseContainer}>
                                    <View style={styles.pulseInner} />
                                </View>
                                <Text style={styles.stepLabelActive}>Transit</Text>
                            </View>
                            <View style={styles.timelineConnectorInactive} />
                            <View style={styles.timelineStep}>
                                <Circle size={24} color="#E5E5EA" />
                                <Text style={styles.stepLabelInactive}>Success</Text>
                            </View>
                        </View>
                        <View style={styles.statusMessage}>
                            <Activity size={16} color="#007AFF" />
                            <Text style={styles.statusMessageText}>Volunteer in transit to City Hospital</Text>
                        </View>
                    </Card>
                </View>

                {/* Escalation Alert */}
                <View style={[styles.alertCard, { backgroundColor: '#FFEBEA' }]}>
                    <AlertCircle size={22} color="#FF3B30" />
                    <View style={styles.alertContent}>
                        <Text style={styles.alertTitle}>Threshold Warning</Text>
                        <Text style={styles.alertSubtitle}>Request has exceeded 2hr limit. High priority escalation enabled.</Text>
                    </View>
                </View>

                {/* Patient Information */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>PATIENT & HOSPITAL</Text>
                    <Card style={styles.premiumCard} mode="contained">
                        <View style={styles.infoGrid}>
                            <View style={styles.infoItem}>
                                <View style={styles.infoIconBox}>
                                    <Hospital size={18} color="#FF3B30" />
                                </View>
                                <View style={styles.infoTextContainer}>
                                    <Text style={styles.infoLabel}>HOSPITAL</Text>
                                    <Text style={styles.infoValue}>City Trauma Center</Text>
                                    <Text style={styles.infoSubValue}>A-102, ICU Ward</Text>
                                </View>
                            </View>

                            <Divider style={styles.infoDivider} />

                            <View style={styles.infoItem}>
                                <View style={styles.infoIconBox}>
                                    <User2 size={18} color="#007AFF" />
                                </View>
                                <View style={styles.infoTextContainer}>
                                    <Text style={styles.infoLabel}>PATIENT</Text>
                                    <Text style={styles.infoValue}>Kiran Patel (32M)</Text>
                                    <Text style={styles.infoSubValue}>A+ Positive (2 Units)</Text>
                                </View>
                            </View>

                            <Divider style={styles.infoDivider} />

                            <View style={styles.infoItem}>
                                <View style={styles.infoIconBox}>
                                    <MapPin size={18} color="#34C759" />
                                </View>
                                <View style={styles.infoTextContainer}>
                                    <Text style={styles.infoLabel}>LOCATION</Text>
                                    <Text style={styles.infoValue}>Indiranagar, City</Text>
                                    <Text style={styles.infoSubValue}>2.4km from current base</Text>
                                </View>
                            </View>
                        </View>
                    </Card>
                </View>

                {/* Assigned Volunteer */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>ASSIGNED OFFICER</Text>
                    <Card style={styles.premiumCard} mode="contained">
                        <View style={styles.volunteerRow}>
                            <Avatar.Image size={56} source={{ uri: 'https://i.pravatar.cc/150?u=arjun' }} style={styles.volunteerAvatar} />
                            <View style={styles.volunteerMain}>
                                <Text style={styles.volunteerName}>Arjun Mehta</Text>
                                <View style={styles.badgeRow}>
                                    <Text style={styles.badgeText}>Senior Volunteer</Text>
                                    <View style={styles.dot} />
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                        <Text style={styles.badgeText}>4.9</Text>
                                        <Star size={12} color="#FF9500" fill="#FF9500" />
                                    </View>
                                </View>
                            </View>
                            <View style={styles.actionGroup}>
                                <TouchableOpacity style={[styles.circleAction, { backgroundColor: '#EAF6FF' }]}>
                                    <MessageCircle size={20} color="#007AFF" />
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.circleAction, { backgroundColor: '#EAFCF0' }]}>
                                    <Phone size={20} color="#34C759" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </Card>
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
                <TouchableOpacity activeOpacity={0.9} style={styles.ctaBtn}>
                    <LinearGradient
                        colors={['#1C1C1E', '#000000']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.ctaGradient}
                    >
                        <CheckCircle2 size={20} color="#FFFFFF" strokeWidth={2.5} />
                        <Text style={styles.ctaText}>Log as Delivered</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F2F2F7',
    },
    headerContainer: {
        backgroundColor: '#FFFFFF',
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 10,
        elevation: 4,
        zIndex: 10,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    backBtn: {
        width: 48,
        height: 48,
        borderRadius: 16,
        backgroundColor: '#F2F2F7',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitleCenter: {
        alignItems: 'center',
    },
    headerSubtitle: {
        fontSize: 10,
        fontWeight: '800',
        color: '#8E8E93',
        letterSpacing: 2,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '900',
        color: '#1C1C1E',
        letterSpacing: -0.5,
    },
    statusBadgeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF4E5',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        gap: 6,
    },
    statusTextHeader: {
        color: '#FF9500',
        fontSize: 12,
        fontWeight: '800',
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 24,
    },
    heroSection: {
        marginBottom: 32,
    },
    timeCard: {
        borderRadius: 28,
        padding: 32,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: '#FF3B30',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    timeHeader: {
        gap: 6,
    },
    timeLabel: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 1.5,
        opacity: 0.8,
    },
    timeValue: {
        color: '#FFFFFF',
        fontSize: 36,
        fontWeight: '900',
        letterSpacing: 1,
    },
    urgentRow: {
        alignItems: 'center',
        gap: 6,
    },
    urgentText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '900',
    },
    section: {
        marginBottom: 32,
    },
    sectionLabel: {
        fontSize: 12,
        fontWeight: '800',
        color: '#8E8E93',
        letterSpacing: 1.5,
        marginBottom: 16,
        marginLeft: 4,
    },
    premiumCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 28,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.02,
        shadowRadius: 10,
        elevation: 2,
    },
    timelineContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 4,
    },
    timelineStep: {
        alignItems: 'center',
        width: 60,
    },
    timelineConnectorActive: {
        flex: 1,
        height: 3,
        backgroundColor: '#34C759',
        marginTop: -16,
    },
    timelineConnectorInactive: {
        flex: 1,
        height: 3,
        backgroundColor: '#F2F2F7',
        marginTop: -16,
    },
    stepLabelActive: {
        fontSize: 11,
        fontWeight: '800',
        color: '#1C1C1E',
        marginTop: 8,
    },
    stepLabelInactive: {
        fontSize: 11,
        fontWeight: '700',
        color: '#C7C7CC',
        marginTop: 8,
    },
    pulseContainer: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(0, 122, 255, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    pulseInner: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#007AFF',
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    statusMessage: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 32,
        gap: 10,
        backgroundColor: '#F2F2F7',
        paddingVertical: 12,
        borderRadius: 16,
    },
    statusMessageText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1C1C1E',
    },
    alertCard: {
        flexDirection: 'row',
        padding: 20,
        borderRadius: 24,
        marginBottom: 32,
        gap: 16,
    },
    alertContent: {
        flex: 1,
    },
    alertTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1C1C1E',
    },
    alertSubtitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FF3B30',
        marginTop: 4,
        lineHeight: 20,
    },
    infoGrid: {
        gap: 20,
    },
    infoItem: {
        flexDirection: 'row',
        gap: 16,
    },
    infoIconBox: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: '#F2F2F7',
        justifyContent: 'center',
        alignItems: 'center',
    },
    infoTextContainer: {
        flex: 1,
    },
    infoLabel: {
        fontSize: 10,
        fontWeight: '800',
        color: '#8E8E93',
        letterSpacing: 1.2,
    },
    infoValue: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1C1C1E',
        marginTop: 2,
    },
    infoSubValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#8E8E93',
        marginTop: 4,
    },
    infoDivider: {
        height: 1,
        backgroundColor: '#F2F2F7',
        opacity: 0.5,
    },
    volunteerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    volunteerAvatar: {
        backgroundColor: '#F2F2F7',
    },
    volunteerMain: {
        flex: 1,
    },
    volunteerName: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1C1C1E',
    },
    badgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 4,
    },
    badgeText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#8E8E93',
    },
    dot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#C7C7CC',
    },
    actionGroup: {
        flexDirection: 'row',
        gap: 10,
    },
    circleAction: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 20,
        paddingTop: 20,
        backgroundColor: 'rgba(242, 242, 247, 0.9)',
    },
    ctaBtn: {
        borderRadius: 24,
        overflow: 'hidden',
    },
    ctaGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 64,
        gap: 12,
    },
    ctaText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
});
