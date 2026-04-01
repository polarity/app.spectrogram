# Audio Spectrogram

Audio Spectrogram is a browser-based audio spectrogram visualizer built with vanilla HTML, CSS, and JavaScript modules. It captures live microphone input, renders a scrolling spectrogram on canvas, and includes note-drawing and MIDI export tools.

Try it on the web: [Demo](https://bit.ly/3Z1b7xm)

## Features

- Real-time spectrogram rendering from live audio input
- Log-frequency overlay with piano-key and frequency guides
- Adjustable frequency range, dB window, contrast, and brightness
- Multiple color themes plus a custom three-color ramp
- FFT size selection up to `32768`
- Pause mode for drawing note regions directly on the spectrogram
- MIDI export from drawn notes
- Frequency reassignment mode for sharper tonal ridges
- Tonal stability control for emphasizing sustained harmonics

## Requirements

- A modern browser with Web Audio and microphone access
- Node.js and npm for the local development server
- Local HTTPS support, because microphone capture depends on a secure context

## Installation

1. Clone the repository.
2. Open a terminal in `app.spectrogram`.
3. Install dependencies:

```bash
npm install
```

4. Start the local server:

```bash
npm start
```

5. Open the local URL printed by `http-server`. The current setup serves the app with the bundled `cert.pem` and `key.pem`.

## Usage

1. Open the app in your browser.
2. Click `Start` and allow microphone access.
3. Use `Pause / Note Draw` to freeze the display and draw note regions on the canvas.
4. Click `Export MIDI` to save the drawn notes as a MIDI file.
5. Open `Show Controls` to adjust frequency range, dB limits, FFT size, themes, persistence, and reassignment.

## Project Structure

```text
app.spectrogram/
|- index.html
|- style.css
|- main.js
|- uiController.js
|- audioHandler.js
|- spectrogramRenderer.js
|- colorThemes.js
|- timeFrequencyReassignment.js
|- utils/
|  |- midiUtils.js
|  |- fft.js
|  |- mathHelpers.js
|  `- windowFunctions.js
|- docs/
|  |- overview.md
|  |- file-structure.md
|  |- ideas.md
|  |- gui.md
|  `- design-system.md
|- .github/
|  `- instructions/
`- AGENTS.md
```

## Development Notes

- The source currently lives at the repository root; this pass does not move files into `src/`.
- Runtime asset and module references are document-relative, so the app can be hosted from a subdirectory instead of only from a site root.
- `npm run lint` currently reports pre-existing StandardJS issues. The documentation reflects that baseline and does not claim a clean lint pass.
- The codebase contains unfinished UI paths, including drag-and-drop MIDI handling that is wired in JavaScript but not currently exposed in `index.html`.

## Documentation

- Operational guidance for coding agents lives in [AGENTS.md](AGENTS.md).
- Project overview and structure notes live in [docs/overview.md](docs/overview.md) and [docs/file-structure.md](docs/file-structure.md).
- UI and branding direction live in [docs/gui.md](docs/gui.md) and [docs/design-system.md](docs/design-system.md).
