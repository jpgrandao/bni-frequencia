'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users,
  Building2,
  Phone,
  User,
  Globe,
  CheckCircle2,
  AlertCircle,
  Calendar,
  MapPin,
  RefreshCw,
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

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export default function PresencaVisitantePage() {
  const [assembly, setAssembly] = useState<ActiveAssembly | null>(null);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [isVisitor, setIsVisitor] = useState(false);
  const [bniGroup, setBniGroup] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [confirmation, setConfirmation] = useState<{
    name: string;
    type: 'convidado' | 'visitante';
    bniGroup: string;
    checkInTime: string;
    message: string;
  } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/public/active-assembly');
      const data = await res.json();
      setAssembly(data.assembly || null);
    } catch {
      setErrorMsg('Erro ao carregar dados da assembleia.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim() || !company.trim() || !phone.trim()) {
      setErrorMsg('Por favor, preencha seu Nome, Empresa e Telefone.');
      return;
    }

    if (isVisitor && !bniGroup.trim()) {
      setErrorMsg('Por favor, informe de qual outro grupo BNI você faz parte.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/attendance/visitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          company: company.trim(),
          phone: phone.trim(),
          type: isVisitor ? 'visitante' : 'convidado',
          bniGroup: isVisitor ? bniGroup.trim() : '',
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Não foi possível registrar presença.');
        return;
      }

      setConfirmation({
        name: data.name,
        type: data.type,
        bniGroup: data.bniGroup,
        checkInTime: data.checkInTime,
        message: data.message,
      });
    } catch {
      setErrorMsg('Erro de conexão ao registrar presença.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setConfirmation(null);
    setName('');
    setCompany('');
    setPhone('');
    setIsVisitor(false);
    setBniGroup('');
    setErrorMsg('');
  };

  if (loading) {
    return (
      <div className="max-w-xl mx-auto bg-white rounded-2xl border border-slate-200 p-8 shadow-sm text-center">
        <div className="w-10 h-10 border-4 border-bni-red border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-slate-600 text-sm">Carregando dados da assembleia...</p>
      </div>
    );
  }

  if (!assembly) {
    return (
      <div className="max-w-xl mx-auto bg-white rounded-2xl border border-slate-200 p-8 shadow-sm text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">
          Nenhuma Assembleia Aberta
        </h1>
        <p className="text-slate-600 text-sm max-w-md mx-auto">
          No momento não há uma assembleia aberta para registro de presença. Solicite ao administrador para abrir a reunião.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={loadData}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-sm font-semibold transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </button>
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-bni-red hover:bg-bni-darkred text-white rounded-xl text-sm font-semibold transition-colors"
          >
            Ir para Administração
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Cabeçalho da Assembleia Ativa */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            Reunião #{assembly.meeting_number} Aberta
          </span>
          <h1 className="text-xl font-extrabold text-slate-900 mt-1.5 flex items-center gap-2">
            <Users className="w-5 h-5 text-bni-red" />
            Presença de Visitante ou Convidado
          </h1>
        </div>
        <div className="text-xs sm:text-right text-slate-600 space-y-1">
          <div className="flex sm:justify-end items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-bni-red shrink-0" />
            <span className="font-medium">{assembly.location}</span>
          </div>
          <div className="flex sm:justify-end items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-bni-red shrink-0" />
            <span>{formatPtBrDate(assembly.meeting_date)}</span>
          </div>
        </div>
      </div>

      {/* Tela de Sucesso / Confirmação */}
      {confirmation ? (
        <div className="bg-white rounded-2xl border-2 border-emerald-500 p-8 shadow-md text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-700">
              {confirmation.type === 'visitante'
                ? `Visitante • ${confirmation.bniGroup}`
                : 'Convidado Confirmado'}
            </span>
            <h2 className="text-2xl font-extrabold text-slate-900">
              Bem-vindo(a), {confirmation.name}!
            </h2>
            <p className="text-slate-600 text-sm">{confirmation.message}</p>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 inline-block mx-auto min-w-[220px]">
            <span className="text-xs text-slate-500 block">Horário de Entrada</span>
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              {confirmation.checkInTime}
            </span>
          </div>

          <div className="pt-2">
            <button
              onClick={handleReset}
              className="w-full py-3 px-6 bg-bni-red hover:bg-bni-darkred text-white font-bold rounded-xl shadow-sm transition-colors"
            >
              Registrar Outro Visitante ou Convidado
            </button>
          </div>
        </div>
      ) : (
        /* Formulário de Visitante / Convidado */
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-5"
        >
          {/* Campo 1: Nome */}
          <div className="space-y-1.5">
            <label htmlFor="visitor-name" className="block text-sm font-bold text-slate-800">
              Seu Nome Completo *
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="visitor-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Carlos Alberto Souza"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-bni-red focus:border-bni-red"
              />
            </div>
          </div>

          {/* Campo 2: Empresa */}
          <div className="space-y-1.5">
            <label htmlFor="visitor-company" className="block text-sm font-bold text-slate-800">
              Empresa / Especialidade *
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="visitor-company"
                type="text"
                required
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Ex.: Souza Arquitetura e Interiores"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-bni-red focus:border-bni-red"
              />
            </div>
          </div>

          {/* Campo 3: Telefone */}
          <div className="space-y-1.5">
            <label htmlFor="visitor-phone" className="block text-sm font-bold text-slate-800">
              Telefone / WhatsApp *
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="visitor-phone"
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                placeholder="(11) 99999-9999"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-bni-red focus:border-bni-red"
              />
            </div>
          </div>

          {/* Seleção: Convidado ou Visitante de outro grupo BNI */}
          <div className="pt-2 space-y-3 border-t border-slate-100">
            <label className="block text-sm font-bold text-slate-800">
              Tipo de Participação
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setIsVisitor(false)}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  !isVisitor
                    ? 'border-bni-red bg-bni-lightred text-bni-red ring-1 ring-bni-red'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="font-bold text-sm">Sou Convidado</div>
                <div className="text-xs opacity-80 mt-0.5">
                  Vim conhecer a reunião a convite
                </div>
              </button>

              <button
                type="button"
                onClick={() => setIsVisitor(true)}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  isVisitor
                    ? 'border-bni-red bg-bni-lightred text-bni-red ring-1 ring-bni-red'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="font-bold text-sm">Sou Visitante BNI</div>
                <div className="text-xs opacity-80 mt-0.5">
                  Faço parte de outro grupo BNI
                </div>
              </button>
            </div>

            {/* Checkbox adicional sincronizado para quem preferir clicar na caixa */}
            <label className="inline-flex items-center gap-2.5 cursor-pointer select-none pt-1">
              <input
                type="checkbox"
                checked={isVisitor}
                onChange={(e) => setIsVisitor(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-bni-red focus:ring-bni-red accent-[#C8102E]"
              />
              <span className="text-sm text-slate-700 font-medium">
                Marcar como Visitante (faço parte de outro grupo BNI)
              </span>
            </label>
          </div>

          {/* Campo Condicional: Qual outro grupo BNI faz parte */}
          {isVisitor && (
            <div className="p-4 rounded-xl bg-red-50/60 border border-red-200 space-y-2 transition-all">
              <label
                htmlFor="visitor-bni-group"
                className="block text-sm font-bold text-bni-red"
              >
                De qual outro grupo BNI você faz parte? *
              </label>
              <div className="relative">
                <Globe className="w-4 h-4 text-bni-red absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="visitor-bni-group"
                  type="text"
                  required={isVisitor}
                  value={bniGroup}
                  onChange={(e) => setBniGroup(e.target.value)}
                  placeholder="Ex.: BNI Alpha / BNI Diamante..."
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-red-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-bni-red focus:border-bni-red"
                />
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 px-6 bg-bni-red hover:bg-bni-darkred disabled:bg-slate-300 text-white font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 text-base"
          >
            <Users className="w-5 h-5" />
            {submitting ? 'Confirmando Presença...' : 'Confirmar Minha Presença'}
          </button>
        </form>
      )}
    </div>
  );
}
