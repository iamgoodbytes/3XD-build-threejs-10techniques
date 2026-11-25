// INHOUD VAN DE SLIDES – per stap
//
// Elke stap: { label, title, question, intro?, slides: [...] }
// Elke slide:
//   title    titel
//   kicker   klein label boven de titel (optioneel)
//   text     HTML
//   code     { file, src, hl: [regelnummers in de snippet] }  of een lijst daarvan
//   diagram  HTML/SVG (optioneel)
//   try      wat je in de demo kan uitproberen (optioneel)
//   wide     true = meer ruimte voor de code
//
// De codefragmenten zijn letterlijk overgenomen uit de stapbestanden (soms ingekort met "// …").
// Controleer na een codewijziging: node slides/check-snippets.mjs

const flow = (...items) =>
  `<div class="sl-flow">${items
    .map((it) => (it === '→' ? '<i>→</i>' : `<div><b>${it[0]}</b><small>${it[1] || ''}</small></div>`))
    .join('')}</div>`

// ---------------------------------------------------------------
// Diagrammen (SVG)
// ---------------------------------------------------------------
const svgHeading = `
<svg viewBox="0 0 400 250" font-family="ui-monospace, Menlo, monospace" font-size="13">
  <defs>
    <marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill="#ffb547"/>
    </marker>
    <marker id="ag" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill="#6f7b94"/>
    </marker>
  </defs>
  <line x1="140" y1="215" x2="140" y2="20" stroke="#6f7b94" marker-end="url(#ag)"/>
  <line x1="140" y1="215" x2="330" y2="215" stroke="#6f7b94" marker-end="url(#ag)"/>
  <text x="148" y="28" fill="#98a2b8">+z (heading 0)</text>
  <text x="300" y="235" fill="#98a2b8">+x</text>
  <path d="M140,140 A75,75 0 0 1 193,162" fill="none" stroke="#7cc4ff" stroke-dasharray="3 3"/>
  <text x="160" y="128" fill="#7cc4ff">heading</text>
  <line x1="140" y1="215" x2="246" y2="109" stroke="#ffb547" stroke-width="3" marker-end="url(#ah)"/>
  <line x1="246" y1="109" x2="246" y2="215" stroke="#ffb547" stroke-dasharray="4 4" opacity=".6"/>
  <line x1="140" y1="109" x2="246" y2="109" stroke="#ffb547" stroke-dasharray="4 4" opacity=".6"/>
  <text x="252" y="170" fill="#ffd79a">z = cos(heading)</text>
  <text x="152" y="102" fill="#ffd79a">x = sin(heading)</text>
  <rect x="122" y="196" width="36" height="38" rx="6" fill="#e63946" transform="rotate(45 140 215)"/>
  <text x="10" y="245" fill="#98a2b8">bovenaanzicht</text>
</svg>`

const svgTreadmill = `
<svg viewBox="0 0 560 230" font-family="ui-monospace, Menlo, monospace" font-size="13">
  <defs>
    <marker id="at" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill="#ffb547"/>
    </marker>
  </defs>
  <text x="10" y="20" fill="#98a2b8">rijrichting +z →</text>
  <g>
    <rect x="10"  y="60" width="96" height="70" rx="6" fill="#2a3346" stroke="#ff6b6b" stroke-dasharray="5 4"/>
    <rect x="110" y="60" width="96" height="70" rx="6" fill="#2f5a1f"/>
    <rect x="210" y="60" width="96" height="70" rx="6" fill="#2f5a1f"/>
    <rect x="310" y="60" width="96" height="70" rx="6" fill="#2f5a1f"/>
    <rect x="410" y="60" width="96" height="70" rx="6" fill="#2f5a1f"/>
    <rect x="510" y="60" width="40" height="70" rx="6" fill="none" stroke="#ffb547" stroke-dasharray="5 4"/>
  </g>
  <text x="22" y="100" fill="#ff8f8f">achter</text>
  <text x="22" y="116" fill="#ff8f8f">de auto</text>
  <text x="122" y="100" fill="#cfe8b8">tegel</text>
  <text x="222" y="100" fill="#cfe8b8">tegel</text>
  <text x="322" y="100" fill="#cfe8b8">tegel</text>
  <text x="422" y="100" fill="#cfe8b8">tegel</text>
  <rect x="140" y="85" width="34" height="20" rx="4" fill="#e63946"/>
  <path d="M58,58 C 160,-10 420,-10 528,56" fill="none" stroke="#ffb547" stroke-width="2.5" marker-end="url(#at)"/>
  <text x="200" y="30" fill="#ffd79a">z += TILE_COUNT × TILE_LENGTH (200 m)</text>
  <text x="10" y="165" fill="#98a2b8">altijd 5 tegels × 40 m = 200 m weg in beeld</text>
  <text x="10" y="185" fill="#98a2b8">mist (Fog 40 → 150 m) verbergt het einde</text>
  <text x="10" y="212" fill="#7cc4ff">grond (effen): schuift elke frame mee  ·  gras: in sprongen van 40 m</text>
</svg>`

const svgCircleRect = `
<svg viewBox="0 0 380 230" font-family="ui-monospace, Menlo, monospace" font-size="13">
  <defs>
    <marker id="ac" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill="#ffb547"/>
    </marker>
  </defs>
  <rect x="30" y="30" width="170" height="150" fill="#3b4256" stroke="#6f7b94"/>
  <text x="50" y="110" fill="#cdd3df">gebouw (x0..x1, z0..z1)</text>
  <circle cx="232" cy="98" r="48" fill="rgba(124,196,255,0.14)" stroke="#7cc4ff"/>
  <circle cx="232" cy="98" r="3" fill="#7cc4ff"/>
  <text x="242" y="90" fill="#7cc4ff">auto-punt</text>
  <circle cx="200" cy="98" r="5" fill="#ffb547"/>
  <text x="208" y="200" fill="#ffd79a">clamp(punt, rechthoek)</text>
  <line x1="205" y1="190" x2="201" y2="106" stroke="#ffd79a" stroke-dasharray="3 3"/>
  <line x1="232" y1="98" x2="300" y2="98" stroke="#ffb547" stroke-width="2.5" marker-end="url(#ac)"/>
  <text x="270" y="130" fill="#ffd79a">duw terug:</text>
  <text x="270" y="146" fill="#ffd79a">R − d</text>
  <text x="208" y="82" fill="#98a2b8">d</text>
</svg>`

