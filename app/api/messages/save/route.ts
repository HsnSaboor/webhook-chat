
import { type NextRequest, NextResponse } from "next/server";
import { createMessage } from "../../../../lib/database/messages";

export async function POST(request: NextRequest) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, User-Agent",
    "Access-Control-Allow-Credentials": "false",
  };

  console.log(`[Save Message API] ============== SAVE MESSAGE REQUEST ==============`);

  try {
    const body = await request.json();
    console.log(`[Save Message API] Received payload:`, JSON.stringify(body, null, 2));

    const { conversation_id, session_id, content, role, type, audio_url, cards, timestamp } = body;

    if (!conversation_id || !session_id || !content || !role || !timestamp) {
      console.error("[Save Message API] Missing required fields");
      return NextResponse.json(
        { error: "conversation_id, session_id, content, role, and timestamp are required" },
        { status: 400, headers: corsHeaders }
      );
    }

    console.log(`[Save Message API] Creating message in Supabase`);
    
    const message = await createMessage({
      conversation_id,
      session_id,
      content,
      role,
      type: type || 'text',
      audio_url,
      cards,
      timestamp
    });

    if (!message) {
      console.error("[Save Message API] Failed to create message");
      return NextResponse.json(
        { error: "Failed to create message" },
        { status: 500, headers: corsHeaders }
      );
    }

    console.log(`[Save Message API] Successfully created message:`, message);
    console.log(`[Save Message API] ============== REQUEST COMPLETED ==============`);

    return NextResponse.json({ 
      success: true, 
      message 
    }, { 
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    console.error("[Save Message API] ============== ERROR OCCURRED ==============");
    console.error("[Save Message API] Error:", error);

    return NextResponse.json(
      { error: "Failed to save message" },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
