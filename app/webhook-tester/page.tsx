"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RefreshCw, CheckCircle, XCircle, Clock, Globe } from "lucide-react";

interface WebhookTestResult {
  name: string;
  url: string;
  status: number;
  success: boolean;
  response?: any;
  error?: string;
  responseTime: number;
}

interface TestResults {
  timestamp: string;
  total_tests: number;
  successful: number;
  failed: number;
  results: WebhookTestResult[];
}

export default function WebhookTester() {
  const [results, setResults] = useState<TestResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testSpecificSession = async () => {
    setLoading(true);
    setResults(null);
    setError(null);

    const testSessionId = "session_0lur6a8ab_1752820119301"; // Real session ID from logs

    try {
      console.log("[Webhook Tester] Testing specific session:", testSessionId);

      const response = await fetch(`/api/conversations?session_id=${encodeURIComponent(testSessionId)}&t=${Date.now()}`, {
        headers: {
          'Cache-Control': 'no-cache'
        }
      });

      const data = await response.json();
      console.log("[Webhook Tester] Conversation API response:", data);

      setResults({
        timestamp: new Date().toISOString(),
        total_tests: 1,
        successful: response.ok ? 1 : 0,
        failed: response.ok ? 0 : 1,
        results: [{
          name: "get-conversations-specific-session",
          url: `/api/conversations?session_id=${testSessionId}`,
          status: response.status,
          success: response.ok,
          response: data,
          responseTime: 0
        }]
      });
    } catch (error) {
      console.error("[Webhook Tester] Error testing specific session:", error);
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  };

  const testWebhooks = async () => {
    setLoading(true);
    setResults(null);
    setError(null);

    try {
      const response = await fetch("/api/test-webhooks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error("Failed to run webhook tests:", error);
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (success: boolean, status: number) => {
    if (success) return "bg-green-500";
    if (status === 0) return "bg-gray-500";
    if (status >= 400) return "bg-red-500";
    return "bg-yellow-500";
  };

  const getStatusIcon = (success: boolean, status: number) => {
    if (success) return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (status === 0) return <XCircle className="h-4 w-4 text-gray-500" />;
    return <XCircle className="h-4 w-4 text-red-500" />;
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Webhook Tester</h1>
          <p className="text-muted-foreground">Test all n8n webhook endpoints</p>
        </div>
        
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Webhook Tester</h1>
            <p className="text-muted-foreground">Test all n8n webhook endpoints</p>
          </div>
        </div>
        <div className="flex gap-2 w-full">
          <Button onClick={testWebhooks} disabled={loading} className="flex-1">
            {loading ? "Testing..." : "Test All Webhooks"}
          </Button>
          <Button onClick={testSpecificSession} disabled={loading} variant="outline" className="flex-1">
            Test Real Session
          </Button>
        </div>
      </div>

      {results && (
        <div className="space-y-6">
          {/* Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Test Summary
              </CardTitle>
              <CardDescription>
                Tested at {new Date(results.timestamp).toLocaleString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold">{results.total_tests}</div>
                  <div className="text-sm text-muted-foreground">Total Tests</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">{results.successful}</div>
                  <div className="text-sm text-muted-foreground">Successful</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">{results.failed}</div>
                  <div className="text-sm text-muted-foreground">Failed</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Individual Results */}
          <div className="grid gap-4">
            {results.results.map((result, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      {getStatusIcon(result.success, result.status)}
                      {result.name}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant={result.success ? "default" : "destructive"}>
                        {result.status || "Network Error"}
                      </Badge>
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {result.responseTime}ms
                      </Badge>
                    </div>
                  </div>
                  <CardDescription className="break-all">
                    {result.url}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {result.error && (
                      <div>
                        <h4 className="font-medium text-red-600 mb-2">Error:</h4>
                        <pre className="bg-red-50 p-3 rounded text-sm text-red-800 overflow-x-auto">
                          {result.error}
                        </pre>
                      </div>
                    )}

                    {result.response && (
                      <div>
                        <h4 className="font-medium mb-2">Response:</h4>
                        <pre className="bg-gray-50 p-3 rounded text-sm overflow-x-auto max-h-40">
                          {typeof result.response === 'string' 
                            ? result.response 
                            : JSON.stringify(result.response, null, 2)
                          }
                        </pre>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {!results && !loading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Globe className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Ready to Test Webhooks</h3>
            <p className="text-muted-foreground mb-4">Click "Run Tests" to check all webhook endpoints</p>
            
          </CardContent>
        </Card>
      )}
    </div>
  );
}