
import { type NextRequest, NextResponse } from "next/server";

// Define CORS headers consistently
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, User-Agent, Cache-Control",
  "Access-Control-Allow-Credentials": "false",
  "Access-Control-Max-Age": "86400",
};

/**
 * This route acts as a secure server-side proxy.
 * It receives the full event payload from the chatbot client,
 * validates it, and forwards it to the specified n8n webhook URL.
 * It then waits for the n8n response and relays it back to the client.
 */
export async function POST(request: NextRequest) {
  console.log("[Webhook Proxy] POST request received");
  console.log("[Webhook Proxy] Request method:", request.method);
  console.log("[Webhook Proxy] Request headers:", Object.fromEntries(request.headers.entries()));

  try {
    let body;
    try {
      body = await request.json();
      console.log("[Webhook Proxy] Received payload:", body);
    } catch (parseError) {
      console.error("[Webhook Proxy] Failed to parse request body:", parseError);
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate required fields
    if (!body || typeof body !== 'object') {
      console.error("[Webhook Proxy] Invalid body structure");
      return NextResponse.json(
        { error: "Invalid request body structure" },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!body.session_id) {
      console.error("[Webhook Proxy] Missing session_id");
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

      try {
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
              details: errorText,
              status: response.status
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
      } catch (fetchError) {
        console.error("[Webhook Proxy] Network error during save conversation:", fetchError);
        return NextResponse.json(
          { 
            error: "Network error while saving conversation",
            details: fetchError instanceof Error ? fetchError.message : "Unknown network error"
          },
          { status: 503, headers: corsHeaders }
        );
      }
    }

    // For regular chat messages, validate webhook URL
    if (!body.webhookUrl) {
      console.error("[Webhook Proxy] Missing webhookUrl");
      return NextResponse.json(
        { error: "Webhook URL is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    console.log("[Webhook Proxy] Forwarding to webhook URL:", body.webhookUrl);

    try {
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
            details: errorText,
            status: response.status
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
    } catch (fetchError) {
      console.error("[Webhook Proxy] Network error during webhook call:", fetchError);
      return NextResponse.json(
        { 
          error: "Network error while contacting AI service",
          details: fetchError instanceof Error ? fetchError.message : "Unknown network error"
        },
        { status: 503, headers: corsHeaders }
      );
    }

  } catch (error) {
    console.error("[Webhook Proxy] Unexpected error:", error);

    // Log more details about the error
    if (error instanceof Error) {
      console.error("[Webhook Proxy] Error message:", error.message);
      console.error("[Webhook Proxy] Error stack:", error.stack);
    }

    // Ensure we always return CORS headers even on error
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString()
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  console.log("[Webhook Proxy] OPTIONS request received");
  console.log("[Webhook Proxy] OPTIONS headers:", Object.fromEntries(request.headers.entries()));

  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[Webhook] Received message:', body);

    // Forward to the actual n8n webhook
    const n8nWebhookUrl = process.env.NEXT_PUBLIC_N8N_CHAT_WEBHOOK || 
      'https://similarly-secure-mayfly.ngrok-free.app/webhook/chat';

    const response = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`N8N webhook failed: ${response.status}`);
    }

    const responseData = await response.text();
    console.log('[Webhook] N8N response:', responseData);

    let parsedData;
    try {
      parsedData = JSON.parse(responseData);
    } catch (e) {
      parsedData = { message: "Response received but couldn't parse it." };
    }

    return NextResponse.json(parsedData);
  } catch (error) {
    console.error('[Webhook] Error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed', message: 'Sorry, I encountered an error processing your request.' },
      { status: 500 }
    );
  }
}
