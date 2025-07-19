import { type NextRequest, NextResponse } from "next/server";

const WEBHOOKS = {
  "get-all-conversations":
    process.env.N8N_CONVERSATIONS_LIST_WEBHOOK ||
    "https://similarly-secure-mayfly.ngrok-free.app/webhook/get-all-conversations",
  "get-single-conversations":
    process.env.N8N_CONVERSATION_HISTORY_WEBHOOK ||
    "https://similarly-secure-mayfly.ngrok-free.app/webhook/get-single-conversations",
  "save-conversation":
    process.env.N8N_SAVE_CONVERSATION_WEBHOOK ||
    "https://similarly-secure-mayfly.ngrok-free.app/webhook/save-conversation",
  chat:
    process.env.N8N_CHAT_WEBHOOK ||
    "https://similarly-secure-mayfly.ngrok-free.app/webhook/chat",
};

interface WebhookTestResult {
  name: string;
  url: string;
  status: number;
  success: boolean;
  response?: any;
  error?: string;
  responseTime: number;
}

export async function POST(request: NextRequest) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  console.log("[Webhook Tester] Starting webhook tests...");

  const results: WebhookTestResult[] = [];

  for (const [name, url] of Object.entries(WEBHOOKS)) {
    const startTime = Date.now();

    try {
      console.log(`[Webhook Tester] Testing ${name} at ${url}`);

      // Create test payload based on webhook type
      let testPayload: any = {};

      switch (name) {
        case "get-all-conversations":
          testPayload = {
            session_id: "test-session-id",
          };
          break;

        case "get-single-conversations":
          testPayload = {
            session_id: "test-session-id",
            conversation_id: "test-conversation-id",
          };
          break;

        case "save-conversation":
          testPayload = {
            id: "test-id",
            session_id: "test-session-id",
            conversation_id: "test-conversation-id",
            timestamp: new Date().toISOString(),
            event_type: "conversation_created",
            source_url: "https://test.com",
            page_context: "Test",
            chatbot_triggered: true,
            conversion_tracked: false,
            user_message: "Test message",
            type: "conversation",
            name: "Test Conversation",
          };
          break;

        case "chat":
          testPayload = {
            session_id: "test-session-id",
            conversation_id: "test-conversation-id",
            message: "Hello, this is a test message",
            timestamp: new Date().toISOString(),
            user_message: "Hello, this is a test message",
          };
          break;
      }

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Webhook-Tester/1.0",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify(testPayload),
      });

      const responseTime = Date.now() - startTime;

      let responseData: any;
      const contentType = response.headers.get("content-type");

      if (contentType && contentType.includes("application/json")) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      results.push({
        name,
        url,
        status: response.status,
        success: response.ok,
        response: responseData,
        responseTime,
      });

      console.log(
        `[Webhook Tester] ${name}: ${response.status} (${responseTime}ms)`,
      );
    } catch (error) {
      const responseTime = Date.now() - startTime;

      results.push({
        name,
        url,
        status: 0,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        responseTime,
      });

      console.error(`[Webhook Tester] ${name} failed:`, error);
    }
  }

  console.log("[Webhook Tester] All tests completed");

  return NextResponse.json(
    {
      timestamp: new Date().toISOString(),
      total_tests: results.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    },
    {
      status: 200,
      headers: corsHeaders,
    },
  );
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
