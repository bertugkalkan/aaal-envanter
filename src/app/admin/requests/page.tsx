'use client';

import { useState, useEffect } from 'react';
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
    reason: string;
    status: 'pending' | 'approved' | 'rejected';
    adminNote?: string;
    reviewedAt?: string;
    createdAt: string;
    returnType?: 'self_declaration' | 'admin_check';
    returnStatus?: 'pending_return' | 'returned';
    returnRequestedAt?: string;
    returnedAt?: string;
}

export default function RequestsManagement() {
    const { token } = useAuth();
    const [requests, setRequests] = useState<MaterialRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<MaterialRequest | null>(null);
    const [action, setAction] = useState<'approve' | 'reject' | 'confirm_return'>('approve');
    const [adminNote, setAdminNote] = useState('');
    const [returnType, setReturnType] = useState<'self_declaration' | 'admin_check'>('self_declaration');
    const [submitLoading, setSubmitLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        fetchRequests();
    }, [token]);

    const fetchRequests = async () => {
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
    };

    const handleAction = async () => {
        if (!selectedRequest) return;

        setSubmitLoading(true);
        setMessage({ type: '', text: '' });

        try {
            const res = await fetch('/api/requests', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    id: selectedRequest.id,
                    action,
                    adminNote: action === 'confirm_return' ? undefined : adminNote,
                    returnType: action === 'approve' ? returnType : undefined
                })
            });

            const data = await res.json();

            if (res.ok) {
                let successMsg = '';
                if (action === 'approve') successMsg = 'Talep onaylandı!';
                else if (action === 'reject') successMsg = 'Talep reddedildi!';
                else if (action === 'confirm_return') successMsg = 'İade onaylandı!';

                setMessage({
                    type: 'success',
                    text: successMsg
                });
                setIsModalOpen(false);
                setSelectedRequest(null);
                setAdminNote('');
                setReturnType('self_declaration');
                fetchRequests();
            } else {
                setMessage({ type: 'error', text: data.error });
            }
        } catch {
            setMessage({ type: 'error', text: 'Bir hata oluştu' });
        } finally {
            setSubmitLoading(false);
        }
    };

    const getStatusBadge = (request: MaterialRequest) => {
        if (request.status === 'pending') return <span className="badge badge-pending">Beklemede</span>;
        if (request.status === 'rejected') return <span className="badge badge-rejected">Reddedildi</span>;

        // Approved status logic
        if (request.returnStatus === 'returned') return <span className="badge !bg-blue-500/20 !text-blue-400">İade Edildi</span>;
        if (request.returnStatus === 'pending_return') return <span className="badge !bg-orange-500/20 !text-orange-400">İade Bekliyor</span>;

        return <span className="badge badge-approved">Onaylandı</span>;
    };

    const filteredRequests = statusFilter
        ? requests.filter(r => r.status === statusFilter)
        : requests;

    const pendingCount = requests.filter(r => r.status === 'pending').length;
    const returnPendingCount = requests.filter(r => r.returnStatus === 'pending_return').length;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div>
            <Navbar title="Talep Yönetimi" />

            {message.text && (
                <div className={`mb-6 px-4 py-3 rounded-lg ${message.type === 'success' ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
                    {message.text}
                </div>
            )}

            {/* Pending Alert */}
            {(pendingCount > 0 || returnPendingCount > 0) && (
                <div className="mb-6 flex flex-col gap-2">
                    {pendingCount > 0 && (
                        <div className="px-4 py-3 rounded-lg bg-[var(--warning)]/10 border border-[var(--warning)]/20 flex items-center gap-3">
                            <span className="text-[var(--warning)]">
                                <strong>{pendingCount}</strong> adet bekleyen talep var
                            </span>
                        </div>
                    )}
                    {returnPendingCount > 0 && (
                        <div className="px-4 py-3 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center gap-3">
                            <span className="text-orange-400">
                                <strong>{returnPendingCount}</strong> adet iade onayı bekliyor
                            </span>
                        </div>
                    )}
                </div>
            )}

            <div className="glass-card p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <h2 className="text-xl font-bold">Talepler ({requests.length})</h2>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setStatusFilter('')}
                            className={`px-4 py-2 rounded-lg transition-colors ${!statusFilter ? 'bg-[var(--primary)] text-white' : 'bg-white/5 text-[var(--text-secondary)] hover:bg-white/10'}`}
                        >
                            Tümü
                        </button>
                        <button
                            onClick={() => setStatusFilter('pending')}
                            className={`px-4 py-2 rounded-lg transition-colors ${statusFilter === 'pending' ? 'bg-[var(--warning)] text-white' : 'bg-white/5 text-[var(--text-secondary)] hover:bg-white/10'}`}
                        >
                            Bekleyen
                        </button>
                    </div>
                </div>

                {filteredRequests.length === 0 ? (
                    <div className="text-center py-12 text-[var(--text-secondary)]">
                        Talep bulunamadı
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredRequests.map((request) => (
                            <div
                                key={request.id}
                                className="p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors animate-fadeIn"
                            >
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center text-white font-bold text-sm">
                                                {request.userName.split(' ').map(n => n[0]).join('')}
                                            </div>
                                            <div>
                                                <p className="font-medium">{request.userName}</p>
                                                <p className="text-sm text-[var(--text-secondary)]">
                                                    {new Date(request.createdAt).toLocaleString('tr-TR')}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="ml-13 pl-13 md:ml-[52px]">
                                            <p className="mb-1">
                                                <span className="text-[var(--primary)] font-medium">{request.itemName}</span>
                                                <span className="text-[var(--text-secondary)]"> × {request.quantity} adet</span>
                                            </p>
                                            <p className="text-sm text-[var(--text-secondary)]">{request.reason}</p>

                                            {request.adminNote && (
                                                <div className="mt-2 p-2 rounded-lg bg-white/5 text-sm">
                                                    <span className="text-[var(--text-secondary)]">Not: </span>
                                                    {request.adminNote}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 ml-[52px] md:ml-0">
                                        {getStatusBadge(request)}

                                        {request.status === 'pending' && (
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => {
                                                        setSelectedRequest(request);
                                                        setAction('approve');
                                                        setIsModalOpen(true);
                                                    }}
                                                    className="btn-success"
                                                >
                                                    Onayla
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setSelectedRequest(request);
                                                        setAction('reject');
                                                        setIsModalOpen(true);
                                                    }}
                                                    className="btn-danger"
                                                >
                                                    Reddet
                                                </button>
                                            </div>
                                        )}

                                        {request.returnStatus === 'pending_return' && (
                                            <button
                                                onClick={() => {
                                                    setSelectedRequest(request);
                                                    setAction('confirm_return');
                                                    setIsModalOpen(true);
                                                }}
                                                className="btn-primary"
                                            >
                                                İadeyi Onayla
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Action Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setSelectedRequest(null);
                    setAdminNote('');
                }}
                title={
                    action === 'approve' ? 'Talebi Onayla' :
                        action === 'reject' ? 'Talebi Reddet' :
                            'İadeyi Onayla'
                }
            >
                {selectedRequest && (
                    <div>
                        <div className="glass-card !bg-white/5 p-4 mb-4">
                            <p className="font-medium">{selectedRequest.userName}</p>
                            <p className="text-sm text-[var(--text-secondary)]">
                                {selectedRequest.itemName} × {selectedRequest.quantity} adet
                            </p>
                            {action === 'confirm_return' && (
                                <p className="text-sm text-orange-400 mt-2">
                                    {selectedRequest.userName} bu ürünü iade ettiğini beyan etti.
                                </p>
                            )}
                        </div>

                        {action === 'approve' && (
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">
                                    İade Yöntemi
                                </label>
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 p-3 rounded-lg bg-white/5 cursor-pointer hover:bg-white/10 transition-colors">
                                        <input
                                            type="radio"
                                            name="returnType"
                                            value="self_declaration"
                                            checked={returnType === 'self_declaration'}
                                            onChange={(e) => setReturnType(e.target.value as any)}
                                            className="text-[var(--primary)]"
                                        />
                                        <div>
                                            <p className="font-medium">Üye Beyanı</p>
                                            <p className="text-xs text-[var(--text-secondary)]">Üye "İade Ettim" dediğinde stok otomatik artar.</p>
                                        </div>
                                    </label>
                                    <label className="flex items-center gap-2 p-3 rounded-lg bg-white/5 cursor-pointer hover:bg-white/10 transition-colors">
                                        <input
                                            type="radio"
                                            name="returnType"
                                            value="admin_check"
                                            checked={returnType === 'admin_check'}
                                            onChange={(e) => setReturnType(e.target.value as any)}
                                            className="text-[var(--primary)]"
                                        />
                                        <div>
                                            <p className="font-medium">Yetkili Kontrollü</p>
                                            <p className="text-xs text-[var(--text-secondary)]">Yetkili iadeyi onaylamadan stok artmaz.</p>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        )}

                        {action !== 'confirm_return' && (
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">
                                    Not (Opsiyonel)
                                </label>
                                <textarea
                                    value={adminNote}
                                    onChange={(e) => setAdminNote(e.target.value)}
                                    className="input-field"
                                    rows={3}
                                    placeholder={action === 'reject' ? 'Reddetme sebebini yazın...' : 'Ek not ekleyin...'}
                                />
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setIsModalOpen(false);
                                    setSelectedRequest(null);
                                    setAdminNote('');
                                }}
                                className="btn-secondary flex-1"
                            >
                                İptal
                            </button>
                            <button
                                onClick={handleAction}
                                disabled={submitLoading}
                                className={`flex-1 flex items-center justify-center ${action === 'approve' ? 'btn-success' :
                                    action === 'reject' ? 'btn-danger' :
                                        'btn-primary'
                                    }`}
                            >
                                {submitLoading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    action === 'approve' ? 'Onayla' :
                                        action === 'reject' ? 'Reddet' :
                                            'Onayla'
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}

