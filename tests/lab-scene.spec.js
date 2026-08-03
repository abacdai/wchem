const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function makeEl(id) {
  const style = Object.create({ transform: '', webkitTransform: '' });
  const el = {
    id,
    style,
    attrs: {},
    children: [],
    parentNode: null,
    offsetWidth: 0,
    offsetHeight: 0,
    listeners: {},
    innerHTML: '',
    classList: { adds: [], removes: [], add(c) { this.adds.push(c); }, remove(c) { this.removes.push(c); }, contains() { return false; } },
    setAttribute(k, v) { this.attrs[k] = v; },
    appendChild(child) { this.children.push(child); child.parentNode = this; return child; },
    removeChild(child) {
      const i = this.children.indexOf(child);
      if (i >= 0) this.children.splice(i, 1);
      child.parentNode = null;
    },
    addEventListener(type, fn) { this.listeners[type] = fn; },
    removeEventListener() {},
    getBoundingClientRect() { return { left: 0, top: 0, width: 800, height: 600 }; },
  };
  return el;
}

function loadLabScene(withBench) {
  const winListeners = {};
  const bench = withBench ? makeEl('lab-bench') : null;
  const document = {
    readyState: 'complete',
    createElement() { return makeEl('div'); },
    getElementById(id) { return (id === 'lab-bench' && bench) ? bench : null; },
    addEventListener() {},
  };
  const context = {
    document,
    window: {
      addEventListener(type, fn) { (winListeners[type] = winListeners[type] || []).push(fn); },
      PointerEvent: class {},
    },
    console: { log() {}, error() {} },
  };
  context.window.window = context.window;
  const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'lab-scene.js'), 'utf8');
  vm.runInNewContext(source, context, { filename: 'lab-scene.js' });
  return { api: context.window.LabScene, winListeners, bench, labScene: context.window.labScene };
}

function makeScene(opts) {
  const { api, winListeners } = loadLabScene();
  const bench = makeEl('lab-bench');
  bench.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 600 });
  const scene = new api.LabScene(bench, Object.assign({ seed: false }, opts));
  const fire = (type, ev) => { if (bench.listeners[type]) bench.listeners[type](ev); };
  const fireWin = (type, ev) => { (winListeners[type] || []).forEach((fn) => fn(ev)); };
  const press = (pid, x, y) => fire('pointerdown', { clientX: x, clientY: y, pointerId: pid, button: 0, preventDefault() {} });
  const move = (pid, x, y) => fireWin('pointermove', { clientX: x, clientY: y, pointerId: pid, button: 0 });
  return { scene, bench, fire, fireWin, press, move };
}

test('LabScene mounts on the bench and seeds sample glassware', () => {
  const { api } = loadLabScene(true);
  const scene = api.mount('lab-bench');
  assert.ok(scene, 'mount must create a scene when the bench exists');
  assert.equal(scene.getNodes().length, 4, 'mount must seed sample glassware by default');
});

test('auto-init wires window.labScene with seed items, the cabinet and the shelf', () => {
  const { labScene } = loadLabScene(true);
  assert.ok(labScene, 'module must auto-mount on the bench at load time');
  assert.equal(labScene.getNodes().length, 6, 'auto-mounted scene must seed items plus cabinet and shelf');
  const cabinet = labScene.getNodes().find((n) => n.type === 'cabinet');
  assert.ok(cabinet, 'cabinet must be spawned on the bench');
  assert.equal(cabinet.children.length, 7, 'cabinet must list seven tools');
  assert.equal(cabinet.element().style.zIndex, '100000', 'cabinet must render above bench items');
  const shelf = labScene.getNodes().find((n) => n.type === 'shelf');
  assert.ok(shelf, 'shelf must be spawned on the bench');
  assert.equal(shelf.children.length, 9, 'shelf must list nine reagents');
});

test('mount returns null when the bench is missing', () => {
  const { api } = loadLabScene(false);
  assert.equal(api.mount('lab-bench'), null, 'missing bench must not crash or mount');
});

test('spawnNode keeps model x/y as source of truth and projects via transform', () => {
  const { scene } = makeScene();
  const node = scene.spawnNode('beaker', { x: 100, y: 50, w: 80, h: 60, label: 'Cốc' });
  assert.equal(node.x, 100);
  assert.equal(node.y, 50);
  assert.equal(node.element().attrs['data-lab-id'], node.id);
  assert.equal(node.element().attrs['aria-label'], 'Cốc');
  assert.equal(node.element().style.transform, 'translate(100px,50px)');
  node.setPosition(120, 70);
  assert.equal(node.element().style.transform, 'translate(120px,70px)');
  assert.equal(scene.getNodes().length, 1);
});

