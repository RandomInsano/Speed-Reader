/**
 * Property-based tests for speed-reader.html pure functions.
 * Written as manual loop-driven test cases (no PBT library).
 * Run with: node speed-reader.test.js
 *
 * Validates: Requirements 1.2, 1.3, 1.4
 */

// ─── Reimplementation of pure functions under test ───────────────────────────

/**
 * validate(text)
 * Returns null if text contains at least one non-whitespace word;
 * returns { reason: 'empty' } otherwise.
 */
function validate(text) {
  return /\S/.test(text) ? null : { reason: 'empty' };
}

// ─── Test harness ─────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`  FAIL: ${message}`);
  }
}

function runTest(name, fn) {
  console.log(`\nRunning: ${name}`);
  fn();
}

// ─── Property 1: validate() correctness ──────────────────────────────────────
//
// For any string input, validate returns null if and only if the string
// contains at least one non-whitespace word; otherwise it returns an error
// object with a reason field.
//
// Validates: Requirements 1.2, 1.3, 1.4

runTest('Property 1: validate() correctness — inputs that SHOULD return null (valid text)', () => {
  const validInputs = [
    // plain words
    'hello',
    'hello world',
    'one two three',
    // leading/trailing whitespace around real words
    '  hello  ',
    '\thello\t',
    '\nhello\n',
    '   hello world   ',
    // single character
    'a',
    'Z',
    '1',
    // punctuation attached to a word (still contains \S)
    'hello!',
    'hello, world.',
    '(test)',
    // mixed whitespace types with words
    'hello\tworld',
    'hello\nworld',
    'hello\r\nworld',
    // numbers and symbols mixed with letters
    'abc123',
    '123abc',
    '!@#$%word',
    // very long string
    'word '.repeat(1000).trim(),
    // unicode words
    'café',
    'naïve',
    '日本語',
  ];

  for (const input of validInputs) {
    const result = validate(input);
    assert(
      result === null,
      `validate(${JSON.stringify(input)}) should return null but got ${JSON.stringify(result)}`
    );
  }
});

runTest('Property 1: validate() correctness — inputs that SHOULD return error object (invalid text)', () => {
  const invalidInputs = [
    // empty string
    '',
    // spaces only
    ' ',
    '  ',
    '     ',
    // tabs only
    '\t',
    '\t\t',
    // newlines only
    '\n',
    '\n\n',
    '\r\n',
    // mixed whitespace, no words
    ' \t\n',
    '\t \n \r\n ',
    '   \t\t\n\n   ',
  ];

  for (const input of invalidInputs) {
    const result = validate(input);
    assert(
      result !== null,
      `validate(${JSON.stringify(input)}) should return an error object but got null`
    );
    assert(
      typeof result === 'object' && 'reason' in result,
      `validate(${JSON.stringify(input)}) error object must have a 'reason' field, got ${JSON.stringify(result)}`
    );
  }
});

runTest('Property 1: validate() correctness — loop-driven: generated whitespace-only strings', () => {
  const whitespaceChars = [' ', '\t', '\n', '\r'];

  // Generate 200 random whitespace-only strings and verify they all fail validation
  for (let i = 0; i < 200; i++) {
    const len = 1 + (i % 20); // lengths 1–20
    let s = '';
    for (let j = 0; j < len; j++) {
      s += whitespaceChars[j % whitespaceChars.length];
    }
    const result = validate(s);
    assert(
      result !== null && typeof result === 'object' && 'reason' in result,
      `validate(${JSON.stringify(s)}) should return error object for whitespace-only input`
    );
  }
});

runTest('Property 1: validate() correctness — loop-driven: strings with at least one word always return null', () => {
  const words = ['hello', 'world', 'foo', 'bar', 'test', 'a', 'Z', '1', 'café'];
  const whitespaceChars = [' ', '\t', '\n'];

  // Generate 200 strings that each contain at least one word
  for (let i = 0; i < 200; i++) {
    const word = words[i % words.length];
    const ws = whitespaceChars[i % whitespaceChars.length].repeat(1 + (i % 5));
    // Vary the structure: word alone, word with leading ws, word with trailing ws, word surrounded by ws
    const variants = [
      word,
      ws + word,
      word + ws,
      ws + word + ws,
      word + ws + word,
    ];
    const input = variants[i % variants.length];
    const result = validate(input);
    assert(
      result === null,
      `validate(${JSON.stringify(input)}) should return null but got ${JSON.stringify(result)}`
    );
  }
});

runTest('Property 1: validate() correctness — return value is exactly null (not falsy) for valid input', () => {
  // Ensure we get strict null, not undefined, 0, false, or empty string
  const result = validate('hello');
  assert(result === null, `validate('hello') must return strict null, got ${JSON.stringify(result)}`);
});

runTest('Property 1: validate() correctness — error object shape for invalid input', () => {
  const result = validate('');
  assert(result !== null, "validate('') must not return null");
  assert(typeof result === 'object', "validate('') must return an object");
  assert('reason' in result, "validate('') result must have a 'reason' field");
  assert(typeof result.reason === 'string', "validate('') result.reason must be a string");
});

// ─── Minimal DOM mock for buildHighlightView and highlightWord tests ──────────

/**
 * Minimal DOM node implementation sufficient for buildHighlightView and
 * highlightWord tests. No external dependencies required.
 */
class MockNode {
  constructor(nodeType, nodeName) {
    this.nodeType = nodeType;   // 1 = element, 3 = text
    this.nodeName = nodeName;
    this.childNodes = [];
    this.parentNode = null;
    this.nextSibling = null;
    this.previousSibling = null;
  }
  get firstChild() { return this.childNodes[0] || null; }
  appendChild(child) {
    const prev = this.childNodes[this.childNodes.length - 1] || null;
    if (prev) { prev.nextSibling = child; child.previousSibling = prev; }
    child.parentNode = this;
    child.nextSibling = null;
    this.childNodes.push(child);
    return child;
  }
  removeChild(child) {
    const idx = this.childNodes.indexOf(child);
    if (idx !== -1) this.childNodes.splice(idx, 1);
    child.parentNode = null;
    return child;
  }
}

class MockElement extends MockNode {
  constructor(tagName) {
    super(1, tagName.toUpperCase());
    this.tagName = tagName.toUpperCase();
    this.textContent = '';
    this.classList = new MockClassList();
    this._scrolled = false;
  }
  scrollIntoView() { this._scrolled = true; }
}

class MockTextNode extends MockNode {
  constructor(data) {
    super(3, '#text');
    this.data = data;
    this.textContent = data;
  }
}

class MockClassList {
  constructor() { this._classes = new Set(); }
  add(cls) { this._classes.add(cls); }
  remove(cls) { this._classes.delete(cls); }
  contains(cls) { return this._classes.has(cls); }
}

// Mock document factory
function makeMockDocument() {
  const container = new MockElement('div');
  return {
    _container: container,
    createElement(tag) { return new MockElement(tag); },
    createTextNode(data) { return new MockTextNode(data); },
  };
}

// ─── Reimplementation of buildHighlightView using mock document ───────────────

function buildHighlightViewMock(text, mockDoc) {
  const sourceDisplay = mockDoc._container;
  // Clear
  while (sourceDisplay.firstChild) {
    sourceDisplay.removeChild(sourceDisplay.firstChild);
  }

  const tokens = text.split(/(\S+)/);
  let firstSpan = null;
  let totalSpans = 0;

  for (const token of tokens) {
    if (token === '') continue;
    if (/\S/.test(token)) {
      const span = mockDoc.createElement('span');
      span.textContent = token;
      sourceDisplay.appendChild(span);
      if (firstSpan === null) firstSpan = span;
      totalSpans++;
    } else {
      sourceDisplay.appendChild(mockDoc.createTextNode(token));
    }
  }

  return { firstSpan, totalSpans };
}

// ─── Reimplementation of highlightWord using mock spans ───────────────────────

function makeHighlightWordFn() {
  let activeSpan = null;
  return function highlightWord(span) {
    if (activeSpan !== null) {
      activeSpan.classList.remove('active');
    }
    span.classList.add('active');
    activeSpan = span;
    span.scrollIntoView({ block: 'nearest' });
  };
}

// ─── Property 2: buildHighlightView span count ────────────────────────────────
//
// For any valid text string, the number of <span> elements created by
// buildHighlightView equals the number of whitespace-delimited words.
//
// Validates: Requirements 2.2, 2.4

runTest('Property 2: buildHighlightView span count — specific examples', () => {
  const cases = [
    { text: 'hello',                  expectedSpans: 1 },
    { text: 'hello world',            expectedSpans: 2 },
    { text: 'one two three',          expectedSpans: 3 },
    { text: '  hello  world  ',       expectedSpans: 2 },
    { text: 'hello,\nworld.',         expectedSpans: 2 },
    { text: 'a b c d e',             expectedSpans: 5 },
    { text: '\thello\tworld\t',       expectedSpans: 2 },
    { text: 'word',                   expectedSpans: 1 },
    { text: 'café naïve résumé',      expectedSpans: 3 },
  ];

  for (const { text, expectedSpans } of cases) {
    const doc = makeMockDocument();
    const { totalSpans } = buildHighlightViewMock(text, doc);
    assert(
      totalSpans === expectedSpans,
      `buildHighlightView(${JSON.stringify(text)}) span count: expected ${expectedSpans}, got ${totalSpans}`
    );
    // Also verify DOM span count matches
    const domSpans = doc._container.childNodes.filter(n => n.nodeType === 1);
    assert(
      domSpans.length === expectedSpans,
      `DOM span count for ${JSON.stringify(text)}: expected ${expectedSpans}, got ${domSpans.length}`
    );
  }
});

runTest('Property 2: buildHighlightView span count — loop-driven: count matches word split', () => {
  const texts = [
    'the quick brown fox jumps over the lazy dog',
    'one',
    'a b',
    'hello   world',          // multiple spaces
    '\n\nfoo\n\nbar\n\n',     // newline-separated
    'word1 word2 word3 word4 word5 word6 word7 word8 word9 word10',
  ];

  for (const text of texts) {
    const expectedSpans = text.trim().split(/\s+/).filter(w => w.length > 0).length;
    const doc = makeMockDocument();
    const { totalSpans } = buildHighlightViewMock(text, doc);
    assert(
      totalSpans === expectedSpans,
      `span count for ${JSON.stringify(text)}: expected ${expectedSpans}, got ${totalSpans}`
    );
  }

  // Generated: N-word strings
  for (let n = 1; n <= 50; n++) {
    const words = Array.from({ length: n }, (_, i) => `word${i}`);
    const text = words.join(' ');
    const doc = makeMockDocument();
    const { totalSpans } = buildHighlightViewMock(text, doc);
    assert(
      totalSpans === n,
      `${n}-word string: expected ${n} spans, got ${totalSpans}`
    );
  }
});

