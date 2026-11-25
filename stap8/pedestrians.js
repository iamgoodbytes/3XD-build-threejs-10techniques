// VOETGANGERS – figuurtjes uit eenvoudige vormen die over de stoep wandelen
//
// Een voetganger loopt van hoek naar hoek rond een blok (over het midden van de stoep).
// Op een hoek steekt hij soms over naar het blok ernaast, via het zebrapad.
//
//      hoek 3 ●───────● hoek 2          oversteken vanaf hoek 1:
//             │  blok │                   → naar rechts (blok i+1, hoek 0)
//      hoek 0 ●───────● hoek 1            → naar boven  (blok j-1, hoek 2)
//
// Animatie zonder 3D-programma: de benen zijn kinderen van een "heup"-pivot (stap 2!)
// en zwaaien heen en weer met Math.sin.

import * as THREE from 'three/webgpu'
import { BLOCKS, SIDEWALK, blockRect } from './city.js'

const SHIRTS = ['#e63946', '#2a9d8f', '#e9c46a', '#457b9d', '#f4a261', '#8d6cab', '#f1faee']
const SKIN = ['#f1c27d', '#c68642', '#8d5524', '#ffdbac']

const torsoGeometry = new THREE.BoxGeometry(0.5, 0.65, 0.3)
const headGeometry = new THREE.SphereGeometry(0.17, 12, 8)
const legGeometry = new THREE.BoxGeometry(0.16, 0.8, 0.16)
legGeometry.translate(0, -0.4, 0) // draaipunt bovenaan het been (de heup)
const pantsMaterial = new THREE.MeshStandardMaterial({ color: '#2b2d42' })

// Eén figuurtje: Group met romp, hoofd en twee benen
export function createFigure(shirtColor = SHIRTS[Math.floor(Math.random() * SHIRTS.length)]) {
  const figure = new THREE.Group()
  const shirt = new THREE.MeshStandardMaterial({ color: shirtColor })
  const skin = new THREE.MeshStandardMaterial({ color: SKIN[Math.floor(Math.random() * SKIN.length)] })

  const torso = new THREE.Mesh(torsoGeometry, shirt)
  torso.position.y = 1.15
  const head = new THREE.Mesh(headGeometry, skin)
  head.position.y = 1.65
  const legs = [-0.12, 0.12].map((x) => {
    const leg = new THREE.Mesh(legGeometry, pantsMaterial)
    leg.position.set(x, 0.82, 0)
    return leg
  })
  figure.add(torso, head, ...legs)
  figure.traverse((o) => { if (o.isMesh) o.castShadow = true })
  return { group: figure, legs }
}

// Hoek k van blok (i, j), op het midden van de stoep
function corner(i, j, k, out = new THREE.Vector3()) {
  const r = blockRect(i, j)
  const inset = SIDEWALK / 2
  const x = k === 0 || k === 3 ? r.x0 + inset : r.x1 - inset
  const z = k === 0 || k === 1 ? r.z0 + inset : r.z1 - inset
  return out.set(x, 0.15, z)
}

// Oversteekmogelijkheden per hoek: [di, dj, hoek op het nieuwe blok]
const CROSSINGS = [
  [[-1, 0, 1], [0, -1, 3]],
  [[1, 0, 0], [0, -1, 2]],
  [[1, 0, 3], [0, 1, 1]],
  [[-1, 0, 2], [0, 1, 0]],
]

export function createPedestrians({ scene, count }) {
  const people = []

  for (let n = 0; n < count; n++) {
    const { group, legs } = createFigure()
    const i = Math.floor(Math.random() * BLOCKS)
    const j = Math.floor(Math.random() * BLOCKS)
    const k = Math.floor(Math.random() * 4)
    const person = {
      group, legs, i, j, k,
      dir: Math.random() < 0.5 ? 1 : -1, // met of tegen de klok
      crossing: false,
      speed: THREE.MathUtils.randFloat(1.1, 1.7),
      target: new THREE.Vector3(),
      down: 0,      // > 0 = ligt op de grond (aangereden), aantal seconden
      phase: Math.random() * 10,
      position: group.position, // handig voor botsingen en het verkeer
    }
    corner(i, j, k, group.position)
    person.k = (k + person.dir + 4) % 4
    corner(i, j, person.k, person.target)
    scene.add(group)
    people.push(person)
  }

  // Volgende doel kiezen als we op een hoek aankomen
  function nextTarget(p, sirenNear) {
    p.crossing = false
    const options = CROSSINGS[p.k]
      .map(([di, dj, nk]) => [p.i + di, p.j + dj, nk])
      .filter(([ni, nj]) => ni >= 0 && ni < BLOCKS && nj >= 0 && nj < BLOCKS)
    // Oversteken? Niet als er een sirene in de buurt is: dan wachten we netjes.
    if (!sirenNear && options.length && Math.random() < 0.35) {
      const [ni, nj, nk] = options[Math.floor(Math.random() * options.length)]
      p.i = ni
      p.j = nj
      p.k = nk
      p.crossing = true
    } else {
      p.k = (p.k + p.dir + 4) % 4
    }
    corner(p.i, p.j, p.k, p.target)
  }

  // touchesPlayer(position) → true als de speler daar is; siren = { on, x, z }
  // onHit(person) wordt opgeroepen bij een aanrijding
  function update(dt, time, touchesPlayer, siren, onHit) {
    for (const p of people) {
      const pos = p.group.position

      // Aangereden: plat op de grond, na een tijdje weer recht
      if (p.down > 0) {
        p.down -= dt
        p.group.rotation.x = THREE.MathUtils.damp(p.group.rotation.x, p.down > 0.5 ? -Math.PI / 2 : 0, 10, dt)
        continue
      }
      p.group.rotation.x = 0

      const sirenNear = siren.on && Math.hypot(siren.x - pos.x, siren.z - pos.z) < 30
      const speed = p.crossing && sirenNear ? p.speed * 2.2 : p.speed // overstekers haasten zich

      // Stap richting het doel
      const dx = p.target.x - pos.x
      const dz = p.target.z - pos.z
      const distance = Math.hypot(dx, dz)
      if (distance < 0.1) {
        nextTarget(p, sirenNear)
      } else {
        const step = Math.min(distance, speed * dt)
        pos.x += (dx / distance) * step
        pos.z += (dz / distance) * step
        p.group.rotation.y = Math.atan2(dx, dz)
      }

      // Wandelanimatie: benen zwaaien tegengesteld
      const swing = Math.sin((time + p.phase) * speed * 5) * 0.5
      p.legs[0].rotation.x = swing
      p.legs[1].rotation.x = -swing

      // Aangereden door de speler?
      if (touchesPlayer(pos, 0.4)) {
        p.down = 2.5
        onHit(p)
      }
    }
  }

  // Overstekende voetgangers: daarvoor stopt het verkeer
  const crossingPeople = () => people.filter((p) => p.crossing && p.down <= 0)

  return { people, update, crossingPeople }
}
