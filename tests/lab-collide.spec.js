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
    getAttribute(k) { return this.attrs[k] != null ? this.attrs[k] : null; },
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

function loadLab(withBench) {
  const winListeners = {};
  const bench = withBench ? makeEl('lab-bench') : null;
  const elements = {};
  const logs = [];
  const document = {
    readyState: 'complete',
    createElement() { return makeEl('div'); },
    head: { appendChild(child) { elements[child.id] = child; child.parentNode = this; return child; } },
    body: { appendChild(child) { elements[child.id] = child; child.parentNode = this; return child; } },
    getElementById(id) { return (id === 'lab-bench' && bench) ? bench : (elements[id] || null); },
    addEventListener() {},
  };
  const context = {
    document,
    window: {
      addEventListener(type, fn) { (winListeners[type] = winListeners[type] || []).push(fn); },
      PointerEvent: class {},
    },
    console: { log(message) { logs.push(String(message)); }, error() {} },
  };
  context.window.window = context.window;
  const dir = path.join(__dirname, '..', 'js');
  vm.runInNewContext(fs.readFileSync(path.join(dir, 'lab-scene.js'), 'utf8'), context, { filename: 'lab-scene.js' });
  vm.runInNewContext(fs.readFileSync(path.join(dir, 'lab-chem.js'), 'utf8'), context, { filename: 'lab-chem.js' });
  context.window.labChem = context.window.LabChem;
  vm.runInNewContext(fs.readFileSync(path.join(dir, 'lab-collide.js'), 'utf8'), context, { filename: 'lab-collide.js' });
  return {
    api: context.window.LabScene,
    collide: context.window.LabCollide,
    window: context.window,
    winListeners,
    bench,
    labScene: context.window.labScene,
    labCollide: context.window.labCollide,
    document,
    logs,
  };
}

function makeScene(trackerOpts) {
  const { api, collide, window, winListeners, document, logs } = loadLab(false);
  const bench = makeEl('lab-bench');
  bench.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 600 });
  const scene = new api.LabScene(bench, { seed: false });
  window.labScene = scene;
  const tracker = new collide.CollideTracker(scene, trackerOpts || { tolerance: 20 });
  const fire = (type, ev) => { if (bench.listeners[type]) bench.listeners[type](ev); };
  const fireWin = (type, ev) => { (winListeners[type] || []).forEach((fn) => fn(ev)); };
  const press = (pid, x, y) => fire('pointerdown', { clientX: x, clientY: y, pointerId: pid, button: 0, preventDefault() {} });
  const move = (pid, x, y) => fireWin('pointermove', { clientX: x, clientY: y, pointerId: pid, button: 0 });
  const up = (pid, x, y) => fireWin('pointerup', { clientX: x, clientY: y, pointerId: pid, button: 0 });
  return { scene, tracker, bench, fire, fireWin, press, move, up, document, logs };
}

test('aabbOverlap detects touching boxes and honors the tolerance', () => {
  const { collide } = loadLab(false);
  const a = { x: 0, y: 0, w: 100, h: 100 };
  assert.equal(collide.aabbOverlap(a, { x: 50, y: 50, w: 100, h: 100 }), true, 'overlapping boxes must collide');
  assert.equal(collide.aabbOverlap(a, { x: 150, y: 0, w: 100, h: 100 }), false, 'separated boxes must not collide');
  assert.equal(collide.aabbOverlap(a, { x: 150, y: 0, w: 100, h: 100 }, 60), true, 'tolerance must extend the boxes');
  assert.equal(collide.aabbOverlap(a, { x: 300, y: 0, w: 100, h: 100 }, 60), false, 'beyond tolerance must stay apart');
});

test('the hovered node is highlighted while a drag overlaps it and cleared on move-away', () => {
  const { scene, press, move } = makeScene();
  const beaker = scene.spawnNode('beaker', { x: 80, y: 60, w: 96, h: 88 });
  const tube = scene.spawnNode('tube', { x: 336, y: 60, w: 46, h: 120 });
  press(7, 100, 80);
  move(7, 350, 120);
  assert.equal(tube.element().style.boxShadow, '0 0 0 3px rgba(255,196,60,0.95)', 'overlapped node must be highlighted');
  assert.ok(tube.element().classList.adds.includes('lab-collide-target'), 'highlight class must be added');
  assert.equal(beaker.element().style.boxShadow || '', '', 'the dragged node itself must not be highlighted');
  move(7, 500, 300);
  assert.equal(tube.element().style.boxShadow, '', 'moving away must clear the highlight');
});

