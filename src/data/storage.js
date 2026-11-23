import { db } from './client.js';
import { config } from '../config.js';
import { AppError, normalizeError } from './errors.js';

const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf' };
const cache = new Map();

export function validateFile(bucket, file) {
  if (file.size > config.maxFileBytes) throw new AppError('file_big');
  if (!config.mime[bucket]?.includes(file.type)) throw new AppError('file_type');
}

// المسار: <project_id>/<uuid>.<ext> — سياسات التخزين تعتمد على أول جزء من المسار.
export async function uploadFile(bucket, projectId, file) {
  validateFile(bucket, file);
  const path = `${projectId}/${crypto.randomUUID()}.${EXT[file.type]}`;
  const { error } = await db().storage.from(bucket).upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw normalizeError(error);
  return path;
}

export async function signedUrl(bucket, path) {
  const key = `${bucket}/${path}`;
  const hit = cache.get(key);
  if (hit && hit.exp > Date.now()) return hit.url;
  const { data, error } = await db().storage.from(bucket).createSignedUrl(path, config.signedUrlTtl);
  if (error) throw normalizeError(error);
  cache.set(key, { url: data.signedUrl, exp: Date.now() + (config.signedUrlTtl - 60) * 1000 });
  return data.signedUrl;
}

export async function removeFile(bucket, path) {
  if (!path) return;
  const { error } = await db().storage.from(bucket).remove([path]);
  if (error) throw normalizeError(error);
  cache.delete(`${bucket}/${path}`);
}
