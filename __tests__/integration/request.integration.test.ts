/**
 * Integration Tests - Request Workflow
 * Tests the complete material request workflow
 */

import { create, findById, update, findMany, writeDB } from '@/lib/db';
import { log, getLogs } from '@/lib/logger';
import type { InventoryItem, MaterialRequest } from '@/lib/types';

describe('Request Workflow Integration Tests', () => {
    const adminUser = { id: 'admin-1', name: 'Admin One' };
    const normalUser = { id: 'user-1', name: 'User One' };

    beforeEach(() => {
        writeDB('inventory', []);
        writeDB('requests', []);
        writeDB('logs', []);
    });

    afterAll(() => {
        writeDB('inventory', []);
        writeDB('requests', []);
        writeDB('logs', []);
    });

    describe('Create Request Flow', () => {
        test('User: Create request → Stock check → Log', () => {
            // Setup: Create inventory item
            const item = create<InventoryItem>('inventory', {
                name: 'Arduino Uno',
                description: 'Microcontroller',
                category: 'Elektronik',
                quantity: 10,
                minQuantity: 2,
                location: 'A1',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                createdBy: adminUser.id,
            });

            const requestQuantity = 3;

            // Check stock
            expect(item.quantity).toBeGreaterThanOrEqual(requestQuantity);

            // Create request
            const request = create<MaterialRequest>('requests', {
                userId: normalUser.id,
                userName: normalUser.name,
                itemId: item.id,
                itemName: item.name,
                quantity: requestQuantity,
                reason: 'Robot projesi için gerekli',
                status: 'pending',
                createdAt: new Date().toISOString(),
            });

            // Log
            log('REQUEST_CREATE', normalUser.id, normalUser.name, `Request created: ${item.name} (${requestQuantity} units)`, {
                requestId: request.id,
                itemId: item.id,
                quantity: requestQuantity,
            });

            // Verify request
            expect(request.status).toBe('pending');
            expect(request.itemName).toBe('Arduino Uno');

            // Verify log
            const logs = getLogs({ action: 'REQUEST_CREATE' });
            expect(logs.length).toBe(1);
        });

        test('User: Duplicate pending request → Should detect', () => {
            // Setup
            const item = create<InventoryItem>('inventory', {
                name: 'Servo Motor',
                description: '',
                category: 'Motorlar',
                quantity: 5,
                minQuantity: 1,
                location: '',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                createdBy: adminUser.id,
            });

            // First request
            create<MaterialRequest>('requests', {
                userId: normalUser.id,
                userName: normalUser.name,
                itemId: item.id,
                itemName: item.name,
                quantity: 2,
                reason: 'First request',
                status: 'pending',
                createdAt: new Date().toISOString(),
            });

            // Check for existing pending request
            const existingRequest = findMany<MaterialRequest>('requests',
                r => r.userId === normalUser.id && r.itemId === item.id && r.status === 'pending'
            );

            expect(existingRequest.length).toBe(1);

            // This simulates API rejecting duplicate
            const canCreateNew = existingRequest.length === 0;
            expect(canCreateNew).toBe(false);
        });

        test('User: Insufficient stock → Should detect', () => {
            const item = create<InventoryItem>('inventory', {
                name: 'Rare Component',
                description: '',
                category: 'Elektronik',
                quantity: 2,
                minQuantity: 1,
                location: '',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                createdBy: adminUser.id,
            });

            const requestQuantity = 5;
            const hasStock = item.quantity >= requestQuantity;

            expect(hasStock).toBe(false);
        });
    });

    describe('Approve Request Flow', () => {
        test('Admin: Approve → Decrease stock → Log', () => {
            // Setup
            const item = create<InventoryItem>('inventory', {
                name: 'Sensor',
                description: '',
                category: 'Sensörler',
                quantity: 10,
                minQuantity: 2,
                location: '',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                createdBy: adminUser.id,
            });

            const request = create<MaterialRequest>('requests', {
                userId: normalUser.id,
                userName: normalUser.name,
                itemId: item.id,
                itemName: item.name,
                quantity: 3,
                reason: 'Project need',
                status: 'pending',
                createdAt: new Date().toISOString(),
            });

            // Approve request
            const updatedRequest = update<MaterialRequest>('requests', request.id, {
                status: 'approved',
                reviewedBy: adminUser.id,
                reviewedAt: new Date().toISOString(),
            });

            // Decrease stock
            const updatedItem = update<InventoryItem>('inventory', item.id, {
                quantity: item.quantity - request.quantity,
                updatedAt: new Date().toISOString(),
            });

            // Log approval
            log('REQUEST_APPROVE', adminUser.id, adminUser.name, `Approved request: ${item.name}`, {
                requestId: request.id,
            });

            // Verify
            expect(updatedRequest?.status).toBe('approved');
            expect(updatedItem?.quantity).toBe(7); // 10 - 3

            const logs = getLogs({ action: 'REQUEST_APPROVE' });
            expect(logs.length).toBe(1);
        });
    });

    describe('Reject Request Flow', () => {
        test('Admin: Reject → Add note → Log', () => {
            // Setup
            const item = create<InventoryItem>('inventory', {
                name: 'Special Component',
                description: '',
                category: 'Elektronik',
                quantity: 5,
                minQuantity: 2,
                location: '',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                createdBy: adminUser.id,
            });

            const request = create<MaterialRequest>('requests', {
                userId: normalUser.id,
                userName: normalUser.name,
                itemId: item.id,
                itemName: item.name,
                quantity: 3,
                reason: 'Personal project',
                status: 'pending',
                createdAt: new Date().toISOString(),
            });

            const rejectNote = 'Bu malzeme sadece resmi projeler için ayrılmıştır';

            // Reject request
            const updatedRequest = update<MaterialRequest>('requests', request.id, {
                status: 'rejected',
                adminNote: rejectNote,
                reviewedBy: adminUser.id,
                reviewedAt: new Date().toISOString(),
            });

            // Log rejection
            log('REQUEST_REJECT', adminUser.id, adminUser.name, `Rejected request: ${item.name}`, {
                requestId: request.id,
                reason: rejectNote,
            });

            // Verify - stock should NOT change
            const currentItem = findById<InventoryItem>('inventory', item.id);
            expect(currentItem?.quantity).toBe(5);

            expect(updatedRequest?.status).toBe('rejected');
            expect(updatedRequest?.adminNote).toBe(rejectNote);

            const logs = getLogs({ action: 'REQUEST_REJECT' });
            expect(logs.length).toBe(1);
        });
    });

    describe('Cancel Request Flow', () => {
        test('User: Cancel pending request', () => {
            const item = create<InventoryItem>('inventory', {
                name: 'Motor',
                description: '',
                category: 'Motorlar',
                quantity: 5,
                minQuantity: 1,
                location: '',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                createdBy: adminUser.id,
            });

            const request = create<MaterialRequest>('requests', {
                userId: normalUser.id,
                userName: normalUser.name,
                itemId: item.id,
                itemName: item.name,
                quantity: 2,
                reason: 'Test',
                status: 'pending',
                createdAt: new Date().toISOString(),
            });

            // Cancel (by marking as rejected with note)
            const cancelledRequest = update<MaterialRequest>('requests', request.id, {
                status: 'rejected',
                adminNote: 'Talep iptal edildi',
                reviewedBy: normalUser.id,
                reviewedAt: new Date().toISOString(),
            });

            log('REQUEST_CANCEL', normalUser.id, normalUser.name, `Cancelled request: ${item.name}`, {
                requestId: request.id,
            });

            expect(cancelledRequest?.status).toBe('rejected');

            const logs = getLogs({ action: 'REQUEST_CANCEL' });
            expect(logs.length).toBe(1);
        });
    });
});