// ---------------------------------------------------------------
export default {
  // =============================================================
  stap1: {
    label: 'Stap 1',
    title: 'Basis scene (groene kubus)',
    question: 'Wat heb je minimaal nodig om iets 3D op het scherm te krijgen, en waarom draait de kubus overal even snel?',
    intro: 'Drie bouwstenen, een mesh, licht en een lus die ±60 keer per seconde tekent.',
    slides: [
      {
        title: 'Scene, camera, renderer',
        kicker: 'De drie bouwstenen',
        text: `
          <ul>
            <li><b>Scene</b>: de wereld, een boom van objecten.</li>
            <li><b>Camera</b>: vanwaar we kijken. <code>PerspectiveCamera(fov, aspect, near, far)</code>: alles buiten <em>near…far</em> wordt niet getekend.</li>
            <li><b>Renderer</b>: tekent wat de camera ziet op een <code>&lt;canvas&gt;</code>.</li>
          </ul>
          <p class="sl-note"><code>setPixelRatio(min(dpr, 2))</code>: scherp op retina, maar niet 3× zoveel pixels op een telefoon.</p>`,
        code: {
          file: 'stap1/main.js',
          hl: [1, 4, 7],
          src: `
const scene = new THREE.Scene()
scene.background = new THREE.Color('#87ceeb') // lichtblauwe lucht

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 100)
camera.position.set(3, 2, 5) // x = rechts, y = omhoog, z = naar ons toe

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)) // scherp op retina, maar niet te zwaar
document.body.appendChild(renderer.domElement)        // het <canvas> element`,
        },
      },
      {
        title: 'Mesh = geometry + material (+ licht)',
        kicker: 'Wat je ziet',
        text: `
          <p>Een <b>mesh</b> combineert een <em>vorm</em> (geometry) met een <em>uiterlijk</em> (material).</p>
          <p><code>MeshStandardMaterial</code> rekent met licht: <b>zonder licht is hij zwart</b>.</p>
          <ul>
            <li><code>AmbientLight</code>: zacht licht van overal, geen schaduwkant.</li>
            <li><code>DirectionalLight</code>: zoals de zon, evenwijdige stralen → je ziet de vlakken.</li>
          </ul>`,
        code: {
          file: 'stap1/main.js',
          hl: [3, 7, 8],
          src: `
const geometry = new THREE.BoxGeometry(1, 1, 1)                      // breedte, hoogte, diepte
const material = new THREE.MeshStandardMaterial({ color: '#2ecc71' }) // reageert op licht
const cube = new THREE.Mesh(geometry, material)
scene.add(cube)

// MeshStandardMaterial is zwart zonder licht! Probeer het: zet de lichten in commentaar.
const ambientLight = new THREE.AmbientLight('#ffffff', 0.5)  // zacht licht van overal
const sun = new THREE.DirectionalLight('#ffffff', 2)         // zoals de zon: evenwijdige stralen
sun.position.set(5, 10, 5)
scene.add(ambientLight, sun)`,
        },
        try: 'Kijk naar de rode, groene en blauwe lijnen in het midden: dat is de <code>AxesHelper</code> (x, y, z).',
      },
      {
        title: 'De animatie-lus en delta time',
        kicker: 'Waarom overal even snel?',
        text: `
          <p><code>setAnimationLoop</code> roept <code>animate</code> op vóór elk beeld: 60× per seconde op een gewoon scherm, 120× of 144× op een snel scherm.</p>
          <p><b>dt</b> = seconden sinds de vorige frame. Vermenigvuldig elke beweging met <code>dt</code>, dan draait de kubus <em>1 radiaal per seconde</em>, ongeacht het scherm.</p>
          <p class="sl-note">Begrens <code>dt</code> op 0,1 s: na een tabwissel springt de kubus anders ineens 10 seconden vooruit.</p>`,
        code: {
          file: 'stap1/main.js',
          hl: [4, 7, 8],
          src: `
let previousTime = performance.now()

function animate(time) {
  const dt = Math.min((time - previousTime) / 1000, 0.1) // max 0,1 s (bv. na tabwissel)
  previousTime = time

  cube.rotation.y += dt * 1.0 // 1 radiaal per seconde
  cube.rotation.x += dt * 0.5

  controls.update()                // nodig voor enableDamping
  renderer.render(scene, camera)   // teken de frame
}

renderer.setAnimationLoop(animate)`,
        },
      },
      {
        title: 'OrbitControls en resize',
        kicker: 'Afwerking',
        text: `
          <ul>
            <li><b>OrbitControls</b>: slepen = rond het doel draaien, scrollen = zoomen. Met <code>enableDamping</code> loopt de beweging zacht uit, maar dan moet je <code>controls.update()</code> in de lus oproepen.</li>
            <li><b>Resize</b>: na het aanpassen van <code>camera.aspect</code> is <code>updateProjectionMatrix()</code> verplicht, anders blijft het beeld uitgerekt.</li>
          </ul>`,
        code: {
          file: 'stap1/main.js',
          hl: [2, 6],
          src: `
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true // zachte, "uitlopende" beweging

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix() // verplicht na het wijzigen van camera-instellingen!
  renderer.setSize(innerWidth, innerHeight)
})`,
        },
        try: 'Sleep met de muis en laat los: de camera bolt nog even uit. Maak het venster smaller: de kubus blijft een kubus.',
      },
    ],
  },

  // =============================================================
  stap2: {
    label: 'Stap 2',
    title: 'Voertuig (gefaket)',
    question: 'Wat maakt dat de auto kan rijden en sturen, en dat het terrein oneindig lijkt?',
    intro: 'Geen physics engine: drie getallen (<code>speed</code>, <code>heading</code>, <code>steer</code>) en wat wiskunde, elke frame opnieuw.',
    slides: [
      {
        title: 'Het idee: zelf rekenen, elke frame',
        kicker: 'Overzicht',
        text: `
          <p>"Gefaket" betekent: we berekenen zelf hoe de auto beweegt. Er zijn <b>geen botsingen</b>: de auto rijdt dwars door de kisten. Dat lossen we op in stap 3.</p>
          <p>De hele auto is <b>drie getallen</b>:</p>
          <ul>
            <li><code>speed</code>: m/s, negatief = achteruit</li>
            <li><code>heading</code>: richting in radialen rond de Y-as</li>
            <li><code>steer</code>: stuurhoek van de wielen (enkel voor het oog)</li>
          </ul>
          <p>Alle instellingen zijn "gevoel": speel ermee!</p>`,
        diagram: flow(['Toetsen', 'W A S D'], '→', ['speed', 'gas · rem · uitbollen'], '→', ['heading', 'sturen'], '→', ['positie', '+= forward × speed × dt'], '→', ['wielen + camera', 'animatie']),
        code: {
          file: 'stap2/main.js',
          src: `
const settings = {
  maxSpeed: 20,        // m/s vooruit
  maxReverse: 6,       // m/s achteruit
  acceleration: 12,    // m/s² bij gas geven
  brake: 25,           // m/s² bij remmen
  friction: 4,         // m/s² vertraging als je niets doet
  turnSpeed: 2.2,      // radialen/s bij volle snelheid
  maxSteerAngle: 0.5,  // hoe ver de voorwielen visueel draaien
}`,
        },
      },
      {
        title: 'Input: welke toetsen zijn ingedrukt?',
        kicker: 'Toetsenbord',
        text: `
          <p>We reageren niet op één <em>keydown</em>, maar houden een <b>Set</b> bij van alle toetsen die nu ingedrukt zijn. Zo kan je tegelijk gas geven én sturen.</p>
          <p><code>event.code</code> = de <b>fysieke</b> toets. Op een AZERTY-toetsenbord is dat dus Z/Q/S/D, zonder extra code.</p>`,
        code: {
          file: 'stap2/main.js',
          hl: [2, 3],
          src: `
const keys = new Set()
addEventListener('keydown', (e) => keys.add(e.code))
addEventListener('keyup', (e) => keys.delete(e.code))
const isDown = (...codes) => codes.some((c) => keys.has(c))`,
        },
      },
      {
        title: 'Gas, remmen en uitbollen',
        kicker: 'Rijden · deel 1',
        text: `
          <p><code>throttle</code> wordt <b>1</b>, <b>0</b> of <b>−1</b>.</p>
          <ul>
            <li>Gas terwijl je achteruit rijdt? Dan gebruiken we de <em>rem</em>-waarde (sterker).</li>
            <li>Niets ingedrukt? De snelheid zakt naar 0, maar <b>schiet er niet over</b> (anders ga je achteruit wiebelen).</li>
            <li><code>clamp</code> houdt de snelheid tussen −6 en 20 m/s.</li>
          </ul>
          <p class="sl-note">Snelheid += versnelling × dt  →  m/s += m/s² × s</p>`,
        code: {
          file: 'stap2/main.js · updateCar()',
          hl: [2, 5, 11],
          src: `
// 1. Gas / rem
const throttle = (isDown('KeyW', 'ArrowUp') ? 1 : 0) - (isDown('KeyS', 'ArrowDown') ? 1 : 0)

if (throttle > 0) {
  state.speed += (state.speed < 0 ? settings.brake : settings.acceleration) * dt
} else if (throttle < 0) {
  state.speed -= (state.speed > 0 ? settings.brake : settings.acceleration) * dt
} else {
  // uitbollen: snelheid gaat naar 0 maar schiet er niet over
  const drop = settings.friction * dt
  state.speed = Math.abs(state.speed) <= drop ? 0 : state.speed - Math.sign(state.speed) * drop
}
state.speed = THREE.MathUtils.clamp(state.speed, -settings.maxReverse, settings.maxSpeed)`,
        },
        try: 'Geef vol gas en laat los: de auto bolt uit. Druk dan S: eerst remmen, daarna pas achteruit.',
      },
      {
        title: 'Sturen en vooruit bewegen',
        kicker: 'Rijden · deel 2',
        text: `
          <p><b>Sturen</b> verandert de <code>heading</code>, maar maal <code>speedFactor</code>: een auto die stilstaat, kan niet draaien. Achteruit is de factor negatief → sturen keert om, net als echt.</p>
          <p><b>Vooruit</b> = de richting waarin de neus wijst: <code>(sin h, 0, cos h)</code>. Die vector × snelheid × dt tellen we bij de positie op.</p>`,
        diagram: svgHeading,
        code: {
          file: 'stap2/main.js · updateCar()',
          hl: [4, 7, 8],
          src: `
// 2. Sturen – een auto kan enkel draaien als hij rijdt
const steerInput = (isDown('KeyA', 'ArrowLeft') ? 1 : 0) - (isDown('KeyD', 'ArrowRight') ? 1 : 0)
const speedFactor = state.speed / settings.maxSpeed // -0.3 .. 1 → achteruit stuurt omgekeerd
state.heading += steerInput * settings.turnSpeed * speedFactor * dt

// 3. Verplaatsen in de richting waarin de auto kijkt
car.mesh.position.x += Math.sin(state.heading) * state.speed * dt
car.mesh.position.z += Math.cos(state.heading) * state.speed * dt
car.mesh.rotation.y = state.heading`,
        },
        try: 'Sta stil en druk A: er gebeurt niets. Rij achteruit (S) en stuur: de auto draait de andere kant op.',
      },
      {
        title: 'Hiërarchie: waarom draaien de wielen goed?',
        kicker: 'Groups en pivots',
        text: `
          <p>De auto is een <code>THREE.Group</code>. Alles wat erin zit, beweegt mee: één <code>position</code> en <code>rotation</code> voor de hele auto.</p>
          <p>Een voorwiel moet <b>twee</b> dingen tegelijk: <em>sturen</em> (rond Y) en <em>rollen</em> (rond X). Op één object geeft dat gewiebel, dus:</p>
          <ul>
            <li><b>pivot</b> (Group) draait rond Y = sturen</li>
            <li><b>wheel</b> (Mesh) erin draait rond X = rollen</li>
          </ul>
          <p>Rollen: <b>afstand / straal = hoek</b> in radialen. Zo slipt het wiel nooit visueel.</p>`,
        diagram: `<pre>car (Group)            <span class="acc">← positie + richting</span>
 ├─ body, cabin, lights
 └─ wheelPivot (Group)  <span class="acc">← rotation.y = sturen</span>
     └─ wheel (Mesh)    <span class="acc">← rotation.x = rollen</span></pre>`,
        code: {
          file: 'stap2/main.js · updateCar()',
          hl: [3, 6],
          src: `
// 4. Wielen animeren
//    rollen: afgelegde afstand / straal = hoek in radialen
for (const wheel of car.wheels) wheel.rotation.x += (state.speed * dt) / WHEEL_RADIUS
//    sturen: zacht naar de gewenste hoek bewegen
state.steer = THREE.MathUtils.damp(state.steer, steerInput * settings.maxSteerAngle, 10, dt)
for (const pivot of car.frontPivots) pivot.rotation.y = state.steer`,
        },
      },
      {
        title: 'De volgcamera',
        kicker: 'localToWorld + lerp',
        text: `
          <p>We beschrijven de camera <b>t.o.v. de auto</b>: 8 m erachter, 4 m erboven. <code>localToWorld</code> rekent dat om naar een plek in de wereld, ook als de auto gedraaid is.</p>
          <p>De camera springt er niet heen, maar schuift er elke frame een stukje naartoe (<b>lerp</b>). Dat geeft de zachte, "elastische" beweging.</p>
          <p class="sl-note"><code>1 − exp(−k·dt)</code> in plaats van een vaste 0,1: zo volgt de camera even snel op 60 Hz als op 144 Hz.</p>`,
        code: {
          file: 'stap2/main.js',
          hl: [1, 7, 9, 10],
          src: `
const cameraOffset = new THREE.Vector3(0, 4, -8) // achter (-z) en boven de auto, in auto-coördinaten
const lookOffset = new THREE.Vector3(0, 1, 4)    // kijk een beetje vóór de auto
// …
function updateCamera(dt, instant = false) {
  // localToWorld: zet een punt "relatief t.o.v. de auto" om naar wereldcoördinaten
  idealPosition.copy(cameraOffset)
  car.mesh.localToWorld(idealPosition)
  // …
  const t = instant ? 1 : 1 - Math.exp(-4 * dt)
  camera.position.lerp(idealPosition, t)
  currentLookAt.lerp(idealLookAt, t)
  camera.lookAt(currentLookAt)
}`,
        },
        try: 'Stuur hard naar links en rechts: de camera hangt even achter en draait dan pas mee.',
      },
      {
        title: '"Oneindig" terrein? Een goocheltruc',
        kicker: 'Wereld',
        text: `
          <p>In deze stap is het terrein <b>niet</b> oneindig. Het is een vlak van <b>400 × 400 m</b>. Dat <em>voelt</em> eindeloos door drie trucs:</p>
          <ul>
            <li><b>Mist</b> (<code>Fog</code> 30 → 90 m) in dezelfde kleur als de lucht: de rand verdwijnt in de horizon.</li>
            <li><b>Raster</b> op de grond: je ziet dat je beweegt, ook al is alles groen.</li>
            <li><b>De zon volgt de auto</b>: schaduwen worden maar in een vak van 60 × 60 m berekend, dus dat vak rijdt mee.</li>
          </ul>
          <p>Echt eindeloos (de wereld meeschuiven en recyclen) bouwen we in <b>stap 6</b>.</p>`,
        code: {
          file: 'stap2/main.js',
          hl: [1, 4, 14, 15],
          src: `
scene.fog = new THREE.Fog('#87ceeb', 30, 90) // verre dingen vervagen in de lucht

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(400, 400),
  new THREE.MeshStandardMaterial({ color: '#5a8f3e' })
)
ground.rotation.x = -Math.PI / 2 // een plane staat standaard rechtop → plat leggen

sun.shadow.camera.left = sun.shadow.camera.bottom = -30 // het gebied waarin schaduwen berekend worden
sun.shadow.camera.right = sun.shadow.camera.top = 30

// in animate():
// de zon (en zijn schaduwgebied) volgt de auto
sun.position.set(car.mesh.position.x + 10, 20, car.mesh.position.z + 10)
sun.target.position.copy(car.mesh.position)`,
        },
        try: 'Rij 200 m rechtdoor (± 10 s vol gas): het raster en de grond houden op, maar door de mist merk je de rand nauwelijks.',
      },
    ],
  },

  // =============================================================
  stap3: {
    label: 'Stap 3',
    title: 'Physics: blokjes omver rijden',
    question: 'Hoe laat je blokjes realistisch omvallen en wegvliegen als de auto ertegen rijdt?',
    intro: 'We voegen een tweede wereld toe: <b>cannon-es</b> rekent, Three.js tekent.',
    slides: [
      {
        title: 'Twee werelden die synchroon lopen',
        kicker: 'Het kernidee',
        text: `
          <p>Three.js weet niets van zwaartekracht of botsingen. Daarvoor gebruiken we een <b>physics engine</b>: cannon-es.</p>
          <p>Elk object bestaat dus <b>twee keer</b>: een <em>mesh</em> (wat je ziet) en een <em>body</em> (wat er gebeurt). Na elke physics-stap kopiëren we positie en rotatie van body → mesh.</p>
          <p class="sl-note">De physics-vorm mag veel eenvoudiger zijn dan de mesh: de auto is voor cannon één doos.</p>`,
        diagram: `<div class="sl-cols">
          <div><h4 style="color:#7cc4ff">Three.js · zien</h4><ul><li>Mesh, geometry, material</li><li>licht, schaduw, camera</li><li>weet niets van botsen</li></ul></div>
          <div><h4 style="color:#ffb547">cannon-es · gebeuren</h4><ul><li>Body, shape, massa</li><li>zwaartekracht, wrijving</li><li>tekent niets</li></ul></div>
        </div>`,
        code: {
          file: 'stap3/main.js',
          hl: [5, 6],
          src: `
function syncPhysicsToMeshes() {
  let fallen = 0
  for (const block of blocks) {
    // … physics rekent, Three.js tekent:
    block.mesh.position.copy(block.body.position)
    block.mesh.quaternion.copy(block.body.quaternion)
    if (block.body.position.distanceTo(block.start) > BLOCK_SIZE) fallen++
  }
  // …
}`,
        },
      },
      {
        title: 'De physics-wereld opzetten',
        kicker: 'World',
        text: `
          <ul>
            <li><b>gravity</b>: −9,82 m/s² op Y.</li>
            <li><b>SAPBroadphase</b>: snelle voorselectie "wie zit dicht bij wie", zodat niet elk paar blokjes getest wordt.</li>
            <li><b>solver.iterations</b>: meer = stabielere stapels, maar trager.</li>
            <li><b>allowSleep</b>: stilliggende blokjes "slapen" → stabiel én sneller.</li>
          </ul>
          <p>De grond is een <b>oneindig vlak</b>. Een cannon-Plane wijst naar +z, dus kantelen we hem zodat hij naar boven wijst.</p>`,
        code: {
          file: 'stap3/main.js',
          hl: [1, 9, 10],
          src: `
const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) })
world.broadphase = new CANNON.SAPBroadphase(world) // snelle "wie zit dicht bij wie"-check
world.defaultContactMaterial.friction = 0.4
world.defaultContactMaterial.restitution = 0.1 // een klein beetje stuiteren
world.solver.iterations = 20 // meer iteraties = stabielere stapels (maar trager)
world.allowSleep = true      // stilliggende blokjes "slapen": stabiel én sneller

// Static = beweegt nooit, massa 0. Een Plane wijst standaard naar +z → kantelen zodat hij naar +y wijst.
const groundBody = new CANNON.Body({ type: CANNON.Body.STATIC, shape: new CANNON.Plane() })
groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0)
world.addBody(groundBody)`,
        },
      },
      {
        title: 'Een blokje = mesh + body',
        kicker: 'Dynamic bodies',
        text: `
          <p>Massa &gt; 0 → de body is <b>DYNAMIC</b>: zwaartekracht en botsingen werken erop.</p>
          <p><b>Valkuil:</b> <code>CANNON.Box</code> wil <b>halve</b> afmetingen (van het midden tot de rand). Geef je de volle maat, dan zweven de blokjes boven elkaar.</p>
          <p>Muren, piramides en torens zijn gewoon lussen die <code>createBlock</code> oproepen.</p>`,
        code: {
          file: 'stap3/main.js',
          hl: [3, 12],
          src: `
const blockGeometry = new THREE.BoxGeometry(BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE)
// cannon-es werkt met HALVE afmetingen (afstand van het midden tot de rand)!
const blockShape = new CANNON.Box(new CANNON.Vec3(BLOCK_SIZE / 2, BLOCK_SIZE / 2, BLOCK_SIZE / 2))

function createBlock(x, y, z) {
  const material = blockColors[Math.floor(Math.random() * blockColors.length)]
  const mesh = new THREE.Mesh(blockGeometry, material)
  mesh.castShadow = mesh.receiveShadow = true
  scene.add(mesh)

  const body = new CANNON.Body({
    mass: 1, // massa > 0 → DYNAMIC: zwaartekracht en botsingen werken erop
    shape: blockShape,
    position: new CANNON.Vec3(x, y, z),
  })
  world.addBody(body)

  blocks.push({ mesh, body, start: new CANNON.Vec3(x, y, z) })
}`,
        },
        try: 'Druk <b>R</b> om alle blokjes opnieuw op te bouwen.',
      },
      {
        title: 'De auto: een KINEMATIC body',
        kicker: 'Static · Dynamic · Kinematic',
        text: `
          <table class="sl-table">
            <tr><th>type</th><th>gedrag</th><th>hier</th></tr>
            <tr><td>STATIC</td><td>beweegt nooit</td><td>grond</td></tr>
            <tr><td>DYNAMIC</td><td>zwaartekracht + botsingen</td><td>blokjes</td></tr>
            <tr><td>KINEMATIC</td><td>beweegt enkel met de snelheid die wíj geven, duwt alles weg alsof hij oneindig zwaar is</td><td>auto</td></tr>
          </table>
          <p style="margin-top:14px">Het rijgedrag van stap 2 blijft. Alleen zetten we niet meer de <em>positie</em>, maar de <b>snelheid</b> van de body. Zo weet cannon hoe hard de auto tegen de blokjes duwt.</p>`,
        code: {
          file: 'stap3/main.js',
          hl: [2, 6, 9],
          src: `
const carBody = new CANNON.Body({
  type: CANNON.Body.KINEMATIC,
  shape: new CANNON.Box(new CANNON.Vec3(0.6, 0.5, 1.1)), // halve breedte, hoogte, lengte
  position: new CANNON.Vec3(0, CAR_BODY_HEIGHT, 0),
})
carBody.allowSleep = false // anders valt de auto in slaap als hij stilstaat en negeert hij daarna zijn snelheid!

// in updateCar(), i.p.v. de positie aanpassen:
carBody.velocity.set(
  Math.sin(state.heading) * state.speed,
  0,
  Math.cos(state.heading) * state.speed
)
carBody.quaternion.setFromEuler(0, state.heading, 0)`,
        },
      },
      {
        title: 'De lus: input → physics → beeld',
        kicker: 'Volgorde telt',
        text: `
          <p>Elke frame in deze volgorde:</p>
          <ol>
            <li>input → snelheid van de auto-body</li>
            <li><code>world.step</code>: physics rekent</li>
            <li>body's → meshes kopiëren</li>
            <li>camera volgt de <em>nieuwe</em> positie</li>
          </ol>
          <p><code>world.step(1/60, dt, 3)</code>: physics werkt met een <b>vaste stap</b> van 1/60 s. Is een frame trager, dan doet cannon tot 3 inhaalstappen. Een vaste stap houdt de simulatie stabiel en voorspelbaar.</p>`,
        code: {
          file: 'stap3/main.js',
          hl: [5, 6, 7, 8],
          src: `
function animate(time) {
  const dt = Math.min((time - previousTime) / 1000, 0.1)
  previousTime = time

  updateCar(dt)              // 1. input → snelheid van de car body
  world.step(1 / 60, dt, 3)  // 2. physics: vaste stap van 1/60 s, max 3 inhaalstappen
  syncPhysicsToMeshes()      // 3. physics → meshes
  updateCamera(dt)           // 4. camera volgt de (nieuwe) positie van de auto
  // …
  renderer.render(scene, camera)
}`,
        },
        try: 'Rij aan volle snelheid in de hoge torens: de bovenste blokjes vliegen het verst.',
      },
    ],
  },

  // =============================================================
  stap4a: {
    label: 'Stap 4a',
    title: 'Shader opwarmer (TSL)',
    question: 'Hoe vertel je de grafische kaart rechtstreeks welke kleur elke pixel krijgt en waar elk hoekpunt komt?',
    intro: 'Drie vlakken, drie mini-shaders, geschreven in JavaScript met TSL.',
    slides: [
      {
        title: 'Wat is een shader?',
        kicker: 'GPU',
        text: `
          <p>Een <b>shader</b> is een klein programma dat <b>op de GPU</b> draait, voor duizenden hoekpunten en miljoenen pixels <em>tegelijk</em>.</p>
          <ul>
            <li><b>Vertex-shader</b>: WAAR komt elk hoekpunt? → <code>positionNode</code></li>
            <li><b>Fragment-shader</b>: welke KLEUR krijgt elke pixel? → <code>colorNode</code></li>
          </ul>
          <p><b>TSL</b> (Three Shading Language) = shaders schrijven met JavaScript-functies. Three.js vertaalt ze naar WGSL (WebGPU) of GLSL (WebGL 2).</p>`,
        diagram: flow(['Geometry', 'hoekpunten + uv'], '→', ['Vertex-shader', 'positionNode'], '→', ['Rasterizer', 'driehoeken → pixels'], '→', ['Fragment-shader', 'colorNode'], '→', ['Scherm', '']),
        code: {
          file: 'stap4a/main.js',
          hl: [1, 2, 4],
          src: `
import * as THREE from 'three/webgpu'
import { uv, time, positionLocal, sin, vec3, mix, color } from 'three/tsl'

const renderer = new THREE.WebGPURenderer({ antialias: true })`,
        },
      },
      {
        title: '1 · Kleur uit uv()',
        kicker: 'Fragment',
        text: `
          <p><code>uv()</code> = de 2D-coördinaat op het oppervlak: <b>(0,0)</b> linksonder, <b>(1,1)</b> rechtsboven.</p>
          <p>We gebruiken <code>uv.x</code> als rood en <code>uv.y</code> als groen. De GPU voert die ene regel uit voor <b>elke pixel</b> van het vlak.</p>`,
        code: {
          file: 'stap4a/main.js',
          hl: [2],
          src: `
const material1 = new THREE.MeshBasicNodeMaterial({ side: THREE.DoubleSide })
material1.colorNode = vec3(uv().x, uv().y, 0.5) // vec3 = (rood, groen, blauw), elk 0..1`,
        },
        try: 'Linkse vlak: linksonder donker, rechts rood, boven groen, rechtsboven geel.',
      },
      {
        title: '2 · Beweging met time',
        kicker: 'Fragment + tijd',
        text: `
          <ul>
            <li><code>time</code>: seconden sinds de start, Three.js werkt dat zelf bij.</li>
            <li><code>sin(…)</code> gaat van −1 tot 1 → <code>× 0.5 + 0.5</code> maakt er 0..1 van.</li>
            <li><code>mix(a, b, t)</code>: t = 0 → a, t = 1 → b.</li>
          </ul>
          <p><code>uv.x × 20</code> geeft ±3 strepen, <code>+ time × 3</code> laat ze schuiven.</p>`,
        code: {
          file: 'stap4a/main.js',
          hl: [2, 3],
          src: `
const material2 = new THREE.MeshBasicNodeMaterial({ side: THREE.DoubleSide })
const stripes = sin(uv().x.mul(20).add(time.mul(3))).mul(0.5).add(0.5) // bewegende strepen
material2.colorNode = mix(color('#ff6b6b'), color('#4ecdc4'), stripes)`,
        },
      },
      {
        title: '3 · De vertex-shader: een wapperende vlag',
        kicker: 'Vertex',
        text: `
          <p><code>positionLocal</code> = de positie van het hoekpunt. We verschuiven z met een sinusgolf die over x "loopt".</p>
          <p><code>× uv().x</code>: aan de vlaggenstok (links) beweegt niets, rechts het meest.</p>
          <p><b>Valkuil:</b> de vertex-shader kan enkel <em>hoekpunten</em> verschuiven. Daarom heeft het vlak 64 × 64 segmenten. Met 1 segment valt er niets te golven.</p>`,
        code: {
          file: 'stap4a/main.js',
          hl: [1, 4, 5],
          src: `
const geometry = new THREE.PlaneGeometry(2.5, 2.5, 64, 64)
// …
const material3 = new THREE.MeshBasicNodeMaterial({ side: THREE.DoubleSide })
const wave = sin(positionLocal.x.mul(3).sub(time.mul(4))).mul(0.3).mul(uv().x)
material3.positionNode = positionLocal.add(vec3(0, 0, wave))
// De golfhoogte ook als kleur tonen: zo zie je wat de vertex-shader doet
material3.colorNode = mix(color('#2d3561'), color('#f8b500'), wave.mul(2).add(0.5))`,
        },
        try: 'Draai met de muis naar de zijkant van het rechtse vlak: je ziet de golf in 3D.',
      },
      {
        title: 'TSL-schrijfwijze: nodes, geen getallen',
        kicker: 'Syntax',
        text: `
          <p>In TSL kan je geen <code>+ − × /</code> gebruiken, wel <code>.add() .sub() .mul() .div()</code>.</p>
          <p>Elke bewerking rekent <b>niet meteen</b> iets uit, maar bouwt een <b>node</b>: een stukje van een recept. Three.js zet die boom om naar shadercode die de GPU per pixel uitvoert.</p>`,
        diagram: `<pre>sin( uv().x.mul(20).add( time.mul(3) ) )

        <span class="acc">sin</span>
         │
        <span class="acc">add</span>
       ╱    ╲
    <span class="acc">mul</span>      <span class="acc">mul</span>
   ╱   ╲    ╱   ╲
 uv.x  20  time  3</pre>`,
      },
    ],
  },

  // =============================================================
  stap4b: {
    label: 'Stap 4b',
    title: 'Gras-shader (TSL)',
    question: 'Hoe teken je 80 000 grassprieten die wiegen in de wind én wegbuigen voor de auto, zonder dat alles vastloopt?',
    intro: 'Eén <b>InstancedMesh</b> + één vertex-shader + één <b>uniform</b> met de positie van de auto.',
    slides: [
      {
        title: 'Instancing: 80 000 sprieten, 1 draw call',
        kicker: 'InstancedMesh',
        text: `
          <p>80 000 gewone meshes = 80 000 opdrachten aan de GPU per frame (<em>draw calls</em>). Dat is onspeelbaar.</p>
          <p>Een <b>InstancedMesh</b> = één geometry + één material, met per kopie een eigen <b>matrix</b> (positie, rotatie, schaal). Dat geeft één draw call.</p>
          <p>De spriet zelf: een smal vlak, 4 segmenten hoog (om te kunnen buigen), smaller naar boven.</p>`,
        code: {
          file: 'stap4b/main.js',
          hl: [4, 7, 17],
          src: `
const bladeGeometry = new THREE.PlaneGeometry(0.1, 1, 1, 4)
bladeGeometry.translate(0, 0.5, 0) // voet op y = 0 i.p.v. in het midden
// …
const grass = new THREE.InstancedMesh(bladeGeometry, grassMaterial, GRASS_COUNT)

// Elke spriet een willekeurige plek, draaiing en hoogte
const dummy = new THREE.Object3D() // hulpobject om makkelijk een matrix te bouwen
for (let i = 0; i < GRASS_COUNT; i++) {
  dummy.position.set(
    THREE.MathUtils.randFloat(GRASS_AREA.minX, GRASS_AREA.maxX),
    0,
    THREE.MathUtils.randFloat(GRASS_AREA.minZ, GRASS_AREA.maxZ)
  )
  dummy.rotation.y = Math.random() * Math.PI
  dummy.scale.set(1, THREE.MathUtils.randFloat(0.25, 0.55), 1)
  dummy.updateMatrix()
  grass.setMatrixAt(i, dummy.matrix)
}`,
        },
      },
      {
        title: 'Wind in de vertex-shader',
        kicker: 'positionNode',
        text: `
          <ul>
            <li><code>bend = uv.y²</code>: de voet staat vast, de top beweegt het meest, met een mooie kromming.</li>
            <li>Twee sinussen: een snelle <b>golf</b> en een trage <b>windvlaag</b>.</li>
            <li>Omdat <code>position.x</code> en <code>.z</code> in de sinus zitten, beweegt niet elke spriet tegelijk: je ziet <b>golven over het veld lopen</b>.</li>
          </ul>
          <p class="sl-note"><code>Fn(() =&gt; {…})()</code> laat je TSL schrijven met variabelen en meerdere stappen. <code>toVar()</code> = een variabele die je mag aanpassen.</p>`,
        code: {
          file: 'stap4b/main.js',
          hl: [5, 9, 10],
          src: `
grassMaterial.positionNode = Fn(() => {
  const position = positionLocal.toVar() // toVar() = een variabele die we mogen aanpassen

  // De voet staat vast, de top beweegt het meest. Kwadraat → mooie kromming.
  const bend = uv().y.mul(uv().y)

  // WIND: twee sinusgolven over de tijd. Omdat x en z erin zitten, beweegt
  // niet elke spriet tegelijk → je ziet "golven" over het veld lopen.
  const wave = sin(time.mul(2.0).add(position.x.mul(0.35)).add(position.z.mul(0.25)))
  const gust = sin(time.mul(0.6).add(position.x.mul(0.05))) // trage windvlagen
  const wind = wave.mul(0.12).add(gust.mul(0.12))
  position.x.addAssign(wind.mul(bend))
  position.z.addAssign(wind.mul(bend).mul(0.5))
  // …
  return position
})()`,
        },
      },
      {
        title: 'Een uniform: JS → GPU',
        kicker: 'Wegbuigen voor de auto',
        text: `
          <p>Een <b>uniform</b> is een waarde die je vanuit JavaScript naar de GPU stuurt. Hij is dezelfde voor alle sprieten. Elke frame zetten we er de positie van de auto in.</p>
          <p>In de shader: hoe ver staat deze spriet van de auto?</p>
          <ul>
            <li><code>smoothstep(0.8, 2.5, d)</code>: 0 dichtbij, 1 vanaf 2,5 m → omgekeerd = <code>push</code></li>
            <li>duw in de richting <em>weg van de auto</em> (genormaliseerd) en druk de spriet wat plat</li>
          </ul>`,
        code: [
          {
            file: 'stap4b/main.js · shader',
            hl: [1, 6, 8, 9],
            src: `
const uCarPosition = uniform(new THREE.Vector3())
// … in de positionNode:
const awayX = position.x.sub(uCarPosition.x)
const awayZ = position.z.sub(uCarPosition.z)
const distance = awayX.mul(awayX).add(awayZ.mul(awayZ)).sqrt().max(0.001)
const push = float(1).sub(smoothstep(0.8, 2.5, distance)) // 1 dichtbij, 0 vanaf 2,5 m
const strength = push.mul(bend).mul(0.9)
position.x.addAssign(awayX.div(distance).mul(strength)) // richting = (away / lengte)
position.z.addAssign(awayZ.div(distance).mul(strength))
position.y.subAssign(strength.mul(0.5)) // platgedrukt`,
          },
          {
            file: 'stap4b/main.js · animate()',
            hl: [1],
            src: `uCarPosition.value.copy(car.mesh.position)`,
          },
        ],
        try: 'Rij langzaam door het gras: er schuift een "boeggolf" voor de auto uit. Rij weg: het gras veert meteen terug (een spoor komt in stap 6).',
      },
      {
        title: 'Kleur: donker aan de voet, licht aan de top',
        kicker: 'colorNode',
        text: `
          <p>Ook de kleur is één regel: <code>uv().y</code> loopt van 0 (voet) tot 1 (top) en mengt twee groenen.</p>
          <p>Dat simpele verloop doet meer dan je denkt: het suggereert <b>schaduw tussen de sprieten</b>, zonder dat er echt schaduw berekend wordt.</p>
          <p class="sl-note">Alle vorige code (auto, physics, blokjes) is ongewijzigd, op één ding na: de renderer is nu een <code>WebGPURenderer</code>.</p>`,
        code: {
          file: 'stap4b/main.js',
          hl: [2],
          src: `
// FRAGMENT: donker aan de voet, licht aan de top (uv().y = 0 onderaan, 1 bovenaan)
grassMaterial.colorNode = mix(color('#1f4d14'), color('#8fd14f'), uv().y)`,
        },
      },
    ],
  },

  // =============================================================
  stap5: {
    label: 'Stap 5',
    title: 'Raycasting',
    question: 'Hoe weet de computer op welk 3D-object je klikt, en waar precies?',
    intro: 'Een <b>ray</b> = een startpunt + een richting. Een <b>raycaster</b> zoekt wat die ray raakt.',
    slides: [
      {
        title: 'Van muis naar ray',
        kicker: 'NDC',
        text: `
          <p>De muis staat in pixels. Three.js wil <b>Normalized Device Coordinates</b>: links −1, rechts +1, onder −1, boven +1.</p>
          <p><b>Let op:</b> y is omgekeerd t.o.v. pixels (pixels tellen naar beneden).</p>
          <p><code>setFromCamera</code> schiet dan een ray vanuit de camera, door het punt onder de muis, de wereld in.</p>`,
        code: {
          file: 'stap5/main.js',
          hl: [5, 6, 10, 11],
          src: `
const raycaster = new THREE.Raycaster()
const pointer = new THREE.Vector2(10, 10) // muis in NDC; (10,10) = buiten beeld tot de muis beweegt

addEventListener('pointermove', (e) => {
  pointer.x = (e.clientX / innerWidth) * 2 - 1
  pointer.y = -(e.clientY / innerHeight) * 2 + 1
})

function castRay() {
  raycaster.setFromCamera(pointer, camera) // ray start in de camera, door de muis heen
  const hits = raycaster.intersectObjects(getRaycastTargets(), false) // gesorteerd op afstand
  return hits[0] // { object, point, distance, face, ... }
}`,
        },
      },
      {
        title: 'Wat mag de ray raken?',
        kicker: 'intersectObjects',
        text: `
          <p><code>intersectObjects</code> geeft een lijst raakpunten, <b>gesorteerd op afstand</b>. <code>hits[0]</code> is dus het dichtstbijzijnde object.</p>
          <p>Elk resultaat heeft o.a. <code>object</code>, <code>point</code> (exacte 3D-plek) en <code>distance</code>.</p>
          <p>We geven bewust enkel <b>blokjes en grond</b> mee:</p>
          <ul>
            <li>80 000 grasinstanties testen is traag</li>
            <li>en we willen <em>door</em> het gras kunnen klikken</li>
          </ul>`,
        code: {
          file: 'stap5/main.js',
          src: `
// Welke objecten mag de ray raken? Enkel blokjes en de grond.
// (Niet het gras: 80 000 instanties testen is traag, en we willen erdoor kunnen klikken.)
function getRaycastTargets() {
  return [ground, ...blocks.map((b) => b.mesh)]
}`,
        },
      },
      {
        title: 'Hover: elke frame opnieuw',
        kicker: 'Highlight',
        text: `
          <p>We raycasten <b>elke frame</b>, niet enkel bij muisbeweging: de camera rijdt mee, dus onder een stilstaande muis schuiven andere blokjes door.</p>
          <p><b>Valkuil:</b> de materialen zijn <em>gedeeld</em> door veel blokjes. <code>material.color</code> aanpassen kleurt ze allemaal! Daarom <b>wisselen</b> we het materiaal.</p>
          <p><code>userData.body</code> koppelt een mesh aan zijn physics-body: zo weten we of de ray een blokje raakte.</p>`,
        code: {
          file: 'stap5/main.js',
          hl: [3, 7, 8],
          src: `
function updateHover() {
  const hit = castRay()
  const mesh = hit && hit.object.userData.body ? hit.object : null // enkel blokjes oplichten

  if (mesh !== hoveredMesh) {
    // Materiaal wisselen i.p.v. aanpassen: de materialen zijn GEDEELD door veel blokjes!
    if (hoveredMesh) hoveredMesh.material = hoveredMesh.userData.baseMaterial
    if (mesh) mesh.material = highlightMaterial
    hoveredMesh = mesh
  }

  hitMarker.visible = !!hit
  if (hit) hitMarker.position.copy(hit.point)
}`,
        },
        try: 'Beweeg de muis over de blokjes: het roze bolletje toont het exacte raakpunt.',
      },
      {
        title: 'Klik op een blokje: een impuls',
        kicker: 'Raycast + physics',
        text: `
          <p>We geven de body een <b>impuls</b> (een plotse stoot) in de richting van de ray, plus wat omhoog.</p>
          <p>Het tweede argument is het <b>raakpunt t.o.v. het midden</b> van het blokje. Raak je het blokje aan de rand, dan gaat het ook <b>tollen</b>, net als in het echt.</p>
          <p><code>wakeUp()</code>: een slapende body negeert krachten.</p>`,
        code: {
          file: 'stap5/main.js · click',
          hl: [5, 7, 13],
          src: `
const body = hit.object.userData.body
if (body) {
  // BLOKJE: impuls in de richting van de ray (+ een beetje omhoog)
  const direction = raycaster.ray.direction
  const impulse = new CANNON.Vec3(direction.x * 8, direction.y * 8 + 3, direction.z * 8)
  // Raakpunt relatief t.o.v. het midden van de body → het blokje gaat ook tollen!
  const relativePoint = new CANNON.Vec3(
    hit.point.x - body.position.x,
    hit.point.y - body.position.y,
    hit.point.z - body.position.z
  )
  body.wakeUp() // slapende bodies negeren krachten
  body.applyImpulse(impulse, relativePoint)
} else {
  // GROND: autopilot-doel
  setTarget(hit.point)
}`,
        },
        try: 'Klik op de bovenrand van een blokje en daarna op de onderrand: ze tollen anders.',
      },
      {
        title: 'Klik op de grond: de autopilot',
        kicker: 'Mini-AI',
        wide: true,
        text: `
          <p>De autopilot <b>drukt zelf op de toetsen</b>: hij geeft dezelfde <code>throttle</code> en <code>steer</code> (−1..1) terug als de speler. De rest van de code merkt het verschil niet.</p>
          <ul>
            <li><code>atan2(dx, dz)</code> = de richting naar het doel</li>
            <li>hoekverschil herleiden naar −π..π, anders draait hij soms "de lange weg" rond</li>
            <li>trager bij scherpe bochten en vlak bij het doel</li>
          </ul>`,
        code: {
          file: 'stap5/main.js',
          hl: [14, 16, 17],
          src: `
// NIEUW: de autopilot "drukt zelf op de toetsen": hij geeft dezelfde
// throttle (-1..1) en steer (-1..1) terug als de speler.
function autopilot() {
  const dx = state.target.x - car.mesh.position.x
  const dz = state.target.z - car.mesh.position.z
  const distance = Math.hypot(dx, dz)

  if (distance < 2) { // aangekomen
    setTarget(null)
    return { throttle: 0, steer: 0 }
  }

  // Gewenste richting: atan2(x, z) omdat forward = (sin, cos) – zie stap 2
  const desiredHeading = Math.atan2(dx, dz)
  // Hoekverschil, herleid naar -π..π (anders draait hij soms "de lange weg" rond)
  let angle = desiredHeading - state.heading
  angle = Math.atan2(Math.sin(angle), Math.cos(angle))

  const steer = THREE.MathUtils.clamp(angle * 2, -1, 1)
  // …
  return { throttle, steer }
}`,
        },
        try: 'Klik op de grond achter de auto: hij keert zelf. Druk een rijtoets en jij neemt het weer over.',
      },
      {
        title: 'Debuggen: maak de ray zichtbaar',
        kicker: 'Debug',
        text: `
          <p>Vanuit de camera zie je een ray als <b>een punt</b>: hij loopt recht van je weg. Daarom bevriezen we elke ray als lijn bij een klik. Rij weg en bekijk hem van opzij. De laatste 5 klikken blijven staan: de nieuwste fel, oudere gedimd.</p>
          <p><code>needsUpdate = true</code>: de GPU heeft een kopie van de punten, die moet je laten weten dat er iets veranderd is.</p>`,
        code: {
          file: 'stap5/main.js · recordRay()',
          hl: [5, 6],
          src: `
// 1. de ray
const position = record.ray.geometry.attributes.position
position.setXYZ(0, origin.x, origin.y, origin.z)
position.setXYZ(1, hitPoint.x, hitPoint.y, hitPoint.z)
position.needsUpdate = true
record.ray.geometry.computeBoundingSphere() // anders verdwijnt hij soms (frustum culling)`,
        },
        try: 'Klik ergens, rij dan opzij: de roze lijn loopt van de camera naar het raakpunt.',
      },
      {
        title: 'Waar start de ray, en waarom lijkt hij te bewegen?',
        kicker: 'Spookcamera',
        text: `
          <p>De ray start <b>altijd in de camera</b>: <code>ray.origin</code> = de positie van de camera, het "oog". De richting gaat van dat oog door het punt onder de muis.</p>
          <p>Toch lijkt hij telkens ergens anders te beginnen. Dat komt door wat er <b>na</b> de klik gebeurt:</p>
          <ol>
            <li>De lijn wordt <b>één keer</b> vastgelegd, op de plek van de camera.</li>
            <li>Een klik op de grond start de autopilot: de auto draait en de volgcamera zwaait mee.</li>
            <li>Vanuit die nieuwe plek zie je de oude lijn van opzij: hij lijkt van links of rechts te komen.</li>
          </ol>
          <p>Niet de ray beweegt, <b>jij</b> beweegt. Klik je op een blokje, dan blijft de auto staan en zie je de lijn niet: je kijkt er recht in.</p>`,
        code: [
          {
            file: 'node_modules/three/src/core/Raycaster.js · setFromCamera()',
            hl: [2],
            src: `
if ( camera.isPerspectiveCamera ) {
  this.ray.origin.setFromMatrixPosition( camera.matrixWorld );
  this.ray.direction.set( coords.x, coords.y, 0.5 ).unproject( camera ).sub( this.ray.origin ).normalize();`,
          },
          {
            file: 'stap5/main.js · recordRay()',
            hl: [2, 3],
            src: `
// 2. de spookcamera: plek en kijkrichting van de camera op dit moment
record.ghost.position.copy(origin)
record.ghost.quaternion.setFromRotationMatrix(camera.matrixWorld)
// …
// 3. het spoor begint opnieuw, op het startpunt
record.trailCount = 0
addTrailPoint(record, origin)`,
          },
        ],
        try: 'Klik links op de grond en druk meteen <b>V</b> (vogelperspectief). De <span style="color:#00e5ff">cyaan camera</span> staat waar de ray begon, de <span style="color:#00e5ff">cyaan boog</span> toont hoe de camera daarna achter de auto aan zwaaide. Klik je in vogelperspectief, dan blijft de camera staan en start de nieuwe ray in je eigen oog: druk <b>V</b> om hem van opzij te zien.',
      },
    ],
  },

  // =============================================================
  stap6: {
    label: 'Stap 6',
    title: 'Eindeloze rit (game)',
    question: 'Hoe maak je een wereld die nooit ophoudt, met een computer die maar een beperkt geheugen heeft?',
    intro: 'Alles uit stap 2 tot 5 komt samen. Nieuw: de loopband-truc, spawnen en opruimen, een spoor in het gras en geluid zonder bestanden.',
    slides: [
      {
        title: 'Van demo naar game',
        kicker: 'Game state',
        text: `
          <p>Een game is een demo met <b>regels</b>: een begin, een doel, een einde.</p>
          <p>Eén variabele <code>game.state</code> bepaalt wat de lus doet: in <em>start</em> en <em>gameover</em> rijdt de auto niet en tellen er geen punten.</p>
          <p>Moeilijkheid = <b>functies van de afstand</b>: hoe verder, hoe sneller je mag en hoe dichter de obstakels staan.</p>`,
        diagram: flow(['start', 'overlay · Spatie'], '→', ['playing', 'rijden · punten'], '→', ['gameover', 'barrière geraakt'], '→', ['reset', 'Spatie → playing']),
        code: {
          file: 'stap6/main.js',
          hl: [3, 4, 5],
          src: `
// Moeilijkheid als functie van de afstand (in meter)
const difficulty = {
  maxSpeed: (d) => Math.min(MAX_SPEED, START_MAX_SPEED + d * 0.015), // de auto mag steeds sneller
  rowSpacing: (d) => Math.max(12, 24 - d * 0.008),
  doubleBarrierChance: (d) => Math.min(0.6, 0.15 + d * 0.0006),
}`,
        },
      },
      {
        title: 'De loopband-truc',
        kicker: 'Eindeloze wereld',
        wide: true,
        text: `
          <p>De auto rijdt <b>echt</b> vooruit. Wat achter de auto ligt, wordt <b>naar voren verplaatst</b>.</p>
          <ul>
            <li><b>Weg</b>: 5 tegels van 40 m. Een tegel achter de auto springt 200 m vooruit (recyclen, niets nieuw aanmaken).</li>
            <li><b>Grasgrond</b>: één effen vlak dat gewoon meeschuift. Effen, dus je ziet het niet.</li>
            <li><b>Physics-grond</b>: een oneindig vlak, hoeft nooit mee.</li>
          </ul>`,
        diagram: svgTreadmill,
        code: {
          file: 'stap6/main.js · updateWorld()',
          hl: [5, 10],
          src: `
const carZ = carBody.position.z

// Wegstukken die achter ons liggen → naar voren
for (const tile of roadTiles) {
  if (tile.position.z + TILE_LENGTH / 2 < carZ - CLEANUP_BEHIND) {
    tile.position.z += TILE_COUNT * TILE_LENGTH
  }
}
// Gras en grond schuiven mee (gras in sprongen, zodat de sprieten niet "meeglijden")
grass.mesh.position.z = Math.floor(carZ / TILE_LENGTH) * TILE_LENGTH
groundMesh.position.z = carZ`,
        },
      },
      {
        title: 'Spawnen vóór, opruimen achter',
        kicker: 'Obstakels',
        text: `
          <p>Obstakels zijn uniek (ze vallen om, vliegen weg), dus die recyclen we niet maar <b>maken we aan</b> en <b>ruimen we op</b>:</p>
          <ul>
            <li>zolang de volgende rij minder dan 140 m vóór de auto ligt: nieuwe rij</li>
            <li>meer dan 25 m achter de auto, of van de wereld gevallen: weg uit scene <em>én</em> physics-wereld</li>
          </ul>
          <p><b>Eerlijkheid:</b> er blijft altijd minstens één rijstrook zonder barrière.</p>`,
        code: {
          file: 'stap6/main.js',
          hl: [3, 4, 12, 13, 14],
          src: `
function spawnAhead() {
  const carZ = carBody.position.z
  while (game.nextRowZ < carZ + SPAWN_AHEAD) {
    spawnRow(game.nextRowZ, game.nextRowZ)
    game.nextRowZ += difficulty.rowSpacing(game.nextRowZ)
  }
}

// in updateWorld(): achteruit door de lijst, want we verwijderen tijdens het lopen
for (let i = obstacles.length - 1; i >= 0; i--) {
  const obstacle = obstacles[i]
  if (obstacle.body.position.z < carZ - CLEANUP_BEHIND || obstacle.body.position.y < -20) {
    removeObstacle(obstacle)
    obstacles.splice(i, 1)
  }
}`,
        },
      },
      {
        title: 'Botsen met een barrière',
        kicker: 'Box3 · static → dynamic',
        text: `
          <p><b>Probleem:</b> een STATIC en een KINEMATIC body botsen niet in cannon-es: geen van beide kan door een botsing bewegen.</p>
          <p><b>Oplossing:</b> zelf testen met twee <b>bounding boxes</b> (<code>Box3</code>). Iets kleiner dan de auto voelt eerlijker.</p>
          <p><b>Opblazen</b> (klik = raycast uit stap 5): een static body kan niet wegvliegen. We <b>vervangen</b> hem door een dynamic body op exact dezelfde plek en geven die een flinke impuls.</p>`,
        code: [
          {
            file: 'stap6/main.js · checkCrash()',
            hl: [2, 6],
            src: `
function checkCrash() {
  carBox.setFromCenterAndSize(car.mesh.position.clone().setY(0.5), carBoxSize)
  for (const obstacle of obstacles) {
    if (obstacle.kind !== 'barrier' || !obstacle.active) continue
    barrierBox.setFromObject(obstacle.mesh)
    if (carBox.intersectsBox(barrierBox)) return gameOver()
  }
}`,
          },
          {
            file: 'stap6/main.js · blastBarrier()',
            hl: [1, 2],
            src: `
world.removeBody(barrier.body)
const body = new CANNON.Body({
  mass: 3,
  shape: barrierShape,
  position: barrier.body.position.clone(),
  quaternion: barrier.body.quaternion.clone(),
})
world.addBody(body)`,
          },
        ],
        try: 'Klik op een rode barrière vóór je: ze vliegt opzij weg (max. 5 ladingen, +1 per 200 m).',
      },
      {
        title: 'Een spoor in het gras: textuur als geheugen',
        kicker: 'trail.js',
        wide: true,
        text: `
          <p>De uniform uit stap 4b onthoudt maar <b>één</b> positie: het gras veert terug. Voor een spoor moeten we <b>alle</b> plekken onthouden.</p>
          <ul>
            <li>Een zwart-wit <b>DataTexture</b> (64 × 1024 px) ligt als kaart over de baan.</li>
            <li><b>CPU</b>: JavaScript verft elke frame wit waar de auto rijdt → <code>needsUpdate</code>.</li>
            <li><b>GPU</b>: de gras-shader leest de kaart: wit = plat.</li>
            <li><code>RepeatWrapping</code>: de kaart herhaalt elke 256 m. Rijen ver achter de auto wissen we, die worden straks ver vóór hergebruikt.</li>
          </ul>`,
        code: [
          {
            file: 'stap6/trail.js',
            hl: [1, 3],
            src: `
const map = new THREE.DataTexture(data, width, height, THREE.RedFormat, THREE.UnsignedByteType)
map.wrapS = THREE.ClampToEdgeWrapping
map.wrapT = THREE.RepeatWrapping                     // eindeloos herhalen in z
map.magFilter = map.minFilter = THREE.LinearFilter   // zachte randen tussen pixels`,
          },
          {
            file: 'stap6/grass.js · positionNode',
            hl: [2, 3],
            src: `
// SPOOR: lees de kaart. 1 = platgereden → plat tegen de grond, voorover in de rijrichting
const flat = trail.sampleNode(worldX, worldZ).toVar()
position.y.mulAssign(float(1).sub(flat.mul(0.92)))
position.z.addAssign(flat.mul(uv().y).mul(0.5))`,
          },
        ],
        try: 'Rij slingerend door het gras en kijk achterom (rem even): het spoor blijft liggen.',
      },
      {
        title: 'Geluid zonder één bestand',
        kicker: 'Web Audio API',
        text: `
          <p>Alle geluiden worden <b>gegenereerd</b>: <code>bron → filter → volume → luidsprekers</code>.</p>
          <ul>
            <li><b>Motor</b>: zaagtand-oscillator, toonhoogte volgt de snelheid</li>
            <li><b>Botsing / ontploffing</b>: 1 s witte ruis door een lowpass-filter dat dichtgaat</li>
            <li><code>setTargetAtTime</code>: zacht overgaan, geen klikjes</li>
          </ul>
          <p class="sl-note">Browsers laten pas geluid toe <b>na een actie van de gebruiker</b>. Daarom start <code>init()</code> bij de eerste spatie.</p>`,
        code: {
          file: 'stap6/audio.js',
          hl: [2, 8, 15],
          src: `
// MOTOR: een zaagtand-golf (klinkt "brommerig") door een lowpass-filter (dempt de scherpte)
engine = ctx.createOscillator()
engine.type = 'sawtooth'
engineFilter = ctx.createBiquadFilter()
engineFilter.type = 'lowpass'
engineFilter.frequency.value = 300
engineGain = ctx.createGain()
engine.connect(engineFilter).connect(engineGain).connect(ctx.destination)
engine.start()

// Motorgeluid volgt de snelheid. setTargetAtTime = zacht overgaan, geen klikjes.
function setEngine(speed, running) {
  if (!ctx) return
  const t = ctx.currentTime
  engine.frequency.setTargetAtTime(40 + speed * 3, t, 0.1)
  // …
}`,
        },
      },
      {
        title: 'De lus van de game',
        kicker: 'Alles samen',
        text: `
          <p>Dezelfde volgorde als stap 3, met extra stappen.</p>
          <p><b>Nieuw:</b> een physics-stap van <b>1/120 s</b> in plaats van 1/60. Bij 120 km/u legt de auto anders 0,5 m per stap af en kunnen blokjes erdoorheen glippen (<em>tunneling</em>).</p>`,
        code: {
          file: 'stap6/main.js · animate()',
          hl: [4, 11],
          src: `
updateCar(dt)
// Kleinere stap (1/120 s) dan in stap 3: bij 120 km/u legt de auto anders
// 0,5 m per stap af en kunnen blokjes "doorheen" glippen (tunneling).
world.step(1 / 120, dt, 10)
syncMeshes()

if (game.state === 'playing') {
  checkCrash()
  updateScore()
}
updateWorld()
updateCamera(dt)
updateHover()`,
        },
      },
    ],
  },

  // =============================================================
  stap7: {
    label: 'Stap 7',
    title: 'Ambulance-model + preloader + sirene',
    question: 'Hoe vervang je de blokjesauto door een echt 3D-model, zonder dat de speler naar een half geladen scherm kijkt?',
    intro: 'GLB laden en inpassen, meten in plaats van raden, een eerlijke laadbalk, en zwaailichten met sirene.',
    slides: [
      {
        title: 'Een GLB-model laden',
        kicker: 'GLTFLoader',
        text: `
          <p>Een GLB is een <b>doos met een hele scene</b>: meshes, materialen, texturen, hiërarchie. <code>GLTFLoader</code> pakt die uit tot gewone Three.js-objecten.</p>
          <p><code>await</code> wacht tot het model er is. Omdat <code>main.js</code> een module is, mag dat op het hoogste niveau (<em>top-level await</em>).</p>
          <p>Checklist bij een nieuw model:</p>
          <ul>
            <li>1 eenheid = 1 meter?</li>
            <li>voorkant naar +z?</li>
            <li>nulpunt op de grond, in het midden?</li>
            <li>wielen als losse objecten met een naam?</li>
          </ul>`,
        code: {
          file: 'stap7/main.js',
          hl: [2, 6],
          src: `
const preloader = createPreloader()
const gltfLoader = new GLTFLoader(preloader.manager)

let car
try {
  car = await loadCar(gltfLoader, '/carkit/ambulance.glb') // uit de map public/
} catch (error) {
  preloader.showError('Het model kon niet geladen worden. Kijk in de console voor details.')
  throw error // stop hier: zonder auto geen spel
}`,
        },
      },
      {
        title: 'Wielen terugvinden en een pivot geven',
        kicker: 'Hiërarchie (zoals stap 2)',
        text: `
          <p>De wielen zoeken we <b>op naam</b> (<code>wheel-front-left</code>, …). Tip: <code>model.traverse(o =&gt; console.log(o.name))</code>.</p>
          <p>Hetzelfde probleem als in stap 2: sturen + rollen op één object = wiebelen. Dus een <b>pivot</b> in het midden van het wiel.</p>
          <p><code>attach()</code> in plaats van <code>add()</code>: het wiel blijft op <b>exact dezelfde plek</b> staan. <code>add()</code> zou zijn positie relatief t.o.v. de pivot lezen → verschoven.</p>`,
        code: {
          file: 'stap7/car.js',
          hl: [3, 6],
          src: `
if (wheel.name.includes('front')) {
  const pivot = new THREE.Group()
  new THREE.Box3().setFromObject(wheel).getCenter(pivot.position)
  model.add(pivot)
  // attach() i.p.v. add(): het wiel blijft op exact dezelfde plek staan
  pivot.attach(wheel)
  frontPivots.push(pivot)
}`,
        },
      },
      {
        title: 'Meten in plaats van raden',
        kicker: 'Box3',
        text: `
          <p>De blokjesauto had afmetingen die we zelf intypten. Bij een model <b>meten</b> we ze met een <code>Box3</code> rond het model.</p>
          <p>Daaruit volgen de physics-box, de botsingsbox en de wielstraal (voor het rollen). Wissel je van model, dan past alles zich aan.</p>
          <p class="sl-note">Iets kleiner dan het model (× 0,9) voelt eerlijker bij botsingen.</p>`,
        code: [
          {
            file: 'stap7/car.js',
            src: `
// Afmetingen meten i.p.v. raden: daarmee maken we straks de physics-box
const size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3())
const wheelRadius = new THREE.Box3().setFromObject(wheels[0]).getSize(new THREE.Vector3()).y / 2`,
          },
          {
            file: 'stap7/main.js',
            hl: [4],
            src: `
const CAR_BODY_HEIGHT = car.size.y / 2 // midden van de box boven de grond
const carBody = new CANNON.Body({
  type: CANNON.Body.KINEMATIC,
  shape: new CANNON.Box(new CANNON.Vec3(car.size.x / 2 * 0.9, car.size.y / 2, car.size.z / 2 * 0.95)),`,
          },
        ],
      },
      {
        title: 'Een eerlijke preloader',
        kicker: 'LoadingManager',
        text: `
          <p>Zonder preloader ziet de speler een leeg scherm, of een auto die plots verschijnt.</p>
          <ol>
            <li><b>Bestanden</b> (0 → 80%): <code>LoadingManager</code> gaat mee in elke loader en meldt elk klaar bestand.</li>
            <li><b>Shaders</b> (80 → 100%): <code>compileAsync</code> compileert alles <em>vóór</em> de eerste frame. Anders hapert het spel bij de start (140 000 grassprieten!).</li>
            <li>Uitfaden met CSS, dan pas het startscherm.</li>
          </ol>`,
        code: [
          {
            file: 'stap7/preloader.js',
            hl: [2, 9],
            src: `
manager.onProgress = (url, itemsLoaded, itemsTotal) => {
  setProgress((itemsLoaded / itemsTotal) * FILES_SHARE)
  setStatus(\`Bestanden laden… \${itemsLoaded}/\${itemsTotal} (\${url.split('/').pop()})\`)
}

async function compile(renderer, scene, camera) {
  setStatus('Shaders compileren…')
  setProgress(FILES_SHARE)
  await renderer.compileAsync(scene, camera)
  setProgress(1)
}`,
          },
          {
            file: 'stap7/main.js · helemaal onderaan',
            src: `
await preloader.compile(renderer, scene, camera)
preloader.hide()
game.state = 'start'`,
          },
        ],
        try: 'Herlaad de pagina (Shift + herladen voor een lege cache) en kijk naar de status onder de balk.',
      },
      {
        title: 'Zwaailichten',
        kicker: 'Emissive + PointLight',
        text: `
          <p>Elk zwaailicht bestaat uit twee delen:</p>
          <ul>
            <li>een <b>lens</b> met een <em>emissive</em> materiaal: lijkt licht te geven, maar verlicht niets</li>
            <li>een <b>PointLight</b>: verlicht echt het gras en de blokjes</li>
          </ul>
          <p><b>Valkuil:</b> knipperen met <code>light.visible</code> verandert het aantal lichten. Dan moet Three.js de shaders van <em>alle</em> materialen hercompileren → het spel hapert bij elke flits. Daarom zetten we de <b>intensiteit</b> op 0.</p>`,
        code: {
          file: 'stap7/emergency-lights.js · update()',
          hl: [2, 5, 6, 8, 9],
          src: `
function update(timeSeconds) {
  const cycle = (timeSeconds * 1.5) % 1 // 0..1, anderhalve cyclus per seconde
  lights.forEach(({ lensMaterial, light }, i) => {
    const myHalf = i % 2 === 0 ? cycle < 0.5 : cycle >= 0.5 // wiens beurt is het?
    const t = (cycle * 2) % 1                                // 0..1 binnen die helft
    const flash = t < 0.2 || (t > 0.3 && t < 0.5)            // twee korte flitsen, dan pauze
    const lit = on && myHalf && flash
    lensMaterial.emissiveIntensity = lit ? LENS_ON : on ? 0.4 : 0   // zwak nagloeien als "aan"
    light.intensity = lit ? LIGHT_ON : 0
  })
}`,
        },
        try: 'Druk <b>H</b>: links-links, rechts-rechts. Kijk hoe het gras naast de ambulance blauw oplicht.',
      },
      {
        title: 'De sirene: een node die een parameter stuurt',
        kicker: 'Web Audio · LFO',
        text: `
          <p>Een sirene is één toon die heen en weer springt. Dat doen we niet met een timer, maar met een <b>LFO</b> (low frequency oscillator).</p>
          <p>Een blokgolf van 0,8 Hz × 75 wordt <b>opgeteld bij de frequentie</b> van de sirenetoon: 510 ± 75 Hz.</p>
          <p>Aan/uit = enkel het volume open- of dichtdraaien. De oscillators lopen altijd door.</p>`,
        code: {
          file: 'stap7/audio.js',
          hl: [3, 6],
          src: `
const lfo = ctx.createOscillator()
lfo.type = 'square'
lfo.frequency.value = 0.8 // 0,8 wissels per seconde → elke toon ±0,6 s
const lfoDepth = ctx.createGain()
lfoDepth.gain.value = 75
lfo.connect(lfoDepth).connect(sirenTone.frequency) // een node verbinden met een PARAMETER!`,
        },
      },
    ],
  },

  // =============================================================
  stap7b: {
    label: 'Stap 7b',
    title: 'Emissive: wat het doet (en niet doet)',
    question: 'Waarom hebben de zwaailichten van de ambulance een emissive materiaal én een PointLight nodig? Is één van de twee niet genoeg?',
    intro: 'Drie blokken in een donkere kamer. <b>A</b>: enkel emissive. <b>B</b>: emissive + een echte PointLight. <b>C</b>: dezelfde oranje als gewone verf, ter vergelijking.',
    slides: [
      {
        title: 'Wat emissive doet: een eigen kleur',
        kicker: 'Emissive',
        text: `
          <p>Een gewoon materiaal (<code>color</code>) is <b>verf</b>: zonder licht is het zwart.</p>
          <p><b>Emissive</b> telt daar een kleur bij op die <b>niet afhangt van licht</b>:</p>
          <p class="sl-note">eindkleur = <code>color</code> × binnenvallend licht + <code>emissive</code> × <code>emissiveIntensity</code></p>
          <p>Daardoor lijkt het blok te branden, ook in een pikdonkere kamer. Het is gewoon een optelling in de shader: <b>gratis</b> qua rekenwerk.</p>`,
        code: {
          file: 'stap7b/main.js',
          hl: [3, 4],
          src: `
const lampMaterial = new THREE.MeshStandardMaterial({
  color: '#222222',
  emissive: LAMP_COLOR,
  emissiveIntensity: 3,
})`,
        },
        try: 'Vergelijk <b>A</b> met <b>C</b> (gewone oranje verf): in het donker is C bijna zwart, A blijft fel. Dat is emissive, ook zonder gloed. Druk <b>N</b>: overdag zien ze er bijna hetzelfde uit.',
      },
      {
        title: 'Wat emissive NIET doet: iets anders verlichten',
        kicker: 'De beperking',
        text: `
          <p>Emissive verandert enkel <b>de pixels van het object zelf</b>. De shader van de bol ernaast weet niet dat het blok "brandt".</p>
          <ul>
            <li>de bol, het blok en de muur naast A blijven <b>donker</b></li>
            <li>er zijn <b>geen schaduwen</b></li>
          </ul>
          <p>Wil je dat de omgeving reageert, dan heb je een <b>echt licht</b> nodig: een <code>PointLight</code>. Elke pixel van elk materiaal rekent dan uit hoeveel licht ervan binnenvalt.</p>`,
        code: {
          file: 'stap7b/main.js',
          hl: [1, 3],
          src: `
const pointLight = new THREE.PointLight(LAMP_COLOR, 0, 4, 2) // distance = bereik in meter (A en C liggen verder), decay 2 = natuurkundig
pointLight.position.y = 1.25
pointLight.castShadow = true
pointLight.shadow.mapSize.set(1024, 1024)
setupB.add(pointLight)`,
        },
        try: 'Zet <b>P</b> aan: rond B worden bol, vloer en muur oranje, met schaduwen. Rond A blijft alles donker.',
      },
      {
        title: 'Je hebt ze allebei nodig',
        kicker: 'Zwaailichten (stap 7)',
        text: `
          <table class="sl-table">
            <tr><th></th><th>het object brandt</th><th>omgeving verlicht</th></tr>
            <tr><td>enkel emissive</td><td>ja</td><td>nee</td></tr>
            <tr><td>enkel PointLight</td><td>nee</td><td>ja</td></tr>
            <tr><td>allebei</td><td>ja</td><td>ja</td></tr>
          </table>
          <p style="margin-top:14px">Daarom heeft elk zwaailicht in stap 7 een <b>lens</b> met emissive én een <b>PointLight</b>. Ze knipperen samen: allebei aan of allebei op 0.</p>`,
        code: {
          file: 'stap7/emergency-lights.js · update()',
          src: `
lensMaterial.emissiveIntensity = lit ? LENS_ON : on ? 0.4 : 0   // zwak nagloeien als "aan"
light.intensity = lit ? LIGHT_ON : 0`,
        },
        try: 'Zet <b>E</b> uit en <b>P</b> aan: de omgeving van B is verlicht, maar het blok zelf lijkt dood.',
      },
      {
        title: 'De gloed is geen emissive: het is bloom',
        kicker: 'Post-processing',
        text: `
          <p>Die zachte halo rond een fel licht komt <b>niet</b> van emissive. Het is <b>bloom</b>: een nabewerking van het <b>hele beeld</b>.</p>
          <ol>
            <li>teken de scène in een textuur</li>
            <li>neem enkel de pixels feller dan de <b>drempel</b> (0,8)</li>
            <li>vervaag ze en tel ze op bij het origineel</li>
          </ol>
          <p>Emissive zorgt alleen voor die <b>felle pixels</b>. Zet emissive uit en de gloed verdwijnt mee.</p>`,
        code: {
          file: 'stap7b/main.js',
          hl: [3],
          src: `
const pipeline = new THREE.RenderPipeline(renderer)
const sceneColor = pass(scene, camera).getTextureNode('output')
const glow = bloom(sceneColor, 0, 0.5, 0.8) // sterkte, straal, drempel (enkel pixels feller dan 0,8)
pipeline.outputNode = sceneColor.add(glow)`,
        },
        try: 'Zet <b>G</b> aan, en zet daarna <b>E</b> uit: geen felle pixels meer, dus ook geen gloed.',
      },
      {
        title: 'Overdag valt emissive weg',
        kicker: 'Dag ↔ nacht',
        text: `
          <p>Emissive is een <b>vaste</b> hoeveelheid kleur. 's Nachts is de rest van het beeld donker en springt ze eruit. Overdag is alles fel en valt ze nauwelijks op.</p>
          <p>Daarom vermenigvuldigen de ramen in stap 8 hun emissive met <code>nightAmount</code>: overdag uit, 's nachts aan.</p>`,
        code: {
          file: 'stap8/window-material.js',
          src: `material.emissiveNode = windowColor.mul(isWindow).mul(isWall).mul(isLit).mul(flicker).mul(1.1).mul(nightAmount)`,
        },
        try: 'Druk <b>N</b> voor dag: de blokken lijken plots veel minder fel, terwijl de sterkte niet veranderde.',
      },
      {
        title: 'Wat kost het?',
        kicker: 'Performance',
        text: `
          <ul>
            <li><b>Emissive</b>: één optelling per pixel van dat object. Honderden ramen kosten bijna niets.</li>
            <li><b>PointLight</b>: <em>elke</em> pixel van <em>elk</em> verlicht materiaal moet het licht meetellen. Met schaduw rendert Three.js de scène nog eens <b>6 keer</b> extra (een kubus rond het licht).</li>
            <li>Knipperen? Pas de <code>intensity</code> aan, <b>niet</b> <code>visible</code>. Het aantal lichten veranderen dwingt Three.js om alle shaders opnieuw te compileren → haperen.</li>
          </ul>
          <p><b>Vuistregel:</b> emissive voor alles wat moet branden, en een echte lamp enkel waar je het licht op de omgeving echt wil zien.</p>`,
      },
    ],
  },

  // =============================================================
  stap8: {
    label: 'Stap 8',
    title: 'Nachtdienst: ambulance in de stad',
    question: 'Hoe bouw je een levende stad (honderden verlichte ramen, verkeer, dag en nacht) die vlot blijft draaien?',
    intro: 'Bijna alles is <b>gegenereerd</b>: geen texturen voor ramen, daken of asfalt, wel TSL-shaders. Plus zelfgeschreven botsingen en een beetje verkeers-AI.',
    slides: [
      {
        title: '★ Ramen zonder één textuur',
        kicker: 'TSL · window-material.js',
        wide: true,
        text: `
          <p>Eén materiaal voor <b>alle</b> gebouwen. De uv-coördinaten zijn in city.js omgerekend naar <b>meters</b>. Zo weet de shader waar hij op de gevel zit.</p>
          <ul>
            <li><code>floor</code>: in welke <b>cel</b> (kolom, verdieping)?</li>
            <li><code>fract</code>: waar <b>binnen</b> die cel (0..1)?</li>
            <li>4× <code>step</code> = binnen een rechthoek → raam</li>
          </ul>`,
        diagram: `<pre>┌──┬──┬──┐   <span class="acc">← 1 cel = 2 m breed × 3 m hoog</span>
│▓▓│  │▓▓│     ▓▓ = raam met licht
├──┼──┼──┤
│  │▓▓│  │
└──┴──┴──┘</pre>`,
        code: {
          file: 'stap8/window-material.js',
          hl: [3, 4, 7, 8],
          src: `
const meters = uv()                                                     // in meter (zie city.js)
const cellCoord = meters.div(vec2(WINDOW_CELL.width, WINDOW_CELL.height))
const cell = floor(cellCoord)   // geheel getal: kolom en verdieping   bv. (3, 7)
const inCell = fract(cellCoord) // kommagedeelte: positie in de cel   bv. (0.4, 0.6)

// step(a, b) = 1 als b >= a, anders 0. Vier keer step = binnen een rechthoek.
const isWindow = step(0.2, inCell.x).mul(step(inCell.x, 0.8))
  .mul(step(0.25, inCell.y)).mul(step(inCell.y, 0.75))`,
        },
      },
      {
        title: 'Willekeur per raam: hash()',
        kicker: 'TSL · licht aan/uit, tv',
        text: `
          <p><code>hash(x)</code> geeft voor hetzelfde <em>x</em> altijd hetzelfde getal (0..1), maar voor <em>x</em> en <em>x+1</em> totaal verschillende. Dat is <b>stabiele willekeur</b>: geen flikkerende ruis, elk raam heeft een eigen karakter.</p>
          <ul>
            <li>±38% brandt; door <code>+ time × 0.015</code> springen ramen af en toe aan of uit</li>
            <li>15% is een <b>tv</b>: blauw licht dat flikkert</li>
            <li><code>emissiveNode</code> = licht dat het oppervlak zelf geeft, <b>× nightAmount</b></li>
          </ul>`,
        code: {
          file: 'stap8/window-material.js',
          hl: [1, 2, 4, 11],
          src: `
const windowSeed = cell.x.add(cell.y.mul(157)).add(buildingId.x.mul(311)).add(buildingId.y.mul(73))
const random = (offset) => hash(windowSeed.add(offset))

const isLit = step(0.62, fract(random(1).add(time.mul(0.015))))

const isTv = step(0.85, random(2))
const windowColor = mix(color('#ffc46b'), color('#6fa8ff'), isTv)
const flicker = mix(float(1), sin(time.mul(random(3).mul(15).add(5))).mul(0.25).add(0.75), isTv)

// × nightAmount: overdag geven de ramen geen licht, 's nachts wel (zie daynight.js)
material.emissiveNode = windowColor.mul(isWindow).mul(isWall).mul(isLit).mul(flicker).mul(1.1).mul(nightAmount)`,
        },
        try: 'Druk <b>N</b> voor nacht en zoom met <b>C</b> in op een gevel: hier en daar flikkert een blauwe tv.',
      },
      {
        title: 'Dag ↔ nacht met één uniform',
        kicker: 'daynight.js',
        text: `
          <p><code>nightAmount</code> is <b>één getal</b> (0 = dag, 1 = nacht) dat in de TSL-code van ramen, lantaarns en lichtvlekken zit.</p>
          <p>In JavaScript schuiven we het zacht naar 0 of 1, en meteen alle andere instellingen mee: lucht, mist, zon, bloom, koplampen.</p>
          <p>Eén getal in JavaScript, <b>duizenden pixels</b> die reageren. Dat is de kracht van een uniform.</p>`,
        code: [
          {
            file: 'stap8/daynight.js',
            src: `export const nightAmount = uniform(0)`,
          },
          {
            file: 'stap8/main.js · updateDayNight()',
            hl: [2, 3],
            src: `
function updateDayNight(dt) {
  const n = THREE.MathUtils.damp(nightAmount.value, game.night ? 1 : 0, 2, dt)
  nightAmount.value = n // ← de TSL-uniform: ramen, lantaarns en lichtvlekken reageren
  scene.background.lerpColors(DAY.sky, NIGHT.sky, n)
  scene.fog.color.copy(scene.background)
  hemi.intensity = THREE.MathUtils.lerp(DAY.hemi, NIGHT.hemi, n)
  sun.intensity = THREE.MathUtils.lerp(DAY.sun, NIGHT.sun, n)
  sun.color.copy(tmpColor.lerpColors(DAY.sunColor, NIGHT.sunColor, n))
  glow.strength.value = THREE.MathUtils.lerp(DAY.bloom, NIGHT.bloom, n)
  headlights.intensity = THREE.MathUtils.lerp(DAY.head, NIGHT.head, n)
}`,
          },
        ],
        try: 'Druk een paar keer <b>N</b>: de overgang duurt ±2 seconden en alles schuift tegelijk.',
      },
      {
        title: 'Bloom: felle pixels laten gloeien',
        kicker: 'Post-processing',
        text: `
          <p><b>Post-processing</b> = eerst de scene in een textuur tekenen, dan daar nog een effect over leggen, zoals een filter op een foto.</p>
          <ol>
            <li><code>pass(scene, camera)</code>: render de scene naar een textuur</li>
            <li><code>bloom(…)</code>: neem enkel de felle pixels, vervaag ze</li>
            <li>tel de gloed op bij het origineel</li>
          </ol>
          <p>'s Nachts zetten we de bloom sterker (0,2 → 0,65): ramen, neon en zwaailichten krijgen een halo.</p>`,
        code: {
          file: 'stap8/main.js',
          hl: [2, 3, 4],
          src: `
const pipeline = new THREE.RenderPipeline(renderer)
const sceneColor = pass(scene, camera).getTextureNode('output')
const glow = bloom(sceneColor, DAY.bloom, 0.4, 0.7)
pipeline.outputNode = sceneColor.add(glow)`,
        },
      },
      {
        title: 'Driften: grip als lerp op de snelheid',
        kicker: 'Rijgedrag',
        text: `
          <p>In stap 2 ging de auto altijd <em>exact</em> waar zijn neus wees. Nu is de echte snelheid een <b>vector</b> die er maar geleidelijk naartoe schuift.</p>
          <ul>
            <li><b>Veel grip</b> (10): bijna meteen → gewoon rijden</li>
            <li><b>Handrem</b> (1,2): de auto draait, maar glijdt nog in de oude richting → <b>drift</b></li>
          </ul>
          <p><code>slip</code> = hoe snel de auto zijwaarts glijdt. Daarmee tekenen we <b>bandensporen</b>: een ringbuffer van 800 streepjes in één InstancedMesh, waarbij de nieuwste de oudste overschrijft.</p>`,
        code: {
          file: 'stap8/main.js · updateCar()',
          hl: [3, 5, 6, 7],
          src: `
const fx = Math.sin(game.heading)
const fz = Math.cos(game.heading)
const grip = handbrake ? HANDBRAKE_GRIP : GRIP
const t = 1 - Math.exp(-grip * dt)
velocity.x += (fx * game.speed - velocity.x) * t
velocity.y += (fz * game.speed - velocity.y) * t
slip = Math.abs(velocity.x * fz - velocity.y * fx) // zijwaartse snelheid (dot product met "rechts")`,
        },
        try: 'Rij snel, stuur en houd <b>Spatie</b> (handrem) in: de ambulance glijdt en laat zwarte sporen na.',
      },
      {
        title: 'Botsingen zelf berekenen',
        kicker: 'Cirkel tegen rechthoek',
        text: `
          <p>Voor de stad gebruiken we <b>geen</b> physics engine: dat zou te zwaar en te onvoorspelbaar zijn. De ambulance = <b>twee cirkels</b> (voor en achter), een gebouw = een rechthoek.</p>
          <ol>
            <li>dichtstbijzijnde punt op de rechthoek = <code>clamp</code> van het cirkelmidden</li>
            <li>afstand &lt; straal? → botsing</li>
            <li>duw de auto <b>(straal − afstand)</b> terug naar buiten</li>
          </ol>`,
        diagram: svgCircleRect,
        code: {
          file: 'stap8/main.js · collideWithBuildings()',
          hl: [3, 4, 8, 9, 10, 11],
          src: `
for (const point of carPoints) {
  for (const r of city.colliders) {
    const cx = THREE.MathUtils.clamp(point.x, r.x0, r.x1) // dichtstbijzijnde punt op de rechthoek
    const cz = THREE.MathUtils.clamp(point.y, r.z0, r.z1)
    const dx = point.x - cx
    const dz = point.y - cz
    const d = Math.hypot(dx, dz)
    if (d < CAR_RADIUS && d > 0.0001) {
      const push = CAR_RADIUS - d
      carBody.position.x += (dx / d) * push
      carBody.position.z += (dz / d) * push
      bumped = true
    }
  }
}`,
        },
      },
      {
        title: 'Verkeers-AI: kijk voor je uit',
        kicker: 'traffic.js',
        wide: true,
        text: `
          <p>Elke auto weet enkel: vanaf welk <b>kruispunt</b>, in welke <b>richting</b>, en hoe ver al (<code>s</code>). Op het volgende kruispunt kiest hij een willekeurige nieuwe richting (niet terug).</p>
          <p>Gedrag, elke frame:</p>
          <ul>
            <li>iets in een strook van <b>9 × 2,2 m</b> vóór mij? → remmen</li>
            <li>kruispunt bezet? → wachten</li>
            <li><b>sirene</b> binnen 30 m? → traag en naar rechts uitwijken</li>
          </ul>
          <p class="sl-note">"Vóór mij" en "opzij" zijn gewoon dot products met de rijrichting.</p>`,
        code: {
          file: 'stap8/traffic.js · update()',
          hl: [4, 5, 6, 13, 14],
          src: `
const check = (other, keep) => {
  const rx = other.x - pos.x
  const rz = other.z - pos.z
  const ahead = rx * dx + rz * dz           // hoeveel meter vóór mij
  const side = Math.abs(rx * -dz + rz * dx) // hoeveel meter opzij
  if (ahead > 0 && ahead < 9 && side < 2.2) targetSpeed = Math.min(targetSpeed, keep)
}
for (const o of obstacles) check(o.position, 0)
for (const other of cars) if (other !== car) check(other.vehicle.mesh.position, other.wrecked ? 0 : other.speed * 0.7)

// …
// 3. Sirene in de buurt: traag en uitwijken naar rechts
const nearSiren = siren.on && Math.hypot(siren.x - pos.x, siren.z - pos.z) < 30
if (nearSiren) targetSpeed = Math.min(targetSpeed, 2)`,
        },
        try: 'Zet de sirene aan (<b>H</b>) en rij achter een auto: hij vertraagt en wijkt uit naar rechts.',
      },
      {
        title: 'Wegknallen: van AI naar physics',
        kicker: 'Wrakken',
        text: `
          <p>Verkeersauto's zijn normaal <b>geen</b> physics-objecten: de AI zet ze elke frame op hun plek. Daarom voelden ze aan als rotsen.</p>
          <p>Bij een harde klap (&gt; 15 km/u) wordt de auto even een <b>wrak</b>:</p>
          <ol>
            <li>de AI laat hem los (<code>wrecked = true</code>)</li>
            <li>hij krijgt een <b>DYNAMIC body</b> met de snelheid van de klap, omhoog en tollend</li>
            <li>physics → mesh, zoals de blokjes in stap 3</li>
            <li>na 6 s: body weg, auto elders terug in het verkeer</li>
          </ol>
          <p><b>Collision filter:</b> het wrak start half <em>in</em> de ambulance. Een halve seconde negeert het de ambulance, anders duwt cannon het als een sneeuwploeg voor je uit.</p>`,
        code: {
          file: 'stap8/main.js · launchCar()',
          hl: [1, 4, 10],
          src: `
body.collisionFilterMask = ALL_BUT_PLAYER // eerst vrij wegvliegen (zie hierboven)
// …
body.velocity.set(
  (dx / d) * speed * 0.6 + velocity.x * 0.6,
  2 + speed * 0.45,
  (dz / d) * speed * 0.6 + velocity.y * 0.6
)
// tollen: hoe harder de klap, hoe wilder
const spin = speed * 0.35
body.angularVelocity.set((Math.random() - 0.5) * spin, (Math.random() - 0.5) * spin * 2, (Math.random() - 0.5) * spin)`,
        },
        try: 'Rij met de sirene aan (sneller!) frontaal op een auto: hij vliegt over de kruising. Gebouwen hebben onzichtbare physics-muren, dus hij kaatst ertegen.',
      },
      {
        title: 'Vlot blijven: delen en instancen',
        kicker: 'Performance',
        text: `
          <ul>
            <li><b>Modellen één keer laden</b>, daarna <code>clone()</code>. Een kloon heeft eigen posities, maar <b>deelt</b> geometry en materiaal: 30 taxi's kosten nauwelijks extra geheugen.</li>
            <li><code>Promise.all</code>: alle modellen laden <b>tegelijk</b>, niet na elkaar.</li>
            <li>Lantaarns, wegmarkeringen, zebrapaden en dakobjecten: <b>InstancedMesh</b> (honderden objecten, een handvol draw calls).</li>
            <li>Ramen, daken en asfalt: <b>shader</b> in plaats van textuur → geen downloads, geen geheugen.</li>
          </ul>`,
        code: {
          file: 'stap8/vehicles.js',
          hl: [3, 9],
          src: `
export async function loadModels(loader, urls) {
  const entries = Object.entries(urls)
  const gltfs = await Promise.all(entries.map(([, url]) => loader.loadAsync(url)))
  // …
}

// Een rijklare kopie maken van een template (zie ook stap 7, car.js)
export function createVehicle(template) {
  const model = template.clone(true)
  // …
}`,
        },
      },
    ],
  },
}
