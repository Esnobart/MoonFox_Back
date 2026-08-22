import { isValidObjectId } from 'mongoose';

import Product from '../models/productsModel.js';

async function getProducts() {
    return Product.find();
}

async function getProductById(productId) {
    if (!isValidObjectId(productId)) {
        const error = new Error('Invalid product id');
        error.status = 400;
        throw error;
    }

    const product = await Product.findById(productId);

    if (!product) {
        const error = new Error('Product not found');
        error.status = 404;
        throw error;
    }

    return product;
}

export { getProducts, getProductById };
