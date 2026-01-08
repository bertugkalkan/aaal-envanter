import { log, getLogs, getRecentLogs, LogAction } from '@/lib/logger';
import { writeDB, readDB } from '@/lib/db';

describe('Logger Module', () => {
    beforeEach(() => {
        // Clear logs before each test
        writeDB('logs', []);
    });

    afterAll(() => {
        writeDB('logs', []);
    });

    describe('log function', () => {
        test('should create log entry with all fields', () => {
            const entry = log(
                'USER_LOGIN',
                'user-123',
                'Test User',
                'User logged in successfully'
            );

            expect(entry.id).toBeDefined();
            expect(entry.action).toBe('USER_LOGIN');
            expect(entry.userId).toBe('user-123');
            expect(entry.userName).toBe('Test User');
            expect(entry.details).toBe('User logged in successfully');
            expect(entry.timestamp).toBeDefined();
        });

        test('should create log entry with metadata', () => {
            const metadata = { itemId: 'item-456', quantity: 5 };
            const entry = log(
                'INVENTORY_CREATE',
                'user-123',
                'Test User',
                'Created inventory item',
                metadata
            );

            expect(entry.metadata).toEqual(metadata);
        });

        test('should persist log to database', () => {
            log('USER_REGISTER', 'user-123', 'New User', 'Registration');

            const logs = readDB('logs');
            expect(logs.length).toBe(1);
        });
    });

    describe('getLogs function', () => {
        beforeEach(() => {
            // Create test logs
            log('USER_LOGIN', 'user-1', 'User One', 'Login 1');
            log('USER_LOGIN', 'user-2', 'User Two', 'Login 2');
            log('INVENTORY_CREATE', 'user-1', 'User One', 'Created item');
            log('REQUEST_CREATE', 'user-2', 'User Two', 'Created request');
        });

        test('should return all logs without filter', () => {
            const logs = getLogs();
            expect(logs.length).toBe(4);
        });

        test('should filter by userId', () => {
            const logs = getLogs({ userId: 'user-1' });
            expect(logs.length).toBe(2);
            expect(logs.every(l => l.userId === 'user-1')).toBe(true);
        });

        test('should filter by action', () => {
            const logs = getLogs({ action: 'USER_LOGIN' });
            expect(logs.length).toBe(2);
            expect(logs.every(l => l.action === 'USER_LOGIN')).toBe(true);
        });

        test('should return logs sorted by timestamp descending', () => {
            const logs = getLogs();

            for (let i = 0; i < logs.length - 1; i++) {
                const current = new Date(logs[i].timestamp).getTime();
                const next = new Date(logs[i + 1].timestamp).getTime();
                expect(current).toBeGreaterThanOrEqual(next);
            }
        });
    });

    describe('getRecentLogs function', () => {
        beforeEach(() => {
            // Create 10 test logs
            for (let i = 0; i < 10; i++) {
                log('USER_LOGIN', `user-${i}`, `User ${i}`, `Login ${i}`);
            }
        });

        test('should return limited number of logs', () => {
            const logs = getRecentLogs(5);
            expect(logs.length).toBe(5);
        });

        test('should use default limit of 50', () => {
            const logs = getRecentLogs();
            expect(logs.length).toBe(10); // Less than 50, so all returned
        });
    });
});
