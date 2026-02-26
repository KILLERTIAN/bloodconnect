import * as Crypto from 'expo-crypto';

export function generateUniqueId(): string {
    return Crypto.randomUUID();
}
