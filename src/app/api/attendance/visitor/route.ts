import { NextRequest, NextResponse } from 'next/server';
import { getDb, formatTimeNow } from '@/lib/db';
import { checkRateLimit, getClientIp } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rate = checkRateLimit(`attendance-visitor:${ip}`, 20, 10 * 60 * 1000);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          error: `Muitas requisições em sequência. Aguarde ${rate.retryAfterSec} segundos.`,
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { name, company, phone, type, bniGroup, invitedBy, token = '' } = body;

    if (!name?.trim() || !company?.trim() || !phone?.trim()) {
      return NextResponse.json(
        { error: 'Por favor, preencha Nome, Empresa e Telefone.' },
        { status: 400 }
      );
    }

    const normalizedType = type === 'visitante' ? 'visitante' : 'convidado';

    if (normalizedType === 'visitante' && !bniGroup?.trim()) {
      return NextResponse.json(
        { error: 'Por favor, informe de qual outro grupo BNI você faz parte.' },
        { status: 400 }
      );
    }

    const cleanInvitedBy = String(invitedBy || '').trim();

    const db = getDb();

    // Verifica se há assembleia aberta
    const activeAssembly = db
      .prepare("SELECT * FROM assemblies WHERE status = 'open' ORDER BY id DESC LIMIT 1")
      .get() as any;

    if (!activeAssembly) {
      return NextResponse.json(
        { error: 'Não há nenhuma assembleia aberta no momento para registrar presença.' },
        { status: 400 }
      );
    }

    if (
      activeAssembly.access_token &&
      String(token || '').trim() !== String(activeAssembly.access_token).trim()
    ) {
      return NextResponse.json(
        {
          error:
            'Código da reunião inválido ou expirado. Escaneie o QR Code oficial da assembleia aberta.',
        },
        { status: 403 }
      );
    }

    const checkInTime = formatTimeNow();
    const cleanGroup = normalizedType === 'visitante' ? bniGroup.trim() : '';

    db.prepare(
      `INSERT INTO visitor_attendances 
        (assembly_id, name, company, phone, type, bni_group, invited_by, check_in_time) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      activeAssembly.id,
      name.trim(),
      company.trim(),
      phone.trim(),
      normalizedType,
      cleanGroup,
      cleanInvitedBy,
      checkInTime
    );

    return NextResponse.json({
      success: true,
      name: name.trim(),
      type: normalizedType,
      bniGroup: cleanGroup,
      invitedBy: cleanInvitedBy,
      checkInTime,
      assembly: activeAssembly,
      message: 'Presença registrada com sucesso! Seja muito bem-vindo(a)!',
    });
  } catch (error: any) {
    console.error('Erro ao registrar presença de visitante/convidado:', error);
    return NextResponse.json(
      { error: 'Erro interno ao registrar presença.' },
      { status: 500 }
    );
  }
}
