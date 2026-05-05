// Mirrors the AuditLog actions enumerated in
// aidlc-docs/construction/u0-shared-foundation/functional-design/domain-entities.md §4.
export enum AuditAction {
  USER_LOGIN = 'USER_LOGIN',
  USER_LOGOUT = 'USER_LOGOUT',
  PASSWORD_RESET_REQUEST = 'PASSWORD_RESET_REQUEST',
  PASSWORD_RESET_COMPLETE = 'PASSWORD_RESET_COMPLETE',
  ROLE_CHANGE = 'ROLE_CHANGE',
  IDEA_PUBLISH = 'IDEA_PUBLISH',
  IDEA_DELETE = 'IDEA_DELETE',
  SCORE_CONFIRM = 'SCORE_CONFIRM',
  CYCLE_CREATE = 'CYCLE_CREATE',
  CYCLE_CLOSE = 'CYCLE_CLOSE',
}

export interface AuditEvent {
  action: AuditAction;
  userId?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
}
