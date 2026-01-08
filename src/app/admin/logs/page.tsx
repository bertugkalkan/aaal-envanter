'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';

interface LogEntry {
    id: string;
    action: string;
    userId: string;
    userName: string;
    details: string;
    metadata?: Record<string, unknown>;
    timestamp: string;
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
    USER_REGISTER: { label: 'Kayıt', color: '#7c3aed' },
    USER_LOGIN: { label: 'Giriş', color: '#06b6d4' },
    USER_LOGOUT: { label: 'Çıkış', color: '#64748b' },
    INVENTORY_CREATE: { label: 'Malzeme Ekleme', color: '#10b981' },
    INVENTORY_UPDATE: { label: 'Malzeme Güncelleme', color: '#f59e0b' },
    INVENTORY_DELETE: { label: 'Malzeme Silme', color: '#ef4444' },
    REQUEST_CREATE: { label: 'Talep Oluşturma', color: '#8b5cf6' },
    REQUEST_APPROVE: { label: 'Talep Onaylama', color: '#22c55e' },
    REQUEST_REJECT: { label: 'Talep Reddetme', color: '#f43f5e' },
    REQUEST_CANCEL: { label: 'Talep İptal', color: '#94a3b8' }
};

export default function LogsPage() {
    const { token } = useAuth();
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [actionFilter, setActionFilter] = useState('');
    const [dateFilter, setDateFilter] = useState('');

    useEffect(() => {
        fetchLogs();
    }, [token]);

    const fetchLogs = async () => {
        try {
            const res = await fetch('/api/logs?limit=200', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setLogs(data.logs);
            }
        } catch (error) {
            console.error('Error fetching logs:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredLogs = logs.filter(log => {
        const matchesAction = !actionFilter || log.action === actionFilter;
        const matchesDate = !dateFilter || log.timestamp.startsWith(dateFilter);
        return matchesAction && matchesDate;
    });

    // Group logs by date
    const groupedLogs = filteredLogs.reduce((groups, log) => {
        const date = new Date(log.timestamp).toLocaleDateString('tr-TR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        if (!groups[date]) {
            groups[date] = [];
        }
        groups[date].push(log);
        return groups;
    }, {} as Record<string, LogEntry[]>);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div>
            <Navbar title="Log Kayıtları" />

            <div className="glass-card p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <h2 className="text-xl font-bold">Sistem Logları ({filteredLogs.length})</h2>
                    <div className="flex gap-3 flex-wrap">
                        <select
                            value={actionFilter}
                            onChange={(e) => setActionFilter(e.target.value)}
                            className="input-field !py-2 !px-4"
                            style={{ width: '180px' }}
                        >
                            <option value="">Tüm İşlemler</option>
                            {Object.entries(ACTION_LABELS).map(([key, { label }]) => (
                                <option key={key} value={key}>{label}</option>
                            ))}
                        </select>
                        <input
                            type="date"
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            className="input-field !py-2 !px-4"
                        />
                        {(actionFilter || dateFilter) && (
                            <button
                                onClick={() => {
                                    setActionFilter('');
                                    setDateFilter('');
                                }}
                                className="btn-secondary !py-2"
                            >
                                Temizle
                            </button>
                        )}
                    </div>
                </div>

                {filteredLogs.length === 0 ? (
                    <div className="text-center py-12 text-[var(--text-secondary)]">
                        Log kaydı bulunamadı
                    </div>
                ) : (
                    <div className="space-y-8">
                        {Object.entries(groupedLogs).map(([date, dateLogs]) => (
                            <div key={date}>
                                <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-4 sticky top-0 bg-[#0b1437] py-2">
                                    {date}
                                </h3>
                                <div className="space-y-3">
                                    {dateLogs.map((log, index) => {
                                        const actionInfo = ACTION_LABELS[log.action] || { label: log.action, color: '#64748b' };

                                        return (
                                            <div
                                                key={log.id}
                                                className="flex gap-4 animate-fadeIn"
                                                style={{ animationDelay: `${index * 50}ms` }}
                                            >
                                                {/* Timeline */}
                                                <div className="flex flex-col items-center">
                                                    <div
                                                        className="w-3 h-3 rounded-full flex-shrink-0"
                                                        style={{ backgroundColor: actionInfo.color }}
                                                    />
                                                    {index < dateLogs.length - 1 && (
                                                        <div className="w-0.5 flex-1 bg-white/10 mt-1" />
                                                    )}
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 pb-4">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span
                                                            className="px-2 py-0.5 rounded text-xs font-medium"
                                                            style={{
                                                                backgroundColor: `${actionInfo.color}20`,
                                                                color: actionInfo.color
                                                            }}
                                                        >
                                                            {actionInfo.label}
                                                        </span>
                                                        <span className="text-xs text-[var(--text-secondary)]">
                                                            {new Date(log.timestamp).toLocaleTimeString('tr-TR')}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm mb-1">{log.details}</p>
                                                    <p className="text-xs text-[var(--text-secondary)]">
                                                        {log.userName}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
