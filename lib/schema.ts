import { batch, query } from './database';

export async function initializeSchema() {
    await batch([
        // Users table
        {
            sql: `CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                phone TEXT,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL CHECK(role IN ('admin','manager','hr','outreach','volunteer','helpline')),
                is_active INTEGER DEFAULT 1,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            )`
        },

        // Events / Camps table (Camp Manager Module)
        {
            sql: `CREATE TABLE IF NOT EXISTS events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                organization_name TEXT NOT NULL,
                poc_name TEXT NOT NULL,
                poc_phone TEXT NOT NULL,
                poc_email TEXT,
                location TEXT NOT NULL,
                city TEXT,
                blood_bank_name TEXT,
                blood_bank_contact TEXT,
                event_date TEXT,
                event_time TEXT,
                expected_donors INTEGER DEFAULT 0,
                actual_donations INTEGER DEFAULT 0,
                status TEXT DEFAULT 'lead_received' CHECK(status IN (
                    'lead_received','contacting_poc','booking_blood_bank',
                    'floating_volunteers','camp_completed','post_camp_followup','closed'
                )),
                created_by INTEGER REFERENCES users(id),
                notes TEXT,
                followup_done INTEGER DEFAULT 0,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            )`
        },

        // Event volunteer requirements
        {
            sql: `CREATE TABLE IF NOT EXISTS event_volunteers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
                volunteer_id INTEGER REFERENCES users(id),
                role_in_event TEXT,
                status TEXT DEFAULT 'pending' CHECK(status IN ('pending','confirmed','attended','absent')),
                created_at TEXT DEFAULT (datetime('now'))
            )`
        },

        // Reimbursements
        {
            sql: `CREATE TABLE IF NOT EXISTS reimbursements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_id INTEGER REFERENCES events(id),
                volunteer_id INTEGER REFERENCES users(id),
                amount REAL NOT NULL,
                description TEXT,
                receipt_url TEXT,
                status TEXT DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
                approved_by INTEGER REFERENCES users(id),
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            )`
        },

        // Schedules (HR Module)
        {
            sql: `CREATE TABLE IF NOT EXISTS schedules (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER REFERENCES users(id),
                date TEXT NOT NULL,
                start_time TEXT,
                end_time TEXT,
                activity TEXT,
                event_id INTEGER REFERENCES events(id),
                is_locked INTEGER DEFAULT 0,
                created_at TEXT DEFAULT (datetime('now'))
            )`
        },

        // Schedule lock settings (HR controls)
        {
            sql: `CREATE TABLE IF NOT EXISTS schedule_settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER REFERENCES users(id) UNIQUE,
                editing_enabled INTEGER DEFAULT 1,
                locked_by INTEGER REFERENCES users(id),
                locked_at TEXT
            )`
        },

        // Outreach leads
        {
            sql: `CREATE TABLE IF NOT EXISTS outreach_leads (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                organization_name TEXT NOT NULL,
                poc_name TEXT NOT NULL,
                poc_phone TEXT NOT NULL,
                poc_email TEXT,
                purpose TEXT,
                occasion TEXT,
                type TEXT CHECK(type IN ('awareness_session','camp')),
                org_category TEXT CHECK(org_category IN ('school','college','corporate','ngo','hospital','other')),
                city TEXT,
                location TEXT,
                status TEXT DEFAULT 'not_contacted' CHECK(status IN ('not_contacted','pending','successful','cancelled')),
                assigned_to INTEGER REFERENCES users(id),
                created_by INTEGER REFERENCES users(id),
                notes TEXT,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            )`
        },

        // Outreach interaction history
        {
            sql: `CREATE TABLE IF NOT EXISTS outreach_interactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                lead_id INTEGER REFERENCES outreach_leads(id) ON DELETE CASCADE,
                user_id INTEGER REFERENCES users(id),
                interaction_type TEXT,
                notes TEXT,
                created_at TEXT DEFAULT (datetime('now'))
            )`
        },

        // Donor database (Helpline Module)
        {
            sql: `CREATE TABLE IF NOT EXISTS donors (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                phone TEXT NOT NULL,
                email TEXT,
                blood_group TEXT NOT NULL,
                city TEXT,
                location TEXT,
                last_donation_date TEXT,
                total_donations INTEGER DEFAULT 0,
                is_available INTEGER DEFAULT 1,
                gender TEXT,
                age INTEGER,
                event_id INTEGER REFERENCES events(id),
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            )`
        },

        // Helpline requests
        {
            sql: `CREATE TABLE IF NOT EXISTS helpline_requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                patient_name TEXT NOT NULL,
                blood_group TEXT NOT NULL,
                blood_component TEXT DEFAULT 'whole_blood',
                units_required INTEGER NOT NULL,
                hospital TEXT NOT NULL,
                city TEXT NOT NULL,
                attender_name TEXT,
                attender_contact TEXT NOT NULL,
                urgency TEXT DEFAULT 'normal' CHECK(urgency IN ('critical','urgent','normal')),
                required_till TEXT,
                is_live INTEGER DEFAULT 0,
                status TEXT DEFAULT 'open' CHECK(status IN ('open','in_progress','fulfilled','closed')),
                created_by INTEGER REFERENCES users(id),
                notes TEXT,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            )`
        },

        // Helpline volunteer assignments
        {
            sql: `CREATE TABLE IF NOT EXISTS helpline_assignments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                helpline_id INTEGER REFERENCES helpline_requests(id) ON DELETE CASCADE,
                volunteer_id INTEGER REFERENCES users(id),
                assigned_at TEXT DEFAULT (datetime('now')),
                status TEXT DEFAULT 'active' CHECK(status IN ('active','completed','reassigned'))
            )`
        },

        // Call logs (in-built calling feature)
        {
            sql: `CREATE TABLE IF NOT EXISTS call_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                helpline_id INTEGER REFERENCES helpline_requests(id),
                volunteer_id INTEGER REFERENCES users(id),
                donor_id INTEGER REFERENCES donors(id),
                called_at TEXT DEFAULT (datetime('now')),
                duration_seconds INTEGER DEFAULT 0,
                outcome TEXT CHECK(outcome IN ('interested','not_interested','no_answer','callback','donated')),
                remarks TEXT NOT NULL,
                created_at TEXT DEFAULT (datetime('now'))
            )`
        },

        // Notifications
        {
            sql: `CREATE TABLE IF NOT EXISTS notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER REFERENCES users(id),
                title TEXT NOT NULL,
                body TEXT NOT NULL,
                type TEXT,
                reference_id INTEGER,
                is_read INTEGER DEFAULT 0,
                created_at TEXT DEFAULT (datetime('now'))
            )`
        },
    ]);
}

