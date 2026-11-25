// SLIDES – "Toon achterliggende techniek" bovenop elke demo
//
// Eén module voor alle stappen. Laad ze in de index.html van een stap VÓÓR main.js:
//   <script type="module" src="../slides/slides.js"></script>
// De stap wordt afgeleid uit de URL (/stap2/ → content.stap2).
//
// Wat doet deze module?
//   - een knop (en sneltoets T) die een slide-overlay opent
//   - zolang de overlay open is, staat de demo op PAUZE:
//       requestAnimationFrame wordt opgehouden en het geluid (AudioContext) gesuspend
//   - toetsen en klikken gaan dan NIET naar de game (de auto rijdt niet weg)
//   - pijltjes / spatie = volgende slide, Esc of T = terug naar de demo

import content from './content.js'
import './slides.css'

const stepId = (location.pathname.match(/\/(stap[\w-]+)\//) || [])[1]
const step = content[stepId]

// Volgorde van de stappen (voor "vorige/volgende stap")
const ORDER = Object.keys(content)

// ---------------------------------------------------------------
// PAUZE – vóór main.js geladen, zodat we alles kunnen onderscheppen
// ---------------------------------------------------------------
const rawRequestAnimationFrame = window.requestAnimationFrame.bind(window)
const waitingFrames = []
let paused = false

window.requestAnimationFrame = (callback) => {
  if (!paused) return rawRequestAnimationFrame(callback)
  waitingFrames.push(callback)
  return 0
}

const audioContexts = new Set()
for (const name of ['AudioContext', 'webkitAudioContext']) {
  const Original = window[name]
  if (!Original) continue
  window[name] = class extends Original {
    constructor(...args) {
      super(...args)
      audioContexts.add(this)
    }
  }
}

function setPaused(value) {
  paused = value
  for (const ctx of audioContexts) {
    if (value && ctx.state === 'running') ctx.suspend()
    else if (!value && ctx.state === 'suspended') ctx.resume()
  }
  if (!value) waitingFrames.splice(0).forEach((cb) => rawRequestAnimationFrame(cb))
}

// ---------------------------------------------------------------
// SYNTAX HIGHLIGHTING (klein, per regel, genoeg voor JS-snippets)
// ---------------------------------------------------------------
const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const TOKEN = new RegExp(
  [
    String.raw`(\/\/.*$)`,                                                      // 1 commentaar
    String.raw`(\x60(?:\\.|[^\x60])*\x60|'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")`, // 2 string
    String.raw`\b(\d[\d_]*(?:\.\d+)?(?:e[+-]?\d+)?)\b`,                         // 3 getal
    String.raw`\b(const|let|var|function|return|if|else|for|of|in|new|import|from|export|async|await|while|true|false|null|undefined|class|this|throw|try|catch|continue|break|typeof)\b`, // 4 keyword
    String.raw`([A-Za-z_$][\w$]*)(?=\s*\()`,                                     // 5 functie-oproep
    String.raw`\b([A-Z][A-Z0-9_]{2,})\b`,                                        // 6 CONSTANTE
  ].join('|'),
  'g'
)
const TOKEN_CLASS = [null, 'c', 's', 'n', 'k', 'f', 'n']

function highlightLine(line) {
  let out = ''
  let last = 0
  for (const m of line.matchAll(TOKEN)) {
    out += escapeHtml(line.slice(last, m.index))
    const group = m.slice(1).findIndex((g) => g !== undefined) + 1
    out += `<span class="tk-${TOKEN_CLASS[group]}">${escapeHtml(m[0])}</span>`
    last = m.index + m[0].length
  }
  return out + escapeHtml(line.slice(last))
}

function renderCode({ file, src, hl = [] }) {
  const lines = src.replace(/^\n+|\s+$/g, '').split('\n')
  const marked = new Set(hl)
  const body = lines
    .map((line, i) => `<span class="ln${marked.has(i + 1) ? ' hl' : ''}">${highlightLine(line) || ' '}</span>`)
    .join('')
  return `
    <figure class="sl-code">
      ${file ? `<figcaption>${escapeHtml(file)}</figcaption>` : ''}
      <pre><code>${body}</code></pre>
    </figure>`
}

// ---------------------------------------------------------------
// DOM
// ---------------------------------------------------------------
function el(html) {
  const t = document.createElement('template')
  t.innerHTML = html.trim()
  return t.content.firstElementChild
}

const isEditable = (t) => t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))

