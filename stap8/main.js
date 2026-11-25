// STAP 8 – NACHTDIENST: de ambulance-missie
//
// Rij met de ambulance door een stad (van bovenaf), haal gewonden op en breng ze
// naar het ziekenhuis vóór de tijd op is. Botsen geeft schade.
//
// Nieuw t.o.v. stap 7:
//   - een STAD als raster (city.js) met TSL-ramen (window-material.js) en een TSL-tegelstoep
//   - DAG/NACHT met één TSL-uniform (daynight.js) – toets N
//   - BLOOM via TSL post-processing
//   - VERKEER (traffic.js) en VOETGANGERS (pedestrians.js) met eenvoudige "AI"
//   - vrij rondrijden met BOTSINGEN tegen gebouwen (cirkel vs rechthoek, zelf berekend)
//   - een MISSIE: ophalen → afleveren, met timer, navigatiepijl en lichtzuil
//   - TOP-DOWN camera (C = volgcamera)
//
// Overgenomen: ambulance + zwaailichten + sirene + preloader (stap 7), gras + spoor in
// het park (stap 4/6), physics voor kegels en dozen (stap 3), radio (stap 8, eerste versie).

import * as THREE from 'three/webgpu'
import { pass, uv, time, sin, float, color } from 'three/tsl'
import { bloom } from 'three/addons/tsl/display/BloomNode.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import * as CANNON from 'cannon-es'
import { createPreloader } from './preloader.js'
import { loadModels, createVehicle, measure, syncMeshToBody } from './vehicles.js'
import { createEmergencyLights } from './emergency-lights.js'
import { createCity, blockRect, isHospital, isPark, PARK_BLOCK, DROP_ZONE, ROAD, CITY_SIZE, PITCH, SIDEWALK } from './city.js'
import { createTraffic } from './traffic.js'
import { createPedestrians, createFigure } from './pedestrians.js'
import { createGrass } from './grass.js'
import { createTrail } from './trail.js'
import { createAudio } from './audio.js'
import { createRadio } from './radio.js'
import { nightAmount } from './daynight.js'
import '../style.css'

// ---------------------------------------------------------------
// INSTELLINGEN
// ---------------------------------------------------------------
const MAX_SPEED = 20        // m/s (72 km/u)
const SIREN_MAX_SPEED = 30  // m/s (108 km/u) met de sirene aan…
const SIREN_DAMAGE = 1.5    // …maar elke botsing doet 1,5× zoveel schade
const SIREN_ACCELERATION = 14
const GRIP = 10             // hoe snel de auto in de richting van zijn neus "plakt"
const HANDBRAKE_GRIP = 1.2  // met handrem: de achterkant glijdt weg (drift)
const HANDBRAKE_TURN = 1.7  // met handrem draai je scherper
const HANDBRAKE_DRAG = 9    // en verlies je snelheid
const MAX_REVERSE = 6
const ACCELERATION = 10
const BRAKE = 22
const FRICTION = 4
const TURN_SPEED = 2.4      // rad/s bij volle draaikracht
const CAR_RADIUS = 1.3      // botscirkel rond voor- en achterkant van de ambulance

const DAMAGE = { building: 10, car: 25, pedestrian: 30 }
const PATIENT_HIT = 20      // gezondheid die een gewonde verliest per botsing
const STOP_SPEED = 2.5      // trager dan dit = "stilstaan" om in/uit te laden
const LOAD_TIME = 1.2       // seconden inladen/uitladen

// ---------------------------------------------------------------
// RENDERER, SCENE, LICHT
// ---------------------------------------------------------------
const DAY = { sky: new THREE.Color('#9cc3e0'), hemi: 1.7, sun: 2.6, sunColor: new THREE.Color('#fff4e0'), bloom: 0.2, head: 0 }
const NIGHT = { sky: new THREE.Color('#070912'), hemi: 0.6, sun: 0.8, sunColor: new THREE.Color('#9fb4ff'), bloom: 0.65, head: 45 }

const scene = new THREE.Scene()
scene.background = DAY.sky.clone()
scene.fog = new THREE.Fog(DAY.sky.clone(), 80, 220)

const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.5, 400)

const renderer = new THREE.WebGPURenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFShadowMap
renderer.toneMapping = THREE.ACESFilmicToneMapping
document.body.appendChild(renderer.domElement)

const hemi = new THREE.HemisphereLight('#dfe8ff', '#3a3a30', DAY.hemi)
const sun = new THREE.DirectionalLight(DAY.sunColor, DAY.sun)
sun.castShadow = true
sun.shadow.mapSize.set(2048, 2048)
sun.shadow.camera.left = sun.shadow.camera.bottom = -50
sun.shadow.camera.right = sun.shadow.camera.top = 50
sun.shadow.camera.far = 150
scene.add(hemi, sun, sun.target)

// BLOOM (TSL post-processing): felle pixels gloeien
const pipeline = new THREE.RenderPipeline(renderer)
const sceneColor = pass(scene, camera).getTextureNode('output')
const glow = bloom(sceneColor, DAY.bloom, 0.4, 0.7)
pipeline.outputNode = sceneColor.add(glow)

