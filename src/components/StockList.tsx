import React, { useState, useMemo } from 'react';
import { Search, Plus, Minus, AlertTriangle, PackageOpen, Filter } from 'lucide-react';
import { Product, ProductCategory } from '../types/index.ts';
import { formatCurrency, isLowStock } from '../utils/calculations.ts';

interface StockListProps {
  products: Product[];
  onSelectProduct: (product: Product) => void;
  onQuickUpdateStock: (productId: string, delta: number) => void;
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
  onQuickUpdateStock,
  onOpenAddNew,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'Todos' | ProductCategory | 'Estoque Baixo'>('Todos');

  // Filtragem instantânea (0ms)
  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      // Filtro de busca
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        prod.name.toLowerCase().includes(q) ||
        prod.brand.toLowerCase().includes(q) ||
        prod.barcode.toLowerCase().includes(q) ||
        prod.ncm.replace(/\D/g, '').includes(q.replace(/\D/g, ''));

      if (!matchQuery) return false;

      // Filtro de categoria / estoque baixo
      if (selectedCategory === 'Todos') return true;
      if (selectedCategory === 'Estoque Baixo') return isLowStock(prod.stock, prod.minStock);
      return prod.category === selectedCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  const lowStockTotal = products.filter((p) => isLowStock(p.stock, p.minStock)).length;

  return (
    <div className="space-y-4 pb-24 animate-fadeIn">
      {/* Barra de Busca Instantânea Minimalista */}
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
                <div className="w-13 h-13 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-700 flex-shrink-0 flex items-center justify-center border border-slate-100 dark:border-slate-700">
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

                {/* 2. Nome / Medida e 3. Preço de Venda em Destaque */}
                <div className="flex-1 min-w-0 pr-1">
                  <h4 className="text-sm font-medium text-slate-900 dark:text-white truncate leading-snug">
                    {product.name}
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      {formatCurrency(product.salePrice)}
                    </span>
                    <span className="text-xs text-slate-400">
                      / {product.unit}
                    </span>
                    {low && (
                      <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-0.5 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded-md">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        Baixo
                      </span>
                    )}
                  </div>
                </div>

                {/* 4. Controle Rápido de Quantidade (- Qtd +) com UI Otimista */}
                <div
                  className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900/60 p-1 rounded-xl border border-slate-100 dark:border-slate-800 flex-shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => onQuickUpdateStock(product.id, -1)}
                    disabled={product.stock <= 0}
                    className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed shadow-xs active:scale-95 transition"
                    title="Diminuir estoque"
                    aria-label={`Diminuir estoque de ${product.name}`}
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-8 text-center font-bold text-xs text-slate-900 dark:text-white">
                    {product.stock}
                  </span>
                  <button
                    onClick={() => onQuickUpdateStock(product.id, 1)}
                    className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 shadow-xs active:scale-95 transition"
                    title="Aumentar estoque"
                    aria-label={`Aumentar estoque de ${product.name}`}
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
  );
};
