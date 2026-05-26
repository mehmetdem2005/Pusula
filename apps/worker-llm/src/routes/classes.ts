import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { AUDIT_EVENTS, audit } from '../lib/audit.js'
import { supabase, verifyUserToken } from '../supabase.js'

const CreateClassSchema = z.object({
  orgId: z.string().uuid(),
  name: z.string().min(2).max(100),
  slug: z.string().regex(/^[a-z0-9-]{2,50}$/),
  description: z.string().max(500).optional(),
  emoji: z.string().max(10).optional(),
  gradeLevel: z.string().max(40).optional(),
  subject: z.string().max(40).optional(),
  startsAt: z.string().date().optional(),
  endsAt: z.string().date().optional(),
})

const CreateAssignmentSchema = z.object({
  classId: z.string().uuid(),
  title: z.string().min(2).max(100),
  description: z.string().max(2000).optional(),
  assignmentType: z.enum(['notebook', 'flashcards', 'quiz', 'podcast', 'reading', 'custom']),
  sourceNotebookId: z.string().uuid().optional(),
  sourceContentId: z.string().uuid().optional(),
  customUrl: z.string().url().optional(),
  dueAt: z.string().datetime().optional(),
  isGraded: z.boolean().optional().default(false),
  maxScore: z.number().int().min(0).max(1000).optional().default(100),
})

async function isOrgTeacher(userId: string, orgId: string): Promise<boolean> {
  const { data } = await supabase
    .from('organization_members')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', userId)
    .single()
  return !!data && ['owner', 'admin', 'teacher'].includes(data.role)
}

