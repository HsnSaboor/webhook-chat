"use client";

import type React from "react";
import { ChevronDown, ArrowUp } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
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
  const [chatHeight, setChatHeight] = useState(600);
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
          console.log("[Chatbot] Received init data from parent:", messageData);
          setSessionId(messageData.session_id);
          setSessionReceived(true);
          console.log(
            "[Chatbot] Set session_id from parent:",
            messageData.session_id,
          );
          setSourceUrl(messageData.source_url || null);
          setPageContext(messageData.page_context || null);
          setCartCurrency(messageData.cart_currency || null);
          setLocalization(messageData.localization || null);
        } else if (messageData?.type === "conversations-response") {
          console.log(
            "[Chatbot] Received conversations from parent:",
            messageData.conversations,
          );
          setConversations(messageData.conversations || []);
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
          const webhookMessage: Message = {
            id: (Date.now() + 1).toString(),
            content: messageData.response.ai_message || messageData.response.message || "Response received",
            role: "webhook",
            timestamp: new Date(),
            type: "text",
            cards: messageData.response.cards || undefined,
          };
          setMessages((prev) => [...prev, webhookMessage]);
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
  }, [setSessionId, setSessionReceived, setSourceUrl, setPageContext, setCartCurrency, setLocalization, setMessages]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia
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

        // Request conversations list from parent
        requestConversationsFromParent();

        // Always show homepage first when opening chat
        setShowHomepage(true);
      } else {
        console.error("[Chatbot] Cannot open chat without proper Shopify session");
        setIsOpen(false); // Close chat if no proper session
      }
    } else if (!isOpen) {
      setMessages([]);
      setShowHomepage(true);
    }
  }, [isOpen, sessionId, sessionReceived, trackEvent, setMessages]);

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
      window.parent.postMessage(
        {
          type: "get-all-conversations",
        },
        "https://zenmato.myshopify.com",
      );
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

      // Convert history to messages
      const loadedMessages: Message[] = history
        .map((item: HistoryItem, index: number) => {
          const messages: Message[] = [];

          // Add user message if it exists
          if (item.user_message && item.user_message.trim()) {
            messages.push({
              id: `user-${conversationId}-${index}`,
              content: item.user_message,
              role: "user",
              timestamp: new Date(item.timestamp),
              type: "text",
            });
          }

          // Add AI message if it exists
          if (item.ai_message && item.ai_message.trim()) {
            messages.push({
              id: `ai-${conversationId}-${index}`,
              content: item.ai_message,
              role: "webhook",
              timestamp: new Date(item.timestamp),
              type: "text",
              cards: item.cards,
            });
          }

          return messages;
        })
        .flat();

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
    const audioUrl = URL.createObjectURL(audioBlob);
    const userMessage: Message = {
      id: Date.now().toString(),
      content: "Voice message",
      role: "user",
      timestamp: new Date(),
      type: "voice",
      audioUrl: audioUrl,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    trackEvent("message_sent", {
      type: "voice",
      duration,
      messageContent: "Voice message",
    });

    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(
        String.fromCharCode(...new Uint8Array(arrayBuffer)),
      );

      let eventType = "user_message";
      if (!sessionStorage.getItem("chat_started_logged")) {
        eventType = "chat_started";
        sessionStorage.setItem("chat_started_logged", "true");
      }

      const messageData = {
        id: crypto.randomUUID(),
        session_id: sessionId,
        timestamp: new Date().toISOString(),
        event_type: eventType,
        user_message: `Voice message (${duration}s)`,
        source_url: sourceUrl,
        page_context: pageContext,
        chatbot_triggered: true,
        conversion_tracked: false,
        type: "voice",
        audioData: base64Audio,
        mimeType: audioBlob.type,
        duration: duration,
        cart_currency: cartCurrency,
        localization: localization,
      };

      console.log("[Chatbot] Sending voice message to parent:", messageData);
      sendChatMessageToParent(messageData);

    } catch (error) {
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

      // Save new conversation to database
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
      } catch (error) {
        console.error("[Chatbot] Error saving conversation:", error);
      }
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
      await trackEvent("message_sent", {
        message: messageText,
        type,
        conversationId,
      });

      // Send only to n8n chat webhook (simplified payload)
      const chatWebhookUrl = process.env.NEXT_PUBLIC_N8N_CHAT_WEBHOOK || 
        "https://similarly-secure-mayfly.ngrok-free.app/webhook/chat";

      const webhookPayload = {
        session_id: sessionId,
        message: messageText,
        timestamp: new Date().toISOString(),
        conversation_id: conversationId,
        source_url: sourceUrl,
        page_context: pageContext,
        cart_currency: cartCurrency,
        localization: localization,
        type,
      };

      console.log("[Chatbot] Sending to n8n chat webhook:", webhookPayload);

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

      const data = await response.json();
      console.log("[Chatbot] Received chat webhook response:", data);

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

      // Save both user and AI messages to Supabase
      try {
        // Save user message
        await fetch('/api/messages/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversation_id: currentConversationId || `conv-${sessionId}-${Date.now()}`,
            session_id: sessionId,
            content: messageText,
            role: 'user',
            type: type,
            audio_url: audioBlob ? URL.createObjectURL(audioBlob) : null,
            timestamp: userMessage.timestamp.toISOString()
          })
        });

        // Save AI response
        await fetch('/api/messages/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversation_id: currentConversationId || `conv-${sessionId}-${Date.now()}`,
            session_id: sessionId,
            content: data.message,
            role: 'webhook',
            type: 'text',
            cards: data.cards,
            timestamp: webhookMessage.timestamp.toISOString()
          })
        });
      } catch (error) {
        console.error('Failed to save messages:', error);
      }

      setIsLoading(false);

      // Track the response received event
      await trackEvent("response_received", {
        response: webhookMessage.content,
        conversationId,
      });
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
      await trackEvent("message_error", {
        error: error instanceof Error ? error.message : "Unknown error",
        conversationId,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToCart = (card: ProductCardData) => {
    console.log(
      `[Chatbot] Attempting to send 'add-to-cart' message for variantId: ${card.variantId}`,
    );
    setAddedProductVariantId(card.variantId);

    setTimeout(() => {
      setAddedProductVariantId(null);
    }, 1500);

    trackEvent("add_to_cart", {
      variantId: card.variantId,
      productName: card.name,
      productPrice: card.price,
      source: "chatbot",
    });

    if (
      typeof window !== "undefined" &&
      window.parent &&
      window.parent !== window
    ) {
      const shopifyStoreDomain = "https://zenmato.myshopify.com";

      window.parent.postMessage(
        {
          type: "add-to-cart",
          payload: {
            variantId: card.variantId,
            quantity: 1,
            redirect: true,
          },
        },
        shopifyStoreDomain,
      );

      console.log(
        `[Chatbot] Sent postMessage to parent: type='add-to-cart', variantId=${card.variantId}, redirect=true, targetOrigin=${shopifyStoreDomain}`,
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
        Math.max(dragStartHeight.current + deltaY, 300),
        window.innerHeight * 0.9,
      );
      setChatHeight(newHeight);
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (isDragging && isMobile) {
      e.preventDefault();
      const deltaY = dragStartY.current - e.touches[0].clientY;
      const newHeight = Math.min(
        Math.max(dragStartHeight.current + deltaY, 300),
        window.innerHeight * 0.9,
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
    setCurrentConversationId(null);
    setShowHomepage(false);
  };

  const startChatInterface = () => {
    setShowHomepage(false);
    if (messages.length === 0) {
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
    }
  };

  const loadConversationAndStartChat = (conversationId: string) => {
    loadConversationFromParent(conversationId);
    setShowHomepage(false);
  };

  return (
    <>
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
            isMobile ? "inset-x-4 bottom-4" : "bottom-6 right-6 w-96"
          }`}
          style={{
            height: isMobile ? `${chatHeight}px` : "600px",
            maxHeight: isMobile ? "85vh" : "600px",
          }}
        >
          <Card className="h-full flex flex-col shadow-2xl bg-white border border-gray-200 rounded-2xl overflow-hidden">

            {/* Minimalist Header */}
            <CardHeader className="flex flex-row items-center justify-between p-4 bg-white border-b border-gray-100">
              <div className="flex items-center space-x-3">
                {!showHomepage && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowHomepage(true)}
                    className="text-gray-600 hover:text-black hover:bg-gray-100 h-8 w-8 p-0 rounded-lg"
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
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span>Online</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {!showHomepage && conversations.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={startNewConversation}
                    className="text-gray-600 hover:text-black hover:bg-gray-100 h-8 px-3 rounded-lg text-xs"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    New
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(){() => setIsOpen(false)}
                  className="text-gray-600 hover:text-black hover:bg-gray-100 h-8 w-8 p-0 rounded-lg"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>

            {/* Homepage or Chat Interface */}
            {showHomepage ? (
              /* Homepage */
              <CardContent className="flex-1 flex flex-col items-center justify-center p-6 bg-gray-50">
                <div className="text-center max-w-sm mx-auto">
                  {/* Welcome Message */}
                  <div className="mb-8">
                    <div className="h-20 w-20 mx-auto bg-black rounded-full flex items-center justify-center mb-6">
                      <MessageCircle className="h-10 w-10 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">Welcome to Support</h2>
                    <p className="text-gray-600 leading-relaxed">
                      Get instant help with your questions, find products, and get personalized recommendations.
                    </p>
                  </div>

                  {/* Recent Conversations */}
                  {conversations.length > 0 && (
                    <div className="mb-8">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Chats</h3>
                      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                        {conversations.slice(0, 3).map((conv, index) => (
                          <div key={conv.id}>
                            <button
                              onClick={() => loadConversationAndStartChat(conv.id)}
                              className="w-full text-left p-4 hover:bg-gray-50 transition-all duration-200 flex items-center justify-between group"
                            >
                              <div className="flex items-center space-x-3">
                                <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center">
                                  <MessageCircle className="h-5 w-5 text-gray-600" />
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900 text-sm">
                                    {conv.title || `Chat ${conv.id.slice(-4)}`}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {new Date(conv.started_at || conv.timestamp).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <ChevronDown className="h-4 w-4 text-gray-400 -rotate-90 group-hover:text-gray-600 transition-colors" />
                            </button>
                            {index < Math.min(conversations.length, 3) - 1 && (
                              <div className="h-px bg-gray-200"></div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Start New Chat Button */}
                  <div>
                    <Button
                      onClick={startChatInterface}
                      className="w-full h-12 bg-black hover:bg-gray-800 text-white rounded-xl font-medium transition-all duration-200 transform hover:scale-105"
                    >
                      <MessageCircle className="h-5 w-5 mr-2" />
                      Start New Chat
                    </Button>

                    {voiceSupported && (
                      <p className="text-xs text-gray-500 mt-3 flex items-center justify-center space-x-2">
                        <Mic className="h-3 w-3" />
                        <span>Voice messages supported</span>
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            ) : (
              /* Chat Interface */
              <>
                {/* Recording Indicator - Minimal */}
                {isRecording && (
                  <div className="bg-red-50 border-b border-red-100 p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                        <span className="text-red-700 text-sm font-medium">Recording...</span>
                        <AnimatedWaveform isRecording={isRecording} audioLevel={audioLevel} />
                      </div>
                      <div className="text-red-600 text-sm font-mono">
                        {formatDuration(recordingDuration)}
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

                {/* Messages - Clean Design */}
                <CardContent
                  ref={messagesContainerRef}
                  className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50"
                >
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
                          className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                          <div className="flex items-start space-x-2 max-w-[85%]">
                            {message.role === "webhook" && (
                              <div className="h-8 w-8 rounded-full bg-black flex items-center justify-center flex-shrink-0 mt-1">
                                <Sparkles className="h-4 w-4 text-white" />
                              </div>
                            )}
                            <div
                              className={`rounded-2xl p-3 ${
                                message.role === "user"
                                  ? "bg-black text-white ml-8"
                                  : "bg-white text-gray-900 border border-gray-200"
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
                                />
                              )}
                            </div>
                            {message.role === "user" && (
                              <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 mt-1">
                                <User className="h-4 w-4 text-gray-600" />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {isLoading && (
                        <div className="flex justify-start">
                          <div className="flex items-start space-x-2">
                            <div className="h-8 w-8 rounded-full bg-black flex items-center justify-center flex-shrink-0">
                              <Sparkles className="h-4 w-4 text-white" />
                            </div>
                            <div className="bg-white border border-gray-200 rounded-2xl">
                              <TypingIndicator />
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  <div ref={messagesEndRef} />
                </CardContent>
              </>
            )}

            {/* Scroll to bottom button */}
            {showScrollToBottom && (
              <Button
                variant="secondary"
                size="icon"
                onClick={scrollToBottom}
                className="absolute bottom-20 right-4 h-8 w-8 rounded-full shadow-lg bg-white border border-gray-200 hover:bg-gray-50"
                aria-label="Scroll to bottom"
              >
                <ArrowUp className="h-4 w-4 rotate-180" />
              </Button>
            )}

            {/* Input - Modern Minimalist - Only show in chat interface */}
            {!showHomepage && (
              <CardFooter className="p-4 border-t border-gray-100 bg-white">
                <form onSubmit={(e) => {
                    e.preventDefault();
                    if (input.trim()) {
                      sendMessage(input, "text");
                      setInput("");
                    }
                  }} className="flex w-full space-x-3">
                  <div className="flex-1 relative">
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder={isRecording ? "Recording your voice..." : "Type your message..."}
                      disabled={isLoading || isRecording}
                      className="h-12 rounded-xl border-gray-200 focus:border-black focus:ring-black transition-all duration-200 bg-gray-50 focus:bg-white"
                    />
                  </div>

                  {voiceSupported && (
                    <Button
                      type="button"
                      variant={isRecording ? "destructive" : "outline"}
                      size="lg"
                      onClick={toggleRecording}
                      disabled={isLoading}
                      className={`h-12 w-12 p-0 rounded-xl transition-all duration-200 ${
                        isRecording
                          ? "bg-red-500 hover:bg-red-600 border-0"
                          : "border-gray-200 hover:border-black hover:bg-gray-50"
                      }`}
                    >
                      {isRecording ? (
                        <Send className="h-5 w-5 text-white" />
                      ) : (
                        <Mic className="h-5 w-5 text-gray-600" />
                      )}
                    </Button>
                  )}

                  <Button
                    type="submit"
                    disabled={!input.trim() || isLoading || isRecording}
                    className="h-12 px-6 rounded-xl bg-black hover:bg-gray-800 transition-all duration-200 disabled:opacity-50"
                  >
                    <Send className="h-5 w-5" />
                  </Button>
                </form>
              </CardFooter>
            )}
          </Card>
        </div>
      )}
    </>
  );
}