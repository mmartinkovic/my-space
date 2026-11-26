import { randomBytes, randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { afterAll, describe, expect, it } from 'vitest';
import { createTestDatabase } from '../../../test/db.ts';
import { expectViolation } from '../../../test/violations.ts';
import { authEvent, recoveryCode, session, webauthnChallenge, webauthnCredential } from './auth.ts';

const database = await createTestDatabase();
const { db } = database;

afterAll(async () => {
  await database.drop();
});

const createdAt = new Date('2026-03-01T12:00:00Z');
const minutesLater = (minutes: number) => new Date(createdAt.getTime() + minutes * 60_000);

const credential = (change: Partial<typeof webauthnCredential.$inferInsert> = {}) => ({
  credentialId: randomBytes(32),
  publicKey: randomBytes(64),
  signCount: 0,
  transports: ['internal'],
  deviceType: 'multiDevice' as const,
  backedUp: true,
  nickname: 'Laptop',
  ...change,
});

const sessionRow = (change: Partial<typeof session.$inferInsert> = {}) => ({
  tokenHash: randomBytes(32),
  scope: 'full' as const,
  createdAt,
  expiresAt: minutesLater(60),
  userAgent: 'test',
  ip: '192.0.2.1',
  ...change,
});

describe('webauthn_credential', () => {
  it('generates a time-ordered id and keeps the binary values', async () => {
    const values = credential();

    const [row] = await db.insert(webauthnCredential).values(values).returning();

    expect(row?.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7/);
    expect(row?.credentialId).toEqual(values.credentialId);
    expect(row?.publicKey).toEqual(values.publicKey);
    expect(row?.transports).toEqual(['internal']);
    expect(row?.lastUsedAt).toBeNull();
  });

  it.each<[string, Partial<typeof webauthnCredential.$inferInsert>, string]>([
    ['a negative sign count', { signCount: -1 }, 'webauthn_credential_sign_count_check'],
    ['an empty nickname', { nickname: '' }, 'webauthn_credential_nickname_check'],
    [
      'a nickname of 61 characters',
      { nickname: 'a'.repeat(61) },
      'webauthn_credential_nickname_check',
    ],
  ])('rejects %s', async (_case, change, constraint) => {
    await expectViolation(db.insert(webauthnCredential).values(credential(change)), constraint);
  });

  it('rejects an unknown device type written past the typed client', async () => {
    await expect(
      database.pool.query(
        `INSERT INTO webauthn_credential
           (credential_id, public_key, sign_count, transports, device_type, backed_up, nickname)
         VALUES ($1, $2, 0, '{}', 'roaming', false, 'Key')`,
        [randomBytes(32), randomBytes(64)],
      ),
    ).rejects.toMatchObject({ constraint: 'webauthn_credential_device_type_check' });
  });

  it('rejects a duplicate credential id', async () => {
    const credentialId = randomBytes(32);
    await db.insert(webauthnCredential).values(credential({ credentialId }));

    await expectViolation(
      db.insert(webauthnCredential).values(credential({ credentialId })),
      'webauthn_credential_credential_id_unique',
    );
  });
});

describe('session', () => {
  it('defaults to a web client without step-up', async () => {
    const [row] = await db.insert(session).values(sessionRow()).returning();

    expect(row).toMatchObject({ clientKind: 'web', elevatedUntil: null });
  });

  it.each<[string, Date]>([
    ['expires before it was created', minutesLater(-1)],
    ['expires the moment it was created', createdAt],
  ])('rejects a session that %s', async (_case, expiresAt) => {
    await expectViolation(
      db.insert(session).values(sessionRow({ expiresAt })),
      'session_expiry_check',
    );
  });

  it('limits a recovery session to 15 minutes', async () => {
    await expect(
      db.insert(session).values(sessionRow({ scope: 'recovery', expiresAt: minutesLater(15) })),
    ).resolves.toMatchObject({ rowCount: 1 });
    await expectViolation(
      db.insert(session).values(sessionRow({ scope: 'recovery', expiresAt: minutesLater(16) })),
      'session_recovery_lifetime_check',
    );
  });

  it('rejects a duplicate token hash', async () => {
    const tokenHash = randomBytes(32);
    await db.insert(session).values(sessionRow({ tokenHash }));

    await expectViolation(
      db.insert(session).values(sessionRow({ tokenHash })),
      'session_token_hash_unique',
    );
  });
});

describe('webauthn_challenge', () => {
  const challengeRow = (sessionId: string | null) => ({
    kind: 'registration' as const,
    challenge: randomBytes(32),
    sessionId,
    expiresAt: minutesLater(5),
  });

  it('is deleted together with its session', async () => {
    const [owner] = await db.insert(session).values(sessionRow()).returning({ id: session.id });
    const sessionId = owner?.id ?? '';
    await db.insert(webauthnChallenge).values(challengeRow(sessionId));

    await db.delete(session).where(eq(session.id, sessionId));

    expect(
      await db.select().from(webauthnChallenge).where(eq(webauthnChallenge.sessionId, sessionId)),
    ).toEqual([]);
  });

  it('rejects an unknown session', async () => {
    await expectViolation(
      db.insert(webauthnChallenge).values(challengeRow(randomUUID())),
      'webauthn_challenge_session_id_session_id_fk',
    );
  });
});

describe('recovery_code', () => {
  it('rejects a duplicate code hash', async () => {
    const codeHash = randomBytes(32);
    await db.insert(recoveryCode).values({ batchId: randomUUID(), codeHash });

    await expectViolation(
      db.insert(recoveryCode).values({ batchId: randomUUID(), codeHash }),
      'recovery_code_code_hash_unique',
    );
  });
});

describe('auth_event', () => {
  it('stores a CLI event without an address or user agent', async () => {
    const [row] = await db.insert(authEvent).values({ kind: 'setup_completed' }).returning();

    expect(row).toMatchObject({ ip: null, userAgent: null, detail: null });
  });
});
