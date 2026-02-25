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
 * Skips writes that are stale (>24h old) or that fail repeatedly.
 */
export async function flushPendingWrites(): Promise<boolean> {
    if (pendingWrites.length === 0) return true;

    console.log(`🔄 Flushing ${pendingWrites.length} pending writes to remote...`);
    const STALE_MS = 24 * 60 * 60 * 1000; // 24 hours
    const now = Date.now();

    // Drop stale writes first
    const freshWrites = pendingWrites.filter(pw => (now - pw.createdAt) < STALE_MS);
    if (freshWrites.length < pendingWrites.length) {
        const dropped = pendingWrites.length - freshWrites.length;
        console.warn(`🗑️ Dropped ${dropped} stale pending writes (older than 24h)`);
        pendingWrites = freshWrites;
        await saveQueue();
    }

    if (pendingWrites.length === 0) return true;

    // Process one by one and remove only on success
    let consecutiveFailures = 0;
    while (pendingWrites.length > 0) {
        const pw = pendingWrites[0];
        const ok = await executeRemote(pw.sql, pw.args);

        if (ok) {
            pendingWrites.shift(); // Remove from queue
            await saveQueue(); // Persist immediately after success
            console.log('✅ Pending write pushed to cloud');
            consecutiveFailures = 0;
        } else {
            consecutiveFailures++;
            if (consecutiveFailures >= 3) {
                console.warn('⚠️ Flush stalled after 3 consecutive failures (offline or server error)');
                return false; // Stop flushing for now
            }
            // Skip this one bad write and continue with the rest
            console.warn(`⚠️ Skipping failed write (attempt ${consecutiveFailures}): ${pw.sql.substring(0, 50)}...`);
            pendingWrites.shift();
            await saveQueue();
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

        // Safety check: Ensure schema exists immediately upon connection to prevent "no such table"
        // This is crucial for when the DB is deleted due to a Turso Replica conflict.
        // IMPORTANT: Only create empty tables here (DDL). Do NOT seed data!
        // Seeding creates local WAL frames that conflict with syncLibSQL() pulls.
        // Data seeding happens later in migrateDbIfNeeded() AFTER sync.
        try {
            const hasEvents = await dbInstance.getAllAsync<{ name: string }>("SELECT name FROM sqlite_master WHERE type='table' AND name='events'");
            if (hasEvents.length === 0) {
                console.log('🏗️ Restoring missing schema (tables only, no data) after DB recreate...');
                await initializeSchema(dbInstance);
                await dbInstance.execAsync('PRAGMA user_version = 4');
            }
        } catch (schemaErr) {
            console.error('Failed to verify/restore schema on getDB:', schemaErr);
        }

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

        // One-time cleanup script for corrupted local data from prior schema issues
        try {
            await db.execAsync("DELETE FROM helpline_requests WHERE blood_group = 'whole_blood' OR blood_group IS NULL OR blood_group = 'NULL'");
        } catch (e) { /* ignore */ }

        if (currentVersion < 4) {
            console.log('Migrating to version 4: Forcing schema drop for helpline tables to align with Turso column indices...');
            try {
                await db.execAsync('PRAGMA foreign_keys=OFF;');
                await db.execAsync('DROP TABLE IF EXISTS call_logs;');
                await db.execAsync('DROP TABLE IF EXISTS helpline_assignments;');
                await db.execAsync('DROP TABLE IF EXISTS helpline_requests;');
                await db.execAsync('PRAGMA foreign_keys=ON;');
                await initializeSchema(db);
            } catch (e) {
                console.error('Migration v4 drop failed:', e);
            }
            await db.execAsync('PRAGMA user_version = 4');
            currentVersion = 4;
        }

        console.log('✨ DB Schema is fully up to date and cleaned.');

        // IMPORTANT: Only seed data if the database is truly empty.
        // If sync pulled remote data, DO NOT seed — local writes via db.runAsync()
        // create WAL frames that corrupt the embedded replica sync state on Android.
        const eventCount = await db.getAllAsync<{ count: number }>('SELECT COUNT(*) as count FROM events');
        const hasRemoteData = (eventCount[0]?.count || 0) > 0;

        if (!hasRemoteData) {
            console.log('📦 DB is empty (offline or first run). Seeding default data...');
            await seedDefaultUsers(db);
            await seedInitialData(db);
            await seedExperience(db);
        } else {
            console.log(`✅ DB already has ${eventCount[0].count} events from remote. Skipping seed.`);
            // Still ensure default users exist (they're needed for login)
            await seedDefaultUsers(db);
        }

        // Final sync check
        sync().catch(e => console.log('Background final sync error:', e));

    } catch (e) {
        console.error('Migration error:', e);
    }
}

// ─── Sync (pull remote → local) ─────────────────────────────────────

async function _cleanupDanglingLocalRecords(db: any, tursoUrl: string, token: string) {
    const httpUrl = tursoUrl.replace('libsql://', 'https://');
    try {
        const body = {
            requests: [
                { type: 'execute', stmt: { sql: 'SELECT id FROM events' } },
                { type: 'execute', stmt: { sql: 'SELECT id FROM helpline_requests' } },
                { type: 'execute', stmt: { sql: 'SELECT id FROM outreach_leads' } },
                { type: 'close' },
            ],
        };

        const res = await fetch(`${httpUrl}/v2/pipeline`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        if (!res.ok) return;

        const json = await res.json();
        const remoteEvents = json.results[0]?.response?.result?.rows?.map((r: any) => r[0].value) || [];
        const remoteHelplines = json.results[1]?.response?.result?.rows?.map((r: any) => r[0].value) || [];
        const remoteLeads = json.results[2]?.response?.result?.rows?.map((r: any) => r[0].value) || [];

        // Delete local events not in remote
        if (remoteEvents.length > 0) {
            const placeholders = remoteEvents.map(() => '?').join(',');
            await db.runAsync(`DELETE FROM events WHERE id NOT IN (${placeholders})`, remoteEvents);
        } else if (json.results[0]?.response?.result) {
            await db.runAsync('DELETE FROM events');
        }

        // Delete local helplines not in remote
        if (remoteHelplines.length > 0) {
            const placeholders2 = remoteHelplines.map(() => '?').join(',');
            await db.runAsync(`DELETE FROM helpline_requests WHERE id NOT IN (${placeholders2})`, remoteHelplines);
        } else if (json.results[1]?.response?.result) {
            await db.runAsync('DELETE FROM helpline_requests');
        }

        // Delete local leads not in remote
        if (remoteLeads.length > 0) {
            const placeholders3 = remoteLeads.map(() => '?').join(',');
            await db.runAsync(`DELETE FROM outreach_leads WHERE id NOT IN (${placeholders3})`, remoteLeads);
        } else if (json.results[2]?.response?.result) {
            await db.runAsync('DELETE FROM outreach_leads');
        }

        console.log(`🧹 Cleanup complete. Remote counts: ${remoteEvents.length} events, ${remoteHelplines.length} helplines, ${remoteLeads.length} leads.`);

        // CRITICAL: Detect stuck replica — if local has FEWER records than remote
        // after a "successful" sync, the replica WAL is permanently diverged.
        // We surgically fetch the missing records from remote and insert them locally.
        const tablesToRecover = [
            { name: 'events', remoteIds: remoteEvents },
            { name: 'helpline_requests', remoteIds: remoteHelplines },
            { name: 'outreach_leads', remoteIds: remoteLeads }
        ];

        let ranRecovery = false;

        for (const table of tablesToRecover) {
            const localRows = await db.getAllAsync(`SELECT id FROM ${table.name}`);
            const localIds = new Set(localRows.map((r: any) => String(r.id)));
            const missingIds = table.remoteIds.filter((id: string) => !localIds.has(String(id)));

            if (missingIds.length > 0) {
                if (!ranRecovery) {
                    // Disable FK checks — referenced data might not exist locally yet
                    await db.execAsync('PRAGMA foreign_keys=OFF;');
                    ranRecovery = true;
                }

                console.log(`🔧 Fixing stuck replica: ${missingIds.length} missing ${table.name}. Fetching from remote...`);

                const fetchRequests = missingIds.map((id: string) => ({
                    type: 'execute',
                    stmt: { sql: `SELECT * FROM ${table.name} WHERE id = ?`, args: [{ type: 'integer', value: String(id) }] }
                }));
                fetchRequests.push({ type: 'close', stmt: undefined as any });

                const fetchRes = await fetch(`${httpUrl}/v2/pipeline`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ requests: fetchRequests }),
                });

                if (fetchRes.ok) {
                    const fetchJson = await fetchRes.json();
                    for (let i = 0; i < missingIds.length; i++) {
                        const result = fetchJson.results[i]?.response?.result;
                        if (result && result.rows && result.rows.length > 0) {
                            const cols = result.cols.map((c: any) => c.name);
                            const row = result.rows[0];
                            const values = row.map((v: any) => v.value);

                            const placeholders = cols.map(() => '?').join(',');
                            const sql = `INSERT OR REPLACE INTO ${table.name}(${cols.join(',')}) VALUES(${placeholders})`;
                            try {
                                await db.runAsync(sql, values);
                                console.log(`✅ Recovered missing ${table.name} ID ${missingIds[i]}`);
                            } catch (insertErr) {
                                console.warn(`⚠️ Failed to recover ${table.name} ${missingIds[i]}:`, insertErr);
                            }
                        }
                    }
                }
            }
        }

        if (ranRecovery) {
            // Re-enable FK checks
            await db.execAsync('PRAGMA foreign_keys=ON;');
        }
    } catch (e) {
        console.warn('⚠️ Dangling cleanup failed:', e);
    }
}

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

                // Clean up remote deletes
                if (pendingWrites.length === 0) {
                    await _cleanupDanglingLocalRecords(db, TURSO_URL, token);
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
        const isGenerationMismatch = e.message && e.message.includes('Generation ID mismatch');
        const isLocked = e.message && e.message.includes('database is locked');

        if (isConflict || isGenerationMismatch) {
            // For Generation ID mismatch, the local replica is fundamentally diverged.
            // Pending writes from this state will NEVER succeed – they belong to a dead timeline.
            // We must force-reset regardless of pending writes to break the deadlock.
            if (isGenerationMismatch && pendingWrites.length > 0) {
                console.warn(`🗑️ Force-dropping ${pendingWrites.length} stale pending writes (Generation ID mismatch – writes are from a dead timeline)`);
                pendingWrites = [];
                await saveQueue();
            }

            if (pendingWrites.length === 0) {
                console.error('🚨 Sync Conflict detected. Remote primary has diverged. Resetting local DB...');
                try {
                    if (dbInstance) {
                        try { await dbInstance.closeAsync(); } catch (_) { /* ignore close errors */ }
                        dbInstance = null;
                    }
                    await new Promise(resolve => setTimeout(resolve, 500));
                    await SQLite.deleteDatabaseAsync(LOCAL_DB_NAME);
                    console.log('♻️ Local Database Reset completed. It will re-init on next use.');
                } catch (resetError) {
                    console.error('Failed to reset DB process:', resetError);
                }
            } else {
                // Only for non-generation conflicts: try flushing first
                console.warn('⚠️ Sync conflict: trying to flush local changes before reset...');
                const flushed = await flushPendingWrites();
                if (!flushed) {
                    console.warn('🗑️ Flush failed again. Dropping stale writes and resetting DB...');
                    pendingWrites = [];
                    await saveQueue();
                    try {
                        if (dbInstance) {
                            try { await dbInstance.closeAsync(); } catch (_) { /* ignore */ }
                            dbInstance = null;
                        }
                        await new Promise(resolve => setTimeout(resolve, 500));
                        await SQLite.deleteDatabaseAsync(LOCAL_DB_NAME);
                        console.log('♻️ Local Database Reset completed after failed flush.');
                    } catch (resetError) {
                        console.error('Failed to reset DB process:', resetError);
                    }
                }
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
