export const checkoutController = async (req, res, next) => {
    try {
        const order = await checkoutService(req.body);
        res.status(200).json({ message: 'Checkout successful' });
    } catch (error) {
        next(error);
    }
};
