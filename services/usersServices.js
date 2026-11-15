import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import * as z from 'zod';
import { OAuth2Client } from 'google-auth-library';

import User from '../models/usersModel.js';
import Product from '../models/productsModel.js';
import { createHashPassword, comparePassword } from './passwordHashService.js';
import { sendEmailVerify, sendEmailReset } from './emailService.js';
import { signToken } from './jwtService.js';

const xClientId = process.env.X_CLIENT_ID;
const xClientSecret = process.env.X_CLIENT_SECRET;
const xRedirectUri = process.env.X_REDIRECT_URI;
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const googleRedirectUri = process.env.GOOGLE_REDIRECT_URI;
const jwtSecret = process.env.JWT_SECRET;

const productRelationsPopulate = [
    { path: 'author', select: 'username avatar role' },
    { path: 'collectionName', select: 'name coverImg' }
];

const userProductsPopulate = [
    {
        path: 'basket.product',
        populate: productRelationsPopulate
    },
    {
        path: 'wishlist',
        populate: productRelationsPopulate
    }
];

const buildPublicUser = (user) => ({
    _id: user._id,
    username: user.username,
    email: user.email,
    avatar: user.avatar,
    role: user.role,
    wishlist: user.wishlist,
    basket: user.basket
});

async function signUpUser(data) {
    const { username, email, password } = data;
    const isExist = await User.findOne({ email: email });
    if (isExist) throw new Error('User with this email already exists');
    const isUsernameExist = await User.findOne({ username: username });
    if (isUsernameExist) throw new Error('User with this username already exists');
    const hashedPassword = await createHashPassword(password);
    const newUser = await User.create({ username, email, password: hashedPassword, verificationToken: uuidv4() });
    if (!newUser) throw new Error('User not created');
    await sendEmailVerify(newUser.email, newUser.verificationToken);
    return { message: `User ${newUser.username} created successfully. Please check your email for verification.` };
}

async function loginUser(data) {
    const { identifier, password } = data;
    const user = await User.findOne({
        $or: [
            { email: identifier.toLowerCase() },
            { username: identifier }
        ]
    })
        .populate(userProductsPopulate).select('+password');
    if (!user || !user.password) throw new Error('Invalid credentials');
    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) throw new Error('Invalid credentials');
    if (!user.verify) throw new Error('User not verified');
    const token = signToken(user._id, user.sessionVersion);
    return { message: `User ${user.username} logged in successfully`, token, user: buildPublicUser(user) };
}

