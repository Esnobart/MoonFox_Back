import { Router } from 'express';

import { getProductByIdController, getProductsController } from '../controllers/productsControllers.js';

const productsRouter = Router();

productsRouter.get('/', getProductsController);

productsRouter.get('/:productId', getProductByIdController);

export default productsRouter;
