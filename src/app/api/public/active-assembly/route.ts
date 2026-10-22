import { NextResponse } from 'next/server';
import os from 'os';
import { getDb } from '@/lib/db';

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

export async function GET() {
  try {
    const db = getDb();

    // Busca a assembleia aberta mais recente
    const activeAssembly = db
      .prepare("SELECT * FROM assemblies WHERE status = 'open' ORDER BY id DESC LIMIT 1")
      .get();

    // Lista de membros ativos (sem expor a senha/dígitos!)
    const members = db
      .prepare('SELECT id, name, company FROM members WHERE active = 1 ORDER BY name ASC')
      .all();

    let checkedInMemberIds: number[] = [];
    if (activeAssembly) {
      const attendances = db
        .prepare('SELECT member_id FROM member_attendances WHERE assembly_id = ?')
        .all(activeAssembly.id) as { member_id: number }[];
      checkedInMemberIds = attendances.map((a) => a.member_id);
    }

    const lanIp = getLocalNetworkIp();

    return NextResponse.json({
      assembly: activeAssembly || null,
      lanIp,
      members: members.map((m: any) => ({
        id: m.id,
        name: m.name,
        company: m.company,
        checkedIn: checkedInMemberIds.includes(m.id),
      })),
    });
  } catch (error: any) {
    console.error('Erro ao buscar assembleia ativa:', error);
    return NextResponse.json(
      { error: 'Erro interno ao carregar dados da assembleia.' },
      { status: 500 }
    );
  }
}