// ---------------------------------------------------------------
// PHYSICS (enkel voor kegels en dozen op de stoep)
// ---------------------------------------------------------------
const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) })
world.broadphase = new CANNON.SAPBroadphase(world)
world.allowSleep = true
const groundBody = new CANNON.Body({ type: CANNON.Body.STATIC, shape: new CANNON.Plane() })
groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0)
world.addBody(groundBody)

// ---------------------------------------------------------------
// DE STAD
// ---------------------------------------------------------------
const ground = new THREE.Mesh(new THREE.PlaneGeometry(800, 800), new THREE.MeshStandardMaterial({ color: '#2a2a2e' }))
ground.rotation.x = -Math.PI / 2
ground.position.set(CITY_SIZE / 2, -0.01, CITY_SIZE / 2)
ground.receiveShadow = true
scene.add(ground)

const city = createCity(scene)

// Gebouwen ook in de physics-wereld: onzichtbare STATIC blokken, zodat weggeknalde auto's,
// kegels en dozen ertegen kaatsen i.p.v. erdoor te vliegen. (De ambulance botst zelf al
// tegen gebouwen via collideWithBuildings: een KINEMATIC en een STATIC body botsen niet.)
const BUILDING_WALL_HEIGHT = 25
for (const r of city.colliders) {
  const halfX = (r.x1 - r.x0) / 2
  const halfZ = (r.z1 - r.z0) / 2
  world.addBody(new CANNON.Body({
    type: CANNON.Body.STATIC,
    shape: new CANNON.Box(new CANNON.Vec3(halfX, BUILDING_WALL_HEIGHT / 2, halfZ)),
    position: new CANNON.Vec3(r.x0 + halfX, BUILDING_WALL_HEIGHT / 2, r.z0 + halfZ),
  }))
}

// Park: gras + spoor (stap 4 en 6). Het gras staat in het midden van het parkblok;
// de shader en het spoor rekenen in "park-coördinaten" (t.o.v. dat midden).
const park = blockRect(PARK_BLOCK.i, PARK_BLOCK.j)
const parkCenter = new THREE.Vector2((park.x0 + park.x1) / 2, (park.z0 + park.z1) / 2)
const lawnHalf = (park.x1 - park.x0) / 2 - SIDEWALK
const trail = createTrail({ halfWidth: lawnHalf, length: lawnHalf * 2, pixelsPerMeter: 4 })
const grass = createGrass({ count: 30_000, bands: [[-lawnHalf, lawnHalf]], minZ: -lawnHalf, maxZ: lawnHalf, trail })
grass.mesh.position.set(parkCenter.x, 0.16, parkCenter.y)
scene.add(grass.mesh)
let lastTrail = null

const audio = createAudio()
const radio = createRadio(audio)

// ---------------------------------------------------------------
// MODELLEN LADEN (met preloader, zie stap 7)
// ---------------------------------------------------------------
const preloader = createPreloader()
const loader = new GLTFLoader(preloader.manager)
const TRAFFIC_MODELS = ['sedan', 'taxi', 'van', 'suv', 'delivery', 'truck', 'garbage-truck', 'hatchback-sports', 'sedan-sports', 'suv-luxury']
let models
try {
  models = await loadModels(loader, {
    ambulance: '/carkit/ambulance.glb',
    sedan: '/carkit/sedan.glb', taxi: '/carkit/taxi.glb', van: '/carkit/van.glb',
    suv: '/carkit/suv.glb', delivery: '/carkit/delivery.glb',
    truck: '/carkit/truck.glb', 'garbage-truck': '/carkit/garbage-truck.glb',
    'hatchback-sports': '/carkit/hatchback-sports.glb', 'sedan-sports': '/carkit/sedan-sports.glb',
    'suv-luxury': '/carkit/suv-luxury.glb',
    cone: '/carkit/cone.glb', box: '/carkit/box.glb',
  })
} catch (error) {
  preloader.showError('Een model kon niet geladen worden. Kijk in de console.')
  throw error
}

// ---------------------------------------------------------------
// DE SPELER: AMBULANCE
// ---------------------------------------------------------------
const car = createVehicle(models.ambulance)
scene.add(car.mesh)
const START = new THREE.Vector3(DROP_ZONE.x, 0, DROP_ZONE.z) // start aan het ziekenhuis

// KINEMATIC body: duwt kegels en dozen weg (stap 3)
const carBody = new CANNON.Body({
  type: CANNON.Body.KINEMATIC,
  shape: new CANNON.Box(new CANNON.Vec3(car.size.x / 2 * 0.9, car.size.y / 2, car.size.z / 2 * 0.95)),
})
carBody.allowSleep = false
world.addBody(carBody)

const emergencyLights = createEmergencyLights(car.mesh, [
  { position: [-0.35, 1.86, -0.05], color: '#2f6bff' },
  { position: [0.35, 1.86, -0.05], color: '#2f6bff' },
])
const headlights = new THREE.SpotLight('#fff1d0', 0, 40, 0.55, 0.6, 1)
headlights.position.set(0, 0.9, car.size.z / 2)
headlights.target.position.set(0, 0, 14)
car.mesh.add(headlights, headlights.target)

