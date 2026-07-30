import { signUpUser, loginUser, verifyUser, requestPasswordReset, setNewPassword } from '../services/usersServices.js';
import User from "../models/usersModel.js"

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
        const user = await loginUser(req.body);
        res.status(200).json(user);
    } catch (error) {
        next(error);
    }
}

export const userLogout = async (req, res, next) => {
    try {
        const user = await User.findOneAndUpdate({ token: req.body.token}, { token: null }, { new: true });
        if (!user) return res.status(401).json({ message: 'Invalid token' });

        res.status(200).json(user);
    } catch (error) {
        next(error)
    }
}

export const userVerify = async (req, res, next) => {
    try {
        const user = await verifyUser(req.params.verificationToken);
        if (!user) throw new Error('User not found');
        res.redirect('https://moonfox.vercel.app/verified-successfully');
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