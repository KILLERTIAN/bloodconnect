import CustomDateTimePicker from '@/components/CustomDateTimePicker';
import { getDonorAvatar } from '@/constants/AvatarMapping';
import { useAuth } from '@/context/AuthContext';
import { useDialog } from '@/context/DialogContext';
import { sync } from '@/lib/database';
import { createHelplineRequest, makeHelplineLive } from '@/lib/helpline.service';
import { notifyHelplineRequest } from '@/lib/notifications.service';
import * as FileSystem from 'expo-file-system';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Building2, Calendar, ChevronLeft, LayoutGrid, MapPin, Phone, Siren, User, X } from 'lucide-react-native';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    DeviceEventEmitter,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    Modal as RNModal,
    ScrollView,
    StatusBar,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import {
    Avatar,
    Card,
    Text,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// We catch errors during import for native modules that might be missing in stale builds
let Print: any;
let Sharing: any;
try {
    Print = require('expo-print');
    Sharing = require('expo-sharing');
} catch (e) {
    console.warn('⚠️ Native export modules (Print/Sharing) not found.');
}

const { width } = Dimensions.get('window');
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

export default function CreateRequestScreen() {
    const router = useRouter();
    const { user, role } = useAuth();
    const { showDialog } = useDialog();
    const insets = useSafeAreaInsets();

    // UI State
    const [submitting, setSubmitting] = useState(false);
    const [type, setType] = useState<'emergency' | 'scheduled'>('emergency');

    // Form State
    const [patientName, setPatientName] = useState('');
    const [age, setAge] = useState(25);
    const [bloodGroup, setBloodGroup] = useState('A+');
    const [units, setUnits] = useState(1);
    const [hospitalName, setHospitalName] = useState('');
    const [city, setCity] = useState('');
    const [address, setAddress] = useState('');
    const [wardDetails, setWardDetails] = useState('');
    const [attenderName, setAttenderName] = useState('');
    const [attenderContact, setAttenderContact] = useState('');
    const [urgency, setUrgency] = useState(70); // 0-100 logic
    const [notes, setNotes] = useState('');
    const [requiredTill, setRequiredTill] = useState('');
    const [ageModalVisible, setAgeModalVisible] = useState(false);
    const [showRequiredDatePicker, setShowRequiredDatePicker] = useState(false);

    const AGE_RANGES = Array.from({ length: 43 }, (_, i) => i + 18); // 18 to 60

    const handleOpenRequiredDatePicker = () => setShowRequiredDatePicker(true);

    const onRequiredDateChange = (date: Date) => {
        setShowRequiredDatePicker(false);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        setRequiredTill(dateStr);
    };

    const formatDisplayDate = (dateStr: string) => {
        if (!dateStr || !dateStr.includes('-')) return dateStr;
        try {
            const d = new Date(dateStr + 'T00:00:00');
            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        } catch { return dateStr; }
    };

    async function shareCSV(filename: string, content: string) {
        try {
            const fileUri = `${(FileSystem as any).documentDirectory}${filename}`;
            await (FileSystem as any).writeAsStringAsync(fileUri, content, { encoding: (FileSystem as any).EncodingType?.UTF8 || 'utf8' });
            if (Sharing && (await Sharing.isAvailableAsync())) {
                await Sharing.shareAsync(fileUri);
            } else {
                showDialog('Sharing Not Available', 'Sharing is not available on this device or platform.', 'warning');
            }
        } catch (error) {
            console.error('Error sharing CSV:', error);
            showDialog('Error', 'Failed to share CSV file.', 'error');
        }
    }

    const getUrgencyKey = () => {
        if (urgency >= 66) return 'critical';
        if (urgency >= 33) return 'urgent';
        return 'normal';
    };

    const getDateValue = (): Date => {
        if (requiredTill && requiredTill.includes('-')) {
            const d = new Date(requiredTill + 'T00:00:00');
            if (!isNaN(d.getTime())) return d;
        }
        return new Date();
    };

    const handleBroadcast = async () => {
        if (!patientName || !hospitalName || !attenderContact || !city) {
            showDialog('Missing Info', 'Please fill in Patient Name, Hospital, City and Contact.', 'warning');
            return;
        }

        setSubmitting(true);
        try {
            const urgencyKey = getUrgencyKey();
            const requestId = await createHelplineRequest({
                patient_name: patientName,
                patient_age: age,
                blood_group: bloodGroup,
                units_required: units,
                hospital: hospitalName,
                city: city,
                address: address,
                ward_details: wardDetails,
                attender_name: attenderName,
                attender_contact: attenderContact,
                urgency: urgencyKey,
                case_type: type,
                required_till: requiredTill,
                notes: notes,
                created_by: user!.id,
                is_live: type === 'emergency' ? 1 : 0,
                status: 'open'
            } as any);

            if (type === 'emergency') {
                // For emergency, make it live immediately
                await makeHelplineLive(requestId);
                await notifyHelplineRequest(patientName, bloodGroup, hospitalName, urgencyKey);
            } else {
                await notifyHelplineRequest(patientName, bloodGroup, hospitalName, 'normal');
            }

            // Sync to remote + refresh UI
            try { await sync(); } catch (_e) { /* offline – queued */ }
            DeviceEventEmitter.emit('db_synced');

            if (type === 'emergency') {
                showDialog('Broadcasted!', 'Emergency case created and broadcasted to volunteers.', 'success', [
                    { label: 'View Case', onPress: () => { clearForm(); router.replace('/(tabs)/helpline'); } }
                ]);
            } else {
                showDialog('Scheduled', 'Case created and added to the planning system.', 'success', [
                    { label: 'Back to Helpline', onPress: () => { clearForm(); router.replace('/(tabs)/helpline'); } }
                ]);
            }

            clearForm();
            router.replace('/(tabs)/helpline');
        } catch (e: any) {
            showDialog('Update Error', e.message, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const clearForm = () => {
        setPatientName('');
        setAge(25);
        setBloodGroup('A+');
        setUnits(1);
        setHospitalName('');
        setCity('');
        setAddress('');
        setWardDetails('');
        setAttenderName('');
        setAttenderContact('');
        setUrgency(70);
        setNotes('');
        setRequiredTill('');
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>

                {/* Header */}
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
                            <Avatar.Image size={40} source={{ uri: user?.avatar_url || getDonorAvatar(user?.name || 'User', 'male') }} />
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
                                <Calendar size={18} color={type === 'scheduled' ? '#FFFFFF' : '#8E8E93'} style={styles.tabIcon} />
                                <Text style={[styles.tabText, type === 'scheduled' && styles.activeTabText]}>Scheduled</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                    {/* Patient Info */}
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>PATIENT INFO</Text>
                        <Card style={styles.premiumCard} mode="contained">
                            <View style={styles.premiumInputGroup}>
                                <Text style={styles.fieldLabel}>Patient Full Name *</Text>
                                <View style={styles.premiumInput}>
                                    <User size={20} color="#8E8E93" style={styles.inputIcon} />
                                    <TextInput
                                        value={patientName}
                                        onChangeText={setPatientName}
                                        placeholder="Full Name"
                                        style={styles.ghostInputFull}
                                        placeholderTextColor="#8E8E93"
                                        selectionColor="#FF3B30"
                                    />
                                </View>
                            </View>

                            <View style={styles.dualFieldRow}>
                                <View style={styles.fieldHalf}>
                                    <Text style={styles.fieldLabel}>Blood Group *</Text>
                                    <View style={styles.bloodGrid}>
                                        {BLOOD_GROUPS.map((bg) => (
                                            <TouchableOpacity
                                                key={bg}
                                                onPress={() => setBloodGroup(bg)}
                                                style={[
                                                    styles.bloodChip,
                                                    bloodGroup === bg && styles.bloodChipActive
                                                ]}
                                            >
                                                <Text style={[styles.bloodChipText, bloodGroup === bg && styles.bloodChipTextActive]}>{bg}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                            </View>

                            <View style={styles.dualFieldRow}>
                                <View style={styles.fieldHalf}>
                                    <Text style={styles.fieldLabel}>Units Required *</Text>
                                    <View style={styles.selectorWrapper}>
                                        <TouchableOpacity style={styles.selectorBtn} onPress={() => setUnits(Math.max(1, units - 1))}>
                                            <Text style={styles.selectorBtnText}>-</Text>
                                        </TouchableOpacity>
                                        <View style={styles.selectorValue}>
                                            <Text style={styles.selectorText}>{units}</Text>
                                        </View>
                                        <TouchableOpacity style={styles.selectorBtn} onPress={() => setUnits(units + 1)}>
                                            <Text style={styles.selectorBtnText}>+</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                                <View style={styles.fieldHalf}>
                                    <Text style={styles.fieldLabel}>Patient Age *</Text>
                                    <TouchableOpacity
                                        style={styles.dropdownSelector}
                                        onPress={() => setAgeModalVisible(true)}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={styles.selectorText}>{age} Yrs</Text>
                                        <ChevronLeft size={18} color="#8E8E93" style={{ transform: [{ rotate: '-90deg' }] }} />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <RNModal
                                visible={ageModalVisible}
                                transparent
                                animationType="fade"
                                onRequestClose={() => setAgeModalVisible(false)}
                            >
                                <View style={styles.modalOverlay}>
                                    <TouchableOpacity
                                        style={styles.modalBackdrop}
                                        activeOpacity={1}
                                        onPress={() => setAgeModalVisible(false)}
                                    />
                                    <View style={styles.ageModalContainer}>
                                        <LinearGradient
                                            colors={['#FF3B30', '#FF2D55']}
                                            style={styles.modalIconBox}
                                        >
                                            <User size={32} color="#FFFFFF" strokeWidth={2.5} />
                                        </LinearGradient>

                                        <TouchableOpacity
                                            style={styles.modalCloseBtn}
                                            onPress={() => setAgeModalVisible(false)}
                                        >
                                            <X size={20} color="#C7C7CC" />
                                        </TouchableOpacity>

                                        <Text style={styles.modalTitle}>Patient Age</Text>
                                        <Text style={styles.modalSubtitle}>Select the correct age for blood compatibility matching</Text>

                                        <ScrollView style={{ maxHeight: 300, width: '100%' }} showsVerticalScrollIndicator={false}>
                                            <View style={styles.ageGrid}>
                                                {AGE_RANGES.map((a) => (
                                                    <TouchableOpacity
                                                        key={a}
                                                        onPress={() => {
                                                            setAge(a);
                                                            setAgeModalVisible(false);
                                                        }}
                                                        style={[styles.ageOption, age === a && styles.ageOptionActive]}
                                                    >
                                                        <Text style={[styles.ageOptionText, age === a && styles.ageOptionTextActive]}>{a}</Text>
                                                    </TouchableOpacity>
                                                ))}
                                            </View>
                                        </ScrollView>
                                    </View>
                                </View>
                            </RNModal>
                        </Card>
                    </View>

                    {/* Hospital Info */}
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>HOSPITAL DETAILS</Text>
                        <Card style={styles.premiumCard} mode="contained">
                            <View style={styles.premiumInputGroup}>
                                <Text style={styles.fieldLabel}>Hospital Name *</Text>
                                <View style={styles.premiumInput}>
                                    <Building2 size={20} color="#8E8E93" style={styles.inputIcon} />
                                    <TextInput
                                        value={hospitalName}
                                        onChangeText={setHospitalName}
                                        placeholder="Hospital Name"
                                        style={styles.ghostInputFull}
                                        placeholderTextColor="#8E8E93"
                                        selectionColor="#FF3B30"
                                    />
                                </View>
                            </View>

                            <View style={styles.dualFieldRow}>
                                <View style={styles.fieldHalf}>
                                    <Text style={styles.fieldLabel}>City *</Text>
                                    <View style={styles.premiumInput}>
                                        <MapPin size={20} color="#8E8E93" style={styles.inputIcon} />
                                        <TextInput
                                            value={city}
                                            onChangeText={setCity}
                                            placeholder="City"
                                            style={styles.ghostInputFull}
                                            placeholderTextColor="#8E8E93"
                                            selectionColor="#FF3B30"
                                        />
                                    </View>
                                </View>
                                <View style={styles.fieldHalf}>
                                    <Text style={styles.fieldLabel}>Ward/Bed</Text>
                                    <View style={styles.premiumInput}>
                                        <LayoutGrid size={20} color="#8E8E93" style={styles.inputIcon} />
                                        <TextInput
                                            value={wardDetails}
                                            onChangeText={setWardDetails}
                                            placeholder="Ward 4"
                                            style={styles.ghostInputFull}
                                            placeholderTextColor="#8E8E93"
                                            selectionColor="#FF3B30"
                                        />
                                    </View>
                                </View>
                            </View>

                            <View style={[styles.premiumInputGroup, { marginTop: 16 }]}>
                                <Text style={styles.fieldLabel}>Full Address / Landmark</Text>
                                <View style={styles.premiumInput}>
                                    <TextInput
                                        value={address}
                                        onChangeText={setAddress}
                                        placeholder="Full address"
                                        style={styles.ghostInputFull}
                                        placeholderTextColor="#8E8E93"
                                        selectionColor="#FF3B30"
                                    />
                                </View>
                            </View>
                        </Card>
                    </View>

                    {/* Attender Details */}
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>ATTENDER DETAILS</Text>
                        <Card style={styles.premiumCard} mode="contained">
                            <View style={styles.premiumInputGroup}>
                                <Text style={styles.fieldLabel}>Attender Full Name</Text>
                                <View style={styles.premiumInput}>
                                    <User size={20} color="#8E8E93" style={styles.inputIcon} />
                                    <TextInput
                                        value={attenderName}
                                        onChangeText={setAttenderName}
                                        placeholder="Full Name"
                                        style={styles.ghostInputFull}
                                        placeholderTextColor="#8E8E93"
                                        selectionColor="#FF3B30"
                                    />
                                </View>
                            </View>
                            <View style={styles.premiumInputGroup}>
                                <Text style={styles.fieldLabel}>Contact Number *</Text>
                                <View style={styles.premiumInput}>
                                    <Phone size={20} color="#8E8E93" style={styles.inputIcon} />
                                    <TextInput
                                        value={attenderContact}
                                        onChangeText={setAttenderContact}
                                        placeholder="+91 00000 00000"
                                        keyboardType="phone-pad"
                                        style={styles.ghostInputFull}
                                        placeholderTextColor="#8E8E93"
                                        selectionColor="#FF3B30"
                                    />
                                </View>
                            </View>
                        </Card>
                    </View>

                    {/* Urgency / Scheduling */}
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>{type === 'emergency' ? 'URGENCY LEVEL' : 'SCHEDULE TIME'}</Text>
                        <Card style={styles.premiumCard} mode="contained">
                            {type === 'emergency' ? (
                                <View>
                                    <View style={styles.urgencyHeader}>
                                        <View style={styles.urgencyBadge}>
                                            <Siren size={14} color="#FF3B30" strokeWidth={3} />
                                            <Text style={styles.urgencyBadgeText}>{getUrgencyKey().toUpperCase()} FLAG</Text>
                                        </View>
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
                                </View>
                            ) : (
                                <View>
                                    <View style={styles.quickTimeRow}>
                                        {['Asap', 'Today', 'Tomorrow', 'In 2 Days'].map((t) => (
                                            <TouchableOpacity
                                                key={t}
                                                style={[styles.timeChip, requiredTill === t && styles.timeChipActive]}
                                                onPress={() => setRequiredTill(t)}
                                            >
                                                <Text style={[styles.timeChipText, requiredTill === t && styles.timeChipTextActive]}>{t}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                    <TouchableOpacity
                                        style={styles.premiumInput}
                                        onPress={handleOpenRequiredDatePicker}
                                        activeOpacity={0.7}
                                    >
                                        <Calendar size={18} color="#E63946" style={styles.inputIcon} />
                                        <Text style={[styles.ghostInputFull, !requiredTill && { color: '#8E8E93' }]}>
                                            {requiredTill ? formatDisplayDate(requiredTill) : 'Select Date'}
                                        </Text>
                                    </TouchableOpacity>

                                    <CustomDateTimePicker
                                        visible={showRequiredDatePicker}
                                        mode="date"
                                        title="Needed By"
                                        onClose={() => setShowRequiredDatePicker(false)}
                                        onConfirm={onRequiredDateChange}
                                        initialDate={getDateValue()}
                                        minimumDate={new Date()}
                                    />
                                </View>
                            )}
                        </Card>
                    </View>

                    {/* Internal Notes */}
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>ADDITIONAL NOTES</Text>
                        <Card style={styles.premiumCard} mode="contained">
                            <TextInput
                                value={notes}
                                onChangeText={setNotes}
                                placeholder="Any other specific instructions..."
                                multiline
                                numberOfLines={3}
                                style={styles.notesInput}
                                placeholderTextColor="#8E8E93"
                                selectionColor="#FF3B30"
                            />
                        </Card>
                    </View>

                    <View style={{ height: 100 }} />
                </ScrollView>

                {/* Footer Action */}
                <View style={[styles.footer, { paddingBottom: Platform.OS === 'ios' ? insets.bottom : 12 }]}>
                    <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={handleBroadcast}
                        disabled={submitting}
                        style={[styles.mainActionBtn, submitting && { opacity: 0.7 }]}
                    >
                        <LinearGradient
                            colors={['#FF3B30', '#FF2D55']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.mainActionGradient}
                        >
                            {submitting ? (
                                <ActivityIndicator color="#FFFFFF" size="small" />
                            ) : (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                    <Siren size={22} color="#FFFFFF" strokeWidth={2.5} />
                                    <Text style={styles.mainActionText}>
                                        {type === 'emergency' ? 'Broadcast SOS' : 'Schedule Request'}
                                    </Text>
                                </View>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAFBFC' },
    headerContainer: { backgroundColor: '#FFFFFF', borderBottomLeftRadius: 36, borderBottomRightRadius: 36, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.03, shadowRadius: 15, zIndex: 10 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 20 },
    backBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#F2F2F7', justifyContent: 'center', alignItems: 'center' },
    headerTitleCenter: { alignItems: 'center' },
    headerSubtitle: { fontSize: 10, fontWeight: '800', color: '#8E8E93', letterSpacing: 2 },
    headerTitle: { fontSize: 22, fontWeight: '900', color: '#1C1C1E', letterSpacing: -0.5 },
    headerRight: { width: 44, alignItems: 'center' },
    toggleSection: { paddingHorizontal: 20, paddingBottom: 24 },
    tabContainer: { flexDirection: 'row', backgroundColor: '#F2F2F7', borderRadius: 20, padding: 6, gap: 6 },
    tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 44, borderRadius: 14, gap: 8 },
    activeTab: { backgroundColor: '#FF3B30', shadowColor: '#FF3B30', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
    tabIcon: { marginBottom: 0 },
    tabText: { fontSize: 14, fontWeight: '700', color: '#8E8E93' },
    activeTabText: { color: '#FFFFFF' },
    scrollContent: { paddingHorizontal: 20, paddingTop: 24 },
    section: { marginBottom: 24 },
    sectionLabel: { fontSize: 12, fontWeight: '800', color: '#8E8E93', letterSpacing: 1.5, marginBottom: 12, marginLeft: 4 },
    premiumCard: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 10 },
    fieldLabel: { fontSize: 13, fontWeight: '800', color: '#1C1C1E', marginBottom: 12 },
    bloodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
    bloodChip: { width: (width - 80 - 24) / 4, height: 42, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F2F2F7', borderRadius: 12 },
    bloodChipActive: { backgroundColor: '#FF3B30' },
    bloodChipText: { fontSize: 14, fontWeight: '700', color: '#8E8E93' },
    bloodChipTextActive: { color: '#FFFFFF' },
    dualFieldRow: { flexDirection: 'row', gap: 16, marginBottom: 16 },
    fieldHalf: { flex: 1 },
    selectorWrapper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F2F2F7', borderRadius: 12, padding: 10, height: 48 },
    selectorBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
    selectorBtnText: { fontSize: 18, fontWeight: '700', color: '#1C1C1E' },
    selectorValue: { flex: 1, alignItems: 'center' },
    selectorText: { fontSize: 16, fontWeight: '800', color: '#1C1C1E' },
    dropdownSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F2F2F7', borderRadius: 12, paddingHorizontal: 16, height: 48 },
    modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
    ageModalContainer: { width: width * 0.85, backgroundColor: '#FFFFFF', borderRadius: 32, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
    modalIconBox: { width: 72, height: 72, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginTop: -60, shadowColor: '#FF3B30', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 8 },
    modalCloseBtn: { position: 'absolute', top: 16, right: 16, padding: 4 },
    modalTitle: { fontSize: 20, fontWeight: '900', color: '#1C1C1E', marginTop: 12, marginBottom: 4 },
    modalSubtitle: { fontSize: 14, fontWeight: '500', color: '#8E8E93', textAlign: 'center', marginBottom: 20, paddingHorizontal: 10 },
    ageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
    ageOption: { width: 50, height: 50, borderRadius: 12, backgroundColor: '#F2F2F7', justifyContent: 'center', alignItems: 'center' },
    ageOptionActive: { backgroundColor: '#FF3B30' },
    ageOptionText: { fontSize: 15, fontWeight: '700', color: '#8E8E93' },
    ageOptionTextActive: { color: '#FFFFFF' },
    quickTimeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
    timeChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: '#F2F2F7' },
    timeChipActive: { backgroundColor: '#FFEBEA', borderWidth: 1, borderColor: '#FF3B30' },
    timeChipText: { fontSize: 12, fontWeight: '700', color: '#8E8E93' },
    timeChipTextActive: { color: '#FF3B30' },
    premiumInputGroup: { marginBottom: 16 },
    premiumInput: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F2F2F7', borderRadius: 14, paddingHorizontal: 16, height: 48 },
    inputIcon: { marginRight: 12 },
    ghostInputFull: { flex: 1, backgroundColor: 'transparent', fontSize: 15, fontWeight: '600', padding: 0 },
    urgencyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    urgencyBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFEBEA', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, gap: 6 },
    urgencyBadgeText: { fontSize: 10, fontWeight: '900', color: '#FF3B30' },
    urgencySliderContainer: { marginBottom: 10 },
    sliderTrack: { height: 6, backgroundColor: '#F2F2F7', borderRadius: 3, position: 'relative' },
    sliderFill: { position: 'absolute', height: 6, borderRadius: 3 },
    sliderThumb: { position: 'absolute', top: -10, width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 3, borderColor: '#FF3B30' },
    sliderLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
    sliderLabelText: { fontSize: 11, fontWeight: '700', color: '#8E8E93' },
    activeSliderLabel: { color: '#FF3B30', fontWeight: '900' },
    notesInput: { backgroundColor: 'transparent', fontSize: 14, fontWeight: '500', padding: 0 },
    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 16, backgroundColor: 'rgba(255, 255, 255, 0.95)', borderTopWidth: 1, borderTopColor: '#F2F2F7' },
    mainActionBtn: { borderRadius: 20, overflow: 'hidden' },
    mainActionGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 10 },
    mainActionText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
});

