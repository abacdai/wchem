(function () {
  'use strict';

  window._authMode = 'signin';

  document.addEventListener('DOMContentLoaded', function () {

    /* ─── ClickSpark ─── */
    if (typeof ClickSpark === 'function') {
      ClickSpark(document.body, {
        sparkColor: '#38bdf8',
        sparkSize: 10,
        sparkRadius: 30,
        sparkCount: 8,
        duration: 450,
      });
    }

    /* ─── CardNav ─── */
    if (typeof CardNav === 'function') {
      CardNav(document.getElementById('card-nav-root'), {
        logo: 'assets/icon.png',
        logoAlt: 'WChem',
        logoText: 'WChem AR',
        menuColor: '#ffffff',
        baseColor: 'rgba(15,23,42,0.8)',
        buttonBgColor: '#38bdf8',
        buttonTextColor: '#020617',
        ctaText: 'Sign in',
        items: [
          {
            label: 'Giới thiệu',
            bgColor: '#1e293b',
            textColor: '#fff',
            links: [
              { label: 'WChem AR là gì', ariaLabel: 'Về WChem AR', href: '#' },
              { label: 'Công nghệ Express', ariaLabel: 'Express Backend', href: '#' },
            ]
          },
          {
            label: 'Tính năng',
            bgColor: '#334155',
            textColor: '#fff',
            links: [
              { label: 'Mở Lab', ariaLabel: 'Mở Phòng Thí Nghiệm', href: 'lab.html' },
              { label: 'Bảng Xếp Hạng', ariaLabel: 'Leaderboard', href: '#' },
            ]
          },
          {
            label: 'Backend',
            bgColor: '#0f172a',
            textColor: '#fff',
            links: [
              { label: 'Backend Test', ariaLabel: 'Backend Test', href: '#' },
              { label: 'Quản lý tài khoản', ariaLabel: 'Tài khoản', href: 'profile.html' },
            ]
          }
        ],
        onCtaClick: function () {
          var client = window.chemlabClient;
          if (client && client.isAuthenticated()) {
            location.href = 'profile.html';
          } else {
            openSignInModal();
          }
        },
      });
    }

    initSignInModal();
    initBackendModal();

    /* ─── Open Lab button ─── */
    var startBtn = document.getElementById('lp-primaryStart');
    if (startBtn) {
      startBtn.addEventListener('click', function () {
        window.location.href = 'lab.html';
      });
    }

    /* ─── Reveal scroll animations ─── */
    initReveal();

    /* ─── Element cards color ─── */
    initElementCards();

    /* ─── ScrollTrigger for molecule ring glow ─── */
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
      gsap.registerPlugin(ScrollTrigger);
    }

    /* ─── Wait for chemlabClient module ─── */
    waitForClient(function () {
      updateAuthUI();
    });

  });

  /* ─── Wait for window.chemlabClient ─── */
  function waitForClient(cb) {
    if (window.chemlabClient) { cb(); return; }
    var timer = setInterval(function () {
      if (window.chemlabClient) { clearInterval(timer); cb(); }
    }, 100);
    setTimeout(function() { clearInterval(timer); }, 10000);
  }

  /* ─── Reveal on scroll ─── */
  function initReveal() {
    var els = document.querySelectorAll('.reveal');
    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(e) {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          observer.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });
    els.forEach(function(el) { observer.observe(el); });
  }

  /* ─── Element card colors from data attribute ─── */
  function initElementCards() {
    document.querySelectorAll('.element-placeholder').forEach(function(el) {
      var color = el.getAttribute('data-color') || '#38bdf8';
      el.style.setProperty('--el-color', color);
      el.style.color = color;
    });
  }

  /* ─── Auth UI ─── */
  function safeAttr(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* Chỉ chấp nhận avatar là ảnh hợp lệ (data URL ảnh hoặc http(s)) để chặn
     phá vỡ thuộc tính src bằng `" onerror=...` (stored XSS). */
  function safeAvatar(avatar) {
    var a = String(avatar || '');
    if (/^data:image\/(png|jpe?g|gif|webp);base64,/i.test(a)) return a;
    if (/^https?:\/\//i.test(a)) return a;
    return '';
  }

  function updateAuthUI() {
    var client = window.chemlabClient;
    var navRoot = document.getElementById('card-nav-root');

    if (client && client.isAuthenticated()) {
      var email = (client.user && client.user.email) || '';
      var avatar = safeAvatar(client.user && client.user.avatar);
      if (navRoot && navRoot.cardNav) {
        var ctaBtn = navRoot.querySelector('.card-nav-cta-button:last-child');
        if (ctaBtn) {
          ctaBtn.classList.add('nav-avatar-btn');
          ctaBtn.innerHTML = avatar
            ? '<img class="nav-avatar-img" src="' + avatar + '" alt="Mở trang cá nhân" title="' + safeAttr(email) + '">'
            : '<span class="nav-avatar" role="img" aria-label="Mở trang cá nhân" title="' + safeAttr(email) + '">' +
              safeAttr((email || '?').charAt(0).toUpperCase()) + '</span>';
          ctaBtn.onclick = function () { location.href = 'profile.html'; };
        }
      }
    } else {
      if (navRoot && navRoot.cardNav) {
        var ctaBtn2 = navRoot.querySelector('.card-nav-cta-button:last-child');
        if (ctaBtn2) ctaBtn2.classList.remove('nav-avatar-btn');
        navRoot.cardNav.updateCta('Sign in', openSignInModal);
      }
    }
  }

  /* ─── Sign In / Up Modal ─── */
  function initSignInModal() {
    var overlay = document.getElementById('signin-overlay');
    var closeBtn = document.getElementById('signin-close');
    var submitBtn = document.getElementById('signin-submit');
    var errEl = document.getElementById('signin-err');

    if (closeBtn) closeBtn.addEventListener('click', function () { overlay.style.display = 'none'; });
    if (overlay) overlay.addEventListener('click', function (e) { if (e.target === overlay) overlay.style.display = 'none'; });

    // Enter key support
    overlay && overlay.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') overlay.style.display = 'none';
    });

    if (submitBtn) {
      submitBtn.addEventListener('click', function () {
        var email = (document.getElementById('signin-email').value || '').trim();
        var password = document.getElementById('signin-password').value || '';
        if (errEl) errEl.style.display = 'none';
        if (!email || !password) { showErr('Vui lòng nhập email và mật khẩu'); return; }

        var client = window.chemlabClient;
        if (!client) { showErr('Đang tải ChemLab Client...'); return; }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Đang xử lý...';

        var mode = window._authMode || 'signin';
        var fn = mode === 'signin'
          ? client.signIn(email, password)
          : client.signUp(email, password, {});

        fn.then(function (r) {
          if (r && r.error) throw new Error(r.error.message || String(r.error));
          overlay.style.display = 'none';
          updateAuthUI();
        }).catch(function (e) {
          showErr('Lỗi: ' + (e.message || String(e)));
        }).finally(function () {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Tiếp tục';
        });
      });
    }

    function showErr(msg) {
      if (errEl) { errEl.textContent = msg; errEl.style.display = 'block'; }
    }
  }

  window.openSignInModal = function () {
    var overlay = document.getElementById('signin-overlay');
    if (overlay) overlay.style.display = 'flex';
  };

  /* ─── Backend Test Modal ─── */
  function initBackendModal() {
    var overlay = document.getElementById('backend-test-overlay');
    var closeBtn = document.getElementById('backend-test-close');
    var fullBtn = document.getElementById('lp-backend-full');
    var clearBtn = document.getElementById('lp-backend-clear');
    var logEl = document.getElementById('lp-backend-log');

    function log(msg, isErr) {
      if (!logEl) return;
      var line = document.createElement('div');
      line.style.cssText = 'padding:3px 0;border-bottom:1px solid rgba(255,255,255,0.03);' + (isErr ? 'color:#f87171;' : 'color:#94a3b8;');
      var t = new Date().toLocaleTimeString('vi-VN');
      line.innerHTML = '<span style="color:#334155;">' + t + '</span>  ' + msg;
      logEl.appendChild(line);
      while (logEl.childElementCount > 80) logEl.removeChild(logEl.firstChild);
      logEl.scrollTop = logEl.scrollHeight;
    }

    function clearLog() { if (logEl) logEl.innerHTML = ''; }

    if (closeBtn) closeBtn.addEventListener('click', function () { overlay.style.display = 'none'; });
    if (overlay) overlay.addEventListener('click', function (e) { if (e.target === overlay) overlay.style.display = 'none'; });
    if (clearBtn) clearBtn.addEventListener('click', clearLog);

    if (fullBtn) {
      fullBtn.addEventListener('click', function () {
        var client = window.chemlabClient;
        if (!client) { log('❌ ChemLab client chưa tải', true); return; }
        clearLog();
        log('<b style="color:#38bdf8;">🔎 Full backend check...</b>');

        client.getHealth().then(function (d) {
          log('✅ API: ' + JSON.stringify(d));
        }).catch(function (e) { log('❌ API: ' + e.message, true); });

        client.getCompounds().then(function (d) {
          log('✅ Compounds: <b style="color:#34d399;">' + (d ? d.length : 0) + '</b>');
        }).catch(function (e) { log('❌ Compounds: ' + e.message, true); });

        if (client.isAuthenticated()) {
          client.me().then(function (d) {
            log('✅ Auth: ' + d.user.email);
          }).catch(function (e) { log('❌ Auth: ' + e.message, true); });
        } else {
          log('ℹ️ Chưa đăng nhập — bỏ qua Auth test');
        }

        setTimeout(function() { log('🏁 Hoàn tất.'); }, 3000);
      });
    }

    document.querySelectorAll('.lp-backend-step').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var client = window.chemlabClient;
        if (!client) { log('❌ Client chưa tải', true); return; }
        var step = btn.getAttribute('data-step');
        if (step === 'health') {
          client.getHealth().then(function (d) { log('✅ API: ' + JSON.stringify(d)); }).catch(function (e) { log('❌ ' + e.message, true); });
        } else if (step === 'compounds') {
          client.getCompounds().then(function (d) { log('✅ Compounds: ' + (d ? d.length : 0)); }).catch(function (e) { log('❌ ' + e.message, true); });
        } else if (step === 'me') {
          if (!client.isAuthenticated()) { log('❌ Chưa đăng nhập', true); return; }
          client.me().then(function (d) { log('✅ Auth: ' + d.user.email); }).catch(function (e) { log('❌ ' + e.message, true); });
        }
      });
    });
  }

  window.openBackendModal = function () {
    var overlay = document.getElementById('backend-test-overlay');
    if (overlay) overlay.style.display = 'flex';
  };

})();
