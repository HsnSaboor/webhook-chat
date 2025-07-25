import { type NextRequest, NextResponse } from "next/server";
import { getMessagesByConversation } from "../../../../lib/database/messages";
import { getConversationById } from "../../../../lib/database/conversations";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("session_id");
  const conversationId = params.id;

  // CORS headers for Shopify store
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, User-Agent, Cache-Control",
    "Access-Control-Allow-Credentials": "false",
  };

  console.log(`[Conversation History API] ============== GET CONVERSATION HISTORY REQUEST ==============`);
  console.log(`[Conversation History API] Request URL: ${request.url}`);
  console.log(`[Conversation History API] Conversation ID: ${conversationId}`);
  console.log(`[Conversation History API] Session ID: ${sessionId}`);

  if (!sessionId || !conversationId) {
    console.error("[Conversation History API] Missing required parameters");
    console.error("[Conversation History API] Session ID present:", !!sessionId);
    console.error("[Conversation History API] Conversation ID present:", !!conversationId);

    return NextResponse.json(
      { error: "session_id and conversation_id are required" },
      { status: 400, headers: corsHeaders }
    );
  }

  try {
    console.log(`[Conversation History API] Fetching conversation from Supabase`);

    // Verify conversation exists and belongs to session
    const conversation = await getConversationById(conversationId);

    if (!conversation) {
      console.error("[Conversation History API] Conversation not found");
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    if (conversation.session_id !== sessionId) {
      console.error("[Conversation History API] Session ID mismatch");
      return NextResponse.json(
        { error: "Unauthorized access to conversation" },
        { status: 403, headers: corsHeaders }
      );
    }

    console.log(`[Conversation History API] Fetching messages from Supabase`);

    const messages = await getMessagesByConversation(conversationId);

    console.log(`[Conversation History API] Found ${messages.length} messages`);

    // Return messages in their original format for proper handling
    const history = messages.map(msg => ({
      id: msg.id,
      content: msg.content,
      role: msg.role,
      type: msg.type,
      cards: msg.cards,
      timestamp: msg.timestamp,
      audio_url: msg.audio_url
    }));

    console.log("[Conversation History API] Successfully fetched conversation history");
    console.log(`[Conversation History API] ============== REQUEST COMPLETED ==============`);

    return NextResponse.json(history, { 
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    console.error("[Conversation History API] ============== ERROR OCCURRED ==============");
    console.error("[Conversation History API] Error fetching conversation history:", error);

    if (error instanceof Error) {
      console.error("[Conversation History API] Error details:", {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }

    console.error("[Conversation History API] ============== ERROR HANDLING COMPLETED ==============");

    return NextResponse.json(
      { error: "Failed to fetch conversation history" },
      { status: 500, headers: corsHeaders }
    );
  }
}

// Handle preflight OPTIONS requests
export async function OPTIONS() {
  console.log("[Conversation History API] Handling OPTIONS preflight request");
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, User-Agent, Cache-Control",
    },
  });
}