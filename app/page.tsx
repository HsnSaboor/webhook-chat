"use client";

import type React from "react";
import { ChevronDown } from "lucide-react";
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
  Zap,
  Star,
  Heart,
  User,
  Check,
} from "lucide-react";

// Import modularized components
import { AnimatedWaveform } from "@/components/chat/AnimatedWaveform";
import { StaticWaveform } from "@/components/chat/StaticWaveform";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { ParticleBackground } from "@/components/chat/ParticleBackground";
import { ProductCards } from "@/components/chat/ProductCards";
import { ConversationsList } from "@/components/chat/ConversationsList";
import { useChat } from "@/components/chat/hooks/useChat";
import { useAudio } from "@/components/chat/hooks/useAudio";
import { Message, ProductCardData, HistoryItem } from "@/components/chat/types";

export default function ChatWidget() {
  const {
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
  const [chatHeight, setChatHeight] = useState(500);
  const [isDragging, setIsDragging] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [addedProductVariantId, setAddedProductVariantId] = useState<string | null>(null);

  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  const webhookUrl =
    process.env.NEXT_PUBLIC_N8N_CHAT_WEBHOOK ||
    "https://similarly-secure-mayfly.ngrok-free.app/webhook/chat";

  // No fallback session ID - must receive from parent (Shopify)
  useEffect(() => {
    if (!sessionId && !sessionReceived) {
      const timeout = setTimeout(() => {
        if (!sessionId && !sessionReceived) {
          console.error(
            "[Chatbot] No session_id received from parent after 5 seconds. Cannot function without proper Shopify session.",
          );
          // Don't create fallback - chatbot should remain non-functional
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
          setConversations(Array.isArray(messageData.conversations) ? messageData.conversations : []);
        } else if (messageData?.type === "conversations-error") {
          console.error(
            "[Chatbot] Error fetching conversations from parent:",
            messageData.error,
          );
        } else if (messageData?.type === "conversation-history-response") {
          console.log(
            "[Chatbot] Received conversation history from parent:",
            messageData.history,
          );
          setMessages(messageData.history?.messages || []);
          setCurrentConversationId(messageData.conversationId);
        } else if (messageData?.type === "conversation-history-error") {
          console.error(
            "[Chatbot] Error fetching conversation history from parent:",
            messageData.error,
          );
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
        } else if (messageData?.type === "conversation-saved") {
          console.log(
            "[Chatbot] Conversation saved successfully via parent:",
            messageData.conversationId,
          );
        } else if (messageData?.type === "conversation-save-error") {
          console.error(
            "[Chatbot] Failed to save conversation via parent:",
            messageData.error,
          );
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [setSessionId, setSessionReceived, setSourceUrl, setPageContext, setCartCurrency, setLocalization, setConversations, setMessages, setCurrentConversationId]);

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
        fetchConversations();
        
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
      } else {
        console.error("[Chatbot] Cannot open chat without proper Shopify session");
        setIsOpen(false); // Close chat if no proper session
      }
    } else if (!isOpen) {
      setMessages([]);
      setCurrentConversationId(null);
    }
  }, [isOpen, sessionId, sessionReceived, trackEvent, setMessages, setCurrentConversationId]);

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

      const webhookPayload = {
        id: crypto.randomUUID(),
        session_id: sessionId,
        timestamp: new Date().toISOString(),
        event_type: eventType,
        user_message: `Voice message (${duration}s)`,
        webhookUrl: webhookUrl,
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

      console.log("[Chatbot] Sending webhook payload (voice):", webhookPayload);

      const response = await fetch("/api/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(webhookPayload),
      });

      const data = await response.json();
      console.log("[Chatbot] Received webhook response:", data);

      if (response.ok) {
        const webhookMessage: Message = {
          id: (Date.now() + 1).toString(),
          content:
            data.ai_message ||
            data.message ||
            data.response ||
            data.transcription ||
            "Voice message received successfully",
          role: "webhook",
          timestamp: new Date(),
          type: "text",
          cards: data.cards || undefined,
        };
        setMessages((prev) => [...prev, webhookMessage]);
      } else {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          content:
            "Sorry, I'm having trouble processing your voice message. Please try again.",
          role: "webhook",
          timestamp: new Date(),
          type: "text",
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "Connection error. Please check your internet and try again.",
        role: "webhook",
        timestamp: new Date(),
        type: "text",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const saveConversation = async (
    conversationId: string,
    sessionId: string,
  ) => {
    try {
      const payload = {
        id: crypto.randomUUID(),
        session_id: sessionId,
        conversation_id: conversationId,
        timestamp: new Date().toISOString(),
        event_type: "conversation_created",
        webhookUrl:
          "https://similarly-secure-mayfly.ngrok-free.app/webhook/save-conversation",
        source_url: sourceUrl || "https://zenmato.myshopify.com/",
        page_context: pageContext || "Chat Widget",
        chatbot_triggered: true,
        conversion_tracked: false,
        cart_currency: cartCurrency,
        localization: localization,
        user_message: "Conversation started",
        type: "conversation",
        name: `Chat ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
      };

      console.log("[Chatbot] Saving conversation with payload:", payload);

      const response = await fetch("/api/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Unknown error" }));
        console.error("Failed to save conversation:", errorData);
      } else {
        console.log("[Chatbot] Conversation saved successfully");
        setTimeout(() => {
          console.log("[Chatbot] Refreshing conversations after save");
          fetchConversations();
        }, 2000);
      }
    } catch (error) {
      console.error("Error saving conversation:", error);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessageText = input.trim();
    const userMessage: Message = {
      id: Date.now().toString(),
      content: userMessageText,
      role: "user",
      timestamp: new Date(),
      type: "text",
    };

    setMessages((prev) => [...prev, userMessage]);
    trackEvent("message_sent", {
      type: "text",
      messageContent: userMessageText,
    });
    setInput("");
    setIsLoading(true);

    try {
      let eventType = "user_message";
      if (!sessionStorage.getItem("chat_started_logged")) {
        eventType = "chat_started";
        sessionStorage.setItem("chat_started_logged", "true");
      }

      console.log(
        "[Chatbot] Current sessionId state before sending:",
        sessionId,
      );

      let newConversationId = currentConversationId;
      if (!currentConversationId) {
        newConversationId = crypto.randomUUID();
        setCurrentConversationId(newConversationId);

        if (sessionId) {
          await saveConversation(newConversationId, sessionId);
        }
      }

      const webhookPayload = {
        id: crypto.randomUUID(),
        session_id: sessionId,
        timestamp: new Date().toISOString(),
        event_type: eventType,
        user_message: userMessageText,
        webhookUrl: webhookUrl,
        source_url: sourceUrl,
        page_context: pageContext,
        chatbot_triggered: true,
        conversion_tracked: false,
        type: "text",
        text: userMessageText,
        cart_currency: cartCurrency,
        localization: localization,
      };

      console.log("[Chatbot] Sending webhook payload (text):", webhookPayload);

      const response = await fetch("/api/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(webhookPayload),
      });

      const data = await response.json();
      console.log("[Chatbot] Received webhook response:", data);

      if (response.ok) {
        const webhookMessage: Message = {
          id: (Date.now() + 1).toString(),
          content:
            data.ai_message ||
            data.message ||
            data.response ||
            data.transcription ||
            "Message received successfully",
          role: "webhook",
          timestamp: new Date(),
          type: "text",
          cards: data.cards || undefined,
        };
        setMessages((prev) => [...prev, webhookMessage]);
      } else {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          content:
            "Sorry, I'm having trouble responding right now. Please try again.",
          role: "webhook",
          timestamp: new Date(),
          type: "text",
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "Connection error. Please check your internet and try again.",
        role: "webhook",
        timestamp: new Date(),
        type: "text",
      };
      setMessages((prev) => [...prev, errorMessage]);
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

  useEffect(() => {
    if (sessionId) {
      fetchConversations();
    }
  }, [sessionId]);

  const fetchConversations = async () => {
    if (!sessionId) {
      console.warn(
        "[Chatbot] Cannot fetch conversations: No session ID available",
      );
      return;
    }

    setLoadingConversations(true);
    console.log("[Chatbot] Fetching conversations for session:", sessionId);

    try {
      const response = await fetch(
        `/api/conversations?session_id=${encodeURIComponent(sessionId)}&t=${Date.now()}`,
        {
          headers: {
            "Cache-Control": "no-cache",
          },
        },
      );
      console.log("[Chatbot] API response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("[Chatbot] Raw conversations data:", data);

        const conversationsArray = Array.isArray(data)
          ? data
          : data.conversations || [];
        console.log(
          "[Chatbot] Processed conversations array:",
          conversationsArray,
        );

        if (conversationsArray.length === 0) {
          console.warn(
            "[Chatbot] No conversations found. This might indicate:",
          );
          console.warn(
            "1. The conversation wasn't saved properly to the database",
          );
          console.warn(
            "2. The n8n get-conversations workflow isn't finding the data",
          );
          console.warn(
            "3. There's a field mapping issue between save and retrieve",
          );
        }

        setConversations(conversationsArray.slice(0, 3));
        console.log(
          "[Chatbot] Successfully fetched conversations via API:",
          conversationsArray.length,
          "conversations",
        );
        setLoadingConversations(false);
        return;
      } else {
        const errorText = await response.text();
        console.warn(
          "[Chatbot] API route failed with status:",
          response.status,
          "Error:",
          errorText,
        );
      }
    } catch (error) {
      console.warn("[Chatbot] API route error:", error);
    }

    if (window.parent && window.parent !== window) {
      console.log(
        "[Chatbot] Requesting conversations from parent window for session:",
        sessionId,
      );
      window.parent.postMessage(
        {
          type: "get-conversations",
          session_id: sessionId,
        },
        "https://zenmato.myshopify.com",
      );

      setTimeout(() => {
        if (loadingConversations) {
          console.warn(
            "[Chatbot] Timeout waiting for conversations from parent",
          );
          setLoadingConversations(false);
        }
      }, 10000);
    } else {
      console.log(
        "[Chatbot] Not in iframe context, setting empty conversations",
      );
      setConversations([]);
      setLoadingConversations(false);
    }
  };

  const loadConversationHistory = async (conversationId: string) => {
    if (!sessionId) {
      console.warn(
        "[Chatbot] Cannot load conversation history: No session ID available",
      );
      return;
    }

    setLoadingHistory(true);
    console.log("[Chatbot] Loading conversation history for:", conversationId);

    try {
      const response = await fetch(
        `/api/conversations/${conversationId}?session_id=${encodeURIComponent(sessionId)}`,
      );
      console.log("[Chatbot] History API response status:", response.status);

      if (response.ok) {
        const history: HistoryItem[] = await response.json();
        console.log(
          "[Chatbot] Successfully fetched conversation history:",
          history.length,
          "items",
        );

        const historyMessages: Message[] = [];
        history.forEach((item, index) => {
          if (item.user_message) {
            historyMessages.push({
              id: `history-user-${index}`,
              content: item.user_message,
              role: "user",
              timestamp: new Date(item.timestamp),
              type: "text",
            });
          }
          if (item.ai_message) {
            historyMessages.push({
              id: `history-ai-${index}`,
              content: item.ai_message,
              role: "webhook",
              timestamp: new Date(item.timestamp),
              type: "text",
              cards: item.cards || undefined,
            });
          }
        });

        setMessages(historyMessages);
        setCurrentConversationId(conversationId);
        setLoadingHistory(false);
        return;
      } else {
        const errorText = await response.text();
        console.warn(
          "[Chatbot] History API failed with status:",
          response.status,
          "Error:",
          errorText,
        );
      }
    } catch (error) {
      console.error(
        "[Chatbot] Error loading conversation history via API:",
        error,
      );
    }

    if (window.parent && window.parent !== window) {
      console.log(
        "[Chatbot] Requesting conversation history from parent window",
      );
      window.parent.postMessage(
        {
          type: "get-conversation-history",
          payload: { conversationId },
        },
        "https://zenmato.myshopify.com",
      );

      setTimeout(() => {
        if (loadingHistory) {
          console.warn(
            "[Chatbot] Timeout waiting for conversation history from parent",
          );
          setLoadingHistory(false);
        }
      }, 10000);
    } else {
      setLoadingHistory(false);
    }
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
    setLoadingConversations(false);
    if (sessionId) {
      console.log(
        "[Chatbot] Refreshing conversations list after starting new conversation",
      );
      setTimeout(() => {
        fetchConversations();
      }, 100);
    }
  };

  useEffect(() => {
    if (sessionId && sessionReceived && !currentConversationId && isOpen && messages.length === 1 && messages[0]?.id === "welcome") {
      // Only proceed if we have a proper Shopify session ID (UUID format)
      const isValidShopifySession = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionId);
      
      if (isValidShopifySession && sessionId === '78ddfd09-7df6-4750-8e83-41e67f9b21b9') {
        const newConversationId = crypto.randomUUID();
        setCurrentConversationId(newConversationId);
        console.log(
          "[Chatbot] Generated new conversation ID:",
          newConversationId,
        );
        console.log("[Chatbot] Saving conversation on initialization");

        // Add a small delay to prevent race conditions
        setTimeout(() => {
          saveConversation(newConversationId, sessionId);
        }, 500);
      } else {
        console.error("[Chatbot] Invalid session ID format or not the expected Shopify session. Not initializing conversation.");
        setIsOpen(false); // Force close if invalid session
      }
    }
  }, [sessionId, sessionReceived, currentConversationId, isOpen, messages, setCurrentConversationId]);

  return (
    <>
      {/* Chat Widget Button */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50">
          <div className="relative group">
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 animate-pulse-glow opacity-75"></div>
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 animate-gradient-xy opacity-50"></div>

            <Button
              onClick={() => setIsOpen(true)}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              className="relative h-20 w-20 rounded-full bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 hover:from-purple-700 hover:via-blue-700 hover:to-indigo-700 shadow-2xl hover:shadow-neon transition-all duration-700 transform hover:scale-110 border-4 border-white/40 backdrop-blur-md animate-float group-hover:animate-bounce-in"
            >
              <MessageCircle
                className={`h-9 w-9 text-white transition-all duration-500 ${isHovered ? "scale-125 rotate-12" : ""}`}
              />

              <div className="absolute -top-2 -right-2 h-6 w-6 bg-gradient-to-r from-red-500 to-pink-500 rounded-full border-3 border-white shadow-xl animate-bounce-in">
                <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-red-400 to-pink-400 rounded-full animate-pulse"></div>
                <Heart className="h-3 w-3 text-white absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
              </div>
            </Button>

            <div className="absolute bottom-full right-0 mb-6 px-6 py-4 bg-gradient-to-r from-gray-900 via-purple-900 to-gray-900 backdrop-blur-2xl text-white text-sm rounded-3xl opacity-0 group-hover:opacity-100 transition-all duration-500 whitespace-nowrap shadow-2xl border border-white/20 transform group-hover:scale-105 group-hover:-translate-y-2">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full animate-pulse shadow-lg shadow-green-400/50"></div>
                <MessageCircle className="h-5 w-5 animate-bounce" />
                <span className="font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  Chat with us - We're online!
                </span>
                <div className="flex space-x-1">
                  <Sparkles className="h-4 w-4 text-yellow-400 animate-pulse" />
                  <Zap className="h-4 w-4 text-blue-400 animate-bounce" />
                </div>
              </div>
              <div className="absolute top-full right-10 w-0 h-0 border-l-6 border-r-6 border-t-6 border-transparent border-t-gray-900"></div>
            </div>
          </div>
        </div>
      )}

      {/* Chat Widget */}
      {isOpen && (
        <div
          className={`fixed z-50 transition-all duration-1000 ease-out ${
            isMobile ? "inset-x-4 bottom-4" : "bottom-6 right-6 w-96"
          }`}
          style={{
            height: isMobile ? `${chatHeight}px` : "700px",
            maxHeight: isMobile ? "85vh" : "700px",
          }}
        >
          <Card className="h-full flex flex-col shadow-2xl animate-in slide-in-from-bottom-8 fade-in duration-1000 border-0 overflow-hidden bg-gradient-to-b from-white/95 via-white/90 to-white/95 backdrop-blur-3xl rounded-3xl relative">
            <ParticleBackground />

            {/* Header */}
            <CardHeader className="flex flex-row items-center justify-between p-6 bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-700 text-white rounded-t-3xl relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600/90 via-blue-600/90 to-indigo-700/90 animate-gradient-xy"></div>
              <div className="absolute inset-0 bg-gradient-to-br from-pink-500/20 via-purple-500/20 to-blue-500/20 animate-gradient-x"></div>

              <div className="flex items-center space-x-5 mt-2 relative z-10">
                <div className="relative">
                  <div className="h-12 w-12 bg-white/25 rounded-full flex items-center justify-center backdrop-blur-md border-2 border-white/40 shadow-xl animate-pulse-glow">
                    <MessageCircle className="h-6 w-6 animate-bounce" />
                  </div>
                  <div className="absolute -top-1 -right-1 h-5 w-5 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full border-2 border-white shadow-lg animate-bounce-in">
                    <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-40"></div>
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-xl tracking-wide bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent">
                    AI Support
                  </h3>
                  <p className="text-sm text-white/95 font-semibold flex items-center space-x-2">
                    <span>Always here to help you!</span>
                    <Sparkles className="h-4 w-4 animate-pulse" />
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 mt-2 relative z-10">
                {currentConversationId && messages.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={startNewConversation}
                    className="text-white hover:bg-white/25 h-12 w-12 p-0 rounded-full transition-all duration-500 hover:scale-110 backdrop-blur-md border-2 border-white/30 hover:shadow-neon"
                    title="Back to home"
                  >
                    <ChevronDown className="h-6 w-6 rotate-90" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="text-white hover:bg-white/25 h-12 w-12 p-0 rounded-full transition-all duration-500 hover:scale-110 backdrop-blur-md border-2 border-white/30 hover:shadow-neon"
                >
                  <X className="h-6 w-6" />
                </Button>
              </div>
            </CardHeader>

            {/* Recording Indicator */}
            {isRecording && (
              <div className="bg-gradient-to-r from-red-50 via-pink-50 to-red-50 border-b-2 border-red-200/50 p-5 animate-in slide-in-from-top-4 duration-700 backdrop-blur-md px-5 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <div className="w-6 h-6 bg-gradient-to-r from-red-500 to-pink-500 rounded-full animate-pulse shadow-xl shadow-red-500/50"></div>
                      <div className="absolute inset-0 w-6 h-6 bg-red-500 rounded-full animate-ping opacity-40"></div>
                    </div>
                    <span className="text-red-700 font-bold bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent text-sm">
                      Recording...
                    </span>
                    <AnimatedWaveform
                      isRecording={isRecording}
                      audioLevel={audioLevel}
                    />
                  </div>
                  <div className="text-red-600 font-mono font-bold backdrop-blur-md animate-pulse-glow text-base bg-transparent border-solid border-red-300 rounded-full shadow-2xl border-2 px-1.5 py-1">
                    {formatDuration(recordingDuration)}
                  </div>
                </div>
              </div>
            )}

            {/* Voice Error Display */}
            {voiceError && (
              <div className="bg-gradient-to-r from-orange-50 via-yellow-50 to-orange-50 border-b-2 border-orange-200/50 p-5 animate-in slide-in-from-top-2 duration-500 backdrop-blur-md">
                <div className="flex items-center space-x-4">
                  <AlertCircle className="h-6 w-6 text-orange-600 animate-bounce" />
                  <span className="text-orange-700 text-sm font-semibold bg-gradient-to-r from-orange-600 to-orange-800 bg-clip-text text-transparent">
                    {voiceError}
                  </span>
                </div>
              </div>
            )}

            {/* Messages */}
            <CardContent
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto p-6 space-y-5 bg-gradient-to-b from-gray-50/40 via-white/60 to-gray-50/40 backdrop-blur-md relative"
            >
              {messages.length === 1 &&
              messages[0].id === "welcome" &&
              !isLoading ? (
                <div className="flex items-center justify-center h-full text-gray-500 relative">
                  <div className="text-center animate-in fade-in duration-1500">
                    <div className="relative mb-10">
                      <div className="h-24 w-24 mx-auto bg-gradient-to-r from-purple-100 via-blue-100 to-indigo-100 rounded-full flex items-center justify-center shadow-2xl animate-float">
                        <MessageCircle className="h-12 w-12 text-purple-600 animate-bounce" />
                      </div>
                      <div className="absolute inset-0 h-24 w-24 mx-auto border-4 border-purple-200 rounded-full animate-ping opacity-40"></div>
                      <div className="absolute inset-0 h-24 w-24 mx-auto bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-full animate-pulse"></div>
                    </div>
                    <h3 className="text-3xl font-bold mb-4 bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent animate-shimmer">
                      Welcome to AI Support!
                    </h3>
                    <p className="text-gray-700 mb-8 font-semibold text-lg">
                      How can we assist you today?
                    </p>
                    <div className="flex items-center justify-center space-x-8 text-sm text-gray-600">
                      <div className="flex items-center space-x-3 bg-white/80 px-5 py-3 rounded-full backdrop-blur-md border-2 border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                        <MessageCircle className="h-5 w-5 text-blue-500 animate-pulse" />
                        <span className="font-semibold">Type a message</span>
                      </div>
                      {voiceSupported && (
                        <div className="flex items-center space-x-3 bg-white/80 px-5 py-3 rounded-full backdrop-blur-md border-2 border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                          <Mic className="h-5 w-5 text-purple-500 animate-bounce" />
                          <span className="font-semibold">Record voice</span>
                        </div>
                      )}
                    </div>

                    <ConversationsList
                      conversations={conversations}
                      loadingConversations={loadingConversations}
                      loadingHistory={loadingHistory}
                      onLoadConversation={loadConversationHistory}
                      onStartNewConversation={startNewConversation}
                    />
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((message, index) => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} animate-in slide-in-from-bottom-4 fade-in duration-600`}
                      style={{ animationDelay: `${index * 150}ms` }}
                    >
                      {message.role === "user" && (
                        <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mr-3 shadow-md">
                          <User className="h-5 w-5 text-primary-foreground" />
                        </div>
                      )}
                      <div
                        className={`max-w-[85%] rounded-3xl p-5 shadow-xl transition-all duration-500 hover:shadow-2xl transform hover:scale-[1.02] message-bubble border-solid border-2 py-2.5 ${
                          message.role === "user"
                            ? "bg-gradient-to-r from-purple-500 via-blue-600 to-indigo-600 text-white shadow-purple-200 border-2 border-white/30"
                            : "bg-gradient-to-r from-white/95 via-gray-50/95 to-white/95 text-gray-900 border-2 border-gray-200/50 shadow-gray-200 backdrop-blur-md"
                        }`}
                      >
                        {message.type === "voice" && (
                          <div className="mb-3">
                            <div className="flex items-center space-x-3 mb-4">
                              <Mic className="h-5 w-5 opacity-75 animate-pulse" />
                              <span className="text-sm opacity-90 font-bold tracking-wider bg-gradient-to-r from-current to-current/80 bg-clip-text text-transparent">
                                VOICE MESSAGE
                              </span>
                              <div className="flex space-x-1">
                                <div className="w-2 h-2 bg-current rounded-full animate-bounce opacity-60"></div>
                                <div
                                  className="w-2 h-2 bg-current rounded-full animate-bounce opacity-60"
                                  style={{ animationDelay: "0.1s" }}
                                ></div>
                                <div
                                  className="w-2 h-2 bg-current rounded-full animate-bounce opacity-60"
                                  style={{ animationDelay: "0.2s" }}
                                ></div>
                              </div>
                            </div>
                            <StaticWaveform audioUrl={message.audioUrl} />
                          </div>
                        )}
                        <p className="whitespace-pre-wrap text-base leading-relaxed font-semibold">
                          {message.content}
                        </p>
                        <p
                          className={`text-sm mt-4 font-semibold flex items-center space-x-2 ${
                            message.role === "user"
                              ? "text-blue-100"
                              : "text-gray-500"
                          }`}
                        >
                          <span>{formatTime(message.timestamp)}</span>
                          {message.role === "webhook" && (
                            <Sparkles className="h-3 w-3 animate-pulse" />
                          )}
                        </p>

                        {message.cards && message.cards.length > 0 && (
                          <ProductCards
                            cards={message.cards}
                            addedProductVariantId={addedProductVariantId}
                            onAddToCart={handleAddToCart}
                          />
                        )}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start animate-in slide-in-from-bottom-4 fade-in duration-500">
                      <div className="bg-gradient-to-r from-white/95 via-gray-50/95 to-white/95 text-gray-900 rounded-3xl shadow-xl border-2 border-gray-200/50 backdrop-blur-md">
                        <TypingIndicator />
                      </div>
                    </div>
                  )}
                </>
              )}
              <div ref={messagesEndRef} />
            </CardContent>

            {/* Scroll to bottom button */}
            {showScrollToBottom && (
              <Button
                variant="secondary"
                size="icon"
                onClick={scrollToBottom}
                className="absolute bottom-[80px] right-6 h-10 w-10 rounded-full shadow-lg animate-bounce-in z-20"
                aria-label="Scroll to bottom"
              >
                <ChevronDown className="h-5 w-5" />
              </Button>
            )}

            {/* Input */}
            <CardFooter className="p-6 border-t-2 border-gray-200/50 bg-gradient-to-r from-white/90 via-gray-50/90 to-white/90 backdrop-blur-2xl">
              <form onSubmit={sendMessage} className="flex w-full space-x-4">
                <div className="flex-1 relative">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={
                      isRecording
                        ? "Recording your voice..."
                        : "Type your message..."
                    }
                    disabled={isLoading || isRecording}
                    className="pr-4 h-14 rounded-3xl border-3 border-gray-300/50 focus:border-purple-500 transition-all duration-500 bg-white/95 backdrop-blur-md shadow-lg hover:shadow-xl font-semibold placeholder:text-gray-500 text-base focus-ring"
                  />
                </div>

                {voiceSupported && (
                  <Button
                    type="button"
                    variant={isRecording ? "destructive" : "outline"}
                    size="lg"
                    onClick={toggleRecording}
                    disabled={isLoading}
                    className={`h-14 w-14 p-0 rounded-3xl transition-all duration-500 transform hover:scale-110 shadow-xl ${
                      isRecording
                        ? "bg-gradient-to-r from-red-500 via-pink-500 to-red-600 hover:from-red-600 hover:via-pink-600 hover:to-red-700 shadow-red-200 animate-pulse border-0 hover:shadow-neon"
                        : "border-3 border-gray-400/50 hover:border-purple-500 hover:bg-purple-50 bg-white/95 backdrop-blur-md shadow-gray-200 hover:shadow-glow-purple"
                    }`}
                  >
                    {isRecording ? (
                      <div className="flex items-center justify-center">
                        <Send className="h-6 w-6 text-white animate-bounce drop-shadow-lg" />
                      </div>
                    ) : (
                      <Mic className="h-6 w-6 text-gray-600 hover:text-purple-600 transition-colors duration-300" />
                    )}
                  </Button>
                )}

                <Button
                  type="submit"
                  disabled={!input.trim() || isLoading || isRecording}
                  className="h-14 px-8 rounded-3xl bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 hover:from-purple-700 hover:via-blue-700 hover:to-indigo-700 transition-all duration-500 transform hover:scale-110 shadow-xl shadow-purple-200 disabled:opacity-50 disabled:cursor-not-allowed border-0 font-bold hover:shadow-neon"
                >
                  <Send className="h-6 w-6" />
                </Button>
              </form>
            </CardFooter>
          </Card>
        </div>
      )}

      {loadingHistory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-xl max-w-sm w-full mx-4">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Loading conversation history...
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Please wait while we restore your chat
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}