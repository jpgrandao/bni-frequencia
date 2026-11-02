import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

function formatPtBrDate(isoDate: string): string {
  if (!isoDate) return '';
  const parts = isoDate.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return isoDate;
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const assemblyId = Number(id);

    if (!assemblyId || isNaN(assemblyId)) {
      return NextResponse.json(
        { error: 'ID da assembleia inválido.' },
        { status: 400 }
      );
    }

    const db = getDb();

    const assembly = db
      .prepare('SELECT * FROM assemblies WHERE id = ?')
      .get(assemblyId) as any;

    if (!assembly) {
      return NextResponse.json(
        { error: 'Assembleia não encontrada.' },
        { status: 404 }
      );
    }

    // Buscar todos os membros ativos e as presenças registradas nesta assembleia
    const allMembers = db
      .prepare('SELECT * FROM members WHERE active = 1 ORDER BY name ASC')
      .all() as any[];

    const memberAttendances = db
      .prepare(
        `SELECT ma.*, m.name as member_name, m.company as member_company
         FROM member_attendances ma
         JOIN members m ON m.id = ma.member_id
         WHERE ma.assembly_id = ?
         ORDER BY ma.check_in_time ASC`
      )
      .all(assemblyId) as any[];

    const visitorAttendances = db
      .prepare(
        `SELECT * FROM visitor_attendances WHERE assembly_id = ? ORDER BY id ASC`
      )
      .all(assemblyId) as any[];

    const attendanceByMemberId = new Map<number, any>();
    for (const ma of memberAttendances) {
      attendanceByMemberId.set(ma.member_id, ma);
    }

    const workbook = XLSX.utils.book_new();

    // =========================================================================
    // ABA 1: Dados Geral
    // =========================================================================
    const visitantesCount = visitorAttendances.filter((v) => v.type === 'visitante').length;
    const convidadosCount = visitorAttendances.filter((v) => v.type === 'convidado').length;
    const substitutosCount = memberAttendances.filter((ma) => ma.is_substitute).length;
    const membrosPropriosCount = memberAttendances.length - substitutosCount;

    const rowsGeral = [
      { Campo: 'Número da Reunião', Informação: String(assembly.meeting_number) },
      { Campo: 'Local', Informação: assembly.location },
      { Campo: 'Data', Informação: formatPtBrDate(assembly.meeting_date) },
      {
        Campo: 'Status da Assembleia',
        Informação: assembly.status === 'open' ? 'Aberta' : 'Fechada',
      },
      { Campo: 'Total de Membros Presentes (Próprio Membro)', Informação: String(membrosPropriosCount) },
      { Campo: 'Total de Membros com Substituto', Informação: String(substitutosCount) },
      { Campo: 'Total Geral de Presenças de Membros', Informação: String(memberAttendances.length) },
      {
        Campo: 'Total de Membros Ausentes',
        Informação: String(Math.max(0, allMembers.length - memberAttendances.length)),
      },
      { Campo: 'Total de Visitantes (Outros Grupos BNI)', Informação: String(visitantesCount) },
      { Campo: 'Total de Convidados', Informação: String(convidadosCount) },
      {
        Campo: 'Total Geral de Participantes na Reunião',
        Informação: String(memberAttendances.length + visitorAttendances.length),
      },
    ];

    const sheetGeral = XLSX.utils.json_to_sheet(rowsGeral);
    sheetGeral['!cols'] = [{ wch: 45 }, { wch: 45 }];
    XLSX.utils.book_append_sheet(workbook, sheetGeral, 'Dados Geral');

    // =========================================================================
    // ABA 2: Membros
    // =========================================================================
    const presentMembers = allMembers.filter((m) => attendanceByMemberId.has(m.id));
    const absentMembers = allMembers.filter((m) => !attendanceByMemberId.has(m.id));

    const rowsMembros: Array<{
      Nome: string;
      Status: string;
      'Substituto (se houver)': string;
      'Hora de Entrada': string;
      Empresa: string;
    }> = [];

    for (const m of presentMembers) {
      const att = attendanceByMemberId.get(m.id);
      rowsMembros.push({
        Nome: m.name,
        Status: att?.is_substitute ? 'Substituto' : 'Presente',
        'Substituto (se houver)': att?.is_substitute ? (att.substitute_name || '') : '-',
        'Hora de Entrada': att?.check_in_time || '',
        Empresa: m.company || '',
      });
    }

    for (const m of absentMembers) {
      rowsMembros.push({
        Nome: m.name,
        Status: 'Ausente',
        'Substituto (se houver)': '-',
        'Hora de Entrada': '-',
        Empresa: m.company || '',
      });
    }

    const sheetMembros = XLSX.utils.json_to_sheet(rowsMembros);
    sheetMembros['!cols'] = [{ wch: 38 }, { wch: 18 }, { wch: 32 }, { wch: 20 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(workbook, sheetMembros, 'Membros');

    // =========================================================================
    // ABA 3: Visitantes e Convidados
    // =========================================================================
    const rowsVisitantes = visitorAttendances.map((v) => ({
      Nome: v.name,
      Empresa: v.company || '',
      Contato: v.phone || '',
      'Convidado por': v.invited_by || '-',
      'Grupo BNI': v.type === 'visitante' ? v.bni_group : 'Não se aplica (Convidado)',
      Categoria: v.type === 'visitante' ? 'Visitante BNI' : 'Convidado',
      'Hora de Entrada': v.check_in_time,
    }));

    const sheetVisitantes = XLSX.utils.json_to_sheet(
      rowsVisitantes.length > 0
        ? rowsVisitantes
        : [
            {
              Nome: '',
              Empresa: '',
              Contato: '',
              'Convidado por': '',
              'Grupo BNI': '',
              Categoria: '',
              'Hora de Entrada': '',
            },
          ]
    );
    sheetVisitantes['!cols'] = [
      { wch: 35 },
      { wch: 32 },
      { wch: 22 },
      { wch: 30 },
      { wch: 28 },
      { wch: 18 },
      { wch: 18 },
    ];
    XLSX.utils.book_append_sheet(workbook, sheetVisitantes, 'Visitantes e Convidados');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    const safeNumber = String(assembly.meeting_number).replace(/[^a-zA-Z0-9_-]/g, '');
    const safeDate = String(assembly.meeting_date).replace(/[^0-9-]/g, '');
    const filename = `assembleia_bni_${safeNumber || assembly.id}_${safeDate}.xlsx`;

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error('Erro ao exportar planilha da assembleia:', error);
    return NextResponse.json(
      { error: 'Erro ao gerar planilha Excel da assembleia: ' + (error?.message || String(error)) },
      { status: 500 }
    );
  }
}
