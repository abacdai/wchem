(function () {
  'use strict';

  function CardNav(container, opts) {
    if (!container) return;

    var items = opts.items || [];
    var baseColor = opts.baseColor || 'rgba(15,23,42,0.75)';
    var menuColor = opts.menuColor || '#ffffff';
    var buttonBgColor = opts.buttonBgColor || '#38bdf8';
    var buttonTextColor = opts.buttonTextColor || '#0f172a';
    var logo = opts.logo || 'assets/icon.png';
    var logoAlt = opts.logoAlt || 'Logo';
    var logoText = opts.logoText || '';
    var ctaText = opts.ctaText || 'Sign in';
    var onCtaClick = opts.onCtaClick || null;

    container.innerHTML =
      '<nav class="card-nav" style="background-color:' + baseColor + '; backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.1);">' +
        '<div class="card-nav-top">' +
          '<div class="hamburger-menu" role="button" aria-label="Open menu" aria-expanded="false" tabindex="0" style="color:' + menuColor + '">' +
            '<div class="hamburger-line" style="background-color:' + menuColor + '"></div>' +
            '<div class="hamburger-line" style="background-color:' + menuColor + '"></div>' +
          '</div>' +
          '<div class="logo-container" style="display:flex;align-items:center;gap:10px;">' +
            '<img src="' + logo + '" alt="' + logoAlt + '" class="logo" style="width:28px;height:28px;border-radius:50%;">' +
            (logoText ? '<span class="logo-text" style="color:' + menuColor + ';font-weight:700;font-size:18px;">' + logoText + '</span>' : '') +
          '</div>' +
          '<div style="display:flex;align-items:center;gap:10px;">' +
            '<button type="button" id="card-nav-theme-btn" class="theme-toggle-btn" aria-label="Toggle light/dark theme" title="Chuyển giao diện sáng/tối">' +
              '<span class="material-symbols-outlined" aria-hidden="true">light_mode</span>' +
            '</button>' +
            '<button type="button" class="card-nav-cta-button" style="background-color:' + buttonBgColor + ';color:' + buttonTextColor + ';font-weight:600;">' + ctaText + '</button>' +
          '</div>' +
        '</div>' +
        '<div class="card-nav-content" aria-hidden="true">' +
          items.map(function (item, idx) {
            var linksHtml = (item.links || []).map(function (lnk) {
              return '<a class="nav-card-link" aria-label="' + (lnk.ariaLabel || lnk.label) + '" href="' + (lnk.href || '#') + '">' +
                '<span class="nav-card-link-icon" aria-hidden="true">→</span>' +
                lnk.label +
              '</a>';
            }).join('');
            return '<div class="nav-card" data-idx="' + idx + '" style="background-color:' + item.bgColor + ';color:' + item.textColor + '">' +
              '<div class="nav-card-label">' + item.label + '</div>' +
              '<div class="nav-card-links">' + linksHtml + '</div>' +
            '</div>';
          }).join('') +
        '</div>' +
      '</nav>';

    var navEl = container.querySelector('.card-nav');
    var hamburger = container.querySelector('.hamburger-menu');
    var ctaBtn = container.querySelector('.card-nav-cta-button:last-child');
    var themeBtn = container.querySelector('#card-nav-theme-btn');
    var contentEl = container.querySelector('.card-nav-content');
    var cards = container.querySelectorAll('.nav-card');

    var isExpanded = false;
    var cardsArr = Array.prototype.slice.call(cards);
    var hasGsap = typeof gsap !== 'undefined';

    function calculateHeight() {
      var isMobile = window.matchMedia('(max-width: 768px)').matches;
      if (isMobile && contentEl) {
        var prevStyle = {
          visibility: contentEl.style.visibility,
          pointerEvents: contentEl.style.pointerEvents,
          position: contentEl.style.position,
          height: contentEl.style.height,
        };
        contentEl.style.visibility = 'visible';
        contentEl.style.pointerEvents = 'auto';
        contentEl.style.position = 'static';
        contentEl.style.height = 'auto';
        contentEl.offsetHeight;
        var contentHeight = contentEl.scrollHeight;
        contentEl.style.visibility = prevStyle.visibility;
        contentEl.style.pointerEvents = prevStyle.pointerEvents;
        contentEl.style.position = prevStyle.position;
        contentEl.style.height = prevStyle.height;
        return 60 + contentHeight + 16;
      }
      return 260;
    }

    function toggleMenu() {
      isExpanded = !isExpanded;
      if (isExpanded) {
        hamburger.classList.add('open');
        hamburger.setAttribute('aria-label', 'Close menu');
        hamburger.setAttribute('aria-expanded', 'true');
        contentEl.setAttribute('aria-hidden', 'false');
        if (hasGsap) {
          gsap.to(navEl, { height: calculateHeight(), duration: 0.4, ease: 'power3.out' });
          gsap.to(cardsArr, { y: 0, opacity: 1, duration: 0.4, ease: 'power3.out', stagger: 0.08 });
        } else {
          navEl.style.height = calculateHeight() + 'px';
          cardsArr.forEach(function (c) { c.style.opacity = '1'; c.style.transform = 'translateY(0)'; });
        }
      } else {
        hamburger.classList.remove('open');
        hamburger.setAttribute('aria-label', 'Open menu');
        hamburger.setAttribute('aria-expanded', 'false');
        if (hasGsap) {
          gsap.to(navEl, { height: 60, duration: 0.3, ease: 'power3.out', onComplete: function () { contentEl.setAttribute('aria-hidden', 'true'); } });
          gsap.to(cardsArr, { y: 50, opacity: 0, duration: 0.2 });
        } else {
          navEl.style.height = '60px';
          contentEl.setAttribute('aria-hidden', 'true');
          cardsArr.forEach(function (c) { c.style.opacity = '0'; c.style.transform = 'translateY(50px)'; });
        }
      }
    }

    if (hasGsap) {
      gsap.set(navEl, { height: 60, overflow: 'hidden' });
      gsap.set(cardsArr, { y: 50, opacity: 0 });
    } else {
      navEl.style.height = '60px';
      navEl.style.overflow = 'hidden';
      navEl.style.transition = 'height 0.3s ease';
      cardsArr.forEach(function (c) {
        c.style.transition = 'all 0.3s ease';
        c.style.opacity = '0';
        c.style.transform = 'translateY(50px)';
      });
    }

    hamburger.addEventListener('click', toggleMenu);
    hamburger.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleMenu();
      }
    });

    if (onCtaClick) {
      // Single handler slot (onclick property) so later reassignments
      // (updateCta / avatar navigation) replace this handler instead of
      // stacking alongside it via addEventListener.
      ctaBtn.onclick = onCtaClick;
    }

    if (themeBtn) {
      themeBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (window.WChemTheme && typeof window.WChemTheme.toggle === 'function') {
          window.WChemTheme.toggle();
        }
      });
    }

    cardsArr.forEach(function (card) {
      card.addEventListener('click', function () {
        if (isExpanded) toggleMenu();
      });
    });

    container.cardNav = {
      destroy: function () { container.innerHTML = ''; },
      close: function () { if (isExpanded) toggleMenu(); },
      updateCta: function(text, clickHandler) {
        if (ctaBtn) {
          ctaBtn.textContent = text;
          if (clickHandler) {
            ctaBtn.onclick = clickHandler;
          }
        }
      }
    };
  }

  window.CardNav = CardNav;
})();
