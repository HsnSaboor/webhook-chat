
"use client";

import type React from "react";
import { ChevronDown, ArrowUp, ChevronRight } from "lucide-react";
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
  HelpCircle,
  Clock,
  Shield,
  Zap,
} from "lucide-react";

// Import modularized components
import { AnimatedWaveform } from "@/components/chat/AnimatedWaveform";
import { StaticWaveform } from "@/components/chat/StaticWaveform";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { ProductCards } from "@/components/chat/ProductCards";
import { useChat } from "@/components/chat/hooks/useChat";
import { useAudio } from "@/components/chat/hooks/useAudio";
import type { Message, ProductCardData, HistoryItem } from "@/components/chat/types";

// FAQ Data
const faqs = [
  {
    id: 1,
    question: "How does the AI chatbot work?",
    answer: "Our AI chatbot uses advanced natural language processing to understand your questions and provide helpful responses. It can assist with product recommendations, order inquiries, and general support questions in real-time.",
    icon: <Zap className="h-5 w-5" />
  },
  {
    id: 2,
    question: "Is my conversation data secure?",
    answer: "Yes, we take privacy seriously. All conversations are encrypted and stored securely. We only use your data to improve our service and provide better support. Your personal information is never shared with third parties.",
    icon: <Shield className="h-5 w-5" />
  },
  {
    id: 3,
    question: "Can I use voice messages?",
    answer: "Absolutely! You can send voice messages by clicking the microphone button. Our AI can process voice inputs and respond accordingly. Make sure to allow microphone permissions in your browser.",
    icon: <Mic className="h-5 w-5" />
  },
  {
    id: 4,
    question: "What are the chat hours?",
    answer: "Our AI chatbot is available 24/7 to assist you. For complex issues that require human support, our team is available Monday through Friday, 9 AM to 6 PM EST.",
    icon: <Clock className="h-5 w-5" />
  },
  {
    id: 5,
    question: "Can the chatbot help with product recommendations?",
    answer: "Yes! Our AI can analyze your preferences and browsing history to suggest products that match your needs. Just describe what you're looking for, and we'll provide personalized recommendations.",
    icon: <MessageCircle className="h-5 w-5" />
  },
  {
    id: 6,
    question: "How do I start a new conversation?",
    answer: "Simply click the chat button in the bottom right corner to open the chatbot. If you want to start fresh, click the 'New' button in the chat header to begin a new conversation.",
    icon: <Plus className="h-5 w-5" />
  }
];

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
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

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

  const loadConversationFromParent = (conversationId: string) => {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(
        {
          type: "get-single-conversation",
          payload: { conversationId },
        },
        "https://zenmato.myshopify.com",
      );
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

      const messageData = {
        id: crypto.randomUUID(),
        session_id: sessionId,
        timestamp: new Date().toISOString(),
        event_type: eventType,
        user_message: userMessageText,
        source_url: sourceUrl,
        page_context: pageContext,
        chatbot_triggered: true,
        conversion_tracked: false,
        type: "text",
        text: userMessageText,
        cart_currency: cartCurrency,
        localization: localization,
      };

      console.log("[Chatbot] Sending text message to parent:", messageData);
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
    requestConversationsFromParent();
  };

  const toggleFaq = (faqId: number) => {
    setExpandedFaq(expandedFaq === faqId ? null : faqId);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-black rounded-full mb-8">
              <MessageCircle className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              AI-Powered Support
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Get instant help with our intelligent chatbot. Available 24/7 to answer your questions 
              and help you find what you need.
            </p>
            <Button 
              onClick={() => setIsOpen(true)}
              className="bg-black hover:bg-gray-800 text-white px-8 py-4 text-lg rounded-xl"
            >
              Start Chatting
              <MessageCircle className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Zap className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Instant Responses</h3>
            <p className="text-gray-600">Get immediate answers to your questions with our AI-powered chatbot.</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Secure & Private</h3>
            <p className="text-gray-600">Your conversations are encrypted and your privacy is protected.</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Mic className="h-8 w-8 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Voice Support</h3>
            <p className="text-gray-600">Use voice messages for hands-free communication with our AI.</p>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-6">
              <HelpCircle className="h-8 w-8 text-gray-600" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-lg text-gray-600">
              Everything you need to know about our AI chatbot
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq) => (
              <Card key={faq.id} className="border border-gray-200 rounded-xl overflow-hidden transition-all duration-200 hover:shadow-md">
                <button
                  onClick={() => toggleFaq(faq.id)}
                  className="w-full text-left p-6 focus:outline-none focus:ring-2 focus:ring-black focus:ring-inset"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        {faq.icon}
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 pr-8">
                        {faq.question}
                      </h3>
                    </div>
                    <ChevronRight 
                      className={`h-5 w-5 text-gray-400 transform transition-transform duration-200 ${
                        expandedFaq === faq.id ? 'rotate-90' : ''
                      }`} 
                    />
                  </div>
                </button>
                
                {expandedFaq === faq.id && (
                  <div className="px-6 pb-6">
                    <div className="pl-14">
                      <p className="text-gray-700 leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-16 p-8 bg-black rounded-2xl">
          <h3 className="text-2xl font-bold text-white mb-4">
            Still have questions?
          </h3>
          <p className="text-gray-300 mb-6">
            Our AI chatbot is here to help you 24/7. Start a conversation now!
          </p>
          <Button 
            onClick={() => setIsOpen(true)}
            className="bg-white hover:bg-gray-100 text-black px-6 py-3 rounded-xl"
          >
            Chat with us now
            <MessageCircle className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

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
                {conversations.length > 0 && (
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
                  onClick={() => setIsOpen(false)}
                  className="text-gray-600 hover:text-black hover:bg-gray-100 h-8 w-8 p-0 rounded-lg"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>

            {/* Recent Conversations - Clean List */}
            {conversations.length > 0 && (
              <div className="bg-gray-50 border-b border-gray-100 p-3">
                <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                  {conversations.slice(0, 3).map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => loadConversationFromParent(conv.id)}
                      className="flex-shrink-0 bg-white hover:bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 hover:text-black transition-all duration-200"
                    >
                      {conv.title || `Chat ${conv.id.slice(-4)}`}
                    </button>
                  ))}
                </div>
              </div>
            )}

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

            {/* Input - Modern Minimalist */}
            <CardFooter className="p-4 border-t border-gray-100 bg-white">
              <form onSubmit={sendMessage} className="flex w-full space-x-3">
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
          </Card>
        </div>
      )}
    </div>
  );
}
