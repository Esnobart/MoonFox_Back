import jwt from 'jsonwebtoken';
import { AUTH_TOKEN_EXPIRES_IN } from './authCookieService.js';

export const signToken = (id, sessionVersion) => {
    return jwt.sign(
        { id, sessionVersion },
        process.env.JWT_SECRET,
        { expiresIn: AUTH_TOKEN_EXPIRES_IN }
    );
};

export const verifyToken = (token) => {
    if (!token) throw new Error('No token provided');
    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);

        if (!payload.id || !Number.isInteger(payload.sessionVersion)) {
            throw new Error('Invalid token payload');
        }

        return payload;
    } catch (error) {
        throw new Error('Invalid token');
    }
};
