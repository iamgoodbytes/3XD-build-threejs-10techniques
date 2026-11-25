// STAP 4a – Opwarmer: je eerste shaders met TSL
//
// Een SHADER is een klein programma dat op de GPU draait:
//   - de VERTEX-shader   bepaalt WAAR elk hoekpunt (vertex) komt   → positionNode
//   - de FRAGMENT-shader bepaalt welke KLEUR elke pixel krijgt     → colorNode
//
// TSL (Three Shading Language) = shaders schrijven met JavaScript-functies.
// Three.js vertaalt dit automatisch naar WGSL (WebGPU) of GLSL (WebGL).
//
// TSL werkt enkel met de nieuwe WebGPURenderer → we importeren uit 'three/webgpu'.
// (Heeft je browser geen WebGPU, dan valt de renderer automatisch terug op WebGL 2.)

import * as THREE from 'three/webgpu'
import { uv, time, positionLocal, sin, vec3, mix, color } from 'three/tsl'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import '../style.css'

// --- Basis (zoals stap 1, maar met WebGPURenderer) ---
const scene = new THREE.Scene()
scene.background = new THREE.Color('#1e1e2e')

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 100)
camera.position.set(0, 1.5, 9)

const renderer = new THREE.WebGPURenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

// Veel segmenten = veel vertices. Nodig voor plaatje 3: de vertex-shader
// kan enkel hoekpunten verschuiven, dus zonder segmenten valt er niets te golven.
const geometry = new THREE.PlaneGeometry(2.5, 2.5, 64, 64)

// ---------------------------------------------------------------
// 1. KLEUR UIT UV
// uv() = 2D-coördinaat op het oppervlak: (0,0) linksonder, (1,1) rechtsboven.
// We gebruiken uv.x als rood en uv.y als groen.
// ---------------------------------------------------------------
const material1 = new THREE.MeshBasicNodeMaterial({ side: THREE.DoubleSide })
material1.colorNode = vec3(uv().x, uv().y, 0.5) // vec3 = (rood, groen, blauw), elk 0..1

// ---------------------------------------------------------------
// 2. + TIJD
// time = aantal seconden sinds de start; Three.js werkt het automatisch bij.
// sin(...) gaat van -1 tot 1 → * 0.5 + 0.5 maakt er 0..1 van.
// mix(a, b, t) = mengen: t=0 → a, t=1 → b.
// ---------------------------------------------------------------
const material2 = new THREE.MeshBasicNodeMaterial({ side: THREE.DoubleSide })
const stripes = sin(uv().x.mul(20).add(time.mul(3))).mul(0.5).add(0.5) // bewegende strepen
material2.colorNode = mix(color('#ff6b6b'), color('#4ecdc4'), stripes)

// ---------------------------------------------------------------
// 3. + VERTEX-SHADER: het vlak golft als een vlag
// positionLocal = de positie van het hoekpunt (in de ruimte van het object).
// We verschuiven z met een sinusgolf die over x "loopt".
// Hoe verder van de "vlaggenstok" (uv.x = 0), hoe meer het wappert.
// ---------------------------------------------------------------
const material3 = new THREE.MeshBasicNodeMaterial({ side: THREE.DoubleSide })
const wave = sin(positionLocal.x.mul(3).sub(time.mul(4))).mul(0.3).mul(uv().x)
material3.positionNode = positionLocal.add(vec3(0, 0, wave))
// De golfhoogte ook als kleur tonen: zo zie je wat de vertex-shader doet
material3.colorNode = mix(color('#2d3561'), color('#f8b500'), wave.mul(2).add(0.5))

// Let op de schrijfwijze: in TSL kan je geen + - * / gebruiken,
// maar wel .add() .sub() .mul() .div(). Elke bewerking bouwt een "node".

const materials = [material1, material2, material3]
materials.forEach((material, i) => {
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.x = (i - 1) * 3
  scene.add(mesh)
})

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})

renderer.setAnimationLoop(() => {
  controls.update()
  renderer.render(scene, camera)
})
