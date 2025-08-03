/**
 * Shopify API Client - Simplified Version
 * Upload this to your Shopify theme assets folder
 */
(function() {
  'use strict';

  console.log('[Shopify API Client] Initializing simplified API client...');

  // Configuration
  const API_BASE_URL = 'https://v0-custom-chat-interface-kappa.vercel.app';
  const WEBHOOK_URL = 'https://similarly-secure-mayfly.ngrok-free.app/webhook/chat';

  const API_ENDPOINTS = {
    saveMessage: `${API_BASE_URL}/api/messages/save`,
    webhook: WEBHOOK_URL
  };

  async function makeRequest(url, options = {}) {
    try {
      console.log('[API Client] Making request to:', url);

      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          ...options.headers
        },
        ...options
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('[API Client] Request successful:', result);
      return result;
    } catch (error) {
      console.error('[API Client] Request failed:', error);
      throw error;
    }
  }

  async function sendMessage(message) {
    console.log('[API Client] Sending message to webhook:', message);

    if (!window.ShopifySessionManager) {
      throw new Error('ShopifySessionManager not available');
    }

    const sessionData = window.ShopifySessionManager.getSessionData();
    if (!sessionData) {
      throw new Error('No valid session data available');
    }

    const payload = {
      session_id: sessionData.session_id,
      message: message,
      timestamp: new Date().toISOString(),
      source_url: sessionData.source_url,
      page_context: sessionData.page_context,
      cart_currency: sessionData.cart_currency,
      localization: sessionData.localization,
      type: 'text'
    };

    console.log('[API Client] Sending payload:', payload);

    const result = await makeRequest(API_ENDPOINTS.webhook, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    console.log('[API Client] Message sent successfully:', result);
    return result;
  }

  // Expose to global scope
  window.ShopifyAPIClient = {
    sendMessage: sendMessage
  };

  console.log('[API Client] Simplified API client loaded successfully');
})();