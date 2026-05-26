export default function AdminHome() {
  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-serif text-brand-950">Kavra Admin</h1>
        <p className="text-slate-600 mt-1">Kavra yönetim paneli</p>

        <div className="grid md:grid-cols-4 gap-4 mt-8">
          <StatCard label="Toplam Kullanıcı" value="—" />
          <StatCard label="Aktif Abonelik" value="—" />
          <StatCard label="Bugün Ders" value="—" />
          <StatCard label="Toplam Token" value="—" />
        </div>

        <div className="grid md:grid-cols-2 gap-4 mt-8">
          <Panel
            title="Teknik Yönetimi"
            desc="150 tekniğin prompt'larını düzenle"
            href="/admin/techniques"
          />
          <Panel
            title="Model Kataloğu"
            desc="Groq modellerini manuel senkronize et"
            href="/admin/models"
          />
          <Panel
            title="Kullanıcılar"
            desc="Kullanıcı listesi ve kullanım istatistikleri"
            href="/admin/users"
          />
          <Panel title="Analitik" desc="PostHog funnel + retention" href="/admin/analytics" />
        </div>

        <div className="mt-8 p-6 bg-yellow-50 border border-yellow-200 rounded-xl">
          <p className="text-yellow-900 text-sm">
            🚧 Admin panel Faz 4'te tamamlanacak. Şimdilik iskelet.
          </p>
        </div>
      </div>
    </main>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="text-3xl font-bold text-brand-950 mt-1">{value}</p>
    </div>
  )
}

function Panel({ title, desc, href }: { title: string; desc: string; href: string }) {
  return (
    <a
      href={href}
      className="block bg-white rounded-2xl p-6 border border-slate-100 hover:border-brand-200 transition"
    >
      <h3 className="font-semibold text-brand-950 text-lg">{title}</h3>
      <p className="text-slate-600 text-sm mt-1">{desc}</p>
    </a>
  )
}
