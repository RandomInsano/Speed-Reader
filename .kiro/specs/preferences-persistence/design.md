# Design Document: Preferences Persistence

## Overview

This feature adds a `PreferenceManager` module to the Speed Reader app that saves and restores user preferences (WPM and font family) using the browser's `localStorage` API. The module is a thin, pure utility — it has no UI of its own and integrates into the existing event handlers and app initialisation code in `speed-reader.html`.

## Architecture

The feature is implemented as a single self-contained object (`PreferenceManager`) defined in a `<script>` block inside `speed-reader.html`, consistent with the app's existing single-file architecture.

```
┌─────────────────────────────────────────────────────┐
│                  speed-reader.html                  │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │              PreferenceManager               │   │
│  │  PREFS = { WPM: descriptor, FONT: descriptor}│   │
│  │  save(descriptor, value)                     │   │
│  │  load(descriptor)                            │   │
│  └──────────────────────────────────────────────┘   │
│           ▲ save on change    ▲ load on init        │
│           │                  │                      │
│  wpmInput.change    document DOMContentLoaded       │
│  fontSelect.change                                  │
└─────────────────────────────────────────────────────┘
```

All `localStorage` access is wrapped in `try/catch` so that security errors (e.g. private browsing with storage blocked) never crash the app.

## Components and Interfaces

### Preference Descriptor

Each preference is defined as a single descriptor object that co-locates its storage key, default value, validation constraints, and the allowed-values list used to populate UI controls. Adding a new preference (e.g. a new font or a new numeric setting) requires touching only one place.

```js
// Numeric preference descriptor
{
  key:      'speedreader.wpm',   // localStorage key
  default:  200,                 // fallback value
  min:      60,                  // inclusive lower bound
  max:      1000,                // inclusive upper bound
}

// Enum preference descriptor
{
  key:      'speedreader.font',
  default:  'sans-serif',
  values:   ['sans-serif', 'serif', 'monospace'],  // drives <select> options
}
```

Accessors `.min` / `.max` are read by the numeric validator and can also be used to set `<input min>` / `<input max>` attributes. The `.values` array is iterated to build `<option>` elements, so adding a new font means appending one string here.

### PreferenceManager

```js
const PreferenceManager = {
  PREFS: {
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
  },

  // Persist a value. Silently swallows storage errors.
  save(descriptor, value) { ... },

  // Read, validate, and return a stored value.
  // Returns descriptor.default when the key is absent, invalid, or storage throws.
  load(descriptor) { ... },
};
```

**`save(descriptor, value)`**
- Calls `localStorage.setItem(descriptor.key, String(value))` inside a `try/catch`.
- On any exception, does nothing (silent fallback).

**`load(descriptor)`**
- Calls `localStorage.getItem(descriptor.key)` inside a `try/catch`.
- If an exception is thrown, returns `descriptor.default`.
- If the stored value is `null` (key absent), returns `descriptor.default`.
- Validates the raw string using the descriptor's constraints:
  - Numeric: parses to integer, checks `>= descriptor.min` and `<= descriptor.max`.
  - Enum: checks `descriptor.values.includes(raw)`.
- Returns the typed value if valid, otherwise `descriptor.default`.

### Integration Points

| Event | Action |
|---|---|
| `wpmInput` `change` | `PreferenceManager.save(PREFS.WPM, clampedValue)` |
| `fontSelect` `change` | `PreferenceManager.save(PREFS.FONT, fontSelect.value)` |
| App init (inline `<script>`) | Load both prefs and apply to inputs + state |
| UI build (font `<select>`) | Iterate `PREFS.FONT.values` to generate `<option>` elements |
| WPM `<input>` attributes | Read `PREFS.WPM.min` / `PREFS.WPM.max` for `min`/`max` attributes |

## Data Models

### localStorage Schema

| Key | Type stored | Example |
|---|---|---|
| `speedreader.wpm` | String (numeric) | `"350"` |
| `speedreader.font` | String | `"serif"` |

### Preference Descriptors

| Preference | Key | Default | Constraints |
|---|---|---|---|
| WPM | `speedreader.wpm` | `200` | `min: 60`, `max: 1000` (integer) |
| Font family | `speedreader.font` | `"sans-serif"` | `values: ['sans-serif', 'serif', 'monospace']` |


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: WPM save/load round-trip

