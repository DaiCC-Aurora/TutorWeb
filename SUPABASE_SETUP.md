# Supabase 部署指南

## 1. 创建 Supabase 项目

1. 访问 [Supabase](https://supabase.com)
2. 登录/注册账号
3. 点击 "New Project" 创建新项目
4. 填写项目名称、选择数据库密码（记得保存）
5. 选择合适的数据中心区域
6. 等待项目创建完成（约 2-3 分钟）

## 2. 获取连接信息

创建完成后，在 Supabase 仪表板中：

1. 点击左侧菜单的 **Settings** (齿轮图标)
2. 点击 **API**
3. 复制以下信息到 `.env.local`：
   - **Project URL** → `SUPABASE_URL`
   - **anon/public** API Key → `SUPABASE_ANON_KEY`

⚠️ **重要提示**：
- 只使用 `anon/public` key，不要泄露 `service_role` key
- `service_role` key 拥有管理员权限，应严格保密

## 3. 运行数据库迁移（必须！）

### 方法一：使用 Supabase SQL Editor（推荐）

1. 在 Supabase 仪表板点击左侧 **SQL Editor**
2. 点击 **New Query**
3. 复制以下内容并粘贴到编辑器：

```sql
-- 创建会话表
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建消息表
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    has_image BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 启用行级安全策略（RLS）
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 允许所有人读取和插入（全局共享场景）
CREATE POLICY "public_select_conversations" ON conversations FOR SELECT USING (true);
CREATE POLICY "public_select_messages" ON messages FOR SELECT USING (true);
CREATE POLICY "public_insert_conversations" ON conversations FOR INSERT WITH CHECK (true);
CREATE POLICY "public_insert_messages" ON messages FOR INSERT WITH CHECK (true);
CREATE POLICY "public_delete_conversations" ON conversations FOR DELETE USING (true);
CREATE POLICY "public_delete_messages" ON messages FOR DELETE USING (true);
```

4. 点击 **Run** 执行迁移

### 方法二：使用本地 SQL 文件

1. 打开文件 `supabase/migrations/001_create_conversations.sql`
2. 复制全部内容
3. 在 Supabase SQL Editor 中粘贴并运行

### 验证迁移成功

执行以下查询确认表已创建：

```sql
SELECT * FROM conversations LIMIT 1;
SELECT * FROM messages LIMIT 1;
```

如果没有数据返回但也不报错，说明表已正确创建。

## 4. 环境变量配置

确保 `.env.local` 包含以下变量：

```env
# AI API 配置
AI_BASE_URL=https://api-inference.modelscope.cn/v1
AI_API_KEY=ms-xxx-xxx-xxx
AI_MODEL=Qwen/Qwen3.5-397B-A17B

# Supabase 配置（必填）
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
```

## 5. Vercel 部署配置

在 Vercel 项目中添加相同的环境变量：

1. 进入 Vercel 项目设置
2. 点击 **Environment Variables**
3. 添加：
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
4. 点击 **Save**

## 常见问题

### Q: 消息无法保存到数据库
A: 最常见的原因是数据库表未创建。请确保已在 Supabase SQL Editor 中运行了迁移 SQL。

### Q: 前端显示 "Failed to load conversations"
A: 检查浏览器控制台，如果是 403 错误，说明 RLS 策略未正确配置，请重新运行迁移 SQL。

### Q: 测试数据库连接
A: 访问 `/test-db` 页面（如 http://localhost:3000/test-db），如果返回 `{"success": true}` 说明连接正常。

### Q: 如何查看数据库实际数据？
A: 在 Supabase 仪表板点击左侧 **Table Editor** 查看 conversations 和 messages 表。
