import { useAuth } from '@/context/AuthContext';
import { Tabs } from 'expo-router';
import { Briefcase, Building2, Calendar, LayoutGrid, MapPin, Plus, Radio, UserCircle } from 'lucide-react-native';
import React from 'react';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTheme } from 'react-native-paper';

export default function TabLayout() {
  const { role } = useAuth();
  const theme = useTheme();

  const isAdmin = role === 'admin';
  const isManager = role === 'manager';
  const isHR = role === 'hr';
  const isOutreach = role === 'outreach';
  const isVolunteer = role === 'volunteer';
  const isHelpline = role === 'helpline';

  const showCamps = isAdmin || isManager;
  const showEvents = true; // Everyone should see events/camps
  const showHelpline = isAdmin || isHelpline || isVolunteer || isManager;
  const showCreate = isAdmin || isManager || isHelpline;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: '#86868B',
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#F2F2F7',
          paddingBottom: Platform.OS === 'ios' ? 24 : 12,
          paddingTop: 12,
          height: Platform.OS === 'ios' ? 88 : 72,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.06,
          shadowRadius: 12,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: -4,
        },
      }}>

      {/* 1. Home - all roles */}
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <LayoutGrid size={24} color={color} />,
        }}
      />

      {/* 2. Management/Events (Roles: All) */}
      <Tabs.Screen
        name="management"
        options={{
          title: isManager || isAdmin ? 'Camps' : 'Events',
          tabBarIcon: ({ color }) => isManager || isAdmin ? <Building2 size={24} color={color} /> : <Calendar size={24} color={color} />,
          href: (showCamps || showEvents) ? undefined : null,
        }}
      />

      {/* 3. CENTER FAB (Roles: Admin, Manager, Helpline) */}
      <Tabs.Screen
        name="create-request"
        options={{
          title: '',
          ...(showCreate
            ? {
              tabBarButton: (props) => (
                <TouchableOpacity
                  onPress={props.onPress || undefined}
                  onLongPress={props.onLongPress || undefined}
                  style={styles.fabWrapper}
                  activeOpacity={0.85}
                >
                  <View style={styles.fab}>
                    <Plus size={28} color="#FFFFFF" strokeWidth={3} />
                  </View>
                </TouchableOpacity>
              ),
            }
            : {
              href: null,
            }),
        }}
      />

      {/* 4. Helpline (Roles: Admin, Helpline, Volunteer, Manager) */}
      <Tabs.Screen
        name="helpline"
        options={{
          title: 'Helpline',
          tabBarIcon: ({ color }) => <Radio size={24} color={color} />,
          href: (showHelpline && !isAdmin) ? undefined : null,
        }}
      />

      {/* 5. Outreach (Roles: Admin, Outreach) */}
      <Tabs.Screen
        name="outreach"
        options={{
          title: 'Outreach',
          tabBarIcon: ({ color }) => <MapPin size={24} color={color} />,
          href: (isOutreach && !isAdmin) ? undefined : null,
        }}
      />

      {/* 6. HR Dashboard (Roles: Admin, HR) */}
      <Tabs.Screen
        name="hr-dashboard"
        options={{
          title: 'HR',
          tabBarIcon: ({ color }) => <Briefcase size={24} color={color} />,
          href: (isAdmin || isHR) ? undefined : null,
        }}
      />

      {/* 7. Profile - all roles */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <UserCircle size={24} color={color} />,
        }}
      />

      {/* Hidden tech tabs */}
      <Tabs.Screen name="events" options={{ href: null }} />
      <Tabs.Screen name="camp-manager" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  fabWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Platform.OS === 'ios' ? -8 : -4,
  },
  fab: {
    width: 58,
    height: 58,
    backgroundColor: '#FF3B30',
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  fabPlaceholder: {
    flex: 1,
    height: 58,
  },
});
