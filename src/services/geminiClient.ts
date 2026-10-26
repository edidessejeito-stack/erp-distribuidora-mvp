import { Product, StockAdjustmentAIProposal, MovementType } from '../types/index.ts';
import { generateEAN13 } from '../utils/calculations.ts';
import { addLog } from './logger.ts';

/**
 * Obtém a chave Gemini configurada pelo usuário seguindo a ordem estrita de prioridade:
 * 1º: localStorage ('gemini_api_key')
 * 2º: import.meta.env.VITE_GEMINI_API_KEY
 * 3º: process.env.GEMINI_API_KEY (ou injetada no servidor)
 */
export function getClientGeminiApiKey(): string {
  if (typeof window !== 'undefined') {
    const local = localStorage.getItem('gemini_api_key');
    if (local && local.trim().length > 0) {
      return local.trim();
    }
  }

  // Verifica variável injetada pelo Vite no build do Easypanel
  const viteKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (viteKey && typeof viteKey === 'string' && viteKey.trim().length > 0) {
    return viteKey.trim();
  }

  return '';
}

export function saveClientGeminiApiKey(key: string): void {
  if (typeof window !== 'undefined') {
    if (key && key.trim().length > 0) {
      localStorage.setItem('gemini_api_key', key.trim());
      addLog('SISTEMA', 'info', `Chave Gemini salva no localStorage (início: ${key.trim().substring(0, 6)}...)`);
    } else {
      localStorage.removeItem('gemini_api_key');
      addLog('SISTEMA', 'info', 'Chave Gemini removida do localStorage.');
    }
  }
}

export interface AnalyzeResult {
  products: Product[];
  rawCount: number;
  source: 'ai' | 'fallback';
  message?: string;
  error?: string;
}

/**
 * Envia imagem para análise pela API Gemini Vision no backend ou direto via fallback REST
 */