test('cabinet and shelf strips are never hover targets', () => {
  const { scene, press, move } = makeScene();
  scene.spawnCabinet();
  scene.spawnShelf();
  scene.spawnNode('beaker', { x: 300, y: 100, w: 96, h: 88 });
  press(7, 320, 120);
  move(7, 40, 140);
  const dragged = scene.getNodes().find((n) => n.type === 'beaker');
  assert.equal(dragged.x, 20, 'drag must move over the cabinet area');
  assert.equal(dragged.element().style.boxShadow || '', '', 'strips must not receive the highlight');
  assert.equal(scene.getNodes().find((n) => n.type === 'cabinet').element().style.boxShadow || '', '', 'cabinet must not be highlighted');
  assert.equal(scene.getNodes().find((n) => n.type === 'shelf').element().style.boxShadow || '', '', 'shelf must not be highlighted');
});

test('the matches filter restricts which nodes can be hover targets', () => {
  const { scene, press, move } = makeScene({ matches: (d, n) => n.type === 'flask' });
  const beaker = scene.spawnNode('beaker', { x: 80, y: 60, w: 96, h: 88 });
  const tube = scene.spawnNode('tube', { x: 336, y: 60, w: 46, h: 120 });
  const flask = scene.spawnNode('flask', { x: 208, y: 60, w: 92, h: 84 });
  press(7, 100, 80);
  move(7, 350, 120);
  assert.equal(tube.element().style.boxShadow || '', '', 'tube must not match the filter');
  move(7, 230, 100);
  assert.equal(flask.element().style.boxShadow, '0 0 0 3px rgba(255,196,60,0.95)', 'flask must match the filter');
  assert.equal(beaker.element().style.boxShadow || '', '', 'dragged node must stay unhighlighted');
});

test('dropping or interrupting the drag clears the highlight', () => {
  const { scene, press, move, up, fireWin } = makeScene();
  scene.spawnNode('beaker', { x: 80, y: 60, w: 96, h: 88 });
  const tube = scene.spawnNode('tube', { x: 336, y: 60, w: 46, h: 120 });
  press(7, 100, 80);
  move(7, 350, 120);
  assert.ok(tube.element().style.boxShadow, 'highlight must be on while overlapping');
  up(7, 350, 120);
  assert.equal(tube.element().style.boxShadow, '', 'release must clear the highlight');
  press(8, 350, 120);
  fireWin('pointercancel', { pointerId: 8 });
  assert.equal(tube.element().style.boxShadow, '', 'interrupt must clear the highlight');
});

test('auto-init wires window.labCollide on the mounted scene', () => {
  const { labScene, labCollide } = loadLab(true);
  assert.ok(labScene, 'scene must auto-mount');
  assert.ok(labCollide, 'collide tracker must auto-wire');
  assert.equal(labCollide.scene, labScene, 'tracker must observe the mounted scene');
});

test('injected interaction styles honor reduced-motion preference', () => {
  const { document } = loadLab(true);
  assert.match(document.getElementById('lab-tool-style').textContent, /prefers-reduced-motion: reduce/, 'tool feedback styles must include reduced-motion override');
  assert.match(document.getElementById('lab-flame-style').textContent, /prefers-reduced-motion: reduce/, 'flame styles must include reduced-motion override');
  assert.match(document.getElementById('lab-reaction-style').textContent, /prefers-reduced-motion: reduce/, 'reaction styles must include reduced-motion override');
});

test('spawnNode initializes a liquid state on every node', () => {
  const { scene } = makeScene();
  const tube = scene.spawnNode('tube', { x: 0, y: 0, w: 46, h: 120 });
  assert.ok(tube.state, 'state must exist');
  assert.equal(tube.state.fill, 0, 'fresh glassware is empty');
  assert.equal(tube.state.color, null, 'no liquid color yet');
  assert.equal(tube.state.substance, null, 'no substance yet');
});

