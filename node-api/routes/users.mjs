import express from 'express';
import { create, findAll, findById, update, remove, findOne } from '../lib/db.mjs';
import { getCurrentUser, requireAdmin, hashPassword } from '../lib/auth.mjs';
import { log } from '../lib/logger.mjs';

const router = express.Router();

// Middleware to ensure admin for all user routes
// Actually, GET users, POST users etc are all admin only.
// The Next.js code checked auth inside each handler, but we can verify auth first.
// However, the Next.js code did specific checks.
// Let's stick to per-route checks to match logic exactly.

// GET /api/users
router.get('/', async (req, res) => {
    try {
        const user = await getCurrentUser(req);

        if (!user || !requireAdmin(user)) {
            return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
        }

        const users = findAll('users');
        const usersWithoutPasswords = users.map(({ password, ...rest }) => rest);

        res.json({ users: usersWithoutPasswords });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Kullanıcı listesi alınamadı' });
    }
});

// POST /api/users
router.post('/', async (req, res) => {
    try {
        const user = await getCurrentUser(req);

        if (!user || !requireAdmin(user)) {
            return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
        }

        const { firstName, lastName, email, password, role } = req.body;

        if (!firstName || !lastName || !password || !role) {
            return res.status(400).json({ error: 'Ad, soyad, şifre ve rol zorunludur' });
        }

        if (!['user', 'advisor', 'admin'].includes(role)) {
            return res.status(400).json({ error: 'Geçersiz rol' });
        }

        const existingUser = findOne('users', u =>
            u.firstName.toLowerCase() === firstName.toLowerCase() &&
            u.lastName.toLowerCase() === lastName.toLowerCase()
        );
        if (existingUser) {
            return res.status(400).json({ error: 'Bu isim ve soyisimle kayıtlı bir kullanıcı zaten var' });
        }

        const hashedPassword = await hashPassword(password);
        const newUser = create('users', {
            firstName,
            lastName,
            email: email || undefined,
            password: hashedPassword,
            role,
            createdAt: new Date().toISOString(),
        });

        log(
            'USER_REGISTER',
            user.id,
            `${user.firstName} ${user.lastName}`,
            `Yeni kullanıcı eklendi: ${firstName} ${lastName} (${role})`,
            { newUserId: newUser.id, email, role }
        );

        const { password: _, ...userWithoutPassword } = newUser;

        res.json({
            message: 'Kullanıcı başarıyla eklendi',
            user: userWithoutPassword,
        });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ error: 'Kullanıcı eklenirken bir hata oluştu' });
    }
});

// PUT /api/users/:id
router.put('/', async (req, res) => { // Next.js used body id, but REST usually uses param.
    // However, the Next.js code: `const { id, ... } = body;` inside PUT.
    // So client sends ID in body.
    // Express typically uses /:id, but to clone exact behavior I should check if I should use / or /:id.
    // The Next.js code was `export async function PUT(request: NextRequest)`.
    // It works on `/api/users`. So it expects ID in body.
    try {
        const user = await getCurrentUser(req);

        if (!user || !requireAdmin(user)) {
            return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
        }

        const { id, firstName, lastName, email, password, role } = req.body;

        if (!id) {
            return res.status(400).json({ error: 'Kullanıcı ID gerekli' });
        }

        const existingUser = findById('users', id);
        if (!existingUser) {
            return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
        }

        if (email && email !== existingUser.email) {
            const emailExists = findOne('users', u => u.email === email && u.id !== id);
            if (emailExists) {
                return res.status(400).json({ error: 'Bu email adresi başka bir kullanıcı tarafından kullanılıyor' });
            }
        }

        const updates = {};
        if (firstName) updates.firstName = firstName;
        if (lastName) updates.lastName = lastName;
        if (email) updates.email = email;
        if (role && ['user', 'advisor', 'admin'].includes(role)) updates.role = role;
        if (password) updates.password = await hashPassword(password);

        const updatedUser = update('users', id, updates);

        log(
            'USER_REGISTER', // NOTE: Next.js code reused USER_REGISTER for updates?
            user.id,
            `${user.firstName} ${user.lastName}`,
            `Kullanıcı güncellendi: ${existingUser.firstName} ${existingUser.lastName}`,
            { userId: id, updates: Object.keys(updates) }
        );

        const { password: _, ...userWithoutPassword } = updatedUser;

        res.json({
            message: 'Kullanıcı başarıyla güncellendi',
            user: userWithoutPassword,
        });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Kullanıcı güncellenirken bir hata oluştu' });
    }
});

// DELETE /api/users
router.delete('/', async (req, res) => { // Next.js used searchParams get id
    try {
        const user = await getCurrentUser(req);

        if (!user || !requireAdmin(user)) {
            return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
        }

        const { id } = req.query; // Express uses query for ?id=...

        if (!id) {
            return res.status(400).json({ error: 'Kullanıcı ID gerekli' });
        }

        if (id === user.id) {
            return res.status(400).json({ error: 'Kendinizi silemezsiniz' });
        }

        const existingUser = findById('users', id);
        if (!existingUser) {
            return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
        }

        const deleted = remove('users', id);

        if (deleted) {
            log(
                'USER_REGISTER', // Consistent with Next.js code logging
                user.id,
                `${user.firstName} ${user.lastName}`,
                `Kullanıcı silindi: ${existingUser.firstName} ${existingUser.lastName}`,
                { deletedUserId: id }
            );

            res.json({ message: 'Kullanıcı başarıyla silindi' });
        } else {
            res.status(500).json({ error: 'Kullanıcı silinemedi' });
        }
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Kullanıcı silinirken bir hata oluştu' });
    }
});

export default router;
