import NetworkBanner from '@/components/NetworkBanner';
import { useAuth } from '@/context/AuthContext';
import { useDialog } from '@/context/DialogContext';
import { manualSync, sync } from '@/lib/database';
import { EVENT_STATUSES, Event, advanceEventStatus, deleteEvent, getAllEvents } from '@/lib/events.service';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
    ArrowRight,
    Building2,
    Calendar,
    ChevronLeft,
    ChevronRight,
    MapPin,
    Phone,
    Plus,
    Search,
    Trash2
} from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    DeviceEventEmitter,
    FlatList,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { Chip } from 'react-native-paper';
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
    const { showDialog } = useDialog();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState<string | null>(null);

    const isDonorOrVolunteer = role === 'donor' || role === 'volunteer';

    const loadEvents = useCallback(async (isRefresh = false) => {
        try {
            if (!user) {
                setEvents([]);
                return;
            }

            if (isRefresh) {
                // Trigger sync with Turso to get latest changes
                try {
                    await manualSync();
                    console.log('✅ Manual sync completed during refresh');
                } catch (syncError) {
                    console.log('⚠️ Sync failed during refresh:', syncError);
                }
            }

            const data = await getAllEvents();
            setEvents(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [role, user, isDonorOrVolunteer]);

    useEffect(() => {
        loadEvents();
        const sub = DeviceEventEmitter.addListener('db_synced', () => {
            console.log('🔄 Auto-refreshing camps due to background sync');
            loadEvents();
        });
        return () => sub.remove();
    }, [loadEvents]);



    const handleAdvanceStatus = async (event: Event) => {
        const currentIdx = EVENT_STATUSES.findIndex(s => s.key === event.status);
        if (currentIdx >= EVENT_STATUSES.length - 1) {
            showDialog('Already Closed', 'This camp is already in the final stage.', 'info');
            return;
        }
        const nextStatus = EVENT_STATUSES[currentIdx + 1];
        showDialog(
            'Advance Status',
            `Move to: "${nextStatus.label}"?`,
            'info',
            [
                { label: 'Cancel', style: 'cancel', onPress: () => { } },
                {
                    label: 'Confirm', onPress: async () => {
                        await advanceEventStatus(event.id, nextStatus.key, user!.id, role === 'admin');
                        try { await sync(); } catch (e) { }
                        DeviceEventEmitter.emit('db_synced');
                    }
                }
            ]
        );
    };

    const handleDeleteEvent = async (event: Event) => {
        showDialog(
            'Delete Camp',
            `Are you sure you want to delete "${event.title}"?`,
            'warning',
            [
                { label: 'Cancel', style: 'cancel', onPress: () => { } },
                {
                    label: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        const success = await deleteEvent(event.id, user!.id, role === 'admin');
                        if (success) {
                            try { await sync(); } catch (e) { }
                            DeviceEventEmitter.emit('db_synced');
                        } else {
                            showDialog('Permission Denied', 'You can only delete camps you created.', 'error');
                        }
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
                    <Chip
                        selected={true}
                        textStyle={[styles.statusText, { color: '#FFFFFF' }]}
                        style={[styles.statusBadge, { backgroundColor: color }]}
                    >
                        {statusInfo.label}
                    </Chip>
                </View>

                {/* Progress Steps - Only for Managers/Admins */}
                {!isDonorOrVolunteer && (
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
                )}

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
                    {!isDonorOrVolunteer && item.poc_phone ? (
                        <View style={styles.metaItem}>
                            <Phone size={13} color="#8E8E93" />
                            <Text style={styles.metaText}>{item.poc_phone}</Text>
                        </View>
                    ) : null}
                </View>

                <View style={styles.eventFooter}>
                    {!isDonorOrVolunteer && (
                        <Text style={styles.creatorText}>By {item.creator_name || 'Unknown'}</Text>
                    )}
                    <View style={[styles.eventActions, isDonorOrVolunteer && { flex: 1, justifyContent: 'flex-end' }]}>
                        {(role === 'admin' || item.created_by === user?.id) && item.status !== 'closed' && (
                            <>
                                <TouchableOpacity
                                    style={[styles.advanceBtn, { backgroundColor: '#E5E5EA', marginRight: 8 }]}
                                    onPress={() => router.push({ pathname: '/camp-editor', params: { id: item.id } })}
                                >
                                    <Text style={[styles.advanceBtnText, { color: '#1C1C1E' }]}>Edit</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.advanceBtn, { marginRight: 8 }]}
                                    onPress={() => handleAdvanceStatus(item)}
                                >
                                    <Text style={styles.advanceBtnText}>Advance</Text>
                                    <ArrowRight size={14} color="#FFFFFF" />
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.advanceBtn, { backgroundColor: '#FF3B30', paddingHorizontal: 10 }]}
                                    onPress={() => handleDeleteEvent(item)}
                                >
                                    <Trash2 size={16} color="#FFFFFF" />
                                </TouchableOpacity>
                            </>
                        )}
                        {isDonorOrVolunteer && <ChevronRight size={18} color="#C7C7CC" />}
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
                <View style={styles.headerTitleRow}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtnHeader}>
                        <ChevronLeft size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                    <View>
                        <Text style={styles.headerSub}>{isDonorOrVolunteer ? 'Get Involved' : 'Camp Manager'}</Text>
                        <Text style={styles.headerTitle}>Blood Camps</Text>
                    </View>
                </View>
                {/* Only show Add button for Managers/Admins */}
                {!isDonorOrVolunteer && (
                    <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/camp-editor')}>
                        <Plus size={22} color="#FFFFFF" strokeWidth={3} />
                    </TouchableOpacity>
                )}
            </LinearGradient>

            <NetworkBanner />

            {/* Stats Bar - Only for Managers */}
            {!isDonorOrVolunteer && (
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
            )}

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
            <View style={styles.filterContainer}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filterScrollContent}
                >
                    <Chip
                        selected={!filterStatus}
                        onPress={() => setFilterStatus(null)}
                        style={[
                            styles.chipItem,
                            !filterStatus ? { backgroundColor: '#007AFF', borderWidth: 0 } : { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E5EA' }
                        ]}
                        showSelectedCheck={false}
                        textStyle={[
                            styles.chipText,
                            { color: !filterStatus ? '#FFFFFF' : '#8E8E93' }
                        ]}
                        mode="flat"
                    >
                        All
                    </Chip>
                    {EVENT_STATUSES.map(s => (
                        <Chip
                            key={s.key}
                            selected={filterStatus === s.key}
                            onPress={() => setFilterStatus(filterStatus === s.key ? null : s.key)}
                            style={[
                                styles.chipItem,
                                filterStatus === s.key
                                    ? { backgroundColor: STATUS_COLORS[s.key] || '#007AFF', borderWidth: 0 }
                                    : { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E5EA' }
                            ]}
                            showSelectedCheck={false}
                            textStyle={[
                                styles.chipText,
                                { color: filterStatus === s.key ? '#FFFFFF' : '#8E8E93' }
                            ]}
                            mode="flat"
                        >
                            {s.label}
                        </Chip>
                    ))}
                </ScrollView>
            </View>

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
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadEvents(true); }} />}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Building2 size={48} color="#C7C7CC" />
                            <Text style={styles.emptyText}>No camps found</Text>
                            <Text style={styles.emptySubText}>Tap + to create a new camp</Text>
                        </View>
                    }
                />
            )}

            {/* Modal removed in favor of camp-editor screen */}
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
    addBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    statsBar: { flexDirection: 'row', backgroundColor: '#FFFFFF', paddingVertical: 16, paddingHorizontal: 24, borderBottomWidth: 1, borderBottomColor: '#F2F2F7' },
    statItem: { flex: 1, alignItems: 'center' },
    statValue: { fontSize: 22, fontWeight: '900' },
    statLabel: { fontSize: 12, color: '#8E8E93', fontWeight: '600', marginTop: 2 },
    searchContainer: { paddingHorizontal: 16, paddingVertical: 12 },
    searchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFFFFF', borderRadius: 16, paddingHorizontal: 16, height: 46, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
    searchInput: { flex: 1, fontSize: 15, color: '#1C1C1E' },
    filterContainer: { marginBottom: 8 },
    filterScrollContent: { paddingHorizontal: 16, gap: 8, paddingBottom: 8 },
    chipItem: { borderRadius: 20 },
    chipText: { fontSize: 13, fontWeight: '700' },
    list: { padding: 16, gap: 12 },
    eventCard: { backgroundColor: '#FFFFFF', borderRadius: 28, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 3, borderWidth: 1, borderColor: '#F2F2F7' },
    eventCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    eventTitle: { fontSize: 17, fontWeight: '800', color: '#1C1C1E' },
    eventOrg: { fontSize: 13, color: '#8E8E93', fontWeight: '600', marginTop: 2 },
    statusBadge: { borderRadius: 12, height: 32 },
    statusText: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
    progressRow: { flexDirection: 'row', gap: 4, marginBottom: 16, marginTop: 8 },
    progressStep: { flex: 1, height: 4, borderRadius: 2 },
    eventMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16, paddingHorizontal: 4 },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    metaText: { fontSize: 12, color: '#48484A', fontWeight: '700' },
    eventFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F2F2F7', paddingTop: 14 },
    creatorText: { fontSize: 11, color: '#C7C7CC', fontWeight: '700' },
    eventActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    advanceBtn: { backgroundColor: '#007AFF', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
    advanceBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyState: { alignItems: 'center', paddingVertical: 80 },
    emptyText: { fontSize: 20, fontWeight: '900', color: '#1C1C1E', marginTop: 20 },
    emptySubText: { fontSize: 15, color: '#8E8E93', fontWeight: '600', marginTop: 8 },
    modalContainer: { flex: 1, backgroundColor: '#FFFFFF' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#F2F2F7', backgroundColor: '#FFFFFF' },
    modalTitle: { fontSize: 19, fontWeight: '900', color: '#1C1C1E', letterSpacing: -0.5 },
    modalCloseBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F2F2F7', justifyContent: 'center', alignItems: 'center' },
    modalSaveBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#EAF6FF', justifyContent: 'center', alignItems: 'center' },
    modalScroll: { padding: 24 },
    formGroup: { marginBottom: 20 },
    formLabel: { fontSize: 13, fontWeight: '900', color: '#8E8E93', marginBottom: 10, letterSpacing: 0.5 },
    formInput: { backgroundColor: '#F2F2F7', borderRadius: 16, paddingHorizontal: 18, height: 56, fontSize: 16, color: '#1C1C1E', borderWidth: 1, borderColor: 'transparent' },
});
