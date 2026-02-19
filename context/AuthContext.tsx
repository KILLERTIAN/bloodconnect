import React, { createContext, useContext, useState } from 'react';

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
    login: (role: UserRole, user?: AuthUser) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [role, setRole] = useState<UserRole>(null);
    const [user, setUser] = useState<AuthUser | null>(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    const login = (selectedRole: UserRole, userData?: AuthUser) => {
        setRole(selectedRole);
        setUser(userData || null);
        setIsLoggedIn(true);
    };

    const logout = () => {
        setRole(null);
        setUser(null);
        setIsLoggedIn(false);
    };

    return (
        <AuthContext.Provider value={{ role, user, isLoggedIn, login, logout }}>
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