test('hit-test returns a root-to-leaf trail and picks the topmost node first', () => {
  const { scene } = makeScene();
  const a = scene.spawnNode('a', { x: 0, y: 0, w: 100, h: 100 });
  const b = scene.spawnNode('b', { x: 50, y: 50, w: 100, h: 100 });
  const trail = scene.hitTest(60, 60);
  assert.ok(trail, 'point inside both nodes must hit');
  assert.ok(trail[0] === scene.root, 'trail must start at the root');
  assert.ok(trail[trail.length - 1] === b, 'later sibling on top must win');
  assert.ok(scene.hitTest(10, 10)[trail.length - 1] === a, 'point only inside a must hit a');
  assert.ok(scene.hitTest(300, 300) === null, 'point outside all nodes must miss');
});

test('hit-test prunes invisible subtrees and non-pickable self', () => {
  const { scene } = makeScene();
  const a = scene.spawnNode('a', { x: 0, y: 0, w: 100, h: 100 });
  scene.spawnNode('b', { x: 0, y: 0, w: 100, h: 100, pickable: false });
  a.setVisible(false);
  assert.ok(scene.hitTest(10, 10) === null, 'invisible node must not be hittable');
  a.setVisible(true);
  assert.ok(scene.hitTest(10, 10), 'visible node must be hittable again');
  assert.ok(scene.hitTest(10, 10)[1] === a, 'non-pickable b must not swallow a hit');
});

test('press records a grab offset so the node never jumps to the pointer', () => {
  const { scene, press, move } = makeScene();
  scene.spawnNode('beaker', { x: 100, y: 100, w: 80, h: 60 });
  press(7, 120, 130);
  move(7, 200, 150);
  const node = scene.getNodes()[0];
  assert.equal(node.x, 180, 'x must keep the 20px grab offset');
  assert.equal(node.y, 120, 'y must keep the 30px grab offset');
  assert.equal(node.element().style.transform, 'translate(180px,120px)');
});

test('inspectable nodes lift, tilt with drag motion, and restore on release', () => {
  const { scene, press, move, fireWin } = makeScene();
  const node = scene.spawnNode('beaker', { x: 100, y: 100, w: 80, h: 60, inspectable: true });
  press(7, 110, 110);
  assert.equal(node.scale, 1.08, 'pressing an inspectable node must lift it visually');
  assert.equal(node.element().style.transform, 'translate(100px,100px) scale(1.08)');
  move(7, 160, 110);
  assert.equal(node.rotation, 10, 'horizontal drag velocity must tilt the inspected node');
  assert.equal(node.element().style.transform, 'translate(150px,100px) scale(1.08) rotate(10deg)');
  fireWin('pointerup', { clientX: 160, clientY: 110, pointerId: 7, button: 0 });
  assert.equal(node.scale, 1, 'release must restore the original scale');
  assert.equal(node.rotation, 0, 'release must restore the original rotation');
  assert.equal(node.element().style.transform, 'translate(150px,100px)');
});

test('drag clamps in model space to the bench bounds', () => {
  const { scene, press, move } = makeScene();
  scene.spawnNode('beaker', { x: 100, y: 100, w: 80, h: 60 });
  press(7, 110, 110);
  move(7, 900, 900);
  const node = scene.getNodes()[0];
  assert.equal(node.x, 720, 'x must clamp to bench width minus node width');
  assert.equal(node.y, 540, 'y must clamp to bench height minus node height');
  move(7, -50, -50);
  assert.equal(node.x, 0, 'x must clamp to the bench origin');
  assert.equal(node.y, 0, 'y must clamp to the bench origin');
});

test('one pointer per drag; two pointers drag two nodes independently', () => {
  const { scene, press, move } = makeScene();
  const a = scene.spawnNode('a', { x: 100, y: 100, w: 80, h: 60 });
  const b = scene.spawnNode('b', { x: 300, y: 100, w: 60, h: 60 });
  press(1, 110, 110);
  press(1, 110, 110);
  press(2, 320, 120);
  move(1, 210, 210);
  move(2, 360, 160);
  assert.equal(a.x, 200, 'first pointer must move its node once');
  assert.equal(b.x, 340, 'second pointer must move its own node');
  assert.equal(b.y, 140, 'second pointer must move y with its grab offset');
});

