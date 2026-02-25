import { execute, query } from './database';
import { generateUniqueId } from './id';

export interface OutreachLead {
    id: number;
    organization_name: string;
    poc_name: string;
    poc_phone: string;
    poc_email: string;
    purpose: string;
    occasion: string;
    type: 'awareness_session' | 'camp';
    org_category: 'school' | 'college' | 'corporate' | 'ngo' | 'hospital' | 'other';
    city: string;
    location: string;
    status: 'not_contacted' | 'pending' | 'successful' | 'cancelled';
    assigned_to: number;
    created_by: number;
    notes: string;
    created_at: string;
    updated_at: string;
    assignee_name?: string;
    creator_name?: string;
}

export async function getAllLeads(filters?: {
    status?: string;
    type?: string;
    org_category?: string;
    city?: string;
    from_date?: string;
    to_date?: string;
}): Promise<OutreachLead[]> {
    let sql = `
        SELECT ol.*, u1.name as assignee_name, u2.name as creator_name
        FROM outreach_leads ol
        LEFT JOIN users u1 ON ol.assigned_to = u1.id
        LEFT JOIN users u2 ON ol.created_by = u2.id
        WHERE 1=1
    `;
    const args: any[] = [];

    if (filters?.status) { sql += ' AND ol.status = ?'; args.push(filters.status); }
    if (filters?.type) { sql += ' AND ol.type = ?'; args.push(filters.type); }
    if (filters?.org_category) { sql += ' AND ol.org_category = ?'; args.push(filters.org_category); }
    if (filters?.city) { sql += ' AND ol.city LIKE ?'; args.push(`%${filters.city}%`); }
    if (filters?.from_date) { sql += ' AND ol.created_at >= ?'; args.push(filters.from_date); }
    if (filters?.to_date) { sql += ' AND ol.created_at <= ?'; args.push(filters.to_date); }

    sql += ' ORDER BY ol.created_at DESC';
    const result = await query(sql, args);
    return result.rows as unknown as OutreachLead[];
}

export async function getLeadById(id: number): Promise<OutreachLead | null> {
    const result = await query(`
        SELECT ol.*, u1.name as assignee_name, u2.name as creator_name
        FROM outreach_leads ol
        LEFT JOIN users u1 ON ol.assigned_to = u1.id
        LEFT JOIN users u2 ON ol.created_by = u2.id
        WHERE ol.id = ?
    `, [id]);
    if (result.rows.length === 0) return null;
    return result.rows[0] as unknown as OutreachLead;
}

export async function createLead(data: Partial<OutreachLead> & { created_by: number }): Promise<number> {
    const newId = generateUniqueId();
    await execute(`
        INSERT INTO outreach_leads (
            id, organization_name, poc_name, poc_phone, poc_email,
            purpose, occasion, type, org_category, city, location,
            assigned_to, created_by, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
        newId,
        data.organization_name, data.poc_name, data.poc_phone, data.poc_email || '',
        data.purpose || '', data.occasion || '', data.type || 'camp',
        data.org_category || 'other', data.city || '', data.location || '',
        data.assigned_to || data.created_by, data.created_by, data.notes || ''
    ]);
    return newId;
}

export async function updateLeadStatus(id: number, status: string, notes?: string): Promise<void> {
    await execute(
        `UPDATE outreach_leads SET status = ?, notes = COALESCE(?, notes), updated_at = datetime('now') WHERE id = ?`,
        [status, notes || null, id]
    );
}

export async function updateLead(id: number, data: Partial<OutreachLead>): Promise<void> {
    const allowed = ['organization_name', 'poc_name', 'poc_phone', 'poc_email', 'purpose', 'occasion',
        'type', 'org_category', 'city', 'location', 'status', 'assigned_to', 'notes'];
    const fields = Object.keys(data).filter(k => allowed.includes(k));
    if (fields.length === 0) return;
    const sql = `UPDATE outreach_leads SET ${fields.map(f => `${f} = ?`).join(', ')}, updated_at = datetime('now') WHERE id = ?`;
    const values = [...fields.map(f => (data as any)[f]), id];
    await execute(sql, values);
}

export async function addInteraction(data: {
    lead_id: number;
    user_id: number;
    interaction_type: string;
    notes: string;
}): Promise<void> {
    await execute(
        'INSERT INTO outreach_interactions (lead_id, user_id, interaction_type, notes) VALUES (?, ?, ?, ?)',
        [data.lead_id, data.user_id, data.interaction_type, data.notes]
    );
}

export async function getLeadInteractions(leadId: number): Promise<any[]> {
    const result = await query(`
        SELECT oi.*, u.name as user_name
        FROM outreach_interactions oi
        JOIN users u ON oi.user_id = u.id
        WHERE oi.lead_id = ?
        ORDER BY oi.created_at DESC
    `, [leadId]);
    return result.rows as any[];
}

export async function getLeadsByOrganization(orgName: string): Promise<OutreachLead[]> {
    const result = await query(`
        SELECT ol.*, u1.name as assignee_name
        FROM outreach_leads ol
        LEFT JOIN users u1 ON ol.assigned_to = u1.id
        WHERE ol.organization_name LIKE ?
        ORDER BY ol.created_at DESC
    `, [`%${orgName}%`]);
    return result.rows as unknown as OutreachLead[];
}