async function userAuthXService(body, res) {
    const state = crypto.randomBytes(32).toString('base64url');
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

    const flowToken = jwt.sign({purpose: 'x_auth', state, codeVerifier}, jwtSecret, { algorithm: 'HS256', expiresIn: '10m' });

    res.set('Cache-Control', 'no-store');
    res.cookie('x_oauth', flowToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/api/users/auth/x', maxAge: 10 * 60 * 1000 });

    const authUrl = new URL(`https://x.com/i/oauth2/authorize`);
    authUrl.search = new URLSearchParams({
        response_type: 'code',
        client_id: xClientId,
        redirect_uri: xRedirectUri,
        scope: 'tweet.read users.read users.email',
        state,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256'
    }).toString();

    return authUrl.toString();
}

async function userAuthXCallbackService(code, codeVerifier) {
    const credentials = Buffer.from(
        `${encodeURIComponent(xClientId)}:${encodeURIComponent(xClientSecret)}`
    ).toString('base64');

    const tokenResponce = await fetch(
        'https://api.x.com/2/oauth2/token',
        {
            method: 'POST',
            headers: {
                Authorization: `Basic ${credentials}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                redirect_uri: xRedirectUri,
                code_verifier: codeVerifier
            }),
            signal: AbortSignal.timeout(10000),
            redirect: 'error'
        }
    );

    if (!tokenResponce.ok) throw new Error('Token exchange failed');

    const token = await tokenResponce.json();

    if (typeof token.access_token !== 'string' || !token.access_token) throw new Error('Invalid token response');

    const profileUrl = new URL('https://api.x.com/2/users/me');
    const fields = ['profile_image_url'];

    if (token.scope?.split(' ').includes('users.email')) fields.push('confirmed_email');

    profileUrl.searchParams.set('user.fields', fields.join(','));

    const profileResponse = await fetch(profileUrl, {
        headers: {
            Authorization: `Bearer ${token.access_token}`
        },
        signal: AbortSignal.timeout(10000),
        redirect: 'error'
    });

    if (!profileResponse.ok) throw new Error('Profile request failed');
    
    const { data } = await profileResponse.json();

    if (typeof data?.id !== 'string' || !data.id) throw new Error('Invalid profile response');

    return {
        id: data.id,
        username: data.username,
        email: data.confirmed_email || null,
        avatar: data.profile_image_url || null
    }
}

async function loginOrRegisterWithX(profile) {
    await User.init();

    const xAcc = {
        id: profile.id,
        username: profile.username,
        profileURL: `https://x.com/${profile.username}`,
        linkedAt: new Date()
    }

    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            let user = await User.findOne({ 'socials.x.id': profile.id });

            if (!user) {
                const emailResult = z.string()
                    .trim()
                    .toLowerCase()
                    .email()
                    .safeParse(profile.email);

                const email = emailResult.data;
                user = await User.findOne({ email });

                if (user) {
                    if (!user.verify) throw new Error('User not verified');

                    const existingXId = user.socials?.x?.id;

                    if (existingXId && existingXId !== profile.id) throw new Error('Another X account is already linked');

                    user = await User.findOneAndUpdate(
                        {
                            _id: user._id,
                            email,
                            verify: true,
                            $or: [
                                { 'socials.x.id': { $exists: false } },
                                { 'socials.x.id':  profile.id }
                            ]
                        },
                        {
                            $set: { 'socials.x': xAcc }
                        },
                        {
                            new: true,
                            runValidators: true
                        }
                    );

                    if (!user) continue;

                } else {
                    let username = profile.username.trim();

                    while (await User.exists({ username })) {
                        username = `${baseName.slice(0, 21)}_${
                            crypto.randomBytes(4).toString('hex')
                        }`;
                    }

                    user = await User.create({
                        username,
                        email,
                        avatar: profile.avatar,
                        verify: true,
                        socials: {
                            x: xAcc
                        }
                    });
                }
            }

            if (!user.verify) throw new Error('Please verify your email before singing in');

            await user.populate(userProductsPopulate);

            return {
                token: signToken(user._id, user.sessionVersion),
                user: buildPublicUser(user)
            }
        } catch (error) {
            if (error.code !== 11000) throw error;
        }
    }

    throw new Error('Account changed during sign-in. Please try again');
}

async function userAuthGoogleService(res) {
    const googleClient = new OAuth2Client(
        googleClientId,
        googleClientSecret,
        googleRedirectUri
    )
    const state = crypto.randomBytes(32).toString('base64url');
    const nonce = crypto.randomBytes(32).toString('base64url');
    const { codeVerifier, codeChallenge } = await googleClient.generateCodeVerifierAsync();

    const flowToken = jwt.sign(
        {
            purpose: 'google_auth',
            state,
            nonce,
            codeVerifier
        },
        jwtSecret,
        {
            algorithm: 'HS256',
            expiresIn: '10m'
        }
    );

    res.set('Cache-Control', 'no-store');
    res.cookie('google_oauth', flowToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV,
        sameSite: 'lax',
        path: '/api/users/auth/google',
        maxAge: 10 * 60 * 1000
    });

    return googleClient.generateAuthUrl({
        scope: ['openid', 'email', 'profile'],
        state,
        nonce,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        prompt: 'select_account'
    })
}

