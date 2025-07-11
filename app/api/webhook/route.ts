import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  // read raw body
  const rawBody = await request.text()

  if (!rawBody) {
    return NextResponse.json({ error: "Empty request body" }, { status: 400 })
  }

  let body: any
  try {
    body = JSON.parse(rawBody)
  } catch (err) {
    console.error("Invalid JSON:", err)
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
  }

  const { webhookUrl, text, audioData, mimeType, duration, type } = body

  if (!webhookUrl) {
    return NextResponse.json({ error: "Webhook URL is required" }, { status: 400 })
  }

  if (!text && !audioData) {
    return NextResponse.json({ error: "Text or audio data is required" }, { status: 400 })
  }

  // Validate URL format
  try {
    new URL(webhookUrl)
  } catch {
    return NextResponse.json({ error: "Invalid webhook URL format" }, { status: 400 })
  }

  let payload: any = {
    timestamp: new Date().toISOString(),
    source: "chat-widget",
    type: type || "text",
  }

  if (type === "voice" && audioData) {
    // Send voice data in the requested format
    payload = {
      ...payload,
      audioData: audioData, // Base64 encoded audio
      mimeType: mimeType || "audio/webm",
      duration: duration || 0,
    }
  } else {
    // Send text message in the requested format
    payload = {
      ...payload,
      text: text, // Text message
    }
  }

  console.log("Sending to webhook:", {
    url: webhookUrl,
    payloadKeys: Object.keys(payload),
    type: payload.type,
  })

  // Send message to webhook
  const webhookResponse = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Chat-Widget/2.0",
      "X-Widget-Source": "chat-widget",
    },
    body: JSON.stringify(payload),
  })

  let responseData
  const contentType = webhookResponse.headers.get("content-type")

  if (contentType && contentType.includes("application/json")) {
    responseData = await webhookResponse.json()
  } else {
    responseData = await webhookResponse.text()
  }

  console.log("Webhook response:", {
    status: webhookResponse.status,
    contentType,
    dataType: typeof responseData,
  })

  if (!webhookResponse.ok) {
    console.error("Webhook error:", {
      status: webhookResponse.status,
      response: responseData,
    })

    return NextResponse.json(
      {
        success: false,
        response: "I'm having trouble connecting right now. Please try again in a moment.",
      },
      { status: 200 }, // Return 200 to avoid showing error to user
    )
  }

  // Extract response message and cards from webhook response
  let responseMessage = "Thank you for your message!"
  let responseCards = null

  if (typeof responseData === "object" && responseData !== null) {
    // Try to extract message from common response formats
    responseMessage =
      responseData.message ||
      responseData.response ||
      responseData.reply ||
      responseData.transcription ||
      responseData.text ||
      responseData.content ||
      responseMessage

    // Extract cards if present
    if (Array.isArray(responseData.cards)) {
      responseCards = responseData.cards
    }
  } else if (typeof responseData === "string") {
    responseMessage = responseData
  }

  return NextResponse.json({
    success: true,
    response: responseMessage,
    transcription: responseData.transcription || null,
    status: webhookResponse.status,
    cards: responseCards, // Include cards in the response to the client
  })
}
