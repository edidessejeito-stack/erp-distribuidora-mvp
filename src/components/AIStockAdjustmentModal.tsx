import React, { useState, useRef, ChangeEvent } from 'react';
import {
  X,
  Sparkles,
  Camera,
  Upload,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Package,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  HelpCircle,
} from 'lucide-react';
import { Product, StockAdjustmentAIProposal, MovementType } from '../types/index.ts';
import { interpretStockAdjustmentAI } from '../services/geminiClient.ts';
import { compressImage } from '../utils/imageCompressor.ts';

interface AIStockAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  currentUserEmail: string;
  onConfirmAdjustment: (proposal: StockAdjustmentAIProposal) => Promise<void>;
  preselectedProduct?: Product | null;
}

export const AIStockAdjustmentModal: React.FC<AIStockAdjustmentModalProps> = ({
  isOpen,
  onClose,
  products,
  currentUserEmail,
  onConfirmAdjustment,
  preselectedProduct,
}) => {
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [textPrompt, setTextPrompt] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [proposal, setProposal] = useState<StockAdjustmentAIProposal | null>(null);
  const [editableReason, setEditableReason] = useState<string>('');
  const [editableDelta, setEditableDelta] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handlePhotoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setErrorMessage(null);
      const compressed = await compressImage(file, 800, 0.75);
      setPhotoPreview(compressed);
    } catch {
      setErrorMessage('Falha ao processar a foto. Tente novamente.');
    }
  };

  const handleAnalyze = async () => {
    if (!photoPreview && !textPrompt.trim()) {
      setErrorMessage('Por favor, anexe uma foto ou digite um comando de ajuste.');
      return;
    }

    setIsAnalyzing(true);
    setErrorMessage(null);

    try {
      // Se houver produto pré-selecionado, pode injetar no prompt
      const promptToSend = preselectedProduct && !textPrompt.includes(preselectedProduct.name)
        ? `Produto Selecionado: "${preselectedProduct.name}". ${textPrompt}`
        : textPrompt;

      const result = await interpretStockAdjustmentAI({
        image: photoPreview || undefined,
        textPrompt: promptToSend,
        products,
      });

      // Se havia um produto pré-selecionado e a IA errou o match, força o pré-selecionado
      if (preselectedProduct && result.matchedProductId !== preselectedProduct.id) {
        result.matchedProductId = preselectedProduct.id;
        result.matchedProductName = preselectedProduct.name;
        result.currentStock = preselectedProduct.stock;
        result.proposedNewStock = Math.max(0, preselectedProduct.stock + result.calculatedDelta);
      }

      setProposal(result);
      setEditableReason(result.proposedReason);
      setEditableDelta(result.calculatedDelta);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setErrorMessage(e.message || 'Não foi possível interpretar o ajuste com IA.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfirm = async () => {
    if (!proposal) return;
    if (!editableReason.trim()) {
      setErrorMessage('O motivo da movimentação é obrigatório para conformidade de auditoria.');
      return;
    }

    setIsSubmitting(true);
    try {
      const finalProposal: StockAdjustmentAIProposal = {
        ...proposal,
        calculatedDelta: editableDelta,
        proposedNewStock: Math.max(0, proposal.currentStock + editableDelta),
        proposedReason: editableReason.trim(),
      };
      await onConfirmAdjustment(finalProposal);
      handleReset();
      onClose();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setErrorMessage(e.message || 'Erro ao registrar a movimentação.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setPhotoPreview(null);
    setTextPrompt('');
    setProposal(null);
    setEditableReason('');
    setEditableDelta(0);
    setErrorMessage(null);
  };

  const matchedProductObj = proposal
    ? products.find((p) => p.id === proposal.matchedProductId)
    : preselectedProduct;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-xs p-0 sm:p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col shadow-2xl border-t sm:border border-slate-200 dark:border-slate-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Puxador da Gaveta Android */}
        <div className="pt-3 pb-1 flex justify-center sm:hidden">
          <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
        </div>

        {/* Cabeçalho */}
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                Ajuste de Estoque com IA
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Interpretação multimodal com confirmação obrigatória
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

        {/* Corpo do Modal */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {!proposal ? (
            /* FASE 1: ENTRADA DE DADOS (FOTO E/OU COMANDO) */
            <div className="space-y-4">
              {preselectedProduct && (
                <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl overflow-hidden bg-white dark:bg-slate-800 shrink-0 border border-blue-100 dark:border-blue-800 flex items-center justify-center">
                    {preselectedProduct.image ? (
                      <img src={preselectedProduct.image} alt={preselectedProduct.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-5 h-5 text-blue-500" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400">
                      Produto Pré-Selecionado
                    </span>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {preselectedProduct.name}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Estoque Atual: <strong>{preselectedProduct.stock} {preselectedProduct.unit}</strong>
                    </p>
                  </div>
                </div>
              )}

              {/* Upload de Foto / Captura */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Foto do Produto / Pallet / Prateleira (Opcional)
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />

                {photoPreview ? (
                  <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 max-h-48 bg-black/5">
                    <img src={photoPreview} alt="Pré-visualização" className="w-full h-44 object-cover" />
                    <button
                      type="button"
                      onClick={() => setPhotoPreview(null)}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition"
                      title="Remover foto"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-purple-500 rounded-2xl p-5 text-center cursor-pointer transition bg-slate-50/50 dark:bg-slate-800/40 flex flex-col items-center justify-center gap-2"
                  >
                    <div className="w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                      <Camera className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Tirar foto ou anexar imagem da mercadoria
                      </p>
                      <p className="text-[10px] text-slate-400">
                        A IA identifica o rótulo e ajuda a contar o lote
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Comando de Texto / Voz */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Instrução ou Comando em Linguagem Natural
                </label>
                <textarea
                  rows={3}
                  value={textPrompt}
                  onChange={(e) => setTextPrompt(e.target.value)}
                  placeholder="Exemplos:
- 'Chegaram 50 fardos de Coca-Cola na NF-e 4591'
- 'Ajustar estoque da Heineken 600ml para 200 un após inventário'
- 'Perda: 4 latas de Brahma furadas no descarregamento'"
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 transition resize-none"
                />
              </div>

              {/* Dicas Rápidas de Comandos */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Entrada de 24 un',
                  'Ajustar para 100',
                  'Contagem: 36 un',
                  'Perda de 2 un avariadas',
                ].map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => setTextPrompt((prev) => (prev ? `${prev} - ${sug}` : sug))}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-medium hover:bg-purple-50 dark:hover:bg-purple-950/40 hover:text-purple-600 transition"
                  >
                    + {sug}
                  </button>
                ))}
              </div>

              {/* Botão Interpretar com IA */}
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={isAnalyzing || (!photoPreview && !textPrompt.trim())}
                className="w-full min-h-[48px] rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md hover:opacity-95 active:scale-98 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isAnalyzing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Interpretando com Gemini IA...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Interpretar e Gerar Pré-Visualização</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            /* FASE 2: PAINEL DE PRÉ-VISUALIZAÇÃO (RESUMO DA AÇÃO COM CONFIRMAÇÃO OBRIGATÓRIA) */
            <div className="space-y-4 animate-fadeIn">
              {/* Banner de Rastreabilidade e Confirmação */}
              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 space-y-1">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 text-xs font-bold">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>Confirmação Obrigatória (Regra de Auditoria)</span>
                </div>
                <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-tight">
                  Nenhuma alteração foi realizada ainda. Revise o produto, os saldos e a justificativa antes de gravar a movimentação no Kardex.
                </p>
              </div>

              {/* Card do Produto Identificado */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shrink-0 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                  {matchedProductObj?.image ? (
                    <img src={matchedProductObj.image} alt={proposal.matchedProductName} className="w-full h-full object-cover" />
                  ) : (
                    <Package className="w-6 h-6 text-slate-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                      {proposal.typeLabel}
                    </span>
                    <span className="text-[10px] text-slate-400">• Confiança {proposal.rawConfidence}</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {proposal.matchedProductName}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Operador Responsável: <strong>{currentUserEmail}</strong>
                  </p>
                </div>
              </div>

              {/* Comparador de Saldos: Anterior -> Delta -> Novo */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                    Anterior
                  </span>
                  <span className="text-sm font-extrabold text-slate-700 dark:text-slate-300">
                    {proposal.currentStock}
                  </span>
                </div>

                <div className={`p-3 rounded-2xl border ${
                  editableDelta >= 0
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400'
                    : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400'
                }`}>
                  <span className="text-[10px] uppercase font-semibold block flex items-center justify-center gap-0.5">
                    {editableDelta >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    Delta
                  </span>
                  <span className="text-sm font-extrabold">
                    {editableDelta > 0 ? `+${editableDelta}` : editableDelta}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300">
                  <span className="text-[10px] uppercase font-semibold block">
                    Novo Saldo
                  </span>
                  <span className="text-sm font-extrabold">
                    {Math.max(0, proposal.currentStock + editableDelta)}
                  </span>
                </div>
              </div>

              {/* Ajuste Fino do Delta (Se o operador quiser alterar a quantidade antes de confirmar) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Ajuste de Quantidade / Delta (Opcional)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={editableDelta}
                    onChange={(e) => setEditableDelta(parseInt(e.target.value, 10) || 0)}
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-xs"
                  />
                  <span className="text-xs text-slate-500">
                    Novo estoque será <strong>{Math.max(0, proposal.currentStock + editableDelta)}</strong>
                  </span>
                </div>
              </div>

              {/* Motivo e Justificativa de Auditoria (Obrigatório e Editável) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Motivo / Justificativa Oficial (Obrigatório para Auditoria)
                </label>
                <textarea
                  rows={2}
                  value={editableReason}
                  onChange={(e) => setEditableReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none font-sans"
                />
              </div>

              {/* Explicação da IA */}
              {proposal.aiExplanation && (
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
                  <strong className="text-slate-700 dark:text-slate-300">Raciocínio IA:</strong> {proposal.aiExplanation}
                </div>
              )}

              {/* Ações: Cancelar / Voltar ou Confirmar Ação */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={isSubmitting}
                  className="min-h-[46px] rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Descartar / Refazer</span>
                </button>

                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={isSubmitting || !editableReason.trim()}
                  className="min-h-[46px] rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirmar Ação</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
