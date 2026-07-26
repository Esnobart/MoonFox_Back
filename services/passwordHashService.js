import bcrypt from "bcrypt"

const saltRounds = 10;

export const createHashPassword = async (pass) => {
    const passwordHash = await bcrypt.hash(pass, saltRounds);
    return passwordHash;
}

export const comparePassword = async (pass, hash) => {
    const isMatch = await bcrypt.compare(pass, hash);
    return isMatch;
}