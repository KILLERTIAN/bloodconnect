import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import { initializeSchema, seedDefaultUsers, seedExperience, seedInitialData } from './schema';

const LOCAL_DB_NAME = 'bloodconnect.db';
const ASYNC_STORAGE_QUEUE_KEY = 'bloodconnect_sync_queue';
const TURSO_TOKEN_KEY = 'turso_auth_token';

export const TURSO_URL = process.env.EXPO_PUBLIC_TURSO_DB_URL;
const ENV_TURSO_TOKEN = process.env.EXPO_PUBLIC_TURSO_DB_AUTH_TOKEN;

/**
 * Get Turso token: Prioritizes SecureStore (if set at runtime) over .env
 */
async function getTursoToken(): Promise<string | null> {
    if (Platform.OS === 'web') return ENV_TURSO_TOKEN || null;
    try {
        const secureToken = await SecureStore.getItemAsync(TURSO_TOKEN_KEY);
        return secureToken || ENV_TURSO_TOKEN || null;
    } catch {
        return ENV_TURSO_TOKEN || null;
    }
}

/**
 * Save a new Turso token to SecureStore
 */
export async function saveTursoToken(token: string) {
    if (Platform.OS === 'web') return;
    await SecureStore.setItemAsync(TURSO_TOKEN_KEY, token);
}

let dbInstance: SQLite.SQLiteDatabase | null = null;
let isSyncing = false;

// ─── Offline Write Queue Persistence (using AsyncStorage) ──────────────
interface PendingWrite {
    sql: string;
    args: any[];
    createdAt: number;
}

let pendingWrites: PendingWrite[] = [];

async function saveQueue() {
    try {
        await AsyncStorage.setItem(ASYNC_STORAGE_QUEUE_KEY, JSON.stringify(pendingWrites));
    } catch (e) {
        console.error('Failed to save pending writes to AsyncStorage:', e);
    }
}

async function loadQueue() {
    try {
        const content = await AsyncStorage.getItem(ASYNC_STORAGE_QUEUE_KEY);
        if (content) {
            pendingWrites = JSON.parse(content);
            console.log(`📦 Loaded ${pendingWrites.length} pending writes from AsyncStorage`);
        }
    } catch (e) {
        console.warn('Failed to load pending writes from AsyncStorage:', e);
    }
}

// ─── Turso HTTP API ──────────────────────────────────────────────────
// The embedded replica (syncLibSQL) is PULL-ONLY: remote → local.
// Local writes via db.runAsync() are NOT pushed back to Turso.
// Therefore ALL write operations must also be sent to the Turso HTTP
// Pipeline API so they persist in the remote primary database.
// ─────────────────────────────────────────────────────────────────────

function getTursoHttpUrl(): string | null {
    if (!TURSO_URL) return null;
    return TURSO_URL.replace('libsql://', 'https://');
}

function mapArgType(v: any): { type: string; value: string | null } {
    if (v === null || v === undefined) return { type: 'null', value: null };
    if (typeof v === 'number') {
        if (Number.isInteger(v)) return { type: 'integer', value: String(v) };
        return { type: 'float', value: String(v) };
    }
    if (typeof v === 'boolean') return { type: 'integer', value: v ? '1' : '0' };
    return { type: 'text', value: String(v) };
}

/**
 * Execute a write statement against the remote Turso primary via HTTP API.
 * Returns true if the remote write succeeded, false otherwise.
 */
async function executeRemote(sql: string, args: any[] = []): Promise<boolean> {
    const httpUrl = getTursoHttpUrl();
    const token = await getTursoToken();
    if (!httpUrl || !token) return false;

    try {
        const body = {
            requests: [
                {
                    type: 'execute',
                    stmt: { sql, args: args.map(mapArgType) },
                },
                { type: 'close' },
            ],
        };

        const res = await fetch(`${httpUrl}/v2/pipeline`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!res.ok) return false;

        const json = await res.json();
        const results = json?.results;
        if (results && results[0]?.type === 'error') return false;

        return true;
    } catch (e) {
        return false;
    }
}

export function getPendingWriteCount(): number {
    return pendingWrites.length;
}

/**
 * Flush all pending writes to the remote Turso database.
 */
export async function flushPendingWrites(): Promise<boolean> {
    if (pendingWrites.length === 0) return true;

    console.log(`🔄 Flushing ${pendingWrites.length} pending writes to remote...`);

    // Process one by one and remove only on success
    while (pendingWrites.length > 0) {
        const pw = pendingWrites[0];
        const ok = await executeRemote(pw.sql, pw.args);

        if (ok) {
            pendingWrites.shift(); // Remove from queue
            await saveQueue(); // Persist immediately after success
            console.log('✅ Pending write pushed to cloud');
        } else {
            console.warn('⚠️ Flush stalled (offline or server error)');
            return false; // Stop flushing for now
        }
    }

    console.log('✅ All pending writes successfully flushed to remote');
    return true;
}

