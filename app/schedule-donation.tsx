import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
    Calendar as CalendarIcon,
    ChevronLeft,
    Clock,
    Info,
    MapPin,
    ShieldCheck
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

const generateDates = () => {
    const dates = [];
    const today = new Date();
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let i = 0; i < 30; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        dates.push({
            id: d.toISOString().split('T')[0],
            day: days[d.getDay()],
            date: d.getDate().toString(),
            month: months[d.getMonth()],
        });
    }
    return dates;
};

const DATES = generateDates();

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
    const [selectedDate, setSelectedDate] = useState(DATES[0].id);
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
                    <LinearGradient
                        colors={['#F0F7FF', '#FFFFFF']}
                        style={styles.infoCard}
                    >
                        <View style={styles.infoIconBox}>
                            <Info size={18} color="#007AFF" />
                        </View>
                        <Text style={styles.infoText}>
                            Professional medical care is guaranteed at all our partner centers.
                        </Text>
                    </LinearGradient>
                </View>

                {/* Date Selector */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <CalendarIcon size={14} color="#8E8E93" />
                        <Text style={styles.sectionLabel}>SELECT DATE</Text>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateList}>
                        {DATES.map((item) => (
                            <TouchableOpacity
                                key={item.id}
                                style={[styles.dateItem, selectedDate === item.id && styles.selectedDateItem]}
                                onPress={() => setSelectedDate(item.id)}
                                activeOpacity={0.8}
                            >
                                <Text style={[styles.dateDay, selectedDate === item.id && styles.selectedDateText]}>{item.day}</Text>
                                <Text style={[styles.dateNumber, selectedDate === item.id && styles.selectedDateText]}>{item.date}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Slot Selector */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Clock size={14} color="#8E8E93" />
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
                                activeOpacity={0.8}
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
                                activeOpacity={0.8}
                            >
                                <Text style={[styles.timeText, selectedTime === time && styles.selectedTimeText]}>{time}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Location Selection */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <MapPin size={14} color="#8E8E93" />
                        <Text style={styles.sectionLabel}>DONATION CENTER</Text>
                    </View>
                    <View style={styles.hospitalList}>
                        {HOSPITALS.map((hosp) => (
                            <TouchableOpacity
                                key={hosp.id}
                                style={[styles.hospitalCard, selectedHospital === hosp.id && styles.selectedHospitalCard]}
                                onPress={() => setSelectedHospital(hosp.id)}
                                activeOpacity={0.9}
                            >
                                <View style={[styles.hospIconBox, selectedHospital === hosp.id && { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                                    <MapPin size={22} color={selectedHospital === hosp.id ? '#FFFFFF' : '#FF3B30'} />
                                </View>
                                <View style={styles.hospInfo}>
                                    <Text style={[styles.hospName, selectedHospital === hosp.id && { color: '#FFFFFF' }]}>{hosp.name}</Text>
                                    <Text style={[styles.hospLoc, selectedHospital === hosp.id && { color: 'rgba(255,255,255,0.7)' }]}>{hosp.location}</Text>
                                </View>
                                {selectedHospital === hosp.id && (
                                    <View style={styles.checkCircle}>
                                        <ShieldCheck size={16} color="#FF3B30" strokeWidth={3} />
                                    </View>
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
        backgroundColor: '#FCFCFD',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        backgroundColor: '#FFFFFF',
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.03)',
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#F2F2F7',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: '#1C1C1E',
        letterSpacing: -0.3,
    },
    scrollContent: {
        paddingTop: 16,
        paddingBottom: 160,
    },
    infoSection: {
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    infoCard: {
        flexDirection: 'row',
        padding: 14,
        borderRadius: 18,
        gap: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(0,122,255,0.05)',
    },
    infoIconBox: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: 'rgba(0,122,255,0.08)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    infoText: {
        flex: 1,
        fontSize: 13,
        fontWeight: '600',
        color: '#3A3A3C',
        lineHeight: 18,
    },
    section: {
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 20,
        marginBottom: 12,
    },
    sectionLabel: {
        fontSize: 11,
        fontWeight: '900',
        color: '#8E8E93',
        letterSpacing: 1,
    },
    dateList: {
        paddingHorizontal: 20,
        gap: 12,
    },
    dateItem: {
        width: 60,
        height: 70,
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#F2F2F7',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.02,
        shadowRadius: 8,
    },
    selectedDateItem: {
        backgroundColor: '#1C1C1E',
        borderColor: '#1C1C1E',
    },
    dateDay: {
        fontSize: 10,
        fontWeight: '800',
        color: '#8E8E93',
        marginBottom: 2,
        textTransform: 'uppercase',
    },
    dateNumber: {
        fontSize: 18,
        fontWeight: '900',
        color: '#1C1C1E',
    },
    selectedDateText: {
        color: '#FFFFFF',
    },
    slotRow: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        gap: 8,
    },
    slotBtn: {
        flex: 1,
        height: 44,
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#F2F2F7',
    },
    selectedSlotBtn: {
        backgroundColor: '#EAF6FF',
        borderColor: '#007AFF15',
    },
    slotText: {
        fontSize: 14,
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
        gap: 8,
    },
    timeItem: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#F2F2F7',
        minWidth: (width - 60) / 3,
    },
    selectedTimeItem: {
        backgroundColor: '#FF3B30',
        borderColor: '#FF3B30',
    },
    timeText: {
        fontSize: 14,
        fontWeight: '900',
        color: '#1C1C1E',
    },
    selectedTimeText: {
        color: '#FFFFFF',
    },
    hospitalList: {
        paddingHorizontal: 20,
        gap: 10,
    },
    hospitalCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 14,
        borderRadius: 20,
        gap: 12,
        borderWidth: 1,
        borderColor: '#F2F2F7',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.02,
        shadowRadius: 8,
    },
    selectedHospitalCard: {
        backgroundColor: '#FF3B30',
        borderColor: '#FF3B30',
    },
    hospIconBox: {
        width: 48,
        height: 48,
        backgroundColor: '#F2F2F7',
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    hospInfo: {
        flex: 1,
    },
    hospName: {
        fontSize: 15,
        fontWeight: '900',
        color: '#1C1C1E',
    },
    hospLoc: {
        fontSize: 12,
        fontWeight: '600',
        color: '#8E8E93',
        marginTop: 2,
    },
    checkCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 20,
        paddingTop: 12,
        borderTopWidth: 1,
        borderColor: 'rgba(0,0,0,0.03)',
    },
    confirmBtn: {
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: 8,
    },
    confirmGradient: {
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 0.2,
    },
});
