# Requirements Document

## Introduction

A single-page speed reading application delivered as a single HTML file with no external dependencies. The app displays one word at a time from a pasted text passage, allowing the user to control playback speed, navigate through words, and customize font style. The source text is shown alongside the focal word display with the current word highlighted in sync. The app operates in two modes: an input mode for pasting text, and a reader mode for speed reading with full playback controls.

## Glossary

- **App**: The single-file HTML speed reader application
- **Input_View**: The initial screen where the user pastes text and initiates reading
- **Reader_View**: The screen displayed after valid text is submitted, containing the word display, controls, and source highlight view
- **AppState**: The central plain-object state store holding all mutable reader state
- **Word_Display**: The large centered element that shows the current word one at a time
- **Playback_Engine**: The component responsible for automatic word advancement using `setTimeout`
- **Source_Highlighter**: The component that builds the source text DOM once and highlights the current word
- **Controls_Bar**: The UI component containing playback buttons, speed input, font selector, and reset button
- **Progress_Scrubber**: The `<input type="range">` element used to seek to any word in the passage
- **Validator**: The `validate(text)` function that checks whether input text is suitable for reading
- **WPM**: Words per minute — the playback speed setting (range: 60–1000, default: 200)
- **Word_Span**: A `<span>` DOM element wrapping a single whitespace-delimited word in the source display

## Requirements

### Requirement 1: Text Input and Validation

**User Story:** As a user, I want to paste text and have it validated before reading begins, so that I only enter reader mode with usable content.

#### Acceptance Criteria

1. THE Input_View SHALL display a text area and a Start button for the user to paste text and begin reading.
2. WHEN the user clicks Start, THE Validator SHALL check whether the raw text contains at least one non-whitespace word.
3. IF the text is empty, whitespace-only, or contains no valid words, THEN THE Validator SHALL return an error object with a `reason` field and THE Input_View SHALL display a specific inline validation message without switching to reader mode.
4. WHEN the text passes validation, THE Validator SHALL return `null` and THE App SHALL transition to reader mode.

---

### Requirement 2: Source Text DOM Construction

**User Story:** As a user, I want the source text to be displayed with each word individually addressable, so that the current word can be highlighted in sync with the focal display.

#### Acceptance Criteria

1. WHEN valid text is submitted, THE Source_Highlighter SHALL call `buildHighlightView(text)` exactly once to populate the source display element.
2. THE Source_Highlighter SHALL create one `<span>` element per whitespace-delimited word in the input text.
3. THE Source_Highlighter SHALL insert plain text nodes for whitespace and punctuation runs between words, preserving the original layout.
4. THE Source_Highlighter SHALL return the first Word_Span and the total span count from `buildHighlightView`.
5. THE Source_Highlighter SHALL use `white-space: pre-wrap` on the source display element to preserve original whitespace.
6. THE Source_Highlighter SHALL never use `innerHTML` to populate the source display — only DOM text nodes and element creation.

---

### Requirement 3: Reader Mode Initialization

**User Story:** As a user, I want reader mode to start correctly positioned at the first word, so that reading begins from the beginning of the passage.

#### Acceptance Criteria

1. WHEN entering reader mode, THE AppState SHALL set `currentSpan` to the first Word_Span returned by `buildHighlightView`.
2. WHEN entering reader mode, THE AppState SHALL set `spanIndex` to `0`.
3. WHEN entering reader mode, THE Progress_Scrubber SHALL set its `max` attribute to `totalSpans - 1`.
4. WHEN entering reader mode, THE Playback_Engine SHALL begin automatic playback immediately.
5. WHEN entering reader mode, THE Controls_Bar SHALL register a `keydown` listener on `document` for keyboard shortcuts.

---

### Requirement 4: Automatic Playback

**User Story:** As a user, I want words to advance automatically at my chosen speed, so that I can read without manual interaction.

#### Acceptance Criteria

1. WHEN playback is active, THE Playback_Engine SHALL advance to the next word after a delay of `60000 / wpm` milliseconds.
2. WHEN advancing to the next word, THE Playback_Engine SHALL walk `currentSpan.nextSibling` until a `<span>` element is found, skipping text nodes.
3. WHEN advancing to the next word, THE Playback_Engine SHALL update `AppState.currentSpan` to the next Word_Span and increment `AppState.spanIndex` by one.
4. WHEN advancing to the next word, THE Word_Display SHALL call `renderWord` with the new span's `textContent`.
5. WHEN advancing to the next word, THE Source_Highlighter SHALL call `highlightWord` on the new span.
6. WHEN advancing to the next word, THE Progress_Scrubber SHALL set its `value` to `AppState.spanIndex`.
7. WHEN the last word is reached during playback, THE Playback_Engine SHALL pause automatically and highlight the last word.

