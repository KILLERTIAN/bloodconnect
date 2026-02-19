import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'expo-router';
import { Droplet } from 'lucide-react-native';
import { useEffect } from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function EntryScreen() {
    const { isLoggedIn } = useAuth();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    useEffect(() => {
        const timer = setTimeout(() => {
            if (isLoggedIn) {
                router.replace('/home');
            } else {
                router.replace('/onboarding');
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [isLoggedIn]);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
            <View style={styles.content}>
                <View style={styles.logoContainer}>
                    <View style={styles.logoCircle}>
                        <Droplet size={48} color="#FFFFFF" fill="#FFFFFF" strokeWidth={2.5} />
                    </View>
                </View>
                <Text style={styles.title}>BloodConnect</Text>
                <Text style={styles.subtitle}>Saving Lives, One Drop at a Time</Text>
                <View style={styles.loaderContainer}>
                    <ActivityIndicator animating={true} color="#FF3B30" size="small" />
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
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    logoContainer: {
        marginBottom: 24,
    },
    logoCircle: {
        width: 120,
        height: 120,
        borderRadius: 44,
        backgroundColor: '#FF3B30',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#FF3B30',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.3,
        shadowRadius: 24,
    },
    title: {
        color: '#1C1C1E',
        fontSize: 32,
        fontWeight: '900',
        letterSpacing: -1,
    },
    subtitle: {
        color: '#8E8E93',
        marginTop: 10,
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
    loaderContainer: {
        marginTop: 64,
        height: 40,
        justifyContent: 'center',
    },
});
