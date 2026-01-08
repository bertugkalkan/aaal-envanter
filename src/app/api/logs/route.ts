import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, requireAdmin } from '@/lib/auth';
import { getLogs, getRecentLogs, LogAction } from '@/lib/logger';

export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser(request);

        if (!user || !requireAdmin(user)) {
            return NextResponse.json(
                { error: 'Bu işlem için yetkiniz yok' },
                { status: 403 }
            );
        }

        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const action = searchParams.get('action') as LogAction | null;
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const limit = searchParams.get('limit');

        let logs;

        if (userId || action || startDate || endDate) {
            logs = getLogs({
                userId: userId || undefined,
                action: action || undefined,
                startDate: startDate || undefined,
                endDate: endDate || undefined,
            });
        } else {
            logs = getRecentLogs(limit ? parseInt(limit) : 100);
        }

        return NextResponse.json({ logs });
    } catch (error) {
        console.error('Get logs error:', error);
        return NextResponse.json(
            { error: 'Loglar alınamadı' },
            { status: 500 }
        );
    }
}
