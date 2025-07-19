import { type NextRequest, NextResponse } from "next/server";

/**
 * This route acts as a secure server-side proxy.
 * It receives the full event payload from the chatbot client,
 * validates it, and forwards it to the specified n8n webhook URL.
 * It then waits for the n8n response and relays it back to the client.
 */
export async function POST(request: NextRequest) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS", 
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "false",
  };

  try {
    const body = await request.json();
    console.log("[Webhook Proxy] Received payload:", body);

    // Validate required fields
    if (!body.session_id) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    // For conversation creation events, ensure we have the required fields
    if (body.event_type === "conversation_created") {
      if (!body.conversation_id) {
        return NextResponse.json(
          { error: "Conversation ID is required for conversation_created event" },
          { status: 400, headers: corsHeaders }
        );
      }

      // Use the webhookUrl from the payload, or fall back to default
      const webhookUrl = body.webhookUrl || "https://similarly-secure-mayfly.ngrok-free.app/webhook/save-conversation";

      // Ensure timestamp is properly formatted and not null
      const savePayload = {
        ...body,
        timestamp: body.timestamp || new Date().toISOString(),
        session_id: body.session_id || null,
        conversation_id: body.conversation_id || null,
      };

      console.log("[Webhook Proxy] Save conversation payload:", savePayload);

      // Forward the request to the n8n webhook
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Shopify-Chat-Proxy/1.0",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify(savePayload),
      });

      console.log(`[Webhook Proxy] Save conversation response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Webhook Proxy] Save conversation error (${response.status}):`, errorText);

        return NextResponse.json(
          { 
            error: "Failed to save conversation",
            details: errorText 
          },
          { status: 502, headers: corsHeaders }
        );
      }

      const data = await response.json();
      console.log("[Webhook Proxy] Save conversation success:", data);

      return NextResponse.json({ success: true, data }, { 
        status: 200,
        headers: corsHeaders
      });
    }

    // For regular chat messages, validate webhook URL
    if (!body.webhookUrl) {
      return NextResponse.json(
        { error: "Webhook URL is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Forward the request to the n8n webhook
    const response = await fetch(body.webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Shopify-Chat-Proxy/1.0",
        "ngrok-skip-browser-warning": "true",
      },
      body: JSON.stringify(body),
    });

    console.log(`[Webhook Proxy] n8n response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Webhook Proxy] n8n webhook error (${response.status}):`, errorText);

      return NextResponse.json(
        { 
          error: response.status === 404 
            ? "The AI service failed with status: 404" 
            : "Could not connect to the AI service. Please try again later.",
          details: errorText 
        },
        { status: 502, headers: corsHeaders }
      );
    }

    const data = await response.json();
    console.log("[Webhook Proxy] n8n response data:", data);

    return NextResponse.json(data, { 
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    console.error("[Webhook Proxy] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}