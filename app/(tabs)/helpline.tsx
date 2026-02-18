import { useAuth } from '@/context/AuthContext';
import {
    HelplineRequest, createHelplineRequest, getAllHelplineRequests,
    getAssignedHelplines, getDonorsForHelpline, logCall, makeHelplineLive
} from '@/lib/helpline.service';
import { LinearGradient } from 'expo-linear-gradient';
import {
    Activity,
    Check,
    Droplet,
    Phone,
    Plus, Radio, User, X
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
                    <View style={[styles.bloodBadge, { backgroundColor: '#FFEBEA' }]}>
                        <Text style={styles.bloodText}>{item.blood_group}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.patientName}>{item.patient_name}</Text>
                        <Text style={styles.hospitalName}>{item.hospital} • {item.city}</Text>
                    </View>
                    <View style={styles.rightBadges}>
                        <View style={[styles.urgencyBadge, { backgroundColor: uc.bg }]}>
                            <Text style={[styles.urgencyText, { color: uc.color }]}>{uc.label}</Text>
                        </View>
                        {item.is_live ? (
                            <View style={styles.liveBadge}>
                                <Radio size={10} color="#FF3B30" />
                                <Text style={styles.liveText}>LIVE</Text>
                            </View>
                        ) : null}
                    </View>
                </View>

                <View style={styles.requestMeta}>
                    <View style={styles.metaChip}>
                        <Droplet size={12} color="#FF3B30" />
                        <Text style={styles.metaChipText}>{item.units_required} units • {item.blood_component}</Text>
                    </View>
                    <View style={styles.metaChip}>
                        <Phone size={12} color="#8E8E93" />
                        <Text style={styles.metaChipText}>{item.attender_contact}</Text>
                    </View>
                    {item.required_till ? (
                        <View style={styles.metaChip}>
                            <Activity size={12} color="#8E8E93" />
                            <Text style={styles.metaChipText}>Till {item.required_till}</Text>
                        </View>
                    ) : null}
                </View>

                <View style={styles.requestActions}>
                    <Text style={styles.statusText}>{item.status.replace('_', ' ').toUpperCase()}</Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                        {canManage && !item.is_live && item.status === 'open' && (
                            <TouchableOpacity style={styles.liveBtn} onPress={() => handleMakeLive(item)}>
                                <Radio size={14} color="#FF3B30" />
                                <Text style={styles.liveBtnText}>Go Live</Text>
                            </TouchableOpacity>
                        )}
                        {(item.is_live || role === 'volunteer' || role === 'helpline') && (
                            <TouchableOpacity style={styles.callBtn} onPress={() => handleOpenCallModal(item)}>
                                <Phone size={14} color="#FFFFFF" />
                                <Text style={styles.callBtnText}>Call Donors</Text>
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
                        <View style={[styles.modalHeader, { paddingTop: Platform.OS === 'ios' ? 20 : insets.top + 10 }]}>
                            <TouchableOpacity onPress={() => setShowAddModal(false)} style={styles.modalCloseBtn}>
                                <X size={24} color="#8E8E93" />
                            </TouchableOpacity>
                            <Text style={styles.modalTitle}>New Request</Text>
                            <TouchableOpacity onPress={handleCreate} style={styles.modalSaveBtn}>
                                <Check size={24} color="#FF3B30" />
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
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => { setShowCallModal(false); setSelectedDonor(null); clearInterval(timerRef.current); }}>
                            <X size={24} color="#1C1C1E" />
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>
                            {selectedRequest ? `${selectedRequest.blood_group} Donors` : 'Donors'}
                        </Text>
                        <View style={{ width: 24 }} />
                    </View>

                    {selectedDonor ? (
                        // Active call view
                        <View style={styles.callView}>
                            <View style={styles.callAvatar}>
                                <User size={40} color="#FFFFFF" />
                            </View>
                            <Text style={styles.callName}>{selectedDonor.name}</Text>
                            <Text style={styles.callPhone}>{selectedDonor.phone}</Text>
                            <Text style={styles.callTimer}>{formatTimer(callTimer)}</Text>

                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>Call Outcome *</Text>
                                <View style={styles.chipRow}>
                                    {['interested', 'not_interested', 'no_answer', 'callback', 'donated'].map(o => (
                                        <TouchableOpacity
                                            key={o}
                                            style={[styles.chip, callOutcome === o && styles.chipActiveRed]}
                                            onPress={() => setCallOutcome(o)}
                                        >
                                            <Text style={[styles.chipText, callOutcome === o && { color: '#FFFFFF' }]}>
                                                {o.replace('_', ' ')}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>Remarks * (Required)</Text>
                                <TextInput
                                    style={[styles.formInput, { height: 80, textAlignVertical: 'top' }]}
                                    placeholder="Enter call remarks before closing..."
                                    placeholderTextColor="#C7C7CC"
                                    value={callRemarks}
                                    onChangeText={setCallRemarks}
                                    multiline
                                />
                            </View>

                            <TouchableOpacity style={styles.endCallBtn} onPress={handleEndCall}>
                                <Text style={styles.endCallText}>End Call & Save</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        // Donor list
                        <FlatList
                            data={donors}
                            keyExtractor={item => String(item.id)}
                            contentContainerStyle={styles.list}
                            ListHeaderComponent={
                                <Text style={styles.donorListHint}>
                                    Sorted by location match and last donation date. Tap Call to initiate.
                                </Text>
                            }
                            renderItem={({ item }) => (
                                <View style={styles.donorCard}>
                                    <View style={[styles.bloodBadge, { backgroundColor: '#FFEBEA' }]}>
                                        <Text style={styles.bloodText}>{item.blood_group}</Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.donorName}>{item.name}</Text>
                                        <Text style={styles.donorMeta}>{item.city} • Last: {item.last_donation_date || 'Never'}</Text>
                                    </View>
                                    <TouchableOpacity style={styles.callDonorBtn} onPress={() => handleCall(item)}>
                                        <Phone size={16} color="#FFFFFF" />
                                    </TouchableOpacity>
                                </View>
                            )}
                            ListEmptyComponent={
                                <View style={styles.emptyState}>
                                    <User size={40} color="#C7C7CC" />
                                    <Text style={styles.emptyText}>No matching donors</Text>
                                    <Text style={styles.emptySubText}>No {selectedRequest?.blood_group} donors in database</Text>
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
    header: { paddingHorizontal: 24, paddingBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '700', letterSpacing: 1 },
    headerTitle: { color: '#FFFFFF', fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
    headerBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    tabBar: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F2F2F7' },
    tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
    tabActive: { borderBottomWidth: 2, borderBottomColor: '#FF3B30' },
    tabText: { fontSize: 14, fontWeight: '700', color: '#8E8E93' },
    tabTextActive: { color: '#FF3B30' },
    list: { padding: 16, gap: 12 },
    requestCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3 },
    requestHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
    bloodBadge: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    bloodText: { fontSize: 14, fontWeight: '900', color: '#FF3B30' },
    patientName: { fontSize: 16, fontWeight: '800', color: '#1C1C1E' },
    hospitalName: { fontSize: 12, color: '#8E8E93', fontWeight: '600', marginTop: 2 },
    rightBadges: { gap: 4, alignItems: 'flex-end' },
    urgencyBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    urgencyText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
    liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFEBEA', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    liveText: { fontSize: 10, fontWeight: '900', color: '#FF3B30' },
    requestMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
    metaChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F2F2F7', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
    metaChipText: { fontSize: 12, color: '#3C3C43', fontWeight: '600' },
    requestActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F2F2F7', paddingTop: 10 },
    statusText: { fontSize: 11, fontWeight: '800', color: '#8E8E93' },
    liveBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFEBEA', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12 },
    liveBtnText: { fontSize: 13, fontWeight: '800', color: '#FF3B30' },
    callBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FF3B30', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12 },
    callBtnText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyState: { alignItems: 'center', paddingVertical: 60 },
    emptyText: { fontSize: 18, fontWeight: '800', color: '#3C3C43', marginTop: 16 },
    emptySubText: { fontSize: 14, color: '#8E8E93', fontWeight: '600', marginTop: 6 },
    modalContainer: { flex: 1, backgroundColor: '#FFFFFF' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#F2F2F7', backgroundColor: '#FFFFFF' },
    modalTitle: { fontSize: 19, fontWeight: '900', color: '#1C1C1E', letterSpacing: -0.5 },
    modalCloseBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F2F2F7', justifyContent: 'center', alignItems: 'center' },
    modalSaveBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFEBEA', justifyContent: 'center', alignItems: 'center' },
    modalCancel: { fontSize: 16, color: '#8E8E93', fontWeight: '600' },
    modalSave: { fontSize: 16, fontWeight: '800' },
    modalScroll: { padding: 16 },
    formGroup: { marginBottom: 16, paddingHorizontal: 16 },
    formLabel: { fontSize: 13, fontWeight: '700', color: '#3C3C43', marginBottom: 8 },
    formInput: { backgroundColor: '#FFFFFF', borderRadius: 14, paddingHorizontal: 16, height: 48, fontSize: 15, color: '#1C1C1E', borderWidth: 1, borderColor: '#E5E5EA' },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E5EA', backgroundColor: '#FFFFFF' },
    chipActiveRed: { backgroundColor: '#FF3B30', borderColor: '#FF3B30' },
    chipText: { fontSize: 13, fontWeight: '700', color: '#8E8E93' },
    donorListHint: { fontSize: 13, color: '#8E8E93', fontWeight: '600', marginBottom: 12, textAlign: 'center' },
    donorCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
    donorName: { fontSize: 15, fontWeight: '800', color: '#1C1C1E' },
    donorMeta: { fontSize: 12, color: '#8E8E93', fontWeight: '600', marginTop: 2 },
    callDonorBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#34C759', justifyContent: 'center', alignItems: 'center' },
    callView: { flex: 1, padding: 24, alignItems: 'center' },
    callAvatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#FF3B30', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    callName: { fontSize: 24, fontWeight: '900', color: '#1C1C1E' },
    callPhone: { fontSize: 16, color: '#8E8E93', fontWeight: '600', marginTop: 4, marginBottom: 8 },
    callTimer: { fontSize: 32, fontWeight: '900', color: '#FF3B30', marginBottom: 24 },
    endCallBtn: { backgroundColor: '#FF3B30', borderRadius: 18, paddingVertical: 16, paddingHorizontal: 32, marginTop: 16, width: '100%', alignItems: 'center' },
    endCallText: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
});
