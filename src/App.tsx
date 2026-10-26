import { useState, useEffect, useCallback } from 'react';
import { Product } from './types/index.ts';
import {
  getAllProducts,
  saveProduct,
  deleteProduct,
  updateProductStock,
} from './services/db.ts';
import {
  subscribeToAlerts,
  triggerLowStockNotification,
} from './services/notifications.ts';
import { isLowStock } from './utils/calculations.ts';

import { Header } from './components/Header.tsx';
import { BottomNav } from './components/BottomNav.tsx';
import { HomeDashboard } from './components/HomeDashboard.tsx';
import { CameraWizard } from './components/CameraWizard.tsx';
import { StockList } from './components/StockList.tsx';
import { ProductBottomSheet } from './components/ProductBottomSheet.tsx';
import { SettingsModal } from './components/SettingsModal.tsx';
import { DiagnosticConsoleModal } from './components/DiagnosticConsoleModal.tsx';
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
      return false; // Tema Claro é o padrão oficial do ERP
    }
    return false;
  });

  // Produtos e Estado da Interface
  const [products, setProducts] = useState<Product[]>([]);
  const [activeTab, setActiveTab] = useState<'inicio' | 'camera' | 'estoque'>('inicio');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
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

  // Carregar produtos do IndexedDB
  const loadProducts = useCallback(async () => {
    try {
      const items = await getAllProducts();
      setProducts(items);
    } catch (err) {
      console.error('Erro ao carregar produtos do IndexedDB:', err);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Escuta alertas de estoque baixo e adiciona Toast
  useEffect(() => {
    const unsubscribe = subscribeToAlerts((alert) => {
      addToast(
        `⚠️ Estoque Baixo: ${alert.productName} (${alert.currentStock}/${alert.minStock})`,
        'warning'
      );
    });
    return unsubscribe;
  }, []);

  // Captura evento de instalação PWA
  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPromptEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const triggerPWAInstall = async (): Promise<boolean> => {
    if (!installPromptEvent) return false;
    await installPromptEvent.prompt();
    const { outcome } = await installPromptEvent.userChoice;
    if (outcome === 'accepted') {
      setInstallPromptEvent(null);
      addToast('Aplicativo instalado com sucesso!', 'success');
      return true;
    }
    return false;
  };

  const addToast = (message: string, type: 'success' | 'warning' | 'info' = 'info') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // UI Otimista: Atualização Rápida de Estoque (+ / -)
  const handleQuickUpdateStock = async (productId: string, delta: number) => {
    // 1. Atualização Otimista no estado React (0ms lag)
    let updatedTarget: Product | null = null;
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          const newStock = Math.max(0, p.stock + delta);
          const updated = { ...p, stock: newStock, updatedAt: new Date().toISOString() };
          updatedTarget = updated;
          return updated;
        }
        return p;
      })
    );

    // 2. Persistência assíncrona em segundo plano no IndexedDB
    try {
      const persisted = await updateProductStock(productId, delta);
      // Checa se atingiu ou caiu abaixo do estoque mínimo
      if (isLowStock(persisted.stock, persisted.minStock)) {
        triggerLowStockNotification(persisted);
      }
    } catch (err) {
      console.error('Falha ao atualizar estoque no IndexedDB:', err);
      // Reverte se falhou
      loadProducts();
    }
  };

  // Salvar Produto (Novo ou Editado)
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
    // UI Otimista
    setProducts((prev) => prev.filter((p) => p.id !== productId));
    try {
      await deleteProduct(productId);
      addToast('Produto excluído com sucesso.', 'info');
    } catch (err) {
      console.error('Erro ao excluir produto:', err);
      loadProducts();
    }
  };

  // Login handler
  const handleLoginSuccess = (email: string) => {
    setCurrentUser(email);
    localStorage.setItem('erp_user', email);
    addToast('Bem-vindo ao Distribuidora ERP!', 'success');
  };

  // Se o usuário não está autenticado e não usou autostart
  if (!currentUser) {
    return (
      <LoginView
        onLoginSuccess={handleLoginSuccess}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode((prev) => !prev)}
      />
    );
  }

  // Contagem de itens com estoque baixo
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

      {/* Conteúdo Principal com Container Mobile-First Centralizado e Animações Fluidas */}
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
                onSelectProduct={(prod) => setSelectedProduct(prod)}
                onQuickUpdateStock={handleQuickUpdateStock}
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
                onQuickUpdateStock={handleQuickUpdateStock}
                onOpenAddNew={() => setActiveTab('camera')}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation Fixa (3 Abas estilo Android) */}
      <BottomNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        lowStockCount={lowStockCount}
      />

      {/* Bottom Sheet de Edição Completa 360° */}
      <ProductBottomSheet
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onSave={handleSaveProduct}
        onDelete={handleDeleteProduct}
      />

      {/* Modal de Configurações (API Key, Backup JSON e PWA) */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onDataChanged={loadProducts}
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
