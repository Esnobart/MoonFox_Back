import { rateLimit } from 'express-rate-limit';

export const signUpLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    limit: 3,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { message: 'Too many sign up requests. Try again later.' }
});

export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 5,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { message: 'Too many requests. Try again later.' }
});

export const passwordResetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    limit: 3,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { message: 'Too many password reset requests. Try again later.' }
});