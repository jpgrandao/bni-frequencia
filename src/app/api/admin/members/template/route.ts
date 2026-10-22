import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const workbook = XLSX.utils.book_new();

    const sampleRows = [
      {
        Nome: 'João Silva',
        Telefone: '(48) 99999-0101',
        Empresa: 'Silva Consultoria',
      },
      {
        Nome: 'Maria Oliveira',
        Telefone: '(48) 99999-0202',
        Empresa: 'Oliveira Arquitetura',
      },
      {
        Nome: 'Pedro Santos',
        Telefone: '(48) 99999-0303',
        Empresa: 'Santos Tecnologia',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleRows);
    worksheet['!cols'] = [{ wch: 35 }, { wch: 24 }, { wch: 35 }];
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Membros');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition':
          'attachment; filename="modelo_importacao_membros_bni.xlsx"',
      },
    });
  } catch (error: any) {
    console.error('Erro ao gerar planilha modelo:', error);
    return NextResponse.json(
      { error: 'Erro ao gerar modelo de planilha: ' + (error?.message || String(error)) },
      { status: 500 }
    );
  }
}
