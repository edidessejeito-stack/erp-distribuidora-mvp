import React, { useState, ChangeEvent, useRef } from 'react';
import {
  X,
  Trash2,
  Save,
  Camera,
  Coins,
  FileSpreadsheet,
  Layers,
  Sparkles,
  Barcode,
  Check,
  Lock,
  ArrowRightLeft,
} from 'lucide-react';
import { Product, ProductCategory, UnitType, PackageType } from '../types/index.ts';
import { calculateMargin, generateEAN13, formatCurrency } from '../utils/calculations.ts';
import { compressImage } from '../utils/imageCompressor.ts';

interface ProductBottomSheetProps {
  product: Product | null;
  onClose: () => void;
  onSave: (updatedProduct: Product) => Promise<void>;
  onDelete: (productId: string) => Promise<void>;
  onOpenMovement?: (product: Product) => void;
}

export const ProductBottomSheet: React.FC<ProductBottomSheetProps> = ({
  product,
  onClose,
  onSave,
  onDelete,
  onOpenMovement,
}) => {
  if (!product) return null;

  // Estado local com cópia do produto para edição 360°
  const [formData, setFormData] = useState<Product>({ ...product });
  const [activeTab, setActiveTab] = useState<'geral' | 'fiscal' | 'precos'>('geral');
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateField = <K extends keyof Product>(key: K, value: Product[K]) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
      source: 'edited',
      updatedAt: new Date().toISOString(),
    }));
  };

  const handlePhotoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file, 600, 0.7);
      updateField('image', compressed);
    } catch (err) {
      console.error('Falha ao comprimir imagem:', err);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(formData);
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 350);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    await onDelete(formData.id);
    onClose();
  };

  const marginResult = calculateMargin(formData.costPrice, formData.salePrice);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-fadeIn">
      {/* Container Bottom Sheet estilo Android Material 3 */}
      <div 
        className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col shadow-2xl border-t sm:border border-slate-200 dark:border-slate-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Puxador da Gaveta Android */}
        <div className="pt-3 pb-1 flex justify-center sm:hidden">
          <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
        </div>

        {/* Cabeçalho do Bottom Sheet */}
        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Foto com botão de alterar */}
            <div className="relative group flex-shrink-0">
              <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                {formData.image ? (
                  <img src={formData.image} alt={formData.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-400">
                    {formData.unit}
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shadow hover:bg-blue-700 transition"
                title="Trocar Foto"
              >
                <Camera className="w-3 h-3" />
              </button>
            </div>

            <div className="min-w-0">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                {formData.name || 'Edição de Produto'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {formatCurrency(formData.salePrice)} &bull; Estoque: {formData.stock} {formData.unit}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition min-w-[36px] min-h-[36px] flex items-center justify-center"
            aria-label="Fechar gaveta"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3 Abas Estilo Android: 1. Geral & Medidas, 2. Fiscal NFe, 3. Preços & Estoque */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 px-3">
          <button
            onClick={() => setActiveTab('geral')}
            className={`flex-1 py-3 text-xs font-semibold border-b-2 transition flex items-center justify-center gap-1.5 ${
              activeTab === 'geral'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Geral & Medidas</span>
          </button>

          <button
            onClick={() => setActiveTab('fiscal')}
            className={`flex-1 py-3 text-xs font-semibold border-b-2 transition flex items-center justify-center gap-1.5 ${
              activeTab === 'fiscal'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Fiscal NFe</span>
          </button>

          <button
            onClick={() => setActiveTab('precos')}
            className={`flex-1 py-3 text-xs font-semibold border-b-2 transition flex items-center justify-center gap-1.5 ${
              activeTab === 'precos'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            <span>Preços & Estoque</span>
          </button>
        </div>

        {/* Conteúdo com Scroll Suave */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* ========================================================
              ABA 1: GERAL & MEDIDAS
          ======================================================== */}
          {activeTab === 'geral' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Nome do Produto *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Marca
                  </label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) => updateField('brand', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Categoria
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => updateField('category', e.target.value as ProductCategory)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none"
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

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Unidade
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) => updateField('unit', e.target.value as UnitType)}
                    className="w-full px-2.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none"
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
                    value={formData.packageType}
                    onChange={(e) => updateField('packageType', e.target.value as PackageType)}
                    className="w-full px-2.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none"
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
                    value={formData.volume}
                    onChange={(e) => updateField('volume', e.target.value)}
                    className="w-full px-2.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Qtd por Fardo
                  </label>
                  <input
                    type="number"
                    value={formData.itemsPerPack}
                    onChange={(e) => updateField('itemsPerPack', Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Peso Bruto (kg)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.grossWeight}
                    onChange={(e) => updateField('grossWeight', Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              ABA 2: FISCAL NFE BRASIL
          ======================================================== */}
          {activeTab === 'fiscal' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    NCM (8 dígitos)
                  </label>
                  <input
                    type="text"
                    value={formData.ncm}
                    onChange={(e) => updateField('ncm', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    CEST
                  </label>
                  <input
                    type="text"
                    value={formData.cest}
                    onChange={(e) => updateField('cest', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    CFOP Padrão
                  </label>
                  <input
                    type="text"
                    value={formData.cfop}
                    onChange={(e) => updateField('cfop', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    CSOSN / CST
                  </label>
                  <input
                    type="text"
                    value={formData.csosn}
                    onChange={(e) => updateField('csosn', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    ICMS (%)
                  </label>
                  <input
                    type="number"
                    value={formData.icmsTax}
                    onChange={(e) => updateField('icmsTax', Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Código de Barras EAN-13
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.barcode}
                      onChange={(e) => updateField('barcode', e.target.value)}
                      maxLength={13}
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono focus:outline-none"
                    />
                    <Barcode className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Gerar
                  </label>
                  <button
                    type="button"
                    onClick={() => updateField('barcode', generateEAN13())}
                    className="w-full py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition flex items-center justify-center gap-1"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                    EAN-13
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  SKU Interno
                </label>
                <input
                  type="text"
                  value={formData.sku}
                  onChange={(e) => updateField('sku', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* ========================================================
              ABA 3: PREÇOS & ESTOQUE
          ======================================================== */}
          {activeTab === 'precos' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Custo Unitário (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.costPrice}
                    onChange={(e) => updateField('costPrice', Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-semibold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Preço de Venda (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.salePrice}
                    onChange={(e) => updateField('salePrice', Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-semibold focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Preço Atacado / Fardo (R$ opcional)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.wholesalePrice || ''}
                  onChange={(e) => updateField('wholesalePrice', Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none"
                />
              </div>

              {/* Recálculo de Margem ao Vivo */}
              <div className={`p-3.5 rounded-2xl border ${marginResult.colorClass} space-y-1`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider">
                    {marginResult.badgeLabel}
                  </span>
                  <span className="text-sm font-extrabold">
                    {marginResult.marginPercent.toFixed(1)}% de Margem
                  </span>
                </div>
                <p className="text-xs opacity-90">
                  Lucro Bruto Unitário: <strong>{formatCurrency(marginResult.profit)}</strong> por item.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
                {/* Saldo de Estoque Protegido (Separação Estrita de Cadastro e Movimentações) */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <Lock className="w-3.5 h-3.5 text-amber-500" />
                      <span>Saldo em Estoque (Protegido)</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-extrabold text-xs">
                      {formData.stock} {formData.unit}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                    A quantidade em estoque não é editável diretamente no cadastro. Todas as alterações exigem registro imutável no Kardex com motivo e operador.
                  </p>
                  {onOpenMovement && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenMovement(formData);
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                      <span>Movimentar Estoque Deste Item</span>
                    </button>
                  )}
                </div>

                {/* Parâmetro de Alerta de Reposição (Regra de Catálogo) */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Estoque Mínimo para Alerta de Reposição
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.minStock}
                    onChange={(e) => updateField('minStock', Math.max(0, Number(e.target.value)))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-bold focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Define o gatilho para sinalização de reposição e alertas automáticos.
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé de Ações: Excluir e Salvar */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between gap-3">
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDelete}
                className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs flex items-center gap-1.5 transition"
              >
                Confirmar Exclusão
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="p-2.5 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition flex items-center gap-1.5 text-xs font-medium"
              title="Excluir este produto do estoque"
            >
              <Trash2 className="w-4 h-4" />
              <span>Excluir</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium text-xs hover:bg-slate-100 dark:hover:bg-slate-800 min-h-[44px]"
            >
              Fechar
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-2 shadow-xs active:scale-[0.99] transition min-h-[44px]"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>Salvo!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Salvar Alterações</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
