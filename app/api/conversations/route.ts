import { type NextRequest, NextResponse } from "next/server";
import { getConversationsWithLatestMessages } from "../../../lib/database/conversations";

export async function GET(request: NextRequest) {
  // CORS headers to allow requests from Shopify store
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, User-Agent, Cache-Control",
    "Access-Control-Allow-Credentials": "false",
  };

  console.log(`[Conversations API] ============== GET ALL CONVERSATIONS REQUEST ==============`);
  console.log(`[Conversations API] Request received at: ${new Date().toISOString()}`);
  console.log(`[Conversations API] Request URL: ${request.url}`);

  try {
    // Extract session_id from URL search params
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');

    console.log(`[Conversations API] Extracted session_id from params: ${sessionId}`);

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

    console.log(`[Conversations API] Fetching conversations from Supabase for session: ${sessionId}`);

    const conversations = await getConversationsWithLatestMessages(sessionId);

    console.log(`[Conversations API] Found ${conversations.length} conversations`);
    console.log(`[Conversations API] Conversations:`, JSON.stringify(conversations, null, 2));

    // Helper function to generate name from user message
    const generateNameFromMessage = (message: string): string => {
      if (!message) return 'New Chat';
      
      // Clean the message - remove extra whitespace and newlines
      const cleanMessage = message.replace(/\s+/g, ' ').trim();
      
      // Take first 15 characters
      const truncated = cleanMessage.substring(0, 15);
      
      // If we cut off in the middle of a word, try to end at a word boundary
      if (cleanMessage.length > 15) {
        const lastSpace = truncated.lastIndexOf(' ');
        if (lastSpace > 5) { // Only use word boundary if it's not too short
          return truncated.substring(0, lastSpace) + '...';
        }
        return truncated + '...';
      }
      
      return truncated;
    };

    // Transform database format to frontend format
    const transformedConversations = conversations.map(conv => ({
      conversation_id: conv.conversation_id,
      name: conv.latest_user_message 
        ? generateNameFromMessage(conv.latest_user_message)
        : conv.name || 'New Chat',
      started_at: conv.started_at,
      ended_at: conv.ended_at
    }));

    console.log(`[Conversations API] ============== REQUEST COMPLETED SUCCESSFULLY ==============`);

    return NextResponse.json(transformedConversations, { 
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });

  } catch (error) {
    console.error("[Conversations API] ============== ERROR OCCURRED ==============");
    console.error("[Conversations API] Error details:", error);

    let errorMessage = 'Database error occurred';
    if (error instanceof Error) {
      console.error("[Conversations API] Error name:", error.name);
      console.error("[Conversations API] Error message:", error.message);
      errorMessage = error.message;
    }

    console.error(`[Conversations API] Final error message: ${errorMessage}`);

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
    "Access-Control-Allow-Headers": "Content-Type, Authorization, User-Agent, Cache-Control",
    "Access-Control-Allow-Credentials": "false",
  };

  console.log("[Conversations API] Sending CORS headers:", corsHeaders);
  console.log("[Conversations API] ============== OPTIONS COMPLETED ==============");

  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}