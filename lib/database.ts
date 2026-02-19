import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import { initializeSchema, seedDefaultUsers, seedExperience, seedInitialData } from './schema';

const LOCAL_DB_NAME = 'bloodconnect.db';

export const TURSO_URL = process.env.EXPO_PUBLIC_TURSO_DB_URL;
export const TURSO_TOKEN = process.env.EXPO_PUBLIC_TURSO_DB_AUTH_TOKEN;

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDB() {
    if (dbInstance) return dbInstance;

    const openOptions = {
        useNewConnection: true,
        // If Turso config is active or if we are in a build that expects LibSQL (implied by the error),
        // we must provide libSQLOptions. If env vars are missing (e.g. production build without secrets),
        // providing placeholders prevents a native crash ("libSQLUrl must be provided").
        // Sync will simple fail, but the app will open in offline mode.
        libSQLOptions: {
            url: TURSO_URL || 'http://127.0.0.1:8080', // Placeholder to satisfy native requirement
            authToken: TURSO_TOKEN || 'placeholder-token'
        }
    };

    try {
        dbInstance = await SQLite.openDatabaseAsync(LOCAL_DB_NAME, openOptions);
    } catch (error: any) {
        console.error('🚨 Failed to open/initialize DB:', error);

        // If DB is corrupted/malformed, delete and recreate
        if (
            error?.message?.includes('malformed') ||
            error?.message?.includes('corrupt') ||
            error?.message?.includes('not a database') ||
            error?.message?.includes('Construct') // specific to React Native native error
        ) {
            console.log('♻️ Database corrupted. Initiating Hard Reset...');
            try {
                await SQLite.deleteDatabaseAsync(LOCAL_DB_NAME);
                console.log('✅ Corrupted DB deleted. Re-initializing...');
                // Try one more time with a fresh file
                dbInstance = await SQLite.openDatabaseAsync(LOCAL_DB_NAME, openOptions);
            } catch (recoveryError) {
                console.error('❌ CRITICAL: Failed to recover database:', recoveryError);
                throw recoveryError;
            }
        } else {
            throw error;
        }
    }

    console.log('🔌 DB Connection initialized (Singleton). Turso Configured:', !!(TURSO_URL && TURSO_TOKEN));
    return dbInstance;
}

export async function migrateDbIfNeeded(db: SQLite.SQLiteDatabase) {
    try {
        // Attempt pre-migration sync to pull latest schema/data from Turso
        // This prevents "conflict" errors where local schema creation generates a divergent history from the server
        if (TURSO_URL && TURSO_TOKEN) {
            console.log('⚡️ Attempting pre-migration sync to pull remote data...');
            try {
                await syncDatabase(db);
                console.log('✅ Pre-migration sync complete.');
            } catch (syncErr) {
                console.log('⚠️ Pre-migration sync failed (likely offline or first run fallback):', syncErr);
            }
        }

        console.log('Checking migrations...');

        // Check if tables actually exist (in case version is set but tables are missing)
        const tableCheck = await db.getAllAsync<{ name: string }>(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='events'"
        );
        const hasEventsTable = tableCheck.length > 0;

        // Check for avatar_url column in users table
        const userColumns = await db.getAllAsync<{ name: string }>("PRAGMA table_info(users)");
        const hasAvatarUrl = userColumns.some(col => col.name === 'avatar_url');

        // Check version
        const result = await db.getAllAsync<{ user_version: number }>('PRAGMA user_version');
        const currentVersion = result[0]?.user_version || 0;

        console.log(`Current DB version: ${currentVersion}, Has events table: ${hasEventsTable}, Has avatar_url: ${hasAvatarUrl}`);

        if (currentVersion < 1 || !hasEventsTable) {
            console.log('Applying initial schema...');
            await initializeSchema(db);
            await db.execAsync('PRAGMA user_version = 1');
            console.log('Schema initialized.');
        }

        // Migration to version 2: Add avatar_url to users if it doesn't exist
        if (currentVersion < 2 && !hasAvatarUrl) {
            console.log('Migrating to version 2: Adding avatar_url to users...');
            try {
                await db.execAsync('ALTER TABLE users ADD COLUMN avatar_url TEXT;');
                await db.execAsync('PRAGMA user_version = 2');
                console.log('Migration to version 2 complete.');
            } catch (migErr) {
                console.error('Migration v2 failed (might already exist):', migErr);
            }
        } else if (currentVersion < 2) {
            await db.execAsync('PRAGMA user_version = 2');
        }

        console.log('DB Schema is up to date.');

        // ALWAYS run seeding (checks inside ensure idempotency).
        // This fixes the issue where sync pulls partial data (e.g. only Admin) and migration skips seeding the rest.
        console.log('Ensuring default data (Users/Events) exists...');
        await seedDefaultUsers(db);
        await seedInitialData(db);
        await seedExperience(db);

        // Final sync check (useful if pre-migration sync failed but we are now online, or to push new seeds)
        sync().catch(e => console.log('Background final sync error:', e));

    } catch (e) {
        console.error('Migration error:', e);
    }
}

