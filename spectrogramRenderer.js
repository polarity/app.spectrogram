import { getColor } from './colorThemes.js'
import { frequencyToMIDI, saveMidiFile } from './utils/midiUtils.js'
import { analyzeReassignment, resetReassignmentState } from './timeFrequencyReassignment.js'

let canvas
let ctx
let labelCanvas
let labelCtx

const MIN_FREQUENCY = 30
let MAX_FREQUENCY = 22050
let MIN_DB = -100
let MAX_DB = -30
let contrast = 1
let brightness = 0

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const MIN_NOTE = 21
const MAX_NOTE = 108
const showPianoKeys = true

let mouseX = 0
let mouseY = 0
let isMouseOverCanvas = false

let persistenceAmount = 0
let useReassignment = false

const TEMPORAL_SMOOTHING = 0.78
const STABILITY_ATTACK = 0.18
const STABILITY_RELEASE = 0.06

let isPaused = false
let isDrawing = false
const drawnNotes = new Map()
let drawingStartX = 0
let drawingStartY = 0

const TICKS_PER_BEAT = 480
const PIXELS_PER_BEAT = 100

const renderState = {
  heightSteps: 0,
  smoothedAmplitudes: new Float32Array(0),
  previousFrameAmplitudes: new Float32Array(0),
  tonalStability: new Float32Array(0),
  lastFftSize: 0,
  lastAudioTime: null
}

/**
 * Initializes the spectrogram renderer.
 * @param {HTMLCanvasElement} mainCanvas - Main spectrogram canvas.
 * @param {CanvasRenderingContext2D} mainCtx - Main spectrogram context.
 * @param {HTMLCanvasElement} labelsCanvas - Overlay label canvas.
 * @param {CanvasRenderingContext2D} labelsCtx - Overlay label context.
 * @returns {Object|undefined} Public renderer functions.
 */
export function initSpectrogramRenderer (mainCanvas, mainCtx, labelsCanvas, labelsCtx) {
  canvas = mainCanvas
  ctx = mainCtx
  labelCanvas = labelsCanvas
  labelCtx = labelsCtx

  if (!mainCanvas || !mainCanvas.getContext) {
    console.error('Invalid canvas reference')
    return
  }

  mainCanvas.addEventListener('mousemove', handleMouseMove)
  mainCanvas.addEventListener('mousedown', handleMouseDown)
  mainCanvas.addEventListener('mouseup', handleMouseUp)
  mainCanvas.addEventListener('mouseleave', handleMouseLeave)
  mainCanvas.addEventListener('mouseenter', handleMouseEnter)
  mainCanvas.addEventListener('dblclick', handleDoubleClick)

  return { updateSpectrogramm, togglePause }
}

/**
 * Toggles the pause state.
 * @returns {boolean} Updated pause state.
 */
export function togglePause () {
  isPaused = !isPaused
  resetSpectralState()

  if (!isPaused) {
    drawnNotes.clear()
    labelCtx.clearRect(0, 0, labelCanvas.width, labelCanvas.height)
    drawFrequencyMarkers()
  }

  return isPaused
}

/**
 * Updates the spectrogram visualization.
 * @param {AnalyserNode} analyser - Web Audio analyser.
 * @param {Uint8Array} dataArray - Frequency-domain analyser output.
 * @param {AudioContext} audioContext - Audio context.
 */
