import { useAuth } from '@/context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
    AlertTriangle,
    Building2,
    ChevronLeft,
    LayoutGrid,
    MapPin,
    Siren
} from 'lucide-react-native';
import React, { useState } from 'react';
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
    Text,
    TextInput
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

export default function CreateRequestScreen() {
    const router = useRouter();
    const { role } = useAuth();
    const insets = useSafeAreaInsets();
    const [bloodGroup, setBloodGroup] = useState('A+');
    const [type, setType] = useState('emergency');
    const [urgency, setUrgency] = useState(70);
    const [units, setUnits] = useState(1);
    const [age, setAge] = useState(25);
    const [hospitalName, setHospitalName] = useState('');
    const [location, setLocation] = useState('');
    const [wardDetails, setWardDetails] = useState('');
    const [notes, setNotes] = useState('');

    const handleBroadcast = () => {
        // Collect all data if needed
        router.push('/request-details');
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

            {/* Extended Header */}
            <View style={[styles.headerContainer, { paddingTop: insets.top + 10 }]}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
                        <ChevronLeft size={24} color="#1C1C1E" strokeWidth={2.5} />
                    </TouchableOpacity>
                    <View style={styles.headerTitleCenter}>
                        <Text style={styles.headerSubtitle}>COMMAND CENTER</Text>
                        <Text style={styles.headerTitle}>New Case</Text>
                    </View>
                    <View style={styles.headerRight}>
                        <Avatar.Image size={44} source={{ uri: 'https://i.pravatar.cc/150?u=helpline' }} style={styles.avatarMain} />
                    </View>
                </View>

                {/* Case Type Toggle */}
                <View style={styles.toggleSection}>
                    <View style={styles.tabContainer}>
                        <TouchableOpacity
                            onPress={() => setType('emergency')}
                            style={[styles.tab, type === 'emergency' && styles.activeTab]}
                        >
                            <Siren size={18} color={type === 'emergency' ? '#FFFFFF' : '#8E8E93'} style={styles.tabIcon} />
                            <Text style={[styles.tabText, type === 'emergency' && styles.activeTabText]}>Emergency</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setType('scheduled')}
                            style={[styles.tab, type === 'scheduled' && styles.activeTab]}
                        >
                            <LayoutGrid size={18} color={type === 'scheduled' ? '#FFFFFF' : '#8E8E93'} style={styles.tabIcon} />
                            <Text style={[styles.tabText, type === 'scheduled' && styles.activeTabText]}>Scheduled</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>PATIENT & BLOOD INFO</Text>
                    <Card style={styles.premiumCard} mode="contained">
                        <Text style={styles.fieldLabel}>Select Blood Group</Text>
                        <View style={styles.bloodGrid}>
                            {BLOOD_GROUPS.map((bg) => (
                                <TouchableOpacity
                                    key={bg}
                                    onPress={() => setBloodGroup(bg)}
                                    style={[
                                        styles.bloodChip,
                                        bloodGroup === bg && styles.bloodChipActive
                                    ]}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[
                                        styles.bloodChipText,
                                        bloodGroup === bg && styles.bloodChipTextActive
                                    ]}>{bg}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={styles.dualFieldRow}>
                            <View style={styles.fieldHalf}>
                                <Text style={styles.fieldLabel}>Units Required</Text>
                                <View style={styles.selectorWrapper}>
                                    <TouchableOpacity
                                        style={styles.selectorBtn}
                                        onPress={() => setUnits(Math.max(1, units - 1))}
                                    >
                                        <Text style={styles.selectorBtnText}>-</Text>
                                    </TouchableOpacity>
                                    <View style={styles.selectorValue}>
                                        <Text style={styles.selectorText}>{units}</Text>
                                        <Text style={styles.selectorSub}>Units</Text>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.selectorBtn}
                                        onPress={() => setUnits(units + 1)}
                                    >
                                        <Text style={styles.selectorBtnText}>+</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                            <View style={styles.fieldHalf}>
                                <Text style={styles.fieldLabel}>Patient Age</Text>
                                <View style={styles.selectorWrapper}>
                                    <TouchableOpacity
                                        style={styles.selectorBtn}
                                        onPress={() => setAge(Math.max(1, age - 1))}
                                    >
                                        <Text style={styles.selectorBtnText}>-</Text>
                                    </TouchableOpacity>
                                    <View style={styles.selectorValue}>
                                        <Text style={styles.selectorText}>{age}</Text>
                                        <Text style={styles.selectorSub}>Yrs</Text>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.selectorBtn}
                                        onPress={() => setAge(age + 1)}
                                    >
                                        <Text style={styles.selectorBtnText}>+</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Card>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>HOSPITAL DETAILS</Text>
                    <Card style={styles.premiumCard} mode="contained">
                        <View style={styles.premiumInputGroup}>
                            <Text style={styles.fieldLabel}>Hospital Name</Text>
                            <View style={styles.premiumInput}>
                                <Building2 size={20} color="#8E8E93" style={styles.inputIcon} />
                                <TextInput
                                    value={hospitalName}
                                    onChangeText={setHospitalName}
                                    placeholder="Enter hospital name"
                                    style={styles.ghostInputFull}
                                    placeholderTextColor="#C7C7CC"
                                    cursorColor="#FF3B30"
                                    underlineColor="transparent"
                                    activeUnderlineColor="transparent"
                                />
                            </View>
                        </View>

                        <View style={styles.premiumInputGroup}>
                            <Text style={styles.fieldLabel}>Location Address</Text>
                            <View style={styles.premiumInput}>
                                <MapPin size={20} color="#FF3B30" style={styles.inputIcon} />
                                <TextInput
                                    value={location}
                                    onChangeText={setLocation}
                                    placeholder="City, Area or Pincode"
                                    style={styles.ghostInputFull}
                                    placeholderTextColor="#C7C7CC"
                                    underlineColor="transparent"
                                    activeUnderlineColor="transparent"
                                />
                                <TouchableOpacity style={styles.gpsBtn}>
                                    <Text style={styles.gpsText}>GPS</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.premiumInputGroup}>
                            <Text style={styles.fieldLabel}>Ward & Bed details</Text>
                            <View style={styles.premiumInput}>
                                <LayoutGrid size={20} color="#8E8E93" style={styles.inputIcon} />
                                <TextInput
                                    value={wardDetails}
                                    onChangeText={setWardDetails}
                                    placeholder="e.g. ICU Ward 4, Bed 12"
                                    style={styles.ghostInputFull}
                                    placeholderTextColor="#C7C7CC"
                                    underlineColor="transparent"
                                    activeUnderlineColor="transparent"
                                />
                            </View>
                        </View>
                    </Card>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>URGENCY LEVEL</Text>
                    <Card style={styles.premiumCard} mode="contained">
                        <View style={styles.urgencyHeader}>
                            <View style={styles.urgencyBadge}>
                                <Siren size={14} color="#FF3B30" strokeWidth={3} />
                                <Text style={styles.urgencyBadgeText}>CRITICAL FLAG</Text>
                            </View>
                            <Text style={styles.timeEstimate}>Need in ~2 hrs</Text>
                        </View>

                        <View style={styles.urgencySliderContainer}>
                            <TouchableOpacity
                                activeOpacity={1}
                                style={styles.sliderTrack}
                                onPress={(e) => {
                                    const { locationX } = e.nativeEvent;
                                    const newUrgency = Math.round((locationX / (width - 88)) * 100);
                                    setUrgency(Math.max(0, Math.min(100, newUrgency)));
                                }}
                            >
                                <LinearGradient
                                    colors={['#FFCC00', '#FF3B30']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={[styles.sliderFill, { width: `${urgency}%` }]}
                                />
                                <View style={[styles.sliderThumb, { left: `${urgency}%`, marginLeft: -14 }]} />
                            </TouchableOpacity>
                            <View style={styles.sliderLabels}>
                                <TouchableOpacity onPress={() => setUrgency(10)}><Text style={[styles.sliderLabelText, urgency < 33 && styles.activeSliderLabel]}>Stable</Text></TouchableOpacity>
                                <TouchableOpacity onPress={() => setUrgency(50)}><Text style={[styles.sliderLabelText, urgency >= 33 && urgency < 66 && styles.activeSliderLabel]}>Urgent</Text></TouchableOpacity>
                                <TouchableOpacity onPress={() => setUrgency(90)}><Text style={[styles.sliderLabelText, urgency >= 66 && styles.activeSliderLabel]}>SOS</Text></TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.pillCloud}>
                            <View style={[styles.statusPill, styles.activePill]}>
                                <AlertTriangle size={14} color="#FF3B30" />
                                <Text style={styles.activePillText}>Accident</Text>
                            </View>
                            <View style={styles.statusPill}>
                                <Text style={styles.statusPillText}>Surgery</Text>
                            </View>
                            <View style={styles.statusPill}>
                                <Text style={styles.statusPillText}>Pregnancy</Text>
                            </View>
                            <View style={styles.statusPill}>
                                <Text style={styles.statusPillText}>ChildCare</Text>
                            </View>
                        </View>
                    </Card>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>INTERNAL NOTES</Text>
                    <Card style={styles.premiumCard} mode="contained">
                        <TextInput
                            value={notes}
                            onChangeText={setNotes}
                            placeholder="Add brief medical context or instructions for volunteers..."
                            multiline
                            numberOfLines={4}
                            style={styles.notesInput}
                            placeholderTextColor="#C7C7CC"
                            underlineColor="transparent"
                            activeUnderlineColor="transparent"
                        />
                    </Card>
                </View>

                <View style={{ height: 140 }} />
            </ScrollView>

            <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
                <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={handleBroadcast}
                    style={styles.mainActionBtn}
                >
                    <LinearGradient
                        colors={['#FF3B30', '#FF2D55']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.mainActionGradient}
                    >
                        <Siren size={22} color="#FFFFFF" strokeWidth={2.5} />
                        <Text style={styles.mainActionText}>Broadcast Request</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFBFC',
    },
    headerContainer: {
        backgroundColor: '#FFFFFF',
        borderBottomLeftRadius: 36,
        borderBottomRightRadius: 36,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.03,
        shadowRadius: 15,
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
    headerRight: {
        width: 48,
        alignItems: 'flex-end',
    },
    avatarMain: {
        backgroundColor: '#F2F2F7',
    },
    toggleSection: {
        paddingHorizontal: 20,
        paddingBottom: 24,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#F2F2F7',
        borderRadius: 20,
        padding: 6,
        gap: 6,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 48,
        borderRadius: 16,
        gap: 8,
    },
    activeTab: {
        backgroundColor: '#FF3B30',
        shadowColor: '#FF3B30',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    tabIcon: {
        marginBottom: 0,
    },
    tabText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#8E8E93',
    },
    activeTabText: {
        color: '#FFFFFF',
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 24,
    },
    section: {
        marginBottom: 28,
    },
    sectionLabel: {
        fontSize: 12,
        fontWeight: '800',
        color: '#8E8E93',
        letterSpacing: 1.5,
        marginBottom: 12,
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
    },
    fieldLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1C1C1E',
        marginBottom: 16,
    },
    bloodGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 24,
    },
    bloodChip: {
        width: (width - 88 - 24) / 4, // width - (container_pad * 2 + card_pad * 2) - gaps
        height: 52,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F2F2F7',
        borderRadius: 16,
    },
    bloodChipActive: {
        backgroundColor: '#FF3B30',
    },
    bloodChipText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#8E8E93',
    },
    bloodChipTextActive: {
        color: '#FFFFFF',
    },
    dualFieldRow: {
        flexDirection: 'row',
        gap: 16,
    },
    fieldHalf: {
        flex: 1,
    },
    selectorWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F2F2F7',
        borderRadius: 16,
        padding: 4,
        height: 56,
    },
    selectorBtn: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    selectorBtnText: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1C1C1E',
    },
    selectorValue: {
        alignItems: 'center',
        flex: 1,
    },
    selectorText: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1C1C1E',
    },
    selectorSub: {
        fontSize: 10,
        fontWeight: '700',
        color: '#8E8E93',
        marginTop: -2,
    },
    premiumInputGroup: {
        marginBottom: 20,
    },
    premiumInput: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F2F2F7',
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 56,
    },
    inputIcon: {
        marginRight: 12,
    },
    ghostInputFull: {
        flex: 1,
        backgroundColor: 'transparent',
        fontSize: 16,
        fontWeight: '600',
    },
    gpsBtn: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        marginLeft: 8,
    },
    gpsText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#FF3B30',
    },
    urgencyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    urgencyBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFEBEA',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
        gap: 8,
    },
    urgencyBadgeText: {
        fontSize: 11,
        fontWeight: '900',
        color: '#FF3B30',
        letterSpacing: 0.5,
    },
    timeEstimate: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FF3B30',
    },
    urgencySliderContainer: {
        marginBottom: 24,
    },
    sliderTrack: {
        height: 8,
        backgroundColor: '#F2F2F7',
        borderRadius: 4,
        position: 'relative',
    },
    sliderFill: {
        position: 'absolute',
        height: 8,
        borderRadius: 4,
    },
    sliderThumb: {
        position: 'absolute',
        top: -10,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#FFFFFF',
        borderWidth: 4,
        borderColor: '#FF3B30',
        shadowColor: '#FF3B30',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    sliderLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 12,
    },
    sliderLabelText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#8E8E93',
    },
    activeSliderLabel: {
        color: '#FF3B30',
        fontWeight: '900',
    },
    pillCloud: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    statusPill: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        backgroundColor: '#F2F2F7',
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    activePill: {
        backgroundColor: '#FFEBEA',
        borderWidth: 1.5,
        borderColor: '#FF3B30',
    },
    statusPillText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#8E8E93',
    },
    activePillText: {
        fontSize: 13,
        fontWeight: '800',
        color: '#FF3B30',
    },
    notesInput: {
        backgroundColor: 'transparent',
        fontSize: 15,
        fontWeight: '500',
        padding: 0,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 20,
        paddingTop: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderTopWidth: 1,
        borderTopColor: '#F2F2F7',
    },
    mainActionBtn: {
        borderRadius: 24,
        overflow: 'hidden',
        shadowColor: '#FF3B30',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2, // Reduced for premium feel
        shadowRadius: 15,
    },
    mainActionGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 64,
        gap: 12,
    },
    mainActionText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
});
