
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

export async function getSessionById(sessionId: string) {
  console.log(`[Database] Getting session for session_id: ${sessionId}`);

  try {
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
      return null;
    }

    return sessionData;

  } catch (error) {
    console.error('[Database] Error in getSessionById:', error);
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

export async function getAllSessions() {
  console.log('[Database] Getting all sessions');

  try {
    const { data: sessions, error } = await supabase
      .from('user_sessions')
      .select('*')
      .order('last_activity', { ascending: false });

    if (error) {
      console.error('[Database] Error fetching sessions:', error);
      throw new Error(`Failed to fetch sessions: ${error.message}`);
    }

    return sessions || [];

  } catch (error) {
    console.error('[Database] Error in getAllSessions:', error);
    throw error;
  }
}
