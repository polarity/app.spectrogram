/**
 * Frequency-only spectrogram reassignment.
 */
import { computeSTFT, createHannWindow, getFFTContext } from './utils/fft.js'

const analysisCache = new Map()

const reassignmentState = {
  fftSize: 0,
  sampleRate: 0,
  lastPhase: null,
  lastTime: null
}

/**
 * Resets all reassignment state.
 */
export function resetReassignmentState () {
  reassignmentState.fftSize = 0
  reassignmentState.sampleRate = 0
  reassignmentState.lastPhase = null
  reassignmentState.lastTime = null
}

/**
 * Produces a dense reassigned magnitude spectrum scaled to 0-255.
 * @param {Float32Array} audioData - Time-domain frame.
 * @param {Object} options - Analysis options.
 * @param {number} options.sampleRate - Audio sample rate.
 * @param {number} options.fftSize - FFT size.
 * @param {number} options.currentTime - AudioContext currentTime in seconds.
 * @returns {Float32Array} Reassigned magnitude vector.
 */
export function analyzeReassignment (audioData, { sampleRate, fftSize, currentTime }) {
  const analysis = getAnalysisSetup(fftSize)
  const spectrum = computeSTFT(audioData, analysis.window, analysis.context)
  const baseMagnitude = spectrum.magnitude
  const reassigned = new Float32Array(baseMagnitude.length)
  const floorBlend = 0.32

  for (let bin = 0; bin < baseMagnitude.length; bin++) {
    reassigned[bin] = baseMagnitude[bin] * floorBlend
  }

  const hopSamples = getHopSamples(currentTime, sampleRate)
  const canReassign = isReassignmentStateCompatible(sampleRate, fftSize, hopSamples)

  if (canReassign) {
    applyFrequencyReassignment(reassigned, spectrum, hopSamples, sampleRate, fftSize)
  } else {
    for (let bin = 0; bin < baseMagnitude.length; bin++) {
      reassigned[bin] += baseMagnitude[bin] * (1 - floorBlend)
    }
  }

  updateReassignmentState(spectrum.phase, sampleRate, fftSize, currentTime)

  return scaleMagnitudeToByteRange(smoothSpectrum(reassigned))
}

/**
 * Returns cached windowing and FFT setup.
 * @param {number} fftSize - FFT size.
 * @returns {Object} Cached analysis setup.
 */
function getAnalysisSetup (fftSize) {
  if (analysisCache.has(fftSize)) {
    return analysisCache.get(fftSize)
  }

  const window = createHannWindow(fftSize)
  const context = getFFTContext(fftSize)
  let windowSum = 0

  for (let index = 0; index < window.length; index++) {
    windowSum += window[index]
  }

  const setup = {
    window,
    context,
    referenceMagnitude: Math.max(1, windowSum * 0.5)
  }

  analysisCache.set(fftSize, setup)
  return setup
}

/**
 * Estimates whether reassignment can use the previous phase frame.
 * @param {number} sampleRate - Audio sample rate.
 * @param {number} fftSize - FFT size.
 * @param {number|null} hopSamples - Estimated hop size.
 * @returns {boolean} True when state is compatible.
 */
function isReassignmentStateCompatible (sampleRate, fftSize, hopSamples) {
  return (
    reassignmentState.lastPhase &&
    reassignmentState.fftSize === fftSize &&
    reassignmentState.sampleRate === sampleRate &&
    hopSamples !== null &&
    hopSamples > 0 &&
    hopSamples < fftSize * 4
  )
}

/**
 * Applies bin-wise frequency reassignment using phase advance between frames.
 * @param {Float32Array} destination - Reassigned magnitude bins.
 * @param {Object} spectrum - Current STFT output.
 * @param {number} hopSamples - Estimated hop size in samples.
 * @param {number} sampleRate - Audio sample rate.
 * @param {number} fftSize - FFT size.
 */
function applyFrequencyReassignment (destination, spectrum, hopSamples, sampleRate, fftSize) {
  const { magnitude, phase } = spectrum
  const peakMagnitude = getPeakMagnitude(magnitude)
  const minimumMagnitude = peakMagnitude * 0.015

  if (peakMagnitude <= 0) {
    return
  }

  for (let bin = 1; bin < magnitude.length - 1; bin++) {
    const binMagnitude = magnitude[bin]

    if (binMagnitude < minimumMagnitude) {
      destination[bin] += binMagnitude * 0.25
      continue
    }

    const expectedAdvance = (2 * Math.PI * hopSamples * bin) / fftSize
    const phaseAdvance = phase[bin] - reassignmentState.lastPhase[bin]
    const correctedAdvance = wrapPhase(phaseAdvance - expectedAdvance)
    const reassignedBin = bin + (correctedAdvance * fftSize) / (2 * Math.PI * hopSamples)

    if (!Number.isFinite(reassignedBin) || reassignedBin < 0 || reassignedBin >= magnitude.length - 1) {
      destination[bin] += binMagnitude
      continue
    }

    accumulateFractionalBin(destination, reassignedBin, binMagnitude)
  }

  destination[0] += magnitude[0]
  destination[magnitude.length - 1] += magnitude[magnitude.length - 1]
}

