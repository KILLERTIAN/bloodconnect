import { execute, query } from './database';

export interface Schedule {
    id: string;
    user_id: string;
    date: string;
    start_time: string;
    end_time: string;
    activity: string;
    event_id: string | null;
    is_locked: number;
    created_at: string;
    user_name?: string;
    event_title?: string;
}

export async function getUserSchedule(userId: string, month?: string): Promise<Schedule[]> {
    let sql = `
        SELECT s.*, u.name as user_name, e.title as event_title
        FROM schedules s
        JOIN users u ON s.user_id = u.id
        LEFT JOIN events e ON s.event_id = e.id
        WHERE s.user_id = ?
    `;
    const args: any[] = [userId];
    if (month) {
        sql += ' AND s.date LIKE ?';
        args.push(`${month}%`);
    }
    sql += ' ORDER BY s.date, s.start_time';
    const result = await query(sql, args);
    return result.rows as unknown as Schedule[];
}

export async function getAllSchedules(month?: string): Promise<Schedule[]> {
    let sql = `
        SELECT s.*, u.name as user_name, e.title as event_title
        FROM schedules s
        JOIN users u ON s.user_id = u.id
        LEFT JOIN events e ON s.event_id = e.id
        WHERE 1=1
    `;
    const args: any[] = [];
    if (month) {
        sql += ' AND s.date LIKE ?';
        args.push(`${month}%`);
    }
    sql += ' ORDER BY s.date, u.name';
    const result = await query(sql, args);
    return result.rows as unknown as Schedule[];
}

export async function addSchedule(data: {
    user_id: string;
    date: string;
    start_time: string;
    end_time: string;
    activity: string;
    event_id?: string;
}): Promise<void> {
    // Check if editing is enabled for this user
    const settings = await query(
        'SELECT * FROM schedule_settings WHERE user_id = ?',
        [data.user_id]
    );
    if (settings.rows.length > 0) {
        const s = settings.rows[0] as any;
        if (!s.editing_enabled) throw new Error('Schedule editing is locked for this user');
    }

    await execute(
        `INSERT INTO schedules (user_id, date, start_time, end_time, activity, event_id) VALUES (?, ?, ?, ?, ?, ?)`,
        [data.user_id, data.date, data.start_time, data.end_time, data.activity, data.event_id || null]
    );
}

export async function deleteSchedule(id: string, userId: string, isHR: boolean): Promise<void> {
    const schedule = await query('SELECT * FROM schedules WHERE id = ?', [id]);
    if (schedule.rows.length === 0) return;
    const s = schedule.rows[0] as any;
    if (!isHR && s.user_id !== userId) throw new Error('Not authorized');
    if (s.is_locked && !isHR) throw new Error('Schedule is locked');
    await execute('DELETE FROM schedules WHERE id = ?', [id]);
}

// HR controls
export async function setScheduleEditingEnabled(targetUserId: string, enabled: boolean, hrUserId: string): Promise<void> {
    await execute(`
        INSERT INTO schedule_settings (user_id, editing_enabled, locked_by, locked_at)
        VALUES (?, ?, ?, datetime('now'))
        ON CONFLICT(user_id) DO UPDATE SET
            editing_enabled = excluded.editing_enabled,
            locked_by = excluded.locked_by,
            locked_at = excluded.locked_at
    `, [targetUserId, enabled ? 1 : 0, hrUserId]);
}

export async function getScheduleSettings(): Promise<any[]> {
    const result = await query(`
        SELECT ss.*, u.name as user_name, u.role, hr.name as locked_by_name
        FROM schedule_settings ss
        JOIN users u ON ss.user_id = u.id
        LEFT JOIN users hr ON ss.locked_by = hr.id
    `);
    return result.rows as any[];
}

// HR Statistics
export async function getVolunteerStats(): Promise<any[]> {
    const result = await query(`
        SELECT 
            u.id, u.name, u.role,
            COUNT(DISTINCT ev.event_id) as events_participated,
            COUNT(DISTINCT s.id) as schedule_entries,
            SUM(CASE WHEN ev.status = 'attended' THEN 1 ELSE 0 END) as attended_events
        FROM users u
        LEFT JOIN event_volunteers ev ON u.id = ev.volunteer_id
        LEFT JOIN schedules s ON u.id = s.user_id
        WHERE u.role IN ('volunteer', 'helpline', 'outreach')
        GROUP BY u.id, u.name, u.role
        ORDER BY events_participated DESC
    `);
    return result.rows as any[];
}

export async function getManagerStats(): Promise<any[]> {
    const result = await query(`
        SELECT 
            u.id, u.name,
            COUNT(e.id) as total_camps,
            SUM(CASE WHEN e.status = 'closed' THEN 1 ELSE 0 END) as completed_camps,
            SUM(e.actual_donations) as total_donations_collected
        FROM users u
        LEFT JOIN events e ON u.id = e.created_by
        WHERE u.role = 'manager'
        GROUP BY u.id, u.name
        ORDER BY total_camps DESC
    `);
    return result.rows as any[];
}
