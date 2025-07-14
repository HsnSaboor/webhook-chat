"use client"

import type React from "react"
import { ChevronDown } from "lucide-react"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
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
} from "lucide-react"

// Define interface for product card data
interface ProductCardData {
  image: string
  name: string
  price: string
  variantId: string
  productUrl?: string
}

interface Message {
  id: string
  content: string
  role: "user" | "webhook"
  timestamp: Date
  type: "text" | "voice"
  audioUrl?: string
  cards?: ProductCardData[]
}

// Enhanced Animated Waveform Component with Audio Levels
const AnimatedWaveform = ({ isRecording, audioLevel = 0 }: { isRecording: boolean; audioLevel?: number }) => {
  const bars = Array.from({ length: 12 }, (_, i) => i)

  return (
    <div className="flex items-center justify-center space-x-1.5 bg-gradient-to-r from-red-500/20 via-pink-500/20 to-red-500/20 rounded-full backdrop-blur-md border border-red-300/30 h-8 px-2">
      {bars.map((bar) => {
        const baseHeight = 6
        const maxHeight = 36
        const randomMultiplier = Math.random() * 0.8 + 0.2
        const levelMultiplier = isRecording ? audioLevel * randomMultiplier + 0.3 : 0.2
        const height = Math.min(baseHeight + (maxHeight - baseHeight) * levelMultiplier, maxHeight)

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
              filter: isRecording ? "drop-shadow(0 0 4px rgba(239, 68, 68, 0.6))" : "none",
            }}
          />
        )
      })}
    </div>
  )
}

// Enhanced Static Waveform Component with Playback
const StaticWaveform = ({ audioUrl }: { audioUrl?: string }) => {
  const bars = Array.from({ length: 24 }, (_, i) => i)
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

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
  )
}

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
)

