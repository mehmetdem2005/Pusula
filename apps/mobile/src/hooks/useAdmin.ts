import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../lib/api'
import { supabase } from '../lib/supabase'

export interface AdminDashboard {
  users: { total: number; newThisWeek: number; proCount: number }
  content: { userPdfs: number; libraryBooks: number; totalLessons: number }
}

export interface AdminUser {
  id: string
  email: string
  full_name: string | null
  role: 'super_admin' | 'admin' | 'user'
  banned_at: string | null
  created_at: string
  phone_number: string | null
  phone_verified_at: string | null
  auth_providers: string[]
  subscriptions?: Array<{ tier: string; status: string; current_period_end: string | null }>
}

export interface AdminUserDetail {
  profile: AdminUser & { ban_reason?: string }
  stats: {
    totalLessons: number
    totalSubjects: number
    totalPdfs: number
    currentStreak: number
    longestStreak: number
  }
}

/** GET kullanıcının kendi rolü */
export function useMyRole() {
  return useQuery({
    queryKey: ['my-role'],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) return null
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userData.user.id)
        .single()
      return (data?.role ?? 'user') as 'super_admin' | 'admin' | 'user'
    },
    staleTime: 5 * 60_000,
  })
}

export function useIsAdmin() {
  const { data } = useMyRole()
  return data === 'admin' || data === 'super_admin'
}

export function useIsSuperAdmin() {
  const { data } = useMyRole()
  return data === 'super_admin'
}

// ===== DASHBOARD =====

export function useAdminDashboard() {
  return useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => apiFetch<AdminDashboard>('/api/admin/dashboard'),
    staleTime: 60_000,
  })
}

// ===== USERS =====

export function useAdminUsers(
  opts: { search?: string; role?: string; limit?: number; offset?: number } = {},
) {
  return useQuery({
    queryKey: ['admin', 'users', opts],
    queryFn: () => {
      const params = new URLSearchParams()
      if (opts.search) params.set('search', opts.search)
      if (opts.role) params.set('role', opts.role)
      params.set('limit', String(opts.limit ?? 50))
      params.set('offset', String(opts.offset ?? 0))
      return apiFetch<{ users: AdminUser[]; total: number }>(`/api/admin/users?${params}`)
    },
  })
}

export function useAdminUser(userId: string | null) {
  return useQuery({
    queryKey: ['admin', 'user', userId],
    queryFn: () => apiFetch<AdminUserDetail>(`/api/admin/users/${userId}`),
    enabled: !!userId,
  })
}

export function usePromoteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { userId: string; newRole: 'user' | 'admin' | 'super_admin' }) =>
      apiFetch('/api/admin/users/promote', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin'] }),
  })
}

export function useBanUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { userId: string; reason: string }) =>
      apiFetch('/api/admin/users/ban', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin'] }),
  })
}

export function useUnbanUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) =>
      apiFetch('/api/admin/users/unban', { method: 'POST', body: JSON.stringify({ userId }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin'] }),
  })
}

// ===== LIBRARY =====

export interface LibraryDocument {
  id: string
  title: string
  author: string | null
  description: string | null
  cover_image_url: string | null
  file_path: string
  file_size_bytes: number
  page_count: number | null
  language: string
  category: string
  subject_tags: string[]
  is_pro_only: boolean
  download_count: number
  created_at: string
  profiles?: { email: string; full_name: string | null }
}

export function useLibraryDocuments(adminView = false) {
  return useQuery({
    queryKey: ['library', adminView ? 'admin' : 'public'],
    queryFn: async () => {
      if (adminView) {
        const r = await apiFetch<{ documents: LibraryDocument[] }>('/api/admin/library')
        return r.documents
      }
      const { data } = await supabase
        .from('library_documents')
        .select('*')
        .order('created_at', { ascending: false })
      return (data ?? []) as LibraryDocument[]
    },
  })
}

export function useUploadLibraryDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      file: File | Blob
      title: string
      author?: string
      description?: string
      category: 'textbook' | 'novel' | 'reference' | 'exam_prep' | 'other'
      subjectTags?: string[]
      isProOnly?: boolean
      pageCount?: number
    }) => {
      // 1. Signed URL al
      const upload = await apiFetch<{ uploadUrl: string; storagePath: string }>(
        '/api/admin/library/upload-url',
        { method: 'POST' },
      )

      // 2. PUT
      const uploadRes = await fetch(upload.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/pdf' },
        body: input.file,
      })
      if (!uploadRes.ok) throw new Error(`Upload başarısız: ${uploadRes.status}`)

      // 3. Meta create
      const fileSize = (input.file as any).size ?? 0
      return apiFetch<{ document: LibraryDocument }>('/api/admin/library', {
        method: 'POST',
        body: JSON.stringify({
          title: input.title,
          author: input.author,
          description: input.description,
          category: input.category,
          subjectTags: input.subjectTags ?? [],
          isProOnly: input.isProOnly ?? false,
          pageCount: input.pageCount,
          storagePath: upload.storagePath,
          fileSize,
        }),
      })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['library'] }),
  })
}

export function useDeleteLibraryDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/api/admin/library/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['library'] }),
  })
}

// ===== AUDIT =====

export interface AuditLog {
  id: string
  action: string
  target_type: string | null
  target_id: string | null
  metadata: Record<string, unknown>
  created_at: string
  profiles?: { email: string; full_name: string | null }
}

export function useAuditLogs(limit = 100) {
  return useQuery({
    queryKey: ['admin', 'audit', limit],
    queryFn: () => apiFetch<{ logs: AuditLog[] }>(`/api/admin/audit?limit=${limit}`),
  })
}
