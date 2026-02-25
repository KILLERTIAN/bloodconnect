import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function EntryScreen() {
    const { isLoggedIn, isOnboarded, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading) {
            const timer = setTimeout(async () => {
                // FORCE ONBOARDING FOR TESTING
                router.replace('/onboarding');
                await SplashScreen.hideAsync();
            }, 50);

            return () => clearTimeout(timer);
        }
    }, [isLoading, isLoggedIn, isOnboarded]);

    // Return null to keep the native splash screen visible without showing a brief flicker of a custom loader.
    return null;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoCircle: {
        width: 120,
        height: 120,
        borderRadius: 44,
        backgroundColor: '#FF3B30',
        justifyContent: 'center',
        alignItems: 'center',
    },
});
