import express from 'express';
import { findOne } from '../lib/db.mjs';
import { verifyPassword, generateToken, getCurrentUser } from '../lib/auth.mjs';
import { log } from '../lib/logger.mjs';

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { firstName, lastName, password } = req.body;

        // Validate input
        if (!firstName || !lastName || !password) {
            return res.status(400).json({ error: 'Ad, soyad ve şifre zorunludur' });
        }

        // Find user
        const user = findOne('users', u =>
            u.firstName.toLowerCase() === firstName.toLowerCase() &&
            u.lastName.toLowerCase() === lastName.toLowerCase()
        );

        if (!user) {
            return res.status(401).json({ error: 'Kullanıcı bulunamadı veya şifre hatalı' });
        }

        // Verify password
        const isValid = await verifyPassword(password, user.password);
        if (!isValid) {
            return res.status(401).json({ error: 'Kullanıcı bulunamadı veya şifre hatalı' });
        }

        // Generate token
        const token = generateToken(user);

        // Log the login
        log(
            'USER_LOGIN',
            user.id,
            `${user.firstName} ${user.lastName}`,
            `Kullanıcı girişi: ${user.firstName} ${user.lastName}`
        );

        // Return user without password
        const { password: _, ...userWithoutPassword } = user;

        res.json({
            message: 'Giriş başarılı',
            user: userWithoutPassword,
            token,
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Giriş sırasında bir hata oluştu' });
    }
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
    try {
        const user = await getCurrentUser(req);

        if (!user) {
            return res.status(401).json({ error: 'Yetkisiz erişim' });
        }

        const { password: _, ...userWithoutPassword } = user;
        res.json({ user: userWithoutPassword });

    } catch (error) {
        console.error('Me error:', error);
        res.status(500).json({ error: 'Kullanıcı bilgileri alınırken bir hata oluştu' });
    }
});

export default router;
