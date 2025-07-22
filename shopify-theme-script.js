<script>
  (function() {
    console.log('[Shopify Theme] Initializing chatbot system...');

    // Get session ID from _shopify_y cookie
    let sessionId = null;

    const shopifyYCookie = document.cookie
      .split('; ')
      .find(row => row.startsWith('_shopify_y='));

    if (shopifyYCookie) {
      sessionId = shopifyYCookie.split('=')[1];
      console.log('[Shopify Theme] Found _shopify_y cookie, using session ID:', sessionId);
    } else {
      console.error('[Shopify Theme] No _shopify_y cookie found. Chatbot cannot function without proper Shopify session.');
      return; // Exit if no proper session cookie
    }

    console.log('[Chatbot] Determined session_id:', sessionId);

    // Get page context
    const pageContext = document.title || 'Unknown Page';
    const sourceUrl = window.location.href;
    const cartCurrency = (window.Shopify && window.Shopify.currency && window.Shopify.currency.active) || 'USD';
    const localization = (window.Shopify && window.Shopify.locale) || 'en';

    // Use Next.js API base URL
    const API_BASE_URL = 'https://v0-custom-chat-interface-kappa.vercel.app'; // Your Next.js app URL
    const API_ENDPOINTS = {
      conversations: `${API_BASE_URL}/api/conversations`,
      conversationHistory: (id) => `${API_BASE_URL}/api/conversations/${id}`,
      saveConversation: `${API_BASE_URL}/api/conversations/save`,
      saveMessage: `${API_BASE_URL}/api/messages/save`
    };

    // Send session data to chatbot iframe
    function sendSessionDataToChatbot() {
      const chatbotIframe = document.getElementById('chatbot');
      if (chatbotIframe && chatbotIframe.contentWindow) {
        console.log('[Shopify Theme] Sending session data to chatbot iframe');

        const sessionData = {
          type: 'SESSION_DATA',
          data: {
            session_id: sessionId,
            source_url: sourceUrl,
            page_context: pageContext,
            cart_currency: cartCurrency,
            localization: localization
          }
        };

        chatbotIframe.contentWindow.postMessage(sessionData, '*');
        console.log('[Shopify Theme] Session data sent:', sessionData);
      } else {
        console.error('[Shopify Theme] Chatbot iframe not found or not loaded');
      }
    }

    // Save conversation function (simplified)
    async function saveConversation(conversationId, name) {
      try {
        console.log('[Shopify Theme] Saving conversation:', conversationId);
        const payload = {
          session_id: sessionId,
          conversation_id: conversationId,
          name: name || `Conversation ${new Date().toLocaleString()}`
        };

        const result = await fetch(API_ENDPOINTS.saveConversation, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        if (!result.ok) {
          throw new Error(`HTTP error! status: ${result.status}`);
        }

        const data = await result.json();
        console.log('[Shopify Theme] Successfully saved conversation:', data);
        return data;
      } catch (error) {
        console.error('[Shopify Theme] Failed to save conversation:', error);
        throw error;
      }
    }

    // Fetch conversations function (simplified)
    async function fetchAllConversations() {
      try {
        console.log('[Shopify Theme] Fetching conversations for session:', sessionId);

        const url = `${API_ENDPOINTS.conversations}?session_id=${encodeURIComponent(sessionId)}&t=${Date.now()}`;
        console.log('[Shopify Theme] Request URL:', url);

        const result = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
          }
        });

        if (!result.ok) {
          throw new Error(`HTTP error! status: ${result.status}`);
        }

        const conversations = await result.json();
        console.log('[Shopify Theme] Successfully fetched conversations:', conversations);
        return conversations;
      } catch (error) {
        console.error('[Shopify Theme] Failed to fetch conversations:', error);
        return [];
      }
    }

    // Fetch conversation history function (simplified)
    async function fetchConversationHistory(conversationId) {
      try {
        console.log('[Shopify Theme] Fetching conversation history:', conversationId);

        const url = `${API_ENDPOINTS.conversationHistory(conversationId)}?session_id=${encodeURIComponent(sessionId)}&t=${Date.now()}`;
        console.log('[Shopify Theme] Request URL:', url);

        const result = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
          }
        });

        if (!result.ok) {
          throw new Error(`HTTP error! status: ${result.status}`);
        }

        const history = await result.json();
        console.log('[Shopify Theme] Successfully fetched conversation history:', history);
        return history;
      } catch (error) {
        console.error('[Shopify Theme] Failed to fetch conversation history:', error);
        return [];
      }
    }

    // Listen for messages from the chatbot iframe
    window.addEventListener('message', async function(event) {
      console.log('[Shopify Theme] Received message from iframe:', event.data);

      if (event.data.type === 'CONVERSATION_ACTION') {
        const { action, conversationId, name } = event.data.data;

        try {
          let result;
          switch (action) {
            case 'save':
              result = await saveConversation(conversationId, name);
              break;
            case 'fetch_all':
              result = await fetchAllConversations();
              break;
            case 'fetch_history':
              result = await fetchConversationHistory(conversationId);
              break;
            default:
              console.warn('[Shopify Theme] Unknown conversation action:', action);
              return;
          }

          // Send result back to iframe
          event.source.postMessage({
            type: 'CONVERSATION_RESULT',
            data: {
              action,
              conversationId,
              result,
              success: true
            }
          }, '*');

        } catch (error) {
          console.error('[Shopify Theme] Error handling conversation action:', error);

          // Send error back to iframe
          event.source.postMessage({
            type: 'CONVERSATION_RESULT',
            data: {
              action,
              conversationId,
              error: error.message,
              success: false
            }
          }, '*');
        }
      }
    });

    // Initialize chatbot when iframe is loaded
    function initializeChatbot() {
      console.log('[Shopify Theme] Initializing chatbot...');

      // Wait a bit for iframe to fully load
      setTimeout(() => {
        sendSessionDataToChatbot();
      }, 1000);

      console.log('[Shopify Theme] Chatbot system initialized.');
    }

    // Check if iframe already exists
    const existingIframe = document.getElementById('chatbot');
    if (existingIframe) {
      existingIframe.addEventListener('load', initializeChatbot);
      // If already loaded, initialize immediately
      if (existingIframe.contentDocument && existingIframe.contentDocument.readyState === 'complete') {
        initializeChatbot();
      }
    } else {
      // Wait for iframe to be added to DOM
      const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
          mutation.addedNodes.forEach(function(node) {
            if (node.nodeType === 1 && node.id === 'chatbot') {
              console.log('[Shopify Theme] Chatbot iframe detected');
              node.addEventListener('load', initializeChatbot);
              observer.disconnect();
            }
          });
        });
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }

  })();
</script>