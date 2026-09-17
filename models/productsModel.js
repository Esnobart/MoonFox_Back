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
    img: {
        type: String
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