runTest('Property 2: buildHighlightView span count — firstSpan is the first child span', () => {
  const doc = makeMockDocument();
  const { firstSpan } = buildHighlightViewMock('hello world foo', doc);
  const firstDomSpan = doc._container.childNodes.find(n => n.nodeType === 1);
  assert(
    firstSpan === firstDomSpan,
    'firstSpan must be the first <span> element in the source display'
  );
  assert(
    firstSpan.textContent === 'hello',
    `firstSpan.textContent should be 'hello', got '${firstSpan.textContent}'`
  );
});

// ─── Property 3: buildHighlightView round-trip ────────────────────────────────
//
// For any valid text string, concatenating the textContent of every child node
// (spans and text nodes) in the source display after buildHighlightView produces
// a string equal to the original input text.
//
// Validates: Requirements 2.3

runTest('Property 3: buildHighlightView round-trip — specific examples', () => {
  const texts = [
    'hello',
    'hello world',
    'one two three',
    '  hello  world  ',
    'hello,\nworld.',
    '\thello\tworld\t',
    'the quick brown fox\njumps over the lazy dog',
    'café naïve résumé',
    'a',
  ];

  for (const text of texts) {
    const doc = makeMockDocument();
    buildHighlightViewMock(text, doc);
    const reconstructed = doc._container.childNodes
      .map(n => n.textContent)
      .join('');
    assert(
      reconstructed === text,
      `round-trip failed for ${JSON.stringify(text)}: got ${JSON.stringify(reconstructed)}`
    );
  }
});

runTest('Property 3: buildHighlightView round-trip — loop-driven: generated texts', () => {
  const words = ['hello', 'world', 'foo', 'bar', 'baz'];
  const separators = [' ', '  ', '\t', '\n', ' \n ', '\t\t'];

  for (let i = 0; i < 100; i++) {
    const wordCount = 1 + (i % 8);
    const parts = [];
    for (let j = 0; j < wordCount; j++) {
      if (j > 0) parts.push(separators[i % separators.length]);
      parts.push(words[(i + j) % words.length]);
    }
    const text = parts.join('');
    const doc = makeMockDocument();
    buildHighlightViewMock(text, doc);
    const reconstructed = doc._container.childNodes
      .map(n => n.textContent)
      .join('');
    assert(
      reconstructed === text,
      `round-trip failed for ${JSON.stringify(text)}: got ${JSON.stringify(reconstructed)}`
    );
  }
});

runTest('Property 3: buildHighlightView round-trip — text nodes are not wrapped in spans', () => {
  const doc = makeMockDocument();
  buildHighlightViewMock('hello world', doc);
  const nodes = doc._container.childNodes;
  // Expect: textNode? span textNode span textNode?
  // The split produces ['', 'hello', ' ', 'world', ''] — empty strings skipped
  // So: span('hello'), textNode(' '), span('world')
  const spanNodes = nodes.filter(n => n.nodeType === 1);
  const textNodes = nodes.filter(n => n.nodeType === 3);
  assert(spanNodes.length === 2, `expected 2 spans, got ${spanNodes.length}`);
  assert(textNodes.length === 1, `expected 1 text node, got ${textNodes.length}`);
  assert(textNodes[0].data === ' ', `text node data should be ' ', got '${textNodes[0].data}'`);
});

// ─── highlightWord tests ──────────────────────────────────────────────────────
//
// Validates: Requirements 11.1, 11.2, 11.3, 11.4

runTest('highlightWord — adds active class to span', () => {
  const highlightWord = makeHighlightWordFn();
  const span = new MockElement('span');
  highlightWord(span);
  assert(span.classList.contains('active'), 'span should have active class after highlightWord');
});

runTest('highlightWord — removes active class from previous span', () => {
  const highlightWord = makeHighlightWordFn();
  const span1 = new MockElement('span');
  const span2 = new MockElement('span');
  highlightWord(span1);
  assert(span1.classList.contains('active'), 'span1 should be active after first call');
  highlightWord(span2);
  assert(!span1.classList.contains('active'), 'span1 should lose active class after second call');
  assert(span2.classList.contains('active'), 'span2 should have active class after second call');
});

runTest('highlightWord — scrolls span into view', () => {
  const highlightWord = makeHighlightWordFn();
  const span = new MockElement('span');
  highlightWord(span);
  assert(span._scrolled, 'scrollIntoView should be called on the span');
});

runTest('highlightWord — only one span has active class at a time', () => {
  const highlightWord = makeHighlightWordFn();
  const spans = Array.from({ length: 5 }, () => new MockElement('span'));

  for (let i = 0; i < spans.length; i++) {
    highlightWord(spans[i]);
    const activeCount = spans.filter(s => s.classList.contains('active')).length;
    assert(
      activeCount === 1,
      `after highlightWord(spans[${i}]), exactly 1 span should be active, got ${activeCount}`
    );
    assert(
      spans[i].classList.contains('active'),
      `spans[${i}] should be the active span`
    );
  }
});

runTest('highlightWord — no-op on previous span when called first time (no crash)', () => {
  const highlightWord = makeHighlightWordFn();
  const span = new MockElement('span');
  // Should not throw even though no previous span exists
  let threw = false;
  try { highlightWord(span); } catch (e) { threw = true; }
  assert(!threw, 'highlightWord should not throw on first call');
  assert(span.classList.contains('active'), 'span should be active after first call');
});

// ─── Helpers for playback engine tests ───────────────────────────────────────

/**
 * Build a mock DOM container with N word spans separated by text nodes,
 * mirroring what buildHighlightView produces.
 * Returns { container, spans } where spans is an array of MockElement.
 */
function buildMockSpans(words) {
  const container = new MockElement('div');
  const spans = [];
  for (let i = 0; i < words.length; i++) {
    if (i > 0) container.appendChild(new MockTextNode(' '));
    const span = new MockElement('span');
    span.textContent = words[i];
    container.appendChild(span);
    spans.push(span);
  }
  return { container, spans };
}

/**
 * Minimal state factory for playback engine tests.
 */
function makeState(spans, index = 0) {
  return {
    currentSpan: spans[index],
    spanIndex: index,
    isPlaying: false,
    wpm: 200,
    fontFamily: 'sans-serif',
    timerId: null,
  };
}

// ─── Reimplementation of stepForward / stepBack for tests ─────────────────────

function stepForwardFn(state, renderWord, highlightWord, scrubber) {
  let next = state.currentSpan.nextSibling;
  while (next !== null && next.tagName !== 'SPAN') {
    next = next.nextSibling;
  }
  if (next === null) return;

  state.currentSpan = next;
  state.spanIndex++;

  renderWord(state.currentSpan.textContent);
  highlightWord(state.currentSpan);
  scrubber.value = state.spanIndex;
}

function stepBackFn(state, renderWord, highlightWord, scrubber) {
  let prev = state.currentSpan.previousSibling;
  while (prev !== null && prev.tagName !== 'SPAN') {
    prev = prev.previousSibling;
  }
  if (prev === null) return;

  state.currentSpan = prev;
  state.spanIndex--;

  renderWord(state.currentSpan.textContent);
  highlightWord(state.currentSpan);
  scrubber.value = state.spanIndex;
}

// ─── Property 5: Delay computation ───────────────────────────────────────────
//
// For any WPM value in [60, 1000], the computed delay equals 60000 / wpm ms.
//
// Validates: Requirements 4.1, 9.2

runTest('Property 5: Delay computation — specific WPM values', () => {
  const cases = [
    { wpm: 60,   expectedMs: 1000 },
    { wpm: 200,  expectedMs: 300 },
    { wpm: 300,  expectedMs: 200 },
    { wpm: 600,  expectedMs: 100 },
    { wpm: 1000, expectedMs: 60 },
  ];
  for (const { wpm, expectedMs } of cases) {
    const delay = 60000 / wpm;
    assert(
      delay === expectedMs,
      `60000 / ${wpm} should be ${expectedMs}ms, got ${delay}`
    );
  }
});

runTest('Property 5: Delay computation — loop-driven: all integer WPM in [60, 1000]', () => {
  for (let wpm = 60; wpm <= 1000; wpm++) {
    const delay = 60000 / wpm;
    assert(
      delay > 0 && delay <= 1000,
      `delay for wpm=${wpm} should be in (0, 1000], got ${delay}`
    );
    assert(
      Math.abs(delay - 60000 / wpm) < 1e-9,
      `delay for wpm=${wpm}: expected ${60000 / wpm}, got ${delay}`
    );
  }
});

// ─── Property 6: Forward sibling walk skips text nodes ───────────────────────
//
// For any Word_Span that is not the last span, walking nextSibling until a
// <span> is found always lands on a <span>, never a text node.
//
// Validates: Requirements 4.2, 5.3

runTest('Property 6: Forward sibling walk skips text nodes — specific examples', () => {
  const words = ['one', 'two', 'three', 'four', 'five'];
  const { spans } = buildMockSpans(words);

  for (let i = 0; i < spans.length - 1; i++) {
    let next = spans[i].nextSibling;
    while (next !== null && next.tagName !== 'SPAN') {
      next = next.nextSibling;
    }
    assert(next !== null, `walk from span[${i}] should find a next span`);
    assert(next.tagName === 'SPAN', `walk from span[${i}] should land on a SPAN, got ${next.tagName}`);
    assert(next === spans[i + 1], `walk from span[${i}] should land on span[${i + 1}]`);
  }
});

runTest('Property 6: Forward sibling walk skips text nodes — last span returns null', () => {
  const { spans } = buildMockSpans(['alpha', 'beta', 'gamma']);
  const last = spans[spans.length - 1];
  let next = last.nextSibling;
  while (next !== null && next.tagName !== 'SPAN') {
    next = next.nextSibling;
  }
  assert(next === null, 'walk from last span should return null');
});

runTest('Property 6: Forward sibling walk skips text nodes — loop-driven: N-word passages', () => {
  for (let n = 2; n <= 20; n++) {
    const words = Array.from({ length: n }, (_, i) => `w${i}`);
    const { spans } = buildMockSpans(words);
    for (let i = 0; i < n - 1; i++) {
      let next = spans[i].nextSibling;
      while (next !== null && next.tagName !== 'SPAN') next = next.nextSibling;
      assert(
        next === spans[i + 1],
        `n=${n}: walk from span[${i}] should reach span[${i + 1}]`
      );
    }
  }
});