export function updateSpectrogramm (analyser, dataArray, audioContext) {
  if (isPaused) {
    redrawAllNotes()
    return
  }

  const heightSteps = Math.max(1, canvas.height * 2)
  ensureRenderState(heightSteps)
  syncAnalysisState(analyser, audioContext)

  const frequencyData = getFrequencyData(analyser, dataArray, audioContext)

  shiftSpectrogramLeft()

  const currentFrame = buildDisplayFrame(frequencyData, audioContext.sampleRate, heightSteps)

  for (let row = 0; row < heightSteps; row++) {
    let amplitude = applySpatialSmoothing(currentFrame, row)
    amplitude = applyTemporalSmoothing(row, amplitude)

    const toneStability = updateToneStability(row, amplitude)
    let value = mapAmplitudeToValue(amplitude)

    if (persistenceAmount > 0) {
      value = applyTonalStability(value, toneStability)
    }

    ctx.fillStyle = getColor(value)
    const canvasY = Math.floor((row / heightSteps) * canvas.height)
    ctx.fillRect(canvas.width - 1, canvasY, 1, 1)
  }

  if (drawnNotes.size > 0) {
    redrawAllNotes()
  }
}

/**
 * Calculates a continuity-based tone stability score for a display history.
 * @param {Float32Array|number[]} history - History values for a bin.
 * @returns {number} Tone stability score.
 */
export function calculatePersistenceScore (history) {
  if (!history || history.length < 2) {
    return 0
  }

  let continuitySum = 0
  let sampleCount = 0

  for (let index = 1; index < history.length; index++) {
    const current = history[index]
    const previous = history[index - 1]
    const reference = Math.max(current, previous, 8)
    const continuity = 1 - Math.min(1, Math.abs(current - previous) / reference)
    continuitySum += continuity
    sampleCount++
  }

  return sampleCount > 0 ? continuitySum / sampleCount : 0
}

/**
 * Updates the tonal stability slider amount.
 * @param {number} value - Slider value between 0 and 1.
 */
export function updatePersistence (value) {
  persistenceAmount = value
}

/**
 * Draws frequency markers and piano keys on the label canvas.
 */
export function drawFrequencyMarkers () {
  if (!labelCtx || !labelCanvas) return

  labelCtx.clearRect(0, 0, labelCanvas.width, labelCanvas.height)
  const keyWidth = 25

  if (showPianoKeys) {
    const currentNote = isMouseOverCanvas ? getFrequencyInfo(mouseY).midiNote : null

    for (let midiNote = MIN_NOTE; midiNote <= MAX_NOTE; midiNote++) {
      const noteName = NOTES[midiNote % 12]
      const octave = Math.floor(midiNote / 12) - 1
      const isBlackKey = noteName.includes('#')
      const frequency = 440 * Math.pow(2, (midiNote - 69) / 12)
      const normalizedY = (Math.log(frequency) - Math.log(MIN_FREQUENCY)) / (Math.log(MAX_FREQUENCY) - Math.log(MIN_FREQUENCY))
      const y = labelCanvas.height * (1 - normalizedY)
      const keyHeight = labelCanvas.height / 52

      if (!isBlackKey) {
        labelCtx.fillStyle = midiNote === currentNote ? '#aaf' : '#fff'
        labelCtx.strokeStyle = '#666'
        labelCtx.lineWidth = 1
        labelCtx.fillRect(0, y - keyHeight / 2, keyWidth, keyHeight)
        labelCtx.strokeRect(0, y - keyHeight / 2, keyWidth, keyHeight)

        if (noteName === 'C') {
          labelCtx.fillStyle = '#666'
          labelCtx.font = '10px Arial'
          labelCtx.fillText(`C${octave}`, 2, y + 4)
        }
      } else {
        labelCtx.fillStyle = midiNote === currentNote ? '#66f' : '#000'
        labelCtx.strokeStyle = '#444'
        labelCtx.lineWidth = 1

        const blackKeyWidth = keyWidth * 0.7
        const blackKeyHeight = keyHeight * 0.7
        labelCtx.fillRect(0, y - blackKeyHeight / 2, blackKeyWidth, blackKeyHeight)
        labelCtx.strokeRect(0, y - blackKeyHeight / 2, blackKeyWidth, blackKeyHeight)
      }
    }
  }

  labelCtx.fillStyle = 'white'
  labelCtx.font = '10px Arial'
  const markers = [100, 500, 1000, 5000, 10000]

  markers.forEach(freq => {
    if (freq <= MAX_FREQUENCY) {
      const y = labelCanvas.height * (1 - (Math.log(freq) - Math.log(MIN_FREQUENCY)) / (Math.log(MAX_FREQUENCY) - Math.log(MIN_FREQUENCY)))
      const xOffset = showPianoKeys ? 30 : 5
      labelCtx.fillText(`${freq}Hz`, xOffset, y)
      labelCtx.beginPath()
      labelCtx.moveTo(0, y)
      labelCtx.lineTo(labelCanvas.width, y)
      labelCtx.strokeStyle = 'rgba(255, 255, 255, 0.2)'
      labelCtx.stroke()
    }
  })

  if (isMouseOverCanvas) {
    const info = getFrequencyInfo(mouseY)
    labelCtx.beginPath()
    labelCtx.moveTo(0, mouseY)
    labelCtx.lineTo(labelCanvas.width, mouseY)
    labelCtx.strokeStyle = 'rgba(255, 255, 0, 0.5)'
    labelCtx.stroke()

    const boxX = Math.min(mouseX + 10, labelCanvas.width - 130)
    const boxY = Math.min(Math.max(mouseY - 30, 10), labelCanvas.height - 50)

    labelCtx.fillStyle = 'rgba(0, 0, 0, 0.8)'
    labelCtx.fillRect(boxX, boxY, 120, 40)

    labelCtx.fillStyle = 'yellow'
    labelCtx.font = '12px Arial'
    labelCtx.fillText(`Note: ${info.note}`, boxX + 5, boxY + 15)
    labelCtx.fillText(`Freq: ${info.frequency}Hz`, boxX + 5, boxY + 35)
  }
}

