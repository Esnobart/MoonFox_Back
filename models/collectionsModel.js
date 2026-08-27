import { model, Schema } from 'mongoose';

const collectionSchema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    coverImg: {
        type: String,
        default: null
    }
}, { timestamps: true });

const Collection = model('Collection', collectionSchema);
export default Collection;
