import { model, Schema } from 'mongoose';

const userSchema = new Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true,
        select: false
    },
    avatar: {
        type: String,
        default: null
    },
    role: {
        type: String,
        enum: ['User', 'Creator', 'Admin'],
        default: 'User'
    },
    wishlist: [{
        type: Schema.Types.ObjectId,
        ref: 'Product'
    }],
    basket: [{
        product: {
            type: Schema.Types.ObjectId,
            ref: 'Product'
        },
        quantity: {
            type: Number,
            default: 1,
            min: 1
        }
    }],
    articles: [{
        type: Schema.Types.ObjectId,
        ref: 'Product'
    }],
    verify: {
        type: Boolean,
        default: false
    },
    verificationToken: {
        type: String,
        default: null
    },
    passwordResetToken: {
        type: String,
        default: null
    },
    passwordResetTokenExpiration: {
        type: Date,
        default: null
    },
    sessionVersion: {
        type: Number,
        default: 0
    }
    
});

const User = model('User', userSchema);
export default User;
