const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
})[character]);

const withoutTrailingSlash = (url) => url.replace(/\/+$/, '');

const renderEmail = ({ subject, preheader, label, title, description, action, actionUrl, note, clientUrl }) => {
    const safeActionUrl = escapeHtml(actionUrl);
    const safeClientUrl = escapeHtml(`${withoutTrailingSlash(clientUrl)}/`);

    return {
        subject,
        text: `MoonFox\n\n${title}\n\n${description}\n\n${action}:\n${actionUrl}\n\n${note}\n\nMoonFox — Artist collabs, prints & merch.\n${withoutTrailingSlash(clientUrl)}/`,
        html: `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="light" />
    <meta name="supported-color-schemes" content="light" />
    <title>${escapeHtml(subject)}</title>
    <style>
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        a:focus-visible { outline: 2px solid #0a33d9; outline-offset: 4px; }
        @media only screen and (max-width: 620px) {
            .page-padding { padding: 24px 16px !important; }
            .card-padding { padding: 28px 24px !important; }
            .email-title { font-size: 28px !important; line-height: 36px !important; }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; width: 100%; background-color: #f8f7fb; color: #14101b;">
    <div style="display: none; font-size: 1px; line-height: 1px; color: #f8f7fb; max-height: 0; max-width: 0; opacity: 0; overflow: hidden; mso-hide: all;">${escapeHtml(preheader)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#f8f7fb">
        <tr>
            <td class="page-padding" align="center" style="padding: 48px 24px;">
                <!--[if mso]><table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0"><tr><td><![endif]-->
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; font-family: Manrope, 'Segoe UI', Arial, sans-serif;">
                    <tr>
                        <td>
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#ffffff" style="border: 1px solid #e6e1ef; border-radius: 16px; border-spacing: 0;">
                                <tr>
                                    <td class="card-padding" style="padding: 28px 40px; border-bottom: 1px solid #e6e1ef;">
                                        <a href="${safeClientUrl}" style="display: inline-block; color: #0a33d9; text-decoration: none;" aria-label="MoonFox home">
                                            <img src="cid:moonfox-logo" width="40" height="40" alt="" style="display: inline-block; vertical-align: middle; border: 0;" />
                                            <span style="display: inline-block; vertical-align: middle; padding-left: 8px; font-size: 28px; line-height: 40px; font-weight: 700; color: #0a33d9;">Moon<span style="color: #12b8c8;">Fox</span></span>
                                        </a>
                                    </td>
                                </tr>
                                <tr>
                                    <td class="card-padding" style="padding: 40px;">
                                        <p style="margin: 0 0 16px; color: #0a33d9; font-size: 12px; line-height: 18px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase;">${escapeHtml(label)}</p>
                                        <h1 class="email-title" style="margin: 0 0 16px; color: #14101b; font-size: 32px; line-height: 40px; font-weight: 600; letter-spacing: -0.7px;">${escapeHtml(title)}</h1>
                                        <p style="margin: 0; color: #6b6375; font-size: 16px; line-height: 26px;">${escapeHtml(description)}</p>
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-top: 28px;">
                                            <tr>
                                                <td align="center" bgcolor="#0a33d9" style="border-radius: 25px; mso-padding-alt: 14px 28px;">
                                                    <a href="${safeActionUrl}" style="display: inline-block; padding: 14px 28px; border: 1px solid #0a33d9; border-radius: 25px; color: #ffffff; font-size: 16px; line-height: 22px; font-weight: 600; text-align: center; text-decoration: none; mso-padding-alt: 0;">${escapeHtml(action)}</a>
                                                </td>
                                            </tr>
                                        </table>
                                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 28px;">
                                            <tr>
                                                <td bgcolor="#f8f7fb" style="padding: 16px 20px; border: 1px solid #e6e1ef; border-radius: 8px; color: #6b6375; font-size: 13px; line-height: 21px;">${escapeHtml(note)}</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                                <tr>
                                    <td class="card-padding" style="padding: 24px 40px; border-top: 1px solid #e6e1ef;">
                                        <p style="margin: 0 0 8px; color: #6b6375; font-size: 12px; line-height: 20px;">Button not working? Copy and paste this link into your browser:</p>
                                        <p style="margin: 0; font-size: 12px; line-height: 20px; overflow-wrap: anywhere; word-break: break-all;"><a href="${safeActionUrl}" style="color: #0a33d9; text-decoration: underline;">${safeActionUrl}</a></p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td align="center" style="padding: 24px 16px 0;">
                            <p style="margin: 0 0 6px; color: #6b6375; font-size: 12px; line-height: 20px;">Artist collabs, prints &amp; merch.</p>
                            <p style="margin: 0; color: #6b6375; font-size: 12px; line-height: 20px;">&copy; ${new Date().getFullYear()} <a href="${safeClientUrl}" style="color: #6b6375; text-decoration: none;">MoonFox</a>. All rights reserved.</p>
                        </td>
                    </tr>
                </table>
                <!--[if mso]></td></tr></table><![endif]-->
            </td>
        </tr>
    </table>
</body>
</html>`
    };
};

export const createVerificationEmail = ({ token, apiUrl, clientUrl }) => renderEmail({
    subject: 'Verify your MoonFox email',
    preheader: 'One last step: confirm your email to activate your MoonFox account.',
    label: 'Welcome to MoonFox',
    title: 'Verify your email',
    description: 'Thanks for joining MoonFox. Confirm your email address to activate your account and make yourself at home.',
    action: 'Verify email',
    actionUrl: `${withoutTrailingSlash(apiUrl)}/users/verify/${encodeURIComponent(token)}`,
    note: 'If you didn’t create a MoonFox account, you can safely ignore this email.',
    clientUrl
});

export const createPasswordResetEmail = ({ token, clientUrl }) => renderEmail({
    subject: 'Reset your MoonFox password',
    preheader: 'Choose a new MoonFox password. Your reset link is valid for one hour.',
    label: 'Account security',
    title: 'Reset your password',
    description: 'We received a request to reset the password for your MoonFox account. Use the button below to choose a new one.',
    action: 'Reset password',
    actionUrl: `${withoutTrailingSlash(clientUrl)}/?resetToken=${encodeURIComponent(token)}`,
    note: 'This link expires in 1 hour. If you didn’t request a password reset, you can safely ignore this email. Your password will stay the same.',
    clientUrl
});
