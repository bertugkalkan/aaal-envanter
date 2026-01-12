'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import Modal from '@/components/Modal';

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
    returnType?: 'self_declaration' | 'admin_check';
    returnStatus?: 'pending_return' | 'returned';
}

export default function UserRequestsPage() {
    const { token, user } = useAuth();
    const [requests, setRequests] = useState<MaterialRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<MaterialRequest | null>(null);
    const [submitLoading, setSubmitLoading] = useState(false);

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
        const interval = setInterval(fetchRequests, 30000);
        return () => clearInterval(interval);
    }, [fetchRequests]);

    const handleReturn = async () => {
        if (!selectedRequest) return;
        setSubmitLoading(true);

        try {
            const res = await fetch('/api/requests', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    id: selectedRequest.id,
                    action: 'return_request'
                })
            });

            if (res.ok) {
                setIsReturnModalOpen(false);
                setSelectedRequest(null);
                fetchRequests();
            } else {
                alert('İade işlemi başarısız oldu');
            }
        } catch {
            alert('Bir hata oluştu');
        } finally {
            setSubmitLoading(false);
        }
    };

    const getStatusBadge = (request: MaterialRequest) => {
        if (request.status === 'pending') return <span className="badge badge-pending">Beklemede</span>;
        if (request.status === 'rejected') return <span className="badge badge-rejected">Reddedildi</span>;

        // Return logic
        if (request.returnStatus === 'returned') return <span className="badge !bg-blue-500/20 !text-blue-400">İade Edildi</span>;
        if (request.returnStatus === 'pending_return') return <span className="badge !bg-orange-500/20 !text-orange-400">İade Bekliyor</span>;

        return <span className="badge badge-approved">Onaylandı</span>;
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
                                        <div className="flex items-center gap-2 mt-2">
                                            <p className="text-xs text-[var(--text-secondary)]">
                                                {new Date(request.createdAt).toLocaleString('tr-TR')}
                                            </p>
                                            {request.status === 'approved' && request.returnType === 'self_declaration' && !request.returnStatus && (
                                                <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-[var(--text-secondary)]">Beyana Dayalı İade</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        {getStatusBadge(request)}

                                        {request.status === 'approved' && !request.returnStatus && (
                                            <button
                                                onClick={() => {
                                                    setSelectedRequest(request);
                                                    setIsReturnModalOpen(true);
                                                }}
                                                className="btn-secondary text-sm !py-1 !px-3"
                                            >
                                                İade Et
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Other Users' Requests */}
            <div className="glass-card p-6">
                {/* ... (Keep existing layout for other users, simplified for brevity) */}
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[var(--secondary)]"></span>
                    Diğer Talepler ({otherRequests.length})
                </h2>
                {otherRequests.length === 0 ? (
                    <div className="text-center py-8 text-[var(--text-secondary)]">Başka talep yok</div>
                ) : (
                    <div className="space-y-4">
                        {otherRequests.map((request) => (
                            <div key={request.id} className="p-4 rounded-xl bg-white/5 hover:bg-white/10">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="font-medium">{request.userName}</p>
                                        <p className="text-sm text-[var(--text-secondary)]">{request.itemName} × {request.quantity}</p>
                                    </div>
                                    {getStatusBadge(request)}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Return Confirmation Modal */}
            <Modal
                isOpen={isReturnModalOpen}
                onClose={() => setIsReturnModalOpen(false)}
                title="Ürün İadesi"
            >
                <div className="space-y-4">
                    <p>
                        Bu ürünü iade etmek istediğinize emin misiniz?
                        {selectedRequest?.returnType === 'self_declaration'
                            ? ' "Beyana Dayalı" olduğu için anında iade edilmiş sayılacaktır.'
                            : ' Yetkili onayı gerektirdiği için "İade Bekliyor" durumuna geçecektir.'}
                    </p>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setIsReturnModalOpen(false)}
                            className="btn-secondary flex-1"
                        >
                            İptal
                        </button>
                        <button
                            onClick={handleReturn}
                            disabled={submitLoading}
                            className="btn-primary flex-1"
                        >
                            {submitLoading ? 'İşleniyor...' : 'Evet, İade Et'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
