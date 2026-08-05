/* js/lab-scene.js — LabScene: scene graph nhẹ (DOM-only) theo PhET Scenery patterns.
   Nguồn tham khảo: docs/PHET-SCENERY-PATTERNS.md (T-045 research).
   Mỗi LabNode = 1 div position:absolute; transform chỉ là projection — x/y/scale
   là dữ liệu JS (rule 1). Hit-test: con trên cùng trước, trail root→leaf (rule 2).
   Drag: grab offset lúc press (rule 5), clamp trong model space (rule 6),
   một pointer một drag (rule 3), interrupt khi mất pointer (rule 8). */
(function () {
  'use strict';

  var zCounter = 1;

  var transformProp = (function () {
    var probe = (typeof document !== 'undefined' && document.createElement)
      ? document.createElement('div').style
      : null;
    if (!probe) return 'transform';
    return 'transform' in probe ? 'transform' : 'webkitTransform';
  })();

  function clamp(v, min, max) {
    return v < min ? min : (v > max ? max : v);
  }

  function applyTransform(node) {
    var el = node.element();
    if (!el || !el.style) return;
    var t = 'translate(' + node.x + 'px,' + node.y + 'px)';
    if (node.scale !== 1) t += ' scale(' + node.scale + ')';
    if (node.rotation) t += ' rotate(' + node.rotation + 'deg)';
    el.style[transformProp] = t;
  }

  /* ---------- LabNode ---------- */
  function LabNode(scene, id, type, opts) {
    opts = opts || {};
    this.scene = scene;
    this.id = id;
    this.type = type;
    this.x = opts.x || 0;
    this.y = opts.y || 0;
    this.scale = opts.scale || 1;
    this.rotation = opts.rotation || 0;
    this.pickable = opts.pickable !== false;
    this.visible = opts.visible !== false;
    this.draggable = opts.draggable !== false;
    this.parent = null;
    this.children = [];
    this.onStart = opts.onStart || null;
    this.onDrag = opts.onDrag || null;
    this.onEnd = opts.onEnd || null;
    this.inspectable = opts.inspectable === true;
    this._element = null;
    this._w = opts.w || 0;
    this._h = opts.h || 0;
    this._zIndex = 0;
    this._inspectBase = null;
  }

  LabNode.prototype.element = function () { return this._element; };

  LabNode.prototype.setPosition = function (x, y) {
    this.x = x;
    this.y = y;
    applyTransform(this);
  };

  LabNode.prototype.setScale = function (s) {
    this.scale = s;
    applyTransform(this);
  };

  LabNode.prototype.setRotation = function (deg) {
    this.rotation = deg;
    applyTransform(this);
  };

  LabNode.prototype.setSize = function (w, h) {
    this._w = w;
    this._h = h;
    var el = this._element;
    if (el && el.style) {
      el.style.width = w + 'px';
      el.style.height = h + 'px';
    }
  };

  LabNode.prototype.setVisible = function (v) {
    this.visible = v;
    if (this._element && this._element.style) {
      this._element.style.display = v ? '' : 'none';
    }
  };

  /* addChild: phần tử cuối vẽ trên cùng (z-order = thứ tự mảng) */
  LabNode.prototype.addChild = function (child) {
    if (child.parent) child.parent.removeChild(child);
    child.parent = this;
    this.children.push(child);
    child._zIndex = zCounter++;
    var el = child.element();
    if (el) {
      el.style.zIndex = child._zIndex;
      if (this._element && this._element.appendChild) this._element.appendChild(el);
    }
  };

  LabNode.prototype.removeChild = function (child) {
    var i = this.children.indexOf(child);
    if (i === -1) return;
    this.children.splice(i, 1);
    child.parent = null;
    var el = child.element();
    if (el && el.parentNode && el.parentNode.removeChild) el.parentNode.removeChild(el);
  };

  /* Như moveChildToIndex: kéo node lên trên cùng khi bắt đầu drag */
  LabNode.prototype.bringToFront = function () {
    if (!this.parent) return;
    var siblings = this.parent.children;
    var i = siblings.indexOf(this);
    if (i === -1 || i === siblings.length - 1) return;
    siblings.splice(i, 1);
    siblings.push(this);
    this._zIndex = zCounter++;
    var el = this._element;
    if (el) el.style.zIndex = this._zIndex;
  };

  /* Bounds cache nhẹ: w/h lấy từ model, fallback offsetWidth/Height */
  LabNode.prototype.getBounds = function () {
    var w = this._w;
    var h = this._h;
    if ((!w || !h) && this._element && this._element.offsetWidth) {
      w = this._element.offsetWidth;
      h = this._element.offsetHeight;
      this._w = w;
      this._h = h;
    }
    return { x: this.x, y: this.y, w: w, h: h, scale: this.scale };
  };

  LabNode.prototype.globalToLocal = function (px, py) {
    var chain = [];
    var n = this;
    while (n) { chain.unshift(n); n = n.parent; }
    var x = px;
    var y = py;
    for (var i = 0; i < chain.length; i++) {
      x = (x - chain[i].x) / chain[i].scale;
      y = (y - chain[i].y) / chain[i].scale;
    }
    return { x: x, y: y };
  };

  LabNode.prototype.localToGlobal = function (px, py) {
    var chain = [];
    var n = this;
    while (n) { chain.unshift(n); n = n.parent; }
    var x = px;
    var y = py;
    for (var i = chain.length - 1; i >= 0; i--) {
      x = x * chain[i].scale + chain[i].x;
      y = y * chain[i].scale + chain[i].y;
    }
    return { x: x, y: y };
  };

  /* ---------- Hit-test (Picker.recursiveHitTest) ----------
     Trả trail root→leaf, null nếu không trúng. Con trên cùng test trước,
     self chỉ sau khi mọi con trượt; invisible chặn cả cây con,
     pickable:false chỉ chặn self (container không nuốt hit của con). */
  function hitTestRecursive(node, px, py) {
    if (!node.visible) return null;
    var i;
    var hit;
    var lx;
    var ly;
    var b = node.getBounds();
    if (b.w > 0 && b.h > 0) {
      if (px < b.x || px > b.x + b.w || py < b.y || py > b.y + b.h) return null;
      lx = (px - node.x) / node.scale;
      ly = (py - node.y) / node.scale;
    } else {
      lx = px;
      ly = py;
    }
    for (i = node.children.length - 1; i >= 0; i--) {
      hit = hitTestRecursive(node.children[i], lx, ly);
      if (hit) {
        hit.unshift(node);
        return hit;
      }
    }
    if (!node.pickable) return null;
    if (lx >= 0 && lx <= b.w && ly >= 0 && ly <= b.h) return [node];
    return null;
  }

  /* ---------- LabScene ---------- */
  var GLASSWARE_STYLES = {
    beaker: { background: 'rgba(63,86,188,0.14)', border: '2px solid #3f56bc', borderRadius: '0 0 16px 16px' },
    flask: { background: 'rgba(18,140,61,0.14)', border: '2px solid #15803d', borderRadius: '8px' },
    tube: { background: 'rgba(218,94,20,0.14)', border: '2px solid #da5e14', borderRadius: '10px 10px 18px 18px' },
    funnel: { background: 'rgba(127,149,255,0.14)', border: '2px solid #7f95ff', borderRadius: '18px 18px 10px 10px' },
    stir: { background: 'linear-gradient(90deg, transparent 0 17px, #c0842c 17px 27px, transparent 27px)', border: '1px dashed #c0842c', borderRadius: '12px' },
    burner: { background: 'rgba(90,60,20,0.25)', border: '2px solid #8a6b2f', borderRadius: '14px 14px 6px 6px' },
    lid: { background: 'rgba(160,120,40,0.22)', border: '2px solid #a07828', borderRadius: '6px' },
  };

  var SAMPLE_ITEMS = [
    { type: 'beaker', label: 'Cốc', w: 96, h: 88 },
    { type: 'flask', label: 'Bình tam giác', w: 92, h: 84 },
    { type: 'tube', label: 'Ống nghiệm', w: 46, h: 120 },
    { type: 'burner', label: 'Bếp đun', w: 100, h: 40 },
  ];

  var CABINET_WIDTH = 72;
  var CABINET_TOOLS = [
    { type: 'beaker', label: 'Cốc', w: 96, h: 88 },
    { type: 'flask', label: 'Bình tam giác', w: 92, h: 84 },
    { type: 'tube', label: 'Ống nghiệm', w: 46, h: 120 },
    { type: 'funnel', label: 'Phễu', w: 74, h: 64 },
    { type: 'stir', label: 'Đũa thủy tinh', w: 44, h: 120 },
    { type: 'burner', label: 'Bếp đun', w: 64, h: 56 },
    { type: 'lid', label: 'Nắp đậy', w: 60, h: 20 },
  ];

  /* Hóa chất phổ thông: màu dung dịch theo thực tế (liquid = gradient fill
     của lọ; chip tô cùng màu). CuSO4 xanh lam, FeCl3 vàng nâu, KMnO4 tím;
     các dung dịch trong suốt có tông nhạt riêng để phân biệt. */
  var REAGENT_ITEMS = [
    { name: 'Nước', formula: 'H2O', liquid: 'rgba(150,200,235,0.55)' },
    { name: 'Axit clohidric', formula: 'HCl', liquid: 'rgba(200,215,230,0.5)' },
    { name: 'Natri hidroxit', formula: 'NaOH', liquid: 'rgba(215,225,238,0.5)' },
    { name: 'Đồng(II) sunfat', formula: 'CuSO4', liquid: 'rgba(47,111,176,0.65)' },
    { name: 'Natri hidrocacbonat', formula: 'NaHCO3', liquid: 'rgba(200,215,230,0.5)' },
    { name: 'Axit axetic', formula: 'CH3COOH', liquid: 'rgba(214,208,192,0.55)' },
    { name: 'Phenolphtalein', formula: 'C20H14O4', liquid: 'rgba(240,235,225,0.65)' },
    { name: 'Sắt(III) clorua', formula: 'FeCl3', liquid: 'rgba(176,122,47,0.6)' },
    { name: 'Kali pemanganat', formula: 'KMnO4', liquid: 'rgba(122,47,158,0.6)' },
  ];

  var REAGENT_BOTTLE_W = 64;
  var REAGENT_BOTTLE_H = 96;

  function LabScene(container, opts) {
    opts = opts || {};
    this.container = (typeof container === 'string') ? document.getElementById(container) : container;
    this.opts = opts;
    this._dragByPointer = {};
    this._nextId = 1;
    this._draggingClass = opts.draggingClass || 'lab-dragging';
    this._bounds = opts.bounds || null;
    this._rect = null;
    this._rectInvalidated = false;
    this._rectWired = false;
    this._snapSlots = opts.snapSlots || null;
    this._snapDistance = opts.snapDistance || 60;
    this._seedItems = [];
    this._seedOrigin = [];
    this.root = new LabNode(this, 'root', 'root', { pickable: false });
    this.root._element = this.container;
    if (this.container && this.container.style) {
      this.container.style.position = 'absolute';
      this.container.style.left = '0';
      this.container.style.top = '0';
      this.container.style.width = '100%';
      this.container.style.height = '100%';
      this.container.style.overflow = 'hidden';
      this.container.style.zIndex = '2';
      this.container.style.cursor = 'grab';
      this.container.style.touchAction = 'none';
    }
    if (this.container && this.container.addEventListener) this._attach();
    if (opts.seed !== false && this.container) this.seedSample();
  }

  /* ---------- Sự kiện: press → drag → release/interrupt ----------
     hand-bridge phát pointerdown lên container (bench), pointermove/up
     lên window — listener đính ở cả hai nơi (PhET: listener đính vào pointer). */
  LabScene.prototype._attach = function () {
    var self = this;
    var supportsPointer = typeof window.PointerEvent !== 'undefined';
    var downType = supportsPointer ? 'pointerdown' : 'mousedown';
    var moveType = supportsPointer ? 'pointermove' : 'mousemove';
    var upType = supportsPointer ? 'pointerup' : 'mouseup';
    var onDown = function (e) { self._onPointerDown(e); };
    var onMove = function (e) { self._onPointerMove(e); };
    var onUp = function (e) { self._onPointerUp(e); };
    var onCancel = function (e) { self._onPointerCancel(e); };
    this.container.addEventListener(downType, onDown);
    window.addEventListener(moveType, onMove);
    window.addEventListener(upType, onUp);
    if (supportsPointer) window.addEventListener('pointercancel', onCancel);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('blur', function () { self.interruptAll(); });
    this._cleanup = function () {
      self.container.removeEventListener(downType, onDown);
      window.removeEventListener(moveType, onMove);
      window.removeEventListener(upType, onUp);
      if (supportsPointer) window.removeEventListener('pointercancel', onCancel);
      window.removeEventListener('mouseup', onUp);
    };
  };

  LabScene.prototype._containerRect = function () {
    var self = this;
    if (!this._rectWired) {
      window.addEventListener('resize', function () {
        self._rectInvalidated = true;
        self._fitStrips();
      });
      this._rectWired = true;
    }
    if (this._rect && !this._rectInvalidated) return this._rect;
    var container = this.container;
    if (!container || !container.getBoundingClientRect) return null;
    var r = container.getBoundingClientRect();
    this._rect = { left: r.left, top: r.top, width: r.width, height: r.height };
    this._rectInvalidated = false;
    return this._rect;
  };

  LabScene.prototype._dragBounds = function () {
    if (this._bounds) return this._bounds;
    var rect = this._containerRect();
    if (!rect) return null;
    return { x: 0, y: 0, w: rect.width, h: rect.height };
  };

  /* canPress: button 0 (chụm), chưa có drag trên pointer này.
     onStart(node, event, point) có thể trả về { node: target } để "tiếp
     quản" drag — tủ dụng cụ dùng để spawn bản sao và kéo ra ngay. */
  LabScene.prototype._onPointerDown = function (event) {
    if (event.button !== 0) return;
    var pid = event.pointerId != null ? event.pointerId : 1;
    if (this._dragByPointer[pid]) return;
    var rect = this._containerRect();
    if (!rect) return;
    var px = event.clientX - rect.left;
    var py = event.clientY - rect.top;
    var trail = this.hitTest(px, py);
    if (!trail) return;
    var node = trail[trail.length - 1];
    var target = node;
    if (node.onStart) {
      var grabbed = node.onStart(node, event, { x: px, y: py });
      if (grabbed && grabbed.node) target = grabbed.node;
    }
    if (!target.draggable) return;
    var local = target.globalToLocal(px, py);
    this._dragByPointer[pid] = {
      node: target,
      grabOffset: { x: local.x, y: local.y },
      rect: rect,
    };
    target.bringToFront();
    var el = target.element();
    if (el && el.classList) el.classList.add(this._draggingClass);
    this._beginInspect(target);
    if (event.preventDefault) event.preventDefault();
  };

  LabScene.prototype._onPointerMove = function (event) {
    var pid = event.pointerId != null ? event.pointerId : 1;
    var drag = this._dragByPointer[pid];
    if (!drag) return;
    var node = drag.node;
    var nx = event.clientX - drag.rect.left - drag.grabOffset.x;
    var ny = event.clientY - drag.rect.top - drag.grabOffset.y;
    var b = this._dragBounds();
    if (b) {
      var size = node.getBounds();
      var minX = b.x;
      var maxX = b.x + b.w - size.w;
      var minY = b.y;
      var maxY = b.y + b.h - size.h;
      if (maxX < minX) maxX = minX;
      if (maxY < minY) maxY = minY;
      nx = clamp(nx, minX, maxX);
      ny = clamp(ny, minY, maxY);
    }
    var snapped = this._nearestSnap(node, nx, ny);
    if (snapped) {
      nx = snapped.x;
      ny = snapped.y;
    }
    if (nx === node.x && ny === node.y) return;
    var dx = nx - node.x;
    var dy = ny - node.y;
    node.x = nx;
    node.y = ny;
    this._updateInspect(node, dx);
    applyTransform(node);
    if (node.onDrag) node.onDrag(node, { x: nx, y: ny, dx: dx, dy: dy });
  };

  LabScene.prototype._onPointerUp = function (event) {
    var pid = event.pointerId != null ? event.pointerId : 1;
    this._endDrag(pid, false);
  };

  LabScene.prototype._onPointerCancel = function (event) {
    var pid = event.pointerId != null ? event.pointerId : 1;
    this._endDrag(pid, true);
  };

  LabScene.prototype._endDrag = function (pid, interrupted) {
    var drag = this._dragByPointer[pid];
    if (!drag) return;
    delete this._dragByPointer[pid];
    var node = drag.node;
    var el = node.element();
    if (el && el.classList) el.classList.remove(this._draggingClass);
    this._endInspect(node);
    if (node.onEnd) node.onEnd(node, { interrupted: interrupted });
  };

  LabScene.prototype._beginInspect = function (node) {
    if (!node.inspectable || node._inspectBase) return;
    var el = node.element();
    node._inspectBase = {
      scale: node.scale,
      rotation: node.rotation || 0,
      boxShadow: el && el.style ? el.style.boxShadow : '',
    };
    node.scale = node.scale * 1.08;
    node.rotation = 0;
    if (el && el.style) el.style.boxShadow = '0 18px 34px rgba(15,23,42,.22)';
    applyTransform(node);
  };

  LabScene.prototype._updateInspect = function (node, dx) {
    if (!node._inspectBase) return;
    node.rotation = clamp(dx * 0.8, -10, 10);
  };

  LabScene.prototype._endInspect = function (node) {
    if (!node._inspectBase) return;
    var base = node._inspectBase;
    var el = node.element();
    node.scale = base.scale;
    node.rotation = base.rotation;
    node._inspectBase = null;
    if (el && el.style) el.style.boxShadow = base.boxShadow;
    applyTransform(node);
  };

  LabScene.prototype.interrupt = function (pid) {
    this._endDrag(pid, true);
  };

  LabScene.prototype.interruptAll = function () {
    var keys = Object.keys(this._dragByPointer);
    for (var i = 0; i < keys.length; i++) this._endDrag(keys[i], true);
  };

  /* ---------- Scene API ---------- */
  LabScene.prototype.hitTest = function (px, py) {
    return hitTestRecursive(this.root, px, py);
  };

  LabScene.prototype.spawnNode = function (type, opts) {
    opts = opts || {};
    var node = new LabNode(this, opts.id || (type + '-' + (this._nextId++)), type, opts);
    /* Trạng thái chất lỏng (Layer 2): fill 0..1, color CSS, substance id.
       Lọ hóa chất ghi đè khi spawn (fill 1 + màu + công thức). */
    node.state = { fill: 0, color: null, substance: null, substances: [], heating: false, heatingBurner: null, heatingVessel: null, coupledVessel: null, stirTool: null, filterTool: null, lidTool: null };
    var el = document.createElement('div');
    el.className = 'lab-node lab-node--' + type;
    el.style.position = 'absolute';
    el.style.left = '0';
    el.style.top = '0';
    el.style.display = 'flex';
    el.style.alignItems = 'center';
    el.style.justifyContent = 'center';
    el.style.textAlign = 'center';
    el.style.font = '600 12px "Space Grotesk", sans-serif';
    el.style.color = '#10284d';
    el.style.cursor = 'grab';
    el.style.userSelect = 'none';
    el.style.touchAction = 'none';
    el.style.willChange = 'transform';
    if (opts.w) el.style.width = opts.w + 'px';
    if (opts.h) el.style.height = opts.h + 'px';
    if (opts.content != null) {
      if (typeof opts.content === 'string') el.innerHTML = opts.content;
      else el.appendChild(opts.content);
    }
    el.setAttribute('data-lab-id', node.id);
    el.setAttribute('role', opts.role || 'img');
    el.setAttribute('aria-label', opts.label || node.id);
    if (opts.title) el.setAttribute('title', opts.title);
    node._element = el;
    this.root.addChild(node);
    /* opts.style áp sau addChild để style tường minh (vd: zIndex cao của
       cabinet) thắng zIndex mặc định theo thứ tự con */
    if (opts.style) {
      var keys = Object.keys(opts.style);
      for (var i = 0; i < keys.length; i++) el.style[keys[i]] = opts.style[keys[i]];
    }
    applyTransform(node);
    return node;
  };

  LabScene.prototype.removeNode = function (node) {
    if (node.parent) node.parent.removeChild(node);
    var keys = Object.keys(this._dragByPointer);
    for (var i = 0; i < keys.length; i++) {
      if (this._dragByPointer[keys[i]].node === node) this._endDrag(keys[i], true);
    }
  };

  LabScene.prototype.getNodes = function () {
    return this.root.children.slice();
  };

  LabScene.prototype.clear = function () {
    this.interruptAll();
    while (this.root.children.length) this.root.removeChild(this.root.children[0]);
  };

  LabScene.prototype.seedSample = function () {
    var n = SAMPLE_ITEMS.length;
    this._seedItems = [];
    this._seedOrigin = [];
    for (var i = 0; i < n; i++) {
      var spec = SAMPLE_ITEMS[i];
      var node = this.spawnNode(spec.type, {
        x: 80 + i * 128,
        y: 60,
        w: spec.w,
        h: spec.h,
        label: spec.label,
        content: spec.label,
        inspectable: true,
        style: GLASSWARE_STYLES[spec.type],
      });
      this._seedItems.push(node);
      this._seedOrigin.push({ x: 80 + i * 128, y: 60 });
    }
    /* Vị trí chuẩn của các dụng cụ mẫu = snap slots mặc định (T-048). */
    if (!this.opts.snapSlots) this._snapSlots = this._seedOrigin.slice();
  };

  /* Snap: nam châm sống — kéo đến gần slot (khoảng cách giữa tâm, theo
     kích thước node đang kéo → đúng với mọi cỡ/scale) thì dính vào vị trí
     chuẩn; kéo ra xa quá ngưỡng thì rời tự nhiên. */
  LabScene.prototype.setSnapSlots = function (slots) {
    this._snapSlots = slots;
  };

  LabScene.prototype._nearestSnap = function (node, nx, ny) {
    if (!this._snapSlots || !this._snapSlots.length) return null;
    var size = node.getBounds();
    var w = size.w || 0;
    var h = size.h || 0;
    var cx = nx + w / 2;
    var cy = ny + h / 2;
    var best = null;
    var bestD = this._snapDistance;
    for (var i = 0; i < this._snapSlots.length; i++) {
      var s = this._snapSlots[i];
      var dx = cx - (s.x + w / 2);
      var dy = cy - (s.y + h / 2);
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d <= bestD) {
        bestD = d;
        best = s;
      }
    }
    return best;
  };

  /* Reset bench: đưa dụng cụ mẫu về vị trí chuẩn, xóa bản sao đã spawn
     (dụng cụ từ tủ + lọ hóa chất), giữ nguyên cabinet/kệ + snap slots. */
  LabScene.prototype.resetBench = function () {
    this.interruptAll();
    var i;
    for (i = 0; i < this._seedItems.length; i++) {
      var seed = this._seedItems[i];
      if (!seed.parent) continue;
      seed.setPosition(this._seedOrigin[i].x, this._seedOrigin[i].y);
    }
    var nodes = this.root.children.slice();
    for (i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      if (n === this._cabinet || n === this._shelf) continue;
      if (this._seedItems.indexOf(n) !== -1) continue;
      this.removeNode(n);
    }
  };

  /* Bố cục responsive: khi viewport đổi kích thước, hai strip bám lại mép
     và chiều cao khớp bench mới; drag bounds đã được invalidate sẵn. */
  LabScene.prototype._fitStrips = function () {
    var rect = this._containerRect();
    if (!rect) return;
    if (this._cabinet) this._cabinet.setSize(CABINET_WIDTH, rect.height);
    if (this._shelf) {
      this._shelf.setSize(CABINET_WIDTH, rect.height);
      this._shelf.setPosition(Math.max(0, rect.width - CABINET_WIDTH), 0);
    }
  };

  LabScene.prototype.toggleToolMenu = function (force) {
    var next = typeof force === 'boolean' ? force : !this._toolMenuOpen;
    if (!this._cabinet || !this._shelf) return false;
    this._toolMenuOpen = next;
    var rect = this._containerRect() || { width: 800, height: 600 };
    var gap = 12;
    var fit = Math.max(168, (rect.width - 48) / 2);
    var stacked = rect.width < (fit * 2 + gap + 24);
    var cols = stacked ? 1 : 2;
    var panelW = Math.min(220, Math.max(168, (rect.width - 48) / cols));
    var panelH = Math.min(rect.height - 24, stacked ? (rect.height - 24 - gap) / 2 : 500);
    var panelTop = stacked ? 12 : Math.max(12, (rect.height - panelH) / 2);
    var left = Math.max(12, (rect.width - (panelW * cols + gap * (cols - 1))) / 2);
    var panels = [this._cabinet, this._shelf];
    for (var i = 0; i < panels.length; i++) {
      var panel = panels[i];
      panel.setVisible(next);
      if (next) {
        panel.setPosition(left + (i % cols) * (panelW + gap), panelTop + Math.floor(i / cols) * (panelH + gap));
        panel.setSize(panelW, panelH);
        panel.element().style.display = 'flex';
        panel.element().style.padding = '38px 10px 12px';
        panel.element().style.borderRadius = '18px';
        panel.element().style.boxShadow = '0 20px 50px rgba(7,24,52,.35)';
        panel.element().style.border = '1px solid rgba(127,149,255,.45)';
        panel.element().style.backdropFilter = 'blur(18px)';
      } else {
        panel.element().style.display = 'none';
      }
    }
    var bench = this.container;
    if (bench) {
      bench.setAttribute('aria-expanded', next ? 'true' : 'false');
      bench.setAttribute('aria-label', next ? 'Menu chọn chất và dụng cụ đang mở' : 'Bàn thí nghiệm ảo');
    }
    return next;
  };

  /* Tủ dụng cụ: strip trái, container pickable:false (rule 9 — không nuốt
     hit của bench); 6 chip dụng cụ pickable, onStart spawn bản sao tại
     điểm chạm và trả { node } để pointer tiếp quản kéo ngay. */
  LabScene.prototype.spawnCabinet = function () {
    if (this._cabinet) return this._cabinet;
    var self = this;
    var rect = this._containerRect();
    var stripH = rect ? rect.height : 600;
    var cabinet = this.spawnNode('cabinet', {
      id: 'cabinet',
      x: 0,
      y: 0,
      w: CABINET_WIDTH,
      h: stripH,
      pickable: false,
      draggable: false,
      label: 'Tủ dụng cụ',
      style: {
        background: 'rgba(16,40,77,0.88)',
        borderRight: '1px solid rgba(127,149,255,0.25)',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 6px',
        overflowY: 'auto',
        zIndex: '100000',
      },
    });
    this._cabinet = cabinet;
    var y = 8;
    CABINET_TOOLS.forEach(function (spec) {
      var tool = self.spawnNode('tool-' + spec.type, {
        id: 'tool-' + spec.type,
        x: 6,
        y: y,
        w: 56,
        h: 56,
        pickable: true,
        draggable: false,
        label: spec.label,
        content: spec.label,
        style: {
          background: 'rgba(127,149,255,0.10)',
          border: '1px solid rgba(127,149,255,0.35)',
          borderRadius: '12px',
          cursor: 'pointer',
          font: '600 10px "Space Grotesk", sans-serif',
          color: '#dde1ff',
          flexShrink: '0',
        },
        onStart: function (node, event, point) {
          var w = spec.w;
          var h = spec.h;
          var x = point.x - w / 2;
          var yy = point.y - h / 2;
          var r = self._containerRect();
          if (r) {
            x = clamp(x, 0, Math.max(0, r.width - w));
            yy = clamp(yy, 0, Math.max(0, r.height - h));
          }
          var copy = self.spawnNode(spec.type, {
            x: x,
            y: yy,
            w: w,
            h: h,
            label: spec.label,
            content: spec.label,
            inspectable: true,
            style: GLASSWARE_STYLES[spec.type],
          });
          return { node: copy };
        },
      });
      cabinet.addChild(tool);
      y += 64;
    });
    return cabinet;
  };

  /* Kệ hóa chất: strip phải, đối xứng tủ dụng cụ — chip thuốc thử tô màu
     dung dịch, tooltip "Tên — Công thức"; press → spawn lọ hóa chất tại
     điểm chạm và trả { node } để pointer kéo ra ngay (cùng cơ chế T-046). */
  LabScene.prototype.spawnShelf = function () {
    if (this._shelf) return this._shelf;
    var self = this;
    var rect = this._containerRect();
    var stripW = rect ? rect.width : 800;
    var stripH = rect ? rect.height : 600;
    var shelf = this.spawnNode('shelf', {
      id: 'shelf',
      x: Math.max(0, stripW - CABINET_WIDTH),
      y: 0,
      w: CABINET_WIDTH,
      h: stripH,
      pickable: false,
      draggable: false,
      label: 'Kệ hóa chất',
      style: {
        background: 'rgba(16,40,77,0.88)',
        borderLeft: '1px solid rgba(127,149,255,0.25)',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 6px',
        overflowY: 'auto',
        zIndex: '100000',
      },
    });
    this._shelf = shelf;
    var y = 8;
    REAGENT_ITEMS.forEach(function (spec) {
      var tool = self.spawnNode('reagent-' + spec.formula, {
        id: 'reagent-' + spec.formula,
        x: 6,
        y: y,
        w: 56,
        h: 56,
        pickable: true,
        draggable: false,
        label: spec.name + ' — ' + spec.formula,
        content: spec.formula,
        title: spec.name + ' — ' + spec.formula,
        style: {
          background: spec.liquid,
          border: '1px solid rgba(180,200,230,0.6)',
          borderRadius: '10px 10px 12px 12px',
          cursor: 'pointer',
          font: '600 10px "Space Grotesk", sans-serif',
          color: '#10284d',
          flexShrink: '0',
        },
        onStart: function (node, event, point) {
          var w = REAGENT_BOTTLE_W;
          var h = REAGENT_BOTTLE_H;
          var x = point.x - w / 2;
          var yy = point.y - h / 2;
          var r = self._containerRect();
          if (r) {
            x = clamp(x, 0, Math.max(0, r.width - w));
            yy = clamp(yy, 0, Math.max(0, r.height - h));
          }
          var copy = self.spawnNode('reagent', {
            x: x,
            y: yy,
            w: w,
            h: h,
            label: spec.name + ' — ' + spec.formula,
            content: spec.formula,
            title: spec.name + ' — ' + spec.formula,
            inspectable: true,
            style: {
              background: 'linear-gradient(180deg, transparent 16%, ' + spec.liquid + ' 16%)',
              border: '2px solid rgba(180,200,230,0.75)',
              borderRadius: '10px 10px 16px 16px',
              boxShadow: '0 2px 8px rgba(16,40,77,0.25)',
            },
          });
          copy.formula = spec.formula;
          copy.state = { fill: 1, color: spec.liquid, substance: spec.formula, substances: [spec.formula], heating: false, heatingBurner: null, heatingVessel: null, coupledVessel: null, stirTool: null, filterTool: null, lidTool: null };
          return { node: copy };
        },
      });
      shelf.addChild(tool);
      y += 64;
    });
    return shelf;
  };

  /* ---------- Global ---------- */
  var api = { LabScene: LabScene, LabNode: LabNode };

  function mount(selectorOrEl, opts) {
    var bench = (typeof selectorOrEl === 'string') ? document.getElementById(selectorOrEl) : selectorOrEl;
    if (!bench) return null;
    var scene = new LabScene(bench, opts);
    window.labScene = scene;
    return scene;
  }

  api.mount = mount;
  window.LabScene = api;

  function init() {
    if (document.getElementById('lab-bench')) {
      var scene = mount('lab-bench');
      if (scene) {
        scene.spawnCabinet();
        scene.spawnShelf();
        scene.toggleToolMenu(false);
        window.addEventListener('handscope:tool-menu-toggle', function () {
          scene.toggleToolMenu();
        });
        var resetBtn = document.getElementById('lab-resetBench');
        if (resetBtn && resetBtn.addEventListener) {
          resetBtn.addEventListener('click', function () {
            if (window.labScene) window.labScene.resetBench();
          });
        }
      }
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
