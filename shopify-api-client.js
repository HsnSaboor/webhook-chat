
/**
 * Shopify API Client - Enhanced Version
 * Upload this to your Shopify theme assets folder
 */
(function() {
  'use strict';

  console.log('[Shopify API Client] Initializing enhanced API client...');

  // Configuration
  const API_BASE_URL = 'https://v0-custom-chat-interface-kappa.vercel.app';
  const WEBHOOK_URL = 'https://similarly-secure-mayfly.ngrok-free.app/webhook/chat';
  
  const API_ENDPOINTS = {
    conversations: `${API_BASE_URL}/api/conversations`,
    conversationHistory: (id) => `${API_BASE_URL}/api/conversations/${id}`,
    saveConversation: `${API_BASE_URL}/api/conversations/save`,
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

    const conversationId = window.ShopifySessionManager.getConversationId();
    
    const payload = {
      session_id: sessionData.session_id,
      message: message,
      timestamp: new Date().toISOString(),
      conversation_id: conversationId,
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

  async function saveConversation(conversationId, name) {
    console.log('[API Client] Saving conversation:', conversationId);
    
    if (!window.ShopifySessionManager) {
      throw new Error('ShopifySessionManager not available');
    }

    const sessionData = window.ShopifySessionManager.getSessionData();
    if (!sessionData) {
      throw new Error('No valid session data available');
    }

    const payload = {
      session_id: sessionData.session_id,
      conversation_id: conversationId,
      name: name || `Conversation ${new Date().toLocaleString()}`
    };

    const result = await makeRequest(API_ENDPOINTS.saveConversation, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    console.log('[API Client] Successfully saved conversation:', result);
    return result;
  }

  async function fetchAllConversations() {
    console.log('[API Client] Fetching all conversations...');
    
    if (!window.ShopifySessionManager) {
      throw new Error('ShopifySessionManager not available');
    }

    const sessionData = window.ShopifySessionManager.getSessionData();
    if (!sessionData) {
      throw new Error('No valid session data available');
    }

    const url = `${API_ENDPOINTS.conversations}?session_id=${encodeURIComponent(sessionData.session_id)}&t=${Date.now()}`;
    console.log('[API Client] Request URL:', url);

    const conversations = await makeRequest(url, { method: 'GET' });
    console.log('[API Client] Successfully fetched conversations:', conversations);
    return conversations;
  }

  async function fetchConversationHistory(conversationId) {
    console.log('[API Client] Fetching conversation history:', conversationId);
    
    if (!window.ShopifySessionManager) {
      throw new Error('ShopifySessionManager not available');
    }

    const sessionData = window.ShopifySessionManager.getSessionData();
    if (!sessionData) {
      throw new Error('No valid session data available');
    }

    const url = `${API_ENDPOINTS.conversationHistory(conversationId)}?session_id=${encodeURIComponent(sessionData.session_id)}&t=${Date.now()}`;
    console.log('[API Client] Request URL:', url);

    const history = await makeRequest(url, { method: 'GET' });
    console.log('[API Client] Successfully fetched conversation history:', history);
    return history;
  }

  // Expose to global scope
  window.ShopifyAPIClient = {
    sendMessage: sendMessage,
    saveConversation: saveConversation,
    fetchAllConversations: fetchAllConversations,
    fetchConversationHistory: fetchConversationHistory
  };

  console.log('[API Client] Enhanced API client loaded successfully');
})();
