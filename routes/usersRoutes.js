import { Routes } from 'express';

const usersRouter = Router();

usersRouter.post('/signup', userSignUp);

usersRouter.post('/login', userLogin);