---

### Requirement 5: Manual Navigation

**User Story:** As a user, I want to step forward and backward through words manually, so that I can re-read or skip sections.

#### Acceptance Criteria

1. WHEN the user clicks the forward button or presses `ArrowRight`, THE Playback_Engine SHALL call `stepForward` to advance one word.
2. WHEN the user clicks the back button or presses `ArrowLeft`, THE Playback_Engine SHALL call `stepBack` to retreat one word.
3. WHEN `stepForward` is called, THE Playback_Engine SHALL walk `currentSpan.nextSibling` until a `<span>` is found and update `AppState.currentSpan` and increment `AppState.spanIndex`.
4. WHEN `stepBack` is called, THE Playback_Engine SHALL walk `currentSpan.previousSibling` until a `<span>` is found and update `AppState.currentSpan` and decrement `AppState.spanIndex`.
5. IF `stepBack` is called when already at the first word, THEN THE Playback_Engine SHALL perform no operation.
6. WHEN manual navigation occurs, THE Word_Display SHALL update, THE Source_Highlighter SHALL highlight the new span, and THE Progress_Scrubber SHALL update its value.
7. WHEN manual navigation occurs during playback, THE Playback_Engine SHALL clear any pending timer before navigating.

---

### Requirement 6: Play/Pause Control

**User Story:** As a user, I want to pause and resume playback, so that I can take breaks without losing my place.

#### Acceptance Criteria

1. WHEN the user clicks the Play/Pause button or presses `Space`, THE Controls_Bar SHALL toggle between playing and paused states.
2. WHEN transitioning to playing, THE Playback_Engine SHALL call `play(state)` and update the button label to indicate pause.
3. WHEN transitioning to paused, THE Playback_Engine SHALL call `pause(state)`, clear the pending timer, and update the button label to indicate play.
4. WHEN `Space` is pressed, THE Controls_Bar SHALL call `event.preventDefault()` to suppress native browser scroll behavior.

---

### Requirement 7: Progress Scrubber

**User Story:** As a user, I want to drag a scrubber to jump to any word in the passage, so that I can navigate large texts quickly.

#### Acceptance Criteria

1. WHEN the user changes the scrubber value, THE Progress_Scrubber SHALL pause playback.
2. WHEN the user changes the scrubber value, THE Progress_Scrubber SHALL walk the DOM from the first Word_Span to find the span at the dragged index and update `AppState.currentSpan` and `AppState.spanIndex`.
3. WHEN the user changes the scrubber value, THE Progress_Scrubber SHALL call `scrubber.blur()` unconditionally after handling the change.
4. WHILE the scrubber has focus, THE App SHALL NOT allow the scrubber to capture `ArrowLeft` or `ArrowRight` keyboard events intended for word navigation.

---

### Requirement 8: Keyboard Shortcuts

**User Story:** As a user, I want keyboard shortcuts for playback control, so that I can operate the reader without moving my hands to the mouse.

#### Acceptance Criteria

1. WHILE in reader mode, THE Controls_Bar SHALL handle `Space`, `ArrowLeft`, and `ArrowRight` keydown events on `document`.
2. WHEN any of the three shortcut keys are pressed, THE Controls_Bar SHALL call `event.preventDefault()` to suppress native browser behavior.
3. WHEN `Space` is pressed, THE Controls_Bar SHALL toggle play/pause.
4. WHEN `ArrowLeft` is pressed, THE Controls_Bar SHALL call `stepBack(state)` and sync the word display, highlight, and scrubber.
5. WHEN `ArrowRight` is pressed, THE Controls_Bar SHALL call `stepForward(state)` and sync the word display, highlight, and scrubber.
6. WHEN the user resets to input mode, THE Controls_Bar SHALL remove the `keydown` listener from `document`.

---

### Requirement 9: Playback Speed Control

**User Story:** As a user, I want to set the reading speed in words per minute, so that I can read at a comfortable pace.

#### Acceptance Criteria

