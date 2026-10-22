import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
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

    const attendanceByMemberId = new Map<number, string>();
    for (const ma of memberAttendances) {
      attendanceByMemberId.set(ma.member_id, ma.check_in_time);
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'BNI Controle de Frequência';
    workbook.created = new Date();

    // =========================================================================
    // ABA 1: Dados Geral
    // =========================================================================
    const sheetGeral = workbook.addWorksheet('Dados Geral');
    sheetGeral.columns = [
      { header: 'Campo', key: 'campo', width: 32 },
      { header: 'Informação', key: 'valor', width: 45 },
    ];

    const headerGeral = sheetGeral.getRow(1);
    headerGeral.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
    headerGeral.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFC8102E' },
    };
    headerGeral.height = 26;
    headerGeral.alignment = { vertical: 'middle' };

    const visitantesCount = visitorAttendances.filter((v) => v.type === 'visitante').length;
    const convidadosCount = visitorAttendances.filter((v) => v.type === 'convidado').length;

    const rowsGeral = [
      { campo: 'Número da Reunião', valor: String(assembly.meeting_number) },
      { campo: 'Local', valor: assembly.location },
      { campo: 'Data', valor: formatPtBrDate(assembly.meeting_date) },
      {
        campo: 'Status da Assembleia',
        valor: assembly.status === 'open' ? 'Aberta' : 'Fechada',
      },
      { campo: 'Total de Membros Presentes', valor: String(memberAttendances.length) },
      {
        campo: 'Total de Membros Ausentes',
        valor: String(Math.max(0, allMembers.length - memberAttendances.length)),
      },
      { campo: 'Total de Visitantes (Outros Grupos BNI)', valor: String(visitantesCount) },
      { campo: 'Total de Convidados', valor: String(convidadosCount) },
      {
        campo: 'Total Geral de Participantes na Reunião',
        valor: String(memberAttendances.length + visitorAttendances.length),
      },
    ];

    rowsGeral.forEach((r) => {
      const row = sheetGeral.addRow(r);
      row.getCell(1).font = { bold: true };
      row.height = 22;
      row.alignment = { vertical: 'middle' };
    });

    // =========================================================================
    // ABA 2: Membros
    // =========================================================================
    const sheetMembros = workbook.addWorksheet('Membros');
    sheetMembros.columns = [
      { header: 'Nome', key: 'nome', width: 38 },
      { header: 'Hora de Entrada', key: 'hora', width: 20 },
      { header: 'Status', key: 'status', width: 18 },
      { header: 'Empresa', key: 'empresa', width: 30 },
    ];

    const headerMembros = sheetMembros.getRow(1);
    headerMembros.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
    headerMembros.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFC8102E' },
    };
    headerMembros.height = 26;
    headerMembros.alignment = { vertical: 'middle' };

    // Primeiro lista os presentes por ordem de chegada ou todos os membros
    // Vamos listar todos os membros cadastrados (Presentes primeiro, depois Ausentes)
    // E caso algum membro tenha registrado presença, exibe sua Hora de Entrada exata
    const presentMembers = allMembers.filter((m) => attendanceByMemberId.has(m.id));
    const absentMembers = allMembers.filter((m) => !attendanceByMemberId.has(m.id));

    for (const m of presentMembers) {
      const row = sheetMembros.addRow({
        nome: m.name,
        hora: attendanceByMemberId.get(m.id) || '',
        status: 'Presente',
        empresa: m.company || '',
      });
      row.height = 20;
      row.getCell(3).font = { bold: true, color: { argb: 'FF15803D' } };
    }

    for (const m of absentMembers) {
      const row = sheetMembros.addRow({
        nome: m.name,
        hora: '-',
        status: 'Ausente',
        empresa: m.company || '',
      });
      row.height = 20;
      row.getCell(3).font = { color: { argb: 'FFB91C1C' } };
    }

    // =========================================================================
    // ABA 3: Visitantes e Convidados
    // =========================================================================
    const sheetVisitantes = workbook.addWorksheet('Visitantes e Convidados');
    sheetVisitantes.columns = [
      { header: 'Nome', key: 'nome', width: 35 },
      { header: 'Empresa', key: 'empresa', width: 32 },
      { header: 'Contato', key: 'contato', width: 22 },
      { header: 'Grupo BNI', key: 'grupo_bni', width: 28 },
      { header: 'Categoria', key: 'tipo', width: 18 },
      { header: 'Hora de Entrada', key: 'hora', width: 18 },
    ];

    const headerVisitantes = sheetVisitantes.getRow(1);
    headerVisitantes.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
    headerVisitantes.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFC8102E' },
    };
    headerVisitantes.height = 26;
    headerVisitantes.alignment = { vertical: 'middle' };

    for (const v of visitorAttendances) {
      const row = sheetVisitantes.addRow({
        nome: v.name,
        empresa: v.company,
        contato: v.phone,
        grupo_bni: v.type === 'visitante' ? v.bni_group : 'Não se aplica (Convidado)',
        tipo: v.type === 'visitante' ? 'Visitante BNI' : 'Convidado',
        hora: v.check_in_time,
      });
      row.height = 20;
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const safeNumber = String(assembly.meeting_number).replace(/[^a-zA-Z0-9_-]/g, '');
    const safeDate = String(assembly.meeting_date).replace(/[^0-9-]/g, '');
    const filename = `assembleia_bni_${safeNumber || assembly.id}_${safeDate}.xlsx`;

    return new NextResponse(buffer, {
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
      { error: 'Erro ao gerar planilha Excel da assembleia.' },
      { status: 500 }
    );
  }
}
