
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("session_id");

  if (!sessionId) {
    return NextResponse.json(
      { error: "session_id is required" },
      { status: 400 }
    );
  }

  try {
    // Get the n8n webhook URL from environment or use a default
    const webhookUrl = process.env.N8N_CONVERSATIONS_LIST_WEBHOOK || "https://your-n8n-instance.com/webhook/conversations";
    
    const response = await fetch(`${webhookUrl}?session_id=${encodeURIComponent(sessionId)}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Shopify-Chat-Proxy/1.0",
        "ngrok-skip-browser-warning": "true",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Conversations API] n8n webhook error (${response.status}):`, errorText);
      return NextResponse.json(
        { error: `Failed to fetch conversations: ${response.status}` },
        { status: response.status }
      );
    }

    const conversations = await response.json();
    console.log("[Conversations API] Successfully fetched conversations");

    return NextResponse.json(conversations, { status: 200 });

  } catch (error) {
    console.error("[Conversations API] Error fetching conversations:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversations" },
      { status: 502 }
    );
  }
}
