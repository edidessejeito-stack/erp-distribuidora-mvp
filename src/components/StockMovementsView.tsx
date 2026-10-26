import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Sparkles,
  ArrowRightLeft,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Calendar,
  User,
  Package,
  Layers,
  ChevronDown,
  ChevronRight,
  Filter,
  CheckCircle2,
  AlertTriangle,
  History,
} from 'lucide-react';
import { StockMovement, Product, MovementType } from '../types/index.ts';

interface StockMovementsViewProps {
  movements: StockMovement[];
  products: Product[];
  currentUserEmail: string;
  onOpenManualMovement: (product?: Product | null) => void;
  onOpenAIAdjustment: (product?: Product | null) => void;
}

type FilterCategory = 'Todos' | 'Entradas' | 'Saídas' | 'Ajustes' | 'Contagens' | 'Avarias';

export const StockMovementsView: React.FC<StockMovementsViewProps> = ({
  movements,
  products,
  currentUserEmail: _currentUserEmail,
  onOpenManualMovement,
  onOpenAIAdjustment,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<FilterCategory>('Todos');
  const [expandedAuditIds, setExpandedAuditIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedAuditIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Filtragem dos registros
  const filteredMovements = useMemo(() => {
    return movements.filter((mov) => {
      // Filtro de texto
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = mov.productName.toLowerCase().includes(q);
        const matchReason = mov.reason.toLowerCase().includes(q);
        const matchOp = mov.operator.toLowerCase().includes(q);
        const matchBarcode = mov.productBarcode ? mov.productBarcode.includes(q) : false;
        if (!matchName && !matchReason && !matchOp && !matchBarcode) return false;
      }

      // Filtro por tipo
      if (selectedFilter === 'Entradas') {
        return mov.type === 'entrada_compra' || mov.type === 'saldo_inicial';
      }
      if (selectedFilter === 'Saídas') {
        return mov.type === 'saida_venda';
      }
      if (selectedFilter === 'Ajustes') {
        return mov.type === 'ajuste_inventario';
      }
      if (selectedFilter === 'Contagens') {
        return mov.type === 'contagem_diaria';
      }
      if (selectedFilter === 'Avarias') {
        return mov.type === 'perda_avaria';
      }
      return true;
    });
  }, [movements, searchQuery, selectedFilter]);

  // Estatísticas Rápidas do Kardex
  const totalEntries = movements.filter((m) => m.delta > 0).length;
  const totalExits = movements.filter((m) => m.delta < 0).length;
  const totalAdjustments = movements.filter((m) => m.type === 'ajuste_inventario' || m.type === 'contagem_diaria').length;

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const getMovementBadge = (type: MovementType, delta: number) => {
    switch (type) {
      case 'entrada_compra':
      case 'saldo_inicial':
        return {
          bg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
          icon: <ArrowUpRight className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />,
        };
      case 'saida_venda':
        return {
          bg: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
          icon: <ArrowDownRight className="w-3 h-3 text-blue-600 dark:text-blue-400" />,
        };
      case 'perda_avaria':
        return {
          bg: 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
          icon: <AlertTriangle className="w-3 h-3 text-red-600 dark:text-red-400" />,
        };
      case 'contagem_diaria':
        return {
          bg: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
          icon: <History className="w-3 h-3 text-purple-600 dark:text-purple-400" />,
        };
      default:
        return {
          bg: delta >= 0
            ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
            : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
          icon: <ArrowRightLeft className="w-3 h-3" />,
        };
    }
  };

  return (
    <div className="space-y-4 pb-24 animate-fadeIn">
      {/* Cabeçalho da Seção */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <History className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span>Movimentações de Estoque</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Kardex digital e rastreabilidade total de entradas, saídas e contagens
          </p>
        </div>
      </div>

      {/* Cards de Métricas Rápidas */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-100 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Entradas</span>
          </div>
          <span className="text-base font-extrabold text-slate-900 dark:text-white mt-1 block">
            {totalEntries}
          </span>
          <span className="text-[10px] text-slate-400">operações</span>
        </div>

        <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-100 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 text-xs font-semibold">
            <ArrowDownRight className="w-3.5 h-3.5" />
            <span>Saídas</span>
          </div>
          <span className="text-base font-extrabold text-slate-900 dark:text-white mt-1 block">
            {totalExits}
          </span>
          <span className="text-[10px] text-slate-400">operações</span>
        </div>

        <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-100 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 text-xs font-semibold">
            <History className="w-3.5 h-3.5" />
            <span>Ajustes</span>
          </div>
          <span className="text-base font-extrabold text-slate-900 dark:text-white mt-1 block">
            {totalAdjustments}
          </span>
          <span className="text-[10px] text-slate-400">inventários</span>
        </div>
      </div>

      {/* Barra de Ações: Ajuste com IA & Nova Movimentação */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          onClick={() => onOpenAIAdjustment(null)}
          className="min-h-[46px] px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm hover:opacity-95 active:scale-98 transition cursor-pointer"
        >
          <Sparkles className="w-4 h-4 animate-pulse" />
          <span>Ajuste com IA / Foto</span>
        </button>

        <button
          onClick={() => onOpenManualMovement(null)}
          className="min-h-[46px] px-3.5 py-2.5 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 font-bold text-xs flex items-center justify-center gap-2 shadow-xs active:scale-98 transition cursor-pointer"
        >
          <Plus className="w-4 h-4 text-blue-600" />
          <span>Nova Movimentação</span>
        </button>
      </div>

      {/* Busca e Filtros */}
      <div className="space-y-2">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por produto, motivo, operador ou código..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 text-xs shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600"
            >
              Limpar
            </button>
          )}
        </div>

        {/* Pílulas de Filtro */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none -mx-4 px-4">
          {(['Todos', 'Entradas', 'Saídas', 'Ajustes', 'Contagens', 'Avarias'] as FilterCategory[]).map((cat) => {
            const isSelected = selectedFilter === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedFilter(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 hover:bg-slate-50'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Lista Kardex */}
      {filteredMovements.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-10 text-center border border-slate-100 dark:border-slate-800 space-y-3">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400">
            <History className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Nenhuma movimentação encontrada
          </p>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            {searchQuery
              ? `Nenhum registro coincide com "${searchQuery}".`
              : 'Nenhum lançamento no filtro selecionado.'}
          </p>
          <button
            onClick={() => onOpenManualMovement(null)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition"
          >
            <Plus className="w-4 h-4" />
            Registrar Movimentação
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredMovements.map((mov) => {
            const badge = getMovementBadge(mov.type, mov.delta);
            const isExpanded = expandedAuditIds.has(mov.id);
            const product = products.find((p) => p.id === mov.productId);

            return (
              <div
                key={mov.id}
                className="bg-white dark:bg-slate-800/90 rounded-2xl p-3.5 border border-slate-100 dark:border-slate-800 shadow-xs space-y-2.5 transition hover:border-slate-200 dark:hover:border-slate-700"
              >
                {/* Linha Superior: Tipo de Movimentação + Data/Hora */}
                <div className="flex items-center justify-between gap-2">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badge.bg}`}>
                    {badge.icon}
                    <span>{mov.typeLabel}</span>
                  </span>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span>{formatDate(mov.timestamp)}</span>
                  </span>
                </div>

                {/* Linha do Produto e Delta */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-700 shrink-0 border border-slate-100 dark:border-slate-700 flex items-center justify-center">
                      {mov.productImage || product?.image ? (
                        <img
                          src={mov.productImage || product?.image}
                          alt={mov.productName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Package className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {mov.productName}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                        <span>Anterior: <strong>{mov.previousStock}</strong></span>
                        <span>➔</span>
                        <span>Novo: <strong>{mov.newStock}</strong> {mov.productUnit || 'UN'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Delta em Grande Destaque */}
                  <div className="text-right shrink-0">
                    <span
                      className={`text-sm font-black px-2.5 py-1 rounded-xl inline-block ${
                        mov.delta > 0
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                          : mov.delta < 0
                          ? 'bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {mov.delta > 0 ? `+${mov.delta}` : mov.delta} {mov.productUnit || 'UN'}
                    </span>
                  </div>
                </div>

                {/* Motivo Obrigatório com Rastreabilidade */}
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/80 text-xs">
                  <p className="text-slate-700 dark:text-slate-300 leading-snug">
                    <span className="font-semibold text-slate-900 dark:text-white">Motivo: </span>
                    {mov.reason}
                  </p>
                  <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-slate-200/50 dark:border-slate-800 text-[10px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-400" />
                      <span>Operador: <strong>{mov.operator}</strong></span>
                    </span>
                    <span className="capitalize">
                      Origem: {mov.auditPayload.origin === 'ia_assistida' ? 'IA Assistida' : mov.auditPayload.origin}
                    </span>
                  </div>
                </div>

                {/* Accordion de Auditoria Completa */}
                <div>
                  <button
                    onClick={() => toggleExpand(mov.id)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    <span>{isExpanded ? 'Ocultar Auditoria (Kardex Log)' : 'Ver Auditoria Completa'}</span>
                  </button>

                  {isExpanded && (
                    <div className="mt-2 p-3 rounded-xl bg-[#0d1117] border border-slate-800 text-slate-300 font-mono text-[10px] space-y-1.5 animate-fadeIn">
                      <div className="flex items-center justify-between text-slate-400">
                        <span>ID MOV: {mov.id}</span>
                        <span className="flex items-center gap-1 text-emerald-400 font-sans font-bold">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Registro Imutável
                        </span>
                      </div>
                      <pre className="p-2 rounded bg-black/50 text-slate-300 overflow-x-auto whitespace-pre-wrap leading-tight">
                        {JSON.stringify(
                          {
                            movementId: mov.id,
                            productId: mov.productId,
                            productName: mov.productName,
                            type: mov.type,
                            delta: mov.delta,
                            previousStock: mov.previousStock,
                            newStock: mov.newStock,
                            operator: mov.operator,
                            reason: mov.reason,
                            auditPayload: mov.auditPayload,
                            timestamp: mov.timestamp,
                          },
                          null,
                          2
                        )}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
