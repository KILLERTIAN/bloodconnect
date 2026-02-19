import { useAuth } from '@/context/AuthContext';
import { useDialog } from '@/context/DialogContext';
import { sync } from '@/lib/database';
import { createEvent, Event, getEventById, updateEvent } from '@/lib/events.service';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Calendar, Clock, Eye, Image as ImageIcon, MapPin, Phone, Save, Users, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CampEditorScreen() {
    const { id } = useLocalSearchParams();
    const { user, role } = useAuth();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { showDialog } = useDialog();

    const [loading, setLoading] = useState(!!id);
    const [submitting, setSubmitting] = useState(false);
    const [showPreview, setShowPreview] = useState(false);

    const [form, setForm] = useState<Partial<Event>>({
        title: '',
        organization_name: '',
        poc_name: '',
        poc_phone: '',
        poc_email: '',
        location: '',
        city: '',
        blood_bank_name: '',
        blood_bank_contact: '',
        event_date: '',
        event_time: '',
        expected_donors: 0,
        notes: '',
        image_url: '',
    });

    useEffect(() => {
        if (id) {
            loadEvent(Number(id));
        }
    }, [id]);

    const loadEvent = async (eventId: number) => {
        try {
            const event = await getEventById(eventId);
            if (event) {
                setForm(event);
            } else {
                showDialog('Error', 'Event not found', 'error', [{ label: 'OK', onPress: () => router.back() }]);
            }
        } catch (e) {
            console.error(e);
            showDialog('Error', 'Failed to load event', 'error');
        } finally {
            setLoading(false);
        }
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [16, 9],
            quality: 0.8,
        });

        if (!result.canceled) {
            const uri = result.assets[0].uri;
            const fileName = uri.split('/').pop();
            const newPath = (FileSystem.documentDirectory || '') + (fileName || 'camp_banner.jpg');

            try {
                await FileSystem.copyAsync({
                    from: uri,
                    to: newPath
                });
                setForm(prev => ({ ...prev, image_url: newPath }));
            } catch (e) {
                console.error("Error saving image:", e);
                // Fallback to original uri if copy fails
                setForm(prev => ({ ...prev, image_url: uri }));
            }
        }
    };

    const handleSubmit = async () => {
        if (!form.title || !form.organization_name || !form.poc_name || !form.poc_phone || !form.location) {
            showDialog('Missing Fields', 'Please fill all required fields marked with *', 'warning');
            return;
        }

        setSubmitting(true);
        try {
            if (id) {
                const success = await updateEvent(Number(id), form, user!.id, role === 'admin');
                if (success) {
                    // Sync with Turso after update
                    try {
                        await sync();
                        console.log('✅ Camp updated and synced with Turso');
                    } catch (syncError) {
                        console.log('⚠️ Camp updated locally, will sync when online');
                    }
                    showDialog('Success', 'Camp updated successfully', 'success', [
                        { label: 'OK', onPress: () => router.back() }
                    ]);
                } else {
                    showDialog('Error', 'You do not have permission to edit this camp', 'error');
                }
            } else {
                const newId = await createEvent({
                    ...form,
                    expected_donors: Number(form.expected_donors) || 0,
                    created_by: user!.id,
                } as any);

                console.log('✅ Camp created with ID:', newId);

                // Sync with Turso after creation
                try {
                    await sync();
                    console.log('✅ Camp synced with Turso cloud database');
                } catch (syncError) {
                    console.log('⚠️ Camp saved locally, will sync when online');
                }

                showDialog('Success', 'Camp created successfully! It will appear in the events feed.', 'success', [
                    { label: 'OK', onPress: () => router.back() }
                ]);
            }
        } catch (e: any) {
            console.error('❌ Camp save error:', e);
            showDialog('Error', e.message || 'Failed to save camp', 'error');
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#D32F2F" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#D32F2F', '#B71C1C']}
                style={[styles.header, { paddingTop: insets.top + 10 }]}
            >
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <ArrowLeft size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{id ? 'Edit Camp' : 'New Camp'}</Text>
                    <TouchableOpacity onPress={() => setShowPreview(true)} style={styles.previewBtn}>
                        <Eye size={20} color="#FFFFFF" />
                        <Text style={styles.previewText}>Preview</Text>
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            <View style={styles.contentContainer}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        bounces={true}
                    >
                        {/* Banner Image Section */}
                        <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
                            {form.image_url ? (
                                <Image source={{ uri: form.image_url }} style={styles.bannerImage} />
                            ) : (
                                <View style={styles.imagePlaceholder}>
                                    <ImageIcon size={40} color="#8E8E93" />
                                    <Text style={styles.imagePlaceholderText}>Tap to add cover image</Text>
                                </View>
                            )}
                            <View style={styles.editImageBadge}>
                                <ImageIcon size={14} color="#FFFFFF" />
                            </View>
                        </TouchableOpacity>

                        {/* Form Fields */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Basic Details</Text>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Camp Title *</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g. Annual Blood Donation Drive"
                                    value={form.title}
                                    onChangeText={t => setForm(f => ({ ...f, title: t }))}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Organization Name *</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g. Infosys Ltd."
                                    value={form.organization_name}
                                    onChangeText={t => setForm(f => ({ ...f, organization_name: t }))}
                                />
                            </View>

                            <View style={styles.row}>
                                <View style={[styles.inputGroup, { flex: 1 }]}>
                                    <Text style={styles.label}>Event Date</Text>
                                    <View style={styles.inputWithIcon}>
                                        <Calendar size={18} color="#8E8E93" />
                                        <TextInput
                                            style={styles.inputIcon}
                                            placeholder="YYYY-MM-DD"
                                            value={form.event_date}
                                            onChangeText={t => setForm(f => ({ ...f, event_date: t }))}
                                        />
                                    </View>
                                </View>
                                <View style={[styles.inputGroup, { flex: 1 }]}>
                                    <Text style={styles.label}>Time</Text>
                                    <View style={styles.inputWithIcon}>
                                        <Clock size={18} color="#8E8E93" />
                                        <TextInput
                                            style={styles.inputIcon}
                                            placeholder="10:00 AM"
                                            value={form.event_time}
                                            onChangeText={t => setForm(f => ({ ...f, event_time: t }))}
                                        />
                                    </View>
                                </View>
                            </View>
                        </View>

                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Point of Contact (POC)</Text>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>POC Name *</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Contact Person Name"
                                    value={form.poc_name}
                                    onChangeText={t => setForm(f => ({ ...f, poc_name: t }))}
                                />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>POC Phone *</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="9XXXXXXXXX"
                                    keyboardType="phone-pad"
                                    value={form.poc_phone}
                                    onChangeText={t => setForm(f => ({ ...f, poc_phone: t }))}
                                />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>POC Email</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="email@company.com"
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    value={form.poc_email}
                                    onChangeText={t => setForm(f => ({ ...f, poc_email: t }))}
                                />
                            </View>
                        </View>

                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Location & Logistics</Text>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Location Address *</Text>
                                <View style={styles.inputWithIcon}>
                                    <MapPin size={18} color="#8E8E93" />
                                    <TextInput
                                        style={styles.inputIcon}
                                        placeholder="Full address"
                                        value={form.location}
                                        onChangeText={t => setForm(f => ({ ...f, location: t }))}
                                    />
                                </View>
                            </View>
                            <View style={styles.row}>
                                <View style={[styles.inputGroup, { flex: 1 }]}>
                                    <Text style={styles.label}>City</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="e.g. Bengaluru"
                                        value={form.city}
                                        onChangeText={t => setForm(f => ({ ...f, city: t }))}
                                    />
                                </View>
                                <View style={[styles.inputGroup, { flex: 1 }]}>
                                    <Text style={styles.label}>Exp. Donors</Text>
                                    <View style={styles.inputWithIcon}>
                                        <Users size={18} color="#8E8E93" />
                                        <TextInput
                                            style={styles.inputIcon}
                                            placeholder="0"
                                            keyboardType="numeric"
                                            value={String(form.expected_donors || '')}
                                            onChangeText={t => setForm(f => ({ ...f, expected_donors: Number(t) }))}
                                        />
                                    </View>
                                </View>
                            </View>
                        </View>

                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Blood Bank Details</Text>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Blood Bank Name</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Associated Blood Bank"
                                    value={form.blood_bank_name}
                                    onChangeText={t => setForm(f => ({ ...f, blood_bank_name: t }))}
                                />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Contact Number</Text>
                                <View style={styles.inputWithIcon}>
                                    <Phone size={18} color="#8E8E93" />
                                    <TextInput
                                        style={styles.inputIcon}
                                        placeholder="Blood Bank Contact"
                                        keyboardType="phone-pad"
                                        value={form.blood_bank_contact}
                                        onChangeText={t => setForm(f => ({ ...f, blood_bank_contact: t }))}
                                    />
                                </View>
                            </View>
                        </View>

                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Additional Notes</Text>
                            <TextInput
                                style={[styles.input, { height: 100, textAlignVertical: 'top', paddingTop: 12 }]}
                                placeholder="Any special instructions or notes..."
                                multiline
                                numberOfLines={4}
                                value={form.notes}
                                onChangeText={t => setForm(f => ({ ...f, notes: t }))}
                            />
                        </View>

                        <View style={{ height: 100 }} />
                    </ScrollView>
                </KeyboardAvoidingView>
            </View>

            <View style={[styles.footer, { paddingBottom: insets.bottom + 10 }]}>
                <TouchableOpacity
                    style={[styles.submitBtn, submitting && styles.btnDisabled]}
                    onPress={handleSubmit}
                    disabled={submitting}
                >
                    {submitting ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <>
                            <Save size={20} color="#FFFFFF" />
                            <Text style={styles.submitBtnText}>{id ? 'Update Camp' : 'Create Camp'}</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>

            {/* Preview Modal */}
            <Modal visible={showPreview} animationType="slide" presentationStyle="pageSheet">
                <View style={styles.previewContainer}>
                    <View style={styles.previewHeader}>
                        <Text style={styles.previewTitle}>Preview</Text>
                        <TouchableOpacity onPress={() => setShowPreview(false)} style={styles.closeBtn}>
                            <X size={24} color="#1C1C1E" />
                        </TouchableOpacity>
                    </View>
                    <ScrollView contentContainerStyle={styles.previewContent}>
                        <View style={styles.previewCard}>
                            {form.image_url ? (
                                <Image source={{ uri: form.image_url }} style={styles.cardImage} />
                            ) : (
                                <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
                                    <ImageIcon size={40} color="#FFFFFF" />
                                </View>
                            )}
                            <View style={styles.cardBody}>
                                <View style={styles.cardTag}>
                                    <Text style={styles.cardTagText}>UPCOMING</Text>
                                </View>
                                <Text style={styles.cardTitle}>{form.title || 'Untitled Camp'}</Text>
                                <Text style={styles.cardOrg}>{form.organization_name || 'Organization Name'}</Text>

                                <View style={styles.cardMetaRow}>
                                    <View style={styles.cardMetaItem}>
                                        <Calendar size={14} color="#8E8E93" />
                                        <Text style={styles.cardMetaText}>{form.event_date || 'Date'}</Text>
                                    </View>
                                    <View style={styles.cardMetaItem}>
                                        <Clock size={14} color="#8E8E93" />
                                        <Text style={styles.cardMetaText}>{form.event_time || 'Time'}</Text>
                                    </View>
                                </View>

                                <View style={styles.cardLocation}>
                                    <MapPin size={14} color="#8E8E93" />
                                    <Text style={styles.cardMetaText} numberOfLines={1}>
                                        {(form.location || 'Location') + (form.city ? `, ${form.city}` : '')}
                                    </Text>
                                </View>
                            </View>
                        </View>
                        <Text style={styles.previewHint}>This is how the camp will appear to donors.</Text>
                    </ScrollView>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#D32F2F' },
    contentContainer: { flex: 1, backgroundColor: '#F2F2F7', borderTopLeftRadius: 30, borderTopRightRadius: 30, overflow: 'hidden' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { padding: 20, paddingBottom: 24 },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
    previewBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    previewText: { color: '#FFFFFF', fontWeight: '600', fontSize: 13 },
    scrollContent: { padding: 20, gap: 24, paddingBottom: 100 },
    imagePicker: { height: 200, borderRadius: 16, backgroundColor: '#FFFFFF', overflow: 'hidden', marginBottom: 8, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
    bannerImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    imagePlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
    imagePlaceholderText: { color: '#8E8E93', fontWeight: '500' },
    editImageBadge: { position: 'absolute', bottom: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.6)', padding: 8, borderRadius: 20 },
    section: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, gap: 16, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1C1C1E', marginBottom: 4 },
    inputGroup: { gap: 8 },
    row: { flexDirection: 'row', gap: 16 },
    label: { fontSize: 13, fontWeight: '600', color: '#8E8E93' },
    input: { backgroundColor: '#F9F9F9', borderRadius: 12, paddingHorizontal: 16, height: 48, fontSize: 16, color: '#1C1C1E', borderWidth: 1, borderColor: '#E5E5EA' },
    inputWithIcon: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9F9F9', borderRadius: 12, paddingHorizontal: 12, height: 48, borderWidth: 1, borderColor: '#E5E5EA', gap: 10 },
    inputIcon: { flex: 1, fontSize: 16, color: '#1C1C1E', height: '100%' },
    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFFFFF', padding: 20, borderTopWidth: 1, borderTopColor: '#E5E5EA' },
    submitBtn: { backgroundColor: '#D32F2F', height: 50, borderRadius: 25, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, shadowColor: '#D32F2F', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
    btnDisabled: { opacity: 0.7 },
    submitBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
    previewContainer: { flex: 1, backgroundColor: '#F2F2F7', paddingTop: 20 },
    previewHeader: { padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    previewTitle: { fontSize: 24, fontWeight: '900', color: '#1C1C1E' },
    closeBtn: { padding: 8 },
    previewContent: { padding: 20, alignItems: 'center' },
    previewCard: { width: '100%', backgroundColor: '#FFFFFF', borderRadius: 24, overflow: 'hidden', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 24, marginBottom: 20 },
    cardImage: { width: '100%', height: 200, resizeMode: 'cover' },
    cardImagePlaceholder: { backgroundColor: '#E0E0E0', justifyContent: 'center', alignItems: 'center' },
    cardBody: { padding: 20, gap: 8 },
    cardTag: { alignSelf: 'flex-start', backgroundColor: '#E3F2FD', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginBottom: 4 },
    cardTagText: { color: '#1976D2', fontSize: 11, fontWeight: '800' },
    cardTitle: { fontSize: 20, fontWeight: '800', color: '#1C1C1E' },
    cardOrg: { fontSize: 15, color: '#8E8E93', fontWeight: '600', marginBottom: 8 },
    cardMetaRow: { flexDirection: 'row', gap: 16 },
    cardMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    cardMetaText: { color: '#48484A', fontSize: 13, fontWeight: '500' },
    cardLocation: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
    previewHint: { fontSize: 13, color: '#8E8E93', textAlign: 'center' },
});