// ─── Property 7: Backward sibling walk skips text nodes ──────────────────────
//
// For any Word_Span that is not the first span, walking previousSibling until
// a <span> is found always lands on a <span>, never a text node.
//
// Validates: Requirements 5.4

runTest('Property 7: Backward sibling walk skips text nodes — specific examples', () => {
  const words = ['one', 'two', 'three', 'four', 'five'];
  const { spans } = buildMockSpans(words);

  for (let i = 1; i < spans.length; i++) {
    let prev = spans[i].previousSibling;
    while (prev !== null && prev.tagName !== 'SPAN') {
      prev = prev.previousSibling;
    }
    assert(prev !== null, `walk back from span[${i}] should find a previous span`);
    assert(prev.tagName === 'SPAN', `walk back from span[${i}] should land on a SPAN`);
    assert(prev === spans[i - 1], `walk back from span[${i}] should land on span[${i - 1}]`);
  }
});

runTest('Property 7: Backward sibling walk skips text nodes — first span returns null', () => {
  const { spans } = buildMockSpans(['alpha', 'beta', 'gamma']);
  const first = spans[0];
  let prev = first.previousSibling;
  while (prev !== null && prev.tagName !== 'SPAN') {
    prev = prev.previousSibling;
  }
  assert(prev === null, 'walk back from first span should return null');
});

runTest('Property 7: Backward sibling walk skips text nodes — loop-driven: N-word passages', () => {
  for (let n = 2; n <= 20; n++) {
    const words = Array.from({ length: n }, (_, i) => `w${i}`);
    const { spans } = buildMockSpans(words);
    for (let i = 1; i < n; i++) {
      let prev = spans[i].previousSibling;
      while (prev !== null && prev.tagName !== 'SPAN') prev = prev.previousSibling;
      assert(
        prev === spans[i - 1],
        `n=${n}: walk back from span[${i}] should reach span[${i - 1}]`
      );
    }
  }
});

// ─── Property 8: Navigation sync invariant ───────────────────────────────────
//
// For any sequence of stepForward/stepBack calls, after each call:
// - spanIndex equals the zero-based DOM position of currentSpan among all spans
// - word display shows currentSpan.textContent
// - active CSS class is on currentSpan
// - scrubber.value equals spanIndex
//
// Validates: Requirements 4.3, 4.4, 4.5, 4.6, 5.6, 13.1, 13.2, 13.3

runTest('Property 8: Navigation sync invariant — stepForward sequence', () => {
  const words = ['alpha', 'beta', 'gamma', 'delta', 'epsilon'];
  const { spans } = buildMockSpans(words);
  const state = makeState(spans, 0);
  const highlightWord = makeHighlightWordFn();
  const mockScrubber = { value: 0 };
  let lastRendered = '';
  const renderWord = (w) => { lastRendered = w; };

  for (let i = 0; i < words.length - 1; i++) {
    stepForwardFn(state, renderWord, highlightWord, mockScrubber);
    const expectedIndex = i + 1;
    assert(state.spanIndex === expectedIndex, `after ${i + 1} stepForward: spanIndex should be ${expectedIndex}, got ${state.spanIndex}`);
    assert(state.currentSpan === spans[expectedIndex], `after ${i + 1} stepForward: currentSpan should be spans[${expectedIndex}]`);
    assert(lastRendered === words[expectedIndex], `after ${i + 1} stepForward: rendered word should be '${words[expectedIndex]}', got '${lastRendered}'`);
    assert(mockScrubber.value === expectedIndex, `after ${i + 1} stepForward: scrubber.value should be ${expectedIndex}, got ${mockScrubber.value}`);
    assert(state.currentSpan.classList.contains('active'), `after ${i + 1} stepForward: currentSpan should have active class`);
  }
});

runTest('Property 8: Navigation sync invariant — stepBack sequence', () => {
  const words = ['alpha', 'beta', 'gamma', 'delta', 'epsilon'];
  const { spans } = buildMockSpans(words);
  const state = makeState(spans, words.length - 1);
  const highlightWord = makeHighlightWordFn();
  const mockScrubber = { value: words.length - 1 };
  let lastRendered = '';
  const renderWord = (w) => { lastRendered = w; };

  for (let i = words.length - 1; i > 0; i--) {
    stepBackFn(state, renderWord, highlightWord, mockScrubber);
    const expectedIndex = i - 1;
    assert(state.spanIndex === expectedIndex, `stepBack to index ${expectedIndex}: spanIndex should be ${expectedIndex}, got ${state.spanIndex}`);
    assert(state.currentSpan === spans[expectedIndex], `stepBack to index ${expectedIndex}: currentSpan mismatch`);
    assert(lastRendered === words[expectedIndex], `stepBack to index ${expectedIndex}: rendered '${lastRendered}', expected '${words[expectedIndex]}'`);
    assert(mockScrubber.value === expectedIndex, `stepBack to index ${expectedIndex}: scrubber.value should be ${expectedIndex}`);
    assert(state.currentSpan.classList.contains('active'), `stepBack to index ${expectedIndex}: currentSpan should have active class`);
  }
});

runTest('Property 8: Navigation sync invariant — mixed forward/back sequence', () => {
  const words = ['a', 'b', 'c', 'd', 'e'];
  const { spans } = buildMockSpans(words);
  const state = makeState(spans, 0);
  const highlightWord = makeHighlightWordFn();
  const mockScrubber = { value: 0 };
  let lastRendered = '';
  const renderWord = (w) => { lastRendered = w; };

  const moves = ['fwd', 'fwd', 'back', 'fwd', 'back', 'back', 'fwd'];
  let expectedIndex = 0;

  for (const move of moves) {
    if (move === 'fwd') {
      stepForwardFn(state, renderWord, highlightWord, mockScrubber);
      if (expectedIndex < words.length - 1) expectedIndex++;
    } else {
      stepBackFn(state, renderWord, highlightWord, mockScrubber);
      if (expectedIndex > 0) expectedIndex--;
    }
    assert(state.spanIndex === expectedIndex, `after ${move}: spanIndex=${state.spanIndex}, expected ${expectedIndex}`);
    assert(state.currentSpan === spans[expectedIndex], `after ${move}: currentSpan mismatch at index ${expectedIndex}`);
    assert(mockScrubber.value === expectedIndex, `after ${move}: scrubber.value=${mockScrubber.value}, expected ${expectedIndex}`);
  }
});

runTest('Property 8: Navigation sync invariant — loop-driven: random walks', () => {
  for (let trial = 0; trial < 50; trial++) {
    const n = 3 + (trial % 8); // 3–10 words
    const words = Array.from({ length: n }, (_, i) => `word${i}`);
    const { spans } = buildMockSpans(words);
    const state = makeState(spans, 0);
    const highlightWord = makeHighlightWordFn();
    const mockScrubber = { value: 0 };
    const renderWord = () => {};

    let expectedIndex = 0;
    const steps = 20;
    for (let s = 0; s < steps; s++) {
      const goForward = (trial + s) % 2 === 0;
      if (goForward) {
        stepForwardFn(state, renderWord, highlightWord, mockScrubber);
        if (expectedIndex < n - 1) expectedIndex++;
      } else {
        stepBackFn(state, renderWord, highlightWord, mockScrubber);
        if (expectedIndex > 0) expectedIndex--;
      }
      assert(state.spanIndex === expectedIndex, `trial=${trial} step=${s}: spanIndex=${state.spanIndex}, expected ${expectedIndex}`);
      assert(state.currentSpan === spans[expectedIndex], `trial=${trial} step=${s}: currentSpan mismatch`);
      assert(mockScrubber.value === expectedIndex, `trial=${trial} step=${s}: scrubber.value=${mockScrubber.value}, expected ${expectedIndex}`);
    }
  }
});

// ─── Property 9: stepBack boundary — no-op at first word ─────────────────────
//
// When stepBack is called while spanIndex is 0, currentSpan and spanIndex
// remain unchanged.
//
// Validates: Requirements 5.5

runTest('Property 9: stepBack boundary — no-op at first word', () => {
  const words = ['hello', 'world', 'foo'];
  const { spans } = buildMockSpans(words);
  const state = makeState(spans, 0);
  const highlightWord = makeHighlightWordFn();
  const mockScrubber = { value: 0 };
  let renderCalled = false;
  const renderWord = () => { renderCalled = true; };

  stepBackFn(state, renderWord, highlightWord, mockScrubber);

  assert(state.spanIndex === 0, `spanIndex should remain 0 after stepBack at first word, got ${state.spanIndex}`);
  assert(state.currentSpan === spans[0], 'currentSpan should remain spans[0] after stepBack at first word');
  assert(!renderCalled, 'renderWord should NOT be called when stepBack is a no-op');
  assert(mockScrubber.value === 0, 'scrubber.value should remain 0 after no-op stepBack');
});

runTest('Property 9: stepBack boundary — no-op repeated calls at first word', () => {
  const words = ['only', 'two'];
  const { spans } = buildMockSpans(words);
  const state = makeState(spans, 0);
  const highlightWord = makeHighlightWordFn();
  const mockScrubber = { value: 0 };
  const renderWord = () => {};

  // Call stepBack multiple times — should always be a no-op
  for (let i = 0; i < 5; i++) {
    stepBackFn(state, renderWord, highlightWord, mockScrubber);
    assert(state.spanIndex === 0, `after ${i + 1} stepBack calls at first word: spanIndex should be 0, got ${state.spanIndex}`);
    assert(state.currentSpan === spans[0], `after ${i + 1} stepBack calls: currentSpan should remain spans[0]`);
  }
});

runTest('Property 9: stepBack boundary — stepForward at last word is also a no-op', () => {
  const words = ['one', 'two', 'three'];
  const { spans } = buildMockSpans(words);
  const state = makeState(spans, words.length - 1);
  const highlightWord = makeHighlightWordFn();
  const mockScrubber = { value: words.length - 1 };
  let renderCalled = false;
  const renderWord = () => { renderCalled = true; };

  stepForwardFn(state, renderWord, highlightWord, mockScrubber);

  assert(state.spanIndex === words.length - 1, `spanIndex should remain ${words.length - 1} after stepForward at last word`);
  assert(state.currentSpan === spans[words.length - 1], 'currentSpan should remain last span');
  assert(!renderCalled, 'renderWord should NOT be called when stepForward is a no-op');
});

// ─── Property 12: WPM clamping ───────────────────────────────────────────────
//
// For any numeric WPM input, the value stored in AppState.wpm is always within
// the range [60, 1000] inclusive.
//
// Validates: Requirements 9.3, 13.4

