/**
 * Shopify Chatbot Integration - Simplified Version
 * Upload this to your Shopify theme assets folder
 */
(function() {
  'use strict';

  console.log('[Shopify Integration] Initializing simplified chatbot integration...');

  let initializationTimeout = null;
  let retryCount = 0;
  const MAX_RETRIES = 5;

  function sendSessionDataToChatbot() {
    console.log('[Shopify Integration] Attempting to send session data to chatbot iframe...');

    const chatbotIframe = document.getElementById('chatbot');
    if (!chatbotIframe || !chatbotIframe.contentWindow) {
      console.error('[Shopify Integration] Chatbot iframe not found or not loaded');

      // Retry logic
      if (retryCount < MAX_RETRIES) {
        retryCount++;
        console.log(`[Shopify Integration] Retrying in 2 seconds... (attempt ${retryCount}/${MAX_RETRIES})`);
        setTimeout(sendSessionDataToChatbot, 2000);
      }
      return;
    }

    if (!window.ShopifySessionManager) {
      console.error('[Shopify Integration] ShopifySessionManager not available');
      return;
    }

    const sessionData = window.ShopifySessionManager.getSessionData();
    if (!sessionData) {
      console.error('[Shopify Integration] No session data available to send');
      return;
    }

    console.log('[Shopify Integration] Sending session data to chatbot iframe');

    const messageData = {
      type: 'init',
      ...sessionData
    };

    try {
      chatbotIframe.contentWindow.postMessage(messageData, '*');
      console.log('[Shopify Integration] Session data sent successfully:', messageData);
      retryCount = 0; // Reset retry count on success
    } catch (error) {
      console.error('[Shopify Integration] Error sending session data:', error);

      // Retry on error
      if (retryCount < MAX_RETRIES) {
        retryCount++;
        setTimeout(sendSessionDataToChatbot, 2000);
      }
    }
  }

  async function handleSendChatMessage(event, messageData) {
    console.log('[Shopify Integration] Handling send-chat-message:', messageData);

    try {
      // Use the correct webhook endpoint through our API proxy
      const webhookUrl = 'https://v0-custom-chat-interface-kappa.vercel.app/api/webhook';

      const payload = {
        session_id: messageData.session_id,
        message: messageData.type === 'voice' ? '' : (messageData.user_message || messageData.message),
        timestamp: messageData.timestamp,
        source_url: messageData.source_url || null,
        page_context: messageData.page_context || null,
        cart_currency: messageData.cart_currency || null,
        localization: messageData.localization || null,
        type: messageData.type || 'text',
        webhookUrl: 'https://similarly-secure-mayfly.ngrok-free.app/webhook/chat'
      };

      // Add audio data if it's a voice message
      if (messageData.type === 'voice' && messageData.audioData) {
        payload.audioData = messageData.audioData;
        payload.mimeType = messageData.mimeType || 'audio/webm';
        payload.duration = messageData.duration || 0;
        console.log('[Shopify Integration] Voice message data size:', messageData.audioData.length);
      }

      console.log('[Shopify Integration] Sending to n8n webhook:', payload);

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Webhook request failed: ${response.status}`);
      }

      const responseText = await response.text();
      console.log('[Shopify Integration] Webhook response:', responseText);

      let data;
      try {
        // Handle empty response
        if (!responseText || responseText.trim() === '') {
          console.warn('[Shopify Integration] Empty response from webhook');
          const isVoiceMessage = messageData.type === 'voice';
          data = { 
            message: isVoiceMessage 
              ? "I received your voice message, but the AI service is not responding. Please try sending a text message instead." 
              : "I received your message but there was no response from the server." 
          };
        } else {
          const parsedResponse = JSON.parse(responseText);
          data = Array.isArray(parsedResponse) ? parsedResponse[0] : parsedResponse;
        }
      } catch (e) {
        console.error('[Shopify Integration] Failed to parse webhook response:', e);
        console.error('[Shopify Integration] Raw response:', responseText);
        data = { message: "I received your message but had trouble processing the response." };
      }

      // Send the response back to the chatbot
      sendMessageToChatbot({
        type: 'chat-response',
        response: data
      });

    } catch (error) {
      console.error('[Shopify Integration] Webhook error:', error);
      sendMessageToChatbot({
        type: 'chat-error',
        error: error.message
      });
    }
  }

  function handleAddToCart(event, payload) {
    console.log('[Shopify Integration] Processing add to cart:', payload);

    let variantId = payload.variantId;
    const quantity = payload.quantity || 1;
    const productName = payload.productName || 'Product';
    const productPrice = payload.productPrice || '0';

    // Enhanced variant ID extraction with better logging
    if (!variantId && payload.selectedVariant) {
      if (payload.selectedVariant.id) {
        variantId = payload.selectedVariant.id;
        console.log('[Shopify Integration] Using variantId from selectedVariant.id:', variantId);
      } else if (payload.selectedVariant.variantId) {
        variantId = payload.selectedVariant.variantId;
        console.log('[Shopify Integration] Using variantId from selectedVariant.variantId:', variantId);
      }
    }

    if (!variantId) {
      console.error('[Shopify Integration] No variantId provided for add to cart', {
        payload,
        variantId,
        selectedVariant: payload.selectedVariant
      });

      // Notify the chatbot of error with detailed info
      event.source.postMessage({
        type: 'add-to-cart-error',
        variantId: variantId,
        error: 'No variant ID provided. Please select a product variant.',
        details: {
          payload,
          missingVariantId: true
        }
      }, '*');
      return;
    }

    // Use Shopify's AJAX Cart API
    const formData = new FormData();
    formData.append('id', variantId);
    formData.append('quantity', quantity);

    console.log('[Shopify Integration] Adding to cart - variantId:', variantId, 'quantity:', quantity);

    fetch('/cart/add.js', {
      method: 'POST',
      body: formData
    })
    .then(response => {
      if (!response.ok) {
        return response.text().then(text => {
          throw new Error(`HTTP error! status: ${response.status}, message: ${text}`);
        });
      }
      return response.json();
    })
    .then(data => {
      console.log('[Shopify Integration] Successfully added to cart:', data);

      // Fetch updated cart total
      return fetch('/cart.js')
        .then(cartResponse => cartResponse.json())
        .then(cartData => {
          console.log('[Shopify Integration] Updated cart data:', cartData);

          // Notify the chatbot of success with cart total
          event.source.postMessage({
            type: 'add-to-cart-success',
            variantId: variantId,
            data: data,
            cartTotal: (cartData.total_price / 100).toFixed(2),
            cartItemCount: cartData.item_count
          }, '*');

          // Show cart popup
          showCartPopup(data, productName, productPrice, cartData);

          return data;
        });
    })
    .catch(error => {
      console.error('[Shopify Integration] Error adding to cart:', error);

      // Notify the chatbot of error
      event.source.postMessage({
        type: 'add-to-cart-error',
        variantId: variantId,
        error: error.message,
        details: {
          variantId,
          quantity,
          productName
        }
      }, '*');
    });
  }

  function handleProductNavigation(event, payload) {
    console.log('[Shopify Integration] Processing product navigation:', payload);

    const { productUrl, productHandle } = payload;

    if (!productUrl && !productHandle) {
      console.error('[Shopify Integration] No product URL or handle provided');
      return;
    }

    // Navigate to product page
    try {
      const targetUrl = productUrl || `/products/${productHandle}`;
      console.log('[Shopify Integration] Navigating to product page:', targetUrl);
      window.location.href = targetUrl;
    } catch (error) {
      console.error('[Shopify Integration] Error navigating to product:', error);
    }
  }

  async function handleGetAllConversations(event) {
    console.log('[Shopify Integration] Processing get-all-conversations request');

    try {
      if (!window.ShopifySessionManager) {
        throw new Error('ShopifySessionManager not available');
      }

      const sessionData = window.ShopifySessionManager.getSessionData();
      if (!sessionData) {
        throw new Error('No valid session data available');
      }

      // Fetch session data from our API
      const response = await fetch(`https://v0-custom-chat-interface-kappa.vercel.app/api/sessions?session_id=${sessionData.session_id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch conversations: ${response.status}`);
      }

      const sessions = await response.json();
      console.log('[Shopify Integration] Successfully fetched sessions:', sessions);

      // Send the sessions back to the chatbot (keeping conversations-response for frontend compatibility)
      sendMessageToChatbot({
        type: 'conversations-response',
        conversations: sessions || []
      });

    } catch (error) {
      console.error('[Shopify Integration] Error fetching sessions:', error);
      sendMessageToChatbot({
        type: 'conversations-error',
        error: error.message
      });
    }
  }

  function showCartPopup(addedItemData, productName, productPrice, fullCartData) {
    console.log('[Shopify Integration] Showing cart popup for:', productName, { addedItemData, fullCartData });

    // Remove existing popup if any
    const existingPopup = document.getElementById('chatbot-cart-popup');
    if (existingPopup) {
      existingPopup.remove();
    }

    // Calculate cart total from full cart data
    const cartTotal = fullCartData ? (fullCartData.total_price / 100).toFixed(2) : 'Loading...';
    const cartCurrency = fullCartData ? fullCartData.currency : 'USD';
    const itemCount = fullCartData ? fullCartData.item_count : 1;

    // Create popup HTML
    const popup = document.createElement('div');
    popup.id = 'chatbot-cart-popup';
    popup.innerHTML = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
        animation: fadeIn 0.3s ease-out;
      ">
        <div style="
          background: white;
          border-radius: 16px;
          padding: 24px;
          max-width: 90vw;
          width: 100%;
          max-width: 400px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          animation: slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
        ">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="
              width: 56px;
              height: 56px;
              background: linear-gradient(135deg, #10b981, #059669);
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 0 auto 16px auto;
              box-shadow: 0 8px 24px rgba(16, 185, 129, 0.3);
            ">
              <svg width="28" height="28" fill="white" viewBox="0 0 24 24">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <h3 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 700; color: #111827;">
              Added to Cart!
            </h3>
            <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 15px; font-weight: 500;">
              ${productName} has been added to your cart
            </p>
            <div style="
              padding: 20px;
              background: linear-gradient(135deg, #f8fafc, #f1f5f9);
              border-radius: 12px;
              margin: 16px 0;
              border: 1px solid #e2e8f0;
            ">
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #64748b; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 600;">
                Cart Total (${itemCount} item${itemCount !== 1 ? 's' : ''})
              </p>
              <p style="margin: 0; font-size: 28px; font-weight: 800; color: #0f172a; text-shadow: 0 1px 2px rgba(0,0,0,0.1);">
                $${cartTotal}
              </p>
            </div>
          </div>

          <div style="display: flex; gap: 12px; flex-direction: column;">
            <button onclick="goToCart()" style="
              width: 100%;
              padding: 14px 20px;
              border: none;
              background: #111827;
              color: white;
              border-radius: 12px;
              font-size: 16px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.2s;
            " onmouseover="this.style.background='#374151'" onmouseout="this.style.background='#111827'">
              Go to Cart
            </button>
            <button onclick="closeChatbotCartPopup()" style="
              width: 100%;
              padding: 12px 16px;
              border: 1px solid #d1d5db;
              background: white;
              color: #374151;
              border-radius: 12px;
              font-size: 14px;
              font-weight: 500;
              cursor: pointer;
              transition: all 0.2s;
            " onmouseover="this.style.background='#f9fafb'" onmouseout="this.style.background='white'">
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    `;

    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideUp {
        from {
          opacity: 0;
          transform: translateY(20px) scale(0.9);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(popup);

    // Auto close after 7 seconds
    setTimeout(() => {
      closeChatbotCartPopup();
    }, 7000);
  }

  // Global functions for popup
  window.closeChatbotCartPopup = function() {
    const popup = document.getElementById('chatbot-cart-popup');
    if (popup) {
      popup.style.opacity = '0';
      setTimeout(() => popup.remove(), 200);
    }

    // Send message to chatbot to stay in current conversation
    const chatbotIframe = document.getElementById('chatbot');
    if (chatbotIframe && chatbotIframe.contentWindow) {
      chatbotIframe.contentWindow.postMessage({
        type: 'continue-shopping',
        action: 'stay-in-conversation'
      }, '*');
    }
  };

  window.goToCart = function() {
    window.location.href = '/cart';
  };

  function setupMessageListener() {
    window.addEventListener('message', function(event) {
      console.log('[Shopify Integration] Received message from iframe:', event.data);

      if (!event.data || !event.data.type) {
        return;
      }

      switch (event.data.type) {
        case 'REQUEST_SESSION_DATA':
          // Re-send session data when requested
          sendSessionDataToChatbot();
          return;

        case 'send-chat-message':
          console.log('[Shopify Integration] Handling send-chat-message request:', event.data.payload);
          handleSendChatMessage(event, event.data.payload);
          return;

        case 'add-to-cart':
          // Handle add to cart request
          console.log('[Shopify Integration] Handling add-to-cart request:', event.data.payload);
          handleAddToCart(event, event.data.payload);
          return;

        case 'navigate-to-product':
          // Handle product navigation request
          console.log('[Shopify Integration] Handling navigate-to-product request:', event.data.payload);
          handleProductNavigation(event, event.data.payload);
          return;

        case 'get-all-conversations':
          // Handle conversation list request
          console.log('[Shopify Integration] Handling get-all-conversations request');
          handleGetAllConversations(event);
          return;

        default:
          console.log('[Shopify Integration] Unknown message type:', event.data.type);
      }
    });
  }

  function initializeChatbot() {
    console.log('[Shopify Integration] Initializing chatbot...');

    // Clear any existing timeout
    if (initializationTimeout) {
      clearTimeout(initializationTimeout);
    }

    // Wait a bit for iframe to fully load
    initializationTimeout = setTimeout(() => {
      sendSessionDataToChatbot();
    }, 1000);

    console.log('[Shopify Integration] Chatbot system initialized.');
  }

  function waitForDependencies() {
    if (typeof window.ShopifySessionManager === 'undefined' || 
        typeof window.ShopifyAPIClient === 'undefined') {
      console.log('[Shopify Integration] Waiting for dependencies...');
      setTimeout(waitForDependencies, 100);
      return;
    }

    console.log('[Shopify Integration] Dependencies loaded, proceeding with initialization...');
    main();
  }

  function sendMessageToChatbot(message) {
    const chatbotIframe = document.getElementById('chatbot');
    if (chatbotIframe && chatbotIframe.contentWindow) {
      chatbotIframe.contentWindow.postMessage(message, '*');
    } else {
      console.error('[Shopify Integration] Chatbot iframe not found or not ready to receive messages.');
    }
  }

  function saveChatbotState(isOpen) {
    try {
      localStorage.setItem('chatbotOpen', isOpen ? 'true' : 'false');
      localStorage.setItem('chatbotStateTimestamp', Date.now().toString());
      console.log('[Shopify Integration] Chatbot state saved:', isOpen);
    } catch (error) {
      console.warn('[Shopify Integration] Failed to save chatbot state:', error);
    }
  }

  function restoreChatbotState() {
    try {
      // Always show the chatbot by default
      setTimeout(() => {
        const iframe = document.getElementById('chatbot');
        if (iframe) {
          iframe.style.display = 'block';
        }
      }, 1000);
    } catch (error) {
      console.warn('[Shopify Integration] Failed to restore chatbot state:', error);
    }
  }

  function setupChatbotStateTracking() {
    // Track when chatbot is opened/closed
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          const iframe = mutation.target;
          if (iframe.id === 'chatbot') {
            const isVisible = iframe.style.display !== 'none' && 
                             iframe.offsetWidth > 0 && 
                             iframe.offsetHeight > 0;
            saveChatbotState(isVisible);
          }
        }
      });
    });

    // Start observing
    const iframe = document.getElementById('chatbot');
    if (iframe) {
      observer.observe(iframe, { 
        attributes: true, 
        attributeFilter: ['style'] 
      });
    }
  }

  function createChatbotIframe() {
    console.log('[Shopify Integration] Creating chatbot iframe...');

    const iframe = document.createElement('iframe');
    iframe.id = 'chatbot';
    iframe.src = 'https://v0-custom-chat-interface-kappa.vercel.app/';
    iframe.style.cssText = `
      position: fixed !important;
      bottom: 20px !important;
      right: 20px !important;
      width: 400px;
      height: 600px;
      border: none;
      border-radius: 12px;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
      z-index: 9999;
      background: white;

      @media (max-width: 600px) {
        /* On smaller screens, make the chatbot take up more vertical space */
        height: 90vh; /* Use 90% of the viewport height */
        max-height: 90vh; /* Ensure it doesn't exceed 90% */
      }
    `;
    iframe.title = 'Chatbot';
    iframe.allow = 'microphone';

    iframe.addEventListener('load', initializeChatbot);

    document.body.appendChild(iframe);
    console.log('[Shopify Integration] Chatbot iframe created and added to page');

    // Setup state tracking
    setupChatbotStateTracking();

    return iframe;
  }

  function main() {
    // Initialize session
    const sessionData = window.ShopifySessionManager.initialize();
    if (!sessionData) {
      console.error('[Shopify Integration] Failed to initialize session. Chatbot will not function properly.');
      return;
    }

    // Setup message listener
    setupMessageListener();

    // Restore chatbot state from localStorage
    restoreChatbotState();

    // Setup iframe detection and initialization
    let chatbotIframe = document.getElementById('chatbot');

    if (chatbotIframe) {
      console.log('[Shopify Integration] Found existing chatbot iframe');
      chatbotIframe.addEventListener('load', initializeChatbot);

      // If already loaded, initialize immediately
      if (chatbotIframe.contentDocument && chatbotIframe.contentDocument.readyState === 'complete') {
        initializeChatbot();
      }
    } else {
      // Create the iframe if it doesn't exist
      chatbotIframe = createChatbotIframe();

      // Also watch for iframe being added by other scripts
      const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
          mutation.addedNodes.forEach(function(node) {
            if (node.nodeType === 1 && node.id === 'chatbot' && node !== chatbotIframe) {
              console.log('[Shopify Integration] Another chatbot iframe detected');
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

    // Setup session validation timeout
    setTimeout(() => {
      if (!window.ShopifySessionManager.isValid()) {
        console.warn('[Shopify Integration] Session may not be properly authenticated from Shopify cookies, but using generated session.');
      } else {
        console.log('[Shopify Integration] Valid Shopify session detected!');
      }
    }, 3000);

    console.log('[Shopify Integration] Main initialization complete');
  }

  // Start the process
  console.log('[Shopify Integration] Starting dependency check...');
  waitForDependencies();
})();