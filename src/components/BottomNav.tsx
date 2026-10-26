import React from 'react';
import { Home, Camera, Package, History } from 'lucide-react';

export type AppTab = 'inicio' | 'camera' | 'estoque' | 'movimentacoes';

interface BottomNavProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  lowStockCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onSelectTab,
  lowStockCount,
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-100 dark:border-slate-800 pb-[max(env(safe-area-inset-bottom),8px)] pt-1 transition-colors">
      <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between relative">
        {/* Tab 1: Início */}
        <button
          onClick={() => onSelectTab('inicio')}
          className={`flex-1 flex flex-col items-center justify-center min-h-[48px] transition cursor-pointer ${
            activeTab === 'inicio'
              ? 'text-blue-600 dark:text-blue-400 font-semibold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
          aria-label="Ir para tela inicial"
        >
          <Home className={`w-5 h-5 transition-transform ${activeTab === 'inicio' ? 'scale-110' : ''}`} />
          <span className="text-[10px] sm:text-[11px] mt-1 font-medium">Início</span>
        </button>

        {/* Tab 2: Catálogo & Produtos */}
        <button
          onClick={() => onSelectTab('estoque')}
          className={`flex-1 flex flex-col items-center justify-center min-h-[48px] relative transition cursor-pointer ${
            activeTab === 'estoque'
              ? 'text-blue-600 dark:text-blue-400 font-semibold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
          aria-label="Ir para catálogo de produtos"
        >
          <div className="relative">
            <Package className={`w-5 h-5 transition-transform ${activeTab === 'estoque' ? 'scale-110' : ''}`} />
            {lowStockCount > 0 && (
              <span className="absolute -top-1 -right-2 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white dark:ring-slate-900" />
            )}
          </div>
          <span className="text-[10px] sm:text-[11px] mt-1 font-medium">Produtos</span>
        </button>

        {/* Tab 3: Câmera IA (Botão Central Flutuante) */}
        <div className="flex-1 flex justify-center -mt-6">
          <button
            onClick={() => onSelectTab('camera')}
            className={`w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white flex flex-col items-center justify-center shadow-lg shadow-indigo-500/35 hover:scale-105 active:scale-95 transition-all focus:outline-none focus:ring-4 focus:ring-indigo-300 dark:focus:ring-indigo-800 cursor-pointer ${
              activeTab === 'camera' ? 'ring-4 ring-blue-400/40 ring-offset-2' : ''
            }`}
            aria-label="Cadastrar produto por foto com IA"
            title="Escanear e Cadastrar com IA"
          >
            <Camera className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
          </button>
        </div>

        {/* Tab 4: Movimentações / Kardex */}
        <button
          onClick={() => onSelectTab('movimentacoes')}
          className={`flex-1 flex flex-col items-center justify-center min-h-[48px] relative transition cursor-pointer ${
            activeTab === 'movimentacoes'
              ? 'text-blue-600 dark:text-blue-400 font-semibold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
          aria-label="Ir para tela de movimentações e Kardex"
        >
          <History className={`w-5 h-5 transition-transform ${activeTab === 'movimentacoes' ? 'scale-110' : ''}`} />
          <span className="text-[10px] sm:text-[11px] mt-1 font-medium">Kardex</span>
        </button>
      </div>
    </nav>
  );
};