// ─── DB Initialization ──────────────────────────────────────────────

export async function getDB() {
    if (dbInstance) {
        return dbInstance;
    }

    console.log('🔋 Initializing new DB instance...');

    // Load persisted queue on startup
    if (pendingWrites.length === 0) {
        await loadQueue();
    }

    const token = await getTursoToken();
    const openOptions = {
        useNewConnection: true,
        libSQLOptions: {
            url: TURSO_URL || 'http://127.0.0.1:8080',
            authToken: token || 'placeholder-token'
        }
    };

    try {
        dbInstance = await SQLite.openDatabaseAsync(LOCAL_DB_NAME, openOptions);
    } catch (error: any) {
        console.error('🚨 Failed to open/initialize DB:', error);

        if (
            error?.message?.includes('malformed') ||
            error?.message?.includes('corrupt') ||
            error?.message?.includes('not a database') ||
            error?.message?.includes('Construct')
        ) {
            console.log('♻️ Database corrupted. Initiating Hard Reset...');
            try {
                await SQLite.deleteDatabaseAsync(LOCAL_DB_NAME);
                console.log('✅ Corrupted DB deleted. Re-initializing...');
                dbInstance = await SQLite.openDatabaseAsync(LOCAL_DB_NAME, openOptions);
            } catch (recoveryError) {
                console.error('❌ CRITICAL: Failed to recover database:', recoveryError);
                throw recoveryError;
            }
        } else {
            console.error('❌ SQL Error during open:', error);
            try {
                if (dbInstance) await dbInstance.closeAsync();
                await SQLite.deleteDatabaseAsync(LOCAL_DB_NAME);
                console.log('♻️ Emergency hard reset completed after native error.');
            } catch (err) { /* ignore */ }
            throw error;
        }
    }

    console.log(`🔌 DB Connection initialized. URL: ${TURSO_URL ? TURSO_URL.substring(0, 15) + '...' : 'NONE'}`);

    // Use getAllAsync for PRAGMAs that return rows
    try {
        await dbInstance.getAllAsync('PRAGMA journal_mode = WAL;');
    } catch (e) {
        console.log('⚠️ Failed to set WAL mode:', e);
    }

    return dbInstance;
}

// ─── Migrations ──────────────────────────────────────────────────────

export async function migrateDbIfNeeded(db: SQLite.SQLiteDatabase) {
    try {
        const token = await getTursoToken();
        if (TURSO_URL && token) {
            console.log('⚡️ Attempting pre-migration sync to pull remote data...');
            try {
                await syncDatabase(db);
                console.log('✅ Pre-migration sync complete.');
            } catch (syncErr) {
                console.log('⚠️ Pre-migration sync failed (likely offline or first run fallback):', syncErr);
            }
        }

        console.log('Checking migrations...');

        const eventsTable = await db.getAllAsync<{ name: string }>("SELECT name FROM sqlite_master WHERE type='table' AND name='events'");
        const hasEventsTable = eventsTable.length > 0;

        const result = await db.getAllAsync<{ user_version: number }>('PRAGMA user_version');
        let currentVersion = result[0]?.user_version || 0;

        console.log(`Current DB version: ${currentVersion}, Has events table: ${hasEventsTable}`);

        if (currentVersion < 1 || !hasEventsTable) {
            console.log('Applying initial schema...');
            await initializeSchema(db);
            await db.execAsync('PRAGMA user_version = 1');
            currentVersion = 1;
            console.log('Schema initialized.');
        }

        if (currentVersion < 2) {
            const userColumns = await db.getAllAsync<{ name: string }>("PRAGMA table_info(users)");
            const hasAvatarUrl = userColumns.some(col => col.name === 'avatar_url');

            if (!hasAvatarUrl) {
                console.log('Migrating to version 2: Adding avatar_url to users...');
                try {
                    await db.execAsync('ALTER TABLE users ADD COLUMN avatar_url TEXT;');
                } catch (migErr) {
                    console.error('Migration v2 ALTER failed:', migErr);
                }
            }
            await db.execAsync('PRAGMA user_version = 2');
            currentVersion = 2;
        }

        // Fail-safe: always check for missing helpline columns
        const hlExists = await db.getAllAsync<{ name: string }>(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='helpline_requests'"
        );
        if (hlExists.length > 0) {
            const hlColumns = await db.getAllAsync<{ name: string }>("PRAGMA table_info(helpline_requests)");
            const colNames = hlColumns.map(c => c.name);

            const neededColumns = [
                { name: 'patient_age', type: 'INTEGER' },
                { name: 'blood_component', type: "TEXT DEFAULT 'whole_blood'" },
                { name: 'ward_details', type: 'TEXT' },
                { name: 'address', type: 'TEXT' },
                { name: 'case_type', type: "TEXT DEFAULT 'emergency'" },
                { name: 'is_live', type: 'INTEGER DEFAULT 0' },
                { name: 'status', type: "TEXT DEFAULT 'open'" },
            ];

            let addedCount = 0;
            for (const col of neededColumns) {
                if (!colNames.includes(col.name)) {
                    try {
                        await db.execAsync(`ALTER TABLE helpline_requests ADD COLUMN ${col.name} ${col.type};`);
                        addedCount++;
                    } catch (e: any) {
                        if (!e.message?.includes('duplicate column')) {
                            console.error(`❌ Failed to add ${col.name}:`, e);
                        }
                    }
                }
            }
            if (addedCount > 0) console.log(`✅ Patch applied: Added ${addedCount} columns.`);
        }

        if (currentVersion < 3) {
            await db.execAsync('PRAGMA user_version = 3');
        }

        console.log('✨ DB Schema is fully up to date.');

        console.log('Ensuring default data (Users/Events) exists...');
        await seedDefaultUsers(db);
        await seedInitialData(db);
        await seedExperience(db);

        // Final sync check
        sync().catch(e => console.log('Background final sync error:', e));

    } catch (e) {
        console.error('Migration error:', e);
    }
}

