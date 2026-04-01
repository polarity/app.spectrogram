let audioContext
let analyser
let dataArray
let source
let isRunning = false

const FFT_SIZES = [256, 512, 1024, 2048, 4096, 8192, 16384, 32768]
const DEFAULT_FFT_SIZE = 2048

let currentFFTSize = DEFAULT_FFT_SIZE

/**
 * Initializes the audio context and analyzer.
 * @returns {Object} Analyzer state placeholders.
 */
export function initAudio () {
  return { analyser: null, dataArray: null, audioContext: null }
}

/**
 * Toggles audio input on and off.
 * @returns {Promise<boolean>} Updated running state.
 */
export function toggleAudio () {
  return isRunning ? stopAudioInput() : startAudioInput()
}

/**
 * Starts the audio input stream.
 * @returns {Promise<boolean>} True when audio starts successfully.
 */
function startAudioInput () {
  if (isRunning) return Promise.resolve(true)

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    console.error('MediaDevices API is not supported in this browser.')
    return Promise.resolve(false)
  }

  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)()
    analyser = audioContext.createAnalyser()
    analyser.fftSize = currentFFTSize
    dataArray = new Uint8Array(analyser.frequencyBinCount)
  }

  return navigator.mediaDevices.getUserMedia({ audio: true })
    .then(stream => {
      source = audioContext.createMediaStreamSource(stream)
      source.connect(analyser)
      isRunning = true
      return audioContext.resume()
    })
    .then(() => true)
    .catch(err => {
      console.error('Error accessing microphone:', err)
      window.alert('Microphone access denied. Please allow access to use this feature.')
      return false
    })
}

/**
 * Stops the audio input stream.
 * @returns {Promise<boolean>} False when audio is stopped.
 */
function stopAudioInput () {
  if (!isRunning) return Promise.resolve(false)

  source.disconnect()
  isRunning = false
  return audioContext.suspend().then(() => false)
}

/**
 * Updates the FFT size for current and future analyser instances.
 * @param {number} size - Desired FFT size.
 * @returns {Object} Updated analyser state.
 */
export function updateFFTSize (size) {
  if (FFT_SIZES.includes(size)) {
    currentFFTSize = size

    if (analyser) {
      analyser.fftSize = size
      dataArray = new Uint8Array(analyser.frequencyBinCount)
    }
  }

  return { analyser, dataArray }
}

/**
 * Returns current audio analysis state.
 * @returns {Object} Analyser, dataArray, and audioContext.
 */
export function getAudioData () {
  return { analyser, dataArray, audioContext }
}