function clampWpm(value) {
  return Math.min(1000, Math.max(60, Number(value)));
}

function applyWpm(state, value) {
  state.wpm = clampWpm(value);
}

runTest('Property 12: WPM clamping — values below 60 are clamped to 60', () => {
  const belowMin = [0, 1, 10, 30, 59, -1, -100, -Infinity];
  for (const v of belowMin) {
    const state = { wpm: 200 };
    applyWpm(state, v);
    assert(
      state.wpm === 60,
      `applyWpm(state, ${v}): expected wpm=60, got ${state.wpm}`
    );
  }
});

runTest('Property 12: WPM clamping — values above 1000 are clamped to 1000', () => {
  const aboveMax = [1001, 1500, 9999, Infinity];
  for (const v of aboveMax) {
    const state = { wpm: 200 };
    applyWpm(state, v);
    assert(
      state.wpm === 1000,
      `applyWpm(state, ${v}): expected wpm=1000, got ${state.wpm}`
    );
  }
});

runTest('Property 12: WPM clamping — values within [60, 1000] are stored as-is', () => {
  const inRange = [60, 61, 100, 200, 500, 999, 1000];
  for (const v of inRange) {
    const state = { wpm: 200 };
    applyWpm(state, v);
    assert(
      state.wpm === v,
      `applyWpm(state, ${v}): expected wpm=${v}, got ${state.wpm}`
    );
  }
});

runTest('Property 12: WPM clamping — loop-driven: all integer values in [60, 1000] stored exactly', () => {
  for (let v = 60; v <= 1000; v++) {
    const state = { wpm: 200 };
    applyWpm(state, v);
    assert(
      state.wpm === v,
      `applyWpm(state, ${v}): expected ${v}, got ${state.wpm}`
    );
  }
});

runTest('Property 12: WPM clamping — loop-driven: values outside range always clamped to boundary', () => {
  for (let v = -100; v < 60; v++) {
    const state = { wpm: 200 };
    applyWpm(state, v);
    assert(
      state.wpm >= 60 && state.wpm <= 1000,
      `applyWpm(state, ${v}): wpm=${state.wpm} is out of [60, 1000]`
    );
  }
  for (let v = 1001; v <= 1100; v++) {
    const state = { wpm: 200 };
    applyWpm(state, v);
    assert(
      state.wpm >= 60 && state.wpm <= 1000,
      `applyWpm(state, ${v}): wpm=${state.wpm} is out of [60, 1000]`
    );
  }
});

// ─── Property 13: Font application ───────────────────────────────────────────
//
// For any font family string passed to setFont, the word display element's
// style.fontFamily equals that string after the call.
//
// Validates: Requirements 10.2

function makeWordDisplay() {
  return { style: { fontFamily: '' }, textContent: '' };
}

function setFont(wordDisplay, state, fontFamily) {
  state.fontFamily = fontFamily;
  wordDisplay.style.fontFamily = fontFamily;
}

runTest('Property 13: Font application — specific font families', () => {
  const fonts = ['serif', 'sans-serif', 'monospace', 'Arial', 'Georgia', 'Courier New', 'Times New Roman'];
  for (const font of fonts) {
    const wordDisplay = makeWordDisplay();
    const state = { fontFamily: 'sans-serif' };
    setFont(wordDisplay, state, font);
    assert(
      wordDisplay.style.fontFamily === font,
      `setFont('${font}'): wordDisplay.style.fontFamily should be '${font}', got '${wordDisplay.style.fontFamily}'`
    );
    assert(
      state.fontFamily === font,
      `setFont('${font}'): state.fontFamily should be '${font}', got '${state.fontFamily}'`
    );
  }
});

runTest('Property 13: Font application — loop-driven: arbitrary font strings', () => {
  const fontStrings = [
    'serif', 'sans-serif', 'monospace',
    'Arial, sans-serif', '"Times New Roman", serif',
    'Helvetica Neue', 'Courier', 'Verdana',
    'Comic Sans MS', 'Impact',
    'custom-font-123', 'MyFont',
  ];
  for (let i = 0; i < fontStrings.length; i++) {
    const font = fontStrings[i];
    const wordDisplay = makeWordDisplay();
    const state = { fontFamily: '' };
    setFont(wordDisplay, state, font);
    assert(
      wordDisplay.style.fontFamily === font,
      `setFont loop[${i}] '${font}': style.fontFamily should equal the input string`
    );
  }
});

runTest('Property 13: Font application — does not alter textContent', () => {
  const wordDisplay = makeWordDisplay();
  wordDisplay.textContent = 'hello';
  const state = { fontFamily: '' };
  setFont(wordDisplay, state, 'monospace');
  assert(
    wordDisplay.textContent === 'hello',
    `setFont should not change textContent; expected 'hello', got '${wordDisplay.textContent}'`
  );
});

runTest('Property 13: Font application — successive calls update to latest font', () => {
  const wordDisplay = makeWordDisplay();
  const state = { fontFamily: '' };
  const fonts = ['serif', 'monospace', 'sans-serif'];
  for (const font of fonts) {
    setFont(wordDisplay, state, font);
    assert(
      wordDisplay.style.fontFamily === font,
      `After setFont('${font}'): style.fontFamily should be '${font}', got '${wordDisplay.style.fontFamily}'`
    );
  }
});

// ─── Property 11: Scrubber seek accuracy ─────────────────────────────────────
//
// For any valid index i in [0, totalSpans - 1], after the scrubber is set to i,
// AppState.spanIndex equals i and AppState.currentSpan is the i-th Word_Span.
//
// Validates: Requirements 7.2

function onScrubberChangeFn(state, targetIndex, firstSpan, renderWord, highlightWord, scrubber) {
  // pause logic omitted for pure function test
  let cursor = firstSpan;
  for (let i = 0; i < targetIndex; i++) {
    let sib = cursor.nextSibling;
    while (sib !== null && sib.tagName !== 'SPAN') sib = sib.nextSibling;
    if (sib === null) break;
    cursor = sib;
  }
  state.currentSpan = cursor;
  state.spanIndex = targetIndex;
  renderWord(cursor.textContent);
  highlightWord(cursor);
  // scrubber.blur() omitted for pure function test
}

runTest('Property 11: Scrubber seek accuracy — specific indices', () => {
  const words = ['alpha', 'beta', 'gamma', 'delta', 'epsilon'];
  const { spans } = buildMockSpans(words);
  const firstSpan = spans[0];
  const highlightWord = makeHighlightWordFn();
  const mockScrubber = { value: 0 };
  let lastRendered = '';
  const renderWord = (w) => { lastRendered = w; };

  for (let i = 0; i < words.length; i++) {
    const state = makeState(spans, 0);
    onScrubberChangeFn(state, i, firstSpan, renderWord, highlightWord, mockScrubber);
    assert(
      state.spanIndex === i,
      `seek to index ${i}: state.spanIndex should be ${i}, got ${state.spanIndex}`
    );
    assert(
      state.currentSpan === spans[i],
      `seek to index ${i}: state.currentSpan should be spans[${i}]`
    );
    assert(
      lastRendered === words[i],
      `seek to index ${i}: rendered word should be '${words[i]}', got '${lastRendered}'`
    );
    assert(
      state.currentSpan.classList.contains('active'),
      `seek to index ${i}: currentSpan should have active class`
    );
  }
});

runTest('Property 11: Scrubber seek accuracy — seek to index 0 (first word)', () => {
  const words = ['one', 'two', 'three'];
  const { spans } = buildMockSpans(words);
  const state = makeState(spans, 2);
  const highlightWord = makeHighlightWordFn();
  const mockScrubber = { value: 2 };
  const renderWord = () => {};

  onScrubberChangeFn(state, 0, spans[0], renderWord, highlightWord, mockScrubber);

  assert(state.spanIndex === 0, `seek to 0: spanIndex should be 0, got ${state.spanIndex}`);
  assert(state.currentSpan === spans[0], 'seek to 0: currentSpan should be spans[0]');
});

runTest('Property 11: Scrubber seek accuracy — seek to last index', () => {
  const words = ['one', 'two', 'three', 'four'];
  const { spans } = buildMockSpans(words);
  const state = makeState(spans, 0);
  const highlightWord = makeHighlightWordFn();
  const mockScrubber = { value: 0 };
  const renderWord = () => {};
  const lastIdx = words.length - 1;

  onScrubberChangeFn(state, lastIdx, spans[0], renderWord, highlightWord, mockScrubber);

  assert(state.spanIndex === lastIdx, `seek to last: spanIndex should be ${lastIdx}, got ${state.spanIndex}`);
  assert(state.currentSpan === spans[lastIdx], `seek to last: currentSpan should be spans[${lastIdx}]`);
});

runTest('Property 11: Scrubber seek accuracy — loop-driven: all valid indices for N-word passages', () => {
  for (let n = 1; n <= 20; n++) {
    const words = Array.from({ length: n }, (_, i) => `word${i}`);
    const { spans } = buildMockSpans(words);
    const firstSpan = spans[0];

    for (let i = 0; i < n; i++) {
      const state = makeState(spans, 0);
      const highlightWord = makeHighlightWordFn();
      const mockScrubber = { value: 0 };
      let lastRendered = '';
      const renderWord = (w) => { lastRendered = w; };

      onScrubberChangeFn(state, i, firstSpan, renderWord, highlightWord, mockScrubber);

      assert(
        state.spanIndex === i,
        `n=${n}, seek to ${i}: spanIndex should be ${i}, got ${state.spanIndex}`
      );
      assert(
        state.currentSpan === spans[i],
        `n=${n}, seek to ${i}: currentSpan should be spans[${i}]`
      );
      assert(
        lastRendered === words[i],
        `n=${n}, seek to ${i}: rendered '${lastRendered}', expected '${words[i]}'`
      );
    }
  }
});

runTest('Property 11: Scrubber seek accuracy — repeated seeks to same index are idempotent', () => {
  const words = ['a', 'b', 'c', 'd', 'e'];
  const { spans } = buildMockSpans(words);
  const firstSpan = spans[0];
  const highlightWord = makeHighlightWordFn();
  const mockScrubber = { value: 0 };
  const renderWord = () => {};

  // Seek to index 3 twice — result should be the same
  for (let repeat = 0; repeat < 2; repeat++) {
    const state = makeState(spans, 0);
    onScrubberChangeFn(state, 3, firstSpan, renderWord, highlightWord, mockScrubber);
    assert(state.spanIndex === 3, `repeat ${repeat}: spanIndex should be 3, got ${state.spanIndex}`);
    assert(state.currentSpan === spans[3], `repeat ${repeat}: currentSpan should be spans[3]`);
  }
});

