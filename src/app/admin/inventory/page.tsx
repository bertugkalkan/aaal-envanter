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
    createdAt: string;
    updatedAt: string;
}

const CATEGORIES = [
    'Elektronik',
    'Mekanik',
    'Araç & Gereç',
    'Sensörler',
    'Motorlar',
    'Kablolar',
    'Bağlantı Elemanları',
    'Diğer'
];

export default function InventoryManagement() {
    const { token } = useAuth();
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
    const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        category: '',
        quantity: '',
        minQuantity: '',
        location: ''
    });
    const [submitLoading, setSubmitLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        fetchInventory();
    }, [token]);

    const fetchInventory = async () => {
        try {
            const res = await fetch('/api/inventory', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setInventory(data.items);
            }
        } catch (error) {
            console.error('Error fetching inventory:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitLoading(true);
        setMessage({ type: '', text: '' });

        try {
            const url = '/api/inventory';
            const method = editingItem ? 'PUT' : 'POST';
            const submitData = {
                ...formData,
                quantity: parseInt(formData.quantity) || 0,
                minQuantity: parseInt(formData.minQuantity) || 0
            };
            const body = editingItem
                ? { ...submitData, id: editingItem.id }
                : submitData;

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });

            const data = await res.json();

            if (res.ok) {
                setMessage({ type: 'success', text: editingItem ? 'Malzeme güncellendi!' : 'Malzeme eklendi!' });
                setIsModalOpen(false);
                resetForm();
                fetchInventory();
            } else {
                setMessage({ type: 'error', text: data.error });
            }
        } catch {
            setMessage({ type: 'error', text: 'Bir hata oluştu' });
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!itemToDelete) return;

        setSubmitLoading(true);
        try {
            const res = await fetch(`/api/inventory?id=${itemToDelete.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
                setMessage({ type: 'success', text: 'Malzeme silindi!' });
                setIsDeleteModalOpen(false);
                setItemToDelete(null);
                fetchInventory();
            } else {
                const data = await res.json();
                setMessage({ type: 'error', text: data.error });
            }
        } catch {
            setMessage({ type: 'error', text: 'Bir hata oluştu' });
        } finally {
            setSubmitLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            category: '',
            quantity: '',
            minQuantity: '',
            location: ''
        });
        setEditingItem(null);
    };

    const openEditModal = (item: InventoryItem) => {
        setEditingItem(item);
        setFormData({
            name: item.name,
            description: item.description,
            category: item.category,
            quantity: String(item.quantity),
            minQuantity: String(item.minQuantity),
            location: item.location
        });
        setIsModalOpen(true);
    };

    const filteredInventory = inventory.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = !selectedCategory || item.category === selectedCategory;
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
            <Navbar title="Envanter Yönetimi" />

            {message.text && (
                <div className={`mb-6 px-4 py-3 rounded-lg ${message.type === 'success' ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
                    {message.text}
                </div>
            )}

            <div className="glass-card p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <h2 className="text-xl font-bold">Malzeme Listesi ({inventory.length})</h2>
                    <div className="flex gap-3 flex-wrap">
                        <input
                            type="text"
                            placeholder="Ara..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input-field !py-2 !px-4"
                            style={{ width: '180px' }}
                        />
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="input-field !py-2 !px-4"
                            style={{ width: '160px' }}
                        >
                            <option value="">Tüm Kategoriler</option>
                            {CATEGORIES.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                        <button
                            onClick={() => {
                                resetForm();
                                setIsModalOpen(true);
                            }}
                            className="btn-primary !py-2"
                        >
                            + Yeni Malzeme
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Malzeme</th>
                                <th>Kategori</th>
                                <th>Stok</th>
                                <th>Min.</th>
                                <th>Konum</th>
                                <th>Güncelleme</th>
                                <th>İşlemler</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredInventory.map((item) => (
                                <tr key={item.id} className="animate-fadeIn">
                                    <td>
                                        <div>
                                            <p className="font-medium">{item.name}</p>
                                            <p className="text-sm text-[var(--text-secondary)] truncate max-w-xs">{item.description}</p>
                                        </div>
                                    </td>
                                    <td>
                                        <span className="px-3 py-1 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] text-sm">
                                            {item.category}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={item.quantity <= item.minQuantity ? 'text-red-400 font-medium' : ''}>
                                            {item.quantity}
                                        </span>
                                    </td>
                                    <td className="text-[var(--text-secondary)]">{item.minQuantity}</td>
                                    <td className="text-[var(--text-secondary)]">{item.location || '-'}</td>
                                    <td className="text-[var(--text-secondary)] text-sm">
                                        {new Date(item.updatedAt).toLocaleDateString('tr-TR')}
                                    </td>
                                    <td>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => openEditModal(item)}
                                                className="p-2 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] hover:bg-[var(--primary)]/20 transition-colors"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setItemToDelete(item);
                                                    setIsDeleteModalOpen(true);
                                                }}
                                                className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
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

            {/* Add/Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    resetForm();
                }}
                title={editingItem ? 'Malzeme Düzenle' : 'Yeni Malzeme Ekle'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">
                            Malzeme Adı *
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="input-field"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">
                            Açıklama
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="input-field"
                            rows={2}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">
                            Kategori *
                        </label>
                        <select
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            className="input-field"
                            required
                        >
                            <option value="">Seçin...</option>
                            {CATEGORIES.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">
                                Miktar *
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={formData.quantity}
                                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                                className="input-field"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">
                                Min. Stok
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={formData.minQuantity}
                                onChange={(e) => setFormData({ ...formData, minQuantity: e.target.value })}
                                className="input-field"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">
                            Konum
                        </label>
                        <input
                            type="text"
                            value={formData.location}
                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                            className="input-field"
                            placeholder="Ör: Dolap A, Raf 2"
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => {
                                setIsModalOpen(false);
                                resetForm();
                            }}
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
                                editingItem ? 'Güncelle' : 'Ekle'
                            )}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => {
                    setIsDeleteModalOpen(false);
                    setItemToDelete(null);
                }}
                title="Malzemeyi Sil"
            >
                <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <p className="text-lg mb-2">
                        <strong>{itemToDelete?.name}</strong> silinecek.
                    </p>
                    <p className="text-[var(--text-secondary)] mb-6">
                        Bu işlem geri alınamaz.
                    </p>
                    <div className="flex gap-3">
                        <button
                            onClick={() => {
                                setIsDeleteModalOpen(false);
                                setItemToDelete(null);
                            }}
                            className="btn-secondary flex-1"
                        >
                            İptal
                        </button>
                        <button
                            onClick={handleDelete}
                            disabled={submitLoading}
                            className="btn-danger flex-1 flex items-center justify-center"
                        >
                            {submitLoading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                'Sil'
                            )}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
