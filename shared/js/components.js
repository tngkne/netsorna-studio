/**
 * ============================================================================
 * COMPONENTS — Shared Vanilla JS Component Behaviors
 * Toast queue, modal shell, navbar scroll effects, dropdowns, tabs, accordions.
 * Depends on: tokens.css, base.css, utils.js (optional but recommended)
 * ============================================================================
 */

(function (global) {
  'use strict';

  /* --------------------------------------------------------------------------
     UTILS (internal, no external deps)
     -------------------------------------------------------------------------- */

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => ctx.querySelectorAll(sel);
  const on = (el, evt, fn, opts) => el?.addEventListener(evt, fn, opts);
  const off = (el, evt, fn) => el?.removeEventListener(evt, fn);

  /* ==========================================================================
     TOAST QUEUE
     ========================================================================== */

  const Toast = (function () {
    const defaults = {
      duration: 4000,
      position: 'top-right',
      maxVisible: 5,
    };

    let container = null;
    const queue = [];
    let active = [];

    function getContainer(position) {
      const className = `toast-container toast-container--${position}`;
      let el = $(`.${className.replace(/\s+/g, '.')}`);
      if (!el) {
        el = document.createElement('div');
        el.className = className;
        document.body.appendChild(el);
      }
      return el;
    }

    function createToast({ type = 'default', title = '', message = '', duration = defaults.duration }) {
      const toast = document.createElement('div');
      toast.className = `toast toast--${type}`;
      toast.setAttribute('role', 'alert');
      toast.setAttribute('aria-live', 'polite');

      const iconMap = {
        success: '<svg class="toast__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>',
        error: '<svg class="toast__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>',
        warning: '<svg class="toast__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
        info: '<svg class="toast__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
        default: '',
      };

      toast.innerHTML = `
        ${iconMap[type] || ''}
        <div class="toast__content">
          ${title ? `<div class="toast__title">${escapeHtml(title)}</div>` : ''}
          <div class="toast__message">${escapeHtml(message)}</div>
        </div>
        <button class="toast__close" aria-label="Close notification">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      `;

      const closeBtn = toast.querySelector('.toast__close');
      closeBtn.addEventListener('click', () => dismiss(toast));

      return { el: toast, duration };
    }

    function show(toastData) {
      const position = toastData.position || defaults.position;
      container = getContainer(position);

      const toast = createToast(toastData);

      if (active.length >= defaults.maxVisible) {
        queue.push(toast);
        return toast.el;
      }

      mount(toast);
      return toast.el;
    }

    function mount(toast) {
      active.push(toast);
      container.appendChild(toast.el);

      // Force reflow for transition
      toast.el.offsetHeight;
      toast.el.classList.add('is-visible');

      toast.timer = setTimeout(() => dismiss(toast.el), toast.duration);
    }

    function dismiss(el) {
      const toast = active.find(t => t.el === el);
      if (!toast) return;

      clearTimeout(toast.timer);
      toast.el.classList.remove('is-visible');
      toast.el.classList.add('is-exiting');

      setTimeout(() => {
        toast.el.remove();
        active = active.filter(t => t !== toast);

        if (queue.length > 0 && active.length < defaults.maxVisible) {
          mount(queue.shift());
        }
      }, 350); // match CSS transition duration
    }

    function success(message, title = '') { return show({ type: 'success', title, message }); }
    function error(message, title = '') { return show({ type: 'error', title, message }); }
    function warning(message, title = '') { return show({ type: 'warning', title, message }); }
    function info(message, title = '') { return show({ type: 'info', title, message }); }

    return {
      show,
      success,
      error,
      warning,
      info,
      dismiss,
      configure: (opts) => Object.assign(defaults, opts),
    };
  })();

  /* ==========================================================================
     MODAL SHELL
     ========================================================================== */

  const Modal = (function () {
    const openModals = [];
    let focusTrapCleanup = null;

    function create(options = {}) {
      const {
        title = '',
        content = '',
        size = 'md',
        position = 'center',
        closable = true,
        onClose = null,
      } = options;

      const overlay = document.createElement('div');
      overlay.className = `modal-overlay modal--${position}`;
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      if (title) overlay.setAttribute('aria-labelledby', `modal-title-${uid()}`);

      const id = uid('modal');
      const titleId = `modal-title-${id}`;

      overlay.innerHTML = `
        <div class="modal modal--${size}" role="document">
          <div class="modal__header">
            <h2 class="modal__title" id="${titleId}">${escapeHtml(title)}</h2>
            ${closable ? `<button class="modal__close" aria-label="Close modal"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>` : ''}
          </div>
          <div class="modal__body">${content}</div>
          <div class="modal__footer" style="display:none;"></div>
        </div>
      `;

      const modalEl = overlay.querySelector('.modal');
      const bodyEl = overlay.querySelector('.modal__body');
      const footerEl = overlay.querySelector('.modal__footer');

      const instance = {
        el: overlay,
        body: bodyEl,
        footer: footerEl,
        open() {
          document.body.style.overflow = 'hidden';
          document.body.appendChild(overlay);
          openModals.push(this);

          // Force reflow
          overlay.offsetHeight;
          overlay.classList.add('is-open');

          focusTrapCleanup = trapFocus(modalEl);

          // Close on backdrop click
          overlay.addEventListener('click', (e) => {
            if (e.target === overlay && closable) this.close();
          });

          // Close on escape
          const escHandler = (e) => {
            if (e.key === 'Escape' && closable) this.close();
          };
          document.addEventListener('keydown', escHandler);
          this._escHandler = escHandler;

          // Close button
          const closeBtn = overlay.querySelector('.modal__close');
          if (closeBtn) closeBtn.addEventListener('click', () => this.close());
        },
        close() {
          overlay.classList.remove('is-open');

          setTimeout(() => {
            overlay.remove();
            document.body.style.overflow = '';
            openModals.pop();

            if (focusTrapCleanup) {
              focusTrapCleanup();
              focusTrapCleanup = null;
            }

            document.removeEventListener('keydown', this._escHandler);
            if (onClose) onClose();
          }, 350);
        },
        setContent(html) {
          bodyEl.innerHTML = html;
        },
        setFooter(html) {
          footerEl.innerHTML = html;
          footerEl.style.display = html ? '' : 'none';
        },
      };

      return instance;
    }

    function open(options) {
      const modal = create(options);
      modal.open();
      return modal;
    }

    function closeAll() {
      [...openModals].forEach(m => m.close());
    }

    return { create, open, closeAll };
  })();

  /* ==========================================================================
     NAVBAR SCROLL EFFECTS
     ========================================================================== */

  const Navbar = (function () {
    const instances = new Map();

    function init(selector = '.navbar', options = {}) {
      const { threshold = 50, scrolledClass = 'navbar--scrolled' } = options;
      const navs = $$(selector);

      navs.forEach(nav => {
        if (instances.has(nav)) return;

        const handler = () => {
          if (window.scrollY > threshold) {
            nav.classList.add(scrolledClass);
          } else {
            nav.classList.remove(scrolledClass);
          }
        };

        window.addEventListener('scroll', handler, { passive: true });
        handler(); // initial check

        instances.set(nav, handler);
      });

      return {
        destroy() {
          navs.forEach(nav => {
            const handler = instances.get(nav);
            if (handler) {
              window.removeEventListener('scroll', handler);
              instances.delete(nav);
            }
          });
        },
      };
    }

    return { init };
  })();

  /* ==========================================================================
     DROPDOWN
     ========================================================================== */

  const Dropdown = (function () {
    function init(triggerSelector, options = {}) {
      const triggers = $$(triggerSelector);

      triggers.forEach(trigger => {
        const menuId = trigger.getAttribute('aria-controls') || trigger.dataset.target;
        const menu = menuId ? $(`#${menuId}`) : trigger.nextElementSibling;
        if (!menu) return;

        trigger.setAttribute('aria-haspopup', 'true');
        trigger.setAttribute('aria-expanded', 'false');

        function open() {
          trigger.setAttribute('aria-expanded', 'true');
          menu.classList.add('is-open');
          menu.style.display = 'block';

          // Position below trigger
          const rect = trigger.getBoundingClientRect();
          menu.style.position = 'absolute';
          menu.style.top = `${rect.bottom + window.scrollY}px`;
          menu.style.left = `${rect.left + window.scrollX}px`;
          menu.style.zIndex = 'var(--z-dropdown, 100)';

          document.addEventListener('click', outsideClick);
          document.addEventListener('keydown', keyHandler);
        }

        function close() {
          trigger.setAttribute('aria-expanded', 'false');
          menu.classList.remove('is-open');
          menu.style.display = 'none';
          document.removeEventListener('click', outsideClick);
          document.removeEventListener('keydown', keyHandler);
        }

        function toggle() {
          const isOpen = trigger.getAttribute('aria-expanded') === 'true';
          isOpen ? close() : open();
        }

        function outsideClick(e) {
          if (!trigger.contains(e.target) && !menu.contains(e.target)) {
            close();
          }
        }

        function keyHandler(e) {
          if (e.key === 'Escape') close();
        }

        trigger.addEventListener('click', toggle);
      });
    }

    return { init };
  })();

  /* ==========================================================================
     TABS
     ========================================================================== */

  const Tabs = (function () {
    function init(containerSelector, options = {}) {
      const containers = $$(containerSelector);

      containers.forEach(container => {
        const tabList = container.querySelector('[role="tablist"]');
        const tabs = container.querySelectorAll('[role="tab"]');
        const panels = container.querySelectorAll('[role="tabpanel"]');

        if (!tabs.length) return;

        tabs.forEach((tab, index) => {
          tab.addEventListener('click', () => activate(index));
          tab.addEventListener('keydown', (e) => handleKeydown(e, index));
        });

        function activate(index) {
          tabs.forEach((t, i) => {
            const selected = i === index;
            t.setAttribute('aria-selected', selected ? 'true' : 'false');
            t.setAttribute('tabindex', selected ? '0' : '-1');
            t.classList.toggle('is-active', selected);
          });

          panels.forEach((p, i) => {
            p.hidden = i !== index;
            p.classList.toggle('is-active', i === index);
          });
        }

        function handleKeydown(e, index) {
          let nextIndex;
          switch (e.key) {
            case 'ArrowRight':
              nextIndex = (index + 1) % tabs.length;
              break;
            case 'ArrowLeft':
              nextIndex = (index - 1 + tabs.length) % tabs.length;
              break;
            case 'Home':
              nextIndex = 0;
              break;
            case 'End':
              nextIndex = tabs.length - 1;
              break;
            default:
              return;
          }
          e.preventDefault();
          tabs[nextIndex].focus();
          activate(nextIndex);
        }

        // Activate first tab by default
        activate(0);
      });
    }

    return { init };
  })();

  /* ==========================================================================
     ACCORDION
     ========================================================================== */

  const Accordion = (function () {
    function init(containerSelector, options = {}) {
      const { allowMultiple = false } = options;
      const containers = $$(containerSelector);

      containers.forEach(container => {
        const items = container.querySelectorAll('.accordion__item');

        items.forEach(item => {
          const trigger = item.querySelector('.accordion__trigger');
          const panel = item.querySelector('.accordion__panel');
          if (!trigger || !panel) return;

          trigger.addEventListener('click', () => {
            const isOpen = trigger.getAttribute('aria-expanded') === 'true';

            if (!allowMultiple) {
              items.forEach(otherItem => {
                const otherTrigger = otherItem.querySelector('.accordion__trigger');
                const otherPanel = otherItem.querySelector('.accordion__panel');
                if (otherTrigger !== trigger) {
                  otherTrigger.setAttribute('aria-expanded', 'false');
                  otherPanel.hidden = true;
                  otherPanel.style.maxHeight = '0';
                  otherItem.classList.remove('is-open');
                }
              });
            }

            trigger.setAttribute('aria-expanded', !isOpen);
            panel.hidden = isOpen;
            item.classList.toggle('is-open', !isOpen);

            if (!isOpen) {
              panel.style.maxHeight = panel.scrollHeight + 'px';
            } else {
              panel.style.maxHeight = '0';
            }
          });
        });
      });
    }

    return { init };
  })();

  /* ==========================================================================
     SKELETON LOADER
     ========================================================================== */

  const Skeleton = (function () {
    function show(selector) {
      const els = $$(selector);
      els.forEach(el => {
        el.dataset.originalContent = el.innerHTML;
        el.innerHTML = '<div class="skeleton skeleton--card" style="width:100%;height:100%;"></div>';
        el.classList.add('is-loading');
      });
    }

    function hide(selector) {
      const els = $$(selector);
      els.forEach(el => {
        if (el.dataset.originalContent) {
          el.innerHTML = el.dataset.originalContent;
          delete el.dataset.originalContent;
        }
        el.classList.remove('is-loading');
      });
    }

    return { show, hide };
  })();

  /* ==========================================================================
     LAZY LOADING (images)
     ========================================================================== */

  const LazyLoad = (function () {
    let observer;

    function init(selector = 'img[data-src]', options = {}) {
      const { rootMargin = '50px', threshold = 0 } = options;

      observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            const src = img.dataset.src;
            if (src) {
              img.src = src;
              img.removeAttribute('data-src');
              img.classList.add('is-loaded');
            }
            observer.unobserve(img);
          }
        });
      }, { rootMargin, threshold });

      $$(selector).forEach(el => observer.observe(el));
    }

    function destroy() {
      if (observer) {
        observer.disconnect();
        observer = null;
      }
    }

    return { init, destroy };
  })();

  /* ==========================================================================
     HELPERS
     ========================================================================== */

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function uid(prefix = 'cmp') {
    return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
  }

  function trapFocus(element) {
    const focusable = element.querySelectorAll(
      'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    function handler(e) {
      if (e.key !== 'Tab') return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    element.addEventListener('keydown', handler);
    first?.focus();

    return () => element.removeEventListener('keydown', handler);
  }

  /* ==========================================================================
     AUTO-INIT (data attributes)
     ========================================================================== */

  function autoInit() {
    // Navbar scroll effects
    if ($('.navbar')) Navbar.init();

    // Dropdowns
    $$('[data-dropdown]').forEach(el => {
      Dropdown.init(`[data-dropdown="${el.dataset.dropdown}"]`);
    });

    // Tabs
    $$('[data-tabs]').forEach(el => {
      Tabs.init(`[data-tabs="${el.dataset.tabs}"]`);
    });

    // Accordions
    $$('[data-accordion]').forEach(el => {
      Accordion.init(`[data-accordion="${el.dataset.accordion}"]`);
    });

    // Lazy load images
    if ($('img[data-src]')) LazyLoad.init();
  }

  // Auto-init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
  } else {
    autoInit();
  }

  /* ==========================================================================
     EXPORT
     ========================================================================== */

  const Components = {
    Toast,
    Modal,
    Navbar,
    Dropdown,
    Tabs,
    Accordion,
    Skeleton,
    LazyLoad,
    autoInit,
  };

  // AMD
  if (typeof define === 'function' && define.amd) {
    define('components', [], () => Components);
  }
  // CommonJS
  else if (typeof module !== 'undefined' && module.exports) {
    module.exports = Components;
  }
  // Browser global
  else {
    global.Components = Components;
  }

})(typeof window !== 'undefined' ? window : this);
