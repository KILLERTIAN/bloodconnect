import { useNetwork } from '@/context/NetworkContext';
import { Cloud, Info, Wifi, WifiOff, X } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import {
    Animated,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const BANNER_CONFIG: Record<string, { bg: string; text: string; icon: any }> = {
    offline: {
        bg: '#1C1C1E',
        text: '#FFFFFF',
        icon: WifiOff,
    },
    online: {
        bg: '#34C759',
        text: '#FFFFFF',
        icon: Wifi,
    },
    syncing: {
        bg: '#E63946',
        text: '#FFFFFF',
        icon: Cloud,
    },
    info: {
        bg: '#007AFF',
        text: '#FFFFFF',
        icon: Info,
    },
};

export default function NetworkBanner() {
    const { bannerType, bannerMessage, dismissBanner } = useNetwork();
    const heightAnim = useRef(new Animated.Value(0)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (bannerType) {
            Animated.parallel([
                Animated.spring(heightAnim, {
                    toValue: 40,
                    useNativeDriver: false,
                    tension: 100,
                    friction: 15,
                }),
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 250,
                    useNativeDriver: false,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(heightAnim, {
                    toValue: 0,
                    duration: 250,
                    useNativeDriver: false,
                }),
                Animated.timing(opacity, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: false,
                }),
            ]).start();
        }
    }, [bannerType]);

    if (!bannerType && !bannerMessage) return null;

    const config = bannerType ? BANNER_CONFIG[bannerType] : BANNER_CONFIG.info;
    const IconComponent = config.icon;

    return (
        <Animated.View
            style={[
                styles.banner,
                {
                    backgroundColor: config.bg,
                    height: heightAnim,
                    opacity,
                },
            ]}
        >
            <View style={styles.content}>
                <IconComponent size={14} color={config.text} strokeWidth={2.5} />
                <Text style={[styles.text, { color: config.text }]} numberOfLines={1}>
                    {bannerMessage}
                </Text>
            </View>
            <TouchableOpacity
                onPress={dismissBanner}
                style={styles.dismiss}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
                <X size={14} color={config.text} strokeWidth={2.5} />
            </TouchableOpacity>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    banner: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        overflow: 'hidden',
    },
    content: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    text: {
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: -0.2,
    },
    dismiss: {
        padding: 8,
        marginLeft: 4,
    },
});