// ---------------------------------------------------------------
// VERKEER, VOETGANGERS, KEGELS
// ---------------------------------------------------------------
const traffic = createTraffic({ scene, templates: TRAFFIC_MODELS.map((n) => models[n]), count: 70 })
const pedestrians = createPedestrians({ scene, count: 45 })

const props = []
function createProp(name, x, z, mass) {
  const mesh = models[name].clone()
  mesh.traverse((o) => { if (o.isMesh) o.castShadow = true })
  const { size, center } = measure(mesh)
  const body = new CANNON.Body({
    mass, shape: new CANNON.Box(new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2)),
    position: new CANNON.Vec3(x + center.x, 0.15 + center.y, z + center.z),
  })
  scene.add(mesh)
  world.addBody(body)
  props.push({ mesh, body, center })
}
for (const slot of city.sidewalkSlots) {
  if (Math.random() < 0.3) createProp(Math.random() < 0.6 ? 'cone' : 'box', slot.x + (Math.random() - 0.5) * 6, slot.z + (Math.random() - 0.5) * 2, 0.4)
}

// ---------------------------------------------------------------
// MISSIE: gewonde, ziekenhuis, pijl en lichtzuil
// ---------------------------------------------------------------

// LICHTZUIL – TSL: een hoge, doorzichtige cilinder die naar boven toe vervaagt en pulseert.
// Van bovenaf zie je een gloeiende cirkel: "hier moet je zijn".
function createBeacon(colorValue) {
  const material = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })
  material.colorNode = color(colorValue)
  const pulse = sin(time.mul(4)).mul(0.25).add(0.75)
  material.opacityNode = float(1).sub(uv().y).mul(0.55).mul(pulse) // onderaan fel, bovenaan weg
  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 30, 32, 1, true), material)
  beacon.position.y = 15
  const group = new THREE.Group()
  group.add(beacon)
  scene.add(group)
  return group
}
const patientBeacon = createBeacon('#ff4d6d')
const hospitalBeacon = createBeacon('#3dff8a')

// Afleverzone: groen vlak op de straat voor het ziekenhuis
const dropZone = new THREE.Mesh(
  new THREE.PlaneGeometry(DROP_ZONE.width, DROP_ZONE.depth),
  new THREE.MeshBasicMaterial({ color: '#3dff8a', transparent: true, opacity: 0.35, depthWrite: false })
)
dropZone.rotation.x = -Math.PI / 2
dropZone.position.set(DROP_ZONE.x, 0.03, DROP_ZONE.z)
scene.add(dropZone)
hospitalBeacon.position.set(DROP_ZONE.x, 0, DROP_ZONE.z)

// Navigatiepijl: draait rond de ambulance en wijst naar het doel
const arrowShape = new THREE.Shape()
arrowShape.moveTo(0, 1.4)
arrowShape.lineTo(1, -0.2)
arrowShape.lineTo(0.35, -0.2)
arrowShape.lineTo(0.35, -1.2)
arrowShape.lineTo(-0.35, -1.2)
arrowShape.lineTo(-0.35, -0.2)
arrowShape.lineTo(-1, -0.2)
arrowShape.closePath()
const arrowGeometry = new THREE.ShapeGeometry(arrowShape)
arrowGeometry.rotateX(-Math.PI / 2) // plat leggen, punt wijst naar -z…
arrowGeometry.rotateY(Math.PI)      // …en nu naar +z (zelfde "voorkant" als de auto's)
const arrow = new THREE.Mesh(arrowGeometry, new THREE.MeshBasicMaterial({ color: '#3dfff0', transparent: true, opacity: 0.85, depthWrite: false }))
scene.add(arrow)

let patientFigure = null

function spawnPatient() {
  // een stoepplek die niet bij het ziekenhuis of in het park ligt, en niet te dichtbij
  const options = city.sidewalkSlots.filter((s) => !isHospital(s.i, s.j) && !isPark(s.i, s.j) &&
    Math.hypot(s.x - carBody.position.x, s.z - carBody.position.z) > 60)
  const slot = options[Math.floor(Math.random() * options.length)]

  const { group } = createFigure('#ffffff')
  group.rotation.set(-Math.PI / 2, 0, Math.random() * Math.PI) // ligt op de grond
  group.position.set(slot.x, 0.35, slot.z)
  scene.add(group)
  patientFigure = group

  const route = Math.hypot(slot.x - carBody.position.x, slot.z - carBody.position.z) + Math.hypot(slot.x - DROP_ZONE.x, slot.z - DROP_ZONE.z)
  Object.assign(mission, {
    state: 'pickup',
    target: new THREE.Vector3(slot.x, 0, slot.z),
    timeLeft: Math.round(20 + route / 5), // ruwweg: route ÷ 5 m/s + marge
    health: 100,
    loading: 0,
  })
  patientBeacon.position.set(slot.x, 0, slot.z)
  patientBeacon.visible = true
  hospitalBeacon.visible = false
}

const mission = { state: 'pickup', target: new THREE.Vector3(), timeLeft: 0, health: 100, loading: 0 }

