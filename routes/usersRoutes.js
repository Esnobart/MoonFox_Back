import { Router } from 'express';

import {
    userSignUp,
    userLogin,
    userLogout,
    userVerify,
    forgotPassword,
    resetPassword,
    currentUser,
    publicUserProfile,
    addWishlistProduct,
    removeWishlistProduct,
    addBasketProduct,
    updateBasketProductQuantity,
    removeBasketProduct
} from '../controllers/usersControllers.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { validateBody } from '../middleware/validateBody.js';
import { signUpSchema, signInSchema, forgotPasswordSchema, resetPasswordSchema, basketQuantitySchema } from '../models/usersSchema.js';
import { signUpLimiter, authLimiter, passwordResetLimiter } from '../middleware/rateLimiter.js';

const usersRouter = Router();

usersRouter.post('/signup', signUpLimiter, validateBody(signUpSchema), userSignUp);

usersRouter.post('/signin', authLimiter, validateBody(signInSchema), userLogin);

usersRouter.post('/logout', userLogout);

usersRouter.get('/current', authMiddleware, currentUser);

usersRouter.get('/profile/:username', publicUserProfile);

usersRouter.get('/verify/:verificationToken', userVerify);

usersRouter.post('/forgot-password', passwordResetLimiter, validateBody(forgotPasswordSchema), forgotPassword);

usersRouter.patch('/reset-password/:resetToken', passwordResetLimiter, validateBody(resetPasswordSchema), resetPassword);

usersRouter.post('/wishlist/:productId', authMiddleware, addWishlistProduct);

usersRouter.delete('/wishlist/:productId', authMiddleware, removeWishlistProduct);

usersRouter.post('/basket/:productId', authMiddleware, validateBody(basketQuantitySchema), addBasketProduct);

usersRouter.patch('/basket/:productId', authMiddleware, validateBody(basketQuantitySchema), updateBasketProductQuantity);

usersRouter.delete('/basket/:productId', authMiddleware, removeBasketProduct);

export default usersRouter;
