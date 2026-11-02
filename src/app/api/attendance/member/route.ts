import { NextRequest, NextResponse } from 'next/server';
import { getDb, formatTimeNow, extractLast3Digits } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      memberId,
      password,
      isSubstitute = false,
      substituteName = '',
      checkInTime: customCheckInTime,
    } = body;

    if (!memberId) {
      return NextResponse.json(
        { error: 'Por favor, selecione o membro na lista.' },
        { status: 400 }
      );
    }

    if (isSubstitute) {
      if (!substituteName?.trim()) {
        return NextResponse.json(
          { error: 'Por favor, informe o seu nome completo como substituto.' },
          { status: 400 }
        );
      }
    } else {
      if (!password) {
        return NextResponse.json(
          { error: 'Por favor, digite os 3 últimos dígitos do seu celular.' },
          { status: 400 }
        );
      }
    }

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

    // Busca o membro
    const member = db
      .prepare('SELECT * FROM members WHERE id = ? AND active = 1')
      .get(Number(memberId)) as any;

    if (!member) {
      return NextResponse.json(
        { error: 'Membro não encontrado ou inativo.' },
        { status: 404 }
      );
    }

    // Valida os 3 últimos dígitos caso não seja substituto
    if (!isSubstitute) {
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
    }

    // Determina o horário de chegada
    let finalCheckInTime = formatTimeNow();
    if (customCheckInTime && typeof customCheckInTime === 'string') {
      const trimmed = customCheckInTime.trim();
      if (/^\d{2}:\d{2}$/.test(trimmed)) {
        finalCheckInTime = `${trimmed}:00`;
      } else if (/^\d{2}:\d{2}:\d{2}$/.test(trimmed)) {
        finalCheckInTime = trimmed;
      }
    }

    // Verifica se já registrou presença nesta assembleia
    const existing = db
      .prepare('SELECT * FROM member_attendances WHERE assembly_id = ? AND member_id = ?')
      .get(activeAssembly.id, member.id) as any;

    if (existing) {
      const wasSubstitute = Boolean(existing.is_substitute);
      return NextResponse.json({
        success: true,
        alreadyCheckedIn: true,
        memberName: member.name,
        isSubstitute: wasSubstitute,
        substituteName: existing.substitute_name || '',
        checkInTime: existing.check_in_time,
        assembly: activeAssembly,
        message: wasSubstitute
          ? `A presença de ${member.name} já foi confirmada pelo substituto(a) ${existing.substitute_name} às ${existing.check_in_time}.`
          : `A presença de ${member.name} já foi confirmada às ${existing.check_in_time}.`,
      });
    }

    db.prepare(
      'INSERT INTO member_attendances (assembly_id, member_id, check_in_time, is_substitute, substitute_name) VALUES (?, ?, ?, ?, ?)'
    ).run(
      activeAssembly.id,
      member.id,
      finalCheckInTime,
      isSubstitute ? 1 : 0,
      isSubstitute ? substituteName.trim() : ''
    );

    return NextResponse.json({
      success: true,
      alreadyCheckedIn: false,
      memberName: member.name,
      isSubstitute: Boolean(isSubstitute),
      substituteName: isSubstitute ? substituteName.trim() : '',
      checkInTime: finalCheckInTime,
      assembly: activeAssembly,
      message: isSubstitute
        ? `Presença de ${member.name} confirmada pelo substituto(a) ${substituteName.trim()}!`
        : 'Presença confirmada com sucesso!',
    });
  } catch (error: any) {
    console.error('Erro ao registrar presença do membro:', error);
    return NextResponse.json(
      { error: 'Erro interno ao registrar presença.' },
      { status: 500 }
    );
  }
}