// Klikken en muisbewegingen op onze UI mogen niet bij de game (window-listeners) aankomen
function shield(node) {
  for (const type of ['pointerdown', 'pointerup', 'pointermove', 'mousedown', 'mouseup', 'mousemove', 'click', 'dblclick', 'contextmenu', 'wheel']) {
    node.addEventListener(type, (e) => e.stopPropagation())
  }
}

if (step) init()

function init() {
  const slides = [buildIntro(), ...step.slides]
  let index = 0
  let open = false
  const heldKeys = new Set()

  // ---- De knop in de demo ----
  const launcher = el(`
    <button class="sl-launch" type="button" title="Sneltoets: T">
      <span class="sl-launch-icon" aria-hidden="true">&lt;/&gt;</span>
      Toon achterliggende techniek
      <kbd>T</kbd>
    </button>`)
  launcher.addEventListener('mousedown', (e) => e.preventDefault()) // geen focus → spatie blijft van de game
  launcher.addEventListener('click', () => show())
  shield(launcher)

  // ---- De overlay ----
  const stepPos = ORDER.indexOf(stepId)
  const prevStep = ORDER[stepPos - 1]
  const nextStep = ORDER[stepPos + 1]

  const overlay = el(`
    <div class="sl-overlay" role="dialog" aria-modal="true" aria-label="Achterliggende techniek" hidden>
      <div class="sl-deck">
        <header class="sl-top">
          <div class="sl-crumb">
            <span class="sl-step">${escapeHtml(step.label)}</span>
            <span class="sl-step-title">${escapeHtml(step.title)}</span>
          </div>
          <div class="sl-paused">Demo gepauzeerd</div>
          <button class="sl-close" type="button" data-action="close">
            Terug naar demo <kbd>Esc</kbd>
          </button>
        </header>
        <main class="sl-stage"></main>
        <footer class="sl-bottom">
          <div class="sl-stepnav">
            ${prevStep ? `<a href="/${prevStep}/">← ${escapeHtml(content[prevStep].label)}</a>` : '<span></span>'}
          </div>
          <div class="sl-nav">
            <button type="button" data-action="prev" aria-label="Vorige slide">‹</button>
            <div class="sl-dots"></div>
            <button type="button" data-action="next" aria-label="Volgende slide">›</button>
          </div>
          <div class="sl-stepnav sl-stepnav-right">
            ${nextStep ? `<a href="/${nextStep}/">${escapeHtml(content[nextStep].label)} →</a>` : '<a href="/">Overzicht →</a>'}
          </div>
        </footer>
      </div>
    </div>`)
  shield(overlay)

  const stage = overlay.querySelector('.sl-stage')
  const dots = overlay.querySelector('.sl-dots')
  dots.innerHTML = slides
    .map((s, i) => `<button type="button" data-goto="${i}" title="${escapeHtml(s.title)}" aria-label="Slide ${i + 1}: ${escapeHtml(s.title)}"></button>`)
    .join('')

  overlay.addEventListener('click', (e) => {
    const target = e.target.closest('[data-action],[data-goto]')
    if (!target) return
    if (target.dataset.goto !== undefined) go(Number(target.dataset.goto))
    else if (target.dataset.action === 'prev') go(index - 1)
    else if (target.dataset.action === 'next') go(index + 1)
    else if (target.dataset.action === 'close') hide()
  })

  document.body.append(launcher, overlay)

  // ---- Toetsen: in de CAPTURE-fase, dus vóór de game ze ziet ----
  addEventListener('keydown', (e) => {
    if (!open) {
      if (e.code === 'KeyT' && !e.repeat && !e.metaKey && !e.ctrlKey && !isEditable(e.target)) {
        e.preventDefault()
        e.stopImmediatePropagation()
        show()
      } else {
        heldKeys.add(e.code)
      }
      return
    }
    e.preventDefault()
    e.stopImmediatePropagation()
    switch (e.code) {
      case 'ArrowRight': case 'ArrowDown': case 'PageDown': case 'Space': case 'Enter': case 'KeyD': case 'KeyS':
        go(index + 1); break
      case 'ArrowLeft': case 'ArrowUp': case 'PageUp': case 'Backspace': case 'KeyA': case 'KeyW':
        go(index - 1); break
      case 'Home': go(0); break
      case 'End': go(slides.length - 1); break
      case 'Escape': case 'KeyT':
        if (!e.repeat) hide()
        break
      default:
        if (/^Digit[0-9]$/.test(e.code)) go(Number(e.code.slice(5)))
    }
  }, true)

  addEventListener('keyup', (e) => {
    heldKeys.delete(e.code)
    if (open) e.stopImmediatePropagation()
  }, true)

  function show(at = index) {
    if (open) return
    // Toetsen die nog ingedrukt zijn "loslaten", anders blijft de auto gas geven na de pauze
    for (const code of heldKeys) dispatchEvent(new KeyboardEvent('keyup', { code }))
    heldKeys.clear()
    open = true
    setPaused(true)
    overlay.hidden = false
    launcher.hidden = true
    document.documentElement.classList.add('sl-open')
    go(at, true)
  }

  function hide() {
    if (!open) return
    open = false
    overlay.hidden = true
    launcher.hidden = false
    document.documentElement.classList.remove('sl-open')
    document.activeElement?.blur?.() // spatie mag geen knop meer "klikken"
    history.replaceState(null, '', location.pathname + location.search)
    setPaused(false)
  }

  function go(i, force = false) {
    const next = Math.max(0, Math.min(slides.length - 1, i))
    if (next === index && !force) return
    const direction = next >= index ? 1 : -1
    index = next
    stage.innerHTML = renderSlide(slides[index], index)
    stage.dataset.dir = direction
    stage.scrollTop = 0
    stage.querySelector('.sl-slide')?.classList.add('sl-enter')
    dots.querySelectorAll('button').forEach((d, n) => d.classList.toggle('on', n === index))
    overlay.querySelector('[data-action="prev"]').disabled = index === 0
    overlay.querySelector('[data-action="next"]').disabled = index === slides.length - 1
    history.replaceState(null, '', `#techniek-${index + 1}`)
  }

  // Intro-slide: de grote vraag + een klikbare inhoudstafel
  function buildIntro() {
    return {
      intro: true,
      title: step.title,
      kicker: step.label,
      text: `<p class="sl-question">${step.question}</p>${step.intro ? `<p>${step.intro}</p>` : ''}`,
    }
  }

  function renderSlide(s, i) {
    if (s.intro) {
      const agenda = step.slides
        .map((x, n) => `<li><button type="button" data-goto="${n + 1}"><span>${n + 1}</span>${escapeHtml(x.title)}</button></li>`)
        .join('')
      return `
        <article class="sl-slide sl-intro">
          <div class="sl-kicker">${escapeHtml(s.kicker)} · achterliggende techniek</div>
          <h2>${escapeHtml(s.title)}</h2>
          <div class="sl-text">${s.text}</div>
          <ol class="sl-agenda">${agenda}</ol>
        </article>`
    }
    const visual = [s.diagram ? `<div class="sl-diagram">${s.diagram}</div>` : '', s.code ? [].concat(s.code).map(renderCode).join('') : '']
      .join('')
    return `
      <article class="sl-slide ${visual ? 'sl-split' : 'sl-solo'}${s.wide ? ' sl-wide' : ''}">
        <div class="sl-copy">
          <div class="sl-kicker">${i} / ${slides.length - 1}${s.kicker ? ` · ${escapeHtml(s.kicker)}` : ''}</div>
          <h2>${escapeHtml(s.title)}</h2>
          <div class="sl-text">${s.text || ''}</div>
          ${s.try ? `<div class="sl-try"><span class="sl-try-label">Probeer in de demo</span>${s.try}</div>` : ''}
        </div>
        ${visual ? `<div class="sl-visual">${visual}</div>` : ''}
      </article>`
  }

  // Direct openen via de URL, bv. /stap2/#techniek-3
  function openFromHash() {
    const m = location.hash.match(/^#techniek(?:-(\d+))?$/)
    if (!m) return
    const at = m[1] ? Number(m[1]) - 1 : 0
    if (open) go(at)
    else show(at)
  }
  openFromHash()
  addEventListener('hashchange', openFromHash)
}
