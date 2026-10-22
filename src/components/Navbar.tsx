'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Users, UserCheck, ShieldCheck, Home } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'Início', icon: Home },
    { href: '/presenca-membro', label: 'Presença Membro', icon: UserCheck },
    { href: '/presenca-visitante', label: 'Visitante / Convidado', icon: Users },
    { href: '/admin', label: 'Administrador', icon: ShieldCheck },
  ];

  return (
    <header className="bg-bni-red text-white shadow-md sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row items-center justify-between py-3 gap-2">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="bg-white text-bni-red font-black text-xl px-3 py-1 rounded-lg tracking-tight shadow-sm group-hover:scale-105 transition-transform">
              BNI
            </div>
            <div>
              <span className="font-bold text-lg tracking-wide block leading-none">
                Controle de Frequência
              </span>
              <span className="text-xs text-red-100 block mt-0.5">
                Membros, Visitantes e Convidados
              </span>
            </div>
          </Link>

          <nav className="flex items-center gap-1 sm:gap-2 flex-wrap justify-center">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === '/'
                  ? pathname === '/'
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-white text-bni-red shadow-sm font-semibold'
                      : 'text-red-50 hover:bg-bni-darkred hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
