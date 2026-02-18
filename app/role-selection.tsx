import { useAuth, UserRole } from '@/context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Briefcase, ChevronRight, HeartHandshake, PhoneCall, Shield, User } from 'lucide-react-native';
import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Card, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

const ROLES = [
    {
        role: 'admin' as UserRole,
        title: 'Administrator',
        description: 'Full system oversight, city-level analytics, and management.',
        icon: Shield,
        colors: ['#FF3B30', '#FF2D55'] as [string, string],
    },
    {
        role: 'manager' as UserRole,
        title: 'Chapter Manager',
        description: 'Lead volunteers, track tasks, and optimize regional impact.',
        icon: Briefcase,
        colors: ['#007AFF', '#0051A8'] as [string, string],
    },
    {
        role: 'helpline' as UserRole,
        title: 'Helpline Team',
        description: 'Real-time request processing and donor coordination hub.',
        icon: PhoneCall,
        colors: ['#AF52DE', '#8A42B0'] as [string, string],
    },
    {
        role: 'volunteer' as UserRole,
        title: 'Field Volunteer',
        description: 'Complete missions, manage camps, and report activity.',
        icon: HeartHandshake,
        colors: ['#34C759', '#248A3D'] as [string, string],
    },
    {
        role: 'donor' as UserRole,
        title: 'Blood Donor',
        description: 'Track donation history and maintain active availability.',
        icon: User,
        colors: ['#FF9500', '#D97E00'] as [string, string],
    },
];

export default function RoleSelectionScreen() {
    const { login } = useAuth();
    const router = useRouter();

    const handleRoleSelect = (role: UserRole) => {
        login(role);
        router.replace('/home');
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <Text style={styles.title}>Your Role</Text>
                    <Text style={styles.subtitle}>
                        Select your professional capacity to access your workspace.
                    </Text>
                </View>

                <View style={styles.roleList}>
                    {ROLES.map((item) => {
                        const IconComponent = item.icon;
                        return (
                            <TouchableOpacity
                                key={item.role}
                                onPress={() => handleRoleSelect(item.role)}
                                activeOpacity={0.8}
                            >
                                <Card style={styles.roleCard} mode="contained">
                                    <View style={styles.cardContent}>
                                        <LinearGradient
                                            colors={item.colors}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 1 }}
                                            style={styles.iconGradient}
                                        >
                                            <IconComponent size={24} color="#FFFFFF" strokeWidth={2} />
                                        </LinearGradient>
                                        <View style={styles.textContainer}>
                                            <Text style={styles.roleTitle}>{item.title}</Text>
                                            <Text style={styles.roleDescription}>{item.description}</Text>
                                        </View>
                                        <ChevronRight size={20} color="#C7C7CC" />
                                    </View>
                                </Card>
                            </TouchableOpacity>
                        );
                    })}
                </View>
                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F2F2F7',
    },
    scrollContent: {
        padding: 24,
    },
    header: {
        marginBottom: 40,
        marginTop: 20,
        paddingHorizontal: 8,
    },
    title: {
        color: '#1C1C1E',
        fontSize: 34,
        fontWeight: '800',
        letterSpacing: -1,
    },
    subtitle: {
        color: '#8E8E93',
        marginTop: 8,
        fontSize: 17,
        fontWeight: '500',
        lineHeight: 22,
    },
    roleList: {
        gap: 12,
    },
    roleCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        elevation: 0,
        shadowColor: 'transparent',
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    iconGradient: {
        width: 52,
        height: 52,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    textContainer: {
        flex: 1,
    },
    roleTitle: {
        color: '#1C1C1E',
        fontSize: 17,
        fontWeight: '700',
    },
    roleDescription: {
        color: '#8E8E93',
        marginTop: 2,
        fontSize: 13,
        fontWeight: '500',
        lineHeight: 18,
    },
});
