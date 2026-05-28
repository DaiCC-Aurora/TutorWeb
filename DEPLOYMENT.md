# Vercel 部署指南

## 部署步骤

### 1. 安装 Vercel CLI（可选）
```bash
npm install -g vercel
```

### 2. 登录 Vercel
```bash
vercel login
```

### 3. 部署项目
在项目根目录运行：
```bash
vercel
```

### 4. 配置环境变量

在 Vercel Dashboard 中设置以下环境变量：

| 变量名 | 说明 | 示例值 |
|--------|------|--------|
| `AI_BASE_URL` | AI API 基础 URL | `https://api-inference.modelscope.cn/v1` |
| `AI_API_KEY` | API 密钥 | `ms-xxx-xxx-xxx` |
| `AI_MODEL` | 模型名称（可选） | `Qwen/Qwen2.5-VL-72B-Instruct` |

**设置步骤：**
1. 访问 [Vercel Dashboard](https://vercel.com/dashboard)
2. 选择你的项目
3. 进入 **Settings** > **Environment Variables**
4. 添加上述变量（Development、Preview、Production 环境都需要设置）

### 5. 生产环境部署
```bash
vercel --prod
```

## Android 手表端测试

使用 Chrome DevTools 模拟手表设备：

1. 打开 Chrome DevTools (F12)
2. 点击设备切换按钮 (Ctrl+Shift+M)
3. 选择 "Add device" 添加手表分辨率（如 300x300）

## 本地开发

```bash
# 安装依赖
npm install

# 配置环境变量
cp .env.example .env.local

# 编辑 .env.local 填入你的 API key
# AI_BASE_URL=https://api-inference.modelscope.cn/v1
# AI_API_KEY=ms-xxx-xxx-xxx

# 启动开发服务器
npm run dev
```

## 安全提示

⚠️ **重要**：`.env.local` 文件包含敏感的 API 密钥，切勿提交到 Git！

本项目已配置：
- `.env*` 在 `.gitignore` 中
- API 密钥通过服务端 API 路由处理，不会暴露给客户端
