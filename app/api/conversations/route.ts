
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
    // Get the n8n webhook URL from environment, fallback to ngrok URL
    const webhookUrl = process.env.N8N_CONVERSATIONS_LIST_WEBHOOK || 
                      process.env.NEXT_PUBLIC_N8N_CONVERSATIONS_LIST_WEBHOOK ||
                      "https://similarly-secure-mayfly.ngrok-free.app/webhook/get-all-conversations";
    
    console.log("[Conversations API] Fetching conversations for session:", sessionId);
    console.log("[Conversations API] Using webhook URL:", webhookUrl);
    console.log("[Conversations API] Request payload:", JSON.stringify({ session_id: sessionId }));
    console.log("[Conversations API] Environment variables check:", {
      N8N_CONVERSATIONS_LIST_WEBHOOK: process.env.N8N_CONVERSATIONS_LIST_WEBHOOK ? "SET" : "NOT SET",
      NEXT_PUBLIC_N8N_CONVERSATIONS_LIST_WEBHOOK: process.env.NEXT_PUBLIC_N8N_CONVERSATIONS_LIST_WEBHOOK ? "SET" : "NOT SET"
    });
    
    console.log("[Conversations API] Making actual HTTP request to n8n webhook...");
    
    // Make the request to n8n webhook
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Shopify-Chat-Proxy/1.0",
        "ngrok-skip-browser-warning": "true",
      },
      body: JSON.stringify({
        session_id: sessionId
      }),
    });

    console.log("[Conversations API] HTTP request completed. Response status:", response.status);
    console.log("[Conversations API] Response headers:", Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Conversations API] n8n webhook error (${response.status}):`, errorText);
      
      return NextResponse.json(
        { error: `Failed to fetch conversations: ${response.status} - ${errorText}` },
        { status: response.status, headers: corsHeaders }
      );
    }

    const responseText = await response.text();
    console.log("[Conversations API] Raw response text:", responseText);
    console.log("[Conversations API] Raw response length:", responseText.length);
    
    let conversations;
    try {
      conversations = responseText.trim() ? JSON.parse(responseText) : [];
    } catch (parseError) {
      console.error("[Conversations API] Failed to parse response:", parseError);
      console.error("[Conversations API] Response text that failed to parse:", responseText);
      return NextResponse.json(
        { error: "Invalid JSON response from webhook" },
        { status: 502, headers: corsHeaders }
      );
    }
    
    console.log("[Conversations API] Parsed response:", conversations);
    console.log("[Conversations API] Successfully fetched conversations:", Array.isArray(conversations) ? conversations.length : 'Not an array', "items");

    // Ensure we return an array
    const conversationsArray = Array.isArray(conversations) ? conversations : [];

    return NextResponse.json(conversationsArray, { 
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    console.error("[Conversations API] Network/fetch error:", error);
    console.error("[Conversations API] Error details:", {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    return NextResponse.json(
      { error: `Network error: ${error.message}` },
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
