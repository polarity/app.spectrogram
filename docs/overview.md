# Overview

## Purpose

`app.spectrogram` is a browser-based audio analysis tool focused on real-time spectrogram display. It listens to microphone input through the Web Audio API, paints a scrolling canvas view, overlays pitch-oriented guides, and lets the user pause the stream to sketch note regions for MIDI export.

## Stack

- HTML entry document with static control markup
- CSS stylesheet in `style.css`
- Vanilla JavaScript ES modules at repo root
- `http-server` for local development
- StandardJS configured as the linting style baseline

## Current State

- The app is functional as a small static web project with no framework or build step.
- Source files remain at repository root.
- Runtime asset and module paths are relative to `index.html`, so the app can be served from a nested base path.
- UI structure is largely static in `index.html`, while behavior is wired in `uiController.js`.
- The outer UI shell now uses a tokenized design layer inspired by `app.vectorscope`.
- Canvas overlay rendering still contains hard-coded visual values that have not been moved to shared theme tokens yet.
- The current documentation scaffold was added after the codebase, so it reflects the existing layout rather than a future `src/`-based structure.

## Known Limitations

- There is no automated test suite.
- `npm.cmd run lint` currently reports existing StandardJS issues.
- Browser microphone access requires a secure context and user permission.
- Drag-and-drop MIDI handling is optional in code and not currently exposed in the rendered UI.

## Near-Term Direction

- Keep the app framework-free.
- Improve repo navigation and contributor guidance first.
- Align the visual language with `app.vectorscope` at the brand level: shared background mood, surfaces, accent colors, buttons, and footer treatment.
- Preserve the spectrogram app's canvas-first, full-width feel instead of forcing it into the vectorscope's square layout.
