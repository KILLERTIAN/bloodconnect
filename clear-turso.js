require('dotenv').config();
const url = process.env.EXPO_PUBLIC_TURSO_DB_URL.replace('libsql://', 'https://');
const token = process.env.EXPO_PUBLIC_TURSO_DB_AUTH_TOKEN;

async function run() {
    console.log("Connecting to:", url);
    const body = {
        requests: [
            { type: 'execute', stmt: { sql: "PRAGMA foreign_keys = OFF;" } },
            { type: 'execute', stmt: { sql: "DROP TABLE IF EXISTS events;" } },
            { type: 'execute', stmt: { sql: "DROP TABLE IF EXISTS users;" } },
            { type: 'execute', stmt: { sql: "DROP TABLE IF EXISTS event_volunteers;" } },
            { type: 'execute', stmt: { sql: "DROP TABLE IF EXISTS reimbursements;" } },
            { type: 'execute', stmt: { sql: "DROP TABLE IF EXISTS schedules;" } },
            { type: 'execute', stmt: { sql: "DROP TABLE IF EXISTS schedule_settings;" } },
            { type: 'execute', stmt: { sql: "DROP TABLE IF EXISTS outreach_leads;" } },
            { type: 'execute', stmt: { sql: "DROP TABLE IF EXISTS outreach_interactions;" } },
            { type: 'execute', stmt: { sql: "DROP TABLE IF EXISTS donors;" } },
            { type: 'execute', stmt: { sql: "DROP TABLE IF EXISTS helpline_requests;" } },
            { type: 'execute', stmt: { sql: "DROP TABLE IF EXISTS helpline_assignments;" } },
            { type: 'execute', stmt: { sql: "DROP TABLE IF EXISTS call_logs;" } },
            { type: 'execute', stmt: { sql: "DROP TABLE IF EXISTS notifications;" } },
            { type: 'execute', stmt: { sql: "PRAGMA foreign_keys = ON;" } },
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
        const text = await res.text();
        console.log("Response:", text);
    } catch (e) {
        console.error("Error:", e);
    }
}
run();
