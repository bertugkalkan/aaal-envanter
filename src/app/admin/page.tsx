'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import Link from 'next/link';

interface Stats {
    totalItems: number;
    lowStockItems: number;
    totalUsers: number;
    todayLogs: number;
}

interface RecentUser {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
    createdAt: string;
}

interface RecentLog {
    id: string;
    action: string;
    userName: string;
    details: string;
    timestamp: string;
}

interface InventoryItem {
    id: string;
    name: string;
    category: string;
    quantity: number;
    minQuantity: number;
}

export default function AdminDashboard() {
    const { token } = useAuth();
    const [stats, setStats] = useState<Stats>({
        totalItems: 0,
        lowStockItems: 0,
        totalUsers: 0,
        todayLogs: 0
    });
    const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([]);
    const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
    const [recentLogs, setRecentLogs] = useState<RecentLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, [token]);

    const fetchDashboardData = async () => {
        try {
            const [inventoryRes, usersRes, logsRes] = await Promise.all([
                fetch('/api/inventory', { headers: { Authorization: `Bearer ${token}` } }),
                fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } }),
                fetch('/api/logs?limit=10', { headers: { Authorization: `Bearer ${token}` } })
            ]);

            if (inventoryRes.ok) {
                const inventoryData = await inventoryRes.json();
                const items = inventoryData.items;
                const lowStock = items.filter((i: InventoryItem) => i.quantity <= i.minQuantity);
                setLowStockItems(lowStock.slice(0, 5));
                setStats(prev => ({
                    ...prev,
                    totalItems: items.length,
                    lowStockItems: lowStock.length
                }));
            }

            if (usersRes.ok) {
                const usersData = await usersRes.json();
                const users = usersData.users;
                setRecentUsers(users.slice(0, 5));
                setStats(prev => ({
                    ...prev,
                    totalUsers: users.length
                }));
            }

            if (logsRes.ok) {
                const logsData = await logsRes.json();
                setRecentLogs(logsData.logs.slice(0, 6));
                const today = new Date().toDateString();
                setStats(prev => ({
                    ...prev,
                    todayLogs: logsData.logs.filter((l: RecentLog) => new Date(l.timestamp).toDateString() === today).length
                }));
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const getRoleLabel = (role: string) => {
        switch (role) {
            case 'admin': return 'Admin';
            case 'advisor': return 'Danışman';
            default: return 'Üye';
        }
    };

    const getRoleColor = (role: string) => {
        switch (role) {
            case 'admin': return 'var(--danger)';
            case 'advisor': return 'var(--primary)';
            default: return 'var(--secondary)';
        }
    };

    const getActionColor = (action: string) => {
        if (action.includes('LOGIN') || action.includes('REGISTER')) return 'var(--primary)';
        if (action.includes('CREATE')) return 'var(--success)';
        if (action.includes('DELETE')) return 'var(--danger)';
        if (action.includes('APPROVE')) return 'var(--success)';
        if (action.includes('REJECT')) return 'var(--danger)';
        return 'var(--secondary)';
    };

    const getActionText = (action: string) => {
        const actions: Record<string, string> = {
            USER_REGISTER: 'Kullanıcı Kaydı',
            USER_LOGIN: 'Giriş',
            INVENTORY_CREATE: 'Malzeme Ekleme',
            INVENTORY_UPDATE: 'Malzeme Güncelleme',
            INVENTORY_DELETE: 'Malzeme Silme',
            REQUEST_CREATE: 'Talep Oluşturma',
            REQUEST_APPROVE: 'Talep Onaylama',
            REQUEST_REJECT: 'Talep Reddetme'
        };
        return actions[action] || action;
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div>
            <Navbar title="Admin Paneli" />

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
                <Link href="/admin/inventory" className="stat-card group relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="flex items-center justify-between relative z-10">
                        <div>
                            <p className="text-[var(--text-secondary)] text-sm">Toplam Malzeme</p>
                            <p className="text-3xl md:text-4xl font-bold mt-2">{stats.totalItems}</p>
                            <p className="text-xs text-[var(--text-secondary)] mt-1">Envanterde</p>
                        </div>
                        <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-light)] flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-[var(--primary)]/20">
                            <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                        </div>
                    </div>
                </Link>

                <div className="stat-card relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-[var(--warning)]/10 to-transparent"></div>
                    <div className="flex items-center justify-between relative z-10">
                        <div>
                            <p className="text-[var(--text-secondary)] text-sm">Düşük Stok</p>
                            <p className="text-3xl md:text-4xl font-bold mt-2" style={{ color: stats.lowStockItems > 0 ? 'var(--warning)' : 'inherit' }}>{stats.lowStockItems}</p>
                            <p className="text-xs text-[var(--text-secondary)] mt-1">Uyarı Seviyesinde</p>
                        </div>
                        <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br from-[var(--warning)] to-orange-500 flex items-center justify-center shadow-lg shadow-[var(--warning)]/20">
                            <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                    </div>
                </div>

                <Link href="/admin/users" className="stat-card group relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-[var(--secondary)]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="flex items-center justify-between relative z-10">
                        <div>
                            <p className="text-[var(--text-secondary)] text-sm">Kullanıcılar</p>
                            <p className="text-3xl md:text-4xl font-bold mt-2">{stats.totalUsers}</p>
                            <p className="text-xs text-[var(--text-secondary)] mt-1">Sistemde Kayıtlı</p>
                        </div>
                        <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br from-[var(--secondary)] to-cyan-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-[var(--secondary)]/20">
                            <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                        </div>
                    </div>
                </Link>

                <Link href="/admin/logs" className="stat-card group relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent)]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="flex items-center justify-between relative z-10">
                        <div>
                            <p className="text-[var(--text-secondary)] text-sm">Bugünkü Log</p>
                            <p className="text-3xl md:text-4xl font-bold mt-2">{stats.todayLogs}</p>
                            <p className="text-xs text-[var(--text-secondary)] mt-1">İşlem Kaydı</p>
                        </div>
                        <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br from-[var(--accent)] to-pink-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-[var(--accent)]/20">
                            <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                    </div>
                </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Low Stock Items */}
                <div className="glass-card p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[var(--warning)]"></span>
                            Düşük Stoklar
                        </h2>
                        <Link href="/admin/inventory" className="text-[var(--primary)] hover:underline text-sm">
                            Envanter →
                        </Link>
                    </div>

                    {lowStockItems.length === 0 ? (
                        <div className="text-center py-8">
                            <div className="w-14 h-14 rounded-full bg-[var(--success)]/20 flex items-center justify-center mx-auto mb-3">
                                <svg className="w-7 h-7 text-[var(--success)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <p className="text-[var(--text-secondary)]">Tüm stoklar yeterli</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {lowStockItems.map((item) => (
                                <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-[var(--warning)]/5 border border-[var(--warning)]/20">
                                    <div>
                                        <p className="font-medium text-sm">{item.name}</p>
                                        <p className="text-xs text-[var(--text-secondary)]">{item.category}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-[var(--warning)]">{item.quantity}</p>
                                        <p className="text-xs text-[var(--text-secondary)]">Min: {item.minQuantity}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Recent Users */}
                <div className="glass-card p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[var(--secondary)]"></span>
                            Kullanıcılar
                        </h2>
                        <Link href="/admin/users" className="text-[var(--primary)] hover:underline text-sm">
                            Tümü →
                        </Link>
                    </div>

                    <div className="space-y-3">
                        {recentUsers.map((user) => (
                            <div key={user.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center text-white font-bold text-sm">
                                    {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate">{user.firstName} {user.lastName}</p>
                                    <div className="flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: getRoleColor(user.role) }}></span>
                                        <span className="text-xs text-[var(--text-secondary)]">{getRoleLabel(user.role)}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent Logs */}
                <div className="glass-card p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[var(--accent)]"></span>
                            Son Aktiviteler
                        </h2>
                        <Link href="/admin/logs" className="text-[var(--primary)] hover:underline text-sm">
                            Tümünü Gör →
                        </Link>
                    </div>

                    {recentLogs.length === 0 ? (
                        <div className="text-center py-8 text-[var(--text-secondary)]">
                            Henüz aktivite yok
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {recentLogs.map((log) => (
                                <div key={log.id} className="flex items-start gap-3 p-2">
                                    <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: getActionColor(log.action) }}></div>
                                    <div className="flex-1 min-w-0">
                                        <span
                                            className="px-2 py-0.5 rounded text-xs font-medium"
                                            style={{
                                                background: `${getActionColor(log.action)}20`,
                                                color: getActionColor(log.action)
                                            }}
                                        >
                                            {getActionText(log.action)}
                                        </span>
                                        <p className="text-xs mt-1 text-[var(--text-secondary)] truncate">{log.userName}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
