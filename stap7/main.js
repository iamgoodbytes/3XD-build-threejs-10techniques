// STAP 7 – Een echt model (ambulance) + een preloader
//
// Nieuw t.o.v. stap 6:
//   - car.js laadt een GLB-model met GLTFLoader i.p.v. een blokjesauto te bouwen
//   - preloader.js: LoadingManager + laadbalk + shaders vooraf compileren
//   - de physics-box en de botsingsbox worden GEMETEN uit het model (Box3)
//   - top-level await: de code wacht tot het model er is
//
// (Uit stap 6:)
// Alles komt samen:
//   - auto (stap 2)            → car.js
//   - physics (stap 3)         → blokjes omver rijden, barrières opblazen
//   - gras-shader (stap 4)     → grass.js + trail.js (spoortextuur: het gras blijft plat)
//   - raycasting (stap 5)      → klik op een barrière om ze op te blazen
//   - geluid (nieuw)           → audio.js
//
// Nieuwe game-concepten:
//   - GAME STATES: 'start' → 'playing' → 'gameover' → (reset) → 'playing'
//   - EINDELOOS: de auto rijdt echt vooruit. Wat achter de auto ligt, wordt
//     naar voren verplaatst (weg, gras) of opgeruimd (obstakels).
//   - SPAWNEN: nieuwe rijen obstakels verschijnen ver vóór de auto.
//   - MOEILIJKHEID stijgt met de afstand.

import * as THREE from 'three/webgpu'
import * as CANNON from 'cannon-es'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { loadCar } from './car.js'
import { createPreloader } from './preloader.js'
import { createEmergencyLights } from './emergency-lights.js'
import { createGrass } from './grass.js'
import { createTrail } from './trail.js'
import { createAudio } from './audio.js'
import '../style.css'

// ---------------------------------------------------------------
// INSTELLINGEN – speel ermee!
// ---------------------------------------------------------------
const ROAD_HALF_WIDTH = 5      // weg is 10 m breed
const LANES = [-3.4, 0, 3.4]   // x-posities van de 3 rijstroken
const TILE_LENGTH = 40         // lengte van één wegstuk
const TILE_COUNT = 5           // 5 × 40 = 200 m weg tegelijk
const SPAWN_AHEAD = 140        // obstakels zo ver vóór de auto klaarzetten
const CLEANUP_BEHIND = 25      // opruimen als ze zo ver achter de auto liggen

const START_MAX_SPEED = 20     // topsnelheid bij de start, m/s (≈ 70 km/u)
const MAX_SPEED = 34           // hoogste topsnelheid, m/s (≈ 120 km/u)
const ACCELERATION = 10        // m/s² bij gas geven
const BRAKE = 25               // m/s² bij remmen
const FRICTION = 3             // m/s² uitbollen zonder gas
const MAX_STEER_ANGLE = 0.35   // radialen (±20°): hoe schuin de auto maximaal mag rijden

const START_CHARGES = 3
const MAX_CHARGES = 5
const CHARGE_EVERY = 200       // +1 lading per zoveel meter

// Moeilijkheid als functie van de afstand (in meter)
const difficulty = {
  maxSpeed: (d) => Math.min(MAX_SPEED, START_MAX_SPEED + d * 0.015), // de auto mag steeds sneller
  rowSpacing: (d) => Math.max(12, 24 - d * 0.008),
  doubleBarrierChance: (d) => Math.min(0.6, 0.15 + d * 0.0006),
}

// ---------------------------------------------------------------
// BASIS
// ---------------------------------------------------------------
const scene = new THREE.Scene()
scene.background = new THREE.Color('#87ceeb')
scene.fog = new THREE.Fog('#87ceeb', 40, 150)

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 220)

const renderer = new THREE.WebGPURenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFShadowMap // (PCFSoftShadowMap bestaat niet meer sinds three r18x)
document.body.appendChild(renderer.domElement)

scene.add(new THREE.HemisphereLight('#ffffff', '#4a7a3a', 1.0))
const sun = new THREE.DirectionalLight('#ffffff', 2.5)
sun.castShadow = true
sun.shadow.mapSize.set(2048, 2048)
sun.shadow.camera.left = sun.shadow.camera.bottom = -30
sun.shadow.camera.right = sun.shadow.camera.top = 30
scene.add(sun, sun.target)

