"use client";

import type React from "react";
import { ChevronDown } from "lucide-react"; // Added ChevronDown import
import { useState, useRef, useEffect, useCallback } from "react"; // Added useCallback
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
  Volume2,
  AlertCircle,
  Sparkles,
  Zap,
  Star,
  Heart,
  User,
  Check,
} from "lucide-react"; // Added User, Check

// Define interface for product card data
interface ProductCardData {
  image: string;
  name: string;
  price: string;
  variantId: string;
  productUrl?: string; // Added productUrl
}

interface Message {
  id: string;
  content: string;
  role: "user" | "webhook";
  timestamp: Date;
  type: "text" | "voice";
  audioUrl?: string;
  cards?: ProductCardData[];
}

interface Conversation {
  conversation_id: string;
  name: string;
  started_at: string;
  ended_at?: string;
}

interface HistoryItem {
  event_type: string;
  user_message: string;
  ai_message: string;
  cards?: ProductCardData[];
  timestamp: string;
}

// Enhanced Animated Waveform Component with Audio Levels
const AnimatedWaveform = ({
  isRecording,
  audioLevel = 0,
}: {
  isRecording: boolean;
  audioLevel?: number;
}) => {
  const bars = Array.from({ length: 12 }, (_, i) => i);

  return (
    <div className="flex items-center justify-center space-x-1.5 bg-gradient-to-r from-red-500/20 via-pink-500/20 to-red-500/20 rounded-full backdrop-blur-md border border-red-300/30 h-8 px-2">
      {bars.map((bar) => {
        const baseHeight = 6;
        const maxHeight = 36;
        const randomMultiplier = Math.random() * 0.8 + 0.2;
        const levelMultiplier = isRecording
          ? audioLevel * randomMultiplier + 0.3
          : 0.2;
        const height = Math.min(
          baseHeight + (maxHeight - baseHeight) * levelMultiplier,
          maxHeight,
        );

        return (
          <div
            key={bar}
            className={`w-1.5 bg-gradient-to-t from-red-500 via-pink-400 to-red-300 rounded-full transition-all duration-200 ${
              isRecording ? "animate-waveform shadow-lg shadow-red-500/30" : ""
            }`}
            style={{
              height: `${height}px`,
              animationDelay: `${bar * 80}ms`,
              animationDuration: `${Math.random() * 400 + 500}ms`,
              filter: isRecording
                ? "drop-shadow(0 0 4px rgba(239, 68, 68, 0.6))"
                : "none",
            }}
          />
        );
      })}
    </div>
  );
};

