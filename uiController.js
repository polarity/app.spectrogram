import { toggleAudio, updateFFTSize, initAudio, getAudioData } from './audioHandler.js'
import { updateFrequencyRange, updateDbRange, updateContrastBrightness, drawFrequencyMarkers, updateSpectrogramm, updatePersistence, togglePause, exportToMidi, createMidiData, toggleReassignment } from './spectrogramRenderer.js'
import { updateTheme, updateCustomTheme } from './colorThemes.js'

let analyser
let dataArray
let audioContext

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

  controlsContainer.style.display = 'none'
  showControlsButton.textContent = 'Show Controls'

  initAudio()

  toggleButton.addEventListener('click', () => {
    toggleAudio().then(isRunning => {
      toggleButton.textContent = isRunning ? 'Stop' : 'Start'

      if (isRunning) {
        ({ analyser, dataArray, audioContext } = getAudioData())
        animate()
      }
    })
  })

  exportMidiButton.addEventListener('click', () => {
    exportToMidi()
  })

  canvas.addEventListener('click', handleCanvasClick)
  showControlsButton.addEventListener('click', toggleControls)

  frequencyRangeSlider.addEventListener('input', event => {
    const maxFreq = Math.pow(10, event.target.value)
    updateFrequencyRange(maxFreq)
  })

  minDbSlider.addEventListener('input', updateDbRangeFromUI)
  maxDbSlider.addEventListener('input', updateDbRangeFromUI)
  contrastSlider.addEventListener('input', updateContrastBrightnessFromUI)
  brightnessSlider.addEventListener('input', updateContrastBrightnessFromUI)

  themeSelect.addEventListener('change', event => {
    updateTheme(event.target.value)
    document.getElementById('customThemeControls').style.display = event.target.value === 'custom' ? 'grid' : 'none'
  })

  customColorLow.addEventListener('change', event => updateCustomTheme(event.target.value, 0))
  customColorMid.addEventListener('change', event => updateCustomTheme(event.target.value, 1))
  customColorHigh.addEventListener('change', event => updateCustomTheme(event.target.value, 2))

  fftSizeSelect.addEventListener('change', event => {
    updateFFTSize(parseInt(event.target.value))
  })

  persistenceSlider.addEventListener('input', event => {
    const value = parseFloat(event.target.value)
    updatePersistence(value)
    document.getElementById('persistenceValue').textContent = value.toFixed(2)
  })

  const pauseButtonTextInitial = pauseButton.textContent
  pauseButton.addEventListener('click', () => {
    const isPaused = togglePause()
    pauseButton.textContent = isPaused ? 'Resume' : pauseButtonTextInitial
  })

  reassignmentCheckbox.addEventListener('change', event => {
    toggleReassignment(event.target.checked)
  })

  setupDragAndDrop(dragMidiButton)

  updateFrequencyRangeFromUI()
  updateDbRangeFromUI()
  updateContrastBrightnessFromUI()
  drawFrequencyMarkers()

  function animate () {
    if (analyser && dataArray && audioContext) {
      updateSpectrogramm(analyser, dataArray, audioContext)
      window.requestAnimationFrame(animate)
    }
  }

  function updateFrequencyRangeFromUI () {
    const maxFreq = Math.pow(10, frequencyRangeSlider.value)
    updateFrequencyRange(maxFreq)
  }

  function updateDbRangeFromUI () {
    const minDb = parseFloat(minDbSlider.value)
    const maxDb = parseFloat(maxDbSlider.value)
    updateDbRange(Math.min(minDb, maxDb - 0.1), maxDb)
    document.getElementById('minDbValue').textContent = minDb.toFixed(1)
    document.getElementById('maxDbValue').textContent = maxDb.toFixed(1)
  }

  function updateContrastBrightnessFromUI () {
    const currentContrast = parseFloat(contrastSlider.value)
    const currentBrightness = parseFloat(brightnessSlider.value)
    updateContrastBrightness(currentContrast, currentBrightness)
  }

  function toggleControls () {
    if (controlsContainer.style.display === 'none') {
      controlsContainer.style.display = 'grid'
      showControlsButton.textContent = 'Hide Controls'
    } else {
      controlsContainer.style.display = 'none'
      showControlsButton.textContent = 'Show Controls'
    }
  }

  function handleCanvasClick () {}

  function setupDragAndDrop (button) {
    if (!button) {
      return
    }

    button.setAttribute('draggable', 'true')

    button.addEventListener('dragstart', event => {
      const midiData = createMidiData()

      if (!midiData) {
        return
      }

      const header = [
        0x4D, 0x54, 0x68, 0x64,
        0x00, 0x00, 0x00, 0x06,
        0x00, 0x01,
        0x00, 0x01,
        (midiData.ticksPerBeat >> 8) & 0xFF, midiData.ticksPerBeat & 0xFF
      ]

      const track = midiData.tracks[0]
      const events = []

      events.push([0x00, 0xFF, 0x03, track.name.length, ...track.name.split('').map(char => char.charCodeAt(0))])
      events.push([0x00, 0xFF, 0x51, 0x03, 0x07, 0xA1, 0x20])

      track.notes.forEach(note => {
        events.push([note.startTime, 0x90, note.noteNumber, note.velocity])
        events.push([note.startTime + note.duration, 0x80, note.noteNumber, 0])
      })

      events.sort((a, b) => a[0] - b[0])
      const midiArray = new Uint8Array([...header, ...events.flat()])
      const blob = new Blob([midiArray], { type: 'audio/midi' })
      const url = URL.createObjectURL(blob)

      event.dataTransfer.setData('DownloadURL', `audio/midi:spectrogram_notes.mid:${url}`)
      event.dataTransfer.setData('text/uri-list', url)
      event.dataTransfer.setData('text/plain', 'spectrogram_notes.mid')
      event.dataTransfer.effectAllowed = 'copy'

      button.classList.add('dragging')

      const dragImage = document.createElement('div')
      dragImage.textContent = 'MIDI'
      dragImage.style.fontSize = '18px'
      dragImage.style.padding = '6px 10px'
      dragImage.style.background = '#182127'
      dragImage.style.color = '#f3f8fb'
      dragImage.style.borderRadius = '10px'
      document.body.appendChild(dragImage)
      event.dataTransfer.setDragImage(dragImage, 12, 12)
      setTimeout(() => document.body.removeChild(dragImage), 0)
    })

    button.addEventListener('dragend', event => {
      button.classList.remove('dragging')
      const url = event.dataTransfer.getData('text/uri-list')

      if (url) {
        URL.revokeObjectURL(url)
      }
    })
  }
}
