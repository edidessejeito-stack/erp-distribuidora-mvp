import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { Product, ERPBackup } from '../src/types/index.ts';

dotenv.config();

// Configurações de Conexão MySQL 9 fornecidas pelo usuário
const DB_HOST = process.env.DB_HOST || 'dados_erp';
const DB_PORT = Number(process.env.DB_PORT) || 3306;
const DB_USER = process.env.DB_USER || 'erpusr';
const DB_PASSWORD = process.env.DB_PASSWORD || 'ErpPwd1';
const DB_NAME = process.env.DB_NAME || 'erpdb';
const DATABASE_URL =
  process.env.DATABASE_URL ||
  `mysql://${DB_USER}:${encodeURIComponent(DB_PASSWORD)}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;

export interface Operator {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'gerente' | 'operador';
  createdAt: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  type: 'entrada' | 'saida' | 'ajuste' | 'inventario';
  delta: number;
  finalStock: number;
  reason?: string;
  operatorEmail?: string;
  createdAt: string;
}

export interface DatabaseStatus {
  connected: boolean;
  dialect: string;
  host: string;
  port: number;
  database: string;
  user: string;
  mode: 'mysql' | 'memory_fallback';
  lastError?: string;
  totalProducts?: number;
  checkedAt: string;
}

// 4 Produtos reais iniciais da distribuidora para seed automático
const INITIAL_PRODUCTS_SEED: Product[] = [
  {
    id: 'prod-heineken-600',
    name: 'Cerveja Heineken 600ml Retornável',
    brand: 'Heineken',
    category: 'Cerveja',
    barcode: '7896045505418',
    sku: 'CERV-HEIN-600',
    image: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><rect width="300" height="300" rx="36" fill="%23007A33"/><path d="M142 40h16v35l14 25v130h-44v-130l14-25z" fill="%230b4d26"/><path d="M146 36h8v10h-8z" fill="%23c4122f"/><rect x="130" y="130" width="40" height="50" rx="4" fill="%23ffffff"/><polygon points="150,140 153,148 162,148 155,153 158,161 150,156 142,161 145,153 138,148 147,148" fill="%23c4122f"/><text x="150" y="260" font-family="sans-serif" font-weight="bold" font-size="20" fill="%23ffffff" text-anchor="middle">HEINEKEN 600ML</text></svg>',
    ncm: '2203.00.00',
    cest: '03.001.00',
    cfop: '5405',
    csosn: '500',
    origin: '0 - Nacional',
    icmsTax: 0,
    unit: 'UN',
    packageType: 'Retornável',
    volume: '600ml',
    itemsPerPack: 12,
    dimensions: { height: 28, width: 8, length: 8 },
    grossWeight: 1.15,
    costPrice: 6.5,
    salePrice: 9.5,
    wholesalePrice: 8.8,
    suggestedMarketPrice: { min: 8.9, max: 11.5, average: 9.5 },
    stock: 120,
    minStock: 36,
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
    image: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><rect width="300" height="300" rx="36" fill="%23B91C1C"/><rect x="110" y="50" width="80" height="150" rx="20" fill="%23E5E7EB"/><rect x="115" y="70" width="70" height="110" rx="8" fill="%23991B1B"/><text x="150" y="135" font-family="sans-serif" font-weight="900" font-size="14" fill="%23FBBF24" text-anchor="middle">DUPLO MALTE</text><text x="150" y="260" font-family="sans-serif" font-weight="bold" font-size="20" fill="%23ffffff" text-anchor="middle">BRAHMA LATA 350ML</text></svg>',
    ncm: '2203.00.00',
    cest: '03.001.00',
    cfop: '5405',
    csosn: '500',
    origin: '0 - Nacional',
    icmsTax: 0,
    unit: 'UN',
    packageType: 'Lata',
    volume: '350ml',
    itemsPerPack: 12,
    dimensions: { height: 12.5, width: 6.5, length: 6.5 },
    grossWeight: 0.38,
    costPrice: 2.9,
    salePrice: 4.5,
    wholesalePrice: 4.1,
    suggestedMarketPrice: { min: 4.2, max: 5.5, average: 4.5 },
    stock: 240,
    minStock: 48,
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
    image: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><rect width="300" height="300" rx="36" fill="%23DC2626"/><path d="M135 45h30v25l18 35v120h-66v-120l18-35z" fill="%2318181B"/><rect x="138" y="35" width="24" height="12" rx="3" fill="%23DC2626"/><rect x="120" y="125" width="60" height="45" rx="4" fill="%23DC2626"/><text x="150" y="152" font-family="serif" font-style="italic" font-weight="bold" font-size="16" fill="%23ffffff" text-anchor="middle">Coca-Cola</text><text x="150" y="260" font-family="sans-serif" font-weight="bold" font-size="20" fill="%23ffffff" text-anchor="middle">COCA-COLA PET 2L</text></svg>',
    ncm: '2202.10.00',
    cest: '03.011.00',
    cfop: '5405',
    csosn: '500',
    origin: '0 - Nacional',
    icmsTax: 0,
    unit: 'UN',
    packageType: 'PET',
    volume: '2L',
    itemsPerPack: 6,
    dimensions: { height: 35, width: 10, length: 10 },
    grossWeight: 2.15,
    costPrice: 7.2,
    salePrice: 10.9,
    wholesalePrice: 9.9,
    suggestedMarketPrice: { min: 9.99, max: 12.5, average: 10.9 },
    stock: 18,
    minStock: 24,
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
    image: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><rect width="300" height="300" rx="36" fill="%23374151"/><path d="M100 70h100l15 140h-130z" fill="%23D97706"/><rect x="110" y="100" width="80" height="60" rx="6" fill="%231F2937"/><text x="150" y="135" font-family="sans-serif" font-weight="bold" font-size="14" fill="%23F59E0B" text-anchor="middle">CARVÃO 3KG</text><text x="150" y="260" font-family="sans-serif" font-weight="bold" font-size="20" fill="%23ffffff" text-anchor="middle">CARVÃO VEGETAL</text></svg>',
    ncm: '4402.90.00',
    cest: '00.000.00',
    cfop: '5102',
    csosn: '102',
    origin: '0 - Nacional',
    icmsTax: 18,
    unit: 'SC',
    packageType: 'Saco',
    volume: '3kg',
    itemsPerPack: 1,
    dimensions: { height: 50, width: 25, length: 15 },
    grossWeight: 3.1,
    costPrice: 14.0,
    salePrice: 22.0,
    wholesalePrice: 19.5,
    suggestedMarketPrice: { min: 20.0, max: 25.0, average: 22.0 },
    stock: 35,
    minStock: 15,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    source: 'ai',
  },
];

// Fallback em memória caso o container MySQL ainda não esteja no mesmo network bridge
let memoryProducts: Map<string, Product> = new Map(
  INITIAL_PRODUCTS_SEED.map((p) => [p.id, { ...p }])
);
let memoryOperators: Map<string, Operator> = new Map([
  [
    'admin@distribuidora.com.br',
    {
      id: 'op-admin-1',
      email: 'admin@distribuidora.com.br',
      name: 'Administrador ERP',
      role: 'admin',
      createdAt: new Date().toISOString(),
    },
  ],
  [
    'gerente@distribuidora.com.br',
    {
      id: 'op-gerente-1',
      email: 'gerente@distribuidora.com.br',
      name: 'Gerente de Logística',
      role: 'gerente',
      createdAt: new Date().toISOString(),
    },
  ],
]);
let memoryMovements: StockMovement[] = [];
let memorySettings: Map<string, unknown> = new Map();

// Estado do Pool de Conexão MySQL
let pool: mysql.Pool | null = null;
let isConnected = false;
let lastError: string | undefined = undefined;

/**
 * Cria ou recupera o Pool de Conexões do MySQL
 */
export function getMySQLPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      maxIdle: 5,
      idleTimeout: 60000,
      queueLimit: 0,
      connectTimeout: 4000, // Timeout ágil para não bloquear inicialização
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
    });
  }
  return pool;
}

/**
 * Inicializa e cria as tabelas do MySQL 9 se não existirem
 */
export async function initDatabase(): Promise<boolean> {
  try {
    console.log(
      `[MySQL 9] Tentando conectar ao banco de dados '${DB_NAME}' em '${DB_HOST}:${DB_PORT}' (Usuário: ${DB_USER})...`
    );
    const p = getMySQLPool();
    const conn = await p.getConnection();

    // 1. Tabela de Operadores / Usuários do ERP
    await conn.query(`
      CREATE TABLE IF NOT EXISTS operators (
        id VARCHAR(64) PRIMARY KEY,
        email VARCHAR(191) NOT NULL UNIQUE,
        name VARCHAR(191) NOT NULL,
        role VARCHAR(32) NOT NULL DEFAULT 'operador',
        password_hash VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 2. Tabela de Produtos da Distribuidora
    await conn.query(`
      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        brand VARCHAR(128) NOT NULL DEFAULT '',
        category VARCHAR(64) NOT NULL DEFAULT 'Outros',
        barcode VARCHAR(64) NOT NULL DEFAULT '',
        sku VARCHAR(64) NOT NULL DEFAULT '',
        image LONGTEXT,
        ncm VARCHAR(32) NOT NULL DEFAULT '',
        cest VARCHAR(32) NOT NULL DEFAULT '',
        cfop VARCHAR(16) NOT NULL DEFAULT '',
        csosn VARCHAR(16) NOT NULL DEFAULT '',
        origin VARCHAR(64) NOT NULL DEFAULT '',
        icms_tax DECIMAL(5,2) NOT NULL DEFAULT 0.00,
        unit VARCHAR(16) NOT NULL DEFAULT 'UN',
        package_type VARCHAR(32) NOT NULL DEFAULT 'Outro',
        volume VARCHAR(64) NOT NULL DEFAULT '',
        items_per_pack INT NOT NULL DEFAULT 1,
        dimensions_json JSON,
        gross_weight DECIMAL(8,3) NOT NULL DEFAULT 0.000,
        cost_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        sale_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        wholesale_price DECIMAL(10,2) NULL,
        suggested_price_json JSON,
        stock INT NOT NULL DEFAULT 0,
        min_stock INT NOT NULL DEFAULT 0,
        source VARCHAR(32) NOT NULL DEFAULT 'manual',
        created_at VARCHAR(64) NOT NULL,
        updated_at VARCHAR(64) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3. Tabela de Movimentações de Estoque (Auditoria e Kárdex)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS stock_movements (
        id VARCHAR(64) PRIMARY KEY,
        product_id VARCHAR(64) NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        type VARCHAR(32) NOT NULL,
        delta INT NOT NULL,
        final_stock INT NOT NULL,
        reason VARCHAR(255) NULL,
        operator_email VARCHAR(191) NULL,
        created_at VARCHAR(64) NOT NULL,
        INDEX idx_prod (product_id),
        INDEX idx_time (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 4. Tabela de Configurações
    await conn.query(`
      CREATE TABLE IF NOT EXISTS settings (
        setting_key VARCHAR(128) PRIMARY KEY,
        setting_value LONGTEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 5. Tabela de Logs do Sistema
    await conn.query(`
      CREATE TABLE IF NOT EXISTS system_logs (
        id VARCHAR(64) PRIMARY KEY,
        category VARCHAR(32) NOT NULL,
        level VARCHAR(16) NOT NULL,
        message TEXT NOT NULL,
        details_json JSON,
        created_at VARCHAR(64) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Verifica se precisa de seed inicial
    const [rows] = await conn.query<mysql.RowDataPacket[]>('SELECT COUNT(*) as total FROM products');
    const totalCount = Number(rows[0]?.total || 0);

    if (totalCount === 0) {
      console.log(`[MySQL 9] Tabela 'products' vazia. Inserindo ${INITIAL_PRODUCTS_SEED.length} produtos de demonstração...`);
      for (const prod of INITIAL_PRODUCTS_SEED) {
        await insertOrUpdateProductMySQL(conn, prod);
      }
      console.log('[MySQL 9] Seed de produtos concluído com sucesso.');
    }

    // Insere operadores padrão se não existirem
    await conn.query(`
      INSERT IGNORE INTO operators (id, email, name, role)
      VALUES 
        ('op-admin-1', 'admin@distribuidora.com.br', 'Administrador ERP', 'admin'),
        ('op-gerente-1', 'gerente@distribuidora.com.br', 'Gerente de Logística', 'gerente');
    `);

    conn.release();
    isConnected = true;
    lastError = undefined;
    console.log(`✅ [MySQL 9] Conectado e sincronizado com sucesso com '${DB_NAME}' em '${DB_HOST}:${DB_PORT}'!`);
    return true;
  } catch (err: unknown) {
    const error = err as Error;
    isConnected = false;
    lastError = error.message;
    console.warn(
      `⚠️ [MySQL 9] Conexão com '${DB_HOST}:${DB_PORT}' não estabelecida (${error.message}). Ativando modo de armazenamento resiliente em memória para manter o ERP operacional sem interrupções.`
    );
    return false;
  }
}

// Auxiliar para inserir ou atualizar produto no MySQL
async function insertOrUpdateProductMySQL(conn: mysql.PoolConnection | mysql.Pool, p: Product): Promise<void> {
  const query = `
    INSERT INTO products (
      id, name, brand, category, barcode, sku, image,
      ncm, cest, cfop, csosn, origin, icms_tax,
      unit, package_type, volume, items_per_pack, dimensions_json,
      gross_weight, cost_price, sale_price, wholesale_price,
      suggested_price_json, stock, min_stock, source,
      created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?
    ) ON DUPLICATE KEY UPDATE
      name = VALUES(name),
      brand = VALUES(brand),
      category = VALUES(category),
      barcode = VALUES(barcode),
      sku = VALUES(sku),
      image = VALUES(image),
      ncm = VALUES(ncm),
      cest = VALUES(cest),
      cfop = VALUES(cfop),
      csosn = VALUES(csosn),
      origin = VALUES(origin),
      icms_tax = VALUES(icms_tax),
      unit = VALUES(unit),
      package_type = VALUES(package_type),
      volume = VALUES(volume),
      items_per_pack = VALUES(items_per_pack),
      dimensions_json = VALUES(dimensions_json),
      gross_weight = VALUES(gross_weight),
      cost_price = VALUES(cost_price),
      sale_price = VALUES(sale_price),
      wholesale_price = VALUES(wholesale_price),
      suggested_price_json = VALUES(suggested_price_json),
      stock = VALUES(stock),
      min_stock = VALUES(min_stock),
      source = VALUES(source),
      updated_at = VALUES(updated_at);
  `;

  await conn.query(query, [
    p.id,
    p.name,
    p.brand || '',
    p.category || 'Outros',
    p.barcode || '',
    p.sku || '',
    p.image || '',
    p.ncm || '',
    p.cest || '',
    p.cfop || '',
    p.csosn || '',
    p.origin || '',
    p.icmsTax || 0,
    p.unit || 'UN',
    p.packageType || 'Outro',
    p.volume || '',
    p.itemsPerPack || 1,
    JSON.stringify(p.dimensions || { height: 0, width: 0, length: 0 }),
    p.grossWeight || 0,
    p.costPrice || 0,
    p.salePrice || 0,
    p.wholesalePrice !== undefined ? p.wholesalePrice : null,
    p.suggestedMarketPrice ? JSON.stringify(p.suggestedMarketPrice) : null,
    p.stock || 0,
    p.minStock || 0,
    p.source || 'manual',
    p.createdAt || new Date().toISOString(),
    p.updatedAt || new Date().toISOString(),
  ]);
}

// Converte linha do MySQL para objeto Product do TypeScript
function rowToProduct(row: mysql.RowDataPacket): Product {
  let dimensions = { height: 0, width: 0, length: 0 };
  if (row.dimensions_json) {
    try {
      dimensions = typeof row.dimensions_json === 'string'
        ? JSON.parse(row.dimensions_json)
        : row.dimensions_json;
    } catch {
      // fallback
    }
  }

  let suggestedMarketPrice = undefined;
  if (row.suggested_price_json) {
    try {
      suggestedMarketPrice = typeof row.suggested_price_json === 'string'
        ? JSON.parse(row.suggested_price_json)
        : row.suggested_price_json;
    } catch {
      // fallback
    }
  }

  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    category: row.category,
    barcode: row.barcode,
    sku: row.sku,
    image: row.image || '',
    ncm: row.ncm,
    cest: row.cest,
    cfop: row.cfop,
    csosn: row.csosn,
    origin: row.origin,
    icmsTax: Number(row.icms_tax) || 0,
    unit: row.unit,
    packageType: row.package_type,
    volume: row.volume,
    itemsPerPack: Number(row.items_per_pack) || 1,
    dimensions,
    grossWeight: Number(row.gross_weight) || 0,
    costPrice: Number(row.cost_price) || 0,
    salePrice: Number(row.sale_price) || 0,
    wholesalePrice: row.wholesale_price !== null ? Number(row.wholesale_price) : undefined,
    suggestedMarketPrice,
    stock: Number(row.stock) || 0,
    minStock: Number(row.min_stock) || 0,
    source: row.source || 'manual',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Status do banco de dados (MySQL ou Memória)
 */
export async function getDatabaseStatus(): Promise<DatabaseStatus> {
  let totalProducts = memoryProducts.size;

  if (isConnected && pool) {
    try {
      const [rows] = await pool.query<mysql.RowDataPacket[]>('SELECT COUNT(*) as count FROM products');
      totalProducts = Number(rows[0]?.count || 0);
    } catch (e: unknown) {
      isConnected = false;
      lastError = (e as Error).message;
    }
  }

  return {
    connected: isConnected,
    dialect: 'MySQL 9',
    host: DB_HOST,
    port: DB_PORT,
    database: DB_NAME,
    user: DB_USER,
    mode: isConnected ? 'mysql' : 'memory_fallback',
    lastError,
    totalProducts,
    checkedAt: new Date().toISOString(),
  };
}

/**
 * Autentica ou registra operador
 */
export async function authenticateOperator(
  email: string,
  _password?: string
): Promise<{ success: boolean; user: Operator }> {
  const cleanEmail = email.trim().toLowerCase();
  const defaultName = cleanEmail.split('@')[0].toUpperCase();

  if (isConnected && pool) {
    try {
      const [rows] = await pool.query<mysql.RowDataPacket[]>(
        'SELECT id, email, name, role, created_at FROM operators WHERE email = ?',
        [cleanEmail]
      );

      if (rows.length > 0) {
        const row = rows[0];
        return {
          success: true,
          user: {
            id: row.id,
            email: row.email,
            name: row.name,
            role: row.role,
            createdAt: row.created_at,
          },
        };
      }

      // Se não existe, cria novo operador
      const newId = `op-${Date.now()}`;
      const role = cleanEmail.includes('admin') ? 'admin' : cleanEmail.includes('gerente') ? 'gerente' : 'operador';
      await pool.query(
        'INSERT INTO operators (id, email, name, role) VALUES (?, ?, ?, ?)',
        [newId, cleanEmail, defaultName, role]
      );

      return {
        success: true,
        user: {
          id: newId,
          email: cleanEmail,
          name: defaultName,
          role,
          createdAt: new Date().toISOString(),
        },
      };
    } catch (e) {
      console.error('[MySQL] Erro ao autenticar no MySQL, recorrendo à memória:', e);
    }
  }

  // Fallback em memória
  let user = memoryOperators.get(cleanEmail);
  if (!user) {
    user = {
      id: `op-${Date.now()}`,
      email: cleanEmail,
      name: defaultName,
      role: cleanEmail.includes('admin') ? 'admin' : cleanEmail.includes('gerente') ? 'gerente' : 'operador',
      createdAt: new Date().toISOString(),
    };
    memoryOperators.set(cleanEmail, user);
  }

  return { success: true, user };
}

/**
 * Lista todos os produtos
 */
export async function getAllProducts(): Promise<Product[]> {
  if (isConnected && pool) {
    try {
      const [rows] = await pool.query<mysql.RowDataPacket[]>(
        'SELECT * FROM products ORDER BY name ASC'
      );
      return rows.map(rowToProduct);
    } catch (e) {
      console.error('[MySQL] Erro ao ler produtos do MySQL, lendo da memória:', e);
    }
  }

  return Array.from(memoryProducts.values()).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Busca produto por ID
 */
export async function getProductById(id: string): Promise<Product | undefined> {
  if (isConnected && pool) {
    try {
      const [rows] = await pool.query<mysql.RowDataPacket[]>(
        'SELECT * FROM products WHERE id = ?',
        [id]
      );
      if (rows.length > 0) {
        return rowToProduct(rows[0]);
      }
      return undefined;
    } catch (e) {
      console.error('[MySQL] Erro ao buscar produto por ID no MySQL:', e);
    }
  }

  return memoryProducts.get(id);
}

/**
 * Salva ou atualiza produto (Upsert)
 */
export async function saveProduct(product: Product): Promise<Product> {
  const updatedProduct: Product = {
    ...product,
    updatedAt: new Date().toISOString(),
    createdAt: product.createdAt || new Date().toISOString(),
  };

  // Mantém memória sincronizada
  memoryProducts.set(updatedProduct.id, updatedProduct);

  if (isConnected && pool) {
    try {
      await insertOrUpdateProductMySQL(pool, updatedProduct);
    } catch (e) {
      console.error('[MySQL] Erro ao salvar produto no MySQL:', e);
    }
  }

  return updatedProduct;
}

/**
 * Atualização rápida de estoque (+ / -) com registro em Kardex/Movimentações
 */
export async function updateProductStock(
  id: string,
  delta: number,
  reason?: string,
  operatorEmail?: string
): Promise<Product> {
  let currentProduct = await getProductById(id);

  if (!currentProduct) {
    throw new Error(`Produto com ID ${id} não encontrado.`);
  }

  const newStock = Math.max(0, currentProduct.stock + delta);
  const now = new Date().toISOString();

  currentProduct = {
    ...currentProduct,
    stock: newStock,
    updatedAt: now,
  };

  // 1. Atualiza na memória
  memoryProducts.set(id, currentProduct);

  const movement: StockMovement = {
    id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    productId: id,
    productName: currentProduct.name,
    type: delta >= 0 ? 'entrada' : 'saida',
    delta,
    finalStock: newStock,
    reason: reason || (delta >= 0 ? 'Entrada rápida' : 'Saída rápida'),
    operatorEmail: operatorEmail || 'operador@distribuidora.com.br',
    createdAt: now,
  };
  memoryMovements.unshift(movement);

  // 2. Atualiza no MySQL
  if (isConnected && pool) {
    try {
      await pool.query(
        'UPDATE products SET stock = ?, updated_at = ? WHERE id = ?',
        [newStock, now, id]
      );

      await pool.query(
        `INSERT INTO stock_movements (id, product_id, product_name, type, delta, final_stock, reason, operator_email, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          movement.id,
          movement.productId,
          movement.productName,
          movement.type,
          movement.delta,
          movement.finalStock,
          movement.reason,
          movement.operatorEmail,
          movement.createdAt,
        ]
      );
    } catch (e) {
      console.error('[MySQL] Erro ao atualizar estoque no MySQL:', e);
    }
  }

  return currentProduct;
}

