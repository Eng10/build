import { config } from '../config.js';
import { AppError } from '../data/errors.js';

export const EXT = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
  'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/webm': 'webm',
  'application/pdf': 'pdf', 'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx', 'text/plain': 'txt',
};
const BY_EXT = Object.fromEntries(Object.entries(EXT).map(([m, e]) => [e, m]));
BY_EXT.jpeg = 'image/jpeg'; BY_EXT.mpeg4 = 'video/mp4'; BY_EXT.m4v = 'video/mp4';

// بعض الأجهزة لا ترسل نوع الملف، فنستنتجه من الامتداد
export function mimeOf(file) {
  if (file.type) return file.type;
  const ext = String(file.name ?? '').split('.').pop().toLowerCase();
  return BY_EXT[ext] ?? '';
}

export const kindOf = (mime) => (mime.startsWith('image/') ? 'image' : mime.startsWith('video/') ? 'video' : 'file');
export const cleanName = (name) => String(name ?? 'file').replace(/[\u0000-\u001f<>:"/\\|?*]/g, '_').trim().slice(0, 120) || 'file';
export const formatSize = (b) => (b == null ? '' : b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

// يتحقق قبل أي رفع: العدد (مع المرفقات الموجودة) ونوع كل ملف وحجمه حسب الحاوية
export function checkFiles(bucket, files, existing = 0) {
  if (files.length + existing > config.maxFiles) throw new AppError('too_many');
  for (const f of files) {
    if (!config.mime[bucket]?.includes(mimeOf(f))) throw new AppError('file_type');
    if (f.size > config.maxBytes[bucket]) throw new AppError('file_big');
  }
}
