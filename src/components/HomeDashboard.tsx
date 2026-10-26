import React from 'react';
import { Camera, Sparkles, AlertTriangle, ArrowRight, Plus, Minus, Layers } from 'lucide-react';
import { Product } from '../types/index.ts';
import { formatCurrency, isLowStock } from '../utils/calculations.ts';

interface HomeDashboardProps {
  products: Product[];
  onOpenScan: () => void;
  onOpenStock: () => void;
  onSelectProduct: (product: Product) => void;
  onQuickUpdateStock: (productId: string, delta: number) => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  products,
  onOpenScan,
  onOpenStock,
  onSelectProduct,
  onQuickUpdateStock,
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
    <div className="space-y-6 pb-20 animate-fadeIn">
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
            <h2 className="text-lg font-bold tracking-tight">Cadastrar Produto por Foto</h2>
            <p className="text-xs text-blue-100 leading-relaxed">
              Fotografe rótulos ou fardos para extrair medidas, NCM fiscal e sugestão de preço em segundos.
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center group-hover:scale-110 transition-transform">
            <Camera className="w-6 h-6 text-white" />
          </div>
        </div>

        {/* Efeito sutil de brilho de fundo */}
        <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-white/10 blur-xl pointer-events-none" />
      </div>

      {/* Acesso Rápido aos Produtos Recentes */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Produtos Recentes
          </h3>
          <button
            onClick={onOpenStock}
            className="text-xs font-medium text-blue-600 dark:text-blue-400 flex items-center gap-1 hover:underline"
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
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-700 flex-shrink-0 flex items-center justify-center">
                    {product.image ? (
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold text-slate-400">UN</span>
                    )}
                  </div>

                  {/* Nome e Preço */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-slate-900 dark:text-white truncate">
                      {product.name}
                    </h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {formatCurrency(product.salePrice)}
                      </span>
                      {low && (
                        <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          Repor ({product.stock}/{product.minStock})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Controle rápido de estoque (+ / -) */}
                  <div 
                    className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900/60 p-1 rounded-xl border border-slate-100 dark:border-slate-800"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => onQuickUpdateStock(product.id, -1)}
                      disabled={product.stock <= 0}
                      className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed shadow-xs active:scale-95 transition"
                      title="Diminuir 1 do estoque"
                      aria-label="Diminuir quantidade"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-7 text-center font-bold text-xs text-slate-900 dark:text-white">
                      {product.stock}
                    </span>
                    <button
                      onClick={() => onQuickUpdateStock(product.id, 1)}
                      className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 shadow-xs active:scale-95 transition"
                      title="Aumentar 1 no estoque"
                      aria-label="Aumentar quantidade"
                    >
                      <Plus className="w-3.5 h-3.5" />
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
