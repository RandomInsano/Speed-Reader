# Design Document: Formatted Text Input

## Overview

The formatted-text-input feature ensures the Speed Reader app correctly accepts, preserves, and displays multi-line formatted text end-to-end. The existing `<textarea>` already preserves newlines in `.value`, the tokenizer already splits on `\S+` (preserving whitespace tokens), and `#source-display` already has `white-space: pre-wrap`. The feature is therefore primarily a verification and light-touch hardening of the existing pipeline rather than a structural rewrite.

The key end-to-end path is:

```
textarea.value  →  validate(text)  →  buildHighlightView(text)  →  source-display DOM
```

All three stages already handle newlines correctly. The work is to confirm this, add a small explicit test surface, and ensure nothing in the path silently strips whitespace.

## Architecture

The app is a single HTML file with no build step. All logic lives in inline `<script>`. The relevant pipeline for this feature:

```
┌─────────────────────┐
│   #text-input       │  <textarea> — preserves \n in .value natively
│   (Input_View)      │
└────────┬────────────┘
         │ .value (raw string)
         ▼
┌─────────────────────┐
│   validate(text)    │  /\S/.test(text) — already whitespace-aware
└────────┬────────────┘
         │ text (unchanged)
         ▼
┌─────────────────────┐
│ buildHighlightView  │  text.split(/(\S+)/) — produces word spans +
│                     │  text nodes for all whitespace including \n
└────────┬────────────┘
         │ DOM nodes
         ▼
┌─────────────────────┐
│  #source-display    │  white-space: pre-wrap — renders \n as line breaks
└─────────────────────┘
```

No new components are needed. The design confirms the pipeline is correct and identifies the one place where a subtle bug could exist: the `text.split(/(\S+)/)` call must produce text nodes for whitespace runs (including `\n`) that are appended directly to the DOM, which `white-space: pre-wrap` then renders as visible line breaks.

## Components and Interfaces

### Formatted_Input (`<textarea id="text-input">`)

- Already a standard `<textarea>` — natively preserves newlines in `.value`
- No change required to the element itself
- The CSS already gives it `resize: vertical` and a fixed height; no changes needed for newline support

### Validator (`validate(text)`)

```js
function validate(text) {
  return /\S/.test(text) ? null : { reason: 'empty' };
}
```

- Already correct: `/\S/` matches any non-whitespace character, so a string of only newlines/spaces returns an error
- No change required

### Source Highlighter (`buildHighlightView(text)`)

```js
const tokens = text.split(/(\S+)/);
```

- `split` with a capturing group produces an array of alternating whitespace and word tokens
- Whitespace tokens (including `\n`, `\r\n`, `\t`, spaces) become `Text` nodes appended directly to `#source-display`
- Word tokens become `<span>` elements
- Because `#source-display` has `white-space: pre-wrap`, the `\n` characters in text nodes render as visible line breaks

No change required to the tokenizer logic. The design confirms this is already correct.

### Source Display (`#source-display`)

```css
#source-display {
  white-space: pre-wrap;
  /* ... */
}
```

Already set. No change required.

## Data Models

The feature introduces no new data structures. The relevant data flow:

| Stage | Type | Notes |
|---|---|---|
| `textarea.value` | `string` | Raw user input; newlines preserved natively |
| `validate(text)` input | `string` | Same string, passed unchanged |
| `buildHighlightView(text)` input | `string` | Same string, passed unchanged |
| `tokens` array | `string[]` | Alternating whitespace/word tokens from `split(/(\S+)/)` |
| DOM text nodes | `Text` | Whitespace tokens including `\n` |
| DOM span elements | `HTMLSpanElement` | One per word token |

The round-trip fidelity invariant: concatenating all child node `textContent` values of `#source-display` in DOM order must equal the original `text` string passed to `buildHighlightView`.


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Validator correctness

