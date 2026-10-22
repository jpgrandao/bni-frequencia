'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  UserCheck,
  Lock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  MapPin,
  Search,
  RefreshCw,
} from 'lucide-react';

interface ActiveAssembly {
  id: number;
  meeting_number: string;
  location: string;
  meeting_date: string;
  status: 'open' | 'closed';
}

interface PublicMember {
  id: number;
  name: string;
  company: string;
  checkedIn: boolean;
}

function formatPtBrDate(isoDate: string): string {
  if (!isoDate) return '';
  const parts = isoDate.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return isoDate;
}

export default function PresencaMembroPage() {
  const [assembly, setAssembly] = useState<ActiveAssembly | null>(null);
  const [members, setMembers] = useState<PublicMember[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [confirmation, setConfirmation] = useState<{
    memberName: string;
    checkInTime: string;
    alreadyCheckedIn: boolean;
    message: string;
  } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/public/active-assembly');
      const data = await res.json();
      setAssembly(data.assembly || null);
      setMembers(data.members || []);
    } catch {
      setErrorMsg('Erro ao carregar dados da assembleia.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredMembers = members.filter((m) =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.company && m.company.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const selectedMember = members.find((m) => String(m.id) === selectedMemberId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedMemberId) {
      setErrorMsg('Por favor, selecione o seu nome na lista.');
      return;
    }
    if (!password.trim()) {
      setErrorMsg('Por favor, digite a sua senha para confirmar presença.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/attendance/member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: Number(selectedMemberId),
          password: password.trim(),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Não foi possível registrar presença.');
        return;
      }

      setConfirmation({
        memberName: data.memberName,
        checkInTime: data.checkInTime,
        alreadyCheckedIn: data.alreadyCheckedIn,
        message: data.message,
      });
      setPassword('');
      loadData();
    } catch {
      setErrorMsg('Erro de conexão ao registrar presença.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setConfirmation(null);
    setSelectedMemberId('');
    setPassword('');
    setSearchTerm('');
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
            <UserCheck className="w-5 h-5 text-bni-red" />
            Presença do Membro
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
              {confirmation.alreadyCheckedIn ? 'Registro já efetuado' : 'Presença Confirmada'}
            </span>
            <h2 className="text-2xl font-extrabold text-slate-900">
              Olá, {confirmation.memberName}!
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
              Confirmar Outro Membro
            </button>
          </div>
        </div>
      ) : (
        /* Formulário de Seleção de Membro e Senha */
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6"
        >
          {members.length === 0 ? (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
              Nenhum membro cadastrado ainda. Acesse a{' '}
              <Link href="/admin" className="underline font-bold">
                Área do Administrador
              </Link>{' '}
              para importar ou cadastrar a lista de membros.
            </div>
          ) : (
            <>
              {/* Passo 1: Escolher o nome */}
              <div className="space-y-3">
                <label className="block text-sm font-bold text-slate-800">
                  1. Escolha o seu nome na lista
                </label>

                {/* Filtro rápido de busca */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Pesquisar seu nome ou empresa..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-bni-red focus:border-bni-red"
                  />
                </div>

                {/* Select / Lista Interativa de Membros */}
                <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-slate-50/50">
                  {filteredMembers.length === 0 ? (
                    <div className="p-4 text-center text-sm text-slate-500">
                      Nenhum membro encontrado com &ldquo;{searchTerm}&rdquo;.
                    </div>
                  ) : (
                    filteredMembers.map((member) => {
                      const isSelected = String(member.id) === selectedMemberId;
                      return (
                        <button
                          key={member.id}
                          type="button"
                          onClick={() => {
                            setSelectedMemberId(String(member.id));
                            setErrorMsg('');
                          }}
                          className={`w-full text-left px-4 py-3 flex items-center justify-between transition-colors ${
                            isSelected
                              ? 'bg-bni-lightred text-bni-red font-bold'
                              : 'hover:bg-white text-slate-800'
                          }`}
                        >
                          <div>
                            <div className="text-sm font-semibold">{member.name}</div>
                            {member.company && (
                              <div className="text-xs text-slate-500">{member.company}</div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {member.checkedIn && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700">
                                <CheckCircle2 className="w-3 h-3" />
                                Presente
                              </span>
                            )}
                            <div
                              className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                isSelected
                                  ? 'border-bni-red bg-bni-red text-white'
                                  : 'border-slate-300'
                              }`}
                            >
                              {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Passo 2: Senha de confirmação */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label
                  htmlFor="member-password"
                  className="block text-sm font-bold text-slate-800"
                >
                  2. Digite sua senha para confirmar a presença
                </label>
                {selectedMember && (
                  <p className="text-xs text-slate-600">
                    Membro selecionado:{' '}
                    <strong className="text-bni-red">{selectedMember.name}</strong>
                  </p>
                )}
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="member-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Digite sua senha"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-bni-red focus:border-bni-red"
                  />
                </div>
              </div>

              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || !selectedMemberId}
                className="w-full py-3.5 px-6 bg-bni-red hover:bg-bni-darkred disabled:bg-slate-300 text-white font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 text-base"
              >
                <UserCheck className="w-5 h-5" />
                {submitting ? 'Confirmando Presença...' : 'Confirmar Minha Presença'}
              </button>
            </>
          )}
        </form>
      )}
    </div>
  );
}
