/**
 * GBP SEO - PostHog Custom Event Tracking
 * 追蹤行銷漏斗各階段的使用者行為
 *
 * PostHog 自動追蹤（由 init config 啟用）：
 *   - Session Replay（錄影）
 *   - Heatmaps（熱力圖）
 *   - Autocapture（自動追蹤點擊、表單）
 *   - Dead Click Detection（無效點擊偵測）
 *   - Web Vitals（效能監控）
 *   - Page Leave（離開追蹤）
 *   - Pageview（頁面瀏覽）
 *
 * 本檔案追蹤的自訂事件（行銷漏斗）：
 *   Awareness  → $pageview (automatic)
 *   Interest   → cta_section_view, report_view
 *   Engage     → form_start, copy_template, contact_click
 *   Convert    → generate_lead, sign_up, survey_complete
 */

(function () {
  'use strict';

  if (typeof posthog === 'undefined') return;

  var path = location.pathname;
  var sent = {};

  function once(key, event, props) {
    if (sent[key]) return;
    sent[key] = true;
    posthog.capture(event, props || {});
  }

  // ── Page-type detection ──
  var pageType = 'other';
  if (path === '/' || path === '/index.html') pageType = 'landing';
  else if (path.indexOf('/reports/') === 0) pageType = 'report';
  else if (path.indexOf('pricing') !== -1) pageType = 'pricing';
  else if (path.indexOf('contact') !== -1) pageType = 'contact';
  else if (path.indexOf('survey') !== -1) pageType = 'survey';
  else if (path.indexOf('about') !== -1) pageType = 'about';
  else if (path.indexOf('portfolio') !== -1) pageType = 'portfolio';

  // Super property: attached to ALL future events in this session
  posthog.register({ page_type: pageType });

  // ── UTM / referrer tracking for attribution ──
  var params = new URLSearchParams(location.search);
  var utm = {};
  ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(function (k) {
    var v = params.get(k);
    if (v) utm[k] = v;
  });
  if (Object.keys(utm).length > 0) {
    posthog.register(utm);
  }

  // ── Report page: identify report + business ──
  if (pageType === 'report') {
    var reportId = path.replace('/reports/', '').replace('.html', '');
    var bizName = '';
    var titleEl = document.querySelector('.hero h1, title');
    if (titleEl) {
      var m = titleEl.textContent.match(/[—–]\s*(.+)/);
      if (m) bizName = m[1].trim();
    }
    posthog.capture('report_view', {
      report_id: reportId,
      business_name: bizName
    });

    // Register report context for all subsequent events on this page
    posthog.register({
      report_id: reportId,
      business_name: bizName
    });
  }

  // ── Intersection Observer: CTA section view ──
  function observeCTA() {
    var ctaEl = document.getElementById('cta') || document.querySelector('.cta-section');
    if (!ctaEl) return;
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          once('cta_view', 'cta_section_view', { page_type: pageType });
          observer.disconnect();
        }
      });
    }, { threshold: 0.3 });
    observer.observe(ctaEl);
  }

  // ── Intersection Observer: pricing section view ──
  function observePricing() {
    var el = document.querySelector('.pricing-table, .pricing-grid, [id*="pricing"]');
    if (!el) return;
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          once('pricing_view', 'pricing_section_view', { page_type: pageType });
          observer.disconnect();
        }
      });
    }, { threshold: 0.3 });
    observer.observe(el);
  }

  // ── Form interaction tracking ──
  function trackForms() {
    // CTA form (landing page)
    var ctaForm = document.getElementById('cta-form');
    if (ctaForm) {
      var fields = ctaForm.querySelectorAll('input, textarea, select');
      fields.forEach(function (field) {
        field.addEventListener('focus', function () {
          once('form_start_cta', 'form_start', { form_type: 'cta_request' });
        }, { once: true });
      });

      ctaForm.addEventListener('submit', function () {
        // Identify user by email for cross-session tracking
        var email = ctaForm.querySelector('[type="email"]');
        var name = ctaForm.querySelector('#name');
        if (email && email.value) {
          posthog.identify(email.value, {
            email: email.value,
            name: name ? name.value : '',
            source: 'cta_form'
          });
        }

        posthog.capture('generate_lead', {
          currency: 'TWD',
          value: 0,
          form_type: 'cta_request'
        });
      });
    }

    // Waitlist form
    var wlForm = document.getElementById('waitlist-form');
    if (wlForm) {
      var wlFields = wlForm.querySelectorAll('input, textarea, select');
      wlFields.forEach(function (field) {
        field.addEventListener('focus', function () {
          once('form_start_wl', 'form_start', { form_type: 'waitlist' });
        }, { once: true });
      });

      wlForm.addEventListener('submit', function () {
        var email = wlForm.querySelector('[type="email"]');
        var name = wlForm.querySelector('#wl-name');
        if (email && email.value) {
          posthog.identify(email.value, {
            email: email.value,
            name: name ? name.value : '',
            source: 'waitlist'
          });
        }

        posthog.capture('sign_up', { method: 'waitlist' });
      });
    }

    // Survey form
    var surveyForm = document.getElementById('survey-form');
    if (surveyForm) {
      var sFields = surveyForm.querySelectorAll('input, textarea, select');
      sFields.forEach(function (field) {
        field.addEventListener('focus', function () {
          once('form_start_survey', 'form_start', { form_type: 'survey' });
        }, { once: true });
      });

      surveyForm.addEventListener('submit', function () {
        posthog.capture('survey_complete', {
          survey_source: params.get('id') || 'direct'
        });
      });
    }
  }

  // ── CTA click tracking ──
  function trackClicks() {
    document.addEventListener('click', function (e) {
      var link = e.target.closest('a[href]');
      if (!link) return;

      var href = link.getAttribute('href') || '';
      var text = (link.textContent || '').trim().substring(0, 50);

      // Contact clicks (WhatsApp, LINE)
      if (href.indexOf('wa.me') !== -1 || href.indexOf('whatsapp') !== -1 ||
          href.indexOf('line.me') !== -1 || href.indexOf('lin.ee') !== -1) {
        posthog.capture('contact_click', {
          method: href.indexOf('whatsapp') !== -1 || href.indexOf('wa.me') !== -1 ? 'whatsapp' : 'line',
          page_type: pageType,
          link_text: text
        });
        return;
      }

      // Social clicks (Threads)
      if (href.indexOf('threads.com') !== -1) {
        var ctaType = 'social';
        if (text.indexOf('代操') !== -1 || text.indexOf('私訊') !== -1 || text.indexOf('了解方案') !== -1) {
          ctaType = 'service_inquiry';
        }
        posthog.capture('social_click', {
          platform: 'threads',
          cta_type: ctaType,
          page_type: pageType,
          link_text: text
        });
        return;
      }

      // Donate click (Stripe)
      if (href.indexOf('donate.stripe.com') !== -1) {
        posthog.capture('donate_click', { page_type: pageType });
        return;
      }

      // Report CTA clicks
      if (pageType === 'report') {
        if (href.indexOf('gbp-seo.devfromzero.xyz') !== -1 && href.indexOf('#cta') !== -1) {
          posthog.capture('report_cta_click', {
            cta_type: 'request_report',
            link_text: text
          });
          return;
        }
        if (href.indexOf('survey.html') !== -1) {
          posthog.capture('report_cta_click', {
            cta_type: 'survey',
            link_text: text
          });
          return;
        }
      }

      // General CTA clicks
      if (link.classList.contains('btn-primary') || link.classList.contains('btn') ||
          link.classList.contains('service-card-btn') || link.classList.contains('btn-pricing')) {
        posthog.capture('cta_click', {
          cta_text: text,
          cta_url: href,
          page_type: pageType
        });
      }
    });
  }

  // ── Copy template tracking (reports) ──
  function trackCopyTemplate() {
    if (pageType !== 'report') return;
    var origCopy = window.copyTemplate;
    if (typeof origCopy === 'function') {
      window.copyTemplate = function (id) {
        posthog.capture('copy_template', {
          template_id: id,
          page_type: 'report'
        });
        return origCopy(id);
      };
    }
  }

  // ── Time on page tracking ──
  function trackTimeOnPage() {
    var startTime = Date.now();
    window.addEventListener('beforeunload', function () {
      var seconds = Math.round((Date.now() - startTime) / 1000);
      if (seconds > 5) {
        posthog.capture('engaged_time', {
          seconds: seconds,
          page_type: pageType
        });
      }
    });
  }

  // ── Init ──
  function init() {
    observeCTA();
    observePricing();
    trackForms();
    trackClicks();
    trackCopyTemplate();
    trackTimeOnPage();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
