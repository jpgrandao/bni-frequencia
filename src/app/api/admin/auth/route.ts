import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, password, newPassword } = body;
    const db = getDb();

    const row = db
      .prepare('SELECT value FROM settings WHERE key = ?')
      .get('admin_password') as { value: string } | undefined;

    const currentPass = row?.value || 'admin123';

    if (action === 'change_password') {
      if (password !== currentPass) {
        return NextResponse.json({ error: 'Senha atual incorreta.' }, { status: 401 });
      }
      if (!newPassword || newPassword.trim().length < 3) {
        return NextResponse.json(
          { error: 'A nova senha deve ter pelo menos 3 caracteres.' },
          { status: 400 }
        );
      }
      db.prepare('UPDATE settings SET value = ? WHERE key = ?').run(
        newPassword.trim(),
        'admin_password'
      );
      return NextResponse.json({ success: true, message: 'Senha do administrador atualizada!' });
    }

    // Login normal
    if (password === currentPass) {
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Senha de administrador incorreta.' }, { status: 401 });
  } catch (error: any) {
    console.error('Erro na autenticação admin:', error);
    return NextResponse.json({ error: 'Erro interno na autenticação.' }, { status: 500 });
  }
}
