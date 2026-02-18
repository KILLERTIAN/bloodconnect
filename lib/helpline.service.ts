import { execute, query } from './database';

export interface HelplineRequest {
    id: number;
    patient_name: string;
    blood_group: string;
    blood_component: string;
    units_required: number;
    hospital: string;
    city: string;
    attender_name: string;
    attender_contact: string;
    urgency: 'critical' | 'urgent' | 'normal';
    required_till: string;
    is_live: number;
    status: 'open' | 'in_progress' | 'fulfilled' | 'closed';
    created_by: number;
    notes: string;
    created_at: string;
    updated_at: string;
    creator_name?: string;
    assigned_volunteer?: string;
}

export interface Donor {
    id: number;
    name: string;
    phone: string;
    email: string;
    blood_group: string;
    city: string;
    location: string;
    last_donation_date: string;
    total_donations: number;
    is_available: number;
    gender: string;
    age: number;
    event_id: number;
    created_at: string;
}

export async function getAllHelplineRequests(): Promise<HelplineRequest[]> {
    const result = await query(`
        SELECT h.*, u.name as creator_name
        FROM helpline_requests h
        LEFT JOIN users u ON h.created_by = u.id
        ORDER BY 
            CASE h.urgency WHEN 'critical' THEN 1 WHEN 'urgent' THEN 2 ELSE 3 END,
            h.created_at DESC
    `);
    return result.rows as unknown as HelplineRequest[];
}

export async function getLiveHelplines(): Promise<HelplineRequest[]> {
    const result = await query(`
        SELECT h.*, u.name as creator_name
        FROM helpline_requests h
        LEFT JOIN users u ON h.created_by = u.id
        WHERE h.is_live = 1 AND h.status IN ('open','in_progress')
        ORDER BY 
            CASE h.urgency WHEN 'critical' THEN 1 WHEN 'urgent' THEN 2 ELSE 3 END,
            h.created_at DESC
    `);
    return result.rows as unknown as HelplineRequest[];
}

