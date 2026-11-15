require('dotenv').config();

const isProd = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
}

const env = {
  isProd,
  isTest,
  port: Number(process.env.PORT || 4000),
  mongoUri: required('MONGODB_URI', isProd ? undefined : 'mongodb://127.0.0.1:27017/courselens'),
  // In production the secrets MUST come from the hosting platform's environment.
  jwtSecret: required('JWT_SECRET', isProd ? undefined : 'dev-only-access-secret-change-me'),
  jwtRefreshSecret: required('JWT_REFRESH_SECRET', isProd ? undefined : 'dev-only-refresh-secret-change-me'),
  fileUrlSecret: required('FILE_URL_SECRET', isProd ? undefined : 'dev-only-file-url-secret-change-me'),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  corsOrigins: (process.env.CORS_ORIGINS || process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL || '15m',
  // Sliding refresh window: a session ends after this much inactivity (FR-02).
  sessionIdleTtl: process.env.SESSION_IDLE_TTL || '2h',
  rememberMeTtl: process.env.REMEMBER_ME_TTL || '30d',
  uploadDir: process.env.UPLOAD_DIR || require('path').join(__dirname, '..', '..', 'uploads'),
  maxUploadBytes: 10 * 1024 * 1024,
  resendApiKey: process.env.RESEND_API_KEY || '',
  emailFrom: process.env.EMAIL_FROM || 'CourseLens <no-reply@courselens.app>',
  cloudinaryUrl: process.env.CLOUDINARY_URL || '',
  cloudinaryFolder: process.env.CLOUDINARY_FOLDER || 'courselens/dev',
  trustProxy: process.env.TRUST_PROXY ? Number(process.env.TRUST_PROXY) : isProd ? 1 : 0,
};

module.exports = env;
