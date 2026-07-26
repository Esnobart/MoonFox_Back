import sgMail from '@sendgrid/mail';
import dotenv from 'dotenv';

dotenv.config();

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const htmlBodyForVerify = (token) => `
    <div style="background: black; padding: 16px 0 16px 0;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
                <td align="center">
                    <h1 style="font-family: Arial, sans-serif; color: white; margin: 0 0 10px 0;">
                        Please, verify your email for activate your account
                    </h1>
                    <p style="font-family: Arial, sans-serif; color: white; margin: 0 0 10px 0;">
                        Click on the button for verify
                    </p>
                    <a 
                        href="route/${token}" 
                        style="
                            display: inline-block;
                            padding: 10px 20px;
                            color: white;
                            text-decoration: none;
                            font-size: 16px;
                            border: 2px white solid;
                            border-radius: 5px;
                            font-family: Arial, sans-serif;
                        ">
                        Verify
                    </a>
                </td>
            </tr>
        </table>
    </div>
`

const htmlBodyForReset = (token) => `
    <div style="background: black; padding: 16px 0 16px 0;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
        `

export const sendEmailVerify = async (to, token) => {
    const msg = {
        to,
        from: process.env.SENDGRID_SENDER_EMAIL,
        subject: "Email Verification",
        html: htmlBodyForVerify(token)
    };

    await sgMail.send(msg);
    return { message: 'Email sent successfully' };
};

export const sendEmailReset = async (to, token) => {
    const msg = {
        to,
        from: process.env.SENDGRID_SENDER_EMAIL,
        subject: "Password Reset",
        html: htmlBodyForReset(token)
    };

    await sgMail.send(msg);
    return { message: 'Email sent successfully' };
}