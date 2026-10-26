import { Product, ERPBackup } from '../types/index.ts';

const DB_NAME = 'DistribuidoraERP_DB';
const DB_VERSION = 1;
const STORE_PRODUCTS = 'products';
const STORE_SETTINGS = 'settings';

// SVGs leves para os produtos demo iniciais
const svgHeineken = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><rect width="300" height="300" rx="36" fill="%23007A33"/><path d="M142 40h16v35l14 25v130h-44v-130l14-25z" fill="%230b4d26"/><path d="M146 36h8v10h-8z" fill="%23c4122f"/><rect x="130" y="130" width="40" height="50" rx="4" fill="%23ffffff"/><polygon points="150,140 153,148 162,148 155,153 158,161 150,156 142,161 145,153 138,148 147,148" fill="%23c4122f"/><text x="150" y="260" font-family="sans-serif" font-weight="bold" font-size="20" fill="%23ffffff" text-anchor="middle">HEINEKEN 600ML</text></svg>`;

const svgBrahma = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><rect width="300" height="300" rx="36" fill="%23B91C1C"/><rect x="110" y="50" width="80" height="150" rx="20" fill="%23E5E7EB"/><rect x="115" y="70" width="70" height="110" rx="8" fill="%23991B1B"/><text x="150" y="135" font-family="sans-serif" font-weight="900" font-size="14" fill="%23FBBF24" text-anchor="middle">DUPLO MALTE</text><text x="150" y="260" font-family="sans-serif" font-weight="bold" font-size="20" fill="%23ffffff" text-anchor="middle">BRAHMA LATA 350ML</text></svg>`;

const svgCocaCola = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><rect width="300" height="300" rx="36" fill="%23DC2626"/><path d="M135 45h30v25l18 35v120h-66v-120l18-35z" fill="%2318181B"/><rect x="138" y="35" width="24" height="12" rx="3" fill="%23DC2626"/><rect x="120" y="125" width="60" height="45" rx="4" fill="%23DC2626"/><text x="150" y="152" font-family="serif" font-style="italic" font-weight="bold" font-size="16" fill="%23ffffff" text-anchor="middle">Coca-Cola</text><text x="150" y="260" font-family="sans-serif" font-weight="bold" font-size="20" fill="%23ffffff" text-anchor="middle">COCA-COLA PET 2L</text></svg>`;

const svgCarvao = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><rect width="300" height="300" rx="36" fill="%23374151"/><path d="M100 70h100l15 140h-130z" fill="%23D97706"/><rect x="110" y="100" width="80" height="60" rx="6" fill="%231F2937"/><text x="150" y="135" font-family="sans-serif" font-weight="bold" font-size="14" fill="%23F59E0B" text-anchor="middle">CARVÃO 3KG</text><text x="150" y="260" font-family="sans-serif" font-weight="bold" font-size="20" fill="%23ffffff" text-anchor="middle">CARVÃO VEGETAL</text></svg>`;

