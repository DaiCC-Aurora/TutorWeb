const MAX_SIZE = 5242880; // 5MB

export interface CompressOptions {
  maxSize?: number;
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
}

/**
 * 压缩并转码图片为标准的 JPEG 格式
 * 确保 AI API 能正确解码
 */
export async function compressImage(
  file: File,
  options: CompressOptions = {}
): Promise<Blob> {
  const {
    maxSize = MAX_SIZE,
    quality = 0.85,
    maxWidth = 1920,
    maxHeight = 1920,
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // 调整尺寸 - 缩小到更合理的尺寸以适配 AI API
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      if (height > maxHeight) {
        width = Math.round((width * maxHeight) / height);
        height = maxHeight;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      // 填充白色背景（对于透明图片转换为 JPEG 时有用）
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);

      ctx.drawImage(img, 0, 0, width, height);

      // 压缩并检查大小
      let currentQuality = quality;
      const blobPromise = new Promise<Blob>((resolveBlob, rejectBlob) => {
        const tryCompress = () => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                rejectBlob(new Error('Compression failed'));
                return;
              }

              if (blob.size <= maxSize || currentQuality <= 0.1) {
                resolveBlob(blob);
              } else {
                currentQuality -= 0.1;
                tryCompress();
              }
            },
            'image/jpeg',
            currentQuality
          );
        };
        tryCompress();
      });

      blobPromise.then(resolve).catch(reject);
    };

    img.onerror = () => {
      console.error('Failed to load image - may be an unsupported format like HEIC');
      reject(new Error('Failed to load image'));
    };

    img.src = URL.createObjectURL(file);
  });
}

/**
 * 验证文件大小
 */
export function validateFileSize(file: File, maxSize: number = MAX_SIZE): {
  valid: boolean;
  message?: string;
} {
  if (file.size > maxSize) {
    return {
      valid: false,
      message: `File size exceeds ${maxSize / (1024 * 1024)}MB limit`,
    };
  }
  return { valid: true };
}