const audio = createAudio()

// ---------------------------------------------------------------
// PHYSICS
// ---------------------------------------------------------------
const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) })
world.broadphase = new CANNON.SAPBroadphase(world)
world.broadphase.axisIndex = 2 // sorteer op z: onze wereld is lang in de z-richting
world.solver.iterations = 15
world.allowSleep = true
world.defaultContactMaterial.friction = 0.4

// Een oneindig vlak → de physics-grond hoeven we nooit te recyclen!
const groundBody = new CANNON.Body({ type: CANNON.Body.STATIC, shape: new CANNON.Plane() })
groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0)
world.addBody(groundBody)

// ---------------------------------------------------------------
// DE WERELD DIE MEESCHUIFT
// ---------------------------------------------------------------

// 1. Grasgrond: één groot effen vlak dat gewoon met de auto meeschuift.
//    Omdat het effen is, zie je niet dat het beweegt.
const groundMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(200, 400),
  new THREE.MeshStandardMaterial({ color: '#2f5a1f' })
)
groundMesh.rotation.x = -Math.PI / 2
groundMesh.receiveShadow = true
scene.add(groundMesh)

// 2. Baanstukken: die hebben krijtlijnen, dus die moeten we RECYCLEN:
//    een stuk dat achter de auto ligt, springt TILE_COUNT × TILE_LENGTH naar voren.
// De baan is een gemaaide grasstrook (iets lichter); het gras van de shader groeit eroverheen
const roadMaterial = new THREE.MeshStandardMaterial({ color: '#3d6b26', roughness: 1 })
const lineMaterial = new THREE.MeshStandardMaterial({ color: '#f1f1f1' })
const roadGeometry = new THREE.PlaneGeometry(ROAD_HALF_WIDTH * 2, TILE_LENGTH)
const edgeGeometry = new THREE.PlaneGeometry(0.2, TILE_LENGTH)
const dashGeometry = new THREE.PlaneGeometry(0.15, 2)

function createRoadTile() {
  const tile = new THREE.Group()
  const road = new THREE.Mesh(roadGeometry, roadMaterial)
  road.rotation.x = -Math.PI / 2
  road.position.y = 0.01
  road.receiveShadow = true
  tile.add(road)

  for (const x of [-ROAD_HALF_WIDTH + 0.2, ROAD_HALF_WIDTH - 0.2]) {
    const edge = new THREE.Mesh(edgeGeometry, lineMaterial)
    edge.rotation.x = -Math.PI / 2
    edge.position.set(x, 0.02, 0)
    tile.add(edge)
  }
  // Onderbroken strepen tussen de rijstroken
  for (const x of [-1.7, 1.7]) {
    for (let z = -TILE_LENGTH / 2 + 2.5; z < TILE_LENGTH / 2; z += 5) {
      const dash = new THREE.Mesh(dashGeometry, lineMaterial)
      dash.rotation.x = -Math.PI / 2
      dash.position.set(x, 0.02, z)
      tile.add(dash)
    }
  }
  return tile
}

const roadTiles = []
for (let i = 0; i < TILE_COUNT; i++) {
  const tile = createRoadTile()
  scene.add(tile)
  roadTiles.push(tile)
}

// 3. Gras: het veld ligt van z = -40 tot +160 t.o.v. de positie van de grass-mesh.
//    We schuiven de hele mesh in sprongen van TILE_LENGTH mee (zie updateWorld).
//    60% van de sprieten staat op de baan: daar rijdt de auto er doorheen.
// De spoortextuur: onthoudt waar de auto het gras platreed (zie trail.js)
const trail = createTrail({ halfWidth: 8, length: 256, pixelsPerMeter: 4 })
const TRAIL_RADIUS = 1.1 // iets breder dan de halve ambulance (0,75 m): de wielen drukken ook gras opzij
let lastTrailX = 0
let lastTrailZ = 0

const grass = createGrass({
  count: 140_000,
  minX: -20, maxX: 20,
  minZ: -TILE_LENGTH, maxZ: TILE_LENGTH * 4,
  denseHalfWidth: ROAD_HALF_WIDTH,
  denseFraction: 0.6,
  trail,
})
scene.add(grass.mesh)

