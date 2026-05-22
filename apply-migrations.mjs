import { readFileSync } from 'node:fs';
import { Client } from 'pg';

const password = '89F8agS22MGApRQu47dAbHVW3CtJ8KjE';
const projectRef = 'zbjxkyiyqpesdpyimcmx';

// Supabase pooler (transaction mode için 6543, session için 5432)
const candidates = [
  `postgresql://postgres:${password}@db.${projectRef}.supabase.co:5432/postgres`,
  `postgresql://postgres.${projectRef}:${password}@aws-0-eu-central-1.pooler.supabase.com:5432/postgres`,
  `postgresql://postgres.${projectRef}:${password}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`,
];

const files = ['packages/db/migrations/0001_init.sql', 'packages/db/migrations/0002_hardening.sql'];

for (const conn of candidates) {
  const host = conn.match(/@([^/]+)/)[1];
  console.log(`\n=== Deneme: ${host}`);
  const c = new Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });
  try {
    await c.connect();
    console.log('  ✓ Bağlandı');

    for (const f of files) {
      const sql = readFileSync(f, 'utf8');
      try {
        await c.query(sql);
        console.log(`  ✓ ${f} uygulandı`);
      } catch (e) {
        console.log(`  ⚠ ${f}: ${e.message}`);
      }
    }

    await c.end();
    console.log('\n✓ MIGRATION TAMAM');
    process.exit(0);
  } catch (e) {
    console.log(`  ✗ ${e.message}`);
    await c.end().catch(() => {});
  }
}

console.log('\n✗ Hiçbir bağlantı başarılı olmadı');
process.exit(1);
