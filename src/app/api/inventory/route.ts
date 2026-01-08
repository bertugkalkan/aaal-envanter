import { NextRequest, NextResponse } from 'next/server';
import { create, findAll, findById, update, remove } from '@/lib/db';
import { getCurrentUser, requireAdmin, canApproveRequests } from '@/lib/auth';
import { log } from '@/lib/logger';
import { InventoryItem } from '@/lib/types';

// GET - List all inventory items
export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser(request);

        if (!user) {
            return NextResponse.json(
                { error: 'Yetkisiz erişim' },
                { status: 401 }
            );
        }

        const items = findAll<InventoryItem>('inventory');

        // Get query params for filtering
        const { searchParams } = new URL(request.url);
        const category = searchParams.get('category');
        const search = searchParams.get('search');

        let filteredItems = items;

        if (category) {
            filteredItems = filteredItems.filter(item => item.category === category);
        }

        if (search) {
            const searchLower = search.toLowerCase();
            filteredItems = filteredItems.filter(item =>
                item.name.toLowerCase().includes(searchLower) ||
                item.description.toLowerCase().includes(searchLower)
            );
        }

        return NextResponse.json({ items: filteredItems });
    } catch (error) {
        console.error('Get inventory error:', error);
        return NextResponse.json(
            { error: 'Envanter listesi alınamadı' },
            { status: 500 }
        );
    }
}

// POST - Create new inventory item (admin/advisor)
export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser(request);

        if (!user || !canApproveRequests(user)) {
            return NextResponse.json(
                { error: 'Bu işlem için yetkiniz yok' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { name, description, category, quantity, minQuantity, location } = body;

        if (!name || !category || quantity === undefined) {
            return NextResponse.json(
                { error: 'Ad, kategori ve miktar zorunludur' },
                { status: 400 }
            );
        }

        const newItem = create<InventoryItem>('inventory', {
            name,
            description: description || '',
            category,
            quantity: parseInt(quantity),
            minQuantity: parseInt(minQuantity) || 0,
            location: location || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: user.id,
        });

        log(
            'INVENTORY_CREATE',
            user.id,
            `${user.firstName} ${user.lastName}`,
            `Yeni malzeme eklendi: ${name}`,
            { itemId: newItem.id, name, category, quantity }
        );

        return NextResponse.json({
            message: 'Malzeme başarıyla eklendi',
            item: newItem,
        });
    } catch (error) {
        console.error('Create inventory error:', error);
        return NextResponse.json(
            { error: 'Malzeme eklenirken bir hata oluştu' },
            { status: 500 }
        );
    }
}

// PUT - Update inventory item (admin/advisor)
export async function PUT(request: NextRequest) {
    try {
        const user = await getCurrentUser(request);

        if (!user || !canApproveRequests(user)) {
            return NextResponse.json(
                { error: 'Bu işlem için yetkiniz yok' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { id, ...updates } = body;

        if (!id) {
            return NextResponse.json(
                { error: 'Malzeme ID gerekli' },
                { status: 400 }
            );
        }

        const existingItem = findById<InventoryItem>('inventory', id);
        if (!existingItem) {
            return NextResponse.json(
                { error: 'Malzeme bulunamadı' },
                { status: 404 }
            );
        }

        const updatedItem = update<InventoryItem>('inventory', id, {
            ...updates,
            updatedAt: new Date().toISOString(),
        });

        log(
            'INVENTORY_UPDATE',
            user.id,
            `${user.firstName} ${user.lastName}`,
            `Malzeme güncellendi: ${existingItem.name}`,
            { itemId: id, previousData: existingItem, newData: updatedItem }
        );

        return NextResponse.json({
            message: 'Malzeme başarıyla güncellendi',
            item: updatedItem,
        });
    } catch (error) {
        console.error('Update inventory error:', error);
        return NextResponse.json(
            { error: 'Malzeme güncellenirken bir hata oluştu' },
            { status: 500 }
        );
    }
}

// DELETE - Remove inventory item (admin/advisor)
export async function DELETE(request: NextRequest) {
    try {
        const user = await getCurrentUser(request);

        if (!user || !canApproveRequests(user)) {
            return NextResponse.json(
                { error: 'Bu işlem için yetkiniz yok' },
                { status: 403 }
            );
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { error: 'Malzeme ID gerekli' },
                { status: 400 }
            );
        }

        const existingItem = findById<InventoryItem>('inventory', id);
        if (!existingItem) {
            return NextResponse.json(
                { error: 'Malzeme bulunamadı' },
                { status: 404 }
            );
        }

        const deleted = remove<InventoryItem>('inventory', id);

        if (deleted) {
            log(
                'INVENTORY_DELETE',
                user.id,
                `${user.firstName} ${user.lastName}`,
                `Malzeme silindi: ${existingItem.name}`,
                { itemId: id, deletedItem: existingItem }
            );

            return NextResponse.json({
                message: 'Malzeme başarıyla silindi',
            });
        }

        return NextResponse.json(
            { error: 'Malzeme silinemedi' },
            { status: 500 }
        );
    } catch (error) {
        console.error('Delete inventory error:', error);
        return NextResponse.json(
            { error: 'Malzeme silinirken bir hata oluştu' },
            { status: 500 }
        );
    }
}
