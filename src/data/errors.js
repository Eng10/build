// توحيد أخطاء Supabase/PostgREST إلى رموز ثابتة تُترجم في الواجهة.
const KNOWN = ['forbidden', 'user_not_found', 'already_member', 'owner_locked', 'bad_role', 'cross_project', 'not_found', 'not_authenticated', 'file_big', 'file_type', 'config_missing'];

export class AppError extends Error {
  constructor(code, raw) {
    super(code);
    this.code = code;
    this.raw = raw;
  }
}

export function normalizeError(e) {
  if (e instanceof AppError) return e;
  const msg = String(e?.message ?? e ?? '');
  const hit = KNOWN.find((k) => msg.includes(k));
  if (hit) return new AppError(hit, e);
  if (/invalid login credentials/i.test(msg)) return new AppError('invalid_credentials', e);
  if (/already registered|already been registered/i.test(msg)) return new AppError('email_exists', e);
  if (/password.*(short|weak|least)/i.test(msg)) return new AppError('weak_password', e);
  if (/failed to fetch|network/i.test(msg)) return new AppError('network', e);
  if (e?.code === '23505') return new AppError('duplicate', e);
  if (e?.code === '42501') return new AppError('forbidden', e);
  return new AppError('unknown', e);
}

export const unwrap = ({ data, error }) => {
  if (error) throw normalizeError(error);
  return data;
};
