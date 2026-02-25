const fs = require('fs');

const env = fs.readFileSync('.env', 'utf8');
let token = '';
let url = '';
for (const line of env.split('\n')) {
    if (line.startsWith('EXPO_PUBLIC_TURSO_DB_AUTH_TOKEN=')) token = line.split('=')[1];
    if (line.startsWith('EXPO_PUBLIC_TURSO_DB_URL=')) url = line.split('=')[1];
}

const httpUrl = url.replace('libsql://', 'https://');

async function checkRemote() {
    const res = await fetch(`${httpUrl}/v2/pipeline`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            requests: [
                { type: 'execute', stmt: { sql: 'SELECT * FROM helpline_requests' } },
                { type: 'close' }
            ]
        })
    });
    const json = await res.json();
    console.log(JSON.stringify(json.results[0].response.result.rows, null, 2));
}

checkRemote();
