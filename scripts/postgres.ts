import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const schema = readFileSync('prisma/schema.prisma', 'utf8').replace(
  'provider = "sqlite"',
  'provider = "postgresql"',
);
mkdirSync('prisma/postgres', { recursive: true });
writeFileSync('prisma/postgres/schema.prisma', schema);
console.log(
  'PostgreSQL schema updated at prisma/postgres/schema.prisma. Use --schema prisma/postgres/schema.prisma with Prisma commands.',
);
