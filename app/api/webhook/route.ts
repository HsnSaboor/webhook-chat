import { type NextRequest, NextResponse } from "next/server";

/**
 * This route acts as a secure server-side proxy.
 * It receives the full event payload from the chatbot client,
 * validates it, and forwards it to the specified n8n webhook URL.
 * It then waits for the n8n response and relays it back to the client.
 */
export async function POST(request: NextRequest) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "https://zenmato.myshopify.com",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  try {
    const body = await request.json();
    console.log("Webhook request body:", JSON.stringify(body, null, 2));

    // Validate required fields
    if (!body.id) {
      console.error("Missing required field: id");
      return NextResponse.json(
        { error: "Payload must include id." },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!body.session_id) {
      console.error("Missing required field: session_id");
      return NextResponse.json(
        { error: "Payload must include session_id." },
        { status: 400, headers: corsHeaders }
      );
    }

    // Extract the webhook URL from the body
    const webhookUrl = body.webhookUrl;
    if (!webhookUrl) {
      console.error("Missing webhookUrl in request body");
      return NextResponse.json(
        { error: "webhookUrl is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    console.log("Forwarding request to webhook:", webhookUrl);

    // Forward the request to the external webhook
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Shopify-Chat-Proxy/1.0",
        "ngrok-skip-browser-warning": "true",
      },
      body: JSON.stringify(body),
    });

    console.log("Webhook response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Webhook error (${response.status}):`, errorText);

      // Check if it's a CORS or ngrok issue
      if (response.status === 404) {
        return NextResponse.json(
          { error: "The ngrok tunnel appears to be offline. Please restart your ngrok tunnel." },
          { status: 502, headers: corsHeaders }
        );
      }

      return NextResponse.json(
        { error: `The AI service failed with status: ${response.status}`, details: errorText },
        { status: 502, headers: corsHeaders }
      );
    }

    const data = await response.json();
    console.log("Webhook response data:", JSON.stringify(data, null, 2));
    return NextResponse.json(data, { headers: corsHeaders });

  } catch (error) {
    console.error("Webhook proxy error:", error);

    // Check if it's a network error
    if (error instanceof TypeError && error.message.includes("fetch")) {
      return NextResponse.json(
        { error: "Cannot connect to the AI service. Please check if your ngrok tunnel is running." },
        { status: 502, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { error: "Could not connect to the AI service. Please try again later." },
      { status: 502, headers: corsHeaders }
    );
  }
}