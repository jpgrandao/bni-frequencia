'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users,
  Building2,
  Phone,
  User,
  UserCheck,
  Globe,
  CheckCircle2,
  AlertCircle,
  Calendar,
  MapPin,
  RefreshCw,
  Search,
} from 'lucide-react';

interface ActiveAssembly {
  id: number;
  meeting_number: string;
  location: string;
  meeting_date: string;
  status: 'open' | 'closed';
  access_token?: string;
}

interface MemberOption {
  id: number;
  name: string;
  company: string;
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
  const [assemblyToken, setAssemblyToken] = useState<string>('');
  const [invalidUrlToken, setInvalidUrlToken] = useState(false);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [searchingMembers, setSearchingMembers] = useState(false);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [isVisitor, setIsVisitor] = useState(false);
  const [bniGroup, setBniGroup] = useState('');

  // Convidado por (busca por 2+ letras ou nome livre)
  const [invitedBySearch, setInvitedBySearch] = useState('');
  const [selectedInviter, setSelectedInviter] = useState<string>('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [confirmation, setConfirmation] = useState<{
    name: string;
    type: 'convidado' | 'visitante';
    bniGroup: string;
    invitedBy: string;
    checkInTime: string;
    message: string;
  } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const urlParams =
        typeof window !== 'undefined'
          ? new URLSearchParams(window.location.search)
          : new URLSearchParams();
      const urlToken = (urlParams.get('t') || urlParams.get('token') || '').trim();

      const res = await fetch('/api/public/active-assembly');
      const data = await res.json();
      const active: ActiveAssembly | null = data.assembly || null;
      setAssembly(active);

