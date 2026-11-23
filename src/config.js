// الإعدادات تأتي من متغيرات البيئة (ملف .env) ولا تُكتب داخل الكود.
const env = import.meta.env ?? {};

export const config = {
  url: env.VITE_SUPABASE_URL ?? '',
  anonKey: env.VITE_SUPABASE_ANON_KEY ?? '',
  buckets: { receipts: 'receipts', contracts: 'contracts', updates: 'updates', visits: 'visits' },
  maxFileBytes: 10 * 1024 * 1024,
  signedUrlTtl: 3600,
  mime: {
    receipts: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    contracts: ['application/pdf'],
    updates: ['image/jpeg', 'image/png', 'image/webp'],
    visits: ['image/jpeg', 'image/png', 'image/webp'],
  },
};

export const isConfigured = Boolean(config.url && config.anonKey);
