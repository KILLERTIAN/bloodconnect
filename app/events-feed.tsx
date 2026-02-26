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
        const BLOOD_DONATION_IMAGES = [
            'data:image/jpeg;base64,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',
            'data:image/jpeg;base64,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',
            'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTOV1yncgK5JEZQbspnBt4TE0mx35tvEAI8cQ&s'
        ];
        const idVal = typeof item.id === 'string'
            ? item.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
            : item.id;
        const placeholderUrl = BLOOD_DONATION_IMAGES[idVal % BLOOD_DONATION_IMAGES.length];
        const imageUrl = item.image_url || placeholderUrl;
        const joinedCount = 120 + ((idVal % 100) * 3);

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
                        placeholderTextColor="#8E8E93"
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
