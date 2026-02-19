import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Activity, ChevronRight, Heart, ShieldCheck, Users } from 'lucide-react-native';
import React, { useRef, useState } from 'react';
import { Animated, FlatList, StatusBar, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
// Text removed from react-native-paper import
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ONBOARDING_DATA = [
    {
        id: '1',
        title: 'Transforming\nBlood Donation',
        description: 'Join a mission-driven community saving lives through technology and coordinated action.',
        icon: Heart,
        colors: ['#FF5F6D', '#FFC371'] as [string, string],
    },
    {
        id: '2',
        title: 'Precision\nHelpline',
        description: 'Instant blood request routing and automated volunteer allocation at your fingertips.',
        icon: Activity,
        colors: ['#2193b0', '#6dd5ed'] as [string, string],
    },
    {
        id: '3',
        title: 'Networked\nExcellence',
        description: 'A seamless ecosystem connecting donors, volunteers, and managers across 20+ cities.',
        icon: Users,
        colors: ['#ee0979', '#ff6a00'] as [string, string],
    },
    {
        id: '4',
        title: 'Impact with\nIntegrity',
        description: 'Secure, ethical handling of data ensuring every drop counts where it matters most.',
        icon: ShieldCheck,
        colors: ['#1C1C1E', '#444444'] as [string, string],
    }
];

export default function OnboardingScreen() {
    const [activeIndex, setActiveIndex] = useState(0);
    const { width } = useWindowDimensions();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const scrollX = useRef(new Animated.Value(0)).current;
    const flatListRef = useRef<FlatList>(null);

    const handleNext = () => {
        if (activeIndex < ONBOARDING_DATA.length - 1) {
            flatListRef.current?.scrollToIndex({
                index: activeIndex + 1,
                animated: true
            });
            setActiveIndex(activeIndex + 1);
        } else {
            router.push('/login');
        }
    };

    const renderItem = ({ item }: { item: any }) => {
        const IconComponent = item.icon;
        return (
            <View style={[styles.slide, { width }]}>
                <View style={styles.contentContainer}>
                    <LinearGradient
                        colors={item.colors}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.iconGradient}
                    >
                        <IconComponent size={60} color="#FFFFFF" strokeWidth={2} />
                    </LinearGradient>

                    <View style={styles.textContainer}>
                        <Text style={styles.slideTitle}>{item.title}</Text>
                        <Text style={styles.slideDescription}>{item.description}</Text>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity onPress={() => router.push('/login')} activeOpacity={0.6}>
                    <Text style={styles.skipBtn}>Skip</Text>
                </TouchableOpacity>
            </View>

            <Animated.FlatList
                ref={flatListRef}
                data={ONBOARDING_DATA}
                renderItem={renderItem}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                    { useNativeDriver: false }
                )}
                onMomentumScrollEnd={(e) => {
                    const index = Math.round(e.nativeEvent.contentOffset.x / width);
                    setActiveIndex(index);
                }}
                keyExtractor={(item) => item.id}
            />

            <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
                <View style={styles.pagination}>
                    {ONBOARDING_DATA.map((_, index) => {
                        const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
                        const dotWidth = scrollX.interpolate({
                            inputRange,
                            outputRange: [10, 24, 10],
                            extrapolate: 'clamp',
                        });
                        const opacity = scrollX.interpolate({
                            inputRange,
                            outputRange: [0.3, 1, 0.3],
                            extrapolate: 'clamp',
                        });
                        return (
                            <Animated.View
                                key={index}
                                style={[
                                    styles.dot,
                                    {
                                        width: dotWidth,
                                        opacity,
                                        backgroundColor: index === activeIndex ? '#FF3B30' : '#E5E5EA'
                                    }
                                ]}
                            />
                        );
                    })}
                </View>

                <TouchableOpacity
                    onPress={handleNext}
                    activeOpacity={0.8}
                    style={styles.nextBtnContainer}
                >
                    <LinearGradient
                        colors={['#FF3B30', '#FF2D55']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.nextBtnGradient}
                    >
                        <Text style={styles.nextBtnText}>
                            {activeIndex === ONBOARDING_DATA.length - 1 ? 'Get Started' : 'Continue'}
                        </Text>
                        <ChevronRight size={22} color="#FFFFFF" strokeWidth={3} />
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        width: '100%',
        justifyContent: 'center',
        alignItems: 'flex-end',
        paddingHorizontal: 32,
    },
    skipBtn: {
        color: '#8E8E93',
        fontSize: 16,
        fontWeight: '700',
    },
    slide: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 32,
    },
    contentContainer: {
        alignItems: 'flex-start',
        marginTop: -60,
    },
    iconGradient: {
        width: 110,
        height: 110,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 40,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
    },
    textContainer: {
        width: '100%',
    },
    slideTitle: {
        color: '#1C1C1E',
        fontSize: 36,
        fontWeight: '900',
        textAlign: 'left',
        marginBottom: 20,
        lineHeight: 44,
        letterSpacing: -1.2,
    },
    slideDescription: {
        color: '#8E8E93',
        textAlign: 'left',
        lineHeight: 28,
        fontSize: 18,
        fontWeight: '600',
    },
    footer: {
        padding: 32,
    },
    pagination: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        marginBottom: 40,
    },
    dot: {
        height: 10,
        borderRadius: 5,
        marginRight: 8,
    },
    nextBtnContainer: {
        width: '100%',
    },
    nextBtnGradient: {
        height: 64,
        borderRadius: 24,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        shadowColor: '#FF3B30',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 15,
    },
    nextBtnText: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
});
