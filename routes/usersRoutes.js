import { Router } from 'express';

import { userSignUp, userLogin, userLogout, userVerify, forgotPassword, resetPassword, currentUser } from '../controllers/usersControllers.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const usersRouter = Router();

usersRouter.post('/signup', userSignUp);

usersRouter.post('/signin', userLogin);

usersRouter.post('/logout', userLogout);

usersRouter.get('/current', authMiddleware, currentUser);

usersRouter.get('/verify/:verificationToken', userVerify);

usersRouter.post('/forgot-password', forgotPassword);

usersRouter.patch('/reset-password/:resetToken', resetPassword);

export default usersRouter;
