import { isValidObjectId } from 'mongoose';

import Collection from '../models/collectionsModel.js';
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

const findOrCreateCollection = async ({ name, coverImg }) => {
    const normalizedName = name?.trim();
    if (!normalizedName) {
        const error = new Error('Collection is required');
        error.status = 400;
        throw error;
    }

    return Collection.findOneAndUpdate(
        { name: normalizedName },
        {
            $setOnInsert: {
                name: normalizedName,
                coverImg: coverImg || null
            }
        },
        { new: true, upsert: true }
    );
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

    const creator = await User.findById(submission.creator);
    if (!creator) {
        const error = new Error('Creator not found');
        error.status = 404;
        throw error;
    }

    const collection = await findOrCreateCollection({
        name: submission.product.collectionName,
        coverImg: submission.product.img
    });

    const newProduct = await Product.create({
        name: submission.product.name,
        price: submission.product.price,
        description: submission.product.description,
        img: submission.product.img,
        author: creator._id,
        collectionName: collection._id,
        popular: submission.product.popular,
        inStock: submission.product.inStock
    });

    submission.status = 'Approved';
    submission.reviewedBy = reviewerId;
    await submission.save();
    await newProduct.populate([
        { path: 'author', select: 'username avatar role' },
        { path: 'collectionName', select: 'name coverImg' }
    ]);

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
