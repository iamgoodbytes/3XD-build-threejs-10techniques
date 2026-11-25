// STAP 3 – Physics: een auto die blokjes omver rijdt
//
// Nieuw t.o.v. stap 2:
//   - een physics-wereld met cannon-es (zwaartekracht, botsingen)
//   - TWEE werelden die we synchroon houden:
//       Three.js  = wat je ZIET   (meshes)
//       cannon-es = wat er GEBEURT (bodies)
//   - drie soorten bodies: STATIC (grond), DYNAMIC (blokjes), KINEMATIC (auto)
//
// Het rijgedrag van stap 2 blijft hetzelfde. Alleen zetten we nu niet meer
// zelf de positie van de auto, maar geven we de physics-body een SNELHEID.
// De physics engine verplaatst de auto en duwt zo de blokjes weg.

import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import '../style.css'

// ---------------------------------------------------------------
// Basis (zoals stap 1) + schaduwen en mist
// ---------------------------------------------------------------
const scene = new THREE.Scene()
scene.background = new THREE.Color('#87ceeb')
scene.fog = new THREE.Fog('#87ceeb', 30, 90) // verre dingen vervagen in de lucht

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 200)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFShadowMap // (PCFSoftShadowMap bestaat niet meer sinds three r18x)
document.body.appendChild(renderer.domElement)

scene.add(new THREE.HemisphereLight('#ffffff', '#4a7a3a', 1.0)) // lucht- en grondkleur

const sun = new THREE.DirectionalLight('#ffffff', 2.5)
sun.position.set(10, 20, 10)
sun.castShadow = true
sun.shadow.mapSize.set(2048, 2048)
sun.shadow.camera.left = sun.shadow.camera.bottom = -30 // het gebied waarin schaduwen berekend worden
sun.shadow.camera.right = sun.shadow.camera.top = 30
scene.add(sun, sun.target) // target meenemen zodat we het later kunnen verplaatsen

// ---------------------------------------------------------------
// Grond
// ---------------------------------------------------------------
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(400, 400),
  new THREE.MeshStandardMaterial({ color: '#5a8f3e' })
)
ground.rotation.x = -Math.PI / 2 // een plane staat standaard rechtop → plat leggen
ground.receiveShadow = true
scene.add(ground)

const grid = new THREE.GridHelper(400, 200, '#000000', '#000000')
grid.material.opacity = 0.12
grid.material.transparent = true
grid.position.y = 0.01 // net boven de grond, anders flikkert het (z-fighting)
scene.add(grid)

// ---------------------------------------------------------------
// PHYSICS-WERELD
// ---------------------------------------------------------------
const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) })
world.broadphase = new CANNON.SAPBroadphase(world) // snelle "wie zit dicht bij wie"-check
world.defaultContactMaterial.friction = 0.4
world.defaultContactMaterial.restitution = 0.1 // een klein beetje stuiteren
world.solver.iterations = 20 // meer iteraties = stabielere stapels (maar trager)
world.allowSleep = true      // stilliggende blokjes "slapen": stabiel én sneller

// De grond: een STATIC body met een oneindig vlak (Plane).
// Static = beweegt nooit, massa 0. Een Plane wijst standaard naar +z → kantelen zodat hij naar +y wijst.
const groundBody = new CANNON.Body({ type: CANNON.Body.STATIC, shape: new CANNON.Plane() })
groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0)
world.addBody(groundBody)

// ---------------------------------------------------------------
// BLOKJES – elk blokje = een Three.js MESH + een cannon-es BODY
// ---------------------------------------------------------------
const BLOCK_SIZE = 0.6
const blockGeometry = new THREE.BoxGeometry(BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE)
// cannon-es werkt met HALVE afmetingen (afstand van het midden tot de rand)!
const blockShape = new CANNON.Box(new CANNON.Vec3(BLOCK_SIZE / 2, BLOCK_SIZE / 2, BLOCK_SIZE / 2))
const blockColors = ['#f4a261', '#e9c46a', '#2a9d8f', '#264653', '#e76f51'].map(
  (c) => new THREE.MeshStandardMaterial({ color: c })
)

