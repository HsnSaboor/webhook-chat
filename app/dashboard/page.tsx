"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { DollarSign, ShoppingCart, MessageCircle, Users, CheckCircle } from "lucide-react"

interface AnalyticsEvent {
  sessionId: string
  eventType: string
  timestamp: string
  data: Record<string, any>
}

export default function ChatbotDashboard() {
  const [stats, setStats] = useState({
    totalChatSessions: 0,
    totalMessagesSent: 0,
    chatbotInitiatedAddtoCarts: 0,
    chatbotInfluencedCheckouts: 0,
    totalRevenueGenerated: 0,
    conversionRate: 0,
    averageOrderValue: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true)
        const response = await fetch("/api/analytics")
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const data = await response.json()
        if (data.success && Array.isArray(data.events)) {
          calculateStats(data.events)
        } else {
          setError("Failed to load analytics data.")
        }
      } catch (e: any) {
        console.error("Error fetching analytics:", e)
        setError(`Error fetching analytics: ${e.message}`)
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
    // Optionally, refetch data periodically
    const interval = setInterval(fetchAnalytics, 10000) // Refresh every 10 seconds
    return () => clearInterval(interval)
  }, [])

  const calculateStats = (events: AnalyticsEvent[]) => {
    let totalChatSessions = 0
    let totalMessagesSent = 0
    let chatbotInitiatedAddtoCarts = 0
    let chatbotInfluencedCheckouts = 0
    let totalRevenueGenerated = 0

    const uniqueSessions = new Set<string>()

    events.forEach((event) => {
      if (event.sessionId) {
        uniqueSessions.add(event.sessionId)
      }

      switch (event.eventType) {
        case "chat_opened":
          // totalChatSessions is derived from uniqueSessions
          break
        case "message_sent":
          totalMessagesSent++
          break
        case "add_to_cart":
          chatbotInitiatedAddtoCarts++
          break
        case "checkout_completed":
          chatbotInfluencedCheckouts++
          if (typeof event.data.totalRevenue === "number") {
            totalRevenueGenerated += event.data.totalRevenue
          }
          break
        default:
          break
      }
    })

    totalChatSessions = uniqueSessions.size

    const conversionRate =
      chatbotInitiatedAddtoCarts > 0 ? (chatbotInfluencedCheckouts / chatbotInitiatedAddtoCarts) * 100 : 0
    const averageOrderValue = chatbotInfluencedCheckouts > 0 ? totalRevenueGenerated / chatbotInfluencedCheckouts : 0

    setStats({
      totalChatSessions,
      totalMessagesSent,
      chatbotInitiatedAddtoCarts,
      chatbotInfluencedCheckouts,
      totalRevenueGenerated,
      conversionRate: Number.parseFloat(conversionRate.toFixed(2)),
      averageOrderValue: Number.parseFloat(averageOrderValue.toFixed(2)),
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <p className="text-lg text-gray-700 dark:text-gray-300">Loading chatbot performance data...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <p className="text-lg text-red-500">Error: {error}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100 p-8 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-10 text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">
          Chatbot Performance Dashboard
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 bg-white/90 backdrop-blur-md border-blue-200 dark:bg-gray-800/90 dark:border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Total Chat Sessions
              </CardTitle>
              <Users className="h-5 w-5 text-blue-500 dark:text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalChatSessions}</div>
              <p className="text-xs text-muted-foreground mt-1">Unique interactions with the chatbot</p>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 bg-white/90 backdrop-blur-md border-purple-200 dark:bg-gray-800/90 dark:border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Total Messages Sent
              </CardTitle>
              <MessageCircle className="h-5 w-5 text-purple-500 dark:text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalMessagesSent}</div>
              <p className="text-xs text-muted-foreground mt-1">User messages sent to the chatbot</p>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 bg-white/90 backdrop-blur-md border-green-200 dark:bg-gray-800/90 dark:border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Chatbot Add to Carts
              </CardTitle>
              <ShoppingCart className="h-5 w-5 text-green-500 dark:text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">{stats.chatbotInitiatedAddtoCarts}</div>
              <p className="text-xs text-muted-foreground mt-1">Products added to cart via chatbot links</p>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 bg-white/90 backdrop-blur-md border-indigo-200 dark:bg-gray-800/90 dark:border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">Chatbot Checkouts</CardTitle>
              <CheckCircle className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">{stats.chatbotInfluencedCheckouts}</div>
              <p className="text-xs text-muted-foreground mt-1">Orders influenced by chatbot interaction</p>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 bg-white/90 backdrop-blur-md border-yellow-200 dark:bg-gray-800/90 dark:border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Total Revenue Generated
              </CardTitle>
              <DollarSign className="h-5 w-5 text-yellow-500 dark:text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                ${stats.totalRevenueGenerated.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Revenue from chatbot-influenced orders</p>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 bg-white/90 backdrop-blur-md border-red-200 dark:bg-gray-800/90 dark:border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">Avg. Order Value</CardTitle>
              <DollarSign className="h-5 w-5 text-red-500 dark:text-red-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                ${stats.averageOrderValue.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Average value of chatbot-influenced orders</p>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 bg-white/90 backdrop-blur-md border-gray-200 dark:bg-gray-800/90 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              Conversion Rate (Add to Cart to Checkout)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <Progress
                value={stats.conversionRate}
                className="h-3 bg-blue-100 dark:bg-blue-900"
                indicatorClassName="bg-gradient-to-r from-blue-500 to-purple-500"
              />
              <span className="text-lg font-bold text-gray-900 dark:text-white">{stats.conversionRate}%</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Percentage of chatbot-initiated add to carts that resulted in a completed checkout.
            </p>
          </CardContent>
        </Card>

        <div className="mt-10 p-6 bg-yellow-50/80 border border-yellow-200 rounded-lg shadow-md text-yellow-800 dark:bg-yellow-900/80 dark:border-yellow-700 dark:text-yellow-200">
          <h3 className="font-bold text-lg mb-2">Important Note:</h3>
          <p className="text-sm">
            This dashboard uses in-memory data storage for demonstration purposes. All analytics data will reset when
            the server restarts. For a production environment, you would integrate a persistent database (e.g.,
            Supabase, Neon, PostgreSQL, MongoDB) to store and retrieve your analytics events reliably.
          </p>
        </div>
      </div>
    </div>
  )
}
