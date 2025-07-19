import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  try {
    // Extract session_id from URL search params
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');

    console.log(`[Conversations API] Received request with session_id: ${sessionId}`);

    if (!sessionId) {
      console.error("[Conversations API] Missing session_id parameter");
      return NextResponse.json(
        { error: "session_id parameter is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Use environment variable or fallback to default
    const webhookUrl = process.env.N8N_CONVERSATIONS_LIST_WEBHOOK || 
      "https://similarly-secure-mayfly.ngrok-free.app/webhook/get-all-conversations";

    console.log(`[Conversations API] Making request to: ${webhookUrl} with session_id: ${sessionId}`);

    // Make request to n8n webhook
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
        "User-Agent": "Shopify-Chat-Proxy/1.0",
      },
      body: JSON.stringify({ 
        session_id: sessionId,
        timestamp: new Date().toISOString()
      }),
    });

    console.log(`[Conversations API] n8n response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Conversations API] n8n webhook error (${response.status}):`, errorText);

      return NextResponse.json(
        { 
          error: `Network error: Failed to fetch conversations from webhook (${response.status})`,
          details: errorText 
        },
        { status: 502, headers: corsHeaders }
      );
    }

    const data = await response.json();
    console.log("[Conversations API] n8n response data:", data);

    return NextResponse.json(data, { 
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    console.error("[Conversations API] Network error:", error);
    return NextResponse.json(
      { error: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500, headers: corsHeaders }
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