// DE STAD – een raster van blokken en brede straten, van bovenaf bekeken
//
//   x →   0         56        112 ...           (PITCH = 56 m tussen twee kruispunten)
//   z  ┌───┬────────┬───┬────────┬───┐
//   ↓  │   │  blok  │   │  blok  │   │   ← elk blok: 40 × 40 m (stoep van 4 m + gebouwen)
//      ├───┼────────┼───┼────────┼───┤   ← straten: 16 m breed = 4 rijstroken van 4 m
//      │   │ (0,1)  │   │ (1,1)  │   │      (2 per richting, je rijdt rechts)
//
// Kruispunt (i, j) ligt op (i × PITCH, j × PITCH). Blok (i, j) ligt tussen kruispunt i en i+1.
// Speciale blokken: het ziekenhuis en een park (met het gras uit stap 4).

import * as THREE from 'three/webgpu'
import { uv, float, smoothstep, color, positionWorld, fract, floor, step, max, mix, hash } from 'three/tsl'
import { createWindowMaterial, BUILDING_ID_SIZE } from './window-material.js'
import { nightAmount } from './daynight.js'

export const BLOCKS = 5
export const ROAD = 16
export const LANE = 4
export const PITCH = 56
export const SIDEWALK = 4
export const CITY_SIZE = BLOCKS * PITCH // positie van het laatste kruispunt
export const HOSPITAL_BLOCK = { i: 2, j: 1 }
export const PARK_BLOCK = { i: 3, j: 3 }

export function blockRect(i, j) {
  const x0 = i * PITCH + ROAD / 2
  const z0 = j * PITCH + ROAD / 2
  return { x0, z0, x1: x0 + PITCH - ROAD, z1: z0 + PITCH - ROAD }
}
export const isHospital = (i, j) => i === HOSPITAL_BLOCK.i && j === HOSPITAL_BLOCK.j
export const isPark = (i, j) => i === PARK_BLOCK.i && j === PARK_BLOCK.j

// Afleverzone: op de straat vóór de ingang (zuidkant = lage z) van het ziekenhuis
export const DROP_ZONE = (() => {
  const r = blockRect(HOSPITAL_BLOCK.i, HOSPITAL_BLOCK.j)
  return { x: (r.x0 + r.x1) / 2, z: r.z0 - LANE * 1.5, width: 12, depth: 6 }
})()

const NEON_COLORS = ['#ff2bd6', '#00f0ff', '#ff6a00', '#a8ff00', '#7c4dff']

// ---------------------------------------------------------------
// MATERIALEN
// ---------------------------------------------------------------
// ASFALT – TSL: korrel, vlekken en lichte slijtage, zodat de weg niet "plastic" oogt
const asphaltMaterial = new THREE.MeshStandardNodeMaterial({ roughness: 0.95 })
{
  const p = positionWorld.xz
  const fine = hash(floor(p.mul(10)).x.add(floor(p.mul(10)).y.mul(113)))     // korrel van 10 cm
  const patches = hash(floor(p.div(5)).x.add(floor(p.div(5)).y.mul(31)))     // vlakken van 5 m
  const base = mix(color('#45474f'), color('#3c3e45'), fine)
  asphaltMaterial.colorNode = mix(base, base.mul(0.85), step(0.75, patches))  // donkere herstelplekken
}
const parkMaterial = new THREE.MeshStandardMaterial({ color: '#2c4a1c', roughness: 1 })
const yellowLineMaterial = new THREE.MeshStandardMaterial({ color: '#e8c040', roughness: 0.8 })
const zebraMaterial = new THREE.MeshStandardMaterial({ color: '#e8e8e2', roughness: 0.8 })
const poleMaterial = new THREE.MeshStandardMaterial({ color: '#2b2b30', metalness: 0.6, roughness: 0.4 })
const windowMaterial = createWindowMaterial()

// Lampkop: gloeit enkel 's nachts → emissiveNode × nightAmount
const lampMaterial = new THREE.MeshStandardNodeMaterial({ color: '#ffe6bf' })
lampMaterial.emissiveNode = color('#ffcc80').mul(nightAmount.mul(5))

// Lichtvlek onder een lantaarn: fake lighting (TSL), enkel zichtbaar 's nachts
const lightPoolMaterial = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
lightPoolMaterial.colorNode = color('#ffb35c')
lightPoolMaterial.opacityNode = float(1).sub(smoothstep(0, 1, uv().sub(0.5).length().mul(2))).mul(0.35).mul(nightAmount)

