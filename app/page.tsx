"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { MessageCircle, Send, Mic, MicOff, X, Volume2, AlertCircle, Sparkles } from "lucide-react"

interface ProductCard {
  image: string;
  name: string;
  price: string; // Or number, depending on how you want to handle it
  variantId: string; // Assuming Shopify variant ID for Add to Cart
}

// Configuration for Shopify store domain
// TODO: Replace with your actual Shopify store domain for production readiness.
const SHOPIFY_STORE_DOMAIN = 'https://your-shopify-store-domain.com';

interface Message {
  id: string
  content: string
  role: "user" | "assistant" | "webhook"
  timestamp: Date
  type: "text" | "voice"
  audioUrl?: string // Duration is no longer displayed, but still sent to webhook
  cards?: ProductCard[];
}

// Enhanced Animated Waveform Component with Audio Levels
const AnimatedWaveform = ({ isRecording, audioLevel = 0 }: { isRecording: boolean; audioLevel?: number }) => {
  const bars = Array.from({ length: 12 }, (_, i) => i)

  return (
    <div className="flex items-center justify-center space-x-1 h-10 px-3 bg-white/10 rounded-full backdrop-blur-sm">
      {bars.map((bar) => {
        const baseHeight = 4
        const maxHeight = 28
        const randomMultiplier = Math.random() * 0.8 + 0.2
        const levelMultiplier = isRecording ? audioLevel * randomMultiplier + 0.3 : 0.2
        const height = Math.min(baseHeight + (maxHeight - baseHeight) * levelMultiplier, maxHeight)

        return (
          <div
            key={bar}
            className={`w-1 bg-gradient-to-t from-red-400 via-red-300 to-red-200 rounded-full transition-all duration-150 ${
              isRecording ? "animate-waveform shadow-sm" : ""
            }`}
            style={{
              height: `${height}px`,
              animationDelay: `${bar * 60}ms`,
              animationDuration: `${Math.random() * 300 + 400}ms`,
              filter: isRecording ? "drop-shadow(0 0 2px rgba(239, 68, 68, 0.5))" : "none",
            }}
          />
        )
      })}
    </div>
  )
}

