# Agents Guide

This file gives coding agents a project-specific guide for `app.spectrogram`.

## Project Scope

- This repository is a browser-based audio spectrogram app built with vanilla HTML, CSS, and JavaScript modules.
- The app captures live microphone input, renders a scrolling spectrogram on canvas, overlays note and frequency guides, and can export drawn note blocks to MIDI.
- Keep changes framework-free unless the user explicitly asks for a stack change.

## Architecture Map

- `index.html`: Entry document, metadata, canvas container, control markup, and module bootstrap.
- `style.css`: Current layout and styling for the canvas area, controls, and footer.
- `main.js`: DOM bootstrap, canvas sizing, label canvas creation, renderer init, and resize handling.
- `uiController.js`: UI wiring for buttons, sliders, selectors, pause mode, and MIDI export flow.
- `audioHandler.js`: Web Audio setup, microphone access, analyser lifecycle, and FFT size updates.
- `spectrogramRenderer.js`: Spectrogram drawing, note overlay logic, frequency markers, pause/draw behavior, and MIDI note extraction.
- `colorThemes.js`: Spectrogram color ramp definitions and custom theme interpolation.
- `timeFrequencyReassignment.js`: Experimental reassignment analysis path.
- `utils/midiUtils.js`: MIDI conversion and file download helpers.
- `utils/fft.js`, `utils/mathHelpers.js`, `utils/windowFunctions.js`: DSP utilities used by reassignment code.

## Docs Map

- `README.md`: User-facing setup, usage, and concise structure summary.
- `docs/overview.md`: Project purpose, stack, current state, and known constraints.
- `docs/file-structure.md`: Text tree and responsibilities for the current flat repo layout.
- `docs/ideas.md`: Backlog and future improvement notes.
- `docs/gui.md`: Current UI inventory and layout behavior.
- `docs/design-system.md`: Target visual system for aligning with `app.vectorscope` while keeping the spectrogram layout distinct.
- `.github/instructions/`: File-type-specific editing guidance for future runs.

## Conventions To Follow

- JavaScript style follows StandardJS conventions used by the repo:
  - 2-space indentation
  - No semicolons
  - Keep functions small and focused
- Preserve the current separation between HTML structure, UI wiring, audio setup, rendering, and utility helpers.
- Add or maintain JSDoc for exported functions and non-obvious logic.
- Keep UI styling in CSS rather than inline styles or hard-coded JavaScript style constants.
- When visual work starts, centralize reusable tokens instead of adding more hard-coded colors to `style.css` and canvas code.

## Documentation Rules

- Keep `README.md`, `AGENTS.md`, and the docs directory aligned with actual behavior.
- Document current behavior only. Do not present experimental or incomplete code paths as finished features.
- If module responsibilities move, update this file and `docs/file-structure.md` in the same pass.
- If the visual system changes, update `docs/design-system.md` and the CSS/HTML instructions together.

## Agent Workflow

1. Read the touched module and the related docs before editing.
2. Make minimal, focused changes that match the current architecture.
3. For UI work, preserve the spectrogram app's wide canvas-first composition unless the user explicitly asks for a layout rewrite.
4. Prefer documenting current limitations rather than silently papering over them.
5. Run local verification when possible:
   - `npm.cmd run lint`
   - `npm.cmd start`

## Known Constraints

- There is no automated test suite.
- `npm.cmd run lint` currently fails on pre-existing StandardJS issues.
- Microphone capture depends on browser permissions and a secure context.
- The source layout is currently flat at repo root rather than split into `src/`.
- `uiController.js` still references a `dragMidiButton` element that is commented out in `index.html`; treat drag-and-drop MIDI support as incomplete until the DOM and script are reconciled.