// ---------------------------------------------------------------
// DE AUTO
// ---------------------------------------------------------------
// NIEUW: het model laden. "await" = wacht hier tot het geladen is.
// Ondertussen toont de preloader de voortgang (de LoadingManager gaat mee in de loader).
const preloader = createPreloader()
const gltfLoader = new GLTFLoader(preloader.manager)

let car
try {
  car = await loadCar(gltfLoader, '/carkit/ambulance.glb') // uit de map public/
} catch (error) {
  preloader.showError('Het model kon niet geladen worden. Kijk in de console voor details.')
  throw error // stop hier: zonder auto geen spel
}
scene.add(car.mesh)
console.log('Ambulance geladen, afmetingen (m):', car.size)

// NIEUW: zwaailichten op het dak. De posities lazen we af uit het model:
// het hoogste dakdeel ligt op y = 1,80 m en loopt vooraan tot z ≈ 0,05 m.
const emergencyLights = createEmergencyLights(car.mesh, [
  [-0.35, 1.86, -0.05], // links
  [0.35, 1.86, -0.05],  // rechts
])

// De physics-box GEMETEN uit het model i.p.v. getallen te raden.
// Een tikje smaller/korter dan het model voelt eerlijker bij botsingen.
const CAR_BODY_HEIGHT = car.size.y / 2 // midden van de box boven de grond
const carBody = new CANNON.Body({
  type: CANNON.Body.KINEMATIC,
  shape: new CANNON.Box(new CANNON.Vec3(car.size.x / 2 * 0.9, car.size.y / 2, car.size.z / 2 * 0.95)),
  position: new CANNON.Vec3(0, CAR_BODY_HEIGHT, 0),
})
carBody.allowSleep = false
world.addBody(carBody)

// ---------------------------------------------------------------
// OBSTAKELS
// Elk obstakel: { mesh, body, kind: 'block' | 'barrier', counted, active }
// ---------------------------------------------------------------
const obstacles = []

const BLOCK_SIZE = 0.6
const blockGeometry = new THREE.BoxGeometry(BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE)
const blockShape = new CANNON.Box(new CANNON.Vec3(BLOCK_SIZE / 2, BLOCK_SIZE / 2, BLOCK_SIZE / 2))
const blockMaterials = ['#4cc9f0', '#4895ef', '#4361ee', '#f72585', '#ffd166'].map(
  (c) => new THREE.MeshStandardMaterial({ color: c })
)

const BARRIER_SIZE = new THREE.Vector3(2.4, 1.2, 0.6)
const barrierGeometry = new THREE.BoxGeometry(BARRIER_SIZE.x, BARRIER_SIZE.y, BARRIER_SIZE.z)
const barrierShape = new CANNON.Box(new CANNON.Vec3(BARRIER_SIZE.x / 2, BARRIER_SIZE.y / 2, BARRIER_SIZE.z / 2))
const barrierMaterial = new THREE.MeshStandardMaterial({ color: '#e63946', emissive: '#e63946', emissiveIntensity: 0.25 })
const barrierHoverMaterial = new THREE.MeshStandardMaterial({ color: '#ff8fa3', emissive: '#ff4d6d', emissiveIntensity: 0.9 })
const barrierBlastedMaterial = new THREE.MeshStandardMaterial({ color: '#555555' })

function addObstacle(mesh, body, kind) {
  mesh.castShadow = mesh.receiveShadow = true
  scene.add(mesh)
  world.addBody(body)
  const obstacle = { mesh, body, kind, counted: false, active: true }
  mesh.userData.obstacle = obstacle // voor de raycaster: mesh → obstakel
  obstacles.push(obstacle)
  return obstacle
}

function createBlock(x, y, z) {
  const material = blockMaterials[Math.floor(Math.random() * blockMaterials.length)]
  const body = new CANNON.Body({ mass: 0.5, shape: blockShape, position: new CANNON.Vec3(x, y, z) })
  addObstacle(new THREE.Mesh(blockGeometry, material), body, 'block')
}

function createBarrier(x, z) {
  // STATIC: de auto (kinematic) kan hem niet wegduwen → game over bij aanraking
  const body = new CANNON.Body({
    type: CANNON.Body.STATIC,
    shape: barrierShape,
    position: new CANNON.Vec3(x, BARRIER_SIZE.y / 2, z),
  })
  addObstacle(new THREE.Mesh(barrierGeometry, barrierMaterial), body, 'barrier')
}

