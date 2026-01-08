import { NextRequest, NextResponse } from 'next/server';
import { create, findAll, findById, update, remove, findOne } from '@/lib/db';
import { getCurrentUser, requireAdmin, hashPassword, User } from '@/lib/auth';
import { log } from '@/lib/logger';

// GET - List all users (admin only)
export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser(request);

        if (!user || !requireAdmin(user)) {
            return NextResponse.json(
                { error: 'Bu işlem için yetkiniz yok' },
                { status: 403 }
            );
        }

        const users = findAll<User>('users');

        // Remove passwords before sending
        const usersWithoutPasswords = users.map(({ password, ...rest }) => rest);

        return NextResponse.json({ users: usersWithoutPasswords });
    } catch (error) {
        console.error('Get users error:', error);
        return NextResponse.json(
            { error: 'Kullanıcı listesi alınamadı' },
            { status: 500 }
        );
    }
}

// POST - Create new user (admin only)
export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser(request);

        if (!user || !requireAdmin(user)) {
            return NextResponse.json(
                { error: 'Bu işlem için yetkiniz yok' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { firstName, lastName, email, password, role } = body;

        if (!firstName || !lastName || !password || !role) {
            return NextResponse.json(
                { error: 'Ad, soyad, şifre ve rol zorunludur' },
                { status: 400 }
            );
        }

        // Validate role
        if (!['user', 'advisor', 'admin'].includes(role)) {
            return NextResponse.json(
                { error: 'Geçersiz rol' },
                { status: 400 }
            );
        }

        // Check if user with same firstName and lastName already exists
        const existingUser = findOne<User>('users', u =>
            u.firstName.toLowerCase() === firstName.toLowerCase() &&
            u.lastName.toLowerCase() === lastName.toLowerCase()
        );
        if (existingUser) {
            return NextResponse.json(
                { error: 'Bu isim ve soyisimle kayıtlı bir kullanıcı zaten var' },
                { status: 400 }
            );
        }

        // Hash password and create user
        const hashedPassword = await hashPassword(password);
        const newUser = create<User>('users', {
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

        return NextResponse.json({
            message: 'Kullanıcı başarıyla eklendi',
            user: userWithoutPassword,
        });
    } catch (error) {
        console.error('Create user error:', error);
        return NextResponse.json(
            { error: 'Kullanıcı eklenirken bir hata oluştu' },
            { status: 500 }
        );
    }
}

// PUT - Update user (admin only)
export async function PUT(request: NextRequest) {
    try {
        const user = await getCurrentUser(request);

        if (!user || !requireAdmin(user)) {
            return NextResponse.json(
                { error: 'Bu işlem için yetkiniz yok' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { id, firstName, lastName, email, password, role } = body;

        if (!id) {
            return NextResponse.json(
                { error: 'Kullanıcı ID gerekli' },
                { status: 400 }
            );
        }

        const existingUser = findById<User>('users', id);
        if (!existingUser) {
            return NextResponse.json(
                { error: 'Kullanıcı bulunamadı' },
                { status: 404 }
            );
        }

        // Check email uniqueness if changing email
        if (email && email !== existingUser.email) {
            const emailExists = findOne<User>('users', u => u.email === email && u.id !== id);
            if (emailExists) {
                return NextResponse.json(
                    { error: 'Bu email adresi başka bir kullanıcı tarafından kullanılıyor' },
                    { status: 400 }
                );
            }
        }

        // Prepare updates
        const updates: Partial<User> = {};
        if (firstName) updates.firstName = firstName;
        if (lastName) updates.lastName = lastName;
        if (email) updates.email = email;
        if (role && ['user', 'advisor', 'admin'].includes(role)) updates.role = role;
        if (password) updates.password = await hashPassword(password);

        const updatedUser = update<User>('users', id, updates);

        log(
            'USER_REGISTER',
            user.id,
            `${user.firstName} ${user.lastName}`,
            `Kullanıcı güncellendi: ${existingUser.firstName} ${existingUser.lastName}`,
            { userId: id, updates: Object.keys(updates) }
        );

        const { password: _, ...userWithoutPassword } = updatedUser!;

        return NextResponse.json({
            message: 'Kullanıcı başarıyla güncellendi',
            user: userWithoutPassword,
        });
    } catch (error) {
        console.error('Update user error:', error);
        return NextResponse.json(
            { error: 'Kullanıcı güncellenirken bir hata oluştu' },
            { status: 500 }
        );
    }
}

// DELETE - Remove user (admin only)
export async function DELETE(request: NextRequest) {
    try {
        const user = await getCurrentUser(request);

        if (!user || !requireAdmin(user)) {
            return NextResponse.json(
                { error: 'Bu işlem için yetkiniz yok' },
                { status: 403 }
            );
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { error: 'Kullanıcı ID gerekli' },
                { status: 400 }
            );
        }

        // Prevent self-deletion
        if (id === user.id) {
            return NextResponse.json(
                { error: 'Kendinizi silemezsiniz' },
                { status: 400 }
            );
        }

        const existingUser = findById<User>('users', id);
        if (!existingUser) {
            return NextResponse.json(
                { error: 'Kullanıcı bulunamadı' },
                { status: 404 }
            );
        }

        const deleted = remove<User>('users', id);

        if (deleted) {
            log(
                'USER_REGISTER',
                user.id,
                `${user.firstName} ${user.lastName}`,
                `Kullanıcı silindi: ${existingUser.firstName} ${existingUser.lastName}`,
                { deletedUserId: id }
            );

            return NextResponse.json({
                message: 'Kullanıcı başarıyla silindi',
            });
        }

        return NextResponse.json(
            { error: 'Kullanıcı silinemedi' },
            { status: 500 }
        );
    } catch (error) {
        console.error('Delete user error:', error);
        return NextResponse.json(
            { error: 'Kullanıcı silinirken bir hata oluştu' },
            { status: 500 }
        );
    }
}
