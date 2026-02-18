import { type SQLiteDatabase } from 'expo-sqlite';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { getDB, migrateDbIfNeeded } from './database';

const DatabaseContext = createContext<SQLiteDatabase | null>(null);

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
    const [db, setDb] = useState<SQLiteDatabase | null>(null);
    const [error, setError] = useState<any>(null);

    useEffect(() => {
        let mounted = true;
        async function init() {
            try {
                const database = await getDB();
                if (mounted) {
                    await migrateDbIfNeeded(database);
                    setDb(database);
                }
            } catch (e: any) {
                console.error('Database init failed:', e);
                if (mounted) setError(e);
            }
        }
        init();

        return () => { mounted = false; };
    }, []);

    if (error) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                <Text style={{ color: 'red', fontSize: 16, marginBottom: 10 }}>Database Error</Text>
                <Text>{error?.message || String(error)}</Text>
            </View>
        );
    }

    if (!db) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#E63946" />
            </View>
        );
    }

    return (
        <DatabaseContext.Provider value={db}>
            {children}
        </DatabaseContext.Provider>
    );
}

export function useDatabase() {
    const context = useContext(DatabaseContext);
    if (!context) {
        throw new Error('useDatabase must be used within a DatabaseProvider');
    }
    return context;
}
