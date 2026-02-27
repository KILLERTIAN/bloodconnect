const fs = require('fs');
const path = require('path');

// 1. Load .env manually for simple node usage
const envPath = path.join(__dirname, '..', '.env');
const env = fs.readFileSync(envPath, 'utf8')
    .split('\n')
    .reduce((acc, line) => {
        const [key, value] = line.split('=');
        if (key && value) acc[key.trim()] = value.trim();
        return acc;
    }, {});

const TURSO_URL = env.EXPO_PUBLIC_TURSO_DB_URL;
const TURSO_TOKEN = env.EXPO_PUBLIC_TURSO_DB_AUTH_TOKEN;

if (!TURSO_URL || !TURSO_TOKEN) {
    console.error('❌ Missing Turso configuration in .env');
    process.exit(1);
}

const httpUrl = TURSO_URL.replace('libsql://', 'https://');

const crypto = require('crypto');
const generateId = () => crypto.randomUUID();

async function triggerEmergency(title, body) {
    const id = generateId();
    const payload = {
        requests: [
            {
                type: 'execute',
                stmt: {
                    sql: 'INSERT INTO notifications (id, title, body, type, created_at) VALUES (?, ?, ?, ?, datetime("now"))',
                    args: [
                        { type: 'text', value: id },
                        { type: 'text', value: title },
                        { type: 'text', value: body },
                        { type: 'text', value: 'emergency' }
                    ]
                }
            }
        ]
    };

    console.log(`📡 Sending emergency alert: "${title}"...`);

    try {
        const response = await fetch(`${httpUrl}/v2/pipeline`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${TURSO_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Turso error: ${error}`);
        }

        console.log('✅ Emergency alert successfully pushed to cloud!');
        console.log('📱 All active staff/volunteers will receive this on their next sync.');
    } catch (e) {
        console.error('❌ Failed to trigger alert:', e.message);
    }
}

// Get arguments from command line
const title = process.argv[2] || '🚨 Emergency Blood Request';
const body = process.argv[3] || 'A patient at City General Hospital needs B+ blood immediately.';

triggerEmergency(title, body);
