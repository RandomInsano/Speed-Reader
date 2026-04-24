# Requirements Document

## Introduction

This feature enhances the Speed Reader app's text input area to accept and preserve formatted text. Currently the app uses a plain `<textarea>` which loses structural intent when text is tokenized into words. With this feature, the user can paste text containing newlines and other whitespace, and the source display will preserve that formatting visually while playback proceeds word by word without any special pausing at whitespace boundaries.

## Glossary

- **App**: The single-file HTML speed reader application
- **Input_View**: The initial screen where the user pastes text and initiates reading
- **Formatted_Input**: The editable content area (replacing the plain `<textarea>`) that accepts and preserves formatted text including newlines
- **Reader_View**: The screen displayed after valid text is submitted, containing the word display, controls, and source highlight view
- **AppState**: The central plain-object state store holding all mutable reader state
- **Word_Display**: The large centered element that shows the current word one at a time
- **Playback_Engine**: The component responsible for automatic word advancement using `setTimeout`
- **Source_Highlighter**: The component that builds the source text DOM and highlights the current word
- **Word_Span**: A `<span>` DOM element wrapping a single whitespace-delimited word in the source display
- **Validator**: The `validate(text)` function that checks whether input text is suitable for reading
- **WPM**: Words per minute — the playback speed setting (range: 60–1000, default: 200)

## Requirements

### Requirement 1: Formatted Text Input Area

**User Story:** As a user, I want to paste formatted text into the input area and have newlines and whitespace preserved, so that the structure of my text is not lost before reading begins.

#### Acceptance Criteria

1. THE Formatted_Input SHALL accept multi-line text input including newlines.
2. WHEN the user pastes text into the Formatted_Input, THE Formatted_Input SHALL preserve all newline characters exactly as pasted.
3. THE Formatted_Input SHALL visually display line breaks and paragraph structure so the user can verify the formatting before starting.
4. WHEN the user clicks Start, THE App SHALL read the raw text content from the Formatted_Input, preserving all whitespace including newlines.
5. THE Formatted_Input SHALL support the same keyboard interactions as a standard text area (typing, pasting, selecting, deleting).

---

### Requirement 2: Tokenization of Formatted Text

**User Story:** As a developer, I want the text tokenizer to split input into word tokens, so that playback advances word by word while the source display preserves the original whitespace layout.

#### Acceptance Criteria

1. WHEN tokenizing input text, THE Source_Highlighter SHALL identify each whitespace-delimited sequence of non-whitespace characters as a Word_Span token.
2. WHEN tokenizing input text, THE Source_Highlighter SHALL treat all whitespace between words (spaces, tabs, newlines) as inter-word spacing that is preserved in the source display but does not produce separate tokens.
3. THE Source_Highlighter SHALL preserve the original whitespace structure in the source display using `white-space: pre-wrap` so the formatted layout is visible to the user.

---

### Requirement 3: Validation of Formatted Input

**User Story:** As a user, I want the app to validate my formatted input the same way it validates plain text, so that I cannot start reading with an empty or whitespace-only input.

#### Acceptance Criteria

1. WHEN the user clicks Start, THE Validator SHALL check whether the Formatted_Input contains at least one non-whitespace word.
2. IF the Formatted_Input contains only whitespace or newlines, THEN THE Validator SHALL return an error and THE Input_View SHALL display an inline validation message without switching to reader mode.
3. WHEN the Formatted_Input contains at least one word, THE Validator SHALL return `null` and THE App SHALL transition to reader mode.

---

### Requirement 4: Preservation of Formatting in Source Display

**User Story:** As a user, I want the source text display in reader mode to show the original formatting of my text, so that I can see the structure while reading.

#### Acceptance Criteria

1. WHEN the source display is built, THE Source_Highlighter SHALL render the text with its original newlines intact.
2. THE Source_Highlighter SHALL use `white-space: pre-wrap` on the source display element so that newlines render as visible line breaks.
3. THE Source_Highlighter SHALL NOT collapse multiple newlines into a single line break — each newline in the original text SHALL produce a corresponding line break in the rendered source display.

---

### Requirement 5: Round-Trip Text Fidelity

**User Story:** As a developer, I want the text extracted from the Formatted_Input to exactly match what the user pasted, so that no formatting information is silently lost between input and tokenization.

#### Acceptance Criteria

1. THE App SHALL extract text from the Formatted_Input such that re-inserting the extracted text into a new Formatted_Input produces an identical display.
2. FOR ALL valid formatted text inputs, the sequence of Word_Span tokens produced by tokenization SHALL account for every non-whitespace character in the original input (no characters are silently dropped).
3. THE Source_Highlighter SHALL reconstruct the full original text by concatenating all Word_Span text content and all inter-word text nodes in DOM order.
