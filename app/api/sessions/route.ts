
import { NextRequest, NextResponse } from 'next/server';
import { getSessionById } from '@/lib/database/sessions';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, User-Agent, Cache-Control",
};

export async function GET(request: NextRequest) {
  console.log(`[Sessions API] ============== NEW REQUEST ==============`);
  
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');

    console.log(`[Sessions API] Request params:`, {
      session_id: sessionId,
      url: request.url
    });

    if (!sessionId) {
      console.log(`[Sessions API] No session_id provided`);
      return NextResponse.json(
        { error: "session_id parameter is required" },
        { 
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        }
      );
    }

    const sessionData = await getSessionById(sessionId);

    if (!sessionData) {
      console.log(`[Sessions API] No session found for session_id: ${sessionId}`);
      return NextResponse.json([], { 
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    console.log(`[Sessions API] Found session:`, sessionData);

    // Return session data formatted for frontend compatibility
    const responseData = [{
      session_id: sessionData.session_id,
      id: sessionData.session_id,
      name: sessionData.name,
      started_at: sessionData.started_at,
      ended_at: null
    }];

    console.log(`[Sessions API] Returning session data:`, responseData);
    console.log(`[Sessions API] ============== REQUEST COMPLETED SUCCESSFULLY ==============`);

    return NextResponse.json(responseData, { 
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });

  } catch (error) {
    console.error("[Sessions API] ============== ERROR OCCURRED ==============");
    console.error("[Sessions API] Error fetching session:", error);

    if (error instanceof Error) {
      console.error("[Sessions API] Error details:", {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }

    console.error("[Sessions API] ============== ERROR HANDLING COMPLETED ==============");

    return NextResponse.json(
      { error: "Failed to fetch session data" },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function POST(request: NextRequest) {
  console.log(`[Sessions API] ============== POST REQUEST ==============`);
  
  try {
    const body = await request.json();
    console.log(`[Sessions API] POST body:`, body);

    const { session_id, name } = body;

    if (!session_id) {
      console.log(`[Sessions API] No session_id provided in POST`);
      return NextResponse.json(
        { error: "session_id is required" },
        { 
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        }
      );
    }

    // For now, just return success - actual session creation happens in Supabase automatically
    // when messages are saved with a new session_id
    console.log(`[Sessions API] Session creation acknowledged for: ${session_id}`);

    return NextResponse.json(
      { success: true, session_id },
      { 
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );

  } catch (error) {
    console.error("[Sessions API] Error in POST:", error);
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  console.log("[Sessions API] Handling OPTIONS preflight request");
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}
