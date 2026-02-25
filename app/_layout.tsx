import { LogBox } from 'react-native';

// Ignore specific warnings that are safe to ignore
LogBox.ignoreLogs([
  'Unsupported top level event type "topSvgLayout" dispatched',
]);

import { AuthProvider } from '@/context/AuthContext';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { MD3LightTheme, Provider as PaperProvider } from 'react-native-paper';
import 'react-native-reanimated';

import { DialogProvider } from '@/context/DialogContext';
import { NetworkProvider } from '@/context/NetworkContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { DatabaseProvider } from '@/lib/db-context';
import { registerForPushNotificationsAsync } from '@/lib/notifications.service';
import { cleanupSyncManager, initializeSyncManager } from '@/lib/sync.service';

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#E63946',
    secondary: '#457B9D',
    background: '#FFFFFF',
    surface: '#F8F9FA',
    error: '#B00020',
  },
};

function AppInitializer({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    async function init() {
      try {
        await registerForPushNotificationsAsync();
        await initializeSyncManager();
        console.log('✅ App initialized: Notifications and Sync Manager ready');
      } catch (e: any) {
        // Only log critical errors, ignore "aps-environment" entitlement warning as it's common in dev
        if (!e?.message?.includes('aps-environment')) {
          console.error('❌ App init error:', e);
        }
      }
    }
    init();

    // Cleanup on unmount
    return () => {
      cleanupSyncManager();
    };
  }, []);
  return <>{children}</>;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      <PaperProvider theme={theme}>
        <DialogProvider>
          <NetworkProvider>
            <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
              <DatabaseProvider>
                <AppInitializer>
                  <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="index" />
                    <Stack.Screen name="onboarding" />
                    <Stack.Screen name="login" />
                    <Stack.Screen name="role-selection" />
                    <Stack.Screen name="request-details" />
                    <Stack.Screen name="schedule-donation" />
                    <Stack.Screen name="donor-details" />
                    <Stack.Screen name="event-details" />
                    <Stack.Screen name="camp-editor" />
                    <Stack.Screen name="notifications" options={{ presentation: 'modal' }} />
                    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  </Stack>
                </AppInitializer>
              </DatabaseProvider>
              <StatusBar style="auto" />
            </ThemeProvider>
          </NetworkProvider>
        </DialogProvider>
      </PaperProvider>
    </AuthProvider>
  );
}