async function userAuthGoogleCallbackService(code, flow) {
    const googleClient = new OAuth2Client(
        googleClientId,
        googleClientSecret,
        googleRedirectUri
    );

    try {
        const { tokens } = await googleClient.getToken({
            code,
            codeVerifier: flow.codeVerifier,
            redirect_uri: googleRedirectUri
        });
        const ticket = await googleClient.verifyIdToken({
            idToken: tokens.id_token,
            audience: googleClientId
        });
        const payload = ticket.getPayload();

        if (
            typeof payload?.sub !== 'string' ||
            !payload.sub ||
            payload.nonce !== flow.nonce
        ) throw new Error('Invalid Google ID token');

        const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : null;
        const emailTrusted = Boolean(
            email &&
            payload.email_verified === true &&
            (
                email.endsWith('@gmail.com') ||
                (typeof payload.hd === 'string' && payload.hd.lenght > 0)
            )
        );

        return {
            id: payload.sub,
            name: payload.name || null,
            email,
            emailTrusted,
            avatar: payload.picture || null
        }
    } catch {
        throw new Error('Could not complete authentification with Google')
    }
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

    user.sessionVersion = (user.sessionVersion || 0) + 1;

    await user.save();

    return { message: 'Password reset successfully' };
}

async function getPublicUserProfile(username) {
    const user = await User.findOne({ username }).select('_id username avatar role');
    if (!user) {
        const error = new Error('User not found');
        error.status = 404;
        throw error;
    }

    const products = await Product.find({ author: user._id })
        .populate('author', 'username avatar role')
        .populate('collectionName', 'name coverImg')
        .sort({ _id: -1 });

    return {
        _id: user._id,
        username: user.username,
        avatar: user.avatar,
        role: user.role,
        products
    };
}

async function addProductToWishlist(userId, productId) {
    const product = await Product.findById(productId);
    if (!product) throw new Error('Product not found');

    const user = await User.findByIdAndUpdate(
        userId,
        { $addToSet: { wishlist: product._id } },
        { new: true }
    );
    if (!user) throw new Error('User not found');

    await user.populate(userProductsPopulate);
    return buildPublicUser(user);
}

async function removeProductFromWishlist(userId, productId) {
    const user = await User.findByIdAndUpdate(
        userId,
        { $pull: { wishlist: productId } },
        { new: true }
    );
    if (!user) throw new Error('User not found');

    await user.populate(userProductsPopulate);
    return buildPublicUser(user);
}

async function addProductToBasket(userId, productId, quantity) {
    if (!Number.isInteger(quantity) || quantity < 1) throw new Error('Quantity must be a positive integer');

    const product = await Product.findById(productId);
    if (!product) throw new Error('Product not found');

    const stockQuantity = Number(product.inStock) || 0;
    if (stockQuantity < 1) throw new Error('Product is out of stock');

    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const basketItem = user.basket.find(
        (item) => item.product.toString() === product._id.toString()
    );
    const newQuantity = (basketItem?.quantity || 0) + quantity;

    if (newQuantity > stockQuantity) throw new Error('Not enough products in stock');

    if (basketItem) basketItem.quantity = newQuantity;
    else user.basket.push({ product: product._id, quantity });

    await user.save();
    await user.populate(userProductsPopulate);
    return buildPublicUser(user);
}

async function updateProductQuantityInBasket(userId, productId, quantity) {
    if (!Number.isInteger(quantity) || quantity < 1) throw new Error('Quantity must be a positive integer');

    const product = await Product.findById(productId);
    if (!product) throw new Error('Product not found');

    const availableQuantity = Number(product.inStock) || 0;

    if (quantity > availableQuantity) throw new Error('Not enough products in stock');

    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const basketItem = user.basket.find(
        (item) => item.product.toString() === product._id.toString()
    );

    if (!basketItem) throw new Error('Product not found in basket');

    basketItem.quantity = quantity;
    await user.save();

    await user.populate(userProductsPopulate);
    return buildPublicUser(user);
}

async function removeProductFromBasket(userId, productId) {
    const user = await User.findByIdAndUpdate(
        userId,
        { $pull: { basket: { product: productId } } },
        { new: true }
    );

    if (!user) throw new Error('User not found');

    await user.populate(userProductsPopulate);
    return buildPublicUser(user);
}

export {
    signUpUser,
    loginUser,
    userAuthXService,
    userAuthXCallbackService,
    loginOrRegisterWithX,
    userAuthGoogleService,
    userAuthGoogleCallbackService,
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
};
