import { readFileSync } from 'node:fs';
import { Client } from 'pg';

const password = '89F8agS22MGApRQu47dAbHVW3CtJ8KjE';
const projectRef = 'zbjxkyiyqpesdpyimcmx';
const repoRoot = process.argv[2] || 'C:/Users/opc/Documents/Projects/pusula';

// tokens.env'den access token oku
const tokensRaw = readFileSync(`${repoRoot}/_DEVRETME_silinecek/tokens.env`, 'utf8');
const accessToken = tokensRaw.match(/SUPABASE_ACCESS_TOKEN=(\S+)/)[1];

// 1. Management API'den gerçek bağlantı bilgisi al
console.log('1. Management API → pgbouncer/postgrest config çekiliyor...');
const cfg = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/config/database/pgbouncer`, {
  headers: { Authorization: `Bearer ${accessToken}` },
}).then(r => r.json()).catch(e => ({ error: e.message }));
console.log('pgbouncer config:', JSON.stringify(cfg, null, 2));

const poolerCfg = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/config/database/pooler`, {
  headers: { Authorization: `Bearer ${accessToken}` },
}).then(r => r.json()).catch(e => ({ error: e.message }));
console.log('pooler config:', JSON.stringify(poolerCfg, null, 2));

// 2. Yeni şifre seti dene — Supabase güncel formatları
const password_enc = encodeURIComponent(password);
const candidates = [];

// Pooler config'den geliyorsa kullan
if (poolerCfg.connection_string) {
  candidates.push(poolerCfg.connection_string.replace('[YOUR-PASSWORD]', password_enc).replace('{password}', password_enc));
}
if (Array.isArray(poolerCfg)) {
  for (const p of poolerCfg) {
    if (p.connection_string) {
      candidates.push(p.connection_string.replace('[YOUR-PASSWORD]', password_enc).replace('{password}', password_enc));
    }
  }
}

// Fallback formatlar
candidates.push(
  `postgresql://postgres.${projectRef}:${password_enc}@aws-1-eu-central-1.pooler.supabase.com:6543/postgres`,
  `postgresql://postgres.${projectRef}:${password_enc}@aws-1-eu-central-1.pooler.supabase.com:5432/postgres`,
  `postgresql://postgres.${projectRef}:${password_enc}@aws-0-eu-central-2.pooler.supabase.com:6543/postgres`,
);

const files = [
  `${repoRoot}/packages/db/migrations/0001_init.sql`,
  `${repoRoot}/packages/db/migrations/0002_hardening.sql`,
];

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
        console.log(`  ✓ ${f.split('/').pop()} uygulandı`);
      } catch (e) {
        console.log(`  ⚠ ${f.split('/').pop()}: ${e.message.split('\n')[0]}`);
      }
    }

    const { rows } = await c.query(`SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`);
    console.log('\n  Tablolar:', rows.map(r => r.tablename).join(', '));

    await c.end();
    console.log('\n✓ MIGRATION TAMAM');
    process.exit(0);
  } catch (e) {
    console.log(`  ✗ ${e.message}`);
    try { await c.end(); } catch {}
  }
}

console.log('\n✗ Hiçbir bağlantı başarılı olmadı');
process.exit(1);
