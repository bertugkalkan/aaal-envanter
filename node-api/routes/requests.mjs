import express from 'express';
import { create, findAll, findById, update, findMany } from '../lib/db.mjs';
import { getCurrentUser, canApproveRequests } from '../lib/auth.mjs';
import { log } from '../lib/logger.mjs';

const router = express.Router();

// GET /api/requests
router.get('/', async (req, res) => {
    try {
        const user = await getCurrentUser(req);

        if (!user) {
            return res.status(401).json({ error: 'Yetkisiz erişim' });
        }

        const { status } = req.query;

        let requests = findAll('requests');

        if (status) {
            requests = requests.filter(r => r.status === status);
        }

        requests.sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        res.json({ requests });
    } catch (error) {
        console.error('Get requests error:', error);
        res.status(500).json({ error: 'Talepler alınamadı' });
    }
});

// POST /api/requests
router.post('/', async (req, res) => {
    try {
        const user = await getCurrentUser(req);

        if (!user) {
            return res.status(401).json({ error: 'Yetkisiz erişim' });
        }

        const { itemId, quantity, reason } = req.body;

        if (!itemId || !quantity) {
            return res.status(400).json({ error: 'Malzeme ve miktar zorunludur' });
        }

        const item = findById('inventory', itemId);
        if (!item) {
            return res.status(404).json({ error: 'Malzeme bulunamadı' });
        }

        if (item.quantity < quantity) {
            return res.status(400).json({ error: `Yeterli stok yok. Mevcut: ${item.quantity}` });
        }

        const existingRequest = findMany('requests',
            r => r.userId === user.id && r.itemId === itemId && r.status === 'pending'
        );

        if (existingRequest.length > 0) {
            return res.status(400).json({ error: 'Bu malzeme için zaten bekleyen bir talebiniz var' });
        }

        const newRequest = create('requests', {
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

        res.json({
            message: 'Talep başarıyla oluşturuldu',
            request: newRequest,
        });
    } catch (error) {
        console.error('Create request error:', error);
        res.status(500).json({ error: 'Talep oluşturulurken bir hata oluştu' });
    }
});

// PUT /api/requests
router.put('/', async (req, res) => {
    try {
        const user = await getCurrentUser(req);

        if (!user || !canApproveRequests(user)) {
            return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
        }

        const { id, action, adminNote } = req.body;

        if (!id || !action) {
            return res.status(400).json({ error: 'Talep ID ve aksiyon gerekli' });
        }

        if (!['approve', 'reject'].includes(action)) {
            return res.status(400).json({ error: 'Geçersiz aksiyon' });
        }

        const existingRequest = findById('requests', id);
        if (!existingRequest) {
            return res.status(404).json({ error: 'Talep bulunamadı' });
        }

        if (existingRequest.status !== 'pending') {
            return res.status(400).json({ error: 'Bu talep zaten işlenmiş' });
        }

        const newStatus = action === 'approve' ? 'approved' : 'rejected';

        if (action === 'approve') {
            const item = findById('inventory', existingRequest.itemId);
            if (!item) {
                return res.status(404).json({ error: 'Malzeme bulunamadı' });
            }

            if (item.quantity < existingRequest.quantity) {
                return res.status(400).json({ error: 'Yeterli stok yok' });
            }

            update('inventory', existingRequest.itemId, {
                quantity: item.quantity - existingRequest.quantity,
                updatedAt: new Date().toISOString(),
            });
        }

        const updatedRequest = update('requests', id, {
            status: newStatus,
            adminNote: adminNote || undefined,
            reviewedBy: user.id,
            reviewedAt: new Date().toISOString(),
        });

        log(
            action === 'approve' ? 'REQUEST_APPROVE' : 'REQUEST_REJECT',
            user.id,
            `${user.firstName} ${user.lastName}`,
            `Talep ${action === 'approve' ? 'onaylandı' : 'reddedildi'}: ${existingRequest.itemName}`,
            { requestId: id, action, adminNote }
        );

        res.json({
            message: `Talep başarıyla ${action === 'approve' ? 'onaylandı' : 'reddedildi'}`,
            request: updatedRequest,
        });
    } catch (error) {
        console.error('Update request error:', error);
        res.status(500).json({ error: 'Talep güncellenirken bir hata oluştu' });
    }
});

// DELETE /api/requests
router.delete('/', async (req, res) => {
    try {
        const user = await getCurrentUser(req);

        if (!user) {
            return res.status(401).json({ error: 'Yetkisiz erişim' });
        }

        const { id } = req.query;

        if (!id) {
            return res.status(400).json({ error: 'Talep ID gerekli' });
        }

        const existingRequest = findById('requests', id);
        if (!existingRequest) {
            return res.status(404).json({ error: 'Talep bulunamadı' });
        }

        if (existingRequest.userId !== user.id && user.role !== 'admin') {
            return res.status(403).json({ error: 'Bu talebi iptal etme yetkiniz yok' });
        }

        if (existingRequest.status !== 'pending') {
            return res.status(400).json({ error: 'Sadece bekleyen talepler iptal edilebilir' });
        }

        const updatedRequest = update('requests', id, {
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

        res.json({
            message: 'Talep iptal edildi',
            request: updatedRequest,
        });
    } catch (error) {
        console.error('Cancel request error:', error);
        res.status(500).json({ error: 'Talep iptal edilirken bir hata oluştu' });
    }
});

export default router;