// ─── Sync (pull remote → local) ─────────────────────────────────────

export async function syncDatabase(db: any) {
    if (Platform.OS === 'web') return;
    if (isSyncing) {
        console.log('⏳ Sync already in progress, skipping redundant call.');
        return;
    }

    try {
        isSyncing = true;

        // IMPORTANT: Flush local changes to the cloud BEFORE doing any pull/sync.
        // This ensures your offline work is safely on the server first.
        const flushOk = await flushPendingWrites();

        console.log(`🔄 Syncing with: ${TURSO_URL?.substring(0, 20)}...`);

        if (db && 'syncLibSQL' in db) {
            const token = await getTursoToken();
            if (TURSO_URL && token) {
                const before: any = await db.getAllAsync('SELECT COUNT(*) as count FROM events');
                console.log(`📊 LOCAL count: ${before[0].count} events`);

                await db.syncLibSQL();

                const after: any = await db.getAllAsync('SELECT COUNT(*) as count FROM events');
                console.log(`✅ SYNC SUCCESS. New local count: ${after[0].count}`);

                if (before[0].count !== after[0].count) {
                    console.log(`📊 Data changed: ${before[0].count} → ${after[0].count} events`);
                }
            } else {
                console.warn('⚠️ Sync skipped: Turso URL or Token missing.');
            }
        } else if (db && db.sync) {
            const token = await getTursoToken();
            if (TURSO_URL && token) {
                await db.sync();
                console.log('✅ Synced with Turso successfully (legacy sync)');
            }
        }
    } catch (e: any) {
        console.error('❌ Sync failed:', e);
        if (e.message) console.error('Error message:', e.message);

        const isConflict = e.message && e.message.includes('server returned a conflict');
        const isLocked = e.message && e.message.includes('database is locked');

        if (isConflict) {
            // DATA SAFETY CHECK: Only reset if the queue is empty OR flush succeeded.
            // If the queue still has items, it means those changes are ONLY local.
            // We wait until they are flushed to Turso before wiping the local DB.
            if (pendingWrites.length === 0) {
                console.error('🚨 Sync Conflict detected. Remote primary has diverged. Resetting local DB...');
                try {
                    if (dbInstance) {
                        await dbInstance.closeAsync();
                        dbInstance = null;
                    }
                    await new Promise(resolve => setTimeout(resolve, 500));
                    await SQLite.deleteDatabaseAsync(LOCAL_DB_NAME);
                    console.log('♻️ Local Database Reset completed. It will re-init on next use.');
                } catch (resetError) {
                    console.error('Failed to reset DB process:', resetError);
                }
            } else {
                console.warn('⚠️ Sync conflict ignored because local changes are not yet pushed to Turso. Retrying push first...');
                await flushPendingWrites();
            }
        } else if (isLocked) {
            console.warn('⚠️ Server database is locked. Will retry sync later.');
        } else if (e.message && (e.message.includes('malformed') || e.message.includes('corrupt'))) {
            // Corrupted file always needs reset
            console.error('🚨 Local database corrupted. Resetting...');
            if (dbInstance) await dbInstance.closeAsync();
            dbInstance = null;
            await SQLite.deleteDatabaseAsync(LOCAL_DB_NAME);
        } else {
            console.warn('⚠️ Sync failed (network?). Will retry later.');
        }
    } finally {
        isSyncing = false;
    }
}

