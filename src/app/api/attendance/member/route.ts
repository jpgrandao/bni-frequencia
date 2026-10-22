import { NextRequest, NextResponse } from 'next/server';
import { getDb, formatTimeNow, extractLast3Digits } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { memberId, password } = body;

    if (!memberId || !password) {
      return NextResponse.json(
        { error: 'Por favor, selecione seu nome e digite os 3 últimos dígitos do seu celular.' },
        { status: 400 }
      );
    }

    const db = getDb();

    // Verifica se há assembleia aberta
    const activeAssembly = db
      .prepare("SELECT * FROM assemblies WHERE status = 'open' ORDER BY id DESC LIMIT 1")
      .get();

    if (!activeAssembly) {
      return NextResponse.json(
        { error: 'Não há nenhuma assembleia aberta no momento para registrar presença.' },
        { status: 400 }
      );
    }

    // Busca o membro
    const member = db
      .prepare('SELECT * FROM members WHERE id = ? AND active = 1')
      .get(Number(memberId));

    if (!member) {
      return NextResponse.json(
        { error: 'Membro não encontrado ou inativo.' },
        { status: 404 }
      );
    }

    // Extrai os 3 últimos dígitos esperados (do celular cadastrado ou do campo password)
    const expectedDigits = extractLast3Digits(member.phone, member.password);
    const inputClean = String(password).trim();
    const inputDigits = inputClean.replace(/\D/g, '');

    const isValid =
      (expectedDigits && inputDigits === expectedDigits) ||
      (expectedDigits && inputClean === expectedDigits) ||
      String(member.password).trim() === inputClean;

    if (!isValid) {
      return NextResponse.json(
        {
          error:
            'Os 3 últimos dígitos do celular não conferem. Verifique e tente novamente.',
        },
        { status: 401 }
      );
    }

    // Verifica se já registrou presença nesta assembleia
    const existing = db
      .prepare('SELECT * FROM member_attendances WHERE assembly_id = ? AND member_id = ?')
      .get(activeAssembly.id, member.id);

    if (existing) {
      return NextResponse.json({
        success: true,
        alreadyCheckedIn: true,
        memberName: member.name,
        checkInTime: existing.check_in_time,
        assembly: activeAssembly,
        message: `Sua presença já foi confirmada às ${existing.check_in_time}.`,
      });
    }

    const checkInTime = formatTimeNow();

    db.prepare(
      'INSERT INTO member_attendances (assembly_id, member_id, check_in_time) VALUES (?, ?, ?)'
    ).run(activeAssembly.id, member.id, checkInTime);

    return NextResponse.json({
      success: true,
      alreadyCheckedIn: false,
      memberName: member.name,
      checkInTime,
      assembly: activeAssembly,
      message: 'Presença confirmada com sucesso!',
    });
  } catch (error: any) {
    console.error('Erro ao registrar presença do membro:', error);
    return NextResponse.json(
      { error: 'Erro interno ao registrar presença.' },
      { status: 500 }
    );
  }
}
