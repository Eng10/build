import { db } from './client.js';
import { unwrap, normalizeError } from './errors.js';

export async function isHandleFree(username, phone) {
  return unwrap(await db().rpc('is_handle_free', { p_username: username, p_phone: phone ?? '' }));
}

export async function signUp({ email, password, name, username, phone }) {
  const { data, error } = await db().auth.signUp({
    email,
    password,
    options: { data: { name, username, phone: phone ?? '' } },
  });
  if (error) throw normalizeError(error);
  return data; // data.session === null عند تفعيل تأكيد البريد
}

export async function signIn({ email, password }) {
  const { data, error } = await db().auth.signInWithPassword({ email, password });
  if (error) throw normalizeError(error);
  return data;
}

export async function signOut() {
  const { error } = await db().auth.signOut();
  if (error) throw normalizeError(error);
}

export async function requestPasswordReset(email) {
  const { error } = await db().auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
  if (error) throw normalizeError(error);
}

export async function setNewPassword(password) {
  const { error } = await db().auth.updateUser({ password });
  if (error) throw normalizeError(error);
}

export async function getSession() {
  const { data } = await db().auth.getSession();
  return data.session;
}

export function onAuthChange(cb) {
  const { data } = db().auth.onAuthStateChange((event, session) => cb(event, session));
  return () => data.subscription.unsubscribe();
}

export async function getProfile(id) {
  return unwrap(await db().from('profiles').select('*').eq('id', id).single());
}

export async function updateProfile(id, patch) {
  unwrap(await db().from('profiles').update(patch).eq('id', id));
}
