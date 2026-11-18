import { randomUUID } from 'node:crypto';
import { fileTypeFromBuffer } from 'file-type';

import User, { normalizeUserImages, PROFILE_IMAGE_FIELDS } from '../models/usersModel.js';
import { profileUpdateSchema } from '../models/usersSchema.js';
import { AVATAR_TYPES, MAX_AVATAR_SIZE } from '../middleware/profileUpdateUpload.js';
import { buildPublicUser, userProductsPopulate } from './usersServices.js';
import {
    uploadProductImage as uploadAvatar,
    deleteUnreferencedProductImages as cleanupAvatars
} from './productImagesService.js';

const fail = (status, message) => {
    const error = new Error(message);
    error.status = status;
    throw error;
};

const validateImage = async (file) => {
    if (!file.buffer?.length || file.buffer.length > MAX_AVATAR_SIZE) {
        fail(400, 'Each profile image must contain data and be at most 10 MiB');
    }

    let detected;
    try {
        detected = await fileTypeFromBuffer(file.buffer);
    } catch {
        fail(400, 'Invalid profile image file');
    }
    if (!detected || !AVATAR_TYPES.has(detected.mime) || detected.mime !== file.mimetype) {
        fail(400, 'Profile image contents must match their JPG, PNG, WebP, GIF or AVIF type');
    }
};

export const updateUserProfile = async (sessionUser, body, files = {}) => {
    const result = profileUpdateSchema.safeParse(body);
    if (!result.success) fail(400, result.error.issues[0].message);
    const values = result.data;
    const imageUploads = PROFILE_IMAGE_FIELDS.flatMap((field, index) =>
        (files[field] || []).map((file) => ({ file, index })));
    const hasImages = imageUploads.length > 0;
    const hasBanners = imageUploads.some(({ index }) => index > 0);
    if (values.username === undefined && !hasImages) fail(400, 'Provide a username or profile image');

    // Bind both the read and the write to the authenticated account and session.
    const sessionFilter = { _id: sessionUser._id, sessionVersion: sessionUser.sessionVersion };
    const user = await User.findOne(sessionFilter).select('+avatarAsset +avatarAssets').lean();
    if (!user) fail(401, 'Not authorized');
    if (hasBanners && user.role !== 'Creator') fail(403, 'Only artists can change catalog banners');
    // Validate the entire request before uploading any files.
    for (const { file } of imageUploads) await validateImage(file);

    const images = normalizeUserImages(user.avatar);
    const previousAssets = [...(user.avatarAssets || []), ...(user.avatarAsset ? [user.avatarAsset] : [])];
    const uploadedAssets = [];
    let updatedUser;
    try {
        for (const { file, index } of imageUploads) {
            const asset = { publicId: `moonfox/avatars/${randomUUID()}` };
            // Record the ID before uploading, including uploads whose response is lost.
            uploadedAssets.push(asset);
            Object.assign(asset, await uploadAvatar(file.buffer, asset.publicId));
            while (images.length <= index) images.push(null);
            images[index] = asset.url;
        }
        if (hasImages) {
            values.avatar = images;
            values.avatarAssets = [
                ...previousAssets.filter((asset) => images.includes(asset.url)),
                ...uploadedAssets
            ];
        }

        updatedUser = await User.findOneAndUpdate({
            ...sessionFilter,
            // Do not overwrite a concurrent image edit or a revoked artist role.
            ...(hasImages ? { __v: user.__v ?? { $exists: false } } : {}),
            ...(hasBanners ? { role: 'Creator' } : {})
        }, {
            $set: values,
            ...(hasImages ? { $inc: { __v: 1 }, $unset: { avatarAsset: 1 } } : {})
        }, { new: true, runValidators: true });

        if (!updatedUser) {
            if (!await User.exists(sessionFilter)) fail(401, 'Not authorized');
            fail(409, 'Profile changed during editing. Reload it and try again');
        }
    } catch (error) {
        await cleanupAvatars(uploadedAssets);
        if (error.code === 11000) fail(409, 'User with this username already exists');
        throw error;
    }

    if (hasImages) await cleanupAvatars(previousAssets.filter((asset) => !images.includes(asset.url)));

    await updatedUser.populate(userProductsPopulate);
    return buildPublicUser(updatedUser);
};
