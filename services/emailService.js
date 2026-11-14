import { readFileSync } from 'node:fs';
import sgMail from '@sendgrid/mail';
import dotenv from 'dotenv';

import { createVerificationEmail, createPasswordResetEmail } from './emailTemplates.js';

dotenv.config();

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const apiUrl = process.env.API_URL || 'http://localhost:4000/api';
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

const logoAttachment = {
    content: readFileSync(new URL('./assets/moonfox-logo.png', import.meta.url)).toString('base64'),
    filename: 'moonfox-logo.png',
    type: 'image/png',
    disposition: 'inline',
    content_id: 'moonfox-logo'
};

const sendEmail = async (to, content) => {
    await sgMail.send({
        to,
        from: process.env.SENDGRID_SENDER_EMAIL,
        ...content,
        attachments: [logoAttachment]
    });

    return { message: 'Email sent successfully' };
};

export const sendEmailVerify = async (to, token) => sendEmail(
    to,
    createVerificationEmail({ token, apiUrl, clientUrl })
);

export const sendEmailReset = async (to, token) => sendEmail(
    to,
    createPasswordResetEmail({ token, clientUrl })
);
