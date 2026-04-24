# Tasks: Preferences Persistence

## Task List

- [x] 1. Add PreferenceManager to speed-reader.html
  - [x] 1.1 Define `PreferenceManager.PREFS` with `WPM` and `FONT` descriptor objects (each containing `key`, `default`, and either `min`/`max` or `values`)
  - [x] 1.2 Implement `save(descriptor, value)` — writes `String(value)` to `descriptor.key` in localStorage, swallowing exceptions
  - [x] 1.3 Implement `load(descriptor)` — reads from `descriptor.key`, validates against `descriptor.min`/`max` (numeric) or `descriptor.values` (enum), returns `descriptor.default` on any failure

- [x] 2. Wire save on preference change
  - [x] 2.1 Call `PreferenceManager.save(PREFS.WPM, clampedValue)` inside the existing `wpmInput` change handler
  - [x] 2.2 Call `PreferenceManager.save(PREFS.FONT, fontSelect.value)` inside the existing `fontSelect` change handler

- [x] 3. Restore preferences on app init
  - [x] 3.1 On page load, call `PreferenceManager.load(PREFS.WPM)` and apply to `wpmInput.value` and `state.wpm`
  - [x] 3.2 On page load, call `PreferenceManager.load(PREFS.FONT)` and apply to `fontSelect.value` and `wordDisplay.style.fontFamily`

- [x] 4. Drive UI controls from descriptors
  - [x] 4.1 Populate font `<select>` options by iterating `PREFS.FONT.values` instead of hardcoding `<option>` elements
  - [x] 4.2 Set WPM `<input>` `min` and `max` attributes from `PREFS.WPM.min` and `PREFS.WPM.max`

- [x] 5. Write tests
  - [x] 5.1 Add unit tests for `load` returning `descriptor.default` for out-of-range WPM (59, 1001, NaN, `"abc"`) and invalid font strings
  - [x] 5.2 Add unit test for `load` returning `descriptor.default` when the key is absent
  - [x] 5.3 Add unit test for `load` returning `descriptor.default` when `localStorage` throws
  - [x] 5.4 Add property-based tests for P1–P4 using fast-check (min 100 iterations each), with generators derived from `PREFS.WPM.min`/`max` and `PREFS.FONT.values`
