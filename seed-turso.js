require('dotenv').config();
const crypto = require('crypto');

const url = process.env.EXPO_PUBLIC_TURSO_DB_URL.replace('libsql://', 'https://');
const token = process.env.EXPO_PUBLIC_TURSO_DB_AUTH_TOKEN;

function uuid() {
    return crypto.randomUUID();
}

// ─── Pre-generate stable UUIDs for all entities so we can reference them ───
const userIds = {
    admin: uuid(),
    manager: uuid(),
    hr: uuid(),
    outreach: uuid(),
    volunteer: uuid(),
    helpline: uuid(),
};

const eventIds = {
    annualDrive: uuid(),
    communityCamp: uuid(),
    winterDrive: uuid(),
    summerCamp: uuid(),
    corporateDrive: uuid(),
};

const leadIds = {
    dps: uuid(),
    google: uuid(),
};

// Working Unsplash image URLs for events (blood donation / medical themed)
const EVENT_IMAGES = [
    'https://images.unsplash.com/photo-1615461066841-6116ecaaba7f?q=80&w=1000&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1536856492745-59699b353c7c?q=80&w=1000&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1542884748-2b87b36c6b90?q=80&w=1000&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1579154204601-01588f351e67?q=80&w=1000&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1631815588090-d4bfec5b1ccb?q=80&w=1000&auto=format&fit=crop',
];

// Working avatar URLs (professional portraits)
const AVATAR_URLS = {
    admin: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=300&auto=format&fit=crop',
    manager: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=300&auto=format&fit=crop',
    hr: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=300&auto=format&fit=crop',
    outreach: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=300&auto=format&fit=crop',
    volunteer: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=300&auto=format&fit=crop',
    helpline: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=300&auto=format&fit=crop',
};

function mapArg(v) {
    if (v === null || v === undefined) return { type: 'null', value: null };
    if (typeof v === 'number') {
        if (Number.isInteger(v)) return { type: 'integer', value: String(v) };
        return { type: 'float', value: String(v) };
    }
    return { type: 'text', value: String(v) };
}

function stmt(sql, args = []) {
    return { type: 'execute', stmt: { sql, args: args.map(mapArg) } };
}

