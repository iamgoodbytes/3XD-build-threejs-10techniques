// VOERTUIGEN – modellen één keer laden, daarna zo vaak klonen als nodig
//
// template.clone() maakt een nieuwe hiërarchie (eigen posities/rotaties), maar DEELT
// geometries en materialen met het origineel → 30 taxi's kosten nauwelijks extra geheugen.

import * as THREE from 'three/webgpu'

// Laad een lijst modellen tegelijk: { naam: url } → { naam: template }
// Promise.all wacht tot ALLE bestanden binnen zijn (en ze laden parallel).
export async function loadModels(loader, urls) {
  const entries = Object.entries(urls)
  const gltfs = await Promise.all(entries.map(([, url]) => loader.loadAsync(url)))
  const templates = {}
  entries.forEach(([name, ], i) => { templates[name] = gltfs[i].scene })
  return templates
}

// Afmetingen + midden van een object (in zijn eigen ruimte)
export function measure(object) {
  object.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(object)
  return { size: box.getSize(new THREE.Vector3()), center: box.getCenter(new THREE.Vector3()) }
}

// De vier echte wielen. Let op: de suv heeft ook een "wheel-back" (reservewiel achterop)!
// Daarom een precieze reguliere expressie i.p.v. startsWith('wheel').
const WHEEL_NAME = /^wheel-(front|back)-(left|right)$/

// Een rijklare kopie maken van een template (zie ook stap 7, car.js)
export function createVehicle(template) {
  const model = template.clone(true)
  model.updateMatrixWorld(true)

  model.traverse((obj) => {
    if (obj.isMesh) obj.castShadow = true
  })

  const wheelNodes = []
  model.traverse((obj) => {
    if (WHEEL_NAME.test(obj.name)) wheelNodes.push(obj)
  })

  const wheels = []
  const frontPivots = []
  for (const wheel of wheelNodes) {
    wheels.push(wheel)
    if (wheel.name.includes('front')) {
      const pivot = new THREE.Group()
      new THREE.Box3().setFromObject(wheel).getCenter(pivot.position)
      model.add(pivot)
      pivot.attach(wheel) // wiel blijft op zijn plek (zie stap 7)
      frontPivots.push(pivot)
    }
  }

  const { size, center } = measure(model)
  const wheelRadius = wheels.length ? measure(wheels[0]).size.y / 2 : 0.3
  return { mesh: model, wheels, frontPivots, size, center, wheelRadius }
}

// PHYSICS → MESH voor modellen waarvan het nulpunt NIET in het midden ligt.
// De physics-box zit rond het midden (center) van het model, het model zelf heeft
// zijn nulpunt op de grond. Als het model kantelt, moet die verschuiving mee draaien:
//   mesh.position = body.position − (center gedraaid met de rotatie van de body)
const _offset = new THREE.Vector3()
const _quaternion = new THREE.Quaternion()
// interpolated = true: gebruik de tussenpositie die cannon berekent tussen twee vaste
// physics-stappen (world.step met dt) → vloeiend, ook als er een frame geen stap was.
export function syncMeshToBody(mesh, body, center, interpolated = false) {
  const q = interpolated ? body.interpolatedQuaternion : body.quaternion
  const p = interpolated ? body.interpolatedPosition : body.position
  _quaternion.set(q.x, q.y, q.z, q.w)
  _offset.copy(center).applyQuaternion(_quaternion)
  mesh.position.set(p.x - _offset.x, p.y - _offset.y, p.z - _offset.z)
  mesh.quaternion.copy(_quaternion)
}