/**
 * Returns note and frequency information for a y-position.
 * @param {number} y - Y position within the label canvas.
 * @returns {Object} Frequency and note metadata.
 */
export function getFrequencyInfo (y) {
  const normalizedY = y / labelCanvas.height
  const frequency = MIN_FREQUENCY * Math.pow(MAX_FREQUENCY / MIN_FREQUENCY, 1 - normalizedY)
  const midiNote = frequencyToMIDI(frequency)
  const noteName = NOTES[midiNote % 12]
  const octave = Math.floor(midiNote / 12) - 1

  return {
    frequency: Math.round(frequency),
    note: `${noteName}${octave}`,
    midiNote,
    height: normalizedY
  }
}

/**
 * Updates the frequency range for the spectrogram.
 * @param {number} maxFreq - Maximum displayed frequency.
 */
export function updateFrequencyRange (maxFreq) {
  MAX_FREQUENCY = maxFreq
  drawFrequencyMarkers()
}

/**
 * Updates the dB range for the spectrogram.
 * @param {number} minDb - Minimum dB.
 * @param {number} maxDb - Maximum dB.
 */
export function updateDbRange (minDb, maxDb) {
  MIN_DB = minDb
  MAX_DB = maxDb
}

/**
 * Updates spectrogram contrast and brightness.
 * @param {number} newContrast - Contrast multiplier.
 * @param {number} newBrightness - Brightness offset.
 */
export function updateContrastBrightness (newContrast, newBrightness) {
  contrast = newContrast
  brightness = newBrightness
}

/**
 * Creates MIDI data from the drawn notes.
 * @returns {Object|null} MIDI structure or null when no notes exist.
 */
export function createMidiData () {
  if (drawnNotes.size === 0) return null

  const sortedNotes = Array.from(drawnNotes.values()).sort((a, b) => a.x - b.x)

  const midiNotes = sortedNotes.map(note => {
    const startTick = Math.round((note.x / PIXELS_PER_BEAT) * TICKS_PER_BEAT)
    const duration = Math.round((note.width / PIXELS_PER_BEAT) * TICKS_PER_BEAT)

    return {
      noteNumber: frequencyToMIDI(note.frequency),
      startTime: startTick,
      duration: Math.max(duration, TICKS_PER_BEAT / 4),
      velocity: 100
    }
  })

  return {
    ticksPerBeat: TICKS_PER_BEAT,
    tracks: [{
      name: 'Spectrogram Notes',
      notes: midiNotes
    }]
  }
}

