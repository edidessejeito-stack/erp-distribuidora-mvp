import { useState, useEffect, useCallback } from 'react';
import { Product, StockMovement, StockAdjustmentAIProposal, MovementType } from './types/index.ts';
import {
  getAllProducts,
  saveProduct,
  deleteProduct,
  updateProductStock,
  getAllMovements,
  recordStockMovement,
} from './services/db.ts';
import {
  subscribeToAlerts,
  triggerLowStockNotification,
} from './services/notifications.ts';
import { isLowStock } from './utils/calculations.ts';

import { Header } from './components/Header.tsx';
import { BottomNav, AppTab } from './components/BottomNav.tsx';
import { HomeDashboard } from './components/HomeDashboard.tsx';
import { CameraWizard } from './components/CameraWizard.tsx';
import { StockList } from './components/StockList.tsx';
import { StockMovementsView } from './components/StockMovementsView.tsx';
import { ProductBottomSheet } from './components/ProductBottomSheet.tsx';
import { SettingsModal } from './components/SettingsModal.tsx';
import { DiagnosticConsoleModal } from './components/DiagnosticConsoleModal.tsx';
import { AIStockAdjustmentModal } from './components/AIStockAdjustmentModal.tsx';
import { ManualMovementModal } from './components/ManualMovementModal.tsx';
import { LoginView } from './components/LoginView.tsx';
import { ToastContainer, ToastItem } from './components/ToastContainer.tsx';
import { subscribeLogs } from './services/logger.ts';
import { motion, AnimatePresence } from 'motion/react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export default function App() {
  // Autenticação (Apoia ?autostart=1 para testes automatizados)
  const [currentUser, setCurrentUser] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') {
        return 'admin@distribuidora.com.br';
      }
      return localStorage.getItem('erp_user');
    }
    return null;
  });

  // Tema Escuro / Claro (Tema Claro é o padrão oficial)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme');
      if (stored === 'dark') return true;
      if (stored === 'light') return false;
      return false; // Tema Claro padrão
    }
    return false;
  });

  // Produtos e Movimentações
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [activeTab, setActiveTab] = useState<AppTab>('inicio');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Modais de Movimentação e Ajuste
  const [isAIAdjustmentOpen, setIsAIAdjustmentOpen] = useState(false);
  const [aiAdjustmentProduct, setAiAdjustmentProduct] = useState<Product | null>(null);
  const [isManualMovementOpen, setIsManualMovementOpen] = useState(false);
  const [manualMovementProduct, setManualMovementProduct] = useState<Product | null>(null);

  // Modais do Sistema
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const [logCount, setLogCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);

  // Escuta logs para manter contadores atualizados em tempo real no Header
  useEffect(() => {
    const unsubscribe = subscribeLogs((logs) => {
      setLogCount(logs.length);
      setErrorCount(logs.filter((l) => l.level === 'error').length);
    });
    return unsubscribe;
  }, []);

  // Efeito de Tema
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // Carregar produtos e movimentações do IndexedDB
  const loadProducts = useCallback(async () => {
    try {
      const items = await getAllProducts();
      setProducts(items);
    } catch (err) {
      console.error('Erro ao carregar produtos do IndexedDB:', err);
    }
  }, []);

  const loadMovements = useCallback(async () => {
    try {
      const movs = await getAllMovements();
      setMovements(movs);
    } catch (err) {
      console.error('Erro ao carregar movimentações do IndexedDB:', err);
    }
  }, []);

  useEffect(() => {
    loadProducts();
    loadMovements();
  }, [loadProducts, loadMovements]);

  // Escuta alertas de reposição periódicos
  useEffect(() => {
    const unsubscribe = subscribeToAlerts((alert) => {
      addToast(`Atenção: Estoque de "${alert.productName}" está baixo (${alert.currentStock}/${alert.minStock})`, 'warning');
    });
    return unsubscribe;
  }, []);

  // Captura evento de instalação PWA
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPromptEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const triggerPWAInstall = async (): Promise<boolean> => {
    if (!installPromptEvent) return false;
    await installPromptEvent.prompt();
    const choice = await installPromptEvent.userChoice;
    setInstallPromptEvent(null);
    return choice.outcome === 'accepted';
  };

  const addToast = (message: string, type: 'success' | 'warning' | 'info' = 'info') => {
    const newToast: ToastItem = {
      id: `toast-${Date.now()}-${Math.random()}`,
      message,
      type,
    };
    setToasts((prev) => [...prev, newToast]);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Salvar Produto (Novo ou Editado - Somente dados cadastrais e estoque mínimo)
  const handleSaveProduct = async (productToSave: Product) => {
    // UI Otimista
    setProducts((prev) => {
      const exists = prev.some((p) => p.id === productToSave.id);
      if (exists) {
        return prev.map((p) => (p.id === productToSave.id ? productToSave : p));
      }
      return [productToSave, ...prev];
    });

    try {
      await saveProduct(productToSave);
      addToast(`"${productToSave.name}" salvo com sucesso!`, 'success');

      if (isLowStock(productToSave.stock, productToSave.minStock)) {
        triggerLowStockNotification(productToSave);
      }
    } catch (err) {
      console.error('Erro ao salvar produto:', err);
      addToast('Erro ao salvar produto no IndexedDB.', 'warning');
      loadProducts();
    }
  };

  // Excluir Produto
  const handleDeleteProduct = async (productId: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== productId));
    try {
      await deleteProduct(productId);
      addToast('Produto excluído com sucesso.', 'info');
    } catch (err) {
      console.error('Erro ao excluir produto:', err);
      loadProducts();
    }
  };

  // Confirmação de Ajuste Assistido por IA (Regra de Ouro)
  const handleConfirmAIAdjustment = async (proposal: StockAdjustmentAIProposal) => {
    try {
      const result = await recordStockMovement({
        productId: proposal.matchedProductId,
        type: proposal.movementType,
        delta: proposal.calculatedDelta,
        operator: currentUser || 'Operador',
        reason: proposal.proposedReason,
        auditPayload: {
          origin: 'ia_assistida',
          photoAttached: !!proposal.sourceImage,
          aiPrompt: proposal.sourcePrompt,
          aiInterpretation: proposal.aiExplanation,
          extraDetails: {
            confidence: proposal.rawConfidence,
          },
        },
      });

      // Atualiza produtos e movimentações
      setProducts((prev) =>
        prev.map((p) => (p.id === result.product.id ? result.product : p))
      );
      setMovements((prev) => [result.movement, ...prev]);

      const deltaFormatted = proposal.calculatedDelta > 0 ? `+${proposal.calculatedDelta}` : proposal.calculatedDelta;
      addToast(
        `Movimentação registrada com sucesso (${deltaFormatted})! Kardex atualizado.`,
        'success'
      );

      if (isLowStock(result.product.stock, result.product.minStock)) {
        triggerLowStockNotification(result.product);
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      console.error('Erro ao confirmar ajuste de IA:', e);
      addToast(e.message || 'Falha ao gravar movimentação.', 'warning');
      throw err;
    }
  };

  // Confirmação de Movimentação Manual com Justificativa
  const handleConfirmManualMovement = async (params: {
    productId: string;
    type: MovementType;
    delta?: number;
    targetStock?: number;
    reason: string;
    operator: string;
  }) => {
    try {
      const result = await recordStockMovement({
        productId: params.productId,
        type: params.type,
        delta: params.delta,
        targetStock: params.targetStock,
        operator: params.operator,
        reason: params.reason,
        auditPayload: {
          origin: 'manual',
        },
      });

      setProducts((prev) =>
        prev.map((p) => (p.id === result.product.id ? result.product : p))
      );
      setMovements((prev) => [result.movement, ...prev]);

      const deltaStr = result.movement.delta >= 0 ? `+${result.movement.delta}` : `${result.movement.delta}`;
      addToast(`Movimentação de estoque gravada (${deltaStr} un)!`, 'success');

      if (isLowStock(result.product.stock, result.product.minStock)) {
        triggerLowStockNotification(result.product);
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      console.error('Erro ao gravar movimentação:', e);
      addToast(e.message || 'Erro ao registrar movimentação.', 'warning');
      throw err;
    }
  };

  // Login handler
  const handleLoginSuccess = (email: string) => {
    setCurrentUser(email);
    localStorage.setItem('erp_user', email);
    addToast('Bem-vindo ao Distribuidora ERP!', 'success');
  };

  if (!currentUser) {
    return (
      <LoginView
        onLoginSuccess={handleLoginSuccess}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode((prev) => !prev)}
      />
    );
  }

  const lowStockCount = products.filter((p) => isLowStock(p.stock, p.minStock)).length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      {/* Header Minimalista */}
      <Header
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode((prev) => !prev)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenDiagnostics={() => setIsDiagnosticsOpen(true)}
        lowStockCount={lowStockCount}
        logCount={logCount}
        errorCount={errorCount}
        onSelectTab={setActiveTab}
        installPrompt={installPromptEvent ? triggerPWAInstall : null}
      />

      {/* Conteúdo Principal com Transições Fluidas (AnimatePresence) */}
      <main className="flex-1 max-w-xl w-full mx-auto px-4 pt-4 pb-20 overflow-x-hidden">
        <AnimatePresence mode="wait">
          {activeTab === 'inicio' && (
            <motion.div
              key="inicio"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="w-full"
            >
              <HomeDashboard
                products={products}
                onOpenScan={() => setActiveTab('camera')}
                onOpenStock={() => setActiveTab('estoque')}
                onOpenMovements={() => setActiveTab('movimentacoes')}
                onOpenAIAdjustment={(prod) => {
                  setAiAdjustmentProduct(prod || null);
                  setIsAIAdjustmentOpen(true);
                }}
                onOpenMovement={(prod) => {
                  setManualMovementProduct(prod);
                  setIsManualMovementOpen(true);
                }}
                onSelectProduct={(prod) => setSelectedProduct(prod)}
              />
            </motion.div>
          )}

          {activeTab === 'camera' && (
            <motion.div
              key="camera"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="w-full"
            >
              <CameraWizard
                onSaveProduct={handleSaveProduct}
                onCancel={() => setActiveTab('inicio')}
                onSuccess={() => {
                  setActiveTab('estoque');
                  addToast('Produto cadastrado com sucesso!', 'success');
                }}
              />
            </motion.div>
          )}

          {activeTab === 'estoque' && (
            <motion.div
              key="estoque"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="w-full"
            >
              <StockList
                products={products}
                onSelectProduct={(prod) => setSelectedProduct(prod)}
                onOpenMovement={(prod) => {
                  setManualMovementProduct(prod);
                  setIsManualMovementOpen(true);
                }}
                onOpenAIAdjustment={(prod) => {
                  setAiAdjustmentProduct(prod || null);
                  setIsAIAdjustmentOpen(true);
                }}
                onOpenMovementsTab={() => setActiveTab('movimentacoes')}
                onOpenAddNew={() => setActiveTab('camera')}
              />
            </motion.div>
          )}

          {activeTab === 'movimentacoes' && (
            <motion.div
              key="movimentacoes"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="w-full"
            >
              <StockMovementsView
                movements={movements}
                products={products}
                currentUserEmail={currentUser || 'Operador'}
                onOpenManualMovement={(prod) => {
                  setManualMovementProduct(prod || null);
                  setIsManualMovementOpen(true);
                }}
                onOpenAIAdjustment={(prod) => {
                  setAiAdjustmentProduct(prod || null);
                  setIsAIAdjustmentOpen(true);
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation Fixa (4 Abas estilo Android Material 3) */}
      <BottomNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        lowStockCount={lowStockCount}
      />

      {/* Bottom Sheet de Edição de Dados Cadastrais (Estoque Protegido) */}
      <ProductBottomSheet
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onSave={handleSaveProduct}
        onDelete={handleDeleteProduct}
        onOpenMovement={(prod) => {
          setManualMovementProduct(prod);
          setIsManualMovementOpen(true);
        }}
      />

      {/* Modal de Ajuste de Estoque com IA e Pré-Visualização Obrigatória */}
      <AIStockAdjustmentModal
        isOpen={isAIAdjustmentOpen}
        onClose={() => {
          setIsAIAdjustmentOpen(false);
          setAiAdjustmentProduct(null);
        }}
        products={products}
        currentUserEmail={currentUser || 'Operador'}
        preselectedProduct={aiAdjustmentProduct}
        onConfirmAdjustment={handleConfirmAIAdjustment}
      />

      {/* Modal de Movimentação Manual Formal com Motivo Obrigatório */}
      <ManualMovementModal
        isOpen={isManualMovementOpen}
        onClose={() => {
          setIsManualMovementOpen(false);
          setManualMovementProduct(null);
        }}
        products={products}
        currentUserEmail={currentUser || 'Operador'}
        preselectedProduct={manualMovementProduct}
        onConfirmMovement={handleConfirmManualMovement}
      />

      {/* Modal de Configurações (API Key, Backup JSON e PWA) */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onDataChanged={() => {
          loadProducts();
          loadMovements();
        }}
        onShowToast={addToast}
        installPrompt={installPromptEvent ? triggerPWAInstall : null}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode((prev) => !prev)}
      />

      {/* Console de Diagnóstico em Tempo Real */}
      <DiagnosticConsoleModal
        isOpen={isDiagnosticsOpen}
        onClose={() => setIsDiagnosticsOpen(false)}
        onShowToast={addToast}
      />

      {/* Container de Toasts para Notificações In-App */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
