
/**
 * Shopify Session Manager
 * Handles session detection and data management
 */
window.ShopifySessionManager = (function() {
  'use strict';

  let sessionData = null;

  function getSessionIdFromCookie() {
    const shopifyYCookie = document.cookie
      .split('; ')
      .find(row => row.startsWith('_shopify_y='));

    if (shopifyYCookie) {
      return shopifyYCookie.split('=')[1];
    }
    return null;
  }

  function collectPageContext() {
    return {
      pageContext: document.title || 'Unknown Page',
      sourceUrl: window.location.href,
      cartCurrency: (window.Shopify && window.Shopify.currency && window.Shopify.currency.active) || 'USD',
      localization: (window.Shopify && window.Shopify.locale) || 'en'
    };
  }

  function initializeSession() {
    console.log('[Session Manager] Initializing session...');

    const sessionId = getSessionIdFromCookie();
    if (!sessionId) {
      console.error('[Session Manager] No _shopify_y cookie found. Chatbot cannot function without proper Shopify session.');
      return null;
    }

    console.log('[Session Manager] Found session ID:', sessionId);

    const context = collectPageContext();
    sessionData = {
      session_id: sessionId,
      ...context
    };

    return sessionData;
  }

  function getSessionData() {
    return sessionData;
  }

  function isSessionValid() {
    return sessionData && sessionData.session_id;
  }

  // Public API
  return {
    initialize: initializeSession,
    getSessionData: getSessionData,
    isValid: isSessionValid
  };
})();
