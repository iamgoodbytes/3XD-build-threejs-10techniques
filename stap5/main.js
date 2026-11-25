// STAP 5 – Raycasting
//
// Een RAY is een halve rechte: een startpunt + een richting.
// Een RAYCASTER zoekt welke objecten die ray raakt, en WAAR (het raakpunt).
//
// Nieuw t.o.v. stap 4b:
//   - muispositie → ray vanuit de camera (setFromCamera)
//   - HOVER: het blokje onder de muis licht op, een bolletje toont het raakpunt
//   - KLIK OP BLOKJE: physics-impuls op het geraakte punt → wegschieten
//   - KLIK OP GROND: de auto rijdt er zelf naartoe (autopilot)
//   - DEBUG: de laatste ray blijft als lijn in de wereld staan (toets L)
//
// (Uit stap 4b:)
//   - WebGPURenderer (import uit 'three/webgpu') – nodig voor TSL
//   - een grasveld met tienduizenden sprieten via een InstancedMesh
//   - een positionNode (vertex-shader) die het gras laat wiegen in de wind
//   - een uniform: de positie van de auto gaat elke frame van JS naar de GPU,
//     zodat het gras wegbuigt waar de auto rijdt
//
// (Uit stap 3:)
//   - een physics-wereld met cannon-es (zwaartekracht, botsingen)
//   - TWEE werelden die we synchroon houden:
//       Three.js  = wat je ZIET   (meshes)
//       cannon-es = wat er GEBEURT (bodies)
//   - drie soorten bodies: STATIC (grond), DYNAMIC (blokjes), KINEMATIC (auto)
//
// Het rijgedrag van stap 2 blijft hetzelfde. Alleen zetten we nu niet meer
// zelf de positie van de auto, maar geven we de physics-body een SNELHEID.
// De physics engine verplaatst de auto en duwt zo de blokjes weg.

import * as THREE from 'three/webgpu'
import { Fn, uniform, uv, time, positionLocal, sin, float, smoothstep, mix, color } from 'three/tsl'
import * as CANNON from 'cannon-es'
import '../style.css'

// ---------------------------------------------------------------
// Basis (zoals stap 1) + schaduwen en mist
// ---------------------------------------------------------------
const scene = new THREE.Scene()
scene.background = new THREE.Color('#87ceeb')
const FOG_NEAR = 30
const FOG_FAR = 90
scene.fog = new THREE.Fog('#87ceeb', FOG_NEAR, FOG_FAR) // verre dingen vervagen in de lucht

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 200)

const renderer = new THREE.WebGPURenderer({ antialias: true }) // valt terug op WebGL 2 als WebGPU ontbreekt
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
  new THREE.MeshStandardMaterial({ color: '#2f5a1f' })
)
ground.rotation.x = -Math.PI / 2 // een plane staat standaard rechtop → plat leggen
ground.receiveShadow = true
scene.add(ground)

// ---------------------------------------------------------------
// GRAS
//
// 1 spriet = een smal, puntig vlakje. We tekenen er tienduizenden met een
// InstancedMesh: één geometry + één material, maar per instantie een eigen
// matrix (positie, rotatie, schaal). Dat is 1 draw call i.p.v. 80 000!
// ---------------------------------------------------------------
const GRASS_COUNT = 80_000
const GRASS_AREA = { minX: -25, maxX: 25, minZ: -15, maxZ: 55 }

// De vorm van één spriet: 0,1 breed, 1 hoog, 4 segmenten in de hoogte (om te kunnen buigen)
const bladeGeometry = new THREE.PlaneGeometry(0.1, 1, 1, 4)
bladeGeometry.translate(0, 0.5, 0) // voet op y = 0 i.p.v. in het midden
const bladePositions = bladeGeometry.attributes.position
for (let i = 0; i < bladePositions.count; i++) {
  const y = bladePositions.getY(i)
  bladePositions.setX(i, bladePositions.getX(i) * (1 - y)) // smaller naar boven → punt
}

