import { isValidObjectId } from 'mongoose';

import ProductSubmission from '../models/productsSubmissionModel.js';
import Product from '../models/productsModel.js';
import User from '../models/usersModel.js';

const assertValidObjectId = (id, entityName) => {
    if (!isValidObjectId(id)) {
        const error = new Error(`Invalid ${entityName} id`);
        error.status = 400;
        throw error;
    }
};

const assertPendingSubmission = (submission) => {
    if (submission.status !== 'Pending') {
        const error = new Error('Product submission has already been reviewed');
        error.status = 400;
        throw error;
    }
};

async function getAllProductSubmissions() {
    return ProductSubmission.find({ status: 'Pending' }).populate('creator', 'username email');
};

async function sendRequestToSubmitProduct(userId, productData) {
    assertValidObjectId(userId, 'user');

    const user = await User.findById(userId);
    if (!user) {
        const error = new Error('User not found');
        error.status = 404;
        throw error;
    }

    return ProductSubmission.create({
        creator: user._id,
        product: productData,
        status: 'Pending'
    });
};

async function submitNewProduct(submissionId, reviewerId) {
    assertValidObjectId(submissionId, 'submission');
    assertValidObjectId(reviewerId, 'reviewer');

    const submission = await ProductSubmission.findById(submissionId);
    if (!submission) {
        const error = new Error('Submission not found');
        error.status = 404;
        throw error;
    }

    assertPendingSubmission(submission);

    const newProduct = await Product.create({
        name: submission.product.name,
        img: submission.product.img,
        author: submission.product.author,
        collectionName: submission.product.collectionName,
        popular: submission.product.popular,
        inStock: submission.product.inStock
    });

    submission.status = 'Approved';
    submission.reviewedBy = reviewerId;
    await submission.save();

    return newProduct;
};

async function rejectNewProduct(submissionId, reviewerId, rejectionReason) {
    assertValidObjectId(submissionId, 'submission');
    assertValidObjectId(reviewerId, 'reviewer');

    const submission = await ProductSubmission.findById(submissionId);
    if (!submission) {
        const error = new Error('Submission not found');
        error.status = 404;
        throw error;
    }

    assertPendingSubmission(submission);

    submission.status = 'Rejected';
    submission.reviewedBy = reviewerId;
    submission.rejectionReason = rejectionReason;
    await submission.save();

    return submission;
};

export { getAllProductSubmissions, sendRequestToSubmitProduct, submitNewProduct, rejectNewProduct };
