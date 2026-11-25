// STAP 7b – Emissive: wat het doet (en niet doet)
//
// In stap 7 hebben de zwaailichten TWEE onderdelen: een emissive "lens" én een PointLight.
// Waarom niet enkel emissive? Deze kleine demo laat het zien:
//
//   A = blok met enkel een EMISSIVE materiaal
//   B = exact hetzelfde blok + een POINTLIGHT erin
//   C = ter vergelijking: een blok in gewone oranje VERF (color, geen emissive)
//
// Wat emissive DOET:
//   - het oppervlak krijgt een eigen kleur die NIET donker wordt zonder licht
//     (eindkleur = verlichte kleur + emissive)
// Wat emissive NIET doet:
//   - het verlicht niets anders (de bol en de muur ernaast blijven donker)
//   - het werpt geen schaduw
//   - het maakt geen "gloed" rond het blok: dat is BLOOM, een nabewerking van het hele beeld

import * as THREE from 'three/webgpu'
import { pass } from 'three/tsl'
import { bloom } from 'three/addons/tsl/display/BloomNode.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import '../style.css'

const LAMP_COLOR = '#ff6a2a'

// ---------------------------------------------------------------
// BASIS
// ---------------------------------------------------------------
const NIGHT_SKY = new THREE.Color('#05060a')
const DAY_SKY = new THREE.Color('#9cc3e0')

const scene = new THREE.Scene()
scene.background = NIGHT_SKY.clone()

const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 100)
camera.position.set(0, 4.5, 11)

const renderer = new THREE.WebGPURenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFShadowMap
renderer.toneMapping = THREE.ACESFilmicToneMapping
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.target.set(0, 1, 0)
controls.enableDamping = true

// Omgevingslicht: 's nachts bijna niets, overdag veel (toets N)
const hemi = new THREE.HemisphereLight('#dfe8ff', '#3a3a30', 0.04)
const sun = new THREE.DirectionalLight('#fff4e0', 0)
sun.position.set(4, 10, 6)
sun.castShadow = true
sun.shadow.camera.left = sun.shadow.camera.bottom = -10
sun.shadow.camera.right = sun.shadow.camera.top = 10
scene.add(hemi, sun)

// ---------------------------------------------------------------
// DE KAMER: vloer + witte achtermuur (om te zien wat er verlicht wordt)
// ---------------------------------------------------------------
const roomMaterial = new THREE.MeshStandardMaterial({ color: '#bfbfbf', roughness: 0.9 })
const floor = new THREE.Mesh(new THREE.PlaneGeometry(24, 14), roomMaterial)
floor.rotation.x = -Math.PI / 2
floor.receiveShadow = true
scene.add(floor)

const wall = new THREE.Mesh(new THREE.PlaneGeometry(24, 7), roomMaterial)
wall.position.set(0, 3.5, -3)
wall.receiveShadow = true
scene.add(wall)

// ---------------------------------------------------------------
// TWEE OPSTELLINGEN: A (links) en B (rechts), verder identiek
// ---------------------------------------------------------------
const whiteMaterial = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.5 })
const pedestalMaterial = new THREE.MeshStandardMaterial({ color: '#555a66', roughness: 0.8 })

// Het lampmateriaal: een donkere "verf" (colorNode/color) + een emissive kleur.
// Eindkleur van een pixel = (color × binnenvallend licht) + emissive × emissiveIntensity
const lampMaterial = new THREE.MeshStandardMaterial({
  color: '#222222',
  emissive: LAMP_COLOR,
  emissiveIntensity: 3,
})

// Ter vergelijking (blok C): dezelfde oranje, maar als gewone "verf" (color) i.p.v. emissive.
// Verf heeft licht nodig: in het donker is ze zwart, overdag ziet ze eruit zoals A.
const paintMaterial = new THREE.MeshStandardMaterial({ color: LAMP_COLOR })

