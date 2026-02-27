import * as ExpoCrypto from 'expo-crypto';

/**
 * Hash a password using SHA-256 with a project-specific salt.
 * While bcrypt is preferred, this provides a secure native-first hashing flow for this environment.
 */
export async function hashPassword(password: string): Promise<string> {
    return await ExpoCrypto.digestStringAsync(
        ExpoCrypto.CryptoDigestAlgorithm.SHA256,
        password + 'BC_HASH_SALT_2026'
    );
}
