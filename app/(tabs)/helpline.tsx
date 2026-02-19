import { useAuth } from '@/context/AuthContext';
import {
    HelplineRequest, createHelplineRequest, getAllHelplineRequests,
    getAssignedHelplines, getDonorsForHelpline, logCall, makeHelplineLive
} from '@/lib/helpline.service';
import { LinearGradient } from 'expo-linear-gradient';
import {
    Activity,
    Award,
    Building2,
    Check,
    Droplet,
    MapPin,
    Navigation,
    Phone,
    Plus,
    Radio,
    User,
    X
} from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Linking,
    Modal, Platform, RefreshControl, ScrollView, StyleSheet, Text,
    TextInput, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const URGENCY_CONFIG = {
    critical: { label: 'CRITICAL', color: '#FF3B30', bg: '#FFEBEA' },
    urgent: { label: 'URGENT', color: '#FF9500', bg: '#FFF4E5' },
    normal: { label: 'NORMAL', color: '#34C759', bg: '#EAFFCF' },
};

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const COMPONENTS = ['Whole Blood', 'Platelets', 'Plasma', 'RBC', 'FFP'];
const URGENCIES = ['critical', 'urgent', 'normal'];

export default function HelplineScreen() {
    const { user, role } = useAuth();
    const insets = useSafeAreaInsets();
    const [requests, setRequests] = useState<HelplineRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [tab, setTab] = useState<'all' | 'live' | 'mine'>('all');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showCallModal, setShowCallModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<HelplineRequest | null>(null);
    const [donors, setDonors] = useState<any[]>([]);
    const [selectedDonor, setSelectedDonor] = useState<any | null>(null);
    const [callOutcome, setCallOutcome] = useState('');
    const [callRemarks, setCallRemarks] = useState('');
    const [callTimer, setCallTimer] = useState(0);
    const timerRef = useRef<any>(null);

    const [form, setForm] = useState({
        patient_name: '', blood_group: 'A+', blood_component: 'Whole Blood',
        units_required: '1', hospital: '', city: '', attender_name: '',
        attender_contact: '', urgency: 'urgent', required_till: '', notes: '',
    });

    const loadRequests = useCallback(async () => {
        try {
            let data: HelplineRequest[];
            if (tab === 'mine' && user) {
                data = await getAssignedHelplines(user.id) as any;
            } else {
                data = await getAllHelplineRequests();
                if (tab === 'live') data = data.filter(r => r.is_live);
            }
            setRequests(data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); setRefreshing(false); }
    }, [tab, user]);

    useEffect(() => { loadRequests(); }, [loadRequests]);

    const handleCreate = async () => {
        if (!form.patient_name || !form.hospital || !form.city || !form.attender_contact) {
            Alert.alert('Missing Fields', 'Patient name, hospital, city and attender contact are required.');
            return;
        }
        try {
            await createHelplineRequest({
                ...form,
                units_required: parseInt(form.units_required) || 1,
                created_by: user!.id,
            } as any);
            setShowAddModal(false);
            setForm({ patient_name: '', blood_group: 'A+', blood_component: 'Whole Blood', units_required: '1', hospital: '', city: '', attender_name: '', attender_contact: '', urgency: 'urgent', required_till: '', notes: '' });
            loadRequests();
            Alert.alert('Created', 'Helpline request created successfully.');
        } catch (e: any) {
            Alert.alert('Error', e.message);
        }
    };

    const handleMakeLive = async (req: HelplineRequest) => {
        Alert.alert('Make Live', 'This will assign a volunteer automatically. Continue?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Go Live', onPress: async () => {
                    await makeHelplineLive(req.id);
                    loadRequests();
                    Alert.alert('Live!', 'Helpline is now live and a volunteer has been assigned.');
                }
            }
        ]);
    };

    const handleOpenCallModal = async (req: HelplineRequest) => {
        setSelectedRequest(req);
        const donorList = await getDonorsForHelpline(req.id);
        setDonors(donorList);
        setShowCallModal(true);
    };

    const handleCall = (donor: any) => {
        setSelectedDonor(donor);
        setCallTimer(0);
        timerRef.current = setInterval(() => setCallTimer(t => t + 1), 1000);
        Linking.openURL(`tel:${donor.phone}`);
    };

    const handleEndCall = async () => {
        clearInterval(timerRef.current);
        if (!callRemarks.trim()) {
            Alert.alert('Remarks Required', 'You must fill in call remarks before closing.');
            return;
        }
        if (!callOutcome) {
            Alert.alert('Outcome Required', 'Please select a call outcome.');
            return;
        }
        try {
            await logCall({
                helpline_id: selectedRequest!.id,
                volunteer_id: user!.id,
                donor_id: selectedDonor.id,
                outcome: callOutcome,
                remarks: callRemarks,
                duration_seconds: callTimer,
            });
            setSelectedDonor(null);
            setCallRemarks('');
            setCallOutcome('');
            setCallTimer(0);
            Alert.alert('Call Logged', 'Call details saved successfully.');
        } catch (e: any) {
            Alert.alert('Error', e.message);
        }
    };

    const formatTimer = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

    const renderRequest = ({ item }: { item: HelplineRequest }) => {
        const uc = URGENCY_CONFIG[item.urgency] || URGENCY_CONFIG.normal;
        const canManage = role === 'admin' || role === 'helpline' || role === 'manager';

        return (
            <View style={styles.requestCard}>
                <View style={styles.requestHeader}>
                    <View style={styles.requestTopRow}>
                        <View style={[styles.bloodBadgeCompact, { backgroundColor: '#FFEBEA' }]}>
                            <Text style={styles.bloodTextCompact}>{item.blood_group}</Text>
                        </View>
                        <View style={styles.headerInfo}>
                            <Text style={styles.patientName} numberOfLines={1}>{item.patient_name}</Text>
                            <View style={styles.hospitalRow}>
                                <Building2 size={12} color="#8E8E93" />
                                <Text style={styles.hospitalName} numberOfLines={1}>{item.hospital}</Text>
                            </View>
                        </View>
                        <View style={styles.urgencyWrapper}>
                            <View style={[styles.urgencyBadge, { backgroundColor: uc.bg }]}>
                                <Text style={[styles.urgencyText, { color: uc.color }]}>{uc.label}</Text>
                            </View>
                            {item.is_live ? (
                                <View style={styles.liveIndicator}>
                                    <View style={styles.livePulse} />
                                    <Text style={styles.liveTextLabel}>LIVE</Text>
                                </View>
                            ) : null}
                        </View>
                    </View>
                </View>

                <View style={styles.requestDetailRow}>
                    <View style={styles.detailItem}>
                        <MapPin size={14} color="#8E8E93" />
                        <Text style={styles.detailText}>{item.city}</Text>
                    </View>
                    <View style={styles.detailItem}>
                        <Droplet size={14} color="#FF3B30" />
                        <Text style={styles.detailText}>{item.units_required} Units • {item.blood_component}</Text>
                    </View>
                </View>

                <View style={styles.requestFooter}>
                    <View style={styles.statusBadge}>
                        <Text style={styles.statusText}>{item.status.replace('_', ' ').toUpperCase()}</Text>
                    </View>
                    <View style={styles.cardActions}>
                        {canManage && !item.is_live && item.status === 'open' && (
                            <TouchableOpacity style={styles.actionBtnOutline} onPress={() => handleMakeLive(item)}>
                                <Radio size={16} color="#FF3B30" />
                                <Text style={styles.actionBtnTextOutline}>Go Live</Text>
                            </TouchableOpacity>
                        )}
                        {(item.is_live || role === 'volunteer' || role === 'helpline') && (
                            <TouchableOpacity style={styles.actionBtnSolid} onPress={() => handleOpenCallModal(item)}>
                                <Phone size={16} color="#FFFFFF" />
                                <Text style={styles.actionBtnTextSolid}>Call Donors</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#FF2D55', '#FF3B30']} style={[styles.header, { paddingTop: insets.top + 16 }]}>
                <View>
                    <Text style={styles.headerSub}>Helpline Module</Text>
                    <Text style={styles.headerTitle}>Blood Requests</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                    {(role === 'admin' || role === 'helpline' || role === 'manager') && (
                        <TouchableOpacity style={styles.headerBtn} onPress={() => setShowAddModal(true)}>
                            <Plus size={22} color="#FFFFFF" strokeWidth={3} />
                        </TouchableOpacity>
                    )}
                </View>
            </LinearGradient>

            {/* Tabs */}
            <View style={styles.tabBar}>
                {[
                    { key: 'all', label: 'All' },
                    { key: 'live', label: 'Live' },
                    { key: 'mine', label: 'My Cases' },
                ].map(t => (
                    <TouchableOpacity
                        key={t.key}
                        style={[styles.tab, tab === t.key && styles.tabActive]}
                        onPress={() => setTab(t.key as any)}
                    >
                        <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {loading ? (
                <View style={styles.centered}><ActivityIndicator size="large" color="#FF3B30" /></View>
            ) : (
                <FlatList
                    data={requests}
                    keyExtractor={item => String(item.id)}
                    renderItem={renderRequest}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadRequests(); }} />}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Activity size={48} color="#C7C7CC" />
                            <Text style={styles.emptyText}>No requests found</Text>
                        </View>
                    }
                />
            )}

            {/* Add Request Modal */}
            <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet">
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                    <View style={styles.modalContainer}>
                        <View style={[styles.modalHeader, { paddingTop: Platform.OS === 'android' ? insets.top + 16 : 20, paddingBottom: 16 }]}>
                            <TouchableOpacity onPress={() => setShowAddModal(false)} style={styles.modalCloseBtn}>
                                <X size={24} color="#8E8E93" />
                            </TouchableOpacity>
                            <Text style={styles.modalTitle}>New Request</Text>
                            <TouchableOpacity onPress={handleCreate} style={styles.modalSaveBtn}>
                                <Check size={24} color="#34C759" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
                            {[
                                { label: 'Patient Name *', key: 'patient_name', placeholder: 'Full name' },
                                { label: 'Hospital *', key: 'hospital', placeholder: 'Hospital name' },
                                { label: 'City *', key: 'city', placeholder: 'e.g. Bengaluru' },
                                { label: 'Attender Name', key: 'attender_name', placeholder: 'Attender full name' },
                                { label: 'Attender Contact *', key: 'attender_contact', placeholder: '9XXXXXXXXX', keyboard: 'phone-pad' },
                                { label: 'Units Required', key: 'units_required', placeholder: '1', keyboard: 'numeric' },
                                { label: 'Required Till Date', key: 'required_till', placeholder: 'YYYY-MM-DD' },
                                { label: 'Notes', key: 'notes', placeholder: 'Additional info...', multiline: true },
                            ].map(field => (
                                <View key={field.key} style={styles.formGroup}>
                                    <Text style={styles.formLabel}>{field.label}</Text>
                                    <TextInput
                                        style={[styles.formInput, (field as any).multiline && { height: 80, textAlignVertical: 'top' }]}
                                        placeholder={field.placeholder}
                                        placeholderTextColor="#C7C7CC"
                                        value={(form as any)[field.key]}
                                        onChangeText={v => setForm(f => ({ ...f, [field.key]: v }))}
                                        keyboardType={(field as any).keyboard || 'default'}
                                        multiline={(field as any).multiline}
                                    />
                                </View>
                            ))}

                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>Blood Group</Text>
                                <View style={styles.chipRow}>
                                    {BLOOD_GROUPS.map(bg => (
                                        <TouchableOpacity
                                            key={bg}
                                            style={[styles.chip, form.blood_group === bg && styles.chipActiveRed]}
                                            onPress={() => setForm(f => ({ ...f, blood_group: bg }))}
                                        >
                                            <Text style={[styles.chipText, form.blood_group === bg && { color: '#FFFFFF' }]}>{bg}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>Blood Component</Text>
                                <View style={styles.chipRow}>
                                    {COMPONENTS.map(c => (
                                        <TouchableOpacity
                                            key={c}
                                            style={[styles.chip, form.blood_component === c && styles.chipActiveRed]}
                                            onPress={() => setForm(f => ({ ...f, blood_component: c }))}
                                        >
                                            <Text style={[styles.chipText, form.blood_component === c && { color: '#FFFFFF' }]}>{c}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>Urgency</Text>
                                <View style={styles.chipRow}>
                                    {URGENCIES.map(u => {
                                        const uc = URGENCY_CONFIG[u as keyof typeof URGENCY_CONFIG];
                                        return (
                                            <TouchableOpacity
                                                key={u}
                                                style={[styles.chip, form.urgency === u && { backgroundColor: uc.color, borderColor: uc.color }]}
                                                onPress={() => setForm(f => ({ ...f, urgency: u }))}
                                            >
                                                <Text style={[styles.chipText, form.urgency === u && { color: '#FFFFFF' }]}>{uc.label}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Call Donors Modal */}
            <Modal visible={showCallModal} animationType="slide" presentationStyle="pageSheet">
                <View style={styles.modalContainer}>
                    <View style={[styles.modalHeader, { paddingTop: Platform.OS === 'android' ? insets.top + 16 : 20, paddingBottom: 16 }]}>
                        <TouchableOpacity
                            onPress={() => { setShowCallModal(false); setSelectedDonor(null); clearInterval(timerRef.current); }}
                            style={styles.modalCloseBtn}
                        >
                            <X size={24} color="#8E8E93" />
                        </TouchableOpacity>
                        <View style={styles.modalCenterTitle}>
                            <Text style={styles.modalTitle}>
                                {selectedRequest ? `${selectedRequest.blood_group} Donors` : 'Call Donors'}
                            </Text>
                            <Text style={styles.modalSubtitle}>{donors.length} compatible matches found</Text>
                        </View>
                        <View style={{ width: 44 }} />
                    </View>

                    {selectedDonor ? (
                        <View style={styles.callView}>
                            <LinearGradient
                                colors={['#F8F9FB', '#FFFFFF']}
                                style={styles.callCard}
                            >
                                <View style={styles.activeCallHeader}>
                                    <View style={styles.pulseContainer}>
                                        <View style={styles.pulseRing} />
                                        <View style={styles.callAvatar}>
                                            <User size={32} color="#FFFFFF" />
                                        </View>
                                    </View>
                                    <Text style={styles.callStatus}>IN CALL</Text>
                                    <Text style={styles.callTimerText}>{formatTimer(callTimer)}</Text>
                                </View>

                                <View style={styles.callerInfo}>
                                    <Text style={styles.callNameLarge}>{selectedDonor.name}</Text>
                                    <Text style={styles.callPhoneLarge}>{selectedDonor.phone}</Text>
                                </View>

                                <View style={styles.outcomeSection}>
                                    <Text style={styles.formLabelSmall}>CALL OUTCOME</Text>
                                    <View style={styles.outcomeGrid}>
                                        {[
                                            { id: 'interested', label: 'Interested', color: '#34C759' },
                                            { id: 'callback', label: 'Call Back', color: '#FF9500' },
                                            { id: 'not_interested', label: 'Not Today', color: '#8E8E93' },
                                            { id: 'donated', label: 'Donated', color: '#007AFF' },
                                            { id: 'no_answer', label: 'No Answer', color: '#FF3B30' },
                                        ].map(o => (
                                            <TouchableOpacity
                                                key={o.id}
                                                style={[
                                                    styles.outcomeBtn,
                                                    callOutcome === o.id && { backgroundColor: o.color, borderColor: o.color }
                                                ]}
                                                onPress={() => setCallOutcome(o.id)}
                                            >
                                                <Text style={[styles.outcomeBtnText, callOutcome === o.id && { color: '#FFFFFF' }]}>
                                                    {o.label}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>

                                <View style={styles.remarksContainer}>
                                    <Text style={styles.formLabelSmall}>LOG REMARKS</Text>
                                    <TextInput
                                        style={styles.remarksInput}
                                        placeholder="Add any notes from the donor..."
                                        placeholderTextColor="#C7C7CC"
                                        value={callRemarks}
                                        onChangeText={setCallRemarks}
                                        multiline
                                    />
                                </View>

                                <TouchableOpacity style={styles.saveCallBtn} onPress={handleEndCall}>
                                    <Check size={20} color="#FFFFFF" />
                                    <Text style={styles.saveCallText}>Save Call Log</Text>
                                </TouchableOpacity>
                            </LinearGradient>
                        </View>
                    ) : (
                        <FlatList
                            data={donors}
                            keyExtractor={item => String(item.id)}
                            contentContainerStyle={styles.donorList}
                            ListHeaderComponent={
                                <View style={styles.listHintBox}>
                                    <Navigation size={14} color="#007AFF" />
                                    <Text style={styles.donorListHint}>
                                        Donors are ranked by proximity to hospital first, then by donation eligibility.
                                    </Text>
                                </View>
                            }
                            renderItem={({ item, index }) => (
                                <View style={styles.premiumDonorCard}>
                                    <View style={styles.donorAvatarBase}>
                                        <Text style={styles.donorInitial}>{item.name.charAt(0)}</Text>
                                    </View>
                                    <View style={styles.donorInfoMain}>
                                        <Text style={styles.donorNameText}>{item.name}</Text>
                                        <Text style={styles.donorMetaText}>{item.city} • {item.location || 'Local'}</Text>
                                        <View style={styles.donorStatsRow}>
                                            <View style={styles.donorStatItem}>
                                                <Award size={10} color="#FF9500" />
                                                <Text style={styles.donorStatLabel}>{item.total_donations || 0} Donations</Text>
                                            </View>
                                            <View style={styles.donorStatItem}>
                                                <Activity size={10} color="#34C759" />
                                                <Text style={styles.donorStatLabel}>Last: {item.last_donation_date || 'Never'}</Text>
                                            </View>
                                        </View>
                                    </View>
                                    <TouchableOpacity style={styles.callActionBtn} onPress={() => handleCall(item)}>
                                        <Phone size={18} color="#FFFFFF" fill="#FFFFFF" />
                                    </TouchableOpacity>
                                </View>
                            )}
                            ListEmptyComponent={
                                <View style={styles.emptyCallState}>
                                    <View style={styles.emptyIconCircle}>
                                        <User size={40} color="#C7C7CC" />
                                    </View>
                                    <Text style={styles.emptyCallText}>No matching donors</Text>
                                    <Text style={styles.emptyCallSubText}>
                                        We couldn't find any available {selectedRequest?.blood_group} donors in the database for this area.
                                    </Text>
                                </View>
                            }
                        />
                    )}
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FB' },
    header: { paddingHorizontal: 24, paddingBottom: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    headerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
    headerTitle: { color: '#FFFFFF', fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
    headerBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    tabBar: { flexDirection: 'row', backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingTop: 8, borderBottomWidth: 1, borderBottomColor: '#F2F2F7' },
    tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent' },
    tabActive: { borderBottomColor: '#FF3B30' },
    tabText: { fontSize: 14, fontWeight: '700', color: '#8E8E93' },
    tabTextActive: { color: '#1C1C1E' },
    list: { padding: 16, gap: 16 },
    requestCard: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.05, shadowRadius: 15, borderWidth: 1, borderColor: '#F2F2F7' },
    requestHeader: { marginBottom: 12 },
    requestTopRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    bloodBadgeCompact: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    bloodTextCompact: { fontSize: 13, fontWeight: '900', color: '#FF3B30' },
    headerInfo: { flex: 1 },
    patientName: { fontSize: 17, fontWeight: '800', color: '#1C1C1E' },
    hospitalRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
    hospitalName: { fontSize: 12, color: '#8E8E93', fontWeight: '600' },
    urgencyWrapper: { alignItems: 'flex-end', gap: 6 },
    urgencyBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    urgencyText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
    liveIndicator: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFEBEA', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
    livePulse: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF3B30' },
    liveTextLabel: { fontSize: 10, fontWeight: '900', color: '#FF3B30' },
    requestDetailRow: { flexDirection: 'row', gap: 12, marginTop: 16, paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#F8F9FB' },
    detailItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    detailText: { fontSize: 13, color: '#3C3C43', fontWeight: '600' },
    requestFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
    statusBadge: { backgroundColor: '#F2F2F7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    statusText: { fontSize: 10, fontWeight: '800', color: '#8E8E93' },
    cardActions: { flexDirection: 'row', gap: 8 },
    actionBtnOutline: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, borderWidth: 1.5, borderColor: '#FFEBEA' },
    actionBtnTextOutline: { fontSize: 13, fontWeight: '800', color: '#FF3B30' },
    actionBtnSolid: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FF3B30', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
    actionBtnTextSolid: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
    modalContainer: { flex: 1, backgroundColor: '#FFFFFF' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#F2F2F7' },
    modalCenterTitle: { alignItems: 'center', flex: 1 },
    modalTitle: { fontSize: 18, fontWeight: '900', color: '#1C1C1E', letterSpacing: -0.5 },
    modalSubtitle: { fontSize: 12, color: '#8E8E93', fontWeight: '600', marginTop: 2 },
    modalCloseBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F2F2F7', justifyContent: 'center', alignItems: 'center' },
    modalSaveBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFEBEA', justifyContent: 'center', alignItems: 'center' },
    donorList: { padding: 20 },
    listHintBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F0F7FF', padding: 12, borderRadius: 14, marginBottom: 20 },
    donorListHint: { fontSize: 12, color: '#007AFF', fontWeight: '600', flex: 1 },
    premiumDonorCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#F2F2F7' },
    donorAvatarBase: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F2F2F7', justifyContent: 'center', alignItems: 'center' },
    donorInitial: { fontSize: 18, fontWeight: '800', color: '#8E8E93' },
    donorInfoMain: { flex: 1 },
    donorNameText: { fontSize: 16, fontWeight: '800', color: '#1C1C1E' },
    donorMetaText: { fontSize: 12, color: '#8E8E93', fontWeight: '600', marginTop: 2 },
    donorStatsRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
    donorStatItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    donorStatLabel: { fontSize: 10, fontWeight: '700', color: '#3C3C43' },
    callActionBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#34C759', justifyContent: 'center', alignItems: 'center', shadowColor: '#34C759', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
    emptyCallState: { alignItems: 'center', paddingVertical: 80, paddingHorizontal: 40 },
    emptyIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F2F2F7', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    emptyCallText: { fontSize: 18, fontWeight: '900', color: '#1C1C1E', textAlign: 'center' },
    emptyCallSubText: { fontSize: 14, color: '#8E8E93', fontWeight: '600', textAlign: 'center', marginTop: 8, lineHeight: 20 },
    callView: { flex: 1, backgroundColor: '#F8F9FB', padding: 20 },
    callCard: { backgroundColor: '#FFFFFF', borderRadius: 32, padding: 24, flex: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20 },
    activeCallHeader: { alignItems: 'center', marginBottom: 32 },
    pulseContainer: { marginBottom: 20 },
    pulseRing: { position: 'absolute', top: -10, left: -10, right: -10, bottom: -10, borderRadius: 60, borderWidth: 2, borderColor: '#FF3B30', opacity: 0.2 },
    callAvatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#FF3B30', justifyContent: 'center', alignItems: 'center' },
    callStatus: { fontSize: 12, fontWeight: '900', color: '#FF3B30', letterSpacing: 2, marginBottom: 8 },
    callTimerText: { fontSize: 36, fontWeight: '900', color: '#1C1C1E' },
    callerInfo: { alignItems: 'center', marginBottom: 32 },
    callNameLarge: { fontSize: 28, fontWeight: '900', color: '#1C1C1E' },
    callPhoneLarge: { fontSize: 18, color: '#8E8E93', fontWeight: '600', marginTop: 4 },
    outcomeSection: { marginBottom: 24 },
    formLabelSmall: { fontSize: 11, fontWeight: '900', color: '#8E8E93', letterSpacing: 1, marginBottom: 12 },
    outcomeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    outcomeBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, borderColor: '#F2F2F7', backgroundColor: '#FFFFFF' },
    outcomeBtnText: { fontSize: 12, fontWeight: '800', color: '#8E8E93' },
    remarksContainer: { marginBottom: 32 },
    remarksInput: { backgroundColor: '#F8F9FB', borderRadius: 16, padding: 16, height: 100, fontSize: 15, color: '#1C1C1E', textAlignVertical: 'top' },
    saveCallBtn: { backgroundColor: '#1C1C1E', borderRadius: 18, paddingVertical: 18, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
    saveCallText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
    formGroup: { marginBottom: 20 },
    formLabel: { fontSize: 13, fontWeight: '900', color: '#8E8E93', marginBottom: 10, letterSpacing: 0.5 },
    formInput: { backgroundColor: '#F2F2F7', borderRadius: 14, paddingHorizontal: 16, height: 48, fontSize: 15, color: '#1C1C1E', borderWidth: 1, borderColor: 'transparent' },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E5EA', backgroundColor: '#FFFFFF' },
    chipActiveRed: { backgroundColor: '#FF3B30', borderColor: '#FF3B30' },
    chipText: { fontSize: 13, fontWeight: '700', color: '#8E8E93' },
    modalScroll: { padding: 20 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyState: { alignItems: 'center', paddingVertical: 80 },
    emptyText: { fontSize: 18, fontWeight: '800', color: '#1C1C1E', marginTop: 16 },
});
