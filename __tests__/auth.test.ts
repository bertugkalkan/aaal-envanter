import { hashPassword, verifyPassword, generateToken, verifyToken } from '@/lib/auth';
import type { User } from '@/lib/auth';

describe('Auth Module', () => {
    describe('Password Hashing', () => {
        test('should hash password correctly', async () => {
            const password = 'testPassword123';
            const hashed = await hashPassword(password);

            expect(hashed).toBeDefined();
            expect(hashed).not.toBe(password);
            expect(hashed.length).toBeGreaterThan(50);
        });

        test('should verify correct password', async () => {
            const password = 'testPassword123';
            const hashed = await hashPassword(password);

            const isValid = await verifyPassword(password, hashed);
            expect(isValid).toBe(true);
        });

        test('should reject incorrect password', async () => {
            const password = 'testPassword123';
            const hashed = await hashPassword(password);

            const isValid = await verifyPassword('wrongPassword', hashed);
            expect(isValid).toBe(false);
        });

        test('should generate different hashes for same password', async () => {
            const password = 'testPassword123';
            const hash1 = await hashPassword(password);
            const hash2 = await hashPassword(password);

            expect(hash1).not.toBe(hash2);
        });
    });

    describe('JWT Token', () => {
        const mockUser: User = {
            id: 'test-user-id',
            firstName: 'Test',
            lastName: 'User',
            email: 'test@example.com',
            password: 'hashedPassword',
            role: 'user',
            createdAt: new Date().toISOString(),
        };

        test('should generate valid token', () => {
            const token = generateToken(mockUser);

            expect(token).toBeDefined();
            expect(typeof token).toBe('string');
            expect(token.split('.').length).toBe(3); // JWT has 3 parts
        });

        test('should verify valid token', () => {
            const token = generateToken(mockUser);
            const payload = verifyToken(token);

            expect(payload).toBeDefined();
            expect(payload?.userId).toBe(mockUser.id);
            expect(payload?.email).toBe(mockUser.email);
            expect(payload?.role).toBe(mockUser.role);
        });

        test('should return null for invalid token', () => {
            const payload = verifyToken('invalid-token');
            expect(payload).toBeNull();
        });

        test('should return null for malformed token', () => {
            const payload = verifyToken('not.a.valid.jwt.token');
            expect(payload).toBeNull();
        });

        test('should include correct user info in token', () => {
            const adminUser: User = {
                ...mockUser,
                id: 'admin-id',
                role: 'admin',
                email: 'admin@example.com',
            };

            const token = generateToken(adminUser);
            const payload = verifyToken(token);

            expect(payload?.role).toBe('admin');
            expect(payload?.email).toBe('admin@example.com');
        });
    });
});