// ---- De shader ----
// Een UNIFORM is een waarde die we vanuit JavaScript naar de GPU sturen.
// Hij is dezelfde voor alle sprieten; we passen hem elke frame aan.
const uCarPosition = uniform(new THREE.Vector3())

const grassMaterial = new THREE.MeshStandardNodeMaterial({ side: THREE.DoubleSide, roughness: 1 })

// FRAGMENT: donker aan de voet, licht aan de top (uv().y = 0 onderaan, 1 bovenaan)
grassMaterial.colorNode = mix(color('#1f4d14'), color('#8fd14f'), uv().y)

// VERTEX: verschuif elk hoekpunt van de spriet.
// Fn(() => { ... }) laat ons TSL schrijven met variabelen en meerdere stappen.
grassMaterial.positionNode = Fn(() => {
  // Bij een InstancedMesh is positionLocal hier al verplaatst/gedraaid door de
  // instance-matrix: het is dus de echte plek van dit hoekpunt in het veld.
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

  // AUTO: hoe dichter bij de auto, hoe meer de spriet weg buigt
  const awayX = position.x.sub(uCarPosition.x)
  const awayZ = position.z.sub(uCarPosition.z)
  const distance = awayX.mul(awayX).add(awayZ.mul(awayZ)).sqrt().max(0.001)
  const push = float(1).sub(smoothstep(0.8, 2.5, distance)) // 1 dichtbij, 0 vanaf 2,5 m
  const strength = push.mul(bend).mul(0.9)
  position.x.addAssign(awayX.div(distance).mul(strength)) // richting = (away / lengte)
  position.z.addAssign(awayZ.div(distance).mul(strength))
  position.y.subAssign(strength.mul(0.5)) // platgedrukt

  return position
})()

const grass = new THREE.InstancedMesh(bladeGeometry, grassMaterial, GRASS_COUNT)
grass.receiveShadow = true

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
}
scene.add(grass)

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

  // NIEUW: de raycaster geeft ons een MESH terug; via userData vinden we de BODY.
  mesh.userData.body = body
  mesh.userData.baseMaterial = material // om na het oplichten terug te zetten

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
  if (e.repeat) return // toets ingedrukt houden = niet telkens opnieuw schakelen
  if (e.code === 'KeyR') rebuildLevel()
  if (e.code === 'KeyV') toggleOverview() // vogelperspectief aan/uit
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
  target: null, // NIEUW: Vector3 waar de autopilot naartoe rijdt (of null)
  steer: 0,   // huidige stuurhoek van de wielen (voor de animatie)
}

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
  // Vertragen als we dichtbij zijn of scherp moeten draaien
  const desiredSpeed = Math.abs(angle) > 0.6
    ? 3 // scherpe bocht: traag, dan is de draaicirkel klein
    : Math.max(3, Math.min(settings.maxSpeed * 0.6, distance * 1.2))
  const throttle = state.speed < desiredSpeed ? 1 : state.speed > desiredSpeed + 1 ? -1 : 0
  return { throttle, steer }
}

