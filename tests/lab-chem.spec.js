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

function loadLabChem() {
  const winListeners = {};
  const bench = makeEl('lab-bench');
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
  const dir = path.join(__dirname, '..', 'js');
  vm.runInNewContext(fs.readFileSync(path.join(dir, 'lab-chem.js'), 'utf8'), context, { filename: 'lab-chem.js' });
  return {
    api: context.window.LabChem,
    labChem: context.window.labChem,
    winListeners,
    bench,
  };
}

test('LabChem API is exposed on window', () => {
  const { api } = loadLabChem();
  assert.ok(api, 'LabChem API must exist');
  assert.ok(Array.isArray(api.REACTIONS), 'REACTIONS must be an array');
  assert.equal(api.REACTIONS.length, 10, 'must have 10 curated reactions');
});

test('findReaction returns the matching reaction for two reactant formulas', () => {
  const { api } = loadLabChem();
  const r = api.findReaction(['HCl', 'NaOH']);
  assert.ok(r, 'must find the acid-base reaction');
  assert.equal(r.type, 'Neutralization');
  assert.equal(r.products.length, 2);
});

test('findReaction returns null for unknown reactant pair', () => {
  const { api } = loadLabChem();
  const r = api.findReaction(['HCl', 'NaCl']);
  assert.equal(r, null, 'unknown pair must return null');
});

test('findReaction is order-independent', () => {
  const { api } = loadLabChem();
  const r1 = api.findReaction(['HCl', 'NaOH']);
  const r2 = api.findReaction(['NaOH', 'HCl']);
  assert.equal(r1 && r1.id, r2 && r2.id, 'order must not matter');
});

test('checkConditions returns true when no conditions are required', () => {
  const { api } = loadLabChem();
  const r = api.findReaction(['HCl', 'NaOH']);
  assert.equal(api.checkConditions(r, { heating: false }), true, 'no-condition reaction must pass');
});

test('checkConditions returns false when heating is required but vessel is not heated', () => {
  const { api } = loadLabChem();
  const r = api.findReaction(['CH4', 'O2']);
  assert.equal(api.checkConditions(r, { heating: false }), false, 'combustion requires heat');
});

test('checkConditions returns true when heating is required and vessel is heated', () => {
  const { api } = loadLabChem();
  const r = api.findReaction(['CH4', 'O2']);
  assert.equal(api.checkConditions(r, { heating: true }), true, 'combustion passes with heating');
});

test('react returns null when no matching reaction exists', () => {
  const { api } = loadLabChem();
  const vesselA = { state: { substance: 'HCl', fill: 0.5, color: 'rgba(200,215,230,0.5)', heating: false } };
  const vesselB = { state: { substance: 'NaCl', fill: 0.3, color: null, heating: false } };
  assert.equal(api.react(vesselA, vesselB), null, 'no reaction for HCl + NaCl');
});

test('react returns the reaction when conditions are met', () => {
  const { api } = loadLabChem();
  const vesselA = { state: { substance: 'HCl', fill: 0.5, color: 'rgba(200,215,230,0.5)', heating: false } };
  const vesselB = { state: { substance: 'NaOH', fill: 0.5, color: null, heating: false } };
  const result = api.react(vesselA, vesselB);
  assert.ok(result, 'must find the acid-base reaction');
  assert.equal(result.type, 'Neutralization');
});

test('react returns null when heating is required but not provided', () => {
  const { api } = loadLabChem();
  const vesselA = { state: { substance: 'CH4', fill: 0.5, color: null, heating: false } };
  const vesselB = { state: { substance: 'O2', fill: 0.5, color: null, heating: false } };
  assert.equal(api.react(vesselA, vesselB), null, 'combustion must not fire without heating');
});

test('react returns the reaction when heating condition is met', () => {
  const { api } = loadLabChem();
  const vesselA = { state: { substance: 'CH4', fill: 0.5, color: null, heating: true } };
  const vesselB = { state: { substance: 'O2', fill: 0.5, color: null, heating: true } };
  const result = api.react(vesselA, vesselB);
  assert.ok(result, 'combustion must fire when heated');
  assert.equal(result.type, 'Combustion');
});

test('react returns null when one vessel has no substance', () => {
  const { api } = loadLabChem();
  const vesselA = { state: { substance: 'HCl', fill: 0.5, color: 'rgba(200,215,230,0.5)', heating: false } };
  const vesselB = { state: { substance: null, fill: 0, color: null, heating: false } };
  assert.equal(api.react(vesselA, vesselB), null, 'no reaction when one vessel is empty');
});
