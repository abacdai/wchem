(function () {
  'use strict';

  const PALETTE = [
    { hex: '#5eead4', label: 'Teal' },
    { hex: '#ffb454', label: 'Amber' },
    { hex: '#b79bff', label: 'Violet' },
    { hex: '#ff8fa3', label: 'Hồng' },
    { hex: '#7dd3fc', label: 'Xanh' },
    { hex: '#ffffff', label: 'Trắng' },
  ];

  const root = document.createElement('div');
  root.id = 'kl-root';
  root.innerHTML = `
    <div id="kl-landing">
      <canvas id="kl-particles"></canvas>

      <div id="card-nav-root" class="card-nav-container"></div>

      <div class="kl-hero">
        <div class="kl-hero-badge">
          <span class="material-symbols-outlined">front_hand</span>
          <span>HandScope — độc lập, không phụ thuộc ứng dụng nào</span>
        </div>
        <h1 class="kl-hero-title">
          Điều khiển web bằng <span class="kl-gradient">cử chỉ tay thật</span>
        </h1>
        <p class="kl-hero-sub">
          HandScope theo dõi tay qua webcam rồi phát sinh sự kiện chuột thật lên bất kỳ trang nào — không có phần mô phỏng riêng. Demo dưới đây là một canvas vẽ đơn giản để thấy ngay nó hoạt động thế nào.
        </p>
        <button id="kl-primaryStart" class="kl-primary-btn">
          <span class="material-symbols-outlined">play_arrow</span> Khởi động camera
        </button>
      </div>

      <div class="kl-footer">
        <span>hand-bridge.js + handscope-shell.js — 2 file JS, không build step</span>
        <span class="kl-footer-ver">HandScope v1 (standalone)</span>
      </div>
    </div>

    <div id="kl-lab">
      <aside class="kl-lab-sidebar kl-glass">
        <div class="kl-lab-sidebar-header">
          <button id="kl-backBtn" class="kl-back-btn" title="Về trang chủ">
            <span class="material-symbols-outlined">arrow_back</span>
          </button>
          ${logoImg(24)}
          <div>
            <div class="kl-lab-sidebar-header-text">HandScope</div>
            <div class="kl-lab-sidebar-header-sub">Standalone demo</div>
          </div>
        </div>
        <div class="kl-tab kl-tab-active" data-tab="demo"><span class="material-symbols-outlined">draw</span><span>Demo</span></div>
        <div class="kl-tab" data-tab="calibration"><span class="material-symbols-outlined">tune</span><span>Calibration</span></div>
        <div class="kl-tab" data-tab="about"><span class="material-symbols-outlined">info</span><span>About</span></div>
        <div style="flex:1;"></div>
        <button id="kl-clearCanvas" class="kl-clear-btn">
          <span class="material-symbols-outlined">delete</span><span>Xóa canvas</span>
        </button>
      </aside>

      <div class="kl-lab-content">
        <div id="kl-viewport" class="kl-glass kl-luminous">
          <canvas id="handscope-canvas"></canvas>
          <div id="kl-viewportLabel"><span class="kl-dot"></span><span>GESTURE TRACKING</span></div>
          <canvas id="kl-arCanvas"></canvas>
          <div id="kl-viewportHint">
            <div class="kl-ring"></div>
            <div style="margin-top:-90px;display:flex;flex-direction:column;align-items:center;gap:6px;">
              <span class="material-symbols-outlined" style="font-size:32px;">front_hand</span>Awaiting Gesture...
            </div>
          </div>

          <div class="kl-craft-toggle">
            <button id="kl-craftToggle" class="kl-craft-btn kl-glass kl-glow-btn">
              <span class="material-symbols-outlined" id="kl-craftIcon">palette</span>
            </button>
            <div id="kl-craftItems" style="position:relative;width:0;height:0;"></div>
          </div>

          <div id="kl-calibration">
            <div>
              <div style="font-weight:600;font-size:14px;margin-bottom:4px;">Hiệu chỉnh cử chỉ tay</div>
              <p>Ngưỡng vào/thoát cách nhau càng lớn thì càng ít bị nhấp nháy, nhưng phản hồi sẽ trễ hơn.</p>
            </div>
            <div class="kl-field">
              <label>Ngưỡng vào chụm <span id="kl-valEnter">0.14</span></label>
              <input type="range" id="kl-sliderEnter" min="0.04" max="0.35" step="0.01" value="0.14">
            </div>
            <div class="kl-field">
              <label>Ngưỡng thoát chụm <span id="kl-valExit">0.26</span></label>
              <input type="range" id="kl-sliderExit" min="0.12" max="0.55" step="0.01" value="0.26">
            </div>
          </div>

          <div id="kl-about">
            <h2><span class="material-symbols-outlined" style="font-size:20px;">info</span> Về HandScope</h2>
            <p>HandScope là lớp theo dõi tay bằng webcam sử dụng MediaPipe Tasks Vision, độc lập hoàn toàn. Phát sinh sự kiện chuột thật — mọi ứng dụng web có hỗ trợ chuột đều dùng được ngay.</p>
            <div class="kl-about-section">
              <h3>Công nghệ</h3>
              <ul>
                <li>MediaPipe Hands (WASM/TFLite) — 21 điểm landmark/bàn tay</li>
                <li>One-Euro filter — lọc nhiễu chuyển động thời gian thực</li>
                <li>Chụm ngón cái + trỏ → kéo thả chuột trái</li>
                <li>Nắm tay → xóa (chuột phải)</li>
                <li>Grace period 180ms — chống rung khi mất dấu ngắn</li>
              </ul>
            </div>
            <div class="kl-about-section">
              <h3>Kiến trúc</h3>
              <ul>
                <li>hand-bridge.js — theo dõi tay, phát sự kiện chuột thật</li>
                <li>handscope-shell.js — giao diện demo Standalone</li>
                <li>Không build step, không phụ thuộc framework</li>
              </ul>
            </div>
            <div class="kl-about-section">
              <h3>Hướng dẫn</h3>
              <ul>
                <li>Cho phép truy cập camera khi trình duyệt hỏi</li>
                <li>Chụm ngón cái + ngón trỏ để vẽ</li>
                <li>Nắm bàn tay để xóa</li>
                <li>Dùng thanh trượt Calibration để tinh chỉnh độ nhạy</li>
              </ul>
            </div>
          </div>
        </div>

        <div class="kl-console-panel">
          <div class="kl-console-info">
            <div class="kl-console-title">Console</div>
            <div class="kl-console-desc">Nhật ký cử chỉ &amp; sự kiện</div>
            <div class="kl-console-stats">
              <span id="kl-statSource"></span><span id="kl-statGesture">—</span>
            </div>
          </div>
          <div class="kl-console-box">
            <div id="kl-console"></div>
          </div>
        </div>
      </div>
    </div>

    <div id="kl-toast"></div>
  `;
  document.body.appendChild(root);

  function logoImg(size) {
    return `<img src="icon.png" width="${size}" height="${size}" style="border-radius:50%;object-fit:cover;">`;
  }

  const consoleEl = document.getElementById('kl-console');
  function log(msg) {
    const t = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const line = document.createElement('div');
    line.className = 'kl-line';
    line.innerHTML = `<span>${t}</span>${msg}`;
    consoleEl.appendChild(line);
    while (consoleEl.childElementCount > 24) consoleEl.removeChild(consoleEl.firstChild);
  }
  let toastTimer = null;
  function toast(msg) {
    const el = document.getElementById('kl-toast');
    el.textContent = msg;
    el.classList.add('kl-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('kl-show'), 2200);
  }

  function startSession() {
    root.classList.add('kl-active');
    log('Khởi động HAND//SCOPE bridge…');
    if (window.HandScope && typeof window.HandScope.start === 'function') {
      window.HandScope.start();
    } else {
      log('<span style="color:#ba1a1a">Không tìm thấy HandScope — kiểm tra hand-bridge.js</span>');
    }
    resizeDemoCanvas();
  }
  document.getElementById('kl-primaryStart').addEventListener('click', startSession);
  var navBtn = document.getElementById('kl-navStart');
  if (navBtn) navBtn.addEventListener('click', startSession);

  document.querySelectorAll('.kl-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.kl-tab').forEach((t) => t.classList.remove('kl-tab-active'));
      tab.classList.add('kl-tab-active');
      const name = tab.dataset.tab;
      document.getElementById('kl-calibration').classList.toggle('kl-open', name === 'calibration');
      document.getElementById('kl-about').classList.toggle('kl-open', name === 'about');
    });
  });

  document.getElementById('kl-backBtn').addEventListener('click', () => {
    root.classList.remove('kl-active');
    log('Đã trở về màn hình chính');
  });

  document.getElementById('kl-clearCanvas').addEventListener('click', () => {
    clearDemoCanvas();
    log('Đã xóa canvas demo');
  });

  const craftToggle = document.getElementById('kl-craftToggle');
  const craftItems = document.getElementById('kl-craftItems');
  PALETTE.forEach((c) => {
    const btn = document.createElement('button');
    btn.className = 'kl-craft-item';
    btn.style.background = c.hex;
    btn.style.color = c.hex === '#ffffff' ? '#213145' : '#0b1c30';
    btn.title = c.label;
    btn.addEventListener('click', () => {
      setDemoColor(c.hex);
      log(`Đã chọn màu: <b>${c.label}</b>`);
    });
    craftItems.appendChild(btn);
  });
  let craftOpen = false;
  craftToggle.addEventListener('click', () => {
    craftOpen = !craftOpen;
    const items = craftItems.querySelectorAll('.kl-craft-item');
    const totalWidth = (items.length - 1) * 60;
    const startX = -totalWidth / 2;
    items.forEach((item, i) => {
      if (craftOpen) {
        item.classList.add('kl-shown');
        item.style.transform = `translate(${startX + i * 60}px, 70px) scale(1)`;
      } else {
        item.classList.remove('kl-shown');
        item.style.transform = 'translate(0,0) scale(0)';
      }
    });
  });

  const demoCanvas = document.getElementById('handscope-canvas');
  const demoCtx = demoCanvas.getContext('2d', { willReadFrequently: true });
  let currentColor = PALETTE[0].hex;
  let isDrawing = false;
  let isErasing = false;
  let lastPt = null;

  function resizeDemoCanvas() {
    const rect = demoCanvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const prev = demoCtx.getImageData ? safeSnapshot() : null;
    demoCanvas.width = Math.max(1, Math.round(rect.width * dpr));
    demoCanvas.height = Math.max(1, Math.round(rect.height * dpr));
    demoCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (prev) demoCtx.putImageData(prev, 0, 0);
  }
  function safeSnapshot() {
    try { return demoCtx.getImageData(0, 0, demoCanvas.width, demoCanvas.height); } catch (e) { return null; }
  }
  function clearDemoCanvas() {
    demoCtx.clearRect(0, 0, demoCanvas.width, demoCanvas.height);
  }
  function setDemoColor(hex) {
    currentColor = hex;
  }
  function setBrush(erase) {
    demoCtx.lineCap = 'round';
    demoCtx.lineJoin = 'round';
    if (erase) {
      demoCtx.globalCompositeOperation = 'destination-out';
      demoCtx.lineWidth = 42;
    } else {
      demoCtx.globalCompositeOperation = 'source-over';
      demoCtx.strokeStyle = currentColor;
      demoCtx.lineWidth = 7;
    }
  }
  function dotAt(p, erase) {
    setBrush(erase);
    demoCtx.beginPath();
    demoCtx.arc(p.x, p.y, erase ? 21 : 3.5, 0, Math.PI * 2);
    if (erase) { demoCtx.fill(); } else { demoCtx.fillStyle = currentColor; demoCtx.fill(); }
  }
  function lineTo(a, b, erase) {
    setBrush(erase);
    demoCtx.beginPath();
    demoCtx.moveTo(a.x, a.y);
    demoCtx.lineTo(b.x, b.y);
    demoCtx.stroke();
  }

  demoCanvas.addEventListener('mousedown', (e) => {
    isDrawing = true;
    isErasing = e.button === 2;
    const rect = demoCanvas.getBoundingClientRect();
    lastPt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    dotAt(lastPt, isErasing);
  });
  demoCanvas.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('mousemove', (e) => {
    if (!isDrawing) return;
    const rect = demoCanvas.getBoundingClientRect();
    const pt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    lineTo(lastPt, pt, isErasing);
    lastPt = pt;
  });
  window.addEventListener('mouseup', () => {
    isDrawing = false;
    lastPt = null;
  });
  window.addEventListener('resize', resizeDemoCanvas);
  resizeDemoCanvas();

  function bindSlider(id, valId, onChange) {
    const el = document.getElementById(id);
    const valEl = document.getElementById(valId);
    el.addEventListener('input', () => {
      valEl.textContent = el.value;
      onChange(parseFloat(el.value));
    });
  }
  bindSlider('kl-sliderEnter', 'kl-valEnter', (v) => {
    if (window.HandScope) window.HandScope.setPinchThresholds(v, undefined);
    log(`Ngưỡng vào chụm → ${v}`);
  });
  bindSlider('kl-sliderExit', 'kl-valExit', (v) => {
    if (window.HandScope) window.HandScope.setPinchThresholds(undefined, v);
    log(`Ngưỡng thoát chụm → ${v}`);
  });

  const viewportLabel = document.getElementById('kl-viewportLabel');
  const viewportHint = document.getElementById('kl-viewportHint');
  const statGesture = document.getElementById('kl-statGesture');
  let lastHandDetected = null;

  const statSource = document.getElementById('kl-statSource');
  window.addEventListener('handscope:status', (e) => {
    const d = e.detail;
    statSource.textContent = d.source || '';
    statSource.style.color = d.source === 'Backend' ? '#00d4ff' : '#757684';
    if (d.handDetected) {
      viewportLabel.classList.add('kl-tracking');
      viewportHint.style.opacity = '0';
      statGesture.textContent = d.gesture || '—';
    } else {
      viewportLabel.classList.remove('kl-tracking');
      viewportHint.style.opacity = '1';
      statGesture.textContent = '—';
    }
    if (d.handDetected !== lastHandDetected) {
      lastHandDetected = d.handDetected;
      log(d.handDetected ? 'Đã phát hiện tay — bắt đầu theo dõi' : 'Mất dấu tay');
    }
  });

  const pCanvas = document.getElementById('kl-particles');
  const pCtx = pCanvas.getContext('2d');
  let particles = [];
  function resizeParticles() {
    pCanvas.width = window.innerWidth;
    pCanvas.height = window.innerHeight;
    particles = [];
    const count = (pCanvas.width * pCanvas.height) / 18000;
    for (let i = 0; i < count; i += 1) {
      particles.push({
        x: Math.random() * pCanvas.width,
        y: Math.random() * pCanvas.height,
        dx: (Math.random() - 0.5) * 0.4,
        dy: (Math.random() - 0.5) * 0.4,
        r: Math.random() * 1.5 + 0.5,
      });
    }
  }
  function animateParticles() {
    requestAnimationFrame(animateParticles);
    pCtx.clearRect(0, 0, pCanvas.width, pCanvas.height);
    pCtx.fillStyle = 'rgba(63,86,188,0.3)';
    particles.forEach((p) => {
      p.x += p.dx; p.y += p.dy;
      if (p.x < 0 || p.x > pCanvas.width) p.dx *= -1;
      if (p.y < 0 || p.y > pCanvas.height) p.dy *= -1;
      pCtx.beginPath();
      pCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      pCtx.fill();
    });
  }
  window.addEventListener('resize', resizeParticles);
  resizeParticles();
  animateParticles();

  log('HandScope shell đã tải xong — không phụ thuộc Sandboxels');
})();
