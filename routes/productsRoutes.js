import { Router } from 'express';

import { getProductByIdController, getProductsController, updateProductController } from '../controllers/productsControllers.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { allowRoles } from '../middleware/roleMiddleware.js';
import { productUpdateUpload } from '../middleware/productUpdateUpload.js';

const productsRouter = Router();

productsRouter.get('/', getProductsController);

productsRouter.get('/:productId', getProductByIdController);

productsRouter.patch('/:productId', authMiddleware, allowRoles('Admin'), productUpdateUpload, updateProductController);

export default productsRouter;