/**
 * Scales magnitude values into a 0-255 range.
 * @param {Float32Array} magnitude - Magnitude bins.
 * @returns {Float32Array} Scaled magnitudes.
 */
function scaleMagnitudeToByteRange (magnitude) {
  const output = new Float32Array(magnitude.length)
  const peakMagnitude = getPeakMagnitude(magnitude)

  if (peakMagnitude <= 0) {
    return output
  }

  const noiseFloor = peakMagnitude * 0.015
  const dynamicRange = Math.max(peakMagnitude - noiseFloor, peakMagnitude * 0.25)

  for (let bin = 0; bin < magnitude.length; bin++) {
    const lifted = Math.max(0, magnitude[bin] - noiseFloor)
    const normalized = Math.max(0, Math.min(1, lifted / dynamicRange))
    output[bin] = Math.min(255, Math.pow(normalized, 0.58) * 255)
  }

  return output
}

/**
 * Applies a light 3-tap smoothing kernel to avoid isolated spikes.
 * @param {Float32Array} spectrum - Magnitude bins.
 * @returns {Float32Array} Smoothed magnitude bins.
 */
function smoothSpectrum (spectrum) {
  const smoothed = new Float32Array(spectrum.length)

  if (spectrum.length === 0) {
    return smoothed
  }

  smoothed[0] = spectrum[0]
  smoothed[spectrum.length - 1] = spectrum[spectrum.length - 1]

  for (let bin = 1; bin < spectrum.length - 1; bin++) {
    smoothed[bin] = (
      spectrum[bin - 1] * 0.18 +
      spectrum[bin] * 0.64 +
      spectrum[bin + 1] * 0.18
    )
  }

  return smoothed
}

/**
 * Accumulates energy into neighboring bins using linear interpolation.
 * @param {Float32Array} destination - Target bins.
 * @param {number} fractionalBin - Fractional reassigned bin position.
 * @param {number} magnitude - Magnitude to accumulate.
 */
function accumulateFractionalBin (destination, fractionalBin, magnitude) {
  const lowerBin = Math.floor(fractionalBin)
  const upperBin = Math.min(destination.length - 1, lowerBin + 1)
  const upperWeight = fractionalBin - lowerBin
  const lowerWeight = 1 - upperWeight

  destination[lowerBin] += magnitude * lowerWeight
  destination[upperBin] += magnitude * upperWeight
}

/**
 * Computes the peak magnitude of a spectrum.
 * @param {Float32Array} magnitude - Magnitude bins.
 * @returns {number} Peak magnitude.
 */
function getPeakMagnitude (magnitude) {
  let peak = 0

  for (let bin = 0; bin < magnitude.length; bin++) {
    if (magnitude[bin] > peak) {
      peak = magnitude[bin]
    }
  }

  return peak
}

/**
 * Updates stored phase state after a reassignment frame.
 * @param {Float32Array} phase - Current phase spectrum.
 * @param {number} sampleRate - Audio sample rate.
 * @param {number} fftSize - FFT size.
 * @param {number} currentTime - AudioContext currentTime.
 */
function updateReassignmentState (phase, sampleRate, fftSize, currentTime) {
  reassignmentState.lastPhase = new Float32Array(phase)
  reassignmentState.sampleRate = sampleRate
  reassignmentState.fftSize = fftSize
  reassignmentState.lastTime = currentTime
}

/**
 * Estimates the hop size from audio clock time.
 * @param {number} currentTime - Current audio time.
 * @param {number} sampleRate - Audio sample rate.
 * @returns {number|null} Hop size in samples.
 */
function getHopSamples (currentTime, sampleRate) {
  if (reassignmentState.lastTime === null) {
    return null
  }

  const deltaTime = currentTime - reassignmentState.lastTime

  if (!Number.isFinite(deltaTime) || deltaTime <= 0) {
    return null
  }

  return Math.max(1, Math.round(deltaTime * sampleRate))
}

/**
 * Wraps a phase angle to [-pi, pi].
 * @param {number} phase - Phase angle.
 * @returns {number} Wrapped phase.
 */
function wrapPhase (phase) {
  let wrapped = phase

  while (wrapped > Math.PI) {
    wrapped -= 2 * Math.PI
  }

  while (wrapped < -Math.PI) {
    wrapped += 2 * Math.PI
  }

  return wrapped
}
