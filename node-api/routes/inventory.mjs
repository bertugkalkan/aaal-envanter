import express from 'express';
import { findAll, create, findById, update, remove } from '../lib/db.mjs';
import { getCurrentUser, requireAuth, requireAdvisor } from '../lib/auth.mjs';
import { log } from '../lib/logger.mjs';

const router = express.Router();

// Middleware to check auth
router.use(async (req, res, next) => {
    const user = await getCurrentUser(req);
    if (!requireAuth(user)) {
        return res.status(401).json({ error: 'Yetkisiz erişim' });
    }
    req.user = user;
    next();
});

// GET /api/inventory
router.get('/', (req, res) => {
    try {
        const items = findAll('inventory');
        res.json(items);
    } catch (error) {
        console.error('Get inventory error:', error);
        res.status(500).json({ error: 'Envanter listelenirken hata oluştu' });
    }
});

// POST /api/inventory
router.post('/', (req, res) => {
    try {
        if (!requireAdvisor(req.user)) {
            return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
        }

        const item = req.body;

        // Basic validation
        if (!item.name || !item.category) {
            return res.status(400).json({ error: 'İsim ve kategori zorunludur' });
        }

        const newItem = create('inventory', {
            ...item,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });

        log(
            'INVENTORY_CREATE',
            req.user.id,
            `${req.user.firstName} ${req.user.lastName}`,
            `Yeni envanter eklendi: ${newItem.name}`,
            { itemId: newItem.id }
        );

        res.status(201).json(newItem);
    } catch (error) {
        console.error('Create inventory error:', error);
        res.status(500).json({ error: 'Envanter eklenirken hata oluştu' });
    }
});

// PUT /api/inventory/:id
router.put('/:id', (req, res) => {
    try {
        if (!requireAdvisor(req.user)) {
            return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
        }

        const { id } = req.params;
        const updates = req.body;

        const updatedItem = update('inventory', id, {
            ...updates,
            updatedAt: new Date().toISOString()
        });

        if (!updatedItem) {
            return res.status(404).json({ error: 'Öğe bulunamadı' });
        }

        log(
            'INVENTORY_UPDATE',
            req.user.id,
            `${req.user.firstName} ${req.user.lastName}`,
            `Envanter güncellendi: ${updatedItem.name}`,
            { itemId: id }
        );

        res.json(updatedItem);
    } catch (error) {
        console.error('Update inventory error:', error);
        res.status(500).json({ error: 'Envanter güncellenirken hata oluştu' });
    }
});

// DELETE /api/inventory/:id
router.delete('/:id', (req, res) => {
    try {
        if (!requireAdvisor(req.user)) {
            return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
        }

        const { id } = req.params;
        const item = findById('inventory', id);

        if (!item) {
            return res.status(404).json({ error: 'Öğe bulunamadı' });
        }

        const success = remove('inventory', id);

        if (success) {
            log(
                'INVENTORY_DELETE',
                req.user.id,
                `${req.user.firstName} ${req.user.lastName}`,
                `Envanter silindi: ${item.name}`,
                { itemId: id }
            );
            res.json({ message: 'Öğe başarıyla silindi' });
        } else {
            res.status(404).json({ error: 'Silinemedi' });
        }
    } catch (error) {
        console.error('Delete inventory error:', error);
        res.status(500).json({ error: 'Envanter silinirken hata oluştu' });
    }
});

export default router;
