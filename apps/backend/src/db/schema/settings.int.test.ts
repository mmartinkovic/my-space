import { eq } from 'drizzle-orm';
import { afterAll, describe, expect, it } from 'vitest';
import { createTestDatabase } from '../../../test/db.ts';
import { expectViolation } from '../../../test/violations.ts';
import { appSettings } from './settings.ts';

const database = await createTestDatabase();
const { db } = database;

afterAll(async () => {
  await database.drop();
});

type SettingsChange = Partial<typeof appSettings.$inferInsert>;

const update = (change: SettingsChange) =>
  db.update(appSettings).set(change).where(eq(appSettings.id, 1));

describe('app_settings', () => {
  it('is seeded as a single row with the default values', async () => {
    const rows = await db.select().from(appSettings);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: 1,
      locale: 'sk',
      timezone: 'Europe/Bratislava',
      briefTime: '07:00:00',
      quietHoursStart: '22:00:00',
      quietHoursEnd: '07:00:00',
      deadlineReminderOffsetsDays: [3, 1],
      deadlineReminderTime: '08:00:00',
      spoilerAutoRevealHours: 24,
      bigMatchExtraTopCount: 4,
      webauthnUserHandle: null,
    });
    expect(rows[0]?.updatedAt).toBeInstanceOf(Date);
  });

  it('rejects a second row with another id', async () => {
    await expectViolation(db.insert(appSettings).values({ id: 2 }), 'app_settings_singleton_check');
  });

  it('rejects a second row with the same id', async () => {
    await expectViolation(db.insert(appSettings).values({ id: 1 }), 'app_settings_pkey');
  });

  it.each<[string, SettingsChange, string]>([
    [
      'six reminder offsets',
      { deadlineReminderOffsetsDays: [1, 2, 3, 4, 5, 6] },
      'app_settings_reminder_offsets_check',
    ],
    ['auto reveal after 0 h', { spoilerAutoRevealHours: 0 }, 'app_settings_auto_reveal_check'],
    ['auto reveal after 721 h', { spoilerAutoRevealHours: 721 }, 'app_settings_auto_reveal_check'],
    ['a negative top count', { bigMatchExtraTopCount: -1 }, 'app_settings_big_match_count_check'],
    ['a top count of 11', { bigMatchExtraTopCount: 11 }, 'app_settings_big_match_count_check'],
  ])('rejects %s', async (_case, change, constraint) => {
    await expectViolation(update(change), constraint);
  });

  it.each<[string, SettingsChange]>([
    ['no reminder offsets', { deadlineReminderOffsetsDays: [] }],
    ['five reminder offsets', { deadlineReminderOffsetsDays: [1, 2, 3, 4, 5] }],
    ['auto reveal after 720 h', { spoilerAutoRevealHours: 720 }],
    ['a top count of 0', { bigMatchExtraTopCount: 0 }],
    ['a top count of 10', { bigMatchExtraTopCount: 10 }],
  ])('accepts %s', async (_case, change) => {
    await expect(update(change)).resolves.toMatchObject({ rowCount: 1 });
  });
});
