import React from 'react';
import { Sparkles, Sun, Moon, Settings, Bell, BellOff, Download, Terminal } from 'lucide-react';
import { getNotificationPermission, requestNotificationPermission } from '../services/notifications.ts';

interface HeaderProps {
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenSettings: () => void;
  onOpenDiagnostics: () => void;
  lowStockCount: number;
  logCount: number;
  errorCount: number;
  onSelectTab: (tab: 'inicio' | 'camera' | 'estoque' | 'movimentacoes') => void;
  installPrompt: (() => Promise<boolean>) | null;
}

export const Header: React.FC<HeaderProps> = ({
  isDarkMode,
  onToggleDarkMode,
  onOpenSettings,
  onOpenDiagnostics,
  lowStockCount,
  logCount,
  errorCount,
  onSelectTab,
  installPrompt,
}) => {
  const [notificationPerm, setNotificationPerm] = React.useState<string>(getNotificationPermission());

  const handleRequestNotification = async () => {
    const granted = await requestNotificationPermission();
    setNotificationPerm(granted ? 'granted' : 'denied');
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 transition-colors">
      <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
        {/* Brand / Logo */}
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => onSelectTab('inicio')}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-sm shadow-blue-500/20 text-white font-bold text-lg">
            <Sparkles className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-semibold text-base text-slate-900 dark:text-white tracking-tight leading-none">
                Distribuidora Central
              </h1>
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Sistema Online" />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              ERP Inteligente &bull; Offline-First
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          {/* PWA Install Button (if available) */}
          {installPrompt && (
            <button
              onClick={() => installPrompt()}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 hover:bg-blue-100 transition min-h-[36px]"
              title="Instalar Aplicativo no Celular"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Instalar App</span>
            </button>
          )}

          {/* Low Stock Alert Indicator */}
          <button
            onClick={() => onSelectTab('estoque')}
            className="relative p-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition min-w-[40px] min-h-[40px] flex items-center justify-center"
            title={lowStockCount > 0 ? `${lowStockCount} itens com estoque baixo!` : 'Notificações de Estoque'}
            aria-label="Alertas de estoque"
          >
            {notificationPerm === 'granted' ? (
              <Bell className="w-5 h-5" />
            ) : (
              <BellOff className="w-5 h-5 text-slate-400" onClick={(e) => { e.stopPropagation(); handleRequestNotification(); }} />
            )}
            {lowStockCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow">
                {lowStockCount}
              </span>
            )}
          </button>

          {/* Theme Toggle */}
          <button
            onClick={onToggleDarkMode}
            className="p-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition min-w-[40px] min-h-[40px] flex items-center justify-center"
            title={isDarkMode ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro'}
            aria-label="Alternar tema"
          >
            {isDarkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
          </button>

          {/* Diagnostic Console Button */}
          <button
            onClick={onOpenDiagnostics}
            className="relative p-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition min-w-[40px] min-h-[40px] flex items-center justify-center"
            title="Terminal de Diagnóstico em Tempo Real"
            aria-label="Abrir terminal de diagnóstico"
          >
            <Terminal className="w-5 h-5 text-emerald-500" />
            {errorCount > 0 ? (
              <span className="absolute top-1.5 right-1.5 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow">
                {errorCount}
              </span>
            ) : logCount > 0 ? (
              <span className="absolute top-1.5 right-1.5 flex h-3.5 min-w-[14px] px-1 items-center justify-center rounded-full bg-slate-700 dark:bg-slate-600 text-[9px] font-bold text-white">
                {logCount > 99 ? '99+' : logCount}
              </span>
            ) : null}
          </button>

          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            className="p-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition min-w-[40px] min-h-[40px] flex items-center justify-center"
            title="Configurações (API Key, Backup JSON e PWA)"
            aria-label="Abrir configurações"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};
