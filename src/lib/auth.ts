import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { findOne } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';
const TOKEN_EXPIRY = '7d';

export interface User {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    password: string;
    role: 'user' | 'advisor' | 'admin';
    createdAt: string;
}

export interface TokenPayload {
    userId: string;
    email?: string;
    role: 'user' | 'advisor' | 'admin';
}

export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
}

export function generateToken(user: User): string {
    const payload: TokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
    };

    return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

export function verifyToken(token: string): TokenPayload | null {
    try {
        return jwt.verify(token, JWT_SECRET) as TokenPayload;
    } catch {
        return null;
    }
}

export function getTokenFromRequest(request: NextRequest): string | null {
    const authHeader = request.headers.get('authorization');

    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }

    // Also check cookies
    const tokenCookie = request.cookies.get('token');
    return tokenCookie?.value || null;
}

export async function getCurrentUser(request: NextRequest): Promise<User | null> {
    const token = getTokenFromRequest(request);

    if (!token) return null;

    const payload = verifyToken(token);
    if (!payload) return null;

    const user = findOne<User>('users', u => u.id === payload.userId);
    return user || null;
}

export function requireAuth(user: User | null): user is User {
    return user !== null;
}

export function requireAdmin(user: User | null): boolean {
    return user !== null && user.role === 'admin';
}

export function requireAdvisor(user: User | null): boolean {
    return user !== null && user.role === 'advisor';
}

export function canApproveRequests(user: User | null): boolean {
    return user !== null && (user.role === 'admin' || user.role === 'advisor');
}
