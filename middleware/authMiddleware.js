import User from '../models/usersModel.js';
import { verifyToken } from '../services/jwtService.js';
import { AUTH_COOKIE_NAME, parseCookies } from '../services/authCookieService.js';

export const authMiddleware = async (req, res, next) => {
    try {
        const cookies = parseCookies(req.headers.cookie);
        const token = cookies[AUTH_COOKIE_NAME];

        if (!token) return res.status(401).json({ message: 'Not authorized' });

        const { id, sessionVersion } = verifyToken(token);
        const user = await User.findById(id);

        if (!user || user.sessionVersion !== sessionVersion) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Not authorized' });
    }
};
