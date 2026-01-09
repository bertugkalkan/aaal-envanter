import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { findOne } from './db.mjs';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';
const TOKEN_EXPIRY = '7d';

export async function hashPassword(password) {
    return bcrypt.hash(password, 12);
}

export async function verifyPassword(password, hashedPassword) {
    return bcrypt.compare(password, hashedPassword);
}

export function generateToken(user) {
    const payload = {
        userId: user.id,
        email: user.email,
        role: user.role,
    };

    return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

export function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch {
        return null;
    }
}

export function getTokenFromRequest(req) {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }

    // Check cookies if parsers are available (optional depending on setup) or just query/body if needed
    // but standard API usually relies on Authorization header.

    return null;
}

export async function getCurrentUser(req) {
    const token = getTokenFromRequest(req);

    if (!token) return null;

    const payload = verifyToken(token);
    if (!payload) return null;

    const user = findOne('users', u => u.id === payload.userId);
    return user || null;
}

export function requireAuth(user) {
    return user !== null;
}

export function requireAdmin(user) {
    return user !== null && user.role === 'admin';
}

export function requireAdvisor(user) {
    return user !== null && user.role === 'advisor';
}

export function canApproveRequests(user) {
    return user !== null && (user.role === 'admin' || user.role === 'advisor');
}
