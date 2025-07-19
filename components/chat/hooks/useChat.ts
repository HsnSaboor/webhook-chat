
import { useState, useCallback } from "react";
import { Message, Conversation } from "../types";

export const useChat = () => {
  const [sessionId, setSessionId] = useState<string>("");
  const [sessionReceived, setSessionReceived] = useState(false);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [pageContext, setPageContext] = useState<string | null>(null);
  const [cartCurrency, setCartCurrency] = useState<string | null>(null);
  const [localization, setLocalization] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const trackEvent = useCallback(
    async (eventType: string, data: Record<string, any> = {}) => {
      if (!sessionId) {
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
            session_id: sessionId,
            eventType,
            timestamp: new Date().toISOString(),
            data,
          }),
        });
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
    conversations,
    setConversations,
    currentConversationId,
    setCurrentConversationId,
    loadingConversations,
    setLoadingConversations,
    loadingHistory,
    setLoadingHistory,
    trackEvent,
  };
};
