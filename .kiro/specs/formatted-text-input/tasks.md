# Tasks: Formatted Text Input

## Task List

- [x] 1. Verify and confirm the end-to-end newline pipeline
  - [x] 1.1 Read `speed-reader.html` and confirm `textInput.value` is passed directly (without transformation) to `buildHighlightView` in the start-button handler
  - [x] 1.2 Confirm `text.split(/(\S+)/)` in `buildHighlightView` produces text nodes for whitespace tokens (including `\n`) that are appended to `#source-display`
  - [x] 1.3 Confirm `#source-display` has `white-space: pre-wrap` in the stylesheet

- [x] 2. Write unit tests
  - [x] 2.1 Write test E1: assert `#source-display` computed style has `white-space: pre-wrap`
  - [x] 2.2 Write test E2: call `buildHighlightView("hello\nworld")` and assert two spans (`"hello"`, `"world"`) with a `"\n"` text node between them
  - [x] 2.3 Write test E3: simulate Start click with `"\n\n\n"` input and assert error message is shown and reader view remains hidden
  - [x] 2.4 Write test E4: simulate Start click with `"hello\nworld"` and assert reader view is shown and source display contains a text node with `"\n"`

- [x] 3. Write property-based tests using fast-check
  - [x] 3.1 Write Property 1 test: for any string, `validate(text) === null` iff `/\S/.test(text)` — tagged `Feature: formatted-text-input, Property 1: validate correctness`
  - [x] 3.2 Write Property 2 test: for any string, span count in `#source-display` after `buildHighlightView` equals `(text.match(/\S+/g) || []).length` — tagged `Feature: formatted-text-input, Property 2: span count equals word count`
  - [x] 3.3 Write Property 3 test: for any string, concatenating all child `textContent` of `#source-display` after `buildHighlightView` equals the original string — tagged `Feature: formatted-text-input, Property 3: round-trip text fidelity`

- [x] 4. Apply any fixes identified during verification
  - [x] 4.1 If step 1 reveals any transformation of the text string between `textInput.value` and `buildHighlightView`, remove it
  - [x] 4.2 If any property test fails, fix the identified bug in `buildHighlightView` or the start-button handler
