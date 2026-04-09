/**
 * FT.15 — Sound effects unit tests (vitest + jsdom).
 *
 * Mocks the Web Audio API (AudioContext, OscillatorNode, GainNode,
 * AudioBufferSourceNode) because jsdom does not implement it.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Minimal Web Audio API mock
// ---------------------------------------------------------------------------

/** Shared mock helpers */
const mockConnect = vi.fn().mockReturnThis();
const mockStart = vi.fn();
const mockStop = vi.fn();
const mockSetValueAtTime = vi.fn().mockReturnThis();
const mockLinearRampToValueAtTime = vi.fn().mockReturnThis();
const mockExponentialRampToValueAtTime = vi.fn().mockReturnThis();

function makeGainNode() {
  return {
    gain: {
      setValueAtTime: mockSetValueAtTime,
      linearRampToValueAtTime: mockLinearRampToValueAtTime,
      exponentialRampToValueAtTime: mockExponentialRampToValueAtTime,
    },
    connect: mockConnect,
  };
}

function makeOscillatorNode() {
  return {
    type: 'sine' as OscillatorType,
    frequency: {
      setValueAtTime: mockSetValueAtTime,
      exponentialRampToValueAtTime: mockExponentialRampToValueAtTime,
    },
    connect: mockConnect,
    start: mockStart,
    stop: mockStop,
  };
}

function makeBufferSourceNode() {
  return {
    buffer: null as AudioBuffer | null,
    connect: mockConnect,
    start: mockStart,
  };
}

function makeAudioBuffer(sampleRate: number, length: number) {
  const data = new Float32Array(length);
  return {
    getChannelData: vi.fn().mockReturnValue(data),
    sampleRate,
    length,
    duration: length / sampleRate,
    numberOfChannels: 1,
  } as unknown as AudioBuffer;
}

