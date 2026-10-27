import { getProductById, getProducts } from '../services/productsService.js';
import { updateProduct } from '../services/productUpdateService.js';

export const getProductsController = async (req, res, next) => {
    try {
        const products = await getProducts();
        res.status(200).json(products);
    } catch (error) {
        next(error);
    }
};

export const getProductByIdController = async (req, res, next) => {
    try {
        const product = await getProductById(req.params.productId);
        res.status(200).json(product);
    } catch (error) {
        next(error);
    }
};

export const updateProductController = async (req, res, next) => {
    try {
        const product = await updateProduct(req.params.productId, req.body, req.files);
        res.status(200).json({ product });
    } catch (error) {
        next(error.status ? error : new Error('Product update failed. Please try again later', { cause: error }));
    }
};
