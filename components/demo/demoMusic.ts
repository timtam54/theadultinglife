// Gentle background music for the demo slideshows, made in the browser with the
// Web Audio API - no audio file, nothing to license or download. A soft chord
// pad (C - G - Am - F) with a light plucked arpeggio, looping at ~76 bpm.
// Browsers only allow sound after a click, so start() is called from Play.

export interface DemoMusic {
  start: () => void
  pause: () => void
  stop: () => void
}

const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12)
const CHORDS = [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]] // C G Am F
const ARP = [0, 1, 2, 1, 2, 1, 0, 2] // which chord note each eighth plays
const BEAT = 60 / 76
const VOLUME = 0.55

// The music file used if it exists (a licensed / royalty-free MP3). If it's
// missing or won't play, the generated music below is used instead.
export const DEMO_MUSIC_SRC = "/audio/demo-music.mp3"

/** Plays DEMO_MUSIC_SRC on a loop with fades; falls back to the generated music. */
export function createDemoMusic(src: string = DEMO_MUSIC_SRC): DemoMusic {
  const synth = createGeneratedMusic()
  let audio: HTMLAudioElement | null = null
  let failed = false
  let fade: ReturnType<typeof setInterval> | null = null
  let wantPlaying = false
  const fadeTo = (target: number, ms: number, done?: () => void) => {
    if (!audio) return
    if (fade) clearInterval(fade)
    const a = audio, start = a.volume, steps = Math.max(1, Math.round(ms / 50))
    let n = 0
    fade = setInterval(() => {
      n++
      a.volume = Math.min(1, Math.max(0, start + (target - start) * (n / steps)))
      if (n >= steps) { clearInterval(fade!); fade = null; done?.() }
    }, 50)
  }
  const useSynth = () => { failed = true; audio = null; if (wantPlaying) synth.start() }
  return {
    start() {
      wantPlaying = true
      if (failed || typeof Audio === "undefined") { synth.start(); return }
      if (!audio) {
        audio = new Audio(src)
        audio.loop = true
        audio.volume = 0
        audio.addEventListener("error", useSynth, { once: true })
      }
      audio.play().then(() => fadeTo(0.5, 1200)).catch(() => { if (audio?.error) useSynth() })
    },
    pause() {
      wantPlaying = false
      if (failed) { synth.pause(); return }
      fadeTo(0, 600, () => audio?.pause())
    },
    stop() {
      wantPlaying = false
      synth.stop()
      if (audio) { const a = audio; fadeTo(0, 600, () => { a.pause(); a.src = "" }) }
      audio = null
    },
  }
}

/** Generated music (Web Audio) - used when there's no music file. */
function createGeneratedMusic(): DemoMusic {
  let ctx: AudioContext | null = null
  let master: GainNode | null = null
  let filter: BiquadFilterNode | null = null
  let timer: ReturnType<typeof setInterval> | null = null
  let nextTime = 0
  let step = 0

  const pad = (notes: number[], t: number, dur: number) => {
    if (!ctx || !filter) return
    for (const n of notes) {
      for (const detune of [-6, 6]) {
        const o = ctx.createOscillator()
        o.type = "triangle"
        o.frequency.value = hz(n - 12)
        o.detune.value = detune
        const g = ctx.createGain()
        g.gain.setValueAtTime(0, t)
        g.gain.linearRampToValueAtTime(0.045, t + 1.2)
        g.gain.setValueAtTime(0.045, t + dur - 0.8)
        g.gain.linearRampToValueAtTime(0, t + dur)
        o.connect(g).connect(filter)
        o.start(t)
        o.stop(t + dur + 0.05)
      }
    }
  }

  const pluck = (n: number, t: number, level: number) => {
    if (!ctx || !filter) return
    const o = ctx.createOscillator()
    o.type = "sine"
    o.frequency.value = hz(n + 12)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(level, t + 0.015)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1)
    o.connect(g).connect(filter)
    o.start(t)
    o.stop(t + 1.2)
  }

  // Schedule a little ahead of time so timing stays smooth.
  const schedule = () => {
    if (!ctx) return
    while (nextTime < ctx.currentTime + 0.6) {
      const chord = CHORDS[Math.floor(step / 8) % CHORDS.length]
      if (step % 8 === 0) pad(chord, nextTime, BEAT * 4 + 0.6)
      if (step % 2 === 0 || step % 8 === 5) pluck(chord[ARP[step % 8] % chord.length], nextTime, step % 8 === 0 ? 0.07 : 0.045)
      nextTime += BEAT / 2
      step++
    }
  }

  return {
    start() {
      try {
        if (ctx && ctx.state === "closed") ctx = null // closed by a previous stop() - start afresh
        if (!ctx) {
          const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
          ctx = new AC()
          master = ctx.createGain()
          master.gain.value = 0
          filter = ctx.createBiquadFilter()
          filter.type = "lowpass"
          filter.frequency.value = 1400
          filter.connect(master).connect(ctx.destination)
          nextTime = ctx.currentTime + 0.1
        }
        ctx.resume().catch(() => {})
        if (nextTime < ctx.currentTime) nextTime = ctx.currentTime + 0.1
        master!.gain.cancelScheduledValues(ctx.currentTime)
        master!.gain.setValueAtTime(master!.gain.value, ctx.currentTime)
        master!.gain.linearRampToValueAtTime(VOLUME, ctx.currentTime + 1.2)
        if (!timer) timer = setInterval(schedule, 150)
      } catch { /* no Web Audio - play silently */ }
    },
    pause() {
      if (timer) { clearInterval(timer); timer = null }
      if (ctx && master) {
        master.gain.cancelScheduledValues(ctx.currentTime)
        master.gain.setValueAtTime(master.gain.value, ctx.currentTime)
        master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6)
      }
    },
    stop() {
      this.pause()
      const c = ctx
      ctx = null; master = null; filter = null; step = 0
      if (c) setTimeout(() => { if (c.state !== "closed") c.close().catch(() => {}) }, 700)
    },
  }
}
