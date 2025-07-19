
export async function GET() {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  const webhookUrl = process.env.N8N_CONVERSATIONS_LIST_WEBHOOK || 
    "https://similarly-secure-mayfly.ngrok-free.app/webhook/get-all-conversations";

  try {
    console.log(`[Test Connection] Testing n8n webhook at: ${webhookUrl}`);
    
    const testPayload = {
      session_id: "test-session-123",
      timestamp: new Date().toISOString(),
      request_type: "test_connection",
      action: "connectivity_test"
    };

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
        "User-Agent": "Connection-Test/1.0",
      },
      body: JSON.stringify(testPayload),
    });

    const responseText = await response.text();
    
    const result = {
      webhook_url: webhookUrl,
      status: response.status,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries()),
      response_length: responseText.length,
      response_preview: responseText.substring(0, 200),
      test_payload: testPayload,
    };

    console.log(`[Test Connection] Result:`, result);

    return Response.json(result, {
      status: 200,
      headers: corsHeaders,
    });

  } catch (error) {
    const errorResult = {
      webhook_url: webhookUrl,
      error: error instanceof Error ? error.message : String(error),
      error_name: error instanceof Error ? error.name : 'Unknown',
      timestamp: new Date().toISOString(),
    };

    console.error(`[Test Connection] Error:`, errorResult);

    return Response.json(errorResult, {
      status: 500,
      headers: corsHeaders,
    });
  }
}
