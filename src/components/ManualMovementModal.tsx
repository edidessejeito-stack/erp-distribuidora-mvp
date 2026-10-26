import React, { useState, useEffect } from 'react';
import {
  X,
  ArrowRightLeft,
  Package,
  Plus,
  Minus,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
} from 'lucide-react';
import { Product, MovementType } from '../types/index.ts';

interface ManualMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  currentUserEmail: string;
  preselectedProduct?: Product | null;
  onConfirmMovement: (params: {
    productId: string;
    type: MovementType;
    delta?: number;
    targetStock?: number;
    reason: string;
    operator: string;
  }) => Promise<void>;
}

const MOVEMENT_TYPES: { type: MovementType; label: string; defaultDir: 'in' | 'out' | 'set' }[] = [
  { type: 'entrada_compra', label: 'Entrada por Compra / NF', defaultDir: 'in' },
  { type: 'saida_venda', label: 'Saída / Venda Comercial', defaultDir: 'out' },
  { type: 'ajuste_inventario', label: 'Ajuste de Inventário', defaultDir: 'set' },
  { type: 'contagem_diaria', label: 'Contagem Diária / Auditoria', defaultDir: 'set' },
  { type: 'perda_avaria', label: 'Perda / Avaria / Vencido', defaultDir: 'out' },
];

export const ManualMovementModal: React.FC<ManualMovementModalProps> = ({
  isOpen,
  onClose,
  products,
  currentUserEmail,
  preselectedProduct,
  onConfirmMovement,
}) => {
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [movementType, setMovementType] = useState<MovementType>('entrada_compra');
  const [mode, setMode] = useState<'delta' | 'target'>('delta');
  const [quantity, setQuantity] = useState<number>(10);
  const [targetStock, setTargetStock] = useState<number>(100);
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (preselectedProduct) {
      setSelectedProductId(preselectedProduct.id);
      setTargetStock(preselectedProduct.stock);
    } else if (products.length > 0 && !selectedProductId) {
      setSelectedProductId(products[0].id);
      setTargetStock(products[0].stock);
    }
  }, [preselectedProduct, products, selectedProductId]);

  if (!isOpen) return null;

  const currentProduct = products.find((p) => p.id === selectedProductId) || products[0];

  // Cálculo ao vivo do Delta e do Novo Saldo
  let calculatedDelta = 0;
  let finalStock = 0;

  if (currentProduct) {
    if (mode === 'target') {
      finalStock = Math.max(0, targetStock);
      calculatedDelta = finalStock - currentProduct.stock;
    } else {
      const isOut = movementType === 'saida_venda' || movementType === 'perda_avaria';
      calculatedDelta = isOut ? -Math.abs(quantity) : Math.abs(quantity);
      finalStock = Math.max(0, currentProduct.stock + calculatedDelta);
    }
  }

  const handleSelectType = (t: MovementType) => {
    setMovementType(t);
    const item = MOVEMENT_TYPES.find((m) => m.type === t);
    if (item?.defaultDir === 'set') {
      setMode('target');
      if (currentProduct) setTargetStock(currentProduct.stock);
    } else {
      setMode('delta');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProduct) {
      setErrorMessage('Selecione um produto válido.');
      return;
    }
    if (!reason.trim()) {
      setErrorMessage('O motivo da movimentação é obrigatório para conformidade de auditoria.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await onConfirmMovement({
        productId: currentProduct.id,
        type: movementType,
        delta: mode === 'delta' ? calculatedDelta : undefined,
        targetStock: mode === 'target' ? finalStock : undefined,
        reason: reason.trim(),
        operator: currentUserEmail || 'Operador',
      });
      onClose();
    } catch (err: unknown) {
      const error = err as { message?: string };
      setErrorMessage(error.message || 'Erro ao registrar a movimentação.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-xs p-0 sm:p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col shadow-2xl border-t sm:border border-slate-200 dark:border-slate-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Puxador Android */}
        <div className="pt-3 pb-1 flex justify-center sm:hidden">
          <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
        </div>

        {/* Cabeçalho */}
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                Nova Movimentação de Estoque
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Lançamento formal com registro imutável no Kardex
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Seleção do Produto */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Produto Afetado
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => {
                setSelectedProductId(e.target.value);
                const p = products.find((x) => x.id === e.target.value);
                if (p) setTargetStock(p.stock);
              }}
              className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (Atual: {p.stock} {p.unit})
                </option>
              ))}
            </select>
          </div>

          {/* Tipo de Movimentação */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Tipo de Movimentação
            </label>
            <div className="grid grid-cols-2 gap-2">
              {MOVEMENT_TYPES.map((t) => {
                const isSelected = movementType === t.type;
                return (
                  <button
                    key={t.type}
                    type="button"
                    onClick={() => handleSelectType(t.type)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold text-left transition border ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750'
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Alternador de Modo de Quantidade (Adicionar/Subtrair vs. Ajustar Saldo Total) */}
          <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
            <button
              type="button"
              onClick={() => setMode('delta')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${
                mode === 'delta'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {movementType === 'saida_venda' || movementType === 'perda_avaria'
                ? 'Quantidade a Subtrair (-)'
                : 'Quantidade a Adicionar (+)'}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('target');
                if (currentProduct) setTargetStock(currentProduct.stock);
              }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${
                mode === 'target'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              Informar Novo Saldo Total
            </button>
          </div>

          {/* Entrada Numérica */}
          {mode === 'delta' ? (
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Quantidade ({currentProduct?.unit || 'UN'})
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="flex-1 text-center py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-extrabold text-base"
                />
                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Novo Saldo Físico Apurado ({currentProduct?.unit || 'UN'})
              </label>
              <input
                type="number"
                min="0"
                value={targetStock}
                onChange={(e) => setTargetStock(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="w-full text-center py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-extrabold text-base"
              />
            </div>
          )}

          {/* Painel de Cálculo em Tempo Real */}
          <div className="grid grid-cols-3 gap-2 text-center pt-1">
            <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Anterior</span>
              <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300">
                {currentProduct?.stock || 0}
              </span>
            </div>

            <div className={`p-2.5 rounded-2xl border ${
              calculatedDelta >= 0
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400'
                : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400'
            }`}>
              <span className="text-[10px] uppercase font-semibold block flex items-center justify-center gap-0.5">
                {calculatedDelta >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                Delta
              </span>
              <span className="text-xs font-extrabold">
                {calculatedDelta > 0 ? `+${calculatedDelta}` : calculatedDelta}
              </span>
            </div>

            <div className="p-2.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300">
              <span className="text-[10px] uppercase font-semibold block">Novo Saldo</span>
              <span className="text-xs font-extrabold">{finalStock}</span>
            </div>
          </div>

          {/* Motivo Obrigatório com Sugestões Rápidas */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Motivo / Observação Oficial (Obrigatório)
            </label>
            <textarea
              rows={2}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Recebimento NF-e 8912 do fornecedor Ambev..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-sans"
            />
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {[
                'NF-e Recebida de Fornecedor',
                'Contagem Física de Rotina',
                'Ajuste de Balanço Periódico',
                'Avaria em Transporte',
              ].map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => setReason(sug)}
                  className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-400 hover:text-blue-600 transition"
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>

          <div className="text-[11px] text-slate-400">
            Responsável registrado: <strong>{currentUserEmail}</strong>
          </div>

          {/* Botões */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="min-h-[46px] rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-200 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !reason.trim()}
              className="min-h-[46px] rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Gravar Movimentação</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
