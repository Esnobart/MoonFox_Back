import assert from 'node:assert/strict';
import { after, before, beforeEach, mock, test } from 'node:test';
import { Writable } from 'node:stream';
import express from 'express';
import jwt from 'jsonwebtoken';
import { v2 as cloudinary } from 'cloudinary';

import User from '../models/usersModel.js';
import Product from '../models/productsModel.js';
import Collection from '../models/collectionsModel.js';
import ProductSubmission from '../models/productsSubmissionModel.js';

process.env.JWT_SECRET = 'profile-tests-secret';
process.env.CLIENT_URL = 'http://localhost:5173';
process.env.SENDGRID_API_KEY = 'SG.test';
process.env.DOTENV_CONFIG_QUIET = 'true';
process.env.CLOUDINARY_CLOUD_NAME = 'test';
process.env.CLOUDINARY_API_KEY = 'test';
process.env.CLOUDINARY_API_SECRET = 'test';

const { default: usersRouter } = await import('../routes/usersRoutes.js');
const { signToken } = await import('../services/jwtService.js');
const { MAX_AVATAR_SIZE } = await import('../middleware/profileUpdateUpload.js');

const ownerId = '000000000000000000000001';
const otherId = '000000000000000000000002';
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9WQAAAAASUVORK5CYII=', 'base64');
let server;
let url;
let records;
let state;

const matches = (user, filter) => Object.entries(filter).every(([key, value]) => user[key] === value);
const document = (record) => record ? {
    ...structuredClone(record),
    async populate() { return this; }
} : null;

before(async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/users', usersRouter);
    app.use((err, req, res, next) => {
        res.status(err.status || 500).json({ message: err.message });
    });
    server = await new Promise((resolve) => {
        const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
    });
    url = `http://127.0.0.1:${server.address().port}/api/users/current`;
});

