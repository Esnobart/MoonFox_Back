import 'dotenv/config';
import mongoose from 'mongoose';
import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import helmet from 'helmet';

import usersRouter from './routes/usersRoutes.js';
import productsRouter from './routes/productsRoutes.js';
import productSubmissionRouter from './routes/productsSubmissionRoutes.js';

const app = express();
const port = Number(process.env.PORT || 4000);
const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS || 0);
const requiredEnv = ['MONGODB_URI'];

if (process.env.NODE_ENV === 'production') {
    requiredEnv.push('JWT_SECRET', 'CLIENT_URL', 'API_URL', 'SENDGRID_API_KEY', 'SENDGRID_SENDER_EMAIL');
}

const missingEnv = requiredEnv.filter((name) => !process.env[name]?.trim());

if (missingEnv.length) {
    throw new Error(`Missing required environment variables: ${missingEnv.join(', ')}`);
}

if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
}

if (!Number.isInteger(trustProxyHops) || trustProxyHops < 0) {
    throw new Error('TRUST_PROXY_HOPS must be a non-negative integer');
}

app.set('trust proxy', trustProxyHops);

app.use(helmet());
app.use(morgan('tiny'));
app.use(cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
}));
app.use(express.json());

let server;
let isShuttingDown = false;

app.get('/api/health', (_, res) => {
    const isReady = mongoose.connection.readyState === 1 && !isShuttingDown;
    res.set('Cache-Control', 'no-store');
    res.status(isReady ? 200 : 503).json({ status: isReady ? 'ok' : 'unavailable' });
});

app.use('/api/users', usersRouter);
app.use('/api/products', productsRouter);
app.use('/api/products-submission', productSubmissionRouter);

app.use((_, res) => {
    res.status(404).json({ message: "Route not found" });
});

app.use((err, req, res, next) => {
    const { status = 500, message = "Server error" } = err;
    res.status(status).json({ message });
});

const shutdown = async (signal) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log(`Received ${signal}. Closing server.`);

    const timeout = setTimeout(() => {
        console.error('Shutdown timed out');
        process.exit(1);
    }, 10000);
    timeout.unref();

    try {
        if (server) {
            await new Promise((resolve, reject) => {
                server.close((err) => err ? reject(err) : resolve());
            });
        }
        await mongoose.disconnect();
        clearTimeout(timeout);
        process.exit(0);
    } catch {
        console.error('Shutdown failed');
        process.exit(1);
    }
};

process.once('SIGTERM', () => { void shutdown('SIGTERM'); });
process.once('SIGINT', () => { void shutdown('SIGINT'); });

try {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
    if (!isShuttingDown) {
        console.log('Database connection successful');
        server = app.listen(port, '0.0.0.0', () => {
            console.log(`Server is running. Use our API on port: ${port}`);
        });
        server.on('error', (err) => {
            console.error(`HTTP server failed: ${err.code || err.name}`);
            process.exit(1);
        });
    }
} catch (err) {
    if (!isShuttingDown) {
        console.error(`Database connection failed (${err.name}). Check MONGODB_URI and database network access.`);
        process.exit(1);
    }
}