// Een stapeltje blokjes op een rijstrook: willekeurig een muurtje of een piramide
function createBlockGroup(x, z) {
  if (Math.random() < 0.5) {
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 4; col++) {
        createBlock(x + (col - 1.5) * BLOCK_SIZE, BLOCK_SIZE / 2 + row * BLOCK_SIZE, z)
      }
    }
  } else {
    for (let row = 0; row < 3; row++) {
      const count = 3 - row
      for (let i = 0; i < count; i++) {
        createBlock(x + (i - (count - 1) / 2) * BLOCK_SIZE, BLOCK_SIZE / 2 + row * BLOCK_SIZE, z)
      }
    }
  }
}

// Eén rij obstakels over de breedte van de weg.
// Er blijft ALTIJD minstens één rijstrook zonder barrière → altijd te ontwijken.
function spawnRow(z, distance) {
  const lanes = [...LANES].sort(() => Math.random() - 0.5) // schudden
  const barrierCount = Math.random() < difficulty.doubleBarrierChance(distance) ? 2 : 1
  lanes.forEach((x, i) => {
    if (i < barrierCount) createBarrier(x, z)
    else if (Math.random() < 0.6) createBlockGroup(x, z)
  })
}

function removeObstacle(obstacle) {
  scene.remove(obstacle.mesh)
  world.removeBody(obstacle.body)
}

// ---------------------------------------------------------------
// GAME STATE
// ---------------------------------------------------------------
const game = {
  state: 'loading', // 'loading' | 'start' | 'playing' | 'gameover'
  score: 0,
  blockPoints: 0,
  distance: 0,
  speed: 0,
  steer: 0,       // -1..1, zacht gevolgd (voor het kantelen van de wielen/auto)
  charges: START_CHARGES,
  nextChargeAt: CHARGE_EVERY,
  nextRowZ: 0,
  siren: false,   // NIEUW: sirene + zwaailichten
}

function resetGame() {
  for (const obstacle of obstacles) removeObstacle(obstacle)
  obstacles.length = 0

  carBody.position.set(0, CAR_BODY_HEIGHT, 0)
  carBody.velocity.set(0, 0, 0)
  carBody.quaternion.set(0, 0, 0, 1)

  Object.assign(game, {
    score: 0, blockPoints: 0, distance: 0, speed: 0, steer: 0,
    charges: START_CHARGES, nextChargeAt: CHARGE_EVERY, nextRowZ: 35,
  })

  roadTiles.forEach((tile, i) => tile.position.set(0, 0, (i - 0.5) * TILE_LENGTH))
  trail.reset()
  lastTrailX = lastTrailZ = 0
  spawnAhead()
  syncMeshes()
  updateCamera(0, true)
}

// ---------------------------------------------------------------
// INPUT
// ---------------------------------------------------------------
const keys = new Set()
addEventListener('keydown', (e) => {
  keys.add(e.code)
  // NIEUW: H = sirene + zwaailichten aan/uit
  if (e.code === 'KeyH' && !e.repeat) toggleSiren()
  if (e.code === 'Space') {
    e.preventDefault() // anders scrolt de pagina
    audio.init()       // geluid mag pas na een actie van de gebruiker
    if (game.state === 'start') startGame()
    else if (game.state === 'gameover') {
      resetGame()
      startGame()
    }
  }
})
addEventListener('keyup', (e) => keys.delete(e.code))
const isDown = (...codes) => codes.some((c) => keys.has(c))

function toggleSiren() {
  if (game.state === 'loading') return
  audio.init() // mag: een toets of klik is een gebruikersactie
  game.siren = !game.siren
  emergencyLights.setOn(game.siren)
  audio.setSiren(game.siren && game.state === 'playing')
  syncToolbar()
}

// KNOPPENBALK (linksonder): toont de sneltoets en of de sirene aan staat; ook aanklikbaar
const toolbar = document.getElementById('tools')
const sirenButton = toolbar.querySelector('[data-action="siren"]')
toolbar.addEventListener('mousedown', (e) => e.preventDefault()) // geen focus → spatie blijft van de game
for (const type of ['pointerdown', 'click']) {
  toolbar.addEventListener(type, (e) => e.stopPropagation()) // geen barrière opblazen via de knop
}
sirenButton.addEventListener('click', toggleSiren)

