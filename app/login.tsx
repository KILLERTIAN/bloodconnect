import { useAuth } from '@/context/AuthContext';
import { loginUser } from '@/lib/auth.service';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Eye, EyeOff, Lock, Mail, ShieldCheck } from 'lucide-react-native';
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
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ROLE_COLORS: Record<string, string> = {
    admin: '#FF3B30',
    manager: '#007AFF',
    hr: '#5856D6',
    outreach: '#FF9500',
    volunteer: '#34C759',
    helpline: '#FF2D55',
};

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
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

    const quickLogin = (emailVal: string, passVal: string) => {
        setEmail(emailVal);
        setPassword(passVal);
    };

    const QUICK_LOGINS = [
        { role: 'Admin', email: 'admin@bloodconnect.org', pass: 'admin123', color: '#FF3B30' },
        { role: 'Manager', email: 'manager@bloodconnect.org', pass: 'manager123', color: '#007AFF' },
        { role: 'HR', email: 'hr@bloodconnect.org', pass: 'hr123', color: '#5856D6' },
        { role: 'Outreach', email: 'outreach@bloodconnect.org', pass: 'outreach123', color: '#FF9500' },
        { role: 'Volunteer', email: 'volunteer@bloodconnect.org', pass: 'volunteer123', color: '#34C759' },
        { role: 'Helpline', email: 'helpline@bloodconnect.org', pass: 'helpline123', color: '#FF2D55' },
    ];

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView
                    contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20 }]}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Logo */}
                    <View style={styles.logoSection}>
                        <LinearGradient colors={['#FF3B30', '#FF2D55']} style={styles.logoCircle}>
                            <ShieldCheck size={36} color="#FFFFFF" strokeWidth={2.5} />
                        </LinearGradient>
                        <Text style={styles.appName}>BloodConnect</Text>
                        <Text style={styles.appTagline}>Internal Operations Platform</Text>
                    </View>

                    {/* Form */}
                    <View style={styles.formCard}>
                        <Text style={styles.formTitle}>Sign In</Text>
                        <Text style={styles.formSubtitle}>Access your role-based dashboard</Text>

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
                                    <Text style={styles.loginBtnText}>Sign In</Text>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>

                    {/* Quick Login (Dev Helper) */}
                    <View style={styles.quickSection}>
                        <Text style={styles.quickTitle}>Quick Access (Dev)</Text>
                        <View style={styles.quickGrid}>
                            {QUICK_LOGINS.map((q) => (
                                <TouchableOpacity
                                    key={q.role}
                                    style={[styles.quickBtn, { borderColor: q.color }]}
                                    onPress={() => quickLogin(q.email, q.pass)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[styles.quickBtnText, { color: q.color }]}>{q.role}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FB' },
    scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },
    logoSection: { alignItems: 'center', marginBottom: 32 },
    logoCircle: {
        width: 80, height: 80, borderRadius: 28,
        justifyContent: 'center', alignItems: 'center',
        marginBottom: 16,
        shadowColor: '#FF3B30', shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3, shadowRadius: 20, elevation: 10,
    },
    appName: { fontSize: 32, fontWeight: '900', color: '#1C1C1E', letterSpacing: -1 },
    appTagline: { fontSize: 14, color: '#8E8E93', fontWeight: '600', marginTop: 4 },
    formCard: {
        backgroundColor: '#FFFFFF', borderRadius: 28, padding: 24,
        shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.06, shadowRadius: 20, elevation: 4,
        marginBottom: 24,
    },
    formTitle: { fontSize: 24, fontWeight: '900', color: '#1C1C1E', letterSpacing: -0.5 },
    formSubtitle: { fontSize: 14, color: '#8E8E93', fontWeight: '600', marginTop: 4, marginBottom: 24 },
    inputGroup: { marginBottom: 16 },
    inputLabel: { fontSize: 13, fontWeight: '700', color: '#3C3C43', marginBottom: 8, letterSpacing: 0.3 },
    inputWrapper: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: '#F2F2F7', borderRadius: 16, paddingHorizontal: 16, height: 52,
    },
    input: { flex: 1, fontSize: 16, color: '#1C1C1E', fontWeight: '500' },
    loginBtnContainer: { marginTop: 8 },
    loginBtnGradient: {
        height: 56, borderRadius: 18,
        justifyContent: 'center', alignItems: 'center',
        shadowColor: '#FF3B30', shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25, shadowRadius: 15, elevation: 8,
    },
    loginBtnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
    quickSection: { marginTop: 8 },
    quickTitle: { fontSize: 12, fontWeight: '700', color: '#8E8E93', letterSpacing: 1, marginBottom: 12, textAlign: 'center' },
    quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
    quickBtn: {
        paddingHorizontal: 16, paddingVertical: 8,
        borderRadius: 12, borderWidth: 1.5,
        backgroundColor: '#FFFFFF',
    },
    quickBtnText: { fontSize: 13, fontWeight: '700' },
});
