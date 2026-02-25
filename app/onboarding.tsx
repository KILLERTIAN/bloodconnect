import { useAuth } from '@/context/AuthContext';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ArrowRight } from 'lucide-react-native';
import React, { useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    FlatList,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, Path, Stop, LinearGradient as SvgGradient } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

const ONBOARDING_DATA = [
    {
        id: '1',
        title: 'Saving Lives\nTogether',
        highlight: 'Lives',
        description: 'Connect with donors and volunteers nearby to create a lasting impact on your community.',
        image: require('../assets/images/onboarding/hands.png'),
    },
    {
        id: '2',
        title: 'Networked\nCoordination',
        highlight: 'Coordination',
        description: 'Instant blood request routing and volunteer allocation at the speed of thought.',
        image: require('../assets/images/onboarding/breif.png'),
    },
    {
        id: '3',
        title: 'Impact with\nEvery Drop',
        highlight: 'Impact',
        description: 'Track your donation journey and witness how your contribution helps save vital lives.',
        image: require('../assets/images/onboarding/redcell.png'),
    },
];

export default function OnboardingScreen() {
    const [activeIndex, setActiveIndex] = useState(0);
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { completeOnboarding } = useAuth();
    const scrollX = useRef(new Animated.Value(0)).current;
    const flatListRef = useRef<FlatList>(null);

    const handleNext = async () => {
        if (activeIndex < ONBOARDING_DATA.length - 1) {
            flatListRef.current?.scrollToIndex({
                index: activeIndex + 1,
                animated: true
            });
        } else {
            await completeOnboarding();
            router.replace('/login');
        }
    };

    const handleSkip = async () => {
        await completeOnboarding();
        router.replace('/login');
    };

    const renderItem = ({ item, index }: { item: typeof ONBOARDING_DATA[0], index: number }) => {
        const titleParts = item.title.split(item.highlight);

        // Final Slide 1 Design avec manual fixes de l'utilisateur
        if (index === 0) {
            return (
                <View style={[styles.slide, { width }]}>
                    <LinearGradient
                        colors={['#ffffff', '#fff1f1']}
                        style={styles.topSectionCurved}
                    >
                        <View style={styles.imageContainerCurved}>
                            <Image
                                source={item.image}
                                style={styles.heroImageCurved}
                                contentFit="contain"
                                transition={1000}
                            />
                        </View>
                    </LinearGradient>

                    <View style={styles.bottomSectionCurved}>
                        <View style={styles.curveContainer}>
                            <Svg height="100" width={width} viewBox={`0 0 ${width} 100`}>
                                <Path
                                    d={`M0 100 Q${width / 2} 10 ${width} 100 L${width} 100 L0 100 Z`}
                                    fill="#FFFFFF"
                                />
                            </Svg>
                        </View>

                        <View style={styles.contentWrap}>
                            <Text style={styles.heroTitle}>
                                {titleParts[0]}
                                <Text style={styles.heroHighlight}>{item.highlight}</Text>
                                {titleParts[1]}
                            </Text>
                            <Text style={styles.heroDescription}>{item.description}</Text>
                        </View>
                    </View>
                </View>
            );
        }

        // Slides 2 et 3: Premium Background Decor
        return (
            <View style={[styles.slide, { width }]}>
                {/* Refined Background Decor for Slides 2 & 3 */}
                <View style={styles.decorContainer}>
                    <Svg height={height} width={width} style={StyleSheet.absoluteFill}>
                        <Defs>
                            <SvgGradient id="blobGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                <Stop offset="0%" stopColor="#E63946" stopOpacity="0.04" />
                                <Stop offset="100%" stopColor="#E63946" stopOpacity="0" />
                            </SvgGradient>
                        </Defs>
                        {/* More organic and centered background elements */}
                        <Circle cx={width * 0.8} cy={height * 0.2} r={width * 0.5} fill="url(#blobGrad)" />
                        <Circle cx={width * 0.2} cy={height * 0.55} r={width * 0.4} fill="#E63946" opacity={0.02} />
                        <Circle cx={width * 0.85} cy={height * 0.85} r={width * 0.25} fill="#E63946" opacity={0.03} />
                    </Svg>
                </View>

                <View style={[styles.imageSectionStandard, { paddingTop: insets.top + 50 }]}>
                    <View style={styles.heroContainerStandard}>
                        {/* Double blobs behind the image for more depth */}
                        <View style={styles.blobWrapper}>
                            <View style={styles.blobMain} />
                            <View style={styles.blobSecondary} />
                        </View>
                        <Image
                            source={item.image}
                            style={styles.heroImageStandard}
                            contentFit="contain"
                            transition={1000}
                        />
                    </View>
                </View>

                <View style={styles.infoSectionStandard}>
                    <View style={styles.textWrapper}>
                        <Text style={styles.heroTitle}>
                            {titleParts[0]}
                            <Text style={styles.heroHighlight}>{item.highlight}</Text>
                            {titleParts[1]}
                        </Text>
                        <Text style={styles.heroDescription}>{item.description}</Text>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />

            <View style={[styles.overlayHeader, { top: insets.top + 10 }]}>
                <TouchableOpacity onPress={handleSkip} activeOpacity={0.6} style={styles.skipLink}>
                    <Text style={styles.skipLabel}>Skip</Text>
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
                scrollEventThrottle={16}
                decelerationRate="fast"
            />

            <View style={[styles.footerContainer, { paddingBottom: insets.bottom + 30 }]}>
                <View style={styles.paginationRow}>
                    <View style={styles.stepsWrap}>
                        {ONBOARDING_DATA.map((_, i) => {
                            const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
                            const dotWidth = scrollX.interpolate({
                                inputRange,
                                outputRange: [10, 30, 10],
                                extrapolate: 'clamp',
                            });
                            const dotOpacity = scrollX.interpolate({
                                inputRange,
                                outputRange: [0.2, 1, 0.2],
                                extrapolate: 'clamp',
                            });
                            return (
                                <Animated.View
                                    key={i}
                                    style={[
                                        styles.stepBar,
                                        {
                                            width: dotWidth,
                                            opacity: dotOpacity,
                                        }
                                    ]}
                                />
                            );
                        })}
                    </View>

                    <TouchableOpacity
                        onPress={handleNext}
                        activeOpacity={0.9}
                        style={styles.ctaButton}
                    >
                        <LinearGradient
                            colors={['#E63946', '#CD1C2B']}
                            style={styles.ctaGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            <Text style={styles.ctaText} numberOfLines={1} adjustsFontSizeToFit>
                                {activeIndex === ONBOARDING_DATA.length - 1 ? 'Get Started' : 'Next'}
                            </Text>
                            <View style={styles.ctaIconBox}>
                                <ArrowRight size={20} color="#E63946" strokeWidth={3} />
                            </View>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    overlayHeader: {
        position: 'absolute',
        right: 28,
        zIndex: 100,
    },
    skipLink: {
        paddingVertical: 10,
        paddingHorizontal: 16,
    },
    skipLabel: {
        fontSize: 16,
        fontWeight: '800',
        color: '#999',
        letterSpacing: 0.5,
    },
    slide: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    // Manual Fixes for Slide 1
    topSectionCurved: {
        flex: 0.5,
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageContainerCurved: {
        width: width * 0.7,
        height: width * 0.7,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 135,
    },
    heroImageCurved: {
        width: '100%',
        height: '100%',
    },
    bottomSectionCurved: {
        flex: 0.5,
        backgroundColor: '#FFFFFF',
    },
    curveContainer: {
        position: 'absolute',
        top: -100,
        width: '100%',
        zIndex: 10,
    },
    // Standard Slides (2 & 3)
    decorContainer: {
        ...StyleSheet.absoluteFillObject,
    },
    imageSectionStandard: {
        flex: 0.55,
        justifyContent: 'center',
        alignItems: 'center',
    },
    heroContainerStandard: {
        width: width * 0.8,
        height: width * 0.8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    blobWrapper: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    blobMain: {
        position: 'absolute',
        width: '85%',
        height: '85%',
        borderRadius: 120,
        backgroundColor: '#E63946',
        opacity: 0.05,
        transform: [{ rotate: '45deg' }],
    },
    blobSecondary: {
        position: 'absolute',
        width: '78%',
        height: '78%',
        borderRadius: 110,
        backgroundColor: '#E63946',
        opacity: 0.03,
        transform: [{ rotate: '-15deg' }],
    },
    heroImageStandard: {
        width: '85%',
        height: '85%',
        zIndex: 10,
    },
    infoSectionStandard: {
        flex: 0.45,
        paddingHorizontal: 36,
        justifyContent: 'flex-start',
    },
    textWrapper: {
        marginTop: 10,
    },
    // Common
    contentWrap: {
        paddingHorizontal: 36,
        paddingTop: 40,
    },
    heroTitle: {
        fontSize: 42,
        fontWeight: '900',
        color: '#121212',
        lineHeight: 50,
        letterSpacing: -1.5,
        marginBottom: 16,
    },
    heroHighlight: {
        color: '#E63946',
    },
    heroDescription: {
        fontSize: 18,
        color: '#666',
        lineHeight: 28,
        fontWeight: '500',
        paddingRight: 10,
    },
    footerContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 28,
    },
    paginationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    stepsWrap: {
        flexDirection: 'row',
        gap: 8,
    },
    stepBar: {
        height: 8,
        borderRadius: 4,
        backgroundColor: '#E63946',
    },
    ctaButton: {
        minWidth: 160,
    },
    ctaGradient: {
        height: 68,
        borderRadius: 34,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingLeft: 24,
        paddingRight: 12,
        shadowColor: '#E63946',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        gap: 8,
    },
    ctaText: {
        flex: 1,
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '900',
        letterSpacing: -0.5,
        textAlign: 'center',
    },
    ctaIconBox: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
});
