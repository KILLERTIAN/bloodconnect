import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
    Calendar as CalendarIcon,
    ChevronLeft,
    Clock,
    Info,
    MapPin,
    ShieldCheck,
    Timer
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
    Dimensions,
    ScrollView,
    StatusBar,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import { Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const DATES = [
    { day: 'Mon', date: '20', month: 'Oct' },
    { day: 'Tue', date: '21', month: 'Oct' },
    { day: 'Wed', date: '22', month: 'Oct' },
    { day: 'Thu', date: '23', month: 'Oct' },
    { day: 'Fri', date: '24', month: 'Oct' },
    { day: 'Sat', date: '25', month: 'Oct' },
];

const SLOTS = ['Morning', 'Afternoon', 'Evening'];

const TIME_SLOTS = {
    'Morning': ['09:00 AM', '10:00 AM', '11:00 AM'],
    'Afternoon': ['01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM'],
    'Evening': ['05:00 PM', '06:00 PM', '07:00 PM'],
};

const HOSPITALS = [
    { id: '1', name: 'City General Hospital', location: 'Downtown Hub, Sector 4' },
    { id: '2', name: 'Max Health Institute', location: 'Green Valley, Plot 12' },
    { id: '3', name: 'Red Cross Center', location: 'Medical Square, North Wing' },
];

export default function ScheduleDonationScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [selectedDate, setSelectedDate] = useState('21');
    const [selectedSlot, setSelectedSlot] = useState('Morning');
    const [selectedTime, setSelectedTime] = useState('10:00 AM');
    const [selectedHospital, setSelectedHospital] = useState('1');

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <ChevronLeft size={24} color="#1C1C1E" strokeWidth={2.5} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Schedule Donation</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                {/* Info Card */}
                <View style={styles.infoSection}>
                    <View style={styles.infoCard}>
                        <Info size={20} color="#007AFF" />
                        <Text style={styles.infoText}>
                            Choose a convenient time and place for your contribution.
                            Professional medical care is guaranteed.
                        </Text>
                    </View>
                </View>

                {/* Date Selector */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <CalendarIcon size={18} color="#8E8E93" />
                        <Text style={styles.sectionLabel}>SELECT DATE</Text>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateList}>
                        {DATES.map((item) => (
                            <TouchableOpacity
                                key={item.date}
                                style={[styles.dateItem, selectedDate === item.date && styles.selectedDateItem]}
                                onPress={() => setSelectedDate(item.date)}
                            >
                                <Text style={[styles.dateDay, selectedDate === item.date && styles.selectedDateText]}>{item.day}</Text>
                                <Text style={[styles.dateNumber, selectedDate === item.date && styles.selectedDateText]}>{item.date}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Slot Selector */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Clock size={18} color="#8E8E93" />
                        <Text style={styles.sectionLabel}>TIME SLOT</Text>
                    </View>
                    <View style={styles.slotRow}>
                        {SLOTS.map((slot) => (
                            <TouchableOpacity
                                key={slot}
                                style={[styles.slotBtn, selectedSlot === slot && styles.selectedSlotBtn]}
                                onPress={() => {
                                    setSelectedSlot(slot);
                                    setSelectedTime(TIME_SLOTS[slot as keyof typeof TIME_SLOTS][0]);
                                }}
                            >
                                <Text style={[styles.slotText, selectedSlot === slot && styles.selectedSlotText]}>{slot}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Time Selection */}
                <View style={styles.section}>
                    <View style={styles.timeGrid}>
                        {TIME_SLOTS[selectedSlot as keyof typeof TIME_SLOTS].map((time) => (
                            <TouchableOpacity
                                key={time}
                                style={[styles.timeItem, selectedTime === time && styles.selectedTimeItem]}
                                onPress={() => setSelectedTime(time)}
                            >
                                <Timer size={14} color={selectedTime === time ? '#FFFFFF' : '#8E8E93'} />
                                <Text style={[styles.timeText, selectedTime === time && styles.selectedTimeText]}>{time}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Location Selection */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <MapPin size={18} color="#8E8E93" />
                        <Text style={styles.sectionLabel}>DONATION CENTER</Text>
                    </View>
                    <View style={styles.hospitalList}>
                        {HOSPITALS.map((hosp) => (
                            <TouchableOpacity
                                key={hosp.id}
                                style={[styles.hospitalCard, selectedHospital === hosp.id && styles.selectedHospitalCard]}
                                onPress={() => setSelectedHospital(hosp.id)}
                            >
                                <View style={[styles.hospIconBox, selectedHospital === hosp.id && { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                                    <MapPin size={24} color={selectedHospital === hosp.id ? '#FFFFFF' : '#FF3B30'} />
                                </View>
                                <View style={styles.hospInfo}>
                                    <Text style={[styles.hospName, selectedHospital === hosp.id && { color: '#FFFFFF' }]}>{hosp.name}</Text>
                                    <Text style={[styles.hospLoc, selectedHospital === hosp.id && { color: 'rgba(255,255,255,0.8)' }]}>{hosp.location}</Text>
                                </View>
                                {selectedHospital === hosp.id && (
                                    <ShieldCheck size={20} color="#FFFFFF" strokeWidth={3} />
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Bottom Confirmation */}
            <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                <TouchableOpacity style={styles.confirmBtn} activeOpacity={0.8}>
                    <LinearGradient
                        colors={['#FF3B30', '#FF2D55']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.confirmGradient}
                    >
                        <Text style={styles.confirmText}>Confirm Appointment</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F2F2F7', // iOS Light Gray Background
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        backgroundColor: '#FFFFFF',
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5EA',
    },
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: '#F2F2F7',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 19,
        fontWeight: '900',
        color: '#1C1C1E',
        letterSpacing: -0.5,
    },
    scrollContent: {
        paddingTop: 20,
        paddingBottom: 140, // Increased to prevent content being hidden under the sticky button
    },
    infoSection: {
        paddingHorizontal: 20,
        marginBottom: 24,
    },
    infoCard: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        padding: 18,
        borderRadius: 20,
        gap: 12,
        alignItems: 'center',
        borderLeftWidth: 4,
        borderLeftColor: '#007AFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    infoText: {
        flex: 1,
        fontSize: 14,
        fontWeight: '600',
        color: '#3A3A3C',
        lineHeight: 20,
    },
    section: {
        marginBottom: 28,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 24,
        marginBottom: 14,
    },
    sectionLabel: {
        fontSize: 12,
        fontWeight: '900',
        color: '#8E8E93',
        letterSpacing: 1.2,
    },
    dateList: {
        paddingHorizontal: 20,
        gap: 14,
    },
    dateItem: {
        width: 68,
        height: 88,
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 12,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#E5E5EA',
    },
    selectedDateItem: {
        backgroundColor: '#000000',
        borderColor: '#000000',
        shadowColor: '#000',
        shadowOpacity: 0.2,
    },
    dateDay: {
        fontSize: 12,
        fontWeight: '700',
        color: '#8E8E93',
        marginBottom: 6,
        textTransform: 'uppercase',
    },
    dateNumber: {
        fontSize: 22,
        fontWeight: '900',
        color: '#1C1C1E',
    },
    selectedDateText: {
        color: '#FFFFFF',
    },
    slotRow: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        gap: 12,
    },
    slotBtn: {
        flex: 1,
        height: 52,
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E5E5EA',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.02,
        shadowRadius: 5,
    },
    selectedSlotBtn: {
        backgroundColor: '#EAF6FF',
        borderColor: '#007AFF',
    },
    slotText: {
        fontSize: 15,
        fontWeight: '800',
        color: '#8E8E93',
    },
    selectedSlotText: {
        color: '#007AFF',
    },
    timeGrid: {
        paddingHorizontal: 20,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    timeItem: {
        paddingHorizontal: 18,
        paddingVertical: 14,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderWidth: 1,
        borderColor: '#E5E5EA',
    },
    selectedTimeItem: {
        backgroundColor: '#FF3B30',
        borderColor: '#FF3B30',
    },
    timeText: {
        fontSize: 15,
        fontWeight: '900',
        color: '#1C1C1E',
    },
    selectedTimeText: {
        color: '#FFFFFF',
    },
    hospitalList: {
        paddingHorizontal: 20,
        gap: 12,
    },
    hospitalCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 18,
        borderRadius: 28,
        gap: 16,
        borderWidth: 1,
        borderColor: '#E5E5EA',
    },
    selectedHospitalCard: {
        backgroundColor: '#FF3B30',
        borderColor: '#FF3B30',
    },
    hospIconBox: {
        width: 56,
        height: 56,
        backgroundColor: '#F2F2F7',
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    hospInfo: {
        flex: 1,
    },
    hospName: {
        fontSize: 17,
        fontWeight: '900',
        color: '#1C1C1E',
    },
    hospLoc: {
        fontSize: 14,
        fontWeight: '600',
        color: '#8E8E93',
        marginTop: 3,
    },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 24,
        paddingTop: 16,
        borderTopWidth: 1,
        borderColor: '#E5E5EA',
        // Critical fix for button not being cut: correctly handling insets.bottom
    },
    confirmBtn: {
        borderRadius: 24,
        overflow: 'hidden',
        marginBottom: 8, // Additional buffer for visual breathing room
    },
    confirmGradient: {
        height: 68,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    confirmText: {
        color: '#FFFFFF',
        fontSize: 19,
        fontWeight: '900',
        letterSpacing: 0.2,
    },
});
