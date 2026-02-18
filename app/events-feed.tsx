import { Event, getAllEvents } from '@/lib/events.service';
import { useRouter } from 'expo-router';
import { Building2, MapPin, Search, Users } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function EventsFeedScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');

    const loadEvents = useCallback(async () => {
        try {
            const data = await getAllEvents();
            const publicEvents = data.filter(e => e.status !== 'closed');
            setEvents(publicEvents);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { loadEvents(); }, [loadEvents]);

    const filtered = events.filter(e =>
        e.title.toLowerCase().includes(search.toLowerCase()) ||
        e.organization_name.toLowerCase().includes(search.toLowerCase()) ||
        e.location.toLowerCase().includes(search.toLowerCase())
    );

    const renderEventCard = ({ item }: { item: Event }) => {
        const imageId = 1050 + (item.id % 50);
        const placeholderUrl = `https://picsum.photos/id/${imageId}/800/600`;
        const imageUrl = item.image_url || placeholderUrl;
        const joinedCount = 120 + (item.id * 3);

        return (
            <TouchableOpacity
                activeOpacity={0.9}
                style={styles.cardContainer}
                onPress={() => router.push({
                    pathname: '/event-details',
                    params: { id: item.id }
                })}
            >
                {/* Image Section */}
                <View style={styles.cardImageWrapper}>
                    <Image source={{ uri: imageUrl }} style={styles.cardImage} />
                    <View style={styles.dateBadge}>
                        <Text style={styles.dateText}>
                            {item.event_date ? new Date(item.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'TBA'}
                        </Text>
                    </View>
                </View>

                {/* Content Section */}
                <View style={styles.cardContent}>
                    <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>

                    <View style={styles.locationRow}>
                        <MapPin size={14} color="#8E8E93" />
                        <Text style={styles.locationText} numberOfLines={1}>{item.location}</Text>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.footerRow}>
                        <View style={styles.organizerContainer}>
                            <View style={styles.orgIconBg}>
                                <Building2 size={14} color="#555" />
                            </View>
                            <Text style={styles.organizerText} numberOfLines={1}>{item.organization_name}</Text>
                        </View>
                        <View style={styles.joinedContainer}>
                            <Users size={14} color="#FF3B30" />
                            <Text style={styles.joinedText}>{item.expected_donors || 0} Expected</Text>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <Text style={styles.headerTitle}>Donation Events</Text>
                <Text style={styles.headerSubtitle}>Join local drives near you</Text>
            </View>

            <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                    <Search size={20} color="#8E8E93" style={{ marginRight: 8 }} />
                    <TextInput
                        placeholder="Search events or locations..."
                        placeholderTextColor="#C7C7CC"
                        style={styles.searchInput}
                        value={search}
                        onChangeText={setSearch}
                    />
                </View>
            </View>

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color="#FF3B30" />
                </View>
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={item => String(item.id)}
                    renderItem={renderEventCard}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadEvents(); }} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>No upcoming events found</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    header: {
        paddingHorizontal: 24,
        paddingBottom: 20,
        backgroundColor: '#FFFFFF',
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 12,
        elevation: 2,
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: '900',
        color: '#1C1C1E',
        letterSpacing: -1,
    },
    headerSubtitle: {
        fontSize: 15,
        color: '#8E8E93',
        marginTop: 6,
        fontWeight: '600',
    },
    searchContainer: {
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 52,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#1C1C1E',
        fontWeight: '500',
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 100,
        gap: 16,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyState: {
        alignItems: 'center',
        marginTop: 80,
    },
    emptyText: {
        fontSize: 16,
        color: '#8E8E93',
        fontWeight: '600',
    },
    cardContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    cardImageWrapper: {
        height: 180,
        width: '100%',
        position: 'relative',
        backgroundColor: '#F2F2F7',
    },
    cardImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    cardContent: {
        padding: 18,
    },
    cardTitle: {
        fontSize: 19,
        fontWeight: '800',
        color: '#1C1C1E',
        marginBottom: 8,
        letterSpacing: -0.3,
        lineHeight: 24,
    },
    dateBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 4,
    },
    dateText: {
        fontSize: 12,
        fontWeight: '900',
        color: '#FF3B30',
        letterSpacing: 0.5,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 14,
    },
    locationText: {
        fontSize: 14,
        color: '#8E8E93',
        fontWeight: '600',
        flex: 1,
    },
    divider: {
        height: 1,
        backgroundColor: '#F2F2F7',
        marginBottom: 14,
    },
    footerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    organizerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
        marginRight: 12,
    },
    orgIconBg: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: '#F2F2F7',
        justifyContent: 'center',
        alignItems: 'center',
    },
    organizerText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1C1C1E',
        flex: 1,
    },
    joinedContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#FFEBEA',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
    },
    joinedText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#FF3B30',
    },
});
