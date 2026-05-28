# TutorWeb — AI Tutor (重构版)

基于 [Tutor](../Tutor) 项目的重构版本，使用 Claude 设计系统配色方案，提供更现代化的 UI 体验。

## 与 Tutor 项目的区别

- **Claude 配色方案** — 使用温暖的琥珀橙/米色系替代原有的蓝色/zinc 色调
- **现代化 UI** — 优化视觉层次、间距和交互细节
- **延迟加载 Supabase** — 构建时不需要配置环境变量
- **暗色模式优化** — 使用 class 策略支持更好的暗色模式切换

## 快速开始

```bash
npm install
cp .env.example .env.local
npm run dev
```

## 构建

```bash
npm run build
```

## 技术栈

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS v4
- Supabase (PostgreSQL)
- Claude 设计系统

## CLAUDE.md 规则

- feat 必须提交到 `develop` 分支，不允许使用 `master`
- 所有 commit 必须使用 gitmoji
- 项目部署在 Vercel
