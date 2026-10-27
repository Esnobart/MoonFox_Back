import * as z from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid record id');
const image = z.union([
    z.strictObject({
        url: z.string().url().refine((url) => /^https?:\/\//i.test(url), 'Invalid image URL')
    }),
    z.strictObject({ fileIndex: z.number().int().min(0).max(4) })
]);

export const productUpdateSchema = z.strictObject({
    version: z.number().int().min(0).optional(),
    name: z.string().trim().min(1, 'Product name is required'),
    description: z.string(),
    collectionName: objectId,
    author: objectId,
    price: z.number().min(0),
    inStock: z.number().int().min(0),
    popular: z.number().int().min(0),
    ageRestriction: z.enum(['None', '18+', '21+']),
    images: z.array(image).max(5, 'Use up to 5 photos')
});
