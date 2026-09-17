import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import helmet from 'helmet';

import usersRouter from './routes/usersRoutes.js';
import productsRouter from './routes/productsRoutes.js';
import productSubmissionRouter from './routes/productsSubmissionRoutes.js';

const app = express();

mongoose.connect(process.env.MONGODB_URI).then(() => {console.log("Database connection successful")}).catch((err) => {console.log(err); process.exit(1)});

app.use(helmet());
app.use(morgan('tiny'));
app.use(cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
}));
app.use(express.json());

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

app.listen(4000, () => {
    console.log(`Server is running. Use our API on port: 4000`);
});
