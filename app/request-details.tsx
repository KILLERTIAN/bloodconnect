import { getDonorAvatar } from '@/constants/AvatarMapping';
import { getLiveHelplines, HelplineRequest, updateHelplineStatus } from '@/lib/helpline.service';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
    Activity,
    AlertCircle,
    CheckCircle2,
    ChevronLeft,
    Circle,
    Hospital,
    MapPin,
    MessageCircle,
    Phone,
    Siren,
    Star,
    User2
} from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Linking,
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
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [loading, setLoading] = useState(true);
    const [request, setRequest] = useState<HelplineRequest | null>(null);
    const [elapsedTime, setElapsedTime] = useState('00:00:00');
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        loadRequest();
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [id]);

    const requestId = Array.isArray(id) ? id[0] : id;

    const loadRequest = async () => {
        try {
            const helplines = await getLiveHelplines();
            const found = helplines.find(h => String(h.id) === String(requestId));
            if (found) {
                setRequest(found);
                startTimer(found.created_at);
            } else {
                const dummy: HelplineRequest = {
                    id: requestId || '3928',
                    patient_name: 'Kiran Patel',
                    patient_age: 32,
                    blood_group: 'A+',
                    blood_component: 'Whole Blood',
                    units_required: 2,
                    hospital: 'City Trauma Center',
                    ward_details: 'A-102, ICU Ward',
                    city: 'Indiranagar',
                    urgency: 'critical',
                    case_type: 'emergency',
                    is_live: 1,
                    status: 'in_progress',
                    created_at: new Date(Date.now() - 8099000).toISOString(), // ~2h 15m ago
                    created_by: '1',
                    notes: 'Blood required immediately for surgery.',
                    attender_name: 'Rahul',
                    attender_contact: '9876543210',
                    required_till: '',
                    updated_at: ''
                };
                setRequest(dummy);
                startTimer(dummy.created_at);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const startTimer = (startTimeStr: string) => {
        if (timerRef.current) clearInterval(timerRef.current);

        const update = () => {
            const start = new Date(startTimeStr).getTime();
            const now = Date.now();
            const diff = now - start;

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            setElapsedTime(
                `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
            );
        };

        update();
        timerRef.current = setInterval(update, 1000) as any;
    };

    const handleLogDelivered = async () => {
        if (!request) return;
        try {
            await updateHelplineStatus(request.id, 'fulfilled');
            router.back();
        } catch (e) {
            console.error(e);
        }
    };

    if (loading) {
        return <View style={styles.centered}><ActivityIndicator color="#FF3B30" /></View>;
    }

    if (!request) {
        return <View style={styles.centered}><Text>Request not found</Text></View>;
    }

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'open': return { color: '#E67E22', bg: '#FFF3E0' };
            case 'in_progress': return { color: '#007AFF', bg: '#EAF6FF' };
            case 'fulfilled': return { color: '#34C759', bg: '#EAFCF0' };
            default: return { color: '#8E8E93', bg: '#F2F2F7' };
        }
    };

    const statusConfig = getStatusConfig(request.status);
    const urgencyColor = request.urgency === 'critical' ? '#FF3B30' : request.urgency === 'urgent' ? '#FF9500' : '#34C759';

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

            {/* Header */}
            <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
                <View style={styles.header}>
                    <View style={styles.headerSideLeft}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
                            <ChevronLeft size={24} color="#1C1C1E" strokeWidth={2.5} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.headerTitleCenter}>
                        <Text style={styles.headerSubtitle} numberOfLines={1}>
                            CASE #{String(request.id).length > 12 ? String(request.id).substring(0, 8).toUpperCase() : String(request.id).toUpperCase()}
                        </Text>
                        <Text style={styles.headerTitle} numberOfLines={1}>Blood Request</Text>
                    </View>

                    <View style={styles.headerSideRight}>
                        <View style={[styles.statusBadgeHeader, { backgroundColor: statusConfig.bg }]}>
                            <View style={[styles.statusDot, { backgroundColor: statusConfig.color }]} />
                            <Text style={[styles.statusTextHeader, { color: statusConfig.color }]}>
                                {request.status.replace('_', ' ').toUpperCase()}
                            </Text>
                        </View>
                    </View>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* Time & Urgency Card */}
                <View style={styles.heroSection}>
                    <LinearGradient
                        colors={[urgencyColor, '#FF2D55']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.timeCard}
                    >
                        <View style={styles.timeHeader}>
                            <Text style={styles.timeLabel}>ELAPSED TIME</Text>
                            <Text style={styles.timeValue}>{elapsedTime}</Text>
                        </View>
                        <View style={styles.urgentRow}>
                            <Siren size={24} color="#FFFFFF" strokeWidth={2.5} />
                            <Text style={styles.urgentText}>{request.urgency.toUpperCase()}</Text>
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
                            <Text style={styles.statusMessageText}>Volunteer in transit to {request.hospital}</Text>
                        </View>
                    </Card>
                </View>

                {/* Escalation Alert */}
                {(elapsedTime.startsWith('02') || elapsedTime.startsWith('03') || elapsedTime.startsWith('04')) && (
                    <View style={[styles.alertCard, { backgroundColor: '#FFEBEA' }]}>
                        <AlertCircle size={22} color="#FF3B30" />
                        <View style={styles.alertContent}>
                            <Text style={styles.alertTitle}>Threshold Warning</Text>
                            <Text style={styles.alertSubtitle}>Request has exceeded 2hr limit. High priority escalation enabled.</Text>
                        </View>
                    </View>
                )}

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
                                    <Text style={styles.infoValue}>{request.hospital}</Text>
                                    <Text style={styles.infoSubValue}>{request.ward_details || 'General Ward'}</Text>
                                </View>
                            </View>

                            <Divider style={styles.infoDivider} />

                            <View style={styles.infoItem}>
                                <View style={styles.infoIconBox}>
                                    <User2 size={18} color="#007AFF" />
                                </View>
                                <View style={styles.infoTextContainer}>
                                    <Text style={styles.infoLabel}>PATIENT</Text>
                                    <Text style={styles.infoValue}>{request.patient_name}{request.patient_age ? ` (${request.patient_age})` : ''}</Text>
                                    <Text style={styles.infoSubValue}>{request.blood_group} ({request.units_required} Units)</Text>
                                </View>
                            </View>

                            <Divider style={styles.infoDivider} />

                            <View style={styles.infoItem}>
                                <View style={styles.infoIconBox}>
                                    <MapPin size={18} color="#34C759" />
                                </View>
                                <View style={styles.infoTextContainer}>
                                    <Text style={styles.infoLabel}>LOCATION</Text>
                                    <Text style={styles.infoValue}>{request.city}</Text>
                                    <Text style={styles.infoSubValue}>Active mission area</Text>
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
                            <Avatar.Image size={56} source={{ uri: getDonorAvatar(request.assigned_volunteer || 'Volunteer', 'male') }} style={styles.volunteerAvatar} />
                            <View style={styles.volunteerMain}>
                                <Text style={styles.volunteerName}>{request.assigned_volunteer || 'Lead Volunteer'}</Text>
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
                                <TouchableOpacity style={[styles.circleAction, { backgroundColor: '#EAF6FF' }]} onPress={() => Linking.openURL(`sms:${request.attender_contact}`)}>
                                    <MessageCircle size={20} color="#007AFF" />
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.circleAction, { backgroundColor: '#EAFCF0' }]} onPress={() => Linking.openURL(`tel:${request.attender_contact}`)}>
                                    <Phone size={20} color="#34C759" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </Card>
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
                <TouchableOpacity activeOpacity={0.9} style={styles.ctaBtn} onPress={handleLogDelivered}>
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
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
        zIndex: 10,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingBottom: 12,
        height: 64,
    },
    headerSideLeft: {
        width: 80,
        height: '100%',
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    headerSideRight: {
        width: 80,
        height: '100%',
        justifyContent: 'center',
        alignItems: 'flex-end',
    },
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: '#F2F2F7',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitleCenter: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerSubtitle: {
        fontSize: 10,
        fontWeight: '800',
        color: '#8E8E93',
        letterSpacing: 1.5,
        marginBottom: 2,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: '#1C1C1E',
        letterSpacing: -0.5,
    },
    statusBadgeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
        gap: 6,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusTextHeader: {
        fontSize: 10,
        fontWeight: '900',
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 24,
        paddingBottom: 160,
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
    },
    timeHeader: {
        gap: 6,
    },
    timeLabel: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 2,
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
        fontSize: 11,
        fontWeight: '800',
        color: '#8E8E93',
        letterSpacing: 1.5,
        marginBottom: 12,
        marginLeft: 8,
    },
    premiumCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 12,
        borderWidth: 1,
        borderColor: '#F2F2F7',
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
        fontSize: 15,
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
    },
    volunteerAvatar: {
        backgroundColor: '#F2F2F7',
        marginRight: 16,
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
        paddingTop: 24,
        backgroundColor: '#F2F2F7',
        borderTopWidth: 1,
        borderTopColor: '#E5E5EA',
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
