import { model, Schema } from 'mongoose';

const productSchema = new Schema({
    name: {
        type: String
    },
    price: {
        type: Number
    },
    description: {
        type: String
    },
    images: {
        type: [String],
        default: [],
        castNonArrays: false,
        validate: (images) => Array.isArray(images) && images.length <= 5
    },
    imageAssets: {
        type: [new Schema({
            url: { type: String, required: true },
            publicId: { type: String, required: true }
        }, { _id: false })],
        default: undefined,
        select: false
    },
    ageRestriction: {
        type: String,
        enum: ['None', '18+', '21+'],
        default: 'None'
    },
    author: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    collectionName: {
        type: Schema.Types.ObjectId,
        ref: 'Collection',
        required: true
    },
    popular: {
        type: Number,
        default: 0
    },
    inStock: {
        type: Number,
        default: 0
    }
});

const Product = model('Product', productSchema);
export default Product;
