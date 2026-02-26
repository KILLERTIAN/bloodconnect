import { useAuth } from '@/context/AuthContext';
import { useDialog } from '@/context/DialogContext';
import { sync } from '@/lib/database';
import { addDonor } from '@/lib/helpline.service';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Plus, Save, User, X } from 'lucide-react-native';
import React, { useState } from 'react';
import {
    DeviceEventEmitter,
    FlatList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function LogDonorsScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const { showDialog } = useDialog();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams();
    const eventId = Array.isArray(params.eventId) ? params.eventId[0] : params.eventId;

    const [donors, setDonors] = useState<any[]>([]);
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [bloodGroup, setBloodGroup] = useState('');
    const [city, setCity] = useState(params.city as string || '');

    const handleAddToList = () => {
        if (!name || !phone || !bloodGroup) {
            showDialog('Missing Fields', 'Please fill name, phone and blood group.', 'warning');
            return;
        }
        setDonors([...donors, { name, phone, blood_group: bloodGroup, city, id: Date.now() }]);
        setName('');
        setPhone('');
        setBloodGroup('');
    };

    const handleRemoveFromList = (id: number) => {
        setDonors(donors.filter(d => d.id !== id));
    };

    const handleSaveAll = async () => {
        if (donors.length === 0) {
            showDialog('No Donors', 'Please add at least one donor to the list.', 'info');
            return;
        }

        try {
            for (const d of donors) {
                await addDonor({
                    name: d.name,
                    phone: d.phone,
                    blood_group: d.blood_group,
                    city: d.city,
                    event_id: eventId,
                    last_donation_date: new Date().toISOString().split('T')[0]
                });
            }
            try { await sync(); } catch (_e) { /* offline – queued */ }
            DeviceEventEmitter.emit('db_synced');
            showDialog('Success', `${donors.length} donors added to the database.`, 'success', [
                { label: 'OK', onPress: () => router.back() }
            ]);
        } catch (e) {
            console.error(e);
            showDialog('Error', 'Failed to save donors to database.', 'error');
        }
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#FF3B30', '#FF2D55']} style={[styles.header, { paddingTop: insets.top + 16 }]}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <ChevronLeft size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Log Event Donors</Text>
                    <View style={{ width: 40 }} />
                </View>
                <Text style={styles.headerSub}>Logging for Event #{eventId}</Text>
            </LinearGradient>

            <View style={styles.formCard}>
                <View style={styles.inputRow}>
                    <TextInput
                        style={[styles.input, { flex: 2 }]}
                        placeholder="Donor Name"
                        placeholderTextColor="#8E8E93"
                        value={name}
                        onChangeText={setName}
                    />
                    <TextInput
                        style={[styles.input, { flex: 1.5 }]}
                        placeholder="Phone"
                        placeholderTextColor="#8E8E93"
                        keyboardType="phone-pad"
                        value={phone}
                        onChangeText={setPhone}
                    />
                    <TextInput
                        style={[styles.input, { flex: 1 }]}
                        placeholder="Grp"
                        placeholderTextColor="#8E8E93"
                        autoCapitalize="characters"
                        value={bloodGroup}
                        onChangeText={setBloodGroup}
                    />
                    <TouchableOpacity style={styles.addBtn} onPress={handleAddToList}>
                        <Plus size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>
            </View>

            <FlatList
                data={donors}
                keyExtractor={item => String(item.id)}
                contentContainerStyle={styles.list}
                renderItem={({ item }) => (
                    <View style={styles.donorItem}>
                        <View style={styles.donorIcon}>
                            <User size={18} color="#FF3B30" />
                        </View>
                        <View style={styles.donorInfo}>
                            <Text style={styles.donorName}>{item.name}</Text>
                            <Text style={styles.donorMeta}>{item.phone} • {item.blood_group}</Text>
                        </View>
                        <TouchableOpacity onPress={() => handleRemoveFromList(item.id)}>
                            <X size={20} color="#8E8E93" />
                        </TouchableOpacity>
                    </View>
                )}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <User size={48} color="#C7C7CC" />
                        <Text style={styles.emptyText}>No donors added yet</Text>
                        <Text style={styles.emptySubText}>Fill the form above to build the list</Text>
                    </View>
                }
            />

            <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveAll}>
                    <Save size={20} color="#FFFFFF" />
                    <Text style={styles.saveBtnText}>Save {donors.length > 0 ? `(${donors.length}) ` : ''}to Database</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FB' },
    header: { paddingHorizontal: 20, paddingBottom: 24 },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '900', color: '#FFFFFF' },
    headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
    formCard: { backgroundColor: '#FFFFFF', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F2F2F7' },
    inputRow: { flexDirection: 'row', gap: 8 },
    input: { backgroundColor: '#F2F2F7', borderRadius: 12, paddingHorizontal: 12, height: 48, fontSize: 14, color: '#1C1C1E' },
    addBtn: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#FF3B30', justifyContent: 'center', alignItems: 'center' },
    list: { padding: 20, gap: 12 },
    donorItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: '#F2F2F7' },
    donorIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFEBEA', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    donorInfo: { flex: 1 },
    donorName: { fontSize: 15, fontWeight: '800', color: '#1C1C1E' },
    donorMeta: { fontSize: 12, color: '#8E8E93', fontWeight: '600', marginTop: 2 },
    footer: { padding: 20, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#F2F2F7' },
    saveBtn: { backgroundColor: '#1C1C1E', borderRadius: 16, height: 56, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
    saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
    emptyState: { alignItems: 'center', marginTop: 60 },
    emptyText: { fontSize: 18, fontWeight: '800', color: '#1C1C1E', marginTop: 16 },
    emptySubText: { fontSize: 14, color: '#8E8E93', fontWeight: '500', marginTop: 8 },
});
