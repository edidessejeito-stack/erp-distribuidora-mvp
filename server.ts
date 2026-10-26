import express, { Request, Response } from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import {
  initDatabase,
  getDatabaseStatus,
  authenticateOperator,
  getAllProducts,
  getProductById,
  saveProduct,
  updateProductStock,
  deleteProduct,
  resetDatabaseToDemo,
  importProducts,
  getSetting,
  setSetting,
  saveSystemLog,
} from './server/db.ts';

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

// Rotas do Banco de Dados MySQL 9 & API do ERP

// 1. Status da Conexão MySQL
app.get('/api/db/status', async (_req: Request, res: Response) => {
  try {
    const status = await getDatabaseStatus();
    res.json(status);
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// 2. Reconectar ao MySQL sob demanda
app.post('/api/db/reconnect', async (_req: Request, res: Response) => {
  try {
    const success = await initDatabase();
    const status = await getDatabaseStatus();
    res.json({ success, status });
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// 3. Autenticação do Operador
app.post('/api/auth/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (!email) {
      res.status(400).json({ error: 'E-mail do operador é obrigatório.' });
      return;
    }
    const result = await authenticateOperator(email, password);
    res.json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// 4. Listar Produtos (MySQL)
app.get('/api/products', async (_req: Request, res: Response) => {
  try {
    const products = await getAllProducts();
    res.json(products);
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// 5. Obter Produto por ID
app.get('/api/products/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const product = await getProductById(req.params.id);
    if (!product) {
      res.status(404).json({ error: 'Produto não encontrado.' });
      return;
    }
    res.json(product);
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// 6. Cadastrar ou Atualizar Produto (Upsert)
app.post('/api/products', async (req: Request, res: Response): Promise<void> => {
  try {
    const productData = req.body;
    if (!productData || !productData.name) {
      res.status(400).json({ error: 'Dados do produto incompletos (nome é obrigatório).' });
      return;
    }
    const saved = await saveProduct(productData);
    res.json(saved);
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// 7. Atualizar Produto Existente
app.put('/api/products/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const productData = { ...req.body, id: req.params.id };
    const saved = await saveProduct(productData);
    res.json(saved);
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// 8. Atualização Rápida de Estoque (+ / -) com Kardex
app.patch('/api/products/:id/stock', async (req: Request, res: Response): Promise<void> => {
  try {
    const { delta, reason, operatorEmail } = req.body;
    if (typeof delta !== 'number') {
      res.status(400).json({ error: 'O valor delta deve ser numérico.' });
      return;
    }
    const updated = await updateProductStock(req.params.id, delta, reason, operatorEmail);
    res.json(updated);
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// 9. Excluir Produto
app.delete('/api/products/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    await deleteProduct(req.params.id);
    res.json({ success: true, message: 'Produto excluído com sucesso.' });
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// 10. Restaurar 4 Produtos Padrão Demo
app.post('/api/products/reset-demo', async (_req: Request, res: Response) => {
  try {
    await resetDatabaseToDemo();
    const products = await getAllProducts();
    res.json({ success: true, message: 'Banco restaurado para demo.', products });
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// 11. Importar Produtos em Lote (Restauração de Backup)
app.post('/api/products/import', async (req: Request, res: Response): Promise<void> => {
  try {
    const { products } = req.body;
    if (!Array.isArray(products)) {
      res.status(400).json({ error: 'Lista de produtos inválida.' });
      return;
    }
    const count = await importProducts(products);
    res.json({ success: true, count });
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// 12. Obter Configuração
app.get('/api/settings/:key', async (req: Request, res: Response) => {
  try {
    const val = await getSetting(req.params.key, null);
    res.json({ key: req.params.key, value: val });
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// 13. Salvar Configuração
app.post('/api/settings/:key', async (req: Request, res: Response) => {
  try {
    await setSetting(req.params.key, req.body.value);
    res.json({ success: true });
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// 14. Logs do Sistema
app.post('/api/logs', async (req: Request, res: Response) => {
  try {
    await saveSystemLog(req.body);
    res.json({ success: true });
  } catch {
    res.status(200).json({ success: false });
  }
});

async function startServer() {
  // Inicializa o banco de dados MySQL 9 (com tolerância a falhas e fallback em memória)
  await initDatabase();

  const isProduction = process.env.NODE_ENV === 'production';


  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
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
