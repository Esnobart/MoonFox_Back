import { Router } from 'express';

const ordersRouter = Router();

ordersRouter.post('/checkout', checkoutController);

export default ordersRouter;