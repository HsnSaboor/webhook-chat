
/**
 * Shopify Chatbot Integration - Inline Version
 * This script should be embedded directly in the Shopify theme
 */
(function() {
  'use strict';

  console.log('[Shopify Integration] Initializing inline chatbot integration...');

  let initializationTimeout = null;
  let conversationId = null;

  function generateConversationId(sessionId) {
    const timestamp = Date.now();
    return `conv_${sessionId}_${timestamp}`;
  }

  function sendSessionDataToChatbot() {
    console.log('[Shopify Integration] Attempting to send session data to chatbot iframe...');
    
    const chatbotIframe = document.getElementById('chatbot');
    if (!chatbotIframe || !chatbotIframe.contentWindow) {
      console.error('[Shopify Integration] Chatbot iframe not found or not loaded');
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
    } catch (error) {
      console.error('[Shopify Integration] Error sending session data:', error);
    }
  }

  function handleConversationAction(event, action, conversationId, name) {
    console.log('[Shopify Integration] Handling conversation action:', action);

    if (!window.ShopifyAPIClient) {
      console.error('[Shopify Integration] ShopifyAPIClient not available');
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

  function setupMessageListener() {
    window.addEventListener('message', function(event) {
      console.log('[Shopify Integration] Received message from iframe:', event.data);

      // Accept messages from the chatbot iframe (any origin for now)
      if (event.data.type === 'CONVERSATION_ACTION') {
        const { action, conversationId, name } = event.data.data;
        handleConversationAction(event, action, conversationId, name);
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

  function main() {
    // Initialize session
    const sessionData = window.ShopifySessionManager.initialize();
    if (!sessionData) {
      console.error('[Shopify Integration] Failed to initialize session. Chatbot will not function.');
      return;
    }

    // Setup message listener
    setupMessageListener();

    // Setup iframe detection and initialization
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
              console.log('[Shopify Integration] Chatbot iframe detected');
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
        console.warn('[Shopify Integration] Session may not be properly authenticated, but proceeding anyway.');
      }
    }, 5000);
  }

  // Start the process
  console.log('[Shopify Integration] Starting dependency check...');
  waitForDependencies();
})();
