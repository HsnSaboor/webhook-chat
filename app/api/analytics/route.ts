import { type NextRequest, NextResponse } from "next/server"

// In-memory store for demonstration purposes.
// In a real application, this would be a persistent database (e.g., Supabase, Neon, MongoDB).
const analyticsEvents: any[] = []

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log("Received Analytics Event:", JSON.stringify(body, null, 2))
    analyticsEvents.push(body) // Store the event
    return NextResponse.json({ success: true, message: "Analytics event received" }, { status: 200 })
  } catch (error) {
    console.error("Error receiving analytics event:", error)
    return NextResponse.json({ success: false, message: "Failed to process analytics event" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  // This GET endpoint will return the stored analytics events
  try {
    return NextResponse.json({ success: true, events: analyticsEvents }, { status: 200 })
  } catch (error) {
    console.error("Error fetching analytics events:", error)
    return NextResponse.json({ success: false, message: "Failed to fetch analytics events" }, { status: 500 })
  }
}
