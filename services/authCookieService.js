export const AUTH_COOKIE_NAME = 'token';

const isProduction = process.env.NODE_ENV === 'production';
const configuredSessionDays = Number(process.env.AUTH_SESSION_DAYS);
export const AUTH_SESSION_DAYS = Number.isFinite(configuredSessionDays) && configuredSessionDays > 0
    ? configuredSessionDays
    : 90;
export const AUTH_TOKEN_EXPIRES_IN = `${AUTH_SESSION_DAYS}d`;
export const AUTH_SESSION_MAX_AGE = AUTH_SESSION_DAYS * 24 * 60 * 60 * 1000;

export const authCookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
};

export const loginCookieOptions = {
    ...authCookieOptions,
    maxAge: AUTH_SESSION_MAX_AGE,
};

export const parseCookies = (cookieHeader = '') => {
    return cookieHeader.split(';').reduce((cookies, cookie) => {
        const separatorIndex = cookie.indexOf('=');

        if (separatorIndex === -1) return cookies;

        const key = cookie.slice(0, separatorIndex).trim();
        const value = cookie.slice(separatorIndex + 1).trim();

        if (key) cookies[key] = decodeURIComponent(value);

        return cookies;
    }, {});
};
