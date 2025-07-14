import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  const rawBody = await request.text()

  if (!rawBody) {
    console.error("[Webhook] Empty body received.")
    return NextResponse.json({ error: "Empty body" }, { status: 400 })
  }

  let body: any
  try {
    body = JSON.parse(rawBody)
  } catch (err) {
    console.error("[Webhook] Failed to parse JSON:", err, "Raw Body:", rawBody)
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  // Default type detection
  const messageType = type || (audioData ? "voice" : "text");

  const {
    webhookUrl,
    text,
    session_id,
    event_type = "user_message",
    user_message,
    source_url,
    page_context,
    chatbot_triggered,
    conversion_tracked,
    product_id,
    product_name,
    order_id,
    type: messageType,
    audioData,
    mimeType,
    duration,
  } = body

  if (!webhookUrl || (!text && !audioData)) {
    console.error("[Webhook] Missing required fields", { webhookUrl, text, audioData })
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  if (!session_id) {
    console.error("[Webhook] Missing session_id in payload", body)
    return NextResponse.json({ error: "Missing session_id" }, { status: 400 })
  }

  console.log("[Webhook] Received session_id:", session_id)

  // 1. Send pre-Zeno event to n8n
  const preZenoPayload = {
    id: crypto.randomUUID(),
    session_id,
    timestamp: new Date().toISOString(),
    event_type,
    user_message: user_message || text,
    type: messageType,
    source_url,
    page_context,
    chatbot_triggered,
    conversion_tracked,
    product_id,
    product_name,
    order_id,
  }

  console.log("[Webhook] Sending pre-Zeno payload to:", webhookUrl)
  console.log(JSON.stringify(preZenoPayload, null, 2))

  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(preZenoPayload),
  })

  // 2. Call Zeno AI
  const zenoInput = {
    timestamp: new Date().toISOString(),
    session_id,
    type: messageType,
    source: "chat-widget",
    ...(audioData
      ? { audioData, mimeType, duration }
      : { text }),
  }

  console.log("[Webhook] Sending Zeno input:", JSON.stringify(zenoInput, null, 2))

  const webhookRes = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Chat-Widget/2.0",
      "X-Widget-Source": "chat-widget",
    },
    body: JSON.stringify(zenoInput),
  })

  const contentType = webhookRes.headers.get("content-type")
  let responseData: any

  try {
    responseData = contentType?.includes("application/json")
      ? await webhookRes.json()
      : await webhookRes.text()
  } catch (err) {
    console.error("[Webhook] Failed to parse Zeno response:", err)
    return NextResponse.json({ error: "Invalid Zeno response" }, { status: 502 })
  }

  console.log("[Webhook] Zeno response:", responseData)

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

    console.log("[Webhook] Sending upsell event:", JSON.stringify(upsellEvent, null, 2))

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