// TEGELSTOEP – nog een kleine TSL-shader: een raster van tegels van 1,2 m.
// Zelfde truc als de ramen: fract() = positie binnen een tegel, floor() = welke tegel.
// We gebruiken positionWorld (meters in de wereld), dus de tegels lopen over alle stoepen door.
const sidewalkMaterial = new THREE.MeshStandardNodeMaterial({ roughness: 0.9 })
{
  const tileCoord = positionWorld.xz.div(1.2)
  const inTile = fract(tileCoord)
  const tileId = floor(tileCoord)
  const grout = max(step(0.93, inTile.x), step(0.93, inTile.y)) // voeg = dunne rand van elke tegel
  const tileShade = hash(tileId.x.add(tileId.y.mul(91)))           // elke tegel een eigen getal 0..1
  const tile = mix(color('#c9c2a3'), color('#b5ad8c'), tileShade)  // → net iets andere kleur
  sidewalkMaterial.colorNode = mix(tile, color('#8c8670'), grout)
}

// ---------------------------------------------------------------
// GEBOUWEN
// ---------------------------------------------------------------
// uv in METERS voor de ramen-shader (zie window-material.js)
function createBuildingGeometry(width, height, depth) {
  const geometry = new THREE.BoxGeometry(width, height, depth)
  const uvs = geometry.attributes.uv
  const faceSizes = [[depth, height], [depth, height], [width, depth], [width, depth], [width, height], [width, height]]
  const offsetU = Math.floor(Math.random() * 50) * BUILDING_ID_SIZE
  const offsetV = Math.floor(Math.random() * 50) * BUILDING_ID_SIZE
  for (let i = 0; i < uvs.count; i++) {
    const [faceU, faceV] = faceSizes[Math.floor(i / 4)]
    uvs.setXY(i, uvs.getX(i) * faceU + offsetU, uvs.getY(i) * faceV + offsetV)
  }
  geometry.translate(0, height / 2, 0)

  // Eigen ATTRIBUTE: de afmetingen van het dak, op elk hoekpunt (voor de dakshader)
  const sizes = new Float32Array(uvs.count * 2)
  for (let i = 0; i < uvs.count; i++) sizes.set([width, depth], i * 2)
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 2))
  return geometry
}

// Dakobjecten verzamelen we eerst, en maken we op het einde als InstancedMeshes
const roofItems = { ac: [], shed: [], tank: [] }

function addBuilding(scene, x, z, width, depth, height) {
  const mesh = new THREE.Mesh(createBuildingGeometry(width, height, depth), windowMaterial)
  mesh.position.set(x, 0, z)
  mesh.castShadow = mesh.receiveShadow = true
  scene.add(mesh)

  // 1–4 dingen op het dak, niet tegen de rand
  const count = 1 + Math.floor(Math.random() * 4)
  for (let n = 0; n < count; n++) {
    const px = x + (Math.random() - 0.5) * (width - 4)
    const pz = z + (Math.random() - 0.5) * (depth - 4)
    const r = Math.random()
    const type = r < 0.6 ? 'ac' : r < 0.85 ? 'shed' : 'tank'
    roofItems[type].push([px, height, pz, Math.floor(Math.random() * 4) * (Math.PI / 2)])
  }
}

function addNeon(scene, x, y, z, alongX, length) {
  const c = NEON_COLORS[Math.floor(Math.random() * NEON_COLORS.length)]
  const material = new THREE.MeshStandardNodeMaterial({ color: c })
  material.emissiveNode = color(c).mul(nightAmount.mul(3.5).add(0.6)) // overdag zwak, 's nachts fel
  const neon = new THREE.Mesh(alongX ? new THREE.BoxGeometry(length, 0.7, 0.15) : new THREE.BoxGeometry(0.15, 0.7, length), material)
  neon.position.set(x, y, z)
  scene.add(neon)
}

function createHospital(scene, r) {
  const w = r.x1 - r.x0 - SIDEWALK * 2
  const cx = (r.x0 + r.x1) / 2
  const cz = (r.z0 + r.z1) / 2
  const building = new THREE.Mesh(new THREE.BoxGeometry(w, 14, w), new THREE.MeshStandardMaterial({ color: '#e4e7ee', roughness: 0.6 }))
  building.position.set(cx, 7, cz)
  building.castShadow = building.receiveShadow = true
  scene.add(building)

  // Rood kruis op het dak (goed zichtbaar van bovenaf) en op de gevel boven de ingang
  const red = new THREE.MeshStandardMaterial({ color: '#e8202e', emissive: '#ff2a3a', emissiveIntensity: 1.5 })
  const parts = [
    [14, 0.4, 4, cx, 14.2, cz], [4, 0.4, 14, cx, 14.2, cz],
    [4, 1.2, 0.3, cx, 10, cz - w / 2 - 0.2], [1.2, 4, 0.3, cx, 10, cz - w / 2 - 0.2],
  ]
  for (const [sx, sy, sz, x, y, z] of parts) {
    const part = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), red)
    part.position.set(x, y, z)
    scene.add(part)
  }
}

