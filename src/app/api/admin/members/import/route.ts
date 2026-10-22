import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { getDb, formatDateISO } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const replaceExisting = formData.get('replaceExisting') === 'true';

    if (!file) {
      return NextResponse.json(
        { error: 'Nenhum arquivo enviado. Selecione uma planilha Excel (.xlsx, .xls ou .csv).' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return NextResponse.json(
        { error: 'O arquivo Excel não possui nenhuma aba válida.' },
        { status: 400 }
      );
    }

    const worksheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { error: 'A planilha está vazia ou sem linhas de dados.' },
        { status: 400 }
      );
    }

    const db = getDb();
    const now = formatDateISO();

    if (replaceExisting) {
      db.prepare('DELETE FROM members').run();
    }

    let importedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    const insertStmt = db.prepare(
      'INSERT INTO members (name, password, company, phone, active, created_at) VALUES (?, ?, ?, ?, 1, ?)'
    );
    const updateStmt = db.prepare(
      'UPDATE members SET password = ?, company = ?, phone = ?, active = 1 WHERE id = ?'
    );

    for (const row of rows) {
      // Mapeia possíveis nomes de colunas (case-insensitive e sem acentos)
      const normalizedRow: Record<string, string> = {};
      for (const [k, v] of Object.entries(row)) {
        const cleanKey = k
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .trim();
        normalizedRow[cleanKey] = String(v ?? '').trim();
      }

      const name =
        normalizedRow['nome'] ||
        normalizedRow['membro'] ||
        normalizedRow['nome do membro'] ||
        normalizedRow['nome completo'] ||
        normalizedRow['name'] ||
        Object.values(normalizedRow)[0] ||
        '';

      if (!name || name.toLowerCase() === 'nome') {
        skippedCount++;
        continue;
      }

      const password =
        normalizedRow['senha'] ||
        normalizedRow['pin'] ||
        normalizedRow['codigo'] ||
        normalizedRow['password'] ||
        '1234';

      const company =
        normalizedRow['empresa'] ||
        normalizedRow['negocio'] ||
        normalizedRow['company'] ||
        '';

      const phone =
        normalizedRow['telefone'] ||
        normalizedRow['contato'] ||
        normalizedRow['celular'] ||
        normalizedRow['whatsapp'] ||
        normalizedRow['phone'] ||
        '';

      // Verifica se já existe membro com o mesmo nome
      const existing = db
        .prepare('SELECT id FROM members WHERE LOWER(name) = LOWER(?)')
        .get(name) as { id: number } | undefined;

      if (existing) {
        updateStmt.run(password, company, phone, existing.id);
        updatedCount++;
      } else {
        insertStmt.run(name, password, company, phone, now);
        importedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      importedCount,
      updatedCount,
      skippedCount,
      message: `Importação concluída! ${importedCount} novos membros adicionados e ${updatedCount} atualizados.`,
    });
  } catch (error: any) {
    console.error('Erro ao importar planilha de membros:', error);
    return NextResponse.json(
      { error: 'Erro ao processar arquivo Excel. Verifique se o formato é válido (.xlsx, .xls ou .csv).' },
      { status: 500 }
    );
  }
}
