import React, { useState, useRef, ChangeEvent } from 'react';
import {
  Camera,
  Image as ImageIcon,
  Edit3,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  Trash2,
  Barcode,
  Layers,
  FileSpreadsheet,
  Coins,
} from 'lucide-react';
import { Product, ProductCategory, UnitType, PackageType } from '../types/index.ts';
import { compressImage } from '../utils/imageCompressor.ts';
import { analyzeProductPhoto } from '../services/geminiClient.ts';
import { calculateMargin, generateEAN13, formatCurrency } from '../utils/calculations.ts';

interface CameraWizardProps {
  onSaveProduct: (product: Product) => Promise<void>;
  onCancel: () => void;
  onSuccess: () => void;
}

export const CameraWizard: React.FC<CameraWizardProps> = ({
  onSaveProduct,
  onCancel,
  onSuccess,
}) => {
  // Wizard State: 1 = Captura, 2 = Técnico/Fiscal, 3 = Preços/Estoque
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzingMessage, setAnalyzingMessage] = useState('');
  
  // Lista de produtos detectados (caso a IA identifique mais de 1 produto na mesma foto)
  const [detectedProducts, setDetectedProducts] = useState<Product[]>([]);
  const [activeItemIndex, setActiveItemIndex] = useState(0);

  // Inputs de arquivos
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Produto atualmente em edição no wizard
  const currentProduct = detectedProducts[activeItemIndex] || null;

  // Atualiza um campo do produto ativo e marca como "edited" se era "ai"
  const updateCurrentField = <K extends keyof Product>(key: K, value: Product[K]) => {
    if (!currentProduct) return;
    setDetectedProducts((prev) => {
      const copy = [...prev];
      copy[activeItemIndex] = {
        ...copy[activeItemIndex],
        [key]: value,
        source: 'edited',
        updatedAt: new Date().toISOString(),
      };
      return copy;
    });
  };

  // Processa a foto capturada pela câmera ou galeria
  const handlePhotoCapture = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setAnalyzing(true);
      setAnalyzingMessage('Otimizando imagem para alta velocidade...');
      
      // Comprime a foto via Canvas (máx 600px, 0.7 qualidade)
      const compressedBase64 = await compressImage(file, 600, 0.7);

      setAnalyzingMessage('Gemini Vision identificando rótulos, NCM e medidas...');
      const result = await analyzeProductPhoto(compressedBase64);

      if (result.products.length > 0) {
        setDetectedProducts(result.products);
        setActiveItemIndex(0);
        setStep(2); // Avança para o Passo 2: Revisão
      }
    } catch (err) {
      console.error('Erro na captura:', err);
      // Fallback manual
      initiateManualCreation();
    } finally {
      setAnalyzing(false);
      setAnalyzingMessage('');
      if (e.target) e.target.value = '';
    }
  };

  // Iniciar cadastro manual sem foto
  const initiateManualCreation = () => {
    const defaultProduct: Product = {
      id: `prod-manual-${Date.now()}`,
      name: '',
      brand: '',
      category: 'Cerveja',
      barcode: generateEAN13(),
      sku: `SKU-${Date.now().toString().slice(-4)}`,
      image: '',
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
      grossWeight: 1.0,
      costPrice: 5.0,
      salePrice: 8.5,
      wholesalePrice: 7.9,
      suggestedMarketPrice: { min: 7.5, max: 9.5, average: 8.5 },
      stock: 24,
      minStock: 12,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: 'manual',
    };
    setDetectedProducts([defaultProduct]);
    setActiveItemIndex(0);
    setStep(2);
  };

  // Excluir um dos itens detectados
  const handleRemoveDetectedItem = (indexToRemove: number) => {
    const updated = detectedProducts.filter((_, idx) => idx !== indexToRemove);
    if (updated.length === 0) {
      setStep(1);
      setDetectedProducts([]);
      return;
    }
    setDetectedProducts(updated);
    setActiveItemIndex((prev) => Math.max(0, Math.min(prev, updated.length - 1)));
  };

  // Salvar produto final no IndexedDB
  const handleFinalizeSave = async () => {
    if (!currentProduct) return;
    await onSaveProduct(currentProduct);

    // Se houver mais itens na fila de múltiplos detectados
    if (activeItemIndex < detectedProducts.length - 1) {
      setActiveItemIndex((prev) => prev + 1);
      setStep(2);
    } else {
      onSuccess();
    }
  };

  // Indicador de margem ao vivo
  const marginResult = currentProduct
    ? calculateMargin(currentProduct.costPrice, currentProduct.salePrice)
    : null;

  return (
    <div className="max-w-xl mx-auto space-y-5 pb-24 animate-fadeIn">
      {/* Indicador de Passos do Wizard */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 shadow-xs">
        <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
          <span className={step >= 1 ? 'text-blue-600 dark:text-blue-400 font-bold' : ''}>
            1. Captura
          </span>
          <span className="w-8 h-px bg-slate-200 dark:bg-slate-700" />
          <span className={step >= 2 ? 'text-blue-600 dark:text-blue-400 font-bold' : ''}>
            2. Revisão Fiscal & Medidas
          </span>
          <span className="w-8 h-px bg-slate-200 dark:bg-slate-700" />
          <span className={step >= 3 ? 'text-blue-600 dark:text-blue-400 font-bold' : ''}>
            3. Preço & Estoque
          </span>
        </div>
        <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full transition-all duration-300"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>
      </div>

      {/* Seletor de Itens Múltiplos se a IA detectou mais de um produto */}
      {detectedProducts.length > 1 && step > 1 && (
        <div className="bg-indigo-50 dark:bg-indigo-950/40 p-3 rounded-2xl border border-indigo-100 dark:border-indigo-900 flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-indigo-900 dark:text-indigo-200">
              Detectados {detectedProducts.length} itens:
            </span>
            <div className="flex gap-1.5">
              {detectedProducts.map((prod, idx) => (
                <button
                  key={prod.id}
                  onClick={() => setActiveItemIndex(idx)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                    activeItemIndex === idx
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-indigo-200 dark:border-indigo-800'
                  }`}
                >
                  Item {idx + 1}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => handleRemoveDetectedItem(activeItemIndex)}
            className="text-red-500 hover:text-red-700 p-1.5 rounded-lg text-xs flex items-center gap-1"
            title="Descartar este item"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================
          PASSO 1: CAPTURA HÍBRIDA (ANDROID / WEB)
      ======================================================== */}
      {step === 1 && (
        <div className="space-y-4">
          {analyzing ? (
            /* Skeleton Loader Elegante com Estilo Gemini */
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-100 dark:border-slate-800 text-center space-y-4 shadow-sm animate-pulse">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-blue-500 via-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 animate-spin" style={{ animationDuration: '3s' }}>
                <Sparkles className="w-8 h-8 text-amber-300" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Análise com Inteligência Artificial
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                {analyzingMessage || 'Processando imagem, reconhecendo rótulo e estruturando dados fiscais...'}
              </p>
              <div className="flex justify-center gap-1.5 pt-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2.5 h-2.5 rounded-full bg-purple-600 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Botão Principal: Câmera Traseira Nativa Android (capture="environment") */}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handlePhotoCapture}
              />
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="w-full min-h-[56px] rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-semibold text-sm flex items-center justify-center gap-3 shadow-md shadow-indigo-500/20 active:scale-[0.99] transition cursor-pointer"
              >
                <Camera className="w-5 h-5" />
                <span>Tirar Foto com a Câmera Traseira</span>
              </button>

              {/* Botão Secundário: Escolher da Galeria */}
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoCapture}
              />
              <button
                onClick={() => galleryInputRef.current?.click()}
                className="w-full min-h-[50px] rounded-2xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-medium text-sm flex items-center justify-center gap-2.5 hover:bg-slate-50 dark:hover:bg-slate-750 active:scale-[0.99] transition cursor-pointer"
              >
                <ImageIcon className="w-5 h-5 text-blue-500" />
                <span>Escolher Foto da Galeria</span>
              </button>

              {/* Opção Manual sem Foto */}
              <button
                onClick={initiateManualCreation}
                className="w-full min-h-[48px] rounded-2xl text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium text-xs flex items-center justify-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition cursor-pointer"
              >
                <Edit3 className="w-4 h-4" />
                <span>Ou Cadastrar Manualmente sem Foto</span>
              </button>

              {/* Dica de Uso */}
              <div className="bg-slate-100/80 dark:bg-slate-800/60 rounded-xl p-3.5 text-slate-500 dark:text-slate-400 text-xs flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                <p>
                  <strong>Dica Pro:</strong> Você pode fotografar um único produto de perto ou vários itens agrupados no mesmo engradado/pallet. A IA detectará automaticamente todos eles.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          PASSO 2: REVISÃO TÉCNICA, FISCAL E MEDIDAS (100% EDITÁVEL)
      ======================================================== */}
      {step === 2 && currentProduct && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm space-y-5">
          {/* Cabeçalho do Produto com Badge de Fonte (IA vs Editado) */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-3">
              {currentProduct.image ? (
                <img
                  src={currentProduct.image}
                  alt="Pré-visualização"
                  className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-slate-700"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-blue-600 font-bold text-xs">
                  UN
                </div>
              )}
              <div>
                <h3 className="font-semibold text-sm text-slate-900 dark:text-white leading-tight">
                  Revisão Técnica & Fiscal
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Verifique e altere qualquer campo sugerido
                </p>
              </div>
            </div>

            {/* Badge IA / Editado */}
            <span
              className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                currentProduct.source === 'ai'
                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
              }`}
            >
              {currentProduct.source === 'ai' ? 'Sugerido por IA' : 'Editado'}
            </span>
          </div>

          {/* 1. Dados Básicos */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              Identificação do Produto
            </h4>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Nome Comercial Completo *
              </label>
              <input
                type="text"
                value={currentProduct.name}
                onChange={(e) => updateCurrentField('name', e.target.value)}
                placeholder="Ex: Cerveja Heineken 600ml Retornável"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Marca
                </label>
                <input
                  type="text"
                  value={currentProduct.brand}
                  onChange={(e) => updateCurrentField('brand', e.target.value)}
                  placeholder="Ex: Heineken"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Categoria
                </label>
                <select
                  value={currentProduct.category}
                  onChange={(e) => updateCurrentField('category', e.target.value as ProductCategory)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Cerveja">Cerveja</option>
                  <option value="Refrigerante">Refrigerante</option>
                  <option value="Destilado">Destilado</option>
                  <option value="Gás/Água">Gás / Água</option>
                  <option value="Carvão/Gelo">Carvão / Gelo</option>
                  <option value="Mercearia">Mercearia</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>
            </div>

            {/* Código de Barras (EAN-13) + Botão Gerar EAN */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Código de Barras (EAN-13)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={currentProduct.barcode}
                    onChange={(e) => updateCurrentField('barcode', e.target.value)}
                    placeholder="7890000000000"
                    maxLength={13}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                  <Barcode className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Gerador
                </label>
                <button
                  type="button"
                  onClick={() => updateCurrentField('barcode', generateEAN13())}
                  className="w-full py-2.5 px-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition flex items-center justify-center gap-1 min-h-[42px]"
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                  Gerar EAN
                </button>
              </div>
            </div>
          </div>

          {/* 2. Dados Fiscais NFe Brasil */}
          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-700">
            <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Tributação & Dados Fiscais (Brasil)
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  NCM (8 dígitos) *
                </label>
                <input
                  type="text"
                  value={currentProduct.ncm}
                  onChange={(e) => updateCurrentField('ncm', e.target.value)}
                  placeholder="2203.00.00"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  CEST
                </label>
                <input
                  type="text"
                  value={currentProduct.cest}
                  onChange={(e) => updateCurrentField('cest', e.target.value)}
                  placeholder="03.001.00"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  CFOP
                </label>
                <input
                  type="text"
                  value={currentProduct.cfop}
                  onChange={(e) => updateCurrentField('cfop', e.target.value)}
                  placeholder="5405"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  CSOSN / CST
                </label>
                <input
                  type="text"
                  value={currentProduct.csosn}
                  onChange={(e) => updateCurrentField('csosn', e.target.value)}
                  placeholder="500"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  ICMS (%)
                </label>
                <input
                  type="number"
                  value={currentProduct.icmsTax}
                  onChange={(e) => updateCurrentField('icmsTax', Number(e.target.value))}
                  placeholder="0"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* 3. Medidas e Embalagem */}
          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-700">
            <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              Medidas & Embalagem
            </h4>

            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Unidade
                </label>
                <select
                  value={currentProduct.unit}
                  onChange={(e) => updateCurrentField('unit', e.target.value as UnitType)}
                  className="w-full px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:outline-none"
                >
                  <option value="UN">UN</option>
                  <option value="FD">FD (Fardo)</option>
                  <option value="CX">CX (Caixa)</option>
                  <option value="KG">KG</option>
                  <option value="L">L</option>
                  <option value="SC">SC (Saco)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Embalagem
                </label>
                <select
                  value={currentProduct.packageType}
                  onChange={(e) => updateCurrentField('packageType', e.target.value as PackageType)}
                  className="w-full px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:outline-none"
                >
                  <option value="Garrafa">Garrafa</option>
                  <option value="Retornável">Retornável</option>
                  <option value="Lata">Lata</option>
                  <option value="PET">PET</option>
                  <option value="Barril">Barril</option>
                  <option value="Saco">Saco</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Volume
                </label>
                <input
                  type="text"
                  value={currentProduct.volume}
                  onChange={(e) => updateCurrentField('volume', e.target.value)}
                  placeholder="600ml"
                  className="w-full px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Qtd por Fardo / Caixa
                </label>
                <input
                  type="number"
                  value={currentProduct.itemsPerPack}
                  onChange={(e) => updateCurrentField('itemsPerPack', Number(e.target.value))}
                  placeholder="12"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Peso Bruto (kg)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={currentProduct.grossWeight}
                  onChange={(e) => updateCurrentField('grossWeight', Number(e.target.value))}
                  placeholder="1.15"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Botões de Ação do Passo 2 */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700 gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium text-xs hover:bg-slate-50 dark:hover:bg-slate-700 min-h-[44px] flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar Foto
            </button>

            <button
              type="button"
              disabled={!currentProduct.name}
              onClick={() => setStep(3)}
              className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs min-h-[44px] flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 transition"
            >
              <span>Avançar para Preços e Estoque</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          PASSO 3: PREÇOS, CUSTO E ESTOQUE
      ======================================================== */}
      {step === 3 && currentProduct && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm space-y-5">
          {/* Destaque IA: Valor Médio de Venda Sugerido */}
          {currentProduct.suggestedMarketPrice && (
            <div className="rounded-2xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 border border-indigo-200 dark:border-indigo-900 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  Sugestão de Preço no Mercado (IA)
                </span>
                <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                  {formatCurrency(currentProduct.suggestedMarketPrice.average)}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                Faixa estimada para distribuidores no Brasil:{' '}
                <strong>{formatCurrency(currentProduct.suggestedMarketPrice.min)}</strong> a{' '}
                <strong>{formatCurrency(currentProduct.suggestedMarketPrice.max)}</strong>.
              </p>
              <button
                type="button"
                onClick={() =>
                  updateCurrentField('salePrice', currentProduct.suggestedMarketPrice!.average)
                }
                className="w-full py-2 rounded-xl bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-semibold hover:bg-indigo-50 dark:hover:bg-indigo-950 transition flex items-center justify-center gap-1"
              >
                Aplicar Sugestão ({formatCurrency(currentProduct.suggestedMarketPrice.average)}) em 1 Clique
              </button>
            </div>
          )}

          {/* Campos de Preços */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5" />
              Valores e Custos Unitários
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Custo de Aquisição (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={currentProduct.costPrice}
                  onChange={(e) => updateCurrentField('costPrice', Number(e.target.value))}
                  placeholder="0,00"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Preço de Venda Unitário (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={currentProduct.salePrice}
                  onChange={(e) => updateCurrentField('salePrice', Number(e.target.value))}
                  placeholder="0,00"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Preço de Atacado / Fardo (R$ opcional)
              </label>
              <input
                type="number"
                step="0.01"
                value={currentProduct.wholesalePrice || ''}
                onChange={(e) => updateCurrentField('wholesalePrice', Number(e.target.value))}
                placeholder="Ex: 8.80"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:outline-none"
              />
            </div>
          </div>

          {/* Indicador de Margem ao Vivo com Cores Semafóricas */}
          {marginResult && (
            <div className={`p-3.5 rounded-2xl border ${marginResult.colorClass} space-y-1 transition-colors`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider">
                  {marginResult.badgeLabel}
                </span>
                <span className="text-sm font-extrabold">
                  {marginResult.marginPercent.toFixed(1)}% de Margem
                </span>
              </div>
              <p className="text-xs opacity-90">
                Lucro Bruto Unitário Estimado: <strong>{formatCurrency(marginResult.profit)}</strong> por item.
              </p>
            </div>
          )}

          {/* Campos de Estoque */}
          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-700">
            <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              Controle de Estoque & Alerta de Reposição
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Estoque Atual (Qtd) *
                </label>
                <input
                  type="number"
                  value={currentProduct.stock}
                  onChange={(e) => updateCurrentField('stock', Number(e.target.value))}
                  placeholder="24"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Estoque Mínimo (Alerta) *
                </label>
                <input
                  type="number"
                  value={currentProduct.minStock}
                  onChange={(e) => updateCurrentField('minStock', Number(e.target.value))}
                  placeholder="12"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Botões de Ação do Passo 3 */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700 gap-3">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium text-xs hover:bg-slate-50 dark:hover:bg-slate-700 min-h-[46px] flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar ao Passo 2
            </button>

            <button
              type="button"
              onClick={handleFinalizeSave}
              className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-bold text-xs min-h-[46px] flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 active:scale-[0.99] transition cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {activeItemIndex < detectedProducts.length - 1
                  ? `Salvar e Ir para Item ${activeItemIndex + 2}`
                  : 'Finalizar e Salvar no Estoque'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Botão de Cancelar Geral */}
      <div className="text-center">
        <button
          onClick={onCancel}
          className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 underline py-2"
        >
          Cancelar Cadastro
        </button>
      </div>
    </div>
  );
};