test('releasing a tube over a flask pours the liquid by amount', () => {
  const { scene, press, move, up } = makeScene();
  const flask = scene.spawnNode('flask', { x: 208, y: 60, w: 92, h: 84, style: { background: 'rgba(63,86,188,0.14)' } });
  const tube = scene.spawnNode('tube', { x: 336, y: 60, w: 46, h: 120, style: { background: 'rgba(218,94,20,0.14)' } });
  tube.state = { fill: 0.5, color: 'rgba(47,111,176,0.65)', substance: 'CuSO4' };
  press(7, 350, 80);
  move(7, 280, 100);
  up(7, 280, 100);
  assert.equal(flask.state.fill, 0.5, 'flask must receive the tube amount');
  assert.equal(tube.state.fill, 0, 'tube must empty');
  assert.equal(tube.state.substance, null, 'emptied source loses its substance');
  assert.equal(flask.state.color, 'rgba(47,111,176,0.65)', 'flask adopts the source color');
  assert.equal(flask.state.substance, 'CuSO4', 'flask adopts the source substance');
  assert.match(flask.element().style.background, /linear-gradient/, 'fill must render as a gradient');
  assert.ok(flask.element().style.background.includes('47,111,176'), 'gradient must use the liquid color');
  assert.equal(tube.element().style.background, 'rgba(218,94,20,0.14)', 'empty tube restores its glass style');
});

test('pour respects the target capacity and mixes different substances', () => {
  const { scene, press, move, up } = makeScene();
  const flask = scene.spawnNode('flask', { x: 208, y: 60, w: 92, h: 84, style: { background: 'rgba(63,86,188,0.14)' } });
  const tube = scene.spawnNode('tube', { x: 336, y: 60, w: 46, h: 120, style: { background: 'rgba(218,94,20,0.14)' } });
  flask.state = { fill: 0.8, color: 'rgba(176,122,47,0.6)', substance: 'FeCl3' };
  tube.state = { fill: 0.5, color: 'rgba(47,111,176,0.65)', substance: 'CuSO4' };
  press(7, 350, 80);
  move(7, 280, 100);
  up(7, 280, 100);
  assert.equal(flask.state.fill, 1, 'target must fill up to its capacity');
  assert.ok(Math.abs(tube.state.fill - 0.3) < 1e-9, 'source keeps the remainder');
  assert.equal(flask.state.substance, 'mix', 'different substances must be marked mixed');
  assert.equal(flask.state.color, 'rgba(112,117,112,0.625)', 'mixed colors must average');
});

test('a reagent bottle pours into a beaker until it empties', () => {
  const { scene, press, move, up } = makeScene();
  const beaker = scene.spawnNode('beaker', { x: 80, y: 60, w: 96, h: 88 });
  const bottle = scene.spawnNode('reagent', { x: 400, y: 60, w: 64, h: 96 });
  bottle.state = { fill: 1, color: 'rgba(122,47,158,0.6)', substance: 'KMnO4' };
  press(7, 420, 90);
  move(7, 140, 120);
  up(7, 140, 120);
  assert.equal(beaker.state.fill, 1, 'beaker must fill from the bottle');
  assert.equal(beaker.state.substance, 'KMnO4', 'beaker adopts the bottle substance');
  assert.equal(bottle.state.fill, 0, 'bottle must empty');
});

test('nothing pours into a reagent bottle and empty sources do nothing', () => {
  const { scene, press, move, up } = makeScene();
  const bottle = scene.spawnNode('reagent', { x: 400, y: 60, w: 64, h: 96 });
  bottle.state = { fill: 1, color: 'rgba(122,47,158,0.6)', substance: 'KMnO4' };
  const tube = scene.spawnNode('tube', { x: 336, y: 60, w: 46, h: 120 });
  tube.state = { fill: 0.5, color: 'rgba(47,111,176,0.65)', substance: 'CuSO4' };
  press(7, 350, 80);
  move(7, 430, 110);
  up(7, 430, 110);
  assert.equal(bottle.state.fill, 1, 'bottles must not receive liquid');
  assert.equal(tube.state.fill, 0.5, 'source must keep its liquid');
  const flask = scene.spawnNode('flask', { x: 80, y: 300, w: 92, h: 84 });
  tube.state.fill = 0;
  press(8, 350, 80);
  move(8, 120, 330);
  up(8, 120, 330);
  assert.equal(flask.state.fill, 0, 'an empty source must not pour');
});

