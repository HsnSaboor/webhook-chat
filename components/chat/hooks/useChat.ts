
import { useState, useCallback } from "react";
import { Message } from "../types";

export const useChat = () => {
  const [sessionId, setSessionId] = useState<string>("");
  const [sessionReceived, setSessionReceived] = useState(false);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [pageContext, setPageContext] = useState<string | null>(null);
  const [cartCurrency, setCartCurrency] = useState<string | null>(null);
  const [localization, setLocalization] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const trackEvent = useCallback(
    async (eventType: string, data: Record<string, any> = {}) => {
      // Use the provided sessionId or try to get from window context
      const effectiveSessionId = data.sessionId || sessionId || (typeof window !== 'undefined' && window.shopifyContext?.session_id);
      
      if (!effectiveSessionId) {
        console.warn("Analytics event skipped: No session ID available.");
        return;
      }
      
      try {
        await fetch("/api/analytics", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            session_id: effectiveSessionId,
            eventType,
            timestamp: new Date().toISOString(),
            data,
          }),
        });
        console.log(`[Analytics] Event tracked: ${eventType}`);
      } catch (error) {
        console.error("Failed to send analytics event:", error);
      }
    },
    [sessionId],
  );

  return {
    sessionId,
    setSessionId,
    sessionReceived,
    setSessionReceived,
    sourceUrl,
    setSourceUrl,
    pageContext,
    setPageContext,
    cartCurrency,
    setCartCurrency,
    localization,
    setLocalization,
    messages,
    setMessages,
    isLoading,
    setIsLoading,
    trackEvent,
  };
};
