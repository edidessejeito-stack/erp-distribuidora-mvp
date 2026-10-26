import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  AlertTriangle,
  PackageOpen,
  ArrowRightLeft,
  Sparkles,
  History,
  Tag,
} from 'lucide-react';
import { Product, ProductCategory } from '../types/index.ts';
import { formatCurrency, isLowStock } from '../utils/calculations.ts';

interface StockListProps {
  products: Product[];
  onSelectProduct: (product: Product) => void;
  onOpenMovement: (product: Product) => void;
  onOpenAIAdjustment: (product?: Product | null) => void;
  onOpenMovementsTab: () => void;
  onOpenAddNew: () => void;
}

const CATEGORIES: ('Todos' | ProductCategory | 'Estoque Baixo')[] = [
  'Todos',
  'Estoque Baixo',
  'Cerveja',
  'Refrigerante',
  'Destilado',
  'Gás/Água',
  'Carvão/Gelo',
  'Mercearia',
];

export const StockList: React.FC<StockListProps> = ({
  products,
  onSelectProduct,
  onOpenMovement,
  onOpenAIAdjustment,
  onOpenMovementsTab,
  onOpenAddNew,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'Todos' | ProductCategory | 'Estoque Baixo'>('Todos');

  // Filtragem instantânea
  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        prod.name.toLowerCase().includes(q) ||
        prod.brand.toLowerCase().includes(q) ||
        prod.barcode.toLowerCase().includes(q) ||
        prod.ncm.replace(/\D/g, '').includes(q.replace(/\D/g, ''));

      if (!matchQuery) return false;

      if (selectedCategory === 'Todos') return true;
      if (selectedCategory === 'Estoque Baixo') return isLowStock(prod.stock, prod.minStock);
      return prod.category === selectedCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  const lowStockTotal = products.filter((p) => isLowStock(p.stock, p.minStock)).length;

  return (
    <div className="space-y-4 pb-24 animate-fadeIn">
      {/* Barra de Ações do Topo */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
            Catálogo & Estoque
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {products.length} itens cadastrados no ERP
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onOpenAIAdjustment(null)}
            className="min-h-[40px] px-3 rounded-xl bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-xs"
            title="Ajuste de Estoque com IA / Foto"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span className="hidden sm:inline">Ajuste IA</span>
          </button>

          <button
            onClick={onOpenMovementsTab}
            className="min-h-[40px] px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
            title="Ver Histórico Kardex"
          >
            <History className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span className="hidden sm:inline">Kardex</span>
          </button>
        </div>
      </div>

      {/* Barra de Busca Instantânea */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar por nome, marca, código de barras ou NCM..."
          className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder-slate-400 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
        />
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-3 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            Limpar
          </button>
        )}
      </div>

      {/* Pílulas Horizontais de Filtro */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-4 px-4">
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat;
          const isLowStockPill = cat === 'Estoque Baixo';

          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition min-h-[36px] flex items-center gap-1.5 cursor-pointer ${
                isSelected
                  ? isLowStockPill
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-blue-600 text-white shadow-xs'
                  : isLowStockPill && lowStockTotal > 0
                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-750'
              }`}
            >
              {isLowStockPill && <AlertTriangle className="w-3.5 h-3.5" />}
              <span>{cat}</span>
              {isLowStockPill && lowStockTotal > 0 && (
                <span className="text-[10px] bg-amber-500 text-white px-1.5 py-0.2 rounded-full font-bold">
                  {lowStockTotal}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Lista de Produtos Ultra-Clean (Sem Tabelas Poluídas) */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-10 text-center border border-slate-100 dark:border-slate-800 space-y-3">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400">
            <PackageOpen className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Nenhum produto encontrado
          </p>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            {searchQuery
              ? `Nenhum item coincide com os termos pesquisados "${searchQuery}".`
              : 'Nenhum item cadastrado nesta categoria.'}
          </p>
          <button
            onClick={onOpenAddNew}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition"
          >
            <Plus className="w-4 h-4" />
            Cadastrar Novo Produto
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredProducts.map((product) => {
            const low = isLowStock(product.stock, product.minStock);

            return (
              <div
                key={product.id}
                onClick={() => onSelectProduct(product)}
                className="bg-white dark:bg-slate-800/90 rounded-2xl p-3 border border-slate-100 dark:border-slate-800 shadow-xs flex items-center justify-between gap-3 cursor-pointer hover:border-blue-200 dark:hover:border-slate-700 active:bg-slate-50 dark:active:bg-slate-750 transition"
              >
                {/* 1. Miniatura da foto arredondada */}
                <div className="w-13 h-13 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-700 shrink-0 flex items-center justify-center border border-slate-100 dark:border-slate-700">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xs font-bold text-slate-400">
                      {product.unit}
                    </span>
                  )}
                </div>

                {/* 2. Informações Gerais do Produto */}
                <div className="flex-1 min-w-0 pr-1">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate leading-snug">
                    {product.name}
                  </h4>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                      {formatCurrency(product.salePrice)}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      / {product.unit}
                    </span>
                    {/* Badge de Estoque Auditado */}
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                        low
                          ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900'
                          : 'bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      {low && <AlertTriangle className="w-2.5 h-2.5" />}
                      <span>Estoque: {product.stock} {product.unit}</span>
                    </span>
                  </div>
                </div>

                {/* 3. Botão Dedicado "Movimentar" com Rastreabilidade */}
                <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => onOpenMovement(product)}
                    className="min-h-[40px] px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-600 text-blue-700 dark:text-blue-300 hover:text-white border border-blue-200/80 dark:border-blue-800 font-bold text-xs flex items-center gap-1.5 transition active:scale-95 shadow-xs cursor-pointer"
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
  );
};
