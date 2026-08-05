(function () {
  'use strict';

  /* ---------- Console / Toast ---------- */
  var consoleEl = document.getElementById('lab-console');
  function log(msg) {
    var t = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    var line = document.createElement('div');
    line.className = 'lab-line';
    line.innerHTML = '<span>' + t + '</span>' + msg;
    consoleEl.appendChild(line);
    while (consoleEl.childElementCount > 24) consoleEl.removeChild(consoleEl.firstChild);
  }

  var toastTimer;
  function toast(msg) {
    var el = document.getElementById('lab-toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('lab-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('lab-show'); }, 2200);
  }

  /* ---------- Start HandScope ---------- */
  function startTracking() {
    log('Khởi động HAND//SCOPE bridge…');
    if (window.HandScope && typeof window.HandScope.start === 'function') {
      window.HandScope.start();
    } else {
      log('<span style="color:#ba1a1a">Không tìm thấy HandScope — kiểm tra hand-bridge.js</span>');
    }
  }

  var stopTrackingBtn = document.getElementById('lab-stopTracking');
  var calibrateGazeBtn = document.getElementById('lab-calibrateGaze');
  var resetGazeBtn = document.getElementById('lab-resetGaze');
  var gazeState = document.getElementById('lab-gazeState');
  var calibrationOverlay = document.getElementById('lab-gazeCalibration');
  var calibrationTarget = document.getElementById('lab-gazeTarget');
  var calibrationInstruction = document.getElementById('lab-gazeInstruction');
  var calibrationCancelled = false;
  var calibrationActive = false;

  function wait(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  async function calibrateGaze() {
    if (!window.GazeTracker) return;
    var points = [
      [0.12, 0.14], [0.5, 0.14], [0.88, 0.14],
      [0.12, 0.5], [0.5, 0.5], [0.88, 0.5],
      [0.12, 0.86], [0.5, 0.86], [0.88, 0.86],
    ];
    var samples = [];
    calibrationCancelled = false;
    calibrationActive = true;
    calibrationOverlay.classList.add('lab-open');
    calibrationOverlay.setAttribute('aria-hidden', 'false');
    calibrateGazeBtn.disabled = true;

    try {
      for (var i = 0; i < points.length; i += 1) {
        if (calibrationCancelled) throw new Error('cancelled');
        var point = points[i];
        calibrationTarget.style.left = (point[0] * 100) + '%';
        calibrationTarget.style.top = (point[1] * 100) + '%';
        calibrationInstruction.textContent = 'Điểm ' + (i + 1) + '/9: nhìn vào tâm điểm';
        await wait(650);
        if (calibrationCancelled) throw new Error('cancelled');
        var features = await window.GazeTracker.capturePoint(point[0], point[1]);
        samples.push({ features: features, x: point[0], y: point[1] });
      }
      window.GazeTracker.saveCalibration(samples);
      gazeState.textContent = 'Đã hiệu chỉnh, đang theo dõi ánh nhìn';
      log('Hiệu chỉnh mắt 9 điểm hoàn tất');
      toast('Đã hiệu chỉnh ánh nhìn');
    } catch (error) {
      if (error.message !== 'cancelled' && error.message !== 'Calibration stopped') {
        toast('Không thể hiệu chỉnh. Hãy giữ khuôn mặt trong khung hình.');
      }
    } finally {
      calibrationActive = false;
      calibrationOverlay.classList.remove('lab-open');
      calibrationOverlay.setAttribute('aria-hidden', 'true');
      calibrateGazeBtn.disabled = !(window.HandScope && window.HandScope.running);
    }
  }

  calibrateGazeBtn.addEventListener('click', calibrateGaze);
  document.getElementById('lab-cancelCalibration').addEventListener('click', function () {
    calibrationCancelled = true;
    calibrationActive = false;
    calibrationOverlay.classList.remove('lab-open');
    calibrationOverlay.setAttribute('aria-hidden', 'true');
  });
  resetGazeBtn.addEventListener('click', function () {
    if (!window.GazeTracker) return;
    window.GazeTracker.resetCalibration();
    gazeState.textContent = 'Chưa hiệu chỉnh';
    toast('Đã xóa dữ liệu hiệu chỉnh');
  });
  stopTrackingBtn.addEventListener('click', function () {
    if (window.HandScope) window.HandScope.stop();
    stopTrackingBtn.hidden = true;
    calibrateGazeBtn.disabled = true;
    gazeState.textContent = 'Camera đã tắt';
    document.getElementById('lab-startOverlay').classList.remove('lab-hidden');
    log('Đã tắt camera và dừng theo dõi');
  });

  window.addEventListener('handscope:gaze', function (event) {
    var detail = event.detail;
    if (detail.error) gazeState.textContent = detail.error;
    else if (detail.stopped) gazeState.textContent = 'Camera đã tắt';
    else if (detail.faceDetected && detail.calibrated) gazeState.textContent = 'Đã hiệu chỉnh, đang theo dõi ánh nhìn';
    else if (detail.faceDetected) gazeState.textContent = 'Đã thấy khuôn mặt, cần hiệu chỉnh';
    else if (detail.ready) gazeState.textContent = 'Đang tìm khuôn mặt...';
    calibrateGazeBtn.disabled = calibrationActive || !window.GazeTracker || (!detail.ready && !detail.faceDetected);
  });

  /* ---------- Tabs ---------- */
  document.querySelectorAll('.lab-tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      document.querySelectorAll('.lab-tab').forEach(function (t) { t.classList.remove('lab-tab-active'); });
      tab.classList.add('lab-tab-active');
      var name = tab.dataset.tab;
      document.getElementById('lab-calibration').classList.toggle('lab-open', name === 'calibration');
      document.getElementById('lab-about').classList.toggle('lab-open', name === 'about');
    });
  });

  /* ---------- Calibration sliders ---------- */
  function bindSlider(id, valId, onChange) {
    var el = document.getElementById(id);
    var valEl = document.getElementById(valId);
    el.addEventListener('input', function () {
      valEl.textContent = el.value;
      onChange(parseFloat(el.value));
    });
  }
  bindSlider('lab-sliderEnter', 'lab-valEnter', function (v) {
    if (window.HandScope) window.HandScope.setPinchThresholds(v, undefined);
    log('Ngưỡng vào chụm → ' + v);
  });
  bindSlider('lab-sliderExit', 'lab-valExit', function (v) {
    if (window.HandScope) window.HandScope.setPinchThresholds(undefined, v);
    log('Ngưỡng thoát chụm → ' + v);
  });

  /* ---------- Status events ---------- */
  var viewportLabel = document.getElementById('lab-viewportLabel');
  var viewportHint = document.getElementById('lab-viewportHint');
  var statGesture = document.getElementById('lab-statGesture');
  var lastHandDetected = null;
  var statSource = document.getElementById('lab-statSource');

  window.addEventListener('handscope:status', function (e) {
    var d = e.detail;
    statSource.textContent = d.source || '';
    statSource.style.color = d.source === 'Backend' ? '#00d4ff' : '#757684';
    if (d.handDetected) {
      viewportLabel.classList.add('lab-tracking');
      viewportHint.style.opacity = '0';
      statGesture.textContent = d.gesture || '—';
    } else {
      viewportLabel.classList.remove('lab-tracking');
      viewportHint.style.opacity = '1';
      statGesture.textContent = '—';
    }
    if (d.handDetected !== lastHandDetected) {
      lastHandDetected = d.handDetected;
      log(d.handDetected ? 'Đã phát hiện tay — bắt đầu theo dõi' : 'Mất dấu tay');
    }
  });

  /* ---------- Chế độ thí nghiệm: Classic (chuột/cảm ứng) | AR (camera) ---------- */
  function setModeBadge(mode) {
    var badge = document.getElementById('lab-mode-badge');
    var chip = document.getElementById('lab-modeChip');
    var chipText = document.getElementById('lab-modeChipText');
    var label = mode === 'ar' ? 'AR' : 'CLASSIC';
    if (badge) {
      badge.textContent = label;
      badge.hidden = false;
      badge.classList.toggle('lab-mode-badge--ar', mode === 'ar');
    }
    if (chip) {
      chip.hidden = false;
      if (chipText) chipText.textContent = label;
    }
  }

  function openModePicker() {
    if (window.HandScope && window.HandScope.running) window.HandScope.stop();
    stopTrackingBtn.hidden = true;
    calibrateGazeBtn.disabled = true;
    gazeState.textContent = 'Chưa khởi động camera';
    document.getElementById('lab-startOverlay').classList.remove('lab-hidden');
    log('Chọn chế độ thí nghiệm');
  }

  function startClassicMode() {
    var membership = document.getElementById('lab-membership');
    if (membership) membership.hidden = true;
    document.getElementById('lab-startOverlay').classList.add('lab-hidden');
    stopTrackingBtn.hidden = true;
    setModeBadge('classic');
    log('Chế độ Classic: kéo thả dụng cụ bằng chuột / cảm ứng');
    toast('Chế độ Classic');
  }

  function startARMode() {
    document.getElementById('lab-startOverlay').classList.add('lab-hidden');
    var panel = document.getElementById('lab-membership');
    panel.hidden = false;
    log('Chế độ AR đang phát triển — hướng dẫn đăng ký gói thành viên');
  }

  function closeMembershipPanel() {
    document.getElementById('lab-membership').hidden = true;
    document.getElementById('lab-startOverlay').classList.remove('lab-hidden');
  }

  function submitMembership(e) {
    e.preventDefault();
    var input = document.getElementById('lab-membershipEmail');
    var msg = document.getElementById('lab-membershipMsg');
    var btn = document.getElementById('lab-membershipSubmit');
    var email = (input.value || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      msg.textContent = 'Vui lòng nhập email hợp lệ.';
      msg.className = 'lab-membership-msg lab-membership-msg--error';
      input.focus();
      return;
    }
    msg.textContent = '';
    btn.disabled = true;
    btn.textContent = 'Đang gửi...';
    fetch('/api/membership/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, plan: 'ar' }),
    })
      .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
      .then(function (r) {
        if (r.ok) {
          msg.textContent = 'Đã nhận đăng ký! Chúng tôi sẽ liên hệ bạn khi chế độ AR sẵn sàng.';
          msg.className = 'lab-membership-msg lab-membership-msg--ok';
          input.value = '';
          input.readOnly = true;
        } else if (r.data && r.data.details && r.data.details.email) {
          msg.textContent = r.data.details.email;
          msg.className = 'lab-membership-msg lab-membership-msg--error';
        } else if (r.data && r.data.error) {
          msg.textContent = r.data.error;
          msg.className = 'lab-membership-msg lab-membership-msg--error';
        }
      })
      .catch(function () {
        msg.textContent = 'Không kết nối được máy chủ. Vui lòng thử lại.';
        msg.className = 'lab-membership-msg lab-membership-msg--error';
      })
      .then(function () {
        btn.disabled = false;
        btn.textContent = 'Đăng ký gói thành viên';
      });
  }

  document.getElementById('lab-modeClassic').addEventListener('click', startClassicMode);
  document.getElementById('lab-modeAR').addEventListener('click', startARMode);
  document.getElementById('lab-membershipBack').addEventListener('click', closeMembershipPanel);
  document.getElementById('lab-membershipForm').addEventListener('submit', submitMembership);
  var modeBadge = document.getElementById('lab-mode-badge');
  if (modeBadge) modeBadge.addEventListener('click', openModePicker);
  var modeChip = document.getElementById('lab-modeChip');
  if (modeChip) modeChip.addEventListener('click', openModePicker);

  /* ---------- Init ---------- */
  log('HandScope lab đã tải xong — chọn chế độ Classic hoặc AR');
})();
