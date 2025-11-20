import bcrypt from 'bcrypt';
const SALT_ROUNDS = 10;
export const hashPassword = async (password) => bcrypt.hash(password, SALT_ROUNDS);
export const compareHash = async (plain, hash) => bcrypt.compare(plain, hash);
