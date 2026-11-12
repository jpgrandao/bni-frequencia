import { NextRequest, NextResponse } from 'next/server';
import os from 'os';
import { getDb, generateAccessToken } from '@/lib/db';
import { checkRateLimit, getClientIp, isAdminAuthenticated } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function getLocalNetworkIp(): string | null {
  try {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      const netList = interfaces[name];
      if (!netList) continue;
      for (const net of netList) {
        if (net.family === 'IPv4' && !net.internal) {
          return net.address;
        }
      }
    }
  } catch {
    // ignore
  }
  return null;
}

function normalizeText(value: string): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export async function GET(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rate = checkRateLimit(`public-assembly:${ip}`, 60, 60 * 1000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Muitas consultas em sequência. Aguarde alguns segundos.' },
        { status: 429 }
      );
    }

    const db = getDb();

    // Busca a assembleia aberta mais recente
    const activeAssembly = db
      .prepare("SELECT * FROM assemblies WHERE status = 'open' ORDER BY id DESC LIMIT 1")
      .get() as any;

    // Se não houver assembleia aberta, oculta totalmente qualquer dado ou lista
    if (!activeAssembly) {
      return NextResponse.json({
        assembly: null,
        lanIp: null,
        tokenValid: false,
        members: [],
      });
    }

    // Garante que a assembleia aberta possua um access_token único
    if (!activeAssembly.access_token) {
      const newToken = generateAccessToken();
      db.prepare('UPDATE assemblies SET access_token = ? WHERE id = ?').run(
        newToken,
        activeAssembly.id
      );
      activeAssembly.access_token = newToken;
    }

    const { searchParams } = new URL(req.url);
    const tokenParam = (searchParams.get('t') || searchParams.get('token') || '').trim();
    const queryParam = (searchParams.get('q') || '').trim();
    const isAdmin = isAdminAuthenticated(req);

    const tokenValid =
      Boolean(tokenParam && tokenParam === activeAssembly.access_token) || isAdmin;

    let matchingMembers: {
      id: number;
      name: string;
      company: string;
      checkedIn: boolean;
    }[] = [];

    // Só retorna membros se o token da reunião aberta for válido E o usuário digitar pelo menos 2 caracteres
    const cleanQuery = normalizeText(queryParam);
    if (tokenValid && cleanQuery.length >= 2) {
      const searchRate = checkRateLimit(`public-member-search:${ip}`, 30, 60 * 1000);
      if (!searchRate.allowed) {
        return NextResponse.json(
          { error: 'Limite de buscas atingido. Aguarde alguns segundos.' },
          { status: 429 }
        );
      }

      const allActiveMembers = db
        .prepare('SELECT id, name, company FROM members WHERE active = 1 ORDER BY name ASC')
        .all() as { id: number; name: string; company: string }[];

      const attendances = db
        .prepare('SELECT member_id FROM member_attendances WHERE assembly_id = ?')
        .all(activeAssembly.id) as { member_id: number }[];
      const checkedInSet = new Set(attendances.map((a) => a.member_id));

      matchingMembers = allActiveMembers
        .filter((m) => {
          const normName = normalizeText(m.name);
          const normCompany = normalizeText(m.company);
          return normName.includes(cleanQuery) || normCompany.includes(cleanQuery);
        })
        .slice(0, 15)
        .map((m) => ({
          id: m.id,
          name: m.name,
          company: m.company,
          checkedIn: checkedInSet.has(m.id),
        }));
    }

    const lanIp = getLocalNetworkIp();

    return NextResponse.json({
      assembly: {
        id: activeAssembly.id,
        meeting_number: activeAssembly.meeting_number,
        location: activeAssembly.location,
        meeting_date: activeAssembly.meeting_date,
        status: activeAssembly.status,
        access_token: activeAssembly.access_token,
      },
      tokenValid,
      lanIp,
      members: matchingMembers,
    });
  } catch (error: any) {
    console.error('Erro ao buscar assembleia ativa:', error);
    return NextResponse.json(
      { error: 'Erro interno ao carregar dados da assembleia.' },
      { status: 500 }
    );
  }
}