after(async () => {
    mock.restoreAll();
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

beforeEach(() => {
    mock.restoreAll();
    records = new Map([
        [ownerId, {
            _id: ownerId, username: 'owner', email: 'owner@example.com', avatar: null,
            role: 'User', sessionVersion: 2, verify: true, wishlist: [], basket: [],
            password: 'private-hash', verificationToken: 'private-token',
            passwordResetToken: 'private-reset-token', passwordResetTokenExpiration: 'private-date'
        }],
        [otherId, {
            _id: otherId, username: 'other', email: 'other@example.com', avatar: null,
            role: 'Admin', sessionVersion: 0, wishlist: [], basket: []
        }]
    ]);
    state = { writes: 0, uploads: [], deletes: [] };

    mock.method(User, 'findById', async (id) => document(records.get(id)));
    mock.method(User, 'findOne', (filter) => ({
        select: async () => document([...records.values()].find((user) => matches(user, filter)))
    }));
    mock.method(User, 'exists', async (filter) => [...records.values()].some((user) => matches(user, filter)));
    mock.method(User, 'findOneAndUpdate', async (filter, update, options) => {
        state.writes++;
        assert.deepEqual(options, { new: true, runValidators: true });
        if (state.writeError) throw state.writeError;
        const record = records.get(filter._id);
        if (!record || !matches(record, filter)) return null;
        if (update.$set.username && [...records.values()].some((user) =>
            user._id !== record._id && user.username === update.$set.username)) {
            throw Object.assign(new Error('Duplicate username'), { code: 11000 });
        }
        Object.assign(record, structuredClone(update.$set));
        return document(record);
    });
    for (const model of [Product, Collection, ProductSubmission]) {
        mock.method(model, 'exists', async () => false);
    }
    mock.method(cloudinary.uploader, 'upload_stream', (options, callback) => new Writable({
        write(chunk, encoding, done) { done(); },
        final(done) {
            state.uploads.push(options.public_id);
            state.onUpload?.();
            callback(state.uploadError, {
                public_id: options.public_id,
                secure_url: `https://res.cloudinary.com/test/${options.public_id}.png`
            });
            done();
        }
    }));
    mock.method(cloudinary.uploader, 'destroy', async (publicId) => {
        state.deletes.push(publicId);
        return { result: 'ok' };
    });
});

const form = (fields = {}, avatar) => {
    const body = new FormData();
    for (const [key, value] of Object.entries(fields)) body.append(key, value);
    if (avatar) body.append('avatar', new Blob([avatar.buffer ?? png], {
        type: avatar.type ?? 'image/png'
    }), 'avatar.png');
    return body;
};

const request = async (body, { token = signToken(ownerId, 2), headers = {} } = {}) => {
    const response = await fetch(url, {
        method: 'PATCH',
        headers: { ...(token ? { Cookie: `token=${token}` } : {}), ...headers },
        body
    }).catch((error) => { throw error.cause || error; });
    return { status: response.status, body: await response.json() };
};

test('frontend multipart request updates only the signed-in account and returns a safe user', async () => {
    const other = structuredClone(records.get(otherId));
    const response = await request(form({ username: '  renamed  ' }, {}));
    assert.equal(response.status, 200);
    assert.equal(response.body.user._id, ownerId);
    assert.equal(response.body.user.username, 'renamed');
    assert.match(response.body.user.avatar, /^https:\/\/res\.cloudinary\.com\/test\/moonfox\/avatars\//);
    assert.deepEqual(Object.keys(response.body.user).sort(),
        ['_id', 'username', 'email', 'avatar', 'role', 'wishlist', 'basket'].sort());
    assert.deepEqual(records.get(otherId), other);
    assert.equal(records.get(ownerId).role, 'User');
    assert.equal(state.uploads.length, 1);
});

test('username-only edits preserve the avatar and current session', async () => {
    records.get(ownerId).avatar = 'https://example.com/old.png';
    const response = await request(form({ username: 'renamed' }));
    assert.equal(response.status, 200);
    assert.equal(response.body.user.avatar, 'https://example.com/old.png');
    assert.equal(records.get(ownerId).sessionVersion, 2);
    assert.equal(state.uploads.length, 0);
    assert.equal((await request(form({ username: 'renamed-again' }))).status, 200);
});

test('avatar-only edits preserve the username and clean up the previous owned asset', async () => {
    const record = records.get(ownerId);
    record.avatar = 'https://example.com/old.png';
    record.avatarAsset = { publicId: 'moonfox/avatars/old', url: record.avatar };
    const response = await request(form({}, {}));
    assert.equal(response.status, 200);
    assert.equal(response.body.user.username, 'owner');
    assert.deepEqual(state.deletes, ['moonfox/avatars/old']);
});

test('legacy avatar URLs are never used as deletion IDs', async () => {
    records.get(ownerId).avatar = 'https://example.com/legacy.png';
    assert.equal((await request(form({}, {}))).status, 200);
    assert.deepEqual(state.deletes, []);
});

for (const [name, token] of [
    ['missing', null],
    ['malformed', 'invalid'],
    ['forged', jwt.sign({ id: ownerId, sessionVersion: 2 }, 'wrong-secret')],
    ['expired', jwt.sign({ id: ownerId, sessionVersion: 2 }, process.env.JWT_SECRET, { expiresIn: -1 })],
    ['revoked', signToken(ownerId, 1)],
    ['missing account', signToken('000000000000000000000099', 2)]
]) {
    test(`${name} session cannot update a profile or upload an avatar`, async () => {
        assert.equal((await request(form({ username: 'intruder' }, {}), { token })).status, 401);
        assert.equal(state.writes, 0);
        assert.equal(state.uploads.length, 0);
        assert.equal(records.get(ownerId).username, 'owner');
    });
}

for (const [field, value] of Object.entries({
    _id: otherId, userId: otherId, id: otherId, role: 'Admin', email: 'other@example.com',
    password: 'new-password', sessionVersion: '3', verify: 'true', avatar: 'https://example.com/avatar.png',
    avatarAsset: '{}', wishlist: '[]', basket: '[]', '$set': '{"role":"Admin"}'
})) {
    test(`rejects client-controlled ${field}`, async () => {
        assert.equal((await request(form({ [field]: value }))).status, 400);
        assert.equal(state.writes, 0);
        assert.equal(state.uploads.length, 0);
    });
}

for (const username of ['', '  ', 'ab', 'a'.repeat(31)]) {
    test(`rejects invalid username ${JSON.stringify(username)}`, async () => {
        assert.equal((await request(form({ username }))).status, 400);
        assert.equal(state.writes, 0);
    });
}

test('rejects empty updates, repeated fields, and JSON requests', async () => {
    assert.equal((await request(form())).status, 400);
    const repeated = form({ username: 'first' });
    repeated.append('username', 'second');
    assert.equal((await request(repeated)).status, 400);
    assert.equal((await request(JSON.stringify({ username: 'renamed' }), {
        headers: { 'Content-Type': 'application/json' }
    })).status, 400);
    assert.equal(state.writes, 0);
});

test('rejects malformed, empty, oversized, unsupported, and mismatched avatar files', async () => {
    for (const avatar of [
        { buffer: Buffer.from('not an image') },
        { buffer: Buffer.alloc(0) },
        { buffer: Buffer.alloc(MAX_AVATAR_SIZE + 1) },
        { buffer: png, type: 'image/svg+xml' },
        { buffer: png, type: 'image/jpeg' }
    ]) {
        assert.equal((await request(form({}, avatar))).status, 400);
    }
    assert.equal(state.uploads.length, 0);
    assert.equal(state.writes, 0);
});

test('rejects unexpected file fields and multiple avatars', async () => {
    const unexpected = form({ username: 'renamed' });
    unexpected.append('photo', new Blob([png], { type: 'image/png' }), 'photo.png');
    assert.equal((await request(unexpected)).status, 400);
    const multiple = form({}, {});
    multiple.append('avatar', new Blob([png], { type: 'image/png' }), 'second.png');
    assert.equal((await request(multiple)).status, 400);
    assert.equal(state.uploads.length, 0);
    assert.equal(state.writes, 0);
});

test('duplicate username returns 409 and removes the unused upload', async () => {
    const response = await request(form({ username: 'other' }, {}));
    assert.equal(response.status, 409);
    assert.equal(records.get(ownerId).username, 'owner');
    assert.equal(records.get(ownerId).avatar, null);
    assert.deepEqual(state.deletes, state.uploads);
});

test('revoking a session during upload prevents the subsequent write', async () => {
    state.onUpload = () => records.get(ownerId).sessionVersion++;
    assert.equal((await request(form({ username: 'renamed' }, {}))).status, 401);
    assert.equal(records.get(ownerId).username, 'owner');
    assert.equal(records.get(ownerId).avatar, null);
    assert.deepEqual(state.deletes, state.uploads);
});

test('concurrent avatar edits preserve the winning asset and remove the unused upload', async () => {
    state.onUpload = () => {
        records.get(ownerId).avatar = 'https://example.com/winner.png';
        records.get(ownerId).avatarAsset = { publicId: 'winner', url: 'https://example.com/winner.png' };
    };
    assert.equal((await request(form({ username: 'renamed' }, {}))).status, 409);
    assert.equal(records.get(ownerId).username, 'owner');
    assert.equal(records.get(ownerId).avatar, 'https://example.com/winner.png');
    assert.deepEqual(state.deletes, state.uploads);
});

test('upload failure leaves profile data intact', async () => {
    state.uploadError = new Error('Cloudinary unavailable');
    assert.equal((await request(form({ username: 'renamed' }, {}))).status, 500);
    assert.equal(state.writes, 0);
    assert.equal(records.get(ownerId).username, 'owner');
    assert.deepEqual(state.deletes, state.uploads);
});

test('database failure removes the unused upload and leaves the old avatar intact', async () => {
    records.get(ownerId).avatar = 'https://example.com/old.png';
    state.writeError = new Error('Database unavailable');
    assert.equal((await request(form({ username: 'renamed' }, {}))).status, 500);
    assert.equal(records.get(ownerId).avatar, 'https://example.com/old.png');
    assert.deepEqual(state.deletes, state.uploads);
});
