import { create } from './lib/db.mjs';
import { hashPassword } from './lib/auth.mjs';

async function createTestUser() {
    const password = await hashPassword('123456');
    const user = create('users', {
        firstName: 'Test',
        lastName: 'Admin',
        email: 'test@admin.com',
        password,
        role: 'admin',
        createdAt: new Date().toISOString()
    });
    console.log('Test user created:', user);
}

createTestUser();
