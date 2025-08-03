import { supabase } from '../supabase';

export interface UserSession {
  id: string;
  session_id: string;
  name: string;
  started_at: string;
  last_activity: string;
  created_at: string;
  updated_at: string;
}

export async function getConversationsWithLatestMessages(sessionId: string) {
  console.log(`[Database] Getting session for session_id: ${sessionId}`);

  try {
    // Get the user session
    const { data: sessionData, error: sessionError } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (sessionError && sessionError.code !== 'PGRST116') {
      console.error('[Database] Error fetching session:', sessionError);
      throw new Error(`Failed to fetch session: ${sessionError.message}`);
    }

    if (!sessionData) {
      console.log('[Database] No session found');
      return [];
    }

    // Get the latest user message for this session to generate a name
    const { data: latestMessage, error: messageError } = await supabase
      .from('messages')
      .select('content')
      .eq('session_id', sessionId)
      .eq('role', 'user')
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    if (messageError && messageError.code !== 'PGRST116') {
      console.error('[Database] Error fetching latest message:', messageError);
    }

    // Return the session formatted as a conversation
    return [{
      conversation_id: sessionData.session_id,
      name: sessionData.name,
      started_at: sessionData.started_at,
      ended_at: null,
      latest_user_message: latestMessage?.content || null
    }];

  } catch (error) {
    console.error('[Database] Error in getConversationsWithLatestMessages:', error);
    throw error;
  }
}

export async function createOrUpdateSession(sessionId: string, name?: string) {
  console.log(`[Database] Creating/updating session: ${sessionId}`);

  try {
    const { data, error } = await supabase
      .from('user_sessions')
      .upsert({
        session_id: sessionId,
        name: name || 'Chat Session',
        started_at: new Date().toISOString(),
        last_activity: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'session_id',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (error) {
      console.error('[Database] Error creating/updating session:', error);
      throw new Error(`Failed to create/update session: ${error.message}`);
    }

    console.log('[Database] Session created/updated successfully:', data);
    return data;

  } catch (error) {
    console.error('[Database] Error in createOrUpdateSession:', error);
    throw error;
  }
}