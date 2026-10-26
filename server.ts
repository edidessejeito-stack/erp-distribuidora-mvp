import express, { Request, Response } from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = http.createServer(app);
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Health Check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    app: 'Distribuidora ERP Inteligente',
    timestamp: new Date().toISOString(),
    hasEnvKey: !!(process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY),
  });
});

// Endpoint de Análise de Produto com Gemini Vision
app.post('/api/gemini/analyze-product', async (req: Request, res: Response): Promise<void> => {
  try {
    const { image } = req.body;
    if (!image) {
      res.status(400).json({ error: 'Nenhuma imagem enviada para análise.' });
      return;
    }

    // Resolução resiliente da API Key
    const customHeaderKey = req.headers['x-gemini-key'] as string | undefined;
    const apiKey =
      (customHeaderKey && customHeaderKey.trim()) ||
      process.env.VITE_GEMINI_API_KEY ||
      process.env.GEMINI_API_KEY;

    if (!apiKey) {
      res.status(401).json({
        error: 'Chave Gemini API não encontrada. Configure-a no menu de Configurações da aplicação.',
      });
      return;
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const promptText = `
Você é um especialista em logística, cadastro e tributação fiscal brasileira de bebidas e distribuidoras atacadistas.
Analise detalhadamente a foto fornecida. Ela pode conter um único produto ou múltiplos produtos juntos.
Identifique cada item e gere os dados cadastrais completos, medidas, dados fiscais do Brasil (NCM 8 dígitos real, CEST correspondente, CFOP 5405 para substituição tributária ou 5102 para tributado normal) e sugestão de preço de mercado em BRL (R$).
Responda estritamente no esquema JSON solicitado em Português do Brasil.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: image,
            },
          },
          {
            text: promptText,
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            products: {
              type: Type.ARRAY,
              description: 'Lista de produtos identificados na foto',
              items: {
                type: Type.OBJECT,
                properties: {
                  name: {
                    type: Type.STRING,
                    description: 'Nome comercial completo (ex: Cerveja Heineken 600ml Retornável)',
                  },
                  brand: {
                    type: Type.STRING,
                    description: 'Marca do produto (ex: Heineken, Ambev, Coca-Cola)',
                  },
                  category: {
                    type: Type.STRING,
                    description: 'Categoria: Cerveja, Refrigerante, Destilado, Gás/Água, Carvão/Gelo ou Mercearia',
                  },
                  barcode: {
                    type: Type.STRING,
                    description: 'Código EAN-13 estimado ou visível',
                  },
                  sku: {
                    type: Type.STRING,
                    description: 'Código de controle interno SKU sugerido',
                  },
                  ncm: {
                    type: Type.STRING,
                    description: 'Código NCM oficial de 8 dígitos (ex: 2203.00.00)',
                  },
                  cest: {
                    type: Type.STRING,
                    description: 'Código CEST para bebidas no Brasil (ex: 03.001.00)',
                  },
                  cfop: {
                    type: Type.STRING,
                    description: 'CFOP (ex: 5405 para ST ou 5102 para padrão)',
                  },
                  csosn: {
                    type: Type.STRING,
                    description: 'CSOSN (ex: 500 para ICMS ST ou 102)',
                  },
                  origin: {
                    type: Type.STRING,
                    description: 'Origem da mercadoria (ex: 0 - Nacional)',
                  },
                  icmsTax: {
                    type: Type.NUMBER,
                    description: 'Alíquota de ICMS em % (ex: 0 para ST)',
                  },
                  unit: {
                    type: Type.STRING,
                    description: 'Unidade comercial: UN, FD, CX, KG, L ou SC',
                  },
                  packageType: {
                    type: Type.STRING,
                    description: 'Embalagem: Lata, Garrafa, Retornável, PET, Barril ou Saco',
                  },
                  volume: {
                    type: Type.STRING,
                    description: 'Volume ou peso líquido (ex: 350ml, 600ml, 2L, 3kg)',
                  },
                  itemsPerPack: {
                    type: Type.INTEGER,
                    description: 'Quantidade de unidades por fardo / caixa padrão',
                  },
                  dimensions: {
                    type: Type.OBJECT,
                    properties: {
                      height: { type: Type.NUMBER, description: 'Altura em cm' },
                      width: { type: Type.NUMBER, description: 'Largura em cm' },
                      length: { type: Type.NUMBER, description: 'Comprimento em cm' },
                    },
                    required: ['height', 'width', 'length'],
                  },
                  grossWeight: {
                    type: Type.NUMBER,
                    description: 'Peso bruto aproximado em kg',
                  },
                  costPrice: {
                    type: Type.NUMBER,
                    description: 'Preço de custo estimado de aquisição da distribuidora em R$',
                  },
                  salePrice: {
                    type: Type.NUMBER,
                    description: 'Preço unitário de venda sugerido ao consumidor em R$',
                  },
                  wholesalePrice: {
                    type: Type.NUMBER,
                    description: 'Preço de atacado / fardo unitário em R$',
                  },
                  suggestedMarketPrice: {
                    type: Type.OBJECT,
                    properties: {
                      min: { type: Type.NUMBER, description: 'Preço mínimo de mercado em R$' },
                      max: { type: Type.NUMBER, description: 'Preço máximo de mercado em R$' },
                      average: { type: Type.NUMBER, description: 'Preço médio de mercado em R$' },
                    },
                    required: ['min', 'max', 'average'],
                  },
                  stock: {
                    type: Type.INTEGER,
                    description: 'Estoque inicial sugerido',
                  },
                  minStock: {
                    type: Type.INTEGER,
                    description: 'Estoque mínimo recomendado para alertas',
                  },
                },
                required: [
                  'name',
                  'brand',
                  'category',
                  'ncm',
                  'unit',
                  'packageType',
                  'volume',
                  'costPrice',
                  'salePrice',
                ],
              },
            },
          },
          required: ['products'],
        },
      },
    });

    const textOutput = response.text || '{}';
    const parsed = JSON.parse(textOutput);
    res.json(parsed);
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error('Erro na análise Gemini:', err);
    res.status(500).json({
      error: 'Falha ao processar imagem com a IA Gemini.',
      details: err.message || 'Erro interno do servidor',
    });
  }
});

// Endpoint de Ajuste Inteligente de Estoque Assistido por IA
app.post('/api/gemini/interpret-stock-adjustment', async (req: Request, res: Response): Promise<void> => {
  try {
    const { image, textPrompt, productsCatalog } = req.body;

    if (!image && (!textPrompt || !textPrompt.trim())) {
      res.status(400).json({ error: 'Envie uma foto ou um comando de texto para interpretar o ajuste de estoque.' });
      return;
    }

    const customHeaderKey = req.headers['x-gemini-key'] as string | undefined;
    const apiKey =
      (customHeaderKey && customHeaderKey.trim()) ||
      process.env.VITE_GEMINI_API_KEY ||
      process.env.GEMINI_API_KEY;

    if (!apiKey) {
      res.status(401).json({
        error: 'Chave Gemini API não encontrada.',
      });
      return;
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const catalogSummary = Array.isArray(productsCatalog)
      ? productsCatalog.map((p) => `- ID: ${p.id} | Nome: ${p.name} | Marca: ${p.brand} | EAN: ${p.barcode} | Estoque Atual: ${p.stock} ${p.unit}`).join('\n')
      : 'Nenhum produto cadastrado previamente.';

    const systemInstruction = `
Você é um auditor e operador de WMS/ERP especialista em distribuidoras de bebidas e alimentos.
O usuário quer realizar um ajuste ou contagem de estoque usando foto e/ou comando em linguagem natural.

CATÁLOGO ATUAL DE PRODUTOS NO SISTEMA:
${catalogSummary}

SUA MISSÃO:
1. Identifique no catálogo qual produto corresponde à imagem ou ao texto do operador.
2. Determine a intenção da movimentação:
   - 'entrada_compra': se recebeu mercadoria, comprou ou deu entrada.
   - 'saida_venda': se vendeu, entregou ou retirou itens.
   - 'ajuste_inventario': se foi solicitada alteração direta do saldo total (ex: "ajustar para 200").
   - 'contagem_diaria': se o operador contou prateleira/estoque físico.
   - 'perda_avaria': se houve produto quebrado, furado ou vencido.
3. Calcule:
   - currentStock: estoque que o produto tem atualmente no catálogo.
   - proposedNewStock: novo estoque final resultante.
   - calculatedDelta: a diferença (ex: +50 ou -10).
4. Redija um motivo comercial profissional obrigatório em Português do Brasil (PT-BR) com justificativa clara (ex: "Entrada de 50 un. conforme comando do operador", "Ajuste de inventário físico: de 120 para 200 un.").
5. Explique brevemente seu raciocínio.

IMPORTANTE: Responda estritamente no esquema JSON abaixo em Português do Brasil.
`;

    const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

    if (image) {
      const cleanImage = image.includes('base64,') ? image.split('base64,')[1] : image;
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: cleanImage,
        },
      });
    }

    const userMessage = textPrompt && textPrompt.trim()
      ? `Comando do Operador: "${textPrompt.trim()}"`
      : 'Identifique o produto da foto, estime a quantidade presente ou proponha o ajuste de contagem de estoque.';

    parts.push({ text: userMessage });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: { parts },
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            matchedProductId: {
              type: Type.STRING,
              description: 'ID exato do produto no catálogo identificado',
            },
            matchedProductName: {
              type: Type.STRING,
              description: 'Nome do produto identificado',
            },
            currentStock: {
              type: Type.INTEGER,
              description: 'Estoque atual anterior',
            },
            proposedNewStock: {
              type: Type.INTEGER,
              description: 'Novo estoque proposto após a operação',
            },
            calculatedDelta: {
              type: Type.INTEGER,
              description: 'Delta calculado (+ ou -)',
            },
            movementType: {
              type: Type.STRING,
              description: 'Tipo da movimentação: entrada_compra, saida_venda, ajuste_inventario, contagem_diaria ou perda_avaria',
            },
            typeLabel: {
              type: Type.STRING,
              description: 'Nome legível em PT-BR (ex: Entrada por Compra, Ajuste de Inventário)',
            },
            proposedReason: {
              type: Type.STRING,
              description: 'Motivo / justificativa detalhada e profissional da movimentação',
            },
            aiExplanation: {
              type: Type.STRING,
              description: 'Explicação do raciocínio da IA para o operador',
            },
            confidence: {
              type: Type.STRING,
              description: 'alta, media ou baixa',
            },
          },
          required: [
            'matchedProductId',
            'matchedProductName',
            'proposedNewStock',
            'calculatedDelta',
            'movementType',
            'proposedReason',
          ],
        },
      },
    });

    const outputText = response.text || '{}';
    const parsed = JSON.parse(outputText);
    res.json(parsed);
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error('Erro na interpretação de movimentação de estoque:', err);
    res.status(500).json({
      error: 'Falha ao interpretar ajuste de estoque com IA.',
      details: err.message || 'Erro interno do servidor',
    });
  }
});

// Inicialização do servidor com Vite Middleware (Dev) ou Arquivos Estáticos (Prod)
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const isHmrDisabled = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: isHmrDisabled ? false : { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Distribuidora ERP Server rodando na porta ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Falha ao iniciar servidor:', err);
  process.exit(1);
});
