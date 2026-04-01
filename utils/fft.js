/**
 * FFT helpers for spectrogram analysis.
 */
const fftCache = new Map()
const windowCache = new Map()

/**
 * Returns a cached FFT context for a power-of-two size.
 * @param {number} size - FFT size.
 * @returns {Object} Cached twiddle and bit-reversal tables.
 */
export function getFFTContext (size) {
  if (!Number.isInteger(size) || size < 2 || (size & (size - 1)) !== 0) {
    throw new Error(`FFT size must be a power of two, got ${size}`)
  }

  if (fftCache.has(size)) {
    return fftCache.get(size)
  }

  const halfSize = size / 2
  const cosTable = new Float32Array(halfSize)
  const sinTable = new Float32Array(halfSize)
  const bitReverse = new Uint32Array(size)
  const bits = Math.round(Math.log2(size))

  for (let index = 0; index < halfSize; index++) {
    const angle = (-2 * Math.PI * index) / size
    cosTable[index] = Math.cos(angle)
    sinTable[index] = Math.sin(angle)
  }

  for (let index = 0; index < size; index++) {
    bitReverse[index] = reverseBits(index, bits)
  }

  const context = { size, cosTable, sinTable, bitReverse }
  fftCache.set(size, context)
  return context
}

/**
 * Creates and caches a Hann window.
 * @param {number} size - Window size.
 * @returns {Float32Array} Hann window samples.
 */
export function createHannWindow (size) {
  if (windowCache.has(size)) {
    return windowCache.get(size)
  }

  const window = new Float32Array(size)

  for (let index = 0; index < size; index++) {
    window[index] = 0.5 - 0.5 * Math.cos((2 * Math.PI * index) / (size - 1))
  }

  windowCache.set(size, window)
  return window
}

/**
 * Computes a windowed STFT frame.
 * @param {Float32Array} data - Input frame.
 * @param {Float32Array} window - Window samples.
 * @param {Object} context - FFT context.
 * @returns {Object} Complex spectrum, magnitude, and phase.
 */
export function computeSTFT (data, window, context) {
  const size = context.size
  const windowed = new Float32Array(size)

  for (let index = 0; index < size; index++) {
    windowed[index] = (data[index] || 0) * window[index]
  }

  const { real, imag } = fftReal(windowed, context)
  const halfSize = size / 2
  const magnitude = new Float32Array(halfSize)
  const phase = new Float32Array(halfSize)

  for (let bin = 0; bin < halfSize; bin++) {
    const realPart = real[bin]
    const imagPart = imag[bin]
    magnitude[bin] = Math.hypot(realPart, imagPart)
    phase[bin] = Math.atan2(imagPart, realPart)
  }

  return { real, imag, magnitude, phase }
}

/**
 * Computes a forward FFT for a real-valued frame.
 * @param {Float32Array} input - Real-valued input frame.
 * @param {Object} context - FFT context.
 * @returns {Object} Real and imaginary output arrays.
 */
export function fftReal (input, context) {
  const { size, cosTable, sinTable, bitReverse } = context
  const real = new Float32Array(size)
  const imag = new Float32Array(size)

  for (let index = 0; index < size; index++) {
    real[index] = input[bitReverse[index]] || 0
  }

  for (let blockSize = 2; blockSize <= size; blockSize <<= 1) {
    const halfBlock = blockSize / 2
    const tableStep = size / blockSize

    for (let start = 0; start < size; start += blockSize) {
      for (let offset = 0; offset < halfBlock; offset++) {
        const twiddleIndex = offset * tableStep
        const cosValue = cosTable[twiddleIndex]
        const sinValue = sinTable[twiddleIndex]
        const evenIndex = start + offset
        const oddIndex = evenIndex + halfBlock

        const oddReal = real[oddIndex]
        const oddImag = imag[oddIndex]
        const tempReal = cosValue * oddReal - sinValue * oddImag
        const tempImag = cosValue * oddImag + sinValue * oddReal

        real[oddIndex] = real[evenIndex] - tempReal
        imag[oddIndex] = imag[evenIndex] - tempImag
        real[evenIndex] += tempReal
        imag[evenIndex] += tempImag
      }
    }
  }

  return { real, imag }
}

/**
 * Reverses the lower `bits` bits in an integer.
 * @param {number} value - Value to reverse.
 * @param {number} bits - Number of bits to reverse.
 * @returns {number} Bit-reversed index.
 */
function reverseBits (value, bits) {
  let reversed = 0

  for (let bit = 0; bit < bits; bit++) {
    reversed = (reversed << 1) | ((value >> bit) & 1)
  }

  return reversed
}
