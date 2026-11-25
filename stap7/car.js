// STAP 7 – Een echt 3D-model laden (Kenney Car Kit, CC0)
//
// Een GLB-bestand is een "doos" met een hele scene erin: meshes, materialen,
// texturen, hiërarchie (en soms animaties). GLTFLoader pakt die doos uit tot
// gewone Three.js-objecten.
//
// Voor we het model kunnen gebruiken, moeten we het afstemmen op onze game:
//   ✔ schaal  – 1 eenheid = 1 meter?          → Kenney: ja (ambulance = 3,25 m lang)
//   ✔ richting – voorkant naar +z?             → Kenney: ja
//   ✔ nulpunt – op de grond, in het midden?   → Kenney: ja
//   ✔ wielen  – losse objecten met een naam?  → Kenney: ja ("wheel-front-left", ...)
// Bij modellen uit andere bronnen is dat vaak NIET zo: dan schaal/draai je het model.

import * as THREE from 'three/webgpu'

export async function loadCar(loader, url) {
  const gltf = await loader.loadAsync(url) // wacht tot het bestand geladen én uitgepakt is
  const model = gltf.scene
  model.updateMatrixWorld(true)

  // Tip: bekijk de hiërarchie van een model in de console!
  // model.traverse((o) => console.log(o.name, o.type))

  model.traverse((obj) => {
    if (obj.isMesh) obj.castShadow = true
  })

  // WIELEN TERUGVINDEN OP NAAM
  // Eerst verzamelen, dan pas aanpassen: de hiërarchie veranderen TIJDENS traverse() is gevaarlijk.
  const wheelNodes = []
  model.traverse((obj) => {
    if (obj.name.startsWith('wheel')) wheelNodes.push(obj)
  })

  const wheels = []      // alle wielen → rollen (rotation.x)
  const frontPivots = [] // voorwielen → sturen (rotation.y van een pivot)
  for (const wheel of wheelNodes) {
    wheels.push(wheel)

    if (wheel.name.includes('front')) {
      // Hetzelfde probleem als in stap 2: sturen én rollen op één object = wiebelen.
      // Oplossing: een PIVOT in het midden van het wiel, en het wiel daarin hangen.
      const pivot = new THREE.Group()
      new THREE.Box3().setFromObject(wheel).getCenter(pivot.position)
      model.add(pivot)
      // attach() i.p.v. add(): het wiel blijft op exact dezelfde plek staan
      // (add() zou de positie van het wiel relatief t.o.v. de pivot interpreteren → verschoven)
      pivot.attach(wheel)
      frontPivots.push(pivot)
    }
  }

  // Afmetingen meten i.p.v. raden: daarmee maken we straks de physics-box
  const size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3())
  const wheelRadius = new THREE.Box3().setFromObject(wheels[0]).getSize(new THREE.Vector3()).y / 2

  return { mesh: model, wheels, frontPivots, size, wheelRadius }
}
