
/**
 * Shopify Session Manager - Enhanced Version
 * Upload this to your Shopify theme assets folder
 */
(function() {
  'use strict';

  console.log('[Shopify Session Manager] Initializing enhanced session manager...');

  let sessionData = null;
  let conversationId = null;

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
    console.log('[Session Manager] Available cookies:', Object.keys(cookies));

    // Try multiple possible Shopify session cookies in order of preference
    const possibleSessionCookies = [
      '_shopify_y',
      '_shopify_s', 
      '_shopify_sa_p',
      '_shopify_sa_t',
      'cart',
      '_secure_session_id',
      'secure_customer_sig',
      '_shopify_tw',
      '_shopify_m'
    ];

    for (const cookieName of possibleSessionCookies) {
      if (cookies[cookieName]) {
        console.log('[Session Manager] Found session cookie:', cookieName, '=', cookies[cookieName].substring(0, 20) + '...');
        return cookies[cookieName];
      }
    }

    // Try to get from Shopify global variables
    if (window.Shopify && window.Shopify.shop) {
      const shopifySessionId = `shopify_${window.Shopify.shop}_${Date.now()}`;
      console.log('[Session Manager] Generated session from Shopify.shop:', shopifySessionId);
      return shopifySessionId;
    }

    // Try to extract from cart token
    if (window.CartJS && window.CartJS.cart && window.CartJS.cart.token) {
      const cartSessionId = `cart_${window.CartJS.cart.token}`;
      console.log('[Session Manager] Generated session from cart token:', cartSessionId);
      return cartSessionId;
    }

    // Check localStorage for any Shopify data
    try {
      const localStorageKeys = Object.keys(localStorage);
      for (const key of localStorageKeys) {
        if (key.includes('shopify') || key.includes('cart')) {
          const value = localStorage.getItem(key);
          if (value && value.length > 10) {
            console.log('[Session Manager] Found localStorage session:', key);
            return `ls_${btoa(value).slice(0, 16)}_${Date.now()}`;
          }
        }
      }
    } catch (e) {
      console.warn('[Session Manager] Could not access localStorage:', e);
    }

    // As last resort, create a stable session based on shop domain and browser fingerprint
    const shopDomain = window.location.hostname;
    const browserFingerprint = navigator.userAgent + navigator.language + screen.width + screen.height + window.location.pathname;
    const sessionId = `session_${btoa(shopDomain + browserFingerprint).slice(0, 16)}_${Date.now()}`;
    console.log('[Session Manager] Generated fallback session ID:', sessionId);
    return sessionId;
  }

  function getCartCurrency() {
    // Try multiple sources for cart currency
    if (window.Shopify && window.Shopify.currency && window.Shopify.currency.active) {
      return window.Shopify.currency.active;
    }
    
    if (window.theme && window.theme.moneyFormat) {
      const match = window.theme.moneyFormat.match(/\{\{\s*amount\s*\|\s*money_with_currency:\s*'([^']+)'/);
      if (match) return match[1];
    }

    if (window.CartJS && window.CartJS.cart && window.CartJS.cart.currency) {
      return window.CartJS.cart.currency;
    }

    // Check meta tags
    const currencyMeta = document.querySelector('meta[name="currency"]') || document.querySelector('meta[property="product:price:currency"]');
    if (currencyMeta) {
      return currencyMeta.getAttribute('content');
    }

    // Try to extract from price elements
    const priceElements = document.querySelectorAll('[class*="price"], [class*="money"], [data-currency]');
    for (const element of priceElements) {
      const currency = element.getAttribute('data-currency');
      if (currency) return currency;
      
      const text = element.textContent || '';
      const currencyMatch = text.match(/([A-Z]{3})/);
      if (currencyMatch) return currencyMatch[1];
    }

    return 'USD'; // Default fallback
  }

  function getLocalization() {
    // Try multiple sources for localization
    if (window.Shopify && window.Shopify.locale) {
      return window.Shopify.locale;
    }
    
    if (document.documentElement.lang) {
      return document.documentElement.lang;
    }

    // Check meta tags
    const langMeta = document.querySelector('meta[name="language"]') || document.querySelector('meta[http-equiv="content-language"]');
    if (langMeta) {
      return langMeta.getAttribute('content');
    }

    // Try to get from URL
    const pathMatch = window.location.pathname.match(/^\/([a-z]{2}(-[A-Z]{2})?)\//);
    if (pathMatch) {
      return pathMatch[1];
    }

    return navigator.language || 'en'; // Browser language as fallback
  }

  function getPageContext() {
    let pageContext = document.title || 'Unknown Page';
    
    // Enhanced page context detection
    if (window.meta && window.meta.page) {
      if (window.meta.page.pageType) {
        pageContext = `${window.meta.page.pageType}: ${pageContext}`;
      }
      if (window.meta.page.resourceType) {
        pageContext += ` (${window.meta.page.resourceType})`;
      }
    }

    // Check for product page
    if (window.location.pathname.includes('/products/')) {
      pageContext = `Product: ${pageContext}`;
    } else if (window.location.pathname.includes('/collections/')) {
      pageContext = `Collection: ${pageContext}`;
    } else if (window.location.pathname.includes('/cart')) {
      pageContext = `Cart: ${pageContext}`;
    } else if (window.location.pathname === '/') {
      pageContext = `Home: ${pageContext}`;
    }

    return pageContext;
  }

  function getShopifyContext() {
    const context = {};
    
    if (window.Shopify) {
      if (window.Shopify.shop) context.shop = window.Shopify.shop;
      if (window.Shopify.theme) context.theme = window.Shopify.theme;
      if (window.Shopify.routes) context.routes = window.Shopify.routes;
      if (window.Shopify.cdnHost) context.cdnHost = window.Shopify.cdnHost;
    }

    // Get cart information
    if (window.CartJS && window.CartJS.cart) {
      context.cart = {
        token: window.CartJS.cart.token,
        item_count: window.CartJS.cart.item_count,
        total_price: window.CartJS.cart.total_price
      };
    }

    // Get customer information if available
    if (window.customer) {
      context.customer = {
        id: window.customer.id,
        email: window.customer.email,
        tags: window.customer.tags
      };
    }

    return context;
  }

  function generateConversationId(sessionId) {
    if (conversationId) {
      return conversationId;
    }
    const timestamp = Date.now();
    conversationId = `conv_${sessionId}_${timestamp}`;
    return conversationId;
  }

  function initializeSession() {
    console.log('[Session Manager] Initializing session...');

    const sessionId = getShopifySessionId();
    const cartCurrency = getCartCurrency();
    const localization = getLocalization();
    const pageContext = getPageContext();
    const shopifyContext = getShopifyContext();

    sessionData = {
      session_id: sessionId,
      source_url: window.location.href,
      page_context: pageContext,
      cart_currency: cartCurrency,
      localization: localization,
      shopify_context: shopifyContext,
      timestamp: new Date().toISOString()
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

  function getConversationId() {
    if (!sessionData) return null;
    return generateConversationId(sessionData.session_id);
  }

  // Expose to global scope
  window.ShopifySessionManager = {
    initialize: initializeSession,
    getSessionData: getSessionData,
    getConversationId: getConversationId,
    isValid: isSessionValid
  };

  console.log('[Session Manager] Enhanced session manager loaded successfully');
})();
