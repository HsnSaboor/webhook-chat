import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
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

  const { webhookUrl, text, audioData, mimeType, duration, type, payload: clientPayload } = body

  let targetWebhookUrl: string
  let requestBody: BodyInit | null = null
  let requestHeaders: HeadersInit = {}
  let responseMessage = "Thank you for your message!"
  let responseCards = null
  let responseSections = null

  if (type === "add-to-cart") {
    // Handle add-to-cart action by forwarding to Shopify's cart/add.js
    const { variantId, quantity } = clientPayload
    if (!variantId || !quantity) {
      return NextResponse.json({ error: "variantId and quantity are required for add-to-cart" }, { status: 400 })
    }

    targetWebhookUrl = "https://zenmato.myshopify.com/cart/add.js" // Direct to Shopify's add.js

    const formData = new FormData()
    formData.append("form_type", "product")
    formData.append("utf8", "✓")
    formData.append("id", variantId)
    formData.append("quantity", quantity.toString())
    // This is the crucial part to get sections back from Shopify
    // Use the exact section ID from your theme's add.js output
    formData.append("sections", "sections--17568270549039__cart-drawer")
    // If your theme updates other sections (e.g., header cart count), add them here too:
    // formData.append("sections", "sections--17568270549039__cart-drawer,header-cart-count-section-id");

    requestBody = formData
    // For FormData, fetch automatically sets the correct Content-Type with boundary.
    // We explicitly set other headers to mimic the browser request.
    requestHeaders = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36", // Mimic a browser User-Agent
      Accept: "*/*",
      "Accept-Language": "en-US,en;q=0.9",
      "X-Requested-With": "XMLHttpRequest", // Important for Shopify to return JSON
      Origin: "https://zenmato.myshopify.com", // Match origin for CORS if needed
      Referer: "https://zenmato.myshopify.com/products/zenmato-t-shirt-bundle", // Example referer from your curl
      Connection: "keep-alive",
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-origin",
      Priority: "u=0",
      TE: "trailers",
      // Note: Cookies are not automatically forwarded by fetch in a server environment.
      // If Shopify relies heavily on specific cookies for cart updates, this might be a challenge.
      // For now, we'll assume X-Requested-With and sections parameter are sufficient.
    }

    console.log("Sending add-to-cart to Shopify:", {
      url: targetWebhookUrl,
      variantId,
      quantity,
      sections: formData.get("sections"),
    })
  } else {
    // Handle text or voice messages (existing logic)
    if (!webhookUrl) {
      return NextResponse.json({ error: "Webhook URL is required for non-add-to-cart types" }, { status: 400 })
    }
    try {
      new URL(webhookUrl)
    } catch {
      return NextResponse.json({ error: "Invalid webhook URL format" }, { status: 400 })
    }
    targetWebhookUrl = webhookUrl

    let payload: any = {
      timestamp: new Date().toISOString(),
      source: "chat-widget",
      type: type || "text",
    }

    if (type === "voice" && audioData) {
      payload = {
        ...payload,
        audioData: audioData,
        mimeType: mimeType || "audio/webm",
        duration: duration || 0,
      }
    } else {
      payload = {
        ...payload,
        text: text,
      }
    }
    requestBody = JSON.stringify(payload)
    requestHeaders = {
      "Content-Type": "application/json",
      "User-Agent": "Chat-Widget/2.0",
      "X-Widget-Source": "chat-widget",
    }

    console.log("Sending to webhook:", {
      url: targetWebhookUrl,
      payloadKeys: Object.keys(payload),
      type: payload.type,
    })
  }

  // Send message to webhook
  const webhookResponse = await fetch(targetWebhookUrl, {
    method: "POST",
    headers: requestHeaders,
    body: requestBody,
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

    // Extract sections if present
    if (typeof responseData.sections === "object" && responseData.sections !== null) {
      responseSections = responseData.sections
    }
  } else if (typeof responseData === "string") {
    responseMessage = responseData
  }

  return NextResponse.json({
    success: true,
    response: responseMessage,
    transcription: responseData.transcription || null,
    status: webhookResponse.status,
    cards: responseCards,
    sections: responseSections,
  })
}
