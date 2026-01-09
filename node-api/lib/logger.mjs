import { create, findMany } from './db.mjs';

export function log(
    action,
    userId,
    userName,
    details,
    metadata
) {
    const entry = create('logs', {
        action,
        userId,
        userName,
        details,
        metadata,
        timestamp: new Date().toISOString(),
    });

    return entry;
}

export function getLogs(filter) {
    let logs = findMany('logs', () => true);

    if (filter) {
        if (filter.userId) {
            logs = logs.filter(l => l.userId === filter.userId);
        }
        if (filter.action) {
            logs = logs.filter(l => l.action === filter.action);
        }
        if (filter.startDate) {
            logs = logs.filter(l => new Date(l.timestamp) >= new Date(filter.startDate));
        }
        if (filter.endDate) {
            logs = logs.filter(l => new Date(l.timestamp) <= new Date(filter.endDate));
        }
    }

    // Sort by timestamp descending (newest first)
    return logs.sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
}

export function getRecentLogs(limit = 50) {
    return getLogs().slice(0, limit);
}
