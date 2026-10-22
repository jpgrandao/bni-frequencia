'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  UserCheck,
  Users,
  ShieldCheck,
  Calendar,
  MapPin,
  Hash,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface ActiveAssembly {
  id: number;
  meeting_number: string;
  location: string;
  meeting_date: string;
  status: 'open' | 'closed';
}

function formatPtBrDate(isoDate: string): string {
  if (!isoDate) return '';
  const parts = isoDate.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return isoDate;
}

export default function HomePage() {
  const [assembly, setAssembly] = useState<ActiveAssembly | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/public/active-assembly')
      .then((res) => res.json())
      .then((data) => {
        setAssembly(data.assembly || null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      {/* Banner de Status da Assembleia Atual */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        {loading ? (
          <div className="animate-pulse flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-200" />
            <div className="space-y-2 flex-1">
              <div className="h-5 bg-slate-200 rounded w-1/3" />
              <div className="h-4 bg-slate-100 rounded w-1/2" />
            </div>
          </div>
        ) : assembly ? (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                Assembleia Aberta para Presença
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                Reunião #{assembly.meeting_number}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-bni-red" />
                  <strong>Local:</strong> {assembly.location}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-bni-red" />
                  <strong>Data:</strong> {formatPtBrDate(assembly.meeting_date)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/presenca-membro"
                className="px-4 py-2.5 bg-bni-red hover:bg-bni-darkred text-white font-semibold rounded-xl text-sm shadow-sm transition-colors"
              >
                Sou Membro
              </Link>
              <Link
                href="/presenca-visitante"
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-sm shadow-sm transition-colors"
              >
                Sou Visitante / Convidado
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 mt-0.5">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Nenhuma Assembleia Aberta no Momento
                </h2>
                <p className="text-sm text-slate-600 mt-0.5">
                  Para iniciar o registro de presenças, acesse a Área do Administrador e abra uma assembleia/reunião.
                </p>
              </div>
            </div>
            <Link
              href="/admin"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-bni-red hover:bg-bni-darkred text-white font-semibold rounded-xl text-sm shadow-sm transition-colors shrink-0"
            >
              <ShieldCheck className="w-4 h-4" />
              Abrir Assembleia no Admin
            </Link>
          </div>
        )}
      </div>

      {/* Cards de Acesso Rápido */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Membro */}
        <Link
          href="/presenca-membro"
          className="group bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md hover:border-bni-red transition-all flex flex-col justify-between"
        >
          <div>
            <div className="w-14 h-14 rounded-2xl bg-bni-lightred text-bni-red flex items-center justify-center mb-5 group-hover:bg-bni-red group-hover:text-white transition-colors">
              <UserCheck className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 group-hover:text-bni-red transition-colors">
              Presença do Membro
            </h2>
            <p className="text-sm text-slate-600 mt-2 leading-relaxed">
              Escolha o seu nome na lista de membros do grupo e confirme sua presença com a sua senha.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-sm font-semibold text-bni-red">
            <span>Confirmar presença de membro</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Card 2: Visitante ou Convidado */}
        <Link
          href="/presenca-visitante"
          className="group bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md hover:border-bni-red transition-all flex flex-col justify-between"
        >
          <div>
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-5 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Users className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
              Visitante ou Convidado
            </h2>
            <p className="text-sm text-slate-600 mt-2 leading-relaxed">
              Informe seu nome, empresa, telefone e, caso seja visitante de outro grupo BNI, informe seu grupo de origem.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-sm font-semibold text-blue-600">
            <span>Registrar como visitante/convidado</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Card 3: Administrador */}
        <Link
          href="/admin"
          className="group bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md hover:border-slate-900 transition-all flex flex-col justify-between"
        >
          <div>
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-800 flex items-center justify-center mb-5 group-hover:bg-slate-900 group-hover:text-white transition-colors">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              Área do Administrador
            </h2>
            <p className="text-sm text-slate-600 mt-2 leading-relaxed">
              Importe a lista de membros via Excel, abra ou feche assembleias e baixe a planilha completa de presença.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-sm font-semibold text-slate-800">
            <span>Acessar painel administrativo</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>
    </div>
  );
}
