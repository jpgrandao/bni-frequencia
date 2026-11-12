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
    const { action, password, newPassword } = body;

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
    const row = db
      .prepare('SELECT value FROM settings WHERE key = ?')
      .get('admin_password') as { value: string } | undefined;

    const currentPassHash = row?.value || hashPassword(process.env.ADMIN_PASSWORD || 'admin123');

    if (action === 'change_password') {
      if (!verifyPassword(String(password || ''), currentPassHash)) {
        return NextResponse.json({ error: 'Senha atual incorreta.' }, { status: 401 });
      }
      if (!newPassword || String(newPassword).trim().length < 6) {
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
      resetRateLimit(rateKey);
      const token = createAdminSessionToken();
      const res = NextResponse.json({
        success: true,
        message: 'Senha do administrador atualizada com segurança!',
      });
      attachAdminCookie(res, req, token);
      return res;
    }

    // Login normal
    if (verifyPassword(String(password || ''), currentPassHash)) {
      resetRateLimit(rateKey);
      const token = createAdminSessionToken();
      const res = NextResponse.json({ success: true });
      attachAdminCookie(res, req, token);
      return res;
    }

    return NextResponse.json({ error: 'Senha de administrador incorreta.' }, { status: 401 });
  } catch (error: any) {
    console.error('Erro na autenticação admin:', error);
    return NextResponse.json({ error: 'Erro interno na autenticação.' }, { status: 500 });
  }
}
