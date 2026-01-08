'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';

interface MaterialRequest {
    id: string;
    userId: string;
    userName: string;
    itemId: string;
    itemName: string;
    quantity: number;
    reason?: string;
    status: 'pending' | 'approved' | 'rejected';
    adminNote?: string;
    reviewedAt?: string;
    createdAt: string;
}

export default function UserRequestsPage() {
    const { token, user } = useAuth();
    const [requests, setRequests] = useState<MaterialRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');

    const fetchRequests = useCallback(async () => {
        try {
            const res = await fetch('/api/requests', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setRequests(data.requests);
            }
        } catch (error) {
            console.error('Error fetching requests:', error);
        } finally {
            setIsLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchRequests();
        // Auto-refresh every 30 seconds for real-time updates
        const interval = setInterval(fetchRequests, 30000);
        return () => clearInterval(interval);
    }, [fetchRequests]);

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

    const filteredRequests = statusFilter
        ? requests.filter(r => r.status === statusFilter)
        : requests;

    const myRequests = filteredRequests.filter(r => r.userId === user?.id);
    const otherRequests = filteredRequests.filter(r => r.userId !== user?.id);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div>
            <Navbar title="Talepler" />

            {/* Filter Buttons */}
            <div className="flex gap-2 mb-6 flex-wrap">
                <button
                    onClick={() => setStatusFilter('')}
                    className={`px-4 py-2 rounded-lg transition-colors ${!statusFilter ? 'bg-[var(--primary)] text-white' : 'bg-white/5 text-[var(--text-secondary)] hover:bg-white/10'}`}
                >
                    Tümü ({requests.length})
                </button>
                <button
                    onClick={() => setStatusFilter('pending')}
                    className={`px-4 py-2 rounded-lg transition-colors ${statusFilter === 'pending' ? 'bg-[var(--warning)] text-white' : 'bg-white/5 text-[var(--text-secondary)] hover:bg-white/10'}`}
                >
                    Bekleyen ({requests.filter(r => r.status === 'pending').length})
                </button>
                <button
                    onClick={() => setStatusFilter('approved')}
                    className={`px-4 py-2 rounded-lg transition-colors ${statusFilter === 'approved' ? 'bg-[var(--success)] text-white' : 'bg-white/5 text-[var(--text-secondary)] hover:bg-white/10'}`}
                >
                    Onaylı ({requests.filter(r => r.status === 'approved').length})
                </button>
                <button
                    onClick={() => setStatusFilter('rejected')}
                    className={`px-4 py-2 rounded-lg transition-colors ${statusFilter === 'rejected' ? 'bg-[var(--danger)] text-white' : 'bg-white/5 text-[var(--text-secondary)] hover:bg-white/10'}`}
                >
                    Reddedildi ({requests.filter(r => r.status === 'rejected').length})
                </button>
            </div>

            {/* My Requests */}
            <div className="glass-card p-6 mb-6">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[var(--primary)]"></span>
                    Taleplerim ({myRequests.length})
                </h2>

                {myRequests.length === 0 ? (
                    <div className="text-center py-8 text-[var(--text-secondary)]">
                        Henüz talep oluşturmadınız
                    </div>
                ) : (
                    <div className="space-y-4">
                        {myRequests.map((request) => (
                            <div key={request.id} className="p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors animate-fadeIn">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <p className="font-medium text-[var(--primary)]">{request.itemName}</p>
                                            <span className="text-sm text-[var(--text-secondary)]">× {request.quantity} adet</span>
                                        </div>
                                        {request.reason && (
                                            <p className="text-sm text-[var(--text-secondary)]">{request.reason}</p>
                                        )}
                                        {request.adminNote && (
                                            <div className="mt-2 p-2 rounded-lg bg-white/5 text-sm">
                                                <span className="text-[var(--text-secondary)]">Not: </span>
                                                {request.adminNote}
                                            </div>
                                        )}
                                        <p className="text-xs text-[var(--text-secondary)] mt-2">
                                            {new Date(request.createdAt).toLocaleString('tr-TR')}
                                        </p>
                                    </div>
                                    {getStatusBadge(request.status)}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Other Users' Requests */}
            <div className="glass-card p-6">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[var(--secondary)]"></span>
                    Diğer Talepler ({otherRequests.length})
                    <span className="text-xs font-normal text-[var(--text-secondary)] ml-2">Otomatik güncellenir</span>
                </h2>

                {otherRequests.length === 0 ? (
                    <div className="text-center py-8 text-[var(--text-secondary)]">
                        Başka talep yok
                    </div>
                ) : (
                    <div className="space-y-4">
                        {otherRequests.map((request) => (
                            <div key={request.id} className="p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors animate-fadeIn">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center text-white font-bold text-xs">
                                                {request.userName.split(' ').map(n => n[0]).join('')}
                                            </div>
                                            <div>
                                                <p className="font-medium">{request.userName}</p>
                                                <p className="text-sm text-[var(--text-secondary)]">
                                                    {request.itemName} × {request.quantity} adet
                                                </p>
                                            </div>
                                        </div>
                                        <p className="text-xs text-[var(--text-secondary)] mt-1 ml-11">
                                            {new Date(request.createdAt).toLocaleString('tr-TR')}
                                        </p>
                                    </div>
                                    {getStatusBadge(request.status)}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