export async function classesRoutes(fastify: FastifyInstance) {
  /** POST /api/classes */
  fastify.post('/api/classes', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const parsed = CreateClassSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.format() })

    if (!(await isOrgTeacher(userId, parsed.data.orgId))) {
      return reply.code(403).send({ error: 'must_be_teacher' })
    }

    const { data: cls, error } = await supabase
      .from('classes')
      .insert({
        org_id: parsed.data.orgId,
        name: parsed.data.name,
        slug: parsed.data.slug,
        description: parsed.data.description,
        emoji: parsed.data.emoji ?? '📚',
        grade_level: parsed.data.gradeLevel,
        subject: parsed.data.subject,
        teacher_id: userId,
        starts_at: parsed.data.startsAt,
        ends_at: parsed.data.endsAt,
      })
      .select()
      .single()

    if (error) return reply.code(500).send({ error: error.message })

    // Teacher otomatik member
    await supabase.from('class_members').insert({
      class_id: cls.id,
      user_id: userId,
      role: 'co_teacher',
    })

    await audit({
      orgId: parsed.data.orgId,
      userId,
      eventType: AUDIT_EVENTS.CLASS_CREATED,
      eventCategory: 'class',
      targetType: 'class',
      targetId: cls.id,
      afterState: { name: cls.name, subject: cls.subject },
    })

    return { class: cls }
  })

  /** GET /api/classes?orgId=... */
  fastify.get<{ Querystring: { orgId?: string } }>('/api/classes', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    // Hem öğretmenliği hem de öğrenciliği görür
    const { data: teaching } = await supabase
      .from('classes')
      .select('id, name, slug, emoji, grade_level, subject, member_count, teacher_id')
      .eq('teacher_id', userId)
      .eq('is_archived', false)

    const { data: enrolled } = await supabase
      .from('class_members')
      .select(`
          class_id,
          classes(id, name, slug, emoji, grade_level, subject, member_count, teacher_id,
            profiles!classes_teacher_id_fkey(full_name, username))
        `)
      .eq('user_id', userId)

    return {
      teaching: teaching ?? [],
      enrolled: enrolled ?? [],
    }
  })

  /** GET /api/classes/:id */
  fastify.get<{ Params: { id: string } }>('/api/classes/:id', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const { data: cls } = await supabase
      .from('classes')
      .select(`*, profiles!classes_teacher_id_fkey(id, username, full_name, avatar_url)`)
      .eq('id', req.params.id)
      .single()

    if (!cls) return reply.code(404).send({ error: 'not_found' })

    const isTeacher = cls.teacher_id === userId
    const { data: membership } = await supabase
      .from('class_members')
      .select('role')
      .eq('class_id', cls.id)
      .eq('user_id', userId)
      .maybeSingle()

    if (!isTeacher && !membership) return reply.code(403).send({ error: 'not_member' })

    // Members + assignments
    const [membersRes, assignmentsRes] = await Promise.all([
      supabase
        .from('class_members')
        .select(`
            role, joined_at, total_reviews, current_streak, last_active_at,
            profiles(id, username, full_name, avatar_url)
          `)
        .eq('class_id', cls.id)
        .order('total_reviews', { ascending: false }),
      supabase
        .from('assignments')
        .select('*')
        .eq('class_id', cls.id)
        .order('assigned_at', { ascending: false }),
    ])

    return {
      class: cls,
      members: membersRes.data ?? [],
      assignments: assignmentsRes.data ?? [],
      myRole: isTeacher ? 'teacher' : (membership?.role ?? 'observer'),
    }
  })

  /** POST /api/assignments */
  fastify.post('/api/assignments', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const parsed = CreateAssignmentSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.format() })

    // Sınıfın öğretmeni mi?
    const { data: cls } = await supabase
      .from('classes')
      .select('teacher_id, org_id, member_count')
      .eq('id', parsed.data.classId)
      .single()

    if (!cls) return reply.code(404).send({ error: 'class_not_found' })
    if (cls.teacher_id !== userId) return reply.code(403).send({ error: 'must_be_teacher' })

    const { data: assignment, error } = await supabase
      .from('assignments')
      .insert({
        class_id: parsed.data.classId,
        teacher_id: userId,
        title: parsed.data.title,
        description: parsed.data.description,
        assignment_type: parsed.data.assignmentType,
        source_notebook_id: parsed.data.sourceNotebookId,
        source_content_id: parsed.data.sourceContentId,
        custom_url: parsed.data.customUrl,
        due_at: parsed.data.dueAt,
        is_graded: parsed.data.isGraded,
        max_score: parsed.data.maxScore,
      })
      .select()
      .single()

    if (error) return reply.code(500).send({ error: error.message })

    // Tüm öğrenciler için pending submission yarat
    const { data: students } = await supabase
      .from('class_members')
      .select('user_id')
      .eq('class_id', parsed.data.classId)
      .eq('role', 'student')

    if (students && students.length > 0) {
      await supabase.from('assignment_submissions').insert(
        students.map((s) => ({
          assignment_id: assignment.id,
          student_id: s.user_id,
          status: 'pending',
        })),
      )
    }

    await audit({
      orgId: cls.org_id,
      userId,
      eventType: AUDIT_EVENTS.ASSIGNMENT_CREATED,
      eventCategory: 'class',
      targetType: 'assignment',
      targetId: assignment.id,
      afterState: { title: assignment.title, type: assignment.assignment_type },
    })

    return { assignment, studentCount: students?.length ?? 0 }
  })

  /** GET /api/assignments/:id/submissions (öğretmen) */
  fastify.get<{ Params: { id: string } }>(
    '/api/assignments/:id/submissions',
    async (req, reply) => {
      const userId = await verifyUserToken(req.headers.authorization)
      if (!userId) return reply.code(401).send({ error: 'unauthorized' })

      const { data: a } = await supabase
        .from('assignments')
        .select('teacher_id')
        .eq('id', req.params.id)
        .single()

      if (!a || a.teacher_id !== userId) return reply.code(403).send({ error: 'forbidden' })

      const { data } = await supabase
        .from('assignment_submissions')
        .select(`
          *,
          profiles!assignment_submissions_student_id_fkey(id, username, full_name, avatar_url)
        `)
        .eq('assignment_id', req.params.id)
        .order('submitted_at', { ascending: false, nullsFirst: false })

      return { submissions: data ?? [] }
    },
  )

  /** POST /api/submissions/:id/grade */
  fastify.post<{ Params: { id: string }; Body: { score: number; feedback?: string } }>(
    '/api/submissions/:id/grade',
    async (req, reply) => {
      const userId = await verifyUserToken(req.headers.authorization)
      if (!userId) return reply.code(401).send({ error: 'unauthorized' })

      const { data: sub } = await supabase
        .from('assignment_submissions')
        .select('*, assignments(teacher_id, max_score, class_id, title)')
        .eq('id', req.params.id)
        .single()

      if (!sub) return reply.code(404).send({ error: 'not_found' })
      if ((sub.assignments as any).teacher_id !== userId) {
        return reply.code(403).send({ error: 'forbidden' })
      }

      const score = Math.min(req.body.score, (sub.assignments as any).max_score)

      await supabase
        .from('assignment_submissions')
        .update({
          score,
          teacher_feedback: req.body.feedback,
          graded_at: new Date().toISOString(),
          graded_by: userId,
          status: 'graded',
        })
        .eq('id', req.params.id)

      await audit({
        userId,
        eventType: AUDIT_EVENTS.ASSIGNMENT_GRADED,
        eventCategory: 'class',
        targetType: 'submission',
        targetId: req.params.id,
        afterState: { score, feedback: req.body.feedback },
      })

      return { ok: true }
    },
  )
}
