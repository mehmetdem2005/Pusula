import { readFileSync } from 'node:fs';
import sodium from 'libsodium-wrappers';

const repoRoot = process.argv[2] || 'C:/Users/opc/Documents/Projects/pusula';
const tokensRaw = readFileSync(`${repoRoot}/_DEVRETME_silinecek/tokens.env`, 'utf8');
const t = {};
for (const line of tokensRaw.split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) t[m[1]] = m[2];
}

const GH_TOKEN = t.GITHUB_TOKEN;
const GH_USER = t.GITHUB_USERNAME || 'mehmetdem2005';
const REPO = 'Pusula';
const PROJECT_REF = 'zbjxkyiyqpesdpyimcmx';

await sodium.ready;

async function gh(method, path, body) {
  const res = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${GH_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'pusula-setup',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

console.log(`Repo: ${GH_USER}/${REPO}`);
const pk = await gh('GET', `/repos/${GH_USER}/${REPO}/actions/secrets/public-key`);
console.log(`Public key ID: ${pk.key_id}`);

const pkBytes = sodium.from_base64(pk.key, sodium.base64_variants.ORIGINAL);

async function setSecret(name, value) {
  if (!value) { console.log(`  - ${name} boş, atlandı`); return; }
  const valBytes = sodium.from_string(value);
  const encrypted = sodium.crypto_box_seal(valBytes, pkBytes);
  const encB64 = sodium.to_base64(encrypted, sodium.base64_variants.ORIGINAL);
  await gh('PUT', `/repos/${GH_USER}/${REPO}/actions/secrets/${name}`, {
    encrypted_value: encB64,
    key_id: pk.key_id,
  });
  console.log(`  ✓ ${name}`);
}

const secrets = {
  SUPABASE_ACCESS_TOKEN: t.SUPABASE_ACCESS_TOKEN,
  SUPABASE_PROJECT_REF: PROJECT_REF,
  SUPABASE_DB_PASSWORD: t.SUPABASE_DB_PASSWORD,
  SUPABASE_URL: `https://${PROJECT_REF}.supabase.co`,
  SUPABASE_ANON_KEY: t.SUPABASE_ANON_KEY || '',
  SUPABASE_SERVICE_ROLE_KEY: t.SUPABASE_SERVICE_ROLE_KEY || '',
  SUPABASE_JWT_SECRET: t.SUPABASE_JWT_SECRET || '',
  VERCEL_TOKEN: t.VERCEL_TOKEN,
  RENDER_API_KEY: t.RENDER_API_KEY,
  GROQ_API_KEY: t.GROQ_API_KEY,
  GEMINI_API_KEY: t.GEMINI_API_KEY,
  DEEPSEEK_API_KEY: t.DEEPSEEK_API_KEY,
  ANTHROPIC_API_KEY: t.ANTHROPIC_API_KEY,
};

// Eksik Supabase keys'i apps/api/.env.local'dan tamamla
try {
  const apiEnv = readFileSync(`${repoRoot}/apps/api/.env.local`, 'utf8');
  const pick = (k) => (apiEnv.match(new RegExp(`(?m)^${k}=(.+)$`)) || [])[1]?.trim();
  if (!secrets.SUPABASE_ANON_KEY) secrets.SUPABASE_ANON_KEY = pick('SUPABASE_ANON_KEY') || '';
  if (!secrets.SUPABASE_SERVICE_ROLE_KEY) secrets.SUPABASE_SERVICE_ROLE_KEY = pick('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!secrets.SUPABASE_JWT_SECRET) secrets.SUPABASE_JWT_SECRET = pick('SUPABASE_JWT_SECRET') || '';
} catch {}

console.log('\nGitHub Secrets ekleniyor...');
for (const [k, v] of Object.entries(secrets)) {
  await setSecret(k, v);
}

console.log('\n✓ TAMAM — Tüm secrets eklendi.');
console.log('  → main\'e push edildiğinde supabase-migrate workflow otomatik tetiklenir.');
