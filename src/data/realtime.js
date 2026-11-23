import { db } from './client.js';

const debounce = (fn, ms) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
};

function makeChannel(name, config, onChange) {
  let closed = false;
  const ch = db()
    .channel(`${name}:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`)
    .on('postgres_changes', config, debounce(() => {
      if (!closed) onChange();
    }, 250))
    .subscribe();

  return () => {
    if (closed) return;
    closed = true;
    db().removeChannel(ch);
  };
}

export function watchProject(pid, onChange) {
  return makeChannel(
    `project:${pid}`,
    { event: '*', schema: 'public', table: 'project_events', filter: `project_id=eq.${pid}` },
    onChange,
  );
}

export function watchNotifications(uid, onChange) {
  return makeChannel(
    `notes:${uid}`,
    { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${uid}` },
    onChange,
  );
}