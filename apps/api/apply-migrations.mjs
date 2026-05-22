import { readFileSync } from 'node:fs';
import { Client } from 'pg';

/**
 * Supabase migration + tablo doğrulama (debug aracı).
 *
 * Kimlik bilgileri ENV'den okunur — repoya asla hardcode edilmez:
 *   - SUPABASE_PROJECT_REF
 *   - SUPABASE_DB_PASSWORD
 *   - SUPABASE_ACCESS_TOKEN   (opsiyonel; Management API'den pooler config çekmek için)
 *
 * Kullanım:  node apps/api/apply-migrations.mjs [repoRoot]
 */
const password = process.env.SUPABASE_DB_PASSWORD;
const projectRef = process.env.SUPABASE_PROJECT_REF;
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
const repoRoot = process.argv[2] || process.cwd();

if (!password || !projectRef) {
  console.error('✗ Eksik env: SUPABASE_PROJECT_REF ve SUPABASE_DB_PASSWORD gerekli.');
  process.exit(2);
}

const password_enc = encodeURIComponent(password);
const candidates = [];

// 1. (opsiyonel) Management API'den gerçek pooler bağlantı dizesini al
if (accessToken) {
  console.log('1. Management API → pooler config çekiliyor...');
  const poolerCfg = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/config/database/pooler`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )
    .then((r) => r.json())
    .catch((e) => ({ error: e.message }));

  const arr = Array.isArray(poolerCfg) ? poolerCfg : [poolerCfg];
  for (const p of arr) {
    if (p?.connection_string) {
      candidates.push(
        p.connection_string.replace('[YOUR-PASSWORD]', password_enc).replace('{password}', password_enc),
      );
    }
  }
}

// 2. Fallback formatlar
candidates.push(
  `postgresql://postgres.${projectRef}:${password_enc}@aws-1-eu-central-1.pooler.supabase.com:6543/postgres`,
  `postgresql://postgres.${projectRef}:${password_enc}@aws-1-eu-central-1.pooler.supabase.com:5432/postgres`,
  `postgresql://postgres.${projectRef}:${password_enc}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`,
);

const files = [
  `${repoRoot}/packages/db/migrations/0001_init.sql`,
  `${repoRoot}/packages/db/migrations/0002_hardening.sql`,
];

for (const conn of candidates) {
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
        console.log(`  ✓ ${f.split('/').pop()} uygulandı`);
      } catch (e) {
        console.log(`  ⚠ ${f.split('/').pop()}: ${e.message.split('\n')[0]}`);
      }
    }

    const { rows } = await c.query(
      `SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`,
    );
    console.log('\n  Tablolar:', rows.map((r) => r.tablename).join(', '));

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
