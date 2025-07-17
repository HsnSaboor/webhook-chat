
import { type NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("session_id");
  const conversationId = params.id;

  // CORS headers for Shopify store
  const corsHeaders = {
    "Access-Control-Allow-Origin": "https://zenmato.myshopify.com",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (!sessionId || !conversationId) {
    return NextResponse.json(
      { error: "session_id and conversation_id are required" },
      { status: 400, headers: corsHeaders }
    );
  }

  try {
    // Get the n8n webhook URL from environment
    const webhookUrl = process.env.N8N_CONVERSATION_HISTORY_WEBHOOK;
    
    if (!webhookUrl) {
      console.error("[Conversation History API] N8N_CONVERSATION_HISTORY_WEBHOOK environment variable not set");
      return NextResponse.json(
        { error: "Configuration error: webhook URL not configured" },
        { status: 500, headers: corsHeaders }
      );
    }
    
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Shopify-Chat-Proxy/1.0",
        "ngrok-skip-browser-warning": "true",
      },
      body: JSON.stringify({
        conversation_id: conversationId,
        session_id: sessionId,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Conversation History API] n8n webhook error (${response.status}):`, errorText);
      return NextResponse.json(
        { error: `Failed to fetch conversation history: ${response.status}` },
        { status: response.status }
      );
    }

    const history = await response.json();
    console.log("[Conversation History API] Successfully fetched conversation history");

    return NextResponse.json(history, { 
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    console.error("[Conversation History API] Error fetching conversation history:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversation history" },
      { status: 502, headers: corsHeaders }
    );
  }
}

// Handle preflight OPTIONS requests
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "https://zenmato.myshopify.com",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
