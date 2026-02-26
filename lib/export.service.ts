import { query } from '@/lib/database';
import * as FileSystem from 'expo-file-system';

// We catch errors during import for native modules that might be missing in stale builds
let Print: any;
let Sharing: any;
try {
    Print = require('expo-print');
    Sharing = require('expo-sharing');
} catch (e) {
    console.warn('⚠️ Native export modules (Print/Sharing) not found. Rebuild may be required.');
}

// ─── CSV Export ──────────────────────────────────────────────────────

function escapeCSV(val: any): string {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

function toCSV(headers: string[], rows: any[]): string {
    const headerLine = headers.map(escapeCSV).join(',');
    const dataLines = rows.map(row =>
        headers.map(h => escapeCSV(row[h])).join(',')
    );
    return [headerLine, ...dataLines].join('\n');
}

async function queryRows(sql: string): Promise<any[]> {
    const result = await query(sql);
    return (result as any)?.rows || result || [];
}

export async function exportEventsCSV() {
    const events = await queryRows(
        'SELECT title, organization_name, poc_name, poc_phone, poc_email, location, city, event_date, event_time, expected_donors, actual_donations, status FROM events ORDER BY event_date DESC'
    );
    const headers = ['title', 'organization_name', 'poc_name', 'poc_phone', 'poc_email', 'location', 'city', 'event_date', 'event_time', 'expected_donors', 'actual_donations', 'status'];
    const csv = toCSV(headers, events);
    await shareCSV('BloodConnect_Events.csv', csv);
}

export async function exportDonorsCSV() {
    const donors = await queryRows(
        'SELECT name, phone, email, blood_group, city, location, last_donation_date, total_donations, gender, age, is_available FROM donors ORDER BY name'
    );
    const headers = ['name', 'phone', 'email', 'blood_group', 'city', 'location', 'last_donation_date', 'total_donations', 'gender', 'age', 'is_available'];
    const csv = toCSV(headers, donors);
    await shareCSV('BloodConnect_Donors.csv', csv);
}

export async function exportHelplineCSV() {
    const cases = await queryRows(
        'SELECT patient_name, blood_group, blood_component, units_required, hospital, city, attender_name, attender_contact, urgency, required_till, status, case_type, patient_age, ward_details FROM helpline_requests ORDER BY created_at DESC'
    );
    const headers = ['patient_name', 'blood_group', 'blood_component', 'units_required', 'hospital', 'city', 'attender_name', 'attender_contact', 'urgency', 'required_till', 'status', 'case_type', 'patient_age', 'ward_details'];
    const csv = toCSV(headers, cases);
    await shareCSV('BloodConnect_Cases.csv', csv);
}

export async function exportOutreachCSV() {
    const leads = await queryRows(
        'SELECT organization_name, poc_name, poc_phone, poc_email, purpose, type, org_category, city, location, status FROM outreach_leads ORDER BY created_at DESC'
    );
    const headers = ['organization_name', 'poc_name', 'poc_phone', 'poc_email', 'purpose', 'type', 'org_category', 'city', 'location', 'status'];
    const csv = toCSV(headers, leads);
    await shareCSV('BloodConnect_Outreach.csv', csv);
}

// ─── PDF Report ──────────────────────────────────────────────────────

export async function exportSummaryPDF() {
    const events = await queryRows('SELECT COUNT(*) as c FROM events');
    const closedEvents = await queryRows("SELECT COUNT(*) as c FROM events WHERE status = 'closed'");
    const totalDonations = await queryRows('SELECT COALESCE(SUM(actual_donations), 0) as c FROM events');
    const donors = await queryRows('SELECT COUNT(*) as c FROM donors');
    const activeCases = await queryRows("SELECT COUNT(*) as c FROM helpline_requests WHERE status IN ('open', 'in_progress')");
    const outreachLeads = await queryRows('SELECT COUNT(*) as c FROM outreach_leads');

    const recentEvents = await queryRows(
        'SELECT title, organization_name, event_date, city, status, actual_donations, expected_donors FROM events ORDER BY event_date DESC LIMIT 10'
    );

    const topDonors = await queryRows(
        'SELECT name, blood_group, city, total_donations FROM donors WHERE total_donations > 0 ORDER BY total_donations DESC LIMIT 10'
    );

    const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const html = `
    <html>
    <head>
        <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 40px; color: #1C1C1E; }
            .header { text-align: center; margin-bottom: 40px; border-bottom: 3px solid #D32F2F; padding-bottom: 20px; }
            .header h1 { color: #D32F2F; font-size: 28px; margin: 0; }
            .header p { color: #8E8E93; margin: 5px 0 0; }
            .stats { display: flex; flex-wrap: wrap; gap: 16px; margin-bottom: 30px; }
            .stat-card { flex: 1; min-width: 120px; background: #F9F9F9; border-radius: 12px; padding: 20px; text-align: center; border-left: 4px solid #D32F2F; }
            .stat-value { font-size: 32px; font-weight: 900; color: #D32F2F; }
            .stat-label { font-size: 12px; color: #8E8E93; text-transform: uppercase; font-weight: 600; letter-spacing: 1px; margin-top: 4px; }
            h2 { color: #1C1C1E; font-size: 18px; border-bottom: 2px solid #E5E5EA; padding-bottom: 8px; margin-top: 30px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
            th { background: #D32F2F; color: #FFFFFF; padding: 10px 8px; text-align: left; font-weight: 700; }
            td { padding: 8px; border-bottom: 1px solid #E5E5EA; }
            tr:nth-child(even) { background: #F9F9F9; }
            .status { display: inline-block; padding: 3px 8px; border-radius: 6px; font-size: 10px; font-weight: 700; text-transform: uppercase; }
            .status-closed { background: #E8F5E9; color: #2E7D32; }
            .status-open { background: #FFF3E0; color: #E65100; }
            .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #E5E5EA; color: #8E8E93; font-size: 11px; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>🩸 BloodConnect</h1>
            <p>Summary Report — ${date}</p>
        </div>

        <div class="stats">
            <div class="stat-card">
                <div class="stat-value">${events[0]?.c || 0}</div>
                <div class="stat-label">Total Events</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${closedEvents[0]?.c || 0}</div>
                <div class="stat-label">Completed</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${totalDonations[0]?.c || 0}</div>
                <div class="stat-label">Units Collected</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${donors[0]?.c || 0}</div>
                <div class="stat-label">Registered Donors</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${activeCases[0]?.c || 0}</div>
                <div class="stat-label">Active Cases</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${outreachLeads[0]?.c || 0}</div>
                <div class="stat-label">Outreach Leads</div>
            </div>
        </div>

        <h2>📅 Recent Events</h2>
        <table>
            <tr><th>Event</th><th>Organization</th><th>Date</th><th>City</th><th>Donors</th><th>Status</th></tr>
            ${recentEvents.map((e: any) => `
                <tr>
                    <td>${e.title || ''}</td>
                    <td>${e.organization_name || ''}</td>
                    <td>${e.event_date || ''}</td>
                    <td>${e.city || ''}</td>
                    <td>${e.actual_donations || 0}/${e.expected_donors || 0}</td>
                    <td><span class="status status-${e.status}">${e.status || ''}</span></td>
                </tr>
            `).join('')}
        </table>

        <h2>🏆 Top Donors</h2>
        <table>
            <tr><th>Name</th><th>Blood Group</th><th>City</th><th>Donations</th></tr>
            ${topDonors.map((d: any) => `
                <tr>
                    <td>${d.name || ''}</td>
                    <td>${d.blood_group || ''}</td>
                    <td>${d.city || ''}</td>
                    <td>${d.total_donations || 0}</td>
                </tr>
            `).join('')}
        </table>

        <div class="footer">
            BloodConnect — Powered by Turso · Generated on ${date}
        </div>
    </body>
    </html>`;

    if (!Print || !Sharing) {
        alert('Data Export is not available in this build. Please rebuild the app.');
        return;
    }
    const { uri } = await Print.printToFileAsync({ html, base64: false });
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'BloodConnect Report' });
}

// ─── Share Helper ────────────────────────────────────────────────────

async function shareCSV(filename: string, content: string) {
    try {
        const fileUri = `${(FileSystem as any).documentDirectory}${filename}`;
        await (FileSystem as any).writeAsStringAsync(fileUri, content, { encoding: (FileSystem as any).EncodingType?.UTF8 || 'utf8' });

        if (Sharing && await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(fileUri, {
                mimeType: 'text/csv',
                dialogTitle: `Export ${filename}`,
                UTI: 'public.comma-separated-values-text'
            });
        }
    } catch (error) {
        console.error('CSV Export Error:', error);
    }
}
