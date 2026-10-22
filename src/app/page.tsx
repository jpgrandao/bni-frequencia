'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import QRCode from 'qrcode';
import {
  UserCheck,
  Users,
  ShieldCheck,
  Calendar,
  MapPin,
  ArrowRight,
  AlertCircle,
  QrCode,
  Smartphone,
  Settings2,
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
  const [baseUrl, setBaseUrl] = useState('');
  const [editingBaseUrl, setEditingBaseUrl] = useState(false);
  const [memberQrDataUrl, setMemberQrDataUrl] = useState('');
  const [visitorQrDataUrl, setVisitorQrDataUrl] = useState('');

  useEffect(() => {
    fetch('/api/public/active-assembly')
      .then((res) => res.json())
      .then((data) => {
        setAssembly(data.assembly || null);

        if (typeof window !== 'undefined') {
          const currentOrigin = window.location.origin;
          const isLocalhost =
            window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1';

          if (isLocalhost && data.lanIp) {
            const port = window.location.port ? `:${window.location.port}` : '';
            setBaseUrl(`${window.location.protocol}//${data.lanIp}${port}`);
          } else {
            setBaseUrl(currentOrigin);
          }
        }
      })
      .catch(() => {
        if (typeof window !== 'undefined') {
          setBaseUrl(window.location.origin);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!baseUrl) return;
    const cleanBase = baseUrl.replace(/\/$/, '');
    const memberUrl = `${cleanBase}/presenca-membro`;
    const visitorUrl = `${cleanBase}/presenca-visitante`;

    QRCode.toDataURL(memberUrl, {
      width: 280,
      margin: 2,
      color: { dark: '#0f172a', light: '#ffffff' },
    })
      .then(setMemberQrDataUrl)
      .catch(() => {});

    QRCode.toDataURL(visitorUrl, {
      width: 280,
      margin: 2,
      color: { dark: '#0f172a', light: '#ffffff' },
    })
      .then(setVisitorQrDataUrl)
      .catch(() => {});
  }, [baseUrl]);

  const cleanBase = baseUrl.replace(/\/$/, '');

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Banner de Status da Assembleia Atual */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 md:flex items-center gap-2.5 w-full md:w-auto">
              <Link
                href="/presenca-membro"
                className="px-5 py-3 bg-bni-red hover:bg-bni-darkred text-white font-bold rounded-xl text-sm shadow-sm transition-colors text-center"
              >
                Sou Membro
              </Link>
              <Link
                href="/presenca-visitante"
                className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-sm shadow-sm transition-colors text-center"
              >
                Sou Visitante / Convidado
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 mt-0.5 shrink-0">
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
              className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-bni-red hover:bg-bni-darkred text-white font-semibold rounded-xl text-sm shadow-sm transition-colors shrink-0"
            >
              <ShieldCheck className="w-4 h-4" />
              Abrir Assembleia no Admin
            </Link>
          </div>
        )}
      </div>

      {/* Seção de QR Codes para Escaneamento Mobile na Recepção */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-bni-lightred text-bni-red flex items-center justify-center shrink-0">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">
                Check-in Rápido pelo Celular (QR Code)
              </h2>
              <p className="text-xs text-slate-500">
                Aponte a câmera do celular para o QR Code correspondente para abrir direto na tela de presença.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setEditingBaseUrl(!editingBaseUrl)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-bni-red self-start sm:self-auto"
          >
            <Settings2 className="w-3.5 h-3.5" />
            {editingBaseUrl ? 'Ocultar endereço de rede' : 'Ajustar endereço do QR Code'}
          </button>
        </div>

        {editingBaseUrl && (
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="text-xs text-slate-600 flex-1">
              <strong>Endereço base dos QR Codes:</strong> Certifique-se de que os celulares estejam no mesmo Wi-Fi (ou informe o domínio público quando hospedado).
            </div>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono w-full sm:w-72 focus:outline-none focus:ring-2 focus:ring-bni-red"
              placeholder="http://192.168.0.10:3000"
            />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* QR Code 1: Membros */}
          <div className="rounded-2xl border-2 border-red-100 bg-gradient-to-b from-red-50/40 to-white p-5 sm:p-6 flex flex-col items-center text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-bni-lightred text-bni-red text-xs font-extrabold uppercase tracking-wider">
              <UserCheck className="w-4 h-4" />
              QR Code • Membros
            </div>

            <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200">
              {memberQrDataUrl ? (
                <img
                  src={memberQrDataUrl}
                  alt="QR Code Presença do Membro"
                  className="w-48 h-48 sm:w-56 sm:h-56 object-contain"
                />
              ) : (
                <div className="w-48 h-48 sm:w-56 sm:h-56 bg-slate-100 animate-pulse rounded-xl" />
              )}
            </div>

            <div className="space-y-1 max-w-sm">
              <h3 className="text-lg font-extrabold text-slate-900">
                Presença do Membro
              </h3>
              <p className="text-xs sm:text-sm text-slate-600">
                Escaneie para selecionar seu nome e confirmar presença com os{' '}
                <strong>3 últimos dígitos do seu celular</strong>.
              </p>
              <p className="text-[11px] font-mono text-slate-400 pt-1 break-all">
                {cleanBase}/presenca-membro
              </p>
            </div>

            <Link
              href="/presenca-membro"
              className="w-full py-3 px-4 bg-bni-red hover:bg-bni-darkred text-white font-bold rounded-xl text-sm shadow-sm transition-colors flex items-center justify-center gap-2"
            >
              <Smartphone className="w-4 h-4" />
              Acessar Presença do Membro
            </Link>
          </div>

          {/* QR Code 2: Visitantes e Convidados */}
          <div className="rounded-2xl border-2 border-blue-100 bg-gradient-to-b from-blue-50/40 to-white p-5 sm:p-6 flex flex-col items-center text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-extrabold uppercase tracking-wider">
              <Users className="w-4 h-4" />
              QR Code • Visitante / Convidado
            </div>

            <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200">
              {visitorQrDataUrl ? (
                <img
                  src={visitorQrDataUrl}
                  alt="QR Code Visitante ou Convidado"
                  className="w-48 h-48 sm:w-56 sm:h-56 object-contain"
                />
              ) : (
                <div className="w-48 h-48 sm:w-56 sm:h-56 bg-slate-100 animate-pulse rounded-xl" />
              )}
            </div>

            <div className="space-y-1 max-w-sm">
              <h3 className="text-lg font-extrabold text-slate-900">
                Visitante ou Convidado
              </h3>
              <p className="text-xs sm:text-sm text-slate-600">
                Escaneie para preencher seu Nome, Empresa, Telefone e Grupo BNI (caso seja visitante).
              </p>
              <p className="text-[11px] font-mono text-slate-400 pt-1 break-all">
                {cleanBase}/presenca-visitante
              </p>
            </div>

            <Link
              href="/presenca-visitante"
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow-sm transition-colors flex items-center justify-center gap-2"
            >
              <Smartphone className="w-4 h-4" />
              Acessar Visitante / Convidado
            </Link>
          </div>
        </div>
      </div>

      {/* Cards de Acesso Rápido */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
        {/* Card 1: Membro */}
        <Link
          href="/presenca-membro"
          className="group bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md hover:border-bni-red transition-all flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-2xl bg-bni-lightred text-bni-red flex items-center justify-center mb-4 group-hover:bg-bni-red group-hover:text-white transition-colors">
              <UserCheck className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 group-hover:text-bni-red transition-colors">
              Presença do Membro
            </h2>
            <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
              Escolha o seu nome na lista de membros e confirme sua presença com os 3 últimos dígitos do seu celular.
            </p>
          </div>
          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-sm font-semibold text-bni-red">
            <span>Confirmar presença de membro</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Card 2: Visitante ou Convidado */}
        <Link
          href="/presenca-visitante"
          className="group bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md hover:border-blue-600 transition-all flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Users className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
              Visitante ou Convidado
            </h2>
            <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
              Informe seu nome, empresa, telefone e, caso seja visitante de outro grupo BNI, informe seu grupo de origem.
            </p>
          </div>
          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-sm font-semibold text-blue-600">
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
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-800 flex items-center justify-center mb-4 group-hover:bg-slate-900 group-hover:text-white transition-colors">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              Área do Administrador
            </h2>
            <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
              Importe a lista de membros via Excel, abra ou feche assembleias e baixe a planilha completa de presença.
            </p>
          </div>
          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-sm font-semibold text-slate-800">
            <span>Acessar painel administrativo</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>
    </div>
  );
}
