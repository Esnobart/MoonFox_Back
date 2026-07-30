import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

import User from '../models/usersModel.js';
import { createHashPassword, comparePassword } from './passwordHashService.js';
import { sendEmailVerify, sendEmailReset } from './emailService.js';
import { signToken } from './jwtService.js';

async function signUpUser(data) {
    const isExist = await User.findOne({ email: data.email });
    if (isExist) throw new Error('User with this email already exists');
    const password = await createHashPassword(data.password);
    const newUser = await User.create({ ...data, password, verificationToken: uuidv4() });
    if (!newUser) throw new Error('User not created');
    await sendEmailVerify(newUser.email, newUser.verificationToken);
    return { message: `User ${newUser.username} created successfully. Please check your email for verification.` };
}

async function loginUser(data) {
    const user = await User.findOne({ $or: [{ email: data.email }, { username: data.username }] });
    if (!user) throw new Error('Invalid email or username');
    if (!user.verify) throw new Error('User not verified');
    const isMatch = await comparePassword(data.password, user.password);
    if (!isMatch) throw new Error('Invalid password');
    const token = signToken(user._id);
    user.token = token;
    await user.save();
    return { message: `User ${user.username} logged in successfully`, token };
}

async function verifyUser(token) {
    const user = await User.findOne({ verificationToken: token });
    if (user) {
        user.verify = true;
        user.verificationToken = null;
        await user.save();
        return { message: 'User verified successfully' };
    }
    return { message: 'User not found' };
}

async function requestPasswordReset(email) {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return { message: "If this email exists, a reset link has been sent"};
    const resetToken = crypto.randomBytes(32).toString('hex');

    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.passwordResetToken = resetTokenHash;
    user.passwordResetTokenExpiration = new Date(Date.now() + 3600000); // 1 hour
    await user.save();

    await sendEmailReset(user.email, resetToken);
    return { message: "If this email exists, a reset link has been sent" };
}

async function setNewPassword(token, newPassword) {
    const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({ 
        passwordResetToken: resetTokenHash,
        passwordResetTokenExpiration: { $gt: new Date() }
    });

    if (!user) throw new Error('Invalid or expired reset token');

    user.password = await createHashPassword(newPassword);

    user.passwordResetToken = undefined;
    user.passwordResetTokenExpiration = undefined;

    user.token = undefined; // Invalidate any existing JWT tokens

    await user.save();

    return { message: 'Password reset successfully' };
}

export { signUpUser, loginUser, verifyUser, requestPasswordReset, setNewPassword };