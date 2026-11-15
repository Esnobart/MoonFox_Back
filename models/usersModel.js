import { model, Schema } from 'mongoose';
import { boolean } from 'zod';

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
        required: function () {
            const hasSocialLogin = this.socials?.x?.id || this.socials?.google?.id;

            return !hasSocialLogin;
        },
        select: false
    },
    avatar: {
        type: String,
        default: null
    },
    avatarAsset: {
        type: new Schema({
            publicId: { type: String, required: true },
            url: { type: String, required: true }
        }, { _id: false }),
        select: false
    },
    role: {
        type: String,
        enum: ['User', 'Creator', 'Admin'],
        default: 'User'
    },
    socials: {
        x: {
            id: {
                type: String,
                unique: true,
                sparse: true
            },
            isViewing: Boolean,
            username: String,
            profileURL: String,
            linkedAt: Date
        },
        google: {
            id: {
                type: String,
                unique: true,
                sparse: true
            }
        }
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
