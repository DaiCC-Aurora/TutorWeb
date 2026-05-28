// AI API 客户端 - 通过内部 API 路由调用

export interface AIResponse {
  result?: string;
  error?: string;
  raw?: unknown;
}

export interface UploadImageParams {
  image: File;
  prompt?: string;
}

/**
 * 上传图片到 AI 并获取分析结果
 */
export async function uploadImageToAI(params: UploadImageParams): Promise<AIResponse> {
  const formData = new FormData();
  formData.append('image', params.image);
  if (params.prompt) {
    formData.append('prompt', params.prompt);
  }

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('AI API Error:', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to upload image',
    };
  }
}