test('zero-delta moves are skipped without callback or transform write', () => {
  const { scene, press, move } = makeScene();
  let dragCalls = 0;
  scene.spawnNode('a', { x: 100, y: 100, w: 80, h: 60, onDrag() { dragCalls += 1; } });
  press(7, 110, 110);
  move(7, 160, 160);
  const node = scene.getNodes()[0];
  const before = node.element().style.transform;
  assert.equal(dragCalls, 1);
  move(7, 160, 160);
  assert.equal(dragCalls, 1, 'identical position must not fire onDrag again');
  assert.equal(node.element().style.transform, before, 'transform must not be rewritten');
});

test('press lifts the node to the top of the z-order', () => {
  const { scene, press } = makeScene();
  const a = scene.spawnNode('a', { id: 'a', x: 0, y: 0, w: 100, h: 100 });
  scene.spawnNode('b', { id: 'b', x: 150, y: 0, w: 100, h: 100 });
  press(9, 50, 50);
  const order = scene.root.children.map((n) => n.id);
  assert.equal(order[order.length - 1], 'a', 'pressed node must move to the end (top)');
  assert.ok(a.element().classList.adds.includes('lab-dragging'), 'dragging class must be added');
  assert.ok(a.element().style.zIndex > scene.getNodes()[0].element().style.zIndex, 'z-index must lift the pressed node');
});

test('pointerup releases cleanly; pointercancel/blur interrupt with the flag', () => {
  const { scene, press, move, fireWin } = makeScene();
  const ends = [];
  scene.spawnNode('a', { x: 100, y: 100, w: 80, h: 60, onEnd(n, info) { ends.push(info); } });
  press(3, 110, 110);
  move(3, 150, 150);
  fireWin('pointerup', { clientX: 150, clientY: 150, pointerId: 3, button: 0 });
  assert.equal(ends.length, 1);
  assert.equal(ends[0].interrupted, false, 'release must not be flagged interrupted');
  press(4, 150, 150);
  fireWin('pointercancel', { pointerId: 4 });
  assert.equal(ends[1].interrupted, true, 'pointercancel must interrupt the drag');
  press(5, 150, 150);
  fireWin('blur', {});
  assert.equal(ends[2].interrupted, true, 'window blur must interrupt all drags');
  fireWin('pointerup', { clientX: 150, clientY: 150, pointerId: 3, button: 0 });
  assert.equal(ends.length, 3, 'a second pointerup without a drag must be a no-op');
});

test('hand-bridge stop path (mouseup on window) ends the drag', () => {
  const { scene, press, fireWin } = makeScene();
  let ended = null;
  scene.spawnNode('a', { x: 100, y: 100, w: 80, h: 60, onEnd(n, info) { ended = info; } });
  press(5, 110, 110);
  fireWin('mouseup', { clientX: 110, clientY: 110, pointerId: 5, button: 0 });
  assert.ok(ended, 'mouseup emitted by hand-bridge stop must end the drag');
  assert.equal(ended.interrupted, false);
});

test('globalToLocal / localToGlobal round-trip through nested parents and scale', () => {
  const { scene } = makeScene();
  const parent = scene.spawnNode('p', { x: 100, y: 100, w: 200, h: 200, scale: 2 });
  const child = scene.spawnNode('c', { x: 20, y: 30, w: 40, h: 40 });
  parent.addChild(child);
  assert.equal(scene.root.children.length, 1, 'child must detach from the root when reparented');
  const g = child.localToGlobal(10, 20);
  assert.equal(g.x, 100 + 2 * (20 + 10), 'localToGlobal must compose deepest-first through scale');
  assert.equal(g.y, 100 + 2 * (30 + 20), 'localToGlobal must compose deepest-first through scale');
  const l = child.globalToLocal(g.x, g.y);
  assert.equal(l.x, 10, 'globalToLocal must invert the chain back to the local frame');
  assert.equal(l.y, 20, 'globalToLocal must invert the chain back to the local frame');
});

test('clear removes every node and interrupts active drags', () => {
  const { scene, press } = makeScene();
  scene.spawnNode('a', { x: 0, y: 0, w: 100, h: 100 });
  const top = scene.spawnNode('b', { x: 0, y: 0, w: 100, h: 100 });
  let ended = null;
  top.onEnd = (n, info) => { ended = info; };
  press(7, 50, 50);
  scene.clear();
  assert.equal(scene.getNodes().length, 0);
  assert.ok(ended && ended.interrupted, 'clear must interrupt the active drag');
});

