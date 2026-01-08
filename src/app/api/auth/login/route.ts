import { NextRequest, NextResponse } from 'next/server';
import { findOne } from '@/lib/db';
import { verifyPassword, generateToken, User } from '@/lib/auth';
import { log } from '@/lib/logger';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { firstName, lastName, password } = body;

        // Validate input
        if (!firstName || !lastName || !password) {
            return NextResponse.json(
                { error: 'Ad, soyad ve şifre zorunludur' },
                { status: 400 }
            );
        }

        // Find user by firstName and lastName (case-insensitive)
        const user = findOne<User>('users', u =>
            u.firstName.toLowerCase() === firstName.toLowerCase() &&
            u.lastName.toLowerCase() === lastName.toLowerCase()
        );

        if (!user) {
            return NextResponse.json(
                { error: 'Kullanıcı bulunamadı veya şifre hatalı' },
                { status: 401 }
            );
        }

        // Verify password
        const isValid = await verifyPassword(password, user.password);
        if (!isValid) {
            return NextResponse.json(
                { error: 'Kullanıcı bulunamadı veya şifre hatalı' },
                { status: 401 }
            );
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

        return NextResponse.json({
            message: 'Giriş başarılı',
            user: userWithoutPassword,
            token,
        });
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json(
            { error: 'Giriş sırasında bir hata oluştu' },
            { status: 500 }
        );
    }
}
