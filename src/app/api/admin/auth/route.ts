import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import {
  attachAdminCookie,
  checkRateLimit,
  clearAdminCookie,
  createAdminSessionToken,
  getClientIp,
  hashPassword,
  isAdminAuthenticated,
  resetRateLimit,
  verifyPassword,
} from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  return NextResponse.json({
    authenticated: isAdminAuthenticated(req),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, username, password, newUsername, newPassword } = body;

    if (action === 'logout') {
      const res = NextResponse.json({ success: true });
      clearAdminCookie(res);
      return res;
    }

    const ip = getClientIp(req);
    const rateKey = `admin-auth:${ip}`;
    const rate = checkRateLimit(rateKey, 8, 10 * 60 * 1000);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          error: `Muitas tentativas de acesso. Aguarde ${rate.retryAfterSec} segundos e tente novamente.`,
        },
        { status: 429 }
      );
    }

    const db = getDb();
    const userRow = db
      .prepare('SELECT value FROM settings WHERE key = ?')
      .get('admin_username') as { value: string } | undefined;
    const passRow = db
      .prepare('SELECT value FROM settings WHERE key = ?')
      .get('admin_password') as { value: string } | undefined;

    const currentUsername = userRow?.value || process.env.ADMIN_USERNAME || process.env.ADMIN_USER || 'admin';
    const currentPassHash =
      passRow?.value || hashPassword(process.env.ADMIN_PASSWORD || 'f6dfy3g5w53w2a5h85alt6');

    if (action === 'change_password') {
      if (!verifyPassword(String(password || ''), currentPassHash)) {
        return NextResponse.json({ error: 'Senha atual incorreta.' }, { status: 401 });
      }

      if (newUsername && newUsername.trim().length >= 3) {
        db.prepare('UPDATE settings SET value = ? WHERE key = ?').run(
          newUsername.trim(),
          'admin_username'
        );
      }

      if (newPassword) {
        if (String(newPassword).trim().length < 6) {
          return NextResponse.json(
            { error: 'A nova senha deve ter pelo menos 6 caracteres.' },
            { status: 400 }
          );
        }
        const newHash = hashPassword(String(newPassword).trim());
        db.prepare('UPDATE settings SET value = ? WHERE key = ?').run(
          newHash,
          'admin_password'
        );
      }

      resetRateLimit(rateKey);
      const token = createAdminSessionToken();
      const res = NextResponse.json({
        success: true,
        message: 'Credenciais de administrador atualizadas com segurança!',
      });
      attachAdminCookie(res, req, token);
      return res;
    }

    // Login normal
    const inputUser = String(username || '').trim().toLowerCase();
    const expectedUser = currentUsername.trim().toLowerCase();
    const passwordValid = verifyPassword(String(password || ''), currentPassHash);

    if (inputUser === expectedUser && passwordValid) {
      resetRateLimit(rateKey);
      const token = createAdminSessionToken();
      const res = NextResponse.json({ success: true });
      attachAdminCookie(res, req, token);
      return res;
    }

    return NextResponse.json(
      { error: 'Usuário ou senha de administrador incorretos.' },
      { status: 401 }
    );
  } catch (error: any) {
    console.error('Erro na autenticação admin:', error);
    return NextResponse.json({ error: 'Erro interno na autenticação.' }, { status: 500 });
  }
}
