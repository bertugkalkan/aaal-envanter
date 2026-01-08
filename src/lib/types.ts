import { User } from './auth';

export interface InventoryItem {
    id: string;
    name: string;
    description: string;
    category: string;
    quantity: number;
    minQuantity: number;
    location: string;
    createdAt: string;
    updatedAt: string;
    createdBy: string;
}

export interface MaterialRequest {
    id: string;
    userId: string;
    userName: string;
    itemId: string;
    itemName: string;
    quantity: number;
    reason: string;
    status: 'pending' | 'approved' | 'rejected';
    adminNote?: string;
    reviewedBy?: string;
    reviewedAt?: string;
    createdAt: string;
}

export type { User };

export const CATEGORIES = [
    'Elektronik',
    'Mekanik',
    'Araç & Gereç',
    'Sensörler',
    'Motorlar',
    'Kablolar',
    'Bağlantı Elemanları',
    'Diğer'
] as const;
