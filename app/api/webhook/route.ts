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

    // Log voice message details for debugging
    if (body.type === 'voice') {
      console.log("[Webhook Proxy] Processing voice message:", {
        type: body.type,
        hasAudioData: !!body.audioData,
        audioDataSize: body.audioData ? body.audioData.length : 0,
        mimeType: body.mimeType,
        duration: body.duration
      });
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
        console.log("[Webhook Proxy] Making request to n8n webhook:", webhookUrl);
        console.log("[Webhook Proxy] Request payload:", JSON.stringify(savePayload, null, 2));

        // Add timeout and retry logic
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true',
            'User-Agent': 'Webhook-Proxy/1.0',
            'Cache-Control': 'no-cache'
          },
          body: JSON.stringify(savePayload),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

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
      console.log("[Webhook Proxy] Making request to n8n webhook:", body.webhookUrl);
      console.log("[Webhook Proxy] Request payload:", JSON.stringify(body, null, 2));

      // Add timeout and retry logic
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(body.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          'User-Agent': 'Webhook-Proxy/1.0',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      console.log(`[Webhook Proxy] n8n response status: ${response.status}`);

      if (!response.ok) {
        console.error("[Webhook Proxy] Webhook request failed:", response.status, response.statusText);

        // Return a helpful error message instead of just failing
        const fallbackResponse = {
          message: "I'm sorry, I'm having trouble connecting to the AI service right now. Please try again in a moment.",
          error: true,
          status: response.status
        };

        return NextResponse.json(fallbackResponse, { 
          status: 200, // Return 200 so the frontend can handle the error gracefully
          headers: corsHeaders 
        });
      }

      // Check if response has content
      const responseText = await response.text();
      console.log("[Webhook Proxy] n8n response text:", responseText);

      let data;
      if (!responseText || responseText.trim() === '') {
        console.warn("[Webhook Proxy] Empty response from n8n webhook");
        data = { message: "Your message was received but no response was generated." };
      } else {
        try {
          data = JSON.parse(responseText);
          console.log("[Webhook Proxy] n8n response data:", data);
        } catch (parseError) {
          console.error("[Webhook Proxy] Failed to parse n8n response:", parseError);
          data = { message: "Response received but could not be processed." };
        }
      }

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