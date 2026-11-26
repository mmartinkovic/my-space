import { formatConfigIssues, loadConfig } from './config.ts';
import { createDatabase } from './db/client.ts';
import { runMigrations } from './db/migrate.ts';

/**
 * Operator CLI: `node src/cli.ts <command>` (production: `docker compose run --rm backend
 * node src/cli.ts <command>`). Output goes to stdout/stderr for a human at a terminal.
 */
const commands = {
  'db:migrate': async (databaseUrl: string): Promise<string> => {
    const database = createDatabase({
      url: databaseUrl,
      maxConnections: 1,
      onPoolError: (error) => {
        process.stderr.write(`database connection error: ${error.message}\n`);
      },
    });
    try {
      // Fail fast on wrong credentials/host even when there is nothing to migrate (deploy.sh relies on it).
      await database.pool.query('select 1');
      const outcome = await runMigrations(database.db);
      return outcome === 'applied' ? 'Migrations applied.' : 'No migrations to apply yet.';
    } finally {
      await database.close();
    }
  },
} as const;

type CommandName = keyof typeof commands;

const isCommandName = (value: string | undefined): value is CommandName =>
  value !== undefined && Object.hasOwn(commands, value);

/** `outer message → cause → root cause`, so wrapped driver errors (e.g. ECONNREFUSED) stay visible. */
const describeErrorChain = (error: unknown): string => {
  const messages: string[] = [];
  let current: unknown = error;
  while (current !== undefined && messages.length < 5) {
    if (current instanceof Error) {
      messages.push(current.message.trim() || current.name);
      current = current.cause;
    } else {
      messages.push(typeof current === 'string' ? current : `non-Error value (${typeof current})`);
      current = undefined;
    }
  }
  return messages.join(' → caused by: ');
};

const usage = `Usage: node src/cli.ts <command>\nCommands: ${Object.keys(commands).join(', ')}\n`;

const [commandName] = process.argv.slice(2);
if (!isCommandName(commandName)) {
  process.stderr.write(usage);
  process.exit(2);
}

const result = loadConfig(process.env);
if (!result.ok) {
  process.stderr.write(formatConfigIssues(result.issues));
  process.exit(1);
}

try {
  const message = await commands[commandName](result.config.databaseUrl);
  process.stdout.write(`${message}\n`);
} catch (error: unknown) {
  process.stderr.write(`${commandName} failed: ${describeErrorChain(error)}\n`);
  process.exitCode = 1;
}