function updateMission(dt) {
  mission.timeLeft -= dt
  if (mission.timeLeft <= 0) {
    game.missed++
    popup('Te laat…', '#ff6b6b')
    if (patientFigure) scene.remove(patientFigure)
    return spawnPatient()
  }

  const p = carBody.position
  const slow = Math.abs(game.speed) < STOP_SPEED
  let inPlace = false
  if (mission.state === 'pickup') {
    inPlace = Math.hypot(p.x - mission.target.x, p.z - mission.target.z) < 5.5
  } else {
    inPlace = Math.abs(p.x - DROP_ZONE.x) < DROP_ZONE.width / 2 && Math.abs(p.z - DROP_ZONE.z) < DROP_ZONE.depth / 2 + 1
  }

  // Stilstaan op de juiste plek = laadbalk vult; wegrijden = opnieuw beginnen
  mission.loading = inPlace && slow ? mission.loading + dt : 0
  if (mission.loading >= LOAD_TIME) {
    mission.loading = 0
    audio.chime()
    if (mission.state === 'pickup') {
      scene.remove(patientFigure)
      patientFigure = null
      mission.state = 'deliver'
      mission.target.set(DROP_ZONE.x, 0, DROP_ZONE.z)
      patientBeacon.visible = false
      hospitalBeacon.visible = true
      popup('Gewonde ingeladen!', '#3dff8a')
    } else {
      const points = 100 + Math.round(mission.timeLeft * 5) + mission.health
      game.score += points
      game.delivered++
      popup(`Afgeleverd! +${points}`, '#3dff8a')
      spawnPatient()
    }
  }
}

// ---------------------------------------------------------------
// GAME STATE
// ---------------------------------------------------------------
const game = {
  state: 'loading', // 'loading' | 'start' | 'playing' | 'gameover'
  score: 0, delivered: 0, missed: 0,
  speed: 0, heading: 0, steer: 0,
  damage: 0, hitCooldown: 0,
  siren: false, night: false,
  cameraMode: 'top',
  time: 0,
}

function takeDamage(baseAmount, label) {
  if (game.hitCooldown > 0 || game.state !== 'playing') return
  game.hitCooldown = 1
  const amount = Math.round(baseAmount * (game.siren ? SIREN_DAMAGE : 1)) // sirene = snel maar breekbaar
  game.damage = Math.min(100, game.damage + amount)
  if (mission.state === 'deliver') mission.health = Math.max(0, mission.health - PATIENT_HIT)
  popup(`${label} −${amount}`, '#ff6b6b')
  audio.crash()
  shake(0.6)
  if (game.damage >= 100) gameOver()
}

function resetGame() {
  carBody.position.set(START.x, car.center.y, START.z)
  carBody.velocity.set(0, 0, 0)
  velocity.set(0, 0)
  Object.assign(game, { score: 0, delivered: 0, missed: 0, speed: 0, heading: Math.PI / 2, steer: 0, damage: 0, hitCooldown: 0 })
  carBody.quaternion.setFromEuler(0, game.heading, 0)
  trail.reset()
  if (patientFigure) scene.remove(patientFigure)
  spawnPatient()
  syncMeshToBody(car.mesh, carBody, car.center)
  // wrakken van het vorige spel opruimen
  for (const wreck of wrecks) {
    world.removeBody(wreck.body)
    traffic.respawn(wreck.car, carBody.position)
  }
  wrecks.length = 0
  updateCamera(0, true)
}

// ---------------------------------------------------------------
// INPUT
// ---------------------------------------------------------------
const keys = new Set()
addEventListener('keydown', (e) => {
  keys.add(e.code)
  if (game.state === 'loading') return
  if (e.code === 'Space') { // tijdens het spelen = handrem (zie updateCar)
    e.preventDefault()
    audio.init()
    if (game.state === 'start') startGame()
    else if (game.state === 'gameover') { resetGame(); startGame() }
  }
  if (e.code === 'KeyH') {
    audio.init()
    game.siren = !game.siren
    emergencyLights.setOn(game.siren)
    audio.setSiren(game.siren && game.state === 'playing')
    if (game.state === 'playing') {
      popup(game.siren ? 'Sirene: sneller, maar ×1,5 schade' : 'Sirene uit', game.siren ? '#6fa8ff' : '#cccccc')
    }
  }
  if (e.code === 'KeyC') game.cameraMode = game.cameraMode === 'top' ? 'chase' : 'top'
  if (e.code === 'KeyN') game.night = !game.night
  if (e.code === 'KeyM') {
    audio.init()
    ui.radio.textContent = radio.toggle() ? '📻 Nachtrit FM 104.0 ♪' : '📻 radio uit (M)'
  }
})
addEventListener('keyup', (e) => keys.delete(e.code))
const isDown = (...codes) => codes.some((c) => keys.has(c))

// ---------------------------------------------------------------
// HUD + POP-UPS
// ---------------------------------------------------------------
const $ = (id) => document.getElementById(id)
const ui = {
  score: $('score'), speed: $('speed'), delivered: $('delivered'), missed: $('missed'),
  goal: $('goal'), timer: $('timer'), health: $('health'), distance: $('target-distance'),
  damageFill: document.querySelector('#damage .fill'),
  loading: $('loading'), loadingLabel: $('loading-label'), loadingFill: document.querySelector('#loading .fill'),
  radio: $('radio'), popups: $('popups'),
  overlay: $('overlay'), overlayTitle: $('overlay-title'), overlaySub: $('overlay-sub'), overlayText: $('overlay-text'),
}

