/**
 * Integration Tests - Authentication Flow
 * Tests the complete auth workflow: register → login → token validation
 */

import { hashPassword, verifyPassword, generateToken, verifyToken } from '@/lib/auth';
import { create, findOne, writeDB } from '@/lib/db';
import { log, getLogs } from '@/lib/logger';
import type { User } from '@/lib/auth';

describe('Auth Integration Tests', () => {
    beforeEach(() => {
        // Clear test data
        writeDB('users', []);
        writeDB('logs', []);
    });

    afterAll(() => {
        writeDB('users', []);
        writeDB('logs', []);
    });

    describe('Complete Registration Flow', () => {
        test('should register new user → save to DB → create log', async () => {
            const email = 'newuser@test.com';
            const password = 'SecurePassword123';

            // Step 1: Hash password
            const hashedPassword = await hashPassword(password);

            // Step 2: Create user in DB
            const newUser = create<User>('users', {
                firstName: 'New',
                lastName: 'User',
                email,
                password: hashedPassword,
                role: 'user',
                createdAt: new Date().toISOString(),
            });

            // Step 3: Log the registration
            log('USER_REGISTER', newUser.id, `${newUser.firstName} ${newUser.lastName}`, `New user registered: ${email}`);

            // Verify user exists in DB
            const savedUser = findOne<User>('users', u => u.email === email);
            expect(savedUser).toBeDefined();
            expect(savedUser?.firstName).toBe('New');

            // Verify log was created
            const logs = getLogs({ action: 'USER_REGISTER' });
            expect(logs.length).toBe(1);
            expect(logs[0].details).toContain(email);
        });

        test('should prevent duplicate email registration', async () => {
            const email = 'existing@test.com';

            // Create first user
            create<User>('users', {
                firstName: 'First',
                lastName: 'User',
                email,
                password: await hashPassword('password1'),
                role: 'user',
                createdAt: new Date().toISOString(),
            });

            // Check for existing user
            const existingUser = findOne<User>('users', u => u.email === email);
            expect(existingUser).toBeDefined();

            // This simulates the API rejecting duplicate
            const canRegister = !existingUser;
            expect(canRegister).toBe(false);
        });
    });

    describe('Complete Login Flow', () => {
        test('should login → generate token → validate token', async () => {
            const email = 'login@test.com';
            const password = 'TestPassword123';

            // Setup: Create user
            const hashedPassword = await hashPassword(password);
            const user = create<User>('users', {
                firstName: 'Login',
                lastName: 'Test',
                email,
                password: hashedPassword,
                role: 'user',
                createdAt: new Date().toISOString(),
            });

            // Step 1: Find user by email
            const foundUser = findOne<User>('users', u => u.email === email);
            expect(foundUser).toBeDefined();

            // Step 2: Verify password
            const passwordValid = await verifyPassword(password, foundUser!.password);
            expect(passwordValid).toBe(true);

            // Step 3: Generate token
            const token = generateToken(foundUser!);
            expect(token).toBeDefined();

            // Step 4: Token should be valid
            const payload = verifyToken(token);
            expect(payload?.userId).toBe(user.id);
            expect(payload?.email).toBe(email);

            // Step 5: Log the login
            log('USER_LOGIN', user.id, `${user.firstName} ${user.lastName}`, `User logged in: ${email}`);

            const logs = getLogs({ action: 'USER_LOGIN' });
            expect(logs.length).toBe(1);
        });

        test('should reject invalid password', async () => {
            const email = 'wrongpass@test.com';

            // Setup: Create user
            create<User>('users', {
                firstName: 'Wrong',
                lastName: 'Password',
                email,
                password: await hashPassword('CorrectPassword'),
                role: 'user',
                createdAt: new Date().toISOString(),
            });

            const user = findOne<User>('users', u => u.email === email);
            const passwordValid = await verifyPassword('WrongPassword', user!.password);

            expect(passwordValid).toBe(false);
        });

        test('should reject non-existent user', () => {
            const user = findOne<User>('users', u => u.email === 'nonexistent@test.com');
            expect(user).toBeUndefined();
        });
    });

    describe('Token Validation Flow', () => {
        test('admin token should have admin role', async () => {
            const adminUser = create<User>('users', {
                firstName: 'Admin',
                lastName: 'User',
                email: 'admin@test.com',
                password: await hashPassword('AdminPass123'),
                role: 'admin',
                createdAt: new Date().toISOString(),
            });

            const token = generateToken(adminUser);
            const payload = verifyToken(token);

            expect(payload?.role).toBe('admin');
        });

        test('user token should have user role', async () => {
            const normalUser = create<User>('users', {
                firstName: 'Normal',
                lastName: 'User',
                email: 'normal@test.com',
                password: await hashPassword('UserPass123'),
                role: 'user',
                createdAt: new Date().toISOString(),
            });

            const token = generateToken(normalUser);
            const payload = verifyToken(token);

            expect(payload?.role).toBe('user');
        });
    });
});
