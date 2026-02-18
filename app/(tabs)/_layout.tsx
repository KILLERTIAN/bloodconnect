import { useAuth } from '@/context/AuthContext';
import { Tabs } from 'expo-router';
import { Building2, Calendar, LayoutGrid, Plus, Radio, UserCircle } from 'lucide-react-native';
import React from 'react';
import { Platform, View } from 'react-native';
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
          elevation: 0,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: -4,
        },
      }}>

      {/* Home - all roles */}
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <LayoutGrid size={24} color={color} />,
        }}
      />

      {/* Camp Manager - admin & manager */}
      <Tabs.Screen
        name="management"
        options={{
          title: 'Camps',
          tabBarIcon: ({ color }) => <Building2 size={24} color={color} />,
          href: (isAdmin || isManager) ? '/management' : null,
        }}
      />

      {/* Outreach - admin & outreach */}
      <Tabs.Screen
        name="events"
        options={{
          title: isOutreach || isAdmin ? 'Outreach' : 'Events',
          tabBarIcon: ({ color }) => <Calendar size={24} color={color} />,
          href: (isAdmin || isOutreach || isVolunteer) ? '/events' : null,
        }}
      />

      {/* Center FAB - create request (admin, manager, helpline) */}
      <Tabs.Screen
        name="create-request"
        options={{
          title: '',
          tabBarIcon: ({ color }) => (
            <View style={{
              width: 56,
              height: 56,
              backgroundColor: '#FF3B30',
              borderRadius: 28,
              justifyContent: 'center',
              alignItems: 'center',
              marginTop: -16,
              shadowColor: '#FF3B30',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 10,
            }}>
              <Plus size={28} color="#FFFFFF" strokeWidth={3} />
            </View>
          ),
          href: (isAdmin || isManager || isHelpline) ? '/create-request' : null,
        }}
      />

      {/* Helpline - admin, helpline, volunteer */}
      <Tabs.Screen
        name="helpline"
        options={{
          title: 'Helpline',
          tabBarIcon: ({ color }) => <Radio size={24} color={color} />,
          href: (isAdmin || isHelpline || isVolunteer || isManager) ? '/helpline' : null,
        }}
      />

      {/* Profile - all roles */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <UserCircle size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
