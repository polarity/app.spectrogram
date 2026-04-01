# GUI Notes

## Current Layout

- The app now uses a vendor-style shell with a full-width canvas stage and panelized controls below it.
- The spectrogram canvas expands to fill a large viewport-driven stage instead of a small fixed-height strip.
- A separate label overlay canvas still sits above the main spectrogram canvas.
- Primary actions live in a dedicated button panel below the stage.
- Advanced settings live in `#controlsContainer`, which is hidden by default and toggled by `Show Controls`.
- The footer remains a cross-link strip to related tools, but now shares the same visual family as `app.vectorscope`.

## Current Control Inventory

- Primary buttons:
  - `Start`
  - `Pause / Note Draw`
  - `Export MIDI`
  - `Show Controls`
- Advanced controls:
  - `Frequency Range`
  - `Min dB`
  - `Max dB`
  - `Contrast`
  - `Brightness`
  - `Color Theme`
  - Custom low, mid, and high colors when `custom` theme is selected
  - `FFT Size`
  - `Tonal Persistence (wip)`
  - `Use Reassignment (wip)`

## Canvas Interaction

- The label canvas overlays piano-style note guides and log-frequency marker lines.
- Hovering the canvas shows a crosshair and a small note/frequency info box.
- In pause mode, mouse drag creates note regions on the overlay.
- Double-clicking a drawn note region deletes it.
- MIDI export is based on the currently drawn note regions rather than live pitch tracking.

## Responsive Behavior

- Width is fluid and the canvas uses a large viewport-based minimum height.
- Controls switch from multi-column rows to stacked single-column groups on smaller screens.
- There is still no dedicated touch-first interaction model for note drawing.

## Future Direction

- Preserve the spectrogram app's wide, immersive canvas feel.
- Continue bringing canvas overlay colors into the same token system as the surrounding shell.
- Refine the hierarchy between primary, secondary, and experimental controls.
- Keep the shell minimal so the canvas remains the first visual element.