test('cabinet strip is a non-pickable container; its tool chips are pickable', () => {
  const { scene } = makeScene();
  const cabinet = scene.spawnCabinet();
  assert.equal(cabinet.pickable, false, 'strip body must never swallow bench hits');
  assert.equal(cabinet.children.length, 7, 'cabinet must list seven tools');
  assert.ok(cabinet.children.every((t) => t.pickable && !t.draggable), 'chips are pickable spawners, not draggable');
  const tool = cabinet.children[0];
  const trail = scene.hitTest(30, 30);
  assert.ok(trail && trail[trail.length - 1] === tool, 'press on a chip must hit the tool');
  assert.ok(trail[0] === scene.root, 'trail must start at the root');
  assert.ok(trail[1] === cabinet, 'trail must pass through the cabinet');
  assert.ok(scene.hitTest(30, 500) === null, 'empty strip area below the tools must not be hittable');
  assert.ok(scene.hitTest(500, 300) === null, 'bench area outside the cabinet must not hit it');
});

test('press on a cabinet tool spawns a copy under the pointer and takes over the drag', () => {
  const { scene, fire, fireWin } = makeScene();
  const cabinet = scene.spawnCabinet();
  const tool = cabinet.children.find((n) => n.id === 'tool-beaker');
  const before = { x: tool.x, y: tool.y };
  let ended = null;
  fire('pointerdown', { clientX: 30, clientY: 30, pointerId: 21, button: 0, preventDefault() {} });
  const copy = scene.getNodes().find((n) => n.type === 'beaker');
  assert.ok(copy, 'a beaker copy must be spawned');
  assert.equal(copy.draggable, true, 'spawned copies must be draggable');
  assert.equal(copy.x, 0, 'copy must clamp into the bench');
  assert.equal(copy.y, 0, 'copy must clamp into the bench');
  copy.onEnd = (n, info) => { ended = info; };
  fireWin('pointermove', { clientX: 130, clientY: 140, pointerId: 21, button: 0 });
  assert.equal(copy.x, 100, 'takeover drag must move the copy with the pointer');
  assert.equal(copy.y, 110, 'takeover drag must move the copy with the pointer');
  assert.equal(tool.x, before.x, 'the tool chip itself must not move');
  assert.equal(tool.y, before.y, 'the tool chip itself must not move');
  fireWin('pointerup', { clientX: 130, clientY: 140, pointerId: 21, button: 0 });
  assert.ok(ended && ended.interrupted === false, 'releasing must end the copy drag cleanly');
});

test('cabinet can spawn multiple independent copies', () => {
  const { scene, fire, fireWin } = makeScene();
  scene.spawnCabinet();
  fire('pointerdown', { clientX: 30, clientY: 30, pointerId: 1, button: 0, preventDefault() {} });
  const first = scene.getNodes().find((n) => n.type === 'beaker');
  fireWin('pointermove', { clientX: 300, clientY: 200, pointerId: 1, button: 0 });
  assert.equal(first.x, 270, 'first copy must follow its pointer');
  fireWin('pointerup', { clientX: 300, clientY: 200, pointerId: 1, button: 0 });
  fire('pointerdown', { clientX: 30, clientY: 30, pointerId: 2, button: 0, preventDefault() {} });
  const copies = scene.getNodes().filter((n) => n.type === 'beaker');
  assert.equal(copies.length, 2, 'each press must spawn its own copy');
  assert.ok(copies[0] !== copies[1], 'copies must be independent nodes');
});

test('onStart without a takeover keeps normal drag semantics', () => {
  const { scene, press, move } = makeScene();
  let startCount = 0;
  const node = scene.spawnNode('plain', { x: 100, y: 100, w: 80, h: 60, onStart() { startCount += 1; } });
  press(7, 110, 110);
  move(7, 200, 150);
  assert.equal(startCount, 1, 'onStart must fire once per press');
  assert.equal(node.x, 190, 'node must drag normally when onStart returns no takeover');
  assert.equal(node.y, 140, 'node must drag normally when onStart returns no takeover');
});

