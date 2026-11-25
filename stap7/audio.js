// Geluid zonder bestanden: we maken alles zelf met de Web Audio API.
//
//   bron (oscillator / ruis) → filter → volume (gain) → luidsprekers
//
// Browsers laten pas geluid toe NA een actie van de gebruiker (klik/toets),
// daarom roepen we init() op bij de eerste druk op spatie.

export function createAudio() {
  let ctx = null
  let engine, engineFilter, engineGain
  let noiseBuffer
  let lastHit = 0
  let sirenGain

  function init() {
    if (ctx) return
    ctx = new AudioContext()

    // MOTOR: een zaagtand-golf (klinkt "brommerig") door een lowpass-filter (dempt de scherpte)
    engine = ctx.createOscillator()
    engine.type = 'sawtooth'
    engineFilter = ctx.createBiquadFilter()
    engineFilter.type = 'lowpass'
    engineFilter.frequency.value = 300
    engineGain = ctx.createGain()
    engineGain.gain.value = 0
    engine.connect(engineFilter).connect(engineGain).connect(ctx.destination)
    engine.start()

    // SIRENE: een "tweetoon" zoals bij Belgische/Nederlandse hulpdiensten.
    //
    //   LFO (traag, blokgolf ±1) → × 75 Hz ──┐
    //                                         ▼ (wordt OPGETELD bij de frequentie)
    //   toon (zaagtand, 510 Hz) ─────────────► filter → volume → luidsprekers
    //
    // De blokgolf springt tussen -1 en +1, dus de toon springt tussen
    // 510 - 75 = 435 Hz en 510 + 75 = 585 Hz. Een LFO (Low Frequency Oscillator)
    // is gewoon een oscillator die te traag is om te horen en iets anders "bestuurt".
    const sirenTone = ctx.createOscillator()
    sirenTone.type = 'sawtooth'
    sirenTone.frequency.value = 510

    const lfo = ctx.createOscillator()
    lfo.type = 'square'
    lfo.frequency.value = 0.8 // 0,8 wissels per seconde → elke toon ±0,6 s
    const lfoDepth = ctx.createGain()
    lfoDepth.gain.value = 75
    lfo.connect(lfoDepth).connect(sirenTone.frequency) // een node verbinden met een PARAMETER!

    const sirenFilter = ctx.createBiquadFilter()
    sirenFilter.type = 'lowpass'
    sirenFilter.frequency.value = 1800 // zaagtand minder schel maken
    sirenGain = ctx.createGain()
    sirenGain.gain.value = 0 // standaard uit
    sirenTone.connect(sirenFilter).connect(sirenGain).connect(ctx.destination)
    sirenTone.start()
    lfo.start()

    // RUIS: 1 seconde willekeurige waarden, basis voor ontploffingen en crashes
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
    const data = noiseBuffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  }

  // Motorgeluid volgt de snelheid. setTargetAtTime = zacht overgaan, geen klikjes.
  function setEngine(speed, running) {
    if (!ctx) return
    const t = ctx.currentTime
    engine.frequency.setTargetAtTime(40 + speed * 3, t, 0.1)
    engineFilter.frequency.setTargetAtTime(200 + speed * 20, t, 0.1)
    engineGain.gain.setTargetAtTime(running ? 0.05 : 0, t, 0.2)
  }

  // Korte toon die snel uitsterft (en in toonhoogte zakt)
  function blip(frequency, duration, volume, type = 'square') {
    const t = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(frequency, t)
    osc.frequency.exponentialRampToValueAtTime(frequency * 0.5, t + duration)
    gain.gain.setValueAtTime(volume, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration)
    osc.connect(gain).connect(ctx.destination)
    osc.start(t)
    osc.stop(t + duration)
  }

  // Ruisstoot door een filter: hoe lager de filterfrequentie, hoe "doffer" de knal
  function noise(duration, filterFrequency, volume) {
    const t = ctx.currentTime
    const source = ctx.createBufferSource()
    source.buffer = noiseBuffer
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(filterFrequency, t)
    filter.frequency.exponentialRampToValueAtTime(60, t + duration)
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(volume, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration)
    source.connect(filter).connect(gain).connect(ctx.destination)
    source.start(t)
    source.stop(t + duration)
  }

  // Sirene aan/uit: we stoppen de oscillators nooit, we draaien enkel het volume open of dicht
  function setSiren(on) {
    if (!ctx) return
    sirenGain.gain.setTargetAtTime(on ? 0.06 : 0, ctx.currentTime, 0.05)
  }

  return {
    init,
    setEngine,
    setSiren,
    hit() {
      if (!ctx || ctx.currentTime - lastHit < 0.04) return // niet 20 tikjes tegelijk
      lastHit = ctx.currentTime
      blip(400 + Math.random() * 400, 0.08, 0.06)
    },
    blast() {
      if (!ctx) return
      noise(0.9, 1200, 0.6)
      blip(110, 0.4, 0.25, 'sine')
    },
    crash() {
      if (!ctx) return
      noise(1.4, 600, 0.8)
      blip(70, 0.8, 0.3, 'sawtooth')
    },
    click() {
      if (ctx) blip(900, 0.05, 0.04)
    },
  }
}
