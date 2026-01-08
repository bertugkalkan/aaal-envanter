/**
 * Integration Tests - Inventory Operations
 * Tests complete inventory management workflow with logging
 */

import { create, findById, update, remove, findAll, writeDB } from '@/lib/db';
import { log, getLogs } from '@/lib/logger';
import type { InventoryItem } from '@/lib/types';

describe('Inventory Integration Tests', () => {
    const adminUser = {
        id: 'admin-123',
        name: 'Admin User',
    };

    const normalUser = {
        id: 'user-456',
        name: 'Normal User',
    };

    beforeEach(() => {
        writeDB('inventory', []);
        writeDB('logs', []);
    });

    afterAll(() => {
        writeDB('inventory', []);
        writeDB('logs', []);
    });

    describe('Admin Inventory CRUD with Logging', () => {
        test('Admin: Create item → DB verify → Log check', () => {
            // Create inventory item
            const newItem = create<InventoryItem>('inventory', {
                name: 'Arduino Uno',
                description: 'Microcontroller board',
                category: 'Elektronik',
                quantity: 10,
                minQuantity: 2,
                location: 'Dolap A',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                createdBy: adminUser.id,
            });

            // Log the action
            log('INVENTORY_CREATE', adminUser.id, adminUser.name, `Created item: Arduino Uno`, {
                itemId: newItem.id,
                name: 'Arduino Uno',
                quantity: 10,
            });

            // Verify item in DB
            const savedItem = findById<InventoryItem>('inventory', newItem.id);
            expect(savedItem).toBeDefined();
            expect(savedItem?.name).toBe('Arduino Uno');
            expect(savedItem?.quantity).toBe(10);

            // Verify log
            const logs = getLogs({ action: 'INVENTORY_CREATE' });
            expect(logs.length).toBe(1);
            expect(logs[0].metadata?.name).toBe('Arduino Uno');
        });

        test('Admin: Update item → Previous value in log', () => {
            // Create initial item
            const item = create<InventoryItem>('inventory', {
                name: 'Servo Motor',
                description: 'SG90 servo motor',
                category: 'Motorlar',
                quantity: 5,
                minQuantity: 2,
                location: 'Raf 1',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                createdBy: adminUser.id,
            });

            const previousQuantity = item.quantity;

            // Update quantity
            const updatedItem = update<InventoryItem>('inventory', item.id, {
                quantity: 15,
                updatedAt: new Date().toISOString(),
            });

            // Log with previous value
            log('INVENTORY_UPDATE', adminUser.id, adminUser.name, `Updated item: Servo Motor`, {
                itemId: item.id,
                previousQuantity,
                newQuantity: 15,
            });

            // Verify update
            expect(updatedItem?.quantity).toBe(15);

            // Verify log contains previous value
            const logs = getLogs({ action: 'INVENTORY_UPDATE' });
            expect(logs[0].metadata?.previousQuantity).toBe(5);
            expect(logs[0].metadata?.newQuantity).toBe(15);
        });

        test('Admin: Delete item → Log with deleted item info', () => {
            // Create item
            const item = create<InventoryItem>('inventory', {
                name: 'Breadboard',
                description: 'MB-102 breadboard',
                category: 'Elektronik',
                quantity: 20,
                minQuantity: 5,
                location: 'Raf 2',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                createdBy: adminUser.id,
            });

            const itemName = item.name;
            const itemId = item.id;

            // Delete item
            const deleted = remove<InventoryItem>('inventory', itemId);

            // Log deletion
            log('INVENTORY_DELETE', adminUser.id, adminUser.name, `Deleted item: ${itemName}`, {
                itemId,
                deletedItem: { name: itemName, quantity: 20 },
            });

            expect(deleted).toBe(true);

            // Verify item is gone
            const foundItem = findById<InventoryItem>('inventory', itemId);
            expect(foundItem).toBeUndefined();

            // Verify log
            const logs = getLogs({ action: 'INVENTORY_DELETE' });
            expect(logs.length).toBe(1);
            expect(logs[0].details).toContain('Breadboard');
        });
    });

    describe('Inventory Listing', () => {
        test('User: List all inventory items', () => {
            // Create multiple items
            create<InventoryItem>('inventory', {
                name: 'Item 1',
                description: 'Desc 1',
                category: 'Elektronik',
                quantity: 10,
                minQuantity: 2,
                location: 'A1',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                createdBy: adminUser.id,
            });

            create<InventoryItem>('inventory', {
                name: 'Item 2',
                description: 'Desc 2',
                category: 'Mekanik',
                quantity: 5,
                minQuantity: 1,
                location: 'B1',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                createdBy: adminUser.id,
            });

            const items = findAll<InventoryItem>('inventory');
            expect(items.length).toBe(2);
        });

        test('Filter by category', () => {
            create<InventoryItem>('inventory', {
                name: 'Electronic Item',
                description: '',
                category: 'Elektronik',
                quantity: 10,
                minQuantity: 2,
                location: '',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                createdBy: adminUser.id,
            });

            create<InventoryItem>('inventory', {
                name: 'Mechanical Item',
                description: '',
                category: 'Mekanik',
                quantity: 5,
                minQuantity: 1,
                location: '',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                createdBy: adminUser.id,
            });

            const items = findAll<InventoryItem>('inventory');
            const electronicItems = items.filter(i => i.category === 'Elektronik');

            expect(electronicItems.length).toBe(1);
            expect(electronicItems[0].name).toBe('Electronic Item');
        });
    });

    describe('Low Stock Detection', () => {
        test('Should identify low stock items', () => {
            create<InventoryItem>('inventory', {
                name: 'Low Stock Item',
                description: '',
                category: 'Elektronik',
                quantity: 2,
                minQuantity: 5, // Below minimum
                location: '',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                createdBy: adminUser.id,
            });

            create<InventoryItem>('inventory', {
                name: 'Normal Stock Item',
                description: '',
                category: 'Elektronik',
                quantity: 10,
                minQuantity: 5, // Above minimum
                location: '',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                createdBy: adminUser.id,
            });

            const items = findAll<InventoryItem>('inventory');
            const lowStockItems = items.filter(i => i.quantity <= i.minQuantity);

            expect(lowStockItems.length).toBe(1);
            expect(lowStockItems[0].name).toBe('Low Stock Item');
        });
    });
});
