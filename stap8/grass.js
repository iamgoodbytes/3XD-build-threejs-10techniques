// Het gras uit stap 6/7, nu enkel in de BERMEN naast de weg (stap 8).
import * as THREE from 'three/webgpu'
import { Fn, uniform, uv, time, positionLocal, positionWorld, sin, float, smoothstep, mix, color } from 'three/tsl'

// options:
//   count        aantal sprieten
//   bands        lijst van [minX, maxX]-stroken waar gras groeit, bv. [[-7.5, -5], [5, 7.5]]
//   minZ, maxZ   lengte van het veld (in de ruimte van de grass-mesh)
//   trail        spoortextuur uit createTrail()
export function createGrass({ count, bands, minZ, maxZ, trail }) {
  const geometry = new THREE.PlaneGeometry(0.1, 1, 1, 3)
  geometry.translate(0, 0.5, 0)
  const positions = geometry.attributes.position
  for (let i = 0; i < positions.count; i++) {
    positions.setX(i, positions.getX(i) * (1 - positions.getY(i)))
  }

  // UNIFORMS (JS → GPU, zie main.js)
  const carPosition = uniform(new THREE.Vector3()) // positie van de auto in de wereld
  const offsetZ = uniform(0)                       // hoe ver de grass-mesh meegeschoven is

  const material = new THREE.MeshStandardNodeMaterial({ side: THREE.DoubleSide, roughness: 1 })

  // FRAGMENT: donker → licht naar de top; platgereden gras is bleker (je ziet de onderkant)
  // positionWorld is hier de positie van de pixel in de wereld → meteen bruikbaar voor de kaart
  const flatHere = trail.sampleNode(positionWorld.x, positionWorld.z)
  const healthy = mix(color('#132e0c'), color('#4f8a2a'), uv().y) // donkerder: het is nacht
  material.colorNode = mix(healthy, color('#6f7f4f'), flatHere.mul(0.6))

  // VERTEX
  material.positionNode = Fn(() => {
    const position = positionLocal.toVar()
    const bend = uv().y.mul(uv().y)

    // De mesh schuift mee met de auto → reken om naar wereldcoördinaten.
    // toVar() maakt een KOPIE op dit moment. Zonder toVar() is worldZ een "formule"
    // over position, en die zou verderop de al aangepaste position gebruiken!
    const worldX = position.x.toVar()
    const worldZ = position.z.add(offsetZ).toVar()

    // SPOOR: lees de kaart. 1 = platgereden → plat tegen de grond, voorover in de rijrichting
    const flat = trail.sampleNode(worldX, worldZ).toVar()
    position.y.mulAssign(float(1).sub(flat.mul(0.92)))
    position.z.addAssign(flat.mul(uv().y).mul(0.5))

    // WIND (minder op platgereden gras)
    const wave = sin(time.mul(2.0).add(worldX.mul(0.35)).add(worldZ.mul(0.25)))
    const gust = sin(time.mul(0.6).add(worldZ.mul(0.05)))
    const wind = wave.mul(0.12).add(gust.mul(0.12)).mul(float(1).sub(flat))
    position.x.addAssign(wind.mul(bend))
    position.z.addAssign(wind.mul(bend).mul(0.5))

    // "Boeggolf": vlak bij de auto buigt het gras al weg (zoals stap 4b)
    const awayX = worldX.sub(carPosition.x)
    const awayZ = worldZ.sub(carPosition.z)
    const distance = awayX.mul(awayX).add(awayZ.mul(awayZ)).sqrt().max(0.001)
    const push = float(1).sub(smoothstep(0.8, 2.2, distance))
    const strength = push.mul(bend).mul(0.6)
    position.x.addAssign(awayX.div(distance).mul(strength))
    position.z.addAssign(awayZ.div(distance).mul(strength))

    return position
  })()

  const mesh = new THREE.InstancedMesh(geometry, material, count)
  mesh.receiveShadow = true
  mesh.frustumCulled = false // het veld schuift mee met de auto; altijd tekenen

  const dummy = new THREE.Object3D()
  for (let i = 0; i < count; i++) {
    const [minX, maxX] = bands[i % bands.length] // om de beurt in elke strook
    dummy.position.set(THREE.MathUtils.randFloat(minX, maxX), 0, THREE.MathUtils.randFloat(minZ, maxZ))
    dummy.rotation.y = Math.random() * Math.PI
    dummy.scale.set(1, THREE.MathUtils.randFloat(0.25, 0.6), 1)
    dummy.updateMatrix()
    mesh.setMatrixAt(i, dummy.matrix)
  }
  return { mesh, carPosition, offsetZ }
}