function popup(text, colorValue) {
  const el = document.createElement('div')
  el.className = 'popup hud-text'
  el.textContent = text
  el.style.color = colorValue
  ui.popups.appendChild(el)
  el.addEventListener('animationend', () => el.remove())
}

function updateHud() {
  ui.score.textContent = game.score.toLocaleString('nl-BE')
  ui.speed.textContent = Math.round(Math.abs(game.speed) * 3.6)
  ui.delivered.textContent = game.delivered
  ui.missed.textContent = game.missed
  const pickup = mission.state === 'pickup'
  ui.goal.textContent = pickup ? '🚑 Haal de gewonde op' : '🏥 Naar het ziekenhuis'
  ui.goal.classList.toggle('pickup', pickup)
  ui.timer.textContent = Math.max(0, Math.ceil(mission.timeLeft))
  ui.timer.classList.toggle('low', mission.timeLeft < 10)
  ui.health.textContent = mission.health
  ui.distance.textContent = Math.round(Math.hypot(carBody.position.x - mission.target.x, carBody.position.z - mission.target.z))
  ui.damageFill.style.width = `${game.damage}%`
  ui.loading.classList.toggle('visible', mission.loading > 0)
  ui.loadingLabel.textContent = pickup ? 'Inladen…' : 'Uitladen…'
  ui.loadingFill.style.width = `${(mission.loading / LOAD_TIME) * 100}%`
}

function startGame() {
  game.state = 'playing'
  ui.overlay.classList.add('hidden')
  audio.setSiren(game.siren)
}

function gameOver() {
  game.state = 'gameover'
  game.speed = 0
  audio.setSiren(false)
  ui.overlayTitle.textContent = 'TOTAL LOSS'
  ui.overlaySub.textContent = 'De ambulance moet naar de garage.'
  ui.overlayText.innerHTML = `Score: <b>${game.score.toLocaleString('nl-BE')}</b><br />${game.delivered} gewonden afgeleverd · ${game.missed} te laat`
  ui.overlay.querySelector('.key').innerHTML = '<kbd>Spatie</kbd> om opnieuw te spelen'
  ui.overlay.classList.remove('hidden')
}

// ---------------------------------------------------------------
// RIJDEN + BOTSINGEN
// ---------------------------------------------------------------
// De echte snelheid van de auto als vector. Die volgt de neus van de auto niet meteen:
// zo kan de auto "glijden" (slippen). GRIP bepaalt hoe snel hij weer in de rijrichting plakt.
const velocity = new THREE.Vector2()
let slip = 0 // hoeveel m/s de auto zijwaarts glijdt (voor bandensporen en geluid)

function updateCar(dt) {
  let throttle = 0
  let input = 0
  let handbrake = false
  if (game.state === 'playing') {
    throttle = (isDown('KeyW', 'ArrowUp') ? 1 : 0) - (isDown('KeyS', 'ArrowDown') ? 1 : 0)
    input = (isDown('KeyA', 'ArrowLeft') ? 1 : 0) - (isDown('KeyD', 'ArrowRight') ? 1 : 0)
    handbrake = isDown('Space')
  }
  const maxSpeed = game.siren ? SIREN_MAX_SPEED : MAX_SPEED
  const acceleration = game.siren ? SIREN_ACCELERATION : ACCELERATION

  // 1. Gas / rem / achteruit (zoals stap 2) – "speed" = wat de motor wil
  if (throttle > 0) game.speed += (game.speed < 0 ? BRAKE : acceleration) * dt
  else if (throttle < 0) game.speed -= (game.speed > 0 ? BRAKE : acceleration) * dt
  else game.speed -= Math.sign(game.speed) * Math.min(Math.abs(game.speed), FRICTION * dt)
  if (handbrake) game.speed -= Math.sign(game.speed) * Math.min(Math.abs(game.speed), HANDBRAKE_DRAG * dt)
  // sirene uit terwijl je te snel rijdt? Zacht terug naar de normale topsnelheid
  if (game.speed > maxSpeed) game.speed = THREE.MathUtils.damp(game.speed, maxSpeed, 2, dt)
  game.speed = Math.max(game.speed, -MAX_REVERSE)

  // 2. Sturen (met handrem scherper)
  game.steer = THREE.MathUtils.damp(game.steer, input, 10, dt)
  const turn = TURN_SPEED * (handbrake ? HANDBRAKE_TURN : 1)
  game.heading += game.steer * turn * THREE.MathUtils.clamp(game.speed / 5, -1, 1) * dt

  // 3. SLIP: de echte snelheid schuift naar "vooruit × speed", maar niet meteen.
  //    Veel grip = bijna meteen (gewoon rijden). Weinig grip (handrem) = glijden.
  const fx = Math.sin(game.heading)
  const fz = Math.cos(game.heading)
  const grip = handbrake ? HANDBRAKE_GRIP : GRIP
  const t = 1 - Math.exp(-grip * dt)
  velocity.x += (fx * game.speed - velocity.x) * t
  velocity.y += (fz * game.speed - velocity.y) * t
  slip = Math.abs(velocity.x * fz - velocity.y * fx) // zijwaartse snelheid (dot product met "rechts")

  // De auto ZELF verplaatsen met de echte dt (vloeiend, elke frame). De velocity geven we
  // enkel nog door aan cannon, zodat die weet hoe hard de auto tegen kegels en dozen duwt.
  carBody.position.x += velocity.x * dt
  carBody.position.z += velocity.y * dt
  carBody.velocity.set(velocity.x, 0, velocity.y)
  carBody.quaternion.setFromEuler(0, game.heading, 0)

  for (const wheel of car.wheels) wheel.rotation.x += (game.speed * dt) / car.wheelRadius
  for (const pivot of car.frontPivots) pivot.rotation.y = game.steer * 0.45
}

