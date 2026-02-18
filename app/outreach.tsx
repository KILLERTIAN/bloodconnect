import { useAuth } from '@/context/AuthContext';
import { createLead, getAllLeads, OutreachLead, updateLeadStatus } from '@/lib/outreach.service';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
    Building2,
    Check, ChevronLeft,
    ChevronRight, Filter, MapPin, Phone, Plus, Search, Tag, User,
    X,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Modal,
    Platform, RefreshControl, ScrollView, StyleSheet, Text, TextInput,
    TouchableOpacity, View,
} from 'react-native';
import { Chip } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    not_contacted: { label: 'Not Contacted', color: '#8E8E93', bg: '#F2F2F7' },
    pending: { label: 'Pending', color: '#FF9500', bg: '#FFF4E5' },
    successful: { label: 'Successful', color: '#34C759', bg: '#EAFFCF' },
    cancelled: { label: 'Cancelled', color: '#FF3B30', bg: '#FFEBEA' },
};

const ORG_CATEGORIES = ['school', 'college', 'corporate', 'ngo', 'hospital', 'other'];
const LEAD_TYPES = ['awareness_session', 'camp'];

export default function OutreachScreen() {
    const { user, role } = useAuth();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [leads, setLeads] = useState<OutreachLead[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState<string | null>(null);
    const [filterType, setFilterType] = useState<string | null>(null);
    const [filterCategory, setFilterCategory] = useState<string | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showFilterModal, setShowFilterModal] = useState(false);

    const [form, setForm] = useState({
        organization_name: '', poc_name: '', poc_phone: '', poc_email: '',
        purpose: '', occasion: '', type: 'camp', org_category: 'corporate',
        city: '', location: '', notes: '',
    });

    const loadLeads = useCallback(async () => {
        try {
            const data = await getAllLeads({
                status: filterStatus || undefined,
                type: filterType || undefined,
                org_category: filterCategory || undefined,
            });
            setLeads(data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); setRefreshing(false); }
    }, [filterStatus, filterType, filterCategory]);

    useEffect(() => { loadLeads(); }, [loadLeads]);

    const handleCreate = async () => {
        if (!form.organization_name || !form.poc_name || !form.poc_phone) {
            Alert.alert('Missing Fields', 'Organization name, POC name and phone are required.');
            return;
        }
        try {
            await createLead({ ...form as any, created_by: user!.id });
            setShowAddModal(false);
            setForm({ organization_name: '', poc_name: '', poc_phone: '', poc_email: '', purpose: '', occasion: '', type: 'camp', org_category: 'corporate', city: '', location: '', notes: '' });
            loadLeads();
            Alert.alert('Lead Added', 'New outreach lead created successfully.');
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to create lead.');
        }
    };

    const handleStatusChange = (lead: OutreachLead) => {
        const statuses = Object.keys(STATUS_CONFIG);
        Alert.alert('Update Status', 'Select new status:', [
            ...statuses.map(s => ({
                text: STATUS_CONFIG[s].label,
                onPress: async () => {
                    await updateLeadStatus(lead.id, s);
                    loadLeads();
                }
            })),
            { text: 'Cancel', style: 'cancel' }
        ]);
    };

    const filtered = leads.filter(l => {
        if (!search) return true;
        return l.organization_name.toLowerCase().includes(search.toLowerCase()) ||
            l.poc_name.toLowerCase().includes(search.toLowerCase()) ||
            (l.city || '').toLowerCase().includes(search.toLowerCase());
    });

    const renderLead = ({ item }: { item: OutreachLead }) => {
        const sc = STATUS_CONFIG[item.status] || STATUS_CONFIG.not_contacted;
        return (
            <TouchableOpacity style={styles.leadCard} activeOpacity={0.85}>
                <View style={styles.leadHeader}>
                    <View style={[styles.orgIcon, { backgroundColor: '#EAF6FF' }]}>
                        <Building2 size={20} color="#007AFF" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.orgName} numberOfLines={1}>{item.organization_name}</Text>
                        <Text style={styles.orgCategory}>{item.org_category?.toUpperCase()} • {item.type === 'camp' ? 'Blood Camp' : 'Awareness Session'}</Text>
                    </View>
                    <TouchableOpacity
                        style={[styles.statusBadge, { backgroundColor: sc.color }]}
                        onPress={() => handleStatusChange(item)}
                    >
                        <Text style={[styles.statusText, { color: '#FFFFFF' }]}>{sc.label}</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.leadMeta}>
                    <View style={styles.metaRow}>
                        <User size={13} color="#8E8E93" />
                        <Text style={styles.metaText}>{item.poc_name}</Text>
                    </View>
                    <View style={styles.metaRow}>
                        <Phone size={13} color="#8E8E93" />
                        <Text style={styles.metaText}>{item.poc_phone}</Text>
                    </View>
                    {item.city ? (
                        <View style={styles.metaRow}>
                            <MapPin size={13} color="#8E8E93" />
                            <Text style={styles.metaText}>{item.city}</Text>
                        </View>
                    ) : null}
                    {item.purpose ? (
                        <View style={styles.metaRow}>
                            <Tag size={13} color="#8E8E93" />
                            <Text style={styles.metaText} numberOfLines={1}>{item.purpose}</Text>
                        </View>
                    ) : null}
                </View>

                <View style={styles.leadFooter}>
                    <Text style={styles.dateText}>{item.created_at?.split('T')[0]}</Text>
                    <ChevronRight size={16} color="#C7C7CC" />
                </View>
            </TouchableOpacity>
        );
    };

    const counts = Object.keys(STATUS_CONFIG).map(s => ({
        ...STATUS_CONFIG[s],
        key: s,
        count: leads.filter(l => l.status === s).length,
    }));

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#FF9500', '#FF6B00']} style={[styles.header, { paddingTop: insets.top + 16 }]}>
                <View style={styles.headerTitleRow}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtnHeader}>
                        <ChevronLeft size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                    <View>
                        <Text style={styles.headerSub}>Outreach Module</Text>
                        <Text style={styles.headerTitle}>Lead Management</Text>
                    </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity style={styles.headerBtn} onPress={() => setShowFilterModal(true)}>
                        <Filter size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.headerBtn} onPress={() => setShowAddModal(true)}>
                        <Plus size={20} color="#FFFFFF" strokeWidth={3} />
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            {/* Status Summary Chips */}
            <View style={styles.summaryContainer}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.summaryScrollContent}
                >
                    {counts.map(c => (
                        <Chip
                            key={c.key}
                            selected={filterStatus === c.key}
                            onPress={() => setFilterStatus(filterStatus === c.key ? null : c.key)}
                            style={[
                                styles.summaryChip,
                                filterStatus === c.key
                                    ? { backgroundColor: c.color, borderWidth: 0 }
                                    : { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E5EA' }
                            ]}
                            showSelectedCheck={false}
                            textStyle={[
                                styles.summaryChipText,
                                { color: filterStatus === c.key ? '#FFFFFF' : '#8E8E93' }
                            ]}
                            mode="flat"
                        >
                            {c.label} ({c.count})
                        </Chip>
                    ))}
                </ScrollView>
            </View>

            {/* Search */}
            <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                    <Search size={18} color="#8E8E93" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search organizations, POC, city..."
                        placeholderTextColor="#C7C7CC"
                        value={search}
                        onChangeText={setSearch}
                    />
                </View>
            </View>

            {loading ? (
                <View style={styles.centered}><ActivityIndicator size="large" color="#FF9500" /></View>
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={item => String(item.id)}
                    renderItem={renderLead}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadLeads(); }} />}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Building2 size={48} color="#C7C7CC" />
                            <Text style={styles.emptyText}>No leads found</Text>
                            <Text style={styles.emptySubText}>Tap + to add a new outreach lead</Text>
                        </View>
                    }
                />
            )}

            {/* Add Lead Modal */}
            <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet">
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                    <View style={styles.modalContainer}>
                        <View style={[styles.modalHeader, { paddingTop: Platform.OS === 'ios' ? 20 : insets.top + 10 }]}>
                            <TouchableOpacity onPress={() => setShowAddModal(false)} style={styles.modalCloseBtn}>
                                <X size={24} color="#8E8E93" />
                            </TouchableOpacity>
                            <Text style={styles.modalTitle}>New Outreach Lead</Text>
                            <TouchableOpacity onPress={handleCreate} style={styles.modalSaveBtn}>
                                <Check size={24} color="#FF9500" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
                            {[
                                { label: 'Organization Name *', key: 'organization_name', placeholder: 'e.g. TCS Bengaluru' },
                                { label: 'POC Name *', key: 'poc_name', placeholder: 'Contact person' },
                                { label: 'POC Phone *', key: 'poc_phone', placeholder: '9XXXXXXXXX', keyboard: 'phone-pad' },
                                { label: 'POC Email', key: 'poc_email', placeholder: 'poc@company.com', keyboard: 'email-address' },
                                { label: 'Purpose', key: 'purpose', placeholder: 'e.g. CSR Initiative' },
                                { label: 'Occasion', key: 'occasion', placeholder: 'e.g. Foundation Day' },
                                { label: 'City', key: 'city', placeholder: 'e.g. Bengaluru' },
                                { label: 'Location', key: 'location', placeholder: 'Full address' },
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
                                <Text style={styles.formLabel}>Type</Text>
                                <View style={styles.segmentRow}>
                                    {LEAD_TYPES.map(t => (
                                        <TouchableOpacity
                                            key={t}
                                            style={[styles.segmentBtn, form.type === t && styles.segmentBtnActive]}
                                            onPress={() => setForm(f => ({ ...f, type: t }))}
                                        >
                                            <Text style={[styles.segmentText, form.type === t && styles.segmentTextActive]}>
                                                {t === 'camp' ? 'Blood Camp' : 'Awareness Session'}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>Organization Category</Text>
                                <View style={styles.chipRow}>
                                    {ORG_CATEGORIES.map(c => (
                                        <TouchableOpacity
                                            key={c}
                                            style={[styles.chip, form.org_category === c && styles.chipActive]}
                                            onPress={() => setForm(f => ({ ...f, org_category: c }))}
                                        >
                                            <Text style={[styles.chipText, form.org_category === c && styles.chipTextActive]}>
                                                {c.charAt(0).toUpperCase() + c.slice(1)}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FB' },
    header: { paddingHorizontal: 20, paddingBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    backBtnHeader: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '700', letterSpacing: 1 },
    headerTitle: { color: '#FFFFFF', fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
    headerBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    summaryContainer: { marginBottom: 16 },
    summaryScrollContent: { paddingHorizontal: 16, gap: 8 },
    summaryChip: { borderRadius: 16 },
    summaryChipText: { fontSize: 13, fontWeight: '700' },
    searchContainer: { paddingHorizontal: 16, paddingBottom: 8 },
    searchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFFFFF', borderRadius: 16, paddingHorizontal: 16, height: 46, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
    searchInput: { flex: 1, fontSize: 15, color: '#1C1C1E' },
    list: { padding: 16, gap: 12 },
    leadCard: { backgroundColor: '#FFFFFF', borderRadius: 28, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 3, borderWidth: 1, borderColor: '#F2F2F7' },
    leadHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
    orgIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    orgName: { fontSize: 16, fontWeight: '800', color: '#1C1C1E' },
    orgCategory: { fontSize: 11, color: '#8E8E93', fontWeight: '700', marginTop: 2, letterSpacing: 0.5 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
    statusText: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
    leadMeta: { gap: 6, marginBottom: 12 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    metaText: { fontSize: 13, color: '#3C3C43', fontWeight: '600' },
    leadFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F2F2F7', paddingTop: 10 },
    dateText: { fontSize: 12, color: '#C7C7CC', fontWeight: '600' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyState: { alignItems: 'center', paddingVertical: 80 },
    emptyText: { fontSize: 18, fontWeight: '800', color: '#1C1C1E', marginTop: 16 },
    emptySubText: { fontSize: 14, color: '#8E8E93', fontWeight: '600', marginTop: 6 },
    modalContainer: { flex: 1, backgroundColor: '#FFFFFF' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#F2F2F7', backgroundColor: '#FFFFFF' },
    modalTitle: { fontSize: 19, fontWeight: '900', color: '#1C1C1E', letterSpacing: -0.5 },
    modalCloseBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F2F2F7', justifyContent: 'center', alignItems: 'center' },
    modalSaveBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF4E5', justifyContent: 'center', alignItems: 'center' },
    modalScroll: { padding: 16 },
    formGroup: { marginBottom: 16 },
    formLabel: { fontSize: 13, fontWeight: '900', color: '#8E8E93', marginBottom: 10, letterSpacing: 0.5 },
    formInput: { backgroundColor: '#F2F2F7', borderRadius: 14, paddingHorizontal: 16, height: 48, fontSize: 15, color: '#1C1C1E', borderWidth: 1, borderColor: 'transparent' },
    segmentRow: { flexDirection: 'row', gap: 8 },
    segmentBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E5EA', alignItems: 'center', backgroundColor: '#FFFFFF' },
    segmentBtnActive: { backgroundColor: '#FF9500', borderColor: '#FF9500' },
    segmentText: { fontSize: 13, fontWeight: '700', color: '#8E8E93' },
    segmentTextActive: { color: '#FFFFFF' },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E5EA', backgroundColor: '#FFFFFF' },
    chipActive: { backgroundColor: '#FF9500', borderColor: '#FF9500' },
    chipText: { fontSize: 13, fontWeight: '700', color: '#8E8E93' },
    chipTextActive: { color: '#FFFFFF' },
});
