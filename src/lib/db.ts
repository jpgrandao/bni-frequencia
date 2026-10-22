import fs from 'fs';
import path from 'path';

// Utilizamos eval('require') para garantir que o bundler do Next.js carregue o módulo nativo do Node 22/24 em runtime
const getSqlite = () => {
  const req = eval('require');
  return req('node:sqlite');
};

export interface Member {
  id: number;
  name: string;
  password: string;
  company: string;
  phone: string;
  active: number;
  created_at: string;
}

export interface Assembly {
  id: number;
  meeting_number: string;
  location: string;
  meeting_date: string;
  status: 'open' | 'closed';
  created_at: string;
  closed_at: string | null;
}

export interface MemberAttendance {
  id: number;
  assembly_id: number;
  member_id: number;
  member_name?: string;
  member_company?: string;
  check_in_time: string;
}

export interface VisitorAttendance {
  id: number;
  assembly_id: number;
  name: string;
  company: string;
  phone: string;
  type: 'convidado' | 'visitante';
  bni_group: string;
  check_in_time: string;
}

declare global {
  // eslint-disable-next-line no-var
  var __bni_db: any;
}

export function getDb() {
  if (global.__bni_db) {
    return global.__bni_db;
  }

  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, 'bni.db');
  const { DatabaseSync } = getSqlite();
  const db = new DatabaseSync(dbPath);

  // Habilitar WAL mode e Foreign Keys
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');

  // Inicializar tabelas
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      password TEXT NOT NULL,
      company TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS assemblies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meeting_number TEXT NOT NULL,
      location TEXT NOT NULL,
      meeting_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      created_at TEXT NOT NULL,
      closed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS member_attendances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      assembly_id INTEGER NOT NULL,
      member_id INTEGER NOT NULL,
      check_in_time TEXT NOT NULL,
      UNIQUE(assembly_id, member_id),
      FOREIGN KEY (assembly_id) REFERENCES assemblies(id) ON DELETE CASCADE,
      FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS visitor_attendances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      assembly_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      company TEXT NOT NULL,
      phone TEXT NOT NULL,
      type TEXT NOT NULL,
      bni_group TEXT DEFAULT '',
      check_in_time TEXT NOT NULL,
      FOREIGN KEY (assembly_id) REFERENCES assemblies(id) ON DELETE CASCADE
    );
  `);

  // Configurar senha padrão do administrador caso não exista
  const defaultAdminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const checkSetting = db.prepare('SELECT value FROM settings WHERE key = ?').get('admin_password');
  if (!checkSetting) {
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('admin_password', defaultAdminPassword);
  }

  global.__bni_db = db;
  return db;
}

export function formatTimeNow(): string {
  const now = new Date();
  return now.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'America/Sao_Paulo',
  });
}

export function formatDateISO(): string {
  const now = new Date();
  return now.toISOString();
}
