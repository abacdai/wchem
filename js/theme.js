(function () {
  'use strict';

  var STORAGE_KEY = 'wchem-theme';
  var LIGHT_ICON = 'light_mode';
  var DARK_ICON = 'dark_mode';

  function detectInitial() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') return saved;
    } catch (e) {}
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
    return 'dark';
  }

  function current() {
    return document.documentElement.getAttribute('data-theme') || 'dark';
  }

  function syncIcon() {
    var theme = current();
    var btns = document.querySelectorAll('#card-nav-theme-btn .material-symbols-outlined');
    var nextIcon = theme === 'light' ? DARK_ICON : LIGHT_ICON;
    var nextLabel = theme === 'light' ? 'Chuyển sang giao diện tối' : 'Chuyển sang giao diện sáng';
    btns.forEach(function (el) { el.textContent = nextIcon; });
    var btn = document.getElementById('card-nav-theme-btn');
    if (btn) {
      btn.setAttribute('aria-label', nextLabel);
      btn.setAttribute('title', nextLabel);
      btn.setAttribute('aria-pressed', theme === 'light' ? 'true' : 'false');
    }
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'light' ? '#F4F8FF' : '#020617');
  }

  function apply(theme, persist) {
    document.documentElement.setAttribute('data-theme', theme);
    if (persist) {
      try { localStorage.setItem(STORAGE_KEY, theme); } catch (e) {}
    }
    syncIcon();
  }

  function toggle() {
    apply(current() === 'light' ? 'dark' : 'light', true);
  }

  function init() {
    apply(detectInitial(), false);
  }

  init();

  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: light)');
    var onSystemChange = function (e) {
      try {
        if (localStorage.getItem(STORAGE_KEY)) return;
      } catch (err) {}
      apply(e.matches ? 'light' : 'dark', false);
    };
    if (mq.addEventListener) mq.addEventListener('change', onSystemChange);
    else if (mq.addListener) mq.addListener(onSystemChange);
  }

  document.addEventListener('DOMContentLoaded', syncIcon);

  window.WChemTheme = { toggle: toggle, apply: apply, current: current };
})();
