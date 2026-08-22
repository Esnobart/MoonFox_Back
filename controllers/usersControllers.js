import { signUpUser, loginUser, verifyUser, requestPasswordReset, setNewPassword, buildPublicUser } from '../services/usersServices.js';
import User from "../models/usersModel.js"
import { signToken } from '../services/jwtService.js';
import { AUTH_COOKIE_NAME, authCookieOptions, loginCookieOptions, parseCookies } from '../services/authCookieService.js';

const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

export const userSignUp = async (req, res, next) => {
    try {
        const user = await signUpUser(req.body);
        res.status(201).json(user);
    } catch (error) {
        next(error);
    }
}

export const userLogin = async (req, res, next) => {
    try {
        const response = await loginUser(req.body);

        res.cookie(AUTH_COOKIE_NAME, response.token, loginCookieOptions);
        res.status(200).json({
            message: response.message,
            user: response.user,
        });
    } catch (error) {
        next(error);
    }
}

export const userLogout = async (req, res, next) => {
    try {
        const cookies = parseCookies(req.headers.cookie);
        const token = cookies[AUTH_COOKIE_NAME];

        if (token) {
            await User.findOneAndUpdate({ token }, { token: null });
        }

        res.clearCookie(AUTH_COOKIE_NAME, authCookieOptions);
        res.status(200).json({ message: 'User logged out successfully' });
    } catch (error) {
        next(error)
    }
}

export const currentUser = async (req, res, next) => {
    try {
        const token = signToken(req.user._id);

        req.user.token = token;
        await req.user.save();

        res.cookie(AUTH_COOKIE_NAME, token, loginCookieOptions);
        res.status(200).json({ user: buildPublicUser(req.user) });
    } catch (error) {
        next(error);
    }
}

export const userVerify = async (req, res, next) => {
    try {
        const user = await verifyUser(req.params.verificationToken);
        if (!user) throw new Error('User not found');
        res.redirect(`${clientUrl}/?verified=true`);
    } catch (error) {
        next(error);
    }
}

export const forgotPassword = async (req, res, next) => {
    try {
        const response = await requestPasswordReset(req.body.email);
        res.status(200).json(response);
    } catch (error) {
        next(error);
    }
}

export const resetPassword = async (req, res, next) => {
    try {
        const response = await setNewPassword(req.params.resetToken, req.body.newPassword);
        res.status(200).json(response);
    } catch (error) {
        next(error);
    }
}