      if (active?.access_token) {
        if (urlToken && urlToken !== active.access_token) {
          setInvalidUrlToken(true);
          setAssemblyToken('');
        } else {
          setInvalidUrlToken(false);
          setAssemblyToken(active.access_token);
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('bni_assembly_token', active.access_token);
            if (!urlToken) {
              const newUrl = `${window.location.pathname}?t=${encodeURIComponent(active.access_token)}`;
              window.history.replaceState(null, '', newUrl);
            }
          }
        }
      } else {
        setAssemblyToken('');
      }
    } catch {
      setErrorMsg('Erro ao carregar dados da assembleia.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const cleanSearch = invitedBySearch.trim();
    if (!assembly || !assemblyToken || cleanSearch.length < 2 || selectedInviter === cleanSearch) {
      setMembers([]);
      setSearchingMembers(false);
      return;
    }

    let cancelled = false;
    setSearchingMembers(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/public/active-assembly?t=${encodeURIComponent(assemblyToken)}&q=${encodeURIComponent(cleanSearch)}`
        );
        const data = await res.json();
        if (!cancelled) {
          setMembers(data.members || []);
        }
      } catch {
        if (!cancelled) {
          setMembers([]);
        }
      } finally {
        if (!cancelled) {
          setSearchingMembers(false);
        }
      }
    }, 200);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [invitedBySearch, assembly, assemblyToken, selectedInviter]);

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

    const finalInvitedBy = (selectedInviter || invitedBySearch).trim();

    if (!finalInvitedBy || finalInvitedBy.length < 2) {
      setErrorMsg('Por favor, informe o nome do membro que o convidou.');
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
          invitedBy: finalInvitedBy,
          token: assemblyToken,
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
        invitedBy: data.invitedBy || finalInvitedBy,
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
    setInvitedBySearch('');
    setSelectedInviter('');
    setMembers([]);
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

  if (invalidUrlToken) {
    return (
      <div className="max-w-xl mx-auto bg-white rounded-2xl border border-amber-200 p-6 sm:p-8 shadow-sm text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
          QR Code de Reunião Anterior
        </h1>
        <p className="text-slate-600 text-sm max-w-md mx-auto">
          O link ou QR Code utilizado pertence a outra reunião. Clique abaixo para acessar a{' '}
          <strong>Reunião #{assembly.meeting_number}</strong> que está aberta agora.
        </p>
        <div className="pt-2">
          <button
            type="button"
            onClick={() => {
              if (assembly.access_token) {
                setInvalidUrlToken(false);
                setAssemblyToken(assembly.access_token);
                const newUrl = `${window.location.pathname}?t=${encodeURIComponent(assembly.access_token)}`;
                window.history.replaceState(null, '', newUrl);
              }
            }}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 bg-bni-red hover:bg-bni-darkred text-white rounded-xl text-sm font-bold transition-colors"
          >
            Acessar Reunião #{assembly.meeting_number} Agora
          </button>
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
            <Users className="w-5 h-5 text-bni-red shrink-0" />
            Presença de Visitante ou Convidado
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
              {confirmation.type === 'visitante'
                ? `Visitante • ${confirmation.bniGroup}`
                : 'Convidado Confirmado'}
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
              Bem-vindo(a), {confirmation.name}!
            </h2>
            {confirmation.invitedBy && (
              <p className="text-sm font-semibold text-slate-700">
                Convidado(a) por:{' '}
                <strong className="text-bni-red">{confirmation.invitedBy}</strong>
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
              Registrar Outro Visitante ou Convidado
            </button>
          </div>
        </div>
      ) : (
        /* Formulário de Visitante / Convidado */
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-8 shadow-sm space-y-5"
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
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-bni-red focus:border-bni-red"
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
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-bni-red focus:border-bni-red"
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
                inputMode="tel"
                required
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                placeholder="(48) 99999-9999"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-bni-red focus:border-bni-red"
              />
            </div>
          </div>

          {/* Campo 4: Membro que o convidou (busca protegida por mínimo de 2 letras) */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <label htmlFor="invited-by-input" className="block text-sm font-bold text-slate-800">
              Membro que o convidou *
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="invited-by-input"
                type="text"
                required
                value={invitedBySearch}
                onChange={(e) => {
                  setInvitedBySearch(e.target.value);
                  setSelectedInviter('');
                }}
                placeholder="Digite pelo menos 2 letras do nome de quem convidou..."
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 text-base sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-bni-red focus:border-bni-red"
              />
            </div>

            {selectedInviter && (
              <div className="p-2.5 rounded-xl bg-bni-lightred border border-red-200 flex items-center justify-between gap-2 text-xs">
                <span className="text-slate-800">
                  Convidado por: <strong className="text-bni-red">{selectedInviter}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedInviter('');
                    setInvitedBySearch('');
                  }}
                  className="font-bold text-bni-red hover:underline"
                >
                  Alterar
                </button>
              </div>
            )}

            {!selectedInviter && invitedBySearch.trim().length >= 2 && (
              <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-slate-50/50">
                {searchingMembers ? (
                  <div className="p-3 text-center text-xs text-slate-500">
                    Buscando membros...
                  </div>
                ) : (
                  <>
                    {members.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setSelectedInviter(m.name);
                          setInvitedBySearch(m.name);
                          setMembers([]);
                        }}
                        className="w-full text-left px-3.5 py-2.5 hover:bg-white flex items-center justify-between gap-2 text-xs sm:text-sm transition-colors"
                      >
                        <div>
                          <span className="font-semibold text-slate-900">{m.name}</span>
                          {m.company && (
                            <span className="text-slate-500 ml-1.5 text-xs">({m.company})</span>
                          )}
                        </div>
                        <UserCheck className="w-4 h-4 text-bni-red shrink-0" />
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedInviter(invitedBySearch.trim());
                        setMembers([]);
                      }}
                      className="w-full text-left px-3.5 py-2.5 bg-slate-100/70 hover:bg-white text-xs font-semibold text-slate-700 transition-colors"
                    >
                      ➕ Usar nome digitado: &ldquo;{invitedBySearch.trim()}&rdquo;
                    </button>
                  </>
                )}
              </div>
            )}

            <p className="text-[11px] text-slate-500">
              Digite pelo menos 2 letras para buscar na lista de membros ou informe o nome de quem te convidou.
            </p>
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

            {/* Checkbox adicional sincronizado */}
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
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-red-300 bg-white text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-bni-red focus:border-bni-red"
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
            className="w-full py-4 px-6 bg-bni-red hover:bg-bni-darkred disabled:bg-slate-300 text-white font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 text-base"
          >
            <Users className="w-5 h-5" />
            {submitting ? 'Confirmando Presença...' : 'Confirmar Minha Presença'}
          </button>
        </form>
      )}
    </div>
  );
}
