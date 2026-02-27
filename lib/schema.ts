import { type SQLiteDatabase } from 'expo-sqlite';
import { hashPassword } from './crypto';
import { generateUniqueId } from './id';

export async function initializeSchema(db: SQLiteDatabase) {
    console.log('Creating users table...');
    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            phone TEXT,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('admin','manager','hr','outreach','volunteer','helpline','donor')),
            is_active INTEGER DEFAULT 1,
            avatar_url TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );
    `);

    console.log('Creating events table...');
    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS events (
            id TEXT PRIMARY KEY,
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
            created_by TEXT REFERENCES users(id),
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
            id TEXT PRIMARY KEY,
            event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
            volunteer_id TEXT REFERENCES users(id),
            role_in_event TEXT,
            status TEXT DEFAULT 'pending' CHECK(status IN('pending', 'confirmed', 'attended', 'absent')),
            created_at TEXT DEFAULT(datetime('now'))
        );
    `);

    console.log('Creating reimbursements table...');
    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS reimbursements(
            id TEXT PRIMARY KEY,
            event_id TEXT REFERENCES events(id),
            volunteer_id TEXT REFERENCES users(id),
            amount REAL NOT NULL,
            description TEXT,
            receipt_url TEXT,
            status TEXT DEFAULT 'pending' CHECK(status IN('pending', 'approved', 'rejected')),
            approved_by TEXT REFERENCES users(id),
            created_at TEXT DEFAULT(datetime('now')),
            updated_at TEXT DEFAULT(datetime('now'))
        );
    `);

    console.log('Creating schedules table...');
    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS schedules(
            id TEXT PRIMARY KEY,
            user_id TEXT REFERENCES users(id),
            date TEXT NOT NULL,
            start_time TEXT,
            end_time TEXT,
            activity TEXT,
            event_id TEXT REFERENCES events(id),
            is_locked INTEGER DEFAULT 0,
            created_at TEXT DEFAULT(datetime('now'))
        );
    `);

    console.log('Creating schedule_settings table...');
    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS schedule_settings(
            id TEXT PRIMARY KEY,
            user_id TEXT REFERENCES users(id) UNIQUE,
            editing_enabled INTEGER DEFAULT 1,
            locked_by TEXT REFERENCES users(id),
            locked_at TEXT
        );
    `);

    console.log('Creating outreach_leads table...');
    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS outreach_leads(
            id TEXT PRIMARY KEY,
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
            assigned_to TEXT REFERENCES users(id),
            created_by TEXT REFERENCES users(id),
            notes TEXT,
            created_at TEXT DEFAULT(datetime('now')),
            updated_at TEXT DEFAULT(datetime('now'))
        );
    `);

    console.log('Creating outreach_interactions table...');
    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS outreach_interactions(
            id TEXT PRIMARY KEY,
            lead_id TEXT REFERENCES outreach_leads(id) ON DELETE CASCADE,
            user_id TEXT REFERENCES users(id),
            interaction_type TEXT,
            notes TEXT,
            created_at TEXT DEFAULT(datetime('now'))
        );
    `);

    console.log('Creating donors table...');
    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS donors(
            id TEXT PRIMARY KEY,
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
            event_id TEXT REFERENCES events(id),
            created_at TEXT DEFAULT(datetime('now')),
            updated_at TEXT DEFAULT(datetime('now'))
        );
    `);

    console.log('Creating helpline_requests table...');
    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS helpline_requests(
            id TEXT PRIMARY KEY,
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
            created_by TEXT REFERENCES users(id),
            notes TEXT,
            created_at TEXT DEFAULT(datetime('now')),
            updated_at TEXT DEFAULT(datetime('now')),
            patient_age INTEGER,
            ward_details TEXT,
            address TEXT,
            case_type TEXT DEFAULT 'emergency' CHECK(case_type IN('emergency', 'scheduled'))
        );
    `);

    console.log('Creating helpline_assignments table...');
    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS helpline_assignments(
            id TEXT PRIMARY KEY,
            helpline_id TEXT REFERENCES helpline_requests(id) ON DELETE CASCADE,
            volunteer_id TEXT REFERENCES users(id),
            assigned_at TEXT DEFAULT(datetime('now')),
            status TEXT DEFAULT 'active' CHECK(status IN('active', 'completed', 'reassigned'))
        );
    `);

    console.log('Creating call_logs table...');
    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS call_logs(
            id TEXT PRIMARY KEY,
            helpline_id TEXT REFERENCES helpline_requests(id),
            volunteer_id TEXT REFERENCES users(id),
            donor_id TEXT REFERENCES donors(id),
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
            id TEXT PRIMARY KEY,
            user_id TEXT REFERENCES users(id),
            title TEXT NOT NULL,
            body TEXT NOT NULL,
            type TEXT,
            reference_id TEXT,
            is_read INTEGER DEFAULT 0,
            created_at TEXT DEFAULT(datetime('now'))
        );
    `);
}

export async function seedDefaultUsers(db: SQLiteDatabase) {
    const users = [
        ['Admin User', 'admin@bloodconnect.org', '9999900001', 'admin123', 'admin', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=300&auto=format&fit=crop'],
        ['Rahul Sharma', 'manager@bloodconnect.org', '9999900002', 'manager123', 'manager', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=300&auto=format&fit=crop'],
        ['Priya Nair', 'hr@bloodconnect.org', '9999900003', 'hr123', 'hr', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=300&auto=format&fit=crop'],
        ['Arjun Mehta', 'outreach@bloodconnect.org', '9999900004', 'outreach123', 'outreach', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=300&auto=format&fit=crop'],
        ['Sneha Patel', 'volunteer@bloodconnect.org', '9999900005', 'volunteer123', 'volunteer', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=300&auto=format&fit=crop'],
        ['Vikram Das', 'helpline@bloodconnect.org', '9999900006', 'helpline123', 'helpline', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=300&auto=format&fit=crop']
    ];

    console.log('Ensure default users exist and have updated avatars...');
    for (const [name, email, phone, plainPassword, role, avatar_url] of users) {
        const hashedPassword = await hashPassword(plainPassword);
        // Try inserting first
        await db.runAsync(
            `INSERT OR IGNORE INTO users(id, name, email, phone, password_hash, role, avatar_url) VALUES(?, ?, ?, ?, ?, ?, ?)`,
            [generateUniqueId(), name, email, phone, hashedPassword, role, avatar_url]
        );
        // Force update avatar_url to match the latest seeded values
        await db.runAsync(
            `UPDATE users SET avatar_url = ? WHERE email = ?`,
            [avatar_url, email]
        );
        // Also update password if it changed (mostly for dev/seeding updates)
        await db.runAsync(
            `UPDATE users SET password_hash = ? WHERE email = ?`,
            [hashedPassword, email]
        );
    }
}

export async function seedInitialData(db: SQLiteDatabase) {
    const getUserId = async (email: string) => {
        const res = await db.getAllAsync<{ id: string }>(`SELECT id FROM users WHERE email = ?`, [email]);
        return res[0]?.id;
    };

    const managerId = await getUserId('manager@bloodconnect.org');
    const outreachId = await getUserId('outreach@bloodconnect.org');
    const helplineId = await getUserId('helpline@bloodconnect.org');

    if (!managerId || !outreachId || !helplineId) {
        console.log('Skipping initial data seeding: Required users not found.');
        return;
    }

    // Seed Events (with working image URLs)
    const eventsToSeed = [
        ['Annual Blood Drive', 'Infosys Ltd.', 'Sameer Kumar', '9888811111', 'Electronic City Phase 1', 'Bengaluru', 'lead_received', managerId, '2026-11-15', 100, 'https://images.unsplash.com/photo-1615461066841-6116ecaaba7f?q=80&w=1000&auto=format&fit=crop'],
        ['Community Donation Camp', 'Rotary Club South', 'Anita Desai', '9888822222', 'Indiranagar Club', 'Bengaluru', 'contacting_poc', managerId, '2026-10-20', 50, 'https://images.unsplash.com/photo-1536856492745-59699b353c7c?q=80&w=1000&auto=format&fit=crop'],
        ['Winter Blood Drive', 'TCS Adibatla', 'Rohit Varma', '9888833333', 'TCS Synergy Park', 'Hyderabad', 'closed', managerId, '2026-01-10', 120, 'https://images.unsplash.com/photo-1542884748-2b87b36c6b90?q=80&w=1000&auto=format&fit=crop']
    ];

    console.log('Ensuring default Events exist...');
    for (const evt of eventsToSeed) {
        const exists = await db.getAllAsync<{ id: string }>(`SELECT id FROM events WHERE title = ? AND organization_name = ?`, [evt[0] as string, evt[1] as string]);
        if (exists.length === 0) {
            await db.runAsync(
                `INSERT INTO events(id, title, organization_name, poc_name, poc_phone, location, city, status, created_by, event_date, expected_donors, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [generateUniqueId(), ...evt]
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
        const exists = await db.getAllAsync<{ id: string }>(`SELECT id FROM outreach_leads WHERE organization_name = ? AND poc_name = ?`, [lead[0] as string, lead[1] as string]);
        if (exists.length === 0) {
            await db.runAsync(
                `INSERT INTO outreach_leads(id, organization_name, poc_name, poc_phone, type, org_category, city, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [generateUniqueId(), ...lead]
            );
        }
    }

    // Seed Donors
    const donorsToSeed = [
        ['Amit Trivedi', '9666611111', 'O+', 'Bengaluru', 'male', 28],
        ['Sunita Williams', '9666622222', 'B+', 'Mumbai', 'female', 34],
        ['Rajesh Iyer', '9666633333', 'A+', 'Bengaluru', 'male', 45],
        ['Priya Sharma', '9666644444', 'AB+', 'Delhi', 'female', 29],
        ['Mohammed Ali', '9666655555', 'O-', 'Hyderabad', 'male', 31],
        ['Sneha Reddy', '9666666666', 'B-', 'Bengaluru', 'female', 25],
        ['Karthik Raj', '9666677777', 'A-', 'Chennai', 'male', 38],
        ['Ananya Gupta', '9666688888', 'AB-', 'Pune', 'female', 27],
        ['Suresh Kumar', '9666699999', 'O+', 'Bengaluru', 'male', 52],
        ['Lakshmi Nair', '9666600000', 'A+', 'Kochi', 'female', 41],
        ['Vikram Seth', '9666611223', 'B+', 'Indira Nagar, Bengaluru', 'male', 33],
        ['Aditi Rao', '9666622334', 'O+', 'Koramangala, Bengaluru', 'female', 26],
        ['Rohan Das', '9666633445', 'A-', 'Whitefield, Bengaluru', 'male', 30],
        ['Ishita Sen', '9666644556', 'AB+', 'Jayanagar, Bengaluru', 'female', 35],
        ['Nitin Gadkari', '9666655667', 'O-', 'Delhi', 'male', 62],
        ['Deepa Malik', '9666666778', 'B+', 'Mumbai', 'female', 48],
        ['Arun Jaitley', '9666677889', 'A+', 'Ahmedabad', 'male', 55],
        ['Sania Mirza', '9666688990', 'O+', 'Hyderabad', 'female', 32]
    ];

    console.log('Ensuring default Donors exist...');
    for (const donor of donorsToSeed) {
        const exists = await db.getAllAsync<{ id: string }>(`SELECT id FROM donors WHERE phone = ?`, [donor[1] as string]);
        if (exists.length === 0) {
            await db.runAsync(
                `INSERT INTO donors(id, name, phone, blood_group, city, gender, age) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [generateUniqueId(), ...donor]
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
        const exists = await db.getAllAsync<{ id: string }>(`SELECT id FROM helpline_requests WHERE patient_name = ? AND attender_contact = ?`, [hl[0] as string, hl[5] as string]);
        if (exists.length === 0) {
            await db.runAsync(
                `INSERT INTO helpline_requests(id, patient_name, blood_group, units_required, hospital, city, attender_contact, urgency, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [generateUniqueId(), ...hl]
            );
        }
    }
}

export async function seedExperience(db: SQLiteDatabase) {
    const getUserId = async (email: string) => {
        const res = await db.getAllAsync<{ id: string }>(`SELECT id FROM users WHERE email = ?`, [email]);
        return res[0]?.id;
    };

    const outreachId = await getUserId('outreach@bloodconnect.org');
    const volunteerId = await getUserId('volunteer@bloodconnect.org');
    const managerId = await getUserId('manager@bloodconnect.org');

    if (!outreachId || !volunteerId) return;

    // 1. Ensure some closed events for "Experience"
    const closedEvents = [
        ['Summer Camp 2025', 'IIT Delhi', 'Prof. Kumar', '9888844444', 'Hauz Khas', 'Delhi', 'closed', managerId, '2025-06-15', 80, 72, 'https://images.unsplash.com/photo-1579154204601-01588f351e67?q=80&w=1000&auto=format&fit=crop'],
        ['Corporate Drive', 'Zomato HQ', 'Deepinder', '9888855555', 'Gurugram', 'Gurugram', 'closed', managerId, '2025-08-20', 100, 95, 'https://images.unsplash.com/photo-1631815588090-d4bfec5b1ccb?q=80&w=1000&auto=format&fit=crop']
    ];

    for (const evt of closedEvents) {
        const exists = await db.getAllAsync<{ id: string }>(`SELECT id FROM events WHERE title = ?`, [evt[0] as string]);
        if (exists.length === 0) {
            await db.runAsync(
                `INSERT INTO events(id, title, organization_name, poc_name, poc_phone, location, city, status, created_by, event_date, expected_donors, actual_donations, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [generateUniqueId(), ...evt]
            );
        }
    }

    // 2. Link Arjun and Sneha to these events as 'attended'
    const eventIds = await db.getAllAsync<{ id: string }>(`SELECT id FROM events WHERE status = 'closed'`);

    for (const eid of eventIds) {
        // Arjun participated
        await db.runAsync(
            `INSERT OR IGNORE INTO event_volunteers(id, event_id, volunteer_id, status, role_in_event) VALUES (?, ?, ?, 'attended', 'Coordinator')`,
            [generateUniqueId(), eid.id, outreachId]
        );
        // Sneha participated
        await db.runAsync(
            `INSERT OR IGNORE INTO event_volunteers(id, event_id, volunteer_id, status, role_in_event) VALUES (?, ?, ?, 'attended', 'Volunteer')`,
            [generateUniqueId(), eid.id, volunteerId]
        );
    }
}

