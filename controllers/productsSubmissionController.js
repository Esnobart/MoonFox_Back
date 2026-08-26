import { getAllProductSubmissions, sendRequestToSubmitProduct, submitNewProduct, rejectNewProduct } from '../services/productsSubmissionService.js';

export const getAllProductSubmissionsController = async (req, res, next) => {
    try {
        const submissions = await getAllProductSubmissions();
        res.status(200).json(submissions);
    } catch (error) {
        next(error);
    }
};

export const sendRequestToSubmitProductController = async (req, res, next) => {
    try {
        const submission = await sendRequestToSubmitProduct(req.user._id, req.body);
        res.status(201).json({ message: 'Product submission request sent successfully', submission });
    } catch (error) {
        next(error);
    }
};

export const submitNewProductController = async (req, res, next) => {
    try {
        const product = await submitNewProduct(req.params.submissionId, req.user._id);
        res.status(200).json({ message: 'Product submitted successfully', product });
    } catch (error) {
        next(error);
    }
};

export const rejectNewProductController = async (req, res, next) => {
    try {
        const submission = await rejectNewProduct(req.params.submissionId, req.user._id, req.body.rejectionReason);
        res.status(200).json({ message: 'Product submission rejected successfully', submission });
    } catch (error) {
        next(error);
    }
};
