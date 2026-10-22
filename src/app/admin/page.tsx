'use client';

import { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Calendar,
  MapPin,
  Hash,
  Download,
  Upload,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Users,
  UserCheck,
  FileSpreadsheet,
  RefreshCw,
  LogOut,
  Lock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Pencil,
  Clock,
  X,
} from 'lucide-react';

interface AssemblyRow {
  id: number;
  meeting_number: string;
  location: string;
  meeting_date: string;
  status: 'open' | 'closed';
  member_count: number;
  visitor_total_count: number;
  visitante_count: number;
  convidado_count: number;
}

interface MemberRow {
  id: number;
  name: string;
  password: string;
  company: string;
  phone: string;
  active: number;
}

interface DetailedAttendance {
  assembly: AssemblyRow;
  memberAttendances: {
    id: number;
    member_id: number;
    member_name: string;
    member_company: string;
    check_in_time: string;
  }[];
  visitorAttendances: {
    id: number;
    name: string;
    company: string;
    phone: string;
    type: 'convidado' | 'visitante';
    bni_group: string;
    check_in_time: string;
  }[];
  allMembers: MemberRow[];
}

function formatPtBrDate(isoDate: string): string {
  if (!isoDate) return '';
  const parts = isoDate.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return isoDate;
}

function getTodayISO(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState<'assemblies' | 'members'>('assemblies');

  // Estado de Assembleias
  const [assemblies, setAssemblies] = useState<AssemblyRow[]>([]);
  const [totalActiveMembers, setTotalActiveMembers] = useState(0);
  const [loadingAssemblies, setLoadingAssemblies] = useState(false);

  // Formulário Nova Assembleia
  const [meetingNumber, setMeetingNumber] = useState('');
  const [location, setLocation] = useState('');
  const [meetingDate, setMeetingDate] = useState(getTodayISO());
  const [initialStatus, setInitialStatus] = useState<'open' | 'closed'>('open');
  const [creatingAssembly, setCreatingAssembly] = useState(false);

  // Detalhes de uma Assembleia selecionada
  const [selectedAssemblyId, setSelectedAssemblyId] = useState<number | null>(null);
  const [assemblyDetail, setAssemblyDetail] = useState<DetailedAttendance | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Estado de Membros
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [showPasswords, setShowPasswords] = useState(true);
  const [memberSearch, setMemberSearch] = useState('');

  // Formulário Novo Membro Manual
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberPassword, setNewMemberPassword] = useState('');
  const [newMemberCompany, setNewMemberCompany] = useState('');
  const [newMemberPhone, setNewMemberPhone] = useState('');

  // Importação Excel
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [importingExcel, setImportingExcel] = useState(false);

  // Edição de Membro
  const [editingMember, setEditingMember] = useState<MemberRow | null>(null);
  const [editMemberName, setEditMemberName] = useState('');
  const [editMemberPhone, setEditMemberPhone] = useState('');
  const [editMemberCompany, setEditMemberCompany] = useState('');
  const [editMemberPassword, setEditMemberPassword] = useState('');
  const [savingMember, setSavingMember] = useState(false);

  // Edição de Horário de Chegada na Assembleia
  const [editingTimeData, setEditingTimeData] = useState<{
    type: 'member' | 'visitor';
    assemblyId: number;
    memberId?: number;
    attendanceId?: number;
    name: string;
    currentTime: string;
  } | null>(null);
  const [inputCheckInTime, setInputCheckInTime] = useState('');
  const [savingTime, setSavingTime] = useState(false);

  // Mensagens de feedback
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  useEffect(() => {
    const savedAuth = sessionStorage.getItem('bni_admin_auth');
    if (savedAuth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchAssemblies();
      fetchMembers();
    }
  }, [isAuthenticated]);

  const showNotice = (type: 'success' | 'error', text: string) => {
    setFeedback({ type, text });
    setTimeout(() => {
      setFeedback((prev) => (prev?.text === text ? null : prev));
    }, 5000);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error || 'Senha incorreta.');
        return;
      }
      sessionStorage.setItem('bni_admin_auth', 'true');
      setIsAuthenticated(true);
      setLoginPassword('');
    } catch {
      setLoginError('Erro ao autenticar.');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('bni_admin_auth');
    setIsAuthenticated(false);
  };

  const fetchAssemblies = async () => {
    setLoadingAssemblies(true);
    try {
      const res = await fetch('/api/admin/assemblies');
      const data = await res.json();
      setAssemblies(data.assemblies || []);
      setTotalActiveMembers(data.totalActiveMembers || 0);
    } catch {
      showNotice('error', 'Erro ao carregar assembleias.');
    } finally {
      setLoadingAssemblies(false);
    }
  };

  const fetchAssemblyDetail = async (id: number) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/admin/assemblies?id=${id}`);
      const data = await res.json();
      if (res.ok) {
        setAssemblyDetail(data);
      }
    } catch {
      showNotice('error', 'Erro ao carregar detalhes da assembleia.');
    } finally {
      setLoadingDetail(false);
    }
  };

  const fetchMembers = async () => {
    setLoadingMembers(true);
    try {
      const res = await fetch('/api/admin/members');
      const data = await res.json();
      setMembers(data.members || []);
    } catch {
      showNotice('error', 'Erro ao carregar membros.');
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleCreateAssembly = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingNumber.trim() || !location.trim() || !meetingDate.trim()) {
      showNotice('error', 'Preencha Número da Reunião, Local e Data.');
      return;
    }

    setCreatingAssembly(true);
    try {
      const res = await fetch('/api/admin/assemblies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meeting_number: meetingNumber.trim(),
          location: location.trim(),
          meeting_date: meetingDate,
          status: initialStatus,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showNotice('error', data.error || 'Erro ao criar assembleia.');
        return;
      }
      showNotice('success', data.message);
      setMeetingNumber('');
      setLocation('');
      fetchAssemblies();
    } catch {
      showNotice('error', 'Erro ao criar assembleia.');
    } finally {
      setCreatingAssembly(false);
    }
  };

  const handleToggleAssemblyStatus = async (assembly: AssemblyRow) => {
    const newStatus = assembly.status === 'open' ? 'closed' : 'open';
    try {
      const res = await fetch('/api/admin/assemblies', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: assembly.id, status: newStatus }),
      });
      const data = await res.json();
      if (res.ok) {
        showNotice('success', data.message);
        fetchAssemblies();
        if (selectedAssemblyId === assembly.id) {
          fetchAssemblyDetail(assembly.id);
        }
      }
    } catch {
      showNotice('error', 'Erro ao alterar status da assembleia.');
    }
  };

  const handleDeleteAssembly = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir esta assembleia e seus registros de presença?')) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/assemblies?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok) {
        showNotice('success', data.message);
        if (selectedAssemblyId === id) {
          setSelectedAssemblyId(null);
          setAssemblyDetail(null);
        }
        fetchAssemblies();
      }
    } catch {
      showNotice('error', 'Erro ao excluir assembleia.');
    }
  };

  const handleToggleMemberAttendance = async (assemblyId: number, memberId: number) => {
    try {
      const res = await fetch('/api/admin/assemblies', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_member_attendance',
          assemblyId,
          memberId,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showNotice('success', data.message);
        fetchAssemblyDetail(assemblyId);
        fetchAssemblies();
      }
    } catch {
      showNotice('error', 'Erro ao atualizar presença.');
    }
  };

  const handleDeleteVisitorAttendance = async (assemblyId: number, attendanceId: number) => {
    try {
      const res = await fetch('/api/admin/assemblies', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_visitor_attendance',
          attendanceId,
        }),
      });
      if (res.ok) {
        showNotice('success', 'Visitante/Convidado removido.');
        fetchAssemblyDetail(assemblyId);
        fetchAssemblies();
      }
    } catch {
      showNotice('error', 'Erro ao remover registro.');
    }
  };

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim() || (!newMemberPhone.trim() && !newMemberPassword.trim())) {
      showNotice('error', 'Informe o Nome e o Celular (ou os 3 últimos dígitos).');
      return;
    }

    try {
      const res = await fetch('/api/admin/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newMemberName.trim(),
          password: newMemberPassword.trim(),
          company: newMemberCompany.trim(),
          phone: newMemberPhone.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showNotice('error', data.error || 'Erro ao adicionar membro.');
        return;
      }
      showNotice('success', data.message);
      setNewMemberName('');
      setNewMemberPassword('');
      setNewMemberCompany('');
      setNewMemberPhone('');
      fetchMembers();
      fetchAssemblies();
    } catch {
      showNotice('error', 'Erro ao cadastrar membro.');
    }
  };

  const handleSeedSampleMembers = async () => {
    try {
      const res = await fetch('/api/admin/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'seed_sample' }),
      });
      const data = await res.json();
      if (res.ok) {
        showNotice('success', data.message);
        fetchMembers();
        fetchAssemblies();
      }
    } catch {
      showNotice('error', 'Erro ao carregar membros de exemplo.');
    }
  };

  const handleImportExcel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!excelFile) {
      showNotice('error', 'Selecione um arquivo Excel (.xlsx, .xls ou .csv).');
      return;
    }

    setImportingExcel(true);
    try {
      const formData = new FormData();
      formData.append('file', excelFile);
      formData.append('replaceExisting', String(replaceExisting));

      const res = await fetch('/api/admin/members/import', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        showNotice('error', data.error || 'Erro na importação.');
        return;
      }
      showNotice('success', data.message);
      setExcelFile(null);
      fetchMembers();
      fetchAssemblies();
    } catch {
      showNotice('error', 'Erro ao enviar arquivo Excel.');
    } finally {
      setImportingExcel(false);
    }
  };

  const handleDeleteMember = async (id: number) => {
    if (!confirm('Remover este membro da lista?')) return;
    try {
      const res = await fetch(`/api/admin/members?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        showNotice('success', 'Membro removido.');
        fetchMembers();
        fetchAssemblies();
      }
    } catch {
      showNotice('error', 'Erro ao remover membro.');
    }
  };

  const getMemberDigits = (phone?: string, password?: string): string => {
    const digits = String(phone || '').replace(/\D/g, '');
    if (digits.length >= 3) return digits.slice(-3);
    const passDigits = String(password || '').replace(/\D/g, '');
    if (passDigits.length >= 3) return passDigits.slice(-3);
    return String(password || digits || '').trim();
  };

  const handleOpenEditMember = (member: MemberRow) => {
    setEditingMember(member);
    setEditMemberName(member.name);
    setEditMemberPhone(member.phone || '');
    setEditMemberCompany(member.company || '');
    setEditMemberPassword(getMemberDigits(member.phone, member.password));
  };

  const handleSaveEditMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    if (!editMemberName.trim() || (!editMemberPhone.trim() && !editMemberPassword.trim())) {
      showNotice('error', 'Nome e Celular (ou 3 últimos dígitos) são obrigatórios.');
      return;
    }

    setSavingMember(true);
    try {
      const res = await fetch('/api/admin/members', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingMember.id,
          name: editMemberName.trim(),
          phone: editMemberPhone.trim(),
          company: editMemberCompany.trim(),
          password: editMemberPassword.trim(),
          active: editingMember.active,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showNotice('error', data.error || 'Erro ao atualizar dados do membro.');
        return;
      }
      showNotice('success', data.message || 'Membro atualizado com sucesso!');
      setEditingMember(null);
      fetchMembers();
      fetchAssemblies();
      if (selectedAssemblyId) {
        fetchAssemblyDetail(selectedAssemblyId);
      }
    } catch {
      showNotice('error', 'Erro ao salvar alterações do membro.');
    } finally {
      setSavingMember(false);
    }
  };

  const handleOpenEditTime = (params: {
    type: 'member' | 'visitor';
    assemblyId: number;
    memberId?: number;
    attendanceId?: number;
    name: string;
    currentTime: string;
  }) => {
    setEditingTimeData(params);
    setInputCheckInTime(params.currentTime || '');
  };

  const handleSetCurrentTime = () => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'America/Sao_Paulo',
    });
    setInputCheckInTime(timeStr);
  };

  const handleSaveCheckInTime = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTimeData) return;

    const cleanTime = inputCheckInTime.trim();
    if (!cleanTime) {
      showNotice('error', 'Informe o horário de chegada.');
      return;
    }

    let formattedTime = cleanTime;
    if (/^\d{2}:\d{2}$/.test(cleanTime)) {
      formattedTime = `${cleanTime}:00`;
    }

    setSavingTime(true);
    try {
      const isMember = editingTimeData.type === 'member';
      const payload = isMember
        ? {
            action: 'update_member_check_in_time',
            assemblyId: editingTimeData.assemblyId,
            memberId: editingTimeData.memberId,
            checkInTime: formattedTime,
          }
        : {
            action: 'update_visitor_check_in_time',
            assemblyId: editingTimeData.assemblyId,
            attendanceId: editingTimeData.attendanceId,
            checkInTime: formattedTime,
          };

      const res = await fetch('/api/admin/assemblies', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        showNotice('error', data.error || 'Erro ao atualizar horário de chegada.');
        return;
      }
      showNotice('success', data.message || 'Horário de chegada atualizado com sucesso!');
      setEditingTimeData(null);
      fetchAssemblyDetail(editingTimeData.assemblyId);
      fetchAssemblies();
    } catch {
      showNotice('error', 'Erro ao salvar horário de chegada.');
    } finally {
      setSavingTime(false);
    }
  };

  // Tela de Login Admin
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto mt-6 sm:mt-8 bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-bni-lightred text-bni-red flex items-center justify-center mx-auto">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">
            Área do Administrador
          </h1>
          <p className="text-xs text-slate-500">
            Digite a senha de administração para gerenciar assembleias e membros.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-bold text-slate-800">
              Senha do Administrador
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Digite a senha (padrão: admin123)"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-bni-red"
              />
            </div>
          </div>

          {loginError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
              {loginError}
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3.5 bg-bni-red hover:bg-bni-darkred text-white font-bold rounded-xl shadow-sm transition-colors text-sm"
          >
            Entrar no Painel
          </button>

          <div className="text-center pt-2">
            <span className="text-[11px] text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-200">
              Senha inicial padrão: <strong>admin123</strong>
            </span>
          </div>
        </form>
      </div>
    );
  }

  const filteredMembers = members.filter(
    (m) =>
      m.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
      (m.company && m.company.toLowerCase().includes(memberSearch.toLowerCase())) ||
      (m.phone && m.phone.includes(memberSearch))
  );

  return (
    <div className="space-y-6">
      {/* Barra de Topo do Admin */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-bni-lightred text-bni-red flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900">
              Painel do Administrador
            </h1>
            <p className="text-xs text-slate-500">
              Gerencie assembleias, importe membros via Excel e exporte relatórios.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setActiveTab('assemblies')}
            className={`flex-1 sm:flex-initial justify-center px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === 'assemblies'
                ? 'bg-bni-red text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Assembleias ({assemblies.length})
          </button>

          <button
            onClick={() => setActiveTab('members')}
            className={`flex-1 sm:flex-initial justify-center px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === 'members'
                ? 'bg-bni-red text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            Membros ({members.length})
          </button>

          <button
            onClick={handleLogout}
            title="Sair do Admin"
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Notificação Flutuante */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border text-sm font-semibold flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <span>{feedback.text}</span>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs underline ml-4 opacity-75 hover:opacity-100"
          >
            Fechar
          </button>
        </div>
      )}

      {/* =====================================================================
          ABA 1: ASSEMBLEIAS / REUNIÕES
      ===================================================================== */}
      {activeTab === 'assemblies' && (
        <div className="space-y-6">
          {/* Card: Abrir / Criar Nova Assembleia */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Plus className="w-5 h-5 text-bni-red" />
              Nova Assembleia / Reunião
            </h2>

            <form
              onSubmit={handleCreateAssembly}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end"
            >
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">
                  Número da Reunião *
                </label>
                <div className="relative">
                  <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={meetingNumber}
                    onChange={(e) => setMeetingNumber(e.target.value)}
                    placeholder="Ex.: 103"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-bni-red"
                  />
                </div>
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700">
                  Local da Assembleia *
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Ex.: CRIO / Hotel Ibis"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-bni-red"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">
                  Data da Reunião *
                </label>
                <input
                  type="date"
                  required
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-bni-red"
                />
              </div>

              <div className="flex gap-2">
                <select
                  value={initialStatus}
                  onChange={(e) => setInitialStatus(e.target.value as 'open' | 'closed')}
                  className="px-3 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-bni-red"
                >
                  <option value="open">Abrir Agora</option>
                  <option value="closed">Criar Fechada</option>
                </select>

                <button
                  type="submit"
                  disabled={creatingAssembly}
                  className="flex-1 py-2.5 px-4 bg-bni-red hover:bg-bni-darkred text-white font-bold rounded-xl text-sm shadow-sm transition-colors whitespace-nowrap"
                >
                  {creatingAssembly ? 'Criando...' : 'Criar'}
                </button>
              </div>
            </form>
          </div>

          {/* Lista de Assembleias */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">
                Assembleias Cadastradas
              </h2>
              <button
                onClick={fetchAssemblies}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-bni-red"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingAssemblies ? 'animate-spin' : ''}`} />
                Atualizar
              </button>
            </div>

            {assemblies.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-200 rounded-xl text-slate-500 text-sm">
                Nenhuma assembleia criada ainda. Preencha o formulário acima para abrir a primeira assembleia!
              </div>
            ) : (
              <div className="space-y-4">
                {assemblies.map((a) => {
                  const isExpanded = selectedAssemblyId === a.id;
                  return (
                    <div
                      key={a.id}
                      className={`rounded-2xl border transition-all ${
                        a.status === 'open'
                          ? 'border-emerald-300 bg-emerald-50/20'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="text-lg font-extrabold text-slate-900">
                              Reunião #{a.meeting_number}
                            </span>
                            {a.status === 'open' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                                ABERTA
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                FECHADA
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-slate-600">
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="w-4 h-4 text-bni-red" />
                              {a.location}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="w-4 h-4 text-bni-red" />
                              {formatPtBrDate(a.meeting_date)}
                            </span>
                          </div>

                          {/* Pílulas de contagem */}
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800">
                              Membros Presentes: <strong>{a.member_count}</strong> / {totalActiveMembers}
                            </span>
                            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800">
                              Visitantes BNI: <strong>{a.visitante_count}</strong>
                            </span>
                            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-purple-50 text-purple-800">
                              Convidados: <strong>{a.convidado_count}</strong>
                            </span>
                          </div>
                        </div>

                        {/* Ações da Assembleia */}
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Abrir / Fechar */}
                          <button
                            onClick={() => handleToggleAssemblyStatus(a)}
                            className={`px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
                              a.status === 'open'
                                ? 'bg-amber-100 hover:bg-amber-200 text-amber-900'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            }`}
                          >
                            {a.status === 'open' ? (
                              <>
                                <XCircle className="w-4 h-4" />
                                Fechar Assembleia
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-4 h-4" />
                                Abrir Assembleia
                              </>
                            )}
                          </button>

                          {/* Baixar Excel (.xlsx) */}
                          <a
                            href={`/api/admin/assemblies/${a.id}/export`}
                            className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-bni-red hover:bg-bni-darkred text-white flex items-center gap-1.5 shadow-sm transition-colors"
                          >
                            <Download className="w-4 h-4" />
                            Baixar Excel (.xlsx)
                          </a>

                          {/* Ver Detalhes / Presenças */}
                          <button
                            onClick={() => {
                              if (isExpanded) {
                                setSelectedAssemblyId(null);
                                setAssemblyDetail(null);
                              } else {
                                setSelectedAssemblyId(a.id);
                                fetchAssemblyDetail(a.id);
                              }
                            }}
                            className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center gap-1 transition-colors"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="w-4 h-4" />
                                Ocultar Lista
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-4 h-4" />
                                Ver Presenças
                              </>
                            )}
                          </button>

                          {/* Excluir */}
                          <button
                            onClick={() => handleDeleteAssembly(a.id)}
                            title="Excluir Assembleia"
                            className="p-2.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Painel Expandido com Detalhes em Tempo Real */}
                      {isExpanded && (
                        <div className="border-t border-slate-200 p-4 sm:p-5 bg-slate-50/70 rounded-b-2xl space-y-6">
                          {loadingDetail || !assemblyDetail ? (
                            <div className="text-center py-4 text-xs text-slate-500">
                              Carregando lista de presença...
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                              {/* Coluna 1: Presença dos Membros */}
                              <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                                    <UserCheck className="w-4 h-4 text-bni-red" />
                                    Presença de Membros ({assemblyDetail.memberAttendances.length} /{' '}
                                    {assemblyDetail.allMembers.length})
                                  </h3>
                                  <span className="text-[11px] text-slate-400">
                                    Clique para alterar
                                  </span>
                                </div>

                                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                                  {assemblyDetail.allMembers.map((m) => {
                                    const att = assemblyDetail.memberAttendances.find(
                                      (ma) => ma.member_id === m.id
                                    );
                                    return (
                                      <div
                                        key={m.id}
                                        className="py-2.5 flex items-center justify-between gap-2 text-xs"
                                      >
                                        <div className="min-w-0 pr-2">
                                          <span className="font-semibold text-slate-800 block truncate">
                                            {m.name}
                                          </span>
                                          {att ? (
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                              <span className="text-emerald-700 font-medium">
                                                Entrada às {att.check_in_time}
                                              </span>
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  handleOpenEditTime({
                                                    type: 'member',
                                                    assemblyId: a.id,
                                                    memberId: m.id,
                                                    name: m.name,
                                                    currentTime: att.check_in_time,
                                                  })
                                                }
                                                className="p-1 rounded text-slate-400 hover:text-emerald-700 hover:bg-emerald-100 transition-colors"
                                                title="Editar horário de chegada"
                                              >
                                                <Pencil className="w-3.5 h-3.5" />
                                              </button>
                                            </div>
                                          ) : (
                                            <span className="text-slate-400">Ausente</span>
                                          )}
                                        </div>

                                        <button
                                          onClick={() =>
                                            handleToggleMemberAttendance(a.id, m.id)
                                          }
                                          className={`px-2.5 py-1.5 rounded-lg font-semibold transition-colors shrink-0 ${
                                            att
                                              ? 'bg-emerald-100 text-emerald-800 hover:bg-red-100 hover:text-red-700'
                                              : 'bg-slate-100 text-slate-600 hover:bg-emerald-100 hover:text-emerald-800'
                                          }`}
                                        >
                                          {att ? 'Presente' : 'Marcar Presença'}
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Coluna 2: Visitantes e Convidados */}
                              <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                                  <Users className="w-4 h-4 text-blue-600" />
                                  Visitantes e Convidados (
                                  {assemblyDetail.visitorAttendances.length})
                                </h3>

                                {assemblyDetail.visitorAttendances.length === 0 ? (
                                  <div className="py-8 text-center text-xs text-slate-400">
                                    Nenhum visitante ou convidado registrado nesta assembleia.
                                  </div>
                                ) : (
                                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                                    {assemblyDetail.visitorAttendances.map((v) => (
                                      <div
                                        key={v.id}
                                        className="py-2.5 flex items-start justify-between gap-2 text-xs"
                                      >
                                        <div className="space-y-0.5">
                                          <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="font-bold text-slate-900">
                                              {v.name}
                                            </span>
                                            <span
                                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                                v.type === 'visitante'
                                                  ? 'bg-blue-100 text-blue-800'
                                                  : 'bg-purple-100 text-purple-800'
                                              }`}
                                            >
                                              {v.type === 'visitante'
                                                ? `Visitante (${v.bni_group})`
                                                : 'Convidado'}
                                            </span>
                                          </div>
                                          <div className="text-slate-600">
                                            {v.company} • {v.phone}
                                          </div>
                                          <div className="text-slate-400 flex items-center gap-1.5">
                                            <span>Entrada às {v.check_in_time}</span>
                                            <button
                                              type="button"
                                              onClick={() =>
                                                handleOpenEditTime({
                                                  type: 'visitor',
                                                  assemblyId: a.id,
                                                  attendanceId: v.id,
                                                  name: v.name,
                                                  currentTime: v.check_in_time,
                                                })
                                              }
                                              className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
                                              title="Editar horário de chegada"
                                            >
                                              <Pencil className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                        </div>

                                        <button
                                          onClick={() =>
                                            handleDeleteVisitorAttendance(a.id, v.id)
                                          }
                                          className="p-1 text-slate-400 hover:text-red-600"
                                          title="Remover registro"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          ABA 2: LISTA DE MEMBROS & IMPORTAÇÃO EXCEL
      ===================================================================== */}
      {activeTab === 'members' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Card 1: Importar Lista de Membros via Excel */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                    Importar Membros via Excel
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Envie sua planilha (.xlsx, .xls ou .csv). O sistema extrai automaticamente os{' '}
                    <strong>3 últimos dígitos do celular</strong> de cada membro para confirmação!
                  </p>
                </div>

                <a
                  href="/api/admin/members/template"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold shrink-0 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Planilha Modelo
                </a>
              </div>

              <form onSubmit={handleImportExcel} className="space-y-4 pt-1">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => setExcelFile(e.target.files?.[0] || null)}
                  className="block w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-100 file:text-slate-800 hover:file:bg-slate-200 cursor-pointer"
                />

                <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={replaceExisting}
                    onChange={(e) => setReplaceExisting(e.target.checked)}
                    className="rounded border-slate-300 accent-[#C8102E]"
                  />
                  <span>Substituir toda a lista de membros atual pela planilha</span>
                </label>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="submit"
                    disabled={importingExcel || !excelFile}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    {importingExcel ? 'Importando...' : 'Importar Planilha Excel'}
                  </button>

                  <button
                    type="button"
                    onClick={handleSeedSampleMembers}
                    className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Carregar Membros de Exemplo
                  </button>
                </div>
              </form>
            </div>

            {/* Card 2: Adicionar Membro Individualmente */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-bni-red" />
                  Cadastrar Membro Manualmente
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Os 3 últimos dígitos do celular informado serão usados automaticamente na confirmação.
                </p>
              </div>

              <form onSubmit={handleCreateMember} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Nome do Membro *
                  </label>
                  <input
                    type="text"
                    required
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    placeholder="Nome completo"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-bni-red"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Celular / WhatsApp *
                  </label>
                  <input
                    type="tel"
                    required={!newMemberPassword}
                    value={newMemberPhone}
                    onChange={(e) => setNewMemberPhone(e.target.value)}
                    placeholder="(48) 99999-9766"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-bni-red"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Empresa / Especialidade
                  </label>
                  <input
                    type="text"
                    value={newMemberCompany}
                    onChange={(e) => setNewMemberCompany(e.target.value)}
                    placeholder="Nome da empresa"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-bni-red"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">
                    3 Últimos Dígitos (Automático)
                  </label>
                  <input
                    type="text"
                    maxLength={3}
                    value={
                      newMemberPhone.replace(/\D/g, '').length >= 3
                        ? newMemberPhone.replace(/\D/g, '').slice(-3)
                        : newMemberPassword
                    }
                    onChange={(e) => setNewMemberPassword(e.target.value.replace(/\D/g, '').slice(0, 3))}
                    placeholder="Automático pelo celular"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-base sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-bni-red"
                  />
                </div>

                <div className="sm:col-span-2 pt-1">
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-bni-red hover:bg-bni-darkred text-white font-bold rounded-xl text-xs shadow-sm transition-colors"
                  >
                    Adicionar Membro
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Tabela de Membros */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-slate-900">
                Membros Cadastrados ({members.length})
              </h2>

              <div className="flex items-center gap-2 sm:gap-3">
                <input
                  type="text"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Buscar membro ou celular..."
                  className="flex-1 sm:w-56 px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-bni-red"
                />

                <button
                  onClick={() => setShowPasswords(!showPasswords)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors shrink-0"
                >
                  {showPasswords ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      Ocultar Dígitos
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      Ver Dígitos
                    </>
                  )}
                </button>
              </div>
            </div>

            {loadingMembers ? (
              <div className="py-8 text-center text-sm text-slate-500">
                Carregando membros...
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="py-8 text-center border border-dashed border-slate-200 rounded-xl text-sm text-slate-500">
                Nenhum membro encontrado. Importe uma planilha Excel ou clique em &ldquo;Carregar Membros de Exemplo&rdquo;.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                      <th className="py-3 px-3">Nome</th>
                      <th className="py-3 px-3">3 Últimos Dígitos</th>
                      <th className="py-3 px-3">Celular</th>
                      <th className="py-3 px-3">Empresa</th>
                      <th className="py-3 px-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredMembers.map((member) => {
                      const phoneDigits = String(member.phone || '').replace(/\D/g, '');
                      const displayDigits =
                        phoneDigits.length >= 3 ? phoneDigits.slice(-3) : member.password;
                      return (
                        <tr key={member.id} className="hover:bg-slate-50">
                          <td className="py-3 px-3 font-semibold text-slate-900">
                            {member.name}
                          </td>
                          <td className="py-3 px-3 font-mono text-xs text-slate-700">
                            {showPasswords ? (
                              <span className="px-2.5 py-1 rounded-lg bg-bni-lightred text-bni-red border border-red-200 font-extrabold">
                                {displayDigits}
                              </span>
                            ) : (
                              '•••'
                            )}
                          </td>
                          <td className="py-3 px-3 text-slate-600 text-xs whitespace-nowrap">
                            {member.phone || '-'}
                          </td>
                          <td className="py-3 px-3 text-slate-600 text-xs">
                            {member.company || '-'}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleOpenEditMember(member)}
                                className="p-1.5 text-slate-400 hover:text-bni-red rounded-lg hover:bg-red-50 transition-colors"
                                title="Editar dados do membro"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteMember(member.id)}
                                className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                                title="Remover membro"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Edição de Membro */}
      {editingMember && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Pencil className="w-5 h-5 text-bni-red" />
                  Editar Dados do Membro
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Atualize as informações cadastrais e o código de confirmação.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingMember(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditMember} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">
                  Nome do Membro *
                </label>
                <input
                  type="text"
                  required
                  value={editMemberName}
                  onChange={(e) => setEditMemberName(e.target.value)}
                  placeholder="Nome completo"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-bni-red"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Celular / WhatsApp *
                  </label>
                  <input
                    type="tel"
                    required
                    value={editMemberPhone}
                    onChange={(e) => {
                      const newPhone = e.target.value;
                      setEditMemberPhone(newPhone);
                      const digits = newPhone.replace(/\D/g, '');
                      if (digits.length >= 3) {
                        setEditMemberPassword(digits.slice(-3));
                      }
                    }}
                    placeholder="(48) 99999-9766"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-bni-red"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">
                    3 Últimos Dígitos *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={3}
                    value={editMemberPassword}
                    onChange={(e) =>
                      setEditMemberPassword(e.target.value.replace(/\D/g, '').slice(0, 3))
                    }
                    placeholder="3 dígitos"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-bni-red"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">
                  Empresa / Especialidade
                </label>
                <input
                  type="text"
                  value={editMemberCompany}
                  onChange={(e) => setEditMemberCompany(e.target.value)}
                  placeholder="Nome da empresa ou ramo de atuação"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-bni-red"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingMember}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-bni-red hover:bg-bni-darkred shadow-sm transition-colors"
                >
                  {savingMember ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Edição de Horário de Chegada */}
      {editingTimeData && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Editar Horário de Chegada
                  </h3>
                  <p className="text-xs text-slate-500 truncate max-w-[240px]">
                    {editingTimeData.type === 'member' ? 'Membro: ' : 'Visitante: '}
                    <strong>{editingTimeData.name}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingTimeData(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCheckInTime} className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">
                    Horário de Entrada (HH:MM:SS) *
                  </label>
                  <button
                    type="button"
                    onClick={handleSetCurrentTime}
                    className="text-[11px] font-bold text-bni-red hover:underline"
                  >
                    Usar Horário Atual (Agora)
                  </button>
                </div>

                <div className="relative">
                  <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={inputCheckInTime}
                    onChange={(e) => setInputCheckInTime(e.target.value)}
                    placeholder="Ex.: 06:40:00 ou 06:40"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 font-mono text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-bni-red"
                  />
                </div>
                <span className="text-[11px] text-slate-400 block">
                  Informe o horário no formato HH:MM ou HH:MM:SS (ex.: 06:40:00).
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingTimeData(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingTime}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-bni-red hover:bg-bni-darkred shadow-sm transition-colors"
                >
                  {savingTime ? 'Salvando...' : 'Salvar Horário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
