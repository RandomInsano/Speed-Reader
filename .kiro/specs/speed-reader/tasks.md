# Implementation Plan: Speed Reader

## Overview

Implement a single HTML file speed reader with embedded CSS and JavaScript. No build step, no dependencies. The file contains two views (Input_View and Reader_View) toggled by show/hide, a plain AppState object, DOM-based word navigation via sibling walks, and a setTimeout-driven playback engine.

## Tasks

- [x] 1. Create the HTML skeleton with embedded CSS and two views
  - Create `speed-reader.html` with `<!DOCTYPE html>`, `<head>`, and `<body>`
  - Add Input_View: textarea, Start button, inline error message element
  - Add Reader_View (hidden by default): word display element, source highlight div, controls bar (back/play-pause/forward buttons, WPM input, font selector, reset button), progress scrubber `<input type="range">`
  - Embed CSS: layout, two-view toggle (`.hidden`), word display styling, `white-space: pre-wrap` on source display, `.active` highlight class, scrubber styling
  - _Requirements: 1.1, 2.5, 15.1, 15.2_

- [ ] 2. Implement `validate` and AppState initialization
  - [x] 2.1 Implement `validate(text)`
    - Return `null` if text contains at least one non-whitespace word; return `{ reason: 'empty' }` otherwise
    - Wire Start button click: call `validate`, show inline error on failure, proceed on `null`
    - _Requirements: 1.2, 1.3, 1.4_
  - [x] 2.2 Write property test for `validate`
    - **Property 1: validate() correctness**
    - **Validates: Requirements 1.2, 1.3, 1.4**
  - [x] 2.3 Initialize AppState plain object
    - Define `state = { currentSpan, spanIndex, isPlaying, wpm: 200, fontFamily: 'sans-serif', timerId: null }`
    - _Requirements: 9.1, 13.1, 13.2, 13.3, 13.4_

- [ ] 3. Implement `buildHighlightView(text)` and `highlightWord(span)`
  - [x] 3.1 Implement `buildHighlightView(text)`
    - Walk text once; create a `<span>` per whitespace-delimited word and text nodes for whitespace/punctuation between words; append all to source display div
    - Return `{ firstSpan, totalSpans }`
    - Use only `document.createElement`, `document.createTextNode`, `textContent` — never `innerHTML`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.6, 14.1_
  - [x] 3.2 Write property test for `buildHighlightView` span count
    - **Property 2: buildHighlightView span count**
    - **Validates: Requirements 2.2, 2.4**
  - [x] 3.3 Write property test for `buildHighlightView` round-trip
    - **Property 3: buildHighlightView round-trip**
    - **Validates: Requirements 2.3**
  - [x] 3.4 Implement `highlightWord(span)`
    - Remove `active` class from previously active span; add `active` to new span; call `span.scrollIntoView({ block: 'nearest' })`
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [ ] 4. Implement the Playback Engine
  - [x] 4.1 Implement `play(state)` and `pause(state)`
    - `play`: schedule next word via `setTimeout` using `60000 / state.wpm`; on each tick advance span, update `state.currentSpan`, increment `state.spanIndex`, call `renderWord`, `highlightWord`, set `scrubber.value`; reschedule or auto-pause at last word
    - `pause`: call `clearTimeout(state.timerId)`, set `state.timerId = null`, set `state.isPlaying = false`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 6.2, 6.3_
  - [x] 4.2 Write property test for delay computation
    - **Property 5: Delay computation**
    - **Validates: Requirements 4.1, 9.2**
  - [x] 4.3 Implement `stepForward(state)` and `stepBack(state)`
    - `stepForward`: walk `nextSibling` until `<span>` found; update `state.currentSpan`, increment `state.spanIndex`; no-op at last span
    - `stepBack`: walk `previousSibling` until `<span>` found; update `state.currentSpan`, decrement `state.spanIndex`; no-op at first span
    - After each step: call `renderWord`, `highlightWord`, set `scrubber.value`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_
  - [x] 4.4 Write property test for forward sibling walk skips text nodes
    - **Property 6: Forward sibling walk skips text nodes**
    - **Validates: Requirements 4.2, 5.3**
  - [x] 4.5 Write property test for backward sibling walk skips text nodes
    - **Property 7: Backward sibling walk skips text nodes**
    - **Validates: Requirements 5.4**
  - [x] 4.6 Write property test for navigation sync invariant
    - **Property 8: Navigation sync invariant**
    - **Validates: Requirements 4.3, 4.4, 4.5, 4.6, 5.6, 13.1, 13.2, 13.3**
  - [x] 4.7 Write property test for stepBack boundary
    - **Property 9: stepBack boundary — no-op at first word**
    - **Validates: Requirements 5.5**

