import { neon } from '@neondatabase/serverless';

type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

declare global {
  var __phoneManagerCache: Map<string, CacheEntry<unknown>> | undefined;
}

const connectionString = process.env.DATABASE_URL?.trim();

export const db = connectionString ? neon(connectionString) : null;

const cacheStore = globalThis.__phoneManagerCache ?? new Map();
globalThis.__phoneManagerCache = cacheStore;

export const PHONE_STATUSES = ['KOSONG', 'PAKAI'] as const;
export const USER_ROLES = ['admin', 'user'] as const;
export const USER_STATUSES = ['approved', 'pending', 'rejected'] as const;
export const PHONE_EVENT_TYPES = [
  'ACTIVATION',
  'ASSIGNED',
  'DEASSIGNED',
  'REASSIGNED',
  'EDITED',
  'DELETED',
] as const;

export type PhoneStatus = (typeof PHONE_STATUSES)[number];
export type UserRole = (typeof USER_ROLES)[number];
export type UserStatus = (typeof USER_STATUSES)[number];

export function requireDatabase() {
  if (!db) {
    throw new Error('DATABASE_URL is not configured.');
  }

  return db;
}

export function readCache<T>(key: string): T | null {
  const cached = cacheStore.get(key);
  if (!cached) {
    return null;
  }

  if (cached.expiresAt <= Date.now()) {
    cacheStore.delete(key);
    return null;
  }

  return cached.value as T;
}

export function writeCache<T>(key: string, value: T, ttlMs = 15_000) {
  cacheStore.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });

  return value;
}

export function invalidateCache(prefixes: string[]) {
  for (const key of Array.from(cacheStore.keys())) {
    if (prefixes.some((prefix) => key.startsWith(prefix))) {
      cacheStore.delete(key);
    }
  }
}

export function invalidateInventoryCache() {
  invalidateCache(['phones:', 'blocks:', 'customers:', 'customer-phones:']);
}

export function normalizePhoneNumber(value: string) {
  return value.replace(/\D/g, '');
}

export function normalizeClientName(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

export function getBlockKey(phoneNumber: string) {
  if (phoneNumber.length < 2) {
    throw new Error('Phone number must be at least 2 digits.');
  }

  return phoneNumber.slice(0, -2);
}

export function parseInteger(
  value: string | null,
  fallback: number,
  bounds?: { min?: number; max?: number }
) {
  const parsed = Number.parseInt(value ?? '', 10);
  if (Number.isNaN(parsed)) {
    return fallback;
  }

  if (bounds?.min !== undefined && parsed < bounds.min) {
    return bounds.min;
  }

  if (bounds?.max !== undefined && parsed > bounds.max) {
    return bounds.max;
  }

  return parsed;
}

export function isPhoneStatus(value: string): value is PhoneStatus {
  return PHONE_STATUSES.includes(value as PhoneStatus);
}

export function isUserRole(value: string): value is UserRole {
  return USER_ROLES.includes(value as UserRole);
}

export function isUserStatus(value: string): value is UserStatus {
  return USER_STATUSES.includes(value as UserStatus);
}

export function toJsonPayload(value: unknown) {
  return JSON.stringify(value ?? {});
}

export function mapPhoneRow(row: any) {
  return {
    id: row.id,
    number: row.phone_number,
    currentStatus: row.status,
    currentClient: row.current_client_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    history: [] as any[],
  };
}

export function mapHistoryRow(row: any) {
  return {
    id: row.id,
    phoneId: row.phone_id,
    eventType: row.event_type,
    clientName: row.client_name,
    eventDate: row.event_at,
    notes: row.note,
  };
}
