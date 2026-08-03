/**
 * ============================================================================
 * STORE — Shared Utilities
 * Source of truth: /shared/js/utils.js
 * This is a COPY for the store site. Edit /shared/js/utils.js to cascade.
 * ============================================================================
 */

(function (global) {
  'use strict';

  /* ==========================================================================
     FORMATTERS
     ========================================================================== */

  /**
   * Format a number as currency.
   * @param {number} amount
   * @param {string} currency — ISO 4217 code (default: 'USD')
   * @param {string} locale — BCP 47 language tag (default: 'en-US')
   * @returns {string}
   */
  function formatCurrency(amount, currency = 'USD', locale = 'en-US') {
    if (amount === null || amount === undefined || isNaN(amount)) return '';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  /**
   * Format a number with locale-aware separators.
   * @param {number} num
   * @param {string} locale
   * @returns {string}
   */
  function formatNumber(num, locale = 'en-US') {
    if (num === null || num === undefined || isNaN(num)) return '';
    return new Intl.NumberFormat(locale).format(num);
  }

  /**
   * Format a percentage (0.15 → "15%").
   * @param {number} value — 0–1 range
   * @param {number} decimals
   * @param {string} locale
   * @returns {string}
   */
  function formatPercent(value, decimals = 0, locale = 'en-US') {
    if (value === null || value === undefined || isNaN(value)) return '';
    return new Intl.NumberFormat(locale, {
      style: 'percent',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  }

  /**
   * Format a date string or Date object.
   * @param {string|Date} date
   * @param {object} options — Intl.DateTimeFormat options
   * @param {string} locale
   * @returns {string}
   */
  function formatDate(date, options = {}, locale = 'en-US') {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';
    const defaults = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Intl.DateTimeFormat(locale, { ...defaults, ...options }).format(d);
  }

  /**
   * Format a date as relative time (e.g., "2 hours ago").
   * @param {string|Date} date
   * @param {string} locale
   * @returns {string}
   */
  function formatRelativeTime(date, locale = 'en-US') {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffMs = now - d;
    const diffSec = Math.round(diffMs / 1000);
    const diffMin = Math.round(diffSec / 60);
    const diffHour = Math.round(diffMin / 60);
    const diffDay = Math.round(diffHour / 24);

    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

    if (Math.abs(diffSec) < 60) return rtf.format(-diffSec, 'second');
    if (Math.abs(diffMin) < 60) return rtf.format(-diffMin, 'minute');
    if (Math.abs(diffHour) < 24) return rtf.format(-diffHour, 'hour');
    if (Math.abs(diffDay) < 30) return rtf.format(-diffDay, 'day');

    return formatDate(d, {}, locale);
  }

  /**
   * Format bytes to human-readable (e.g., "1.5 MB").
   * @param {number} bytes
   * @param {number} decimals
   * @returns {string}
   */
  function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
  }

  /**
   * Format a phone number (naive US formatter — override per locale).
   * @param {string} phone
   * @returns {string}
   */
  function formatPhone(phone) {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  }

  /**
   * Truncate text with ellipsis.
   * @param {string} str
   * @param {number} maxLength
   * @param {string} suffix
   * @returns {string}
   */
  function truncate(str, maxLength = 100, suffix = '...') {
    if (!str || str.length <= maxLength) return str || '';
    return str.slice(0, maxLength - suffix.length).trim() + suffix;
  }

  /**
   * Convert a string to slug format.
   * @param {string} str
   * @returns {string}
   */
  function slugify(str) {
    return str
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /* ==========================================================================
     VALIDATORS
     ========================================================================== */

  const validators = {
    required: (value) => {
      const valid = value !== null && value !== undefined && String(value).trim() !== '';
      return { valid, message: valid ? '' : 'This field is required.' };
    },

    email: (value) => {
      const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const valid = pattern.test(String(value));
      return { valid, message: valid ? '' : 'Please enter a valid email address.' };
    },

    minLength: (value, min) => {
      const valid = String(value).length >= min;
      return { valid, message: valid ? '' : `Must be at least ${min} characters.` };
    },

    maxLength: (value, max) => {
      const valid = String(value).length <= max;
      return { valid, message: valid ? '' : `Must be at most ${max} characters.` };
    },

    min: (value, min) => {
      const num = Number(value);
      const valid = !isNaN(num) && num >= min;
      return { valid, message: valid ? '' : `Must be at least ${min}.` };
    },

    max: (value, max) => {
      const num = Number(value);
      const valid = !isNaN(num) && num <= max;
      return { valid, message: valid ? '' : `Must be at most ${max}.` };
    },

    url: (value) => {
      try {
        new URL(value);
        return { valid: true, message: '' };
      } catch {
        return { valid: false, message: 'Please enter a valid URL.' };
      }
    },

    phone: (value) => {
      const cleaned = String(value).replace(/\D/g, '');
      const valid = cleaned.length >= 10;
      return { valid, message: valid ? '' : 'Please enter a valid phone number.' };
    },

    match: (value, otherValue) => {
      const valid = value === otherValue;
      return { valid, message: valid ? '' : 'Values do not match.' };
    },

    regex: (value, pattern, message = 'Invalid format.') => {
      const valid = pattern.test(String(value));
      return { valid, message: valid ? '' : message };
    },
  };

  /**
   * Run multiple validators on a value.
   * @param {*} value
   * @param {Array} rules — [{ name: 'required' }, { name: 'email' }, { name: 'minLength', param: 8 }]
   * @returns {{ valid: boolean, errors: string[] }}
   */
  function validate(value, rules = []) {
    const errors = [];
    for (const rule of rules) {
      const validator = validators[rule.name];
      if (!validator) continue;
      const result = validator(value, rule.param);
      if (!result.valid) {
        errors.push(rule.message || result.message);
      }
    }
    return { valid: errors.length === 0, errors };
  }

  /* ==========================================================================
     DOM HELPERS
     ========================================================================== */

  /**
   * Shorthand for querySelector.
   * @param {string} selector
   * @param {Element} context
   * @returns {Element|null}
   */
  function $(selector, context = document) {
    return context.querySelector(selector);
  }

  /**
   * Shorthand for querySelectorAll.
   * @param {string} selector
   * @param {Element} context
   * @returns {NodeList}
   */
  function $$(selector, context = document) {
    return context.querySelectorAll(selector);
  }

  /**
   * Create an element with attributes and children.
   * @param {string} tag
   * @param {object} attrs
   * @param {string|Element|Array} children
   * @returns {Element}
   */
  function createElement(tag, attrs = {}, children = null) {
    const el = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (key === 'className') {
        el.className = value;
      } else if (key === 'dataset') {
        Object.assign(el.dataset, value);
      } else if (key.startsWith('on') && typeof value === 'function') {
        el.addEventListener(key.slice(2).toLowerCase(), value);
      } else {
        el.setAttribute(key, value);
      }
    }
    if (children) {
      if (Array.isArray(children)) {
        children.forEach(child => el.appendChild(
          typeof child === 'string' ? document.createTextNode(child) : child
        ));
      } else if (typeof children === 'string') {
        el.textContent = children;
      } else {
        el.appendChild(children);
      }
    }
    return el;
  }

  /**
   * Add/remove/toggle classes in one call.
   * @param {Element} el
   * @param {object} actions — { add: 'foo', remove: 'bar', toggle: 'baz' }
   */
  function modifyClass(el, actions) {
    if (!el) return;
    if (actions.add) el.classList.add(...actions.add.split(' ').filter(Boolean));
    if (actions.remove) el.classList.remove(...actions.remove.split(' ').filter(Boolean));
    if (actions.toggle) el.classList.toggle(actions.toggle);
  }

  /**
   * Wait for an element to appear in the DOM (mutation observer).
   * @param {string} selector
   * @param {Element} parent
   * @param {number} timeoutMs
   * @returns {Promise<Element>}
   */
  function waitForElement(selector, parent = document.body, timeoutMs = 5000) {
    return new Promise((resolve, reject) => {
      const el = parent.querySelector(selector);
      if (el) return resolve(el);

      const observer = new MutationObserver(() => {
        const found = parent.querySelector(selector);
        if (found) {
          observer.disconnect();
          resolve(found);
        }
      });

      observer.observe(parent, { childList: true, subtree: true });

      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Element "${selector}" not found within ${timeoutMs}ms`));
      }, timeoutMs);
    });
  }

  /**
   * Check if an element is in the viewport.
   * @param {Element} el
   * @param {number} offset
   * @returns {boolean}
   */
  function isInViewport(el, offset = 0) {
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    return (
      rect.top >= -offset &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) + offset &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  }

  /**
   * Smooth scroll to an element or offset.
   * @param {string|Element|number} target — selector, element, or pixel offset
   * @param {number} offset — additional offset (e.g., for fixed navbar)
   * @param {string} behavior
   */
  function scrollTo(target, offset = 0, behavior = 'smooth') {
    let top;
    if (typeof target === 'number') {
      top = target;
    } else if (typeof target === 'string') {
      const el = document.querySelector(target);
      if (!el) return;
      top = el.getBoundingClientRect().top + window.scrollY - offset;
    } else if (target instanceof Element) {
      top = target.getBoundingClientRect().top + window.scrollY - offset;
    }
    window.scrollTo({ top, behavior });
  }

  /* ==========================================================================
     DEBOUNCE / THROTTLE
     ========================================================================== */

  /**
   * Debounce a function.
   * @param {Function} fn
   * @param {number} wait — milliseconds
   * @param {boolean} immediate
   * @returns {Function}
   */
  function debounce(fn, wait = 300, immediate = false) {
    let timeout;
    return function (...args) {
      const callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        timeout = null;
        if (!immediate) fn.apply(this, args);
      }, wait);
      if (callNow) fn.apply(this, args);
    };
  }

  /**
   * Throttle a function.
   * @param {Function} fn
   * @param {number} limit — milliseconds
   * @returns {Function}
   */
  function throttle(fn, limit = 300) {
    let inThrottle;
    return function (...args) {
      if (!inThrottle) {
        fn.apply(this, args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  }

  /* ==========================================================================
     STORAGE HELPERS
     ========================================================================== */

  const storage = {
    get(key, defaultValue = null) {
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
      } catch {
        return defaultValue;
      }
    },

    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    },

    remove(key) {
      localStorage.removeItem(key);
    },

    clear() {
      localStorage.clear();
    },
  };

  /* ==========================================================================
     MISC HELPERS
     ========================================================================== */

  /**
   * Generate a unique ID.
   * @param {string} prefix
   * @returns {string}
   */
  function uid(prefix = 'id') {
    return `${prefix}-${Math.random().toString(36).slice(2, 9)}-${Date.now().toString(36)}`;
  }

  /**
   * Deep clone an object (JSON-safe).
   * @param {any} obj
   * @returns {any}
   */
  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Pick keys from an object.
   * @param {object} obj
   * @param {string[]} keys
   * @returns {object}
   */
  function pick(obj, keys) {
    return keys.reduce((acc, key) => {
      if (key in obj) acc[key] = obj[key];
      return acc;
    }, {});
  }

  /**
   * Omit keys from an object.
   * @param {object} obj
   * @param {string[]} keys
   * @returns {object}
   */
  function omit(obj, keys) {
    const set = new Set(keys);
    return Object.entries(obj).reduce((acc, [key, value]) => {
      if (!set.has(key)) acc[key] = value;
      return acc;
    }, {});
  }

  /**
   * Check if device is touch-capable.
   * @returns {boolean}
   */
  function isTouchDevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  /**
   * Check current breakpoint against tokens.
   * @returns {string} — 'mobile' | 'tablet' | 'desktop' | 'wide'
   */
  function getBreakpoint() {
    const w = window.innerWidth;
    if (w < 640) return 'mobile';
    if (w < 1024) return 'tablet';
    if (w < 1280) return 'desktop';
    return 'wide';
  }

  /**
   * Copy text to clipboard.
   * @param {string} text
   * @returns {Promise<boolean>}
   */
  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      return success;
    }
  }

  /**
   * Parse query string params from URL.
   * @param {string} url
   * @returns {object}
   */
  function parseQueryString(url = window.location.search) {
    const params = new URLSearchParams(url);
    const result = {};
    for (const [key, value] of params) {
      result[key] = value;
    }
    return result;
  }

  /**
   * Build a query string from an object.
   * @param {object} params
   * @returns {string}
   */
  function buildQueryString(params) {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== null && value !== undefined) {
        search.append(key, String(value));
      }
    }
    const qs = search.toString();
    return qs ? '?' + qs : '';
  }

  /* ==========================================================================
     Export
     ========================================================================== */

  const Utils = {
    // Formatters
    formatCurrency,
    formatNumber,
    formatPercent,
    formatDate,
    formatRelativeTime,
    formatBytes,
    formatPhone,
    truncate,
    slugify,

    // Validators
    validators,
    validate,

    // DOM
    $,
    $$,
    createElement,
    modifyClass,
    waitForElement,
    isInViewport,
    scrollTo,

    // Timing
    debounce,
    throttle,

    // Storage
    storage,

    // Misc
    uid,
    deepClone,
    pick,
    omit,
    isTouchDevice,
    getBreakpoint,
    copyToClipboard,
    parseQueryString,
    buildQueryString,
  };

  // AMD
  if (typeof define === 'function' && define.amd) {
    define('utils', [], () => Utils);
  }
  // CommonJS
  else if (typeof module !== 'undefined' && module.exports) {
    module.exports = Utils;
  }
  // Browser global
  else {
    global.Utils = Utils;
  }

})(typeof window !== 'undefined' ? window : this);
