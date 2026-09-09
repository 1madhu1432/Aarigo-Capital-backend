// src/utils/tokenBlacklist.ts
// Simple in-memory token blacklist for logout revocation.
// In production, replace with a persistent store (e.g., Redis) and TTL.

const blacklist = new Set<string>();

export function addTokenToBlacklist(token: string): void {
  blacklist.add(token);
}

export function isTokenBlacklisted(token: string): boolean {
  return blacklist.has(token);
}
