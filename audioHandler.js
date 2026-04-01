let audioContext
let analyser
let dataArray
let source
let currentStream
let isRunning = false

const FFT_SIZES = [256, 512, 1024, 2048, 4096, 8192, 16384, 32768]
const DEFAULT_FFT_SIZE = 2048

let currentFFTSize = DEFAULT_FFT_SIZE
let selectedAudioInputId = ''

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
 * Starts the audio input stream with the current device selection.
 * @param {string} [deviceId] - Optional device id override.
 * @returns {Promise<boolean>} True when audio starts successfully.
 */
export async function startAudioInput (deviceId) {
  if (typeof deviceId === 'string') {
    selectedAudioInputId = deviceId
  }

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    console.error('MediaDevices API is not supported in this browser.')
    return false
  }

  if (!audioContext || audioContext.state === 'closed') {
    audioContext = new (window.AudioContext || window.webkitAudioContext)()
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: getAudioConstraints()
    })

    stopCurrentStream()

    if (source) {
      source.disconnect()
    }

    analyser = audioContext.createAnalyser()
    analyser.fftSize = currentFFTSize
    dataArray = new Uint8Array(analyser.frequencyBinCount)
    source = audioContext.createMediaStreamSource(stream)
    source.connect(analyser)
    currentStream = stream
    isRunning = true

    await audioContext.resume()
    selectedAudioInputId = resolveSelectedAudioInputId(await getAvailableAudioInputs(), currentStream)
    return true
  } catch (err) {
    console.error('Error accessing microphone:', err)
    window.alert('Microphone access denied. Please allow access to use this feature.')
    return false
  }
}

/**
 * Restarts audio capture with a newly selected input device.
 * @param {string} deviceId - Selected device id.
 * @returns {Promise<boolean>} True when the restart succeeds.
 */
export async function switchAudioInput (deviceId) {
  selectedAudioInputId = deviceId || ''
  return startAudioInput(selectedAudioInputId)
}

/**
 * Stops the audio input stream.
 * @returns {Promise<boolean>} False when audio is stopped.
 */
export function stopAudioInput () {
  if (!isRunning) return Promise.resolve(false)

  if (source) {
    source.disconnect()
    source = null
  }

  stopCurrentStream()
  isRunning = false

  if (audioContext) {
    return audioContext.suspend().then(() => false)
  }

  return Promise.resolve(false)
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

/**
 * Enumerates available audio input devices.
 * @returns {Promise<MediaDeviceInfo[]>} Audio inputs only.
 */
export async function getAvailableAudioInputs () {
  const devices = await navigator.mediaDevices.enumerateDevices()
  return devices.filter(device => device.kind === 'audioinput')
}

/**
 * Resolves the audio input that should be displayed as selected.
 * @returns {Promise<string>} Currently active or selected input id, or empty string.
 */
export async function getResolvedAudioInputId () {
  const audioInputs = await getAvailableAudioInputs()
  return resolveSelectedAudioInputId(audioInputs, currentStream)
}

/**
 * Refreshes the selected audio input when devices change.
 * @returns {Promise<string>} Active or fallback device id.
 */
export async function refreshAudioInputSelection () {
  const audioInputs = await getAvailableAudioInputs()
  selectedAudioInputId = resolveSelectedAudioInputId(audioInputs, currentStream)
  return selectedAudioInputId
}

/**
 * Returns whether audio capture is currently active.
 * @returns {boolean} Running state.
 */
export function isAudioRunning () {
  return isRunning
}

/**
 * Stops the current media stream tracks.
 */
function stopCurrentStream () {
  if (!currentStream) {
    return
  }

  currentStream.getTracks().forEach(track => track.stop())
  currentStream = null
}

/**
 * Returns getUserMedia audio constraints for the selected input.
 * @returns {MediaTrackConstraints} Audio constraints.
 */
function getAudioConstraints () {
  const constraints = {
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false
  }

  if (selectedAudioInputId) {
    constraints.deviceId = { exact: selectedAudioInputId }
  }

  return constraints
}

/**
 * Resolves which device id should be shown as selected in the UI.
 * @param {MediaDeviceInfo[]} audioInputs - Available audio input devices.
 * @param {MediaStream} stream - Current active audio stream.
 * @returns {string} Selected device id or empty string for default.
 */
function resolveSelectedAudioInputId (audioInputs, stream) {
  const availableDeviceIds = new Set(audioInputs.map(input => input.deviceId))
  const activeTrack = stream ? stream.getAudioTracks()[0] : null
  const activeDeviceId = activeTrack && activeTrack.getSettings
    ? activeTrack.getSettings().deviceId
    : ''

  if (activeDeviceId && availableDeviceIds.has(activeDeviceId)) {
    return activeDeviceId
  }

  if (selectedAudioInputId && availableDeviceIds.has(selectedAudioInputId)) {
    return selectedAudioInputId
  }

  return ''
}