// Enhanced Static Waveform Component with Playback
const StaticWaveform = ({ audioUrl }: { audioUrl?: string }) => {
  const bars = Array.from({ length: 24 }, (_, i) => i);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlayback = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  return (
    <div className="relative">
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onEnded={() => setIsPlaying(false)}
          onError={() => setIsPlaying(false)}
        />
      )}

      <div className="flex items-center p-4 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 rounded-2xl backdrop-blur-md border border-white/30 shadow-lg px-3 space-x-3">
        {audioUrl && (
          <Button
            variant="ghost"
            size="sm"
            onClick={togglePlayback}
            className="h-10 w-10 p-0 hover:bg-white/30 rounded-full transition-all duration-300 hover:scale-110 shadow-lg hover:shadow-neon border-solid border-slate-300 border-2"
          >
            <Volume2
              className={`h-5 w-5 transition-all duration-300 ${isPlaying ? "animate-pulse text-blue-400 scale-110" : "text-white/90"}`}
            />
          </Button>
        )}

        <div className="flex items-center flex-1 relative space-x-0.5">
          {bars.map((bar) => (
            <div
              key={bar}
              className={`w-1 bg-gradient-to-t from-blue-400 via-purple-400 to-pink-400 rounded-full transition-all duration-300 hover:scale-110 relative z-10 ${
                isPlaying ? "animate-pulse" : ""
              }`}
              style={{
                height: `${Math.random() * 20 + 8}px`,
                opacity: isPlaying ? Math.random() * 0.5 + 0.5 : 0.7,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// Loading Skeleton for AI replies
const MessageSkeleton = () => (
  <div className="flex items-start space-x-3 animate-pulse">
    <div className="flex-1 space-y-2">
      <div className="h-4 bg-secondary rounded w-3/4"></div>
      <div className="h-4 bg-secondary rounded w-1/2"></div>
    </div>
  </div>
);

// Enhanced Typing indicator with multiple effects
const TypingIndicator = () => (
  <div className="flex items-center space-x-4 p-5">
    <div className="flex space-x-2">
      <div
        className="w-3 h-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-bounce shadow-lg shadow-blue-500/30"
        style={{ animationDelay: "0ms" }}
      ></div>
      <div
        className="w-3 h-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full animate-bounce shadow-lg shadow-purple-500/30"
        style={{ animationDelay: "200ms" }}
      ></div>
      <div
        className="w-3 h-3 bg-gradient-to-r from-pink-500 to-blue-500 rounded-full animate-bounce shadow-lg shadow-pink-500/30"
        style={{ animationDelay: "400ms" }}
      ></div>
    </div>
    <span className="text-sm text-gray-700 font-semibold bg-gradient-to-r from-gray-600 to-gray-800 bg-clip-text text-transparent">
      AI is crafting your response
    </span>
    <div className="flex space-x-1">
      <Sparkles className="h-4 w-4 text-yellow-500 animate-pulse" />
      <Zap className="h-4 w-4 text-blue-500 animate-bounce" />
      <Star className="h-4 w-4 text-purple-500 animate-pulse" />
    </div>
  </div>
);

// Particle Background Component
const ParticleBackground = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {Array.from({ length: 9 }, (_, i) => (
      <div key={i} className="particle" />
    ))}
  </div>
);

export default function ChatWidget() {
  const [sessionId, setSessionId] = useState<string>("");
  const [sessionReceived, setSessionReceived] = useState(false);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [pageContext, setPageContext] = useState<string | null>(null);
  const [cartCurrency, setCartCurrency] = useState<string | null>(null);
  const [localization, setLocalization] = useState<string | null>(null);

  // Fallback session ID generation if not received from parent
  useEffect(() => {
    if (!sessionId && !sessionReceived) {
      const timeout = setTimeout(() => {
        console.log(
          "[Chatbot] No session_id received from parent after 5 seconds, generating fallback",
        );
        const fallbackSessionId = crypto.randomUUID();
        setSessionId(fallbackSessionId);
        setSessionReceived(true);
        console.log(
          "[Chatbot] Generated fallback session_id:",
          fallbackSessionId,
        );
      }, 5000);

      return () => clearTimeout(timeout);
    }
  }, [sessionId, sessionReceived]);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [chatHeight, setChatHeight] = useState(500);
  const [isDragging, setIsDragging] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const [isHovered, setIsHovered] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [addedProductVariantId, setAddedProductVariantId] = useState<
    string | null
  >(null);

  // State for data from parent

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  const webhookUrl =
    process.env.NEXT_PUBLIC_N8N_CHAT_WEBHOOK ||
    "https://similarly-secure-mayfly.ngrok-free.app/webhook/chat";

  // New states for conversation history
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<
    string | null
  >(null);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Analytics tracking function
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
          // ========== FIX START: Use session_id key ==========
          body: JSON.stringify({
            session_id: sessionId,
            eventType,
            timestamp: new Date().toISOString(),
            data,
          }),
          // ========== FIX END ==========
        });
      } catch (error) {
        console.error("Failed to send analytics event:", error);
      }
    },
    [sessionId],
  );

  // Listen for messages from parent window (Shopify theme)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Only accept messages from trusted origins
      const trustedOrigins = [
        "https://zenmato.myshopify.com",
        "https://cdn.shopify.com",
        window.location.origin,
      ];

      // Log all messages for debugging
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

      if (event.data && event.data.type === "init") {
        console.log("[Chatbot] Received init data from parent:", event.data);

        if (event.data.session_id) {
          setSessionId(event.data.session_id);
          setSessionReceived(true);
          console.log(
            "[Chatbot] Set session_id from parent:",
            event.data.session_id,
          );
        }
      }

      // Handle conversation responses from parent
      if (data?.type === "conversations-response") {
        console.log(
          "[Chatbot] Received conversations from parent:",
          data.conversations,
        );
        setConversations(data.conversations?.slice(0, 3) || []);
        setLoadingConversations(false);
      }

      if (data?.type === "conversations-error") {
        console.error("[Chatbot] Conversation fetch error:", data.error);
        setLoadingConversations(false);
      }

      if (data?.type === "conversation-history-response") {
        console.log(
          "[Chatbot] Received conversation history from parent:",
          data.history,
        );
        const history: HistoryItem[] = data.history || [];

        // Convert history items to messages
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
        setCurrentConversationId(data.conversationId);
        setLoadingHistory(false);
      }

      if (data?.type === "conversation-history-error") {
        console.error(
          "[Chatbot] Conversation history fetch error:",
          data.error,
        );
        setLoadingHistory(false);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  // Empty dependency array ensures this runs only once on mount

  useEffect(() => {
    // Check if mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    // Check for MediaRecorder support
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
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Updated welcome message logic
  useEffect(() => {
    if (isOpen) {
      if (sessionId) {
        trackEvent("chat_opened", { initialMessagesCount: messages.length });
        // Always fetch conversations when chat opens to get latest data
        fetchConversations();
      }
      if (messages.length === 0 && !currentConversationId) {
        // Only add welcome message if chat is empty and no conversation is active
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
    } else if (!isOpen) {
      setMessages([]); // Clear messages on close
      setCurrentConversationId(null); // Reset conversation when closing
    }
  }, [isOpen, sessionId, trackEvent]);

  // Scroll to bottom button logic
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
      handleScroll(); // Initial check
      return () => container.removeEventListener("scroll", handleScroll);
    }
  }, [handleScroll]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Audio level monitoring
  const monitorAudioLevel = () => {
    if (analyserRef.current) {
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(dataArray);

      const average =
        dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
      setAudioLevel(average / 255); // Normalize to 0-1

      animationFrameRef.current = requestAnimationFrame(monitorAudioLevel);
    }
  };

  const requestMicrophonePermission = async (): Promise<MediaStream | null> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });

      // Set up audio analysis for visual feedback
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      return stream;
    } catch (error: any) {
      let errorMessage = "Microphone access denied.";
      if (error.name === "NotAllowedError") {
        errorMessage =
          "Microphone access denied. Please allow microphone access and try again.";
      } else if (error.name === "NotFoundError") {
        errorMessage =
          "No microphone found. Please connect a microphone and try again.";
      } else if (error.name === "NotSupportedError") {
        errorMessage = "Microphone access is not supported in this browser.";
      }
      setVoiceError(errorMessage);
      return null;
    }
  };

  const startRecordingTimer = () => {
    setRecordingDuration(0);
    recordingTimerRef.current = setInterval(() => {
      setRecordingDuration((prev) => prev + 1);
    }, 1000);
  };

  const stopRecordingTimer = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
  };

  const startRecording = async () => {
    const stream = await requestMicrophonePermission();
    if (!stream) return;

    try {
      streamRef.current = stream;
      audioChunksRef.current = [];

      // Try different MIME types for better compatibility
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

        // Cleanup
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
        setAudioLevel(0);
      };

      mediaRecorderRef.current.onerror = (event: any) => {
        setVoiceError("Recording failed. Please try again.");
        setIsRecording(false);
        stopRecordingTimer();
      };

      mediaRecorderRef.current.start(100); // Collect data every 100ms
      setIsRecording(true);
      startRecordingTimer();
      monitorAudioLevel(); // Start audio level monitoring
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
    }); // Track voice message

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

      // ========== FIX START: Use session_id key ==========
      const webhookPayload = {
        id: crypto.randomUUID(),
        session_id: sessionId,
        timestamp: new Date().toISOString(),
        event_type: eventType,
        user_message: `Voice message (${duration}s)`, // Context for voice
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
      // ========== FIX END ==========

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

  // Save conversation when it starts
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
        // Add conversation name for better identification
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
        // Refresh conversations list after successful save with a delay
        setTimeout(() => {
          console.log("[Chatbot] Refreshing conversations after save");
          fetchConversations();
        }, 2000); // 2 second delay to allow n8n to process
      }
    } catch (error) {
      console.error("Error saving conversation:", error);
    }
  };

  // Send message function
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

      // Create conversation ID if we don't have one
      let newConversationId = currentConversationId;
      if (!currentConversationId) {
        newConversationId = crypto.randomUUID();
        setCurrentConversationId(newConversationId);

        // Save the conversation to the database immediately
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

      console.log("[Chatbot] Payload session_id check:", {
        sessionId,
        payload_session_id: webhookPayload.session_id,
        sessionId_type: typeof sessionId,
        payload_session_id_type: typeof webhookPayload.session_id,
      });

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

  // Function to handle adding to cart via postMessage
  const handleAddToCart = (card: ProductCardData) => {
    console.log(
      `[Chatbot] Attempting to send 'add-to-cart' message for variantId: ${card.variantId}`,
    );
    setAddedProductVariantId(card.variantId); // Set the variant ID to show "Added!"

    setTimeout(() => {
      setAddedProductVariantId(null); // Reset after a short delay
    }, 1500); // Show "Added!" for 1.5 seconds

    trackEvent("add_to_cart", {
      variantId: card.variantId,
      productName: card.name,
      productPrice: card.price,
      source: "chatbot",
    }); // Track add to cart

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

      console.log(
        `[Chatbot] Add to cart request sent for variant ${card.variantId}. Redirecting to cart...`,
      );
    } else {
      console.warn(
        "[Chatbot] window.parent is not available or chatbot is not in iframe. Cannot send add-to-cart message.",
      );

      if (
        typeof window !== "undefined" &&
        window.location.hostname.includes("myshopify.com")
      ) {
        console.log("[Chatbot] Attempting direct cart add as fallback...");
      }
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      // Cleanup object URLs
      messages.forEach((message) => {
        if (message.audioUrl) {
          URL.revokeObjectURL(message.audioUrl);
        }
      });
    };
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleCopyMessage = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        console.log("Message copied to clipboard!");
      })
      .catch((err) => {
        console.error("Failed to copy message: ", err);
      });
  };

  useEffect(() => {
    if (sessionId) {
      fetchConversations();
    }
  }, [sessionId]);

  // Fetch conversation list
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
      // First try using our local API route
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

        // Handle both array and object responses
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

    // Fallback to parent window communication if API fails
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

      // Set a timeout to stop loading if no response received
      setTimeout(() => {
        if (loadingConversations) {
          console.warn(
            "[Chatbot] Timeout waiting for conversations from parent",
          );
          setLoadingConversations(false);
        }
      }, 10000); // 10 second timeout
    } else {
      console.log(
        "[Chatbot] Not in iframe context, setting empty conversations",
      );
      setConversations([]);
      setLoadingConversations(false);
    }
  };

  // Load conversation history
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
      // First try using our local API route
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

        // Convert history items to messages
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

    // Fallback to parent window communication if API fails
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

      // Set a timeout to stop loading if no response received
      setTimeout(() => {
        if (loadingHistory) {
          console.warn(
            "[Chatbot] Timeout waiting for conversation history from parent",
          );
          setLoadingHistory(false);
        }
      }, 10000); // 10 second timeout
    } else {
      setLoadingHistory(false);
    }
  };

  // Start new conversation
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
    setLoadingConversations(false); // Reset loading state
    // Always refresh conversations list when going back to home
    if (sessionId) {
      console.log(
        "[Chatbot] Refreshing conversations list after starting new conversation",
      );
      // Add a small delay to ensure state is updated
      setTimeout(() => {
        fetchConversations();
      }, 100);
    }
  };

  // Initialize conversation when component mounts or sessionId changes
  useEffect(() => {
    if (sessionId && !currentConversationId) {
      const newConversationId = crypto.randomUUID();
      setCurrentConversationId(newConversationId);
      console.log(
        "[Chatbot] Generated new conversation ID:",
        newConversationId,
      );

      // Save the conversation immediately when it's created
      console.log("[Chatbot] Saving conversation on initialization");
      saveConversation(newConversationId, sessionId);
    }
  }, [sessionId, currentConversationId, saveConversation]);

  return (
    <>
      {/* Enhanced Chat Widget Button with Advanced Animations */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50">
          <div className="relative group">
            {/* Animated background rings with enhanced effects */}
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

              {/* Enhanced notification dot with multiple effects */}
              <div className="absolute -top-2 -right-2 h-6 w-6 bg-gradient-to-r from-red-500 to-pink-500 rounded-full border-3 border-white shadow-xl animate-bounce-in">
                <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-red-400 to-pink-400 rounded-full animate-pulse"></div>
                <Heart className="h-3 w-3 text-white absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
              </div>
            </Button>

            {/* Enhanced Tooltip with advanced styling */}
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

      {/* Enhanced Chat Widget with Advanced Glass Morphism */}
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

            {/* Enhanced Header with Advanced Gradient Animation */}
            <CardHeader
              className={`flex flex-row items-center justify-between p-6 bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-700 text-white rounded-t-3xl relative overflow-hidden ${
                isMobile ? "cursor-ns-resize select-none" : ""
              }`}
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
            >
              {/* Multiple animated background layers */}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600/90 via-blue-600/90 to-indigo-700/90 animate-gradient-xy"></div>
              <div className="absolute inset-0 bg-gradient-to-br from-pink-500/20 via-purple-500/20 to-blue-500/20 animate-gradient-x"></div>
              <div
                className="absolute inset-0 opacity-30"
                style={{
                  backgroundImage:
                    "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fillRule='evenodd'%3E%3Cg fill='%23ffffff' fillOpacity='0.1'%3E%3Ccircle cx='30' cy='30' r='3'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
                }}
              />

              {/* Enhanced mobile resize handle */}
              {isMobile && (
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 touch-none z-10">
                  <div className="w-16 h-2 bg-white/60 rounded-full shadow-xl backdrop-blur-sm border border-white/30"></div>
                </div>
              )}

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
                {/* Back to home button - only show when in an active conversation */}
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

            {/* Enhanced Recording Indicator */}
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

            {/* Enhanced Voice Error Display */}
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

            {/* Enhanced Messages with Advanced Styling */}
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
                    {/* Recent Chats Section */}
                    <div className="w-full max-w-sm rounded-lg border border-border p-4 bg-card shadow-lg animate-in fade-in slide-in-from-bottom-4 delay-200 mt-8 mx-auto">
                      <h3 className="text-lg font-semibold text-foreground mb-3">
                        Recent Chats
                      </h3>
                      <div className="space-y-2">
                        {loadingConversations ? (
                          <div className="text-sm text-muted-foreground animate-pulse">
                            Loading conversations...
                          </div>
                        ) : conversations.length > 0 ? (
                          <>
                            {conversations.map((conversation) => (
                              <button
                                key={conversation.conversation_id}
                                onClick={() =>
                                  loadConversationHistory(
                                    conversation.conversation_id,
                                  )
                                }
                                disabled={loadingHistory}
                                className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800 transition-colors duration-200 disabled:opacity-50"
                              >
                                <div className="font-medium text-sm text-foreground truncate">
                                  {conversation.name || "Untitled Conversation"}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {new Date(
                                    conversation.started_at,
                                  ).toLocaleDateString()}
                                </div>
                              </button>
                            ))}
                            <button
                              onClick={startNewConversation}
                              className="w-full text-left p-3 rounded-lg border-2 border-dashed border-blue-300 hover:border-blue-400 hover:bg-blue-50 dark:border-blue-600 dark:hover:border-blue-500 dark:hover:bg-blue-900/20 transition-colors duration-200"
                            >
                              <div className="font-medium text-sm text-blue-600 dark:text-blue-400">
                                + Start New Chat
                              </div>
                            </button>
                          </>
                        ) : (
                          <div className="text-sm text-muted-foreground">
                            No recent conversations. Start chatting to see your
                            history here!
                          </div>
                        )}
                      </div>
                    </div>
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

                        {/* Enhanced product recommendation cards */}
                        {message.cards && message.cards.length > 0 && (
                          <div className="cards-container mt-6">
                            {message.cards.map((card, cardIndex) => (
                              <Card
                                key={cardIndex}
                                className="card animate-bounce-in"
                                style={{
                                  animationDelay: `${cardIndex * 100}ms`,
                                }}
                              >
                                <CardContent className="p-2 flex flex-col items-center">
                                  <img
                                    src={card.image || "/placeholder.svg"}
                                    alt={card.name}
                                    className="w-24 h-24 object-cover rounded-md mb-2 shadow-sm"
                                    loading="lazy" // Lazy loading for images
                                  />
                                  <h4 className="text-sm font-semibold text-foreground truncate w-full text-center mb-1">
                                    {card.name}
                                  </h4>
                                  <p className="text-base font-bold text-primary mb-2">
                                    {card.price}
                                  </p>
                                  <Button
                                    onClick={() => handleAddToCart(card)} // Pass the whole card object
                                    className="w-full text-xs py-1.5 h-auto bg-primary hover:bg-primary/90 transition-all duration-150 shadow-sm hover:shadow-md mb-1"
                                  >
                                    {addedProductVariantId ===
                                    card.variantId ? (
                                      <span className="flex items-center gap-1">
                                        <Check className="h-3 w-3" /> Added!
                                      </span>
                                    ) : (
                                      "Add to Cart"
                                    )}
                                  </Button>
                                  {card.productUrl && (
                                    <a
                                      href={card.productUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="w-full text-xs py-1 h-auto text-center text-muted-foreground hover:text-primary transition-colors duration-150"
                                    >
                                      View Product
                                    </a>
                                  )}
                                </CardContent>
                              </Card>
                            ))}
                          </div>
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

            {/* Enhanced Input with Advanced Glass Morphism */}
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

                {/* Enhanced Voice Input Button */}
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
