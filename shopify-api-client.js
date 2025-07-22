
/**
 * Shopify API Client
 * Handles all API communications with the Next.js chatbot backend
 */
window.ShopifyAPIClient = (function() {
  'use strict';

  // Configuration
  const API_BASE_URL = 'https://v0-custom-chat-interface-kappa.vercel.app';
  const API_ENDPOINTS = {
    conversations: `${API_BASE_URL}/api/conversations`,
    conversationHistory: (id) => `${API_BASE_URL}/api/conversations/${id}`,
    saveConversation: `${API_BASE_URL}/api/conversations/save`,
    saveMessage: `${API_BASE_URL}/api/messages/save`
  };

  async function makeRequest(url, options = {}) {
    try {
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

      return await response.json();
    } catch (error) {
      console.error('[API Client] Request failed:', error);
      throw error;
    }
  }

  async function saveConversation(conversationId, name) {
    console.log('[API Client] Saving conversation:', conversationId);
    
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

  // Public API
  return {
    saveConversation: saveConversation,
    fetchAllConversations: fetchAllConversations,
    fetchConversationHistory: fetchConversationHistory
  };
})();
