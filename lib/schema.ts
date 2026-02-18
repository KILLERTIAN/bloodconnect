import { type SQLiteDatabase } from 'expo-sqlite';

export async function initializeSchema(db: SQLiteDatabase) {
    console.log('Creating users table...');
    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            phone TEXT,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('admin','manager','hr','outreach','volunteer','helpline')),
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );
    `);

    console.log('Creating events table...');
    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS events (
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
            image_url TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );
    `);

    console.log('Creating event_volunteers table...');
    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS event_volunteers(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
            volunteer_id INTEGER REFERENCES users(id),
            role_in_event TEXT,
            status TEXT DEFAULT 'pending' CHECK(status IN('pending', 'confirmed', 'attended', 'absent')),
            created_at TEXT DEFAULT(datetime('now'))
        );
    `);

    console.log('Creating reimbursements table...');
    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS reimbursements(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_id INTEGER REFERENCES events(id),
            volunteer_id INTEGER REFERENCES users(id),
            amount REAL NOT NULL,
            description TEXT,
            receipt_url TEXT,
            status TEXT DEFAULT 'pending' CHECK(status IN('pending', 'approved', 'rejected')),
            approved_by INTEGER REFERENCES users(id),
            created_at TEXT DEFAULT(datetime('now')),
            updated_at TEXT DEFAULT(datetime('now'))
        );
    `);

    console.log('Creating schedules table...');
    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS schedules(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER REFERENCES users(id),
            date TEXT NOT NULL,
            start_time TEXT,
            end_time TEXT,
            activity TEXT,
            event_id INTEGER REFERENCES events(id),
            is_locked INTEGER DEFAULT 0,
            created_at TEXT DEFAULT(datetime('now'))
        );
    `);

    console.log('Creating schedule_settings table...');
    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS schedule_settings(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER REFERENCES users(id) UNIQUE,
            editing_enabled INTEGER DEFAULT 1,
            locked_by INTEGER REFERENCES users(id),
            locked_at TEXT
        );
    `);

    console.log('Creating outreach_leads table...');
    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS outreach_leads(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            organization_name TEXT NOT NULL,
            poc_name TEXT NOT NULL,
            poc_phone TEXT NOT NULL,
            poc_email TEXT,
            purpose TEXT,
            occasion TEXT,
            type TEXT CHECK(type IN('awareness_session', 'camp')),
            org_category TEXT CHECK(org_category IN('school', 'college', 'corporate', 'ngo', 'hospital', 'other')),
            city TEXT,
            location TEXT,
            status TEXT DEFAULT 'not_contacted' CHECK(status IN('not_contacted', 'pending', 'successful', 'cancelled')),
            assigned_to INTEGER REFERENCES users(id),
            created_by INTEGER REFERENCES users(id),
            notes TEXT,
            created_at TEXT DEFAULT(datetime('now')),
            updated_at TEXT DEFAULT(datetime('now'))
        );
    `);

    console.log('Creating outreach_interactions table...');
    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS outreach_interactions(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            lead_id INTEGER REFERENCES outreach_leads(id) ON DELETE CASCADE,
            user_id INTEGER REFERENCES users(id),
            interaction_type TEXT,
            notes TEXT,
            created_at TEXT DEFAULT(datetime('now'))
        );
    `);

    console.log('Creating donors table...');
    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS donors(
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
            created_at TEXT DEFAULT(datetime('now')),
            updated_at TEXT DEFAULT(datetime('now'))
        );
    `);

    console.log('Creating helpline_requests table...');
    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS helpline_requests(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_name TEXT NOT NULL,
            blood_group TEXT NOT NULL,
            blood_component TEXT DEFAULT 'whole_blood',
            units_required INTEGER NOT NULL,
            hospital TEXT NOT NULL,
            city TEXT NOT NULL,
            attender_name TEXT,
            attender_contact TEXT NOT NULL,
            urgency TEXT DEFAULT 'normal' CHECK(urgency IN('critical', 'urgent', 'normal')),
            required_till TEXT,
            is_live INTEGER DEFAULT 0,
            status TEXT DEFAULT 'open' CHECK(status IN('open', 'in_progress', 'fulfilled', 'closed')),
            created_by INTEGER REFERENCES users(id),
            notes TEXT,
            created_at TEXT DEFAULT(datetime('now')),
            updated_at TEXT DEFAULT(datetime('now'))
        );
    `);

    console.log('Creating helpline_assignments table...');
    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS helpline_assignments(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            helpline_id INTEGER REFERENCES helpline_requests(id) ON DELETE CASCADE,
            volunteer_id INTEGER REFERENCES users(id),
            assigned_at TEXT DEFAULT(datetime('now')),
            status TEXT DEFAULT 'active' CHECK(status IN('active', 'completed', 'reassigned'))
        );
    `);

    console.log('Creating call_logs table...');
    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS call_logs(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            helpline_id INTEGER REFERENCES helpline_requests(id),
            volunteer_id INTEGER REFERENCES users(id),
            donor_id INTEGER REFERENCES donors(id),
            called_at TEXT DEFAULT(datetime('now')),
            duration_seconds INTEGER DEFAULT 0,
            outcome TEXT CHECK(outcome IN('interested', 'not_interested', 'no_answer', 'callback', 'donated')),
            remarks TEXT NOT NULL,
            created_at TEXT DEFAULT(datetime('now'))
        );
    `);

    console.log('Creating notifications table...');
    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS notifications(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER REFERENCES users(id),
            title TEXT NOT NULL,
            body TEXT NOT NULL,
            type TEXT,
            reference_id INTEGER,
            is_read INTEGER DEFAULT 0,
            created_at TEXT DEFAULT(datetime('now'))
        );
    `);
}

export async function seedDefaultUsers(db: SQLiteDatabase) {
    const users = [
        ['Admin User', 'admin@bloodconnect.org', '9999900001', 'admin123', 'admin'],
        ['Rahul Sharma', 'manager@bloodconnect.org', '9999900002', 'manager123', 'manager'],
        ['Priya Nair', 'hr@bloodconnect.org', '9999900003', 'hr123', 'hr'],
        ['Arjun Mehta', 'outreach@bloodconnect.org', '9999900004', 'outreach123', 'outreach'],
        ['Sneha Patel', 'volunteer@bloodconnect.org', '9999900005', 'volunteer123', 'volunteer'],
        ['Vikram Das', 'helpline@bloodconnect.org', '9999900006', 'helpline123', 'helpline']
    ];

    console.log('Ensure default users exist...');
    for (const user of users) {
        await db.runAsync(
            `INSERT OR IGNORE INTO users(name, email, phone, password_hash, role) VALUES(?, ?, ?, ?, ?)`,
            user
        );
    }
}

export async function seedInitialData(db: SQLiteDatabase) {
    // Helper to get user ID safely
    const getUserId = async (email: string) => {
        const res = await db.getAllAsync<{ id: number }>(`SELECT id FROM users WHERE email = ?`, [email]);
        return res[0]?.id;
    };

    const managerId = await getUserId('manager@bloodconnect.org');
    const outreachId = await getUserId('outreach@bloodconnect.org');
    const helplineId = await getUserId('helpline@bloodconnect.org');

    if (!managerId || !outreachId || !helplineId) {
        console.log('Skipping initial data seeding: Required users not found.');
        return;
    }

    // Seed Events
    const eventsToSeed = [
        ['Annual Blood Drive', 'Infosys Ltd.', 'Sameer Kumar', '9888811111', 'Electronic City Phase 1', 'Bengaluru', 'lead_received', managerId, '2024-11-15', 100],
        ['Community Donation Camp', 'Rotary Club South', 'Anita Desai', '9888822222', 'Indiranagar Club', 'Bengaluru', 'contacting_poc', managerId, '2024-10-20', 50],
        ['Winter Blood Drive', 'TCS Adibatla', 'Rohit Varma', '9888833333', 'TCS Synergy Park', 'Hyderabad', 'closed', managerId, '2024-01-10', 120]
    ];

    console.log('Ensuring default Events exist...');
    for (const evt of eventsToSeed) {
        const exists = await db.getAllAsync<{ id: number }>(`SELECT id FROM events WHERE title = ? AND organization_name = ?`, [evt[0] as string, evt[1] as string]);
        if (exists.length === 0) {
            await db.runAsync(
                `INSERT INTO events(title, organization_name, poc_name, poc_phone, location, city, status, created_by, event_date, expected_donors) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                evt
            );
        }
    }

    // Seed Outreach Leads
    const leadsToSeed = [
        ['Delhi Public School', 'Mrs. Gupta', '9777711111', 'awareness_session', 'school', 'Delhi', 'not_contacted', outreachId],
        ['Google GIDC', 'Karthik Rao', '9777722222', 'camp', 'corporate', 'Hyderabad', 'pending', outreachId]
    ];

    console.log('Ensuring default Outreach Leads exist...');
    for (const lead of leadsToSeed) {
        const exists = await db.getAllAsync<{ id: number }>(`SELECT id FROM outreach_leads WHERE organization_name = ? AND poc_name = ?`, [lead[0] as string, lead[1] as string]);
        if (exists.length === 0) {
            await db.runAsync(
                `INSERT INTO outreach_leads(organization_name, poc_name, poc_phone, type, org_category, city, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                lead
            );
        }
    }

    // Seed Donors
    const donorsToSeed = [
        ['Amit Trivedi', '9666611111', 'O+', 'Bengaluru', 'male', 28],
        ['Sunita Williams', '9666622222', 'B+', 'Mumbai', 'female', 34]
    ];

    console.log('Ensuring default Donors exist...');
    for (const donor of donorsToSeed) {
        const exists = await db.getAllAsync<{ id: number }>(`SELECT id FROM donors WHERE phone = ?`, [donor[1] as string]);
        if (exists.length === 0) {
            await db.runAsync(
                `INSERT INTO donors(name, phone, blood_group, city, gender, age) VALUES (?, ?, ?, ?, ?, ?)`,
                donor
            );
        }
    }

    // Seed Helpline Requests
    const helplinesToSeed = [
        ['Rajesh Khanna', 'A+', 2, 'City Trauma Center', 'Bengaluru', '9555511111', 'critical', helplineId],
        ['Meena Kumari', 'O-', 3, 'Apollo Hospital', 'Hyderabad', '9555522222', 'urgent', helplineId]
    ];

    console.log('Ensuring default Helpline Requests exist...');
    for (const hl of helplinesToSeed) {
        const exists = await db.getAllAsync<{ id: number }>(`SELECT id FROM helpline_requests WHERE patient_name = ? AND attender_contact = ?`, [hl[0] as string, hl[5] as string]);
        if (exists.length === 0) {
            await db.runAsync(
                `INSERT INTO helpline_requests(patient_name, blood_group, units_required, hospital, city, attender_contact, urgency, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                hl
            );
        }
    }
}