async function run() {
    console.log('🌱 Seeding Turso database:', url);

    const requests = [];

    // ─── 1. Users ───────────────────────────────────────────────────────
    const users = [
        [userIds.admin, 'Admin User', 'admin@bloodconnect.org', '9999900001', 'admin123', 'admin', AVATAR_URLS.admin],
        [userIds.manager, 'Rahul Sharma', 'manager@bloodconnect.org', '9999900002', 'manager123', 'manager', AVATAR_URLS.manager],
        [userIds.hr, 'Priya Nair', 'hr@bloodconnect.org', '9999900003', 'hr123', 'hr', AVATAR_URLS.hr],
        [userIds.outreach, 'Arjun Mehta', 'outreach@bloodconnect.org', '9999900004', 'outreach123', 'outreach', AVATAR_URLS.outreach],
        [userIds.volunteer, 'Sneha Patel', 'volunteer@bloodconnect.org', '9999900005', 'volunteer123', 'volunteer', AVATAR_URLS.volunteer],
        [userIds.helpline, 'Vikram Das', 'helpline@bloodconnect.org', '9999900006', 'helpline123', 'helpline', AVATAR_URLS.helpline],
    ];

    for (const u of users) {
        requests.push(stmt(
            `INSERT INTO users(id, name, email, phone, password_hash, role, avatar_url) VALUES(?, ?, ?, ?, ?, ?, ?)`,
            u
        ));
    }

    // ─── 2. Events (with working images!) ───────────────────────────────
    const events = [
        [eventIds.annualDrive, 'Annual Blood Drive', 'Infosys Ltd.', 'Sameer Kumar', '9888811111', null, 'Electronic City Phase 1', 'Bengaluru', null, null, '2026-11-15', '10:00 AM', 100, 0, 'lead_received', userIds.manager, 'Annual corporate blood drive organized by Infosys CSR team.', 0, EVENT_IMAGES[0]],
        [eventIds.communityCamp, 'Community Donation Camp', 'Rotary Club South', 'Anita Desai', '9888822222', 'anita@rotary.org', 'Indiranagar Club', 'Bengaluru', 'Sankalp Blood Bank', '080-23456789', '2026-10-20', '9:00 AM', 50, 0, 'contacting_poc', userIds.manager, 'Community camp in partnership with local Rotary chapter.', 0, EVENT_IMAGES[1]],
        [eventIds.winterDrive, 'Winter Blood Drive', 'TCS Adibatla', 'Rohit Varma', '9888833333', null, 'TCS Synergy Park', 'Hyderabad', 'Red Cross Blood Bank', '040-12345678', '2026-01-10', '11:00 AM', 120, 108, 'closed', userIds.manager, 'Successful winter drive — 108 units collected.', 1, EVENT_IMAGES[2]],
        [eventIds.summerCamp, 'Summer Camp 2025', 'IIT Delhi', 'Prof. Kumar', '9888844444', null, 'Hauz Khas', 'Delhi', null, null, '2025-06-15', '10:00 AM', 80, 72, 'closed', userIds.manager, 'College campus drive with 72 units donated.', 1, EVENT_IMAGES[3]],
        [eventIds.corporateDrive, 'Corporate Drive', 'Zomato HQ', 'Deepinder', '9888855555', null, 'Gurugram', 'Gurugram', null, null, '2025-08-20', '9:30 AM', 100, 95, 'closed', userIds.manager, 'Zomato HR-organized drive — 95 units.', 1, EVENT_IMAGES[4]],
    ];

    for (const e of events) {
        requests.push(stmt(
            `INSERT INTO events(id, title, organization_name, poc_name, poc_phone, poc_email, location, city, blood_bank_name, blood_bank_contact, event_date, event_time, expected_donors, actual_donations, status, created_by, notes, followup_done, image_url) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            e
        ));
    }

    // ─── 3. Outreach Leads ──────────────────────────────────────────────
    const leads = [
        [leadIds.dps, 'Delhi Public School', 'Mrs. Gupta', '9777711111', null, 'Awareness about blood donation among students', 'Annual Day', 'awareness_session', 'school', 'Delhi', 'Mathura Road Campus', 'not_contacted', null, userIds.outreach, null],
        [leadIds.google, 'Google GIDC', 'Karthik Rao', '9777722222', 'karthik@google.com', 'Corporate CSR blood donation camp', null, 'camp', 'corporate', 'Hyderabad', 'HITEC City Office', 'pending', userIds.outreach, userIds.outreach, 'Initial call completed. POC interested.'],
    ];

    for (const l of leads) {
        requests.push(stmt(
            `INSERT INTO outreach_leads(id, organization_name, poc_name, poc_phone, poc_email, purpose, occasion, type, org_category, city, location, status, assigned_to, created_by, notes) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            l
        ));
    }

    // ─── 4. Donors ──────────────────────────────────────────────────────
    const donors = [
        [uuid(), 'Amit Trivedi', '9666611111', null, 'O+', 'Bengaluru', 'Koramangala', null, 0, 1, 'male', 28, null],
        [uuid(), 'Sunita Williams', '9666622222', null, 'B+', 'Mumbai', 'Andheri West', null, 0, 1, 'female', 34, null],
        [uuid(), 'Rajesh Iyer', '9666633333', null, 'A+', 'Bengaluru', 'HSR Layout', '2025-12-01', 3, 1, 'male', 45, null],
        [uuid(), 'Priya Sharma', '9666644444', 'priya.s@gmail.com', 'AB+', 'Delhi', 'Saket', null, 0, 1, 'female', 29, null],
        [uuid(), 'Mohammed Ali', '9666655555', null, 'O-', 'Hyderabad', 'Banjara Hills', '2025-11-15', 5, 1, 'male', 31, null],
        [uuid(), 'Sneha Reddy', '9666666666', null, 'B-', 'Bengaluru', 'Whitefield', null, 0, 1, 'female', 25, null],
        [uuid(), 'Karthik Raj', '9666677777', null, 'A-', 'Chennai', 'T Nagar', '2025-10-20', 2, 1, 'male', 38, null],
        [uuid(), 'Ananya Gupta', '9666688888', 'ananya@yahoo.com', 'AB-', 'Pune', 'Koregaon Park', null, 0, 1, 'female', 27, null],
        [uuid(), 'Suresh Kumar', '9666699999', null, 'O+', 'Bengaluru', 'Jayanagar', '2025-09-05', 12, 1, 'male', 52, null],
        [uuid(), 'Lakshmi Nair', '9666600000', null, 'A+', 'Kochi', 'Ernakulam', '2025-08-10', 4, 1, 'female', 41, null],
        [uuid(), 'Vikram Seth', '9666611223', null, 'B+', 'Bengaluru', 'Indira Nagar', null, 0, 1, 'male', 33, null],
        [uuid(), 'Aditi Rao', '9666622334', null, 'O+', 'Bengaluru', 'Koramangala', null, 0, 1, 'female', 26, null],
        [uuid(), 'Rohan Das', '9666633445', null, 'A-', 'Bengaluru', 'Whitefield', null, 0, 1, 'male', 30, null],
        [uuid(), 'Ishita Sen', '9666644556', 'ishita@outlook.com', 'AB+', 'Bengaluru', 'Jayanagar', null, 0, 1, 'female', 35, null],
        [uuid(), 'Nitin Menon', '9666655667', null, 'O-', 'Delhi', 'Dwarka', '2025-07-20', 8, 1, 'male', 42, null],
        [uuid(), 'Deepa Malik', '9666666778', null, 'B+', 'Mumbai', 'Bandra', '2025-06-15', 6, 1, 'female', 48, null],
        [uuid(), 'Arun Patel', '9666677889', null, 'A+', 'Ahmedabad', 'Bodakdev', null, 0, 1, 'male', 55, null],
        [uuid(), 'Sania Mirza', '9666688990', null, 'O+', 'Hyderabad', 'Jubilee Hills', null, 0, 1, 'female', 32, null],
    ];

    for (const d of donors) {
        requests.push(stmt(
            `INSERT INTO donors(id, name, phone, email, blood_group, city, location, last_donation_date, total_donations, is_available, gender, age, event_id) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            d
        ));
    }

    // ─── 5. Helpline Requests ───────────────────────────────────────────
    const helplines = [
        [uuid(), 'Rajesh Khanna', 'A+', 'whole_blood', 2, 'City Trauma Center', 'Bengaluru', 'Sunita Khanna', '9555511111', 'critical', '2026-03-05', 1, 'open', userIds.helpline, 'Patient in ICU, needs 2 units urgently.', 55, 'ICU Ward 3', 'MG Road, Bengaluru', 'emergency'],
        [uuid(), 'Meena Kumari', 'O-', 'whole_blood', 3, 'Apollo Hospital', 'Hyderabad', 'Ram Kumar', '9555522222', 'urgent', '2026-03-10', 1, 'in_progress', userIds.helpline, 'Scheduled surgery, 3 units needed.', 40, 'Ward B2', 'Jubilee Hills, Hyderabad', 'scheduled'],
    ];

    for (const h of helplines) {
        requests.push(stmt(
            `INSERT INTO helpline_requests(id, patient_name, blood_group, blood_component, units_required, hospital, city, attender_name, attender_contact, urgency, required_till, is_live, status, created_by, notes, patient_age, ward_details, address, case_type) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            h
        ));
    }

    // ─── 6. Event Volunteers (link volunteers to closed events) ─────────
    const closedEventIds = [eventIds.winterDrive, eventIds.summerCamp, eventIds.corporateDrive];
    for (const eid of closedEventIds) {
        requests.push(stmt(
            `INSERT INTO event_volunteers(id, event_id, volunteer_id, role_in_event, status) VALUES(?, ?, ?, ?, ?)`,
            [uuid(), eid, userIds.outreach, 'Coordinator', 'attended']
        ));
        requests.push(stmt(
            `INSERT INTO event_volunteers(id, event_id, volunteer_id, role_in_event, status) VALUES(?, ?, ?, ?, ?)`,
            [uuid(), eid, userIds.volunteer, 'Volunteer', 'attended']
        ));
    }

    // Close the pipeline
    requests.push({ type: 'close' });

    try {
        const res = await fetch(`${url}/v2/pipeline`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ requests }),
        });

        const json = await res.json();
        const errors = json.results?.filter(r => r.type === 'error');
        if (errors?.length) {
            console.error(`❌ ${errors.length} errors:`);
            errors.forEach((e, i) => console.error(`  ${i + 1}. ${e.error.message}`));
        } else {
            const count = json.results?.filter(r => r.type === 'ok').length || 0;
            console.log(`✅ Seeded successfully! ${count} statements executed.`);
            console.log(`   📋 ${users.length} users`);
            console.log(`   📅 ${events.length} events (with images)`);
            console.log(`   🎯 ${leads.length} outreach leads`);
            console.log(`   🩸 ${donors.length} donors`);
            console.log(`   🆘 ${helplines.length} helpline requests`);
            console.log(`   👥 ${closedEventIds.length * 2} event volunteer links`);
        }
    } catch (e) {
        console.error('❌ Seed failed:', e);
    }
}

run();
