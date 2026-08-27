import rateLimit from 'express-rate-limit';

/**
 * General baseline for all API traffic — generous, just a backstop against
 * runaway clients/bots rather than a tight limit on legitimate use.
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests. Please try again shortly.' },
});

/**
 * Auth endpoints (login, register, password reset request) — tighter, since
 * these are the classic brute-force / credential-stuffing / enumeration
 * targets. Scoped separately from the general limiter rather than just
 * lowering the global number, so normal browsing isn't penalized for it.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many attempts. Please wait a few minutes and try again.' },
});

/**
 * Public, unauthenticated write endpoints (Contact, Become an Agent) —
 * flagged in the V2.1 audit as spammable with no protection at all. This
 * closes that gap without touching the endpoints' own logic.
 */
export const publicFormLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many submissions from this device. Please try again later.' },
});