function updateCar(dt) {
  // 1. Gas / rem – van de speler, of van de autopilot als er een doel is
  let throttle = (isDown('KeyW', 'ArrowUp') ? 1 : 0) - (isDown('KeyS', 'ArrowDown') ? 1 : 0)
  let steerInput = (isDown('KeyA', 'ArrowLeft') ? 1 : 0) - (isDown('KeyD', 'ArrowRight') ? 1 : 0)

  if (throttle !== 0 || steerInput !== 0) {
    if (state.target) setTarget(null) // de speler neemt het over
  } else if (state.target) {
    ;({ throttle, steer: steerInput } = autopilot())
  }

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
  // AANGEPAST t.o.v. stap 2: daar was speedFactor = speed / maxSpeed. Dan is de draaicirkel
  // ALTIJD maxSpeed / turnSpeed ≈ 9 m, ook als je traag rijdt → de autopilot bleef rond
  // dichtbije doelen cirkelen! Nu draait de auto vanaf 5 m/s al op volle kracht:
  // traag rijden = krappe bocht, zoals bij een echte auto.
  const speedFactor = THREE.MathUtils.clamp(state.speed / 5, -1, 1)
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
// RAYCASTING
// ---------------------------------------------------------------
const raycaster = new THREE.Raycaster()
const pointer = new THREE.Vector2(10, 10) // muis in NDC; (10,10) = buiten beeld tot de muis beweegt

// De muispositie in pixels omzetten naar "Normalized Device Coordinates":
// links = -1, rechts = +1, onder = -1, boven = +1 (y is dus omgekeerd t.o.v. pixels!)
addEventListener('pointermove', (e) => {
  pointer.x = (e.clientX / innerWidth) * 2 - 1
  pointer.y = -(e.clientY / innerHeight) * 2 + 1
})

// Welke objecten mag de ray raken? Enkel blokjes en de grond.
// (Niet het gras: 80 000 instanties testen is traag, en we willen erdoor kunnen klikken.)
function getRaycastTargets() {
  return [ground, ...blocks.map((b) => b.mesh)]
}

// Doe de raycast: geeft het DICHTSTBIJZIJNDE raakpunt terug (of undefined)
function castRay() {
  raycaster.setFromCamera(pointer, camera) // ray start in de camera, door de muis heen
  const hits = raycaster.intersectObjects(getRaycastTargets(), false) // gesorteerd op afstand
  return hits[0] // { object, point, distance, face, ... }
}

// ---- Debug-visualisatie (altijd aan) ----

// Bolletje op het raakpunt onder de muis
const hitMarker = new THREE.Mesh(
  new THREE.SphereGeometry(0.08, 16, 8),
  new THREE.MeshBasicMaterial({ color: '#ff00ff' })
)
scene.add(hitMarker)

// ---- RAY-GESCHIEDENIS: de laatste 5 klikken blijven zichtbaar ----
// Elke klik laat drie dingen achter:
//   1. de RAY (roze lijn) van het startpunt naar het raakpunt
//   2. een SPOOKCAMERA (cyaan) op het startpunt: setFromCamera() laat de ray starten
//      in de camera, dus op exact de plek en in de richting van de camera bij de klik
//   3. een SPOOR (cyaan lijn): waar de camera daarna naartoe ging. Zo zie je dat niet
//      de ray beweegt, maar de camera (ze volgt de auto).
// De nieuwste klik is fel, oudere zijn gedimd.
const RAY_COLOR = '#ff00ff'
const GHOST_COLOR = '#00e5ff'
const HISTORY_SIZE = 5
const TRAIL_MAX = 2000
const OLD_OPACITY = 0.3

// Gedeelde vormen voor alle spookcamera's
const ghostFrustumGeometry = (() => {
  // Kijkpiramide: de top (0,0,0) = het oog = ray.origin. Een camera kijkt naar -z.
  const d = 1.2               // diepte van de piramide
  const h = 0.45              // halve hoogte van de "lens"
  const w = h * 1.6           // halve breedte (breedbeeld)
  const corners = [[-w, -h], [w, -h], [w, h], [-w, h]].map(([x, y]) => new THREE.Vector3(x, y, -d))
  const points = []
  for (const c of corners) points.push(new THREE.Vector3(), c)                 // ribben vanuit het oog
  for (let i = 0; i < 4; i++) points.push(corners[i], corners[(i + 1) % 4])   // rechthoek vooraan
  return new THREE.BufferGeometry().setFromPoints(points)
})()
const ghostEyeGeometry = new THREE.SphereGeometry(0.12, 16, 8)
const ghostBodyGeometry = new THREE.BoxGeometry(0.7, 0.45, 0.5)

// Label: tekst op een canvas → textuur → sprite (kijkt altijd naar jou)
function drawLabel(ctx, text) {
  ctx.clearRect(0, 0, 512, 96)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
  ctx.beginPath()
  ctx.roundRect(4, 4, 504, 88, 20)
  ctx.fill()
  ctx.fillStyle = GHOST_COLOR
  ctx.font = 'bold 44px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 256, 50)
}

function createRayRecord() {
  // Eigen materialen per klik, zodat we oudere klikken apart kunnen dimmen
  const fade = (m) => Object.assign(m, { transparent: true })
  const rayMaterial = fade(new THREE.LineBasicMaterial({ color: RAY_COLOR }))
  const ghostLineMaterial = fade(new THREE.LineBasicMaterial({ color: GHOST_COLOR }))
  const eyeMaterial = fade(new THREE.MeshBasicMaterial({ color: GHOST_COLOR }))
  const bodyMaterial = fade(new THREE.MeshBasicMaterial({ color: GHOST_COLOR }))
  const trailMaterial = fade(new THREE.LineBasicMaterial({ color: GHOST_COLOR }))

  const ray = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
    rayMaterial
  )

  const ghost = new THREE.Group()
  ghost.add(new THREE.LineSegments(ghostFrustumGeometry, ghostLineMaterial))
  ghost.add(new THREE.Mesh(ghostEyeGeometry, eyeMaterial)) // het oog: hier begint de ray
  const body = new THREE.Mesh(ghostBodyGeometry, bodyMaterial) // het camerahuis, achter het oog
  body.position.z = 0.3
  ghost.add(body)

  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 96
  const labelTexture = new THREE.CanvasTexture(canvas)
  labelTexture.colorSpace = THREE.SRGBColorSpace
  const labelMaterial = new THREE.SpriteMaterial({ map: labelTexture, depthTest: false, transparent: true })
  const label = new THREE.Sprite(labelMaterial)
  label.scale.set(3.6, 0.675, 1)
  label.position.y = 1.1
  label.renderOrder = 1
  ghost.add(label)

  const trail = new THREE.Line(
    new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(TRAIL_MAX * 3), 3)),
    trailMaterial
  )
  trail.frustumCulled = false // de punten veranderen voortdurend
  trail.geometry.setDrawRange(0, 0)

  for (const object of [ray, ghost, trail]) {
    object.visible = false
    scene.add(object)
  }

  return {
    ray, ghost, trail, labelTexture, ctx: canvas.getContext('2d'),
    materials: [rayMaterial, ghostLineMaterial, eyeMaterial, bodyMaterial, trailMaterial, labelMaterial],
    number: 0,          // de hoeveelste klik (0 = nog niet gebruikt)
    fromFollow: false,  // geklikt vanuit de volgcamera (true) of vanuit vogelperspectief (false)
    trailCount: 0,
    lastTrailPoint: new THREE.Vector3(),
  }
}

