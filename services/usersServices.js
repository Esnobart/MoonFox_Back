import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

import User from '../models/usersModel.js';
import Product from '../models/productsModel.js';
import { createHashPassword, comparePassword } from './passwordHashService.js';
import { sendEmailVerify, sendEmailReset } from './emailService.js';
import { signToken } from './jwtService.js';

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
    if (!user) throw new Error('Invalid credentials');
    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) throw new Error('Invalid credentials');
    if (!user.verify) throw new Error('User not verified');
    const token = signToken(user._id, user.sessionVersion);
    return { message: `User ${user.username} logged in successfully`, token, user: buildPublicUser(user) };
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
