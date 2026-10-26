import { Product, ERPBackup, StockMovement, MovementType, MovementAuditPayload } from '../types/index.ts';
import { addLog } from './logger.ts';

const DB_NAME = 'DistribuidoraERP_DB';
const DB_VERSION = 2;
const STORE_PRODUCTS = 'products';
const STORE_MOVEMENTS = 'movements';
const STORE_SETTINGS = 'settings';

export function formatMovementTypeLabel(type: MovementType): string {
  switch (type) {
    case 'entrada_compra':
      return 'Entrada por Compra';
    case 'saida_venda':
      return 'Saída / Venda';
    case 'ajuste_inventario':
      return 'Ajuste de Inventário';
    case 'contagem_diaria':
      return 'Contagem Diária';
    case 'perda_avaria':
      return 'Perda / Avaria';
    case 'saldo_inicial':
      return 'Saldo Inicial / Cadastro';
    default:
      return 'Ajuste de Estoque';
  }
}

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

      // Cria a tabela de movimentações de estoque (Kardex e Auditoria Imutável)
      if (!db.objectStoreNames.contains(STORE_MOVEMENTS)) {
        const movementStore = db.createObjectStore(STORE_MOVEMENTS, { keyPath: 'id' });
        movementStore.createIndex('productId', 'productId', { unique: false });
        movementStore.createIndex('timestamp', 'timestamp', { unique: false });
        movementStore.createIndex('type', 'type', { unique: false });
      }

      // Cria a tabela de configurações e metadados
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS, { keyPath: 'key' });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;

      // Checa se precisa inicializar o seed inicial de produtos e movimentações
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
        // Banco vazio: semeia os 4 produtos padrão e o saldo inicial no Kardex
        const writeTx = db.transaction([STORE_PRODUCTS, STORE_MOVEMENTS], 'readwrite');
        const writeProductStore = writeTx.objectStore(STORE_PRODUCTS);
        const writeMovementStore = writeTx.objectStore(STORE_MOVEMENTS);

        INITIAL_PRODUCTS_SEED.forEach((prod, index) => {
          writeProductStore.put(prod);

          // Cria registro de Saldo Inicial / Implantação correspondente
          const initialMovement: StockMovement = {
            id: `seed-mov-${prod.id}`,
            productId: prod.id,
            productName: prod.name,
            productBarcode: prod.barcode,
            productSku: prod.sku,
            productImage: prod.image,
            productUnit: prod.unit,
            type: 'saldo_inicial',
            typeLabel: 'Saldo Inicial / Implantação',
            previousStock: 0,
            newStock: prod.stock,
            delta: prod.stock,
            operator: 'admin@distribuidora.com.br',
            reason: 'Inventário físico inicial apurado no onboarding do sistema ERP.',
            auditPayload: {
              origin: 'importacao',
              timestamp: new Date(Date.now() - (4 - index) * 3600000).toISOString(),
              operatorEmail: 'admin@distribuidora.com.br',
              extraDetails: { seed: true },
            },
            timestamp: new Date(Date.now() - (4 - index) * 3600000).toISOString(),
          };
          writeMovementStore.put(initialMovement);
        });

        writeTx.oncomplete = () => {
          addLog('DB', 'success', `Seed inicial concluído com ${INITIAL_PRODUCTS_SEED.length} produtos e histórico Kardex.`);
          resolve();
        };
        writeTx.onerror = () => {
          addLog('DB', 'error', 'Falha ao executar seed inicial no IndexedDB.');
          resolve();
        };
      } else {
        // Verifica se a tabela de movimentações precisa de seed retrospectivo (se migrou de v1 para v2)
        const movTx = db.transaction([STORE_MOVEMENTS, STORE_PRODUCTS], 'readwrite');
        const movStore = movTx.objectStore(STORE_MOVEMENTS);
        const movCountReq = movStore.count();

        movCountReq.onsuccess = () => {
          if (movCountReq.result === 0) {
            const prodStore = movTx.objectStore(STORE_PRODUCTS);
            const getAllReq = prodStore.getAll();
            getAllReq.onsuccess = () => {
              const currentProds = (getAllReq.result || []) as Product[];
              currentProds.forEach((prod, i) => {
                const initialMovement: StockMovement = {
                  id: `seed-migrated-${prod.id}`,
                  productId: prod.id,
                  productName: prod.name,
                  productBarcode: prod.barcode,
                  productSku: prod.sku,
                  productImage: prod.image,
                  productUnit: prod.unit,
                  type: 'saldo_inicial',
                  typeLabel: 'Saldo Inicial / Implantação',
                  previousStock: 0,
                  newStock: prod.stock,
                  delta: prod.stock,
                  operator: 'admin@distribuidora.com.br',
                  reason: 'Saldo inicial apurado na migração para a arquitetura de movimentações rastreadas.',
                  auditPayload: {
                    origin: 'importacao',
                    timestamp: new Date(Date.now() - (currentProds.length - i) * 60000).toISOString(),
                    operatorEmail: 'admin@distribuidora.com.br',
                    extraDetails: { migratedFromV1: true },
                  },
                  timestamp: new Date(Date.now() - (currentProds.length - i) * 60000).toISOString(),
                };
                movStore.put(initialMovement);
              });
            };
          }
          resolve();
        };
        movCountReq.onerror = () => resolve();
      }
    };

    countRequest.onerror = () => {
      addLog('DB', 'error', 'Falha ao contar produtos no IndexedDB.');
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
      const prods = request.result || [];
      addLog('DB', 'info', `Carregados ${prods.length} produtos do IndexedDB.`);
      resolve(prods);
    };
    request.onerror = () => {
      addLog('DB', 'error', 'Erro ao listar produtos do IndexedDB.');
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
      addLog('DB', 'success', `Produto "${product.name}" salvo no IndexedDB com sucesso.`, { id: product.id, stock: product.stock, price: product.salePrice });
      resolve();
    };
    request.onerror = () => {
      addLog('DB', 'error', `Falha ao salvar produto "${product.name}" no IndexedDB:`, request.error);
      reject(request.error);
    };
  });
}

