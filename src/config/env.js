module.exports = {
  // JWT
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',

  // Google OAuth
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,

  // App
  port: process.env.PORT || 8000,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  nodeEnv: process.env.NODE_ENV || 'development',

  // OpenAI / OCR
  openaiApiKey: process.env.OPENAI_API_KEY,
  ocrApiKey: process.env.OCR_API_KEY,

  // ── OCR Vision LLM ──
  // Provider: 'gemini' (Google AI Studio, OpenAI-compatible) | 'openrouter'.
  ocrProvider: (process.env.OCR_PROVIDER || 'gemini').toLowerCase(),
  geminiApiKey: process.env.GEMINI_API_KEY,
  geminiBaseUrl:
    process.env.GEMINI_BASE_URL ||
    'https://generativelanguage.googleapis.com/v1beta/openai/',
  openrouterApiKey: process.env.OPENROUTER_API_KEY,
  openrouterBaseUrl: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
  // Primary model + ordered fallbacks (tried on 429/5xx).
  ocrModel: process.env.OCR_MODEL || 'gemini-2.5-flash-lite',
  ocrFallbackModels: (process.env.OCR_FALLBACK_MODELS || 'gemini-2.5-flash,gemini-2.0-flash')
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean),
  // Disable Gemini 2.5 "thinking" for 2-3x speed: none|low|medium|high ('' = model default).
  ocrReasoningEffort: process.env.OCR_REASONING_EFFORT || '',

  // ── OCR performance / concurrency ──
  ocrMaxConcurrent: Number(process.env.OCR_MAX_CONCURRENT || 4),
  ocrMaxPerMin: Number(process.env.OCR_MAX_PER_MIN || 18),
  ocrCallTimeoutMs: Number(process.env.OCR_CALL_TIMEOUT_MS || 30000),
  ocrModelCooldownMs: Number(process.env.OCR_MODEL_COOLDOWN_MS || 30000),
  ocrCacheTtlMs: Number(process.env.OCR_CACHE_TTL_MS || 86400000),
  ocrCacheMax: Number(process.env.OCR_CACHE_MAX || 500),

  // Enrichment: MyMemory email (raises free quota 5k→50k chars/day). Optional.
  myMemoryEmail: process.env.MYMEMORY_EMAIL || '',
  // This machine intercepts HTTPS (cert errors) → skip TLS verify on outbound OCR/enrich calls.
  ocrInsecureTls: String(process.env.OCR_INSECURE_TLS || '').toLowerCase() === 'true',

  // MongoDB
  mongodbUri: process.env.MONGODB_URI || process.env.DATABASE_URL,

  // Cloudflare R2
  r2AccessKeyId: process.env.R2_ACCESS_KEY_ID,
  r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  r2Endpoint: process.env.R2_ENDPOINT,
  r2BucketName: process.env.R2_BUCKET_NAME,
  r2PublicUrl: process.env.R2_PUBLIC_URL,
};
