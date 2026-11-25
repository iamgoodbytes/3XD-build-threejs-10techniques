// De blokjesauto uit stap 2, nu als aparte module.
// Kijkt naar +z, nulpunt op de grond. In stap 7 vervangen we dit door een echt model.
import * as THREE from 'three/webgpu'

export const WHEEL_RADIUS = 0.3

export function createCar() {
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

  const lampGeometry = new THREE.BoxGeometry(0.25, 0.12, 0.05)
  const lampMaterial = new THREE.MeshStandardMaterial({ color: '#fff6c0', emissive: '#fff6c0' })
  for (const x of [-0.4, 0.4]) {
    const lamp = new THREE.Mesh(lampGeometry, lampMaterial)
    lamp.position.set(x, 0.6, 1.11)
    car.add(lamp)
  }

  const tireGeometry = new THREE.CylinderGeometry(WHEEL_RADIUS, WHEEL_RADIUS, 0.25, 20)
  tireGeometry.rotateZ(Math.PI / 2)
  const rimGeometry = new THREE.BoxGeometry(0.27, 0.12, 0.4)

  const wheels = []
  const frontPivots = []
  for (const [x, z] of [[-0.65, 0.7], [0.65, 0.7], [-0.65, -0.7], [0.65, -0.7]]) {
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
