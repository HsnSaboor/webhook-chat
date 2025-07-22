
import { type NextRequest, NextResponse } from "next/server";
import { createConversation } from "../../../../lib/database/conversations";

export async function POST(request: NextRequest) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, User-Agent",
    "Access-Control-Allow-Credentials": "false",
  };

  console.log(`[Save Conversation API] ============== SAVE CONVERSATION REQUEST ==============`);

  try {
    const body = await request.json();
    console.log(`[Save Conversation API] Received payload:`, JSON.stringify(body, null, 2));

    const { session_id, conversation_id, name } = body;

    if (!session_id || !conversation_id) {
      console.error("[Save Conversation API] Missing required fields");
      return NextResponse.json(
        { error: "session_id and conversation_id are required" },
        { status: 400, headers: corsHeaders }
      );
    }

    const conversationName = name || `Conversation ${new Date().toLocaleString()}`;
    
    console.log(`[Save Conversation API] Creating conversation in Supabase`);
    
    const conversation = await createConversation({
      session_id,
      conversation_id,
      name: conversationName,
      started_at: new Date().toISOString()
    });

    if (!conversation) {
      console.error("[Save Conversation API] Failed to create conversation");
      return NextResponse.json(
        { error: "Failed to create conversation" },
        { status: 500, headers: corsHeaders }
      );
    }

    console.log(`[Save Conversation API] Successfully created conversation:`, conversation);
    console.log(`[Save Conversation API] ============== REQUEST COMPLETED ==============`);

    return NextResponse.json({ 
      success: true, 
      conversation 
    }, { 
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    console.error("[Save Conversation API] ============== ERROR OCCURRED ==============");
    console.error("[Save Conversation API] Error:", error);

    return NextResponse.json(
      { error: "Failed to save conversation" },
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