- [x] 5. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Implement `renderWord`, `setFont`, and WPM clamping
  - [x] 6.1 Implement `renderWord(word)` and `setFont(fontFamily)`
    - `renderWord`: set word display element's `textContent` to `word` — never `innerHTML`
    - `setFont`: set `wordDisplay.style.fontFamily = fontFamily`; called only on font selector change, not on every word render
    - _Requirements: 4.4, 10.2, 10.3, 14.2_
  - [x] 6.2 Write property test for font application
    - **Property 13: Font application**
    - **Validates: Requirements 10.2**
  - [x] 6.3 Implement WPM clamping
    - On WPM input change: clamp value to [60, 1000], update `state.wpm` and the input element's value
    - _Requirements: 9.3, 9.4, 13.4_
  - [x] 6.4 Write property test for WPM clamping
    - **Property 12: WPM clamping**
    - **Validates: Requirements 9.3, 13.4**

- [ ] 7. Implement the Progress Scrubber and click-to-seek
  - [x] 7.1 Wire up `onScrubberChange`
    - On `input`/`change` event: pause playback; walk DOM from first span to index `scrubber.value`; update `state.currentSpan` and `state.spanIndex`; call `renderWord`, `highlightWord`; call `scrubber.blur()` unconditionally
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  - [x] 7.2 Write property test for scrubber seek accuracy
    - **Property 11: Scrubber seek accuracy**
    - **Validates: Requirements 7.2**
  - [x] 7.3 Implement click-to-seek on Word_Spans
    - In `buildHighlightView`, attach a `click` listener to each `<span>`; on click: pause if playing, set `state.currentSpan` to clicked span, compute `spanIndex` by walking from first span, call `renderWord`, `highlightWord`, set `scrubber.value`
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5_
  - [x] 7.4 Write property test for click-to-seek sync invariant
    - **Property 15: Click-to-seek sync invariant**
    - **Validates: Requirements 16.1, 16.2, 16.3, 16.4**

- [ ] 8. Implement keyboard shortcuts and Controls Bar wiring
  - [x] 8.1 Implement document-level `keydown` handler
    - Handle `Space` (toggle play/pause), `ArrowLeft` (`stepBack`), `ArrowRight` (`stepForward`); call `event.preventDefault()` for all three
    - Register listener on `document` when entering reader mode; remove it on reset
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 6.4_
  - [x] 8.2 Wire all Controls Bar buttons
    - Back button → `stepBack`; Forward button → `stepForward`; Play/Pause button → toggle `play`/`pause` and update button label; Font selector → `setFont`; Reset button → `reset()`
    - _Requirements: 5.1, 5.2, 6.1, 6.2, 6.3, 10.1, 10.2, 12.1, 12.2, 12.3_

- [ ] 9. Implement reader mode entry and reset
  - [x] 9.1 Implement reader mode entry
    - Call `buildHighlightView(text)`; set `state.currentSpan = firstSpan`, `state.spanIndex = 0`; set `scrubber.max = totalSpans - 1`; call `renderWord`, `highlightWord`; show Reader_View, hide Input_View; register `keydown` listener; call `play(state)`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  - [x] 9.2 Write property test for reader mode initialization invariant
    - **Property 4: Reader mode initialization invariant**
    - **Validates: Requirements 3.1, 3.2, 3.3**
  - [x] 9.3 Implement `reset()`
    - Call `pause(state)`; clear source display element; reset AppState fields; show Input_View, hide Reader_View; remove `keydown` listener from `document`
    - _Requirements: 12.1, 12.2, 12.3_

- [ ] 10. Implement play/pause toggle invariant and highlight class invariant
  - [x] 10.1 Write property test for play/pause toggle round-trip
    - **Property 10: Play/pause toggle round-trip**
    - **Validates: Requirements 6.1**
  - [x] 10.2 Write property test for highlight class invariant
    - **Property 14: Highlight class invariant**
    - **Validates: Requirements 11.1, 11.2**

- [x] 11. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Property tests are written as manual loop-driven test cases (no PBT library) per the design's testing strategy
- All text content must use `textContent`, never `innerHTML` (Requirements 14.1, 14.2)
- The scrubber must call `blur()` unconditionally after every interaction to prevent it from capturing arrow key events
- The `keydown` listener must be added on reader entry and removed on reset — never left dangling
