import { NextRequest, NextResponse } from 'next/server';
import { getDb, formatDateISO, formatTimeNow } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const db = getDb();

    if (id) {
      const assembly = db.prepare('SELECT * FROM assemblies WHERE id = ?').get(Number(id));
      if (!assembly) {
        return NextResponse.json({ error: 'Assembleia não encontrada.' }, { status: 404 });
      }

      const memberAttendances = db
        .prepare(
          `SELECT ma.id, ma.assembly_id, ma.member_id, ma.check_in_time, m.name as member_name, m.company as member_company
           FROM member_attendances ma
           JOIN members m ON m.id = ma.member_id
           WHERE ma.assembly_id = ?
           ORDER BY ma.id ASC`
        )
        .all(Number(id));

      const visitorAttendances = db
        .prepare(
          `SELECT * FROM visitor_attendances WHERE assembly_id = ? ORDER BY id ASC`
        )
        .all(Number(id));

      const allMembers = db
        .prepare('SELECT id, name, company, phone, active FROM members WHERE active = 1 ORDER BY name ASC')
        .all();

      return NextResponse.json({
        assembly,
        memberAttendances,
        visitorAttendances,
        allMembers,
      });
    }

    const assemblies = db
      .prepare(
        `SELECT 
          a.*,
          (SELECT COUNT(*) FROM member_attendances ma WHERE ma.assembly_id = a.id) as member_count,
          (SELECT COUNT(*) FROM visitor_attendances va WHERE va.assembly_id = a.id) as visitor_total_count,
          (SELECT COUNT(*) FROM visitor_attendances va WHERE va.assembly_id = a.id AND va.type = 'visitante') as visitante_count,
          (SELECT COUNT(*) FROM visitor_attendances va WHERE va.assembly_id = a.id AND va.type = 'convidado') as convidado_count
         FROM assemblies a
         ORDER BY a.id DESC`
      )
      .all();

    const totalActiveMembersRow = db
      .prepare('SELECT COUNT(*) as count FROM members WHERE active = 1')
      .get() as { count: number };

    return NextResponse.json({
      assemblies,
      totalActiveMembers: totalActiveMembersRow?.count || 0,
    });
  } catch (error: any) {
    console.error('Erro ao listar assembleias:', error);
    return NextResponse.json({ error: 'Erro ao listar assembleias.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { meeting_number, location, meeting_date, status = 'open' } = body;

    if (!meeting_number?.trim() || !location?.trim() || !meeting_date?.trim()) {
      return NextResponse.json(
        { error: 'Local, Número da Reunião e Data são obrigatórios.' },
        { status: 400 }
      );
    }

    const db = getDb();
    const now = formatDateISO();

    // Se a nova assembleia já nascer aberta, fecha outras assembleias que estavam abertas
    if (status === 'open') {
      db.prepare("UPDATE assemblies SET status = 'closed', closed_at = ? WHERE status = 'open'").run(
        now
      );
    }

    const result = db
      .prepare(
        `INSERT INTO assemblies (meeting_number, location, meeting_date, status, created_at, closed_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        meeting_number.trim(),
        location.trim(),
        meeting_date.trim(),
        status === 'closed' ? 'closed' : 'open',
        now,
        status === 'closed' ? now : null
      );

    return NextResponse.json({
      success: true,
      id: Number(result.lastInsertRowid),
      message: 'Assembleia criada com sucesso!',
    });
  } catch (error: any) {
    console.error('Erro ao criar assembleia:', error);
    return NextResponse.json({ error: 'Erro ao criar assembleia.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const db = getDb();
    const now = formatDateISO();

    // Ação de alternar presença manual de um membro pelo Admin
    if (body.action === 'toggle_member_attendance') {
      const { assemblyId, memberId } = body;
      const existing = db
        .prepare('SELECT id FROM member_attendances WHERE assembly_id = ? AND member_id = ?')
        .get(Number(assemblyId), Number(memberId)) as { id: number } | undefined;

      if (existing) {
        db.prepare('DELETE FROM member_attendances WHERE id = ?').run(existing.id);
        return NextResponse.json({
          success: true,
          checkedIn: false,
          message: 'Presença do membro removida.',
        });
      } else {
        const checkInTime = formatTimeNow();
        db.prepare(
          'INSERT INTO member_attendances (assembly_id, member_id, check_in_time) VALUES (?, ?, ?)'
        ).run(Number(assemblyId), Number(memberId), checkInTime);
        return NextResponse.json({
          success: true,
          checkedIn: true,
          checkInTime,
          message: 'Presença do membro registrada manualmente!',
        });
      }
    }

    // Ação de excluir registro de visitante/convidado
    if (body.action === 'delete_visitor_attendance') {
      const { attendanceId } = body;
      db.prepare('DELETE FROM visitor_attendances WHERE id = ?').run(Number(attendanceId));
      return NextResponse.json({
        success: true,
        message: 'Registro de visitante/convidado removido.',
      });
    }

    const { id, status, meeting_number, location, meeting_date } = body;
    if (!id) {
      return NextResponse.json({ error: 'ID da assembleia é obrigatório.' }, { status: 400 });
    }

    // Se estiver mudando status (Abrir / Fechar assembleia)
    if (status === 'open' || status === 'closed') {
      if (status === 'open') {
        // Fecha qualquer outra assembleia aberta para manter apenas uma ativa por vez
        db.prepare(
          "UPDATE assemblies SET status = 'closed', closed_at = ? WHERE status = 'open' AND id != ?"
        ).run(now, Number(id));

        db.prepare("UPDATE assemblies SET status = 'open', closed_at = NULL WHERE id = ?").run(
          Number(id)
        );
      } else {
        db.prepare("UPDATE assemblies SET status = 'closed', closed_at = ? WHERE id = ?").run(
          now,
          Number(id)
        );
      }
    }

    if (meeting_number && location && meeting_date) {
      db.prepare(
        'UPDATE assemblies SET meeting_number = ?, location = ?, meeting_date = ? WHERE id = ?'
      ).run(meeting_number.trim(), location.trim(), meeting_date.trim(), Number(id));
    }

    return NextResponse.json({
      success: true,
      message:
        status === 'open'
          ? 'Assembleia aberta para registros de presença!'
          : status === 'closed'
          ? 'Assembleia encerrada!'
          : 'Dados da assembleia atualizados!',
    });
  } catch (error: any) {
    console.error('Erro ao atualizar assembleia:', error);
    return NextResponse.json({ error: 'Erro ao atualizar assembleia.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID da assembleia não informado.' }, { status: 400 });
    }

    const db = getDb();
    db.prepare('DELETE FROM assemblies WHERE id = ?').run(Number(id));

    return NextResponse.json({ success: true, message: 'Assembleia excluída com sucesso.' });
  } catch (error: any) {
    console.error('Erro ao excluir assembleia:', error);
    return NextResponse.json({ error: 'Erro ao excluir assembleia.' }, { status: 500 });
  }
}
