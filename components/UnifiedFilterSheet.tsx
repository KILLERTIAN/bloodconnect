import { Check, Filter, Search, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    Animated,
    Dimensions,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface FilterOption {
    label: string;
    value: string;
    color?: string;
}

export interface FilterCategory {
    id: string;
    title: string;
    options: FilterOption[];
    multiSelect?: boolean;
}

interface UnifiedFilterSheetProps {
    visible: boolean;
    onClose: () => void;
    title?: string;
    categories: FilterCategory[];
    activeFilters: Record<string, any>; // key: categoryId, value: selectedValue(s)
    onApply: (filters: Record<string, any>) => void;
    onClear?: () => void;
}

export default function UnifiedFilterSheet({
    visible,
    onClose,
    title = 'Filter Results',
    categories,
    activeFilters,
    onApply,
    onClear
}: UnifiedFilterSheetProps) {
    const [tempFilters, setTempFilters] = useState<Record<string, any>>(activeFilters);
    const [searchQuery, setSearchQuery] = useState('');
    const [slideAnim] = useState(new Animated.Value(SCREEN_HEIGHT));

    useEffect(() => {
        if (visible) {
            setTempFilters(activeFilters);
            Animated.spring(slideAnim, {
                toValue: 0,
                friction: 8,
                tension: 40,
                useNativeDriver: true,
            }).start();
        } else {
            Animated.timing(slideAnim, {
                toValue: SCREEN_HEIGHT,
                duration: 250,
                useNativeDriver: true,
            }).start();
        }
    }, [visible, activeFilters]);

    const handleToggleOption = (categoryId: string, value: string, multiSelect?: boolean) => {
        setTempFilters(prev => {
            const current = prev[categoryId];
            if (multiSelect) {
                const arr = Array.isArray(current) ? [...current] : [];
                if (arr.includes(value)) {
                    return { ...prev, [categoryId]: arr.filter(v => v !== value) };
                } else {
                    return { ...prev, [categoryId]: [...arr, value] };
                }
            } else {
                return { ...prev, [categoryId]: current === value ? null : value };
            }
        });
    };

    const handleApply = () => {
        onApply(tempFilters);
        onClose();
    };

    const handleClearLocal = () => {
        const cleared: Record<string, any> = {};
        categories.forEach(c => {
            cleared[c.id] = c.multiSelect ? [] : null;
        });
        setTempFilters(cleared);
        if (onClear) onClear();
    };

    const renderCategory = (cat: FilterCategory) => {
        const filteredOptions = cat.options.filter(opt =>
            opt.label.toLowerCase().includes(searchQuery.toLowerCase())
        );

        if (filteredOptions.length === 0 && searchQuery !== '') return null;

        return (
            <View key={cat.id} style={styles.categoryBlock}>
                <Text style={styles.categoryTitle}>{cat.title}</Text>
                <View style={styles.chipGrid}>
                    {filteredOptions.map(opt => {
                        const isSelected = cat.multiSelect
                            ? (tempFilters[cat.id] || []).includes(opt.value)
                            : tempFilters[cat.id] === opt.value;

                        return (
                            <TouchableOpacity
                                key={opt.value}
                                onPress={() => handleToggleOption(cat.id, opt.value, cat.multiSelect)}
                                style={[
                                    styles.chip,
                                    isSelected && { backgroundColor: opt.color || '#F2F2F7', borderColor: opt.color || '#E63946' },
                                    isSelected && styles.activeChip
                                ]}
                                activeOpacity={0.7}
                            >
                                <Text style={[
                                    styles.chipText,
                                    isSelected && styles.activeChipText
                                ]}>
                                    {opt.label}
                                </Text>
                                {isSelected && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                            </TouchableOpacity>
                        );
                    })}
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
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)' }]} />
                </TouchableOpacity>

                <Animated.View style={[
                    styles.sheet,
                    { transform: [{ translateY: slideAnim }] }
                ]}>
                    <View style={styles.indicator} />

                    <View style={styles.header}>
                        <View style={styles.titleRow}>
                            <Filter size={20} color="#1C1C1E" strokeWidth={2.5} />
                            <Text style={styles.sheetTitle}>{title}</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <X size={20} color="#8E8E93" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.searchBarContainer}>
                        <View style={styles.searchBar}>
                            <Search size={16} color="#8E8E93" />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search filters..."
                                placeholderTextColor="#8E8E93"
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                clearButtonMode="while-editing"
                            />
                        </View>
                    </View>

                    <ScrollView
                        style={styles.content}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 40 }}
                    >
                        {categories.map(renderCategory)}
                    </ScrollView>

                    <View style={styles.footer}>
                        <TouchableOpacity style={styles.clearBtn} onPress={handleClearLocal}>
                            <Text style={styles.clearBtnText}>Reset All</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.applyBtn} onPress={handleApply}>
                            <Text style={styles.applyBtnText}>Apply Filters</Text>
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
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        maxHeight: SCREEN_HEIGHT * 0.85,
        width: '100%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 25,
    },
    indicator: {
        width: 40,
        height: 5,
        backgroundColor: '#E5E5EA',
        borderRadius: 3,
        alignSelf: 'center',
        marginTop: 12,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 8,
        paddingBottom: 16,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    sheetTitle: {
        fontSize: 20,
        fontWeight: '900',
        color: '#1C1C1E',
        letterSpacing: -0.5,
    },
    closeBtn: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: '#F2F2F7',
    },
    searchBarContainer: {
        paddingHorizontal: 24,
        paddingBottom: 16,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F2F2F7',
        borderRadius: 14,
        paddingHorizontal: 12,
        height: 44,
        gap: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        fontWeight: '600',
        color: '#1C1C1E',
    },
    content: {
        paddingHorizontal: 24,
    },
    categoryBlock: {
        marginBottom: 24,
    },
    categoryTitle: {
        fontSize: 12,
        fontWeight: '800',
        color: '#8E8E93',
        letterSpacing: 1,
        textTransform: 'uppercase',
        marginBottom: 12,
    },
    chipGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 14,
        backgroundColor: '#F8F9FA',
        borderWidth: 1.5,
        borderColor: '#F2F2F7',
    },
    activeChip: {
        backgroundColor: '#E63946',
        borderColor: '#E63946',
    },
    chipText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#8E8E93',
    },
    activeChipText: {
        color: '#FFFFFF',
    },
    footer: {
        flexDirection: 'row',
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
        gap: 12,
        borderTopWidth: 1,
        borderTopColor: '#F2F2F7',
        backgroundColor: '#FFFFFF',
    },
    clearBtn: {
        flex: 1,
        height: 56,
        borderRadius: 18,
        backgroundColor: '#F8F9FA',
        justifyContent: 'center',
        alignItems: 'center',
    },
    clearBtnText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#8E8E93',
    },
    applyBtn: {
        flex: 2,
        height: 56,
        borderRadius: 18,
        backgroundColor: '#1C1C1E',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 15,
        elevation: 8,
    },
    applyBtnText: {
        fontSize: 16,
        fontWeight: '800',
        color: '#FFFFFF',
    },
});
