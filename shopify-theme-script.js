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

    const N8N_BASE_URL = 'https://your-n8n-instance-url'; // Change this to your n8n instance URL
    const API_ENDPOINTS = {
      saveConversation: `${N8N_BASE_URL}/webhook/save-conversation`,
      conversations: `${N8N_BASE_URL}/webhook/get-all-conversations`,
      conversationHistory: (id) => `${N8N_BASE_URL}/webhook/get-single-conversation/${id}`
    };

    async function saveConversation(conversationId) {
      try {
        console.log('[Shopify Theme] Saving conversation:', conversationId);
        const payload = {
          id: crypto.randomUUID(),
          session_id: sessionId,
          conversation_id: conversationId,
          timestamp: new Date().toISOString(),
          event_type: 'conversation_created',
          source_url: sourceUrl,
          page_context: pageContext,
          cart_currency: cartCurrency,
          localization: localization
        };

        const result = await fetch(API_ENDPOINTS.saveConversation, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        console.log('[Shopify Theme] Successfully saved conversation:', result);
        return await result.json();
      } catch (error) {
        console.error('[Shopify Theme] Failed to save conversation:', error);
        throw error;
      }
    }

    async function fetchAllConversations() {
      try {
        const response = await fetch(`${API_ENDPOINTS.conversations}?session_id=${encodeURIComponent(sessionId)}`);
        const conversations = await response.json();
        console.log('[Shopify Theme] Successfully fetched all conversations:', conversations);
        return conversations;
      } catch (error) {
        console.error('[Shopify Theme] Failed to fetch conversations:', error);
        throw error;
      }
    }

    async function fetchSingleConversation(conversationId) {
      try {
        const response = await fetch(API_ENDPOINTS.conversationHistory(conversationId) + `?session_id=${encodeURIComponent(sessionId)}`);
        const conversation = await response.json();
        console.log('[Shopify Theme] Successfully fetched conversation:', conversation);
        return conversation;
      } catch (error) {
        console.error('[Shopify Theme] Failed to fetch single conversation:', error);
        throw error;
      }
    }

    window.addEventListener('message', async function(event) {
      if (event.origin !== 'https://your-chatbot-app-url') { // Change this to your chatbot app URL
        console.warn('[Shopify Theme] Ignoring message from untrusted origin:', event.origin);
        return;
      }

      const message = event.data;
      console.log('[Shopify Theme] Received message from iframe:', message.type, message.payload);

      try {
        switch (message.type) {
          case 'save-conversation':
            await saveConversation(message.payload.conversationId);
            break;
          case 'get-all-conversations':
            const conversations = await fetchAllConversations();
            event.source.postMessage({
              type: 'conversations-response',
              conversations: conversations
            }, event.origin);
            break;
          case 'get-single-conversation':
            const conversation = await fetchSingleConversation(message.payload.conversationId);
            event.source.postMessage({
              type: 'conversation-response',
              conversation: conversation
            }, event.origin);
            break;
          default:
            console.log('[Shopify Theme] Unknown message type:', message.type);
        }
      } catch (error) {
        console.error('[Shopify Theme] Error handling message:', error);
      }
    });

    // Function to initialize the chatbot iframe
    function initializeChatbot() {
      const iframe = document.createElement('iframe');
      iframe.id = 'chatbot';
      iframe.src = 'https://your-chatbot-app-url'; // Change this to your chatbot app URL
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
      document.body.appendChild(iframe);

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
        iframe.contentWindow.postMessage(initData, 'https://your-chatbot-app-url'); // Change this to your chatbot app URL
      };

      console.log('[Shopify Theme] Chatbot system initialized.');
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initializeChatbot);
    } else {
      initializeChatbot();
    }
  })();
</script>
