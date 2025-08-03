
import { type NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabase";

export async function POST(request: NextRequest) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, User-Agent, Cache-Control",
    "Access-Control-Allow-Credentials": "false",
  };

  console.log(`[Save Message API] ============== SAVE MESSAGE REQUEST ==============`);
  console.log(`[Save Message API] Request received at: ${new Date().toISOString()}`);

  try {
    const body = await request.json();
    console.log(`[Save Message API] Request body:`, body);

    const { session_id, content, role, type = 'text', audioUrl, cards, timestamp } = body;

    if (!session_id || !content || !role) {
      console.error("[Save Message API] Missing required fields");
      return NextResponse.json(
        { error: "session_id, content, and role are required" },
        { 
          status: 400, 
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        }
      );
    }

    console.log(`[Save Message API] Saving message for session: ${session_id}`);

    // First ensure the user session exists
    const { data: sessionData, error: sessionError } = await supabase
      .from('user_sessions')
      .select('session_id')
      .eq('session_id', session_id)
      .single();

    if (sessionError && sessionError.code === 'PGRST116') {
      // Session doesn't exist, create it
      console.log(`[Save Message API] Creating new session: ${session_id}`);
      const { error: createSessionError } = await supabase
        .from('user_sessions')
        .insert({
          session_id,
          name: 'Chat Session',
          started_at: new Date().toISOString(),
          last_activity: new Date().toISOString()
        });

      if (createSessionError) {
        console.error("[Save Message API] Error creating session:", createSessionError);
        throw new Error(`Failed to create session: ${createSessionError.message}`);
      }
    } else if (sessionError) {
      console.error("[Save Message API] Error checking session:", sessionError);
      throw new Error(`Database error: ${sessionError.message}`);
    }

    // Insert the message
    const { data, error } = await supabase
      .from('messages')
      .insert({
        session_id,
        content,
        role,
        type,
        audio_url: audioUrl,
        cards: cards ? JSON.stringify(cards) : null,
        timestamp: timestamp ? new Date(timestamp).toISOString() : new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error("[Save Message API] Database error:", error);
      throw new Error(`Database error: ${error.message}`);
    }

    console.log(`[Save Message API] Message saved successfully:`, data);
    console.log(`[Save Message API] ============== REQUEST COMPLETED SUCCESSFULLY ==============`);

    return NextResponse.json({
      success: true,
      message: data
    }, { 
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });

  } catch (error) {
    console.error("[Save Message API] ============== ERROR OCCURRED ==============");
    console.error("[Save Message API] Error details:", error);

    let errorMessage = 'Database error occurred';
    if (error instanceof Error) {
      console.error("[Save Message API] Error name:", error.name);
      console.error("[Save Message API] Error message:", error.message);
      errorMessage = error.message;
    }

    console.error(`[Save Message API] Final error message: ${errorMessage}`);

    return NextResponse.json(
      { 
        success: false,
        error: errorMessage 
      },
      { 
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  }
}

// Handle preflight OPTIONS requests
export async function OPTIONS() {
  console.log("[Save Message API] ============== OPTIONS PREFLIGHT REQUEST ==============");

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, User-Agent, Cache-Control",
    "Access-Control-Allow-Credentials": "false",
  };

  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}
