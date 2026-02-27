import { hashPassword } from './crypto';
import { execute, query } from './database';
import { generateUniqueId } from './id';

export interface User {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: 'admin' | 'manager' | 'hr' | 'outreach' | 'volunteer' | 'helpline';
    avatar_url?: string;
    is_active: number;
    created_at: string;
}


export async function loginUser(email: string, password: string): Promise<User | null> {
    const e = email.toLowerCase().trim();
    console.log(`🔑 Attempting login for: ${e}`);

    try {
        // Fetch user by email first
        const result = await query(
            'SELECT * FROM users WHERE email = ? AND is_active = 1',
            [e]
        );

        if (result.rows.length === 0) {
            console.log(`❌ Login failed: User '${e}' not found.`);
            return null;
        }

        const user = result.rows[0] as unknown as any;
        const inputHash = await hashPassword(password);

        if (user.password_hash !== inputHash) {
            console.log(`❌ Login failed: Password mismatch for ${e}`);
            return null;
        }

        console.log(`✅ Login successful for: ${e}`);
        return user as User;
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

export async function getUserById(id: string): Promise<User | null> {
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
    avatar_url?: string;
}): Promise<void> {
    const hashedPassword = await hashPassword(data.password);
    await execute(
        'INSERT INTO users (id, name, email, phone, password_hash, role, avatar_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [generateUniqueId(), data.name, data.email.toLowerCase(), data.phone, hashedPassword, data.role, data.avatar_url]
    );
}

export async function registerUser(data: {
    name: string;
    email: string;
    phone: string;
    password: string;
    role: 'donor' | 'volunteer';
}): Promise<User> {
    const e = data.email.toLowerCase().trim();

    // Check if user already exists
    const existing = await query('SELECT id FROM users WHERE email = ?', [e]);
    if (existing.rows.length > 0) {
        throw new Error('An account with this email already exists.');
    }

    const id = generateUniqueId();
    const hashedPassword = await hashPassword(data.password);

    await execute(
        'INSERT INTO users (id, name, email, phone, password_hash, role, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)',
        [id, data.name, e, data.phone || '', hashedPassword, data.role]
    );

    // Return the user object directly to avoid race conditions with remote sync
    return {
        id,
        name: data.name,
        email: e,
        phone: data.phone || '',
        role: data.role as any,
        is_active: 1,
        created_at: new Date().toISOString()
    };
}

export async function updateUser(id: string, data: Partial<User>): Promise<void> {
    const fields = Object.keys(data).map(k => `${k} = ?`).join(', ');
    const values = [...Object.values(data), id];
    await execute(`UPDATE users SET ${fields}, updated_at = datetime('now') WHERE id = ?`, values);
}
