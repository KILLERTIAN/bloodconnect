import { getDonorAvatar } from '@/constants/AvatarMapping';
import { useAuth } from '@/context/AuthContext';
import { sync } from '@/lib/database';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
    Activity,
    Award,
    Bell,
    ChevronRight,
    Clipboard,
    Clock,
    CreditCard,
    Droplet,
    Heart,
    History,
    Languages,
    LogOut,
    MessageCircle,
    Moon,
    Shield,
    ShieldCheck,
    Star,
    Target,
    User
} from 'lucide-react-native';
import React from 'react';
import {
    Alert,
    Dimensions,
    ScrollView,
    StatusBar,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';
import { Divider, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const ROLE_THEMES = {
    donor: {
        colors: ['#FF3B30', '#FF2D55'] as const,
        tagColor: '#FF3B30',
        statsColor: '#FFEBEA',
        avatar: 'https://picsum.photos/id/1012/300/300',
        label: 'Hero Donor',
        bio: '8 Lives Saved • Mumbai, IN',
        roleStats: [
            { value: '12', label: 'Donations', icon: Droplet },
            { value: 'Gold', label: 'Badge', icon: Award },
            { value: 'A+', label: 'Group', icon: Heart }
        ]
    },
    volunteer: {
        colors: ['#5856D6', '#AF52DE'] as const,
        tagColor: '#5856D6',
        statsColor: '#F0EFFF',
        avatar: 'https://picsum.photos/id/64/300/300',
        label: 'Lead Volunteer',
        bio: '42 Missions • Active Responder',
        roleStats: [
            { value: '156', label: 'Hours', icon: Clock },
            { value: '42', label: 'Tasks', icon: Clipboard },
            { value: '4.9', label: 'Rating', icon: Star }
        ]
    },
    admin: {
        colors: ['#1C1C1E', '#3A3A3C'] as const,
        tagColor: '#1C1C1E',
        statsColor: '#F2F2F7',
        avatar: 'https://picsum.photos/id/177/300/300',
        label: 'System Admin',
        bio: 'Node Master • Global Region',
        roleStats: [
            { value: '1.2k', label: 'Active', icon: Activity },
            { value: 'All', label: 'Units', icon: Target },
            { value: 'Pro', label: 'Level', icon: ShieldCheck }
        ]
    }
};

export default function ProfileScreen() {
    const { logout, role, user } = useAuth();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const userName = user?.name || 'User';
    const userRole = (role && ROLE_THEMES[role as keyof typeof ROLE_THEMES]) ? role : 'donor';
    const theme = ROLE_THEMES[userRole as keyof typeof ROLE_THEMES];

    const roleLabels: Record<string, string> = {
        admin: 'System Admin',
        manager: 'Branch Manager',
        hr: 'HR Manager',
        outreach: 'Outreach Coordinator',
        helpline: 'Helpline Executive',
        volunteer: 'Lead Volunteer',
        donor: 'Hero Donor'
    };

    const roleBios: Record<string, string> = {
        admin: 'Node Master • Global Region',
        manager: 'Operational Head • Main Branch',
        hr: 'Personnel & Culture • Corporate',
        outreach: 'Community Relations • Field',
        helpline: 'Emergency Coordination • 24/7',
        volunteer: 'Active Responder • Community',
        donor: '8 Lives Saved • Mumbai, IN'
    };

    // Globally synchronized avatar for current user
    const currentUserAvatar = user?.avatar_url || getDonorAvatar(userName, 'male');

    const handleLogout = () => {
        logout();
        router.replace('/login');
    };

    const renderMenuItem = (item: any) => (
        <TouchableOpacity key={item.label} style={styles.menuItem} activeOpacity={0.7} onPress={item.onPress}>
            <View style={[styles.menuIconBox, { backgroundColor: item.bgColor || '#F2F2F7' }]}>
                <item.icon size={20} color={item.iconColor || '#1C1C1E'} />
            </View>
            <View style={styles.menuContent}>
                <Text style={styles.menuLabel}>{item.label}</Text>
                {item.subLabel && <Text style={styles.menuSubLabel}>{item.subLabel}</Text>}
            </View>
            {item.rightContent || <ChevronRight size={18} color="#C7C7CC" />}
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                {/* Immersive Header Section */}
                <View style={styles.heroSection}>
                    <LinearGradient
                        colors={theme.colors}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[styles.heroGradient, { paddingTop: insets.top + 10 }]}
                    >
                        <View style={styles.userInfo}>
                            <View style={styles.avatarMainContainer}>
                                <View style={styles.avatarRing}>
                                    <Image
                                        source={{ uri: currentUserAvatar || theme.avatar }}
                                        style={styles.profileImage}
                                    />
                                </View>
                                <View style={[styles.verifyBadge, { backgroundColor: '#34C759' }]}>
                                    <ShieldCheck size={14} color="#FFFFFF" strokeWidth={3} />
                                </View>
                            </View>
                            <View style={styles.userDetails}>
                                <Text style={styles.userName}>{userName}</Text>
                                <View style={styles.roleTag}>
                                    <Text style={styles.roleTagText}>{roleLabels[role || 'donor'] || theme.label}</Text>
                                </View>
                                <Text style={styles.userBio}>{roleBios[role || 'donor'] || theme.bio}</Text>
                            </View>
                        </View>
                    </LinearGradient>

                    {/* Stats Overlap Card */}
                    <View style={styles.statsRow}>
                        {theme.roleStats.map((stat, idx) => (
                            <View key={idx} style={[styles.statCard, idx === 1 && styles.statCardCenter]}>
                                <View style={[styles.statIconCircle, { backgroundColor: theme.statsColor }]}>
                                    <stat.icon size={18} color={theme.tagColor} />
                                </View>
                                <Text style={styles.statValue}>{stat.value}</Text>
                                <Text style={styles.statLabel}>{stat.label}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Main Content Sections */}
                <View style={styles.contentBody}>

                    <Text style={styles.groupTitle}>ACCOUNT SETTINGS</Text>
                    <View style={styles.menuList}>
                        {renderMenuItem({ icon: User, label: 'Profile Information', subLabel: 'Personalize your identity', bgColor: '#EAF6FF', iconColor: '#007AFF' })}
                        <Divider style={styles.menuDivider} />
                        {renderMenuItem({ icon: CreditCard, label: 'My Wallet', subLabel: 'Manage points & rewards', bgColor: '#F0EFFF', iconColor: '#5856D6' })}
                        <Divider style={styles.menuDivider} />
                        {renderMenuItem({ icon: History, label: 'Contribution History', subLabel: 'Past donations & events', bgColor: '#FFEBEA', iconColor: '#FF3B30' })}
                    </View>

                    <Text style={[styles.groupTitle, { marginTop: 32 }]}>PREFERENCES</Text>
                    <View style={styles.menuList}>
                        {renderMenuItem({ icon: Bell, label: 'Notifications', subLabel: 'Push, email & SMS', bgColor: '#FFF4E5', iconColor: '#FF9500' })}
                        <Divider style={styles.menuDivider} />
                        {renderMenuItem({ icon: Moon, label: 'Appearance', subLabel: 'Dark mode & theme', bgColor: '#F2F2F7', iconColor: '#1C1C1E', rightContent: <Text style={styles.rightValue}>System</Text> })}
                        <Divider style={styles.menuDivider} />

                        {renderMenuItem({ icon: Languages, label: 'Language', subLabel: 'English (US)', bgColor: '#EAFFCF', iconColor: '#34C759' })}
                        <Divider style={styles.menuDivider} />
                        {renderMenuItem({
                            icon: Activity,
                            label: 'Sync Database',
                            subLabel: 'Force cloud synchronization',
                            bgColor: '#E0F7FA',
                            iconColor: '#00BCD4',
                            onPress: async () => {
                                try {
                                    await sync();
                                    Alert.alert('Success', 'Database synced with cloud.');
                                } catch (e) {
                                    Alert.alert('Error', 'Sync failed. Check console.');
                                }
                            }
                        })}
                    </View>

                    <Text style={[styles.groupTitle, { marginTop: 32 }]}>SUPPORT & SAFETY</Text>
                    <View style={styles.menuList}>
                        {renderMenuItem({ icon: MessageCircle, label: 'Contact Support', subLabel: 'We are here to help', bgColor: '#EAF6FF', iconColor: '#007AFF' })}
                        <Divider style={styles.menuDivider} />
                        {renderMenuItem({ icon: Shield, label: 'Privacy Policy', subLabel: 'Data security & terms', bgColor: '#F2F2F7', iconColor: '#8E8E93' })}
                    </View>

                    <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
                        <LinearGradient
                            colors={['#FFEBEA', '#FFF0F0']}
                            style={styles.logoutGradient}
                        >
                            <LogOut size={20} color="#FF3B30" />
                            <Text style={styles.logoutText}>Log Out</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    <Text style={styles.versionText}>BLOODCONNECT PREMIUM • V1.5.0</Text>
                </View>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FB',
    },
    scrollContent: {
        paddingBottom: 40,
    },
    heroSection: {
        marginBottom: 65,
    },
    heroGradient: {
        height: 280,
        paddingHorizontal: 24,
        borderBottomLeftRadius: 40,
        borderBottomRightRadius: 40,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 20,
        gap: 20,
    },
    userDetails: {
        alignItems: 'flex-start',
    },
    avatarMainContainer: {
        position: 'relative',
    },
    avatarRing: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 5,
    },
    profileImage: {
        width: 90,
        height: 90,
        borderRadius: 45,
        borderWidth: 3,
        borderColor: '#FFFFFF',
    },
    verifyBadge: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 30,
        height: 30,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    userName: {
        fontSize: 26,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: -0.5,
    },
    roleTag: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        marginTop: 6,
        alignSelf: 'flex-start',
    },
    roleTagText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '800',
        textTransform: 'uppercase',
    },
    userBio: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 13,
        fontWeight: '600',
        marginTop: 8,
        textAlign: 'left',
    },
    statsRow: {
        position: 'absolute',
        bottom: -45,
        left: 24,
        right: 24,
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderRadius: 32,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 15 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
    },
    statCard: {
        flex: 1,
        alignItems: 'center',
    },
    statCardCenter: {
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: '#F2F2F7',
    },
    statIconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    statValue: {
        fontSize: 18,
        fontWeight: '900',
        color: '#1C1C1E',
    },
    statLabel: {
        fontSize: 11,
        color: '#8E8E93',
        fontWeight: '700',
        textTransform: 'uppercase',
        marginTop: 2,
    },
    contentBody: {
        paddingHorizontal: 24,
    },
    groupTitle: {
        fontSize: 13,
        fontWeight: '800',
        color: '#8E8E93',
        letterSpacing: 1.5,
        marginBottom: 16,
        marginLeft: 4,
    },
    menuList: {
        backgroundColor: '#FFFFFF',
        borderRadius: 28,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.02,
        shadowRadius: 10,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 18,
        gap: 16,
    },
    menuIconBox: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    menuContent: {
        flex: 1,
    },
    menuLabel: {
        fontSize: 17,
        fontWeight: '700',
        color: '#1C1C1E',
    },
    menuSubLabel: {
        fontSize: 13,
        color: '#8E8E93',
        fontWeight: '600',
        marginTop: 2,
    },
    menuDivider: {
        height: 1,
        backgroundColor: '#F2F2F7',
        marginHorizontal: 20,
    },
    rightValue: {
        color: '#8E8E93',
        fontSize: 15,
        fontWeight: '600',
    },
    logoutBtn: {
        marginTop: 48,
        borderRadius: 24,
        overflow: 'hidden',
    },
    logoutGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 64,
        gap: 12,
    },
    logoutText: {
        color: '#FF3B30',
        fontSize: 18,
        fontWeight: '800',
    },
    versionText: {
        textAlign: 'center',
        marginTop: 40,
        color: '#C7C7CC',
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 2,
    }
});