function syncToolbar() {
  sirenButton.classList.toggle('on', game.siren)
  sirenButton.querySelector('.state').textContent = game.siren ? 'aan' : 'uit'
}
syncToolbar()

// ---------------------------------------------------------------
// RAYCASTING – klik op een barrière om ze op te blazen
// ---------------------------------------------------------------
const raycaster = new THREE.Raycaster()
const pointer = new THREE.Vector2(10, 10)
let hoveredBarrier = null

addEventListener('pointermove', (e) => {
  pointer.x = (e.clientX / innerWidth) * 2 - 1
  pointer.y = -(e.clientY / innerHeight) * 2 + 1
})

function barrierUnderPointer() {
  const targets = obstacles.filter((o) => o.kind === 'barrier' && o.active).map((o) => o.mesh)
  raycaster.setFromCamera(pointer, camera)
  const hit = raycaster.intersectObjects(targets, false)[0]
  return hit ? { obstacle: hit.object.userData.obstacle, point: hit.point } : null
}

function updateHover() {
  const hit = game.state === 'playing' ? barrierUnderPointer() : null
  const barrier = hit ? hit.obstacle : null
  if (barrier !== hoveredBarrier) {
    if (hoveredBarrier && hoveredBarrier.active) hoveredBarrier.mesh.material = barrierMaterial
    if (barrier) barrier.mesh.material = game.charges > 0 ? barrierHoverMaterial : barrierMaterial
    hoveredBarrier = barrier
  }
  document.body.style.cursor = barrier && game.charges > 0 ? 'crosshair' : 'default'
}

addEventListener('pointerdown', () => {
  if (game.state !== 'playing') return
  const hit = barrierUnderPointer()
  if (!hit) return
  if (game.charges <= 0) {
    audio.click() // "leeg"-geluidje
    return
  }
  game.charges--
  blastBarrier(hit.obstacle, hit.point)
})

// Een STATIC body kan je niet zomaar laten wegvliegen. Daarom vervangen we hem
// door een DYNAMIC body op exact dezelfde plek, en geven we die een flinke impuls.
function blastBarrier(barrier, point) {
  world.removeBody(barrier.body)
  const body = new CANNON.Body({
    mass: 3,
    shape: barrierShape,
    position: barrier.body.position.clone(),
    quaternion: barrier.body.quaternion.clone(),
  })
  world.addBody(body)
  barrier.body = body
  barrier.active = false // niet meer gevaarlijk
  barrier.mesh.material = barrierBlastedMaterial

  // Omhoog en opzij (weg van het midden van de weg), zodat hij niet terug op de weg landt
  const side = Math.sign(body.position.x) || (Math.random() < 0.5 ? -1 : 1)
  const impulse = new CANNON.Vec3(side * 14, 22, 6)
  // Raakpunt t.o.v. het midden → de barrière gaat tollen
  const relativePoint = new CANNON.Vec3(
    point.x - body.position.x,
    point.y - body.position.y,
    point.z - body.position.z
  )
  body.applyImpulse(impulse, relativePoint)
  audio.blast()
}

// ---------------------------------------------------------------
// HUD + OVERLAY
// ---------------------------------------------------------------
const ui = {
  score: document.getElementById('score'),
  distance: document.getElementById('distance'),
  speed: document.getElementById('speed'),
  charges: document.getElementById('charges'),
  overlay: document.getElementById('overlay'),
  overlayTitle: document.getElementById('overlay-title'),
  overlayText: document.getElementById('overlay-text'),
}

function updateHud() {
  ui.score.textContent = game.score
  ui.distance.textContent = Math.floor(game.distance)
  ui.speed.textContent = Math.round(game.speed * 3.6)
  ui.charges.textContent = '💣'.repeat(game.charges) || '–'
}

function startGame() {
  game.state = 'playing'
  audio.setSiren(game.siren)
  ui.overlay.classList.add('hidden')
}

