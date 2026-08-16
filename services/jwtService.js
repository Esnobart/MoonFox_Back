import jwt from 'jsonwebtoken';
import { AUTH_TOKEN_EXPIRES_IN } from './authCookieService.js';

export const signToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: AUTH_TOKEN_EXPIRES_IN });
};

export const verifyToken = (token) => {
    if (!token) throw new Error('No token provided');
    try {
        const { id } = jwt.verify(token, process.env.JWT_SECRET);
        return id;
    } catch (error) {
        throw new Error('Invalid token');
    }
};
