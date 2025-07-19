import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  // CORS headers to allow requests from Shopify store
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, User-Agent",
    "Access-Control-Allow-Credentials": "false",
  };

  console.log(`[Conversations API] ============== GET ALL CONVERSATIONS REQUEST ==============`);
  console.log(`[Conversations API] Request received at: ${new Date().toISOString()}`);
  console.log(`[Conversations API] Request URL: ${request.url}`);
  console.log(`[Conversations API] Request method: ${request.method}`);
  console.log(`[Conversations API] Request headers:`, Object.fromEntries(request.headers.entries()));

  try {
    // Extract session_id from URL search params
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');

    console.log(`[Conversations API] Extracted session_id from params: ${sessionId}`);
    console.log(`[Conversations API] All search params:`, Object.fromEntries(searchParams.entries()));

    if (!sessionId) {
      console.error("[Conversations API] Missing session_id parameter");
      return NextResponse.json(
        { error: "session_id parameter is required" },
        { 
          status: 400, 
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        }
      );
    }

    // Use environment variable or fallback to default
    const webhookUrl = process.env.N8N_CONVERSATIONS_LIST_WEBHOOK || 
      "https://similarly-secure-mayfly.ngrok-free.app/webhook/get-all-conversations";

    console.log(`[Conversations API] Target n8n webhook URL: ${webhookUrl}`);
    console.log(`[Conversations API] Environment variable N8N_CONVERSATIONS_LIST_WEBHOOK:`, process.env.N8N_CONVERSATIONS_LIST_WEBHOOK);

    // Prepare payload for n8n webhook (n8n expects POST with data in body)
    const payload = { 
      session_id: sessionId,
      timestamp: new Date().toISOString(),
      request_type: "get_all_conversations",
      action: "fetch_conversations"
    };

    console.log(`[Conversations API] Payload to send to n8n:`, JSON.stringify(payload, null, 2));

    // Make request to n8n webhook with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    console.log(`[Conversations API] Making POST request to n8n webhook...`);
    console.log(`[Conversations API] Request headers being sent:`, {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true",
      "User-Agent": "Shopify-Chat-Proxy/1.0",
    });

    const startTime = Date.now();

    const response = await fetch(webhookUrl, {
      method: "POST", // n8n webhooks expect POST
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
        "User-Agent": "Shopify-Chat-Proxy/1.0",
        "Accept": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    console.log(`[Conversations API] Webhook fetch completed`);

    clearTimeout(timeoutId);
    const requestDuration = Date.now() - startTime;

    console.log(`[Conversations API] n8n webhook response received after ${requestDuration}ms`);
    console.log(`[Conversations API] Response status: ${response.status}`);
    console.log(`[Conversations API] Response headers:`, Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Conversations API] n8n webhook error (${response.status}):`, errorText);
      console.error(`[Conversations API] Full error response body:`, errorText);
      console.error(`[Conversations API] Response URL: ${response.url}`);
      console.error(`[Conversations API] Response type: ${response.type}`);

      // Log the actual request that was sent
      console.error(`[Conversations API] Request that failed - URL: ${webhookUrl}`);
      console.error(`[Conversations API] Request that failed - Payload: ${JSON.stringify(payload)}`);

      // Return empty array for better UX instead of throwing error
      console.log("[Conversations API] Returning empty array due to webhook error");
      return NextResponse.json([], { 
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    const responseText = await response.text();
    console.log(`[Conversations API] Raw response body (length: ${responseText.length}):`, responseText);
    console.log(`[Conversations API] Response Content-Type:`, response.headers.get('content-type'));

    // Check if response is empty
    if (!responseText || responseText.trim() === '') {
      console.warn(`[Conversations API] Empty response from n8n webhook`);
      console.warn(`[Conversations API] This could mean the webhook is not configured to respond or n8n workflow has an issue`);
      return NextResponse.json([], { 
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    let data;
    try {
      data = JSON.parse(responseText);
      console.log(`[Conversations API] Parsed JSON response:`, JSON.stringify(data, null, 2));
      console.log(`[Conversations API] Response data type:`, typeof data);
      console.log(`[Conversations API] Response is array:`, Array.isArray(data));
    } catch (parseError) {
      console.error(`[Conversations API] Failed to parse JSON response:`, parseError);
      console.error(`[Conversations API] Response was not valid JSON:`, responseText);
      console.error(`[Conversations API] First 500 chars of response:`, responseText.substring(0, 500));

      // Return empty array if response is not valid JSON
      return NextResponse.json([], { 
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    // Handle different possible response formats from n8n
    let conversationsArray = [];

    if (Array.isArray(data)) {
      conversationsArray = data;
      console.log(`[Conversations API] Response is already an array with ${conversationsArray.length} items`);
    } else if (data && Array.isArray(data.conversations)) {
      conversationsArray = data.conversations;
      console.log(`[Conversations API] Extracted conversations array with ${conversationsArray.length} items`);
    } else if (data && data.data && Array.isArray(data.data)) {
      conversationsArray = data.data;
      console.log(`[Conversations API] Extracted conversations from data property with ${conversationsArray.length} items`);
    } else {
      console.warn(`[Conversations API] Unexpected response format:`, data);
      console.warn(`[Conversations API] Expected array or object with conversations property`);
    }

    console.log(`[Conversations API] Final conversations array length: ${conversationsArray.length}`);
    console.log(`[Conversations API] Final conversations array:`, JSON.stringify(conversationsArray, null, 2));
    console.log(`[Conversations API] Returning response with CORS headers:`, corsHeaders);
    console.log(`[Conversations API] ============== REQUEST COMPLETED SUCCESSFULLY ==============`);

    return NextResponse.json(conversationsArray, { 
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });

  } catch (error) {
    console.error("[Conversations API] ============== ERROR OCCURRED ==============");
    console.error("[Conversations API] Error details:", error);

    // Handle different types of errors
    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      console.error("[Conversations API] Error name:", error.name);
      console.error("[Conversations API] Error message:", error.message);
      console.error("[Conversations API] Error stack:", error.stack);

      if (error.name === 'AbortError') {
        errorMessage = 'Request timeout - webhook did not respond within 30 seconds';
        console.error("[Conversations API] Request timed out");
      } else if (error.message.includes('fetch')) {
        errorMessage = `Webhook connection failed: ${error.message}`;
        console.error("[Conversations API] Fetch operation failed");
      } else if (error.message.includes('NetworkError') || error.message.includes('ECONNREFUSED')) {
        errorMessage = `Network error - cannot reach n8n webhook: ${error.message}`;
        console.error("[Conversations API] Network connectivity issue");
      } else {
        errorMessage = error.message;
      }
    }

    console.error(`[Conversations API] Final error message: ${errorMessage}`);
    console.error(`[Conversations API] Webhook URL that failed: ${webhookUrl}`);
    console.error(`[Conversations API] Payload that was attempted: ${JSON.stringify(payload)}`);

    // Return empty array instead of error for better UX
    console.log("[Conversations API] Returning empty array due to error");
    console.log("[Conversations API] ============== ERROR HANDLING COMPLETED ==============");

    return NextResponse.json([], { 
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
}

// Handle preflight OPTIONS requests
export async function OPTIONS() {
  console.log("[Conversations API] ============== OPTIONS PREFLIGHT REQUEST ==============");
  console.log("[Conversations API] Handling CORS preflight request");

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS", 
    "Access-Control-Allow-Headers": "Content-Type, Authorization, User-Agent",
    "Access-Control-Allow-Credentials": "false",
  };

  console.log("[Conversations API] Sending CORS headers:", corsHeaders);
  console.log("[Conversations API] ============== OPTIONS COMPLETED ==============");

  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}