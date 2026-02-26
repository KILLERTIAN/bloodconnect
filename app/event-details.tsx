import { useAuth } from '@/context/AuthContext';
import { useDialog } from '@/context/DialogContext';
import { sync } from '@/lib/database';
import { Event as EventData, deleteEvent, getEventById } from '@/lib/events.service';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
    Building2,
    Calendar,
    CheckSquare,
    ChevronLeft,
    Clock,
    Edit3,
    MapPin,
    Phone,
    Share2,
    ShieldCheck,
    Trash2,
    Users
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    DeviceEventEmitter,
    Dimensions,
    Image,
    ScrollView,
    StatusBar,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';
import { Avatar, Card, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function EventDetailsScreen() {
    const { user, role } = useAuth();
    const router = useRouter();
    const { showDialog } = useDialog();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams();
    const [camp, setCamp] = useState<EventData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadEvent();
        const sub = DeviceEventEmitter.addListener('db_synced', () => {
            console.log('🔄 Auto-refreshing event details due to background sync');
            loadEvent();
        });
        return () => sub.remove();
    }, [params.id]);

    const loadEvent = async () => {
        try {
            if (params.id) {
                const idParam = Array.isArray(params.id) ? params.id[0] : params.id;
                const data = await getEventById(idParam);
                setCamp(data);
            }
        } catch (e) {
            console.error('Failed to load event:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!camp) return;
        showDialog('Delete Event', 'Are you sure you want to delete this camp?', 'warning', [
            { label: 'Cancel', style: 'cancel', onPress: () => { } },
            {
                label: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    const ok = await deleteEvent(camp.id, user!.id, role === 'admin');
                    if (ok) {
                        try { await sync(); } catch (e) { }
                        DeviceEventEmitter.emit('db_synced');
                        router.back();
                    } else {
                        showDialog('Permission Denied', 'You can only delete camps you created.', 'error');
                    }
                }
            }
        ]);
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#FF3B30" />
            </View>
        );
    }

    if (!camp) {
        return (
            <View style={styles.centered}>
                <Text style={styles.errorText}>Event not found</Text>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Text style={styles.backButtonText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // Use actual event data or fallback to placeholder
    const BLOOD_DONATION_IMAGES = [
        'https://images.unsplash.com/photo-1615461066841-6116ecaaba7f?q=80&w=1000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1536856492745-59699b353c7c?q=80&w=1000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1542884748-2b87b36c6b90?q=80&w=1000&auto=format&fit=crop'
    ];
    // Generate an index from the ID whether it's a number or a string UUID
    const idVal = typeof camp.id === 'string'
        ? camp.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
        : camp.id;
    const placeholderUrl = BLOOD_DONATION_IMAGES[idVal % BLOOD_DONATION_IMAGES.length];
    const imageUrl = camp.image_url || placeholderUrl;

    const formatDate = (dateStr: string) => {
        if (!dateStr) return 'Date TBA';
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        } catch {
            return dateStr;
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} bounces={false}>
                {/* Hero Image Section */}
                <View style={styles.heroContainer}>
                    <Image source={{ uri: imageUrl }} style={styles.heroImage} />
                    <LinearGradient
                        colors={['rgba(0,0,0,0.6)', 'transparent', 'rgba(0,0,0,0.8)']}
                        style={styles.heroOverlay}
                    />

                    <View style={[styles.headerActions, { top: insets.top + 10 }]}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.glassButton}>
                            <ChevronLeft size={24} color="#FFFFFF" />
                        </TouchableOpacity>
                        <View style={styles.rightActions}>
                            {(role === 'admin' || camp.created_by === user?.id) && (
                                <>
                                    <TouchableOpacity
                                        style={styles.glassButton}
                                        onPress={() => router.push({ pathname: '/camp-editor', params: { id: camp.id } })}
                                    >
                                        <Edit3 size={20} color="#FFFFFF" />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.glassButton, { backgroundColor: 'rgba(255,59,48,0.5)' }]}
                                        onPress={handleDelete}
                                    >
                                        <Trash2 size={20} color="#FFFFFF" />
                                    </TouchableOpacity>
                                </>
                            )}
                            <TouchableOpacity style={styles.glassButton}>
                                <Share2 size={20} color="#FFFFFF" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.heroContent}>
                        <View style={styles.categoryBadge}>
                            <Text style={styles.categoryText}>BLOOD DONATION CAMP</Text>
                        </View>
                        <Text style={styles.eventTitle}>{camp.title}</Text>
                        <View style={styles.organizerChip}>
                            <Avatar.Icon size={24} icon="office-building" style={styles.orgIcon} />
                            <Text style={styles.orgName}>{camp.organization_name}</Text>
                            <View style={styles.verifyBadge}>
                                <ShieldCheck size={12} color="#FFFFFF" />
                            </View>
                        </View>
                    </View>
                </View>

                {/* Event Highlights Area */}
                <View style={styles.contentBody}>
                    <View style={styles.statsRow}>
                        <View style={styles.statBox}>
                            <View style={[styles.iconBox, { backgroundColor: '#EAF6FF' }]}>
                                <Calendar size={20} color="#007AFF" />
                            </View>
                            <Text style={styles.statLabel}>DATE</Text>
                            <Text style={styles.statValue}>{formatDate(camp.event_date)}</Text>
                        </View>
                        <View style={[styles.statBox, styles.statDivider]}>
                            <View style={[styles.iconBox, { backgroundColor: '#FFF4E5' }]}>
                                <Clock size={20} color="#FF9500" />
                            </View>
                            <Text style={styles.statLabel}>TIME</Text>
                            <Text style={styles.statValue}>{camp.event_time || '10 AM - 6 PM'}</Text>
                        </View>
                        <View style={styles.statBox}>
                            <View style={[styles.iconBox, { backgroundColor: '#EAFCF0' }]}>
                                <Users size={20} color="#34C759" />
                            </View>
                            <Text style={styles.statLabel}>EXPECTED</Text>
                            <Text style={styles.statValue}>{camp.expected_donors || 0}</Text>
                        </View>
                    </View>

                    {/* Location Card */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Location</Text>
                        </View>
                        <Card style={styles.infoCard} mode="contained">
                            <View style={styles.locationRow}>
                                <View style={styles.locIconContainer}>
                                    <MapPin size={24} color="#FF3B30" />
                                </View>
                                <View style={styles.locDetails}>
                                    <Text style={styles.locMain}>{camp.location}</Text>
                                    {camp.city && <Text style={styles.locSub}>{camp.city}</Text>}
                                </View>
                            </View>
                        </Card>
                    </View>

                    {/* Contact Information */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Point of Contact</Text>
                        <Card style={styles.infoCard} mode="contained">
                            <View style={styles.contactRow}>
                                <View style={styles.contactInfo}>
                                    <Text style={styles.contactName}>{camp.poc_name}</Text>
                                    <View style={styles.phoneRow}>
                                        <Phone size={14} color="#8E8E93" />
                                        <Text style={styles.contactPhone}>{camp.poc_phone}</Text>
                                    </View>
                                    {camp.poc_email && (
                                        <Text style={styles.contactEmail}>{camp.poc_email}</Text>
                                    )}
                                </View>
                            </View>
                        </Card>
                    </View>

                    {/* Blood Bank Info */}
                    {camp.blood_bank_name && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Blood Bank</Text>
                            <Card style={styles.infoCard} mode="contained">
                                <View style={styles.locationRow}>
                                    <View style={[styles.locIconContainer, { backgroundColor: '#EAF6FF' }]}>
                                        <Building2 size={24} color="#007AFF" />
                                    </View>
                                    <View style={styles.locDetails}>
                                        <Text style={styles.locMain}>{camp.blood_bank_name}</Text>
                                        {camp.blood_bank_contact && (
                                            <View style={styles.phoneRow}>
                                                <Phone size={14} color="#8E8E93" />
                                                <Text style={styles.locSub}>{camp.blood_bank_contact}</Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            </Card>
                        </View>
                    )}

                    {/* About Section */}
                    {camp.notes && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>About Event</Text>
                            <Text style={styles.descriptionText}>{camp.notes}</Text>
                        </View>
                    )}

                    {/* Guidelines */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Preparation Tips</Text>
                        <View style={styles.guidelineCard}>
                            <View style={styles.guideItem}>
                                <View style={styles.dot} />
                                <Text style={styles.guideText}>Eat a healthy, iron-rich meal.</Text>
                            </View>
                            <View style={styles.guideItem}>
                                <View style={styles.dot} />
                                <Text style={styles.guideText}>Drink plenty of water before arrival.</Text>
                            </View>
                            <View style={styles.guideItem}>
                                <View style={styles.dot} />
                                <Text style={styles.guideText}>Carry a valid government photo ID.</Text>
                            </View>
                            <View style={styles.guideItem}>
                                <View style={styles.dot} />
                                <Text style={styles.guideText}>Get adequate rest the night before.</Text>
                            </View>
                        </View>
                    </View>
                </View>
            </ScrollView>

            {/* Bottom Sticky Action */}
            <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
                <View style={styles.actionRow}>
                    {(role === 'admin' || role === 'manager' || role === 'helpline') && (
                        <TouchableOpacity
                            style={styles.secondaryBtn}
                            activeOpacity={0.8}
                            onPress={() => router.push({ pathname: '/log-donors', params: { eventId: camp.id, city: camp.city } })}
                        >
                            <CheckSquare size={18} color="#FFFFFF" />
                            <Text style={styles.secondaryBtnText}>Log Donors</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        style={styles.primaryBtn}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={['#FF3B30', '#E63946']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.primaryBtnGradient}
                        >
                            <Text style={styles.primaryBtnText}>Register for Event</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFBFC',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#8E8E93',
        marginBottom: 20,
    },
    backButton: {
        backgroundColor: '#FF3B30',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
    },
    backButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    scrollContent: {
        paddingBottom: 120,
    },
    heroContainer: {
        height: 450,
        width: width,
        position: 'relative',
    },
    heroImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    heroOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    headerActions: {
        position: 'absolute',
        left: 20,
        right: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        zIndex: 10,
    },
    rightActions: {
        flexDirection: 'row',
        gap: 12,
    },
    glassButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    heroContent: {
        position: 'absolute',
        bottom: 40,
        left: 24,
        right: 24,
    },
    categoryBadge: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
        marginBottom: 12,
    },
    categoryText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1,
    },
    eventTitle: {
        fontSize: 34,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: -1,
        lineHeight: 40,
    },
    organizerChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.15)',
        padding: 5,
        borderRadius: 30,
        marginTop: 16,
        alignSelf: 'flex-start',
        paddingRight: 15,
    },
    orgIcon: {
        backgroundColor: '#FFFFFF',
    },
    orgName: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
        marginLeft: 10,
    },
    verifyBadge: {
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#007AFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 6,
    },
    contentBody: {
        marginTop: -30,
        backgroundColor: '#FAFBFC',
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
        paddingHorizontal: 24,
        paddingTop: 32,
    },
    statsRow: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderRadius: 28,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.04,
        shadowRadius: 20,
    },
    statBox: {
        flex: 1,
        alignItems: 'center',
    },
    statDivider: {
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: '#F2F2F7',
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    statLabel: {
        fontSize: 10,
        color: '#8E8E93',
        fontWeight: '800',
        letterSpacing: 1,
    },
    statLabelValue: {
        fontSize: 14,
        fontWeight: '800',
        color: '#1C1C1E',
        marginTop: 2,
    },
    statValue: {
        fontSize: 14,
        fontWeight: '800',
        color: '#1C1C1E',
        marginTop: 2,
    },
    section: {
        marginTop: 32,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '900',
        color: '#1C1C1E',
        letterSpacing: -0.5,
    },
    mapLink: {
        fontSize: 14,
        color: '#007AFF',
        fontWeight: '700',
    },
    infoCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 16,
        borderWidth: 1,
        borderColor: '#F2F2F7',
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    locIconContainer: {
        width: 50,
        height: 50,
        backgroundColor: '#FFEBEA',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    locDetails: {
        marginLeft: 16,
        flex: 1,
    },
    locMain: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1C1C1E',
    },
    locSub: {
        fontSize: 13,
        color: '#8E8E93',
        fontWeight: '600',
        marginTop: 2,
    },
    contactRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    contactInfo: {
        flex: 1,
    },
    contactName: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1C1C1E',
        marginBottom: 6,
    },
    phoneRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
    },
    contactPhone: {
        fontSize: 14,
        color: '#8E8E93',
        fontWeight: '600',
    },
    contactEmail: {
        fontSize: 13,
        color: '#8E8E93',
        fontWeight: '500',
    },
    descriptionText: {
        fontSize: 16,
        color: '#3A3A3C',
        lineHeight: 24,
        fontWeight: '500',
    },
    guidelineCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 20,
        gap: 12,
    },
    guideItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#FF3B30',
    },
    guideText: {
        fontSize: 15,
        color: '#1C1C1E',
        fontWeight: '600',
    },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 24,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#F2F2F7',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.05,
        shadowRadius: 15,
    },
    actionRow: {
        flexDirection: 'row',
        gap: 12,
    },
    secondaryBtn: {
        flex: 1,
        height: 56,
        backgroundColor: '#1C1C1E',
        borderRadius: 28,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    secondaryBtnText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '800',
    },
    primaryBtn: {
        flex: 1.5,
        height: 56,
        borderRadius: 28,
        overflow: 'hidden',
    },
    primaryBtnGradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
    },
    primaryBtnText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 0.3,
    },
});
