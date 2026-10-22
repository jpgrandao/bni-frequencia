import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';

export async function GET() {
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sistema BNI Frequência';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Membros');

    sheet.columns = [
      { header: 'Nome', key: 'nome', width: 35 },
      { header: 'Telefone', key: 'telefone', width: 24 },
      { header: 'Empresa', key: 'empresa', width: 35 },
    ];

    // Estilizar cabeçalho
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFC8102E' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'left' };
    headerRow.height = 26;

    // Linhas de exemplo (os 3 últimos dígitos do telefone serão usados na confirmação)
    sheet.addRow({
      nome: 'João Silva',
      telefone: '(48) 99999-0101',
      empresa: 'Silva Consultoria',
    });
    sheet.addRow({
      nome: 'Maria Oliveira',
      telefone: '(48) 99999-0202',
      empresa: 'Oliveira Arquitetura',
    });
    sheet.addRow({
      nome: 'Pedro Santos',
      telefone: '(48) 99999-0303',
      empresa: 'Santos Tecnologia',
    });

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="modelo_importacao_membros_bni.xlsx"',
      },
    });
  } catch (error: any) {
    console.error('Erro ao gerar planilha modelo:', error);
    return NextResponse.json(
      { error: 'Erro ao gerar planilha modelo.' },
      { status: 500 }
    );
  }
}
