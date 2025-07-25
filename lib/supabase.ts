
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface DatabaseConversation {
  id: string
  session_id: string
  conversation_id: string
  name: string
  started_at: string
  ended_at?: string
  created_at: string
  updated_at: string
}

export interface DatabaseMessage {
  id: string
  conversation_id: string
  session_id: string
  content: string
  role: 'user' | 'webhook'
  type: 'text' | 'voice'
  audio_url?: string
  cards?: any
  timestamp: string
  created_at: string
  audiodata?: string
  audioduration?: string
}