function gameOver() {
  game.state = 'gameover'
  game.speed = 0
  audio.setSiren(false) // de lichten blijven wel zwaaien
  carBody.velocity.set(0, 0, 0)
  audio.crash()
  ui.overlayTitle.textContent = 'Boem! Game over'
  ui.overlayText.innerHTML =
    `Score: <b>${game.score}</b><br />` +
    `${Math.floor(game.distance)} m gereden · ${game.blockPoints / 10} blokjes omver`
  ui.overlay.querySelector('.key').innerHTML = '<kbd>Spatie</kbd> om opnieuw te spelen'
  ui.overlay.classList.remove('hidden')
}

// ---------------------------------------------------------------
// UPDATE-FUNCTIES
// ---------------------------------------------------------------

// De speler geeft gas/remt (W/S) en stuurt links/rechts (A/D).
// De topsnelheid stijgt met de afstand: hoe verder, hoe sneller je MAG.
function updateCar(dt) {
  if (game.state === 'playing') {
    const throttle = (isDown('KeyW', 'ArrowUp') ? 1 : 0) - (isDown('KeyS', 'ArrowDown') ? 1 : 0)
    if (throttle > 0) game.speed += ACCELERATION * dt
    else if (throttle < 0) game.speed -= BRAKE * dt
    else game.speed -= FRICTION * dt
    game.speed = THREE.MathUtils.clamp(game.speed, 0, difficulty.maxSpeed(game.distance))

    const input = (isDown('KeyA', 'ArrowLeft') ? 1 : 0) - (isDown('KeyD', 'ArrowRight') ? 1 : 0)
    game.steer = THREE.MathUtils.damp(game.steer, input, 12, dt)
  } else {
    game.steer = THREE.MathUtils.damp(game.steer, 0, 12, dt)
  }

  // Sturen = de auto een beetje DRAAIEN, en dan rijdt hij in de richting waarin hij kijkt.
  // Zo kan je enkel opzij als je vooruit rijdt (stilstaan = niet zijwaarts "zweven").
  // Aan de rand van de baan: niet verder naar buiten sturen.
  const limit = ROAD_HALF_WIDTH - 0.8
  const x = carBody.position.x
  if ((x >= limit && game.steer > 0) || (x <= -limit && game.steer < 0)) {
    game.steer = THREE.MathUtils.damp(game.steer, 0, 20, dt)
  }
  const heading = game.steer * MAX_STEER_ANGLE

  // forward = (sin, cos) × snelheid – net als in stap 2
  carBody.velocity.set(Math.sin(heading) * game.speed, 0, Math.cos(heading) * game.speed)
  carBody.quaternion.setFromEuler(0, heading, 0)

  for (const wheel of car.wheels) wheel.rotation.x += (game.speed * dt) / car.wheelRadius
  for (const pivot of car.frontPivots) pivot.rotation.y = game.steer * 0.3
}

// physics → meshes, en tegelijk punten tellen voor blokjes die in beweging komen
function syncMeshes() {
  for (const obstacle of obstacles) {
    obstacle.mesh.position.copy(obstacle.body.position)
    obstacle.mesh.quaternion.copy(obstacle.body.quaternion)

    if (game.state === 'playing' && obstacle.kind === 'block' && !obstacle.counted &&
        obstacle.body.velocity.lengthSquared() > 4) { // sneller dan 2 m/s
      obstacle.counted = true
      game.blockPoints += 10
      audio.hit()
    }
  }
  carBody.position.x = THREE.MathUtils.clamp(carBody.position.x, -ROAD_HALF_WIDTH + 0.8, ROAD_HALF_WIDTH - 0.8)
  car.mesh.position.set(carBody.position.x, carBody.position.y - CAR_BODY_HEIGHT, carBody.position.z)
  car.mesh.quaternion.copy(carBody.quaternion)
}

// Botsing met een barrière? Een STATIC en een KINEMATIC body botsen niet in cannon-es
// (geen van beide kan bewegen door een botsing), dus we testen het zelf met bounding boxes.
const carBox = new THREE.Box3()
const carBoxSize = car.size.clone().multiply(new THREE.Vector3(0.85, 0.9, 0.9)) // iets kleiner dan het model = eerlijker
const barrierBox = new THREE.Box3()

function checkCrash() {
  carBox.setFromCenterAndSize(car.mesh.position.clone().setY(CAR_BODY_HEIGHT), carBoxSize)
  for (const obstacle of obstacles) {
    if (obstacle.kind !== 'barrier' || !obstacle.active) continue
    barrierBox.setFromObject(obstacle.mesh)
    if (carBox.intersectsBox(barrierBox)) return gameOver()
  }
}

