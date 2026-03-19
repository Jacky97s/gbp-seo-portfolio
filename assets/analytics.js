/**
 * GBP SEO - GA4 Custom Event Tracking
 * 追蹤行銷漏斗各階段的使用者行為
 *
 * Funnel stages:
 *   Awareness  → page_view (automatic)
 *   Interest   → scroll_to_cta, pricing_view, report_view
 *   Engage     → form_start, copy_template, contact_click
 *   Convert    → generate_lead, sign_up, survey_complete
 */

(function () {
  'use strict';

  // Ensure gtag is available
  if (typeof gtag !== 'function') return;

  var path = location.pathname;
  var sent = {};

  // Helper: fire event only once per key
  function once(key, event, params) {
    if (sent[key]) return;
    sent[key] = true;
    gtag('event', event, params || {});
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

  // Set custom dimension for all events
  gtag('set', { page_type: pageType });

  // ── Report page: send report_view with metadata ──
  if (pageType === 'report') {
    var reportId = path.replace('/reports/', '').replace('.html', '');
    var bizName = '';
    var titleEl = document.querySelector('.hero h1, title');
    if (titleEl) {
      var m = titleEl.textContent.match(/[—–]\s*(.+)/);
      if (m) bizName = m[1].trim();
    }
    gtag('event', 'report_view', {
      report_id: reportId,
      business_name: bizName
    });
  }

  // ── Scroll depth tracking (25%, 50%, 75%, 90%) ──
  var milestones = [25, 50, 75, 90];
  var docHeight, winHeight;

  function calcHeights() {
    docHeight = document.documentElement.scrollHeight;
    winHeight = window.innerHeight;
  }

  function onScroll() {
    calcHeights();
    var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    var pct = Math.round((scrollTop + winHeight) / docHeight * 100);
    for (var i = 0; i < milestones.length; i++) {
      if (pct >= milestones[i]) {
        once('scroll_' + milestones[i], 'scroll_milestone', {
          percent: milestones[i],
          page_type: pageType
        });
      }
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });

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

  // ── Form interaction tracking ──
  function trackForms() {
    // CTA form (landing page)
    var ctaForm = document.getElementById('cta-form');
    if (ctaForm) {
      // form_start: first field interaction
      var fields = ctaForm.querySelectorAll('input, textarea, select');
      fields.forEach(function (field) {
        field.addEventListener('focus', function () {
          once('form_start_cta', 'form_start', { form_type: 'cta_request' });
        }, { once: true });
      });

      // generate_lead: form submitted
      ctaForm.addEventListener('submit', function () {
        gtag('event', 'generate_lead', {
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
        gtag('event', 'sign_up', { method: 'waitlist' });
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
        gtag('event', 'survey_complete', {
          survey_source: new URLSearchParams(location.search).get('id') || 'direct'
        });
      });
    }
  }

  // ── CTA click tracking (reports & all pages) ──
  function trackClicks() {
    document.addEventListener('click', function (e) {
      var link = e.target.closest('a[href]');
      if (!link) return;

      var href = link.getAttribute('href') || '';
      var text = (link.textContent || '').trim().substring(0, 50);

      // Contact clicks (WhatsApp, LINE)
      if (href.indexOf('wa.me') !== -1 || href.indexOf('whatsapp') !== -1 ||
          href.indexOf('line.me') !== -1 || href.indexOf('lin.ee') !== -1) {
        gtag('event', 'contact_click', {
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
        gtag('event', 'social_click', {
          platform: 'threads',
          cta_type: ctaType,
          page_type: pageType,
          link_text: text
        });
        return;
      }

      // Donate click (Stripe)
      if (href.indexOf('donate.stripe.com') !== -1) {
        gtag('event', 'donate_click', {
          page_type: pageType
        });
        return;
      }

      // Report CTA clicks (inside report pages)
      if (pageType === 'report') {
        // Click to main site CTA
        if (href.indexOf('gbp-seo.devfromzero.xyz') !== -1 && href.indexOf('#cta') !== -1) {
          gtag('event', 'report_cta_click', {
            cta_type: 'request_report',
            link_text: text
          });
          return;
        }
        // Click to survey
        if (href.indexOf('survey.html') !== -1) {
          gtag('event', 'report_cta_click', {
            cta_type: 'survey',
            link_text: text
          });
          return;
        }
      }

      // Internal navigation CTA clicks (pricing, contact, etc.)
      if (link.classList.contains('btn-primary') || link.classList.contains('btn') ||
          link.classList.contains('service-card-btn') || link.classList.contains('btn-pricing')) {
        gtag('event', 'cta_click', {
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
        gtag('event', 'copy_template', {
          template_id: id,
          page_type: 'report'
        });
        return origCopy(id);
      };
    }
  }

  // ── Init after DOM ready ──
  function init() {
    observeCTA();
    trackForms();
    trackClicks();
    trackCopyTemplate();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
