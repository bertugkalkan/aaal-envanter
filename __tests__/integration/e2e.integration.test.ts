/**
 * End-to-End Integration Test
 * Tests the complete business workflow from user registration to material delivery
 */

import { hashPassword, generateToken, verifyToken } from '@/lib/auth';
import { create, findById, update, findMany, writeDB } from '@/lib/db';
import { log, getLogs } from '@/lib/logger';
import type { User } from '@/lib/auth';
import type { InventoryItem, MaterialRequest } from '@/lib/types';

describe('End-to-End Integration Test', () => {
    beforeEach(() => {
        writeDB('users', []);
        writeDB('inventory', []);
        writeDB('requests', []);
        writeDB('logs', []);
    });

    afterAll(() => {
        writeDB('users', []);
        writeDB('inventory', []);
        writeDB('requests', []);
        writeDB('logs', []);
    });

    test('Complete Business Flow: Registration → Inventory → Request → Approval', async () => {
        // ==================== STEP 1: Admin creates account ====================
        const adminPassword = await hashPassword('AdminSecure123');
        const admin = create<User>('users', {
            firstName: 'Dr. Ahmet',
            lastName: 'Yılmaz',
            email: 'ahmet.yilmaz@university.edu.tr',
            password: adminPassword,
            role: 'admin',
            createdAt: new Date().toISOString(),
        });

        log('USER_REGISTER', admin.id, `${admin.firstName} ${admin.lastName}`,
            `Admin registered: ${admin.email}`);

        expect(admin.role).toBe('admin');

        // ==================== STEP 2: User1 registers ====================
        const user1Password = await hashPassword('User1Pass123');
        const user1 = create<User>('users', {
            firstName: 'Mehmet',
            lastName: 'Demir',
            email: 'mehmet.demir@student.edu.tr',
            password: user1Password,
            role: 'user',
            createdAt: new Date().toISOString(),
        });

        log('USER_REGISTER', user1.id, `${user1.firstName} ${user1.lastName}`,
            `User registered: ${user1.email}`);

        expect(user1.role).toBe('user');

        // ==================== STEP 3: Admin adds inventory ====================
        const adminToken = generateToken(admin);
        const adminPayload = verifyToken(adminToken);
        expect(adminPayload?.role).toBe('admin');

        const arduinoItem = create<InventoryItem>('inventory', {
            name: 'Arduino Uno R3',
            description: 'ATmega328P tabanlı mikrodenetleyici kartı',
            category: 'Elektronik',
            quantity: 5,
            minQuantity: 2,
            location: 'Dolap A, Raf 1',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: admin.id,
        });

        log('INVENTORY_CREATE', admin.id, `${admin.firstName} ${admin.lastName}`,
            `Added inventory: ${arduinoItem.name}`, { itemId: arduinoItem.id, quantity: 5 });

        expect(arduinoItem.quantity).toBe(5);

        // ==================== STEP 4: User1 logs in and views inventory ====================
        const user1Token = generateToken(user1);
        const user1Payload = verifyToken(user1Token);
        expect(user1Payload?.role).toBe('user');

        log('USER_LOGIN', user1.id, `${user1.firstName} ${user1.lastName}`,
            `User logged in: ${user1.email}`);

        // User sees inventory
        const inventoryList = findMany<InventoryItem>('inventory', () => true);
        expect(inventoryList.length).toBe(1);
        expect(inventoryList[0].name).toBe('Arduino Uno R3');

        // ==================== STEP 5: User1 requests Arduino ====================
        const requestQuantity = 2;

        // Check stock
        expect(arduinoItem.quantity).toBeGreaterThanOrEqual(requestQuantity);

        const request = create<MaterialRequest>('requests', {
            userId: user1.id,
            userName: `${user1.firstName} ${user1.lastName}`,
            itemId: arduinoItem.id,
            itemName: arduinoItem.name,
            quantity: requestQuantity,
            reason: 'Robotik projem için mikrodenetleyici gerekiyor',
            status: 'pending',
            createdAt: new Date().toISOString(),
        });

        log('REQUEST_CREATE', user1.id, `${user1.firstName} ${user1.lastName}`,
            `Request created: ${arduinoItem.name} (${requestQuantity} units)`,
            { requestId: request.id, quantity: requestQuantity });

        expect(request.status).toBe('pending');

        // ==================== STEP 6: Admin reviews and approves ====================
        // Admin sees pending request
        const pendingRequests = findMany<MaterialRequest>('requests', r => r.status === 'pending');
        expect(pendingRequests.length).toBe(1);
        expect(pendingRequests[0].userName).toBe('Mehmet Demir');

        // Admin approves
        const approvedRequest = update<MaterialRequest>('requests', request.id, {
            status: 'approved',
            adminNote: 'Onaylandı. Malzemeyi atölyeden alabilirsiniz.',
            reviewedBy: admin.id,
            reviewedAt: new Date().toISOString(),
        });

        // Decrease stock
        const updatedArduino = update<InventoryItem>('inventory', arduinoItem.id, {
            quantity: arduinoItem.quantity - requestQuantity,
            updatedAt: new Date().toISOString(),
        });

        log('REQUEST_APPROVE', admin.id, `${admin.firstName} ${admin.lastName}`,
            `Approved request: ${arduinoItem.name}`, { requestId: request.id });

        expect(approvedRequest?.status).toBe('approved');
        expect(updatedArduino?.quantity).toBe(3); // 5 - 2 = 3

        // ==================== STEP 7: User1 sees approved request ====================
        const userRequests = findMany<MaterialRequest>('requests', r => r.userId === user1.id);
        expect(userRequests.length).toBe(1);
        expect(userRequests[0].status).toBe('approved');
        expect(userRequests[0].adminNote).toContain('Onaylandı');

        // ==================== STEP 8: Admin checks all logs ====================
        const allLogs = getLogs();

        // Verify all actions are logged
        const logActions = allLogs.map(l => l.action);
        expect(logActions).toContain('USER_REGISTER');
        expect(logActions).toContain('USER_LOGIN');
        expect(logActions).toContain('INVENTORY_CREATE');
        expect(logActions).toContain('REQUEST_CREATE');
        expect(logActions).toContain('REQUEST_APPROVE');

        // Verify log count
        expect(allLogs.length).toBe(6); // 2 registers + 1 login + 1 inventory + 1 request + 1 approve

        // ==================== Final Verification ====================
        console.log('✅ E2E Test Complete!');
        console.log(`   Users: ${findMany<User>('users', () => true).length}`);
        console.log(`   Inventory Items: ${findMany<InventoryItem>('inventory', () => true).length}`);
        console.log(`   Requests: ${findMany<MaterialRequest>('requests', () => true).length}`);
        console.log(`   Logs: ${allLogs.length}`);
    });
});
