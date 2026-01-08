import {
    readDB,
    writeDB,
    generateId,
    create,
    findAll,
    findById,
    findOne,
    findMany,
    update,
    remove,
    getFilePath
} from '@/lib/db';
import { existsSync, unlinkSync, mkdirSync } from 'fs';
import { join } from 'path';

interface TestItem {
    id: string;
    name: string;
    value: number;
}

const TEST_DB_PATH = join(process.cwd(), 'data');

describe('Database Module', () => {
    // Clean up test data before and after tests
    const cleanTestData = () => {
        const testFiles = ['users', 'inventory', 'requests', 'logs'] as const;
        testFiles.forEach(file => {
            const filePath = getFilePath(file);
            if (existsSync(filePath)) {
                try {
                    writeDB(file, []);
                } catch {
                    // Ignore errors
                }
            }
        });
    };

    beforeAll(() => {
        if (!existsSync(TEST_DB_PATH)) {
            mkdirSync(TEST_DB_PATH, { recursive: true });
        }
        cleanTestData();
    });

    afterAll(() => {
        cleanTestData();
    });

    beforeEach(() => {
        cleanTestData();
    });

    describe('generateId', () => {
        test('should generate unique IDs', () => {
            const id1 = generateId();
            const id2 = generateId();
            const id3 = generateId();

            expect(id1).not.toBe(id2);
            expect(id2).not.toBe(id3);
            expect(id1).not.toBe(id3);
        });

        test('should generate valid UUID format', () => {
            const id = generateId();
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

            expect(id).toMatch(uuidRegex);
        });
    });

    describe('readDB and writeDB', () => {
        test('should read empty array from non-existent file', () => {
            const data = readDB<TestItem>('inventory');
            expect(Array.isArray(data)).toBe(true);
        });

        test('should write and read data correctly', () => {
            const testData = [
                { id: '1', name: 'Item 1', value: 100 },
                { id: '2', name: 'Item 2', value: 200 },
            ];

            writeDB('inventory', testData);
            const readData = readDB<TestItem>('inventory');

            expect(readData).toEqual(testData);
        });
    });

    describe('CRUD Operations', () => {
        test('create should add item with generated ID', () => {
            const newItem = create<TestItem>('inventory', {
                name: 'Test Item',
                value: 100
            } as Omit<TestItem, 'id'>);

            expect(newItem.id).toBeDefined();
            expect(newItem.name).toBe('Test Item');
            expect(newItem.value).toBe(100);
        });

        test('findAll should return all items', () => {
            create<TestItem>('inventory', { name: 'Item 1', value: 100 } as Omit<TestItem, 'id'>);
            create<TestItem>('inventory', { name: 'Item 2', value: 200 } as Omit<TestItem, 'id'>);

            const items = findAll<TestItem>('inventory');
            expect(items.length).toBe(2);
        });

        test('findById should return correct item', () => {
            const created = create<TestItem>('inventory', { name: 'Find Me', value: 300 } as Omit<TestItem, 'id'>);

            const found = findById<TestItem>('inventory', created.id);
            expect(found).toBeDefined();
            expect(found?.name).toBe('Find Me');
        });

        test('findById should return undefined for non-existent ID', () => {
            const found = findById<TestItem>('inventory', 'non-existent-id');
            expect(found).toBeUndefined();
        });

        test('findOne should return first matching item', () => {
            create<TestItem>('inventory', { name: 'Item 1', value: 100 } as Omit<TestItem, 'id'>);
            create<TestItem>('inventory', { name: 'Target', value: 200 } as Omit<TestItem, 'id'>);

            const found = findOne<TestItem>('inventory', item => item.name === 'Target');
            expect(found?.name).toBe('Target');
        });

        test('findMany should return all matching items', () => {
            create<TestItem>('inventory', { name: 'High', value: 500 } as Omit<TestItem, 'id'>);
            create<TestItem>('inventory', { name: 'Low', value: 50 } as Omit<TestItem, 'id'>);
            create<TestItem>('inventory', { name: 'High2', value: 600 } as Omit<TestItem, 'id'>);

            const highItems = findMany<TestItem>('inventory', item => item.value > 100);
            expect(highItems.length).toBe(2);
        });

        test('update should modify item correctly', () => {
            const created = create<TestItem>('inventory', { name: 'Original', value: 100 } as Omit<TestItem, 'id'>);

            const updated = update<TestItem>('inventory', created.id, { name: 'Updated' });
            expect(updated?.name).toBe('Updated');
            expect(updated?.value).toBe(100); // Value unchanged
        });

        test('update should return undefined for non-existent ID', () => {
            const result = update<TestItem>('inventory', 'non-existent', { name: 'Test' });
            expect(result).toBeUndefined();
        });

        test('remove should delete item', () => {
            const created = create<TestItem>('inventory', { name: 'Delete Me', value: 100 } as Omit<TestItem, 'id'>);

            const removed = remove<TestItem>('inventory', created.id);
            expect(removed).toBe(true);

            const found = findById<TestItem>('inventory', created.id);
            expect(found).toBeUndefined();
        });

        test('remove should return false for non-existent ID', () => {
            const result = remove<TestItem>('inventory', 'non-existent');
            expect(result).toBe(false);
        });
    });
});
