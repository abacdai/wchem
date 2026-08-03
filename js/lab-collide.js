/* js/lab-collide.js — Va chạm AABB (Layer 2, T-049).
   CollideTracker trang trí drag lifecycle của LabScene (bọc
   _onPointerDown/_onPointerMove/_endDrag — không sửa lab-scene.js):
   trong lúc kéo, mỗi move tìm node khả ghép dưới node đang kéo
   (AABB + tolerance để thao tác tay không quá khó) và highlight viền
   sáng; thả/kéo ra xa → xóa highlight. Strip (cabinet/shelf) không bao
   giờ là đích ghép; bộ lọc matches() tùy chọn theo ý Layer 3. */
(function () {
  'use strict';

  /* AABB: overlap giữa 2 box {x,y,w,h}; tolerance mở rộng cả 4 cạnh. */
  function aabbOverlap(a, b, tolerance) {
    tolerance = tolerance || 0;
    return a.x < b.x + b.w + tolerance &&
      a.x + a.w + tolerance > b.x &&
      a.y < b.y + b.h + tolerance &&
      a.y + a.h + tolerance > b.y;
  }

  var HIGHLIGHT_CLASS = 'lab-collide-target';

  /* Nguồn đổ (có thể rót ra) và bình chứa (có thể nhận) — Layer 2 (T-050). */
  var POUR_SOURCES = { tube: true, beaker: true, flask: true, reagent: true };
  var POUR_TARGETS = { tube: true, beaker: true, flask: true };

  /* Ghép nhiệt (T-051): bình nào cũng có thể lên bếp đun; chỉ bếp là đích. */
  var HEAT_SOURCES = { tube: true, beaker: true, flask: true, reagent: true };
  var HEAT_TARGETS = { burner: true };

  /* Ghép dụng cụ phụ (T-052): đũa khuấy / phễu / nắp đậy đặt lên miệng
     bình thủy tinh → trạng thái tương ứng; lọ hóa chất không nhận dụng cụ. */
  var TOOL_SOURCES = { stir: true, funnel: true, lid: true };
  var TOOL_TARGETS = { tube: true, beaker: true, flask: true };
  var TOOL_STATE_KEY = { stir: 'stirTool', funnel: 'filterTool', lid: 'lidTool' };
  var TOOL_KIND = { stir: 'stirring', funnel: 'filtering', lid: 'sealed' };

  var TOOL_STYLE_ID = 'lab-tool-style';
  var TOOL_CSS = '.lab-stirring{animation:lab-pulse-a .28s infinite alternate}' +
    '.lab-filtering{animation:lab-pulse-b .6s infinite alternate}' +
    '.lab-sealed{animation:lab-pulse-c .8s infinite alternate}' +
    '.lab-wrong{animation:lab-wrong .4s ease-in-out 3}' +
    '@keyframes lab-pulse-a{from{box-shadow:0 0 0 2px rgba(192,132,44,.35)}to{box-shadow:0 0 0 5px rgba(192,132,44,.6)}}' +
    '@keyframes lab-pulse-b{from{box-shadow:0 0 0 2px rgba(127,149,255,.3)}to{box-shadow:0 0 0 5px rgba(127,149,255,.55)}}' +
    '@keyframes lab-pulse-c{from{box-shadow:0 0 0 2px rgba(21,128,61,.3)}to{box-shadow:0 0 0 5px rgba(21,128,61,.55)}}' +
    '@keyframes lab-wrong{0%,100%{box-shadow:0 0 0 2px rgba(220,38,38,.4)}50%{box-shadow:0 0 0 6px rgba(220,38,38,.7)}}';

  function ensureToolStyles() {
    if (typeof document === 'undefined') return;
    if (document.getElementById(TOOL_STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = TOOL_STYLE_ID;
    style.textContent = TOOL_CSS;
    var head = document.head;
    if (!head && document.getElementsByTagName) head = document.getElementsByTagName('head')[0] || null;
    if (head) head.appendChild(style);
  }

  var FLAME_STYLE_ID = 'lab-flame-style';
  var FLAME_CSS = '.lab-flame{position:absolute;left:50%;bottom:100%;transform:translateX(-50%);' +
    'width:72%;height:34px;background:radial-gradient(50% 70% at 50% 82%,#fff8c4 0%,#ffb347 45%,rgba(255,120,40,0) 75%);' +
    'border-radius:50% 50% 30% 30%;animation:lab-flicker .22s infinite alternate;pointer-events:none}' +
    '@keyframes lab-flicker{from{transform:translateX(-50%) scaleY(1);opacity:.85}' +
    'to{transform:translateX(-50%) scaleY(1.3) translateY(-3px);opacity:1}}';

  /* Tiêm CSS ngọn lửa một lần (chỉ ở trình duyệt thật; VM test bỏ qua). */
  function ensureFlameStyles() {
    if (typeof document === 'undefined') return;
    if (document.getElementById(FLAME_STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = FLAME_STYLE_ID;
    style.textContent = FLAME_CSS;
    var head = document.head;
    if (!head && document.getElementsByTagName) head = document.getElementsByTagName('head')[0] || null;
    if (head) head.appendChild(style);
  }

  var REACTION_STYLE_ID = 'lab-reaction-style';
  var REACTION_CSS = '.lab-reaction-bubbles{animation:lab-bubble-glow 1.1s ease-out 1}' +
    '.lab-reaction-gas{animation:lab-gas-rise 1.1s ease-out 1}' +
    '.lab-reaction-precipitate{filter:saturate(.8) contrast(1.18);animation:lab-precip-cloud 1.1s ease-out 1}' +
    '.lab-reaction-color{transition:background .32s ease-out}' +
    '@keyframes lab-bubble-glow{0%{box-shadow:inset 0 -18px 0 rgba(255,255,255,.12),0 0 0 0 rgba(125,211,252,.55)}45%{box-shadow:inset 0 -18px 0 rgba(255,255,255,.28),0 -18px 0 6px rgba(125,211,252,.28)}100%{box-shadow:inset 0 -18px 0 rgba(255,255,255,.1),0 -34px 0 0 rgba(125,211,252,0)}}' +
    '@keyframes lab-gas-rise{0%{box-shadow:0 0 0 0 rgba(229,231,235,.55)}60%{box-shadow:0 -28px 0 7px rgba(229,231,235,.22)}100%{box-shadow:0 -44px 0 0 rgba(229,231,235,0)}}' +
    '@keyframes lab-precip-cloud{0%{opacity:1}50%{opacity:.72}100%{opacity:1}}';

  function ensureReactionStyles() {
    if (typeof document === 'undefined') return;
    if (document.getElementById(REACTION_STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = REACTION_STYLE_ID;
    style.textContent = REACTION_CSS;
    var head = document.head;
    if (!head && document.getElementsByTagName) head = document.getElementsByTagName('head')[0] || null;
    if (head) head.appendChild(style);
  }

  /* Bật/tắt ngọn lửa trên bếp: div.lab-flame nhô lên khỏi mặt bếp; vô hiệu
     khi không còn bình nào đang đun; aria-label thông báo trạng thái. */
  function renderFlame(burner) {
    var el = burner.element();
    if (!el) return;
    if (!burner.state || !burner.state.heatingVessel) {
      if (burner._flame) {
        try { el.removeChild(burner._flame); } catch (e) { /* VM mock */ }
        burner._flame = null;
        if (burner._label) el.setAttribute('aria-label', burner._label);
      }
      return;
    }
    if (!burner._flame) {
      burner._label = el.getAttribute('aria-label') || '';
      el.style.position = 'relative';
      var flame = document.createElement('div');
      flame.className = 'lab-flame';
      el.appendChild(flame);
      burner._flame = flame;
    }
    el.setAttribute('aria-label', (burner._label || '') + ' — đang đun');
  }

  function parseRgba(c) {
    var m = /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/.exec(c);
    if (!m) return null;
    return [parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3]), m[4] != null ? parseFloat(m[4]) : 1];
  }

  function mixColors(a, b) {
    var ra = parseRgba(a);
    var rb = parseRgba(b);
    if (!ra || !rb) return a;
    return 'rgba(' + Math.round((ra[0] + rb[0]) / 2) + ',' +
      Math.round((ra[1] + rb[1]) / 2) + ',' +
      Math.round((ra[2] + rb[2]) / 2) + ',' + ((ra[3] + rb[3]) / 2) + ')';
  }

  var PHASE = {
    H2O: 'l', HCl: 'l', NaOH: 'l', CuSO4: 'l', NaHCO3: 's', CH3COOH: 'l',
    C20H14O4: 's', FeCl3: 'l', KMnO4: 'l', NaCl: 's', H2O2: 'l', O2: 'g',
    CO2: 'g', CH4: 'g', Fe: 's', Fe2O3: 's', CaCO3: 's', 'Cu(OH)2': 's',
    Na2SO4: 'l', Na2CO3: 's', CaCl2: 'l', FeOH3: 's', CH3COONa: 'l',
    H2: 'g', Na2S: 's', AgCl: 's', BaSO4: 's', PbI2: 's',
  };

  function getPhase(substance) {
    return PHASE[substance] || 'l';
  }

  var PRODUCT_COLORS = {
    CuSO4: 'rgba(47,111,176,0.65)', NaOH: 'rgba(215,225,238,0.5)',
    HCl: 'rgba(200,215,230,0.5)', NaCl: 'rgba(230,230,230,0.6)',
    H2O: 'rgba(200,220,240,0.4)', CO2: 'rgba(200,200,200,0.3)',
    CH4: 'rgba(180,180,180,0.2)', Fe2O3: 'rgba(176,122,47,0.6)',
    Fe: 'rgba(176,122,47,0.6)', 'Cu(OH)2': 'rgba(0,100,180,0.7)',
    Na2SO4: 'rgba(230,230,230,0.5)', CaCO3: 'rgba(240,240,240,0.6)',
    CaCl2: 'rgba(230,230,230,0.5)', FeOH3: 'rgba(180,60,20,0.6)',
    CH3COONa: 'rgba(220,220,230,0.5)', H2: 'rgba(200,200,255,0.3)',
    O2: 'rgba(200,220,255,0.3)', NaHCO3: 'rgba(200,215,230,0.5)',
    CH3COOH: 'rgba(214,208,192,0.55)', KMnO4: 'rgba(122,47,158,0.6)',
    FeCl3: 'rgba(176,122,47,0.6)', C20H14O4: 'rgba(240,235,225,0.65)',
    Na2CO3: 'rgba(230,230,230,0.5)', AgCl: 'rgba(220,220,220,0.6)',
    BaSO4: 'rgba(240,240,240,0.6)', PbI2: 'rgba(200,180,40,0.6)',
  };

  function getProductColor(reaction) {
    if (!reaction || !reaction.products || !reaction.products.length) return null;
    return PRODUCT_COLORS[getProductFormula(reaction.products[0])] || null;
  }

  function getProductFormula(product) {
    return product && product.formula ? product.formula : product;
  }

  function hasProductPhase(reaction, phase) {
    if (!reaction || !reaction.products) return false;
    for (var i = 0; i < reaction.products.length; i++) {
      if (getPhase(getProductFormula(reaction.products[i])) === phase) return true;
    }
    return false;
  }

  function renderReaction(target, reaction) {
    var el = target.element();
    if (!el || !reaction) return;
    var cls = hasProductPhase(reaction, 's') ? 'lab-reaction-precipitate' :
      (hasProductPhase(reaction, 'g') ? 'lab-reaction-gas' : 'lab-reaction-bubbles');
    el.classList.add('lab-reaction-color');
    el.classList.add(cls);
    target.state.reaction = reaction.id;
    target.state.observation = reaction.balanced;
    if (typeof setTimeout !== 'undefined') {
      setTimeout(function () {
        el.classList.remove(cls);
        el.classList.remove('lab-reaction-color');
      }, 1200);
    }
  }

  function recordObservation(reaction, target) {
    if (!reaction || typeof document === 'undefined') return;
    var panel = document.getElementById('lab-observer');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'lab-observer';
      panel.setAttribute('role', 'log');
      panel.setAttribute('aria-label', 'Quan sát phản ứng');
      panel.style.position = 'fixed';
      panel.style.right = '14px';
      panel.style.top = '86px';
      panel.style.width = 'min(320px, calc(100vw - 28px))';
      panel.style.maxHeight = '44vh';
      panel.style.overflow = 'auto';
      panel.style.padding = '12px';
      panel.style.border = '1px solid rgba(127,149,255,.35)';
      panel.style.borderRadius = '14px';
      panel.style.background = 'rgba(16,40,77,.9)';
      panel.style.color = '#f8fbff';
      panel.style.font = '600 12px "Space Grotesk", sans-serif';
      panel.style.zIndex = '100002';
      var title = document.createElement('strong');
      title.textContent = 'Quan sát';
      panel.appendChild(title);
      var summary = document.createElement('div');
      summary.textContent = 'Chưa có phản ứng.';
      summary.style.margin = '8px 0';
      panel.appendChild(summary);
      var list = document.createElement('div');
      list.className = 'lab-observer-list';
      panel.appendChild(list);
      var reset = document.createElement('button');
      reset.type = 'button';
      reset.textContent = 'Làm lại';
      reset.style.marginTop = '10px';
      reset.style.minHeight = '36px';
      reset.style.border = '1px solid rgba(248,251,255,.35)';
      reset.style.borderRadius = '10px';
      reset.style.background = 'rgba(127,149,255,.18)';
      reset.style.color = '#f8fbff';
      reset.style.cursor = 'pointer';
      reset.addEventListener('click', function () {
        while (list.children.length) list.removeChild(list.children[list.children.length - 1]);
        summary.textContent = 'Chưa có phản ứng.';
        if (typeof window !== 'undefined' && window.labScene && window.labScene.resetBench) window.labScene.resetBench();
        console.log('Đã làm lại quan sát phản ứng');
      });
      panel.appendChild(reset);
      panel._summary = summary;
      panel._list = list;
      panel._reset = reset;
      if (document.body && document.body.appendChild) document.body.appendChild(panel);
    }
    var item = document.createElement('div');
    item.className = 'lab-observer-entry';
    item.style.marginTop = '8px';
    item.style.paddingTop = '8px';
    item.style.borderTop = '1px solid rgba(248,251,255,.18)';
    var products = reaction.products.map(function (p) {
      var formula = getProductFormula(p);
      return formula + '(' + getPhase(formula) + ')';
    }).join(' + ');
    var color = target && target.state && target.state.color ? target.state.color : 'không đổi';
    var conclusion = reaction.note || reaction.type || 'Phản ứng đã xảy ra.';
    var status = hasProductPhase(reaction, 'g') ? 'Có khí thoát ra' :
      (hasProductPhase(reaction, 's') ? 'Có kết tủa' : 'Dung dịch sau phản ứng');
    item.textContent = 'Phương trình: ' + reaction.balanced + ' — Trạng thái: ' + status +
      ' — Sản phẩm: ' + products + ' — Màu: ' + color + ' — Kết luận: ' + conclusion;
    if (panel._list) panel._list.appendChild(item);
    else panel.appendChild(item);
    if (panel._summary) panel._summary.textContent = reaction.type + ': ' + products;
    if (target && target.state) {
      target.state.observer = {
        equation: reaction.balanced,
        status: status,
        products: products,
        color: color,
        conclusion: conclusion,
      };
      target.state.observerText = item.textContent;
    }
    console.log('Quan sát phản ứng: ' + reaction.balanced + ' | ' + status + ' | ' + products + ' | màu ' + color + ' | ' + conclusion);
  }

  /* Vẽ mực chất lỏng: gradient phủ từ đáy lên theo fill; lưu background gốc
     (thủy tinh) lần đầu để khôi phục khi rỗng; aria-label kèm % chất lỏng. */
  function renderFill(node) {
    var el = node.element();
    if (!el || !node.state) return;
    if (!node._glassBg) {
      node._glassBg = el.style.background || '';
      node._label = el.getAttribute('aria-label') || '';
    }
    var fill = node.state.fill;
    if (fill <= 0) {
      el.style.background = node._glassBg;
      if (node._label) el.setAttribute('aria-label', node._label);
      return;
    }
    var top = Math.round((1 - fill) * 100);
    var layer = 'linear-gradient(180deg, transparent ' + top + '%, ' + node.state.color + ' ' + top + '%)';
    /* Màu nền chỉ hợp lệ ở layer CUỐI của background shorthand — gradient
       chất lỏng đứng trước, nền thủy tinh đứng cuối. */
    el.style.background = layer + (node._glassBg ? ',' + node._glassBg : '');
    el.setAttribute('aria-label', node._label + ' — chứa ' + Math.round(fill * 100) + '% chất lỏng');
  }

  function CollideTracker(scene, opts) {
    opts = opts || {};
    this.scene = scene;
    this.tolerance = opts.tolerance || 10;
    this.matches = opts.matches || null;
    this.highlightClass = opts.highlightClass || HIGHLIGHT_CLASS;
    this.dragged = null;
    this.hovered = null;
    this._wrap(scene);
  }

  /* Bọc 3 handler riêng: onStart (phát hiện drag mới — kể cả takeover
     spawn từ cabinet/kệ), onMove (cập nhật hover), end (xóa highlight —
     gộp cả pointerup/cancel/blur/interrupt/clear vì mọi đường đều qua
     _endDrag). */
  CollideTracker.prototype._wrap = function (scene) {
    var self = this;
    var origDown = scene._onPointerDown;
    var origMove = scene._onPointerMove;
    var origEnd = scene._endDrag;
    scene._onPointerDown = function (event) {
      var before = Object.keys(scene._dragByPointer);
      origDown.call(scene, event);
      var now = Object.keys(scene._dragByPointer);
      for (var i = 0; i < now.length; i++) {
        if (before.indexOf(now[i]) === -1) {
          self._onDragStart(scene._dragByPointer[now[i]].node);
          break;
        }
      }
    };
    scene._onPointerMove = function (event) {
      origMove.call(scene, event);
      var pid = event.pointerId != null ? event.pointerId : 1;
      var drag = scene._dragByPointer[pid];
      if (drag) self._onDragMove(drag.node);
    };
    scene._endDrag = function (pid, interrupted) {
      var drag = scene._dragByPointer[pid];
      origEnd.call(scene, pid, interrupted);
      if (drag) self._onDragEnd(drag.node, interrupted);
    };
  };

  /* Node đang kéo chồng lên node khác (overlap lớn nhất thắng). */
  CollideTracker.prototype._hovered = function () {
    var self = this;
    var dragged = this.dragged;
    if (!dragged) return null;
    var b = dragged.getBounds();
    var best = null;
    var bestOverlap = -1;
    var cands = this.scene.getNodes().filter(function (n) {
      if (n === dragged) return false;
      if (n.type === 'cabinet' || n.type === 'shelf') return false;
      if (!n.visible || !n.pickable) return false;
      if (self.matches && !self.matches(dragged, n)) return false;
      return true;
    });
    for (var i = 0; i < cands.length; i++) {
      var nb = cands[i].getBounds();
      if (!aabbOverlap(b, nb, this.tolerance)) continue;
      var ow = Math.max(0, Math.min(b.x + b.w, nb.x + nb.w) - Math.max(b.x, nb.x));
      var oh = Math.max(0, Math.min(b.y + b.h, nb.y + nb.h) - Math.max(b.y, nb.y));
      var area = ow * oh;
      if (area > bestOverlap) {
        bestOverlap = area;
        best = cands[i];
      }
    }
    return best;
  };

  CollideTracker.prototype._onDragStart = function (node) {
    this.dragged = node;
    /* Nhấc bình đang đun lên (hoặc nhấc chính bếp đi) → tắt lửa ngay. */
    if (node.state && node.state.heatingBurner) this._unheat(node.state.heatingBurner);
    else if (node.type === 'burner' && node.state && node.state.heatingVessel) this._unheat(node);
    /* Nhấc bình đang ghép dụng cụ lên → tháo hết dụng cụ (chúng rơi lại
       trên bàn, không bay theo). */
    if (node.state) {
      if (node.state.stirTool) this._uncoupleTool(node, node.state.stirTool);
      if (node.state.filterTool) this._uncoupleTool(node, node.state.filterTool);
      if (node.state.lidTool) this._uncoupleTool(node, node.state.lidTool);
      if (node.state.coupledVessel) this._uncoupleTool(node.state.coupledVessel, node);
    }
    this._setHovered(this._hovered());
  };

  CollideTracker.prototype._onDragMove = function (node) {
    if (node !== this.dragged) return;
    var prev = this.hovered;
    this._setHovered(this._hovered());
    /* Vào bếp → đun; rời bếp (hoặc chuyển đích khác) → tắt. */
    if (this.hovered && this.hovered.type === 'burner' && this._canHeat(node, this.hovered)) {
      this._heat(this.hovered, node);
    } else if (prev && prev.type === 'burner' && prev.state && prev.state.heatingVessel === node) {
      this._unheat(prev);
    }
    /* Dụng cụ đặt lên bình → ghép; rời bình → tháo. */
    if (this.hovered && this._canCoupleTool(node, this.hovered)) {
      this._coupleTool(this.hovered, node);
      this._clearWrong(this.hovered);
    } else if (prev && this._isToolOn(prev, node)) {
      this._uncoupleTool(prev, node);
    }
    /* Wrong-coupling visual feedback: tool over non-target or vessel over non-pour-target. */
    if (this.hovered && this._isWrongTarget(node, this.hovered)) {
      this._setWrong(this.hovered);
    } else if (prev && this._isWrongTarget(node, prev)) {
      this._clearWrong(prev);
    }
  };

  CollideTracker.prototype._onDragEnd = function (node, interrupted) {
    /* Thả ngay trên bình chứa → đổ theo lượng (Layer 2, T-050); thả trên
       bếp → giữ trạng thái đun (T-051). Interrupt không hủy đun/ghép: bình
       vẫn nằm tại chỗ cuối (trên bếp) — nhưng không bao giờ đổ khi
       interrupt. */
    var stayHeated = false;
    var stayCoupled = false;
    if (this.hovered) {
      if (!interrupted && this._canPour(node, this.hovered)) this._pour(node, this.hovered);
      else if (this._canHeat(node, this.hovered)) {
        this._heat(this.hovered, node);
        stayHeated = true;
      }
      if (this._canCoupleTool(node, this.hovered)) {
        this._coupleTool(this.hovered, node);
        stayCoupled = true;
      }
    }
    this._setHovered(null);
    /* Thả ra ngoài bếp/dụng cụ khỏi bình → tắt. */
    if (!stayHeated && node.state && node.state.heatingBurner) this._unheat(node.state.heatingBurner);
    if (!stayCoupled && node.state && node.state.coupledVessel) this._uncoupleTool(node.state.coupledVessel, node);
    this.dragged = null;
  };

  /* Nguồn có chất lỏng (fill > 0), đích là bình chứa còn chỗ. */
  CollideTracker.prototype._canPour = function (source, target) {
    if (!source || !target || source === target) return false;
    if (!source.state || !target.state) return false;
    if (!POUR_SOURCES[source.type] || !POUR_TARGETS[target.type]) return false;
    if (source.state.fill <= 0 || target.state.fill >= 1) return false;
    return true;
  };

/* Đổ: lượng = min(nguồn, chỗ trống của đích); bình rỗng nhận màu + chất
      của nguồn; khác chất → dùng engine phản ứng để xác định màu sản phẩm
      (vd: CuSO4 + NaOH → xanh Cu(OH)2), fallback là trộn màu trung bình.
      Nguồn cạn → mất chất. */
  CollideTracker.prototype._pour = function (source, target) {
    var amount = Math.min(source.state.fill, 1 - target.state.fill);
    if (amount <= 0) return;
    if (target.state.fill === 0) {
      target.state.color = source.state.color;
      target.state.substance = source.state.substance;
    } else if (source.state.substance && target.state.substance &&
      source.state.substance !== target.state.substance) {
      var chemEngine = typeof window !== 'undefined' ? window.labChem : null;
      var reaction = chemEngine ? chemEngine.react(
        { state: { substance: source.state.substance, fill: source.state.fill, heating: source.state.heating } },
        { state: { substance: target.state.substance, fill: target.state.fill, heating: target.state.heating } }
      ) : null;
      if (reaction && reaction.products && reaction.products.length > 0) {
        target.state.substance = getProductFormula(reaction.products[0]);
        target.state.color = getProductColor(reaction) || mixColors(target.state.color, source.state.color);
        renderReaction(target, reaction);
        recordObservation(reaction, target);
      } else {
        target.state.substance = 'mix';
        target.state.color = mixColors(target.state.color, source.state.color);
      }
    }
    target.state.fill += amount;
    source.state.fill -= amount;
    if (source.state.fill <= 0) source.state.substance = null;
    renderFill(source);
    renderFill(target);
    this._logPour(source, target, amount);
  };

  CollideTracker.prototype._logPour = function (source, target, amount) {
    var sub = source.state ? source.state.substance : null;
    if (!sub && target.state && target.state.observer && target.state.observer.products) sub = target.state.observer.products;
    var name = sub || 'chất lỏng';
    var pct = Math.round(amount * 100);
    console.log('Đã đổ ' + pct + '% ' + name + ' vào ' + (target.state ? target.type : 'vật'));
  };

  /* Ghép nhiệt (T-051): bếp nhận mọi bình; bếp không bao giờ là đích đổ
     (không nằm trong POUR_TARGETS) nên hai cơ chế không xung đột. */
  CollideTracker.prototype._canHeat = function (source, target) {
    if (!source || !target || source === target) return false;
    if (!source.state || !target.state) return false;
    if (!HEAT_SOURCES[source.type] || !HEAT_TARGETS[target.type]) return false;
    return true;
  };

  CollideTracker.prototype._heat = function (burner, vessel) {
    if (burner.state.heatingVessel === vessel) return;
    this._unheat(burner);
    burner.state.heatingVessel = vessel;
    vessel.state.heating = true;
    vessel.state.heatingBurner = burner;
    renderFlame(burner);
  };

  CollideTracker.prototype._unheat = function (burner) {
    if (!burner || !burner.state || !burner.state.heatingVessel) return;
    var vessel = burner.state.heatingVessel;
    vessel.state.heating = false;
    vessel.state.heatingBurner = null;
    burner.state.heatingVessel = null;
    renderFlame(burner);
  };

  /* Ghép dụng cụ phụ (T-052): dụng cụ (đũa/phễu/nắp) đặt lên bình thủy
     tinh → trạng thái khuấy/lọc/đậy; mỗi bình giữ tối đa 1 dụng cụ mỗi
     loại, dụng cụ chỉ ghép được 1 bình tại một thời điểm. */
  CollideTracker.prototype._canCoupleTool = function (source, target) {
    if (!source || !target || source === target) return false;
    if (!source.state || !target.state) return false;
    if (!TOOL_SOURCES[source.type] || !TOOL_TARGETS[target.type]) return false;
    return true;
  };

  /* Wrong-coupling feedback: tool dragged over a non-target vessel
     (bottle/burner) or vessel with liquid dragged over a non-pour-target. */
  CollideTracker.prototype._isWrongTarget = function (source, target) {
    if (!source || !target || source === target) return false;
    if (!source.state || !target.state) return false;
    if (TOOL_SOURCES[source.type] && !TOOL_TARGETS[target.type]) return true;
    if (source.state.fill > 0 && POUR_SOURCES[source.type] && !POUR_TARGETS[target.type]) return true;
    return false;
  };

  CollideTracker.prototype._setWrong = function (node) {
    var el = node.element();
    if (!el) return;
    el.classList.add('lab-wrong');
  };

  CollideTracker.prototype._clearWrong = function (node) {
    var el = node.element();
    if (!el) return;
    el.classList.remove('lab-wrong');
  };

  CollideTracker.prototype._isToolOn = function (vessel, tool) {
    if (!vessel || !vessel.state || !tool) return false;
    return vessel.state[TOOL_STATE_KEY[tool.type]] === tool;
  };

  CollideTracker.prototype._coupleTool = function (vessel, tool) {
    var key = TOOL_STATE_KEY[tool.type];
    var kind = TOOL_KIND[tool.type];
    if (vessel.state[key] === tool) return;
    this._uncoupleTool(vessel, tool);
    vessel.state[key] = tool;
    tool.state.coupledVessel = vessel;
    renderTool(vessel, kind, true);
  };

  CollideTracker.prototype._uncoupleTool = function (vessel, tool) {
    var key = TOOL_STATE_KEY[tool.type];
    var kind = TOOL_KIND[tool.type];
    if (!vessel || !vessel.state || vessel.state[key] !== tool) return;
    vessel.state[key] = null;
    tool.state.coupledVessel = null;
    renderTool(vessel, kind, false);
  };

  /* Phản hồi trực quan: class .lab-stirring/.lab-filtering/.lab-sealed
     (pulse box-shadow CSS; không đụng transform để khỏi phá vị trí node). */
  function renderTool(vessel, kind, on) {
    var el = vessel.element();
    if (!el) return;
    var cls = 'lab-' + kind;
    if (on) el.classList.add(cls);
    else el.classList.remove(cls);
  }

  CollideTracker.prototype._setHovered = function (node) {
    if (node === this.hovered) return;
    if (this.hovered && this.hovered.element()) {
      var oldEl = this.hovered.element();
      oldEl.style.boxShadow = '';
      oldEl.classList.remove(this.highlightClass);
      oldEl.classList.remove('lab-wrong');
    }
    this.hovered = node;
    if (node && node.element()) {
      var el = node.element();
      el.style.boxShadow = '0 0 0 3px rgba(255,196,60,0.95)';
      el.classList.add(this.highlightClass);
    }
  };

  /* ---------- Global ---------- */
  var api = { CollideTracker: CollideTracker, aabbOverlap: aabbOverlap };
  window.LabCollide = api;

  function init() {
    ensureFlameStyles();
    ensureToolStyles();
    ensureReactionStyles();
    if (window.labScene) {
      window.labCollide = new CollideTracker(window.labScene);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