const blocks = [] // lijst van { mesh, body, start }

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
}

// Een muur: kolommen × rijen blokjes, gecentreerd rond (x, z)
function createWall(x, z, columns, rows) {
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const offset = (col - (columns - 1) / 2) * BLOCK_SIZE
      createBlock(x + offset, BLOCK_SIZE / 2 + row * BLOCK_SIZE, z)
    }
  }
}

// Een piramide: elke laag één blokje smaller, half verschoven
function createPyramid(x, z, baseSize) {
  for (let row = 0; row < baseSize; row++) {
    const count = baseSize - row
    for (let i = 0; i < count; i++) {
      const offset = (i - (count - 1) / 2) * BLOCK_SIZE
      createBlock(x + offset, BLOCK_SIZE / 2 + row * BLOCK_SIZE, z)
    }
  }
}

// Een toren: één blokje breed, heel hoog
function createTower(x, z, height) {
  for (let row = 0; row < height; row++) createBlock(x, BLOCK_SIZE / 2 + row * BLOCK_SIZE, z)
}

function buildLevel() {
  createWall(0, 12, 8, 5)
  createPyramid(-8, 20, 6)
  createTower(7, 18, 7)
  createTower(9, 18, 7)
  createWall(0, 30, 12, 3)
  for (let i = 0; i < 6; i++) createPyramid(-20 + i * 8, 45, 3)
}

function clearLevel() {
  for (const { mesh, body } of blocks) {
    scene.remove(mesh)
    world.removeBody(body)
  }
  blocks.length = 0
}

buildLevel()

// ---------------------------------------------------------------
// DE AUTO – een Group met kinderen
//
// De auto "kijkt" naar +z. Het nulpunt van de Group ligt op de grond,
// in het midden van de auto. Alles wat we in de Group stoppen, beweegt mee.
//
//   car (Group)               ← positie + richting van de hele auto
//    ├─ body, cabin, lights
//    └─ wheelPivot (Group)    ← draait om Y = sturen (enkel vooraan)
//        └─ wheel (Mesh)      ← draait om X = rollen
// ---------------------------------------------------------------
const WHEEL_RADIUS = 0.3

function createCar() {
  const car = new THREE.Group()

  const paint = new THREE.MeshStandardMaterial({ color: '#e63946', metalness: 0.3, roughness: 0.4 })
  const glass = new THREE.MeshStandardMaterial({ color: '#a8dadc', metalness: 0.1, roughness: 0.1 })
  const rubber = new THREE.MeshStandardMaterial({ color: '#222222', roughness: 0.9 })
  const rim = new THREE.MeshStandardMaterial({ color: '#dddddd' })

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 2.2), paint)
  body.position.y = 0.55
  car.add(body)

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.4, 1.1), glass)
  cabin.position.set(0, 1.0, -0.2)
  car.add(cabin)

  // Koplampen: zo zie je meteen waar "vooraan" is
  const lampGeometry = new THREE.BoxGeometry(0.25, 0.12, 0.05)
  const lampMaterial = new THREE.MeshStandardMaterial({ color: '#fff6c0', emissive: '#fff6c0' })
  for (const x of [-0.4, 0.4]) {
    const lamp = new THREE.Mesh(lampGeometry, lampMaterial)
    lamp.position.set(x, 0.6, 1.11)
    car.add(lamp)
  }

  // Wielen
  const tireGeometry = new THREE.CylinderGeometry(WHEEL_RADIUS, WHEEL_RADIUS, 0.25, 20)
  tireGeometry.rotateZ(Math.PI / 2) // cilinder staat rechtop → op zijn kant leggen (as = X)
  const rimGeometry = new THREE.BoxGeometry(0.27, 0.12, 0.4) // spaak, zodat je het draaien ziet

  const wheels = []      // alle wielen (om te laten rollen)
  const frontPivots = [] // pivots van de voorwielen (om te sturen)

  const wheelPositions = [
    [-0.65, 0.7], [0.65, 0.7],   // voor (z > 0)
    [-0.65, -0.7], [0.65, -0.7], // achter
  ]
  for (const [x, z] of wheelPositions) {
    const pivot = new THREE.Group()
    pivot.position.set(x, WHEEL_RADIUS, z)
    car.add(pivot)

    const wheel = new THREE.Mesh(tireGeometry, rubber)
    wheel.add(new THREE.Mesh(rimGeometry, rim))
    pivot.add(wheel)

    wheels.push(wheel)
    if (z > 0) frontPivots.push(pivot)
  }

  car.traverse((obj) => { if (obj.isMesh) obj.castShadow = true })

  return { mesh: car, wheels, frontPivots }
}

