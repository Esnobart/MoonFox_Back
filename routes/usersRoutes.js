import { Router } from 'express';

import { userSignUp, userLogin, userLogout } from '../controllers/usersControllers.js';

const usersRouter = Router();

usersRouter.post('/signup', userSignUp);

usersRouter.patch('/signin', userLogin);

usersRouter.patch('/logout', userLogout);

export default usersRouter;