test('shelf sits at the right edge; strip is non-pickable, chips pickable with tooltips', () => {
  const { scene } = makeScene();
  const shelf = scene.spawnShelf();
  assert.equal(shelf.pickable, false, 'strip body must never swallow bench hits');
  assert.equal(shelf.x, 800 - 72, 'shelf must sit at the right edge of the bench');
  assert.equal(shelf.children.length, 9, 'shelf must list nine reagents');
  assert.ok(shelf.children.every((t) => t.pickable && !t.draggable), 'chips are pickable spawners, not draggable');
  const chip = shelf.children[0];
  assert.equal(chip.element().attrs.title, 'Nước — H2O', 'chip must carry a name — formula tooltip');
  const trail = scene.hitTest(750, 30);
  assert.ok(trail && trail[trail.length - 1] === chip, 'press on a reagent chip must hit it');
  assert.ok(trail[1] === shelf, 'trail must pass through the shelf');
  assert.ok(scene.hitTest(750, 590) === null, 'empty shelf area must not be hittable');
  assert.ok(scene.hitTest(400, 300) === null, 'bench area outside the shelf must not hit it');
});

test('press on a reagent chip spawns a bottle with the solution color and drags it', () => {
  const { scene, fire, fireWin } = makeScene();
  const shelf = scene.spawnShelf();
  const chip = shelf.children.find((n) => n.id === 'reagent-CuSO4');
  const before = { x: chip.x, y: chip.y };
  let ended = null;
  fire('pointerdown', { clientX: 750, clientY: 210, pointerId: 41, button: 0, preventDefault() {} });
  const bottle = scene.getNodes().find((n) => n.type === 'reagent');
  assert.ok(bottle, 'a reagent bottle must be spawned');
  assert.equal(bottle.formula, 'CuSO4', 'bottle must carry its formula for the chemistry engine');
  assert.equal(bottle.x, 718, 'bottle must spawn centered on the press point');
  assert.equal(bottle.y, 162, 'bottle must spawn centered on the press point');
  assert.match(bottle.element().style.background, /linear-gradient/, 'bottle must show the liquid as a gradient fill');
  assert.ok(bottle.element().style.background.includes('47,111,176'), 'CuSO4 liquid must be blue');
  assert.equal(bottle.element().attrs.title, 'Đồng(II) sunfat — CuSO4', 'bottle must carry the name — formula tooltip');
  assert.equal(chip.x, before.x, 'the chip itself must not move');
  assert.equal(chip.y, before.y, 'the chip itself must not move');
  bottle.onEnd = (n, info) => { ended = info; };
  fireWin('pointermove', { clientX: 600, clientY: 300, pointerId: 41, button: 0 });
  assert.equal(bottle.x, 568, 'takeover drag must move the bottle with the pointer');
  assert.equal(bottle.y, 252, 'takeover drag must move the bottle with the pointer');
  fireWin('pointerup', { clientX: 600, clientY: 300, pointerId: 41, button: 0 });
  assert.ok(ended && ended.interrupted === false, 'releasing must end the bottle drag cleanly');
});

test('reagent bottles spawn clamped inside the bench', () => {
  const { scene, fire } = makeScene();
  scene.spawnShelf();
  fire('pointerdown', { clientX: 750, clientY: 30, pointerId: 42, button: 0, preventDefault() {} });
  const bottle = scene.getNodes().find((n) => n.type === 'reagent');
  assert.ok(bottle, 'a reagent bottle must be spawned');
  assert.equal(bottle.x, 718, 'bottle x must stay inside the bench');
  assert.equal(bottle.y, 0, 'bottle must clamp into the bench vertically');
});

test('shelf can spawn multiple independent bottles', () => {
  const { scene, fire, fireWin } = makeScene();
  scene.spawnShelf();
  fire('pointerdown', { clientX: 750, clientY: 210, pointerId: 51, button: 0, preventDefault() {} });
  fireWin('pointermove', { clientX: 500, clientY: 300, pointerId: 51, button: 0 });
  fireWin('pointerup', { clientX: 500, clientY: 300, pointerId: 51, button: 0 });
  fire('pointerdown', { clientX: 750, clientY: 210, pointerId: 52, button: 0, preventDefault() {} });
  const bottles = scene.getNodes().filter((n) => n.type === 'reagent');
  assert.equal(bottles.length, 2, 'each press must spawn its own bottle');
  assert.ok(bottles[0] !== bottles[1], 'bottles must be independent nodes');
});

