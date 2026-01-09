import express from 'express';
import { getLogs } from '../lib/logger.mjs';
import { getCurrentUser, requireAdmin } from '../lib/auth.mjs';

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const user = await getCurrentUser(req);

        if (!user || user.role !== 'admin') {
            if (!user) return res.status(401).json({ error: 'Yetkisiz' });
            if (user.role !== 'admin') return res.status(403).json({ error: 'Yetkisiz' });
        }

        const { userId, action, startDate, endDate } = req.query;

        const logs = getLogs({
            userId: userId,
            action: action,
            startDate: startDate,
            endDate: endDate
        });

        res.json({ logs });
    } catch (error) {
        console.error('Get logs error:', error);
        res.status(500).json({ error: 'Loglar alınamadı' });
    }
});

export default router;
