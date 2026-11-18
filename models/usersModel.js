import { model, Schema } from 'mongoose';

export const PROFILE_IMAGE_FIELDS = ['avatar', 'artistBanner', 'catalogBanner'];

export const normalizeUserImages = (images) => Array.isArray(images)
    ? [...images]
    : typeof images === 'string' && images ? [images] : [];

const avatarAssetSchema = new Schema({
    publicId: { type: String, required: true },
    url: { type: String, required: true }
}, { _id: false });

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
        // [profile photo, artist catalog banner, general catalog banner]
        // Empty earlier slots are null so banners keep their positions.
        type: [String],
        default: [],
        castNonArrays: false,
        validate: (images) => Array.isArray(images) && images.length <= 3
    },
    avatarAsset: {
        // Retained for cleanup of photos uploaded before avatarAssets existed.
        type: avatarAssetSchema,
        select: false
    },
    avatarAssets: {
        type: [avatarAssetSchema],
        default: undefined,
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

userSchema.pre('init', (user) => {
    user.avatar = normalizeUserImages(user.avatar);
});

const User = model('User', userSchema);
export default User;
