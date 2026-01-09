import { NextRequest, NextResponse } from 'next/server';
import { create, findAll, findById, update, findMany } from '@/lib/db';
import { getCurrentUser, canApproveRequests } from '@/lib/auth';
import { log } from '@/lib/logger';
import { MaterialRequest, InventoryItem } from '@/lib/types';

// GET - List requests
export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser(request);

        if (!user) {
            return NextResponse.json(
                { error: 'Yetkisiz erişim' },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');

        let requests: MaterialRequest[];

        // All users can see all requests for real-time visibility
        requests = findAll<MaterialRequest>('requests');

        // Filter by status if provided
        if (status) {
            requests = requests.filter(r => r.status === status);
        }

        // Sort by date descending
        requests.sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        return NextResponse.json({ requests });
    } catch (error) {
        console.error('Get requests error:', error);
        return NextResponse.json(
            { error: 'Talepler alınamadı' },
            { status: 500 }
        );
    }
}

// POST - Create new request
export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser(request);

        if (!user) {
            return NextResponse.json(
                { error: 'Yetkisiz erişim' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { itemId, quantity, reason } = body;

        if (!itemId || !quantity) {
            return NextResponse.json(
                { error: 'Malzeme ve miktar zorunludur' },
                { status: 400 }
            );
        }

        // Check if item exists
        const item = findById<InventoryItem>('inventory', itemId);
        if (!item) {
            return NextResponse.json(
                { error: 'Malzeme bulunamadı' },
                { status: 404 }
            );
        }

        // Check stock
        if (item.quantity < quantity) {
            return NextResponse.json(
                { error: `Yeterli stok yok. Mevcut: ${item.quantity}` },
                { status: 400 }
            );
        }

        // Check for duplicate pending request
        const existingRequest = findMany<MaterialRequest>('requests',
            r => r.userId === user.id && r.itemId === itemId && r.status === 'pending'
        );

        if (existingRequest.length > 0) {
            return NextResponse.json(
                { error: 'Bu malzeme için zaten bekleyen bir talebiniz var' },
                { status: 400 }
            );
        }

        const newRequest = create<MaterialRequest>('requests', {
            userId: user.id,
            userName: `${user.firstName} ${user.lastName}`,
            itemId,
            itemName: item.name,
            quantity: parseInt(quantity),
            reason,
            status: 'pending',
            createdAt: new Date().toISOString(),
        });

        log(
            'REQUEST_CREATE',
            user.id,
            `${user.firstName} ${user.lastName}`,
            `Yeni talep oluşturuldu: ${item.name} (${quantity} adet)`,
            { requestId: newRequest.id, itemId, quantity, reason }
        );

        return NextResponse.json({
            message: 'Talep başarıyla oluşturuldu',
            request: newRequest,
        });
    } catch (error) {
        console.error('Create request error:', error);
        return NextResponse.json(
            { error: 'Talep oluşturulurken bir hata oluştu' },
            { status: 500 }
        );
    }
}

// PUT - Approve/Reject/Return operations
export async function PUT(request: NextRequest) {
    try {
        const user = await getCurrentUser(request);

        if (!user) {
            return NextResponse.json(
                { error: 'Yetkisiz erişim' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { id, action, adminNote, returnType } = body;

        if (!id || !action) {
            return NextResponse.json(
                { error: 'Talep ID ve aksiyon gerekli' },
                { status: 400 }
            );
        }

        const existingRequest = findById<MaterialRequest>('requests', id);
        if (!existingRequest) {
            return NextResponse.json(
                { error: 'Talep bulunamadı' },
                { status: 404 }
            );
        }

        // Action Handlers
        if (action === 'approve' || action === 'reject') {
            // Only admin/advisor can approve/reject
            if (!canApproveRequests(user)) {
                return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 });
            }

            if (existingRequest.status !== 'pending') {
                return NextResponse.json({ error: 'Talep zaten işlenmiş' }, { status: 400 });
            }

            const newStatus = action === 'approve' ? 'approved' : 'rejected';

            // If approving, decrease inventory
            if (action === 'approve') {
                const item = findById<InventoryItem>('inventory', existingRequest.itemId);
                if (!item) {
                    return NextResponse.json({ error: 'Malzeme bulunamadı' }, { status: 404 });
                }
                if (item.quantity < existingRequest.quantity) {
                    return NextResponse.json({ error: 'Yeterli stok yok' }, { status: 400 });
                }

                // Update inventory quantity
                update<InventoryItem>('inventory', existingRequest.itemId, {
                    quantity: item.quantity - existingRequest.quantity,
                    updatedAt: new Date().toISOString(),
                });
            }

            const updatedRequest = update<MaterialRequest>('requests', id, {
                status: newStatus,
                adminNote: adminNote || undefined,
                reviewedBy: user.id,
                reviewedAt: new Date().toISOString(),
                returnType: action === 'approve' ? (returnType || 'self_declaration') : undefined
                // returnStatus is NOT set here - it starts as undefined until user initiates return
            });

            log(
                action === 'approve' ? 'REQUEST_APPROVE' : 'REQUEST_REJECT',
                user.id,
                `${user.firstName} ${user.lastName}`,
                `Talep ${action === 'approve' ? 'onaylandı' : 'reddedildi'}: ${existingRequest.itemName}`,
                { requestId: id, action, adminNote, returnType }
            );

            return NextResponse.json({
                message: `Talep başarıyla ${action === 'approve' ? 'onaylandı' : 'reddedildi'}`,
                request: updatedRequest,
            });

        } else if (action === 'return_request') {
            // User initiates return
            if (existingRequest.userId !== user.id) {
                return NextResponse.json({ error: 'Bu işlem size ait değil' }, { status: 403 });
            }

            if (existingRequest.status !== 'approved') {
                return NextResponse.json({ error: 'Sadece onaylanmış talepler iade edilebilir' }, { status: 400 });
            }

            if (existingRequest.returnStatus === 'returned') {
                return NextResponse.json({ error: 'Zaten iade edilmiş' }, { status: 400 });
            }

            let newReturnStatus: 'pending_return' | 'returned' = 'pending_return';
            let message = 'İade talebi oluşturuldu, yetkili onayı bekleniyor';

            // Automatic return if self_declaration
            if (existingRequest.returnType === 'self_declaration') {
                newReturnStatus = 'returned';
                message = 'Malzeme iade edildi';

                // Restore inventory
                const item = findById<InventoryItem>('inventory', existingRequest.itemId);
                if (item) {
                    update<InventoryItem>('inventory', existingRequest.itemId, {
                        quantity: item.quantity + existingRequest.quantity,
                        updatedAt: new Date().toISOString(),
                    });
                }
            }

            const updatedRequest = update<MaterialRequest>('requests', id, {
                returnStatus: newReturnStatus,
                returnRequestedAt: new Date().toISOString(),
                returnedAt: newReturnStatus === 'returned' ? new Date().toISOString() : undefined
            });

            log(
                'RETURN_INITIATE',
                user.id,
                `${user.firstName} ${user.lastName}`,
                `İade işlemi: ${existingRequest.itemName} (${newReturnStatus === 'returned' ? 'Tamamlandı' : 'Onay Bekliyor'})`,
                { requestId: id, returnStatus: newReturnStatus }
            );

            return NextResponse.json({ message, request: updatedRequest });

        } else if (action === 'confirm_return') {
            // Admin confirms return
            if (!canApproveRequests(user)) {
                return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 });
            }

            if (existingRequest.returnStatus !== 'pending_return' || !existingRequest.returnRequestedAt) {
                // Allow admin to force return even if user hasn't clicked "Return" yet? 
                // For now, adhere to flow: User return -> Admin confirm.
                // Actually, admin might want to mark as returned even if user didn't click.
                // Let's allow it if it's approved and not returned.
            }

            if (existingRequest.status !== 'approved') {
                return NextResponse.json({ error: 'Sadece onaylanmış talepler iade edilebilir' }, { status: 400 });
            }

            if (existingRequest.returnStatus === 'returned') {
                return NextResponse.json({ error: 'Zaten iade edilmiş' }, { status: 400 });
            }

            // Restore inventory
            const item = findById<InventoryItem>('inventory', existingRequest.itemId);
            if (item) {
                update<InventoryItem>('inventory', existingRequest.itemId, {
                    quantity: item.quantity + existingRequest.quantity,
                    updatedAt: new Date().toISOString(),
                });
            } else {
                // Even if item removed from inventory DB, we process the request update
            }

            const updatedRequest = update<MaterialRequest>('requests', id, {
                returnStatus: 'returned',
                returnedAt: new Date().toISOString()
            });

            log(
                'RETURN_CONFIRM',
                user.id,
                `${user.firstName} ${user.lastName}`,
                `İade onaylandı: ${existingRequest.itemName}`,
                { requestId: id }
            );

            return NextResponse.json({
                message: 'İade onaylandı ve stok güncellendi',
                request: updatedRequest,
            });
        }

        return NextResponse.json({ error: 'Geçersiz aksiyon' }, { status: 400 });

    } catch (error) {
        console.error('Update request error:', error);
        return NextResponse.json(
            { error: 'İşlem sırasında bir hata oluştu' },
            { status: 500 }
        );
    }
}

