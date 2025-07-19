
<!-- Add this script to your theme.liquid file, preferably before the closing </body> tag -->

<script>
(function() {
  console.log('[Shopify Theme] Initializing chatbot system...');
  
  // Use the actual Shopify session ID directly
  const sessionId = '78ddfd09-7df6-4750-8e83-41e67f9b21b9';
  
  if (!sessionId) {
    console.error('[Shopify Theme] No session ID configured. Chatbot cannot function without proper session.');
    return; // Exit if no session ID
  }
  
  console.log('[Shopify Theme] Using configured Shopify session ID:', sessionId);
  
  console.log('[Chatbot] Determined session_id:', sessionId);
  
  // Get page context
  const pageContext = document.title || 'Unknown Page';
  const sourceUrl = window.location.href;
  const cartCurrency = (window.Shopify && window.Shopify.currency && window.Shopify.currency.active) || 'USD';
  const localization = (window.Shopify && window.Shopify.locale) || 'en';

  // Use Vercel API endpoints instead of direct ngrok calls
  const VERCEL_BASE_URL = 'https://v0-custom-chat-interface-kappa.vercel.app';
  const API_ENDPOINTS = {
    conversations: `${VERCEL_BASE_URL}/api/conversations`,
    conversationHistory: `${VERCEL_BASE_URL}/api/conversations`,
    saveConversation: `${VERCEL_BASE_URL}/api/webhook`
  };

  // Function to make requests to Vercel API with proper error handling
  async function makeAPIRequest(url, data = null, method = 'GET') {
    try {
      const options = {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        }
      };
      
      if (data && method !== 'GET') {
        options.body = JSON.stringify(data);
      }
      
      if (method === 'GET' && data) {
        const params = new URLSearchParams(data);
        url += '?' + params.toString();
      }

      console.log(`[Shopify Theme] ============== MAKING ${method} REQUEST ==============`);
      console.log(`[Shopify Theme] Request URL:`, url);
      console.log(`[Shopify Theme] Request method:`, method);
      console.log(`[Shopify Theme] Request headers:`, options.headers);
      if (data) {
        console.log(`[Shopify Theme] Request data:`, data);
      }
      
      const startTime = Date.now();
      const response = await fetch(url, options);
      const duration = Date.now() - startTime;
      
      console.log(`[Shopify Theme] Response received after ${duration}ms`);
      console.log(`[Shopify Theme] Response status:`, response.status);
      console.log(`[Shopify Theme] Response ok:`, response.ok);
      console.log(`[Shopify Theme] Response headers:`, Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Shopify Theme] Error response body:`, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const responseData = await response.json();
      console.log(`[Shopify Theme] Response data:`, responseData);
      console.log(`[Shopify Theme] ============== REQUEST COMPLETED ==============`);
      
      return responseData;
    } catch (error) {
      console.error(`[Shopify Theme] ============== REQUEST FAILED ==============`);
      console.error(`[Shopify Theme] API request failed:`, error);
      console.error(`[Shopify Theme] Error details:`, {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  // Function to fetch conversations via Vercel API
  async function fetchConversations(requestSessionId = null) {
    const targetSessionId = requestSessionId || sessionId;
    try {
      console.log('[Shopify Theme] Fetching conversations for session:', targetSessionId);
      
      const conversations = await makeAPIRequest(
        API_ENDPOINTS.conversations,
        { session_id: targetSessionId },
        'GET'
      );
      
      console.log('[Shopify Theme] Successfully fetched conversations:', conversations);
      return Array.isArray(conversations) ? conversations.slice(0, 3) : []; // Limit to 3 recent conversations
      
    } catch (error) {
      console.error('[Shopify Theme] Failed to fetch conversations:', error);
      throw error;
    }
  }

  // Function to fetch conversation history via Vercel API
  async function fetchConversationHistory(conversationId, requestSessionId = null) {
    const targetSessionId = requestSessionId || sessionId;
    try {
      console.log('[Shopify Theme] Fetching history for conversation:', conversationId);
      
      const history = await makeAPIRequest(
        `${API_ENDPOINTS.conversationHistory}/${conversationId}?session_id=${encodeURIComponent(targetSessionId)}`,
        null,
        'GET'
      );
      
      console.log('[Shopify Theme] Successfully fetched conversation history:', history);
      return history;
      
    } catch (error) {
      console.error('[Shopify Theme] Failed to fetch conversation history:', error);
      throw error;
    }
  }

  // Function to save a new conversation via Vercel API
  async function saveConversation(conversationId, requestSessionId = null) {
    const targetSessionId = requestSessionId || sessionId;
    try {
      console.log('[Shopify Theme] Saving conversation:', conversationId);
      
      const payload = {
        id: crypto.randomUUID(),
        session_id: targetSessionId,
        conversation_id: conversationId,
        timestamp: new Date().toISOString(),
        event_type: 'conversation_created',
        source_url: sourceUrl,
        page_context: pageContext,
        chatbot_triggered: true,
        conversion_tracked: false,
        cart_currency: cartCurrency,
        localization: localization,
        name: `Chat ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`
      };
      
      const result = await makeAPIRequest(
        API_ENDPOINTS.saveConversation,
        payload,
        'POST'
      );
      
      console.log('[Shopify Theme] Successfully saved conversation:', result);
      return result;
      
    } catch (error) {
      console.error('[Shopify Theme] Failed to save conversation:', error);
      throw error;
    }
  }

  // Listen for messages from chatbot iframe
  window.addEventListener('message', async function(event) {
    // Security check - only accept messages from your chatbot domain
    if (event.origin !== 'https://v0-custom-chat-interface-kappa.vercel.app') {
      console.warn('[Shopify Theme] Ignoring message from untrusted origin:', event.origin);
      return;
    }

    const message = event.data;
    console.log('[Shopify Theme] Received message from iframe:', message.type, message.payload);

    try {
      switch (message.type) {
        case 'get-conversations':
          try {
            const requestSessionId = message.payload?.session_id;
            const conversations = await fetchConversations(requestSessionId);
            event.source.postMessage({
              type: 'conversations-response',
              conversations: conversations
            }, event.origin);
          } catch (error) {
            event.source.postMessage({
              type: 'conversations-error',
              error: error.message
            }, event.origin);
          }
          break;

        case 'get-conversation-history':
          const { conversationId, session_id: requestSessionId } = message.payload || {};
          if (!conversationId) {
            event.source.postMessage({
              type: 'conversation-history-error',
              error: 'Missing conversation ID'
            }, event.origin);
            return;
          }

          try {
            const history = await fetchConversationHistory(conversationId, requestSessionId);
            event.source.postMessage({
              type: 'conversation-history-response',
              history: history,
              conversationId: conversationId
            }, event.origin);
          } catch (error) {
            event.source.postMessage({
              type: 'conversation-history-error',
              error: error.message
            }, event.origin);
          }
          break;

        case 'save-conversation':
          const { conversationId: saveConvId, session_id: saveSessionId } = message.payload || {};
          if (!saveConvId) {
            console.warn('[Shopify Theme] Save conversation request missing conversation ID');
            return;
          }

          try {
            await saveConversation(saveConvId, saveSessionId);
            event.source.postMessage({
              type: 'conversation-saved',
              conversationId: saveConvId
            }, event.origin);
          } catch (error) {
            event.source.postMessage({
              type: 'conversation-save-error',
              error: error.message
            }, event.origin);
          }
          break;

        case 'add-to-cart':
          const { variantId, quantity, redirect } = message.payload || {};
          
          if (!variantId) {
            console.error('[Shopify Theme] Add to cart request missing variant ID');
            return;
          }

          try {
            // Use Shopify's AJAX API to add to cart
            const response = await fetch('/cart/add.js', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                id: variantId,
                quantity: quantity || 1
              })
            });

            if (response.ok) {
              console.log('[Shopify Theme] Successfully added to cart:', variantId);
              
              // Optionally redirect to cart if requested
              if (redirect) {
                window.location.href = '/cart';
              } else {
                // Update cart count or show success message
                if (typeof window.updateCartCount === 'function') {
                  window.updateCartCount();
                }
              }
              
              event.source.postMessage({
                type: 'add-to-cart-success',
                variantId: variantId
              }, event.origin);
            } else {
              throw new Error(`Add to cart failed: ${response.status}`);
            }
          } catch (error) {
            console.error('[Shopify Theme] Add to cart failed:', error);
            event.source.postMessage({
              type: 'add-to-cart-error',
              error: error.message
            }, event.origin);
          }
          break;

        default:
          console.log('[Shopify Theme] Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('[Shopify Theme] Error handling message:', error);
    }
  });

  // Wait for DOM to be ready
  function initializeChatbot() {
    // Create chatbot iframe
    const iframe = document.createElement('iframe');
    iframe.id = 'chatbot';
    iframe.src = 'https://v0-custom-chat-interface-kappa.vercel.app';
    iframe.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 450px;
      height: 800px;
      border: none;
      z-index: 9999;
      overflow: hidden;
      border-radius: 1rem;
    `;
    iframe.allow = 'microphone';
    
    // Add iframe to page
    document.body.appendChild(iframe);

    // Send initial data when iframe loads
    iframe.onload = function() {
      const initData = {
        type: 'init',
        session_id: sessionId,
        source_url: sourceUrl,
        page_context: pageContext,
        cart_currency: cartCurrency,
        localization: localization
      };

      console.log('[Shopify Theme] Sent init data to chatbot iframe:', initData);
      
      iframe.contentWindow.postMessage(initData, 'https://v0-custom-chat-interface-kappa.vercel.app');
    };

    console.log('[Shopify Theme] Chatbot system initialized.');
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeChatbot);
  } else {
    initializeChatbot();
  }
})();
</script>
