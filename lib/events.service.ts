import { execute, query } from './database';
import { generateUniqueId } from './id';

export interface Event {
    id: number;
    title: string;
    organization_name: string;
    poc_name: string;
    poc_phone: string;
    poc_email: string;
    location: string;
    city: string;
    blood_bank_name: string;
    blood_bank_contact: string;
    event_date: string;
    event_time: string;
    expected_donors: number;
    actual_donations: number;
    status: string;
    created_by: number;
    notes: string;
    image_url?: string;
    followup_done: number;
    created_at: string;
    updated_at: string;
    creator_name?: string;
}

export const EVENT_STATUSES = [
    { key: 'lead_received', label: 'Lead Received', step: 1 },
    { key: 'contacting_poc', label: 'Contacting POC', step: 2 },
    { key: 'booking_blood_bank', label: 'Booking Blood Bank', step: 3 },
    { key: 'floating_volunteers', label: 'Floating Volunteers', step: 4 },
    { key: 'camp_completed', label: 'Camp Completed', step: 5 },
    { key: 'post_camp_followup', label: 'Post-Camp Follow-up', step: 6 },
    { key: 'closed', label: 'Closed', step: 7 },
];

export async function getAllEvents(): Promise<Event[]> {
    const result = await query(`
        SELECT e.*, u.name as creator_name 
        FROM events e 
        LEFT JOIN users u ON e.created_by = u.id 
        ORDER BY e.created_at DESC
    `);
    const events = result.rows as unknown as Event[];
    console.log(`📱 Local DB Content: ${events.length} events found.`);
    events.forEach(e => console.log(`   └─ [#${e.id}] ${e.title} (${e.organization_name}) - Sync: ${!!e.image_url ? 'Has Image' : 'No Image'}`));
    return events;
}

export async function getEventsByManager(userId: number): Promise<Event[]> {
    const result = await query(`
        SELECT e.*, u.name as creator_name 
        FROM events e 
        LEFT JOIN users u ON e.created_by = u.id 
        WHERE e.created_by = ?
        ORDER BY e.created_at DESC
    `, [userId]);
    return result.rows as unknown as Event[];
}

export async function getEventById(id: number): Promise<Event | null> {
    const result = await query(`
        SELECT e.*, u.name as creator_name 
        FROM events e 
        LEFT JOIN users u ON e.created_by = u.id 
        WHERE e.id = ?
    `, [id]);
    if (result.rows.length === 0) return null;
    return result.rows[0] as unknown as Event;
}

export async function createEvent(data: Partial<Event> & { created_by: number }): Promise<number> {
    const newId = generateUniqueId();
    await execute(`
        INSERT INTO events (
            id, title, organization_name, poc_name, poc_phone, poc_email,
            location, city, blood_bank_name, blood_bank_contact,
            event_date, event_time, expected_donors, created_by, notes, image_url, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'lead_received')
    `, [
        newId,
        data.title, data.organization_name, data.poc_name, data.poc_phone,
        data.poc_email || '', data.location, data.city || '', data.blood_bank_name || '',
        data.blood_bank_contact || '', data.event_date || '', data.event_time || '',
        data.expected_donors || 0, data.created_by, data.notes || '', data.image_url || ''
    ]);
    return newId;
}

export async function updateEvent(id: number, data: Partial<Event>, userId: number, isAdmin: boolean): Promise<boolean> {
    // Only creator or admin can edit
    const event = await getEventById(id);
    if (!event) return false;
    if (!isAdmin && event.created_by !== userId) return false;

    const keys = Object.keys(data).filter(
        k => !['id', 'created_by', 'created_at', 'updated_at', 'creator_name'].includes(k)
    );
    const fields = keys.map(k => `${k} = ?`).join(', ');
    const values = keys.map(k => (data as any)[k] === undefined ? null : (data as any)[k]);

    const sqlStr = `UPDATE events SET ${fields}, updated_at = datetime('now') WHERE id = ?`;
    console.log("UPDATE EVENT SQL:", sqlStr, "VALUES:", [...values, id]);

    await execute(sqlStr, [...values, id]);
    return true;
}

export async function advanceEventStatus(id: number, newStatus: string, userId: number, isAdmin: boolean): Promise<boolean> {
    return updateEvent(id, { status: newStatus } as any, userId, isAdmin);
}

export async function updateDonationCount(id: number, count: number, userId: number, isAdmin: boolean): Promise<boolean> {
    return updateEvent(id, { actual_donations: count } as any, userId, isAdmin);
}

// Volunteer requirements for events
export async function addVolunteerToEvent(eventId: number, volunteerId: number, role: string): Promise<void> {
    await execute(
        'INSERT OR IGNORE INTO event_volunteers (event_id, volunteer_id, role_in_event) VALUES (?, ?, ?)',
        [eventId, volunteerId, role]
    );
}

export async function getEventVolunteers(eventId: number): Promise<any[]> {
    const result = await query(`
        SELECT ev.*, u.name, u.phone, u.email
        FROM event_volunteers ev
        JOIN users u ON ev.volunteer_id = u.id
        WHERE ev.event_id = ?
    `, [eventId]);
    return result.rows as any[];
}

// Reimbursements
export async function createReimbursement(data: {
    event_id: number;
    volunteer_id: number;
    amount: number;
    description: string;
}): Promise<void> {
    await execute(
        'INSERT INTO reimbursements (event_id, volunteer_id, amount, description) VALUES (?, ?, ?, ?)',
        [data.event_id, data.volunteer_id, data.amount, data.description]
    );
}

export async function getReimbursements(eventId?: number): Promise<any[]> {
    const sql = eventId
        ? `SELECT r.*, u.name as volunteer_name, e.title as event_title 
           FROM reimbursements r 
           JOIN users u ON r.volunteer_id = u.id 
           JOIN events e ON r.event_id = e.id 
           WHERE r.event_id = ?`
        : `SELECT r.*, u.name as volunteer_name, e.title as event_title 
           FROM reimbursements r 
           JOIN users u ON r.volunteer_id = u.id 
           JOIN events e ON r.event_id = e.id 
           ORDER BY r.created_at DESC`;
    const result = await query(sql, eventId ? [eventId] : []);
    return result.rows as any[];
}

export async function updateReimbursementStatus(id: number, status: string, approvedBy: number): Promise<void> {
    await execute(
        `UPDATE reimbursements SET status = ?, approved_by = ?, updated_at = datetime('now') WHERE id = ?`,
        [status, approvedBy, id]
    );
}

export async function deleteEvent(id: number, userId: number, isAdmin: boolean): Promise<boolean> {
    const event = await getEventById(id);
    if (!event) return false;
    if (!isAdmin && event.created_by !== userId) return false;

    await execute('DELETE FROM events WHERE id = ?', [id]);
    return true;
}