// ─── Query / Execute helpers ─────────────────────────────────────────

/**
 * READ: always from local SQLite (fast).
 */
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
            // — this path is for writes called via query(), shouldn't normally happen —
            return await _writeLocal(db, sql, args);
        }
    } catch (e: any) {
        console.error('Query Error:', sql, e);
        if (e?.message?.includes('malformed')) {
            console.log('🚨 Malformed database detected during query. Initiating Hard Reset...');
            getDB().then(d => {
                if (d) d.closeAsync().then(() => {
                    SQLite.deleteDatabaseAsync(LOCAL_DB_NAME).catch(() => { });
                }).catch(() => { });
            }).catch(() => { });
        }
        throw e;
    }
}

/**
 * WRITE: writes to local SQLite AND sends to remote Turso HTTP API.
 * 
 * STRATEGY:
 * - If ONLINE: We write to the remote Primary HTTP API FIRST. Then we SYNC it back locally. 
 *   We skip the local runAsync write to avoid generating conflicting "local frames" in the replica.
 * - If OFFLINE: We write to the local SQLite so the user sees it immediately. 
 *   We queue the operation for remote replay when back online.
 */
export async function execute(sql: string, args: any[] = []) {
    const db = await getDB();

    // 1. Try to send the write directly to Turso Primary via HTTP first.
    // This is the clean path that avoids creating conflicting frames in the local replica.
    const token = await getTursoToken();
    if (TURSO_URL && token) {
        const remoteOk = await executeRemote(sql, args);

        if (remoteOk) {
            // Success! The record is on the server.
            // Force a sync with a slight delay so the local replica pulls it down.
            setTimeout(() => {
                syncDatabase(db).catch(err => console.log('Background sync error:', err));
            }, 800);

            return {
                rows: [],
                rowsAffected: 1,
                lastInsertRowid: undefined,
            };
        }
    }

    // 2. If we are OFFLINE (or HTTP call failed), fall back to local-first write.
    // This will create a local frame in the replica which might cause a conflict later 
    // when we go online, but our syncDatabase now handles that by resetting the DB.

    // Write locally so UI updates immediately
    const localResult = await _writeLocal(db, sql, args);

    // Queue for remote replay and persist to disk
    pendingWrites.push({ sql, args, createdAt: Date.now() });
    await saveQueue();
    console.log(`📝 Write queued for later replay and persisted to disk (${pendingWrites.length} pending)`);

    return localResult;
}

async function _writeLocal(db: SQLite.SQLiteDatabase, sql: string, args: any[]) {
    console.log(`📝 Executing Local Write: ${sql.substring(0, 50)}...`);
    const result = await db.runAsync(sql, args);
    console.log(`✅ Local write successful. Changes: ${result.changes}, LastInsertID: ${result.lastInsertRowId}`);
    return {
        rows: [],
        rowsAffected: result.changes,
        lastInsertRowid: result.lastInsertRowId,
    };
}

export async function batch(statements: { sql: string; args?: any[] }[]) {
    const db = await getDB();
    try {
        // Local batch
        await db.withTransactionAsync(async () => {
            for (const stmt of statements) {
                await db.runAsync(stmt.sql, stmt.args || []);
            }
        });

        // Remote batch – send each statement
        for (const stmt of statements) {
            const ok = await executeRemote(stmt.sql, stmt.args || []);
            if (!ok) {
                pendingWrites.push({ sql: stmt.sql, args: stmt.args || [], createdAt: Date.now() });
            }
        }

        // Sync after batch
        syncDatabase(db).catch(err => console.log('Background sync error:', err));
    } catch (e: any) {
        console.error('Batch Error:', e);
        if (e?.message?.includes('malformed')) {
            console.log('🚨 Malformed database detected during batch. Initiating Hard Reset...');
            getDB().then(d => {
                if (d) d.closeAsync().then(() => {
                    SQLite.deleteDatabaseAsync(LOCAL_DB_NAME).catch(() => { });
                }).catch(() => { });
            }).catch(() => { });
        }
        throw e;
    }
}

// ─── Public sync helpers ─────────────────────────────────────────────

export async function sync() {
    // First, flush any pending writes to remote
    await flushPendingWrites();
    // Then pull remote changes locally
    const db = await getDB();
    await syncDatabase(db);
    return { success: true };
}

export async function manualSync() {
    return await sync();
}

export async function getSyncStatus() {
    const token = await getTursoToken();
    return {
        isAutoSyncEnabled: true,
        hasDatabase: true,
        hasTursoConfig: !!(TURSO_URL && token),
        isTursoEnabled: !!(TURSO_URL && token && Platform.OS !== 'web'),
        mode: 'local-first-remote-write',
        pendingWrites: pendingWrites.length,
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
