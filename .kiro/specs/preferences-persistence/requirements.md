# Requirements Document

## Introduction

This feature adds persistence for user preferences in the Speed Reader app. When a user adjusts reading speed (WPM) or font style, those values are saved to the browser's localStorage and automatically restored the next time the app is loaded. This removes the need to reconfigure the app on every visit.

## Glossary

- **Preference_Manager**: The component responsible for reading and writing user preferences to localStorage.
- **Preferences**: The set of user-configurable values: WPM (words per minute) and font family.
- **WPM**: Words per minute — an integer between 60 and 1000 controlling playback speed.
- **Font_Family**: The font style applied to the word display, one of: `sans-serif`, `serif`, or `monospace`.
- **App**: The Speed Reader single-page application.

## Requirements

### Requirement 1: Save Preferences on Change

**User Story:** As a reader, I want my WPM and font preferences saved automatically when I change them, so that I don't have to reconfigure the app on every visit.

#### Acceptance Criteria

1. WHEN the user changes the WPM value, THE Preference_Manager SHALL persist the new WPM value to localStorage under a defined key.
2. WHEN the user changes the font selection, THE Preference_Manager SHALL persist the new font family value to localStorage under a defined key.

---

### Requirement 2: Restore Preferences on Load

**User Story:** As a reader, I want my previously saved preferences applied when the app loads, so that the app feels personalised from the start.

#### Acceptance Criteria

1. WHEN the App initialises, THE Preference_Manager SHALL read WPM and font family values from localStorage.
2. WHEN a saved WPM value exists in localStorage, THE App SHALL apply that value to the WPM input and the playback state.
3. WHEN a saved font family value exists in localStorage, THE App SHALL apply that value to the font selector and the word display.
4. WHEN no saved preferences exist in localStorage, THE App SHALL use the default values of 200 WPM and `sans-serif` font.

---

### Requirement 3: Validate Restored Preferences

**User Story:** As a reader, I want the app to handle corrupt or out-of-range stored values gracefully, so that a bad localStorage entry never breaks the app.

#### Acceptance Criteria

1. WHEN a stored WPM value is outside the range 60–1000, THE Preference_Manager SHALL discard it and use the default value of 200 WPM.
2. WHEN a stored font family value is not one of the accepted values (`sans-serif`, `serif`, `monospace`), THE Preference_Manager SHALL discard it and use the default value of `sans-serif`.
3. IF localStorage access throws an exception, THEN THE Preference_Manager SHALL silently fall back to default values and continue normal operation.