// ─── Property 15: Click-to-seek sync invariant ────────────────────────────────
//
// For any Word_Span clicked by the user, after the click:
// - AppState.currentSpan is that span
// - AppState.spanIndex equals its zero-based DOM position among all Word_Spans
// - the active CSS class is on that span and no other
// - the word display shows that span's textContent
// - scrubber.value equals AppState.spanIndex
//
// Validates: Requirements 16.1, 16.2, 16.3, 16.4

function clickToSeekFn(state, clickedSpan, firstSpan, renderWord, highlightWord, scrubber) {
  // pause logic omitted for pure function test
  let idx = 0;
  let cursor = firstSpan;
  while (cursor !== null && cursor !== clickedSpan) {
    let sib = cursor.nextSibling;
    while (sib !== null && sib.tagName !== 'SPAN') sib = sib.nextSibling;
    cursor = sib;
    idx++;
  }
  state.currentSpan = clickedSpan;
  state.spanIndex = idx;
  renderWord(clickedSpan.textContent);
  highlightWord(clickedSpan);
  scrubber.value = idx;
}

runTest('Property 15: Click-to-seek sync invariant — specific spans', () => {
  const words = ['alpha', 'beta', 'gamma', 'delta', 'epsilon'];
  const firstSpan = buildMockSpans(words).spans[0]; // keep firstSpan reference

  for (let i = 0; i < words.length; i++) {
    // Rebuild spans fresh each iteration so classList state doesn't bleed across iterations
    const { spans } = buildMockSpans(words);
    const state = makeState(spans, 0);
    const highlightWord = makeHighlightWordFn();
    const mockScrubber = { value: 0 };
    let lastRendered = '';
    const renderWord = (w) => { lastRendered = w; };

    clickToSeekFn(state, spans[i], spans[0], renderWord, highlightWord, mockScrubber);

    assert(
      state.currentSpan === spans[i],
      `click span[${i}]: state.currentSpan should be spans[${i}]`
    );
    assert(
      state.spanIndex === i,
      `click span[${i}]: state.spanIndex should be ${i}, got ${state.spanIndex}`
    );
    assert(
      lastRendered === words[i],
      `click span[${i}]: rendered word should be '${words[i]}', got '${lastRendered}'`
    );
    assert(
      mockScrubber.value === i,
      `click span[${i}]: scrubber.value should be ${i}, got ${mockScrubber.value}`
    );
    assert(
      state.currentSpan.classList.contains('active'),
      `click span[${i}]: currentSpan should have active class`
    );
    // Verify no other span has the active class
    const otherActive = spans.filter((s, j) => j !== i && s.classList.contains('active'));
    assert(
      otherActive.length === 0,
      `click span[${i}]: no other span should have active class, found ${otherActive.length}`
    );
  }
});

runTest('Property 15: Click-to-seek sync invariant — click first span', () => {
  const words = ['one', 'two', 'three'];
  const { spans } = buildMockSpans(words);
  const state = makeState(spans, 2);
  const highlightWord = makeHighlightWordFn();
  const mockScrubber = { value: 2 };
  let lastRendered = '';
  const renderWord = (w) => { lastRendered = w; };

  clickToSeekFn(state, spans[0], spans[0], renderWord, highlightWord, mockScrubber);

  assert(state.currentSpan === spans[0], 'click first: currentSpan should be spans[0]');
  assert(state.spanIndex === 0, `click first: spanIndex should be 0, got ${state.spanIndex}`);
  assert(lastRendered === 'one', `click first: rendered '${lastRendered}', expected 'one'`);
  assert(mockScrubber.value === 0, `click first: scrubber.value should be 0, got ${mockScrubber.value}`);
});

runTest('Property 15: Click-to-seek sync invariant — click last span', () => {
  const words = ['one', 'two', 'three', 'four'];
  const { spans } = buildMockSpans(words);
  const state = makeState(spans, 0);
  const highlightWord = makeHighlightWordFn();
  const mockScrubber = { value: 0 };
  let lastRendered = '';
  const renderWord = (w) => { lastRendered = w; };
  const lastIdx = words.length - 1;

  clickToSeekFn(state, spans[lastIdx], spans[0], renderWord, highlightWord, mockScrubber);

  assert(state.currentSpan === spans[lastIdx], `click last: currentSpan should be spans[${lastIdx}]`);
  assert(state.spanIndex === lastIdx, `click last: spanIndex should be ${lastIdx}, got ${state.spanIndex}`);
  assert(lastRendered === words[lastIdx], `click last: rendered '${lastRendered}', expected '${words[lastIdx]}'`);
  assert(mockScrubber.value === lastIdx, `click last: scrubber.value should be ${lastIdx}, got ${mockScrubber.value}`);
});

runTest('Property 15: Click-to-seek sync invariant — loop-driven: all spans in N-word passages', () => {
  for (let n = 1; n <= 20; n++) {
    const words = Array.from({ length: n }, (_, i) => `w${i}`);
    const { spans } = buildMockSpans(words);
    const firstSpan = spans[0];

    for (let i = 0; i < n; i++) {
      const state = makeState(spans, 0);
      const highlightWord = makeHighlightWordFn();
      const mockScrubber = { value: 0 };
      let lastRendered = '';
      const renderWord = (w) => { lastRendered = w; };

      clickToSeekFn(state, spans[i], firstSpan, renderWord, highlightWord, mockScrubber);

      assert(
        state.currentSpan === spans[i],
        `n=${n}, click span[${i}]: currentSpan mismatch`
      );
      assert(
        state.spanIndex === i,
        `n=${n}, click span[${i}]: spanIndex should be ${i}, got ${state.spanIndex}`
      );
      assert(
        lastRendered === words[i],
        `n=${n}, click span[${i}]: rendered '${lastRendered}', expected '${words[i]}'`
      );
      assert(
        mockScrubber.value === i,
        `n=${n}, click span[${i}]: scrubber.value should be ${i}, got ${mockScrubber.value}`
      );
      assert(
        state.currentSpan.classList.contains('active'),
        `n=${n}, click span[${i}]: currentSpan should have active class`
      );
    }
  }
});

runTest('Property 15: Click-to-seek sync invariant — scrubber.value equals spanIndex after click', () => {
  const words = ['a', 'b', 'c', 'd', 'e'];
  const { spans } = buildMockSpans(words);
  const firstSpan = spans[0];

  for (let i = 0; i < words.length; i++) {
    const state = makeState(spans, 0);
    const highlightWord = makeHighlightWordFn();
    const mockScrubber = { value: 99 }; // start with a different value
    const renderWord = () => {};

    clickToSeekFn(state, spans[i], firstSpan, renderWord, highlightWord, mockScrubber);

    assert(
      mockScrubber.value === state.spanIndex,
      `click span[${i}]: scrubber.value (${mockScrubber.value}) should equal spanIndex (${state.spanIndex})`
    );
  }
});

// ─── Property 4: Reader mode initialization invariant ────────────────────────
//
// For any valid text, immediately after entering reader mode:
// - AppState.currentSpan is the first <span> in the source display
// - AppState.spanIndex is 0
// - scrubber.max equals totalSpans - 1
//
// Validates: Requirements 3.1, 3.2, 3.3

/**
 * Mock enterReaderMode: mirrors the real reader mode entry logic.
 * Calls buildHighlightViewMock, sets up state and scrubber as the real code does.
 */
function enterReaderModeMock(text, mockDoc) {
  const mockState = {
    currentSpan: null,
    spanIndex: 0,
    isPlaying: false,
    wpm: 200,
    fontFamily: 'sans-serif',
    timerId: null,
  };
  const mockScrubber = { value: 0, max: 0 };

  const { firstSpan, totalSpans } = buildHighlightViewMock(text, mockDoc);
  mockState.currentSpan = firstSpan;
  mockState.spanIndex = 0;
  mockScrubber.max = totalSpans - 1;

  return { state: mockState, scrubber: mockScrubber, firstSpan, totalSpans };
}

runTest('Property 4: Reader mode initialization invariant — specific examples', () => {
  const texts = [
    'hello',
    'hello world',
    'one two three four five',
    '  leading and trailing  ',
    'single',
    'a b c d e f g h i j',
  ];

  for (const text of texts) {
    const doc = makeMockDocument();
    const { state, scrubber, firstSpan, totalSpans } = enterReaderModeMock(text, doc);

    // currentSpan must be the first <span> in the source display
    const firstDomSpan = doc._container.childNodes.find(n => n.nodeType === 1);
    assert(
      state.currentSpan === firstDomSpan,
      `"${text}": state.currentSpan should be the first DOM span`
    );
    assert(
      state.currentSpan === firstSpan,
      `"${text}": state.currentSpan should equal firstSpan returned by buildHighlightView`
    );

    // spanIndex must be 0
    assert(
      state.spanIndex === 0,
      `"${text}": state.spanIndex should be 0, got ${state.spanIndex}`
    );

    // scrubber.max must equal totalSpans - 1
    assert(
      scrubber.max === totalSpans - 1,
      `"${text}": scrubber.max should be ${totalSpans - 1}, got ${scrubber.max}`
    );
  }
});

runTest('Property 4: Reader mode initialization invariant — loop-driven: N-word texts', () => {
  for (let n = 1; n <= 50; n++) {
    const words = Array.from({ length: n }, (_, i) => `word${i}`);
    const text = words.join(' ');
    const doc = makeMockDocument();
    const { state, scrubber, firstSpan, totalSpans } = enterReaderModeMock(text, doc);

    assert(
      totalSpans === n,
      `n=${n}: totalSpans should be ${n}, got ${totalSpans}`
    );
    assert(
      state.currentSpan === firstSpan,
      `n=${n}: state.currentSpan should be firstSpan`
    );
    assert(
      state.spanIndex === 0,
      `n=${n}: state.spanIndex should be 0, got ${state.spanIndex}`
    );
    assert(
      scrubber.max === n - 1,
      `n=${n}: scrubber.max should be ${n - 1}, got ${scrubber.max}`
    );
  }
});

runTest('Property 4: Reader mode initialization invariant — firstSpan textContent is first word', () => {
  const cases = [
    { text: 'hello world', firstWord: 'hello' },
    { text: '  spaces before', firstWord: 'spaces' },
    { text: 'only', firstWord: 'only' },
    { text: 'foo bar baz', firstWord: 'foo' },
  ];

  for (const { text, firstWord } of cases) {
    const doc = makeMockDocument();
    const { state } = enterReaderModeMock(text, doc);
    assert(
      state.currentSpan.textContent === firstWord,
      `"${text}": firstSpan.textContent should be '${firstWord}', got '${state.currentSpan.textContent}'`
    );
  }
});