const rayHistory = Array.from({ length: HISTORY_SIZE }, createRayRecord)
let clickCount = 0
let newestRecord = null      // de laatste klik: enkel dat spoor groeit nog
let lastFollowRecord = null  // de laatste klik vanuit de volgcamera (voor het vogelperspectief)

function addTrailPoint(record, p) {
  if (record.trailCount >= TRAIL_MAX) return // vol: het begin van het spoor is het interessantste
  record.trail.geometry.attributes.position.setXYZ(record.trailCount++, p.x, p.y, p.z)
  record.trail.geometry.attributes.position.needsUpdate = true // GPU laten weten dat er iets veranderd is
  record.trail.geometry.setDrawRange(0, record.trailCount)
  record.lastTrailPoint.copy(p)
}

// Bij een klik: de oudste van de 5 hergebruiken voor deze nieuwe ray
function recordRay(origin, hitPoint) {
  const record = rayHistory[clickCount % HISTORY_SIZE]
  clickCount++
  record.number = clickCount
  record.fromFollow = !overview

  // 1. de ray
  const position = record.ray.geometry.attributes.position
  position.setXYZ(0, origin.x, origin.y, origin.z)
  position.setXYZ(1, hitPoint.x, hitPoint.y, hitPoint.z)
  position.needsUpdate = true
  record.ray.geometry.computeBoundingSphere() // anders verdwijnt hij soms (frustum culling)

  // 2. de spookcamera: plek en kijkrichting van de camera op dit moment
  record.ghost.position.copy(origin)
  record.ghost.quaternion.setFromRotationMatrix(camera.matrixWorld)
  drawLabel(record.ctx, `camera bij klik ${clickCount}`)
  record.labelTexture.needsUpdate = true

  // 3. het spoor begint opnieuw, op het startpunt
  record.trailCount = 0
  addTrailPoint(record, origin)

  newestRecord = record
  if (record.fromFollow) lastFollowRecord = record
  else if (lastFollowRecord === record) lastFollowRecord = null

  // nieuwste fel, de rest gedimd
  for (const r of rayHistory) {
    const opacity = r === record ? 1 : OLD_OPACITY
    for (const m of r.materials) m.opacity = m === r.materials[3] ? opacity * 0.35 : opacity // camerahuis altijd half doorzichtig
  }
}

