export type LogCategory = 'IA' | 'DB' | 'IMAGEM' | 'REDE' | 'SISTEMA';
export type LogLevel = 'info' | 'warn' | 'error' | 'success';

export interface LogEntry {
  id: string;
  timestamp: string;      // HH:mm:ss.SSS
  isoTime: string;
  category: LogCategory;
  level: LogLevel;
  message: string;
  details?: unknown;
  durationMs?: number;
}

const STORAGE_KEY = 'erp_diagnostic_logs';
const MAX_LOGS = 100;

type LogListener = (logs: LogEntry[]) => void;
const listeners = new Set<LogListener>();

// Carrega histórico da sessionStorage para manter dados entre abas e reloads
function loadInitialLogs(): LogEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.slice(-MAX_LOGS);
    }
  } catch (e) {
    console.warn('Falha ao ler logs do sessionStorage:', e);
  }
  return [];
}

let inMemoryLogs: LogEntry[] = loadInitialLogs();

function saveToSessionStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(inMemoryLogs));
  } catch (e) {
    console.warn('Falha ao gravar logs no sessionStorage:', e);
  }
}

function notifyListeners(): void {
  listeners.forEach((listener) => {
    try {
      listener([...inMemoryLogs]);
    } catch (e) {
      console.error('Erro ao notificar listener de logs:', e);
    }
  });
}

export function addLog(
  category: LogCategory,
  level: LogLevel,
  message: string,
  details?: unknown,
  durationMs?: number
): LogEntry {
  const now = new Date();
  const timeString = `${now.getHours().toString().padStart(2, '0')}:${now
    .getMinutes()
    .toString()
    .padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now
    .getMilliseconds()
    .toString()
    .padStart(3, '0')}`;

  const entry: LogEntry = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: timeString,
    isoTime: now.toISOString(),
    category,
    level,
    message,
    details,
    durationMs,
  };

  inMemoryLogs.push(entry);
  if (inMemoryLogs.length > MAX_LOGS) {
    inMemoryLogs.shift();
  }

  saveToSessionStorage();
  notifyListeners();

  // Também espelha no console nativo do DevTools para conveniência
  const prefix = `[${entry.timestamp}] [${category}]`;
  if (level === 'error') {
    console.error(prefix, message, details || '');
  } else if (level === 'warn') {
    console.warn(prefix, message, details || '');
  } else {
    console.log(prefix, message, details || '');
  }

  return entry;
}

export function getLogs(): LogEntry[] {
  return [...inMemoryLogs];
}

export function clearLogs(): void {
  inMemoryLogs = [];
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(STORAGE_KEY);
  }
  notifyListeners();
}

export function subscribeLogs(listener: LogListener): () => void {
  listeners.add(listener);
  listener([...inMemoryLogs]);
  return () => {
    listeners.delete(listener);
  };
}

export function getErrorCount(): number {
  return inMemoryLogs.filter((l) => l.level === 'error').length;
}

export function formatLogsForClipboard(): string {
  const lines = [
    `=== RELATÓRIO DE DIAGNÓSTICO DO ERP (${new Date().toLocaleString('pt-BR')}) ===`,
    `Total de eventos: ${inMemoryLogs.length}`,
    `Erros encontrados: ${getErrorCount()}`,
    '--------------------------------------------------',
  ];

  inMemoryLogs.forEach((l) => {
    const dur = l.durationMs !== undefined ? ` (${l.durationMs}ms)` : '';
    lines.push(`[${l.timestamp}] [${l.level.toUpperCase()}] [${l.category}] ${l.message}${dur}`);
    if (l.details) {
      try {
        const detailsStr = typeof l.details === 'string' ? l.details : JSON.stringify(l.details, null, 2);
        lines.push(`   Detalhes: ${detailsStr}`);
      } catch {
        lines.push(`   Detalhes: [Objeto não serializável]`);
      }
    }
  });

  return lines.join('\n');
}

// Log inicial do sistema
addLog('SISTEMA', 'info', 'Console de Diagnóstico em Tempo Real inicializado.');
