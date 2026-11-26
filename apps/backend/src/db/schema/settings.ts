import { sql } from 'drizzle-orm';
import { check, pgTable, smallint, text, time } from 'drizzle-orm/pg-core';
import { bytea, instant } from './columns.ts';
import { localeEnum } from './enums.ts';

/**
 * Global settings of the single user: exactly one row (`id = 1`), seeded by a migration
 * (DATA-MODEL.md "app_settings"). The range of each reminder offset is validated by zod.
 */
export const appSettings = pgTable(
  'app_settings',
  {
    id: smallint().primaryKey().default(1),
    locale: localeEnum().notNull().default('sk'),
    timezone: text().notNull().default('Europe/Bratislava'),
    briefTime: time().notNull().default('07:00'),
    quietHoursStart: time().notNull().default('22:00'),
    quietHoursEnd: time().notNull().default('07:00'),
    deadlineReminderOffsetsDays: smallint().array().notNull().default([3, 1]),
    deadlineReminderTime: time().notNull().default('08:00'),
    spoilerAutoRevealHours: smallint().notNull().default(24),
    bigMatchExtraTopCount: smallint().notNull().default(4),
    /** NULL until the setup flow registers the first passkey. */
    webauthnUserHandle: bytea(),
    updatedAt: instant().notNull().defaultNow(),
  },
  (table) => [
    check('app_settings_singleton_check', sql`${table.id} = 1`),
    check(
      'app_settings_reminder_offsets_check',
      sql`cardinality(${table.deadlineReminderOffsetsDays}) <= 5`,
    ),
    check(
      'app_settings_auto_reveal_check',
      sql`${table.spoilerAutoRevealHours} > 0 AND ${table.spoilerAutoRevealHours} <= 720`,
    ),
    check(
      'app_settings_big_match_count_check',
      sql`${table.bigMatchExtraTopCount} BETWEEN 0 AND 10`,
    ),
  ],
);
