# Design System

This project should evolve toward the same product family as `app.vectorscope`, but it should not copy the vectorscope layout wholesale.

## Current State

- `style.css` now defines a shared shell palette with vectorscope-inspired background, surface, border, and accent tokens.
- The overall app chrome, buttons, panels, and footer follow the same vendor family as `app.vectorscope`.
- Canvas overlay colors and typography are still hard-coded inside `spectrogramRenderer.js`, so the shell and the drawing layer are not fully unified yet.

## Target Direction

- Reuse the vendor language established in `app.vectorscope`:
  - layered dark backgrounds
  - distinct surface panels
  - cyan-forward accent colors
  - cleaner borders and focus states
  - consistent footer and link treatment
- Keep the spectrogram layout canvas-first and horizontally expansive.
- Treat the vectorscope project as a visual reference, not a mandate for identical structure.

## Token Plan

The shell token layer now covers:

- background gradients and glow
- surface, surface-strong, and overlay panels
- border and border-strong values
- text and muted text
- accent, accent-hover, and focus colors
- spacing, radii, and shadows

Still missing from the shared system:

- spectrogram-specific overlay lines
- note highlight colors
- canvas text colors
- default theme ramps for the spectrogram rendering itself

## Canvas Integration

- Canvas drawing should read shared tokens instead of duplicating palette values in JavaScript.
- Frequency lines, piano-key styling, hover crosshair, and note overlays should map to the same token system used by DOM controls.
- Any future color-theme picker should coexist with the app shell palette rather than redefining the entire UI theme.

## UI Rules

- Keep primary controls visually stronger than secondary or experimental controls.
- Preserve obvious affordances for `Start`, pause/draw, and export actions.
- Avoid flattening the interface into a generic settings panel; the canvas remains the main product surface.
- Prefer semantic tokens over raw color literals in both CSS and JavaScript.