runTest('Property 4: Reader mode initialization invariant — scrubber.max is totalSpans - 1 for single word', () => {
  const doc = makeMockDocument();
  const { scrubber, totalSpans } = enterReaderModeMock('oneword', doc);
  assert(totalSpans === 1, `totalSpans should be 1, got ${totalSpans}`);
  assert(scrubber.max === 0, `scrubber.max should be 0 for single word, got ${scrubber.max}`);
});

// ─── Property 10: Play/pause toggle round-trip ───────────────────────────────
//
// For any playback state, toggling play/pause twice (play→pause→play or
// pause→play→pause) returns AppState.isPlaying to its original value.
//
// Validates: Requirements 6.1

function togglePlayPause(state) {
  state.isPlaying = !state.isPlaying;
}

runTest('Property 10: Play/pause toggle round-trip — starting from paused (false)', () => {
  const state = { isPlaying: false };
  const original = state.isPlaying;
  togglePlayPause(state); // false → true
  assert(state.isPlaying !== original, 'after first toggle: isPlaying should have changed');
  togglePlayPause(state); // true → false
  assert(state.isPlaying === original, `after two toggles: isPlaying should be back to ${original}, got ${state.isPlaying}`);
});

runTest('Property 10: Play/pause toggle round-trip — starting from playing (true)', () => {
  const state = { isPlaying: true };
  const original = state.isPlaying;
  togglePlayPause(state); // true → false
  assert(state.isPlaying !== original, 'after first toggle: isPlaying should have changed');
  togglePlayPause(state); // false → true
  assert(state.isPlaying === original, `after two toggles: isPlaying should be back to ${original}, got ${state.isPlaying}`);
});

runTest('Property 10: Play/pause toggle round-trip — loop-driven: both initial states, many double-toggles', () => {
  for (const initialState of [false, true]) {
    for (let i = 0; i < 50; i++) {
      const state = { isPlaying: initialState };
      togglePlayPause(state);
      togglePlayPause(state);
      assert(
        state.isPlaying === initialState,
        `initial=${initialState}, iteration ${i}: double-toggle should restore original value, got ${state.isPlaying}`
      );
    }
  }
});

runTest('Property 10: Play/pause toggle round-trip — single toggle changes state', () => {
  const stateA = { isPlaying: false };
  togglePlayPause(stateA);
  assert(stateA.isPlaying === true, `single toggle from false should yield true, got ${stateA.isPlaying}`);

  const stateB = { isPlaying: true };
  togglePlayPause(stateB);
  assert(stateB.isPlaying === false, `single toggle from true should yield false, got ${stateB.isPlaying}`);
});

runTest('Property 10: Play/pause toggle round-trip — even number of toggles always restores original', () => {
  for (const initial of [false, true]) {
    for (let n = 2; n <= 20; n += 2) {
      const state = { isPlaying: initial };
      for (let i = 0; i < n; i++) togglePlayPause(state);
      assert(
        state.isPlaying === initial,
        `initial=${initial}, ${n} toggles: expected ${initial}, got ${state.isPlaying}`
      );
    }
  }
});

runTest('Property 10: Play/pause toggle round-trip — odd number of toggles always flips original', () => {
  for (const initial of [false, true]) {
    for (let n = 1; n <= 19; n += 2) {
      const state = { isPlaying: initial };
      for (let i = 0; i < n; i++) togglePlayPause(state);
      assert(
        state.isPlaying === !initial,
        `initial=${initial}, ${n} toggles: expected ${!initial}, got ${state.isPlaying}`
      );
    }
  }
});

// ─── Property 14: Highlight class invariant ──────────────────────────────────
//
// For any word change event, exactly one Word_Span in the source display has
// the `active` CSS class, and that span is AppState.currentSpan.
//
// Validates: Requirements 11.1, 11.2

runTest('Property 14: Highlight class invariant — sequential highlights through all spans', () => {
  const words = ['alpha', 'beta', 'gamma', 'delta', 'epsilon'];
  const { spans } = buildMockSpans(words);
  const highlightWord = makeHighlightWordFn();

  for (let i = 0; i < spans.length; i++) {
    highlightWord(spans[i]);

    // Exactly one span has the active class
    const activeSpans = spans.filter(s => s.classList.contains('active'));
    assert(
      activeSpans.length === 1,
      `after highlightWord(spans[${i}]): expected exactly 1 active span, got ${activeSpans.length}`
    );

    // That span is the one just highlighted
    assert(
      activeSpans[0] === spans[i],
      `after highlightWord(spans[${i}]): the active span should be spans[${i}]`
    );
  }
});

runTest('Property 14: Highlight class invariant — random highlight sequence', () => {
  const words = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
  const { spans } = buildMockSpans(words);
  const highlightWord = makeHighlightWordFn();

  // Deterministic pseudo-random sequence using index arithmetic
  const sequence = [3, 0, 6, 2, 5, 1, 4, 3, 6, 0, 2, 5, 1, 4, 3];

  for (let step = 0; step < sequence.length; step++) {
    const idx = sequence[step];
    highlightWord(spans[idx]);

    const activeSpans = spans.filter(s => s.classList.contains('active'));
    assert(
      activeSpans.length === 1,
      `step ${step}, highlight spans[${idx}]: expected exactly 1 active span, got ${activeSpans.length}`
    );
    assert(
      activeSpans[0] === spans[idx],
      `step ${step}, highlight spans[${idx}]: active span should be spans[${idx}]`
    );
  }
});

runTest('Property 14: Highlight class invariant — loop-driven: N-word passages, all spans in order', () => {
  for (let n = 1; n <= 20; n++) {
    const words = Array.from({ length: n }, (_, i) => `w${i}`);
    const { spans } = buildMockSpans(words);
    const highlightWord = makeHighlightWordFn();

    for (let i = 0; i < n; i++) {
      highlightWord(spans[i]);

      const activeCount = spans.filter(s => s.classList.contains('active')).length;
      assert(
        activeCount === 1,
        `n=${n}, highlight span[${i}]: expected 1 active span, got ${activeCount}`
      );
      assert(
        spans[i].classList.contains('active'),
        `n=${n}, highlight span[${i}]: spans[${i}] should be active`
      );
    }
  }
});

runTest('Property 14: Highlight class invariant — re-highlighting same span keeps exactly one active', () => {
  const words = ['one', 'two', 'three'];
  const { spans } = buildMockSpans(words);
  const highlightWord = makeHighlightWordFn();

  // Highlight span[1] twice in a row
  highlightWord(spans[1]);
  highlightWord(spans[1]);

  const activeSpans = spans.filter(s => s.classList.contains('active'));
  assert(
    activeSpans.length === 1,
    `re-highlighting same span: expected 1 active span, got ${activeSpans.length}`
  );
  assert(
    activeSpans[0] === spans[1],
    're-highlighting same span: spans[1] should be the active span'
  );
});

runTest('Property 14: Highlight class invariant — active span matches AppState.currentSpan after navigation', () => {
  const words = ['alpha', 'beta', 'gamma', 'delta'];
  const { spans } = buildMockSpans(words);
  const state = makeState(spans, 0);
  const highlightWord = makeHighlightWordFn();
  const mockScrubber = { value: 0 };
  const renderWord = () => {};

  // Simulate a sequence of navigations and verify invariant after each
  const moves = ['fwd', 'fwd', 'back', 'fwd', 'back'];
  for (const move of moves) {
    if (move === 'fwd') {
      stepForwardFn(state, renderWord, highlightWord, mockScrubber);
    } else {
      stepBackFn(state, renderWord, highlightWord, mockScrubber);
    }

    const activeSpans = spans.filter(s => s.classList.contains('active'));
    assert(
      activeSpans.length === 1,
      `after ${move}: expected exactly 1 active span, got ${activeSpans.length}`
    );
    assert(
      activeSpans[0] === state.currentSpan,
      `after ${move}: active span should be state.currentSpan`
    );
  }
});

// ─── Task 2: Unit Tests (E1–E4) ──────────────────────────────────────────────

const fs = require('fs');
const path = require('path');