// Terugbotsen: motor én echte snelheid omkeren en afremmen
function bounce(factor) {
  game.speed *= factor
  velocity.multiplyScalar(factor)
}

// ---------------------------------------------------------------
// BANDENSPOREN – een "ringbuffer" van 800 zwarte streepjes (InstancedMesh)
// Nieuwe sporen overschrijven de oudste: altijd hetzelfde aantal, nooit te veel.
// ---------------------------------------------------------------
const SKID_COUNT = 800
const skidMarks = new THREE.InstancedMesh(
  new THREE.PlaneGeometry(0.28, 0.7).rotateX(-Math.PI / 2),
  new THREE.MeshBasicMaterial({ color: '#111114', transparent: true, opacity: 0.55, depthWrite: false }),
  SKID_COUNT
)
skidMarks.frustumCulled = false
const skidDummy = new THREE.Object3D()
skidDummy.scale.setScalar(0) // eerst allemaal onzichtbaar
skidDummy.updateMatrix()
for (let i = 0; i < SKID_COUNT; i++) skidMarks.setMatrixAt(i, skidDummy.matrix)
scene.add(skidMarks)
let skidIndex = 0
let skidDistance = 0

function updateSkidMarks(dt) {
  const moving = Math.hypot(velocity.x, velocity.y)
  if (slip < 2.5 || moving < 3) return
  skidDistance += moving * dt
  if (skidDistance < 0.5) return // om de halve meter een streepje
  skidDistance = 0
  const fx = Math.sin(game.heading)
  const fz = Math.cos(game.heading)
  const back = -car.size.z * 0.3
  for (const side of [-0.65, 0.65]) { // twee achterwielen
    skidDummy.position.set(carBody.position.x + fx * back + fz * side, 0.04, carBody.position.z + fz * back - fx * side)
    skidDummy.rotation.set(0, Math.atan2(velocity.x, velocity.y), 0) // in de richting waarin de auto GLIJDT
    skidDummy.scale.setScalar(1)
    skidDummy.updateMatrix()
    skidMarks.setMatrixAt(skidIndex, skidDummy.matrix)
    skidIndex = (skidIndex + 1) % SKID_COUNT
  }
  skidMarks.instanceMatrix.needsUpdate = true
}

// De ambulance als twee cirkels (voor en achter): eenvoudig én precies genoeg.
const carPoints = [new THREE.Vector2(), new THREE.Vector2()]
function updateCarPoints() {
  const fx = Math.sin(game.heading)
  const fz = Math.cos(game.heading)
  const half = car.size.z / 2 - CAR_RADIUS * 0.8
  carPoints[0].set(carBody.position.x + fx * half, carBody.position.z + fz * half)
  carPoints[1].set(carBody.position.x - fx * half, carBody.position.z - fz * half)
}
// Raakt iets op positie (x, z) met straal r de ambulance?
function touchesPlayer(position, r) {
  return carPoints.some((c) => Math.hypot(c.x - position.x, c.y - position.z) < CAR_RADIUS + r)
}

// Botsing met gebouwen: cirkel tegen rechthoek → duw de auto terug naar buiten
function collideWithBuildings() {
  let bumped = false
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
  }
  // rand van de stad
  const edge = ROAD / 2 - CAR_RADIUS
  carBody.position.x = THREE.MathUtils.clamp(carBody.position.x, -edge, CITY_SIZE + edge)
  carBody.position.z = THREE.MathUtils.clamp(carBody.position.z, -edge, CITY_SIZE + edge)

  if (bumped) {
    if (Math.abs(game.speed) > 6) takeDamage(DAMAGE.building, 'Gebouw')
    bounce(-0.25) // terugbotsen
  }
}

// ---------------------------------------------------------------
// WEGKNALLEN: een verkeersauto wordt even een physics-WRAK (zoals de blokjes in stap 3)
// ---------------------------------------------------------------
// Verkeersauto's zijn normaal GEEN physics-objecten: de AI zet ze elke frame op hun plek.
// Bij een harde klap geven we de auto tijdelijk een DYNAMIC body met de snelheid van de klap.
// Na WRECK_TIME seconden verdwijnt het wrak en rijdt de auto elders weer mee.
const LAUNCH_SPEED = 4   // m/s (≈ 15 km/u): vanaf hier vliegt een auto weg
const WRECK_TIME = 6     // seconden
const wrecks = []

