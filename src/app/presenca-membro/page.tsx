'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  UserCheck,
  User,
  Users,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Calendar,
  MapPin,
  Search,
  RefreshCw,
  Clock,
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

function getCurrentTimeFormatted(): string {
  const now = new Date();
  return now.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'America/Sao_Paulo',
  });
}

export default function PresencaMembroPage() {
  const [assembly, setAssembly] = useState<ActiveAssembly | null>(null);
  const [members, setMembers] = useState<PublicMember[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [isSubstitute, setIsSubstitute] = useState(false);
  const [substituteName, setSubstituteName] = useState('');
  const [last3Digits, setLast3Digits] = useState('');
  const [checkInTime, setCheckInTime] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const digitsInputRef = useRef<HTMLInputElement | null>(null);
  const substituteInputRef = useRef<HTMLInputElement | null>(null);

  const [confirmation, setConfirmation] = useState<{
    memberName: string;
    isSubstitute?: boolean;
    substituteName?: string;
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
    setCheckInTime(getCurrentTimeFormatted());
  }, []);

  const filteredMembers = members.filter(
    (m) =>
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.company && m.company.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const selectedMember = members.find((m) => String(m.id) === selectedMemberId);

  const handleSelectMember = (id: number) => {
    setSelectedMemberId(String(id));
    setErrorMsg('');
    setTimeout(() => {
      if (isSubstitute) {
        substituteInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        substituteInputRef.current?.focus();
      } else {
        digitsInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        digitsInputRef.current?.focus();
      }
    }, 100);
  };

  const handleToggleSubstitute = (substituteMode: boolean) => {
    setIsSubstitute(substituteMode);
    setErrorMsg('');
    setTimeout(() => {
      if (substituteMode) {
        substituteInputRef.current?.focus();
      } else {
        digitsInputRef.current?.focus();
      }
    }, 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedMemberId) {
      setErrorMsg('Por favor, selecione o membro na lista.');
      return;
    }

    if (isSubstitute) {
      if (!substituteName.trim()) {
        setErrorMsg('Por favor, informe o seu nome completo como substituto.');
        substituteInputRef.current?.focus();
        return;
      }
    } else {
      const cleanDigits = last3Digits.replace(/\D/g, '');
      if (cleanDigits.length < 3) {
        setErrorMsg('Por favor, digite os 3 últimos dígitos do seu celular.');
        digitsInputRef.current?.focus();
        return;
      }
    }

    if (!checkInTime.trim()) {
      setErrorMsg('Por favor, informe o horário de chegada.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/attendance/member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: Number(selectedMemberId),
          isSubstitute,
          substituteName: isSubstitute ? substituteName.trim() : '',
          password: isSubstitute ? '' : last3Digits.replace(/\D/g, ''),
          checkInTime: checkInTime.trim(),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Não foi possível registrar presença.');
        return;
      }

      setConfirmation({
        memberName: data.memberName,
        isSubstitute: data.isSubstitute,
        substituteName: data.substituteName,
        checkInTime: data.checkInTime,
        alreadyCheckedIn: data.alreadyCheckedIn,
        message: data.message,
      });
      setLast3Digits('');
      setSubstituteName('');
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
    setLast3Digits('');
    setSubstituteName('');
    setIsSubstitute(false);
    setSearchTerm('');
    setErrorMsg('');
    setCheckInTime(getCurrentTimeFormatted());
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
      <div className="max-w-xl mx-auto bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
          Nenhuma Assembleia Aberta
        </h1>
        <p className="text-slate-600 text-sm max-w-md mx-auto">
          No momento não há uma assembleia aberta para registro de presença. Solicite ao administrador para abrir a reunião.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={loadData}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-sm font-semibold transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </button>
          <Link
            href="/admin"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-3 bg-bni-red hover:bg-bni-darkred text-white rounded-xl text-sm font-semibold transition-colors"
          >
            Ir para Administração
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-4 sm:space-y-6">
      {/* Cabeçalho da Assembleia Ativa */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            Reunião #{assembly.meeting_number} Aberta
          </span>
          <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 mt-1.5 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-bni-red shrink-0" />
            Presença de Membro / Substituto
          </h1>
        </div>
        <div className="flex sm:flex-col flex-wrap items-center sm:items-end gap-3 sm:gap-1 text-xs text-slate-600">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-bni-red shrink-0" />
            <span className="font-medium">{assembly.location}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-bni-red shrink-0" />
            <span>{formatPtBrDate(assembly.meeting_date)}</span>
          </div>
        </div>
      </div>

      {/* Tela de Sucesso / Confirmação */}
      {confirmation ? (
        <div className="bg-white rounded-2xl border-2 border-emerald-500 p-6 sm:p-8 shadow-md text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-700">
              {confirmation.alreadyCheckedIn
                ? 'Registro já efetuado'
                : confirmation.isSubstitute
                ? 'Presença Confirmada (Substituto)'
                : 'Presença Confirmada'}
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
              {confirmation.isSubstitute ? (
                <>Substituto(a): {confirmation.substituteName}</>
              ) : (
                <>Olá, {confirmation.memberName}!</>
              )}
            </h2>
            {confirmation.isSubstitute && (
              <p className="text-sm font-semibold text-bni-red">
                Representando o membro: <strong>{confirmation.memberName}</strong>
              </p>
            )}
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
              className="w-full py-3.5 px-6 bg-bni-red hover:bg-bni-darkred text-white font-bold rounded-xl shadow-sm transition-colors text-base"
            >
              Registrar Outra Presença
            </button>
          </div>
        </div>
      ) : (
        /* Formulário de Presença */
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-8 shadow-sm space-y-6"
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
              {/* Seleção do Tipo: Membro Próprio ou Substituto */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Tipo de Presença
                </label>
                <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => handleToggleSubstitute(false)}
                    className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                      !isSubstitute
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <User className="w-4 h-4 text-bni-red" />
                    Sou o Membro
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleSubstitute(true)}
                    className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                      isSubstitute
                        ? 'bg-white text-bni-red shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Users className="w-4 h-4 text-bni-red" />
                    Sou um Substituto
                  </button>
                </div>
              </div>

              {/* Passo 1: Escolher o membro */}
              <div className="space-y-3 pt-1">
                <label className="block text-sm font-bold text-slate-800">
                  1. {isSubstitute ? 'Selecione o membro que você está substituindo' : 'Escolha o seu nome na lista'}
                </label>

                {/* Filtro rápido de busca */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Pesquisar nome do membro ou empresa..."
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-bni-red focus:border-bni-red"
                  />
                </div>

                {/* Lista Interativa de Membros */}
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
                          onClick={() => handleSelectMember(member.id)}
                          className={`w-full text-left px-4 py-3.5 flex items-center justify-between gap-2 transition-colors ${
                            isSelected
                              ? 'bg-bni-lightred text-bni-red font-bold'
                              : 'hover:bg-white text-slate-800'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-sm sm:text-base font-semibold truncate">
                              {member.name}
                            </div>
                            {member.company && (
                              <div className="text-xs text-slate-500 truncate">
                                {member.company}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {member.checkedIn && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700">
                                <CheckCircle2 className="w-3 h-3" />
                                Presente
                              </span>
                            )}
                            <div
                              className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                                isSelected
                                  ? 'border-bni-red bg-bni-red text-white'
                                  : 'border-slate-300'
                              }`}
                            >
                              {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Passo 2: Verificação do Membro OU Nome do Substituto */}
              {!isSubstitute ? (
                /* Modo Membro: 3 últimos dígitos */
                <div className="space-y-2.5 pt-3 border-t border-slate-100">
                  <label
                    htmlFor="member-digits"
                    className="block text-sm font-bold text-slate-800"
                  >
                    2. Digite os 3 últimos dígitos do seu celular
                  </label>
                  {selectedMember ? (
                    <p className="text-xs text-slate-600">
                      Membro selecionado:{' '}
                      <strong className="text-bni-red">{selectedMember.name}</strong>
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500">
                      Selecione seu nome acima e informe os 3 números finais do seu telefone.
                    </p>
                  )}
                  <div className="relative">
                    <Smartphone className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      ref={digitsInputRef}
                      id="member-digits"
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={3}
                      value={last3Digits}
                      onChange={(e) =>
                        setLast3Digits(e.target.value.replace(/\D/g, '').slice(0, 3))
                      }
                      placeholder="Ex: 766"
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-slate-300 text-lg font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-bni-red focus:border-bni-red"
                    />
                  </div>
                </div>
              ) : (
                /* Modo Substituto: Nome do Substituto */
                <div className="space-y-2.5 pt-3 border-t border-slate-100">
                  <label
                    htmlFor="substitute-name"
                    className="block text-sm font-bold text-slate-800"
                  >
                    2. Nome completo do substituto
                  </label>
                  {selectedMember ? (
                    <p className="text-xs text-slate-600">
                      Substituindo o membro:{' '}
                      <strong className="text-bni-red">{selectedMember.name}</strong>
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500">
                      Informe o seu nome completo para constar na lista de presença como substituto.
                    </p>
                  )}
                  <div className="relative">
                    <User className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      ref={substituteInputRef}
                      id="substitute-name"
                      type="text"
                      value={substituteName}
                      onChange={(e) => setSubstituteName(e.target.value)}
                      placeholder="Digite o seu nome completo"
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-slate-300 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-bni-red focus:border-bni-red"
                    />
                  </div>
                </div>
              )}

              {/* Passo 3: Horário de Chegada (Editável) */}
              <div className="space-y-2 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="check-in-time"
                    className="block text-sm font-bold text-slate-800"
                  >
                    3. Horário de Chegada na Reunião
                  </label>
                  <button
                    type="button"
                    onClick={() => setCheckInTime(getCurrentTimeFormatted())}
                    className="text-xs font-bold text-bni-red hover:underline flex items-center gap-1"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    Horário Atual
                  </button>
                </div>
                <div className="relative">
                  <Clock className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="check-in-time"
                    type="text"
                    value={checkInTime}
                    onChange={(e) => setCheckInTime(e.target.value)}
                    placeholder="Ex.: 06:30:00 ou 06:30"
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 text-base font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-bni-red focus:border-bni-red"
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  Horário padrão preenchido automaticamente. Se chegou mais cedo, você pode alterar livremente.
                </p>
              </div>

              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={
                  submitting ||
                  !selectedMemberId ||
                  (isSubstitute ? !substituteName.trim() : last3Digits.length < 3) ||
                  !checkInTime.trim()
                }
                className="w-full py-4 px-6 bg-bni-red hover:bg-bni-darkred disabled:bg-slate-300 text-white font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 text-base"
              >
                <UserCheck className="w-5 h-5" />
                {submitting
                  ? 'Confirmando Presença...'
                  : isSubstitute
                  ? 'Confirmar Presença como Substituto'
                  : 'Confirmar Minha Presença'}
              </button>
            </>
          )}
        </form>
      )}
    </div>
  );
}
