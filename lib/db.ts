import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { pgTable, text, timestamp, uuid, pgEnum, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const statusEnum = pgEnum('status', ['KOSONG', 'PAKAI']);
export const eventTypeEnum = pgEnum('event_type', ['ACTIVATION', 'ASSIGNED', 'DEASSIGNED', 'REASSIGNED']);
export const roleEnum = pgEnum('role', ['admin', 'user']);
export const userStatusEnum = pgEnum('user_status', ['pending', 'approved', 'rejected']);

// Users table for authentication
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name'),
  image: text('image'),
  role: roleEnum('role').notNull().default('user'),
  status: userStatusEnum('status').notNull().default('pending'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => {
  return {
    idx_users_email: index('idx_users_email').on(table.email),
    idx_users_status: index('idx_users_status').on(table.status),
  };
});

export const phoneNumbers = pgTable('phone_numbers', {
  id: uuid('id').primaryKey().defaultRandom(),
  number: text('number').notNull().unique(),
  currentStatus: statusEnum('current_status').notNull().default('KOSONG'),
  currentClient: text('current_client'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => {
  return {
    idx_status: index('idx_phone_status').on(table.currentStatus),
    idx_client: index('idx_phone_client').on(table.currentClient),
    idx_number: index('idx_phone_number').on(table.number),
  };
});

export const usageHistory = pgTable('usage_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  phoneId: uuid('phone_id').notNull().references(() => phoneNumbers.id, { onDelete: 'cascade' }),
  eventType: eventTypeEnum('event_type').notNull(),
  clientName: text('client_name'),
  eventDate: timestamp('event_date').defaultNow().notNull(),
  notes: text('notes'),
}, (table) => {
  return {
    idx_history_phone_id: index('idx_history_phone_id').on(table.phoneId),
    idx_history_event_date: index('idx_history_event_date').on(table.eventDate),
  };
});

export const phoneNumbersRelations = relations(phoneNumbers, ({ many }) => ({
  history: many(usageHistory),
}));

export const usageHistoryRelations = relations(usageHistory, ({ one }) => ({
  phoneNumber: one(phoneNumbers, {
    fields: [usageHistory.phoneId],
    references: [phoneNumbers.id],
  }),
}));

// Database connection
const connectionString = process.env.DATABASE_URL || '';
const sql = connectionString ? neon(connectionString) : null;
export const db = sql ? drizzle(sql, { 
  logger: false,
}) : null;
