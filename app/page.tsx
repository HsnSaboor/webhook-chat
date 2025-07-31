"use client";

import type React from "react";
import { Fragment } from "react";
import { ChevronDown, ArrowUp } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardFooter,
} from "@/components/ui/card";
import {
  MessageCircle,
  Send,
  Mic,
  X,
  AlertCircle,
  Sparkles,
  User,
  Plus,
  Volume2,
  VolumeX,
} from "lucide-react";

// Import modularized components
import { AnimatedWaveform } from "@/components/chat/AnimatedWaveform";
import { StaticWaveform } from "@/components/chat/StaticWaveform";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { ProductCards } from "@/components/chat/ProductCards";
import { useChat } from "@/components/chat/hooks/useChat";
import { useAudio } from "@/components/chat/hooks/useAudio";
import type { Message, ProductCardData, HistoryItem } from "@/components/chat/types";

// Declare global interface for shopifyContext
declare global {
  interface Window {
    shopifyContext?: {
      session_id?: string;
      source_url?: string | null;
      page_context?: string | null;
      cart_currency?: string | null;
      localization?: any | null;
      conversation_id?: string | null;
      shopify_context?: any | null;
    };
  }
}

export default function ChatWidget() {
  // Session data from parent window (Shopify)
  const [sessionId, setSessionId] = useState<string>("");
  const [sessionReceived, setSessionReceived] = useState(false);

  // Generate fallback session ID if not received from parent
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!sessionReceived && !sessionId) {
        const fallbackSessionId = `fallback-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        console.log('[Chatbot] No session_id received from parent, using fallback:', fallbackSessionId);
        setSessionId(fallbackSessionId);
        setSessionReceived(true);
      }
    }, 3000); // Wait 3 seconds for parent session

    return () => clearTimeout(timeout);
  }, [sessionReceived, sessionId]);

  const {
    sessionId: chatSessionId,
    setSessionId: setChatSessionId,
    sessionReceived: chatSessionReceived,
    setSessionReceived: setChatSessionReceived,
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
  } = useChat();

  const {
    isRecording,
    setIsRecording,
    recordingDuration,
    audioLevel,
    voiceError,
    setVoiceError,
    mediaRecorderRef,
    audioChunksRef,
    streamRef,
    requestMicrophonePermission,
    startRecordingTimer,
    stopRecordingTimer,
    monitorAudioLevel,
    cleanup,
  } = useAudio();

  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [chatHeight, setChatHeight] = useState(() => {
    if (typeof window !== "undefined") {
      return Math.min(window.innerHeight * 0.75, 600);
    }
    return 600;
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [addedProductVariantId, setAddedProductVariantId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [showHomepage, setShowHomepage] = useState(true);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [conversationsLoaded, setConversationsLoaded] = useState(false);
  const [conversationsCache, setConversationsCache] = useState<any[]>([]);
  const [cacheTimestamp, setCacheTimestamp] = useState<number>(0);

  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  // No fallback session ID - must receive from parent (Shopify)
  useEffect(() => {
    if (!sessionId && !sessionReceived) {
      const timeout = setTimeout(() => {
        if (!sessionId && !sessionReceived) {
          console.error(
            "[Chatbot] No session_id received from parent after 5 seconds. Cannot function without proper Shopify session.",
          );
          setIsOpen(false); // Force close if no proper session
        }
      }, 5000);

      return () => clearTimeout(timeout);
    }
  }, [sessionId, sessionReceived]);

  // Listen for messages from parent window (Shopify theme)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const trustedOrigins = [
        "https://zenmato.myshopify.com",
        "https://cdn.shopify.com",
        window.location.origin,
      ];

      console.log(
        "[Chatbot] Received message from origin:",
        event.origin,
        "Data:",
        event.data,
      );

      if (!trustedOrigins.includes(event.origin)) {
        console.warn(
          "[Chatbot] Ignoring message from untrusted origin:",
          event.origin,
        );
        return;
      }
      const messageData = event.data;

      if (trustedOrigins.includes(event.origin)) {
        if (messageData?.type === "init") {
          if (messageData.session_id) {
            console.log("[Chatbot] Received session_id from parent:", messageData.session_id);

            // Set the actual session ID from Shopify
            setSessionId(messageData.session_id);
            setSessionReceived(true);

            // Initialize shopifyContext with all available data
            window.shopifyContext = {
              session_id: messageData.session_id,
              source_url: messageData.source_url || null,
              page_context: messageData.page_context || null,
              cart_currency: messageData.cart_currency || null,
              localization: messageData.localization || null,
              conversation_id: messageData.conversation_id || null,
              shopify_context: messageData.shopify_context || null
            };

            console.log("[Chatbot] Stored complete Shopify context:", window.shopifyContext);

            // Auto-load conversations immediately when session is received
            if (!conversationsLoaded && conversationsCache.length === 0) {
              console.log("[Chatbot] Auto-loading conversations on session init");
              requestConversationsFromParent();
            }

            // Log individual received values
            if (messageData.source_url) {
              console.log("[Chatbot] Received source_url:", messageData.source_url);
            }
            if (messageData.page_context) {
              console.log("[Chatbot] Received page_context:", messageData.page_context);
            }
            if (messageData.cart_currency) {
              console.log("[Chatbot] Received cart_currency:", messageData.cart_currency);
            }
            if (messageData.localization) {
              console.log("[Chatbot] Received localization:", messageData.localization);
            }
          } else {
            console.warn("[Chatbot] Received init message without session_id");
          }
        } else if (messageData?.type === "conversations-response") {
          const handleConversationsReceived = (conversationsData: any[]) => {
    console.log("[Chatbot] Received conversations from parent:", conversationsData);
    try {
      if (Array.isArray(conversationsData)) {
        const formattedConversations = conversationsData.map((conv: any) => {
          console.log("[Chatbot] Processing conversation:", conv);

          if (!conv) {
            console.warn("[Chatbot] Null conversation found, skipping");
            return null;
          }

          // Extract conversation ID from various possible formats
          const conversationId = conv.conversation_id || conv.id || 
                                (typeof conv === 'string' ? conv : null);

          if (!conversationId || typeof conversationId !== 'string') {
            console.warn("[Chatbot] No valid conversation ID found for:", conv);
            return null;
          }

          // Safely get the last 4 characters for display
          const displayId = conversationId.length >= 4 ? conversationId.slice(-4) : conversationId;

          return {
            id: conversationId,
            conversation_id: conversationId,
            title: conv.name || `Chat ${displayId}`,
            name: conv.name || `Chat ${displayId}`,
            started_at: conv.started_at || conv.timestamp || new Date().toISOString(),
            timestamp: conv.started_at || conv.timestamp || new Date().toISOString()
          };
        }).filter(Boolean); // Remove any null entries

        console.log("[Chatbot] Formatted conversations:", formattedConversations);

        // Update both current conversations and cache
        setConversations(formattedConversations);
        setConversationsCache(formattedConversations);
        setCacheTimestamp(Date.now());
        setConversationsLoaded(true);
        setLoadingConversations(false);
      } else {
        console.warn("[Chatbot] Conversations data is not an array:", conversationsData);
        setConversations([]);
        setConversationsCache([]);
        setConversationsLoaded(true);
        setLoadingConversations(false);
      }
    } catch (error) {
      console.error("[Chatbot] Error processing conversations:", error);
      setConversations([]);
      setConversationsCache([]);
      setConversationsLoaded(true);
      setLoadingConversations(false);
    }
  };
          handleConversationsReceived(messageData.conversations);
        } else if (messageData?.type === "conversation-response") {
          console.log(
            "[Chatbot] Received conversation history from parent:",
            messageData.conversation,
          );
          if (messageData.conversation?.messages) {
            setMessages(messageData.conversation.messages);
            setCurrentConversationId(messageData.conversation.id);
          }
        } else if (messageData?.type === "chat-response") {
          console.log(
            "[Chatbot] Received chat response from parent:",
            messageData.response,
          );

          const data = messageData.response;

          const webhookMessage: Message = {
            id: (Date.now() + 1).toString(),
            content: data.message || data.ai_message || "Response received",
            role: "webhook",
            timestamp: new Date(),
            type: "text",
            cards: data.cards || undefined,
          };
          setMessages((prev) => [...prev, webhookMessage]);

          // Save AI response to database (non-blocking)
          const saveAIMessage = async () => {
            try {
              console.log('[Chatbot] Saving standalone AI response to database...', {
                content: webhookMessage.content,
                cards: webhookMessage.cards,
                timestamp: webhookMessage.timestamp.toISOString()
              });

              const contextSessionId = window.shopifyContext?.session_id;
              const effectiveSessionId = contextSessionId || sessionId;

              const aiSaveResponse = await fetch('/api/messages/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  conversation_id: currentConversationId || `conv_${effectiveSessionId}_${Date.now()}`,
                  session_id: effectiveSessionId,
                  content: webhookMessage.content,
                  role: 'webhook',
                  type: 'text',
                  cards: webhookMessage.cards || null,
                  timestamp: webhookMessage.timestamp.toISOString()
                })
              });

              if (!aiSaveResponse.ok) {
                console.error('[Chatbot] Failed to save standalone AI message:', await aiSaveResponse.text());
              } else {
                console.log('[Chatbot] Standalone AI message saved successfully');
              }
            } catch (saveError) {
              console.error('[Chatbot] Error saving standalone AI message:', saveError);
            }
          };

          saveAIMessage();
          setIsLoading(false);
        } else if (messageData?.type === "chat-error") {
          console.error(
            "[Chatbot] Error from parent:",
            messageData.error,
          );
          const errorMessage: Message = {
            id: (Date.now() + 1).toString(),
            content: "Sorry, I'm having trouble responding right now. Please try again.",
            role: "webhook",
            timestamp: new Date(),
            type: "text",
          };
          setMessages((prev) => [...prev, errorMessage]);
          setIsLoading(false);
        } else if (messageData?.type === "add-to-cart-success") {
          console.log(
            "[Chatbot] Product added to cart successfully:",
            messageData.variantId,
          );
          // Show success message to user
        } else if (messageData?.type === "add-to-cart-error") {
          console.error(
            "[Chatbot] Failed to add product to cart:",
            messageData.error,
          );
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [setSessionId, setSessionReceived, setSourceUrl, setPageContext, setCartCurrency, setLocalization, setMessages, currentConversationId]);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (mobile) {
        setChatHeight(Math.min(window.innerHeight * 0.75, window.innerHeight - 100));
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function'
    ) {
      if (
        MediaRecorder.isTypeSupported("audio/webm") ||
        MediaRecorder.isTypeSupported("audio/mp4")
      ) {
        setVoiceSupported(true);
      } else {
        setVoiceSupported(false);
        setVoiceError("Audio recording is not supported in this browser.");
      }
    } else {
      setVoiceSupported(false);
      setVoiceError("Microphone access is not supported in this browser.");
    }
  }, [setVoiceError]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      if (sessionId && sessionReceived) {
        trackEvent("chat_opened", { initialMessagesCount: messages.length });

        // Always refresh conversations when opening chat
        console.log("[Chatbot] Refreshing conversations on chat open");
        requestConversationsFromParent();

        // Always show homepage first when opening chat
        setShowHomepage(true);
      } else {
        console.error("[Chatbot] Cannot open chat without proper Shopify session");
        setIsOpen(false); // Close chat if no proper session
      }
    } else if (!isOpen) {
      // Don't clear messages when closing - they will be preserved
      setShowHomepage(true);
    }
  }, [isOpen, sessionId, sessionReceived, trackEvent]);

  // Auto-load conversations when the component mounts and session is available
  useEffect(() => {
    if (sessionId && sessionReceived && !conversationsLoaded && conversationsCache.length === 0) {
      console.log("[Chatbot] Auto-loading conversations on component mount");
      setLoadingConversations(true);
      requestConversationsFromParent();
    }
  }, [sessionId, sessionReceived, conversationsLoaded, conversationsCache.length]);

  const handleScroll = useCallback(() => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } =
        messagesContainerRef.current;
      const isAtBottom = scrollHeight - scrollTop <= clientHeight + 10;
      setShowScrollToBottom(!isAtBottom);
    }
  }, []);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll);
      handleScroll();
      return () => container.removeEventListener("scroll", handleScroll);
    }
  }, [handleScroll]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const requestConversationsFromParent = () => {
    if (window.parent && window.parent !== window) {
      console.log("[Chatbot] Requesting conversations from parent");
      setLoadingConversations(true);
      window.parent.postMessage(
        {
          type: "get-all-conversations",
        },
        "https://zenmato.myshopify.com",
      );
      // Don't set conversationsLoaded here - let the response handler do it
    }
  };

  const loadConversationFromParent = async (conversationId: string) => {
    if (!sessionId) {
      console.error("[Chatbot] Cannot load conversation: No session ID");
      return;
    }

    console.log(`[Chatbot] Loading conversation: ${conversationId}`);
    setIsLoading(true);

    try {
      const response = await fetch(
        `/api/conversations/${conversationId}?session_id=${sessionId}`,
      );

      if (!response.ok) {
        console.error(
          `[Chatbot] Failed to load conversation: ${response.status}`,
        );
        return;
      }

      const history = await response.json();
      console.log("[Chatbot] Loaded conversation history:", history);

      // Transform database messages to frontend format
      const loadedMessages = history.map((item: any, index: number) => {
        return {
          id: `msg-${conversationId}-${index}`,
          content: item.content || item.user_message || item.ai_message || "",
          role: item.role || (item.user_message ? "user" : "webhook"),
          timestamp: new Date(item.timestamp),
          type: item.type || "text",
          cards: item.cards || undefined,
        };
      }).filter((msg: Message) => msg.content.trim() !== "");

      console.log("[Chatbot] Converted messages:", loadedMessages);

      setMessages(loadedMessages);
      setCurrentConversationId(conversationId);
    } catch (error) {
      console.error("[Chatbot] Error loading conversation:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendChatMessageToParent = (messageData: any) => {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(
        {
          type: "send-chat-message",
          payload: messageData,
        },
        "https://zenmato.myshopify.com",
      );
    }
  };

  const startRecording = async () => {
    const stream = await requestMicrophonePermission();
    if (!stream) return;

    try {
      streamRef.current = stream;
      audioChunksRef.current = [];

      let mimeType = "audio/webm";
      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        mimeType = "audio/webm;codecs=opus";
      } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
        mimeType = "audio/mp4";
      } else if (MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")) {
        mimeType = "audio/ogg;codecs=opus";
      }

      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: mimeType,
      });

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        sendVoiceMessage(audioBlob, recordingDuration);
        cleanup();
      };

      mediaRecorderRef.current.onerror = (event: any) => {
        setVoiceError("Recording failed. Please try again.");
        setIsRecording(false);
        stopRecordingTimer();
      };

      mediaRecorderRef.current.start(100);
      setIsRecording(true);
      startRecordingTimer();
      monitorAudioLevel();
      setVoiceError("");
    } catch (error) {
      setVoiceError("Failed to start recording. Please try again.");
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    }
  };

  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    stopRecordingTimer();
  };

  const toggleRecording = async () => {
    if (!voiceSupported) {
      setVoiceError("Voice recording is not supported in this browser.");
      return;
    }

    if (isRecording) {
      stopRecording();
    } else {
      await startRecording();
    }
  };

  const sendVoiceMessage = async (audioBlob: Blob, duration: number) => {
    // Don't add the message here - let sendMessage handle it completely
    try {
      // Use the sendMessage function to handle both voice and text messages consistently
      // Send empty message for voice - n8n will transcribe and set the actual message
      await sendMessage(`Voice message (${duration}s)`, "voice", audioBlob);
    } catch (error) {
      console.error("[Chatbot] Error sending voice message:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "Connection error. Please check your internet and try again.",
        role: "webhook",
        timestamp: new Date(),
        type: "text",
      };
      setMessages((prev) => [...prev, errorMessage]);
      setIsLoading(false);
    }
  };

  const saveConversationToDB = async (conversationId: string, sessionId: string) => {
    try {
      await fetch("/api/conversations/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session_id: sessionId,
          conversation_id: conversationId,
          name: `Conversation ${new Date().toLocaleString()}`,
        }),
      });
      console.log('[Chatbot] Conversation saved to DB:', conversationId);

      // Update cache immediately after saving
      const newConversation = {
        id: conversationId,
        conversation_id: conversationId,
        title: `Chat ${conversationId.slice(-4)}`,
        name: `Chat ${conversationId.slice(-4)}`,
        started_at: new Date().toISOString(),
        timestamp: new Date().toISOString()
      };

      setConversations(prev => [...prev, newConversation]);
      setConversationsCache(prev => [...prev, newConversation]);
      setCacheTimestamp(Date.now());

    } catch (error) {
      console.error("[Chatbot] Error saving conversation:", error);
    }
  };

  const sendMessage = async (messageText: string, type: "text" | "voice" = "text", audioBlob?: Blob) => {
    if (!sessionId) {
      console.error("[Chatbot] Cannot send message: No session ID");
      return;
    }

    console.log(`[Chatbot] Sending ${type} message:`, messageText);

    // Create conversation ID if this is the first message
    let conversationId = currentConversationId;
    if (!conversationId) {
      conversationId = `conv_${sessionId}_${Date.now()}`;
      setCurrentConversationId(conversationId);
      console.log("[Chatbot] Created new conversation ID:", conversationId);

      // Save new conversation immediately
      await saveConversationToDB(conversationId, sessionId);
    }

    // Create the user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      content: messageText,
      role: "user",
      timestamp: new Date(),
      type,
    };

    // Handle audio URL for voice messages
    if (type === "voice" && audioBlob) {
      userMessage.audioUrl = URL.createObjectURL(audioBlob);
    }

    // Add user message to chat
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    // Save user message to database
    try {
      await fetch("/api/messages/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversation_id: conversationId,
          session_id: sessionId,
          content: messageText,
          role: "user",
          type,
          timestamp: userMessage.timestamp.toISOString(),
        }),
      });
    } catch (error) {
      console.error("[Chatbot] Error saving user message:", error);
    }

    try {
      // Track the message sent event
      trackAnalyticsEvent("message_sent", {
        message: messageText,
        type,
        conversationId,
      });

      // Get the latest context data
      const context = window.shopifyContext || {};
      console.log("[Chatbot] Using Shopify context for message:", context);

      // Use the session ID from context if available, otherwise use the local sessionId
      const effectiveSessionId = context.session_id || sessionId;

      // Check if we're in a parent window (Shopify) context
      const isInShopify = window.parent && window.parent !== window;

      if (isInShopify) {
        // Send through parent window (Shopify integration)
        const messageData: {
          id: string;
          session_id: string;
          timestamp: string;
          user_message: string;
          message: string;
          conversation_id: string;
          source_url: string | null;
          page_context: string | null;
          cart_currency: string | null;
          localization: any | null;
          type: "text" | "voice";
          audioData?: string;
          mimeType?: string;
          duration?: number;
        } = {
          id: crypto.randomUUID(),
          session_id: effectiveSessionId,
          timestamp: new Date().toISOString(),
          user_message: type === "voice" ? "" : messageText, // Empty for voice messages
          message: type === "voice" ? "" : messageText, // Empty for voice messages - n8n will transcribe
          conversation_id: conversationId,
          source_url: context.source_url || null,
          page_context: context.page_context || null,
          cart_currency: context.cart_currency || null,
          localization: context.localization || null,
          type,
        };

        // Add audio data for voice messages
        if (type === "voice" && audioBlob) {
          const arrayBuffer = await audioBlob.arrayBuffer();
          const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
          messageData.audioData = base64Audio;
          messageData.mimeType = audioBlob.type;
          messageData.duration = Math.floor((audioBlob.size / 16000) / 2); // Rough estimate
        }

        console.log("[Chatbot] Sending message through parent window:", messageData);
        sendChatMessageToParent(messageData);

        // The response will come through the message listener - don't set isLoading false here
        // isLoading will be set false when we receive the chat-response or chat-error message
        return;
      } else {
        // Direct webhook call (fallback when not in Shopify)
        const chatWebhookUrl = process.env.NEXT_PUBLIC_N8N_CHAT_WEBHOOK || 
          "https://similarly-secure-mayfly.ngrok-free.app/webhook/chat";

        const webhookPayload = {
          session_id: effectiveSessionId,
          message: messageText,
          timestamp: new Date().toISOString(),
          conversation_id: conversationId,
          source_url: context.source_url || null,
          page_context: context.page_context || null,
          cart_currency: context.cart_currency || null,
          localization: context.localization || null,
          type,
        };

        console.log("[Chatbot] Sending directly to n8n chat webhook:", webhookPayload);

        const response = await fetch(chatWebhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "ngrok-skip-browser-warning": "true",
          },
          body: JSON.stringify(webhookPayload),
        });

        if (!response.ok) {
          throw new Error(`Chat webhook request failed: ${response.status}`);
        }

        const responseText = await response.text();
        console.log("[Chatbot] Raw webhook response:", responseText);

        let data;
        try {
          const parsedResponse = JSON.parse(responseText);
          // Handle array responses from webhook
          data = Array.isArray(parsedResponse) ? parsedResponse[0] : parsedResponse;
        } catch (e) {
          console.error("[Chatbot] Failed to parse webhook response as JSON:", e);
          data = { message: "I received your message but had trouble processing the response. Please try again." };
        }

        console.log("[Chatbot] Parsed chat webhook response:", data);

        // Create the webhook response message
        const webhookMessage: Message = {
          id: `webhook-${Date.now()}`,
          content: data.message || "I'm sorry, I couldn't process your request right now.",
          role: "webhook",
          timestamp: new Date(),
          type: "text",
          cards: data.cards,
        };

        // Add webhook response to chat
        setMessages((prev) => [...prev, webhookMessage]);

        // Track the response received event
        trackAnalyticsEvent("response_received", {
          response: webhookMessage.content,
          conversationId,
        });

        try {
          // Save user message
          console.log('[Chatbot] Saving user message to database...');
          const userSaveResponse = await fetch('/api/messages/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              conversation_id: conversationId,
              session_id: effectiveSessionId,
              content: messageText,
              role: 'user',
              type: type,
              audio_url: audioBlob ? URL.createObjectURL(audioBlob) : null,
              timestamp: userMessage.timestamp.toISOString()
            })
          });

          if (!userSaveResponse.ok) {
            console.error('[Chatbot] Failed to save user message:', await userSaveResponse.text());
          } else {
            console.log('[Chatbot] User message saved successfully');
          }

          // Save AI response
          console.log('[Chatbot] Saving AI message to database...', {
            content: data.message,
            cards: data.cards,
            timestamp: webhookMessage.timestamp.toISOString()
          });

          const aiSaveResponse = await fetch('/api/messages/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              conversation_id: conversationId,
              session_id: effectiveSessionId,
              content: data.message || "No response content",
              role: 'webhook',
              type: 'text',
              cards: data.cards || null,
              timestamp: webhookMessage.timestamp.toISOString()
            })
          });

          if (!aiSaveResponse.ok) {
            console.error('[Chatbot] Failed to save AI message:', await aiSaveResponse.text());
          } else {
            console.log('[Chatbot] AI message saved successfully');
          }
        } catch (saveError) {
          console.error('[Chatbot] Error saving messages:', saveError);
        }

        // Only set loading false after everything is processed
        setIsLoading(false);
      }
    } catch (error) {
      console.error("[Chatbot] Error sending message:", error);

      // Add error message
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        content: "I'm sorry, there was an error processing your message. Please try again.",
        role: "webhook",
        timestamp: new Date(),
        type: "text",
      };

      setMessages((prev) => [...prev, errorMessage]);

      // Track the error event
      trackAnalyticsEvent("message_error", {
        error: error instanceof Error ? error.message : "Unknown error",
        conversationId,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleProductClick = (card: ProductCardData) => {
    // Add robust null/undefined checks
    if (!card) {
      console.error("[Chatbot] Attempted to open product page for a null card");
      return;}

    const productName = card.name || 'product';
    console.log(`[Chatbot] Opening product page for: ${productName}`);

    // Navigate parent window to product page
    if (window.parent && window.parent !== window) {
      try {
        // Use the product handle if available, otherwise construct from name
        const productHandle = card.handle || productName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const productUrl = `https://zenmato.myshopify.com/products/${productHandle}`;

        window.parent.postMessage(
          {
            type: "navigate-to-product",
            payload: {
              productUrl: productUrl,
              productHandle: productHandle,
              variantId: card.variantId,
              productName: productName
            },
          },
          "https://zenmato.myshopify.com",
        );

        console.log(`[Chatbot] Sent navigate request for product: ${productUrl}`);
      } catch (error) {
        console.error("[Chatbot] Error navigating to product:", error);
      }
    }
  };

  const handleAddToCart = (card: ProductCardData, selectedVariant?: any, quantity: number = 1) => {
    const variantId = selectedVariant?.id || card.variantId;
    const price = selectedVariant?.price || card.price;

    console.log(
      `[Chatbot] Attempting to send 'add-to-cart' message for variantId: ${variantId}, quantity: ${quantity}`,
    );
    setAddedProductVariantId(variantId);

    setTimeout(() => {
      setAddedProductVariantId(null);
    }, 1500);

    trackEvent("add_to_cart", {
      variantId: variantId,
      productName: card.name,
      productPrice: price,
      quantity: quantity,
      selectedColor: selectedVariant?.color,
      selectedSize: selectedVariant?.size,
      source: "chatbot",
    });

    if (
      typeof window !== "undefined"&&
      window.parent &&
      window.parent !== window
    ) {
      const shopifyStoreDomain = "https://zenmato.myshopify.com";

      window.parent.postMessage(
        {
          type: "add-to-cart",
          payload: {
            variantId: variantId,
            quantity: quantity,
            redirect: false, // Don't redirect to cart - show popup instead
            productName: card.name,
            productPrice: price,
            selectedVariant: selectedVariant,
          },
        },
        shopifyStoreDomain,
      );

      console.log(
        `[Chatbot] Sent postMessage to parent: type='add-to-cart', variantId=${variantId}, quantity=${quantity}, redirect=false, targetOrigin=${shopifyStoreDomain}`,
      );
    } else {
      console.warn(
        "[Chatbot] window.parent is not available or chatbot is not in iframe. Cannot send add-to-cart message.",
      );
    }
  };

  // Touch and mouse event handlers for dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isMobile) {
      e.preventDefault();
      setIsDragging(true);
      dragStartY.current = e.clientY;
      dragStartHeight.current = chatHeight;
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isMobile) {
      e.preventDefault();
      setIsDragging(true);
      dragStartY.current = e.touches[0].clientY;
      dragStartHeight.current = chatHeight;
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging && isMobile) {
      const deltaY = dragStartY.current - e.clientY;
      const newHeight = Math.min(
        Math.max(dragStartHeight.current + deltaY, window.innerHeight * 0.4),
        window.innerHeight * 0.85,
      );
      setChatHeight(newHeight);
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (isDragging && isMobile) {
      e.preventDefault();
      const deltaY = dragStartY.current - e.touches[0].clientY;
      const newHeight = Math.min(
        Math.max(dragStartHeight.current + deltaY, window.innerHeight * 0.4),
        window.innerHeight * 0.85,
      );
      setChatHeight(newHeight);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.addEventListener("touchmove", handleTouchMove, {
        passive: false,
      });
      document.addEventListener("touchend", handleTouchEnd);

      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.removeEventListener("touchmove", handleTouchMove);
        document.removeEventListener("touchend", handleTouchEnd);
      };
    }
  }, [isDragging, isMobile]);

  useEffect(() => {
    return () => {
      cleanup();
      messages.forEach((message) => {
        if (message.audioUrl) {
          URL.revokeObjectURL(message.audioUrl);
        }
      });
    };
  }, [cleanup, messages]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const startNewConversation = () => {
    console.log("[Chatbot] Starting new conversation");
    // Clear current conversation ID first
    setCurrentConversationId(null);
    setMessages([
      {
        id: "welcome",
        content:
          "Hello! How can I assist you today? Feel free to ask me anything about our products or services.",
        role: "webhook",
        timestamp: new Date(),
        type: "text",
      },
    ]);
    setShowHomepage(false);

    // Refresh conversations cache after starting new conversation
    requestConversationsFromParent();
  };

  const startChatInterface = () => {
    setShowHomepage(false);
    // Clear current conversation ID to start fresh
    setCurrentConversationId(null);
    // Always show welcome message when starting new chat interface
    setMessages([
      {
        id: "welcome",
        content:
          "Hello! How can I assist you today? Feel free to ask me anything about our products or services.",
        role: "webhook",
        timestamp: new Date(),
        type: "text",
      },
    ]);
  };

  const loadConversationAndStartChat = async (conversationId: string) => {
    try {
      console.log(`[Chatbot] Loading conversation: ${conversationId}`);

      // Validate conversation ID
      if (!conversationId || typeof conversationId !== 'string') {
        console.error("[Chatbot] Invalid conversation ID:", conversationId);
        return;
      }

      setCurrentConversationId(conversationId);
      await loadConversationFromParent(conversationId);
      setShowHomepage(false);
    } catch (error) {
      console.error("[Chatbot] Error loading conversation:", error);
      // Reset state on error
      setCurrentConversationId(null);      setIsLoading(false);
    }
  };

  const trackAnalyticsEvent = (eventName: string, eventData: any = {}) => {
    const contextSessionId = window.shopifyContext?.session_id;
    const effectiveSessionId = contextSessionId || sessionId;

    if (!effectiveSessionId || effectiveSessionId.startsWith('fallback-')) {
      console.warn("Analytics event skipped: No valid session ID available.");
      return;
    }

    // Use the trackEvent function from useChat hook with proper session ID
    trackEvent(eventName, { ...eventData, sessionId: effectiveSessionId });
  };

  return (
    <Fragment>
      {/* Chat Widget Button - Minimalist Design */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            onClick={() => setIsOpen(true)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="relative h-14 w-14 rounded-full bg-black text-white hover:bg-gray-800 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border-0"
          >
            <MessageCircle className={`h-6 w-6 transition-all duration-300 ${isHovered ? "scale-110" : ""}`} />

            {/* Online indicator */}
            <div className="absolute -top-1 -right-1 h-4 w-4 bg-green-500 rounded-full border-2 border-white">
              <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-75"></div>
            </div>
          </Button>

          {/* Minimalist tooltip */}
          {isHovered && (
            <div className="absolute bottom-full right-0 mb-3 px-3 py-2 bg-black text-white text-sm rounded-lg opacity-0 animate-in fade-in duration-200 whitespace-nowrap">
              Chat with us
              <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black"></div>
            </div>
          )}
        </div>
      )}

      {/* Chat Widget - Sleek Minimalist Design */}
      {isOpen && (
        <div
          className={`fixed z-50 transition-all duration-300 ease-out ${
            isMobile ? "inset-x-0 bottom-0" : "bottom-6 right-6"
          }`}
          style={{
            width: isMobile ? "100%" : "600px",
            height: isMobile ? `${chatHeight}px` : "600px",
            maxHeight: isMobile ? "85vh" : "600px",
          }}
        >
          <Card className="h-full flex flex-col shadow-2xl bg-white border border-gray-200 rounded-2xl overflow-hidden">

            {/* Mobile Drag Handle */}
            {isMobile && (
              <div
                className="sticky top-0 z-20 flex items-center justify-center p-2 bg-white/95 backdrop-blur-sm border-b border-gray-200 cursor-grab active:cursor-grabbing"
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
              >
                <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
              </div>
            )}

            {/* Header - Only sticky in chat interface */}
            <CardHeader className={`flex flex-row items-center justify-between p-4 bg-white/95 backdrop-blur-sm border-b border-gray-100 ${!showHomepage ? 'sticky top-0 z-10 shadow-sm' : ''}`}>
              <div className="flex items-center space-x-3">
                {!showHomepage && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowHomepage(true)}
                    className="text-gray-600 hover:text-black hover:bg-gray-100 h-8 w-8 p-0 rounded-lg transition-all duration-200"
                  >
                    <ChevronDown className="h-4 w-4 rotate-90" />
                  </Button>
                )}
                <div className="h-10 w-10 bg-black rounded-full flex items-center justify-center">
                  <MessageCircle className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg">Support</h3>
                  <p className="text-sm text-gray-500 flex items-center space-x-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    <span>{isLoading ? "Typing..." : "Online"}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {!showHomepage && conversations.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={startNewConversation}
                    className="text-gray-600 hover:text-black hover:bg-gray-100 h-8 px-3 rounded-lg text-xs transition-all duration-200"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    New
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="text-gray-600 hover:text-black hover:bg-gray-100 h-8 w-8 p-0 rounded-lg transition-all duration-200"
                  title="Close chat"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>

            {/* Enhanced Homepage */}
            {showHomepage ? (
              <CardContent className="flex-1 flex flex-col p-0 bg-gradient-to-br from-gray-50 to-gray-100 overflow-y-auto">
                <div className="flex-1 flex flex-col">
                  {/* Hero Section */}
                  <div className="text-center p-6 pb-4">
                    <div className="relative mb-6">
                      <div className="h-20 w-20 mx-auto bg-gradient-to-r from-black to-gray-800 rounded-2xl flex items-center justify-center mb-4 shadow-lg transform hover:scale-105 transition-transform duration-300">
                        <MessageCircle className="h-10 w-10 text-white" />
                      </div>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Support</h2>
                    <p className="text-gray-600 leading-relaxed text-sm max-w-xs mx-auto">
                      Get instant help, find products, and receive personalized recommendations
                    </p>
                  </div>

                  {/* Quick Actions */}
                  <div className="px-6 mb-6">
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={startChatInterface}
                        className="p-4 bg-white rounded-xl border border-gray-200 hover:border-black hover:shadow-md transition-all duration-200 group"
                      >
                        <MessageCircle className="h-6 w-6 text-black mb-2 mx-auto group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-medium text-gray-900">New Chat</span>
                      </button>
                      {voiceSupported && (
                        <button
                          onClick={() => {
                            startChatInterface();
                            setTimeout(() => toggleRecording(), 500);
                          }}
                          className="p-4 bg-white rounded-xl border border-gray-200 hover:border-red-500 hover:shadow-md transition-all duration-200 group"
                        >
                          <Mic className="h-6 w-6 text-red-500 mb-2 mx-auto group-hover:scale-110 transition-transform" />
                          <span className="text-xs font-medium text-gray-900">Voice Chat</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Recent Conversations */}
                  <div className="flex-1 px-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Recent Chats</h3>
                      {conversations.length > 3 && (
                        <button className="text-xs text-gray-500 hover:text-gray-700">View All</button>
                      )}
                    </div>

                    {loadingConversations && !conversationsLoaded ? (
                      <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
                            <div className="flex items-center space-x-3">
                              <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                              <div className="flex-1">
                                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : conversations.length > 0 ? (
                      <div className="space-y-3 mb-6">
                        {conversations.slice(0, 3).map((conv, index) => (
                          <div key={conv.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-200 transform hover:-translate-y-1">
                            <button
                              onClick={() => loadConversationAndStartChat(conv.id)}
                              className="w-full text-left p-4 flex items-center justify-between group"
                            >
                              <div className="flex items-center space-x-3">
                                <div className="h-10 w-10 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                                  <MessageCircle className="h-5 w-5 text-gray-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-gray-900 text-sm truncate">
                                    {conv.title}
                                  </p>
                                  <p className="text-xs text-gray-500 flex items-center space-x-1">
                                    <span>{new Date(conv.started_at || conv.timestamp).toLocaleDateString()}</span>
                                    <span>•</span>
                                    <span>{new Date(conv.started_at || conv.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                  </p>
                                </div>
                              </div>
                              <ChevronDown className="h-4 w-4 text-gray-400 -rotate-90 group-hover:text-gray-600 transition-all duration-200 group-hover:translate-x-1" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : conversationsLoaded ? (
                      <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-8 text-center">
                        <div className="h-12 w-12 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-3">
                          <MessageCircle className="h-6 w-6 text-gray-400" />
                        </div>
                        <p className="text-sm text-gray-500">No conversations yet</p>
                      </div>
                    ) : null}
                  </div>

                  {/* Footer Actions */}
                  <div className="p-6 pt-0">
                    <Button
                      onClick={startChatInterface}
                      className="w-full h-12 bg-gradient-to-r from-black to-gray-800 hover:from-gray-800 hover:to-black text-white rounded-xl font-medium transition-all duration-300 transform hover:scale-105 shadow-lg"
                    >
                      <MessageCircle className="h-5 w-5 mr-2" />
                      Start New Conversation
                    </Button>

                    {/* Feature Pills */}
                    <div className="flex items-center justify-center space-x-4 mt-4">
                      <div className="flex items-center space-x-1 text-xs text-gray-500">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>Instant replies</span>
                      </div>
                      {voiceSupported && (
                        <div className="flex items-center space-x-1 text-xs text-gray-500">
                          <Mic className="h-3 w-3" />
                          <span>Voice support</span>
                        </div>
                      )}
                      <div className="flex items-center space-x-1 text-xs text-gray-500">
                        <Sparkles className="h-3 w-3" />
                        <span>AI powered</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            ) : (
              /* Chat Interface */
              <CardContent className="flex-1 flex flex-col p-0 bg-gray-50 overflow-hidden">
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-gray-50 chat-messages"
                     ref={messagesContainerRef}
                     style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                  {messages.length === 1 && messages[0].id === "welcome" && !isLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <div className="h-16 w-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                          <MessageCircle className="h-8 w-8 text-gray-600" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">Welcome!</h3>
                        <p className="text-gray-600 mb-6">How can we help you today?</p>
                        <div className="flex items-center justify-center space-x-4 text-sm text-gray-500">
                          <div className="flex items-center space-x-2">
                            <MessageCircle className="h-4 w-4" />
                            <span>Type a message</span>
                          </div>
                          {voiceSupported && (
                            <div className="flex items-center space-x-2">
                              <Mic className="h-4 w-4" />
                              <span>Voice message</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {messages.map((message, index) => (
                        <div
                          key={message.id}
                          className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} mb-3`}
                        >
                          <div className="flex items-start space-x-2 max-w-[85%]">
                            {message.role === "webhook" && (
                              <div className="h-7 w-7 rounded-full bg-black flex items-center justify-center flex-shrink-0 mt-0.5">
                                <Sparkles className="h-3.5 w-3.5 text-white" />
                              </div>
                            )}
                            <div
                              className={`rounded-2xl p-3 shadow-sm transition-all duration-200 ${
                                message.role === "user"
                                  ? "bg-black text-white ml-6"
                                  : "bg-white text-gray-900 border border-gray-200 hover:shadow-md"
                              }`}
                            >
                              {message.type === "voice" && (
                                <div className="mb-2">
                                  <div className="flex items-center space-x-2 mb-2">
                                    <Mic className="h-4 w-4 opacity-75" />
                                    <span className="text-xs opacity-75 font-medium">VOICE MESSAGE</span>
                                  </div>
                                  <StaticWaveform audioUrl={message.audioUrl} />
                                </div>
                              )}
                              <p className="text-sm leading-relaxed">{message.content}</p>
                              <p className={`text-xs mt-2 opacity-60`}>
                                {formatTime(message.timestamp)}
                              </p>

                              {message.cards && message.cards.length > 0 && (
                                <ProductCards
                                  cards={message.cards}
                                  addedProductVariantId={addedProductVariantId}
                                  onAddToCart={handleAddToCart}
                                  onProductClick={handleProductClick}
                                />
                              )}
                            </div>
                            {message.role === "user" && (
                              <div className="h-7 w-7 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <User className="h-3.5 w-3.5 text-gray-600" />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {isLoading && (
                        <div className="flex justify-start mb-3">
                          <div className="flex items-start space-x-2">
                            <div className="h-7 w-7 rounded-full bg-black flex items-center justify-center flex-shrink-0 mt-0.5">
                              <Sparkles className="h-3.5 w-3.5 text-white animate-pulse" />
                            </div>
                            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">
                              <TypingIndicator />
                            </div>
                          </div>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>
              </CardContent>
            )}

            {/* Recording Indicator - Enhanced */}
            {isRecording && (
              <div className="bg-gradient-to-r from-red-50 to-orange-50 border-b border-red-200 p-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
                      <div className="absolute inset-0 w-4 h-4 bg-red-400 rounded-full animate-ping opacity-75"></div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-red-700 text-sm font-semibold">Recording Voice Message</span>
                      <span className="text-red-600 text-xs">Release to send, tap again to cancel</span>
                    </div>
                    <div className="ml-4">
                      <AnimatedWaveform isRecording={isRecording} audioLevel={audioLevel} />
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="text-red-700 text-lg font-mono font-bold">
                      {formatDuration(recordingDuration)}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={stopRecording}
                      className="text-red-600 hover:text-red-800 hover:bg-red-100 h-6 px-2 text-xs"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Voice Error - Clean Alert */}
            {voiceError && (
              <div className="bg-orange-50 border-b border-orange-100 p-3">
                <div className="flex items-center space-x-3">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  <span className="text-orange-700 text-sm">{voiceError}</span>
                </div>
              </div>
            )}



            {/* Scroll to bottom button */}
            {showScrollToBottom && !showHomepage && (
              <Button
                variant="secondary"
                size="icon"
                onClick={scrollToBottom}
                className={`absolute right-4 h-9 w-9 rounded-full shadow-lg bg-white border border-gray-200 hover:bg-gray-50 hover:shadow-xl transition-all duration-200 z-20 ${
                  isRecording 
                    ? 'bottom-36'
                    : 'bottom-20'
                }`}
                aria-label="Scroll to bottom"
              >
                <ArrowUp className="h-4 w-4 rotate-180 text-gray-600" />
              </Button>
            )}

            {/* Input - Modern Minimalist - Only show in chat interface */}
            {!showHomepage && (
              <CardFooter className={`p-3 border-t border-gray-100 bg-white transition-all duration-200 ${
                isRecording ? 'bg-red-50/30' : ''
              }`}>
                <form onSubmit={(e) => {
                    e.preventDefault();
                    if (input.trim()) {
                      sendMessage(input, "text");
                      setInput("");
                    }
                  }} className="flex w-full space-x-2">
                  <div className="flex-1 relative">
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder={isRecording ? "🎤 Recording voice message..." : "Type your message..."}
                      disabled={isLoading || isRecording}
                      className={`h-11 rounded-xl border-gray-200 focus:border-black focus:ring-1 focus:ring-black transition-all duration-200 text-sm ${
                        isRecording 
                          ? "bg-red-50 border-red-200 text-red-700 placeholder:text-red-500" 
                          : "bg-gray-50 focus:bg-white hover:bg-white"
                      }`}
                    />
                    {isLoading && !isRecording && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-black rounded-full"></div>
                      </div>
                    )}
                  </div>

                  {voiceSupported && (
                    <Button
                      type="button"
                      variant={isRecording ? "destructive" : "outline"}
                      size="icon"
                      onClick={toggleRecording}
                      disabled={isLoading}
                      className={`h-11 w-11 p-0 rounded-xl transition-all duration-200 ${
                        isRecording
                          ? "bg-red-500 hover:bg-red-600 border-0 shadow-lg scale-105"
                          : "border-gray-200 hover:border-black hover:bg-gray-50"
                      }`}
                      title={isRecording ? "Stop recording" : "Start voice recording"}
                    >
                      {isRecording ? (
                        <div className="relative">
                          <Send className="h-5 w-5 text-white" />
                          <div className="absolute inset-0 rounded-full bg-white/20 animate-pulse"></div>
                        </div>
                      ) : (
                        <Mic className="h-5 w-5 text-gray-600" />
                      )}
                    </Button>
                  )}

                  <Button
                    type="submit"
                    disabled={!input.trim() || isLoading || isRecording}
                    className="h-11 px-5 rounded-xl bg-black hover:bg-gray-800 transition-all duration-200 disabled:opacity-50 text-sm font-medium"
                    title="Send message"
                  >
                    {isLoading && !isRecording ? (
                      <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                  </Button>
                </form>
              </CardFooter>
            )}
          </Card>
        </div>
      )}
    </Fragment>
  );
}