
import { supabase, DatabaseConversation } from '../supabase'

export async function createConversation(data: {
  session_id: string
  conversation_id: string
  name: string
  started_at: string
}): Promise<DatabaseConversation | null> {
  try {
    const { data: conversation, error } = await supabase
      .from('conversations')
      .insert({
        session_id: data.session_id,
        conversation_id: data.conversation_id,
        name: data.name,
        started_at: data.started_at,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating conversation:', error)
      return null
    }

    return conversation
  } catch (error) {
    console.error('Error creating conversation:', error)
    return null
  }
}

export async function getConversationsBySession(sessionId: string): Promise<DatabaseConversation[]> {
  try {
    const { data: conversations, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('session_id', sessionId)
      .order('started_at', { ascending: false })

    if (error) {
      console.error('Error fetching conversations:', error)
      return []
    }

    return conversations || []
  } catch (error) {
    console.error('Error fetching conversations:', error)
    return []
  }
}

export async function getConversationsWithLatestMessages(sessionId: string): Promise<(DatabaseConversation & { latest_user_message?: string })[]> {
  try {
    // First get all conversations for the session
    const { data: conversations, error: conversationsError } = await supabase
      .from('conversations')
      .select('*')
      .eq('session_id', sessionId)
      .order('started_at', { ascending: false })

    if (conversationsError) {
      console.error('Error fetching conversations:', conversationsError)
      return []
    }

    if (!conversations || conversations.length === 0) {
      return []
    }

    // For each conversation, get the latest user message
    const conversationsWithMessages = await Promise.all(
      conversations.map(async (conversation) => {
        const { data: latestMessage, error: messageError } = await supabase
          .from('messages')
          .select('content')
          .eq('conversation_id', conversation.conversation_id)
          .eq('role', 'user')
          .order('timestamp', { ascending: false })
          .limit(1)
          .single()

        if (messageError || !latestMessage) {
          return conversation
        }

        return {
          ...conversation,
          latest_user_message: latestMessage.content
        }
      })
    )

    return conversationsWithMessages
  } catch (error) {
    console.error('Error fetching conversations with messages:', error)
    return []
  }
}

export async function getConversationById(conversationId: string): Promise<DatabaseConversation | null> {
  try {
    const { data: conversation, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('conversation_id', conversationId)
      .single()

    if (error) {
      console.error('Error fetching conversation:', error)
      return null
    }

    return conversation
  } catch (error) {
    console.error('Error fetching conversation:', error)
    return null
  }
}

export async function updateConversation(conversationId: string, updates: Partial<DatabaseConversation>): Promise<DatabaseConversation | null> {
  try {
    const { data: conversation, error } = await supabase
      .from('conversations')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('conversation_id', conversationId)
      .select()
      .single()

    if (error) {
      console.error('Error updating conversation:', error)
      return null
    }

    return conversation
  } catch (error) {
    console.error('Error updating conversation:', error)
    return null
  }
}
