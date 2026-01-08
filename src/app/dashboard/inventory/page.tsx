'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import Modal from '@/components/Modal';

interface InventoryItem {
    id: string;
    name: string;
    description?: string;
    category: string;
    quantity: number;
    minQuantity: number;
    location?: string;
}

const CATEGORIES = [
    'Elektronik',
    'Mekanik',
    'Yazılım',
    'Araç-Gereç',
    'Sarf Malzeme',
    'Diğer'
];

export default function UserInventoryPage() {
    const { token } = useAuth();
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
    const [requestQuantity, setRequestQuantity] = useState(1);
    const [requestReason, setRequestReason] = useState('');
    const [submitLoading, setSubmitLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        fetchItems();
    }, [token]);

    const fetchItems = async () => {
        try {
            const res = await fetch('/api/inventory', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setItems(data.items);
            }
        } catch (error) {
            console.error('Error fetching items:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRequest = async () => {
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
                    quantity: requestQuantity,
                    reason: requestReason || undefined
                })
            });

            const data = await res.json();

            if (res.ok) {
                setMessage({ type: 'success', text: 'Talep başarıyla oluşturuldu!' });
                setIsRequestModalOpen(false);
                setSelectedItem(null);
                setRequestQuantity(1);
                setRequestReason('');
                fetchItems();
            } else {
                setMessage({ type: 'error', text: data.error });
            }
        } catch {
            setMessage({ type: 'error', text: 'Bir hata oluştu' });
        } finally {
            setSubmitLoading(false);
        }
    };

    const filteredItems = items.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.description?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = !categoryFilter || item.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div>
            <Navbar title="Envanter" />

            {message.text && (
                <div className={`mb-6 px-4 py-3 rounded-lg ${message.type === 'success' ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
                    {message.text}
                </div>
            )}

            {/* Filters */}
            <div className="glass-card p-6 mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <input
                            type="text"
                            placeholder="Malzeme ara..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input-field"
                        />
                    </div>
                    <div className="w-full md:w-48">
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="input-field"
                        >
                            <option value="">Tüm Kategoriler</option>
                            {CATEGORIES.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Items Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredItems.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-[var(--text-secondary)]">
                        Malzeme bulunamadı
                    </div>
                ) : (
                    filteredItems.map((item) => (
                        <div key={item.id} className="glass-card p-6 animate-fadeIn">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h3 className="text-lg font-bold">{item.name}</h3>
                                    <span className="text-xs px-2 py-1 rounded-lg bg-[var(--primary)]/20 text-[var(--primary)]">
                                        {item.category}
                                    </span>
                                </div>
                                <div className={`text-2xl font-bold ${item.quantity <= item.minQuantity ? 'text-[var(--warning)]' : 'text-[var(--success)]'}`}>
                                    {item.quantity}
                                </div>
                            </div>

                            {item.description && (
                                <p className="text-sm text-[var(--text-secondary)] mb-4 line-clamp-2">
                                    {item.description}
                                </p>
                            )}

                            {item.location && (
                                <p className="text-xs text-[var(--text-secondary)] mb-4 flex items-center gap-1">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    {item.location}
                                </p>
                            )}

                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        setSelectedItem(item);
                                        setIsDetailModalOpen(true);
                                    }}
                                    className="btn-secondary flex-1 text-sm py-2"
                                >
                                    Detaylar
                                </button>
                                <button
                                    onClick={() => {
                                        setSelectedItem(item);
                                        setRequestQuantity(1);
                                        setIsRequestModalOpen(true);
                                    }}
                                    disabled={item.quantity === 0}
                                    className="btn-primary flex-1 text-sm py-2 disabled:opacity-50"
                                >
                                    Talep Et
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Detail Modal */}
            <Modal
                isOpen={isDetailModalOpen}
                onClose={() => {
                    setIsDetailModalOpen(false);
                    setSelectedItem(null);
                }}
                title={selectedItem?.name || 'Malzeme Detayı'}
            >
                {selectedItem && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 rounded-xl bg-white/5">
                            <span className="text-[var(--text-secondary)]">Kategori</span>
                            <span className="font-medium">{selectedItem.category}</span>
                        </div>
                        <div className="flex items-center justify-between p-4 rounded-xl bg-white/5">
                            <span className="text-[var(--text-secondary)]">Mevcut Stok</span>
                            <span className={`font-bold text-xl ${selectedItem.quantity <= selectedItem.minQuantity ? 'text-[var(--warning)]' : 'text-[var(--success)]'}`}>
                                {selectedItem.quantity}
                            </span>
                        </div>
                        {selectedItem.description && (
                            <div className="p-4 rounded-xl bg-white/5">
                                <span className="text-[var(--text-secondary)] text-sm">Açıklama</span>
                                <p className="mt-1">{selectedItem.description}</p>
                            </div>
                        )}
                        {selectedItem.location && (
                            <div className="flex items-center justify-between p-4 rounded-xl bg-white/5">
                                <span className="text-[var(--text-secondary)]">Konum</span>
                                <span className="font-medium">{selectedItem.location}</span>
                            </div>
                        )}
                        <button
                            onClick={() => {
                                setIsDetailModalOpen(false);
                                setRequestQuantity(1);
                                setIsRequestModalOpen(true);
                            }}
                            disabled={selectedItem.quantity === 0}
                            className="btn-primary w-full mt-4 disabled:opacity-50"
                        >
                            Talep Oluştur
                        </button>
                    </div>
                )}
            </Modal>

            {/* Request Modal */}
            <Modal
                isOpen={isRequestModalOpen}
                onClose={() => {
                    setIsRequestModalOpen(false);
                    setSelectedItem(null);
                    setRequestQuantity(1);
                    setRequestReason('');
                }}
                title="Malzeme Talep Et"
            >
                {selectedItem && (
                    <div className="space-y-4">
                        <div className="p-4 rounded-xl bg-white/5">
                            <p className="font-medium">{selectedItem.name}</p>
                            <p className="text-sm text-[var(--text-secondary)]">
                                Mevcut: {selectedItem.quantity} adet
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">
                                Miktar *
                            </label>
                            <input
                                type="number"
                                value={requestQuantity}
                                onChange={(e) => setRequestQuantity(Math.max(1, Math.min(selectedItem.quantity, parseInt(e.target.value) || 1)))}
                                min={1}
                                max={selectedItem.quantity}
                                className="input-field"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">
                                Gerekçe <span className="text-[var(--text-secondary)]/50">(Opsiyonel)</span>
                            </label>
                            <textarea
                                value={requestReason}
                                onChange={(e) => setRequestReason(e.target.value)}
                                className="input-field"
                                rows={3}
                                placeholder="Neden bu malzemeye ihtiyacınız var?"
                            />
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => {
                                    setIsRequestModalOpen(false);
                                    setSelectedItem(null);
                                }}
                                className="btn-secondary flex-1"
                            >
                                İptal
                            </button>
                            <button
                                onClick={handleRequest}
                                disabled={submitLoading}
                                className="btn-primary flex-1 flex items-center justify-center"
                            >
                                {submitLoading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    'Talep Oluştur'
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
