'use client';

import { useState, useRef, ChangeEvent } from 'react';

interface ImageUploaderProps {
  onImageSelect?: (file: File) => void;
  onUpload?: () => void;
}

export default function ImageUploader({ onImageSelect }: ImageUploaderProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    onImageSelect?.(file);
  };

  const handleClear = () => {
    setPreviewUrl(null);
    setCameraError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (cameraInputRef.current) {
      cameraInputRef.current.value = '';
    }
    stopCamera();
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const handleCameraClick = async () => {
    // 首先尝试使用 capture 属性（移动端最佳实践）
    if (cameraInputRef.current) {
      // 检查是否是移动设备
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

      if (isMobile) {
        // 移动设备上直接使用 capture input
        cameraInputRef.current.click();
        return;
      }

      // 桌面设备尝试使用 mediaDevices API
      try {
        setCameraError(null);

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setCameraError('您的浏览器不支持摄像头功能');
          cameraInputRef.current.click(); // 回退到文件选择
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setIsCameraActive(true);
        }
      } catch (err) {
        console.error('Camera access failed:', err);
        if (err instanceof DOMException) {
          if (err.name === 'NotAllowedError') {
            setCameraError('请允许摄像头权限后重试');
          } else if (err.name === 'NotFoundError') {
            setCameraError('未找到摄像头设备');
          } else if (err.name === 'NotReadableError') {
            setCameraError('摄像头被其他程序占用');
          } else {
            setCameraError('无法访问摄像头');
          }
        } else {
          setCameraError('您的设备或浏览器不支持摄像头功能');
        }
        // 回退到文件选择
        cameraInputRef.current?.click();
      }
    }
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const context = canvas.getContext('2d');
      if (context) {
        // 水平镜像（自拍模式）
        context.translate(canvas.width, 0);
        context.scale(-1, 1);
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
            const url = URL.createObjectURL(blob);
            setPreviewUrl(url);
            onImageSelect?.(file);
            stopCamera();
          }
        }, 'image/jpeg', 0.9);
      }
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto">
      {/* 文件输入 - 从文件导入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* 摄像头输入 - 移动端直接调用相机 */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* 隐藏的 video 和 canvas 用于桌面端摄像头捕获 */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="hidden"
      />
      <canvas ref={canvasRef} className="hidden" />

      {!previewUrl ? (
        <div className="flex flex-col gap-3">
          {/* 从文件导入按钮 */}
          <button
            onClick={handleClick}
            className="w-full h-32 sm:h-40 border-2 border-dashed border-border-medium rounded-lg
                       flex flex-col items-center justify-center gap-2
                       hover:border-accent hover:bg-accent-subtle
                       transition-colors"
          >
            <svg className="w-8 h-8 sm:w-10 sm:h-10 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-xs sm:text-sm text-text-secondary">
              从文件导入
            </span>
          </button>

          {/* 从摄像头导入按钮 */}
          <button
            onClick={handleCameraClick}
            className="w-full h-32 sm:h-40 border-2 border-dashed border-border-medium rounded-lg
                       flex flex-col items-center justify-center gap-2
                       hover:border-accent hover:bg-accent-subtle
                       transition-colors"
          >
            <svg className="w-8 h-8 sm:w-10 sm:h-10 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span className="text-xs sm:text-sm text-text-secondary">
              从摄像头导入
            </span>
          </button>

          {/* 摄像头错误提示 */}
          {cameraError && (
            <div className="text-sm text-orange-600 dark:text-orange-400 text-center px-4 py-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              {cameraError}
            </div>
          )}

          {/* 摄像头预览区域（桌面端） */}
          {isCameraActive && (
            <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-bg-surface dark:bg-bg-card">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 right-2 flex gap-1">
                <button
                  onClick={takePhoto}
                  className="p-2 bg-white/90 dark:bg-black/80 rounded-full
                             hover:bg-white dark:hover:bg-black transition-colors"
                  aria-label="Take photo"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" strokeWidth={2} />
                    <circle cx="12" cy="12" r="3" strokeWidth={2} />
                  </svg>
                </button>
                <button
                  onClick={stopCamera}
                  className="p-2 bg-white/90 dark:bg-black/80 rounded-full
                             hover:bg-white dark:hover:bg-black transition-colors"
                  aria-label="Close camera"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* 预览界面 */
        <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-bg-surface dark:bg-bg-card">
          <img
            src={previewUrl}
            alt="Preview"
            className="w-full h-full object-contain"
          />

          {/* 操作按钮 */}
          <div className="absolute bottom-2 right-2 flex gap-1">
            <button
              onClick={handleClear}
              className="p-2 bg-white/90 dark:bg-black/80 rounded-full
                         hover:bg-white dark:hover:bg-black transition-colors"
              aria-label="Remove image"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
