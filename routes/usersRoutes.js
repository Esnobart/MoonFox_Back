import { Router } from 'express';

import { userSignUp, userLogin, userLogout, userVerify, forgotPassword, resetPassword, currentUser } from '../controllers/usersControllers.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { validateBody } from '../middleware/validateBody.js';
import { signUpSchema, signInSchema, forgotPasswordSchema, resetPasswordSchema } from '../schemas/usersSchemas.js';
import { signUpLimiter, authLimiter, passwordResetLimiter } from '../middleware/rateLimiter.js';

const usersRouter = Router();

usersRouter.post('/signup', signUpLimiter, validateBody(signUpSchema), userSignUp);

usersRouter.post('/signin', authLimiter, validateBody(signInSchema), userLogin);

usersRouter.post('/logout', userLogout);

usersRouter.get('/current', authMiddleware, currentUser);

usersRouter.get('/verify/:verificationToken', userVerify);

usersRouter.post('/forgot-password', passwordResetLimiter, validateBody(forgotPasswordSchema), forgotPassword);

usersRouter.patch('/reset-password/:resetToken', passwordResetLimiter, validateBody(resetPasswordSchema), resetPassword);

export default usersRouter;