test('cabinet and shelf coexist without interfering', () => {
  const { scene } = makeScene();
  scene.spawnCabinet();
  scene.spawnShelf();
  const lt = scene.hitTest(30, 30);
  const rt = scene.hitTest(750, 30);
  assert.equal(lt[1].type, 'cabinet', 'left press must hit the cabinet');
  assert.equal(rt[1].type, 'shelf', 'right press must hit the shelf');
  assert.ok(scene.hitTest(400, 300) === null, 'bench center must not hit either strip');
});

test('seed sample registers the seed positions as snap slots', () => {
  const { scene } = makeScene({ seed: true });
  assert.equal(scene.getNodes().length, 4, 'seed sample must spawn four items');
  assert.ok(Array.isArray(scene._snapSlots), 'snap slots must be registered');
  assert.equal(scene._snapSlots.length, 4, 'one slot per seed item');
  assert.equal(scene._snapSlots[0].x, 80, 'first slot at the beaker position');
  assert.equal(scene._snapSlots[2].x, 336, 'third slot at the tube position');
  assert.equal(scene._snapSlots[0].y, 60, 'slots share the seed row');
});

test('dragging near a snap slot magnetizes to it; pulling away releases', () => {
  const { scene, press, move } = makeScene({ seed: true });
  const beaker = scene.getNodes().find((n) => n.type === 'beaker');
  press(7, 100, 80);
  move(7, 300, 100);
  assert.equal(beaker.x, 336, 'beaker must snap to the tube slot top-left');
  assert.equal(beaker.y, 60, 'beaker must snap to the tube slot top-left');
  move(7, 500, 300);
  assert.equal(beaker.x, 480, 'beyond the threshold the item must detach');
  assert.equal(beaker.y, 280, 'beyond the threshold the item must detach');
});

test('snap is center-based so any item size snaps to the slot top-left', () => {
  const { scene, press, move } = makeScene({ seed: true });
  const beaker = scene.getNodes().find((n) => n.type === 'beaker');
  press(8, 100, 80);
  move(8, 226, 78);
  assert.equal(beaker.x, 208, 'beaker center near the flask slot must snap there');
  assert.equal(beaker.y, 60, 'beaker center near the flask slot must snap there');
});

test('resetBench restores seeds and removes spawned copies, keeping the strips', () => {
  const { scene, fire, fireWin } = makeScene({ seed: true });
  scene.spawnCabinet();
  scene.spawnShelf();
  const beaker = scene.getNodes().find((n) => n.type === 'beaker');
  fire('pointerdown', { clientX: 100, clientY: 80, pointerId: 1, button: 0, preventDefault() {} });
  fireWin('pointermove', { clientX: 300, clientY: 200, pointerId: 1, button: 0 });
  fireWin('pointerup', { clientX: 300, clientY: 200, pointerId: 1, button: 0 });
  assert.equal(beaker.x, 280, 'seed must be draggable before reset');
  fire('pointerdown', { clientX: 750, clientY: 210, pointerId: 2, button: 0, preventDefault() {} });
  fireWin('pointermove', { clientX: 500, clientY: 300, pointerId: 2, button: 0 });
  fireWin('pointerup', { clientX: 500, clientY: 300, pointerId: 2, button: 0 });
  assert.equal(scene.getNodes().filter((n) => n.type === 'reagent').length, 1, 'a bottle must exist before reset');
  scene.resetBench();
  assert.equal(beaker.x, 80, 'seed must return home');
  assert.equal(beaker.y, 60, 'seed must return home');
  assert.equal(scene.getNodes().find((n) => n.type === 'reagent'), undefined, 'copies must be removed');
  assert.ok(scene.getNodes().find((n) => n.type === 'cabinet'), 'cabinet must stay');
  assert.ok(scene.getNodes().find((n) => n.type === 'shelf'), 'shelf must stay');
});

test('resize re-fits the strips to the new bench rect (responsive)', () => {
  const { scene, bench, fireWin } = makeScene();
  scene.spawnCabinet();
  scene.spawnShelf();
  assert.equal(scene._shelf.x, 800 - 72, 'shelf starts at the right edge');
  bench.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1200, height: 500 });
  fireWin('resize', {});
  assert.equal(scene._shelf.x, 1200 - 72, 'shelf must track the right edge after resize');
  assert.equal(scene._shelf._h, 500, 'shelf must refit to the new height');
  assert.equal(scene._cabinet._h, 500, 'cabinet must refit to the new height');
});