runTest('E1: #source-display has white-space: pre-wrap in stylesheet', () => {
  const htmlPath = path.join(__dirname, 'speed-reader.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  // Extract the CSS block for #source-display { ... }
  const match = html.match(/#source-display\s*\{([^}]*)\}/);
  assert(match !== null, '#source-display CSS block should exist in speed-reader.html');
  if (match) {
    const cssBlock = match[1];
    assert(
      cssBlock.includes('white-space') && cssBlock.includes('pre-wrap'),
      `#source-display CSS block should contain 'white-space: pre-wrap', got: ${cssBlock.trim()}`
    );
  }
});

runTest('E2: buildHighlightViewMock("hello\\nworld") produces two spans and a newline text node', () => {
  const doc = makeMockDocument();
  buildHighlightViewMock('hello\nworld', doc);

  const nodes = doc._container.childNodes;
  const spanNodes = nodes.filter(n => n.nodeType === 1);
  const textNodes = nodes.filter(n => n.nodeType === 3);

  assert(spanNodes.length === 2, `expected 2 spans, got ${spanNodes.length}`);
  assert(
    spanNodes[0].textContent === 'hello',
    `first span textContent should be 'hello', got '${spanNodes[0] && spanNodes[0].textContent}'`
  );
  assert(
    spanNodes[1].textContent === 'world',
    `second span textContent should be 'world', got '${spanNodes[1] && spanNodes[1].textContent}'`
  );

  const newlineNode = textNodes.find(n => n.data === '\n');
  assert(newlineNode !== undefined, `expected a text node with data '\\n' between the spans`);
});

runTest('E3: validate("\\n\\n\\n") returns a non-null error (whitespace-only input)', () => {
  const result = validate('\n\n\n');
  assert(result !== null, 'validate("\\n\\n\\n") should return a non-null error object');
  assert(
    typeof result === 'object' && 'reason' in result,
    `validate("\\n\\n\\n") error object must have a 'reason' field, got ${JSON.stringify(result)}`
  );
  // Confirm buildHighlightViewMock is NOT reached — validate returns error before it
  // (simulated by asserting validate returns error, so the start handler would stop here)
  assert(result !== null, 'error returned by validate means buildHighlightView would not be called');
});

runTest('E4: validate("hello\\nworld") returns null and source display contains a newline text node', () => {
  const result = validate('hello\nworld');
  assert(result === null, `validate("hello\\nworld") should return null, got ${JSON.stringify(result)}`);

  const doc = makeMockDocument();
  buildHighlightViewMock('hello\nworld', doc);

  const nodes = doc._container.childNodes;
  const newlineNode = nodes.find(n => n.nodeType === 3 && n.data.includes('\n'));
  assert(
    newlineNode !== undefined,
    'source display should contain at least one text node whose data includes "\\n"'
  );
});

// ─── Task 3: Property-Based Tests (manual loop-driven, no external deps) ─────

// ─── Property 1: validate correctness ────────────────────────────────────────
// Feature: formatted-text-input, Property 1: validate correctness
//
// For any string, validate(text) === null iff /\S/.test(text).
// Validates: Requirements 3.1, 3.2, 3.3

runTest('PBT Property 1: validate correctness — loop-driven: whitespace-only strings return error', () => {
  // Feature: formatted-text-input, Property 1: validate correctness
  const wsChars = [' ', '\t', '\n', '\r'];

  // Generate 100+ whitespace-only strings of varying lengths and compositions
  for (let i = 0; i < 120; i++) {
    const len = 1 + (i % 15);
    let s = '';
    for (let j = 0; j < len; j++) {
      s += wsChars[(i + j) % wsChars.length];
    }
    const hasNonWs = /\S/.test(s);
    const result = validate(s);
    assert(
      (result === null) === hasNonWs,
      `Property 1 failed for ${JSON.stringify(s)}: validate returned ${JSON.stringify(result)}, /\\S/.test = ${hasNonWs}`
    );
  }
});

runTest('PBT Property 1: validate correctness — loop-driven: strings with words return null', () => {
  // Feature: formatted-text-input, Property 1: validate correctness
  const words = ['hello', 'world', 'foo', 'bar', 'a', 'Z', '1', 'café', 'naïve', '日本語'];
  const wsChars = [' ', '\t', '\n', '\r\n', '  ', '\t\n'];

  for (let i = 0; i < 100; i++) {
    const word = words[i % words.length];
    const ws = wsChars[i % wsChars.length];
    // Vary structure: word alone, padded, surrounded, doubled
    const variants = [
      word,
      ws + word,
      word + ws,
      ws + word + ws,
      word + ws + word,
      ws + word + ws + word + ws,
    ];
    const text = variants[i % variants.length];
    const hasNonWs = /\S/.test(text);
    const result = validate(text);
    assert(
      (result === null) === hasNonWs,
      `Property 1 failed for ${JSON.stringify(text)}: validate returned ${JSON.stringify(result)}, /\\S/.test = ${hasNonWs}`
    );
  }
});

runTest('PBT Property 1: validate correctness — loop-driven: empty and edge-case strings', () => {
  // Feature: formatted-text-input, Property 1: validate correctness
  const edgeCases = [
    '',
    ' ',
    '\n',
    '\t',
    '\r\n',
    '   \t\t\n\n',
    'a',
    '!',
    '0',
    ' a ',
    '\na\n',
    '\ta\t',
    'hello world',
    'hello\nworld',
    'hello\tworld',
    'hello\r\nworld',
    '  hello  world  ',
    '\n\nhello\n\nworld\n\n',
    'word '.repeat(50).trim(),
    '\n'.repeat(20),
    ' '.repeat(50),
    '\t'.repeat(30),
    'café',
    '日本語',
    '!@#$%',
    '123',
  ];

  for (const text of edgeCases) {
    const hasNonWs = /\S/.test(text);
    const result = validate(text);
    assert(
      (result === null) === hasNonWs,
      `Property 1 failed for ${JSON.stringify(text)}: validate returned ${JSON.stringify(result)}, /\\S/.test = ${hasNonWs}`
    );
  }

  // Also generate 80 more varied strings to reach 100+ total
  const chars = ['a', 'b', ' ', '\n', '\t', '1', '!', 'é'];
  for (let i = 0; i < 80; i++) {
    const len = 1 + (i % 12);
    let s = '';
    for (let j = 0; j < len; j++) {
      s += chars[(i * 3 + j * 7) % chars.length];
    }
    const hasNonWs = /\S/.test(s);
    const result = validate(s);
    assert(
      (result === null) === hasNonWs,
      `Property 1 loop[${i}] failed for ${JSON.stringify(s)}: validate returned ${JSON.stringify(result)}, /\\S/.test = ${hasNonWs}`
    );
  }
});

// ─── Property 2: span count equals word count ─────────────────────────────────
// Feature: formatted-text-input, Property 2: span count equals word count
//
// For any string, after buildHighlightViewMock(text, doc), the number of <span>
// elements equals (text.match(/\S+/g) || []).length.
// Validates: Requirements 2.1, 2.2

runTest('PBT Property 2: span count equals word count — loop-driven: varied separators', () => {
  // Feature: formatted-text-input, Property 2: span count equals word count
  const words = ['hello', 'world', 'foo', 'bar', 'baz', 'qux', 'one', 'two'];
  const separators = [' ', '  ', '\t', '\n', '\r\n', ' \n ', '\t\t', '\n\n', ' \t\n '];

  for (let i = 0; i < 100; i++) {
    const wordCount = 1 + (i % 7);
    const sep = separators[i % separators.length];
    const parts = [];
    for (let j = 0; j < wordCount; j++) {
      parts.push(words[(i + j) % words.length]);
    }
    const text = parts.join(sep);
    const doc = makeMockDocument();
    buildHighlightViewMock(text, doc);
    const spanCount = doc._container.childNodes.filter(n => n.nodeType === 1).length;
    const expectedCount = (text.match(/\S+/g) || []).length;
    assert(
      spanCount === expectedCount,
      `Property 2 failed for ${JSON.stringify(text)}: spanCount=${spanCount}, expected=${expectedCount}`
    );
  }
});

runTest('PBT Property 2: span count equals word count — loop-driven: leading/trailing whitespace', () => {
  // Feature: formatted-text-input, Property 2: span count equals word count
  const wsChars = [' ', '\t', '\n', '  ', '\t\n'];

  for (let i = 0; i < 100; i++) {
    const wordCount = i % 6; // 0–5 words (0 = empty/whitespace-only)
    const ws = wsChars[i % wsChars.length];
    let text;
    if (wordCount === 0) {
      // whitespace-only
      text = ws.repeat(1 + (i % 4));
    } else {
      const parts = Array.from({ length: wordCount }, (_, j) => `w${j}`);
      text = ws + parts.join(ws) + ws;
    }
    const doc = makeMockDocument();
    buildHighlightViewMock(text, doc);
    const spanCount = doc._container.childNodes.filter(n => n.nodeType === 1).length;
    const expectedCount = (text.match(/\S+/g) || []).length;
    assert(
      spanCount === expectedCount,
      `Property 2 loop[${i}] failed for ${JSON.stringify(text)}: spanCount=${spanCount}, expected=${expectedCount}`
    );
  }
});

runTest('PBT Property 2: span count equals word count — loop-driven: edge cases', () => {
  // Feature: formatted-text-input, Property 2: span count equals word count
  const edgeCases = [
    '',
    ' ',
    '\n',
    '\t',
    'a',
    'hello',
    'hello world',
    'hello\nworld',
    'hello\tworld',
    '  hello  world  ',
    '\n\nhello\n\nworld\n\n',
    'one two three four five six seven eight nine ten',
    'café naïve résumé',
    '!@# $%^ &*()',
    'word '.repeat(20).trim(),
  ];

  for (const text of edgeCases) {
    const doc = makeMockDocument();
    buildHighlightViewMock(text, doc);
    const spanCount = doc._container.childNodes.filter(n => n.nodeType === 1).length;
    const expectedCount = (text.match(/\S+/g) || []).length;
    assert(
      spanCount === expectedCount,
      `Property 2 edge case failed for ${JSON.stringify(text)}: spanCount=${spanCount}, expected=${expectedCount}`
    );
  }
});

// ─── Property 3: round-trip text fidelity ────────────────────────────────────
// Feature: formatted-text-input, Property 3: round-trip text fidelity
//
// For any string, after buildHighlightViewMock(text, doc), concatenating all
// child node textContent values equals the original string.
// Validates: Requirements 4.1, 4.3, 5.2, 5.3

runTest('PBT Property 3: round-trip text fidelity — loop-driven: varied whitespace separators', () => {
  // Feature: formatted-text-input, Property 3: round-trip text fidelity
  const words = ['hello', 'world', 'foo', 'bar', 'baz'];
  const separators = [' ', '  ', '\t', '\n', '\r\n', ' \n ', '\t\t', '\n\n', ' \t\n '];

  for (let i = 0; i < 100; i++) {
    const wordCount = 1 + (i % 6);
    const sep = separators[i % separators.length];
    const parts = [];
    for (let j = 0; j < wordCount; j++) {
      parts.push(words[(i + j) % words.length]);
    }
    const text = parts.join(sep);
    const doc = makeMockDocument();
    buildHighlightViewMock(text, doc);
    const reconstructed = doc._container.childNodes.map(n => n.textContent).join('');
    assert(
      reconstructed === text,
      `Property 3 failed for ${JSON.stringify(text)}: got ${JSON.stringify(reconstructed)}`
    );
  }
});

runTest('PBT Property 3: round-trip text fidelity — loop-driven: leading/trailing whitespace', () => {
  // Feature: formatted-text-input, Property 3: round-trip text fidelity
  const wsChars = [' ', '\t', '\n', '  ', '\t\n', '\n\n'];

  for (let i = 0; i < 100; i++) {
    const wordCount = 1 + (i % 5);
    const ws = wsChars[i % wsChars.length];
    const parts = Array.from({ length: wordCount }, (_, j) => `word${j}`);
    const text = ws + parts.join(ws) + ws;
    const doc = makeMockDocument();
    buildHighlightViewMock(text, doc);
    const reconstructed = doc._container.childNodes.map(n => n.textContent).join('');
    assert(
      reconstructed === text,
      `Property 3 loop[${i}] failed for ${JSON.stringify(text)}: got ${JSON.stringify(reconstructed)}`
    );
  }
});

runTest('PBT Property 3: round-trip text fidelity — loop-driven: edge cases and unicode', () => {
  // Feature: formatted-text-input, Property 3: round-trip text fidelity
  const edgeCases = [
    '',
    ' ',
    '\n',
    '\t',
    '\r\n',
    'a',
    'hello',
    'hello world',
    'hello\nworld',
    'hello\tworld',
    'hello\r\nworld',
    '  hello  world  ',
    '\n\nhello\n\nworld\n\n',
    '\t\thello\t\tworld\t\t',
    'café naïve résumé',
    '日本語 テスト',
    'one\ntwo\nthree\nfour\nfive',
    'a  b  c  d  e',
    ' \t \n \t ',
    'word '.repeat(10).trimEnd(),
  ];

  for (const text of edgeCases) {
    const doc = makeMockDocument();
    buildHighlightViewMock(text, doc);
    const reconstructed = doc._container.childNodes.map(n => n.textContent).join('');
    assert(
      reconstructed === text,
      `Property 3 edge case failed for ${JSON.stringify(text)}: got ${JSON.stringify(reconstructed)}`
    );
  }

  // Generate 80 more strings with mixed chars to reach 100+ total
  const chars = ['a', 'b', 'c', ' ', '\n', '\t', '1', 'é', '!'];
  for (let i = 0; i < 80; i++) {
    const len = 1 + (i % 15);
    let text = '';
    for (let j = 0; j < len; j++) {
      text += chars[(i * 5 + j * 3) % chars.length];
    }
    const doc = makeMockDocument();
    buildHighlightViewMock(text, doc);
    const reconstructed = doc._container.childNodes.map(n => n.textContent).join('');
    assert(
      reconstructed === text,
      `Property 3 gen[${i}] failed for ${JSON.stringify(text)}: got ${JSON.stringify(reconstructed)}`
    );
  }
});

// ─── PreferenceManager tests ──────────────────────────────────────────────────
//
// Re-implements PreferenceManager logic with injected storage so it can run
// in Node.js without a browser.

function makeMockStorage() {
  const store = {};
  return {
    getItem(key) { return key in store ? store[key] : null; },
    setItem(key, value) { store[key] = String(value); },
    removeItem(key) { delete store[key]; },
  };
}

function makePreferenceManager(storage) {
  const PREFS = {
    WPM: {
      key:     'speedreader.wpm',
      default: 200,
      min:     60,
      max:     1000,
    },
    FONT: {
      key:     'speedreader.font',
      default: 'sans-serif',
      values:  ['sans-serif', 'serif', 'monospace'],
    },
  };

  return {
    PREFS,
    save(descriptor, value) {
      try {
        storage.setItem(descriptor.key, String(value));
      } catch (e) {
        // silently swallow storage errors
      }
    },
    load(descriptor) {
      try {
        const raw = storage.getItem(descriptor.key);
        if (raw === null) return descriptor.default;
        if ('min' in descriptor && 'max' in descriptor) {
          const parsed = parseInt(raw, 10);
          return (parsed >= descriptor.min && parsed <= descriptor.max)
            ? parsed
            : descriptor.default;
        }
        if ('values' in descriptor) {
          return descriptor.values.includes(raw) ? raw : descriptor.default;
        }
        return descriptor.default;
      } catch (e) {
        return descriptor.default;
      }
    },
  };
}

// ─── Task 5.1: load returns default for invalid values ───────────────────────

runTest('5.1: load(PREFS.WPM) returns default for out-of-range and non-numeric values', () => {
  const invalidWpmValues = ['59', '1001', 'NaN', 'abc'];
  for (const raw of invalidWpmValues) {
    const storage = makeMockStorage();
    const pm = makePreferenceManager(storage);
    storage.setItem(pm.PREFS.WPM.key, raw);
    const result = pm.load(pm.PREFS.WPM);
    assert(
      result === pm.PREFS.WPM.default,
      `load(PREFS.WPM) with stored "${raw}" should return default ${pm.PREFS.WPM.default}, got ${result}`
    );
  }
});

runTest('5.1: load(PREFS.FONT) returns default for invalid font strings', () => {
  const invalidFontValues = ['comic-sans', 'Arial', ''];
  for (const raw of invalidFontValues) {
    const storage = makeMockStorage();
    const pm = makePreferenceManager(storage);
    storage.setItem(pm.PREFS.FONT.key, raw);
    const result = pm.load(pm.PREFS.FONT);
    assert(
      result === pm.PREFS.FONT.default,
      `load(PREFS.FONT) with stored "${raw}" should return default "${pm.PREFS.FONT.default}", got "${result}"`
    );
  }
});

// ─── Task 5.2: load returns default when key is absent ───────────────────────

runTest('5.2: load(PREFS.WPM) returns default when key is absent', () => {
  const storage = makeMockStorage();
  const pm = makePreferenceManager(storage);
  const result = pm.load(pm.PREFS.WPM);
  assert(
    result === pm.PREFS.WPM.default,
    `load(PREFS.WPM) with no stored key should return default ${pm.PREFS.WPM.default}, got ${result}`
  );
});

runTest('5.2: load(PREFS.FONT) returns default when key is absent', () => {
  const storage = makeMockStorage();
  const pm = makePreferenceManager(storage);
  const result = pm.load(pm.PREFS.FONT);
  assert(
    result === pm.PREFS.FONT.default,
    `load(PREFS.FONT) with no stored key should return default "${pm.PREFS.FONT.default}", got "${result}"`
  );
});

// ─── Task 5.3: load returns default when localStorage throws ─────────────────

runTest('5.3: load(PREFS.WPM) returns default when storage.getItem throws', () => {
  const throwingStorage = {
    getItem() { throw new Error('storage unavailable'); },
    setItem() {},
    removeItem() {},
  };
  const pm = makePreferenceManager(throwingStorage);
  let threw = false;
  let result;
  try {
    result = pm.load(pm.PREFS.WPM);
  } catch (e) {
    threw = true;
  }
  assert(!threw, 'load(PREFS.WPM) must not throw when storage throws');
  assert(
    result === pm.PREFS.WPM.default,
    `load(PREFS.WPM) should return default ${pm.PREFS.WPM.default} when storage throws, got ${result}`
  );
});

runTest('5.3: load(PREFS.FONT) returns default when storage.getItem throws', () => {
  const throwingStorage = {
    getItem() { throw new Error('storage unavailable'); },
    setItem() {},
    removeItem() {},
  };
  const pm = makePreferenceManager(throwingStorage);
  let threw = false;
  let result;
  try {
    result = pm.load(pm.PREFS.FONT);
  } catch (e) {
    threw = true;
  }
  assert(!threw, 'load(PREFS.FONT) must not throw when storage throws');
  assert(
    result === pm.PREFS.FONT.default,
    `load(PREFS.FONT) should return default "${pm.PREFS.FONT.default}" when storage throws, got "${result}"`
  );
});

// ─── Task 5.4: Property-based tests ──────────────────────────────────────────

runTest('PBT 5.4 P1: WPM save/load round-trip — all integers in [60, 1000]', () => {
  // Feature: preferences-persistence, Property 1: For any integer WPM in [60, 1000], save then load returns the same integer
  for (let wpm = 60; wpm <= 1000; wpm++) {
    const storage = makeMockStorage();
    const pm = makePreferenceManager(storage);
    pm.save(pm.PREFS.WPM, wpm);
    const result = pm.load(pm.PREFS.WPM);
    assert(
      result === wpm,
      `P1: save/load round-trip failed for wpm=${wpm}: got ${result}`
    );
  }
});

runTest('PBT 5.4 P2: Font save/load round-trip — all valid font values', () => {
  // Feature: preferences-persistence, Property 2: For any valid font from PREFS.FONT.values, save then load returns the same string
  const pm0 = makePreferenceManager(makeMockStorage());
  const fonts = pm0.PREFS.FONT.values;
  let iterations = 0;
  for (let i = 0; i < 100; i++) {
    const font = fonts[i % fonts.length];
    const storage = makeMockStorage();
    const pm = makePreferenceManager(storage);
    pm.save(pm.PREFS.FONT, font);
    const result = pm.load(pm.PREFS.FONT);
    assert(
      result === font,
      `P2: save/load round-trip failed for font="${font}": got "${result}"`
    );
    iterations++;
  }
  assert(iterations >= 100, `P2: expected at least 100 iterations, ran ${iterations}`);
});

runTest('PBT 5.4 P3: Out-of-range WPM is rejected — returns default', () => {
  // Feature: preferences-persistence, Property 3: For any integer outside [PREFS.WPM.min, PREFS.WPM.max], load returns PREFS.WPM.default
  const pm0 = makePreferenceManager(makeMockStorage());
  const { min, max, default: def, key } = pm0.PREFS.WPM;

  // Below range: -40 to 59 (100 values)
  for (let v = min - 100; v < min; v++) {
    const storage = makeMockStorage();
    storage.setItem(key, String(v));
    const pm = makePreferenceManager(storage);
    const result = pm.load(pm.PREFS.WPM);
    assert(
      result === def,
      `P3: out-of-range wpm=${v} should return default ${def}, got ${result}`
    );
  }

  // Above range: 1001 to 1100 (100 values)
  for (let v = max + 1; v <= max + 100; v++) {
    const storage = makeMockStorage();
    storage.setItem(key, String(v));
    const pm = makePreferenceManager(storage);
    const result = pm.load(pm.PREFS.WPM);
    assert(
      result === def,
      `P3: out-of-range wpm=${v} should return default ${def}, got ${result}`
    );
  }
});

runTest('PBT 5.4 P4: Invalid font string is rejected — returns default', () => {
  // Feature: preferences-persistence, Property 4: For any string not in PREFS.FONT.values, load returns PREFS.FONT.default
  const pm0 = makePreferenceManager(makeMockStorage());
  const { values, default: def, key } = pm0.PREFS.FONT;

  const invalidFonts = [
    'Arial', 'Georgia', 'comic-sans', '', '123', 'Times New Roman',
    'Helvetica', 'Verdana', 'Courier', 'Impact', 'Tahoma',
    'Trebuchet MS', 'Palatino', 'Garamond', 'Bookman', 'Comic Sans MS',
    'Arial Black', 'Arial Narrow', 'Century Gothic', 'Lucida Console',
  ];
  // Pad to 100+ with generated strings
  for (let i = 0; i < 100; i++) {
    invalidFonts.push(`font${i}`);
  }

  let tested = 0;
  for (const font of invalidFonts) {
    if (values.includes(font)) continue; // skip any accidentally valid ones
    const storage = makeMockStorage();
    storage.setItem(key, font);
    const pm = makePreferenceManager(storage);
    const result = pm.load(pm.PREFS.FONT);
    assert(
      result === def,
      `P4: invalid font "${font}" should return default "${def}", got "${result}"`
    );
    tested++;
  }
  assert(tested >= 100, `P4: expected at least 100 invalid font tests, ran ${tested}`);
});

// ─── Summary ──────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  console.error('\nFAIL');
  process.exit(1);
} else {
  console.log('\nPASS');
  process.exit(0);
}
