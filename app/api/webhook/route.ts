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
    console.error("Invalid JSON from client:", err)
    return NextResponse.json({ error: "Invalid JSON payload from client" }, { status: 400 })
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

    // Revert to FormData to match original curl's multipart/form-data
    const formData = new FormData()
    formData.append("form_type", "product")
    formData.append("utf8", "✓")
    formData.append("id", variantId.toString())
    formData.append("quantity", quantity.toString())
    formData.append("sections", "sections--17568270549039__cart-drawer")
    // Add other sections if your theme updates them (e.g., header cart count)
    // formData.append("sections", "sections--17568270549039__cart-drawer,header-cart-count-section-id");

    requestBody = formData // fetch will automatically set Content-Type: multipart/form-data with boundary

    // Mimic all relevant headers from your curl command
    requestHeaders = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0", // Exact User-Agent from curl
      Accept: "application/json", // Explicitly request JSON
      "Accept-Language": "en-US,en;q=0.5",
      "X-Requested-With": "XMLHttpRequest", // Crucial for Shopify to return JSON
      Origin: "https://zenmato.myshopify.com", // Match origin for CORS if needed
      Referer: "https://zenmato.myshopify.com/products/zenmato-t-shirt-bundle", // Exact Referer from curl
      "Sec-GPC": "1",
      Connection: "keep-alive",
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-origin",
      Priority: "u=0",
      TE: "trailers",
      // IMPORTANT: Cookies are not automatically forwarded by server-side fetch.
      // If Shopify strictly requires session cookies for add.js without redirects,
      // this might still be an issue. We are relying on X-Requested-With and Accept: application/json.
    }

    console.log("Sending add-to-cart to Shopify (FormData):", {
      url: targetWebhookUrl,
      // Note: requestBody (FormData) cannot be easily logged directly here,
      // but fetch will handle it correctly.
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

  let webhookResponse: Response
  try {
    webhookResponse = await fetch(targetWebhookUrl, {
      method: "POST",
      headers: requestHeaders,
      body: requestBody,
    })
  } catch (fetchError: any) {
    console.error("Error fetching from target URL:", fetchError)
    return NextResponse.json(
      {
        success: false,
        response: `Failed to connect to target service: ${fetchError.message}`,
      },
      { status: 500 },
    )
  }

  let responseData: any
  let rawResponseText: string | null = null
  const contentType = webhookResponse.headers.get("content-type")

  try {
    if (contentType && contentType.includes("application/json")) {
      responseData = await webhookResponse.json()
    } else {
      rawResponseText = await webhookResponse.text()
      try {
        responseData = JSON.parse(rawResponseText)
        console.warn("Webhook response Content-Type was not JSON, but successfully parsed as JSON.")
      } catch (parseError) {
        console.warn("Webhook response was not JSON and could not be parsed as JSON. Raw response:", rawResponseText)
        responseData = rawResponseText
      }
    }
  } catch (jsonParseError: any) {
    console.error("Error parsing webhook response as JSON:", jsonParseError)
    try {
      rawResponseText = await webhookResponse.text()
      console.error("Raw response text that caused JSON parsing error:", rawResponseText)
    } catch (textReadError) {
      console.error("Also failed to read raw response text:", textReadError)
    }
    return NextResponse.json(
      {
        success: false,
        response: "Failed to process webhook response. Please check server logs.",
        debug: rawResponseText || "No raw response available",
      },
      { status: 500 },
    )
  }

  console.log("Webhook response:", {
    status: webhookResponse.status,
    contentType,
    dataType: typeof responseData,
    responseSnippet: typeof responseData === "string" ? responseData.substring(0, 200) + "..." : responseData,
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
      { status: 200 },
    )
  }

  if (typeof responseData === "object" && responseData !== null) {
    responseMessage =
      responseData.message ||
      responseData.response ||
      responseData.reply ||
      responseData.transcription ||
      responseData.text ||
      responseData.content ||
      responseMessage

    if (Array.isArray(responseData.cards)) {
      responseCards = responseData.cards
    }

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
