'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import Link from 'next/link';

interface Stats {
    totalItems: number;
    lowStockItems: number;
    pendingRequests: number;
    approvedToday: number;
    activeLoans: number;
}

interface RecentRequest {
    id: string;
    userName: string;
    userId: string;
    itemName: string;
    quantity: number;
    status: string;
    createdAt: string;
    reviewedAt?: string;
}

interface ActiveLoan {
    id: string;
    userName: string;
    userId: string;
    itemName: string;
    itemId: string;
    quantity: number;
    approvedAt: string;
    reason: string;
    returnStatus?: 'pending_return' | 'returned';
    returnType?: 'self_declaration' | 'admin_check';
}

interface InventoryItem {
    id: string;
    name: string;
    category: string;
    quantity: number;
    minQuantity: number;
}

export default function AdvisorDashboard() {
    const { token } = useAuth();
    const [stats, setStats] = useState<Stats>({
        totalItems: 0,
        lowStockItems: 0,
        pendingRequests: 0,
        approvedToday: 0,
        activeLoans: 0
    });
    const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([]);
    const [recentRequests, setRecentRequests] = useState<RecentRequest[]>([]);
    const [activeLoans, setActiveLoans] = useState<ActiveLoan[]>([]);
    const [loanSearchTerm, setLoanSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, [token]);

    const fetchDashboardData = async () => {
        try {
            const [inventoryRes, requestsRes] = await Promise.all([
                fetch('/api/inventory', { headers: { Authorization: `Bearer ${token}` } }),
                fetch('/api/requests', { headers: { Authorization: `Bearer ${token}` } })
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

            if (requestsRes.ok) {
                const requestsData = await requestsRes.json();
                const requests = requestsData.requests;
                setRecentRequests(requests.slice(0, 5));

                // Get approved requests that are NOT yet returned as active loans
                const approved = requests.filter((r: RecentRequest & { returnStatus?: string }) =>
                    r.status === 'approved' && r.returnStatus !== 'returned'
                );
                const loans: ActiveLoan[] = approved.map((r: RecentRequest & { reviewedAt?: string; reason?: string; itemId?: string; returnStatus?: string; returnType?: string }) => ({
                    id: r.id,
                    userName: r.userName,
                    userId: r.userId,
                    itemName: r.itemName,
                    itemId: r.itemId || '',
                    quantity: r.quantity,
                    approvedAt: r.reviewedAt || r.createdAt,
                    reason: r.reason || '',
                    returnStatus: r.returnStatus,
                    returnType: r.returnType
                }));
                setActiveLoans(loans);

                const today = new Date().toDateString();
                setStats(prev => ({
                    ...prev,
                    pendingRequests: requests.filter((r: RecentRequest) => r.status === 'pending').length,
                    approvedToday: requests.filter((r: RecentRequest) =>
                        r.status === 'approved' && new Date(r.createdAt).toDateString() === today
                    ).length,
                    activeLoans: approved.length
                }));
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const classes = {
            pending: 'badge badge-pending',
            approved: 'badge badge-approved',
            rejected: 'badge badge-rejected'
        };
        const texts = {
            pending: 'Beklemede',
            approved: 'Onaylandı',
            rejected: 'Reddedildi'
        };
        return <span className={classes[status as keyof typeof classes]}>{texts[status as keyof typeof texts]}</span>;
    };

    const filteredLoans = activeLoans.filter(loan =>
        loan.userName.toLowerCase().includes(loanSearchTerm.toLowerCase()) ||
        loan.itemName.toLowerCase().includes(loanSearchTerm.toLowerCase())
    );

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div>
            <Navbar title="Danışman Paneli" />

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
                <Link href="/advisor/inventory" className="stat-card group relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="flex items-center justify-between relative z-10">
                        <div>
                            <p className="text-[var(--text-secondary)] text-sm font-medium">Toplam Malzeme</p>
                            <p className="text-3xl font-bold mt-1">{stats.totalItems}</p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-light)] flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-[var(--primary)]/20">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                        </div>
                    </div>
                </Link>

                <div className="stat-card relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-[var(--warning)]/10 to-transparent"></div>
                    <div className="flex items-center justify-between relative z-10">
                        <div>
                            <p className="text-[var(--text-secondary)] text-sm font-medium">Düşük Stok</p>
                            <p className="text-3xl font-bold mt-1 text-[var(--warning)]">{stats.lowStockItems}</p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--warning)] to-orange-500 flex items-center justify-center shadow-lg shadow-[var(--warning)]/20">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                    </div>
                </div>

                <Link href="/advisor/requests" className="stat-card group relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-[var(--warning)]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="flex items-center justify-between relative z-10">
                        <div>
                            <p className="text-[var(--text-secondary)] text-sm font-medium">Bekleyen Talepler</p>
                            <p className="text-3xl font-bold mt-1 text-[var(--warning)]">{stats.pendingRequests}</p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--warning)] to-orange-500 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-[var(--warning)]/20">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    </div>
                </Link>

                <div className="stat-card relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-[var(--success)]/10 to-transparent"></div>
                    <div className="flex items-center justify-between relative z-10">
                        <div>
                            <p className="text-[var(--text-secondary)] text-sm font-medium">Bugün Onaylanan</p>
                            <p className="text-3xl font-bold mt-1 text-[var(--success)]">{stats.approvedToday}</p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--success)] to-emerald-600 flex items-center justify-center shadow-lg shadow-[var(--success)]/20">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="stat-card relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent"></div>
                    <div className="flex items-center justify-between relative z-10">
                        <div>
                            <p className="text-[var(--text-secondary)] text-sm font-medium">Verilen Malzeme</p>
                            <p className="text-3xl font-bold mt-1 text-purple-400">{stats.activeLoans}</p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Low Stock Items */}
                <div className="glass-card p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[var(--warning)]"></span>
                            Düşük Stoklar
                        </h2>
                        <Link href="/advisor/inventory" className="text-[var(--primary)] hover:underline text-sm font-medium">
                            Envanter →
                        </Link>
                    </div>

                    {lowStockItems.length === 0 ? (
                        <div className="text-center py-8">
                            <div className="w-12 h-12 rounded-full bg-[var(--success)]/10 flex items-center justify-center mx-auto mb-3">
                                <svg className="w-6 h-6 text-[var(--success)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <p className="text-[var(--text-secondary)] text-sm">Tüm stoklar yeterli</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {lowStockItems.map((item) => (
                                <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 hover:border-[var(--warning)]/30 transition-colors">
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

                {/* Material Tracking Section */}
                <div className="glass-card p-6 lg:col-span-2">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                        <div>
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                <svg className="w-6 h-6 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                Anlık Malzeme Durumu
                            </h2>
                        </div>
                        <input
                            type="text"
                            placeholder="Ara..."
                            value={loanSearchTerm}
                            onChange={(e) => setLoanSearchTerm(e.target.value)}
                            className="input-field !py-1.5 !px-3 md:w-48 text-sm"
                        />
                    </div>

                    {filteredLoans.length === 0 ? (
                        <div className="text-center py-12 text-[var(--text-secondary)]">
                            <p className="text-sm">Şu an kimseye verilmiş malzeme yok</p>
                        </div>
                    ) : (
                        <div className="max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            <table className="w-full text-left border-separate border-spacing-y-2">
                                <thead>
                                    <tr className="text-[var(--text-secondary)] text-xs uppercase tracking-wider">
                                        <th className="pb-2 font-medium">Kullanıcı</th>
                                        <th className="pb-2 font-medium">Malzeme</th>
                                        <th className="pb-2 font-medium">Adet</th>
                                        <th className="pb-2 font-medium">Durum</th>
                                        <th className="pb-2 font-medium">Tarih</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredLoans.map((loan) => (
                                        <tr key={loan.id} className="bg-white/5 hover:bg-white/10 transition-colors">
                                            <td className="py-3 px-4 rounded-l-xl">
                                                <span className="font-medium text-sm">{loan.userName}</span>
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className="text-sm text-purple-400">{loan.itemName}</span>
                                            </td>
                                            <td className="py-3 px-4 font-bold text-sm">
                                                {loan.quantity}
                                            </td>
                                            <td className="py-3 px-4">
                                                {loan.returnStatus === 'pending_return' ? (
                                                    <span className="badge !bg-orange-500/20 !text-orange-400 text-xs">İade Bekliyor</span>
                                                ) : (
                                                    <span className="badge !bg-green-500/20 !text-green-400 text-xs">Kullanımda</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 rounded-r-xl text-xs text-[var(--text-secondary)]">
                                                {new Date(loan.approvedAt).toLocaleDateString('tr-TR')}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Recent Requests */}
            <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold">Son Talepler</h2>
                    <Link href="/advisor/requests" className="text-[var(--primary)] hover:underline text-sm font-medium">
                        Tümünü Gör →
                    </Link>
                </div>

                {recentRequests.length === 0 ? (
                    <div className="text-center py-8 text-[var(--text-secondary)]">
                        Henüz talep yok
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {recentRequests.map((request) => (
                            <div key={request.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-all border border-white/5 hover:border-white/10">
                                <div>
                                    <p className="font-bold text-sm">{request.userName}</p>
                                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                                        {request.itemName} <span className="text-[var(--primary)] font-medium">({request.quantity} adet)</span>
                                    </p>
                                </div>
                                {getStatusBadge(request.status)}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