1. THE App SHALL default to 200 WPM on initialization.
2. THE Playback_Engine SHALL compute the inter-word delay as `delayMs = 60000 / wpm`.
3. IF the user enters a WPM value below 60 or above 1000, THEN THE App SHALL clamp the value to the valid range and update the input to reflect the clamped value.
4. WHEN the WPM value changes, THE Playback_Engine SHALL use the new delay on the next word advance.

---

### Requirement 10: Font Selection

**User Story:** As a user, I want to choose the font style for the word display, so that I can read in a style that suits me.

#### Acceptance Criteria

1. THE Controls_Bar SHALL provide a font selector with at least the options: `serif`, `sans-serif`, and `monospace`.
2. WHEN the user changes the font selector, THE Word_Display SHALL call `setFont(fontFamily)` to apply the selected font to the display element's `style.fontFamily`.
3. WHEN the font changes, THE Word_Display SHALL NOT trigger a word re-render — only the font style is updated.

---

### Requirement 11: Source Word Highlighting

**User Story:** As a user, I want the current word highlighted in the source text, so that I can follow along and see context around the current word.

#### Acceptance Criteria

1. WHEN the current word changes, THE Source_Highlighter SHALL remove the `active` CSS class from the previously active Word_Span.
2. WHEN the current word changes, THE Source_Highlighter SHALL add the `active` CSS class to the new current Word_Span.
3. WHEN the current word changes, THE Source_Highlighter SHALL scroll the active Word_Span into view.
4. THE Source_Highlighter SHALL drive all highlight styling exclusively through the `active` CSS class — no inline style mutations.

---

### Requirement 12: Reset to Input Mode

**User Story:** As a user, I want to reset the app and paste new text, so that I can start a new reading session.

#### Acceptance Criteria

1. WHEN the user clicks the Reset button, THE App SHALL stop playback, clear the source display, and return to the Input_View.
2. WHEN resetting, THE Controls_Bar SHALL remove the `keydown` listener from `document`.
3. WHEN resetting, THE AppState SHALL be cleared so that no stale state persists into the next session.

---

### Requirement 13: AppState Invariants

**User Story:** As a developer, I want the application state to remain consistent at all times, so that navigation and display are always in sync.

#### Acceptance Criteria

1. THE AppState SHALL ensure that `currentSpan` always refers to a `<span>` element present in the source display element.
2. THE AppState SHALL ensure that `spanIndex` always equals the zero-based position of `currentSpan` among all Word_Spans in the source display element.
3. THE AppState SHALL ensure that `spanIndex` is never less than `0` or greater than `totalSpans - 1`.
4. THE AppState SHALL ensure that `wpm` is always within the range 60–1000 inclusive.

---

### Requirement 14: Security — No XSS via User Input

**User Story:** As a user, I want my pasted text to be handled safely, so that malicious content in the text cannot execute as code.

#### Acceptance Criteria

1. THE Source_Highlighter SHALL populate the source display using only DOM text nodes and `textContent` assignments — never `innerHTML` or `insertAdjacentHTML`.
2. THE Word_Display SHALL set the focal display element's content using `textContent` only — never `innerHTML`.

---

### Requirement 16: Click-to-Seek on Word Spans

**User Story:** As a user, I want to click any word in the source display to jump directly to it, so that I can quickly resume reading from any point in the passage.

#### Acceptance Criteria

1. WHEN the user clicks a Word_Span in the source display, THE App SHALL set `AppState.currentSpan` to the clicked span and `AppState.spanIndex` to its zero-based DOM position among all Word_Spans.
2. WHEN a Word_Span is clicked, THE Source_Highlighter SHALL call `highlightWord` on the clicked span.
3. WHEN a Word_Span is clicked, THE Word_Display SHALL call `renderWord` with the clicked span's `textContent`.
4. WHEN a Word_Span is clicked, THE Progress_Scrubber SHALL update its `value` to the new `spanIndex`.
5. WHEN a Word_Span is clicked during active playback, THE Playback_Engine SHALL pause playback.

---

### Requirement 15: Single-File Delivery

**User Story:** As a user, I want the app to work by opening a single HTML file, so that I can use it without installing anything or running a server.

#### Acceptance Criteria

1. THE App SHALL be delivered as a single HTML file with all CSS and JavaScript embedded inline.
2. THE App SHALL have no external dependencies — no CDN links, no npm packages, no build step required.