const car = createCar()
scene.add(car.mesh)

// De auto in de physics-wereld: een KINEMATIC body.
//   - wordt NIET beïnvloed door zwaartekracht of botsingen
//   - beweegt enkel met de snelheid die WIJ geven
//   - duwt dynamic bodies wel weg (alsof hij oneindig zwaar is)
// Eén box is genoeg: de physics-vorm hoeft niet even gedetailleerd te zijn als de mesh.
const CAR_BODY_HEIGHT = 0.6 // hoogte van het midden van de box boven de grond
const carBody = new CANNON.Body({
  type: CANNON.Body.KINEMATIC,
  shape: new CANNON.Box(new CANNON.Vec3(0.6, 0.5, 1.1)), // halve breedte, hoogte, lengte
  position: new CANNON.Vec3(0, CAR_BODY_HEIGHT, 0),
})
carBody.allowSleep = false // anders valt de auto in slaap als hij stilstaat en negeert hij daarna zijn snelheid!
world.addBody(carBody)

// ---------------------------------------------------------------
// INPUT – we houden bij welke toetsen ingedrukt zijn
// event.code = fysieke toets, werkt dus ook op een AZERTY-toetsenbord
// ---------------------------------------------------------------
const keys = new Set()
addEventListener('keydown', (e) => {
  keys.add(e.code)
  if (e.code === 'KeyR') {
    clearLevel()
    buildLevel()
  }
})
addEventListener('keyup', (e) => keys.delete(e.code))
const isDown = (...codes) => codes.some((c) => keys.has(c))

// ---------------------------------------------------------------
// RIJGEDRAG (gefaket) – alle getallen zijn "gevoel", speel ermee!
// ---------------------------------------------------------------
const settings = {
  maxSpeed: 20,        // m/s vooruit
  maxReverse: 6,       // m/s achteruit
  acceleration: 12,    // m/s² bij gas geven
  brake: 25,           // m/s² bij remmen
  friction: 4,         // m/s² vertraging als je niets doet
  turnSpeed: 2.2,      // radialen/s bij volle snelheid
  maxSteerAngle: 0.5,  // hoe ver de voorwielen visueel draaien
}

const state = {
  speed: 0,   // m/s, negatief = achteruit
  heading: 0, // richting in radialen rond de Y-as (0 = kijkt naar +z)
  steer: 0,   // huidige stuurhoek van de wielen (voor de animatie)
}

function updateCar(dt) {
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
  state.speed = THREE.MathUtils.clamp(state.speed, -settings.maxReverse, settings.maxSpeed)

  // 2. Sturen – een auto kan enkel draaien als hij rijdt
  //    (links = positieve rotatie rond Y, want de camera kijkt naar +z)
  const steerInput = (isDown('KeyA', 'ArrowLeft') ? 1 : 0) - (isDown('KeyD', 'ArrowRight') ? 1 : 0)
  const speedFactor = state.speed / settings.maxSpeed // -0.3 .. 1 → achteruit stuurt omgekeerd
  state.heading += steerInput * settings.turnSpeed * speedFactor * dt

  // 3. NIEUW: we zetten niet meer zelf de positie, maar geven de BODY een snelheid.
  //    world.step() verplaatst de body en weet zo hoe hard hij tegen de blokjes duwt.
  //    forward = (sin(heading), 0, cos(heading))
  carBody.velocity.set(
    Math.sin(state.heading) * state.speed,
    0,
    Math.cos(state.heading) * state.speed
  )
  carBody.quaternion.setFromEuler(0, state.heading, 0)

  // 4. Wielen animeren
  //    rollen: afgelegde afstand / straal = hoek in radialen
  for (const wheel of car.wheels) wheel.rotation.x += (state.speed * dt) / WHEEL_RADIUS
  //    sturen: zacht naar de gewenste hoek bewegen
  state.steer = THREE.MathUtils.damp(state.steer, steerInput * settings.maxSteerAngle, 10, dt)
  for (const pivot of car.frontPivots) pivot.rotation.y = state.steer
}

