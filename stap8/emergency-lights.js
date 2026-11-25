// ZWAAILICHTEN (uitbreiding van stap 7)
//
// Nieuw: elk licht een eigen kleur, en de keuze om GEEN echte PointLight te maken.
//   - ambulance (1 stuk):   lens + PointLight → verlicht de straat
//   - politie (tot 4 tegelijk, komen en gaan): ENKEL lens. Waarom?
//       Elke keer dat het AANTAL lichten in de scene verandert, moet Three.js de shaders
//       van alle materialen opnieuw compileren → haperen telkens als er politie bijkomt.
//       Met bloom (main.js) gloeit de lens toch, dat is voor het oog genoeg.

import * as THREE from 'three/webgpu'

const LENS_ON = 8
const LIGHT_ON = 25
const lensGeometry = new THREE.BoxGeometry(0.28, 0.12, 0.18)

// lights: [{ position: [x, y, z], color: '#...' }, ...]
export function createEmergencyLights(model, lights, { pointLights = true, speed = 1.5 } = {}) {
  const parts = lights.map(({ position: [x, y, z], color }) => {
    const lensMaterial = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0 })
    const lens = new THREE.Mesh(lensGeometry, lensMaterial)
    lens.position.set(x, y, z)
    model.add(lens)

    let light = null
    if (pointLights) {
      light = new THREE.PointLight(color, 0, 12, 2)
      light.position.set(x, y + 0.15, z)
      model.add(light)
    }
    return { lensMaterial, light }
  })

  let on = false
  const phase = Math.random() // niet alle politiewagens synchroon

  function update(timeSeconds) {
    const cycle = (timeSeconds * speed + phase) % 1
    parts.forEach(({ lensMaterial, light }, i) => {
      const myHalf = i % 2 === 0 ? cycle < 0.5 : cycle >= 0.5
      const t = (cycle * 2) % 1
      const flash = t < 0.2 || (t > 0.3 && t < 0.5)
      const lit = on && myHalf && flash
      lensMaterial.emissiveIntensity = lit ? LENS_ON : on ? 0.4 : 0
      if (light) light.intensity = lit ? LIGHT_ON : 0
    })
  }

  return {
    update,
    setOn(value) { on = value },
    get on() { return on },
  }
}
