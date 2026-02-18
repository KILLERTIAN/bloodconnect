import { execute, query } from './database';

export interface User {
    id: number;
    name: string;
    email: string;
    phone: string;
    role: 'admin' | 'manager' | 'hr' | 'outreach' | 'volunteer' | 'helpline';
    is_active: number;
    created_at: string;
}

export async function loginUser(email: string, password: string): Promise<User | null> {
    const e = email.toLowerCase().trim();
    console.log(`🔑 Attempting login for: ${e}`);

    try {
        const result = await query(
            'SELECT * FROM users WHERE email = ? AND password_hash = ? AND is_active = 1',
            [e, password]
        );

        if (result.rows.length === 0) {
            // Debug: Check if user exists at all to give better feedback in logs
            const userCheck = await query('SELECT * FROM users WHERE email = ?', [e]);
            if (userCheck.rows.length === 0) {
                console.log(`❌ Login failed: User '${e}' not found in local DB.`);
            } else {
                console.log(`❌ Login failed: User '${e}' found, but credentials or active status mismatch.`);
                // Be careful logging passwords in production, but useful for dev debugging:
                // console.log(`DB Hash: ${(userCheck.rows[0] as any).password_hash}, Input: ${password}`);
            }
            return null;
        }

        console.log(`✅ Login successful for: ${e}`);
        return result.rows[0] as unknown as User;
    } catch (err) {
        console.error('Login error:', err);
        return null;
    }
}

export async function getAllUsers(): Promise<User[]> {
    const result = await query('SELECT * FROM users WHERE is_active = 1 ORDER BY name');
    return result.rows as unknown as User[];
}

export async function getUsersByRole(role: string): Promise<User[]> {
    const result = await query(
        'SELECT * FROM users WHERE role = ? AND is_active = 1 ORDER BY name',
        [role]
    );
    return result.rows as unknown as User[];
}

export async function getUserById(id: number): Promise<User | null> {
    const result = await query('SELECT * FROM users WHERE id = ?', [id]);
    if (result.rows.length === 0) return null;
    return result.rows[0] as unknown as User;
}

export async function createUser(data: {
    name: string;
    email: string;
    phone: string;
    password: string;
    role: string;
}): Promise<void> {
    await execute(
        'INSERT INTO users (name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)',
        [data.name, data.email.toLowerCase(), data.phone, data.password, data.role]
    );
}

export async function updateUser(id: number, data: Partial<User>): Promise<void> {
    const fields = Object.keys(data).map(k => `${k} = ?`).join(', ');
    const values = [...Object.values(data), id];
    await execute(`UPDATE users SET ${fields}, updated_at = datetime('now') WHERE id = ?`, values);
}
