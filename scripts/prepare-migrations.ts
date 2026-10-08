import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
for (const provider of ['sqlite', 'postgresql']) {
  const directory = provider === 'sqlite' ? 'prisma' : 'prisma/postgres';
  mkdirSync(`${directory}/migrations/20261008000000_initial`, { recursive: true });
  if (provider === 'postgresql')
    writeFileSync(
      `${directory}/schema.prisma`,
      readFileSync('prisma/schema.prisma', 'utf8').replace(
        'provider = "sqlite"',
        'provider = "postgresql"',
      ),
    );
  const sql = execFileSync(
    process.execPath,
    [
      'node_modules/prisma/build/index.js',
      'migrate',
      'diff',
      '--from-empty',
      '--to-schema-datamodel',
      `${directory}/schema.prisma`,
      '--script',
    ],
    {
      encoding: 'utf8',
      env: {
        ...process.env,
        DATABASE_URL:
          provider === 'sqlite' ? 'file:./dev.db' : 'postgresql://localhost:5432/planner',
      },
    },
  );
  writeFileSync(`${directory}/migrations/20261008000000_initial/migration.sql`, sql);
  writeFileSync(`${directory}/migrations/migration_lock.toml`, `provider = "${provider}"\n`);
}
console.log('SQLite and PostgreSQL initial migrations prepared.');
