
import { supabase, DatabaseMessage } from '../supabase'

export async function createMessage(data: {
  conversation_id: string
  session_id: string
  content: string
  role: 'user' | 'webhook'
  type: 'text' | 'voice'
  audio_url?: string
  cards?: any
  timestamp: string
}): Promise<DatabaseMessage | null> {
  try {
    console.log('Creating message in database:', {
      conversation_id: data.conversation_id,
      session_id: data.session_id,
      content: data.content.substring(0, 100) + '...',
      role: data.role,
      type: data.type,
      has_cards: !!data.cards,
      cards_count: data.cards ? (Array.isArray(data.cards) ? data.cards.length : 1) : 0,
      timestamp: data.timestamp
    });

    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: data.conversation_id,
        session_id: data.session_id,
        content: data.content,
        role: data.role,
        type: data.type,
        cards: data.cards,
        timestamp: data.timestamp,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating message in Supabase:', error)
      return null
    }

    console.log('Message created successfully:', message.id);
    return message
  } catch (error) {
    console.error('Error creating message:', error)
    return null
  }
}

export async function getMessagesByConversation(conversationId: string): Promise<DatabaseMessage[]> {
  try {
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('timestamp', { ascending: true })

    if (error) {
      console.error('Error fetching messages:', error)
      return []
    }

    return messages || []
  } catch (error) {
    console.error('Error fetching messages:', error)
    return []
  }
}

export async function deleteMessagesByConversation(conversationId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('conversation_id', conversationId)

    if (error) {
      console.error('Error deleting messages:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error deleting messages:', error)
    return false
  }
}