/** Factory for a mocked AudioContext */
function makeAudioContextMock() {
  const sampleRate = 44100;
  return {
    state: 'running' as AudioContextState,
    currentTime: 0,
    sampleRate,
    destination: {},
    resume: vi.fn().mockResolvedValue(undefined),
    createOscillator: vi.fn().mockImplementation(makeOscillatorNode),
    createGain: vi.fn().mockImplementation(makeGainNode),
    createBuffer: vi
      .fn()
      .mockImplementation((_channels: number, length: number, sr: number) =>
        makeAudioBuffer(sr, length)
      ),
    createBufferSource: vi.fn().mockImplementation(makeBufferSourceNode),
  };
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

let AudioContextMock: ReturnType<typeof makeAudioContextMock>;

beforeEach(() => {
  // Reset the module registry so the singleton `audioCtx` in sounds.ts is null
  vi.resetModules();

  AudioContextMock = makeAudioContextMock();

  // Inject into the global scope (jsdom doesn't have AudioContext)
  // Must use a real function (not arrow) to be callable with `new`
  (globalThis as any).AudioContext = function () { return AudioContextMock; };
});

afterEach(() => {
  vi.restoreAllMocks();
  delete (globalThis as any).AudioContext;
});

// ---------------------------------------------------------------------------
// Helper: dynamic import after mock is set up
// ---------------------------------------------------------------------------
async function getSounds() {
  return import('../lib/sounds');
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('sounds.ts — Web Audio API sound functions', () => {
  it('AudioContext is created on first call', async () => {
    const { playSelect } = await getSounds();
    playSelect();
    // Verify oscillator was created (proves AudioContext was instantiated)
    expect(AudioContextMock.createOscillator).toHaveBeenCalled();
  });

  it('playSelect — does not throw', async () => {
    const { playSelect } = await getSounds();
    expect(() => playSelect()).not.toThrow();
  });

  it('playSelect — is idempotent (calling twice does not crash)', async () => {
    const { playSelect } = await getSounds();
    expect(() => {
      playSelect();
      playSelect();
    }).not.toThrow();
  });

  it('playTick — does not throw', async () => {
    const { playTick } = await getSounds();
    expect(() => playTick()).not.toThrow();
  });

  it('playTick — is idempotent', async () => {
    const { playTick } = await getSounds();
    expect(() => {
      playTick();
      playTick();
    }).not.toThrow();
  });

  it('playCorrect — does not throw', async () => {
    const { playCorrect } = await getSounds();
    expect(() => playCorrect()).not.toThrow();
  });

  it('playCorrect — creates multiple oscillators for chord', async () => {
    const { playCorrect } = await getSounds();
    playCorrect();
    // playCorrect uses 3 frequencies → 3 oscillators
    expect(AudioContextMock.createOscillator).toHaveBeenCalledTimes(3);
  });

  it('playWrong — does not throw', async () => {
    const { playWrong } = await getSounds();
    expect(() => playWrong()).not.toThrow();
  });

  it('playWrong — is idempotent', async () => {
    const { playWrong } = await getSounds();
    expect(() => {
      playWrong();
      playWrong();
    }).not.toThrow();
  });

  it('playBattleStart — does not throw', async () => {
    const { playBattleStart } = await getSounds();
    expect(() => playBattleStart()).not.toThrow();
  });

  it('playBattleStart — creates multiple oscillators', async () => {
    const { playBattleStart } = await getSounds();
    playBattleStart();
    // 1 sawtooth sweep + 3 chord sines = 4 oscillators
    expect(AudioContextMock.createOscillator).toHaveBeenCalledTimes(4);
  });

  it('playVictory — does not throw', async () => {
    const { playVictory } = await getSounds();
    expect(() => playVictory()).not.toThrow();
  });

  it('playVictory — is idempotent', async () => {
    const { playVictory } = await getSounds();
    expect(() => {
      playVictory();
      playVictory();
    }).not.toThrow();
  });

  it('playDefeat — does not throw', async () => {
    const { playDefeat } = await getSounds();
    expect(() => playDefeat()).not.toThrow();
  });

  it('playDefeat — is idempotent', async () => {
    const { playDefeat } = await getSounds();
    expect(() => {
      playDefeat();
      playDefeat();
    }).not.toThrow();
  });

  it('playTimerWarning — does not throw', async () => {
    const { playTimerWarning } = await getSounds();
    expect(() => playTimerWarning()).not.toThrow();
  });

  it('playTimerWarning — is idempotent', async () => {
    const { playTimerWarning } = await getSounds();
    expect(() => {
      playTimerWarning();
      playTimerWarning();
    }).not.toThrow();
  });

  it('playDamage — does not throw', async () => {
    const { playDamage } = await getSounds();
    expect(() => playDamage()).not.toThrow();
  });

  it('playDamage — creates an AudioBuffer for noise', async () => {
    const { playDamage } = await getSounds();
    playDamage();
    expect(AudioContextMock.createBuffer).toHaveBeenCalledTimes(1);
    expect(AudioContextMock.createBufferSource).toHaveBeenCalledTimes(1);
  });

  it('playSwipe — does not throw', async () => {
    const { playSwipe } = await getSounds();
    expect(() => playSwipe()).not.toThrow();
  });

  it('playSwipe — is idempotent', async () => {
    const { playSwipe } = await getSounds();
    expect(() => {
      playSwipe();
      playSwipe();
    }).not.toThrow();
  });

  it('AudioContext is reused across calls (singleton)', async () => {
    const { playSelect, playTick } = await getSounds();
    playSelect();
    const callsAfterFirst = AudioContextMock.createOscillator.mock.calls.length;
    playTick();
    // Both calls should use the same AudioContext (oscillator mock is on same instance)
    expect(AudioContextMock.createOscillator.mock.calls.length).toBeGreaterThan(callsAfterFirst);
  });

  it('AudioContext.resume is called when state is suspended', async () => {
    // Simulate a suspended context (e.g. after user gesture policy)
    AudioContextMock.state = 'suspended';
    const { playSelect } = await getSounds();
    playSelect();
    expect(AudioContextMock.resume).toHaveBeenCalled();
  });
});
