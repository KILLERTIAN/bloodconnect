import { useAuth } from '@/context/AuthContext';
import { useDialog } from '@/context/DialogContext';
import { registerUser } from '@/lib/auth.service';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
    ArrowRight,
    ChevronLeft,
    Droplet,
    Eye,
    EyeOff,
    Heart,
    Lock,
    Mail,
    Phone,
    User
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
    ActivityIndicator,
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

export default function RegisterScreen() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [role, setRole] = useState<'donor' | 'volunteer'>('donor');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { showDialog } = useDialog();
    const { login } = useAuth();

    const handleRegister = async () => {
        if (!name || !email || !password) {
            showDialog('Required Fields', 'Please fill in Name, Email and Password.', 'warning');
            return;
        }

        if (password !== confirmPassword) {
            showDialog('Password Mismatch', 'Passwords do not match.', 'error');
            return;
        }

        if (password.length < 6) {
            showDialog('Weak Password', 'Password should be at least 6 characters.', 'warning');
            return;
        }

        setLoading(true);
        try {
            const newUser = await registerUser({
                name,
                email,
                phone,
                password,
                role
            });

            // Auto-login
            login(newUser.role as any, {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                phone: newUser.phone || '',
                role: newUser.role as any,
                avatar_url: newUser.avatar_url,
            });

            router.replace('/(tabs)/home');
        } catch (e: any) {
            showDialog('Registration Failed', e.message || 'Something went wrong.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>

                {/* Header with Back Button */}
                <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <ChevronLeft size={24} color="#1C1C1E" strokeWidth={2.5} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Create Account</Text>
                    <View style={{ width: 44 }} />
                </View>

                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.introSection}>
                        <Text style={styles.introTitle}>Join the Community</Text>
                        <Text style={styles.introSub}>Sign up to start saving lives today</Text>
                    </View>

                    {/* Role Selection */}
                    <View style={styles.roleContainer}>
                        <TouchableOpacity
                            style={[styles.roleBtn, role === 'donor' && styles.roleBtnActiveDonor]}
                            onPress={() => setRole('donor')}
                        >
                            <Droplet size={20} color={role === 'donor' ? '#FFFFFF' : '#8E8E93'} fill={role === 'donor' ? '#FFFFFF' : 'none'} />
                            <Text style={[styles.roleBtnText, role === 'donor' && styles.roleBtnTextActive]}>Donor</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.roleBtn, role === 'volunteer' && styles.roleBtnActiveVolunteer]}
                            onPress={() => setRole('volunteer')}
                        >
                            <Heart size={20} color={role === 'volunteer' ? '#FFFFFF' : '#8E8E93'} fill={role === 'volunteer' ? '#FFFFFF' : 'none'} />
                            <Text style={[styles.roleBtnText, role === 'volunteer' && styles.roleBtnTextActive]}>Volunteer</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.formCard}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Full Name *</Text>
                            <View style={styles.inputWrapper}>
                                <User size={18} color="#8E8E93" />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Full Name"
                                    placeholderTextColor="#8E8E93"
                                    value={name}
                                    onChangeText={setName}
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Email Address *</Text>
                            <View style={styles.inputWrapper}>
                                <Mail size={18} color="#8E8E93" />
                                <TextInput
                                    style={styles.input}
                                    placeholder="your@email.com"
                                    placeholderTextColor="#8E8E93"
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Phone Number</Text>
                            <View style={styles.inputWrapper}>
                                <Phone size={18} color="#8E8E93" />
                                <TextInput
                                    style={styles.input}
                                    placeholder="+91 00000 00000"
                                    placeholderTextColor="#8E8E93"
                                    value={phone}
                                    onChangeText={setPhone}
                                    keyboardType="phone-pad"
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Password *</Text>
                            <View style={styles.inputWrapper}>
                                <Lock size={18} color="#8E8E93" />
                                <TextInput
                                    style={styles.input}
                                    placeholder="At least 6 characters"
                                    placeholderTextColor="#8E8E93"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPassword}
                                />
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                    {showPassword ? <EyeOff size={18} color="#8E8E93" /> : <Eye size={18} color="#8E8E93" />}
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Confirm Password *</Text>
                            <View style={styles.inputWrapper}>
                                <Lock size={18} color="#8E8E93" />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Re-enter password"
                                    placeholderTextColor="#8E8E93"
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    secureTextEntry={!showPassword}
                                />
                            </View>
                        </View>

                        <TouchableOpacity
                            onPress={handleRegister}
                            disabled={loading}
                            activeOpacity={0.9}
                            style={styles.registerBtnContainer}
                        >
                            <LinearGradient
                                colors={['#FF3B30', '#FF2D55']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.registerBtnGradient}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#FFFFFF" size="small" />
                                ) : (
                                    <View style={styles.btnContent}>
                                        <Text style={styles.btnText}>Register Now</Text>
                                        <ArrowRight size={18} color="#FFFFFF" strokeWidth={3} />
                                    </View>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={styles.footerLink}
                        onPress={() => router.replace('/login')}
                    >
                        <Text style={styles.footerText}>
                            Already have an account? <Text style={styles.footerTextBold}>Login</Text>
                        </Text>
                    </TouchableOpacity>

                    <View style={{ height: insets.bottom + 40 }} />
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FB' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        backgroundColor: '#FFFFFF',
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F2F2F7'
    },
    backBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#F2F2F7', justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#1C1C1E' },
    scrollContent: { paddingHorizontal: 24, paddingTop: 24 },
    introSection: { marginBottom: 28 },
    introTitle: { fontSize: 28, fontWeight: '900', color: '#1C1C1E', letterSpacing: -0.5 },
    introSub: { fontSize: 14, color: '#8E8E93', fontWeight: '600', marginTop: 6 },
    roleContainer: { flexDirection: 'row', gap: 12, marginBottom: 24 },
    roleBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: 52,
        borderRadius: 16,
        backgroundColor: '#FFFFFF',
        borderWidth: 1.5,
        borderColor: '#F2F2F7'
    },
    roleBtnActiveDonor: { backgroundColor: '#FF3B30', borderColor: '#FF3B30' },
    roleBtnActiveVolunteer: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
    roleBtnText: { fontSize: 15, fontWeight: '700', color: '#8E8E93' },
    roleBtnTextActive: { color: '#FFFFFF' },
    formCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 28,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.04,
        shadowRadius: 20
    },
    inputGroup: { marginBottom: 16 },
    inputLabel: { fontSize: 13, fontWeight: '800', color: '#1C1C1E', marginBottom: 8 },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: '#F2F2F7',
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 52
    },
    input: { flex: 1, fontSize: 15, color: '#1C1C1E', fontWeight: '600' },
    registerBtnContainer: { marginTop: 12 },
    registerBtnGradient: {
        height: 56,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    btnContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    btnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
    footerLink: { marginTop: 24, alignItems: 'center' },
    footerText: { fontSize: 14, color: '#8E8E93', fontWeight: '500' },
    footerTextBold: { color: '#FF3B30', fontWeight: '800' },
});