// COLLISION FILTERS: elke body zit in een "groep" (bit) en heeft een "masker" (met welke groepen
// hij mag botsen). Een nieuw wrak zit half IN de ambulance: zonder filter duwt cannon het
// voor de ambulance uit, als een sneeuwploeg. Daarom negeert het wrak de ambulance even.
const GROUP_PLAYER = 2
const ALL = -1                      // alle bits aan = botst met alles
const ALL_BUT_PLAYER = ALL ^ GROUP_PLAYER
const NO_PLAYER_TIME = 0.5          // seconden
carBody.collisionFilterGroup = GROUP_PLAYER

function launchCar(other) {
  const vehicle = other.vehicle
  other.wrecked = true // de AI laat hem nu los (traffic.js)
  const mesh = vehicle.mesh

  // Physics-box rond het MIDDEN van het model (het nulpunt van het model ligt op de grond)
  const center = vehicle.center.clone().applyAxisAngle(THREE.Object3D.DEFAULT_UP, mesh.rotation.y)
  const body = new CANNON.Body({
    mass: 2,
    shape: new CANNON.Box(new CANNON.Vec3(vehicle.size.x / 2, vehicle.size.y / 2, vehicle.size.z / 2)),
    position: new CANNON.Vec3(mesh.position.x + center.x, mesh.position.y + center.y, mesh.position.z + center.z),
    linearDamping: 0.05,
    angularDamping: 0.1,
  })
  body.quaternion.setFromEuler(0, mesh.rotation.y, 0)
  body.collisionFilterMask = ALL_BUT_PLAYER // eerst vrij wegvliegen (zie hierboven)

  // Snelheid van de klap: weg van de ambulance + mee in haar rijrichting + omhoog
  const speed = Math.hypot(velocity.x, velocity.y)
  const dx = body.position.x - carBody.position.x
  const dz = body.position.z - carBody.position.z
  const d = Math.hypot(dx, dz) || 1
  body.velocity.set(
    (dx / d) * speed * 0.6 + velocity.x * 0.6,
    2 + speed * 0.45,
    (dz / d) * speed * 0.6 + velocity.y * 0.6
  )
  // tollen: hoe harder de klap, hoe wilder
  const spin = speed * 0.35
  body.angularVelocity.set((Math.random() - 0.5) * spin, (Math.random() - 0.5) * spin * 2, (Math.random() - 0.5) * spin)

  world.addBody(body)
  wrecks.push({ car: other, body, center: vehicle.center, time: 0 })
  game.score += 50
  popup('+50 WEGGEKNALD', '#ffd166')
}

function updateWrecks(dt) {
  for (let i = wrecks.length - 1; i >= 0; i--) {
    const wreck = wrecks[i]
    wreck.time += dt
    if (wreck.time > NO_PLAYER_TIME) wreck.body.collisionFilterMask = ALL // nu mag je er weer tegen rijden
    syncMeshToBody(wreck.car.vehicle.mesh, wreck.body, wreck.center, true) // physics → mesh (stap 3)
    if (wreck.time > WRECK_TIME || wreck.body.position.y < -20) {
      world.removeBody(wreck.body)
      traffic.respawn(wreck.car, carBody.position) // terug in het verkeer, ver van de speler
      wrecks.splice(i, 1)
    }
  }
}

function collideWithTraffic() {
  for (const other of traffic.cars) {
    if (other.wrecked) continue // een wrak is nu een physics-body: cannon regelt de botsing
    const pos = other.vehicle.mesh.position
    // lange voertuigen (vrachtwagens): test midden, voor- en achterkant
    const half = Math.max(0, other.vehicle.size.z / 2 - 1.2)
    const fx = Math.sin(other.vehicle.mesh.rotation.y) * half
    const fz = Math.cos(other.vehicle.mesh.rotation.y) * half
    const hit = [[0, 0], [fx, fz], [-fx, -fz]].some(([ox, oz]) => touchesPlayer({ x: pos.x + ox, z: pos.z + oz }, 1.3))
    if (hit && Math.hypot(velocity.x, velocity.y) > LAUNCH_SPEED) {
      // HARDE KLAP: de auto vliegt weg (physics), jij verliest wat snelheid maar rijdt door
      takeDamage(DAMAGE.car, 'Aanrijding')
      launchCar(other)
      bounce(0.6)
      shake(1.2)
    } else if (hit) {
      // zacht tikje: zoals vroeger een beetje uit elkaar en terugbotsen
      const dx = carBody.position.x - pos.x
      const dz = carBody.position.z - pos.z
      const d = Math.hypot(dx, dz) || 1
      carBody.position.x += (dx / d) * 0.4 // een beetje uit elkaar
      carBody.position.z += (dz / d) * 0.4
      if (Math.abs(game.speed) > 3 || other.speed > 3) takeDamage(DAMAGE.car, 'Aanrijding')
      bounce(-0.3)
      other.speed = 0
    }
  }
}

// ---------------------------------------------------------------
// CAMERA: top-down (noorden boven) of volgcamera
// ---------------------------------------------------------------
const cameraTarget = new THREE.Vector3()
const lookTarget = new THREE.Vector3()
const currentLook = new THREE.Vector3()
let shakeAmount = 0
const shake = (amount) => { shakeAmount = Math.max(shakeAmount, amount) }

