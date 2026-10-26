export type ProductCategory =
  | 'Cerveja'
  | 'Refrigerante'
  | 'Destilado'
  | 'Gás/Água'
  | 'Carvão/Gelo'
  | 'Mercearia'
  | 'Outros';

export type UnitType = 'UN' | 'FD' | 'CX' | 'KG' | 'L' | 'SC';

export type PackageType = 'Lata' | 'Garrafa' | 'Retornável' | 'PET' | 'Barril' | 'Saco' | 'Outro';

export interface ProductDimensions {
  height: number; // cm
  width: number;  // cm
  length: number; // cm
}

export interface SuggestedMarketPrice {
  min: number;
  max: number;
  average: number;
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: ProductCategory;
  barcode: string; // EAN-13
  sku: string;
  image: string; // base64 or SVG data URL

  // Dados Fiscais Brasil
  ncm: string;      // 8 dígitos (ex: 2203.00.00)
  cest: string;     // Código CEST (ex: 03.001.00)
  cfop: string;     // CFOP padrão (5405 ST ou 5102 Tributado)
  csosn: string;    // CSOSN / CST (ex: 500 ou 102)
  origin: string;   // Origem da mercadoria (ex: 0 - Nacional)
  icmsTax: number;  // Alíquota ICMS %

  // Medidas e Embalagem
  unit: UnitType;
  packageType: PackageType;
  volume: string;           // ex: 350ml, 600ml, 2L, 3kg
  itemsPerPack: number;     // Qtd por fardo / caixa
  dimensions: ProductDimensions;
  grossWeight: number;      // Peso bruto em kg

  // Preços e Estoque
  costPrice: number;        // Custo de Aquisição R$
  salePrice: number;        // Valor de Venda Unitário R$
  wholesalePrice?: number;  // Preço de Atacado / Fardo R$
  suggestedMarketPrice?: SuggestedMarketPrice;
  stock: number;            // Quantidade atual
  minStock: number;         // Estoque mínimo para alerta

  // Metadados
  createdAt: string;
  updatedAt: string;
  source: 'ai' | 'manual' | 'edited';
}

export interface NotificationAlert {
  id: string;
  productId: string;
  productName: string;
  currentStock: number;
  minStock: number;
  timestamp: number;
  read: boolean;
}

export type MovementType =
  | 'entrada_compra'
  | 'saida_venda'
  | 'ajuste_inventario'
  | 'contagem_diaria'
  | 'perda_avaria'
  | 'saldo_inicial';

export interface MovementAuditPayload {
  origin: 'manual' | 'ia_assistida' | 'inventario_camera' | 'importacao';
  timestamp: string;
  operatorEmail: string;
  photoAttached?: boolean;
  photoUrl?: string;
  aiPrompt?: string;
  aiInterpretation?: string;
  extraDetails?: Record<string, unknown>;
}

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  productBarcode?: string;
  productSku?: string;
  productImage?: string;
  productUnit?: UnitType | string;

  type: MovementType;
  typeLabel: string; // Ex: 'Entrada por Compra', 'Ajuste de Inventário'

  previousStock: number; // Estoque Anterior
  newStock: number;      // Estoque Atual pós-movimentação
  delta: number;         // Delta calculado (ex: +10, -5)

  operator: string;      // Operador / Responsável logado
  reason: string;        // Motivo / Observação obrigatório

  auditPayload: MovementAuditPayload;
  timestamp: string;     // ISO Date
}

export interface StockAdjustmentAIProposal {
  matchedProductId: string;
  matchedProductName: string;
  currentStock: number;
  proposedNewStock: number;
  calculatedDelta: number;
  movementType: MovementType;
  typeLabel: string;
  proposedReason: string;
  aiExplanation: string;
  rawConfidence?: 'alta' | 'media' | 'baixa';
  sourceImage?: string;
  sourcePrompt?: string;
}

export interface ERPBackup {
  version: string;
  exportedAt: string;
  app: string;
  totalProducts: number;
  products: Product[];
  movements?: StockMovement[];
}