/**
 * Exclui produto por ID
 */
export async function deleteProduct(id: string): Promise<boolean> {
  memoryProducts.delete(id);

  if (isConnected && pool) {
    try {
      await pool.query('DELETE FROM products WHERE id = ?', [id]);
      return true;
    } catch (e) {
      console.error('[MySQL] Erro ao excluir produto no MySQL:', e);
    }
  }

  return true;
}

/**
 * Restaura os 4 produtos padrão no MySQL e na memória
 */
export async function resetDatabaseToDemo(): Promise<void> {
  memoryProducts.clear();
  INITIAL_PRODUCTS_SEED.forEach((p) => {
    memoryProducts.set(p.id, { ...p });
  });

  if (isConnected && pool) {
    try {
      await pool.query('DELETE FROM products');
      for (const prod of INITIAL_PRODUCTS_SEED) {
        await insertOrUpdateProductMySQL(pool, prod);
      }
    } catch (e) {
      console.error('[MySQL] Erro ao resetar produtos no MySQL:', e);
    }
  }
}

/**
 * Importa múltiplos produtos (Restauração de Backup)
 */
export async function importProducts(products: Product[]): Promise<number> {
  let count = 0;
  for (const prod of products) {
    if (prod && prod.id && prod.name) {
      await saveProduct(prod);
      count++;
    }
  }
  return count;
}

