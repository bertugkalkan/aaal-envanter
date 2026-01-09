import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.mjs';
import inventoryRoutes from './routes/inventory.mjs';
import usersRoutes from './routes/users.mjs';
import requestsRoutes from './routes/requests.mjs';
import logsRoutes from './routes/logs.mjs';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/requests', requestsRoutes);
app.use('/api/logs', logsRoutes);

// Health check
app.get('/', (req, res) => {
    res.json({ message: 'AAAL Envanter Node.js API is running' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
