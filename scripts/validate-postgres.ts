import { execFileSync } from 'node:child_process';
execFileSync(
  process.execPath,
  ['node_modules/prisma/build/index.js', 'validate', '--schema', 'prisma/postgres/schema.prisma'],
  {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: 'postgresql://localhost:5432/planner' },
  },
);
