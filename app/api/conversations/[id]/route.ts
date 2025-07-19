
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
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, User-Agent",
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
    // Get the n8n webhook URL from environment
    const webhookUrl = process.env.N8N_CONVERSATION_HISTORY_WEBHOOK ||
      "https://similarly-secure-mayfly.ngrok-free.app/webhook/get-single-conversations";
    
    console.log(`[Conversation History API] Target webhook URL: ${webhookUrl}`);
    
    if (!webhookUrl) {
      console.error("[Conversation History API] N8N_CONVERSATION_HISTORY_WEBHOOK environment variable not set");
      return NextResponse.json(
        { error: "Configuration error: webhook URL not configured" },
        { status: 500, headers: corsHeaders }
      );
    }

    const payload = {
      conversation_id: conversationId,
      session_id: sessionId,
      timestamp: new Date().toISOString(),
      request_type: "get_conversation_history"
    };

    console.log(`[Conversation History API] Payload to send:`, JSON.stringify(payload, null, 2));

    const startTime = Date.now();
    console.log(`[Conversation History API] Making POST request to n8n webhook...`);
    
    const response = await fetch(webhookUrl, {
      method: "POST", // n8n webhooks expect POST
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Shopify-Chat-Proxy/1.0",
        "ngrok-skip-browser-warning": "true",
      },
      body: JSON.stringify(payload),
    });

    const requestDuration = Date.now() - startTime;
    console.log(`[Conversation History API] Response received after ${requestDuration}ms`);
    console.log(`[Conversation History API] Response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Conversation History API] n8n webhook error (${response.status}):`, errorText);
      console.error(`[Conversation History API] Full error response:`, errorText);
      
      return NextResponse.json(
        { error: `Failed to fetch conversation history: ${response.status}` },
        { status: response.status, headers: corsHeaders }
      );
    }

    const responseText = await response.text();
    console.log(`[Conversation History API] Raw response:`, responseText);

    let history;
    try {
      history = JSON.parse(responseText);
      console.log(`[Conversation History API] Parsed history:`, JSON.stringify(history, null, 2));
    } catch (parseError) {
      console.error(`[Conversation History API] Failed to parse JSON:`, parseError);
      return NextResponse.json(
        { error: "Invalid response format from webhook" },
        { status: 502, headers: corsHeaders }
      );
    }

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
      { status: 502, headers: corsHeaders }
    );
  }
}

// Handle preflight OPTIONS requests
export async function OPTIONS() {
  console.log("[Conversation History API] Handling OPTIONS preflight request");
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "https://zenmato.myshopify.com",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