function updateCamera(dt, instant = false) {
  const p = car.mesh.position
  if (game.cameraMode === 'top') {
    // recht van bovenaf, een stukje vooruit kijken in de rijrichting
    const height = 62 + Math.abs(game.speed) * 1.0
    const ahead = game.speed * 0.6
    cameraTarget.set(p.x + Math.sin(game.heading) * ahead, height, p.z + Math.cos(game.heading) * ahead - 0.01)
    lookTarget.set(cameraTarget.x, 0, cameraTarget.z)
    camera.up.set(0, 0, 1) // scherm-boven = +z ("noorden")
  } else {
    const back = new THREE.Vector3(0, 6, -11)
    car.mesh.localToWorld(back)
    cameraTarget.copy(back)
    lookTarget.set(0, 1.2, 10)
    car.mesh.localToWorld(lookTarget)
    camera.up.set(0, 1, 0)
  }
  const t = instant ? 1 : 1 - Math.exp(-5 * dt)
  camera.position.lerp(cameraTarget, t)
  currentLook.lerp(lookTarget, t)
  camera.position.x += (Math.random() - 0.5) * shakeAmount
  camera.position.z += (Math.random() - 0.5) * shakeAmount
  shakeAmount = THREE.MathUtils.damp(shakeAmount, 0, 6, dt)
  camera.lookAt(currentLook)
}

// DAG ↔ NACHT: alles schuift zacht mee met nightAmount (0..1)
const tmpColor = new THREE.Color()
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
}

// ---------------------------------------------------------------
// LUS
// ---------------------------------------------------------------
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})

resetGame()

const siren = { on: false, x: 0, z: 0 }
let previousTime = performance.now()
function animate(timestamp) {
  const dt = Math.min((timestamp - previousTime) / 1000, 0.1)
  previousTime = timestamp
  game.time = timestamp / 1000
  game.hitCooldown -= dt

  updateCar(dt)
  // world.step rekent in VASTE stappen van 1/60 s: de ene frame 0 stappen, de volgende 2.
  // Liet je cannon de ambulance verplaatsen, dan stond hij soms een frame stil en sprong
  // hij daarna → haperen. Daarom: positie bewaren en na de stap terugzetten.
  const carX = carBody.position.x
  const carZ = carBody.position.z
  world.step(1 / 60, dt, 3)
  updateWrecks(dt) // weggeknalde auto's: physics → mesh, en na een tijdje terug in het verkeer
  carBody.position.set(carX, car.center.y, carZ)
  updateCarPoints()
  collideWithBuildings()
  collideWithTraffic()
  updateCarPoints()
  syncMeshToBody(car.mesh, carBody, car.center)
  // kegels/dozen: de GEÏNTERPOLEERDE positie (tussen twee physics-stappen in) → ook vloeiend
  for (const prop of props) syncMeshToBody(prop.mesh, prop.body, prop.center, true)

  siren.on = game.siren
  siren.x = carBody.position.x
  siren.z = carBody.position.z
  traffic.update(dt, [{ position: carBody.position }, ...pedestrians.crossingPeople()], siren)
  pedestrians.update(dt, game.time, touchesPlayer, siren, () => takeDamage(DAMAGE.pedestrian, 'Voetganger'))

  if (game.state === 'playing') updateMission(dt)

  // nav-pijl rond de ambulance, wijzend naar het doel
  const toTarget = Math.atan2(mission.target.x - carBody.position.x, mission.target.z - carBody.position.z)
  arrow.position.set(carBody.position.x + Math.sin(toTarget) * 4.5, 3, carBody.position.z + Math.cos(toTarget) * 4.5)
  arrow.rotation.y = toTarget
  arrow.visible = game.state === 'playing'

  // gras + spoor in het park (in park-coördinaten)
  const localX = carBody.position.x - parkCenter.x
  const localZ = carBody.position.z - parkCenter.y
  grass.carPosition.value.set(localX, 0, localZ)
  if (Math.abs(localX) < lawnHalf + 2 && Math.abs(localZ) < lawnHalf + 2) {
    if (lastTrail) trail.stampLine(lastTrail.x, lastTrail.z, localX, localZ, 1.1)
    lastTrail = { x: localX, z: localZ }
  } else {
    lastTrail = null
  }

  updateCamera(dt)
  updateDayNight(dt)
  sun.position.set(car.mesh.position.x - 20, 60, car.mesh.position.z - 10)
  sun.target.position.copy(car.mesh.position)
  emergencyLights.update(game.time)
  updateSkidMarks(dt)
  audio.setSkid(game.state === 'playing' ? THREE.MathUtils.clamp((slip - 2) / 8, 0, 1) : 0)
  audio.setEngine(Math.abs(game.speed), game.state === 'playing')
  updateHud()

  pipeline.render()
}

// Shaders vooraf compileren, ook voor nacht-only dingen die nu nog niet zichtbaar zijn
await preloader.compile(renderer, scene, camera)
preloader.hide()
game.state = 'start'
ui.overlay.classList.remove('hidden')
renderer.setAnimationLoop(animate)