test('an interrupted drag never pours', () => {
  const { scene, press, move, fireWin } = makeScene();
  const flask = scene.spawnNode('flask', { x: 208, y: 60, w: 92, h: 84 });
  const tube = scene.spawnNode('tube', { x: 336, y: 60, w: 46, h: 120 });
  tube.state = { fill: 0.5, color: 'rgba(47,111,176,0.65)', substance: 'CuSO4' };
  press(7, 350, 80);
  move(7, 280, 100);
  fireWin('pointercancel', { pointerId: 7 });
  assert.equal(flask.state.fill, 0, 'interrupt must abort the pour');
  assert.equal(tube.state.fill, 0.5, 'interrupt must keep the source liquid');
});

test('seedSample mounts a burner seed with a liquid state', () => {
  const { scene } = makeScene();
  scene.seedSample();
  const burner = scene.getNodes().find((n) => n.type === 'burner');
  assert.ok(burner, 'a burner seed must exist');
  assert.equal(burner.x, 464, 'burner sits in the fourth seed slot');
  assert.ok(burner.state, 'burner must carry a state');
});

test('dragging a vessel onto the burner heats it and shows a flame', () => {
  const { scene, press, move } = makeScene();
  const burner = scene.spawnNode('burner', { x: 464, y: 60, w: 100, h: 40 });
  const tube = scene.spawnNode('tube', { x: 336, y: 60, w: 46, h: 120 });
  press(7, 350, 80);
  move(7, 500, 90);
  assert.equal(burner.state.heatingVessel, tube, 'burner must track the heated vessel');
  assert.equal(tube.state.heating, true, 'vessel must be marked heating');
  assert.equal(tube.state.heatingBurner, burner, 'vessel must remember its burner');
  assert.ok(burner._flame, 'flame element must be created');
  assert.ok(burner.element().children.includes(burner._flame), 'flame must live inside the burner');
  assert.match(burner.element().getAttribute('aria-label') || '', /đang đun/, 'burner must announce heating');
});

test('dragging the vessel away from the burner turns the flame off', () => {
  const { scene, press, move } = makeScene();
  const burner = scene.spawnNode('burner', { x: 464, y: 60, w: 100, h: 40 });
  const tube = scene.spawnNode('tube', { x: 336, y: 60, w: 46, h: 120 });
  press(7, 350, 80);
  move(7, 500, 90);
  assert.equal(tube.state.heating, true, 'heating must be on while over the burner');
  move(7, 700, 300);
  assert.equal(tube.state.heating, false, 'moving away must stop heating');
  assert.equal(burner.state.heatingVessel, null, 'burner must forget the vessel');
  assert.equal(burner._flame, null, 'flame must be removed');
});

test('releasing on the burner keeps heating; releasing elsewhere turns it off', () => {
  const { scene, press, move, up } = makeScene();
  const burner = scene.spawnNode('burner', { x: 464, y: 60, w: 100, h: 40 });
  const tube = scene.spawnNode('tube', { x: 336, y: 60, w: 46, h: 120 });
  press(7, 350, 80);
  move(7, 500, 90);
  up(7, 500, 90);
  assert.equal(tube.state.heating, true, 'release on the burner must keep heating');
  press(8, 500, 90);
  assert.equal(tube.state.heating, false, 'lifting the vessel must stop heating');
  move(8, 700, 300);
  up(8, 700, 300);
  assert.equal(burner.state.heatingVessel, null, 'release elsewhere must stay off');
});

test('an interrupted drag over the burner leaves the vessel heating', () => {
  const { scene, press, move, fireWin } = makeScene();
  const burner = scene.spawnNode('burner', { x: 464, y: 60, w: 100, h: 40 });
  const tube = scene.spawnNode('tube', { x: 336, y: 60, w: 46, h: 120 });
  press(7, 350, 80);
  move(7, 500, 90);
  fireWin('pointercancel', { pointerId: 7 });
  assert.equal(tube.state.heating, true, 'vessel stays on the burner after an interrupt');
  assert.ok(burner._flame, 'flame must stay on');
});

