// الإعدادات تأتي من متغيرات البيئة (ملف .env) ولا تُكتب داخل الكود.
const env = import.meta.env ?? {};
const MB = 1024 * 1024;

// صور + فيديو + مستندات (بدون HTML أو SVG أو ملفات تنفيذية)
const MEDIA = [
  'image/jpeg', 'image/png', 'image/webp',
  'video/mp4', 'video/quicktime', 'video/webm',
  'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain',
];

export const config = {
  url: env.VITE_SUPABASE_URL ?? '',
  anonKey: env.VITE_SUPABASE_ANON_KEY ?? '',
  buckets: { receipts: 'receipts', contracts: 'contracts', updates: 'updates', visits: 'visits' },
  maxFileBytes: 10 * MB,
  maxFiles: 10,
  maxBytes: { receipts: 10 * MB, contracts: 10 * MB, updates: 50 * MB, visits: 50 * MB },
  signedUrlTtl: 3600,
  mime: {
    receipts: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    contracts: ['application/pdf'],
    updates: MEDIA,
    visits: MEDIA,
  },
};

export const isConfigured = Boolean(config.url && config.anonKey);