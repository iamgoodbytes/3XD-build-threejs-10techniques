// STAP 1 – Een basis Three.js scene met een groene kubus
//
// Elke Three.js toepassing heeft dezelfde 3 bouwstenen nodig:
//   1. een SCENE    – de "wereld" waar alles in staat
//   2. een CAMERA   – vanwaar we naar die wereld kijken
//   3. een RENDERER – tekent wat de camera ziet op een <canvas>

import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import '../style.css'

// ---------------------------------------------------------------
// 1. SCENE
// ---------------------------------------------------------------
const scene = new THREE.Scene()
scene.background = new THREE.Color('#87ceeb') // lichtblauwe lucht

// ---------------------------------------------------------------
// 2. CAMERA
// PerspectiveCamera(gezichtsveld in graden, beeldverhouding, near, far)
// Alles dichter dan "near" of verder dan "far" wordt niet getekend.
// ---------------------------------------------------------------
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 100)
camera.position.set(3, 2, 5) // x = rechts, y = omhoog, z = naar ons toe

// ---------------------------------------------------------------
// 3. RENDERER
// ---------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)) // scherp op retina, maar niet te zwaar
document.body.appendChild(renderer.domElement)        // het <canvas> element

// ---------------------------------------------------------------
// 4. MESH = GEOMETRY (vorm) + MATERIAL (uiterlijk)
// ---------------------------------------------------------------
const geometry = new THREE.BoxGeometry(1, 1, 1)                      // breedte, hoogte, diepte
const material = new THREE.MeshStandardMaterial({ color: '#2ecc71' }) // reageert op licht
const cube = new THREE.Mesh(geometry, material)
scene.add(cube)

// ---------------------------------------------------------------
// 5. LICHT
// MeshStandardMaterial is zwart zonder licht! Probeer het: zet de lichten in commentaar.
// ---------------------------------------------------------------
const ambientLight = new THREE.AmbientLight('#ffffff', 0.5)  // zacht licht van overal
const sun = new THREE.DirectionalLight('#ffffff', 2)         // zoals de zon: evenwijdige stralen
sun.position.set(5, 10, 5)
scene.add(ambientLight, sun)

// Hulpmiddeltjes om de 3D-ruimte te begrijpen
scene.add(new THREE.GridHelper(10, 10))  // vloerraster
scene.add(new THREE.AxesHelper(2))       // rood = x, groen = y, blauw = z

// ---------------------------------------------------------------
// 6. CONTROLS – met de muis rond het object draaien
// ---------------------------------------------------------------
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true // zachte, "uitlopende" beweging

// ---------------------------------------------------------------
// 7. RESIZE – canvas en camera aanpassen als het venster verandert
// ---------------------------------------------------------------
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix() // verplicht na het wijzigen van camera-instellingen!
  renderer.setSize(innerWidth, innerHeight)
})

// ---------------------------------------------------------------
// 8. ANIMATIE-LUS – wordt ±60 keer per seconde opgeroepen
// We gebruiken "delta time" (dt): de tijd sinds de vorige frame in seconden.
// Zo draait de kubus even snel op een 60 Hz als op een 144 Hz scherm.
// ---------------------------------------------------------------
let previousTime = performance.now()

function animate(time) {
  const dt = Math.min((time - previousTime) / 1000, 0.1) // max 0,1 s (bv. na tabwissel)
  previousTime = time

  cube.rotation.y += dt * 1.0 // 1 radiaal per seconde
  cube.rotation.x += dt * 0.5

  controls.update()                // nodig voor enableDamping
  renderer.render(scene, camera)   // teken de frame
}

renderer.setAnimationLoop(animate)
