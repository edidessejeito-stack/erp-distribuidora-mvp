import React from 'react';
import {
  Camera,
  Sparkles,
  AlertTriangle,
  ArrowRight,
  Layers,
  History,
  ArrowRightLeft,
} from 'lucide-react';
import { Product } from '../types/index.ts';
import { formatCurrency, isLowStock } from '../utils/calculations.ts';

interface HomeDashboardProps {
  products: Product[];
  onOpenScan: () => void;
  onOpenStock: () => void;
  onOpenMovements: () => void;
  onOpenAIAdjustment: (product?: Product | null) => void;
  onOpenMovement: (product: Product) => void;
  onSelectProduct: (product: Product) => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  products,
  onOpenScan,
  onOpenStock,
  onOpenMovements,
  onOpenAIAdjustment,
  onOpenMovement,
  onSelectProduct,
}) => {
  // Cálculos do resumo
  const totalItems = products.reduce((acc, p) => acc + (p.stock || 0), 0);
  const totalPotentialValue = products.reduce((acc, p) => acc + (p.stock || 0) * (p.salePrice || 0), 0);
  const lowStockItems = products.filter((p) => isLowStock(p.stock, p.minStock));

  // Produtos recentes (últimos cadastrados ou movimentados)
  const recentProducts = [...products]
    .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-5 pb-20 animate-fadeIn">
      {/* 2 Cards Minimalistas Lado a Lado */}
      <div className="grid grid-cols-2 gap-3.5">
        {/* Card 1: Total em Estoque */}
        <div 
          onClick={onOpenStock}
          className="bg-white dark:bg-slate-800/90 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm cursor-pointer hover:border-blue-200 dark:hover:border-blue-800 transition"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="text-xs font-medium">Total em Estoque</span>
            <Layers className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            {totalItems.toLocaleString('pt-BR')} <span className="text-xs font-normal text-slate-400">un</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
            {formatCurrency(totalPotentialValue)} potencial
          </p>
        </div>

        {/* Card 2: Atenção / Reposição */}
        <div 
          onClick={onOpenStock}
          className={`bg-white dark:bg-slate-800/90 rounded-2xl p-4 border shadow-sm cursor-pointer transition ${
            lowStockItems.length > 0
              ? 'border-amber-200 dark:border-amber-900/50 hover:border-amber-300'
              : 'border-slate-100 dark:border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="text-xs font-medium">Reposição</span>
            <AlertTriangle className={`w-4 h-4 ${lowStockItems.length > 0 ? 'text-amber-500' : 'text-slate-400'}`} />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
            {lowStockItems.length}
            {lowStockItems.length > 0 && (
              <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300">
                Atenção
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
            {lowStockItems.length > 0 ? 'Abaixo do estoque mínimo' : 'Estoque regularizado'}
          </p>
        </div>
      </div>

      {/* Atalhos Rápidos para Estoque com IA & Kardex */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          onClick={() => onOpenAIAdjustment(null)}
          className="p-3.5 rounded-2xl bg-gradient-to-tr from-purple-50 to-indigo-50 dark:from-purple-950/40 dark:to-indigo-950/40 border border-purple-200/80 dark:border-purple-900/60 text-left transition hover:border-purple-300 active:scale-98 shadow-xs cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center mb-2 shadow-xs group-hover:scale-105 transition">
            <Sparkles className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold text-slate-900 dark:text-white">
            Ajuste com IA
          </h4>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
            Comando por foto ou texto
          </p>
        </button>

        <button
          onClick={onOpenMovements}
          className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 text-left transition hover:border-blue-300 active:scale-98 shadow-xs cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center mb-2 shadow-xs group-hover:scale-105 transition">
            <History className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold text-slate-900 dark:text-white">
            Kardex & Histórico
          </h4>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
            Rastreabilidade de lotes
          </p>
        </button>
      </div>

      {/* Call to Action Principal: Cadastrar Produto por Foto (IA) */}
      <div 
        onClick={onOpenScan}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-5 text-white shadow-md shadow-indigo-500/15 cursor-pointer active:scale-[0.99] transition-all group"
      >
        <div className="relative z-10 flex items-center justify-between">
          <div className="space-y-1 max-w-[80%]">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-semibold text-white mb-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" style={{ animationDuration: '4s' }} />
              Gemini Vision Integrada
            </div>
            <h2 className="text-base sm:text-lg font-bold tracking-tight">Cadastrar Produto por Foto</h2>
            <p className="text-xs text-blue-100 leading-relaxed">
              Fotografe rótulos ou fardos para extrair medidas, NCM fiscal e sugestão de preço em segundos.
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
            <Camera className="w-6 h-6 text-white" />
          </div>
        </div>

        <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-white/10 blur-xl pointer-events-none" />
      </div>

      {/* Acesso Rápido aos Produtos Recentes */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Catálogo Recente
          </h3>
          <button
            onClick={onOpenStock}
            className="text-xs font-medium text-blue-600 dark:text-blue-400 flex items-center gap-1 hover:underline cursor-pointer"
          >
            Ver todos ({products.length})
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {recentProducts.length === 0 ? (
          <div className="bg-white dark:bg-slate-800/80 rounded-2xl p-8 text-center border border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs">
            Nenhum produto cadastrado ainda. Comece fotografando um item acima!
          </div>
        ) : (
          <div className="space-y-2">
            {recentProducts.map((product) => {
              const low = isLowStock(product.stock, product.minStock);
              return (
                <div
                  key={product.id}
                  onClick={() => onSelectProduct(product)}
                  className="bg-white dark:bg-slate-800/90 rounded-2xl p-3 border border-slate-100 dark:border-slate-800/80 shadow-xs flex items-center justify-between gap-3 cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition"
                >
                  {/* Foto miniatura */}
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-700 shrink-0 flex items-center justify-center">
                    {product.image ? (
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold text-slate-400">{product.unit}</span>
                    )}
                  </div>

                  {/* Nome e Preço */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                      {product.name}
                    </h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300">
                        {formatCurrency(product.salePrice)}
                      </span>
                      {low ? (
                        <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-0.5 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded-md">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          Repor ({product.stock}/{product.minStock})
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          Estoque: {product.stock} {product.unit}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Botão de Movimentar com Rastreabilidade */}
                  <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onOpenMovement(product)}
                      className="min-h-[38px] px-2.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-600 text-blue-700 dark:text-blue-300 hover:text-white border border-blue-200/80 dark:border-blue-800 text-xs font-bold flex items-center gap-1.5 transition active:scale-95 shadow-xs cursor-pointer"
                      title={`Movimentar estoque de ${product.name}`}
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Movimentar</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
