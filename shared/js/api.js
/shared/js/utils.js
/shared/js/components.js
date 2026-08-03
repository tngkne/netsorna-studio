/**
 * ============================================================================
 * API — Shared Fetch Wrapper
 * Source of truth for all HTTP requests across store and admin.
 * Features: base URL, auth headers, request/response interceptors,
 *           automatic retries, error normalization, abort support.
 * ============================================================================
 */

(function (global) {
  'use strict';

  /* --------------------------------------------------------------------------
     Configuration
     -------------------------------------------------------------------------- */

  const DEFAULT_CONFIG = {
    baseURL: '',
    timeout: 30000,
    retries: 1,
    retryDelay: 1000,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  };

  let config = { ...DEFAULT_CONFIG };

  /* --------------------------------------------------------------------------
     Interceptors
     -------------------------------------------------------------------------- */

  const requestInterceptors = [];
  const responseInterceptors = [];

  function addRequestInterceptor(fn) {
    requestInterceptors.push(fn);
    return () => {
      const idx = requestInterceptors.indexOf(fn);
      if (idx !== -1) requestInterceptors.splice(idx, 1);
    };
  }

  function addResponseInterceptor(fn) {
    responseInterceptors.push(fn);
    return () => {
      const idx = responseInterceptors.indexOf(fn);
      if (idx !== -1) responseInterceptors.splice(idx, 1);
    };
  }

  /* --------------------------------------------------------------------------
     Core Request
     -------------------------------------------------------------------------- */

  async function request(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${config.baseURL}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeout || config.timeout);

    let fetchOptions = {
      method: options.method || 'GET',
      headers: { ...config.headers, ...(options.headers || {}) },
      signal: controller.signal,
      ...options,
    };

    // Remove body for GET/HEAD
    if (fetchOptions.method === 'GET' || fetchOptions.method === 'HEAD') {
      delete fetchOptions.body;
    }

    // Stringify JSON body
    if (fetchOptions.body && typeof fetchOptions.body === 'object' && !(fetchOptions.body instanceof FormData) && !(fetchOptions.body instanceof URLSearchParams)) {
      fetchOptions.body = JSON.stringify(fetchOptions.body);
    }

    // Run request interceptors
    for (const interceptor of requestInterceptors) {
      fetchOptions = await interceptor(fetchOptions) || fetchOptions;
    }

    const maxRetries = options.retries !== undefined ? options.retries : config.retries;
    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, fetchOptions);
        clearTimeout(timeoutId);

        let data;
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          data = await response.json();
        } else {
          data = await response.text();
        }

        // Run response interceptors
        let result = { ok: response.ok, status: response.status, statusText: response.statusText, data, headers: response.headers };
        for (const interceptor of responseInterceptors) {
          result = await interceptor(result) || result;
        }

        if (!response.ok) {
          const error = new Error(result.data?.message || result.statusText || `HTTP ${result.status}`);
          error.status = result.status;
          error.data = result.data;
          error.response = response;
          throw error;
        }

        return result;
      } catch (err) {
        clearTimeout(timeoutId);
        lastError = err;

        // Don't retry on client errors (4xx) or aborts
        if (err.name === 'AbortError') throw err;
        if (err.status >= 400 && err.status < 500) throw err;

        if (attempt < maxRetries) {
          const delay = config.retryDelay * Math.pow(2, attempt);
          await sleep(delay);
        }
      }
    }

    throw lastError;
  }

  /* --------------------------------------------------------------------------
     HTTP Methods
     -------------------------------------------------------------------------- */

  const api = {
    get: (endpoint, options = {}) => request(endpoint, { ...options, method: 'GET' }),
    post: (endpoint, body, options = {}) => request(endpoint, { ...options, method: 'POST', body }),
    put: (endpoint, body, options = {}) => request(endpoint, { ...options, method: 'PUT', body }),
    patch: (endpoint, body, options = {}) => request(endpoint, { ...options, method: 'PATCH', body }),
    delete: (endpoint, options = {}) => request(endpoint, { ...options, method: 'DELETE' }),
  };

  /* --------------------------------------------------------------------------
     Utilities
     -------------------------------------------------------------------------- */

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function setBaseURL(url) {
    config.baseURL = url.replace(/\/$/, '');
  }

  function setAuthToken(token) {
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    } else {
      delete config.headers['Authorization'];
    }
  }

  function setHeader(key, value) {
    config.headers[key] = value;
  }

  function removeHeader(key) {
    delete config.headers[key];
  }

  function configure(newConfig) {
    config = { ...config, ...newConfig };
  }

  /* --------------------------------------------------------------------------
     Build & Export
     -------------------------------------------------------------------------- */

  const API = {
    request,
    ...api,
    addRequestInterceptor,
    addResponseInterceptor,
    setBaseURL,
    setAuthToken,
    setHeader,
    removeHeader,
    configure,
    getConfig: () => ({ ...config }),
  };

  // AMD
  if (typeof define === 'function' && define.amd) {
    define('api', [], () => API);
  }
  // CommonJS
  else if (typeof module !== 'undefined' && module.exports) {
    module.exports = API;
  }
  // Browser global
  else {
    global.API = API;
  }

})(typeof window !== 'undefined' ? window : this);
