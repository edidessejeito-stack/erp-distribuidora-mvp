import { Product, ERPBackup, DatabaseStatus, Operator } from '../types/index.ts';
import { addLog } from './logger.ts';

const DB_NAME = 'DistribuidoraERP_Cache';
const DB_VERSION = 2;
const STORE_PRODUCTS = 'products_cache';

// Helper para IndexedDB local (usado como cache offline e tolerância a falhas na rede)
let cachedDBInstance: IDBDatabase | null = null;

function getOfflineCacheDB(): Promise<IDBDatabase> {
  if (cachedDBInstance) return Promise.resolve(cachedDBInstance);

  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB não suportado'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_PRODUCTS)) {
        db.createObjectStore(STORE_PRODUCTS, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      cachedDBInstance = (event.target as IDBOpenDBRequest).result;
      resolve(cachedDBInstance);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

async function syncLocalCache(products: Product[]): Promise<void> {
  try {
    const db = await getOfflineCacheDB();
    const tx = db.transaction([STORE_PRODUCTS], 'readwrite');
    const store = tx.objectStore(STORE_PRODUCTS);
    store.clear();
    products.forEach((p) => store.put(p));
  } catch {
    // Silencioso em caso de restrição de sandbox
  }
}

async function getFromLocalCache(): Promise<Product[]> {
  try {
    const db = await getOfflineCacheDB();
    return new Promise((resolve) => {
      const tx = db.transaction([STORE_PRODUCTS], 'readonly');
      const store = tx.objectStore(STORE_PRODUCTS);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

/**
 * Consulta o status da conexão com o banco MySQL 9 no EasyPanel
 */
export async function getDatabaseStatus(): Promise<DatabaseStatus> {
  const startTime = Date.now();
  try {
    const res = await fetch('/api/db/status');
    const data: DatabaseStatus = await res.json();
    const duration = Date.now() - startTime;

    if (data.connected) {
      addLog('DB', 'success', `MySQL 9 Conectado [Host: ${data.host}:${data.port} | Banco: ${data.database}]`, data, duration);
    } else {
      addLog('DB', 'warn', `MySQL 9 em modo Resiliente (EasyPanel offline ou dados_erp não resolvido). Usando persistência local.`, data, duration);
    }
    return data;
  } catch (error) {
    const duration = Date.now() - startTime;
    addLog('DB', 'error', 'Falha ao consultar status do MySQL no servidor backend.', error, duration);
    return {
      connected: false,
      dialect: 'MySQL 9',
      host: 'dados_erp',
      port: 3306,
      database: 'erpdb',
      user: 'erpusr',
      mode: 'memory_fallback',
      lastError: (error as Error).message,
      checkedAt: new Date().toISOString(),
    };
  }
}

/**
 * Tenta forçar reconexão ao MySQL no EasyPanel
 */
export async function reconnectDatabase(): Promise<{ success: boolean; status: DatabaseStatus }> {
  const startTime = Date.now();
  try {
    const res = await fetch('/api/db/reconnect', { method: 'POST' });
    const data = await res.json();
    const duration = Date.now() - startTime;
    addLog('DB', data.success ? 'success' : 'warn', `Tentativa de reconexão MySQL: ${data.success ? 'Sucesso' : 'Pendente'}`, data, duration);
    return data;
  } catch (error) {
    const duration = Date.now() - startTime;
    addLog('DB', 'error', 'Erro ao solicitar reconexão MySQL ao servidor.', error, duration);
    throw error;
  }
}

/**
 * Autentica o operador no backend (gravando/validando na tabela 'operators' do MySQL)
 */
export async function loginOperator(email: string, password?: string): Promise<{ success: boolean; user: Operator }> {
  const startTime = Date.now();
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro na autenticação');
    }

    const data = await res.json();
    const duration = Date.now() - startTime;
    addLog('DB', 'success', `Operador autenticado no MySQL: "${email}" (${data.user.role})`, data.user, duration);
    return data;
  } catch (error) {
    const duration = Date.now() - startTime;
    addLog('DB', 'error', `Falha ao autenticar operador "${email}":`, error, duration);
    throw error;
  }
}

/**
 * Carrega todos os produtos do MySQL via API REST
 */
export async function getAllProducts(): Promise<Product[]> {
  const startTime = Date.now();
  try {
    const res = await fetch('/api/products');
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    const products: Product[] = await res.json();
    const duration = Date.now() - startTime;

    addLog('DB', 'info', `Carregados ${products.length} produtos da API MySQL.`, { count: products.length }, duration);
    syncLocalCache(products);
    return products;
  } catch (error) {
    const duration = Date.now() - startTime;
    addLog('DB', 'warn', 'Falha ao buscar produtos da API MySQL, recorrendo ao cache local offline:', error, duration);
    const cached = await getFromLocalCache();
    if (cached.length > 0) {
      addLog('DB', 'info', `Restaurados ${cached.length} produtos do cache local offline.`, null, duration);
      return cached;
    }
    throw error;
  }
}

/**
 * Busca produto por ID via API REST
 */
export async function getProductById(id: string): Promise<Product | undefined> {
  const startTime = Date.now();
  try {
    const res = await fetch(`/api/products/${encodeURIComponent(id)}`);
    if (res.status === 404) return undefined;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const product: Product = await res.json();
    const duration = Date.now() - startTime;
    addLog('DB', 'info', `Produto "${product.name}" obtido do MySQL.`, { id }, duration);
    return product;
  } catch (error) {
    const duration = Date.now() - startTime;
    addLog('DB', 'error', `Erro ao buscar produto ${id} na API:`, error, duration);
    const cached = await getFromLocalCache();
    return cached.find((p) => p.id === id);
  }
}

/**
 * Salva produto (Criação ou Edição 360°) no MySQL
 */
export async function saveProduct(product: Product): Promise<void> {
  const startTime = Date.now();
  try {
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    const saved: Product = await res.json();
    const duration = Date.now() - startTime;
    addLog('DB', 'success', `Produto "${saved.name}" salvo no MySQL com sucesso.`, { id: saved.id, stock: saved.stock, salePrice: saved.salePrice }, duration);

    // Atualiza cache local
    const cached = await getFromLocalCache();
    const updatedCache = cached.some((p) => p.id === saved.id)
      ? cached.map((p) => (p.id === saved.id ? saved : p))
      : [saved, ...cached];
    syncLocalCache(updatedCache);
  } catch (error) {
    const duration = Date.now() - startTime;
    addLog('DB', 'error', `Falha ao salvar produto "${product.name}" no MySQL:`, error, duration);
    throw error;
  }
}

/**
 * Atualização rápida de estoque (+ / -) gravada no MySQL com histórico de auditoria
 */
export async function updateProductStock(
  id: string,
  delta: number,
  reason?: string,
  operatorEmail?: string
): Promise<Product> {
  const startTime = Date.now();
  try {
    const res = await fetch(`/api/products/${encodeURIComponent(id)}/stock`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        delta,
        reason,
        operatorEmail: operatorEmail || localStorage.getItem('erp_user') || 'operador@distribuidora.com.br',
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    const updated: Product = await res.json();
    const duration = Date.now() - startTime;
    addLog(
      'DB',
      'info',
      `Estoque gravado no MySQL: "${updated.name}" agora tem ${updated.stock} un (${delta >= 0 ? '+' : ''}${delta})`,
      { id, delta, newStock: updated.stock },
      duration
    );

    return updated;
  } catch (error) {
    const duration = Date.now() - startTime;
    addLog('DB', 'error', `Erro ao atualizar estoque do produto ${id} no MySQL:`, error, duration);
    throw error;
  }
}

/**
 * Exclui produto no MySQL
 */
export async function deleteProduct(id: string): Promise<void> {
  const startTime = Date.now();
  try {
    const res = await fetch(`/api/products/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    const duration = Date.now() - startTime;
    addLog('DB', 'info', `Produto ${id} removido do banco MySQL com sucesso.`, { id }, duration);

    // Remove do cache local
    const cached = await getFromLocalCache();
    syncLocalCache(cached.filter((p) => p.id !== id));
  } catch (error) {
    const duration = Date.now() - startTime;
    addLog('DB', 'error', `Erro ao excluir produto ${id} no MySQL:`, error, duration);
    throw error;
  }
}

/**
 * Exporta todos os produtos do MySQL para backup JSON
 */
export async function exportBackup(): Promise<string> {
  const products = await getAllProducts();
  const backup: ERPBackup = {
    version: '2.0.0 (MySQL 9)',
    exportedAt: new Date().toISOString(),
    app: 'Distribuidora ERP Inteligente',
    totalProducts: products.length,
    products,
  };
  return JSON.stringify(backup, null, 2);
}

/**
 * Restaura dados do JSON diretamente para o MySQL
 */
export async function importBackup(jsonString: string): Promise<{ count: number }> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    throw new Error('Arquivo de backup inválido: não é um JSON válido.');
  }

  const data = parsed as Partial<ERPBackup>;
  if (!data || !Array.isArray(data.products)) {
    throw new Error('Formato de backup inválido: lista de produtos ausente.');
  }

  const startTime = Date.now();
  const res = await fetch('/api/products/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ products: data.products }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Falha ao importar produtos no MySQL');
  }

  const result = await res.json();
  const duration = Date.now() - startTime;
  addLog('DB', 'success', `Restauração concluída: ${result.count} produtos gravados no MySQL.`, result, duration);
  return result;
}

/**
 * Reseta o banco de dados MySQL para os 4 produtos oficiais de demonstração
 */
export async function resetDatabaseToDemo(): Promise<void> {
  const startTime = Date.now();
  const res = await fetch('/api/products/reset-demo', { method: 'POST' });
  if (!res.ok) {
    throw new Error('Falha ao restaurar produtos padrão no MySQL');
  }
  const duration = Date.now() - startTime;
  addLog('DB', 'success', 'Banco MySQL resetado para os 4 produtos padrão com sucesso.', null, duration);
}

/**
 * Armazenamento de Configurações persistidas no MySQL
 */
export async function getSetting<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const res = await fetch(`/api/settings/${encodeURIComponent(key)}`);
    if (res.ok) {
      const data = await res.json();
      return data.value !== null && data.value !== undefined ? (data.value as T) : defaultValue;
    }
  } catch {
    // fallback
  }

  // Fallback para localStorage
  if (typeof window !== 'undefined') {
    const item = localStorage.getItem(`setting_${key}`);
    if (item !== null) {
      try {
        return JSON.parse(item) as T;
      } catch {
        return defaultValue;
      }
    }
  }

  return defaultValue;
}

export async function setSetting<T>(key: string, value: T): Promise<void> {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`setting_${key}`, JSON.stringify(value));
    }
    await fetch(`/api/settings/${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value }),
    });
  } catch (e) {
    console.error('Erro ao salvar configuração no servidor:', e);
  }
}
