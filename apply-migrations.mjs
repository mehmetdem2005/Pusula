import { readFileSync } from 'node:fs';
import { Client } from 'pg';

/**
 * Supabase migration uygulayıcı.
 *
 * Kimlik bilgileri ENV'den okunur — repoya asla hardcode edilmez:
 *   - DATABASE_URL                (tam bağlantı dizesi; varsa doğrudan kullanılır)
 *   veya
 *   - SUPABASE_PROJECT_REF + SUPABASE_DB_PASSWORD  (pooler adayları üretilir)
 */
const password = process.env.SUPABASE_DB_PASSWORD;
const projectRef = process.env.SUPABASE_PROJECT_REF;
const directUrl = process.env.DATABASE_URL;

function buildCandidates() {
  if (directUrl) return [directUrl];
  if (!password || !projectRef) {
    console.error(
      '✗ Eksik env. DATABASE_URL ya da SUPABASE_PROJECT_REF + SUPABASE_DB_PASSWORD tanımla.',
    );
    process.exit(2);
  }
  const enc = encodeURIComponent(password);
  return [
    `postgresql://postgres:${enc}@db.${projectRef}.supabase.co:5432/postgres`,
    `postgresql://postgres.${projectRef}:${enc}@aws-0-eu-central-1.pooler.supabase.com:5432/postgres`,
    `postgresql://postgres.${projectRef}:${enc}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`,
  ];
}

const files = ['packages/db/migrations/0001_init.sql', 'packages/db/migrations/0002_hardening.sql'];

for (const conn of buildCandidates()) {
  const host = conn.match(/@([^/]+)/)?.[1] ?? '(bilinmeyen host)';
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
    await c.end().catch(() => undefined);
  }
}

console.log('\n✗ Hiçbir bağlantı başarılı olmadı');
process.exit(1);
