import { toggleAudio, updateFFTSize, initAudio, getAudioData } from './audioHandler.js'
import { updateFrequencyRange, updateDbRange, updateContrastBrightness, drawFrequencyMarkers, updateSpectrogramm, updatePersistence, togglePause, exportToMidi, createMidiData, toggleReassignment } from './spectrogramRenderer.js'
import { updateTheme, updateCustomTheme } from './colorThemes.js'
import { saveMidiFile } from './utils/midiUtils.js'

let analyser, dataArray, audioContext

/**
 * Initializes all UI controls and their event listeners.
 * @param {HTMLCanvasElement} canvas - The main canvas element.
 * @param {HTMLCanvasElement} labelCanvas - The label canvas element.
 */
export function initUIControls (canvas, labelCanvas) {
  const toggleButton = document.getElementById('toggleButton')
  const exportMidiButton = document.getElementById('exportMidiButton')
  const showControlsButton = document.getElementById('showControlsButton')
  const controlsContainer = document.getElementById('controlsContainer')
  const frequencyRangeSlider = document.getElementById('frequencyRangeSlider')
  const minDbSlider = document.getElementById('minDbSlider')
  const maxDbSlider = document.getElementById('maxDbSlider')
  const contrastSlider = document.getElementById('contrastSlider')
  const brightnessSlider = document.getElementById('brightnessSlider')
  const themeSelect = document.getElementById('themeSelect')
  const customColorLow = document.getElementById('customColorLow')
  const customColorMid = document.getElementById('customColorMid')
  const customColorHigh = document.getElementById('customColorHigh')
  const fftSizeSelect = document.getElementById('fftSizeSelect')
  const persistenceSlider = document.getElementById('persistenceSlider')
  const pauseButton = document.getElementById('pauseButton')
  const dragMidiButton = document.getElementById('dragMidiButton')
  const reassignmentCheckbox = document.getElementById('useReassignment')

  // Hide controls by default
  controlsContainer.style.display = 'none'
  showControlsButton.textContent = 'Show Controls'

  initAudio()

  /**
   * Toggles the audio input on and off.
   * @returns {void}
   */
  toggleButton.addEventListener('click', () => {
    toggleAudio().then(isRunning => {
      toggleButton.textContent = isRunning ? 'Stop' : 'Start'
      if (isRunning) {
        ({ analyser, dataArray, audioContext } = getAudioData())
        function animate () {
          if (analyser && dataArray && audioContext) {
            updateSpectrogramm(analyser, dataArray, audioContext)
          }
          requestAnimationFrame(animate)
        }
        requestAnimationFrame(animate)
      }
    })
  })

  exportMidiButton.addEventListener('click', () => {
    exportToMidi()
  })
  canvas.addEventListener('click', handleCanvasClick)
  showControlsButton.addEventListener('click', toggleControls)

  frequencyRangeSlider.addEventListener('input', (event) => {
    const maxFreq = Math.pow(10, event.target.value)
    updateFrequencyRange(maxFreq)
  })

  minDbSlider.addEventListener('input', updateDbRangeFromUI)
  maxDbSlider.addEventListener('input', updateDbRangeFromUI)

  contrastSlider.addEventListener('input', updateContrastBrightnessFromUI)
  brightnessSlider.addEventListener('input', updateContrastBrightnessFromUI)

  themeSelect.addEventListener('change', (event) => {
    updateTheme(event.target.value)
    if (event.target.value === 'custom') {
      document.getElementById('customThemeControls').style.display = 'grid'
    } else {
      document.getElementById('customThemeControls').style.display = 'none'
    }
  })

  /**
   * Updates the custom color theme.
   * @param {string} color - The color in hex format.
   * @param {number} index - The index of the color to update (0-2).
   * @returns {void}
   */
  customColorLow.addEventListener('change', (event) => updateCustomTheme(event.target.value, 0))
  customColorMid.addEventListener('change', (event) => updateCustomTheme(event.target.value, 1))
  customColorHigh.addEventListener('change', (event) => updateCustomTheme(event.target.value, 2))

  fftSizeSelect.addEventListener('change', (event) => {
    updateFFTSize(parseInt(event.target.value))
  })

  persistenceSlider.addEventListener('input', (event) => {
    const value = parseFloat(event.target.value)
    updatePersistence(value)
    document.getElementById('persistenceValue').textContent = value.toFixed(2)
  })

  // save initial text
  const pauseButtonTextInitial = pauseButton.textContent
  // toggle pause and change text
  pauseButton.addEventListener('click', () => {
    const isPaused = togglePause()
    pauseButton.textContent = isPaused ? 'Resume' : pauseButtonTextInitial
  })

  // Initial setup
  updateFrequencyRangeFromUI()
  updateDbRangeFromUI()
  updateContrastBrightnessFromUI()

  // Draw frequency markers immediately after initialization
  drawFrequencyMarkers()

  /**
     * Updates the frequency range based on the UI slider value.
     * @returns {void}
     */
  function updateFrequencyRangeFromUI () {
    const frequencyRangeSlider = document.getElementById('frequencyRangeSlider')
    const maxFreq = Math.pow(10, frequencyRangeSlider.value)
    updateFrequencyRange(maxFreq)
    // drawFrequencyMarkers is now called inside updateFrequencyRange
  }

  /**
   * Updates the minimum and maximum decibel (dB) range.
   * @returns {void}
   */
  function updateDbRangeFromUI () {
    const minDb = parseFloat(minDbSlider.value)
    const maxDb = parseFloat(maxDbSlider.value)
    updateDbRange(Math.min(minDb, maxDb - 0.1), maxDb)
    // Format with one decimal place
    document.getElementById('minDbValue').textContent = minDb.toFixed(1)
    document.getElementById('maxDbValue').textContent = maxDb.toFixed(1)
  }

  /**
     * Updates the contrast and brightness of the spectrogram.
     * @returns {void}
     */
  function updateContrastBrightnessFromUI () {
    const contrast = parseFloat(contrastSlider.value)
    const brightness = parseFloat(brightnessSlider.value)
    updateContrastBrightness(contrast, brightness)
  }

  /**
   * Toggles the visibility of the controls container.
   * @returns {void}
   */
  function toggleControls () {
    const controlsContainer = document.getElementById('controlsContainer')
    const showControlsButton = document.getElementById('showControlsButton')

    /**
         * Toggles the visibility of the controls container.
         * @returns {void}
         */
    if (controlsContainer.style.display === 'none') {
      controlsContainer.style.display = 'grid'
      showControlsButton.textContent = 'Hide Controls'
    } else {
      controlsContainer.style.display = 'none'
      showControlsButton.textContent = 'Show Controls'
    }
  }

  /**
   * Handles the click event on the canvas.
   * @param {MouseEvent} event - The click event object.
   * @returns {void}
   */
  function handleCanvasClick (event) {
    // Implementation for drawing note blocks
    // console.log('Canvas clicked at:', event.offsetX, event.offsetY)
  }

  function updateCrosshair (event) {
    const canvas = document.getElementById('spectrogram')
    const rect = canvas.getBoundingClientRect()

    // Berechne die relativen Koordinaten innerhalb des Canvas
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    // Skaliere die Koordinaten entsprechend dem Canvas-Verhältnis
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    return {
      x: x * scaleX,
      y: y * scaleY
    }
  }

  // Drag & Drop Setup
  if (dragMidiButton) {
    dragMidiButton.setAttribute('draggable', 'true')

    dragMidiButton.addEventListener('dragstart', (e) => {
      const midiData = createMidiData()
      if (!midiData) return

      // Erstelle die MIDI-Datei als Blob
      const header = [
        0x4D, 0x54, 0x68, 0x64, // MThd
        0x00, 0x00, 0x00, 0x06, // Header size
        0x00, 0x01, // Format 1
        0x00, 0x01, // One track
        (midiData.ticksPerBeat >> 8) & 0xFF, midiData.ticksPerBeat & 0xFF // Ticks per beat
      ]

      // Track data
      const track = midiData.tracks[0]
      const events = []

      // Track name
      events.push([0x00, 0xFF, 0x03, track.name.length, ...track.name.split('').map(c => c.charCodeAt(0))])

      // Set tempo (120 BPM = 500000 microseconds per beat)
      events.push([0x00, 0xFF, 0x51, 0x03, 0x07, 0xA1, 0x20])

      // Note events
      track.notes.forEach(note => {
        events.push([note.startTime, 0x90, note.noteNumber, note.velocity]) // Note On
        events.push([note.startTime + note.duration, 0x80, note.noteNumber, 0]) // Note Off
      })

      // Sort events by time
      events.sort((a, b) => a[0] - b[0])
      const midiArray = new Uint8Array([...header, ...events.flat()])

      // Erstelle einen Blob und eine URL
      const blob = new Blob([midiArray], { type: 'audio/midi' })
      const url = URL.createObjectURL(blob)

      // Setze die URL als Drag-Daten
      e.dataTransfer.setData('DownloadURL', `audio/midi:spectrogram_notes.mid:${url}`)
      e.dataTransfer.setData('text/uri-list', url)
      e.dataTransfer.setData('text/plain', 'spectrogram_notes.mid')

      // Setze den effektiven MIME-Type
      e.dataTransfer.effectAllowed = 'copy'

      // Visuelles Feedback
      dragMidiButton.classList.add('dragging')

      // Custom Drag Image
      const dragImage = document.createElement('div')
      dragImage.textContent = 'MIDI'
      dragImage.style.fontSize = '18px'
      dragImage.style.padding = '6px 10px'
      dragImage.style.background = '#182127'
      dragImage.style.color = '#f3f8fb'
      dragImage.style.borderRadius = '10px'
      document.body.appendChild(dragImage)
      e.dataTransfer.setDragImage(dragImage, 12, 12)
      setTimeout(() => document.body.removeChild(dragImage), 0)
    })

    dragMidiButton.addEventListener('dragend', (e) => {
      dragMidiButton.classList.remove('dragging')
      // Cleanup URLs
      const url = e.dataTransfer.getData('text/uri-list')
      if (url) {
        URL.revokeObjectURL(url)
      }
    })
  }

  reassignmentCheckbox.addEventListener('change', (event) => {
    toggleReassignment(event.target.checked)
  })
}
