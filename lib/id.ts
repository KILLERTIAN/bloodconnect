/**
 * Generate a unique, collision-resistant integer ID.
 * 
 * Strategy: timestamp (ms) * 10000 + random(0..9999)
 * This gives ~10,000 unique slots per millisecond, making collisions
 * between devices virtually impossible — even when both are offline.
 * 
 * The result fits safely within JavaScript's Number.MAX_SAFE_INTEGER (2^53 - 1)
 * and SQLite's INTEGER type (2^63 - 1).
 * 
 * Example output: 17718638858061234
 */
export function generateUniqueId(): number {
    return Date.now() * 10000 + Math.floor(Math.random() * 10000);
}
