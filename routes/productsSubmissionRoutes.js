import { Router } from 'express';

import { getAllProductSubmissionsController, sendRequestToSubmitProductController, submitNewProductController, rejectNewProductController } from '../controllers/productsSubmissionController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { allowRoles } from '../middleware/roleMiddleware.js';

const productSubmissionRouter = Router();

productSubmissionRouter.get('/submissions', authMiddleware, allowRoles('Admin'), getAllProductSubmissionsController);

productSubmissionRouter.post('/submit', authMiddleware, allowRoles('Creator'), sendRequestToSubmitProductController);

productSubmissionRouter.post('/submissions/:submissionId/submit', authMiddleware, allowRoles('Admin'), submitNewProductController);

productSubmissionRouter.post('/submissions/:submissionId/reject', authMiddleware, allowRoles('Admin'), rejectNewProductController);

export default productSubmissionRouter;
