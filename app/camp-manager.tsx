import { useAuth } from '@/context/AuthContext';
import { EVENT_STATUSES, Event, advanceEventStatus, createEvent, getAllEvents, getEventsByManager } from '@/lib/events.service';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
    Building2,
    Calendar,
    ChevronRight,
    MapPin,
    Phone,
    Plus,
    Search
} from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const STATUS_COLORS: Record<string, string> = {
    lead_received: '#FF9500',
    contacting_poc: '#007AFF',
    booking_blood_bank: '#5856D6',
    floating_volunteers: '#AF52DE',
    camp_completed: '#34C759',
    post_camp_followup: '#FF3B30',
    closed: '#8E8E93',
};

export default function CampManagerScreen() {
    const { user, role } = useAuth();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [filterStatus, setFilterStatus] = useState<string | null>(null);

    const [form, setForm] = useState({
        title: '', organization_name: '', poc_name: '', poc_phone: '',
        poc_email: '', location: '', city: '', blood_bank_name: '',
        blood_bank_contact: '', event_date: '', event_time: '',
        expected_donors: '', notes: '',
    });

    const loadEvents = useCallback(async () => {
        try {
            const data = role === 'admin'
                ? await getAllEvents()
                : await getEventsByManager(user!.id);
            setEvents(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [role, user]);

    useEffect(() => { loadEvents(); }, [loadEvents]);

    const handleCreate = async () => {
        if (!form.title || !form.organization_name || !form.poc_name || !form.poc_phone || !form.location) {
            Alert.alert('Missing Fields', 'Please fill all required fields.');
            return;
        }
        try {
            await createEvent({
                ...form,
                expected_donors: parseInt(form.expected_donors) || 0,
                created_by: user!.id,
            });
            setShowAddModal(false);
            setForm({ title: '', organization_name: '', poc_name: '', poc_phone: '', poc_email: '', location: '', city: '', blood_bank_name: '', blood_bank_contact: '', event_date: '', event_time: '', expected_donors: '', notes: '' });
            loadEvents();
            Alert.alert('✅ Success', 'Camp created successfully!');
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to create camp.');
        }
    };

    const handleAdvanceStatus = async (event: Event) => {
        const currentIdx = EVENT_STATUSES.findIndex(s => s.key === event.status);
        if (currentIdx >= EVENT_STATUSES.length - 1) {
            Alert.alert('Already Closed', 'This camp is already in the final stage.');
            return;
        }
        const nextStatus = EVENT_STATUSES[currentIdx + 1];
        Alert.alert(
            'Advance Status',
            `Move to: "${nextStatus.label}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Confirm', onPress: async () => {
                        await advanceEventStatus(event.id, nextStatus.key, user!.id, role === 'admin');
                        loadEvents();
                    }
                }
            ]
        );
    };

    const filtered = events.filter(e => {
        const matchSearch = !search || e.organization_name.toLowerCase().includes(search.toLowerCase()) || e.title.toLowerCase().includes(search.toLowerCase());
        const matchStatus = !filterStatus || e.status === filterStatus;
        return matchSearch && matchStatus;
    });

    const getStatusInfo = (key: string) => EVENT_STATUSES.find(s => s.key === key) || EVENT_STATUSES[0];

    const renderEvent = ({ item }: { item: Event }) => {
        const statusInfo = getStatusInfo(item.status);
        const color = STATUS_COLORS[item.status] || '#8E8E93';
        return (
            <TouchableOpacity
                style={styles.eventCard}
                activeOpacity={0.85}
                onPress={() => router.push({ pathname: '/event-details', params: { id: item.id } })}
            >
                <View style={styles.eventCardHeader}>
                    <View style={[styles.statusDot, { backgroundColor: color }]} />
                    <View style={{ flex: 1 }}>
                        <Text style={styles.eventTitle} numberOfLines={1}>{item.title}</Text>
                        <Text style={styles.eventOrg}>{item.organization_name}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: color + '20' }]}>
                        <Text style={[styles.statusText, { color }]}>{statusInfo.label}</Text>
                    </View>
                </View>

                {/* Progress Steps */}
                <View style={styles.progressRow}>
                    {EVENT_STATUSES.map((s, idx) => (
                        <View
                            key={s.key}
                            style={[
                                styles.progressStep,
                                { backgroundColor: statusInfo.step >= s.step ? color : '#E5E5EA' }
                            ]}
                        />
                    ))}
                </View>

                <View style={styles.eventMeta}>
                    <View style={styles.metaItem}>
                        <MapPin size={13} color="#8E8E93" />
                        <Text style={styles.metaText} numberOfLines={1}>{item.location}</Text>
                    </View>
                    {item.event_date ? (
                        <View style={styles.metaItem}>
                            <Calendar size={13} color="#8E8E93" />
                            <Text style={styles.metaText}>{item.event_date}</Text>
                        </View>
                    ) : null}
                    {item.poc_phone ? (
                        <View style={styles.metaItem}>
                            <Phone size={13} color="#8E8E93" />
                            <Text style={styles.metaText}>{item.poc_phone}</Text>
                        </View>
                    ) : null}
                </View>

                <View style={styles.eventFooter}>
                    <Text style={styles.creatorText}>By {item.creator_name || 'Unknown'}</Text>
                    <View style={styles.eventActions}>
                        {(role === 'admin' || item.created_by === user?.id) && item.status !== 'closed' && (
                            <TouchableOpacity
                                style={styles.advanceBtn}
                                onPress={() => handleAdvanceStatus(item)}
                            >
                                <Text style={styles.advanceBtnText}>Advance →</Text>
                            </TouchableOpacity>
                        )}
                        <ChevronRight size={18} color="#C7C7CC" />
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <LinearGradient
                colors={['#007AFF', '#0051A8']}
                style={[styles.header, { paddingTop: insets.top + 16 }]}
            >
                <View>
                    <Text style={styles.headerSub}>Camp Manager</Text>
                    <Text style={styles.headerTitle}>Blood Camps</Text>
                </View>
                <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddModal(true)}>
                    <Plus size={22} color="#FFFFFF" strokeWidth={3} />
                </TouchableOpacity>
            </LinearGradient>

            {/* Stats Bar */}
            <View style={styles.statsBar}>
                {[
                    { label: 'Total', value: events.length, color: '#007AFF' },
                    { label: 'Active', value: events.filter(e => !['closed'].includes(e.status)).length, color: '#34C759' },
                    { label: 'Completed', value: events.filter(e => e.status === 'closed').length, color: '#8E8E93' },
                ].map(s => (
                    <View key={s.label} style={styles.statItem}>
                        <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                        <Text style={styles.statLabel}>{s.label}</Text>
                    </View>
                ))}
            </View>

            {/* Search */}
            <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                    <Search size={18} color="#8E8E93" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search camps..."
                        placeholderTextColor="#C7C7CC"
                        value={search}
                        onChangeText={setSearch}
                    />
                </View>
            </View>

            {/* Status Filter */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
                <TouchableOpacity
                    style={[styles.filterChip, !filterStatus && styles.filterChipActive]}
                    onPress={() => setFilterStatus(null)}
                >
                    <Text style={[styles.filterChipText, !filterStatus && styles.filterChipTextActive]}>All</Text>
                </TouchableOpacity>
                {EVENT_STATUSES.map(s => (
                    <TouchableOpacity
                        key={s.key}
                        style={[styles.filterChip, filterStatus === s.key && { backgroundColor: STATUS_COLORS[s.key], borderColor: STATUS_COLORS[s.key] }]}
                        onPress={() => setFilterStatus(filterStatus === s.key ? null : s.key)}
                    >
                        <Text style={[styles.filterChipText, filterStatus === s.key && { color: '#FFFFFF' }]}>{s.label}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* List */}
            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color="#007AFF" />
                </View>
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={item => String(item.id)}
                    renderItem={renderEvent}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadEvents(); }} />}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Building2 size={48} color="#C7C7CC" />
                            <Text style={styles.emptyText}>No camps found</Text>
                            <Text style={styles.emptySubText}>Tap + to create a new camp</Text>
                        </View>
                    }
                />
            )}

            {/* Add Camp Modal */}
            <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet">
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <TouchableOpacity onPress={() => setShowAddModal(false)}>
                                <Text style={styles.modalCancel}>Cancel</Text>
                            </TouchableOpacity>
                            <Text style={styles.modalTitle}>New Camp</Text>
                            <TouchableOpacity onPress={handleCreate}>
                                <Text style={styles.modalSave}>Create</Text>
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
                            {[
                                { label: 'Camp Title *', key: 'title', placeholder: 'e.g. Annual Blood Drive' },
                                { label: 'Organization Name *', key: 'organization_name', placeholder: 'e.g. Infosys Ltd.' },
                                { label: 'POC Name *', key: 'poc_name', placeholder: 'Contact person name' },
                                { label: 'POC Phone *', key: 'poc_phone', placeholder: '9XXXXXXXXX', keyboard: 'phone-pad' },
                                { label: 'POC Email', key: 'poc_email', placeholder: 'poc@company.com', keyboard: 'email-address' },
                                { label: 'Location *', key: 'location', placeholder: 'Full address' },
                                { label: 'City', key: 'city', placeholder: 'e.g. Bengaluru' },
                                { label: 'Blood Bank Name', key: 'blood_bank_name', placeholder: 'e.g. Rotary Blood Bank' },
                                { label: 'Blood Bank Contact', key: 'blood_bank_contact', placeholder: '9XXXXXXXXX', keyboard: 'phone-pad' },
                                { label: 'Event Date', key: 'event_date', placeholder: 'YYYY-MM-DD' },
                                { label: 'Event Time', key: 'event_time', placeholder: 'e.g. 10:00 AM' },
                                { label: 'Expected Donors', key: 'expected_donors', placeholder: '0', keyboard: 'numeric' },
                                { label: 'Notes', key: 'notes', placeholder: 'Additional info...', multiline: true },
                            ].map(field => (
                                <View key={field.key} style={styles.formGroup}>
                                    <Text style={styles.formLabel}>{field.label}</Text>
                                    <TextInput
                                        style={[styles.formInput, field.multiline && { height: 80, textAlignVertical: 'top' }]}
                                        placeholder={field.placeholder}
                                        placeholderTextColor="#C7C7CC"
                                        value={(form as any)[field.key]}
                                        onChangeText={v => setForm(f => ({ ...f, [field.key]: v }))}
                                        keyboardType={(field as any).keyboard || 'default'}
                                        multiline={field.multiline}
                                    />
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FB' },
    header: { paddingHorizontal: 24, paddingBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '700', letterSpacing: 1 },
    headerTitle: { color: '#FFFFFF', fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
    addBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    statsBar: { flexDirection: 'row', backgroundColor: '#FFFFFF', paddingVertical: 16, paddingHorizontal: 24, borderBottomWidth: 1, borderBottomColor: '#F2F2F7' },
    statItem: { flex: 1, alignItems: 'center' },
    statValue: { fontSize: 22, fontWeight: '900' },
    statLabel: { fontSize: 12, color: '#8E8E93', fontWeight: '600', marginTop: 2 },
    searchContainer: { paddingHorizontal: 16, paddingVertical: 12 },
    searchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFFFFF', borderRadius: 16, paddingHorizontal: 16, height: 46, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
    searchInput: { flex: 1, fontSize: 15, color: '#1C1C1E' },
    filterScroll: { maxHeight: 48, marginBottom: 4 },
    filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: '#E5E5EA', backgroundColor: '#FFFFFF' },
    filterChipActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
    filterChipText: { fontSize: 13, fontWeight: '700', color: '#8E8E93' },
    filterChipTextActive: { color: '#FFFFFF' },
    list: { padding: 16, gap: 12 },
    eventCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3 },
    eventCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
    statusDot: { width: 10, height: 10, borderRadius: 5 },
    eventTitle: { fontSize: 16, fontWeight: '800', color: '#1C1C1E' },
    eventOrg: { fontSize: 13, color: '#8E8E93', fontWeight: '600', marginTop: 2 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    statusText: { fontSize: 11, fontWeight: '800' },
    progressRow: { flexDirection: 'row', gap: 4, marginBottom: 12 },
    progressStep: { flex: 1, height: 4, borderRadius: 2 },
    eventMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 12 },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    metaText: { fontSize: 12, color: '#8E8E93', fontWeight: '600' },
    eventFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F2F2F7', paddingTop: 10 },
    creatorText: { fontSize: 12, color: '#C7C7CC', fontWeight: '600' },
    eventActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    advanceBtn: { backgroundColor: '#007AFF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
    advanceBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyState: { alignItems: 'center', paddingVertical: 60 },
    emptyText: { fontSize: 18, fontWeight: '800', color: '#3C3C43', marginTop: 16 },
    emptySubText: { fontSize: 14, color: '#8E8E93', fontWeight: '600', marginTop: 6 },
    modalContainer: { flex: 1, backgroundColor: '#F8F9FB' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F2F2F7', backgroundColor: '#FFFFFF' },
    modalTitle: { fontSize: 17, fontWeight: '800', color: '#1C1C1E' },
    modalCancel: { fontSize: 16, color: '#8E8E93', fontWeight: '600' },
    modalSave: { fontSize: 16, color: '#007AFF', fontWeight: '800' },
    modalScroll: { padding: 16 },
    formGroup: { marginBottom: 16 },
    formLabel: { fontSize: 13, fontWeight: '700', color: '#3C3C43', marginBottom: 8 },
    formInput: { backgroundColor: '#FFFFFF', borderRadius: 14, paddingHorizontal: 16, height: 48, fontSize: 15, color: '#1C1C1E', borderWidth: 1, borderColor: '#E5E5EA' },
});