// Elke frame: als de camera verschoven is, een punt aan het spoor van de laatste klik toevoegen
function updateCameraTrail() {
  if (newestRecord && camera.position.distanceTo(newestRecord.lastTrailPoint) > 0.05) {
    addTrailPoint(newestRecord, camera.position)
  }
}

// Elke frame: alles van elke gebruikte klik tonen. Enkel een spookcamera waar je zelf
// in zit (klik in vogelperspectief) verbergen we: die staat op je eigen oog en zou
// alleen een vlek op het scherm geven. Zodra de camera wegbeweegt, verschijnt ze.
function updateDebugVisibility() {
  for (const r of rayHistory) {
    const used = r.number > 0
    r.ray.visible = used
    r.trail.visible = used
    r.ghost.visible = used && camera.position.distanceTo(r.ghost.position) > 1.5
  }
}

// ---- VOGELPERSPECTIEF (toets V) ----
// Vanuit de volgcamera zie je de spookcamera nooit: ze staat altijd achter je.
// Van hoog en schuin boven de auto zie je alles tegelijk: auto, spookcamera's, sporen en rays.
let overview = false
let overviewHold = false // na een klik in vogelperspectief blijft de camera staan
const overviewOffset = new THREE.Vector3(11, 15, -11)
const overviewPosition = new THREE.Vector3()
const overviewCenter = new THREE.Vector3()
const overviewLook = new THREE.Vector3()

function updateOverviewCamera(dt) {
  // De mist (30 → 90 m) zou alles wegmoffelen als de camera hoog en ver hangt:
  // schuif de mist op met de afstand van de camera tot waar ze naar kijkt.
  const viewDistance = camera.position.distanceTo(overviewLook)
  scene.fog.near = FOG_NEAR + viewDistance
  scene.fog.far = FOG_FAR + viewDistance

  if (overviewHold) return // vast: niet meer bewegen tot je V opnieuw drukt

  // Kijk naar het midden tussen auto en de laatste spookcamera van de VOLGcamera,
  // en zoom uit als ze ver uit elkaar liggen. (Een spookcamera uit de lucht telt niet mee:
  // dan zou de camera steeds hoger kruipen om zichzelf in beeld te houden.)
  overviewCenter.copy(car.mesh.position)
  let zoom = 1
  if (lastFollowRecord) {
    overviewCenter.lerp(lastFollowRecord.ghost.position, 0.5).setY(0)
    zoom = THREE.MathUtils.clamp(car.mesh.position.distanceTo(lastFollowRecord.ghost.position) / 12, 1, 3)
  }
  overviewPosition.copy(overviewOffset).multiplyScalar(zoom).add(overviewCenter)
  const t = 1 - Math.exp(-3 * dt)
  camera.position.lerp(overviewPosition, t)
  overviewLook.lerp(overviewCenter, t)
  camera.lookAt(overviewLook)
}