/**
 * Configurações Chave-Valor persistidas
 */
export async function getSetting<T>(key: string, defaultValue: T): Promise<T> {
  if (isConnected && pool) {
    try {
      const [rows] = await pool.query<mysql.RowDataPacket[]>(
        'SELECT setting_value FROM settings WHERE setting_key = ?',
        [key]
      );
      if (rows.length > 0) {
        return JSON.parse(rows[0].setting_value) as T;
      }
    } catch {
      // fallback
    }
  }

  if (memorySettings.has(key)) {
    return memorySettings.get(key) as T;
  }
  return defaultValue;
}

export async function setSetting<T>(key: string, value: T): Promise<void> {
  memorySettings.set(key, value);
  if (isConnected && pool) {
    try {
      await pool.query(
        `INSERT INTO settings (setting_key, setting_value)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
        [key, JSON.stringify(value)]
      );
    } catch (e) {
      console.error('[MySQL] Erro ao gravar configuração no MySQL:', e);
    }
  }
}

/**
 * Salva log de sistema no banco MySQL
 */
export async function saveSystemLog(log: {
  category: string;
  level: string;
  message: string;
  details?: unknown;
}): Promise<void> {
  if (isConnected && pool) {
    try {
      const logId = `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      await pool.query(
        `INSERT INTO system_logs (id, category, level, message, details_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          logId,
          log.category,
          log.level,
          log.message,
          log.details ? JSON.stringify(log.details) : null,
          new Date().toISOString(),
        ]
      );
    } catch {
      // Ignora erro para não interferir no fluxo principal
    }
  }
}
