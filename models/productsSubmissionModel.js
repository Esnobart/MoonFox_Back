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
        img: String,
        collectionName: String,
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