// ---------------------------------------------------------------
// DE STAD BOUWEN
// ---------------------------------------------------------------
export function createCity(scene) {
  const colliders = []     // rechthoeken waar je niet door mag (gebouwen)
  const sidewalkSlots = [] // plekken op de stoep (gewonden, kegels)

  const size = CITY_SIZE + ROAD
  const asphalt = new THREE.Mesh(new THREE.PlaneGeometry(size, size), asphaltMaterial)
  asphalt.rotation.x = -Math.PI / 2
  asphalt.position.set(CITY_SIZE / 2, 0.01, CITY_SIZE / 2)
  asphalt.receiveShadow = true
  scene.add(asphalt)

  for (let i = 0; i < BLOCKS; i++) {
    for (let j = 0; j < BLOCKS; j++) {
      const r = blockRect(i, j)
      const w = r.x1 - r.x0
      const cx = (r.x0 + r.x1) / 2
      const cz = (r.z0 + r.z1) / 2

      const slab = new THREE.Mesh(new THREE.BoxGeometry(w, 0.15, w), sidewalkMaterial)
      slab.position.set(cx, 0.075, cz)
      slab.receiveShadow = true
      scene.add(slab)

      // stoepplekken (midden van elke zijde, op de stoep)
      sidewalkSlots.push(
        { x: cx, z: r.z0 + SIDEWALK / 2, i, j }, { x: cx, z: r.z1 - SIDEWALK / 2, i, j },
        { x: r.x0 + SIDEWALK / 2, z: cz, i, j }, { x: r.x1 - SIDEWALK / 2, z: cz, i, j },
      )

      if (isPark(i, j)) {
        const lawn = new THREE.Mesh(new THREE.BoxGeometry(w - SIDEWALK * 2, 0.16, w - SIDEWALK * 2), parkMaterial)
        lawn.position.set(cx, 0.08, cz)
        lawn.receiveShadow = true
        scene.add(lawn)
        continue // gras: zie grass.js; geen collider, je mag erdoor rijden
      }

      if (isHospital(i, j)) {
        createHospital(scene, r)
      } else {
        const inner = w - SIDEWALK * 2
        const lot = inner / 2
        for (let a = 0; a < 2; a++) {
          for (let b = 0; b < 2; b++) {
            addBuilding(scene, r.x0 + SIDEWALK + lot * (a + 0.5), r.z0 + SIDEWALK + lot * (b + 0.5), lot - 1, lot - 1,
              THREE.MathUtils.randFloat(6, 18))
          }
        }
        if (Math.random() < 0.6) {
          const side = Math.floor(Math.random() * 4)
          const along = Math.random() * (inner - 8) - (inner - 8) / 2
          const y = THREE.MathUtils.randFloat(3.5, 7)
          if (side === 0) addNeon(scene, cx + along, y, r.z0 + SIDEWALK - 0.1, true, 4)
          if (side === 1) addNeon(scene, cx + along, y, r.z1 - SIDEWALK + 0.1, true, 4)
          if (side === 2) addNeon(scene, r.x0 + SIDEWALK - 0.1, y, cz + along, false, 4)
          if (side === 3) addNeon(scene, r.x1 - SIDEWALK + 0.1, y, cz + along, false, 4)
        }
      }
      colliders.push({ x0: r.x0 + SIDEWALK, z0: r.z0 + SIDEWALK, x1: r.x1 - SIDEWALK, z1: r.z1 - SIDEWALK })
    }
  }

  // Rand van gebouwen rond de stad (decor + muur)
  for (let k = -1; k <= BLOCKS; k++) {
    const m = k * PITCH + PITCH / 2
    for (const [x, z] of [[m, -ROAD / 2 - 12], [m, CITY_SIZE + ROAD / 2 + 12], [-ROAD / 2 - 12, m], [CITY_SIZE + ROAD / 2 + 12, m]]) {
      addBuilding(scene, x, z, 22, 22, THREE.MathUtils.randFloat(8, 22))
    }
  }

  // ---- INSTANCING voor alles wat heel vaak voorkomt (zie stap 4) ----
  const dummy = new THREE.Object3D()
  const place = (mesh, n, x, y, z, rotX, rotZ = 0) => {
    dummy.position.set(x, y, z)
    dummy.rotation.set(rotX, 0, rotZ)
    dummy.updateMatrix()
    mesh.setMatrixAt(n, dummy.matrix)
  }

  // Gele streepjes tussen de rijstroken (op -4, 0 en +4 m van het midden van elke straat)
  const dashes = []
  for (let k = 0; k <= BLOCKS; k++) {
    for (let t = -ROAD / 2; t < CITY_SIZE + ROAD / 2; t += 6) {
      const local = ((t % PITCH) + PITCH) % PITCH
      if (local < ROAD / 2 + 4 || local > PITCH - ROAD / 2 - 4) continue // niet op kruispunten en zebrapaden
      for (const offset of [-LANE, 0, LANE]) {
        dashes.push([k * PITCH + offset, t + 1.5, 0])           // straat langs z
        dashes.push([t + 1.5, k * PITCH + offset, Math.PI / 2]) // straat langs x
      }
    }
  }
  const dashMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.3, 3), yellowLineMaterial, dashes.length)
  dashes.forEach(([x, z, rot], n) => place(dashMesh, n, x, 0.02, z, -Math.PI / 2, rot))
  scene.add(dashMesh)

  // Zebrapaden aan elk kruispunt, daar waar voetgangers oversteken (2 m in de stoep = hun looplijn)
  const stripes = []
  for (let i = 0; i <= BLOCKS; i++) {
    for (let j = 0; j <= BLOCKS; j++) {
      const d = ROAD / 2 + SIDEWALK / 2
      for (let s = -ROAD / 2 + 1; s < ROAD / 2; s += 2) {
        for (const dir of [-1, 1]) {
          stripes.push([i * PITCH + s, j * PITCH + dir * d, 0])
          stripes.push([i * PITCH + dir * d, j * PITCH + s, Math.PI / 2])
        }
      }
    }
  }
  const stripeMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 2.6), zebraMaterial, stripes.length)
  stripes.forEach(([x, z, rot], n) => place(stripeMesh, n, x, 0.025, z, -Math.PI / 2, rot))
  scene.add(stripeMesh)

  // Straatlantaarns op 2 hoeken van elk blok: palen, lampen, lichtvlekken = 3 InstancedMeshes
  const lamps = []
  for (let i = 0; i < BLOCKS; i++) {
    for (let j = 0; j < BLOCKS; j++) {
      const r = blockRect(i, j)
      lamps.push([r.x0 + 0.6, r.z0 + 0.6], [r.x1 - 0.6, r.z1 - 0.6])
    }
  }
  const poles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.08, 0.1, 5, 8), poleMaterial, lamps.length)
  const heads = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 0.15, 0.5), lampMaterial, lamps.length)
  const pools = new THREE.InstancedMesh(new THREE.PlaneGeometry(9, 9), lightPoolMaterial, lamps.length)
  lamps.forEach(([x, z], n) => {
    place(poles, n, x, 2.5, z, 0)
    place(heads, n, x, 5, z, 0)
    place(pools, n, x, 0.2, z, -Math.PI / 2)
  })
  scene.add(poles, heads, pools)

  // Dakobjecten: airco's, trappenhuizen en watertanks (3 InstancedMeshes voor honderden objecten)
  const roofParts = {
    ac: [new THREE.BoxGeometry(1.4, 0.9, 1.0), new THREE.MeshStandardMaterial({ color: '#b9bcc2', metalness: 0.4, roughness: 0.5 }), 0.45],
    shed: [new THREE.BoxGeometry(3, 2.6, 3.4), new THREE.MeshStandardMaterial({ color: '#7d7870', roughness: 0.9 }), 1.3],
    tank: [new THREE.CylinderGeometry(1.1, 1.1, 2.2, 16), new THREE.MeshStandardMaterial({ color: '#6b5440', roughness: 0.8 }), 1.1],
  }
  for (const [type, [geometry, material, halfHeight]] of Object.entries(roofParts)) {
    const items = roofItems[type]
    const mesh = new THREE.InstancedMesh(geometry, material, items.length)
    items.forEach(([x, y, z, rot], n) => {
      dummy.position.set(x, y + halfHeight, z)
      dummy.rotation.set(0, rot, 0)
      dummy.updateMatrix()
      mesh.setMatrixAt(n, dummy.matrix)
    })
    mesh.castShadow = mesh.receiveShadow = true
    scene.add(mesh)
  }

  return { colliders, sidewalkSlots }
}
