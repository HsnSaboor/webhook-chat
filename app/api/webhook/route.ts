import { type NextRequest, NextResponse } from "next/server";

/**
 * This route acts as a secure server-side proxy.
 * It receives the full event payload from the chatbot client,
 * validates it, and forwards it to the specified n8n webhook URL.
 * It then waits for the n8n response and relays it back to the client.
 */
export async function POST(request: NextRequest) {
  let body: any;

  // 1. Parse the incoming JSON from the chatbot client
  try {
    body = await request.json();
  } catch (error) {
    console.error("[API Proxy] Failed to parse JSON body:", error);
    return NextResponse.json({ error: "Invalid JSON format." }, { status: 400 });
  }

  // 2. Validate the essential parts of the payload
  const { webhookUrl, id, session_id } = body;

  if (!webhookUrl || !id || !session_id) {
    console.error("[API Proxy] Payload is missing critical fields.", { webhookUrl, id, session_id });
    return NextResponse.json(
      { error: "Payload must include webhookUrl, id, and session_id." },
      { status: 400 }
    );
  }

  // Log the incoming event for debugging purposes
  console.log(`[API Proxy] Forwarding Event ID: ${id}`);
  console.log(`[API Proxy] Session ID: ${session_id}`);
  console.log(`[API Proxy] Event Type: ${body.event_type}`);
  
  // 3. Forward the ENTIRE payload to the n8n webhook
  try {
    const n8nResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Shopify-Chat-Proxy/1.0",
        // This header tells ngrok to skip its browser warning page.
        "ngrok-skip-browser-warning": "true",
      },
      // IMPORTANT: We send the *entire* body object received from the client.
      body: JSON.stringify(body), 
    });

    // 4. Handle the response from n8n
    if (!n8nResponse.ok) {
      // If n8n returns an error (e.g., 400, 500), log it and forward the error status.
      const errorText = await n8nResponse.text();
      console.error(`[API Proxy] n8n webhook returned an error (${n8nResponse.status}):`, errorText);
      return NextResponse.json(
        { error: `The AI service failed with status: ${n8nResponse.status}`, details: errorText },
        { status: n8nResponse.status }
      );
    }

    // 5. Relay the successful n8n response back to the chatbot client
    const responseData = await n8nResponse.json();
    console.log("[API Proxy] Received successful response from n8n.");

    return NextResponse.json(responseData, { status: 200 });

  } catch (error) {
    // This catches network errors (like the ngrok issue) or JSON parsing errors.
    console.error("[API Proxy] Failed to communicate with or parse response from n8n webhook:", error);
    return NextResponse.json(
      { error: "Could not connect to the AI service. Please try again later." },
      { status: 502 } // 502 Bad Gateway is the appropriate status for a proxy failure.
    );
  }
}