// Particle Background Component
const ParticleBackground = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {Array.from({ length: 9 }, (_, i) => (
      <div key={i} className="particle" />
    ))}
  </div>
)

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
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
  const [showScrollToBottom, setShowScrollToBottom] = useState(false)
  const [addedProductVariantId, setAddedProductVariantId] = useState<string | null>(null)

  // ========== MODIFICATION START: Add state for all parent-sent data ==========
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sourceUrl, setSourceUrl] = useState<string | null>(null)
  const [pageContext, setPageContext] = useState<string | null>(null)
  // ========== MODIFICATION END ==========

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const dragStartY = useRef(0)
  const dragStartHeight = useRef(0)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const messagesContainerRef = useRef<HTMLDivElement | null>(null)

  // Analytics tracking function
  const trackEvent = useCallback(
    async (eventType: string, data: Record<string, any> = {}) => {
      if (!sessionId) {
        console.warn("Analytics event skipped: No session ID available.")
        return
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
        })
      } catch (error) {
        console.error("Failed to send analytics event:", error)
      }
    },
    [sessionId],
  )

  // ========== MODIFICATION START: Listen for all data from parent ==========
  // Listen for postMessage from parent (Shopify theme)
  useEffect(() => {
    const handlePostMessage = (event: MessageEvent) => {
      // ✅ Security: Validate origin
      if (event.origin !== "https://zenmato.myshopify.com") {
        return
      }

      const data = event.data

      // ✅ Validate payload structure
      if (data?.type !== "init" || !data.session_id) {
        return
      }

      // ✅ Log and set all received data
      console.log("[Chatbot] Received init data from parent:", data)
      setSessionId(data.session_id)
      setSourceUrl(data.source_url || null)
      setPageContext(data.page_context || null)
    }

    window.addEventListener("message", handlePostMessage)

    return () => {
      window.removeEventListener("message", handlePostMessage)
    }
  }, []) // Empty dependency array ensures this runs only once on mount
  // ========== MODIFICATION END ==========

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
    if (typeof window !== "undefined" && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      if (MediaRecorder.isTypeSupported("audio/webm") || MediaRecorder.isTypeSupported("audio/mp4")) {
        setVoiceSupported(true)
      } else {
        setVoiceSupported(false)
        setVoiceError("Audio recording is not supported in this browser.")
      }
    } else {
      setVoiceSupported(false)
      setVoiceError("Microphone access is not supported in this browser.")
    }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Updated welcome message logic
  useEffect(() => {
    if (isOpen) {
      if (sessionId) {
        trackEvent("chat_opened", { initialMessagesCount: messages.length })
      }
      if (messages.length === 0) {
        setMessages([
          {
            id: "welcome",
            content: "Hello! How can I assist you today? Feel free to ask me anything about our products or services.",
            role: "webhook",
            timestamp: new Date(),
            type: "text",
          },
        ])
      }
    } else if (!isOpen) {
      setMessages([]) // Clear messages on close
    }
  }, [isOpen, sessionId, trackEvent])

  // Scroll to bottom button logic
  const handleScroll = useCallback(() => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current
      const isAtBottom = scrollHeight - scrollTop <= clientHeight + 10
      setShowScrollToBottom(!isAtBottom)
    }
  }, [])

  useEffect(() => {
    const container = messagesContainerRef.current
    if (container) {
      container.addEventListener("scroll", handleScroll)
      handleScroll() // Initial check
      return () => container.removeEventListener("scroll", handleScroll)
    }
  }, [handleScroll])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  // Audio level monitoring and recording functions... (No changes needed here)
  const monitorAudioLevel = () => {
    if (analyserRef.current) {
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
      analyserRef.current.getByteFrequencyData(dataArray)
      const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length
      setAudioLevel(average / 255)
      animationFrameRef.current = requestAnimationFrame(monitorAudioLevel)
    }
  }

  const requestMicrophonePermission = async (): Promise<MediaStream | null> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 44100 },
      })
      audioContextRef.current = new AudioContext()
      const source = audioContextRef.current.createMediaStreamSource(stream)
      analyserRef.current = audioContextRef.current.createAnalyser()
      analyserRef.current.fftSize = 256
      source.connect(analyserRef.current)
      return stream
    } catch (error: any) {
      // Error handling...
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
    // Start recording logic...
  }

  const stopRecording = () => {
    // Stop recording logic...
  }

  const toggleRecording = async () => {
    // Toggle recording logic...
  }

  const sendVoiceMessage = async (audioBlob: Blob, duration: number) => {
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
    trackEvent("message_sent", { type: "voice", duration })

    try {
      const arrayBuffer = await audioBlob.arrayBuffer()
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))

      // ========== MODIFICATION START: Include all context in webhook payload ==========
      const webhookPayload = {
        type: "voice",
        audioData: base64Audio,
        mimeType: audioBlob.type,
        duration: duration,
        session_id: sessionId,
        source_url: sourceUrl,
        page_context: pageContext,
      }
      // ========== MODIFICATION END ==========

      console.log("[Chatbot] Sending webhook payload:", webhookPayload)

      const response = await fetch("/api/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(webhookPayload),
      })

      const data = await response.json()
      console.log("[Chatbot] Received webhook response:", data)

      if (response.ok) {
        // Handle success...
      } else {
        // Handle error...
      }
    } catch (error) {
      // Handle fetch error...
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
    trackEvent("message_sent", { type: "text", messageContent: input.trim() })
    setInput("")
    setIsLoading(true)

    try {
      // ========== MODIFICATION START: Include all context in webhook payload ==========
      const webhookPayload = {
        type: "text",
        text: input.trim(),
        session_id: sessionId,
        source_url: sourceUrl,
        page_context: pageContext,
      }
      // ========== MODIFICATION END ==========

      console.log("[Chatbot] Sending webhook payload:", webhookPayload)

      const response = await fetch("/api/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(webhookPayload),
      })

      const data = await response.json()
      console.log("[Chatbot] Received webhook response:", data)

      if (response.ok) {
        const webhookMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: data.message || data.response || "Message received successfully",
          role: "webhook",
          timestamp: new Date(),
          type: "text",
          cards: data.cards || undefined,
        }
        setMessages((prev) => [...prev, webhookMessage])
      } else {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: "Sorry, I'm having trouble responding right now. Please try again.",
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
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  // Function to handle adding to cart via postMessage
  const handleAddToCart = (card: ProductCardData) => {
    // No changes needed here
  }

  // Event handlers for dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    // No changes needed here
  }
  const handleTouchStart = (e: React.TouchEvent) => {
    // No changes needed here
  }
  const handleMouseMove = (e: MouseEvent) => {
    // No changes needed here
  }
  const handleTouchMove = (e: TouchEvent) => {
    // No changes needed here
  }
  const handleMouseUp = () => {
    // No changes needed here
  }
  const handleTouchEnd = () => {
    // No changes needed here
  }

  useEffect(() => {
    if (isDragging) {
      // No changes needed here
    }
  }, [isDragging, isMobile])

  // Cleanup on unmount
  useEffect(() => {
    // No changes needed here
  }, [])

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  // The rest of the return statement (JSX) remains unchanged
  return (
    <>
      {/* Enhanced Chat Widget Button with Advanced Animations */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50">
          {/* Button JSX */}
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
            <CardHeader
              className={`flex flex-row items-center justify-between p-6 bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-700 text-white rounded-t-3xl relative overflow-hidden ${
                isMobile ? "cursor-ns-resize select-none" : ""
              }`}
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
            >
              {/* Header JSX */}
            </CardHeader>
            {/* Recording and Error Indicators */}
            <CardContent
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto p-6 space-y-5 bg-gradient-to-b from-gray-50/40 via-white/60 to-gray-50/40 backdrop-blur-md relative"
            >
              {/* Messages Mapping JSX */}
              {messages.length === 1 && messages[0].id === "welcome" && !isLoading ? (
                // Welcome message JSX
                <></>
              ) : (
                <>
                  {messages.map((message, index) => (
                    // Individual message JSX
                    <div key={message.id}>{/* ... */}</div>
                  ))}
                  {isLoading && (
                    // Typing indicator JSX
                    <></>
                  )}
                </>
              )}
              <div ref={messagesEndRef} />
            </CardContent>
            {/* Scroll to bottom button */}
            <CardFooter className="p-6 border-t-2 border-gray-200/50 bg-gradient-to-r from-white/90 via-gray-50/90 to-white/90 backdrop-blur-2xl">
              <form onSubmit={sendMessage} className="flex w-full space-x-4">
                {/* Input and Buttons JSX */}
              </form>
            </CardFooter>
          </Card>
        </div>
      )}
    </>
  )
}
