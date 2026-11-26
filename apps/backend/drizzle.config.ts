import { defineConfig } from 'drizzle-kit';

/**
 * drizzle-kit is used only to generate reviewed SQL migrations (`pnpm db:generate`).
 * Migrations are applied by our own CLI (`node src/cli.ts db:migrate`); `drizzle-kit push`
 * is forbidden outside throwaway databases (ADR 0003).
 */
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema/index.ts',
  out: './src/db/migrations',
  casing: 'snake_case',
  strict: true,
  verbose: true,
});