function toggleOverview() {
  overview = !overview
  overviewHold = false
  if (!overview) {
    scene.fog.near = FOG_NEAR // terug naar de gewone mist
    scene.fog.far = FOG_FAR
  }
  syncToolbar()
}

function rebuildLevel() {
  clearLevel()
  buildLevel()
}

// ---- KNOPPENBALK (linksonder): dezelfde acties als de toetsen, en je ziet wat aan staat ----
const toolbar = document.getElementById('tools')
const hint = document.getElementById('hint')
const toolActions = { overview: toggleOverview, rebuild: rebuildLevel }
toolbar.addEventListener('mousedown', (e) => e.preventDefault()) // geen focus op de knop
toolbar.addEventListener('click', (e) => {
  e.stopPropagation() // anders telt de klik ook als raycast-klik in de wereld
  const button = e.target.closest('button[data-action]')
  if (button) toolActions[button.dataset.action]()
})

function syncToolbar() {
  const overviewButton = toolbar.querySelector('[data-action="overview"]')
  overviewButton.classList.toggle('on', overview)
  overviewButton.querySelector('.state').textContent = overview ? (overviewHold ? 'vast' : 'aan') : 'uit'
  hint.hidden = !overviewHold
}
syncToolbar()

// ---- Doelmarkering voor de autopilot ----
const targetMarker = new THREE.Mesh(
  new THREE.RingGeometry(0.5, 0.75, 32),
  new THREE.MeshBasicMaterial({ color: '#ffd166', side: THREE.DoubleSide })
)
targetMarker.rotation.x = -Math.PI / 2 // plat op de grond
targetMarker.visible = false
scene.add(targetMarker)

function setTarget(point) {
  state.target = point ? point.clone() : null
  targetMarker.visible = !!point
  if (point) targetMarker.position.set(point.x, 0.05, point.z)
}

// ---- HOVER: elke frame (want ook als de muis stilstaat, beweegt de camera) ----
const highlightMaterial = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ff00ff', emissiveIntensity: 0.6 })
let hoveredMesh = null

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
  document.body.style.cursor = mesh ? 'crosshair' : 'default'
}

// ---- KLIK ----
addEventListener('click', () => {
  const hit = castRay()
  if (!hit) return
  recordRay(raycaster.ray.origin, hit.point) // NIEUW: ray + spookcamera + spoor van deze klik
  if (overview && !overviewHold) {
    overviewHold = true // in vogelperspectief: camera laten staan na een klik
    syncToolbar()
  }

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
  }
})

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

function animate(timestamp) { // niet "time": die naam is al de TSL-node uit three/tsl
  const dt = Math.min((timestamp - previousTime) / 1000, 0.1)
  previousTime = timestamp

  updateCar(dt)              // 1. input → snelheid van de car body
  world.step(1 / 60, dt, 3)  // 2. physics: vaste stap van 1/60 s, max 3 inhaalstappen
  syncPhysicsToMeshes()      // 3. physics → meshes
  if (overview) {
    updateOverviewCamera(dt) // 4. (toets V) camera hoog boven de auto
  } else {
    updateCamera(dt)         // 4. camera volgt de (nieuwe) positie van de auto
    updateCameraTrail()      //    …en het cyaan spoor tekent waar ze heen gaat
  }
  updateDebugVisibility()

  // 5. geef de positie van de auto door aan de gras-shader
  uCarPosition.value.copy(car.mesh.position)

  // 6. NIEUW: raycast voor de hover + doelmarkering laten pulseren
  updateHover()
  targetMarker.scale.setScalar(1 + Math.sin(timestamp / 150) * 0.15)

  // de zon (en zijn schaduwgebied) volgt de auto
  sun.position.set(car.mesh.position.x + 10, 20, car.mesh.position.z + 10)
  sun.target.position.copy(car.mesh.position)

  speedLabel.textContent = Math.round(Math.abs(state.speed) * 3.6)
  renderer.render(scene, camera)
}

renderer.setAnimationLoop(animate)
