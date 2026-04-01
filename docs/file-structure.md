# File Structure

## Current Tree

```text
app.spectrogram/
|- .github/
|  `- instructions/
|     |- javascript.instructions.md
|     |- css.instructions.md
|     |- html.instructions.md
|     `- markdown.instructions.md
|- docs/
|  |- overview.md
|  |- file-structure.md
|  |- ideas.md
|  |- gui.md
|  `- design-system.md
|- img/
|- utils/
|  |- fft.js
|  |- mathHelpers.js
|  |- midiUtils.js
|  `- windowFunctions.js
|- AGENTS.md
|- README.md
|- index.html
|- style.css
|- main.js
|- uiController.js
|- audioHandler.js
|- spectrogramRenderer.js
|- colorThemes.js
|- timeFrequencyReassignment.js
|- package.json
|- package-lock.json
|- cert.pem
`- key.pem
```

## Responsibilities

- `index.html`: Declares the canvas container, primary action buttons, advanced controls, metadata, and footer links.
- `style.css`: Defines the current dark theme, control layout, canvas sizing, and footer styling.
- `main.js`: Creates the label canvas, sizes canvases, initializes the renderer, and hooks resize behavior.
- `uiController.js`: Connects DOM controls to audio, rendering, theme, and MIDI actions.
- `audioHandler.js`: Owns `AudioContext`, `AnalyserNode`, stream setup, stop/start lifecycle, and FFT size changes.
- `spectrogramRenderer.js`: Renders the scrolling spectrogram and overlays note guides and drawn MIDI note blocks.
- `colorThemes.js`: Stores the built-in color theme functions and custom color interpolation.
- `timeFrequencyReassignment.js`: Houses experimental analysis code for reassigned frequency output.
- `utils/`: Shared DSP and MIDI helper functions used by the renderer and reassignment path.
- `img/`: Favicon and social-preview assets referenced by `index.html`.
- `docs/`: Human-facing project context, structure, GUI notes, design direction, and backlog.
- `.github/instructions/`: File-type editing guidance for future automated or assisted edits.
- `cert.pem` and `key.pem`: Local HTTPS certificates used by the `npm start` server command.

## Layout Notes

- The repo currently uses a flat source layout at the root.
- There is no generated `src/`, `build/`, or `dist/` scaffold in this pass.
- Documentation should describe the current structure honestly until a future refactor moves files.