// ---------------------------------------------------------------
// VOLGCAMERA
// We berekenen waar de camera *zou moeten* staan (achter de auto)
// en schuiven er elke frame een stukje naartoe (lerp) → zachte beweging.
// ---------------------------------------------------------------
const cameraOffset = new THREE.Vector3(0, 4, -8) // achter (-z) en boven de auto, in auto-coördinaten
const lookOffset = new THREE.Vector3(0, 1, 4)    // kijk een beetje vóór de auto
const idealPosition = new THREE.Vector3()
const idealLookAt = new THREE.Vector3()
const currentLookAt = new THREE.Vector3()

function updateCamera(dt, instant = false) {
  // localToWorld: zet een punt "relatief t.o.v. de auto" om naar wereldcoördinaten
  idealPosition.copy(cameraOffset)
  car.mesh.localToWorld(idealPosition)
  idealLookAt.copy(lookOffset)
  car.mesh.localToWorld(idealLookAt)

  // 1 - exp(-k·dt) = framerate-onafhankelijke lerp-factor
  const t = instant ? 1 : 1 - Math.exp(-4 * dt)
  camera.position.lerp(idealPosition, t)
  currentLookAt.lerp(idealLookAt, t)
  camera.lookAt(currentLookAt)
}
updateCamera(0, true)

// ---------------------------------------------------------------
// Resize + animatie-lus
// ---------------------------------------------------------------
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})

const speedLabel = document.getElementById('speed')
const fallenLabel = document.getElementById('fallen')
let previousTime = performance.now()

// Kopieer positie + rotatie van de physics-body naar de mesh.
// Dit is DE kern van elke physics-integratie: physics rekent, Three.js tekent.
function syncPhysicsToMeshes() {
  let fallen = 0
  for (const block of blocks) {
    block.mesh.position.copy(block.body.position)
    block.mesh.quaternion.copy(block.body.quaternion)
    if (block.body.position.distanceTo(block.start) > BLOCK_SIZE) fallen++
  }
  fallenLabel.textContent = `${fallen} / ${blocks.length}`

  // De auto-mesh heeft zijn nulpunt op de grond, de body zit CAR_BODY_HEIGHT hoger.
  car.mesh.position.set(carBody.position.x, carBody.position.y - CAR_BODY_HEIGHT, carBody.position.z)
  car.mesh.quaternion.copy(carBody.quaternion)
}

function animate(time) {
  const dt = Math.min((time - previousTime) / 1000, 0.1)
  previousTime = time

  updateCar(dt)              // 1. input → snelheid van de car body
  world.step(1 / 60, dt, 3)  // 2. physics: vaste stap van 1/60 s, max 3 inhaalstappen
  syncPhysicsToMeshes()      // 3. physics → meshes
  updateCamera(dt)           // 4. camera volgt de (nieuwe) positie van de auto

  // de zon (en zijn schaduwgebied) volgt de auto
  sun.position.set(car.mesh.position.x + 10, 20, car.mesh.position.z + 10)
  sun.target.position.copy(car.mesh.position)

  speedLabel.textContent = Math.round(Math.abs(state.speed) * 3.6)
  renderer.render(scene, camera)
}

renderer.setAnimationLoop(animate)
