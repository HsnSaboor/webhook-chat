
import { type NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabase";

export async function POST(request: NextRequest) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, User-Agent, Cache-Control",
    "Access-Control-Allow-Credentials": "false",
  };

  console.log(`[Save Session API] ============== SAVE SESSION REQUEST ==============`);
  console.log(`[Save Session API] Request received at: ${new Date().toISOString()}`);

  try {
    const body = await request.json();
    console.log(`[Save Session API] Request body:`, body);

    const { session_id, name } = body;

    if (!session_id) {
      console.error("[Save Session API] Missing session_id");
      return NextResponse.json(
        { error: "session_id is required" },
        { 
          status: 400, 
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        }
      );
    }

    console.log(`[Save Session API] Upserting session: ${session_id}`);

    // Upsert the user session (insert if not exists, update if exists)
    const { data, error } = await supabase
      .from('user_sessions')
      .upsert({
        session_id,
        name: name || 'Chat Session',
        started_at: new Date().toISOString(),
        last_activity: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'session_id',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (error) {
      console.error("[Save Session API] Database error:", error);
      throw new Error(`Database error: ${error.message}`);
    }

    console.log(`[Save Session API] Session saved successfully:`, data);
    console.log(`[Save Session API] ============== REQUEST COMPLETED SUCCESSFULLY ==============`);

    return NextResponse.json({
      success: true,
      session: data
    }, { 
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });

  } catch (error) {
    console.error("[Save Session API] ============== ERROR OCCURRED ==============");
    console.error("[Save Session API] Error details:", error);

    let errorMessage = 'Database error occurred';
    if (error instanceof Error) {
      console.error("[Save Session API] Error name:", error.name);
      console.error("[Save Session API] Error message:", error.message);
      errorMessage = error.message;
    }

    console.error(`[Save Session API] Final error message: ${errorMessage}`);

    return NextResponse.json(
      { 
        success: false,
        error: errorMessage 
      },
      { 
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  }
}

// Handle preflight OPTIONS requests
export async function OPTIONS() {
  console.log("[Save Session API] ============== OPTIONS PREFLIGHT REQUEST ==============");

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, User-Agent, Cache-Control",
    "Access-Control-Allow-Credentials": "false",
  };

  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}