// Enhanced Static Waveform Component with Playback (no duration display)
const StaticWaveform = ({ audioUrl }: { audioUrl?: string }) => {
  const bars = Array.from({ length: 20 }, (_, i) => i)
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  const togglePlayback = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
        setIsPlaying(false)
      } else {
        audioRef.current.play()
        setIsPlaying(true)
      }
    }
  }

  return (
    <div className="relative">
      {audioUrl && (
        <audio ref={audioRef} src={audioUrl} onEnded={() => setIsPlaying(false)} onError={() => setIsPlaying(false)} />
      )}

      <div className="flex items-center space-x-3 p-3 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
        {audioUrl && (
          <Button
            variant="ghost"
            size="sm"
            onClick={togglePlayback}
            className="h-8 w-8 p-0 hover:bg-white/20 rounded-full transition-all duration-200"
          >
            <Volume2 className={`h-4 w-4 ${isPlaying ? "animate-pulse text-blue-300" : "text-white/80"}`} />
          </Button>
        )}

        <div className="flex items-center space-x-1 flex-1 relative">
          {bars.map((bar) => (
            <div
              key={bar}
              className="w-1 bg-current opacity-60 rounded-full transition-all duration-200 hover:opacity-80 relative z-10"
              style={{
                height: `${Math.random() * 16 + 6}px`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// Enhanced Typing indicator with sparkles
const TypingIndicator = () => (
  <div className="flex items-center space-x-3 p-4">
    <div className="flex space-x-1">
      <div
        className="w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-bounce"
        style={{ animationDelay: "0ms" }}
      ></div>
      <div
        className="w-2 h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full animate-bounce"
        style={{ animationDelay: "150ms" }}
      ></div>
      <div
        className="w-2 h-2 bg-gradient-to-r from-pink-500 to-blue-500 rounded-full animate-bounce"
        style={{ animationDelay: "300ms" }}
      ></div>
    </div>
    <span className="text-sm text-gray-600 font-medium">AI is thinking</span>
    <Sparkles className="h-4 w-4 text-purple-500 animate-pulse" />
  </div>
)

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const mockProductCards: ProductCard[] = [
    {
      image: "/placeholder.jpg",
      name: "Cool T-Shirt",
      price: "$25.00",
      variantId: "1234567890"
    },
    {
      image: "/placeholder.jpg",
      name: "Awesome Hoodie",
      price: "$50.00",
      variantId: "0987654321"
    }
  ];

  // Configuration for Shopify store domain
  // TODO: Replace with your actual Shopify store domain for production readiness.
  const SHOPIFY_STORE_DOMAIN = 'https://your-shopify-store-domain.com';
  
  const mockAiMessage: Message = {
    id: "mock-ai-response",
    content: "Here are some recommended products for you:",
    role: "assistant",
    timestamp: new Date(),
    type: "text",
    cards: mockProductCards,
  };

  // State for managing add to cart button loading state
  const [addingToCart, setAddingToCart] = useState<{ [key: string]: boolean }>({});
  const [messages, setMessages] = useState<Message[]>([mockAiMessage]);
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [audioLevel, setAudioLevel] = useState(0)
  const [chatHeight, setChatHeight] = useState(500)
  const [isDragging, setIsDragging] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [voiceSupported, setVoiceSupported] = useState(false)
  const [voiceError, setVoiceError] = useState("")
  const [isHovered, setIsHovered] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const dragStartY = useRef(0)
  const dragStartHeight = useRef(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Fixed webhook URL - hidden from user
  const webhookUrl = "https://similarly-secure-mayfly.ngrok-free.app/webhook/chat"

  useEffect(() => {
    // Check if mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)

    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  useEffect(() => {
    // Check for MediaRecorder support
    if (typeof window !== "undefined" && navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
      const supportsWebm = MediaRecorder.isTypeSupported("audio/webm");
      const supportsMp4 = MediaRecorder.isTypeSupported("audio/mp4");
      if (supportsWebm || supportsMp4) {
        setVoiceSupported(true);
      } else {
        setVoiceSupported(false);
        setVoiceError("Audio recording is not supported in this browser.");
      }
    } else {
      setVoiceSupported(false)
      setVoiceError("Microphone access is not supported in this browser.")
    }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Audio level monitoring
  const monitorAudioLevel = () => {
    if (analyserRef.current) {
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
      analyserRef.current.getByteFrequencyData(dataArray)

      const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length
      setAudioLevel(average / 255) // Normalize to 0-1

      animationFrameRef.current = requestAnimationFrame(monitorAudioLevel)
    }
  }

  const requestMicrophonePermission = async (): Promise<MediaStream | null> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      })

      // Set up audio analysis for visual feedback
      audioContextRef.current = new AudioContext()
      const source = audioContextRef.current.createMediaStreamSource(stream)
      analyserRef.current = audioContextRef.current.createAnalyser()
      analyserRef.current.fftSize = 256
      source.connect(analyserRef.current)

      return stream
    } catch (error: any) {
      let errorMessage = "Microphone access denied."
      if (error.name === "NotAllowedError") {
        errorMessage = "Microphone access denied. Please allow microphone access and try again."
      } else if (error.name === "NotFoundError") {
        errorMessage = "No microphone found. Please connect a microphone and try again."
      } else if (error.name === "NotSupportedError") {
        errorMessage = "Microphone access is not supported in this browser."
      }
      setVoiceError(errorMessage)
      return null
    }
  }

  const startRecordingTimer = () => {
    setRecordingDuration(0)
    recordingTimerRef.current = setInterval(() => {
      setRecordingDuration((prev) => prev + 1)
    }, 1000)
  }

  const stopRecordingTimer = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current)
    }
  }

  const startRecording = async () => {
    const stream = await requestMicrophonePermission()
    if (!stream) return

    try {
      streamRef.current = stream
      audioChunksRef.current = []

      // Try different MIME types for better compatibility
      let mimeType = "audio/webm"
      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        mimeType = "audio/webm;codecs=opus"
      } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
        mimeType = "audio/mp4"
      } else if (MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")) {
        mimeType = "audio/ogg;codecs=opus"
      }

      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: mimeType,
      })

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType })
        sendVoiceMessage(audioBlob, recordingDuration)

        // Cleanup
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop())
          streamRef.current = null
        }
        if (audioContextRef.current) {
          audioContextRef.current.close()
          audioContextRef.current = null
        }
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current)
          animationFrameRef.current = null
        }
        setAudioLevel(0)
      }

      mediaRecorderRef.current.onerror = (event: any) => {
        setVoiceError("Recording failed. Please try again.")
        setIsRecording(false)
        stopRecordingTimer()
      }

      mediaRecorderRef.current.start(100) // Collect data every 100ms
      setIsRecording(true)
      startRecordingTimer()
      monitorAudioLevel() // Start audio level monitoring
      setVoiceError("")
    } catch (error) {
      setVoiceError("Failed to start recording. Please try again.")
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop()
    }
    setIsRecording(false)
    stopRecordingTimer()
  }

  const toggleRecording = async () => {
    if (!voiceSupported) {
      setVoiceError("Voice recording is not supported in this browser.")
      return
    }

    if (isRecording) {
      stopRecording()
    } else {
      await startRecording()
    }
  }

  const sendVoiceMessage = async (audioBlob: Blob, duration: number) => {
    // Create a local URL for playback
    const audioUrl = URL.createObjectURL(audioBlob)

    const userMessage: Message = {
      id: Date.now().toString(),
      content: "Voice message",
      role: "user",
      timestamp: new Date(),
      type: "voice",
      audioUrl: audioUrl,
    }

    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)

    try {
      // Convert audio blob to base64
      const arrayBuffer = await audioBlob.arrayBuffer()
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))

      const response = await fetch("/api/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          webhookUrl,
          audioData: base64Audio,
          mimeType: audioBlob.type,
          duration: duration, // Still send duration to webhook
          type: "voice",
        }),
      })

      const data = await response.json()

      if (response.ok) {
        const webhookMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: data.response || data.transcription || "Voice message received successfully",
          role: "webhook",
          timestamp: new Date(),
          type: "text",
        }
        setMessages((prev) => [...prev, webhookMessage])
      } else {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: "Sorry, I'm having trouble processing your voice message. Please try again.",
          role: "webhook",
          timestamp: new Date(),
          type: "text",
        }
        setMessages((prev) => [...prev, errorMessage])
      }
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "Connection error. Please check your internet and try again.",
        role: "webhook",
        timestamp: new Date(),
        type: "text",
      }
      setMessages((prev: Message[]) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!input.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input.trim(),
      role: "user",
      timestamp: new Date(),
      type: "text",
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          webhookUrl,
          text: input.trim(),
          type: "text",
        }),
      })

      const data = await response.json()

      if (response.ok) {
        let assistantContent: string;
        let cards: ProductCard[] | undefined;

        try {
          const parsedData = JSON.parse(data.response || data.transcription || "{}");
          assistantContent = parsedData.message || data.response || data.transcription || "Message received successfully";
          cards = parsedData.cards;
        } catch (error) {
          assistantContent = data.response || data.transcription || "Message received successfully";
          cards = undefined;
        }

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: assistantContent,
          role: "assistant", // Changed to 'assistant' as per instructions for rendering cards
          timestamp: new Date(),
          type: "text",
          cards: cards,
        };
        setMessages((prev: Message[]) => [...prev, assistantMessage]);
      } else {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: "Sorry, I'm having trouble responding right now. Please try again.",
          role: "webhook",
          timestamp: new Date(),
          type: "text",
        }
        setMessages((prev: Message[]) => [...prev, errorMessage])
      }
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "Connection error. Please check your internet and try again.",
        role: "webhook",
        timestamp: new Date(),
        type: "text",
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  // Touch and mouse event handlers for dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isMobile) {
      e.preventDefault()
      setIsDragging(true)
      dragStartY.current = e.clientY
      dragStartHeight.current = chatHeight
    }
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isMobile) {
      e.preventDefault()
      setIsDragging(true)
      dragStartY.current = e.touches[0].clientY
      dragStartHeight.current = chatHeight
    }
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging && isMobile) {
      const deltaY = dragStartY.current - e.clientY
      const newHeight = Math.min(Math.max(dragStartHeight.current + deltaY, 300), window.innerHeight * 0.9)
      setChatHeight(newHeight)
    }
  }

  const handleTouchMove = (e: TouchEvent) => {
    if (isDragging && isMobile) {
      e.preventDefault()
      const deltaY = dragStartY.current - e.touches[0].clientY
      const newHeight = Math.min(Math.max(dragStartHeight.current + deltaY, 300), window.innerHeight * 0.9)
      setChatHeight(newHeight)
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
  }

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
      document.addEventListener("touchmove", handleTouchMove, { passive: false })
      document.addEventListener("touchend", handleTouchEnd)

      return () => {
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)
        document.removeEventListener("touchmove", handleTouchMove)
        document.removeEventListener("touchend", handleTouchEnd)
      }
    }
  }, [isDragging, isMobile])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track: MediaStreamTrack) => track.stop())
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      // Cleanup object URLs
      messages.forEach((message: Message) => {
        if (message.audioUrl) {
          URL.revokeObjectURL(message.audioUrl)
        }
      })
    }
  }, [])

  const requestAddToCart = (variantId: string, quantity: number, properties = {}) => {
    // Prevent adding multiple items at once for the same variant
    if (addingToCart[variantId]) {
      return;
    }
    setAddingToCart(prev => ({ ...prev, [variantId]: true }));
  
    if (typeof window !== 'undefined' && window.parent) {
      window.parent.postMessage(
        {
          type: 'add-to-cart',
          payload: { variantId: variantId, quantity: quantity, properties: properties },
        },
        SHOPIFY_STORE_DOMAIN // Use the defined constant
      );
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  // Add listener for messages from parent window (e.g., Shopify store)
  useEffect(() => {
    const handleMessageFromParent = (event: MessageEvent) => {
      // Verify the origin for security - IMPORTANT!
      // Replace with your actual chatbot domain if different from parent
      const allowedOrigins = [
        SHOPIFY_STORE_DOMAIN, // Use the defined constant for the Shopify domain
        // Add other allowed origins if needed
      ];
      if (!allowedOrigins.includes(event.origin)) {
        // console.warn(`Message received from disallowed origin: ${event.origin}`);
        return;
      }
  
      const messageData = event.data;
  
      if (messageData?.type === 'add-to-cart-response') {
        const { variantId, success } = messageData.payload; // Assuming payload contains variantId and success status
        if (variantId) {
          setAddingToCart(prev => {
            const newState = { ...prev };
            delete newState[variantId]; // Remove from adding state
            return newState;
          });
          // Optionally, show a toast or notification on success/failure
          if (success) {
            console.log(`Item ${variantId} added to cart successfully.`);
            // You might want to show a success toast here
          } else {
            console.error(`Failed to add item ${variantId} to cart.`);
            // You might want to show an error toast here
          }
        }
      }
    };
  
    window.addEventListener('message', handleMessageFromParent);
  
    return () => {
      window.removeEventListener('message', handleMessageFromParent);
    };
  }, []); // Empty dependency array means this effect runs once on mount and cleans up on unmount
  
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <>
      {/* Enhanced Chat Widget Button with Floating Animation */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50">
          <div className="relative group p-10">
            {/* Animated background rings */}

            <Button
              onClick={() => setIsOpen(true)}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              className="relative h-16 w-16 rounded-full bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 hover:from-blue-700 hover:via-purple-700 hover:to-indigo-700 shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:scale-110 border-2 border-white/30 backdrop-blur-sm animate-float"
            >
              <MessageCircle
                className={`h-7 w-7 text-white transition-all duration-300 ${isHovered ? "scale-110 rotate-12" : ""}`}
              />

              {/* Enhanced notification dot with ripple effect */}
              <div className="absolute -top-1 -right-1 h-5 w-5 bg-gradient-to-r from-red-500 to-pink-500 rounded-full border-2 border-white shadow-lg">
                <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75"></div>
                <div className="absolute inset-0 bg-red-400 rounded-full animate-pulse"></div>
              </div>
            </Button>

            {/* Enhanced Tooltip with gradient */}
            <div className="absolute bottom-full right-0 mb-4 px-4 py-3 bg-gradient-to-r from-gray-900 to-gray-800 backdrop-blur-md text-white text-sm rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap shadow-2xl border border-white/10 transform group-hover:scale-105">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <MessageCircle className="h-4 w-4" />
                <span className="font-medium">Chat with us - We're online!</span>
                <Sparkles className="h-4 w-4 text-yellow-400 animate-pulse" />
              </div>
              <div className="absolute top-full right-8 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Chat Widget with Glass Morphism */}
      {isOpen && (
        <div
          className={`fixed z-50 transition-all duration-700 ease-out ${
            isMobile ? "inset-x-4 bottom-4" : "bottom-6 right-6 w-96"
          }`}
          style={{
            height: isMobile ? `${chatHeight}px` : "650px",
            maxHeight: isMobile ? "80vh" : "650px",
          }}
        >
          <Card className="h-full flex flex-col shadow-2xl animate-in slide-in-from-bottom-8 fade-in duration-700 border-0 overflow-hidden bg-white/90 backdrop-blur-2xl rounded-2xl">
            {/* Enhanced Header with Animated Gradient */}
            <CardHeader
              className={`flex flex-row items-center justify-between p-5 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 text-white rounded-t-2xl relative overflow-hidden ${
                isMobile ? "cursor-ns-resize select-none" : ""
              }`}
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
            >
              {/* Animated background with moving gradient */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/80 via-purple-600/80 to-indigo-700/80 animate-gradient-x"></div>
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage:
                    "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fillRule='evenodd'%3E%3Cg fill='%23ffffff' fillOpacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
                }}
              />

              {/* Mobile resize handle with enhanced styling */}
              {isMobile && (
                <div className="absolute top-3 left-1/2 transform -translate-x-1/2 touch-none z-10">
                  <div className="w-12 h-1.5 bg-white/50 rounded-full shadow-lg backdrop-blur-sm"></div>
                </div>
              )}

              <div className="flex items-center space-x-4 mt-2 relative z-10">
                <div className="relative">
                  <div className="h-10 w-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/30">
                    <MessageCircle className="h-5 w-5" />
                  </div>
                  <div className="absolute -top-1 -right-1 h-4 w-4 bg-green-400 rounded-full border-2 border-white shadow-sm">
                    <div className="absolute inset-0 w-4 h-4 bg-green-400 rounded-full animate-ping opacity-75"></div>
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-lg tracking-wide">AI Support</h3>
                  <p className="text-xs text-white/90 font-medium">Always here to help you!</p>
                </div>
              </div>

              <div className="flex items-center space-x-2 mt-2 relative z-10">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="text-white hover:bg-white/20 h-10 w-10 p-0 rounded-full transition-all duration-300 hover:scale-110 backdrop-blur-sm border border-white/20"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>

            {/* Enhanced Recording Indicator with Real-time Audio Visualization */}
            {isRecording && (
              <div className="bg-gradient-to-r from-red-50 via-pink-50 to-red-50 border-b border-red-200 p-4 animate-in slide-in-from-top-4 duration-500">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <div className="w-5 h-5 bg-gradient-to-r from-red-500 to-pink-500 rounded-full animate-pulse shadow-lg"></div>
                      <div className="absolute inset-0 w-5 h-5 bg-red-500 rounded-full animate-ping opacity-30"></div>
                    </div>
                    <span className="text-red-700 text-sm font-bold">Recording in progress...</span>
                    <AnimatedWaveform isRecording={isRecording} audioLevel={audioLevel} />
                  </div>
                  <div className="text-red-600 text-xl font-mono font-bold bg-white/70 px-4 py-2 rounded-full shadow-sm backdrop-blur-sm border border-red-200">
                    {formatDuration(recordingDuration)}
                  </div>
                </div>
              </div>
            )}

            {/* Enhanced Voice Error Display */}
            {voiceError && (
              <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border-b border-orange-200 p-4 animate-in slide-in-from-top-2 duration-300">
                <div className="flex items-center space-x-3">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                  <span className="text-orange-700 text-sm font-medium">{voiceError}</span>
                </div>
              </div>
            )}

            {/* Enhanced Messages with Better Styling */}
            <CardContent className="flex-1 overflow-y-auto p-5 space-y-4 bg-gradient-to-b from-gray-50/30 to-white/50 backdrop-blur-sm">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center animate-in fade-in duration-1000">
                    <div className="relative mb-8">
                      <div className="h-20 w-20 mx-auto bg-gradient-to-r from-blue-100 to-purple-100 rounded-full flex items-center justify-center shadow-lg">
                        <MessageCircle className="h-10 w-10 text-blue-600" />
                      </div>
                      <div className="absolute inset-0 h-20 w-20 mx-auto border-4 border-blue-200 rounded-full animate-ping opacity-30"></div>
                    </div>
                    <h3 className="text-2xl font-bold mb-3 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                      Welcome to AI Support!
                    </h3>
                    <p className="text-gray-600 mb-6 font-medium">How can we assist you today?</p>
                    <div className="flex items-center justify-center space-x-6 text-sm text-gray-500">
                      <div className="flex items-center space-x-2 bg-white/60 px-3 py-2 rounded-full backdrop-blur-sm border border-gray-200">
                        <MessageCircle className="h-4 w-4 text-blue-500" />
                        <span>Type a message</span>
                      </div>
                      {voiceSupported && (
                        <div className="flex items-center space-x-2 bg-white/60 px-3 py-2 rounded-full backdrop-blur-sm border border-gray-200">
                          <Mic className="h-4 w-4 text-purple-500" />
                          <span>Record voice</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((message: Message, index: number) => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} animate-in slide-in-from-bottom-4 fade-in duration-500`}
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl p-4 shadow-lg transition-all duration-300 hover:shadow-xl transform hover:scale-[1.02] ${
                          message.role === "user"
                            ? "bg-gradient-to-r from-blue-500 via-purple-600 to-indigo-600 text-white shadow-blue-200"
                            : "bg-white/90 text-gray-900 border border-gray-200 shadow-gray-200 backdrop-blur-sm"
                        }`}
                      >
                        {message.type === "voice" && (
                          <div className="mb-4">
                            <div className="flex items-center space-x-2 mb-3">
                              <Mic className="h-4 w-4 opacity-75" />
                              <span className="text-xs opacity-75 font-semibold tracking-wide">VOICE MESSAGE</span>
                            </div>
                            <StaticWaveform audioUrl={message.audioUrl} />
                          </div>
                        )}
                        <p className="whitespace-pre-wrap text-sm leading-relaxed font-medium">{message.content}</p>
                        <p
                          className={`text-xs mt-3 font-medium ${message.role === "user" ? "text-blue-100" : "text-gray-500"}`}
                        >
                          {formatTime(message.timestamp)}
                        </p>

                        {message.role === "assistant" && message.cards && message.cards.length > 0 && (
                          <div className="mt-4 flex overflow-x-auto space-x-4 pb-2 -mx-2">
                            {message.cards.map((card: ProductCard, cardIndex: number) => (
                              <div
                                key={cardIndex}
                                className="flex-none w-[150px] bg-white rounded-lg shadow-md border border-gray-100 p-3 flex flex-col items-center text-center"
                              >
                                <img src={card.image} alt={card.name} className="w-24 h-24 object-contain mb-2" />
                                <div className="card-title text-sm font-semibold text-gray-800 line-clamp-2 mb-1">
                                  {card.name}
                                </div>
                                <div className="card-price text-xs text-gray-600 mb-3">{card.price}</div>
                                <Button
                                  onClick={() => requestAddToCart(card.variantId, 1)}
                                  disabled={addingToCart[card.variantId]} // Disable button if item is being added
                                  className="mt-auto px-2 py-1 text-xs w-full" // Adjusted button size and layout for card
                                >
                                  {addingToCart[card.variantId] ? 'Adding...' : 'Add to Cart'} {/* Show loading text */}
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start animate-in slide-in-from-bottom-4 fade-in duration-300">
                      <div className="bg-white/90 text-gray-900 rounded-2xl shadow-lg border border-gray-200 backdrop-blur-sm">
                        <TypingIndicator />
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </CardContent>

            {/* Enhanced Input with Glass Morphism */}
            <CardFooter className="p-5 border-t border-gray-200/50 bg-white/80 backdrop-blur-xl">
              <form onSubmit={sendMessage} className="flex w-full space-x-3">
                <div className="flex-1 relative">
                  <Input
                    value={input}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
                    placeholder={isRecording ? "Recording your voice..." : "Type your message..."}
                    disabled={isLoading || isRecording}
                    className="pr-4 h-12 rounded-2xl border-2 border-gray-200 focus:border-blue-500 transition-all duration-300 bg-white/90 backdrop-blur-sm shadow-sm hover:shadow-md font-medium placeholder:text-gray-400"
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
                    className={`h-12 w-12 p-0 rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-lg ${
                      isRecording
                        ? "bg-gradient-to-r from-red-500 via-pink-500 to-red-600 hover:from-red-600 hover:via-pink-600 hover:to-red-700 shadow-red-200 animate-pulse border-0"
                        : "border-2 border-gray-300 hover:border-purple-500 hover:bg-purple-50 bg-white/90 backdrop-blur-sm shadow-gray-200"
                    }`}
                  >
                    {isRecording ? (
                      <MicOff className="h-5 w-5 text-white" />
                    ) : (
                      <Mic className="h-5 w-5 text-gray-600 hover:text-purple-600 transition-colors duration-200" />
                    )}
                  </Button>
                )}

                <Button
                  type="submit"
                  disabled={!input.trim() || isLoading || isRecording}
                  className="h-12 px-6 rounded-2xl bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 hover:from-blue-700 hover:via-purple-700 hover:to-indigo-700 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed border-0 font-semibold"
                >
                  <Send className="h-5 w-5" />
                </Button>
              </form>
            </CardFooter>
          </Card>
        </div>
      )}
    </>
  )
}
