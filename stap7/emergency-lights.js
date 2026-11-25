// ZWAAILICHTEN
//
// Twee onderdelen per zwaailicht:
//   1. een "lens": een klein blokje met een EMISSIVE materiaal → lijkt zelf licht te geven
//      (emissive verlicht niets anders, het is gewoon een kleur die niet donker wordt)
//   2. een POINTLIGHT: verlicht echt de omgeving (gras, blokjes, barrières)
//
// Knipperen = elke frame de sterkte aanpassen, NIET light.visible aan/uit zetten:
// het aantal zichtbare lichten veranderen dwingt Three.js om de shaders van ALLE
// materialen opnieuw te compileren → het spel hapert bij elke flits!

import * as THREE from 'three/webgpu'

const LENS_ON = 6    // emissiveIntensity als het licht aan is
const LIGHT_ON = 25  // intensiteit van de PointLight (candela) als het licht aan is

// positions: lijst van [x, y, z] op het model (in meter, voorkant = +z)
export function createEmergencyLights(model, positions, colorValue = '#2f6bff') {
  const lensGeometry = new THREE.BoxGeometry(0.28, 0.12, 0.18)
  const lights = []

  for (const [x, y, z] of positions) {
    // Elk zwaailicht een EIGEN materiaal: ze knipperen niet tegelijk
    const lensMaterial = new THREE.MeshStandardMaterial({
      color: colorValue,
      emissive: colorValue,
      emissiveIntensity: 0,
    })
    const lens = new THREE.Mesh(lensGeometry, lensMaterial)
    lens.position.set(x, y, z)
    model.add(lens)

    // distance = tot waar het licht reikt; decay 2 = natuurkundig correct afnemen
    const light = new THREE.PointLight(colorValue, 0, 12, 2)
    light.position.set(x, y + 0.15, z)
    model.add(light)

    lights.push({ lensMaterial, light })
  }

  let on = false

  // Flitspatroon: links en rechts om de beurt, telkens een DUBBELE flits
  //   tijd →  | L L . . R R . . | L L . . R R . . |
  function update(timeSeconds) {
    const cycle = (timeSeconds * 1.5) % 1 // 0..1, anderhalve cyclus per seconde
    lights.forEach(({ lensMaterial, light }, i) => {
      const myHalf = i % 2 === 0 ? cycle < 0.5 : cycle >= 0.5 // wiens beurt is het?
      const t = (cycle * 2) % 1                                // 0..1 binnen die helft
      const flash = t < 0.2 || (t > 0.3 && t < 0.5)            // twee korte flitsen, dan pauze
      const lit = on && myHalf && flash
      lensMaterial.emissiveIntensity = lit ? LENS_ON : on ? 0.4 : 0   // zwak nagloeien als "aan"
      light.intensity = lit ? LIGHT_ON : 0
    })
  }

  function setOn(value) {
    on = value
  }

  return { update, setOn, get on() { return on } }
}
