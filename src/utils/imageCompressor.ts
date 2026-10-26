/**
 * Compressor automático de fotos via HTML5 Canvas
 * Redimensiona para no máx. 600px de largura/altura com qualidade 0.7 (WebP ou JPEG).
 * Reduz arquivos de 5MB+ para ~30KB-60KB sem perda visível no mobile.
 */

export async function compressImage(
  input: File | string,
  maxDimension: number = 600,
  quality: number = 0.7
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Se estiver em ambiente sem window/document (SSR ou testes), retorna string direta
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      if (typeof input === 'string') return resolve(input);
      return resolve('');
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    const handleLoad = () => {
      try {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (width === 0 || height === 0) {
          return resolve(typeof input === 'string' ? input : '');
        }

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
          return resolve(typeof input === 'string' ? input : '');
        }

        // Desenha imagem redimensionada
        ctx.drawImage(img, 0, 0, width, height);

        // Tenta WebP primeiro (melhor compressão), fallback para JPEG
        let dataUrl = '';
        try {
          dataUrl = canvas.toDataURL('image/webp', quality);
          if (!dataUrl.startsWith('data:image/webp')) {
            dataUrl = canvas.toDataURL('image/jpeg', quality);
          }
        } catch {
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }

        resolve(dataUrl);
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      // Se falhar o carregamento da imagem, não trava a aplicação
      if (typeof input === 'string') {
        resolve(input);
      } else {
        reject(new Error('Falha ao processar arquivo de imagem'));
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
          reject(new Error('Falha ao ler arquivo'));
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(input);
    }
  });
}