export interface RecordMovementParams {
  productId: string;
  type: MovementType;
  delta?: number;
  targetStock?: number;
  operator: string;
  reason: string;
  auditPayload?: Partial<MovementAuditPayload>;
}

/**
 * Registra uma movimentação imutável no Kardex e atualiza o saldo do produto no mesmo bloco transacional
 */
export async function recordStockMovement(params: RecordMovementParams): Promise<{ product: Product; movement: StockMovement }> {
  const { productId, type, delta, targetStock, operator, reason, auditPayload } = params;

  if (!reason || reason.trim().length === 0) {
    throw new Error('O motivo da movimentação é obrigatório para auditoria e rastreabilidade.');
  }

  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_PRODUCTS, STORE_MOVEMENTS], 'readwrite');
    const prodStore = tx.objectStore(STORE_PRODUCTS);
    const movStore = tx.objectStore(STORE_MOVEMENTS);

    const getReq = prodStore.get(productId);

    getReq.onsuccess = () => {
      const prod = getReq.result as Product | undefined;
      if (!prod) {
        addLog('DB', 'error', `Produto "${productId}" não encontrado para movimentar estoque.`);
        reject(new Error(`Produto ID "${productId}" não encontrado no cadastro.`));
        return;
      }

      const previousStock = prod.stock;
      let newStock = previousStock;
      let calculatedDelta = 0;

      if (targetStock !== undefined) {
        newStock = Math.max(0, targetStock);
        calculatedDelta = newStock - previousStock;
      } else if (delta !== undefined) {
        calculatedDelta = delta;
        newStock = Math.max(0, previousStock + delta);
      }

      const updatedProduct: Product = {
        ...prod,
        stock: newStock,
        updatedAt: new Date().toISOString(),
      };

      const movementId = `mov-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const movement: StockMovement = {
        id: movementId,
        productId: prod.id,
        productName: prod.name,
        productBarcode: prod.barcode,
        productSku: prod.sku,
        productImage: prod.image,
        productUnit: prod.unit,
        type,
        typeLabel: formatMovementTypeLabel(type),
        previousStock,
        newStock,
        delta: calculatedDelta,
        operator: operator || 'Operador',
        reason: reason.trim(),
        auditPayload: {
          origin: auditPayload?.origin || 'manual',
          timestamp: new Date().toISOString(),
          operatorEmail: operator || 'Operador',
          photoAttached: auditPayload?.photoAttached || false,
          photoUrl: auditPayload?.photoUrl,
          aiPrompt: auditPayload?.aiPrompt,
          aiInterpretation: auditPayload?.aiInterpretation,
          extraDetails: auditPayload?.extraDetails,
        },
        timestamp: new Date().toISOString(),
      };

      prodStore.put(updatedProduct);
      movStore.put(movement);

      tx.oncomplete = () => {
        addLog(
          'DB',
          'success',
          `Movimentação Kardex gravada: [${movement.typeLabel}] "${prod.name}" (${calculatedDelta >= 0 ? '+' : ''}${calculatedDelta}) | Saldo: ${previousStock} -> ${newStock} | Op: ${operator}`,
          {
            movementId,
            reason: movement.reason,
            audit: movement.auditPayload,
          }
        );
        resolve({ product: updatedProduct, movement });
      };

      tx.onerror = () => {
        addLog('DB', 'error', `Falha ao gravar movimentação para "${prod.name}":`, tx.error);
        reject(tx.error);
      };
    };

    getReq.onerror = () => {
      reject(getReq.error);
    };
  });
}

/**
 * Retorna todo o histórico de movimentações ordenado decrescentemente por data
 */
export async function getAllMovements(): Promise<StockMovement[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_MOVEMENTS], 'readonly');
    const store = tx.objectStore(STORE_MOVEMENTS);
    const request = store.getAll();

    request.onsuccess = () => {
      const movs = (request.result || []) as StockMovement[];
      movs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      resolve(movs);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Retorna as movimentações de um produto específico
 */
export async function getMovementsByProductId(productId: string): Promise<StockMovement[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_MOVEMENTS], 'readonly');
    const store = tx.objectStore(STORE_MOVEMENTS);
    const index = store.index('productId');
    const request = index.getAll(productId);

    request.onsuccess = () => {
      const movs = (request.result || []) as StockMovement[];
      movs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      resolve(movs);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Atualização de estoque sempre registrada no Kardex
 */
export async function updateProductStock(
  id: string,
  delta: number,
  operator: string = 'admin@distribuidora.com.br',
  reason: string = 'Ajuste manual com registro automático de auditoria'
): Promise<Product> {
  const res = await recordStockMovement({
    productId: id,
    type: delta > 0 ? 'entrada_compra' : 'saida_venda',
    delta,
    operator,
    reason,
    auditPayload: {
      origin: 'manual',
    },
  });
  return res.product;
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
  const movements = await getAllMovements();
  const backup: ERPBackup = {
    version: '2.0.0',
    exportedAt: new Date().toISOString(),
    app: 'Distribuidora ERP Inteligente',
    totalProducts: products.length,
    products,
    movements,
  };
  return JSON.stringify(backup, null, 2);
}

/**
 * Restaura dados do JSON para o IndexedDB
 */
export async function importBackup(jsonString: string): Promise<{ count: number; movementsCount?: number }> {
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
  const movementList = Array.isArray(data.movements) ? data.movements : [];
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_PRODUCTS, STORE_MOVEMENTS], 'readwrite');
    const store = tx.objectStore(STORE_PRODUCTS);
    const movStore = tx.objectStore(STORE_MOVEMENTS);

    let count = 0;
    productList.forEach((prod) => {
      if (prod && prod.id && prod.name) {
        store.put(prod);
        count++;
      }
    });

    let movementsCount = 0;
    movementList.forEach((mov) => {
      if (mov && mov.id && mov.productId) {
        movStore.put(mov);
        movementsCount++;
      }
    });

    tx.oncomplete = () => {
      addLog('DB', 'success', `Backup restaurado: ${count} produtos e ${movementsCount} movimentações.`);
      resolve({ count, movementsCount });
    };
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Reseta o banco de dados para os 4 produtos padrão de demonstração
 */
export async function resetDatabaseToDemo(): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_PRODUCTS, STORE_MOVEMENTS], 'readwrite');
    const store = tx.objectStore(STORE_PRODUCTS);
    const movStore = tx.objectStore(STORE_MOVEMENTS);
    store.clear();
    movStore.clear();

    INITIAL_PRODUCTS_SEED.forEach((prod, index) => {
      store.put(prod);

      const initialMovement: StockMovement = {
        id: `seed-mov-${prod.id}`,
        productId: prod.id,
        productName: prod.name,
        productBarcode: prod.barcode,
        productSku: prod.sku,
        productImage: prod.image,
        productUnit: prod.unit,
        type: 'saldo_inicial',
        typeLabel: 'Saldo Inicial / Implantação',
        previousStock: 0,
        newStock: prod.stock,
        delta: prod.stock,
        operator: 'admin@distribuidora.com.br',
        reason: 'Inventário físico inicial apurado no onboarding do sistema ERP.',
        auditPayload: {
          origin: 'importacao',
          timestamp: new Date(Date.now() - (4 - index) * 3600000).toISOString(),
          operatorEmail: 'admin@distribuidora.com.br',
          extraDetails: { seed: true },
        },
        timestamp: new Date(Date.now() - (4 - index) * 3600000).toISOString(),
      };
      movStore.put(initialMovement);
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
