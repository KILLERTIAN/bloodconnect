require('dotenv').config();
const url = process.env.EXPO_PUBLIC_TURSO_DB_URL.replace('libsql://', 'https://');
const token = process.env.EXPO_PUBLIC_TURSO_DB_AUTH_TOKEN;

async function run() {
    console.log("Creating tables on:", url);
    const body = {
        requests: [
            {
                type: 'execute', stmt: {
                    sql: `
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    phone TEXT,
                    password_hash TEXT NOT NULL,
                    role TEXT NOT NULL CHECK(role IN ('admin','manager','hr','outreach','volunteer','helpline')),
                    is_active INTEGER DEFAULT 1,
                    avatar_url TEXT,
                    created_at TEXT DEFAULT (datetime('now')),
                    updated_at TEXT DEFAULT (datetime('now'))
                );
            `}
            },
            {
                type: 'execute', stmt: {
                    sql: `
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
            `}
            },
            {
                type: 'execute', stmt: {
                    sql: `
                CREATE TABLE IF NOT EXISTS event_volunteers(
                    id TEXT PRIMARY KEY,
                    event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
                    volunteer_id TEXT REFERENCES users(id),
                    role_in_event TEXT,
                    status TEXT DEFAULT 'pending' CHECK(status IN('pending', 'confirmed', 'attended', 'absent')),
                    created_at TEXT DEFAULT(datetime('now'))
                );
            `}
            },
            {
                type: 'execute', stmt: {
                    sql: `
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
            `}
            },
            {
                type: 'execute', stmt: {
                    sql: `
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
            `}
            },
            {
                type: 'execute', stmt: {
                    sql: `
                CREATE TABLE IF NOT EXISTS schedule_settings(
                    id TEXT PRIMARY KEY,
                    user_id TEXT REFERENCES users(id) UNIQUE,
                    editing_enabled INTEGER DEFAULT 1,
                    locked_by TEXT REFERENCES users(id),
                    locked_at TEXT
                );
            `}
            },
            {
                type: 'execute', stmt: {
                    sql: `
                CREATE TABLE IF NOT EXISTS outreach_leads(
                    id TEXT PRIMARY KEY,
                    organization_name TEXT NOT NULL,
                    poc_name TEXT NOT NULL,
                    poc_phone TEXT NOT NULL,
                    poc_email TEXT,
                    purpose TEXT,
                    occasion TEXT,
                    type TEXT CHECK(type IN('camp', 'awareness_session')),
                    org_category TEXT CHECK(org_category IN('school', 'college', 'corporate', 'ngo', 'hospital', 'other')),
                    city TEXT NOT NULL,
                    location TEXT,
                    status TEXT DEFAULT 'not_contacted' CHECK(status IN('not_contacted', 'pending', 'successful', 'cancelled')),
                    assigned_to TEXT REFERENCES users(id),
                    created_by TEXT REFERENCES users(id),
                    notes TEXT,
                    created_at TEXT DEFAULT(datetime('now')),
                    updated_at TEXT DEFAULT(datetime('now'))
                );
            `}
            },
            {
                type: 'execute', stmt: {
                    sql: `
                CREATE TABLE IF NOT EXISTS outreach_interactions(
                    id TEXT PRIMARY KEY,
                    lead_id TEXT REFERENCES outreach_leads(id) ON DELETE CASCADE,
                    user_id TEXT REFERENCES users(id),
                    interaction_type TEXT,
                    notes TEXT,
                    interaction_date TEXT DEFAULT(datetime('now'))
                );
            `}
            },
            {
                type: 'execute', stmt: {
                    sql: `
                CREATE TABLE IF NOT EXISTS donors(
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    phone TEXT NOT NULL,
                    email TEXT,
                    blood_group TEXT NOT NULL,
                    city TEXT NOT NULL,
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
            `}
            },
            {
                type: 'execute', stmt: {
                    sql: `
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
            `}
            },
            {
                type: 'execute', stmt: {
                    sql: `
                CREATE TABLE IF NOT EXISTS helpline_assignments(
                    id TEXT PRIMARY KEY,
                    helpline_id TEXT REFERENCES helpline_requests(id) ON DELETE CASCADE,
                    volunteer_id TEXT REFERENCES users(id),
                    assigned_at TEXT DEFAULT(datetime('now')),
                    status TEXT DEFAULT 'active' CHECK(status IN('active', 'completed', 'reassigned'))
                );
            `}
            },
            {
                type: 'execute', stmt: {
                    sql: `
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
            `}
            },
            {
                type: 'execute', stmt: {
                    sql: `
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
            `}
            },
            { type: 'close' }
        ]
    };

    try {
        const res = await fetch(`${url}/v2/pipeline`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });
        const text = await res.json();
        const errors = text.results?.filter(r => r.type === 'error');
        if (errors?.length) console.error("Errors:", JSON.stringify(errors, null, 2));
        else console.log("Created all tables successfully!");
    } catch (e) {
        console.error("Error:", e);
    }
}
run();
