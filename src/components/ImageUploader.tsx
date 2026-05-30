'use client';

import { useState, useRef, useEffect, useCallback, ChangeEvent } from 'react';

interface ImageUploaderProps {
  onImageSelect?: (file: File) => void;
  onUpload?: () => void;
}

export default function ImageUploader({ onImageSelect }: ImageUploaderProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  // 组件卸载时关闭摄像头
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // 监听 video canplay 事件确定摄像头就绪（按 MDN 示例）
  const handleCanPlay = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    setCameraReady(true);
  }, []);

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    onImageSelect?.(file);
    setShowMenu(false);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const handleClear = () => {
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ===== 相机导入 — 基于 MDN Media Capture API =====

  // 解析 getUserMedia 错误 → 中文提示
  const resolveCameraError = (err: unknown): string => {
    // TypeError：可能 navigator.mediaDevices 不存在（非 HTTPS）
    if (err instanceof TypeError || !navigator.mediaDevices) {
      return '请在 HTTPS 或 localhost 环境下使用摄像头功能';
    }
    const error = err as DOMException;
    switch (error.name) {
      case 'NotAllowedError':
        return '摄像头权限被拒绝，请在浏览器设置中允许访问摄像头';
      case 'NotFoundError':
        return '未检测到摄像头设备';
      case 'NotReadableError':
        return '摄像头被其他应用占用，请关闭后重试';
      case 'AbortError':
        return '请在 HTTPS 或 localhost 环境下使用摄像头功能';
      default:
        return '无法访问摄像头：' + (error.message || '未知错误');
    }
  };

  // 尝试获取摄像头流，返回 stream 或 null
  const acquireStream = useCallback(async (): Promise<MediaStream | null> => {
    if (!navigator.mediaDevices?.getUserMedia) return null;
    try {
      return await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
    } catch {
      return null;
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
    setShowCamera(false);
  }, []);

  // 打开菜单时提前申请权限
  const handleToggleMenu = useCallback(async () => {
    const opening = !showMenu;
    setShowMenu(opening);

    if (opening && !streamRef.current) {
      const stream = await acquireStream();
      if (stream) {
        streamRef.current = stream;
      }
    }
  }, [showMenu, acquireStream]);

  const handleFileImport = useCallback(() => {
    setShowMenu(false);
    // 丢弃预申请的摄像头流
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    fileInputRef.current?.click();
  }, []);

  // 点击"相机导入"时：复用已申请的 stream，或当场申请
  const openCamera = useCallback(async () => {
    setShowMenu(false);
    setCameraError(null);
    setCameraReady(false);
    setShowCamera(true);

    const stream = streamRef.current || (await acquireStream());

    if (!stream) {
      // 错误已在预申请阶段发生，再次尝试获取具体错误信息
      try {
        await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      } catch (err) {
        setCameraError(resolveCameraError(err));
      }
      return;
    }

    streamRef.current = stream;

    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play();
    }
  }, [acquireStream]);

  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    // 按 MDN 示例：直接 drawImage(video, ...)
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' });
        stopCamera();
        processFile(file);
      },
      'image/jpeg',
      0.92,
    );
  }, [stopCamera]);

  return (
    <div className="w-full max-w-sm mx-auto">
      {/* 文件导入 — 隐藏 input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* ===== 相机取景框模态 ===== */}
      {showCamera && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85">
          <div className="relative w-full max-w-lg mx-4">
            {/* 视频预览 */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full rounded-xl bg-black"
              onCanPlay={handleCanPlay}
            />

            {/* 加载状态 */}
            {!cameraReady && !cameraError && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl">
                <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {/* 错误提示 */}
            {cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 rounded-xl p-6">
                <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-white/80 text-center">{cameraError}</p>
                <button
                  onClick={() => {
                    setCameraError(null);
                    setShowCamera(false);
                    stopCamera();
                  }}
                  className="mt-2 px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors"
                >
                  关闭
                </button>
              </div>
            )}
          </div>

          {/* 底部操作栏 */}
          {cameraReady && (
            <div className="flex items-center justify-center gap-8 mt-6">
              <button
                onClick={stopCamera}
                className="px-4 py-2 text-white/60 hover:text-white transition-colors"
              >
                取消
              </button>

              {/* 快门按钮 */}
              <button
                onClick={capturePhoto}
                className="w-16 h-16 rounded-full border-4 border-white hover:scale-110 active:scale-95 transition-transform"
                aria-label="拍照"
              />

              <div className="w-14" />
            </div>
          )}

          {/* 隐藏的 canvas（用于抓取视频帧） */}
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}

      {/* ===== 未选择图片时：导入按钮 + 下拉菜单 ===== */}
      {!previewUrl && (
        <div className="flex flex-col gap-3" ref={menuRef}>
          <button
            onClick={handleToggleMenu}
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
              导入图片
            </span>
          </button>

          {showMenu && (
            <div className="flex gap-2">
              <button
                onClick={handleFileImport}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5
                           bg-bg-card border border-border-medium rounded-lg
                           hover:bg-accent-subtle hover:border-accent transition-colors"
              >
                <svg className="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <span className="text-sm text-text-primary">文件导入</span>
              </button>
              <button
                onClick={openCamera}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5
                           bg-bg-card border border-border-medium rounded-lg
                           hover:bg-accent-subtle hover:border-accent transition-colors"
              >
                <svg className="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span className="text-sm text-text-primary">相机导入</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ===== 图片预览 ===== */}
      {previewUrl && (
        <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-bg-surface dark:bg-bg-card">
          <img
            src={previewUrl}
            alt="Preview"
            className="w-full h-full object-contain"
          />
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
