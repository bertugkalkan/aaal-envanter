'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import Modal from '@/components/Modal';

interface InventoryItem {
    id: string;
    name: string;
    description: string;
    category: string;
    quantity: number;
    minQuantity: number;
    location: string;
}

interface MaterialRequest {
    id: string;
    itemId: string;
    itemName: string;
    quantity: number;
    reason: string;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: string;
    adminNote?: string;
}

export default function DashboardPage() {
    const { token } = useAuth();
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [myRequests, setMyRequests] = useState<MaterialRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
    const [requestForm, setRequestForm] = useState({ quantity: '1', reason: '' });
    const [submitLoading, setSubmitLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const categories = [
        'Elektronik',
        'Mekanik',
        'Araç & Gereç',
        'Sensörler',
        'Motorlar',
        'Kablolar',
        'Bağlantı Elemanları',
        'Diğer'
    ];

    useEffect(() => {
        fetchData();
    }, [token]);

    const fetchData = async () => {
        try {
            const [inventoryRes, requestsRes] = await Promise.all([
                fetch('/api/inventory', {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                fetch('/api/requests', {
                    headers: { Authorization: `Bearer ${token}` }
                })
            ]);

            if (inventoryRes.ok) {
                const inventoryData = await inventoryRes.json();
                setInventory(inventoryData.items);
            }

            if (requestsRes.ok) {
                const requestsData = await requestsRes.json();
                setMyRequests(requestsData.requests);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRequestSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedItem) return;

        setSubmitLoading(true);
        setMessage({ type: '', text: '' });

        try {
            const res = await fetch('/api/requests', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    itemId: selectedItem.id,
                    quantity: parseInt(requestForm.quantity) || 1,
                    reason: requestForm.reason
                })
            });

            const data = await res.json();

            if (res.ok) {
                setMessage({ type: 'success', text: 'Talep başarıyla oluşturuldu!' });
                setIsModalOpen(false);
                setRequestForm({ quantity: '1', reason: '' });
                fetchData();
            } else {
                setMessage({ type: 'error', text: data.error });
            }
        } catch {
            setMessage({ type: 'error', text: 'Bir hata oluştu' });
        } finally {
            setSubmitLoading(false);
        }
    };

    const filteredInventory = inventory.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = !selectedCategory || item.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

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

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div>
            <Navbar title="Dashboard" />

            {message.text && (
                <div className={`mb-6 px-4 py-3 rounded-lg ${message.type === 'success' ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
                    {message.text}
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="stat-card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[var(--text-secondary)] text-sm">Toplam Malzeme</p>
                            <p className="text-3xl font-bold mt-1">{inventory.length}</p>
                        </div>
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-light)] flex items-center justify-center">
                            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[var(--text-secondary)] text-sm">Bekleyen Taleplerim</p>
                            <p className="text-3xl font-bold mt-1">{myRequests.filter(r => r.status === 'pending').length}</p>
                        </div>
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--warning)] to-orange-500 flex items-center justify-center">
                            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[var(--text-secondary)] text-sm">Onaylanan Taleplerim</p>
                            <p className="text-3xl font-bold mt-1">{myRequests.filter(r => r.status === 'approved').length}</p>
                        </div>
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--success)] to-emerald-600 flex items-center justify-center">
                            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* Inventory List */}
            <div className="glass-card p-6 mb-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <h2 className="text-xl font-bold">Envanter</h2>
                    <div className="flex gap-3">
                        <input
                            type="text"
                            placeholder="Ara..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input-field !py-2 !px-4"
                            style={{ width: '200px' }}
                        />
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="input-field !py-2 !px-4"
                            style={{ width: '180px' }}
                        >
                            <option value="">Tüm Kategoriler</option>
                            {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Malzeme</th>
                                <th>Kategori</th>
                                <th>Stok</th>
                                <th>Konum</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredInventory.map((item) => (
                                <tr key={item.id} className="animate-fadeIn">
                                    <td>
                                        <div>
                                            <p className="font-medium">{item.name}</p>
                                            <p className="text-sm text-[var(--text-secondary)]">{item.description}</p>
                                        </div>
                                    </td>
                                    <td>
                                        <span className="px-3 py-1 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] text-sm">
                                            {item.category}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={item.quantity <= item.minQuantity ? 'text-red-400' : ''}>
                                            {item.quantity}
                                        </span>
                                    </td>
                                    <td className="text-[var(--text-secondary)]">{item.location || '-'}</td>
                                    <td>
                                        <button
                                            onClick={() => {
                                                setSelectedItem(item);
                                                setIsModalOpen(true);
                                            }}
                                            disabled={item.quantity === 0}
                                            className="btn-primary !py-2 !px-4 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Talep Et
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {filteredInventory.length === 0 && (
                        <div className="text-center py-12 text-[var(--text-secondary)]">
                            Malzeme bulunamadı
                        </div>
                    )}
                </div>
            </div>

            {/* My Requests */}
            <div className="glass-card p-6">
                <h2 className="text-xl font-bold mb-6">Taleplerim</h2>

                {myRequests.length === 0 ? (
                    <div className="text-center py-12 text-[var(--text-secondary)]">
                        Henüz talebiniz bulunmuyor
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Malzeme</th>
                                    <th>Miktar</th>
                                    <th>Gerekçe</th>
                                    <th>Durum</th>
                                    <th>Tarih</th>
                                </tr>
                            </thead>
                            <tbody>
                                {myRequests.map((request) => (
                                    <tr key={request.id} className="animate-fadeIn">
                                        <td className="font-medium">{request.itemName}</td>
                                        <td>{request.quantity}</td>
                                        <td className="max-w-xs truncate">{request.reason}</td>
                                        <td>{getStatusBadge(request.status)}</td>
                                        <td className="text-[var(--text-secondary)]">
                                            {new Date(request.createdAt).toLocaleDateString('tr-TR')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Request Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setSelectedItem(null);
                    setRequestForm({ quantity: '1', reason: '' });
                }}
                title="Malzeme Talep Et"
            >
                {selectedItem && (
                    <form onSubmit={handleRequestSubmit} className="space-y-4">
                        <div className="glass-card !bg-white/5 p-4">
                            <p className="font-medium">{selectedItem.name}</p>
                            <p className="text-sm text-[var(--text-secondary)]">{selectedItem.description}</p>
                            <p className="text-sm mt-2">
                                Mevcut Stok: <span className="text-[var(--secondary)]">{selectedItem.quantity}</span>
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">
                                Miktar
                            </label>
                            <input
                                type="number"
                                min="1"
                                max={selectedItem.quantity}
                                value={requestForm.quantity}
                                onChange={(e) => setRequestForm({ ...requestForm, quantity: e.target.value })}
                                className="input-field"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">
                                Gerekçe
                            </label>
                            <textarea
                                value={requestForm.reason}
                                onChange={(e) => setRequestForm({ ...requestForm, reason: e.target.value })}
                                className="input-field"
                                rows={3}
                                placeholder="Bu malzemeye neden ihtiyacınız var?"
                                required
                            />
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="btn-secondary flex-1"
                            >
                                İptal
                            </button>
                            <button
                                type="submit"
                                disabled={submitLoading}
                                className="btn-primary flex-1 flex items-center justify-center"
                            >
                                {submitLoading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    'Talep Gönder'
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </Modal>
        </div>
    );
}
