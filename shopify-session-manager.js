
/**
 * Shopify Session Manager - Inline Version
 * This script should be embedded directly in the Shopify theme
 */
(function() {
  'use strict';

  console.log('[Shopify Session Manager] Initializing inline session manager...');

  let sessionData = null;

  function getAllCookies() {
    const cookies = {};
    document.cookie.split(';').forEach(cookie => {
      const [name, value] = cookie.trim().split('=');
      if (name && value) {
        cookies[name] = decodeURIComponent(value);
      }
    });
    return cookies;
  }

  function getShopifySessionId() {
    console.log('[Session Manager] Looking for Shopify session cookies...');
    
    const cookies = getAllCookies();
    console.log('[Session Manager] All available cookies:', Object.keys(cookies));

    // Try multiple possible Shopify session cookies
    const possibleSessionCookies = [
      '_shopify_y',
      '_shopify_s', 
      '_shopify_sa_p',
      '_shopify_sa_t',
      'cart',
      '_secure_session_id',
      'secure_customer_sig'
    ];

    for (const cookieName of possibleSessionCookies) {
      if (cookies[cookieName]) {
        console.log('[Session Manager] Found session cookie:', cookieName, '=', cookies[cookieName]);
        return cookies[cookieName];
      }
    }

    // Try to get from Shopify global variables
    if (window.Shopify && window.Shopify.shop) {
      const shopifySessionId = `shopify_${window.Shopify.shop}_${Date.now()}`;
      console.log('[Session Manager] Generated session from Shopify.shop:', shopifySessionId);
      return shopifySessionId;
    }

    // As last resort, create a stable session based on shop domain
    const shopDomain = window.location.hostname;
    const browserFingerprint = navigator.userAgent + navigator.language + screen.width + screen.height;
    const sessionId = `session_${btoa(shopDomain + browserFingerprint).slice(0, 16)}_${Date.now()}`;
    console.log('[Session Manager] Generated fallback session ID:', sessionId);
    return sessionId;
  }

  function getShopifyData() {
    console.log('[Session Manager] Collecting Shopify data...');
    
    // Get cart currency from multiple sources
    let cartCurrency = 'USD';
    if (window.Shopify && window.Shopify.currency && window.Shopify.currency.active) {
      cartCurrency = window.Shopify.currency.active;
    } else if (window.theme && window.theme.moneyFormat) {
      // Extract currency from money format
      const match = window.theme.moneyFormat.match(/\{\{\s*amount\s*\|\s*money_with_currency:\s*'([^']+)'/);
      if (match) cartCurrency = match[1];
    }

    // Get localization from multiple sources
    let localization = 'en';
    if (window.Shopify && window.Shopify.locale) {
      localization = window.Shopify.locale;
    } else if (document.documentElement.lang) {
      localization = document.documentElement.lang;
    }

    // Get page context
    let pageContext = document.title || 'Unknown Page';
    if (window.meta && window.meta.page && window.meta.page.pageType) {
      pageContext = `${window.meta.page.pageType}: ${pageContext}`;
    }

    // Try to get additional Shopify context
    const shopifyContext = {};
    if (window.Shopify) {
      if (window.Shopify.shop) shopifyContext.shop = window.Shopify.shop;
      if (window.Shopify.theme) shopifyContext.theme = window.Shopify.theme;
      if (window.Shopify.routes) shopifyContext.routes = window.Shopify.routes;
    }

    console.log('[Session Manager] Collected Shopify data:', {
      cartCurrency,
      localization,
      pageContext,
      shopifyContext
    });

    return {
      cartCurrency,
      localization,
      pageContext,
      sourceUrl: window.location.href,
      shopifyContext
    };
  }

  function initializeSession() {
    console.log('[Session Manager] Initializing session...');

    const sessionId = getShopifySessionId();
    const shopifyData = getShopifyData();

    sessionData = {
      session_id: sessionId,
      source_url: shopifyData.sourceUrl,
      page_context: shopifyData.pageContext,
      cart_currency: shopifyData.cartCurrency,
      localization: shopifyData.localization,
      shopify_context: shopifyData.shopifyContext
    };

    console.log('[Session Manager] Session initialized:', sessionData);
    return sessionData;
  }

  function getSessionData() {
    return sessionData;
  }

  function isSessionValid() {
    return sessionData && sessionData.session_id && !sessionData.session_id.startsWith('fallback-');
  }

  // Expose to global scope
  window.ShopifySessionManager = {
    initialize: initializeSession,
    getSessionData: getSessionData,
    isValid: isSessionValid
  };

  console.log('[Session Manager] Inline session manager loaded successfully');
})();