/**
 * Exports drawn notes as a MIDI file.
 */
export function exportToMidi () {
  const midiData = createMidiData()

  if (midiData) {
    saveMidiFile(midiData, 'spectrogram_notes.mid')
  }
}

/**
 * Toggles the reassignment state.
 * @param {boolean} enable - Whether reassignment is enabled.
 */
export function toggleReassignment (enable) {
  useReassignment = enable
  resetSpectralState()
}

/**
 * Ensures per-row render buffers match the current display height.
 * @param {number} heightSteps - Number of display rows.
 */
function ensureRenderState (heightSteps) {
  if (renderState.heightSteps === heightSteps) {
    return
  }

  renderState.heightSteps = heightSteps
  renderState.smoothedAmplitudes = new Float32Array(heightSteps)
  renderState.previousFrameAmplitudes = new Float32Array(heightSteps)
  renderState.tonalStability = new Float32Array(heightSteps)
}

/**
 * Resets all spectral state.
 */
function resetSpectralState () {
  renderState.smoothedAmplitudes.fill(0)
  renderState.previousFrameAmplitudes.fill(0)
  renderState.tonalStability.fill(0)
  renderState.lastAudioTime = null
  renderState.lastFftSize = 0
  resetReassignmentState()
}

/**
 * Synchronizes spectral state with analyser and audio lifecycle changes.
 * @param {AnalyserNode} analyser - Web Audio analyser.
 * @param {AudioContext} audioContext - Audio context.
 */
function syncAnalysisState (analyser, audioContext) {
  if (renderState.lastFftSize !== analyser.fftSize) {
    resetSpectralState()
    renderState.lastFftSize = analyser.fftSize
  }

  if (
    renderState.lastAudioTime !== null &&
    (
      audioContext.currentTime < renderState.lastAudioTime ||
      audioContext.currentTime - renderState.lastAudioTime > 0.25
    )
  ) {
    resetSpectralState()
    renderState.lastFftSize = analyser.fftSize
  }

  renderState.lastAudioTime = audioContext.currentTime
}

/**
 * Returns the current frequency-domain data for the active mode.
 * @param {AnalyserNode} analyser - Web Audio analyser.
 * @param {Uint8Array} dataArray - Standard analyser output buffer.
 * @param {AudioContext} audioContext - Audio context.
 * @returns {TypedArray} Frequency-domain data scaled to 0-255.
 */
function getFrequencyData (analyser, dataArray, audioContext) {
  if (useReassignment) {
    const timeData = new Float32Array(analyser.fftSize)
    analyser.getFloatTimeDomainData(timeData)
    return analyzeReassignment(timeData, {
      sampleRate: audioContext.sampleRate,
      fftSize: analyser.fftSize,
      currentTime: audioContext.currentTime
    })
  }

  analyser.getByteFrequencyData(dataArray)
  return dataArray
}

/**
 * Shifts the spectrogram one pixel to the left.
 */
function shiftSpectrogramLeft () {
  const imageData = ctx.getImageData(1, 0, canvas.width - 1, canvas.height)
  ctx.putImageData(imageData, 0, 0)
}

/**
 * Builds a display-height frame from frequency-domain bins.
 * @param {TypedArray} frequencyData - Frequency-domain bins.
 * @param {number} sampleRate - Audio sample rate.
 * @param {number} heightSteps - Number of display rows.
 * @returns {Float32Array} Display-height amplitude frame.
 */
