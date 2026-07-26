import jwt from 'jsonwebtoken';

export const signToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '1h' });
};

export const verifyToken = (token) => {
    if (!token) throw new Error('No token provided');
    try {
        const { id } = jwt.verify(token, process.env.JWT_SECRET);
        return id;
    } catch (error) {
        throw new Error('Invalid token');
    }
};