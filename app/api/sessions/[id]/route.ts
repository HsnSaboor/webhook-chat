
import { NextRequest, NextResponse } from 'next/server';
import { getMessagesBySession } from '@/lib/database/messages';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, User-Agent, Cache-Control",
};

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log(`[Session History API] ============== NEW REQUEST ==============`);
  
  try {
    const sessionId = params.id;
    console.log(`[Session History API] Fetching history for session_id: ${sessionId}`);

    if (!sessionId) {
      console.log(`[Session History API] No session ID provided`);
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    const messages = await getMessagesBySession(sessionId);
    console.log(`[Session History API] Found ${messages.length} messages for session ${sessionId}`);

    const history = messages.map((message) => ({
      id: message.id,
      content: message.content,
      role: message.role,
      type: message.type || 'text',
      timestamp: message.timestamp,
      cards: message.cards,
      audio_url: message.audio_url
    }));

    console.log(`[Session History API] Returning history:`, history);
    console.log(`[Session History API] ============== REQUEST COMPLETED SUCCESSFULLY ==============`);

    return NextResponse.json(history, { 
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    console.error("[Session History API] ============== ERROR OCCURRED ==============");
    console.error("[Session History API] Error fetching session history:", error);

    if (error instanceof Error) {
      console.error("[Session History API] Error details:", {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }

    console.error("[Session History API] ============== ERROR HANDLING COMPLETED ==============");

    return NextResponse.json(
      { error: "Failed to fetch session history" },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  console.log("[Session History API] Handling OPTIONS preflight request");
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}
