/**
 * Utilitários puros de cálculos financeiros e fiscais para ERP de Distribuidoras
 */

export interface MarginResult {
  profit: number;
  marginPercent: number;
  status: 'great' | 'moderate' | 'low';
  colorClass: string;
  badgeLabel: string;
}

/**
 * Calcula Lucro Bruto e Margem de Lucro percentual com classificação semafórica
 * - Verde (Ótima): >= 25%
 * - Amarelo (Moderada): >= 15% e < 25%
 * - Vermelho (Baixa/Alerta): < 15%
 */
export function calculateMargin(cost: number, sale: number): MarginResult {
  const safeCost = Math.max(0, Number(cost) || 0);
  const safeSale = Math.max(0, Number(sale) || 0);

  const profit = Math.round((safeSale - safeCost) * 100) / 100;
  
  if (safeSale <= 0) {
    return {
      profit: 0,
      marginPercent: 0,
      status: 'low',
      colorClass: 'text-red-500 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900',
      badgeLabel: 'Sem Venda',
    };
  }

  const marginPercent = Math.round(((safeSale - safeCost) / safeSale) * 10000) / 100;

  if (marginPercent >= 25) {
    return {
      profit,
      marginPercent,
      status: 'great',
      colorClass: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
      badgeLabel: 'Margem Ótima',
    };
  }

  if (marginPercent >= 15) {
    return {
      profit,
      marginPercent,
      status: 'moderate',
      colorClass: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800',
      badgeLabel: 'Margem Média',
    };
  }

  return {
    profit,
    marginPercent,
    status: 'low',
    colorClass: 'text-red-600 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900',
    badgeLabel: 'Margem Baixa',
  };
}

/**
 * Gera um código de barras EAN-13 válido (padrão Brasil 789...) com dígito verificador módulo 10
 */
export function generateEAN13(prefix: string = '789'): string {
  // 789 é o código de país GS1 para o Brasil
  let base = prefix;
  while (base.length < 12) {
    base += Math.floor(Math.random() * 10).toString();
  }
  base = base.slice(0, 12);

  // Cálculo do dígito verificador (mod 10)
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(base[i], 10);
    // Posições ímpares (0, 2, 4...) peso 1; pares (1, 3, 5...) peso 3
    sum += i % 2 === 0 ? digit * 1 : digit * 3;
  }
  const remainder = sum % 10;
  const checkDigit = remainder === 0 ? 0 : 10 - remainder;

  return `${base}${checkDigit}`;
}

/**
 * Valida se uma string é um EAN-13 válido com dígito verificador correto
 */
export function validateEAN13(barcode: string): boolean {
  const clean = barcode.replace(/\D/g, '');
  if (clean.length !== 13) return false;

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(clean[i], 10);
    sum += i % 2 === 0 ? digit * 1 : digit * 3;
  }
  const remainder = sum % 10;
  const expectedCheckDigit = remainder === 0 ? 0 : 10 - remainder;
  const actualCheckDigit = parseInt(clean[12], 10);

  return expectedCheckDigit === actualCheckDigit;
}

/**
 * Formata valores monetários no padrão Real Brasileiro (R$ 1.234,56)
 */
export function formatCurrency(value: number): string {
  const safeVal = Number(value) || 0;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safeVal);
}

/**
 * Formata código NCM com pontuação padrão (ex: 2203.00.00)
 */
export function formatNCM(ncm: string): string {
  const clean = ncm.replace(/\D/g, '');
  if (clean.length !== 8) return ncm;
  return `${clean.slice(0, 4)}.${clean.slice(4, 6)}.${clean.slice(6, 8)}`;
}

/**
 * Verifica se um produto está em estado de reposição / estoque baixo
 */
export function isLowStock(stock: number, minStock: number): boolean {
  return Number(stock) <= Number(minStock);
}
