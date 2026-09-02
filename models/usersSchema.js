import * as z from 'zod';

const emailSchema = z.string().trim().toLowerCase().email({ message: 'Invalid email address' });
const passwordSchema = z.string().min(8, { message: 'Password must be at least 8 characters long' }).max(100, { message: 'Password must be at most 100 characters long' }).refine((value) => value.trim().length > 0, { message: 'Password cannot be empty or whitespace' });
const usernameSchema = z.string().trim().min(3, { message: 'Username must be at least 3 characters long' }).max(30, { message: 'Username must be at most 30 characters long' });

export const signUpSchema = z.strictObject({
    username: usernameSchema,
    email: emailSchema,
    password: passwordSchema
});

export const signInSchema = z.strictObject({
    email: emailSchema.optional(),
    username: usernameSchema.optional(),
    password: passwordSchema
}).refine((data) => data.email || data.username, {
    message: 'Either email or username is required'
});

export const forgotPasswordSchema = z.strictObject({
    email: emailSchema
});

export const resetPasswordSchema = z.strictObject({
    newPassword: passwordSchema
});