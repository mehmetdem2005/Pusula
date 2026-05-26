'use client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Mail, Shield, Trash2, Upload } from 'lucide-react'
import { useParams } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { apiFetch } from '../../../../../lib/api'

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  teacher: 'Öğretmen',
  member: 'Üye',
  student: 'Öğrenci',
}

const ROLE_COLORS: Record<string, string> = {
  owner: 'text-amber-600 bg-amber-50',
  admin: 'text-violet-600 bg-violet-50',
  teacher: 'text-cyan-600 bg-cyan-50',
  member: 'text-slate-600 bg-slate-50',
  student: 'text-emerald-600 bg-emerald-50',
}

export default function MembersPage() {
  const params = useParams()
  const slug = params.slug as string
  const qc = useQueryClient()

  const [inviteOpen, setInviteOpen] = useState(false)
  const [bulkOpen, setBulkOpen] = useState(false)

  const { data: org } = useQuery({
    queryKey: ['org', slug],
    queryFn: () => apiFetch<any>(`/api/orgs/${slug}`),
  })

  const orgId = org?.org?.id

  const { data: members } = useQuery({
    queryKey: ['org-members', orgId],
    queryFn: () => apiFetch<any>(`/api/orgs/${orgId}/members`),
    enabled: !!orgId,
  })

  const removeMut = useMutation({
    mutationFn: (memberId: string) =>
      apiFetch(`/api/orgs/${orgId}/members/${memberId}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['org-members', orgId] })
      toast.success('Üye kaldırıldı')
    },
    onError: (e: any) => toast.error(e.message),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-serif text-3xl text-ink-900">Üyeler</h1>
          <p className="text-sm text-slate-600 mt-1">
            {members?.members?.length ?? 0} üye · {org?.org?.max_seats - org?.org?.seats_used} boş
            koltuk
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setBulkOpen(true)}
            className="bg-white border border-slate-200 rounded-full px-4 py-2 text-xs font-bold flex items-center gap-1.5 hover:border-amber-300"
          >
            <Upload size={12} /> CSV Import
          </button>
          <button
            onClick={() => setInviteOpen(true)}
            className="bg-ink-900 text-cream-50 rounded-full px-4 py-2 text-xs font-bold flex items-center gap-1.5"
          >
            <Mail size={12} /> Davet Et
          </button>
        </div>
      </div>

      {/* Members table */}
      <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-[10px] uppercase tracking-widest text-slate-500 font-mono">
            <tr>
              <th className="text-left px-4 py-3">Üye</th>
              <th className="text-left px-4 py-3">Rol</th>
              <th className="text-left px-4 py-3">Durum</th>
              <th className="text-left px-4 py-3">Katılım</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(members?.members ?? []).map((m: any) => (
              <tr key={m.id} className="border-t border-slate-100">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-ink-900 flex items-center justify-center">
                      <span className="text-amber-500 text-[10px] font-bold">
                        {(m.profiles?.full_name ?? m.invitation_email ?? '?')
                          .slice(0, 1)
                          .toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-ink-900 font-semibold">
                        {m.profiles?.full_name ?? m.invitation_email}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {m.profiles?.email ?? m.invitation_email}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`text-[10px] font-bold px-2 py-1 rounded-full ${ROLE_COLORS[m.role]}`}
                  >
                    {ROLE_LABELS[m.role]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {m.invitation_status === 'pending' ? (
                    <span className="text-[10px] text-amber-600 font-bold">DAVET</span>
                  ) : (
                    <span className="text-[10px] text-emerald-600 font-bold">AKTİF</span>
                  )}
                </td>
                <td className="px-4 py-3 text-[10px] text-slate-500 font-mono">
                  {new Date(m.joined_at).toLocaleDateString('tr-TR')}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => {
                      if (confirm('Bu üyeyi kaldır?')) removeMut.mutate(m.id)
                    }}
                    className="text-slate-400 hover:text-red-600"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {inviteOpen && <InviteModal orgId={orgId} onClose={() => setInviteOpen(false)} />}
      {bulkOpen && <BulkImportModal orgId={orgId} onClose={() => setBulkOpen(false)} />}
    </div>
  )
}

function InviteModal({ orgId, onClose }: { orgId: string; onClose: () => void }) {
  const qc = useQueryClient()
  const [emails, setEmails] = useState('')
  const [role, setRole] = useState('member')

  const mut = useMutation({
    mutationFn: () => {
      const list = emails.split(/[,\n\s]+/).filter((e) => e.trim() && e.includes('@'))
      return apiFetch(`/api/orgs/${orgId}/invites`, {
        method: 'POST',
        body: JSON.stringify({ emails: list, role }),
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['org-members', orgId] })
      toast.success('Davetler gönderildi')
      onClose()
    },
    onError: (e: any) => toast.error(e.message),
  })

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl p-6 max-w-md w-full">
        <h2 className="font-serif text-2xl text-ink-900 mb-1">Üye Davet Et</h2>
        <p className="text-xs text-slate-500 mb-4">
          Email'leri virgül veya yeni satır ile ayır. Mevcut Kavra üyeleri direkt eklenir.
        </p>

        <textarea
          placeholder="ahmet@okul.tr, ayse@okul.tr&#10;mehmet@okul.tr"
          value={emails}
          onChange={(e) => setEmails(e.target.value)}
          rows={6}
          className="w-full bg-cream-50 border border-slate-200 rounded-xl px-3 py-2 text-sm mb-3"
        />

        <div className="flex gap-2 mb-4">
          {['admin', 'teacher', 'member', 'student'].map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className={`flex-1 px-2 py-2 rounded-full text-[10px] font-bold ${
                role === r ? 'bg-ink-900 text-cream-50' : 'bg-cream-50 text-slate-600'
              }`}
            >
              {ROLE_LABELS[r]}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 text-xs text-slate-600">
            İptal
          </button>
          <button
            onClick={() => mut.mutate()}
            disabled={!emails.trim() || mut.isPending}
            className="flex-1 bg-ink-900 text-cream-50 rounded-full py-2.5 text-xs font-bold disabled:opacity-50"
          >
            {mut.isPending ? 'Gönderiliyor...' : 'Gönder'}
          </button>
        </div>
      </div>
    </div>
  )
}

function BulkImportModal({ orgId, onClose }: { orgId: string; onClose: () => void }) {
  const qc = useQueryClient()
  const [csv, setCsv] = useState('')

  const mut = useMutation({
    mutationFn: () => {
      const lines = csv.trim().split('\n')
      const header = (lines[0] ?? '').split(',').map((h) => h.trim().toLowerCase())
      const emailIdx = header.indexOf('email')
      const nameIdx = header.indexOf('name')
      const roleIdx = header.indexOf('role')
      const classIdx = header.indexOf('class')

      const rows = lines
        .slice(1)
        .map((line) => {
          const cols = line.split(',').map((c) => c.trim())
          return {
            email: cols[emailIdx],
            fullName: nameIdx >= 0 ? cols[nameIdx] : undefined,
            role: roleIdx >= 0 ? (cols[roleIdx] as any) : 'student',
            classSlug: classIdx >= 0 ? cols[classIdx] : undefined,
          }
        })
        .filter((r) => r.email && r.email.includes('@'))

      return apiFetch(`/api/orgs/${orgId}/bulk-import`, {
        method: 'POST',
        body: JSON.stringify({ orgId, rows }),
      })
    },
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ['org-members', orgId] })
      toast.success(`${res.added} eklendi, ${res.invited} davet edildi`)
      onClose()
    },
    onError: (e: any) => toast.error(e.message),
  })

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl p-6 max-w-lg w-full">
        <h2 className="font-serif text-2xl text-ink-900 mb-1">CSV Import</h2>
        <p className="text-xs text-slate-500 mb-4">
          Header:{' '}
          <code className="bg-cream-50 px-1.5 py-0.5 rounded font-mono">email,name,role,class</code>
          <br />
          role değerleri: admin, teacher, member, student
        </p>

        <textarea
          placeholder="email,name,role,class&#10;ali@okul.tr,Ali Demir,student,9-a&#10;ayse@okul.tr,Ayşe Kaya,teacher,&#10;..."
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          rows={10}
          className="w-full bg-cream-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono mb-4"
        />

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 text-xs text-slate-600">
            İptal
          </button>
          <button
            onClick={() => mut.mutate()}
            disabled={!csv.trim() || mut.isPending}
            className="flex-1 bg-ink-900 text-cream-50 rounded-full py-2.5 text-xs font-bold disabled:opacity-50"
          >
            {mut.isPending ? 'Import ediliyor...' : 'Import'}
          </button>
        </div>
      </div>
    </div>
  )
}
