-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create messages table (simplified without conversation grouping)
CREATE TABLE messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id TEXT NOT NULL,
  content TEXT NOT NULL,
  role TEXT NOT NULL constraint messages_role_check check (
    (role = any (array['user'::text, 'webhook'::text, 'ai'::text, 'assistant'::text]))
  ),
  type TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'voice')),
  audio_url TEXT,
  cards JSONB,
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_messages_session_id ON messages(session_id);
CREATE INDEX idx_messages_timestamp ON messages(timestamp);
CREATE INDEX idx_messages_role ON messages(role);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allow all for now, but you can make them more restrictive)
CREATE POLICY "Allow all operations on messages" ON messages FOR ALL USING (true);