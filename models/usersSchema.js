import * as z from 'zod';

const emailSchema = z.string().trim().toLowerCase().email({ message: 'Invalid email address' });
const passwordSchema = z.string().min(8, { message: 'Password must be at least 8 characters long' }).max(100, { message: 'Password must be at most 100 characters long' }).refine((value) => value.trim().length > 0, { message: 'Password cannot be empty or whitespace' });
const usernameSchema = z.string().trim().min(3, { message: 'Username must be at least 3 characters long' }).max(30, { message: 'Username must be at most 30 characters long' });
const identifierSchema = z.string().trim().min(3, { message: 'Email or username is required' }).max(254, { message: 'Email or username is too long' });

export const signUpSchema = z.strictObject({
    username: usernameSchema,
    email: emailSchema,
    password: passwordSchema
});

export const signInSchema = z.strictObject({
    identifier: identifierSchema,
    password: passwordSchema
});

export const forgotPasswordSchema = z.strictObject({
    email: emailSchema
});

export const resetPasswordSchema = z.strictObject({
    newPassword: passwordSchema
});

export const basketQuantitySchema = z.strictObject({
    quantity: z.number().int({ message: 'Quantity must be an integer' }).min(1, { message: 'Quantity must be at least 1' })
});
