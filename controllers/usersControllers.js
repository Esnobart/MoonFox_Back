import jwt from 'jsonwebtoken';

import {
    signUpUser,
    loginUser,
    userAuthXService,
    userAuthXCallbackService,
    loginOrRegisterWithX,
    verifyUser,
    requestPasswordReset,
    setNewPassword,
    getPublicUserProfile,
    addProductToWishlist,
    removeProductFromWishlist,
    addProductToBasket,
    updateProductQuantityInBasket,
    removeProductFromBasket,
    buildPublicUser,
    userProductsPopulate,
    userAuthGoogleService,
    userAuthGoogleCallbackService,
    loginOrRegisterWithGoogle
} from '../services/usersServices.js';
import { signToken } from '../services/jwtService.js';
import { AUTH_COOKIE_NAME, authCookieOptions, loginCookieOptions, parseCookies } from '../services/authCookieService.js';
import { updateUserProfile } from '../services/userProfileService.js';

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

export const userAuthX = async (req, res, next) => {
    try {
        const response = await userAuthXService(req.body, res);

        res.redirect(302, response);
    } catch (error) {
        next(error);
    }
}

export const userAuthXCallback = async (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    res.set('Referrer-Policy', 'no-referrer');

    res.clearCookie('x_oauth', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/api/users/auth/x'
    });

    let flow;

    try {
        const cookies = parseCookies(req.headers.cookie);

        flow = jwt.verify(cookies.x_oauth, process.env.JWT_SECRET, {
            algorithms: ['HS256']
        });

        if (
            flow.purpose !== 'x_auth' ||
            typeof req.query.state !== 'string' ||
            flow.state !== req.query.state ||
            typeof flow.codeVerifier !== 'string'
        ) throw new Error('Invalid authorization attempt');
    } catch {
        return res.status(400).json({ message: 'Authorization attempt expired or is invalid. Try again.'});
    }

    if (req.query.error !== undefined) 
        return res.status(400).json({ message: 'Authorization with X was cancelled' });

    const { code } = req.query;
    if (typeof code !== 'string' || !code || code.length > 2048) 
        return res.status(400).json({ message: 'Authorization code is missing or invalid' });

    try {
        const profile = await userAuthXCallbackService(code, flow.codeVerifier);
        const response = await loginOrRegisterWithX(profile);

        res.cookie(AUTH_COOKIE_NAME, response.token, loginCookieOptions);

        return res.redirect(303, clientUrl);
    } catch (error) {
        next(error);
    }
}

export const userAuthGoogle = async (req, res, next) => {
    try {
        const authUrl = await userAuthGoogleService(res);

        return res.redirect(302, authUrl);
    } catch (error) {
        next (error)
    }
}

export const userAuthGoogleCallback = async (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    res.set('Referrer-Policy', 'no-referrer');

    res.clearCookie('google_oauth', {
        httpOnly: true,
        secure: process.env.NODE_ENV,
        sameSite: 'lax',
        path: '/api/users/auth/google'
    });

    let flow;

    try {
        const cookies = parseCookies(req.headers.cookie);

        flow = jwt.verify(
            cookies.google_oauth,
            process.env.JWT_SECRET,
            { algorithms: ['HS256']}
        );

        if (
            flow.purpose !== 'google_auth' ||
            typeof req.query.state !== 'string' ||
            flow.state !== req.query.state ||
            typeof flow.codeVerifier !== 'string' ||
            !flow.codeVerifier ||
            typeof flow.nonce !== 'string' ||
            !flow.nonce
        ) throw new Error('Invalid authorization attempt');
    } catch {
        return res.status(400).json({ message: 'Authorization attempt expired or is invalid. Try again' })
    }

    if (req.query.error !== undefined) 
        return res.status(400).json({ message: 'Authorization with Google was cancelled'});

    const { code } = req.query;
    if (typeof code !== 'string' || !code || code.length > 2048) 
        return res.status(400).json({ message: 'Authorization code is missing or invalid' });

    try {
        const profile = await userAuthGoogleCallbackService(code, flow);
        const response = await loginOrRegisterWithGoogle(profile);

        res.cookie(AUTH_COOKIE_NAME, response.token, loginCookieOptions);

        return res.redirect(303, clientUrl);
    } catch (error) {
        next(error)
    }
}

export const userLogout = async (req, res, next) => {
    try {
        res.clearCookie(AUTH_COOKIE_NAME, authCookieOptions);
        res.status(200).json({ message: 'User logged out successfully' });
    } catch (error) {
        next(error)
    }
}

export const currentUser = async (req, res, next) => {
    try {
        const token = signToken(req.user._id, req.user.sessionVersion);

        await req.user.populate(userProductsPopulate);

        res.cookie(AUTH_COOKIE_NAME, token, loginCookieOptions);
        res.status(200).json({ user: buildPublicUser(req.user) });
    } catch (error) {
        next(error);
    }
}

export const updateCurrentUser = async (req, res, next) => {
    try {
        const user = await updateUserProfile(req.user, req.body, req.files);
        res.status(200).json({ message: 'Profile updated successfully', user });
    } catch (error) {
        next(error);
    }
};

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

export const publicUserProfile = async (req, res, next) => {
    try {
        const user = await getPublicUserProfile(req.params.username);
        res.status(200).json({ user });
    } catch (error) {
        next(error);
    }
};

export const addWishlistProduct = async (req, res, next) => {
    try {
        const user = await addProductToWishlist(req.user._id, req.params.productId);
        res.status(200).json({ message: 'Product added to wishlist', user });
    } catch (error) {
        next(error);
    }
};

export const removeWishlistProduct = async (req, res, next) => {
    try {
        const user = await removeProductFromWishlist(req.user._id, req.params.productId);
        res.status(200).json({ message: 'Product removed from wishlist', user });
    } catch (error) {
        next(error);
    }
};

export const addBasketProduct = async (req, res, next) => {
    try {
        const user = await addProductToBasket(req.user._id, req.params.productId, req.body.quantity);
        res.status(200).json({ message: 'Product added to basket', user });
    } catch (error) {
        next(error);
    }
};

export const updateBasketProductQuantity = async (req, res, next) => {
    try {
        const user = await updateProductQuantityInBasket(
            req.user._id,
            req.params.productId,
            req.body.quantity
        );
        res.status(200).json({ message: 'Basket quantity updated', user });
    } catch (error) {
        next(error);
    }
};

export const removeBasketProduct = async (req, res, next) => {
    try {
        const user = await removeProductFromBasket(req.user._id, req.params.productId);
        res.status(200).json({ message: 'Product removed from basket', user });
    } catch (error) {
        next(error);
    }
};