test('the burner never receives pours and empty vessels can still heat', () => {
  const { scene, press, move, up } = makeScene();
  const burner = scene.spawnNode('burner', { x: 464, y: 60, w: 100, h: 40 });
  const tube = scene.spawnNode('tube', { x: 336, y: 60, w: 46, h: 120 });
  tube.state = { fill: 0.5, color: 'rgba(47,111,176,0.65)', substance: 'CuSO4' };
  press(7, 350, 80);
  move(7, 500, 90);
  up(7, 500, 90);
  assert.equal(burner.state.fill, 0, 'burner must never receive liquid');
  assert.equal(tube.state.fill, 0.5, 'source must keep its liquid on a burner');
  assert.equal(tube.state.heating, true, 'release on the burner must heat regardless of content');
});

test('a stir rod over a vessel couples as stirring and uncouples on move-away', () => {
  const { scene, press, move } = makeScene();
  const beaker = scene.spawnNode('beaker', { x: 80, y: 60, w: 96, h: 88 });
  const stir = scene.spawnNode('stir', { x: 500, y: 60, w: 44, h: 120 });
  press(7, 520, 100);
  move(7, 200, 130);
  assert.equal(beaker.state.stirTool, stir, 'vessel must track its stir rod');
  assert.equal(stir.state.coupledVessel, beaker, 'tool must track its vessel');
  assert.ok(beaker.element().classList.adds.includes('lab-stirring'), 'stirring class must be added');
  move(7, 700, 300);
  assert.equal(beaker.state.stirTool, null, 'moving away must uncouple');
  assert.equal(stir.state.coupledVessel, null, 'tool must forget its vessel');
  assert.ok(beaker.element().classList.removes.includes('lab-stirring'), 'stirring class must be removed');
});

test('releasing the stir rod on the vessel keeps stirring; releasing elsewhere drops it', () => {
  const { scene, press, move, up } = makeScene();
  const beaker = scene.spawnNode('beaker', { x: 80, y: 60, w: 96, h: 88 });
  const stir = scene.spawnNode('stir', { x: 500, y: 60, w: 44, h: 120 });
  press(7, 520, 100);
  move(7, 200, 130);
  up(7, 200, 130);
  assert.equal(beaker.state.stirTool, stir, 'release on the vessel must keep the coupling');
  press(8, 200, 130);
  assert.equal(beaker.state.stirTool, null, 'lifting the rod must uncouple');
  move(8, 700, 300);
  up(8, 700, 300);
  assert.equal(stir.state.coupledVessel, null, 'release elsewhere must stay uncoupled');
});

test('funnel and lid couple as filtering and sealed; an interrupt keeps the coupling', () => {
  const { scene, press, move, up, fireWin } = makeScene();
  const flask = scene.spawnNode('flask', { x: 208, y: 60, w: 92, h: 84 });
  const funnel = scene.spawnNode('funnel', { x: 600, y: 60, w: 74, h: 64 });
  press(7, 620, 90);
  move(7, 300, 100);
  fireWin('pointercancel', { pointerId: 7 });
  assert.equal(flask.state.filterTool, funnel, 'interrupt must keep the funnel coupled');
  assert.ok(flask.element().classList.adds.includes('lab-filtering'), 'filtering class must be added');
  const lid = scene.spawnNode('lid', { x: 650, y: 60, w: 60, h: 20 });
  press(8, 680, 70);
  move(8, 260, 90);
  up(8, 260, 90);
  assert.equal(flask.state.lidTool, lid, 'lid must couple onto the flask');
  assert.ok(flask.element().classList.adds.includes('lab-sealed'), 'sealed class must be added');
  assert.equal(flask.state.stirTool, null, 'other tool kinds must stay free');
});

test('lifting a vessel releases every coupled tool on it', () => {
  const { scene, press, move, up } = makeScene();
  const beaker = scene.spawnNode('beaker', { x: 80, y: 60, w: 96, h: 88 });
  const stir = scene.spawnNode('stir', { x: 500, y: 60, w: 44, h: 120 });
  press(7, 520, 100);
  move(7, 200, 130);
  up(7, 200, 130);
  assert.equal(beaker.state.stirTool, stir, 'coupling must be on');
  press(8, 120, 100);
  assert.equal(beaker.state.stirTool, null, 'picking up the vessel must drop the tool');
  assert.equal(stir.state.coupledVessel, null, 'tool must be released');
});

