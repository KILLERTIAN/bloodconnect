import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

export type UserRole = 'donor' | 'volunteer' | 'admin' | 'helpline' | 'manager' | 'hr' | 'outreach' | null;

export interface AuthUser {
    id: number;
    name: string;
    email: string;
    phone: string;
    role: UserRole;
    avatar_url?: string;
}

interface AuthContextType {
    role: UserRole;
    user: AuthUser | null;
    isLoggedIn: boolean;
    isOnboarded: boolean;
    isLoading: boolean;
    login: (role: UserRole, user?: AuthUser) => void;
    logout: () => void;
    completeOnboarding: () => void;
    updateAuthUser: (data: Partial<AuthUser>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'bloodconnect_auth_state';
const ONBOARDING_KEY = 'bloodconnect_onboarding_completed';

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [role, setRole] = useState<UserRole>(null);
    const [user, setUser] = useState<AuthUser | null>(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isOnboarded, setIsOnboarded] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Load persist state
        const loadPersistedState = async () => {
            try {
                const [authState, onboardingState] = await Promise.all([
                    AsyncStorage.getItem(AUTH_STORAGE_KEY),
                    AsyncStorage.getItem(ONBOARDING_KEY)
                ]);

                if (authState) {
                    const parsed = JSON.parse(authState);
                    setRole(parsed.role);
                    setUser(parsed.user);
                    setIsLoggedIn(true);
                }

                if (onboardingState === 'true') {
                    setIsOnboarded(true);
                }
            } catch (error) {
                console.error('Failed to load auth state:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadPersistedState();
    }, []);

    const login = async (selectedRole: UserRole, userData?: AuthUser) => {
        const authData = { role: selectedRole, user: userData || null };
        setRole(selectedRole);
        setUser(userData || null);
        setIsLoggedIn(true);

        try {
            await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));
        } catch (error) {
            console.error('Failed to save auth state:', error);
        }
    };

    const logout = async () => {
        setRole(null);
        setUser(null);
        setIsLoggedIn(false);
        try {
            await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
        } catch (error) {
            console.error('Failed to clear auth state:', error);
        }
    };

    const completeOnboarding = async () => {
        setIsOnboarded(true);
        try {
            await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
        } catch (error) {
            console.error('Failed to save onboarding state:', error);
        }
    };

    const updateAuthUser = async (data: Partial<AuthUser>) => {
        const newUser = user ? { ...user, ...data } : null;
        setUser(newUser);
        if (newUser) {
            try {
                await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ role, user: newUser }));
            } catch (error) {
                console.error('Failed to update persisted user:', error);
            }
        }
    };

    return (
        <AuthContext.Provider value={{
            role,
            user,
            isLoggedIn,
            isOnboarded,
            isLoading,
            login,
            logout,
            completeOnboarding,
            updateAuthUser
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
