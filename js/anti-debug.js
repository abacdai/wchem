/* js/anti-debug.js — chống thao tác / xâm nhập qua DevTools & console.
   Không ảnh hưởng chức năng: chỉ bảo vệ phiên làm việc, không chặn
   tương tác hợp lệ của người dùng (chỉ chặn phím tắt mở DevTools). */
(function () {
  'use strict';
  if (window.__WCHEM_ANTIDEBUG__) return;
  window.__WCHEM_ANTIDEBUG__ = true;

  var ORIG = {};
  var CONSOLE_METHODS = ['log', 'info', 'debug', 'warn', 'error', 'table', 'trace', 'group', 'groupCollapsed'];
  CONSOLE_METHODS.forEach(function (m) {
    if (window.console && typeof window.console[m] === 'function') {
      ORIG[m] = window.console[m].bind(window.console);
    }
  });

  var announced = false;
  function announce() {
    if (announced) return;
    announced = true;
    if (ORIG.warn) ORIG.warn('WChem bảo vệ nội dung — thao tác qua console không được hỗ trợ.');
  }

  function guard() {
    announce();
  }

  /* Vô hiệu hóa xuất log để không đọc được nội dung/nhật ký từ console */
  function silenceConsole() {
    if (!window.console) return;
    ['log', 'info', 'debug', 'table', 'trace', 'group', 'groupCollapsed', 'warn', 'error'].forEach(function (m) {
      try { window.console[m] = guard; } catch (e) { /* không quan trọng */ }
    });
  }

  /* Phát hiện DevTools mở: cửa sổ trình duyệt lệch kích thước nội dung
     (bảng DevTools docked) → quét sạch console liên tục cho tới khi đóng. */
  function devtoolsOpen() {
    var dw = window.outerWidth - window.innerWidth;
    var dh = window.outerHeight - window.innerHeight;
    var firebug = window.Firebug && window.Firebug.chrome && window.Firebug.chrome.isInitialized;
    return dw > 160 || dh > 160 || firebug;
  }

  function sweep() {
    if (devtoolsOpen()) {
      announce();
      if (ORIG.clear) ORIG.clear();
    }
  }

  setInterval(function () {
    if (document.visibilityState === 'hidden') return;
    sweep();
  }, 900);
  if (window.addEventListener) window.addEventListener('resize', sweep);

  /* Chặn phím tắt mở DevTools: F12, Ctrl/⌘+Shift+I/J/C, Ctrl/⌘+U, Ctrl/⌘+S */
  document.addEventListener('keydown', function (e) {
    var k = e.key || '';
    var combo = e.ctrlKey || e.metaKey;
    if (e.keyCode === 123 ||
        (combo && e.shiftKey && (k === 'I' || k === 'J' || k === 'C')) ||
        (combo && (k === 'U' || k === 'S'))) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  }, true);

  silenceConsole();
})();