*For any* string `text`, `validate(text)` returns `null` if and only if `text` contains at least one non-whitespace character (i.e., `/\S/.test(text)` is true). Strings composed entirely of spaces, tabs, newlines, or any combination thereof must return a non-null error object.

**Validates: Requirements 3.1, 3.2, 3.3**

### Property 2: Span count equals word count

*For any* string `text`, after calling `buildHighlightView(text)`, the number of `<span>` child elements in `#source-display` must equal the number of maximal non-whitespace runs in `text` (i.e., `text.match(/\S+/g)?.length ?? 0`). No whitespace-only token may produce a span.

**Validates: Requirements 2.1, 2.2**

### Property 3: Round-trip text fidelity

*For any* string `text`, after calling `buildHighlightView(text)`, concatenating the `textContent` of every child node of `#source-display` in DOM order must produce a string equal to `text`. No characters — including newlines, tabs, or multiple consecutive spaces — may be dropped, collapsed, or reordered.

**Validates: Requirements 4.1, 4.3, 5.2, 5.3**

---

## Error Handling

| Scenario | Handling |
|---|---|
| Empty input (no text) | `validate` returns `{ reason: 'empty' }`; error message shown; no view transition |
| Whitespace-only input (spaces, tabs, newlines) | Same as empty — `/\S/` does not match; error shown |
| Input with only newlines | Same as whitespace-only |
| Valid input with leading/trailing whitespace | Accepted — `validate` passes; whitespace preserved in source display |

No new error states are introduced. The existing error display path (`#error-msg`) handles all cases.

## Testing Strategy

### Dual Testing Approach

Both unit tests and property-based tests are required. They are complementary:

- Unit tests cover specific examples, integration points, and the CSS check
- Property tests verify universal correctness across randomly generated inputs

### Unit Tests

- E1: `#source-display` has `white-space: pre-wrap` set in the stylesheet
- E2: Calling `buildHighlightView("hello\nworld")` produces two spans with textContent `"hello"` and `"world"` and a text node containing `"\n"` between them
- E3: Clicking Start with a newline-only string (`"\n\n\n"`) shows the error message and does not transition to reader mode
- E4: Clicking Start with `"hello\nworld"` transitions to reader mode and the source display contains a visible newline between the two words

### Property-Based Tests

Use a property-based testing library (e.g., [fast-check](https://github.com/dubzzz/fast-check) for JavaScript). Configure each test to run a minimum of 100 iterations.

Each property test must be tagged with a comment in the format:
`// Feature: formatted-text-input, Property {N}: {property_text}`

**Property 1 test** — `fc.string()` generator covering arbitrary strings including whitespace-only and newline-heavy strings:
```
// Feature: formatted-text-input, Property 1: validate correctness
fc.assert(fc.property(fc.string(), text =>
  (validate(text) === null) === /\S/.test(text)
))
```

**Property 2 test** — `fc.string()` generator; after `buildHighlightView(text)`, count spans vs regex matches:
```
// Feature: formatted-text-input, Property 2: span count equals word count
fc.assert(fc.property(fc.string(), text => {
  buildHighlightView(text);
  const spanCount = sourceDisplay.querySelectorAll('span').length;
  const wordCount = (text.match(/\S+/g) || []).length;
  return spanCount === wordCount;
}))
```

**Property 3 test** — `fc.string()` generator; after `buildHighlightView(text)`, reconstruct text from DOM:
```
// Feature: formatted-text-input, Property 3: round-trip text fidelity
fc.assert(fc.property(fc.string(), text => {
  buildHighlightView(text);
  const reconstructed = Array.from(sourceDisplay.childNodes)
    .map(n => n.textContent).join('');
  return reconstructed === text;
}))
```

The `fc.string()` generator in fast-check produces strings with arbitrary Unicode, whitespace, newlines, and empty strings — covering all edge cases from Requirements 3.2, 4.3, and 5.2 without needing separate edge-case tests.