function spawnAhead() {
  const carZ = carBody.position.z
  while (game.nextRowZ < carZ + SPAWN_AHEAD) {
    spawnRow(game.nextRowZ, game.nextRowZ)
    game.nextRowZ += difficulty.rowSpacing(game.nextRowZ)
  }
}

function updateWorld() {
  const carZ = carBody.position.z

  // Wegstukken die achter ons liggen → naar voren
  for (const tile of roadTiles) {
    if (tile.position.z + TILE_LENGTH / 2 < carZ - CLEANUP_BEHIND) {
      tile.position.z += TILE_COUNT * TILE_LENGTH
    }
  }

  // Gras en grond schuiven mee (gras in sprongen, zodat de sprieten niet "meeglijden")
  grass.mesh.position.z = Math.floor(carZ / TILE_LENGTH) * TILE_LENGTH
  groundMesh.position.z = carZ

  // Uniforms voor de gras-shader: de shader rekent zelf om naar wereldcoördinaten
  grass.offsetZ.value = grass.mesh.position.z
  grass.carPosition.value.set(carBody.position.x, 0, carZ)

  // SPOOR: verf van de vorige naar de huidige positie, en wis ver achter de auto
  // (die rijen van de herhalende textuur worden straks ver vóór de auto hergebruikt)
  const carX = carBody.position.x
  if (carZ - lastTrailZ > 0.05 || Math.abs(carX - lastTrailX) > 0.05) {
    trail.stampLine(lastTrailX, lastTrailZ, carX, carZ, TRAIL_RADIUS)
    trail.clear(lastTrailZ - 60, carZ - 60)
    lastTrailX = carX
    lastTrailZ = carZ
  }

  // Obstakels achter de auto (of die van de wereld gevallen zijn) opruimen
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const obstacle = obstacles[i]
    if (obstacle.body.position.z < carZ - CLEANUP_BEHIND || obstacle.body.position.y < -20) {
      removeObstacle(obstacle)
      obstacles.splice(i, 1)
    }
  }

  spawnAhead()
}

function updateScore() {
  game.distance = carBody.position.z
  game.score = Math.floor(game.distance) + game.blockPoints
  if (game.distance >= game.nextChargeAt) {
    game.nextChargeAt += CHARGE_EVERY
    if (game.charges < MAX_CHARGES) game.charges++
  }
}

// Volgcamera: blijft recht achter de weg kijken, volgt de auto maar half opzij
const cameraTarget = new THREE.Vector3()
const lookTarget = new THREE.Vector3()
const currentLook = new THREE.Vector3()

function updateCamera(dt, instant = false) {
  const p = car.mesh.position
  cameraTarget.set(p.x * 0.6, 5, p.z - 10) // ambulance is hoger dan de blokjesauto
  lookTarget.set(p.x * 0.4, 1, p.z + 10)
  const t = instant ? 1 : 1 - Math.exp(-6 * dt)
  camera.position.lerp(cameraTarget, t)
  currentLook.lerp(lookTarget, t)
  // z volgt altijd meteen: bij 120 km/u zou de camera anders te ver achterop raken
  camera.position.z = cameraTarget.z
  currentLook.z = lookTarget.z
  camera.lookAt(currentLook)
}

// ---------------------------------------------------------------
// RESIZE + ANIMATIE-LUS
// ---------------------------------------------------------------
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})

resetGame()

let previousTime = performance.now()
function animate(timestamp) {
  const dt = Math.min((timestamp - previousTime) / 1000, 0.1)
  previousTime = timestamp

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
  updateHover()

  sun.position.set(car.mesh.position.x + 10, 20, car.mesh.position.z + 10)
  sun.target.position.copy(car.mesh.position)

  audio.setEngine(game.speed, game.state === 'playing')
  emergencyLights.update(timestamp / 1000)
  updateHud()
  renderer.render(scene, camera)
}

// NIEUW: alles is geladen → shaders compileren, preloader weg, startscherm tonen
await preloader.compile(renderer, scene, camera)
preloader.hide()
game.state = 'start'
ui.overlay.classList.remove('hidden')
renderer.setAnimationLoop(animate)