export const INITIAL_PRODUCTS_SEED: Product[] = [
  {
    id: 'prod-heineken-600',
    name: 'Cerveja Heineken 600ml Retornável',
    brand: 'Heineken',
    category: 'Cerveja',
    barcode: '7896045505418',
    sku: 'CERV-HEIN-600',
    image: svgHeineken,
    // Fiscal
    ncm: '2203.00.00',
    cest: '03.001.00',
    cfop: '5405',
    csosn: '500',
    origin: '0 - Nacional',
    icmsTax: 0, // Substituição Tributária
    // Medidas e Embalagem
    unit: 'UN',
    packageType: 'Retornável',
    volume: '600ml',
    itemsPerPack: 12,
    dimensions: { height: 28, width: 8, length: 8 },
    grossWeight: 1.15,
    // Preços e Estoque
    costPrice: 6.50,
    salePrice: 9.50,
    wholesalePrice: 8.80,
    suggestedMarketPrice: { min: 8.90, max: 11.50, average: 9.50 },
    stock: 120,
    minStock: 36,
    // Metadados
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    source: 'ai',
  },
  {
    id: 'prod-brahma-350',
    name: 'Cerveja Brahma Duplo Malte Lata 350ml',
    brand: 'Ambev / Brahma',
    category: 'Cerveja',
    barcode: '7891991010894',
    sku: 'CERV-BRAH-350L',
    image: svgBrahma,
    // Fiscal
    ncm: '2203.00.00',
    cest: '03.001.00',
    cfop: '5405',
    csosn: '500',
    origin: '0 - Nacional',
    icmsTax: 0,
    // Medidas e Embalagem
    unit: 'UN',
    packageType: 'Lata',
    volume: '350ml',
    itemsPerPack: 12,
    dimensions: { height: 12.5, width: 6.5, length: 6.5 },
    grossWeight: 0.38,
    // Preços e Estoque
    costPrice: 2.90,
    salePrice: 4.50,
    wholesalePrice: 4.10,
    suggestedMarketPrice: { min: 4.20, max: 5.50, average: 4.50 },
    stock: 240,
    minStock: 48,
    // Metadados
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    source: 'ai',
  },
  {
    id: 'prod-coca-2l',
    name: 'Refrigerante Coca-Cola PET 2L',
    brand: 'Coca-Cola',
    category: 'Refrigerante',
    barcode: '7894900010015',
    sku: 'REFR-COCA-2L',
    image: svgCocaCola,
    // Fiscal
    ncm: '2202.10.00',
    cest: '03.011.00',
    cfop: '5405',
    csosn: '500',
    origin: '0 - Nacional',
    icmsTax: 0,
    // Medidas e Embalagem
    unit: 'UN',
    packageType: 'PET',
    volume: '2L',
    itemsPerPack: 6,
    dimensions: { height: 35, width: 10, length: 10 },
    grossWeight: 2.15,
    // Preços e Estoque
    costPrice: 7.20,
    salePrice: 10.90,
    wholesalePrice: 9.90,
    suggestedMarketPrice: { min: 9.99, max: 12.50, average: 10.90 },
    stock: 18, // Abaixo do estoque mínimo de 24 (Alerta de reposição ativo!)
    minStock: 24,
    // Metadados
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    source: 'ai',
  },
  {
    id: 'prod-carvao-3kg',
    name: 'Carvão Vegetal Ecológico 3kg',
    brand: 'Braseiro',
    category: 'Carvão/Gelo',
    barcode: '7898912345678',
    sku: 'CARV-ECOL-3KG',
    image: svgCarvao,
    // Fiscal
    ncm: '4402.90.00',
    cest: '00.000.00',
    cfop: '5102',
    csosn: '102',
    origin: '0 - Nacional',
    icmsTax: 18, // Tributação normal
    // Medidas e Embalagem
    unit: 'SC',
    packageType: 'Saco',
    volume: '3kg',
    itemsPerPack: 1,
    dimensions: { height: 50, width: 25, length: 15 },
    grossWeight: 3.1,
    // Preços e Estoque
    costPrice: 14.00,
    salePrice: 22.00,
    wholesalePrice: 19.50,
    suggestedMarketPrice: { min: 20.00, max: 25.00, average: 22.00 },
    stock: 35,
    minStock: 15,
    // Metadados
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    source: 'ai',
  },
];

let dbInstance: IDBDatabase | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }

  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB não suportado neste navegador'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Cria a tabela de produtos
      if (!db.objectStoreNames.contains(STORE_PRODUCTS)) {
        const productStore = db.createObjectStore(STORE_PRODUCTS, { keyPath: 'id' });
        productStore.createIndex('category', 'category', { unique: false });
        productStore.createIndex('name', 'name', { unique: false });
        productStore.createIndex('barcode', 'barcode', { unique: false });
      }

      // Cria a tabela de configurações e metadados
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS, { keyPath: 'key' });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;

      // Checa se precisa inicializar o seed inicial
      checkAndSeedDatabase(dbInstance).then(() => {
        resolve(dbInstance!);
      });
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