function buildDisplayFrame (frequencyData, sampleRate, heightSteps) {
  const frame = new Float32Array(heightSteps)
  const nyquist = sampleRate / 2
  const binCount = frequencyData.length

  for (let row = 0; row < heightSteps; row++) {
    const normalizedY = row / heightSteps
    const frequency = MIN_FREQUENCY * Math.pow(MAX_FREQUENCY / MIN_FREQUENCY, 1 - normalizedY)
    const binIndexFloat = (frequency / nyquist) * binCount
    const lowerBin = Math.floor(binIndexFloat)
    const upperBin = Math.min(lowerBin + 1, binCount - 1)
    const upperWeight = binIndexFloat - lowerBin
    const lowerWeight = 1 - upperWeight

    frame[row] = lowerBin < binCount
      ? frequencyData[lowerBin] * lowerWeight + frequencyData[upperBin] * upperWeight
      : 0
  }

  return frame
}

/**
 * Applies light vertical smoothing to a display frame row.
 * @param {Float32Array} frame - Display frame.
 * @param {number} row - Row index.
 * @returns {number} Smoothed amplitude.
 */
function applySpatialSmoothing (frame, row) {
  let weightedSum = 0
  let weightTotal = 0

  for (let offset = -2; offset <= 2; offset++) {
    const sampleRow = Math.max(0, Math.min(frame.length - 1, row + offset))
    const weight = 1 / (1 + Math.abs(offset))
    weightedSum += frame[sampleRow] * weight
    weightTotal += weight
  }

  return weightedSum / weightTotal
}

/**
 * Applies temporal smoothing to a display row.
 * @param {number} row - Row index.
 * @param {number} amplitude - Current amplitude.
 * @returns {number} Temporally smoothed amplitude.
 */
function applyTemporalSmoothing (row, amplitude) {
  const smoothed = TEMPORAL_SMOOTHING * renderState.smoothedAmplitudes[row] + (1 - TEMPORAL_SMOOTHING) * amplitude
  renderState.smoothedAmplitudes[row] = smoothed
  return smoothed
}

/**
 * Updates steady-tone stability for a display row.
 * @param {number} row - Row index.
 * @param {number} amplitude - Current row amplitude.
 * @returns {number} Tone stability score.
 */
function updateToneStability (row, amplitude) {
  const previousAmplitude = renderState.previousFrameAmplitudes[row]
  const referenceAmplitude = Math.max(amplitude, previousAmplitude, 8)
  const continuity = 1 - Math.min(1, Math.abs(amplitude - previousAmplitude) / referenceAmplitude)
  const energy = Math.min(1, amplitude / 255)
  const toneEvidence = continuity * Math.sqrt(energy)
  const previousStability = renderState.tonalStability[row]
  const smoothing = toneEvidence > previousStability ? STABILITY_ATTACK : STABILITY_RELEASE
  const stability = previousStability * (1 - smoothing) + toneEvidence * smoothing

  renderState.previousFrameAmplitudes[row] = amplitude
  renderState.tonalStability[row] = stability

  return stability
}

/**
 * Converts a 0-255 amplitude to the renderer's normalized color value.
 * @param {number} amplitude - Smoothed amplitude.
 * @returns {number} Normalized value between 0 and 1.
 */
function mapAmplitudeToValue (amplitude) {
  const safeAmplitude = Math.max(1, amplitude)
  const db = 20 * Math.log10(safeAmplitude / 255)
  const normalizedDb = (db - MIN_DB) / (MAX_DB - MIN_DB)
  let value = Math.max(0, Math.min(1, normalizedDb))

  value = (value - 0.5) * contrast + 0.5 + brightness
  return Math.max(0, Math.min(1, value))
}

/**
 * Applies tonal stability weighting to the current normalized color value.
 * @param {number} value - Current normalized color value.
 * @param {number} stability - Tone stability score.
 * @returns {number} Stability-weighted value.
 */
function applyTonalStability (value, stability) {
  const clampedStability = Math.max(0, Math.min(1, stability))
  const attenuation = 1 - 0.85 * persistenceAmount * (1 - clampedStability)
  const emphasis = 1 + 0.18 * persistenceAmount * clampedStability * clampedStability
  return Math.max(0, Math.min(1, value * attenuation * emphasis))
}