export async function seedDefaultUsers() {
    // Check if users already exist
    const result = await query('SELECT COUNT(*) as count FROM users');
    const count = (result.rows[0] as any).count;
    if (count > 0) return;

    await batch([
        {
            sql: `INSERT INTO users (name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)`,
            args: ['Admin User', 'admin@bloodconnect.org', '9999900001', 'admin123', 'admin']
        },
        {
            sql: `INSERT INTO users (name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)`,
            args: ['Rahul Sharma', 'manager@bloodconnect.org', '9999900002', 'manager123', 'manager']
        },
        {
            sql: `INSERT INTO users (name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)`,
            args: ['Priya Nair', 'hr@bloodconnect.org', '9999900003', 'hr123', 'hr']
        },
        {
            sql: `INSERT INTO users (name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)`,
            args: ['Arjun Mehta', 'outreach@bloodconnect.org', '9999900004', 'outreach123', 'outreach']
        },
        {
            sql: `INSERT INTO users (name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)`,
            args: ['Sneha Patel', 'volunteer@bloodconnect.org', '9999900005', 'volunteer123', 'volunteer']
        },
        {
            sql: `INSERT INTO users (name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)`,
            args: ['Vikram Das', 'helpline@bloodconnect.org', '9999900006', 'helpline123', 'helpline']
        },
    ]);
}
