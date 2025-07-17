
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("session_id");

  // CORS headers for Shopify store
  const corsHeaders = {
    "Access-Control-Allow-Origin": "https://zenmato.myshopify.com",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (!sessionId) {
    return NextResponse.json(
      { error: "session_id is required" },
      { status: 400, headers: corsHeaders }
    );
  }

  try {
    // Get the n8n webhook URL from environment
    const webhookUrl = process.env.N8N_CONVERSATIONS_LIST_WEBHOOK;
    
    if (!webhookUrl) {
      console.error("[Conversations API] N8N_CONVERSATIONS_LIST_WEBHOOK environment variable not set");
      return NextResponse.json(
        { error: "Configuration error: webhook URL not configured" },
        { status: 500, headers: corsHeaders }
      );
    }
    
    const response = await fetch(`${webhookUrl}?session_id=${encodeURIComponent(sessionId)}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Shopify-Chat-Proxy/1.0",
        "ngrok-skip-browser-warning": "true",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Conversations API] n8n webhook error (${response.status}):`, errorText);
      return NextResponse.json(
        { error: `Failed to fetch conversations: ${response.status}` },
        { status: response.status }
      );
    }

    const conversations = await response.json();
    console.log("[Conversations API] Successfully fetched conversations");

    return NextResponse.json(conversations, { 
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    console.error("[Conversations API] Error fetching conversations:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversations" },
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
