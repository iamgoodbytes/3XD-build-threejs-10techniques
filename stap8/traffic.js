// VERKEER – auto's die over het stratenraster rijden
//
// Elke auto weet:  op welk kruispunt (i, j) hij vertrok, in welke richting hij rijdt (dir),
//                  en hoe ver hij al is op dat stuk straat (s, 0 tot PITCH meter).
// Positie = kruispunt + richting × s + een stukje naar RECHTS (zijn rijstrook).
// Komt hij aan op het volgende kruispunt, dan kiest hij willekeurig een nieuwe richting
// (niet terug). Zo rijden de auto's eindeloos rond zonder dat we routes moeten tekenen.
//
// Gedrag ("AI"):
//   - staat er iets vóór mij (speler, auto, overstekende voetganger)? → remmen
//   - is het kruispunt bezet? → wachten
//   - sirene in de buurt? → traag rijden en naar rechts uitwijken

import * as THREE from 'three/webgpu'
import { createVehicle } from './vehicles.js'
import { BLOCKS, PITCH, ROAD, LANE } from './city.js'

const DIRS = [[0, 1], [1, 0], [0, -1], [-1, 0]] // +z, +x, -z, -x
const _target = new THREE.Vector3()

// hoek zacht laten draaien langs de kortste weg
function dampAngle(current, target, lambda, dt) {
  const diff = Math.atan2(Math.sin(target - current), Math.cos(target - current))
  return current + diff * (1 - Math.exp(-lambda * dt))
}

export function createTraffic({ scene, templates, count }) {
  const cars = []

  const validDirs = (i, j) => [0, 1, 2, 3].filter((d) => {
    const ni = i + DIRS[d][0]
    const nj = j + DIRS[d][1]
    return ni >= 0 && ni <= BLOCKS && nj >= 0 && nj <= BLOCKS
  })

  // Waar zou de auto volgens de regels moeten staan?
  function logicalPosition(car, out) {
    const [dx, dz] = DIRS[car.dir]
    const offset = car.lane + car.pullOver
    // rechts van de rijrichting (dx, dz) is (-dz, dx)
    return out.set(car.i * PITCH + dx * car.s - dz * offset, 0, car.j * PITCH + dz * car.s + dx * offset)
  }

  // Een auto (opnieuw) op een willekeurige straat zetten.
  // avoid = positie waar hij NIET vlakbij mag verschijnen (bv. de speler)
  function place(car, avoid = null) {
    for (let attempt = 0; attempt < 20; attempt++) {
      car.i = Math.floor(Math.random() * (BLOCKS + 1))
      car.j = Math.floor(Math.random() * (BLOCKS + 1))
      const dirs = validDirs(car.i, car.j)
      car.dir = dirs[Math.floor(Math.random() * dirs.length)]
      car.s = Math.random() * PITCH
      logicalPosition(car, _target)
      if (!avoid || Math.hypot(_target.x - avoid.x, _target.z - avoid.z) > 60) break
    }
    car.speed = 0
    car.pullOver = 0
    car.vehicle.mesh.position.copy(logicalPosition(car, _target))
    car.vehicle.mesh.rotation.set(0, Math.atan2(DIRS[car.dir][0], DIRS[car.dir][1]), 0) // rechtop zetten na een crash
  }

  function spawn() {
    const vehicle = createVehicle(templates[Math.floor(Math.random() * templates.length)])
    const car = {
      vehicle, i: 0, j: 0, dir: 0, s: 0,
      lane: Math.random() < 0.5 ? LANE * 0.5 : LANE * 1.5, // binnenste of buitenste rijstrook
      pullOver: 0,
      cruise: THREE.MathUtils.randFloat(7, 11),
      speed: 0,
      wrecked: false, // true = weggeknald: physics bestuurt hem even, niet de AI (zie main.js)
    }
    place(car)
    scene.add(vehicle.mesh)
    cars.push(car)
  }

  // Na een crash: terug in het verkeer, ver van de speler
  function respawn(car, avoid) {
    car.wrecked = false
    place(car, avoid)
  }
  for (let n = 0; n < count; n++) spawn()

  // obstacles: lijst van { position } waarvoor auto's moeten stoppen (speler, overstekende voetgangers)
  function update(dt, obstacles, siren) {
    for (const car of cars) {
      if (car.wrecked) continue // ligt (of vliegt) als wrak: de physics-wereld bestuurt hem
      const [dx, dz] = DIRS[car.dir]
      const pos = car.vehicle.mesh.position
      let targetSpeed = car.cruise

      // 1. Staat er iets vóór mij? Kijk in een strook van 9 m lang en 2,2 m breed.
      const check = (other, keep) => {
        const rx = other.x - pos.x
        const rz = other.z - pos.z
        const ahead = rx * dx + rz * dz           // hoeveel meter vóór mij
        const side = Math.abs(rx * -dz + rz * dx) // hoeveel meter opzij
        if (ahead > 0 && ahead < 9 && side < 2.2) targetSpeed = Math.min(targetSpeed, keep)
      }
      for (const o of obstacles) check(o.position, 0)
      for (const other of cars) if (other !== car) check(other.vehicle.mesh.position, other.wrecked ? 0 : other.speed * 0.7)

      // 2. Kruispunt bezet? Wacht vlak ervoor tot het vrij is.
      if (car.s > PITCH - ROAD / 2 - 4 && car.s < PITCH - ROAD / 2) {
        const nx = (car.i + dx) * PITCH
        const nz = (car.j + dz) * PITCH
        const busy = cars.some((o) => o !== car && Math.hypot(o.vehicle.mesh.position.x - nx, o.vehicle.mesh.position.z - nz) < ROAD / 2)
        if (busy) targetSpeed = 0
      }

      // 3. Sirene in de buurt: traag en uitwijken naar rechts
      const nearSiren = siren.on && Math.hypot(siren.x - pos.x, siren.z - pos.z) < 30
      if (nearSiren) targetSpeed = Math.min(targetSpeed, 2)
      car.pullOver = THREE.MathUtils.damp(car.pullOver, nearSiren ? (car.lane < LANE ? LANE : 1) : 0, 2, dt)

      // 4. Rijden
      car.speed = THREE.MathUtils.damp(car.speed, targetSpeed, 3, dt)
      car.s += car.speed * dt

      // 5. Aangekomen op het volgende kruispunt → nieuwe richting kiezen
      if (car.s >= PITCH) {
        car.s -= PITCH
        car.i += dx
        car.j += dz
        const reverse = (car.dir + 2) % 4
        const options = validDirs(car.i, car.j).filter((d) => d !== reverse)
        car.dir = options[Math.floor(Math.random() * options.length)]
      }

      // 6. Tonen: de mesh schuift ZACHT naar de logische positie (geen sprongen in bochten)
      logicalPosition(car, _target)
      pos.lerp(_target, 1 - Math.exp(-6 * dt))
      const heading = Math.atan2(DIRS[car.dir][0], DIRS[car.dir][1])
      car.vehicle.mesh.rotation.y = dampAngle(car.vehicle.mesh.rotation.y, heading, 6, dt)
      for (const wheel of car.vehicle.wheels) wheel.rotation.x += (car.speed * dt) / car.vehicle.wheelRadius
    }
  }

  return { cars, update, respawn }
}