function createSetup(x, labelText, material = lampMaterial, withProps = true) {
  const group = new THREE.Group()
  group.position.x = x

  const pedestal = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1, 0.8), pedestalMaterial)
  pedestal.position.y = 0.5
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), material)
  lamp.position.y = 1.25

  // Witte objecten vlak bij de lamp: worden ze verlicht? Werpen ze schaduw?
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.45, 32, 16), whiteMaterial)
  sphere.position.set(1.3, 0.45, 0.3)
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.4, 0.6), whiteMaterial)
  box.position.set(-1.3, 0.7, -0.4)

  for (const mesh of [pedestal, sphere, box]) mesh.castShadow = mesh.receiveShadow = true
  group.add(pedestal, lamp, createLabel(labelText))
  if (withProps) group.add(sphere, box)
  scene.add(group)
  return group
}

// Label: tekst op een canvas → textuur → sprite
function createLabel(text) {
  const canvas = document.createElement('canvas')
  canvas.width = 640
  canvas.height = 96
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = 'rgba(0, 0, 0, 0.65)'
  ctx.beginPath()
  ctx.roundRect(4, 4, 632, 88, 20)
  ctx.fill()
  ctx.fillStyle = '#c8c8c8' // niet zuiver wit: anders gloeit de tekst mee met de bloom
  ctx.font = 'bold 42px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 320, 50)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false }))
  label.scale.set(3.4, 0.51, 1)
  label.position.y = 2.3
  return label
}

createSetup(-4.5, 'A · enkel emissive')
createSetup(0, 'C · gewone oranje verf', paintMaterial, false)
const setupB = createSetup(4.5, 'B · emissive + PointLight')

// Enkel B krijgt een ECHT licht, in het midden van het blok.
// Het blok zelf werpt geen schaduw, anders zou het zijn eigen licht tegenhouden.
const pointLight = new THREE.PointLight(LAMP_COLOR, 0, 4, 2) // distance = bereik in meter (A en C liggen verder), decay 2 = natuurkundig
pointLight.position.y = 1.25
pointLight.castShadow = true
pointLight.shadow.mapSize.set(1024, 1024)
setupB.add(pointLight)

// ---------------------------------------------------------------
// BLOOM: de "gloed" is een NABEWERKING van het hele beeld, geen eigenschap van emissive
// ---------------------------------------------------------------
const pipeline = new THREE.RenderPipeline(renderer)
const sceneColor = pass(scene, camera).getTextureNode('output')
const glow = bloom(sceneColor, 0, 0.5, 0.8) // sterkte, straal, drempel (enkel pixels feller dan 0,8)
pipeline.outputNode = sceneColor.add(glow)

// ---------------------------------------------------------------
// INSTELLINGEN (knoppen + sneltoetsen)
// ---------------------------------------------------------------
const state = {
  emissive: true,
  light: false,
  bloom: false,
  day: false,
  intensity: 3,
}

function apply() {
  lampMaterial.emissiveIntensity = state.emissive ? state.intensity : 0
  // Het licht volgt dezelfde sterkte: zo blijven A en B eerlijk vergelijkbaar
  pointLight.intensity = state.light ? state.intensity * 6 : 0 // intensiteit, NIET visible (zie stap 7)
  glow.strength.value = state.bloom ? 1.2 : 0
  hemi.intensity = state.day ? 1.6 : 0.04
  sun.intensity = state.day ? 2.5 : 0
  scene.background.copy(state.day ? DAY_SKY : NIGHT_SKY)
  syncUi()
}

const actions = {
  emissive: () => { state.emissive = !state.emissive },
  light: () => { state.light = !state.light },
  bloom: () => { state.bloom = !state.bloom },
  day: () => { state.day = !state.day },
}
const KEYS = { KeyE: 'emissive', KeyP: 'light', KeyG: 'bloom', KeyN: 'day' }

addEventListener('keydown', (e) => {
  if (e.repeat) return
  if (KEYS[e.code]) actions[KEYS[e.code]]()
  else if (e.code === 'Minus' || e.code === 'NumpadSubtract') setIntensity(state.intensity - 0.5)
  else if (e.code === 'Equal' || e.code === 'NumpadAdd') setIntensity(state.intensity + 0.5)
  else return
  apply()
})