export async function syncDatabase(db: any) {
    if (Platform.OS === 'web') return;

    try {
        console.log('🔄 Attempting sync with Turso...');

        if (db && 'syncLibSQL' in db) {
            if (TURSO_URL && TURSO_TOKEN) {
                await db.syncLibSQL();
                console.log('✅ Synced with Turso successfully');
            }
        } else if (db && db.sync) {
            // Fallback for older versions
            if (TURSO_URL && TURSO_TOKEN) {
                await db.sync();
                console.log('✅ Synced with Turso successfully (legacy sync)');
            }
        }
    } catch (e: any) {
        console.error('❌ Sync failed:', e);
        if (e.message) console.error('Error message:', e.message);

        if (e.message && (
            e.message.includes('conflict') ||
            e.message.includes('sent=') ||
            e.message.includes('database is locked') ||
            e.message.includes('Generation ID mismatch')
        )) {
            console.error('⚠️ Critical Sync Conflict or Lock detected. Initiating Local DB Reset...');
            try {
                // Attempting to close and delete to fix the conflict automatically
                if (dbInstance) {
                    await dbInstance.closeAsync();
                    dbInstance = null;
                }

                // Add a small delay to ensure file handle is released
                await new Promise(resolve => setTimeout(resolve, 500));

                try {
                    await SQLite.deleteDatabaseAsync(LOCAL_DB_NAME);
                    console.log('♻️ Local Database Reset. The app will restart with fresh data.');
                } catch (delErr: any) {
                    // Ignore if file doesn't exist (already deleted)
                    if (delErr?.message?.includes('not found')) {
                        console.log('♻️ DB file already removed.');
                    } else {
                        console.error('Failed to delete DB file:', delErr);
                    }
                }
            } catch (resetError) {
                console.error('Failed to reset DB process:', resetError);
            }
        }
    }
}

// Global helper for services
export async function query(sql: string, args: any[] = []) {
    const db = await getDB();
    try {
        if (sql.trim().toUpperCase().startsWith('SELECT')) {
            const rows = await db.getAllAsync(sql, args);
            return {
                rows,
                rowsAffected: 0,
                lastInsertRowid: undefined,
            };
        } else {
            const result = await db.runAsync(sql, args);
            // Run sync in background after write operations for "local first" feel
            // We catch errors so we don't block the UI response
            syncDatabase(db).catch(err => console.log('Background sync error:', err));

            return {
                rows: [],
                rowsAffected: result.changes,
                lastInsertRowid: result.lastInsertRowId,
            };
        }
    } catch (e) {
        console.error('Query Error:', sql, e);
        throw e;
    }
}

export async function execute(sql: string, args: any[] = []) {
    return query(sql, args);
}

export async function batch(statements: { sql: string; args?: any[] }[]) {
    const db = await getDB();
    try {
        await db.withTransactionAsync(async () => {
            for (const stmt of statements) {
                await db.runAsync(stmt.sql, stmt.args || []);
            }
        });
        // Sync after batch
        syncDatabase(db).catch(err => console.log('Background sync error:', err));
    } catch (e) {
        console.error('Batch Error:', e);
        throw e;
    }
}

// Manual sync helpers
export async function sync() {
    const db = await getDB();
    await syncDatabase(db);
    return { success: true };
}

export async function manualSync() {
    return await sync();
}

export function getSyncStatus() {
    return {
        isAutoSyncEnabled: true,
        hasDatabase: true,
        hasTursoConfig: !!(TURSO_URL && TURSO_TOKEN),
        isTursoEnabled: !!(TURSO_URL && TURSO_TOKEN && Platform.OS !== 'web'),
        mode: 'local-first'
    };
}

export async function resetDatabase() {
    try {
        console.log('♻️ Resetting local database...');
        if (dbInstance) {
            await dbInstance.closeAsync();
            dbInstance = null;
        }
        await SQLite.deleteDatabaseAsync(LOCAL_DB_NAME);
        console.log('✅ Local database deleted. Restart app to re-initialize.');
    } catch (e) {
        console.error('Reset failed:', e);
    }
}

export function stopAutoSync() { }