// DELETE - Cancel request (only by requester when pending)
export async function DELETE(request: NextRequest) {
    try {
        const user = await getCurrentUser(request);

        if (!user) {
            return NextResponse.json(
                { error: 'Yetkisiz erişim' },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { error: 'Talep ID gerekli' },
                { status: 400 }
            );
        }

        const existingRequest = findById<MaterialRequest>('requests', id);
        if (!existingRequest) {
            return NextResponse.json(
                { error: 'Talep bulunamadı' },
                { status: 404 }
            );
        }

        // Only requester can cancel, and only if pending
        if (existingRequest.userId !== user.id && user.role !== 'admin') {
            return NextResponse.json(
                { error: 'Bu talebi iptal etme yetkiniz yok' },
                { status: 403 }
            );
        }

        if (existingRequest.status !== 'pending') {
            return NextResponse.json(
                { error: 'Sadece bekleyen talepler iptal edilebilir' },
                { status: 400 }
            );
        }

        const updatedRequest = update<MaterialRequest>('requests', id, {
            status: 'rejected',
            adminNote: 'Talep iptal edildi',
            reviewedBy: user.id,
            reviewedAt: new Date().toISOString(),
        });

        log(
            'REQUEST_CANCEL',
            user.id,
            `${user.firstName} ${user.lastName}`,
            `Talep iptal edildi: ${existingRequest.itemName}`,
            { requestId: id }
        );

        return NextResponse.json({
            message: 'Talep iptal edildi',
            request: updatedRequest,
        });
    } catch (error) {
        console.error('Cancel request error:', error);
        return NextResponse.json(
            { error: 'Talep iptal edilirken bir hata oluştu' },
            { status: 500 }
        );
    }
}