function setIntensity(value) {
  state.intensity = THREE.MathUtils.clamp(Math.round(value * 10) / 10, 0, 8)
}

// ---- UI ----
const toolbar = document.getElementById('tools')
const slider = document.getElementById('intensity')
const sliderValue = document.getElementById('intensity-value')
const observeList = document.getElementById('observe-list')

toolbar.addEventListener('mousedown', (e) => { if (e.target !== slider) e.preventDefault() }) // geen focus op knoppen
toolbar.addEventListener('pointerdown', (e) => e.stopPropagation()) // niet ronddraaien als je een knop gebruikt
toolbar.addEventListener('click', (e) => {
  const button = e.target.closest('button[data-action]')
  if (!button) return
  actions[button.dataset.action]()
  apply()
})
slider.addEventListener('input', () => {
  setIntensity(Number(slider.value))
  apply()
})
slider.addEventListener('change', () => slider.blur()) // anders pakt de slider de pijltjestoetsen

function syncUi() {
  for (const button of toolbar.querySelectorAll('button[data-action]')) {
    const key = button.dataset.action
    const on = state[key]
    button.classList.toggle('on', on)
    button.querySelector('.state').textContent = key === 'day' ? (on ? 'dag' : 'nacht') : on ? 'aan' : 'uit'
  }
  slider.value = state.intensity
  sliderValue.textContent = state.intensity.toFixed(1)
  observeList.innerHTML = observations().map((text) => `<li>${text}</li>`).join('')
}

// Wat moet je in de huidige stand opmerken?
function observations() {
  const list = []
  if (!state.emissive && !state.light) {
    list.push('Alles uit: de blokken zijn gewoon donkergrijs. Zet <b>E</b> aan.')
  }
  if (state.emissive) {
    list.push('<b>A en B</b> lijken allebei te branden: emissive geeft het oppervlak een eigen kleur die <b>niet donker wordt</b> zonder licht.')
    if (!state.day) list.push('Vergelijk met <b>C</b> (gewone oranje verf): in het donker is die bijna <b>zwart</b>. Dat is wat emissive doet, ook zonder gloed.')
    if (!state.light) {
      list.push('Maar kijk naar de <b>witte bol, het blok en de muur</b> naast A en B: ze blijven donker. Emissive <b>verlicht niets</b>. Zet <b>P</b> aan.')
    }
  }
  if (state.light) {
    list.push('Rond <b>B</b> worden bol, blok, vloer en muur oranje verlicht, met <b>schaduwen</b>. Dat doet enkel de PointLight. Rond A: nog altijd donker.')
    if (!state.emissive) list.push('Licht zonder emissive: de omgeving van B is verlicht, maar het blok zelf lijkt <b>niet</b> te branden. Je hebt ze <b>allebei</b> nodig (zoals de zwaailichten in stap 7).')
  }
  if (state.bloom) {
    list.push('<b>Gloed</b>: de halo rond de felle pixels is <b>bloom</b>, een nabewerking van het hele beeld. Zet emissive uit: de gloed verdwijnt mee, want er zijn geen felle pixels meer.')
  } else if (state.emissive) {
    list.push('Geen halo rond de blokken: emissive alleen maakt <b>geen gloed</b>. Zet <b>G</b> aan.')
  }
  if (state.day) {
    list.push('<b>Overdag</b> valt emissive bijna weg: de rest van de scène is nu ook fel. Daarom gaan de ramen in stap 8 pas \'s nachts branden.')
    list.push('Overdag lijkt <b>C</b> (gewone verf) bijna even fel als A: het verschil zie je pas als het donker is.')
  }
  if (state.emissive && state.intensity === 0) list.push('Sterkte 0: emissive staat in feite uit.')
  return list
}

// ---------------------------------------------------------------
// RESIZE + LUS
// ---------------------------------------------------------------
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})

apply()

renderer.setAnimationLoop(() => {
  controls.update()
  pipeline.render()
})
