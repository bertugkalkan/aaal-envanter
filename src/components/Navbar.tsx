'use client';

import { useAuth } from '@/context/AuthContext';

interface NavbarProps {
    title: string;
}

export default function Navbar({ title }: NavbarProps) {
    const { user } = useAuth();

    const getRoleLabel = () => {
        switch (user?.role) {
            case 'admin': return 'Admin';
            case 'advisor': return 'Danışman';
            default: return 'Üye';
        }
    };

    const getRoleColor = () => {
        switch (user?.role) {
            case 'admin': return 'bg-[var(--danger)]';
            case 'advisor': return 'bg-[var(--primary)]';
            default: return 'bg-[var(--secondary)]';
        }
    };

    return (
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 md:mb-8">
            <div>
                <h1 className="text-2xl font-bold">{title}</h1>
                <p className="text-[var(--text-secondary)] text-sm md:text-base">
                    {new Date().toLocaleDateString('tr-TR', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                    })}
                </p>
            </div>

            <div className="flex items-center gap-4 self-end md:self-auto">
                <div className="glass-card px-4 py-2 flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${getRoleColor()}`}></span>
                    <span className="text-sm font-medium">{getRoleLabel()}</span>
                </div>
            </div>
        </header>
    );
}
