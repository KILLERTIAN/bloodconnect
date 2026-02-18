import { useAuth } from '@/context/AuthContext';
import { loginUser } from '@/lib/auth.service';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
    ArrowRight,
    Building2,
    Droplet,
    Eye,
    EyeOff,
    Heart,
    Lock,
    Mail,
    Phone,
    Radio,
    ShieldCheck,
    User,
    Zap
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const STAFF_ROLES = [
    { role: 'Admin', email: 'admin@bloodconnect.org', pass: 'admin123', color: '#FF3B30', icon: ShieldCheck },
    { role: 'Manager', email: 'manager@bloodconnect.org', pass: 'manager123', color: '#007AFF', icon: Building2 },
    { role: 'HR', email: 'hr@bloodconnect.org', pass: 'hr123', color: '#5856D6', icon: User },
    { role: 'Outreach', email: 'outreach@bloodconnect.org', pass: 'outreach123', color: '#FF9500', icon: Radio },
    { role: 'Volunteer', email: 'volunteer@bloodconnect.org', pass: 'volunteer123', color: '#34C759', icon: Heart },
    { role: 'Helpline', email: 'helpline@bloodconnect.org', pass: 'helpline123', color: '#FF2D55', icon: Phone },
];

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'staff' | 'donor'>('staff');
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { login } = useAuth();

    const handleLogin = async () => {
        if (!email.trim() || !password.trim()) {
            Alert.alert('Missing Fields', 'Please enter your email and password.');
            return;
        }
        setLoading(true);
        try {
            const user = await loginUser(email.trim(), password.trim());
            if (!user) {
                Alert.alert('Login Failed', 'Invalid email or password. Please try again.');
                return;
            }
            login(user.role as any, {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone || '',
                role: user.role as any,
            });
            router.replace('/(tabs)/home');
        } catch (e: any) {
            Alert.alert('Connection Error', 'Unable to connect. Please check your internet connection.');
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleDonorLogin = () => {
        // Donor login — uses role-selection flow
        login('donor', {
            id: 0,
            name: 'Guest Donor',
            email: 'donor@bloodconnect.org',
            phone: '',
            role: 'donor',
        });
        router.replace('/(tabs)/home');
    };

    const quickLogin = (emailVal: string, passVal: string) => {
        setEmail(emailVal);
        setPassword(passVal);
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView
                    contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16 }]}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* ── Logo ── */}
                    <View style={styles.logoSection}>
                        <LinearGradient colors={['#FF3B30', '#FF2D55']} style={styles.logoCircle}>
                            <Droplet size={36} color="#FFFFFF" fill="#FFFFFF" strokeWidth={1.5} />
                        </LinearGradient>
                        <Text style={styles.appName}>BloodConnect</Text>
                        <Text style={styles.appTagline}>Saving Lives Together</Text>
                    </View>

                    {/* ── Tab Switcher ── */}
                    <View style={styles.tabSwitcher}>
                        <TouchableOpacity
                            style={[styles.tabBtn, activeTab === 'staff' && styles.tabBtnActive]}
                            onPress={() => setActiveTab('staff')}
                            activeOpacity={0.8}
                        >
                            <ShieldCheck size={16} color={activeTab === 'staff' ? '#FFFFFF' : '#8E8E93'} />
                            <Text style={[styles.tabBtnText, activeTab === 'staff' && styles.tabBtnTextActive]}>
                                Staff Login
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tabBtn, activeTab === 'donor' && styles.tabBtnActiveDonor]}
                            onPress={() => setActiveTab('donor')}
                            activeOpacity={0.8}
                        >
                            <Droplet size={16} color={activeTab === 'donor' ? '#FFFFFF' : '#8E8E93'} />
                            <Text style={[styles.tabBtnText, activeTab === 'donor' && styles.tabBtnTextActive]}>
                                Donor Portal
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {activeTab === 'staff' ? (
                        <>
                            {/* ── Staff Login Form ── */}
                            <View style={styles.formCard}>
                                <Text style={styles.formTitle}>Welcome Back</Text>
                                <Text style={styles.formSubtitle}>Sign in to your operations dashboard</Text>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>Email Address</Text>
                                    <View style={styles.inputWrapper}>
                                        <Mail size={18} color="#8E8E93" />
                                        <TextInput
                                            style={styles.input}
                                            placeholder="your@bloodconnect.org"
                                            placeholderTextColor="#C7C7CC"
                                            value={email}
                                            onChangeText={setEmail}
                                            keyboardType="email-address"
                                            autoCapitalize="none"
                                            autoCorrect={false}
                                        />
                                    </View>
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>Password</Text>
                                    <View style={styles.inputWrapper}>
                                        <Lock size={18} color="#8E8E93" />
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Enter your password"
                                            placeholderTextColor="#C7C7CC"
                                            value={password}
                                            onChangeText={setPassword}
                                            secureTextEntry={!showPassword}
                                            autoCapitalize="none"
                                        />
                                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                            {showPassword
                                                ? <EyeOff size={18} color="#8E8E93" />
                                                : <Eye size={18} color="#8E8E93" />
                                            }
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <TouchableOpacity
                                    onPress={handleLogin}
                                    disabled={loading}
                                    activeOpacity={0.9}
                                    style={styles.loginBtnContainer}
                                >
                                    <LinearGradient
                                        colors={['#FF3B30', '#FF2D55']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.loginBtnGradient}
                                    >
                                        {loading ? (
                                            <ActivityIndicator color="#FFFFFF" size="small" />
                                        ) : (
                                            <View style={styles.loginBtnContent}>
                                                <Text style={styles.loginBtnText}>Sign In</Text>
                                                <ArrowRight size={18} color="#FFFFFF" strokeWidth={3} />
                                            </View>
                                        )}
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>

                            {/* ── Quick Access (Dev) ── */}
                            <View style={styles.quickSection}>
                                <View style={styles.quickTitleContainer}>
                                    <Zap size={14} color="#8E8E93" fill="#8E8E93" />
                                    <Text style={styles.quickTitle}>QUICK ACCESS (DEV)</Text>
                                </View>
                                <View style={styles.quickGrid}>
                                    {STAFF_ROLES.map((q) => (
                                        <TouchableOpacity
                                            key={q.role}
                                            style={[styles.quickBtn, { borderColor: q.color }]}
                                            onPress={() => quickLogin(q.email, q.pass)}
                                            activeOpacity={0.7}
                                        >
                                            <q.icon size={16} color={q.color} />
                                            <Text style={[styles.quickBtnText, { color: q.color }]}>{q.role}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        </>
                    ) : (
                        /* ── Donor Portal ── */
                        <View style={styles.donorCard}>
                            <LinearGradient
                                colors={['#FF3B30', '#FF2D55']}
                                style={styles.donorHero}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                <View style={styles.donorIconRow}>
                                    <View style={styles.donorIconCircle}>
                                        <Droplet size={32} color="#FF3B30" fill="#FF3B30" />
                                    </View>
                                </View>
                                <Text style={styles.donorHeroTitle}>Be a Hero</Text>
                                <Text style={styles.donorHeroSub}>
                                    Every donation saves up to 3 lives.{'\n'}Join thousands of donors today.
                                </Text>
                            </LinearGradient>

                            <View style={styles.donorBody}>
                                <View style={styles.donorStatRow}>
                                    {[
                                        { value: '10K+', label: 'Donors' },
                                        { value: '500+', label: 'Camps' },
                                        { value: '30K+', label: 'Lives Saved' },
                                    ].map(s => (
                                        <View key={s.label} style={styles.donorStat}>
                                            <Text style={styles.donorStatValue}>{s.value}</Text>
                                            <Text style={styles.donorStatLabel}>{s.label}</Text>
                                        </View>
                                    ))}
                                </View>

                                <TouchableOpacity
                                    style={styles.donorLoginBtn}
                                    onPress={handleDonorLogin}
                                    activeOpacity={0.85}
                                >
                                    <LinearGradient
                                        colors={['#FF3B30', '#FF2D55']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.donorLoginGradient}
                                    >
                                        <Droplet size={20} color="#FFFFFF" fill="#FFFFFF" />
                                        <Text style={styles.donorLoginText}>Enter as Donor</Text>
                                    </LinearGradient>
                                </TouchableOpacity>

                                <Text style={styles.donorNote}>
                                    No account needed · View nearby camps · Track your donations
                                </Text>
                            </View>
                        </View>
                    )}

                    <View style={{ height: insets.bottom + 20 }} />
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FB' },
    scrollContent: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 20 },

    // Logo
    logoSection: { alignItems: 'center', marginBottom: 28 },
    logoCircle: {
        width: 80, height: 80, borderRadius: 28,
        justifyContent: 'center', alignItems: 'center',
        marginBottom: 14,
        shadowColor: '#FF3B30', shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35, shadowRadius: 20, elevation: 10,
    },
    appName: { fontSize: 30, fontWeight: '900', color: '#1C1C1E', letterSpacing: -1 },
    appTagline: { fontSize: 14, color: '#8E8E93', fontWeight: '600', marginTop: 4 },

    // Tab Switcher
    tabSwitcher: {
        flexDirection: 'row',
        backgroundColor: '#F2F2F7',
        borderRadius: 16,
        padding: 4,
        marginBottom: 20,
    },
    tabBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        borderRadius: 12,
    },
    tabBtnActive: { backgroundColor: '#1C1C1E' },
    tabBtnActiveDonor: { backgroundColor: '#FF3B30' },
    tabBtnText: { fontSize: 14, fontWeight: '700', color: '#8E8E93' },
    tabBtnTextActive: { color: '#FFFFFF' },

    // Form Card
    formCard: {
        backgroundColor: '#FFFFFF', borderRadius: 28, padding: 24,
        shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.06, shadowRadius: 20, elevation: 4,
        marginBottom: 20,
    },
    formTitle: { fontSize: 22, fontWeight: '900', color: '#1C1C1E', letterSpacing: -0.5 },
    formSubtitle: { fontSize: 13, color: '#8E8E93', fontWeight: '600', marginTop: 4, marginBottom: 22 },
    inputGroup: { marginBottom: 14 },
    inputLabel: { fontSize: 13, fontWeight: '700', color: '#3C3C43', marginBottom: 8, letterSpacing: 0.3 },
    inputWrapper: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: '#F2F2F7', borderRadius: 16, paddingHorizontal: 16, height: 52,
    },
    input: { flex: 1, fontSize: 16, color: '#1C1C1E', fontWeight: '500' },
    loginBtnContainer: { marginTop: 8 },
    loginBtnGradient: {
        height: 54, borderRadius: 18,
        justifyContent: 'center', alignItems: 'center',
        shadowColor: '#FF3B30', shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3, shadowRadius: 15, elevation: 8,
    },
    loginBtnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },

    // Quick Access
    quickSection: { marginBottom: 8 },
    quickTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginBottom: 12,
    },
    quickTitle: { fontSize: 11, fontWeight: '800', color: '#8E8E93', letterSpacing: 1.5, textAlign: 'center' },
    loginBtnContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
    quickBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 14, paddingVertical: 9,
        borderRadius: 14, borderWidth: 1.5,
        backgroundColor: '#FFFFFF',
    },
    quickBtnEmoji: { fontSize: 14 },
    quickBtnText: { fontSize: 13, fontWeight: '700' },

    // Donor Card
    donorCard: {
        backgroundColor: '#FFFFFF', borderRadius: 28, overflow: 'hidden',
        shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08, shadowRadius: 24, elevation: 6,
        marginBottom: 20,
    },
    donorHero: { padding: 32, alignItems: 'center' },
    donorIconRow: { marginBottom: 16 },
    donorIconCircle: {
        width: 72, height: 72, borderRadius: 36,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center', alignItems: 'center',
        shadowColor: '#FF3B30', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2, shadowRadius: 12, elevation: 6,
    },
    donorHeroTitle: { fontSize: 28, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.5 },
    donorHeroSub: { fontSize: 14, color: 'rgba(255,255,255,0.85)', fontWeight: '600', marginTop: 8, textAlign: 'center', lineHeight: 22 },
    donorBody: { padding: 24 },
    donorStatRow: { flexDirection: 'row', marginBottom: 24 },
    donorStat: { flex: 1, alignItems: 'center' },
    donorStatValue: { fontSize: 22, fontWeight: '900', color: '#FF3B30' },
    donorStatLabel: { fontSize: 12, color: '#8E8E93', fontWeight: '600', marginTop: 2 },
    donorLoginBtn: { marginBottom: 14 },
    donorLoginGradient: {
        height: 54, borderRadius: 18,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
        shadowColor: '#FF3B30', shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3, shadowRadius: 15, elevation: 8,
    },
    donorLoginText: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
    donorNote: { fontSize: 12, color: '#8E8E93', fontWeight: '600', textAlign: 'center', lineHeight: 18 },
});
