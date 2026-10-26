import React, { useState, ChangeEvent, useRef } from 'react';
import {
  X,
  Key,
  Download,
  Upload,
  Bell,
  RefreshCw,
  Sparkles,
  Check,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import {
  getClientGeminiApiKey,
  saveClientGeminiApiKey,
} from '../services/geminiClient.ts';
import {
  exportBackup,
  importBackup,
  resetDatabaseToDemo,
} from '../services/db.ts';
import {
  getNotificationPermission,
  requestNotificationPermission,
  sendTestNotification,
} from '../services/notifications.ts';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataChanged: () => void;
  onShowToast: (message: string, type?: 'success' | 'warning' | 'info') => void;
  installPrompt: (() => Promise<boolean>) | null;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onDataChanged,
  onShowToast,
  installPrompt,
}) => {
  if (!isOpen) return null;

  const [apiKey, setApiKey] = useState(getClientGeminiApiKey());
  const [apiKeySaved, setApiKeySaved] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState(getNotificationPermission());
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Salvar Chave Gemini no LocalStorage
  const handleSaveApiKey = () => {
    saveClientGeminiApiKey(apiKey);
    setApiKeySaved(true);
    onShowToast('Chave Gemini salva com sucesso!', 'success');
    setTimeout(() => setApiKeySaved(false), 2000);
  };

  // Exportar Backup JSON do IndexedDB
  const handleExportBackup = async () => {
    try {
      setIsExporting(true);
      const jsonString = await exportBackup();
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `backup-distribuidora-erp-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onShowToast('Backup JSON exportado com sucesso!', 'success');
    } catch (err) {
      console.error('Erro ao exportar:', err);
      onShowToast('Falha ao exportar backup local.', 'warning');
    } finally {
      setIsExporting(false);
    }
  };

  // Restaurar Backup JSON para o IndexedDB
  const handleImportFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      const text = await file.text();
      const result = await importBackup(text);
      onDataChanged();
      onShowToast(`Sucesso! ${result.count} produtos restaurados.`, 'success');
    } catch (err: unknown) {
      const error = err as Error;
      onShowToast(error.message || 'Falha ao restaurar arquivo de backup.', 'warning');
    } finally {
      setIsImporting(false);
      if (e.target) e.target.value = '';
    }
  };

  // Ativar Notificações
  const handleRequestNotifications = async () => {
    const granted = await requestNotificationPermission();
    setNotificationStatus(granted ? 'granted' : 'denied');
    if (granted) {
      onShowToast('Notificações ativadas! Você receberá alertas de estoque baixo.', 'success');
      await sendTestNotification();
    } else {
      onShowToast('Permissão de notificações não concedida.', 'warning');
    }
  };

  // Resetar Demo
  const handleResetDemo = async () => {
    if (window.confirm('Deseja restaurar os 4 produtos de demonstração padrão? Os produtos atuais serão substituídos.')) {
      await resetDatabaseToDemo();
      onDataChanged();
      onShowToast('Banco restaurado para dados de demonstração!', 'success');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div 
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Configurações do Sistema
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Chave Gemini, Backup Local JSON e PWA
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="Fechar configurações"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo com Scroll */}
        <div className="p-5 overflow-y-auto space-y-6">
          {/* SEÇÃO 1: Chave Gemini API (Resiliência Easypanel / VPS) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                Gemini API Key (Google AI)
              </label>
              <span className="text-[10px] text-slate-400 font-medium">
                Prioridade 1: LocalStorage
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Cole sua chave da Google Gemini API para reconhecimento automático de produtos via foto em produção no Easypanel/VPS.
            </p>

            <div className="flex gap-2">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSaveApiKey}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition flex items-center gap-1.5 flex-shrink-0"
              >
                {apiKeySaved ? <Check className="w-4 h-4 text-emerald-300" /> : null}
                <span>{apiKeySaved ? 'Salva!' : 'Salvar'}</span>
              </button>
            </div>
          </div>

          {/* SEÇÃO 2: Backup e Restauração Local (IndexedDB JSON) */}
          <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <label className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              Backup & Restauração (IndexedDB)
            </label>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Exporte todos os produtos cadastrados e fotos para um arquivo JSON ou restaure em outro aparelho.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleExportBackup}
                disabled={isExporting}
                className="py-3 px-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition"
              >
                <Download className="w-4 h-4 text-blue-600" />
                <span>{isExporting ? 'Exportando...' : 'Exportar JSON'}</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={handleImportFile}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className="py-3 px-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition"
              >
                <Upload className="w-4 h-4 text-emerald-600" />
                <span>{isImporting ? 'Importando...' : 'Importar JSON'}</span>
              </button>
            </div>
          </div>

          {/* SEÇÃO 3: Notificações de Estoque Baixo */}
          <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-amber-500" />
                Alertas de Estoque Baixo
              </label>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                notificationStatus === 'granted'
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
              }`}>
                {notificationStatus === 'granted' ? 'Ativo' : 'Pendente'}
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Receba avisos instantâneos quando qualquer produto atingir ou ficar abaixo do estoque mínimo.
            </p>

            <button
              onClick={handleRequestNotifications}
              className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium flex items-center justify-center gap-2 transition"
            >
              <Bell className="w-4 h-4 text-amber-500" />
              <span>
                {notificationStatus === 'granted'
                  ? 'Disparar Notificação de Teste'
                  : 'Solicitar Permissão de Notificações'}
              </span>
            </button>
          </div>

          {/* SEÇÃO 4: Instalação PWA */}
          {installPrompt && (
            <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <label className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-blue-500" />
                Aplicativo PWA Android / iOS
              </label>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Instale este ERP na tela de início do seu celular com funcionamento 100% offline.
              </p>
              <button
                onClick={() => installPrompt()}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition"
              >
                <Smartphone className="w-4 h-4" />
                Instalar Aplicativo no Celular
              </button>
            </div>
          )}

          {/* SEÇÃO 5: Reset de Dados Demo */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <div>
              <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Restaurar Dados Demo
              </h4>
              <p className="text-[11px] text-slate-400">
                Recarrega os 4 produtos oficiais da distribuidora
              </p>
            </div>
            <button
              onClick={handleResetDemo}
              className="px-3 py-1.5 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-medium flex items-center gap-1 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Restaurar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
