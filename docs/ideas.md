# Ideas

This file is a backlog, not a promise list. Items here describe likely cleanup or enhancement directions based on the current codebase.

## Documentation And Structure

- Decide whether the long-term source layout should stay flat or move to `src/`.
- Keep `README.md`, `AGENTS.md`, and `docs/file-structure.md` synchronized whenever modules move.
- Add a small troubleshooting section once the most common microphone and HTTPS issues are known.

## UI And Design System

- Introduce CSS custom properties for background, surfaces, borders, text, links, and accent colors.
- Align the palette and control styling with `app.vectorscope` so both apps feel like the same vendor family.
- Preserve the wide spectrogram composition instead of inheriting the vectorscope's square layout.
- Replace scattered hard-coded fonts and colors in canvas overlays with shared theme tokens.
- Revisit mobile behavior and full-viewport usage if the spectrogram should become truly height-filling.

## Frontend Cleanup

- Reconcile `uiController.js` with the actual DOM. The drag-and-drop MIDI path should either be restored in HTML or removed from the controller.
- Reduce direct DOM lookups and repeated inline state handling inside `uiController.js`.
- Consider moving more layout-specific markup generation out of `index.html` only if that makes the UI easier to maintain.

## Audio And DSP

- Revisit reassignment defaults and document the expected output quality before presenting it as a stable feature.
- Add audio input device selection if the project needs parity with the other analyzer tools.
- Review FFT size options against analyser and performance behavior in real browsers.

## Quality And Tooling

- Clean up the current StandardJS lint failures.
- Add a lightweight smoke-test or manual verification checklist for core flows.
- Verify browser compatibility for `Blob`, `requestAnimationFrame`, `performance`, and microphone APIs if stricter lint environments are required.
