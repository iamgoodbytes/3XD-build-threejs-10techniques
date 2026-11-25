// RADIO "NACHTRIT FM" – muziek die we zelf genereren met de Web Audio API
//
// Een mini-sequencer: 16 stappen per maat (zestienden), 4 maten akkoordenschema.
//
//   stap:   0 1 2 3 4 5 6 7 8 9 A B C D E F
//   kick:   x . . . x . . . x . . . x . . .
//   snare:  . . . . x . . . . . . . x . . .
//   hihat:  . . x . . . x . . . x . . . x .
//   bas:    x . x . x . x . x . x . x . x .   (grondtoon van het akkoord, met octaafsprong)
//   arp:    elke zestiende een noot uit het akkoord
//
// TIMING: setInterval is niet nauwkeurig genoeg voor muziek (kan 10–50 ms haperen).
// Daarom de klassieke "lookahead scheduler": elke 25 ms kijken we 0,12 s vooruit en
// PLANNEN we de noten op het exacte AudioContext-tijdstip (start(tijd)). De audio-hardware
// speelt ze dan perfect op tijd af, ook als JavaScript even hapert.

const BPM = 104
const STEP_TIME = 60 / BPM / 4 // duur van een zestiende noot in seconden

// Am – F – C – G (in Hz): grondtoon voor de bas, drieklank voor de arpeggio
const CHORDS = [
  { bass: 55.0, notes: [220.0, 261.63, 329.63] },  // A mineur
  { bass: 43.65, notes: [174.61, 220.0, 261.63] }, // F majeur
  { bass: 65.41, notes: [261.63, 329.63, 392.0] }, // C majeur
  { bass: 49.0, notes: [196.0, 246.94, 293.66] },  // G majeur
]

export function createRadio(audio) {
  let ctx = null
  let master
  let noise
  let timer = null
  let step = 0
  let nextTime = 0

  function setup() {
    ctx = audio.context
    master = ctx.createGain()
    master.gain.value = 0.22
    master.connect(ctx.destination)
    noise = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate)
    const data = noise.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  }

  // ---- Instrumenten: elk maakt kort een paar nodes aan op tijdstip t ----
  function envelope(t, peak, duration) {
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(peak, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration)
    gain.connect(master)
    return gain
  }

  function kick(t) {
    const osc = ctx.createOscillator()
    osc.frequency.setValueAtTime(140, t)
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.15) // toonhoogte zakt snel = "boem"
    osc.connect(envelope(t, 1, 0.3))
    osc.start(t)
    osc.stop(t + 0.3)
  }

  function noiseHit(t, type, frequency, peak, duration) {
    const source = ctx.createBufferSource()
    source.buffer = noise
    const filter = ctx.createBiquadFilter()
    filter.type = type
    filter.frequency.value = frequency
    source.connect(filter).connect(envelope(t, peak, duration))
    source.start(t)
    source.stop(t + duration)
  }

  function tone(t, frequency, type, peak, duration, filterFrequency) {
    const osc = ctx.createOscillator()
    osc.type = type
    osc.frequency.value = frequency
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = filterFrequency
    osc.connect(filter).connect(envelope(t, peak, duration))
    osc.start(t)
    osc.stop(t + duration)
  }

  // ---- Eén stap van de sequencer plannen ----
  function scheduleStep(s, t) {
    const beat = s % 16
    const chord = CHORDS[Math.floor(s / 16) % CHORDS.length]

    if (beat % 4 === 0) kick(t)
    if (beat === 4 || beat === 12) noiseHit(t, 'bandpass', 1800, 0.5, 0.18) // snare
    if (beat % 4 === 2) noiseHit(t, 'highpass', 7000, 0.25, 0.05)           // hihat
    if (beat % 2 === 0) {
      const octave = beat % 4 === 2 ? 2 : 1 // om de 8ste een octaaf hoger
      tone(t, chord.bass * octave, 'sawtooth', 0.35, STEP_TIME * 1.8, 500)
    }
    const arpNote = chord.notes[beat % chord.notes.length] * (beat >= 8 ? 2 : 1)
    tone(t, arpNote, 'square', 0.06, STEP_TIME * 0.9, 2500)
  }

  function scheduler() {
    while (nextTime < ctx.currentTime + 0.12) {
      scheduleStep(step, nextTime)
      nextTime += STEP_TIME
      step++
    }
  }

  return {
    get playing() { return timer !== null },
    toggle() {
      if (!audio.context) return false
      if (!ctx) setup()
      if (timer) {
        clearInterval(timer)
        timer = null
      } else {
        nextTime = ctx.currentTime + 0.05
        timer = setInterval(scheduler, 25)
      }
      return timer !== null
    },
  }
}
