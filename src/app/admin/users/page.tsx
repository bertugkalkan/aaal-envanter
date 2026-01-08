'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import Modal from '@/components/Modal';

interface User {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: 'user' | 'advisor' | 'admin';
    createdAt: string;
}

const ROLES = [
    { value: 'user', label: 'Üye', color: 'var(--secondary)' },
    { value: 'advisor', label: 'Danışman', color: 'var(--primary)' },
    { value: 'admin', label: 'Admin', color: 'var(--danger)' }
];

export default function UsersManagement() {
    const { token, user: currentUser } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        role: 'user' as 'user' | 'advisor' | 'admin'
    });
    const [submitLoading, setSubmitLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        fetchUsers();
    }, [token]);

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/users', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setUsers(data.users);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitLoading(true);
        setMessage({ type: '', text: '' });

        try {
            const url = '/api/users';
            const method = editingUser ? 'PUT' : 'POST';
            const body = editingUser
                ? { ...formData, id: editingUser.id, password: formData.password || undefined }
                : formData;

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
                setMessage({ type: 'success', text: editingUser ? 'Kullanıcı güncellendi!' : 'Kullanıcı eklendi!' });
                setIsModalOpen(false);
                resetForm();
                fetchUsers();
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
        if (!userToDelete) return;

        setSubmitLoading(true);
        try {
            const res = await fetch(`/api/users?id=${userToDelete.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
                setMessage({ type: 'success', text: 'Kullanıcı silindi!' });
                setIsDeleteModalOpen(false);
                setUserToDelete(null);
                fetchUsers();
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
            firstName: '',
            lastName: '',
            email: '',
            password: '',
            role: 'user'
        });
        setEditingUser(null);
    };

    const openEditModal = (user: User) => {
        setEditingUser(user);
        setFormData({
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            password: '',
            role: user.role
        });
        setIsModalOpen(true);
    };

    const getRoleBadge = (role: string) => {
        const roleInfo = ROLES.find(r => r.value === role);
        return (
            <span
                className="px-3 py-1 rounded-lg text-sm font-medium"
                style={{
                    backgroundColor: `${roleInfo?.color}20`,
                    color: roleInfo?.color
                }}
            >
                {roleInfo?.label}
            </span>
        );
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
            <Navbar title="Kullanıcı Yönetimi" />

            {message.text && (
                <div className={`mb-6 px-4 py-3 rounded-lg ${message.type === 'success' ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
                    {message.text}
                </div>
            )}

            <div className="glass-card p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <h2 className="text-xl font-bold">Kullanıcılar ({users.length})</h2>
                    <button
                        onClick={() => {
                            resetForm();
                            setIsModalOpen(true);
                        }}
                        className="btn-primary"
                    >
                        + Yeni Kullanıcı
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Kullanıcı</th>
                                <th>Email</th>
                                <th>Rol</th>
                                <th>Kayıt Tarihi</th>
                                <th>İşlemler</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user) => (
                                <tr key={user.id} className="animate-fadeIn">
                                    <td>
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center text-white font-bold text-sm">
                                                {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                                            </div>
                                            <span className="font-medium">{user.firstName} {user.lastName}</span>
                                        </div>
                                    </td>
                                    <td className="text-[var(--text-secondary)]">{user.email}</td>
                                    <td>{getRoleBadge(user.role)}</td>
                                    <td className="text-[var(--text-secondary)] text-sm">
                                        {new Date(user.createdAt).toLocaleDateString('tr-TR')}
                                    </td>
                                    <td>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => openEditModal(user)}
                                                className="p-2 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] hover:bg-[var(--primary)]/20 transition-colors"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                            </button>
                                            {user.id !== currentUser?.id && (
                                                <button
                                                    onClick={() => {
                                                        setUserToDelete(user);
                                                        setIsDeleteModalOpen(true);
                                                    }}
                                                    className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add/Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    resetForm();
                }}
                title={editingUser ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı Ekle'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">
                                Ad *
                            </label>
                            <input
                                type="text"
                                value={formData.firstName}
                                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                className="input-field"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">
                                Soyad *
                            </label>
                            <input
                                type="text"
                                value={formData.lastName}
                                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                className="input-field"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">
                            Email <span className="text-[var(--text-secondary)]/50">(Opsiyonel)</span>
                        </label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="input-field"
                            placeholder="ornek@email.com"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">
                            Şifre {editingUser ? '(Değiştirmek için doldurun)' : '*'}
                        </label>
                        <input
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="input-field"
                            required={!editingUser}
                            minLength={6}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">
                            Rol *
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {ROLES.map((role) => (
                                <button
                                    key={role.value}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, role: role.value as 'user' | 'advisor' | 'admin' })}
                                    className={`py-3 px-4 rounded-xl border-2 transition-all ${formData.role === role.value
                                        ? 'border-[var(--primary)] bg-[var(--primary)]/10'
                                        : 'border-white/10 hover:border-white/20'
                                        }`}
                                    style={formData.role === role.value ? { borderColor: role.color } : {}}
                                >
                                    <span
                                        className="font-medium"
                                        style={{ color: formData.role === role.value ? role.color : 'inherit' }}
                                    >
                                        {role.label}
                                    </span>
                                </button>
                            ))}
                        </div>
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
                                editingUser ? 'Güncelle' : 'Ekle'
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
                    setUserToDelete(null);
                }}
                title="Kullanıcıyı Sil"
            >
                <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <p className="text-lg mb-2">
                        <strong>{userToDelete?.firstName} {userToDelete?.lastName}</strong> silinecek.
                    </p>
                    <p className="text-[var(--text-secondary)] mb-6">
                        Bu işlem geri alınamaz.
                    </p>
                    <div className="flex gap-3">
                        <button
                            onClick={() => {
                                setIsDeleteModalOpen(false);
                                setUserToDelete(null);
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
