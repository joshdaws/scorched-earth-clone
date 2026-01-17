/**
 * Canvas and 2D context mocking utilities for tests
 */

/**
 * Create a mock 2D canvas context
 * @returns {Object} Mock canvas context with all common methods
 */
export function createMockContext() {
  return {
    // State
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    font: '10px sans-serif',
    textAlign: 'start',
    textBaseline: 'alphabetic',
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    shadowColor: 'transparent',
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,

    // Path methods
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    arcTo: vi.fn(),
    bezierCurveTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    rect: vi.fn(),
    ellipse: vi.fn(),

    // Drawing methods
    fill: vi.fn(),
    stroke: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    clearRect: vi.fn(),
    fillText: vi.fn(),
    strokeText: vi.fn(),

    // Image methods
    drawImage: vi.fn(),
    createImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 })),
    getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 })),
    putImageData: vi.fn(),

    // Transform methods
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    setTransform: vi.fn(),
    resetTransform: vi.fn(),

    // Gradient/Pattern
    createLinearGradient: vi.fn(() => ({
      addColorStop: vi.fn()
    })),
    createRadialGradient: vi.fn(() => ({
      addColorStop: vi.fn()
    })),
    createPattern: vi.fn(),

    // Text measurement
    measureText: vi.fn(() => ({ width: 100 })),

    // Clipping
    clip: vi.fn(),

    // Other
    isPointInPath: vi.fn(() => false),
    isPointInStroke: vi.fn(() => false)
  };
}

/**
 * Create a mock canvas element
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @returns {Object} Mock canvas element
 */
export function createMockCanvas(width = 1200, height = 800) {
  const ctx = createMockContext();

  return {
    width,
    height,
    style: {},
    getContext: vi.fn((type) => {
      if (type === '2d') {
        return ctx;
      }
      return null;
    }),
    getBoundingClientRect: vi.fn(() => ({
      left: 0,
      top: 0,
      width,
      height,
      right: width,
      bottom: height
    })),
    toDataURL: vi.fn(() => 'data:image/png;base64,'),
    _ctx: ctx // Expose for direct access in tests
  };
}

/**
 * Create a mock AudioContext for sound testing
 * @returns {Object} Mock AudioContext
 */
export function createMockAudioContext() {
  const gainNode = {
    gain: { value: 1, setValueAtTime: vi.fn() },
    connect: vi.fn()
  };

  return {
    destination: {},
    state: 'running',
    currentTime: 0,
    sampleRate: 44100,
    createGain: vi.fn(() => gainNode),
    createOscillator: vi.fn(() => ({
      type: 'sine',
      frequency: { value: 440, setValueAtTime: vi.fn() },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn()
    })),
    createBufferSource: vi.fn(() => ({
      buffer: null,
      loop: false,
      playbackRate: { value: 1 },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn()
    })),
    decodeAudioData: vi.fn(() => Promise.resolve({})),
    resume: vi.fn(() => Promise.resolve()),
    suspend: vi.fn(() => Promise.resolve())
  };
}
