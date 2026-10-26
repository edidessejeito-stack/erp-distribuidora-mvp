import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Copy,
  Trash2,
  Terminal,
  AlertCircle,
  CheckCircle,
  Info,
  AlertTriangle,
  Search,
  Check,
  ChevronDown,
  ChevronRight,
  Database,
  Sparkles,
  Wifi,
  Image as ImageIcon,
} from 'lucide-react';
import {
  LogEntry,
  subscribeLogs,
  clearLogs,
  formatLogsForClipboard,
} from '../services/logger.ts';

interface DiagnosticConsoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (message: string, type?: 'success' | 'warning' | 'info') => void;
}

type FilterCategory = 'Todos' | 'IA' | 'DB' | 'Erros';

export const DiagnosticConsoleModal: React.FC<DiagnosticConsoleModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
}) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<FilterCategory>('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [expandedLogIds, setExpandedLogIds] = useState<Set<string>>(new Set());

  const consoleEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = subscribeLogs((newLogs) => {
      setLogs(newLogs);
    });
    return unsubscribe;
  }, []);

  // Auto-scroll para os logs mais recentes
  useEffect(() => {
    if (isOpen) {
      consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs.length, isOpen]);

  // Tecla ESC para fechar o terminal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const toggleExpand = (id: string) => {
    setExpandedLogIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleCopyLogs = () => {
    const formatted = formatLogsForClipboard();
    navigator.clipboard.writeText(formatted).then(() => {
      setCopied(true);
      onShowToast('Logs copiados para a área de transferência! Pode colar no chat.', 'success');
      setTimeout(() => setCopied(false), 2500);
    }).catch(() => {
      onShowToast('Erro ao copiar logs.', 'warning');
    });
  };

  const handleClearLogs = () => {
    clearLogs();
    onShowToast('Logs de diagnóstico limpos.', 'info');
  };

  // Filtragem
  const filteredLogs = logs.filter((log) => {
    if (filter === 'IA' && log.category !== 'IA') return false;
    if (filter === 'DB' && log.category !== 'DB') return false;
    if (filter === 'Erros' && log.level !== 'error') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchMsg = log.message.toLowerCase().includes(q);
      const matchCat = log.category.toLowerCase().includes(q);
      const matchDetails = log.details
        ? JSON.stringify(log.details).toLowerCase().includes(q)
        : false;
      return matchMsg || matchCat || matchDetails;
    }
    return true;
  });

  const errorCount = logs.filter((l) => l.level === 'error').length;
  const iaCount = logs.filter((l) => l.category === 'IA').length;
  const dbCount = logs.filter((l) => l.category === 'DB').length;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-4xl h-[90vh] max-h-[850px] bg-[#0d1117] text-slate-200 rounded-2xl sm:rounded-3xl border border-slate-800 shadow-2xl flex flex-col overflow-hidden font-mono text-xs"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho do Terminal Dark */}
        <div className="px-3 sm:px-4 py-3 bg-[#161b22] border-b border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="hidden sm:flex items-center gap-1.5">
              <button 
                onClick={onClose}
                className="w-3.5 h-3.5 rounded-full bg-red-500 hover:bg-red-600 transition flex items-center justify-center text-[8px] text-red-950 font-bold"
                title="Fechar terminal"
                aria-label="Fechar terminal"
              >
                ✕
              </button>
              <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 sm:ml-2 min-w-0">
              <Terminal className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-bold text-slate-100 text-xs sm:text-sm tracking-wide truncate">
                Diagnóstico em Tempo Real
              </span>
              <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-800 text-emerald-400 text-[10px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                AO VIVO
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Botão Copiar Logs */}
            <button
              onClick={handleCopyLogs}
              className="min-h-[40px] px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-sans font-semibold text-xs flex items-center gap-1.5 transition active:scale-95"
              title="Copiar relatório completo para colar no chat"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-blue-400" />}
              <span className="hidden sm:inline">{copied ? 'Copiado!' : 'Copiar Logs'}</span>
              <span className="sm:hidden">{copied ? 'OK' : 'Copiar'}</span>
            </button>

            {/* Botão Limpar Logs */}
            <button
              onClick={handleClearLogs}
              className="min-h-[40px] min-w-[40px] p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-red-400 transition flex items-center justify-center border border-transparent hover:border-slate-700"
              title="Limpar todos os logs"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            {/* Botão Fechar em Grande Destaque */}
            <button
              onClick={onClose}
              className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-red-950/50 hover:bg-red-900/80 text-red-200 border border-red-800/80 hover:border-red-600 font-sans font-bold text-xs flex items-center gap-1.5 transition active:scale-95 shadow-sm"
              title="Fechar painel do terminal"
              aria-label="Fechar terminal de diagnóstico"
            >
              <X className="w-4 h-4 text-red-400" />
              <span>Fechar</span>
            </button>
          </div>
        </div>

        {/* Barra de Filtros e Busca */}
        <div className="px-4 py-2.5 bg-[#12161f] border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2.5">
          {/* Pílulas de Categoria */}
          <div className="flex items-center gap-1.5 font-sans">
            <button
              onClick={() => setFilter('Todos')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                filter === 'Todos'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
              }`}
            >
              Todos ({logs.length})
            </button>

            <button
              onClick={() => setFilter('IA')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                filter === 'IA'
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3 h-3 text-purple-300" />
              IA ({iaCount})
            </button>

            <button
              onClick={() => setFilter('DB')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                filter === 'DB'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Database className="w-3 h-3 text-indigo-300" />
              MySQL / DB ({dbCount})
            </button>

            <button
              onClick={() => setFilter('Erros')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                filter === 'Erros'
                  ? 'bg-red-600 text-white'
                  : errorCount > 0
                  ? 'bg-red-950/70 border border-red-800 text-red-300 hover:bg-red-900/60'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
              }`}
            >
              <AlertCircle className="w-3 h-3 text-red-400" />
              Erros ({errorCount})
            </button>
          </div>

          {/* Campo de Busca Rápida */}
          <div className="relative flex-1 max-w-xs font-sans">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar em mensagens e payloads..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700/80 text-slate-200 placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Lista de Logs no Terminal */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#090d13]">
          {filteredLogs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 py-16 space-y-2 font-sans">
              <Terminal className="w-8 h-8 text-slate-600" />
              <p className="text-sm font-semibold">Nenhum evento registrado com esse filtro.</p>
              <p className="text-xs text-slate-500">Tire uma foto ou interaja com o sistema para ver os logs aqui.</p>
            </div>
          ) : (
            filteredLogs.map((log) => {
              const isExpanded = expandedLogIds.has(log.id);

              let badgeColor = 'bg-slate-800 text-slate-300';
              let Icon = Info;
              let textColor = 'text-slate-300';

              if (log.level === 'error') {
                badgeColor = 'bg-red-950/80 border border-red-800 text-red-400';
                Icon = AlertCircle;
                textColor = 'text-red-300';
              } else if (log.level === 'warn') {
                badgeColor = 'bg-amber-950/80 border border-amber-800 text-amber-400';
                Icon = AlertTriangle;
                textColor = 'text-amber-300';
              } else if (log.level === 'success') {
                badgeColor = 'bg-emerald-950/80 border border-emerald-800 text-emerald-400';
                Icon = CheckCircle;
                textColor = 'text-emerald-300';
              }

              let CategoryIcon = Terminal;
              if (log.category === 'IA') CategoryIcon = Sparkles;
              if (log.category === 'DB') CategoryIcon = Database;
              if (log.category === 'REDE') CategoryIcon = Wifi;
              if (log.category === 'IMAGEM') CategoryIcon = ImageIcon;

              return (
                <div
                  key={log.id}
                  className={`p-2.5 rounded-xl border transition-colors ${
                    log.level === 'error'
                      ? 'bg-red-950/20 border-red-900/60'
                      : log.level === 'warn'
                      ? 'bg-amber-950/20 border-amber-900/50'
                      : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {/* Hora */}
                    <span className="text-slate-500 select-none flex-shrink-0 pt-0.5 text-[11px]">
                      {log.timestamp}
                    </span>

                    {/* Tag Categoria */}
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700/80 flex-shrink-0">
                      <CategoryIcon className="w-2.5 h-2.5" />
                      {log.category}
                    </span>

                    {/* Tag Nível */}
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold flex-shrink-0 ${badgeColor}`}>
                      <Icon className="w-2.5 h-2.5" />
                      {log.level.toUpperCase()}
                    </span>

                    {/* Mensagem principal */}
                    <div className="flex-1 min-w-0">
                      <p className={`font-mono text-xs leading-relaxed break-words ${textColor}`}>
                        {log.message}
                      </p>

                      {/* Duração se houver */}
                      {log.durationMs !== undefined && (
                        <span className="inline-block mt-1 text-[10px] text-blue-400 bg-blue-950/60 border border-blue-900 px-1.5 py-0.2 rounded">
                          {log.durationMs}ms
                        </span>
                      )}

                      {/* Botão de Detalhes / Payload se houver */}
                      {log.details !== undefined && log.details !== null && (
                        <div className="mt-2">
                          <button
                            onClick={() => toggleExpand(log.id)}
                            className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 transition"
                          >
                            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                            <span>{isExpanded ? 'Ocultar Detalhes / Payload' : 'Ver Detalhes / Payload'}</span>
                          </button>

                          {isExpanded && (
                            <pre className="mt-1.5 p-2.5 rounded-lg bg-[#05070a] border border-slate-800 text-[11px] text-slate-300 overflow-x-auto whitespace-pre-wrap leading-tight">
                              {typeof log.details === 'string'
                                ? log.details
                                : JSON.stringify(log.details, null, 2)}
                            </pre>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={consoleEndRef} />
        </div>

        {/* Rodapé Informativo com Botão Fechar */}
        <div className="px-3 sm:px-4 py-2.5 bg-[#161b22] border-t border-slate-800 flex items-center justify-between gap-2 text-slate-400 text-[11px] font-sans">
          <span className="truncate">Armazenando últimos 100 eventos no <code>sessionStorage</code></span>
          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden sm:inline text-slate-500">ESC ou</span>
            <button
              onClick={onClose}
              className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-100 border border-slate-700 font-bold text-xs flex items-center gap-1.5 transition"
            >
              <X className="w-3.5 h-3.5 text-slate-400" />
              <span>Fechar Terminal</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
