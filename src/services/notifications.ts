import { Product, NotificationAlert } from '../types/index.ts';

type NotificationListener = (alert: NotificationAlert) => void;
const listeners: Set<NotificationListener> = new Set();

// Guarda registros de alertas disparados recentemente para evitar spam repetitivo em menos de 10 minutos
const recentAlerts = new Map<string, number>();

export function subscribeToAlerts(listener: NotificationListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Retorna o status de permissão de notificação no navegador
 */
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

/**
 * Solicita permissão ao usuário para enviar notificações
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  try {
    const perm = await Notification.requestPermission();
    return perm === 'granted';
  } catch (err) {
    console.warn('Erro ao solicitar permissão de notificações:', err);
    return false;
  }
}

/**
 * Dispara alerta de estoque baixo tanto via Push/Browser Notification quanto In-App
 */
export function triggerLowStockNotification(product: Product, force: boolean = false): void {
  const now = Date.now();
  const lastAlertTime = recentAlerts.get(product.id) || 0;

  // Evita disparar alerta repetido para o mesmo produto em menos de 5 minutos, a menos que seja forçado (ex: clique no botão)
  if (!force && now - lastAlertTime < 5 * 60 * 1000) {
    return;
  }

  recentAlerts.set(product.id, now);

  const title = `⚠️ Estoque Baixo: ${product.name}`;
  const body = `Restam apenas ${product.stock} ${product.unit} em estoque (mínimo configurado: ${product.minStock} ${product.unit}). Reabastecimento necessário!`;

  const alertData: NotificationAlert = {
    id: `alert-${product.id}-${now}`,
    productId: product.id,
    productName: product.name,
    currentStock: product.stock,
    minStock: product.minStock,
    timestamp: now,
    read: false,
  };

  // 1. Notifica os ouvintes in-app (Toast / Badges)
  listeners.forEach((listener) => {
    try {
      listener(alertData);
    } catch (e) {
      console.error('Erro no listener in-app:', e);
    }
  });

  // 2. Dispara Notificação Nativa / PWA caso haja permissão
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      // Se houver service worker ativo com registration, usa showNotification (ideal para PWA Android)
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then((reg) => {
          reg.showNotification(title, {
            body,
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            tag: `low-stock-${product.id}`,
            data: { url: '/?tab=estoque' },
          });
        }).catch(() => {
          new Notification(title, { body, icon: '/icon-192.png' });
        });
      } else {
        new Notification(title, { body, icon: '/icon-192.png' });
      }
    } catch (e) {
      console.warn('Falha ao instanciar Notification nativa:', e);
    }
  }
}

/**
 * Testa as notificações do sistema
 */
export async function sendTestNotification(): Promise<boolean> {
  const perm = await requestNotificationPermission();
  const dummyProduct: Product = {
    id: 'test-product',
    name: 'Cerveja Exemplo 600ml',
    brand: 'Exemplo',
    category: 'Cerveja',
    barcode: '7891234567890',
    sku: 'TEST-01',
    image: '',
    ncm: '2203.00.00',
    cest: '03.001.00',
    cfop: '5405',
    csosn: '500',
    origin: '0',
    icmsTax: 0,
    unit: 'UN',
    packageType: 'Garrafa',
    volume: '600ml',
    itemsPerPack: 12,
    dimensions: { height: 28, width: 8, length: 8 },
    grossWeight: 1,
    costPrice: 5.0,
    salePrice: 8.0,
    stock: 5,
    minStock: 20,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    source: 'manual',
  };

  triggerLowStockNotification(dummyProduct, true);
  return perm;
}
