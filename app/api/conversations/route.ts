
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
                      "https://similarly-secure-mayfly.ngrok-free.app/webhook/get-allconversations";
    
    console.log("[Conversations API] Fetching conversations for session:", sessionId);
    console.log("[Conversations API] Using webhook URL:", webhookUrl);
    console.log("[Conversations API] Environment variables check:", {
      N8N_CONVERSATIONS_LIST_WEBHOOK: process.env.N8N_CONVERSATIONS_LIST_WEBHOOK ? "SET" : "NOT SET",
      NEXT_PUBLIC_N8N_CONVERSATIONS_LIST_WEBHOOK: process.env.NEXT_PUBLIC_N8N_CONVERSATIONS_LIST_WEBHOOK ? "SET" : "NOT SET"
    });
    
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

    console.log("[Conversations API] Response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Conversations API] n8n webhook error (${response.status}):`, errorText);
      
      // Return empty array instead of error for better UX
      if (response.status === 404 || response.status === 500) {
        console.log("[Conversations API] Returning empty conversations due to service unavailability");
        return NextResponse.json([], { 
          status: 200,
          headers: corsHeaders
        });
      }
      
      return NextResponse.json(
        { error: `Failed to fetch conversations: ${response.status}` },
        { status: response.status, headers: corsHeaders }
      );
    }

    const conversations = await response.json();
    console.log("[Conversations API] Raw response:", conversations);
    console.log("[Conversations API] Successfully fetched conversations:", Array.isArray(conversations) ? conversations.length : 'Not an array', "items");

    // Ensure we return an array
    const conversationsArray = Array.isArray(conversations) ? conversations : [];

    return NextResponse.json(conversationsArray, { 
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    console.error("[Conversations API] Error fetching conversations:", error);
    
    // Return empty array for network errors to prevent breaking the UI
    console.log("[Conversations API] Returning empty conversations due to network error");
    return NextResponse.json([], { 
      status: 200,
      headers: corsHeaders
    });
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