*For any* integer WPM value in the range [60, 1000], saving it with `PreferenceManager.save(PREFS.WPM, value)` and then loading it with `PreferenceManager.load(PREFS.WPM)` should return the same integer value.

**Validates: Requirements 1.1**

### Property 2: Font save/load round-trip

*For any* valid font family string from `PREFS.FONT.values`, saving it with `PreferenceManager.save(PREFS.FONT, value)` and then loading it with `PreferenceManager.load(PREFS.FONT)` should return the same string.

**Validates: Requirements 1.2**

### Property 3: Out-of-range WPM is rejected

*For any* integer outside `[PREFS.WPM.min, PREFS.WPM.max]`, `PreferenceManager.load(PREFS.WPM)` should return `PREFS.WPM.default` (200).

**Validates: Requirements 3.1**

### Property 4: Invalid font string is rejected

*For any* string not present in `PREFS.FONT.values`, `PreferenceManager.load(PREFS.FONT)` should return `PREFS.FONT.default` (`sans-serif`).

**Validates: Requirements 3.2**

### Property 5: Missing key returns default (edge case: absent storage entry)

When `localStorage` contains no entry for a given descriptor's key, `PreferenceManager.load(descriptor)` should return `descriptor.default`.

**Validates: Requirements 2.4**

### Property 6: localStorage exception returns default (edge case: storage throws)

When `localStorage.getItem` or `localStorage.setItem` throws an exception, `PreferenceManager.load` and `PreferenceManager.save` should not propagate the exception and `load` should return `descriptor.default`.

**Validates: Requirements 3.3**

## Error Handling

| Scenario | Behaviour |
|---|---|
| `localStorage` throws on `getItem` | `load` catches, returns `descriptor.default` |
| `localStorage` throws on `setItem` | `save` catches, does nothing |
| Stored WPM is non-numeric or outside `[min, max]` | `load` returns `descriptor.default` |
| Stored font is not in `descriptor.values` | `load` returns `descriptor.default` |
| Stored value is `null` (key absent) | `load` returns `descriptor.default` immediately |

No errors are surfaced to the user — all failures degrade silently to defaults, keeping the app functional.

## Testing Strategy

The user noted this feature does not need exhaustive testing. The strategy below is intentionally lightweight.

### Unit / Example Tests

- `PreferenceManager.load(PREFS.WPM)` returns `PREFS.WPM.default` for boundary values just outside the range (59, 1001, NaN, `"abc"`).
- `PreferenceManager.load(PREFS.FONT)` returns `PREFS.FONT.default` for each of the three valid values and for an arbitrary invalid string.
- `PreferenceManager.load` returns `descriptor.default` when the key is absent.
- `PreferenceManager.load` returns `descriptor.default` when `localStorage` throws.

### Property-Based Tests

Use a property-based testing library (e.g. [fast-check](https://github.com/dubzzz/fast-check) for JavaScript) with a minimum of 100 iterations per property.

Each test must include a comment referencing its design property:
`// Feature: preferences-persistence, Property N: <property text>`

| Property | Generator | Assertion |
|---|---|---|
| P1: WPM round-trip | `fc.integer({ min: PREFS.WPM.min, max: PREFS.WPM.max })` | `load(PREFS.WPM)` after `save(PREFS.WPM, wpm)` equals `wpm` |
| P2: Font round-trip | `fc.constantFrom(...PREFS.FONT.values)` | `load(PREFS.FONT)` after `save(PREFS.FONT, font)` equals `font` |
| P3: Invalid WPM rejected | `fc.integer().filter(n => n < PREFS.WPM.min \|\| n > PREFS.WPM.max)` | `load(PREFS.WPM)` returns `PREFS.WPM.default` |
| P4: Invalid font rejected | `fc.string().filter(s => !PREFS.FONT.values.includes(s))` | `load(PREFS.FONT)` returns `PREFS.FONT.default` |

Properties P5 and P6 (missing key, storage throws) are covered by the unit/example tests above since they are deterministic edge cases rather than value-range properties.