test('tools are never pour or heat sources and bottles never accept tools', () => {
  const { scene, press, move, up } = makeScene();
  const burner = scene.spawnNode('burner', { x: 464, y: 60, w: 100, h: 40 });
  const flask = scene.spawnNode('flask', { x: 208, y: 60, w: 92, h: 84 });
  const stir = scene.spawnNode('stir', { x: 500, y: 60, w: 44, h: 120 });
  stir.state = { fill: 0.5, color: 'rgba(47,111,176,0.65)', substance: 'CuSO4' };
  press(7, 520, 100);
  move(7, 300, 100);
  up(7, 300, 100);
  assert.equal(flask.state.fill, 0, 'a tool must never pour into a vessel');
  assert.equal(stir.state.fill, 0.5, 'tool liquid must stay put');
  move(7, 500, 90);
  up(7, 500, 90);
  assert.equal(burner.state.heatingVessel, null, 'a tool must never heat on the burner');
  const bottle = scene.spawnNode('reagent', { x: 400, y: 300, w: 64, h: 96 });
  const lid = scene.spawnNode('lid', { x: 650, y: 60, w: 60, h: 20 });
  press(8, 680, 70);
  move(8, 430, 340);
  up(8, 430, 340);
  assert.equal(bottle.state.lidTool, null, 'bottles must never accept tools');
});

test('lab-wrong class is added when a tool is dragged over a non-target vessel and removed on move-away', () => {
  const { scene, press, move } = makeScene();
  const bottle = scene.spawnNode('reagent', { x: 400, y: 300, w: 64, h: 96 });
  const stir = scene.spawnNode('stir', { x: 500, y: 60, w: 44, h: 120 });
  press(7, 520, 100);
  move(7, 430, 340);
  assert.ok(bottle.element().classList.adds.includes('lab-wrong'), 'lab-wrong class must be added on wrong target');
  move(7, 700, 300);
  assert.ok(bottle.element().classList.removes.includes('lab-wrong'), 'lab-wrong class must be cleared on move-away');
});

test('lab-wrong class is added when a filled vessel is dragged over a non-pour-target and removed on move-away', () => {
  const { scene, press, move } = makeScene();
  const burner = scene.spawnNode('burner', { x: 464, y: 60, w: 100, h: 40 });
  const tube = scene.spawnNode('tube', { x: 336, y: 60, w: 46, h: 120 });
  tube.state = { fill: 0.5, color: 'rgba(47,111,176,0.65)', substance: 'CuSO4' };
  press(7, 350, 80);
  move(7, 500, 90);
  assert.ok(burner.element().classList.adds.includes('lab-wrong'), 'lab-wrong class must be added when pouring onto burner');
  move(7, 700, 300);
  assert.ok(burner.element().classList.removes.includes('lab-wrong'), 'lab-wrong class must be cleared on move-away from burner');
});

test('reactive pours animate the target and record the observation', () => {
  const { scene, press, move, up, document, logs } = makeScene();
  const flask = scene.spawnNode('flask', { x: 208, y: 60, w: 92, h: 84, style: { background: 'rgba(63,86,188,0.14)' } });
  const tube = scene.spawnNode('tube', { x: 336, y: 60, w: 46, h: 120, style: { background: 'rgba(218,94,20,0.14)' } });
  flask.state = { fill: 0.45, color: 'rgba(47,111,176,0.65)', substance: 'CuSO4' };
  tube.state = { fill: 0.35, color: 'rgba(215,225,238,0.5)', substance: 'NaOH' };
  press(7, 350, 80);
  move(7, 280, 100);
  up(7, 280, 100);
  assert.equal(flask.state.substance, 'Cu(OH)2', 'target must track the first reaction product');
  assert.equal(flask.state.color, 'rgba(0,100,180,0.7)', 'target must use the product color');
  assert.ok(flask.element().classList.adds.includes('lab-reaction-precipitate'), 'precipitate reaction class must animate the target');
  assert.match(flask.state.observerText, /CuSO4\(aq\).*Cu\(OH\)2\(s\)/, 'observation must include the balanced equation');
  assert.match(flask.state.observerText, /Trạng thái: Có kết tủa/, 'observation must include the reaction state');
  assert.match(flask.state.observerText, /Màu: rgba\(0,100,180,0\.7\).*Kết luận:/, 'observation must include color and conclusion');
  assert.equal(flask.state.observer.status, 'Có kết tủa', 'observer state must keep the reaction status');
  assert.equal(flask.state.observer.products, 'Cu(OH)2(s) + Na2SO4(l)', 'observer state must keep product phases');
  assert.match(document.getElementById('lab-observer')._list.children[0].textContent, /Sản phẩm: Cu\(OH\)2\(s\) \+ Na2SO4\(l\)/, 'observer panel must record products with phases');
  assert.match(document.getElementById('lab-observer')._summary.textContent, /Precipitation: Cu\(OH\)2\(s\)/, 'summary must guide the current observation');
  assert.equal(document.getElementById('lab-observer').getAttribute('aria-live'), 'polite', 'observer panel must announce new entries politely');
  assert.equal(document.getElementById('lab-observer')._summary.getAttribute('aria-live'), 'polite', 'observer summary must be a live update');
  assert.equal(document.getElementById('lab-observer')._challenge.getAttribute('role'), 'status', 'challenge guidance must expose status semantics');
  assert.equal(document.getElementById('lab-observer')._challenge.getAttribute('aria-live'), 'polite', 'challenge guidance must be announced politely');
  assert.ok(logs.some((line) => line.includes('Quan sát phản ứng: CuSO4(aq)') && line.includes('Có kết tủa') && line.includes('màu rgba(0,100,180,0.7)')), 'console must log the full observation step');
  assert.ok(logs.some((line) => line.includes('Đã đổ 35% Cu(OH)2(s) + Na2SO4(l) vào flask')), 'console must log the post-reaction pour result');
});

