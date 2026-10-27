import { model, Schema } from 'mongoose';

const productSubmissionSchema = new Schema({
    creator: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    product: {
        name: String,
        price: Number,
        description: String,
        images: {
            type: [String],
            default: [],
            castNonArrays: false,
            validate: (images) => Array.isArray(images) && images.length <= 5
        },
        ageRestriction: String,
        collectionName: {
            type: Schema.Types.ObjectId,
            ref: 'Collection'
        },
        popular: Number,
        inStock: Number
    },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected'],
        default: 'Pending'
    },
    reviewedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    rejectionReason: {
        type: String,
        default: null
    }
}, { timestamps: true });

const ProductSubmission = model('ProductSubmission', productSubmissionSchema);
export default ProductSubmission;
