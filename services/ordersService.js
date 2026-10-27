async function createSumupCheckout({ reference, amount, currency }) {
    const apiKey = process.env.SUMUP_API_KEY;
    const merchantCode = process.env.SUMUP_MERCHANT_CODE;

    if (!apiKey || !merchantCode) {
        throw new Error('SumUp credentials are missing');
    }

    if (!reference || !currency || !Number.isFinite(amount) || amount <= 0) {
        throw new Error('Invalid checkout parameters');
    }

    const response = await fetch('https://api.sumup.com/v0.1/checkouts', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            checkout_reference: reference,
            amount,
            currency,
            merchant_code: merchantCode,
            description: `MoonFox order ${reference}`
        }),
        signal: AbortSignal.timeout(10000)
    });

    const checkout = await response.json().catch(() => null);

    if (!response.ok || !checkout?.id) {
        const error = new Error(
            `SumUp checkout creation failed (${response.status})`
        );
        error.status = 502;
        throw error;
    }

    return checkout;
}

async function checkoutService(orderData) {
    if (!orderData || !orderData.items || !Array.isArray(orderData.items)) {
        throw new Error('Invalid order data');
    }

    const order = new Order({
        user: orderData.user,
        products: orderData.items.map(item => ({
            product: item.productId,
            quantity: item.quantity
        })),
        totalItemsPrice: orderData.totalAmount,
        totalShippingPrice: 12.99,
        totalPrice: orderData.totalAmount + 12.99,
        customer: null,
        address: null,
        status: 'Pending'
    });

    await order.save();

    const checkout = await createSumupCheckout({
        reference: order._id.toString(),
        amount: order.totalPrice,
        currency: process.env.SUMUP_CURRENCY
    });

    order.sumupCheckoutId = checkout.id;
    await order.save();

    return true; 
}