import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  if (!rawBody) return NextResponse.json({ error: "Empty body" }, { status: 400 })

  let body: any
  try {
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const {
    webhookUrl,
    text,
    session_id, // TRUST this
    event_type = "user_message",
    user_message,
    source_url,
    page_context,
    chatbot_triggered,
    conversion_tracked,
    product_id,
    product_name,
    order_id,
    type,
    audioData,
    mimeType,
    duration,
  } = body

  if (!webhookUrl || (!text && !audioData)) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  if (!session_id) {
    return NextResponse.json({ error: "Missing session_id" }, { status: 400 })
  }

  // 1. Send pre-Zeno event to n8n
  const preZenoPayload = {
    id: crypto.randomUUID(),
    session_id,
    timestamp: new Date().toISOString(),
    event_type,
    user_message: user_message || text,
    source_url,
    page_context,
    chatbot_triggered,
    conversion_tracked,
    product_id,
    product_name,
    order_id,
  }

  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(preZenoPayload),
  })

  // 2. Call Zeno AI
  const zenoInput = {
    timestamp: new Date().toISOString(),
    session_id,
    type: type || (audioData ? "voice" : "text"),
    source: "chat-widget",
    ...(audioData
      ? { audioData, mimeType, duration }
      : { text }),
  }

  const webhookRes = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Chat-Widget/2.0",
      "X-Widget-Source": "chat-widget",
    },
    body: JSON.stringify(zenoInput),
  })

  let responseData: any
  const contentType = webhookRes.headers.get("content-type")

  if (contentType?.includes("application/json")) {
    responseData = await webhookRes.json()
  } else {
    responseData = await webhookRes.text()
  }

  const zenoMessage =
    responseData?.message ||
    responseData?.response ||
    responseData?.reply ||
    responseData?.text ||
    "Thanks for your message!"

  const responseCards = Array.isArray(responseData?.cards) ? responseData.cards : []

  // 3. Send upsell event if cards exist
  if (responseCards.length > 0) {
    const upsellEvent = {
      session_id,
      timestamp: new Date().toISOString(),
      event_type: "upsell_sent",
      product_id: responseCards[0].id,
      product_name: responseCards[0].name,
    }

    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(upsellEvent),
    })
  }

  return NextResponse.json({
    success: true,
    response: zenoMessage,
    transcription: responseData?.transcription || null,
    status: webhookRes.status,
    cards: responseCards,
  })
}
