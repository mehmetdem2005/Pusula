import { supabase } from '../supabase.js'

/**
 * Audit Log — compliance event tracking
 * =======================================
 *
 * KVKK + GDPR uyumlu kullanıcı/admin eylem logları.
 * 2 yıl saklanır (org.retention_days config'e göre).
 *
 * Best-effort: log fail olursa ana işlem etkilenmez (.catch yutar).
 */

interface AuditEvent {
  orgId?: string | null
  userId?: string | null
  eventType: string
  eventCategory: 'auth' | 'org' | 'user' | 'billing' | 'class' | 'data' | 'security' | 'compliance'
  targetType?: string
  targetId?: string
  ipAddress?: string
  userAgent?: string
  beforeState?: any
  afterState?: any
  metadata?: any
}

export async function audit(event: AuditEvent): Promise<void> {
  try {
    await supabase.from('audit_log').insert({
      org_id: event.orgId,
      user_id: event.userId,
      event_type: event.eventType,
      event_category: event.eventCategory,
      target_type: event.targetType,
      target_id: event.targetId,
      ip_address: event.ipAddress,
      user_agent: event.userAgent,
      before_state: event.beforeState,
      after_state: event.afterState,
      metadata: event.metadata ?? {},
    })
  } catch (e) {
    // Best-effort
    console.warn('Audit log fail:', e)
  }
}

/**
 * Common event types (consistent naming)
 */
export const AUDIT_EVENTS = {
  // Auth
  USER_LOGIN: 'user.login',
  USER_LOGOUT: 'user.logout',
  USER_PASSWORD_CHANGED: 'user.password_changed',
  USER_SSO_LOGIN: 'user.sso_login',

  // Org
  ORG_CREATED: 'org.created',
  ORG_SETTINGS_CHANGED: 'org.settings_changed',
  ORG_BILLING_UPDATED: 'org.billing_updated',
  ORG_SSO_ENABLED: 'org.sso_enabled',
  ORG_SSO_DISABLED: 'org.sso_disabled',

  // User
  USER_INVITED: 'user.invited',
  USER_JOINED: 'user.joined',
  USER_REMOVED: 'user.removed',
  USER_ROLE_CHANGED: 'user.role_changed',
  USER_PROVISIONED: 'user.provisioned', // SCIM
  USER_DEPROVISIONED: 'user.deprovisioned', // SCIM

  // Class
  CLASS_CREATED: 'class.created',
  CLASS_DELETED: 'class.deleted',
  CLASS_STUDENT_ADDED: 'class.student_added',
  ASSIGNMENT_CREATED: 'assignment.created',
  ASSIGNMENT_GRADED: 'assignment.graded',

  // Data
  DATA_EXPORTED: 'data.exported',
  DATA_DELETED: 'data.deleted',
  DATA_ACCESSED: 'data.accessed', // sensitive query

  // Security
  SCIM_TOKEN_GENERATED: 'security.scim_token_generated',
  AUDIT_LOG_EXPORTED: 'security.audit_exported',
} as const