/**
 * Redraws all saved notes.
 */
function redrawAllNotes () {
  for (const note of drawnNotes.values()) {
    drawNoteOnLabelCanvas(note.x, note.y, note.width)
  }
}

/**
 * Draws a note on the label canvas.
 * @param {number} x - Start x position.
 * @param {number} y - Y position.
 * @param {number} width - Note width.
 */
function drawNoteOnLabelCanvas (x, y, width) {
  const noteHeight = 4
  const info = getFrequencyInfo(y)

  labelCtx.fillStyle = 'rgba(0, 0, 0, 0.8)'
  labelCtx.strokeStyle = 'rgba(0, 0, 0, 0.8)'
  labelCtx.lineWidth = 2
  labelCtx.fillRect(x - 1, y - noteHeight / 2 - 1, width + 2, noteHeight + 2)
  labelCtx.strokeRect(x - 1, y - noteHeight / 2 - 1, width + 2, noteHeight + 2)

  labelCtx.fillStyle = 'rgba(255, 255, 0, 0.5)'
  labelCtx.strokeStyle = 'rgba(255, 255, 0, 0.8)'
  labelCtx.lineWidth = 1
  labelCtx.fillRect(x, y - noteHeight / 2, width, noteHeight)
  labelCtx.strokeRect(x, y - noteHeight / 2, width, noteHeight)

  labelCtx.fillStyle = 'yellow'
  labelCtx.font = '10px Arial'
  labelCtx.fillText(info.note, x + 2, y - noteHeight)
}

function handleMouseMove (event) {
  const rect = canvas.getBoundingClientRect()
  mouseX = event.clientX - rect.left
  mouseY = event.clientY - rect.top
  isMouseOverCanvas = true

  drawFrequencyMarkers()

  if (isDrawing && isPaused) {
    updateDrawing(event)
  }
}

function handleMouseDown (event) {
  if (isPaused) {
    const rect = canvas.getBoundingClientRect()
    drawingStartX = event.clientX - rect.left
    drawingStartY = event.clientY - rect.top
    isDrawing = true
  }
}

function handleMouseUp (event) {
  if (isPaused && isDrawing) {
    const rect = canvas.getBoundingClientRect()
    const endX = event.clientX - rect.left
    const width = endX - drawingStartX

    if (Math.abs(width) > 5) {
      const info = getFrequencyInfo(drawingStartY)
      const noteId = `${info.frequency}-${drawingStartX}`
      drawnNotes.set(noteId, {
        x: drawingStartX,
        y: drawingStartY,
        width,
        frequency: info.frequency,
        note: info.note
      })
    }

    isDrawing = false
    redrawAllNotes()
  }
}

function handleMouseLeave () {
  isMouseOverCanvas = false
  drawFrequencyMarkers()
}

function handleMouseEnter () {
  isMouseOverCanvas = true
  drawFrequencyMarkers()
}

function handleDoubleClick (event) {
  if (!isPaused) return

  const rect = canvas.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top
  const clickThreshold = 5

  for (const [noteId, note] of drawnNotes.entries()) {
    if (
      y >= note.y - clickThreshold &&
      y <= note.y + clickThreshold &&
      x >= note.x &&
      x <= note.x + note.width
    ) {
      drawnNotes.delete(noteId)
      redrawAllNotes()
      break
    }
  }
}

/**
 * Updates the note drawing while dragging.
 * @param {MouseEvent} event - Active mouse event.
 */
function updateDrawing (event) {
  if (!isDrawing) return

  const rect = canvas.getBoundingClientRect()
  const currentX = event.clientX - rect.left
  const width = currentX - drawingStartX

  labelCtx.clearRect(0, 0, labelCanvas.width, labelCanvas.height)
  drawFrequencyMarkers()
  redrawAllNotes()
  drawNoteOnLabelCanvas(drawingStartX, drawingStartY, width)
}
