import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

const TURSO_URL = process.env.EXPO_PUBLIC_TURSO_DB_URL!;
const TURSO_TOKEN = process.env.EXPO_PUBLIC_TURSO_DB_AUTH_TOKEN!;

let db: SQLite.SQLiteDatabase | null = null;

async function getDB() {
    if (!db) {
        // Open database with LibSQL support (sync)
        // Note: The options 'url' and 'authToken' are detected by the native module when useLibSQL is enabled
        db = await SQLite.openDatabaseAsync('bloodconnect.db', {
            header: {
                'libsql-url': TURSO_URL,
                'libsql-auth-token': TURSO_TOKEN
            }
        } as any);

        if (Platform.OS !== 'web' && TURSO_URL) {
            try {
                // @ts-ignore
                if (db.sync) {
                    // @ts-ignore
                    await db.sync();
                    console.log("✅ Initial Sync Complete");
                }
            } catch (e) {
                console.log("⚠️ Sync Warning:", e);
            }
        }
    }
    return db;
}

export async function query(sql: string, args: any[] = []) {
    const database = await getDB();
    try {
        if (sql.trim().toUpperCase().startsWith('SELECT')) {
            const rows = await database.getAllAsync(sql, args);
            return {
                rows: rows,
                rowsAffected: 0,
                lastInsertRowid: undefined
            };
        } else {
            const result = await database.runAsync(sql, args);
            return {
                rows: [],
                rowsAffected: result.changes,
                lastInsertRowid: result.lastInsertRowId
            };
        }
    } catch (e) {
        console.error("Query Error:", sql, e);
        throw e;
    }
}

export async function execute(sql: string, args: any[] = []) {
    return query(sql, args);
}

export async function batch(statements: { sql: string; args?: any[] }[]) {
    const database = await getDB();
    try {
        await database.withTransactionAsync(async () => {
            for (const stmt of statements) {
                await database.runAsync(stmt.sql, stmt.args || []);
            }
        });
    } catch (e) {
        console.error("Batch Error:", e);
        throw e;
    }
}

export async function sync() {
    if (Platform.OS === 'web') return;
    const database = await getDB();
    try {
        // @ts-ignore
        if (database.sync) {
            // @ts-ignore
            await database.sync();
            console.log("✅ Database Synced");
        }
    } catch (e) {
        console.error("❌ Sync Failed:", e);
    }
}
