// Alert sign-up events from track.js: focus alone sends nothing, a tap or keypress in the
// email box sends one start, and a submit sends the new and legacy names.
const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('../track.js');

function fakeDoc() {
  const listeners = {};
  return {
    addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
    dispatch(type, target) { (listeners[type] || []).forEach(fn => fn({ target })); }
  };
}
const emailInput = { type: 'email', closest: sel => (sel === '.signup form' ? {} : null) };
const otherInput = { type: 'search', closest: () => null };
const signupForm = { closest: sel => (sel === '.signup' ? {} : null), querySelector: () => emailInput };

function bound() {
  const doc = fakeDoc(), sent = [];
  T.bindSignupEvents(doc, path => sent.push(path), 'index');
  return { doc, sent };
}

test('focus alone sends nothing', () => {
  const { doc, sent } = bound();
  doc.dispatch('focusin', emailInput);
  doc.dispatch('focus', emailInput);
  assert.deepEqual(sent, []);
});

test('a tap in the email box sends start once', () => {
  const { doc, sent } = bound();
  doc.dispatch('pointerdown', emailInput);
  doc.dispatch('pointerdown', emailInput);
  doc.dispatch('keydown', emailInput);
  assert.deepEqual(sent, ['tap/index/email-signup-start/index']);
});

test('a keypress in the email box sends start; other fields do not', () => {
  const { doc, sent } = bound();
  doc.dispatch('pointerdown', otherInput);
  doc.dispatch('keydown', otherInput);
  assert.deepEqual(sent, []);
  doc.dispatch('keydown', emailInput);
  assert.deepEqual(sent, ['tap/index/email-signup-start/index']);
});

test('submit sends the new and the legacy name', () => {
  const { doc, sent } = bound();
  doc.dispatch('submit', signupForm);
  assert.deepEqual(sent, ['tap/index/email-signup-submit/index', 'tap/index/email-signup/index']);
});

test('a non-signup form submit sends nothing', () => {
  const { doc, sent } = bound();
  doc.dispatch('submit', { closest: () => null, querySelector: () => null });
  assert.deepEqual(sent, []);
});