export async function createHelplineRequest(data: Partial<HelplineRequest> & { created_by: number }): Promise<number> {
    const result = await execute(`
        INSERT INTO helpline_requests (
            patient_name, blood_group, blood_component, units_required,
            hospital, city, attender_name, attender_contact,
            urgency, required_till, created_by, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
        data.patient_name, data.blood_group, data.blood_component || 'whole_blood',
        data.units_required, data.hospital, data.city, data.attender_name || '',
        data.attender_contact, data.urgency || 'normal', data.required_till || '',
        data.created_by, data.notes || ''
    ]);
    return Number(result.lastInsertRowid);
}

export async function makeHelplineLive(id: number): Promise<void> {
    await execute(
        `UPDATE helpline_requests SET is_live = 1, status = 'in_progress', updated_at = datetime('now') WHERE id = ?`,
        [id]
    );
    // Auto-assign to volunteers fairly
    await autoAssignVolunteers(id);
}

export async function autoAssignVolunteers(helplineId: number): Promise<void> {
    // Get all active volunteers
    const volunteers = await query(
        `SELECT u.id, COUNT(ha.id) as assignment_count
         FROM users u
         LEFT JOIN helpline_assignments ha ON u.id = ha.volunteer_id AND ha.status = 'active'
         WHERE u.role IN ('volunteer', 'helpline') AND u.is_active = 1
         GROUP BY u.id
         ORDER BY assignment_count ASC
         LIMIT 1`
    );

    if (volunteers.rows.length === 0) return;

    const volunteer = volunteers.rows[0] as any;
    await execute(
        'INSERT INTO helpline_assignments (helpline_id, volunteer_id) VALUES (?, ?)',
        [helplineId, volunteer.id]
    );

    // Create notification for volunteer
    const helpline = await query('SELECT * FROM helpline_requests WHERE id = ?', [helplineId]);
    if (helpline.rows.length > 0) {
        const h = helpline.rows[0] as any;
        await execute(
            `INSERT INTO notifications (user_id, title, body, type, reference_id) VALUES (?, ?, ?, ?, ?)`,
            [
                volunteer.id,
                '🩸 New Helpline Assignment',
                `You have been assigned to help ${h.patient_name} - ${h.blood_group} at ${h.hospital}`,
                'helpline',
                helplineId
            ]
        );
    }
}

export async function getAssignedHelplines(volunteerId: number): Promise<any[]> {
    const result = await query(`
        SELECT h.*, ha.assigned_at, ha.status as assignment_status
        FROM helpline_requests h
        JOIN helpline_assignments ha ON h.id = ha.helpline_id
        WHERE ha.volunteer_id = ? AND ha.status = 'active'
        ORDER BY h.created_at DESC
    `, [volunteerId]);
    return result.rows as any[];
}

// Donor database
export async function getDonors(filters?: {
    blood_group?: string;
    city?: string;
    available_only?: boolean;
}): Promise<Donor[]> {
    let sql = 'SELECT * FROM donors WHERE 1=1';
    const args: any[] = [];

    if (filters?.blood_group) { sql += ' AND blood_group = ?'; args.push(filters.blood_group); }
    if (filters?.city) { sql += ' AND city LIKE ?'; args.push(`%${filters.city}%`); }
    if (filters?.available_only) { sql += ' AND is_available = 1'; }

    sql += ' ORDER BY last_donation_date ASC, city ASC';
    const result = await query(sql, args);
    return result.rows as unknown as Donor[];
}

export async function getDonorsForHelpline(helplineId: number): Promise<Donor[]> {
    // Get helpline details first
    const hResult = await query('SELECT * FROM helpline_requests WHERE id = ?', [helplineId]);
    if (hResult.rows.length === 0) return [];
    const h = hResult.rows[0] as any;

    // Get compatible donors sorted by location, blood group match, last donation date
    const result = await query(`
        SELECT * FROM donors
        WHERE blood_group = ? AND is_available = 1
        ORDER BY 
            CASE WHEN city = ? THEN 0 ELSE 1 END,
            last_donation_date ASC
        LIMIT 50
    `, [h.blood_group, h.city]);
    return result.rows as unknown as Donor[];
}

export async function addDonor(data: Partial<Donor> & { event_id?: number }): Promise<number> {
    const result = await execute(`
        INSERT INTO donors (name, phone, email, blood_group, city, location, last_donation_date, gender, age, event_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
        data.name, data.phone, data.email || '', data.blood_group,
        data.city || '', data.location || '', data.last_donation_date || '',
        data.gender || '', data.age || 0, data.event_id || null
    ]);
    return Number(result.lastInsertRowid);
}

export async function updateDonorAfterDonation(donorId: number, donationDate: string): Promise<void> {
    await execute(
        `UPDATE donors SET last_donation_date = ?, total_donations = total_donations + 1, updated_at = datetime('now') WHERE id = ?`,
        [donationDate, donorId]
    );
}

// Call logs
export async function logCall(data: {
    helpline_id: number;
    volunteer_id: number;
    donor_id: number;
    outcome: string;
    remarks: string;
    duration_seconds?: number;
}): Promise<void> {
    await execute(
        `INSERT INTO call_logs (helpline_id, volunteer_id, donor_id, outcome, remarks, duration_seconds)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [data.helpline_id, data.volunteer_id, data.donor_id, data.outcome, data.remarks, data.duration_seconds || 0]
    );
}

export async function getCallLogs(helplineId: number): Promise<any[]> {
    const result = await query(`
        SELECT cl.*, u.name as volunteer_name, d.name as donor_name, d.phone as donor_phone
        FROM call_logs cl
        JOIN users u ON cl.volunteer_id = u.id
        JOIN donors d ON cl.donor_id = d.id
        WHERE cl.helpline_id = ?
        ORDER BY cl.called_at DESC
    `, [helplineId]);
    return result.rows as any[];
}

export async function updateHelplineStatus(id: number, status: string): Promise<void> {
    await execute(
        `UPDATE helpline_requests SET status = ?, updated_at = datetime('now') WHERE id = ?`,
        [status, id]
    );
}
