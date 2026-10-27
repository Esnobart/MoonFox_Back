import { model, Schema } from 'mongoose';

const orderSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    products: [
        {
            product: {
                type: Schema.Types.ObjectId,
                ref: 'Product',
                required: true
            },
            quantity: {
                type: Number,
                required: true,
                min: 1
            }
        }
    ],
    totalItemsPrice: {
        type: Number,
        required: true,
        min: 0
    },
    totalShippingPrice: {
        type: Number,
        required: true,
        min: 0
    },
    totalPrice: {
        type: Number,
        required: true,
        min: 0
    },
    customer: {
        fullName: {
            type: String,
            required: true
        },
        email: {
            type: String,
            required: true
        },
        phone: {
            type: String,
            required: true
        },
    },
    address: {
        streetLine: {
            type: String,
            required: true
        },
        secondaryStreetLine: {
            type: String
        },
        apartmentNum: {
            type: String
        },
        city: {
            type: String,
            required: true
        },
        country: {
            type: String,
            required: true
        },
        index: {
            type: String,
            required: true
        }
    },
    status: {
        type: String,
        enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'],
        default: 'Pending'
    },
    sumupCheckoutId: {
        type: String,
        default: null,
        index: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Order = model('Order', orderSchema);
export default Order;