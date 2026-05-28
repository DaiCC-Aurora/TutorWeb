# TutorWeb — AI Tutor (重构版)

基于 [Tutor](../Tutor) 项目的重构版本，使用现代化技术栈和 Claude 设计风格。

## Git 工作流

- **分支规则**：所有 `feat`/`feature` 类型的工作必须先 commit 到 `develop` 分支，**不允许直接使用 `master` 分支**
- **Commit 规范**：所有 commit 必须使用 [gitmoji](https://gitmoji.dev/) 作为前缀，例如：
  - `:sparkles: feat: 添加图片上传功能`
  - `:bug: fix: 修复流式响应解析错误`
  - `:recycle: refactor: 重构 MessageList 组件`
  - `:lipstick: style: 更新 Claude 配色方案`
  - `:wrench: chore: 更新 Vercel 配置`
- **分支命名**：`feat/<简短描述>`、`fix/<简短描述>`、`refactor/<简短描述>`

## 部署

- 项目部署在 **Vercel** 平台
- 通过 `vercel` CLI 或 Vercel Dashboard 进行部署
- 环境变量（AI_API_KEY、Supabase 等）在 Vercel Dashboard 中配置

## 技术栈

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS v4
- Supabase (PostgreSQL)
- Claude 设计系统配色方案

## Claude 配色方案

本项目使用 Claude 设计语言中的色彩体系：

### 亮色模式
- 背景主色: `#F5F0EB` (暖白米色)
- 卡片/面板: `#FFFFFF`
- 侧边栏: `#F0EBE5`
- 主文字: `#1C1B1A`
- 次要文字: `#6B6560`
- 强调色/品牌色: `#D97706` (Claude 琥珀橙)
- 悬停色: `#F59E0B`
- 分割线: `#E5DDD6`
- 输入框边框: `#D4C9C0`
- 用户消息气泡: `#D97706` 背景
- AI 消息气泡: `#F0EBE5` 背景

### 暗色模式
- 背景主色: `#1C1B1A` (暖黑)
- 卡片/面板: `#262422`
- 侧边栏: `#201E1C`
- 主文字: `#EDE9E3`
- 次要文字: `#9C958E`
- 强调色/品牌色: `#F59E0B` (Claude 琥珀橙)
- 悬停色: `#D97706`
- 分割线: `#34312E`
- 输入框边框: `#4A4541`
- 用户消息气泡: `#F59E0B` 背景
- AI 消息气泡: `#262422` 背景

### 语义色
- 成功: `#22C55E`
- 错误: `#EF4444`
- 警告: `#F59E0B`
- 信息: `#3B82F6`