export async function analyzeProductPhoto(base64Image: string): Promise<AnalyzeResult> {
  const startTime = Date.now();
  const apiKey = getClientGeminiApiKey();

  addLog(
    'IA',
    'info',
    `Iniciando análise Gemini Vision. Status da API Key: ${
      apiKey ? `Configurada (${apiKey.substring(0, 6)}...)` : 'Não informada'
    }`
  );

  // Remove cabeçalho data:image/...;base64, caso exista
  const cleanBase64 = base64Image.includes('base64,')
    ? base64Image.split('base64,')[1]
    : base64Image;

  // 1. TENTATIVA 1: Endpoint Full-Stack (/api/gemini/analyze-product) com Timeout de 15s
  try {
    addLog('REDE', 'info', 'Disparando POST para backend: /api/gemini/analyze-product');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      addLog('REDE', 'warn', 'Timeout de 15s no endpoint /api/gemini/analyze-product');
    }, 15000);

    const res = await fetch('/api/gemini/analyze-product', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'x-gemini-key': apiKey } : {}),
      },
      body: JSON.stringify({
        image: cleanBase64,
      }),
    });

    clearTimeout(timeoutId);
    const duration = Date.now() - startTime;
    const contentType = res.headers.get('content-type') || '';

    addLog(
      'REDE',
      res.ok ? 'success' : 'warn',
      `Resposta de /api/gemini/analyze-product: Status ${res.status} (${contentType})`,
      undefined,
      duration
    );

    // Se a resposta for JSON válida
    if (res.ok && contentType.includes('application/json')) {
      const data = await res.json();
      if (Array.isArray(data.products) && data.products.length > 0) {
        addLog('IA', 'success', `Gemini identificou ${data.products.length} produto(s) via backend!`, data.products);
        return {
          products: mapAiProducts(data.products, base64Image),
          rawCount: data.products.length,
          source: 'ai',
        };
      }
    } else if (contentType.includes('text/html') || res.status === 404 || res.status === 405) {
      addLog(
        'REDE',
        'warn',
        `Servidor retornou HTML/Status ${res.status}. Provável servidor estático Nginx sem proxy de backend. Tentando conexão direta com Gemini API...`
      );
    } else {
      const errorText = await res.text().catch(() => '');
      addLog('IA', 'error', `Erro na resposta do backend: ${res.status} - ${errorText.substring(0, 150)}`);
    }
  } catch (error: unknown) {
    const err = error as Error;
    addLog('REDE', 'warn', `Falha ao conectar no endpoint local (/api): ${err.message}`);
  }

  // 2. TENTATIVA 2: Conexão Direta Client-Side com a Google Generative Language API (Ideal para Nginx / Docker puro)
  if (apiKey) {
    try {
      const directStart = Date.now();
      addLog('IA', 'info', 'Iniciando chamada direta client-side à Google Gemini API...');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const promptText = `
Você é um especialista em logística e cadastro fiscal brasileiro de bebidas e produtos de distribuidoras atacadistas.
Analise a imagem em anexo. Extraia:
- name: Nome comercial completo do produto
- brand: Marca
- category: Cerveja, Refrigerante, Destilado, Gás/Água, Carvão/Gelo ou Mercearia
- ncm: NCM de 8 dígitos oficial brasileiro
- cest: CEST oficial para bebidas (ou vazio)
- cfop: 5405 para substituição tributária ou 5102 para tributado
- unit: UN, FD, CX, KG, L ou SC
- packageType: Lata, Garrafa, Retornável, PET, Saco ou Outro
- volume: Ex: 350ml, 600ml, 2L, 3kg
- costPrice: Preço de custo estimado em R$ (número)
- salePrice: Preço de venda unitário sugerido em R$ (número)
- minPrice: Preço mínimo de mercado em R$ (número)
- maxPrice: Preço máximo de mercado em R$ (número)
- avgPrice: Preço médio de mercado em R$ (número)

Responda OBRIGATORIAMENTE em JSON estrito seguindo este formato:
{
  "products": [
    {
      "name": "...",
      "brand": "...",
      "category": "Cerveja",
      "ncm": "2203.00.00",
      "cest": "03.001.00",
      "cfop": "5405",
      "unit": "UN",
      "packageType": "Garrafa",
      "volume": "600ml",
      "costPrice": 6.50,
      "salePrice": 9.50,
      "minPrice": 8.90,
      "maxPrice": 11.00,
      "avgPrice": 9.50
    }
  ]
}
`;

      const directRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    inlineData: {
                      mimeType: 'image/jpeg',
                      data: cleanBase64,
                    },
                  },
                  {
                    text: promptText,
                  },
                ],
              },
            ],
            generationConfig: {
              responseMimeType: 'application/json',
            },
          }),
        }
      );

      clearTimeout(timeoutId);
      const directDuration = Date.now() - directStart;

      if (directRes.ok) {
        const rawJson = await directRes.json();
        const candidateText =
          rawJson.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        addLog(
          'IA',
          'success',
          `Gemini API respondeu diretamente com sucesso em ${directDuration}ms!`,
          candidateText.substring(0, 200)
        );

        const parsed = JSON.parse(candidateText);
        if (Array.isArray(parsed.products) && parsed.products.length > 0) {
          return {
            products: mapAiProducts(parsed.products, base64Image),
            rawCount: parsed.products.length,
            source: 'ai',
          };
        }
      } else {
        const errJson = await directRes.json().catch(() => ({}));
        addLog('IA', 'error', `Gemini API retornou erro HTTP ${directRes.status}:`, errJson);
      }
    } catch (directErr: unknown) {
      const err = directErr as Error;
      addLog('IA', 'error', `Falha na requisição direta Gemini: ${err.message}`);
    }
  } else {
    addLog(
      'IA',
      'warn',
      'Nenhuma chave Gemini encontrada no localStorage nem nas variáveis VITE. Configure a chave no ícone de configurações.'
    );
  }

  // 3. FALLBACK INTELIGENTE (Garante que o app NUNCA fique travado na tela girando)
  addLog(
    'SISTEMA',
    'warn',
    'Acionando formulário assistido inteligente para que você possa cadastrar imediatamente sem esperar.'
  );

  const fallbackProduct: Product = {
    id: `prod-${Date.now()}-0`,
    name: 'Bebida / Produto Distribuidora',
    brand: 'Identificação Manual',
    category: 'Cerveja',
    barcode: generateEAN13(),
    sku: `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
    image: base64Image,
    ncm: '2203.00.00',
    cest: '03.001.00',
    cfop: '5405',
    csosn: '500',
    origin: '0 - Nacional',
    icmsTax: 0,
    unit: 'UN',
    packageType: 'Garrafa',
    volume: '600ml',
    itemsPerPack: 12,
    dimensions: { height: 28, width: 8, length: 8 },
    grossWeight: 1.1,
    costPrice: 6.0,
    salePrice: 9.0,
    wholesalePrice: 8.2,
    suggestedMarketPrice: { min: 8.5, max: 11.0, average: 9.0 },
    stock: 24,
    minStock: 12,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    source: 'ai',
  };

  return {
    products: [fallbackProduct],
    rawCount: 1,
    source: 'fallback',
    message: 'Configure sua Gemini API Key em Configurações para identificação automática.',
  };
}

interface RawAiProduct {
  name?: string;
  brand?: string;
  category?: string;
  barcode?: string;
  sku?: string;
  ncm?: string;
  cest?: string;
  cfop?: string;
  csosn?: string;
  origin?: string;
  icmsTax?: number;
  unit?: string;
  packageType?: string;
  volume?: string;
  itemsPerPack?: number;
  dimensions?: { height: number; width: number; length: number };
  grossWeight?: number;
  costPrice?: number;
  salePrice?: number;
  wholesalePrice?: number;
  minPrice?: number;
  maxPrice?: number;
  avgPrice?: number;
  suggestedMarketPrice?: { min: number; max: number; average: number };
  stock?: number;
  minStock?: number;
}

function mapAiProducts(list: RawAiProduct[], base64Image: string): Product[] {
  return list.map((p, index) => {
    const ean = p.barcode && p.barcode.length >= 8 ? p.barcode : generateEAN13();
    const cost = Number(p.costPrice) || 5.0;
    const avgSale =
      Number(p.suggestedMarketPrice?.average) ||
      Number(p.avgPrice) ||
      Number(p.salePrice) ||
      cost * 1.4;
    const minMkt = Number(p.suggestedMarketPrice?.min) || Number(p.minPrice) || Math.round(avgSale * 0.9 * 100) / 100;
    const maxMkt = Number(p.suggestedMarketPrice?.max) || Number(p.maxPrice) || Math.round(avgSale * 1.25 * 100) / 100;

    return {
      id: `prod-${Date.now()}-${index}`,
      name: p.name || 'Produto Identificado',
      brand: p.brand || 'Marca Distribuidora',
      category: (p.category as Product['category']) || 'Cerveja',
      barcode: ean,
      sku: p.sku || `SKU-${Date.now().toString().slice(-4)}`,
      image: base64Image,
      ncm: p.ncm || '2203.00.00',
      cest: p.cest || '03.001.00',
      cfop: p.cfop || '5405',
      csosn: p.csosn || '500',
      origin: p.origin || '0 - Nacional',
      icmsTax: Number(p.icmsTax) ?? 0,
      unit: (p.unit as Product['unit']) || 'UN',
      packageType: (p.packageType as Product['packageType']) || 'Garrafa',
      volume: p.volume || '600ml',
      itemsPerPack: Number(p.itemsPerPack) || 12,
      dimensions: p.dimensions || { height: 25, width: 8, length: 8 },
      grossWeight: Number(p.grossWeight) || 0.8,
      costPrice: cost,
      salePrice: avgSale,
      wholesalePrice: Number(p.wholesalePrice) || Math.round(avgSale * 0.92 * 100) / 100,
      suggestedMarketPrice: {
        min: minMkt,
        max: maxMkt,
        average: avgSale,
      },
      stock: Number(p.stock) || 24,
      minStock: Number(p.minStock) || 12,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: 'ai' as const,
    };
  });
}

export interface InterpretAdjustmentInput {
  image?: string;
  textPrompt?: string;
  products: Product[];
}

/**
 * Interpreta foto e/ou comando de texto para propor um ajuste assistido de estoque
 * Retorna uma proposta estruturada para PRÉ-VISUALIZAÇÃO obrigatória
 */
export async function interpretStockAdjustmentAI(
  input: InterpretAdjustmentInput
): Promise<StockAdjustmentAIProposal> {
  const { image, textPrompt, products } = input;
  const startTime = Date.now();
  const apiKey = getClientGeminiApiKey();

  addLog(
    'IA',
    'info',
    `Iniciando interpretação de ajuste assistido de estoque. Texto: "${textPrompt || 'Sem texto'}" | Imagem: ${image ? 'Anexada' : 'Nenhuma'}`
  );

  // 1. Tenta o endpoint no servidor Express
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 16000);

    const catalogPayload = products.map((p) => ({
      id: p.id,
      name: p.name,
      brand: p.brand,
      barcode: p.barcode,
      stock: p.stock,
      unit: p.unit,
    }));

    const res = await fetch('/api/gemini/interpret-stock-adjustment', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'x-gemini-key': apiKey } : {}),
      },
      body: JSON.stringify({
        image: image || undefined,
        textPrompt: textPrompt || undefined,
        productsCatalog: catalogPayload,
      }),
    });

    clearTimeout(timeoutId);
    const duration = Date.now() - startTime;

    if (res.ok) {
      const data = await res.json();
      addLog(
        'IA',
        'success',
        `IA interpretou ajuste para "${data.matchedProductName}": Delta ${data.calculatedDelta > 0 ? '+' : ''}${data.calculatedDelta} (${data.movementType})`,
        data,
        duration
      );

      return {
        matchedProductId: data.matchedProductId,
        matchedProductName: data.matchedProductName,
        currentStock: Number(data.currentStock) || 0,
        proposedNewStock: Number(data.proposedNewStock),
        calculatedDelta: Number(data.calculatedDelta),
        movementType: data.movementType as MovementType,
        typeLabel: data.typeLabel || 'Ajuste de Estoque',
        proposedReason: data.proposedReason || 'Ajuste assistido por IA com confirmação do operador.',
        aiExplanation: data.aiExplanation || 'Ação interpretada com base na foto e comando fornecidos.',
        rawConfidence: (data.confidence as 'alta' | 'media' | 'baixa') || 'alta',
        sourceImage: image,
        sourcePrompt: textPrompt,
      };
    }
  } catch (err) {
    addLog('IA', 'warn', 'Endpoint de ajuste assistido indisponível ou timeout. Utilizando motor semântico local.', err);
  }

  // 2. Motor Heurístico Resiliente Local caso o servidor/API key esteja indisponível
  addLog('IA', 'info', 'Executando motor heurístico local de correspondência de estoque.');
  const duration = Date.now() - startTime;

  const promptLower = (textPrompt || '').toLowerCase();
  
  // Tenta encontrar o produto mencionado pelo nome ou marca
  let matchedProduct: Product | undefined = products.find((p) => {
    const nameLower = p.name.toLowerCase();
    const brandLower = p.brand.toLowerCase();
    return promptLower.includes(nameLower) || promptLower.includes(brandLower);
  });

  if (!matchedProduct && products.length > 0) {
    // Se o texto tiver palavras chaves como "coca", "heineken", "brahma", "carvão"
    matchedProduct = products.find((p) => {
      const tokens = p.name.toLowerCase().split(' ');
      return tokens.some((t) => t.length > 3 && promptLower.includes(t));
    }) || products[0];
  }

  if (!matchedProduct) {
    throw new Error('Nenhum produto cadastrado no catálogo para realizar o ajuste.');
  }

  // Extrai números do texto (ex: "ajustar para 200", "chegaram 50", "vendi 10")
  const numbersMatch = promptLower.match(/\d+/g);
  const detectedQuantity = numbersMatch ? parseInt(numbersMatch[numbersMatch.length - 1], 10) : 10;

  let movementType: MovementType = 'ajuste_inventario';
  let typeLabel = 'Ajuste de Inventário';
  let proposedNewStock = matchedProduct.stock;
  let calculatedDelta = 0;
  let proposedReason = '';

  if (promptLower.includes('ajustar para') || promptLower.includes('ajuste para') || promptLower.includes('contagem')) {
    movementType = 'ajuste_inventario';
    typeLabel = 'Ajuste de Inventário';
    proposedNewStock = detectedQuantity;
    calculatedDelta = proposedNewStock - matchedProduct.stock;
    proposedReason = `Recontagem física de inventário: ajustado de ${matchedProduct.stock} para ${proposedNewStock} ${matchedProduct.unit}.`;
  } else if (promptLower.includes('saida') || promptLower.includes('venda') || promptLower.includes('retirar') || promptLower.includes('saiu')) {
    movementType = 'saida_venda';
    typeLabel = 'Saída / Venda';
    calculatedDelta = -detectedQuantity;
    proposedNewStock = Math.max(0, matchedProduct.stock - detectedQuantity);
    proposedReason = `Saída de ${detectedQuantity} ${matchedProduct.unit} registrada via comando do operador.`;
  } else if (promptLower.includes('quebr') || promptLower.includes('avaria') || promptLower.includes('furad') || promptLower.includes('perda')) {
    movementType = 'perda_avaria';
    typeLabel = 'Perda / Avaria';
    calculatedDelta = -detectedQuantity;
    proposedNewStock = Math.max(0, matchedProduct.stock - detectedQuantity);
    proposedReason = `Avaria/Perda de ${detectedQuantity} ${matchedProduct.unit} identificada pelo operador.`;
  } else {
    // Padrão: Entrada
    movementType = 'entrada_compra';
    typeLabel = 'Entrada por Compra';
    calculatedDelta = detectedQuantity;
    proposedNewStock = matchedProduct.stock + detectedQuantity;
    proposedReason = `Entrada de ${detectedQuantity} ${matchedProduct.unit} conforme comando assistido do operador.`;
  }

  const proposal: StockAdjustmentAIProposal = {
    matchedProductId: matchedProduct.id,
    matchedProductName: matchedProduct.name,
    currentStock: matchedProduct.stock,
    proposedNewStock,
    calculatedDelta,
    movementType,
    typeLabel,
    proposedReason,
    aiExplanation: `Identificado item "${matchedProduct.name}". Detectada intenção de ${typeLabel.toLowerCase()} com quantidade ${Math.abs(calculatedDelta)} ${matchedProduct.unit}.`,
    rawConfidence: 'media',
    sourceImage: image,
    sourcePrompt: textPrompt,
  };

  addLog('IA', 'success', `Proposta heurística calculada para "${matchedProduct.name}": Delta ${calculatedDelta >= 0 ? '+' : ''}${calculatedDelta}`, proposal, duration);

  return proposal;
}