test('the observer reset button clears observations and resets the bench', () => {
  const { scene, press, move, up, document } = makeScene();
  let resets = 0;
  scene.resetBench = () => { resets += 1; };
  const flask = scene.spawnNode('flask', { x: 208, y: 60, w: 92, h: 84 });
  const tube = scene.spawnNode('tube', { x: 336, y: 60, w: 46, h: 120 });
  flask.state = { fill: 0.45, color: 'rgba(47,111,176,0.65)', substance: 'CuSO4' };
  tube.state = { fill: 0.35, color: 'rgba(215,225,238,0.5)', substance: 'NaOH' };
  press(7, 350, 80);
  move(7, 280, 100);
  up(7, 280, 100);
  const panel = document.getElementById('lab-observer');
  assert.equal(panel._list.children.length, 1, 'observer starts with one entry');
  panel._reset.listeners.click();
  assert.equal(panel._list.children.length, 0, 'reset must clear entries');
  assert.equal(panel._summary.textContent, 'Chưa có phản ứng.', 'reset must restore empty guidance');
  assert.equal(resets, 1, 'reset must call labScene.resetBench');
});

test('the CO2 challenge completes on a matching acid-carbonate reaction and resets', () => {
  const { scene, press, move, up, document, logs } = makeScene();
  let resets = 0;
  scene.resetBench = () => { resets += 1; };
  const flask = scene.spawnNode('flask', { x: 208, y: 60, w: 92, h: 84 });
  const tube = scene.spawnNode('tube', { x: 336, y: 60, w: 46, h: 120 });
  flask.state = { fill: 0.45, color: 'rgba(214,208,192,0.55)', substance: 'CH3COOH' };
  tube.state = { fill: 0.35, color: 'rgba(200,215,230,0.5)', substance: 'NaHCO3' };
  press(7, 350, 80);
  move(7, 280, 100);
  up(7, 280, 100);
  const panel = document.getElementById('lab-observer');
  assert.equal(panel._challenge.getAttribute('data-challenge-status'), 'complete', 'CO2 product must complete the challenge');
  assert.match(panel._challenge.textContent, /Hoàn thành: đã điều chế CO2/, 'challenge panel must show completion');
  assert.equal(flask.state.observer.challenge, 'complete', 'observer state must store challenge completion');
  assert.ok(logs.some((line) => line.includes('Hoàn thành thử thách: Thử thách: Điều chế CO2')), 'console must log challenge completion');
  panel._reset.listeners.click();
  assert.equal(panel._challenge.getAttribute('data-challenge-status'), 'active', 'reset must reactivate the challenge');
  assert.match(panel._challenge.textContent, /Trộn axit axetic|Tạo khí CO2/, 'reset must restore challenge guidance');
  assert.equal(resets, 1, 'challenge reset must reuse bench reset');
});
