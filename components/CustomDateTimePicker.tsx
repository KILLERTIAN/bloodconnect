import { BlurView } from 'expo-blur';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    Animated,
    Dimensions,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface CustomDateTimePickerProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: (date: Date) => void;
    mode: 'date' | 'time';
    initialDate?: Date;
    title?: string;
    minimumDate?: Date;
}

export default function CustomDateTimePicker({
    visible,
    onClose,
    onConfirm,
    mode,
    initialDate = new Date(),
    title,
    minimumDate
}: CustomDateTimePickerProps) {
    const [selectedDate, setSelectedDate] = useState(initialDate);
    const [fadeAnim] = useState(new Animated.Value(0));
    const [scaleAnim] = useState(new Animated.Value(0.9));

    useEffect(() => {
        if (visible) {
            setSelectedDate(initialDate);
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 8,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }).start();
        }
    }, [visible]);

    const handleConfirm = () => {
        onConfirm(selectedDate);
    };

    // Date Picker Logic
    const renderDatePicker = () => {
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const currentYear = selectedDate.getFullYear();
        const currentMonth = selectedDate.getMonth();

        const changeMonth = (offset: number) => {
            const newDate = new Date(selectedDate);
            newDate.setMonth(newDate.getMonth() + offset);
            setSelectedDate(newDate);
        };

        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

        const days = [];
        // padding
        for (let i = 0; i < firstDayOfMonth; i++) {
            days.push(<View key={`pad-${i}`} style={styles.dayCell} />);
        }
        for (let d = 1; d <= daysInMonth; d++) {
            const isToday = new Date().toDateString() === new Date(currentYear, currentMonth, d).toDateString();
            const isSelected = d === selectedDate.getDate() && currentMonth === selectedDate.getMonth() && currentYear === selectedDate.getFullYear();

            const dateObj = new Date(currentYear, currentMonth, d);
            const isDisabled = minimumDate && dateObj < new Date(minimumDate.setHours(0, 0, 0, 0));

            days.push(
                <TouchableOpacity
                    key={d}
                    disabled={isDisabled}
                    style={styles.dayCell}
                    onPress={() => {
                        const newDate = new Date(selectedDate);
                        newDate.setDate(d);
                        setSelectedDate(newDate);
                    }}
                >
                    <View style={[
                        isSelected && styles.selectedDay,
                        isToday && !isSelected && styles.todayCell
                    ]}>
                        <Text style={[
                            styles.dayText,
                            isSelected && styles.selectedDayText,
                            isToday && !isSelected && styles.todayText,
                            isDisabled && styles.disabledText
                        ]}>{d}</Text>
                    </View>
                </TouchableOpacity>
            );
        }

        return (
            <View style={styles.pickerContent}>
                <View style={styles.pickerHeader}>
                    <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.navBtn}>
                        <ChevronLeft size={20} color="#1C1C1E" />
                    </TouchableOpacity>
                    <View style={styles.monthBox}>
                        <Text style={styles.monthYearText}>{months[currentMonth]}</Text>
                        <Text style={styles.yearText}>{currentYear}</Text>
                    </View>
                    <TouchableOpacity onPress={() => changeMonth(1)} style={styles.navBtn}>
                        <ChevronRight size={20} color="#1C1C1E" />
                    </TouchableOpacity>
                </View>
                <View style={styles.calendarGrid}>
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                        <View key={`header-${index}`} style={styles.dayCell}>
                            <Text style={styles.dayHeader}>{day}</Text>
                        </View>
                    ))}
                    {days}
                </View>

                <TouchableOpacity
                    style={styles.todayBtn}
                    onPress={() => setSelectedDate(new Date())}
                >
                    <Text style={styles.todayBtnText}>Back to Today</Text>
                </TouchableOpacity>
            </View>
        );
    };

    // Time Picker Logic
    const renderTimePicker = () => {
        const hours = Array.from({ length: 24 }, (_, i) => i);
        const minutes = Array.from({ length: 60 }, (_, i) => i);

        return (
            <View style={styles.pickerContent}>
                <View style={styles.timeContainer}>
                    <View style={styles.timeColumn}>
                        <Text style={styles.timeLabel}>HOUR</Text>
                        <ScrollView showsVerticalScrollIndicator={false} snapToInterval={44}>
                            {hours.map(h => (
                                <TouchableOpacity
                                    key={h}
                                    style={[styles.timeSlot, selectedDate.getHours() === h && styles.selectedTimeSlot]}
                                    onPress={() => {
                                        const newDate = new Date(selectedDate);
                                        newDate.setHours(h);
                                        setSelectedDate(newDate);
                                    }}
                                >
                                    <Text style={[styles.timeSlotText, selectedDate.getHours() === h && styles.selectedTimeText]}>
                                        {h.toString().padStart(2, '0')}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                    <View style={styles.timeDivider}>
                        <Text style={styles.timeDividerText}>:</Text>
                    </View>
                    <View style={styles.timeColumn}>
                        <Text style={styles.timeLabel}>MINUTE</Text>
                        <ScrollView showsVerticalScrollIndicator={false} snapToInterval={44}>
                            {minutes.filter(m => mode === 'time').map(m => (
                                <TouchableOpacity
                                    key={m}
                                    style={[styles.timeSlot, selectedDate.getMinutes() === m && styles.selectedTimeSlot]}
                                    onPress={() => {
                                        const newDate = new Date(selectedDate);
                                        newDate.setMinutes(m);
                                        setSelectedDate(newDate);
                                    }}
                                >
                                    <Text style={[styles.timeSlotText, selectedDate.getMinutes() === m && styles.selectedTimeText]}>
                                        {m.toString().padStart(2, '0')}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <Modal visible={visible} transparent animationType="none">
            <View style={styles.overlay}>
                <TouchableOpacity
                    style={StyleSheet.absoluteFill}
                    activeOpacity={1}
                    onPress={onClose}
                >
                    {Platform.OS === 'ios' ? (
                        <BlurView intensity={10} style={StyleSheet.absoluteFill} tint="dark" />
                    ) : (
                        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)' }]} />
                    )}
                </TouchableOpacity>

                <Animated.View style={[
                    styles.container,
                    {
                        opacity: fadeAnim,
                        transform: [{ scale: scaleAnim }]
                    }
                ]}>
                    <View style={styles.modalHeader}>
                        <View style={styles.titleRow}>
                            {mode === 'date' ? (
                                <CalendarIcon size={20} color="#E63946" strokeWidth={2.5} />
                            ) : (
                                <Clock size={20} color="#E63946" strokeWidth={2.5} />
                            )}
                            <Text style={styles.title}>{title || (mode === 'date' ? 'Select Date' : 'Select Time')}</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeIconBtn}>
                            <X size={20} color="#8E8E93" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.divider} />

                    {mode === 'date' ? renderDatePicker() : renderTimePicker()}

                    <View style={styles.footerBtns}>
                        <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                            <Text style={styles.cancelBtnText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
                            <Text style={styles.confirmBtnText}>Save Selection</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24
    },
    container: {
        width: Math.min(SCREEN_WIDTH - 48, 400),
        backgroundColor: '#FFFFFF',
        borderRadius: 32,
        padding: 24,
        maxHeight: 600,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.15,
        shadowRadius: 30,
        elevation: 20
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10
    },
    title: {
        fontSize: 18,
        fontWeight: '900',
        color: '#1C1C1E',
        letterSpacing: -0.5
    },
    closeIconBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F2F2F7',
        justifyContent: 'center',
        alignItems: 'center'
    },
    divider: {
        height: 1,
        backgroundColor: '#F2F2F7',
        marginBottom: 20
    },
    pickerContent: {
        marginBottom: 8
    },
    pickerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingHorizontal: 4
    },
    navBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F9F9F9',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#F2F2F7'
    },
    monthBox: {
        alignItems: 'center'
    },
    monthYearText: {
        fontSize: 17,
        fontWeight: '800',
        color: '#1C1C1E'
    },
    yearText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#8E8E93',
        marginTop: 2
    },
    calendarGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 10,
        rowGap: 4,
    },
    dayCell: {
        width: '14.28%',
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    dayHeader: {
        fontSize: 12,
        fontWeight: '700',
        color: '#8E8E93',
        marginBottom: 8
    },
    dayText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1C1C1E',
        includeFontPadding: false,
        textAlign: 'center',
    },
    selectedDay: {
        backgroundColor: '#E63946',
        borderRadius: 19,
        width: 38,
        height: 38,
        justifyContent: 'center',
        alignItems: 'center',
    },
    selectedDayText: {
        color: '#FFFFFF',
        fontWeight: '900',
        textAlign: 'center',
    },
    todayCell: {
        borderWidth: 2,
        borderColor: '#E63946',
        borderRadius: 19,
        width: 38,
        height: 38,
        justifyContent: 'center',
        alignItems: 'center',
    },
    todayText: {
        color: '#E63946',
        fontWeight: '800'
    },
    disabledText: {
        color: '#E5E5EA',
        fontWeight: '400'
    },
    todayBtn: {
        alignSelf: 'center',
        marginTop: 12,
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: '#F2F2F7'
    },
    todayBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#E63946'
    },
    timeContainer: {
        flexDirection: 'row',
        height: 240,
        justifyContent: 'center',
        paddingHorizontal: 10
    },
    timeColumn: {
        flex: 1,
        alignItems: 'center',
    },
    timeLabel: {
        fontSize: 11,
        color: '#8E8E93',
        marginBottom: 12,
        fontWeight: '800',
        letterSpacing: 1
    },
    timeSlot: {
        width: 60,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 12,
        marginBottom: 4
    },
    selectedTimeSlot: {
        backgroundColor: '#FFF1F2',
        borderWidth: 1,
        borderColor: '#FFD1D4'
    },
    timeSlotText: {
        fontSize: 20,
        color: '#1C1C1E',
        fontWeight: '500'
    },
    selectedTimeText: {
        color: '#E63946',
        fontWeight: '900'
    },
    timeDivider: {
        justifyContent: 'center',
        paddingTop: 24,
        marginHorizontal: 10
    },
    timeDividerText: {
        fontSize: 24,
        fontWeight: '900',
        color: '#C7C7CC'
    },
    footerBtns: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 10
    },
    cancelBtn: {
        flex: 1,
        height: 56,
        borderRadius: 18,
        backgroundColor: '#F8F9FA',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#F2F2F7'
    },
    cancelBtnText: {
        color: '#8E8E93',
        fontSize: 16,
        fontWeight: '700'
    },
    confirmBtn: {
        flex: 2,
        height: 56,
        borderRadius: 18,
        backgroundColor: '#E63946',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#E63946',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
        elevation: 8
    },
    confirmBtnText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '800'
    }
});
