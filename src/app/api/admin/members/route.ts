import { NextRequest, NextResponse } from 'next/server';
import { getDb, formatDateISO, extractLast3Digits } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = getDb();
    const members = db.prepare('SELECT * FROM members ORDER BY name ASC').all();
    return NextResponse.json({ members });
  } catch (error: any) {
    console.error('Erro ao listar membros:', error);
    return NextResponse.json({ error: 'Erro ao listar membros.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const db = getDb();
    const now = formatDateISO();

    // Opção de popular dados de exemplo para teste rápido
    if (body.action === 'seed_sample') {
      const sampleMembers = [
        { name: 'Ana Carolina Mendes', phone: '(11) 99111-1101', company: 'Mendes Contabilidade' },
        { name: 'Bruno Ferreira Costa', phone: '(11) 99222-2102', company: 'Costa Advocacia Empresarial' },
        { name: 'Carlos Eduardo Rocha', phone: '(11) 99333-3103', company: 'Rocha Engenharia Civil' },
        { name: 'Daniela Souza Lima', phone: '(11) 99444-4104', company: 'Agência Criativa Digital' },
        { name: 'Eduardo Henrique Alves', phone: '(11) 99555-5105', company: 'Alves Seguros e Consórcios' },
        { name: 'Fernanda Oliveira Santos', phone: '(11) 99666-6106', company: 'Clínica Odonto Prime' },
      ];

      const insertStmt = db.prepare(
        'INSERT INTO members (name, password, company, phone, active, created_at) VALUES (?, ?, ?, ?, 1, ?)'
      );

      let added = 0;
      for (const m of sampleMembers) {
        const exists = db
          .prepare('SELECT id FROM members WHERE LOWER(name) = LOWER(?)')
          .get(m.name);
        if (!exists) {
          const digits = extractLast3Digits(m.phone);
          insertStmt.run(m.name, digits, m.company, m.phone, now);
          added++;
        }
      }

      return NextResponse.json({
        success: true,
        added,
        message: `${added} membros de exemplo adicionados com sucesso!`,
      });
    }

    const { name, password = '', company = '', phone = '' } = body;
    const digits = extractLast3Digits(phone, password);

    if (!name?.trim() || !digits) {
      return NextResponse.json(
        { error: 'Nome e Celular (ou os 3 últimos dígitos) são obrigatórios.' },
        { status: 400 }
      );
    }

    const result = db
      .prepare(
        'INSERT INTO members (name, password, company, phone, active, created_at) VALUES (?, ?, ?, ?, 1, ?)'
      )
      .run(name.trim(), digits, company.trim(), phone.trim(), now);

    return NextResponse.json({
      success: true,
      id: Number(result.lastInsertRowid),
      message: `Membro cadastrado! Código de confirmação: ${digits}`,
    });
  } catch (error: any) {
    console.error('Erro ao criar membro:', error);
    return NextResponse.json({ error: 'Erro ao criar membro.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, password = '', company = '', phone = '', active = 1 } = body;
    const digits = extractLast3Digits(phone, password);

    if (!id || !name?.trim() || !digits) {
      return NextResponse.json(
        { error: 'ID, Nome e Celular (ou 3 últimos dígitos) são obrigatórios.' },
        { status: 400 }
      );
    }

    const db = getDb();
    db.prepare(
      'UPDATE members SET name = ?, password = ?, company = ?, phone = ?, active = ? WHERE id = ?'
    ).run(
      name.trim(),
      digits,
      company.trim(),
      phone.trim(),
      active ? 1 : 0,
      Number(id)
    );

    return NextResponse.json({ success: true, message: 'Membro atualizado com sucesso!' });
  } catch (error: any) {
    console.error('Erro ao atualizar membro:', error);
    return NextResponse.json({ error: 'Erro ao atualizar membro.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const clearAll = searchParams.get('all');

    const db = getDb();

    if (clearAll === 'true') {
      db.prepare('DELETE FROM members').run();
      return NextResponse.json({ success: true, message: 'Todos os membros foram removidos.' });
    }

    if (!id) {
      return NextResponse.json({ error: 'ID do membro não informado.' }, { status: 400 });
    }

    db.prepare('DELETE FROM members WHERE id = ?').run(Number(id));
    return NextResponse.json({ success: true, message: 'Membro removido com sucesso!' });
  } catch (error: any) {
    console.error('Erro ao remover membro:', error);
    return NextResponse.json({ error: 'Erro ao remover membro.' }, { status: 500 });
  }
}
