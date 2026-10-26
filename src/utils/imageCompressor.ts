/**
 * Compressor automático de fotos via HTML5 Canvas com telemetria e timeout de proteção
 */
import { addLog } from '../services/logger.ts';

export async function compressImage(
  input: File | string,
  maxDimension: number = 600,
  quality: number = 0.7
): Promise<string> {
  const startTime = Date.now();
  const inputSizeDesc =
    typeof input !== 'string'
      ? `${(input.size / 1024).toFixed(1)} KB (${input.type || 'tipo desconhecido'})`
      : `base64 (~${(input.length / 1024).toFixed(1)} KB)`;

  addLog('IMAGEM', 'info', `Iniciando compressão de imagem: ${inputSizeDesc}`);

  return new Promise((resolve) => {
    // Timeout de segurança de 7 segundos para NUNCA travar a tela girando infinitamente
    const timeoutTimer = setTimeout(() => {
      addLog(
        'IMAGEM',
        'warn',
        'Tempo limite de compressão (7s) atingido. Retornando imagem original para não bloquear o usuário.'
      );
      if (typeof input === 'string') {
        resolve(input);
      } else {
        // Fallback rápido via FileReader
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string) || '');
        reader.onerror = () => resolve('');
        reader.readAsDataURL(input);
      }
    }, 7000);

    // Se estiver em ambiente sem window/document (SSR ou testes), retorna string direta
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      clearTimeout(timeoutTimer);
      if (typeof input === 'string') return resolve(input);
      return resolve('');
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    const handleLoad = () => {
      clearTimeout(timeoutTimer);
      try {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (width === 0 || height === 0) {
          addLog('IMAGEM', 'warn', 'Dimensões da imagem zeradas, usando fallback.');
          return resolve(typeof input === 'string' ? input : '');
        }

        const origDim = `${width}x${height}`;

        // Calcula proporção para manter aspect ratio respeitando maxDimension
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          addLog('IMAGEM', 'warn', 'Não foi possível obter contexto 2D do Canvas.');
          return resolve(typeof input === 'string' ? input : '');
        }

        // Desenha imagem redimensionada
        ctx.drawImage(img, 0, 0, width, height);

        // Tenta WebP primeiro (melhor compressão), fallback para JPEG
        let dataUrl = '';
        let formatUsed = 'image/webp';
        try {
          dataUrl = canvas.toDataURL('image/webp', quality);
          if (!dataUrl.startsWith('data:image/webp')) {
            dataUrl = canvas.toDataURL('image/jpeg', quality);
            formatUsed = 'image/jpeg';
          }
        } catch {
          dataUrl = canvas.toDataURL('image/jpeg', quality);
          formatUsed = 'image/jpeg';
        }

        const duration = Date.now() - startTime;
        const finalSizeKb = (dataUrl.length / 1024).toFixed(1);
        addLog(
          'IMAGEM',
          'success',
          `Imagem comprimida com sucesso: ${origDim} -> ${width}x${height} (${formatUsed}, ~${finalSizeKb} KB)`,
          undefined,
          duration
        );

        resolve(dataUrl);
      } catch (err: unknown) {
        const error = err as Error;
        addLog('IMAGEM', 'error', `Erro durante desenho no Canvas: ${error.message}`);
        resolve(typeof input === 'string' ? input : '');
      }
    };

    img.onerror = (e) => {
      clearTimeout(timeoutTimer);
      addLog('IMAGEM', 'error', 'Elemento Image falhou ao carregar imagem', e);
      if (typeof input === 'string') {
        resolve(input);
      } else {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string) || '');
        reader.onerror = () => resolve('');
        reader.readAsDataURL(input);
      }
    };

    if (typeof input === 'string') {
      img.src = input;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          img.src = e.target.result as string;
        } else {
          clearTimeout(timeoutTimer);
          addLog('IMAGEM', 'error', 'FileReader retornou resultado vazio');
          resolve('');
        }
      };
      reader.onerror = (err) => {
        clearTimeout(timeoutTimer);
        addLog('IMAGEM', 'error', 'FileReader falhou ao ler arquivo', err);
        resolve('');
      };
      reader.readAsDataURL(input);
    }
  });
}
