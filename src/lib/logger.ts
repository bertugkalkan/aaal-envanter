import { create, findMany } from './db';

export type LogAction =
    | 'USER_REGISTER'
    | 'USER_LOGIN'
    | 'USER_LOGOUT'
    | 'INVENTORY_CREATE'
    | 'INVENTORY_UPDATE'
    | 'INVENTORY_DELETE'
    | 'REQUEST_CREATE'
    | 'REQUEST_APPROVE'
    | 'REQUEST_REJECT'
    | 'REQUEST_CANCEL'
    | 'RETURN_INITIATE'
    | 'RETURN_CONFIRM';

export interface LogEntry {
    id: string;
    action: LogAction;
    userId: string;
    userName: string;
    details: string;
    metadata?: Record<string, unknown>;
    timestamp: string;
}

export function log(
    action: LogAction,
    userId: string,
    userName: string,
    details: string,
    metadata?: Record<string, unknown>
): LogEntry {
    const entry = create<LogEntry>('logs', {
        action,
        userId,
        userName,
        details,
        metadata,
        timestamp: new Date().toISOString(),
    });

    return entry;
}

export function getLogs(filter?: {
    userId?: string;
    action?: LogAction;
    startDate?: string;
    endDate?: string;
}): LogEntry[] {
    let logs = findMany<LogEntry>('logs', () => true);

    if (filter) {
        if (filter.userId) {
            logs = logs.filter(l => l.userId === filter.userId);
        }
        if (filter.action) {
            logs = logs.filter(l => l.action === filter.action);
        }
        if (filter.startDate) {
            logs = logs.filter(l => new Date(l.timestamp) >= new Date(filter.startDate!));
        }
        if (filter.endDate) {
            logs = logs.filter(l => new Date(l.timestamp) <= new Date(filter.endDate!));
        }
    }

    // Sort by timestamp descending (newest first)
    return logs.sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
}

export function getRecentLogs(limit: number = 50): LogEntry[] {
    return getLogs().slice(0, limit);
}
