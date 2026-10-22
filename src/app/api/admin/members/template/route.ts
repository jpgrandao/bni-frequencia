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
      { header: 'Senha', key: 'senha', width: 18 },
      { header: 'Empresa', key: 'empresa', width: 30 },
      { header: 'Telefone', key: 'telefone', width: 22 },
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

    // Linhas de exemplo
    sheet.addRow({
      nome: 'João Silva',
      senha: '101',
      empresa: 'Silva Consultoria',
      telefone: '(11) 99999-0001',
    });
    sheet.addRow({
      nome: 'Maria Oliveira',
      senha: '102',
      empresa: 'Oliveira Arquitetura',
      telefone: '(11) 99999-0002',
    });
    sheet.addRow({
      nome: 'Pedro Santos',
      senha: '103',
      empresa: 'Santos Tecnologia',
      telefone: '(11) 99999-0003',
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
