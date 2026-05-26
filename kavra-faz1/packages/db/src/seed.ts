import 'dotenv/config'
import { createServiceClient } from './index'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli')
  process.exit(1)
}

async function main() {
  const supabase = createServiceClient(url!, key!)

  console.log('🌱 Kavra seed başlıyor...')

  // 150 tekniğin tam listesi @kavra/shared paketinden geliyor
  const { ALL_TECHNIQUES } = await import('@kavra/shared/techniques-seed')

  console.log(`📚 ${ALL_TECHNIQUES.length} teknik yükleniyor...`)

  // Modülleri al (migration'da zaten seed edildi)
  const { data: modules } = await supabase.from('modules').select('id, code')
  if (!modules) throw new Error('Modüller yüklenemedi')

  const moduleMap = new Map(modules.map((m: any) => [m.code, m.id]))

  for (const tech of ALL_TECHNIQUES) {
    const moduleId = moduleMap.get(tech.module_code)
    if (!moduleId) {
      console.warn(`⚠️  ${tech.code}: Modül ${tech.module_code} bulunamadı`)
      continue
    }

    const { error } = await supabase.from('techniques').upsert(
      {
        module_id: moduleId,
        code: tech.code,
        name: tech.name,
        name_en: tech.name_en,
        short_description: tech.short_description,
        long_description: tech.long_description,
        kind: tech.kind,
        suitable_for: tech.suitable_for ?? [],
        difficulty_level: tech.difficulty_level ?? 1,
        estimated_duration_minutes: tech.estimated_duration_minutes,
        ui_component: tech.ui_component,
        prompt_template: tech.prompt_template,
        system_prompt: tech.system_prompt,
        tags: tech.tags ?? [],
      },
      { onConflict: 'code' },
    )

    if (error) console.error(`❌ ${tech.code}:`, error.message)
  }

  console.log('✅ Seed tamamlandı')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