async function checkAndSeedDatabase(db: IDBDatabase): Promise<void> {
  return new Promise((resolve) => {
    const transaction = db.transaction([STORE_PRODUCTS], 'readonly');
    const store = transaction.objectStore(STORE_PRODUCTS);
    const countRequest = store.count();

    countRequest.onsuccess = () => {
      if (countRequest.result === 0) {
        // Banco vazio: semeia os 4 produtos reais da distribuidora
        const writeTx = db.transaction([STORE_PRODUCTS], 'readwrite');
        const writeStore = writeTx.objectStore(STORE_PRODUCTS);
        INITIAL_PRODUCTS_SEED.forEach((prod) => {
          writeStore.put(prod);
        });
        writeTx.oncomplete = () => {
          resolve();
        };
        writeTx.onerror = () => {
          resolve();
        };
      } else {
        resolve();
      }
    };

    countRequest.onerror = () => {
      resolve();
    };
  });
}

export async function getAllProducts(): Promise<Product[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_PRODUCTS], 'readonly');
    const store = tx.objectStore(STORE_PRODUCTS);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result || []);
    };
    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function getProductById(id: string): Promise<Product | undefined> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_PRODUCTS], 'readonly');
    const store = tx.objectStore(STORE_PRODUCTS);
    const request = store.get(id);

    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function saveProduct(product: Product): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_PRODUCTS], 'readwrite');
    const store = tx.objectStore(STORE_PRODUCTS);
    const request = store.put({
      ...product,
      updatedAt: new Date().toISOString(),
    });

    request.onsuccess = () => {
      resolve();
    };
    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function updateProductStock(id: string, delta: number): Promise<Product> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_PRODUCTS], 'readwrite');
    const store = tx.objectStore(STORE_PRODUCTS);
    const getReq = store.get(id);

    getReq.onsuccess = () => {
      const prod = getReq.result as Product | undefined;
      if (!prod) {
        reject(new Error(`Produto ${id} não encontrado`));
        return;
      }
      const newStock = Math.max(0, prod.stock + delta);
      const updated: Product = {
        ...prod,
        stock: newStock,
        updatedAt: new Date().toISOString(),
      };
      const putReq = store.put(updated);
      putReq.onsuccess = () => resolve(updated);
      putReq.onerror = () => reject(putReq.error);
    };

    getReq.onerror = () => reject(getReq.error);
  });
}

export async function deleteProduct(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_PRODUCTS], 'readwrite');
    const store = tx.objectStore(STORE_PRODUCTS);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Exporta todos os dados do IndexedDB para JSON com estrutura validada
 */
export async function exportBackup(): Promise<string> {
  const products = await getAllProducts();
  const backup: ERPBackup = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    app: 'Distribuidora ERP Inteligente',
    totalProducts: products.length,
    products,
  };
  return JSON.stringify(backup, null, 2);
}

/**
 * Restaura dados do JSON para o IndexedDB
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

  const productList = data.products;
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_PRODUCTS], 'readwrite');
    const store = tx.objectStore(STORE_PRODUCTS);

    let count = 0;
    productList.forEach((prod) => {
      if (prod && prod.id && prod.name) {
        store.put(prod);
        count++;
      }
    });

    tx.oncomplete = () => resolve({ count });
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Reseta o banco de dados para os 4 produtos padrão de demonstração
 */
export async function resetDatabaseToDemo(): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_PRODUCTS], 'readwrite');
    const store = tx.objectStore(STORE_PRODUCTS);
    store.clear();

    INITIAL_PRODUCTS_SEED.forEach((prod) => {
      store.put(prod);
    });

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Armazenamento de Configurações no IndexedDB
 */
export async function getSetting<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction([STORE_SETTINGS], 'readonly');
      const store = tx.objectStore(STORE_SETTINGS);
      const req = store.get(key);

      req.onsuccess = () => {
        if (req.result && 'value' in req.result) {
          resolve(req.result.value as T);
        } else {
          resolve(defaultValue);
        }
      };
      req.onerror = () => resolve(defaultValue);
    });
  } catch {
    return defaultValue;
  }
}

export async function setSetting<T>(key: string, value: T): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_SETTINGS], 'readwrite');
      const store = tx.objectStore(STORE_SETTINGS);
      const req = store.put({ key, value });

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.error('Erro ao salvar configuração:', e);
  }
}
