/**
 * Shopify Chatbot Integration - Enhanced Version
 * Upload this to your Shopify theme assets folder
 */
(function() {
  'use strict';

  console.log('[Shopify Integration] Initializing enhanced chatbot integration...');

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
      ...sessionData,
      conversation_id: window.ShopifySessionManager.getConversationId()
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

  function handleConversationAction(event, action, conversationId, name) {
    console.log('[Shopify Integration] Handling conversation action:', action);

    if (!window.ShopifyAPIClient) {
      console.error('[Shopify Integration] ShopifyAPIClient not available');
      event.source.postMessage({
        type: 'CONVERSATION_RESULT',
        data: {
          action,
          conversationId,
          error: 'ShopifyAPIClient not available',
          success: false
        }
      }, '*');
      return;
    }

    let apiPromise;
    switch (action) {
      case 'save':
        apiPromise = window.ShopifyAPIClient.saveConversation(conversationId, name);
        break;
      case 'fetch_all':
        apiPromise = window.ShopifyAPIClient.fetchAllConversations();
        break;
      case 'fetch_history':
        apiPromise = window.ShopifyAPIClient.fetchConversationHistory(conversationId);
        break;
      default:
        console.warn('[Shopify Integration] Unknown conversation action:', action);
        event.source.postMessage({
          type: 'CONVERSATION_RESULT',
          data: {
            action,
            conversationId,
            error: `Unknown action: ${action}`,
            success: false
          }
        }, '*');
        return;
    }

    apiPromise
      .then(result => {
        event.source.postMessage({
          type: 'CONVERSATION_RESULT',
          data: {
            action,
            conversationId,
            result,
            success: true
          }
        }, '*');
      })
      .catch(error => {
        console.error('[Shopify Integration] Error handling conversation action:', error);
        event.source.postMessage({
          type: 'CONVERSATION_RESULT',
          data: {
            action,
            conversationId,
            error: error.message,
            success: false
          }
        }, '*');
      });
  }

  function handleChatMessage(event, message) {
    console.log('[Shopify Integration] Handling chat message:', message);

    if (!window.ShopifyAPIClient) {
      console.error('[Shopify Integration] ShopifyAPIClient not available');
      event.source.postMessage({
        type: 'CHAT_RESULT',
        data: {
          message,
          error: 'ShopifyAPIClient not available',
          success: false
        }
      }, '*');
      return;
    }

    window.ShopifyAPIClient.sendMessage(message)
      .then(result => {
        event.source.postMessage({
          type: 'CHAT_RESULT',
          data: {
            message,
            result,
            success: true
          }
        }, '*');
      })
      .catch(error => {
        console.error('[Shopify Integration] Error sending chat message:', error);
        event.source.postMessage({
          type: 'CHAT_RESULT',
          data: {
            message,
            error: error.message,
            success: false
          }
        }, '*');
      });
  }

  function handleAddToCart(event, payload) {
    console.log('[Shopify Integration] Processing add to cart:', payload);

    const { variantId, quantity = 1, redirect = false, productName, productPrice } = payload;

    if (!variantId) {
      console.error('[Shopify Integration] No variantId provided for add to cart');
      event.source.postMessage({
        type: 'add-to-cart-error',
        error: 'No variant ID provided'
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
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      console.log('[Shopify Integration] Successfully added to cart:', data);

      // Notify the chatbot of success
      event.source.postMessage({
        type: 'add-to-cart-success',
        variantId: variantId,
        data: data
      }, '*');

      // Show cart popup instead of redirecting
      if (!redirect) {
        showCartPopup(data, productName, productPrice);
      } else {
        console.log('[Shopify Integration] Redirecting to cart page...');
        window.location.href = '/cart';
      }
    })
    .catch(error => {
      console.error('[Shopify Integration] Error adding to cart:', error);

      // Notify the chatbot of error
      event.source.postMessage({
        type: 'add-to-cart-error',
        variantId: variantId,
        error: error.message
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

  function showCartPopup(cartData, productName, productPrice) {
    console.log('[Shopify Integration] Showing cart popup for:', productName);

    // Remove existing popup if any
    const existingPopup = document.getElementById('chatbot-cart-popup');
    if (existingPopup) {
      existingPopup.remove();
    }

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
        padding: 20px;
      ">
        <div style="
          background: white;
          border-radius: 12px;
          padding: 24px;
          max-width: 400px;
          width: 100%;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
          animation: slideUp 0.3s ease-out;
        ">
          <div style="text-align: center; margin-bottom: 20px;">
            <div style="
              width: 48px;
              height: 48px;
              background: #10b981;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 0 auto 12px auto;
            ">
              <svg width="24" height="24" fill="white" viewBox="0 0 24 24">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #111827;">
              Added to Cart!
            </h3>
            <p style="margin: 0; color: #6b7280; font-size: 14px;">
              ${productName || 'Product'} has been added to your cart
            </p>
          </div>

          <div style="
            background: #f9fafb;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 20px;
            border: 1px solid #e5e7eb;
          ">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 14px; color: #374151;">Cart Total:</span>
              <span style="font-weight: 600; color: #111827;" id="cart-total">
                Loading...
              </span>
            </div>
          </div>

          <div style="display: flex; gap: 12px;">
            <button onclick="closeChatbotCartPopup()" style="
              flex: 1;
              padding: 12px 16px;
              border: 1px solid #d1d5db;
              background: white;
              color: #374151;
              border-radius: 8px;
              font-size: 14px;
              font-weight: 500;
              cursor: pointer;
              transition: all 0.2s;
            " onmouseover="this.style.background='#f9fafb'" onmouseout="this.style.background='white'">
              Continue Shopping
            </button>
            <button onclick="goToCart()" style="
              flex: 1;
              padding: 12px 16px;
              border: none;
              background: #111827;
              color: white;
              border-radius: 8px;
              font-size: 14px;
              font-weight: 500;
              cursor: pointer;
              transition: all 0.2s;
            " onmouseover="this.style.background='#374151'" onmouseout="this.style.background='#111827'">
              View Cart
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
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(popup);

    // Update cart total
    updateCartTotal();

    // Auto close after 5 seconds
    setTimeout(() => {
      closeChatbotCartPopup();
    }, 5000);
  }

  function updateCartTotal() {
    fetch('/cart.js')
      .then(response => response.json())
      .then(cart => {
        const totalElement = document.getElementById('cart-total');
        if (totalElement) {
          const formatter = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: cart.currency || 'USD'
          });
          totalElement.textContent = formatter.format(cart.total_price / 100);
        }
      })
      .catch(error => {
        console.error('[Shopify Integration] Error fetching cart total:', error);
        const totalElement = document.getElementById('cart-total');
        if (totalElement) {
          totalElement.textContent = 'Error loading total';
        }
      });
  }

  // Global functions for popup
  window.closeChatbotCartPopup = function() {
    const popup = document.getElementById('chatbot-cart-popup');
    if (popup) {
      popup.style.opacity = '0';
      setTimeout(() => popup.remove(), 200);
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
        case 'CONVERSATION_ACTION':
          const { action, conversationId, name } = event.data.data;
          handleConversationAction(event, action, conversationId, name);
          return;

        case 'CHAT_MESSAGE':
          const { message } = event.data.data;
          handleChatMessage(event, message);
          return;

        case 'REQUEST_SESSION_DATA':
          // Re-send session data when requested
          sendSessionDataToChatbot();
          return;

        case 'get-all-conversations':
          // Handle conversation list request
          console.log('[Shopify Integration] Handling get-all-conversations request');

          // First try to use preloaded conversations if available
          if (window.preloadedConversations && window.preloadedConversations.length > 0) {
            console.log('[Shopify Integration] Using preloaded conversations:', window.preloadedConversations.length);
            event.source.postMessage({
              type: 'conversations-response',
              conversations: window.preloadedConversations
            }, '*');
            return;
          } else if (window.ShopifyAPIClient) {
            // Fallback to API call
            window.ShopifyAPIClient.fetchAllConversations()
              .then(conversations => {
                console.log('[Shopify Integration] Sending conversations response:', conversations);
                // Update preloaded cache
                window.preloadedConversations = conversations;
                event.source.postMessage({
                  type: 'conversations-response',
                  conversations: conversations
                }, '*');
                return;
              })
              .catch(error => {
                console.error('[Shopify Integration] Error fetching conversations:', error);
                event.source.postMessage({
                  type: 'conversations-response',
                  conversations: []
                }, '*');
                return;
              });
          } else {
            console.error('[Shopify Integration] ShopifyAPIClient not available for conversations request');
            event.source.postMessage({
              type: 'conversations-response',
              conversations: []
            }, '*');
            return;
          }
          break;

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
      const isOpen = localStorage.getItem('chatbotOpen') === 'true';
      const timestamp = localStorage.getItem('chatbotStateTimestamp');

      // Only restore state if it's recent (within 1 hour)
      const oneHour = 60 * 60 * 1000;
      const isRecent = timestamp && (Date.now() - parseInt(timestamp)) < oneHour;

      if (isOpen && isRecent) {
        console.log('[Shopify Integration] Restoring chatbot open state');
        // Let the iframe be created and then show it
        setTimeout(() => {
          const iframe = document.getElementById('chatbot');
          if (iframe) {
            iframe.style.display = 'block';
          }
        }, 1000);
      }
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
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 400px;
      height: 600px;
      border: none;
      border-radius: 12px;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
      z-index: 9999;
      background: white;
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

    // Pre-load conversations for better UX
    console.log('[Shopify Integration] Pre-loading conversations for session:', sessionData.session_id);
    if (window.ShopifyAPIClient) {
      window.ShopifyAPIClient.fetchAllConversations()
        .then(conversations => {
          console.log('[Shopify Integration] Pre-loaded conversations:', conversations.length);
          // Store in a global variable for quick access
          window.preloadedConversations = conversations;
        })
        .catch(error => {
          console.warn('[Shopify Integration] Failed to pre-load conversations:', error);
        });
    }

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

    window.addEventListener('message', function(event) {
      console.log('[Shopify Integration] Received message from parent window:', event.data);

      if (!event.data) {
        return;
      }

      const messageData = event.data;

      if (messageData.type === 'chat-response') {
        console.log('[Shopify Integration] Received chat response from webhook:', messageData.response);
        sendMessageToChatbot({
          type: 'chat-response',
          response: messageData.response
        });
        return;
      } else if (messageData.type === 'conversations-response') {
        try {
          const conversations = JSON.parse(messageData.conversations);
          console.log('[Shopify Integration] Sending conversations response:', conversations);
          sendMessageToChatbot({
            type: 'conversations-response',
            conversations: conversations
          });
          return;
        } catch (error) {
          console.error('[Shopify Integration] Error fetching conversations:', error);
          sendMessageToChatbot({
            type: 'conversations-response',
            conversations: []
          });
          return;
        }
      } else if (messageData.type === 'send-chat-message') {
        console.log('[Shopify Integration] Handling chat message:', messageData.payload);
        try {
          // Forward the message to the n8n webhook
          const webhookUrl = 'https://similarly-secure-mayfly.ngrok-free.app/webhook/chat';

          const payload = {
            session_id: messageData.payload.session_id,
            message: messageData.payload.type === 'voice' ? '' : (messageData.payload.user_message || messageData.payload.message),
            timestamp: messageData.payload.timestamp,
            conversation_id: messageData.payload.conversation_id,
            source_url: messageData.payload.source_url,
            page_context: messageData.payload.page_context,
            cart_currency: messageData.payload.cart_currency,
            localization: messageData.payload.localization,
            type: messageData.payload.type || 'text'
          };

          // Add audio data if it's a voice message
          if (messageData.payload.type === 'voice' && messageData.payload.audioData) {
            payload.audioData = messageData.payload.audioData;
            payload.mimeType = messageData.payload.mimeType;
            payload.duration = messageData.payload.duration;
          }

          console.log('[Shopify Integration] Sending to n8n webhook:', payload);

          fetch(webhookUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify(payload)
          })
          .then(response => {
            if (!response.ok) {
              throw new Error(`Webhook request failed: ${response.status}`);
            }
            return response.text();
          })
          .then(responseText => {
            console.log('[Shopify Integration] Webhook response:', responseText);

            let data;
            try {
              const parsedResponse = JSON.parse(responseText);
              data = Array.isArray(parsedResponse) ? parsedResponse[0] : parsedResponse;
            } catch (e) {
              console.error('[Shopify Integration] Failed to parse webhook response:', e);
              data = { message: "I received your message but had trouble processing the response." };
            }

            // Send the response back to the chatbot
            sendMessageToChatbot({
              type: 'chat-response',
              response: data
            });
          })
          .catch(error => {
            console.error('[Shopify Integration] Webhook error:', error);
            sendMessageToChatbot({
              type: 'chat-error',
              error: error.message
            });
          });

        } catch (error) {
          console.error('[Shopify Integration] Error processing chat message:', error);
          sendMessageToChatbot({
            type: 'chat-error',
            error: error.message
          });
        }
        return;
      } else if (messageData.type !== 'send-chat-message') {
          console.log('[Shopify Integration] Unknown message type:', messageData.type);
        }
    });

  // Start the process
  console.log('[Shopify Integration] Starting dependency check...');
  waitForDependencies();
})();