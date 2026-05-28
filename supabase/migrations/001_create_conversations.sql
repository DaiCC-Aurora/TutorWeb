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

-- 为消息表添加索引以优化查询性能
DROP INDEX IF EXISTS idx_messages_conversation_id;
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);

DROP INDEX IF EXISTS idx_messages_created_at;
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- 启用行级安全策略（RLS）
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 删除旧的策略（如果存在）
DROP POLICY IF EXISTS "Allow public read access on conversations" ON conversations;
DROP POLICY IF EXISTS "Allow public read access on messages" ON messages;
DROP POLICY IF EXISTS "Allow public insert on conversations" ON conversations;
DROP POLICY IF EXISTS "Allow public insert on messages" ON messages;

-- 允许所有人读取会话和消息（全局共享）
CREATE POLICY "public_select_conversations" ON conversations FOR SELECT USING (true);
CREATE POLICY "public_select_messages" ON messages FOR SELECT USING (true);

-- 允许任何人插入会话和消息
CREATE POLICY "public_insert_conversations" ON conversations FOR INSERT WITH CHECK (true);
CREATE POLICY "public_insert_messages" ON messages FOR INSERT WITH CHECK (true);

-- 允许任何人删除（全局共享场景）
CREATE POLICY "public_delete_conversations" ON conversations FOR DELETE USING (true);
CREATE POLICY "public_delete_messages" ON messages FOR DELETE USING (true);

-- 自动更新 updated_at
DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
CREATE TRIGGER update_conversations_updated_at
    BEFORE UPDATE ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 如果函数不存在则创建
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
