import { model, Schema } from 'mongoose';

const productSchema = new Schema({
    name: {
        type: String
    },
    img: {
        type: String
    },
    author: {
        type: String
    },
    collectionName: {
        type: String
    },
    popular: {
        type: Number
    },
    inStock: {
        type: Number
    }
});

const Product = model('Product', productSchema);
export default Product;
