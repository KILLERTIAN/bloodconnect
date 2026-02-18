import { AuthProvider } from '@/context/AuthContext';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { MD3LightTheme, Provider as PaperProvider } from 'react-native-paper';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { initializeSchema, seedDefaultUsers } from '@/lib/schema';

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

import { registerForPushNotificationsAsync } from '@/lib/notifications.service';

function AppInitializer({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    async function init() {
      try {
        await initializeSchema();
        await seedDefaultUsers();
        await registerForPushNotificationsAsync();
        console.log('✅ Database & Notifications initialized');
      } catch (e) {
        console.error('❌ App init error:', e);
      }
    }
    init();
  }, []);
  return <>{children}</>;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      <PaperProvider theme={theme}>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
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
              <Stack.Screen name="camp-manager" />
              <Stack.Screen name="outreach" />
              <Stack.Screen name="hr-dashboard" />
              <Stack.Screen name="notifications" options={{ presentation: 'modal' }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            </Stack>
          </AppInitializer>
          <StatusBar style="auto" />
        </ThemeProvider>
      </PaperProvider>
    </AuthProvider>
  );
}
