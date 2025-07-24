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

    const { variantId, quantity = 1, redirect = true } = payload;

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

      // Redirect to cart if requested
      if (redirect) {
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
          break;

        case 'CHAT_MESSAGE':
          const { message } = event.data.data;
          handleChatMessage(event, message);
          break;

        case 'REQUEST_SESSION_DATA':
          // Re-send session data when requested
          sendSessionDataToChatbot();
          break;

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
              })
              .catch(error => {
                console.error('[Shopify Integration] Error fetching conversations:', error);
                event.source.postMessage({
                  type: 'conversations-response',
                  conversations: []
                }, '*');
              });
          } else {
            console.error('[Shopify Integration] ShopifyAPIClient not available for conversations request');
            event.source.postMessage({
              type: 'conversations-response',
              conversations: []
            }, '*');
          }
          break;

        case 'add-to-cart':
          // Handle add to cart request
          console.log('[Shopify Integration] Handling add-to-cart request:', event.data.payload);
          handleAddToCart(event, event.data.payload);
          break;

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
      } else if (messageData.type === 'conversations-response') {
        try {
          const conversations = JSON.parse(messageData.conversations);
          console.log('[Shopify Integration] Sending conversations response:', conversations);
          sendMessageToChatbot({
            type: 'conversations-response',
            conversations: conversations
          });
        } catch (error) {
          console.error('[Shopify Integration] Error fetching conversations:', error);
          sendMessageToChatbot({
            type: 'conversations-response',
            conversations: []
          });
        }
      } else if (messageData.type === 'send-chat-message') {
        console.log('[Shopify Integration] Handling chat message:', messageData.payload);
        try {
          // Forward the message to the n8n webhook
          const webhookUrl = 'https://similarly-secure-mayfly.ngrok-free.app/webhook/chat';

          const payload = {
            session_id: messageData.payload.session_id,
            message: messageData.payload.user_message || messageData.payload.message,
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
      } else {
        console.log('[Shopify Integration] Unknown message type:', messageData.type);
      }
    });

  // Start the process
  console.log('[Shopify Integration] Starting dependency check...');
  waitForDependencies();
})();