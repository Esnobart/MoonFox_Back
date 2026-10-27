import { randomUUID } from 'node:crypto';
import { fileTypeFromBuffer } from 'file-type';

import User from '../models/usersModel.js';
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

const validateAvatar = async (file) => {
    if (!file.buffer?.length || file.buffer.length > MAX_AVATAR_SIZE) {
        fail(400, 'Avatar must contain data and be at most 10 MiB');
    }

    let detected;
    try {
        detected = await fileTypeFromBuffer(file.buffer);
    } catch {
        fail(400, 'Invalid avatar file');
    }
    if (!detected || !AVATAR_TYPES.has(detected.mime) || detected.mime !== file.mimetype) {
        fail(400, 'Avatar contents must match their JPG, PNG, WebP, GIF or AVIF type');
    }
};

export const updateUserProfile = async (sessionUser, body, file) => {
    const result = profileUpdateSchema.safeParse(body);
    if (!result.success) fail(400, result.error.issues[0].message);
    const values = result.data;
    if (values.username === undefined && !file) fail(400, 'Provide a username or avatar');
    if (file) await validateAvatar(file);

    // Bind both the read and the write to the authenticated account and session.
    const sessionFilter = { _id: sessionUser._id, sessionVersion: sessionUser.sessionVersion };
    const user = await User.findOne(sessionFilter).select('+avatarAsset');
    if (!user) fail(401, 'Not authorized');

    let uploadedAsset;
    let updatedUser;
    try {
        if (file) {
            uploadedAsset = { publicId: `moonfox/avatars/${randomUUID()}` };
            Object.assign(uploadedAsset, await uploadAvatar(file.buffer, uploadedAsset.publicId));
            values.avatar = uploadedAsset.url;
            values.avatarAsset = uploadedAsset;
        }

        updatedUser = await User.findOneAndUpdate({
            ...sessionFilter,
            // A concurrent avatar replacement must not orphan the winning upload.
            ...(file ? { avatar: user.avatar ?? null } : {})
        }, { $set: values }, { new: true, runValidators: true });

        if (!updatedUser) {
            if (!await User.exists(sessionFilter)) fail(401, 'Not authorized');
            fail(409, 'Profile changed during editing. Reload it and try again');
        }
    } catch (error) {
        if (uploadedAsset) await cleanupAvatars([uploadedAsset]);
        if (error.code === 11000) fail(409, 'User with this username already exists');
        throw error;
    }

    if (file && user.avatarAsset?.publicId) await cleanupAvatars([user.avatarAsset]);

    await updatedUser.populate(userProductsPopulate);
    return buildPublicUser(updatedUser);
};
