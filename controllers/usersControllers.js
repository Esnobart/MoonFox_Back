import {
    signUpUser,
    loginUser,
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
    userProductsPopulate
} from '../services/usersServices.js';
import { signToken } from '../services/jwtService.js';
import { AUTH_COOKIE_NAME, authCookieOptions, loginCookieOptions } from '../services/authCookieService.js';

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
