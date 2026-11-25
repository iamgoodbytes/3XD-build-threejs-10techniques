# Concepten – alles wat je nodig hebt om dit in je eigen game te gebruiken

Dit is het naslagwerk bij de lessen. Elk hoofdstuk heeft dezelfde opbouw:

- **Wat?** – in één of twee zinnen
- **Hoe werkt het?** – wat er echt gebeurt (in de computer, op de GPU, in de physics engine)
- **Recept** – minimale code die je kan kopiëren naar je eigen project
- **In je eigen game** – waarvoor je het nog kan gebruiken
- **Valkuilen** – wat er meestal misloopt

Je kent al: JavaScript, basis Three.js (scene, camera, renderer), meshes, textures, materials, GLB-modellen laden en GSAP.

| § | Concept | Waar in het project |
|---|---------|---------------------|
| 1 | [De game loop en delta time (van GSAP naar games)](#1-de-game-loop-en-delta-time) | stap 1–2 |
| 2 | [Hiërarchie, pivots en coördinaten](#2-hiërarchie-pivots-en-coördinaten) | stap 2, 7 |
| 3 | [Physics (cannon-es)](#3-physics-cannon-es) | stap 3, 6, 8 |
| 4 | [Raycasting](#4-raycasting) | stap 5, 6, 8 |
| 5 | [Shaders: wat de GPU doet](#5-shaders-wat-de-gpu-doet) | stap 4, 8 |
| 6 | [TSL: shaders schrijven in JavaScript](#6-tsl-shaders-schrijven-in-javascript) | stap 4, 6, 8 |
| 7 | [Instancing](#7-instancing) | stap 4, 6, 8 |
| 8 | [Een textuur als geheugen (grasspoor)](#8-een-textuur-als-geheugen) | stap 6–8 |
| 9 | [Licht, zwaailichten en wat licht kost](#9-licht-zwaailichten-en-wat-licht-kost) | stap 7, 8 |
| 10 | [Post-processing: bloom](#10-post-processing-bloom) | stap 8 |
| 11 | [Eindeloze werelden: recyclen, spawnen, opruimen](#11-eindeloze-werelden) | stap 6 |
| 12 | [Game-AI: “druk op dezelfde knoppen”](#12-game-ai) | stap 5, 8 |
| 13 | [Game state, missies, HUD](#13-game-state-moeilijkheid-en-hud) | stap 6, 8 |
| 14 | [Modellen laden, klonen en de preloader](#14-modellen-laden-klonen-en-de-preloader) | stap 7, 8 |
| 15 | [Geluid met de Web Audio API](#15-geluid-met-de-web-audio-api) | stap 6–8 |
| 16 | [Performance-checklist](#16-performance-checklist) | overal |

---

## 1. De game loop en delta time

**Wat?** Een game tekent ±60 keer per seconde een nieuw beeld. Vóór elk beeld werk je de wereld bij: input lezen, dingen verplaatsen, botsingen checken. Die functie heet de **game loop**.

**Hoe werkt het? Van GSAP naar games:**

| GSAP (tween) | Game loop |
|--------------|-----------|
| “Beweeg van A naar B in 1 seconde.” | “Waar ben ik **nu**, wat drukt de speler **nu** in, waar ben ik over 1/60 s?” |
| Het eindpunt ligt vast vóór de animatie start. | Het eindpunt bestaat niet: de speler kan elk moment van richting veranderen. |
| GSAP regelt de tijd. | Jij regelt de tijd met **delta time (`dt`)**. |

`dt` = de tijd sinds de vorige frame, in seconden. **Elke beweging vermenigvuldig je met `dt`**, anders draait je game op een 144 Hz scherm 2,4× sneller dan op 60 Hz.

```js
let previousTime = performance.now()
renderer.setAnimationLoop((timestamp) => {
  const dt = Math.min((timestamp - previousTime) / 1000, 0.1) // begrens: na een tabwissel geen sprong van 10 s
  previousTime = timestamp

  speed += acceleration * dt   // m/s  += m/s² × s
  position += speed * dt       // m    += m/s  × s

  renderer.render(scene, camera)
})
```

**Zacht volgen zonder GSAP: `lerp` en `damp`.** Een volgcamera schuift elke frame een stukje naar zijn doel:

```js
const t = 1 - Math.exp(-5 * dt)      // framerate-onafhankelijke factor (5 = "stijfheid")
camera.position.lerp(target, t)       // of: x = THREE.MathUtils.damp(x, doel, 5, dt)
```

Gewoon `lerp(target, 0.1)` werkt ook, maar volgt dan sneller op snellere schermen.

**Slippen en driften (stap 8):** dezelfde lerp-truc op de **snelheid** zelf. De auto wil vooruit (in de richting van zijn neus), maar de echte snelheid schuift er maar geleidelijk naartoe:
```js
const t = 1 - Math.exp(-grip * dt)          // grip 10 = plakt aan de weg, 1.2 = glijdt (handrem)
velocity.x += (forward.x * speed - velocity.x) * t
velocity.y += (forward.z * speed - velocity.y) * t
const slip = Math.abs(velocity.x * forward.z - velocity.y * forward.x) // zijwaarts glijden
```
Met weinig grip draait de auto, maar blijft hij nog even in de oude richting bewegen: een drift. Gebruik `slip` voor bandensporen, geluid of punten.

**Wanneer gebruik je in een game wél GSAP?** Voor dingen met een **vast begin en einde** die niet van input afhangen: UI-animaties, pop-ups, een camerarit in een intro, een deur die opengaat, een “level complete”-scherm. Voor alles wat de speler **bestuurt** of wat **physics** volgt: de game loop.

**Valkuilen:** `dt` vergeten; `dt` niet begrensd (na een tabwissel teleporteert alles); `Date.now()` in plaats van de timestamp van `setAnimationLoop`.

---

## 2. Hiërarchie, pivots en coördinaten

**Wat?** Elk object kan kinderen hebben (`group.add(child)`). De positie/rotatie van een kind is **relatief** t.o.v. zijn ouder.

**Hoe werkt het?** Three.js vermenigvuldigt de matrices: wereld = ouder × kind. Zo rijdt een wiel mee met de auto zonder dat je het zelf hoeft te verplaatsen.

**Het pivot-probleem.** Een voorwiel moet **rollen** (rond X) én **sturen** (rond Y). Zet je beide rotaties op hetzelfde object, dan “wiebelt” het wiel: Euler-rotaties worden in een vaste volgorde toegepast. Oplossing: **twee objecten, elk één taak.**

```
auto (Group)
 └─ pivot (Group)     ← rotation.y = sturen
     └─ wiel (Mesh)   ← rotation.x = rollen
```

**Recept: een onderdeel van een GLB in een pivot hangen**

```js
const wheel = model.getObjectByName('wheel-front-left')
const pivot = new THREE.Group()
new THREE.Box3().setFromObject(wheel).getCenter(pivot.position) // pivot in het midden van het wiel
model.add(pivot)
pivot.attach(wheel) // attach (niet add!) houdt het wiel op exact dezelfde plek in de wereld
```

**Lokale vs. wereldcoördinaten:**
```js
const behindCar = new THREE.Vector3(0, 4, -8) // "achter en boven de auto", in auto-coördinaten
car.localToWorld(behindCar)                   // → waar is dat in de wereld? (handig voor camera's)
```

**In je eigen game:** deuren (pivot op het scharnier), een geschutskoepel op een tank, armen van een personage, een zonnestelsel.

**Valkuilen:** `add()` i.p.v. `attach()` bij verhangen (object verspringt); de hiërarchie aanpassen tijdens `traverse()` (verzamel eerst, pas daarna aan).

---

## 3. Physics (cannon-es)

**Wat?** Een physics engine berekent zwaartekracht, botsingen, wrijving en stuiteren. Jij beschrijft *wat* er is; de engine berekent *wat er gebeurt*.

**Hoe werkt het? Twee werelden.**

```
cannon-es (wat er GEBEURT)          Three.js (wat je ZIET)
  World  ── bodies met shapes   ──►   Scene ── meshes
         world.step()                        renderer.render()
              │                                   ▲
              └──── elke frame: positie + rotatie kopiëren ────┘
```

- **Shape** = de botsvorm (Box, Sphere, Plane, Cylinder). Bijna altijd **simpeler** dan de mesh: één box voor een hele auto.
- **Body** = massa, positie, snelheid, rotatie + één of meer shapes.
- Per stap: (1) krachten en zwaartekracht toepassen, (2) **broadphase**: grof zoeken wie dicht bij wie is, (3) **narrowphase**: precieze contactpunten, (4) **solver**: duwt overlappende bodies uit elkaar, een paar keer na elkaar (`solver.iterations`), (5) posities bijwerken.

**De drie body-types:**

| Type | Zwaartekracht | Wordt geduwd | Duwt anderen | Gebruik |
|------|---------------|--------------|--------------|---------|
| `STATIC` (massa 0) | nee | nee | ja | grond, muren, wegenwerken |
| `DYNAMIC` (massa > 0) | ja | ja | ja | kisten, kegels, verkeer, wrakken |
| `KINEMATIC` | nee | nee | ja, oneindig sterk | speler die je zelf bestuurt (de ambulance), liften |

**Recept**

```js
import * as CANNON from 'cannon-es'

const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) })
world.broadphase = new CANNON.SAPBroadphase(world)
world.allowSleep = true

// grond
const ground = new CANNON.Body({ type: CANNON.Body.STATIC, shape: new CANNON.Plane() })
ground.quaternion.setFromEuler(-Math.PI / 2, 0, 0) // Plane wijst naar +z → kantelen
world.addBody(ground)

// een kist: mesh + body
const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material)
const body = new CANNON.Body({
  mass: 1,
  shape: new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5)), // ⚠️ HALVE afmetingen!
  position: new CANNON.Vec3(0, 5, 0),
})
world.addBody(body)
scene.add(mesh)

// in de game loop
world.step(1 / 60, dt, 3)                 // vaste stap van 1/60 s, max 3 inhaalstappen
mesh.position.copy(body.position)
mesh.quaternion.copy(body.quaternion)
```

**Een speler besturen (kinematic):** zet de **snelheid**, niet de positie. Dan weet de engine hoe hard je tegen dingen duwt.
```js
playerBody.velocity.set(Math.sin(heading) * speed, 0, Math.cos(heading) * speed)
playerBody.quaternion.setFromEuler(0, heading, 0)
```

**Botsingen opvangen:**
```js
body.addEventListener('collide', (event) => {
  if (event.body === playerBody) { /* punten, geluid, ... */ }
})
```

**Trucs uit het project:**
- **Static → dynamic** (wegenwerken opblazen in stap 6): een body van type veranderen is foutgevoelig. Verwijder hem en maak een **nieuwe** dynamic body op dezelfde plek (`position.clone()`, `quaternion.clone()`), en geef een `applyImpulse`.
- **Zelfrijdend verkeer:** dynamic body met `fixedRotation: true`; elke frame `velocity` zetten. Bij een aanrijding `fixedRotation = false` + `updateMassProperties()` → vanaf dan pure physics.
- **Kinematic en static botsen NIET** met elkaar (geen van beide kan bewegen). Test zelf met `THREE.Box3`:
  ```js
  const a = new THREE.Box3().setFromCenterAndSize(playerPos, playerSize)
  const b = new THREE.Box3().setFromCenterAndSize(wallPos, wallSize)
  if (a.intersectsBox(b)) gameOver()
  ```
- **Model met nulpunt op de grond** (Kenney): de physics-box zit rond het midden. Gebruik `syncMeshToBody()` uit `stap8/vehicles.js`, die de verschuiving mee laat draaien.

**In je eigen game:** alles wat valt, rolt, stapelt of omver gaat; ragdolls (bodies + constraints); een kanon (`velocity` geven); explosies (`applyImpulse` weg van het centrum).

**Valkuilen:** volle i.p.v. halve afmetingen; Plane niet gekanteld (alles valt door de grond); sync vergeten; een kinematic of zelfrijdende body die “in slaap valt” (`body.allowSleep = false`); snelle objecten die door dunne objecten glippen (**tunneling**: kleinere stap `world.step(1/120, dt, 10)` of dikkere shapes); `body.position` direct zetten i.p.v. snelheid (objecten worden niet geduwd maar “weggeteleporteerd”).

---

## 4. Raycasting

**Wat?** Een **ray** is een halve rechte: een startpunt + een richting. De `Raycaster` zoekt welke objecten die ray raakt, en **waar**.

**Hoe werkt het?** Voor elk object test Three.js eerst snel of de ray de bounding sphere raakt; zo ja, dan per driehoek of de ray hem snijdt. Resultaat: een lijst treffers, **dichtstbijzijnde eerst**: `{ object, point, distance, face, uv }`.

**Recept: klikken op objecten**

```js
const raycaster = new THREE.Raycaster()
const pointer = new THREE.Vector2()

addEventListener('pointerdown', (e) => {
  // pixels → NDC (-1..1, y naar boven!)
  pointer.x = (e.clientX / innerWidth) * 2 - 1
  pointer.y = -(e.clientY / innerHeight) * 2 + 1

  raycaster.setFromCamera(pointer, camera)
  const hits = raycaster.intersectObjects(clickables, false) // ⚠️ enkel wat klikbaar moet zijn
  if (hits.length) {
    const { object, point } = hits[0]
    object.userData.body?.applyImpulse(/* ... */) // mesh → body via userData
  }
})
```

**Recept: een ray vanuit een object (sensor, kogel, grondcheck)**
```js
raycaster.set(origin, direction.normalize()) // richting MOET lengte 1 hebben
raycaster.far = 8                            // niet verder dan 8 m kijken
const hit = raycaster.intersectObjects(obstacles)[0]
if (hit) console.log('obstakel op', hit.distance, 'm')
```

**In je eigen game:** objecten selecteren, schieten, zichtlijn van een vijand (“ziet hij de speler?”), personage op een heuvel zetten (ray naar beneden), point-and-click bewegen (stap 5), parkeersensoren, laser-effecten.

**Valkuilen:** y niet omgekeerd bij NDC; tegen honderden/duizenden objecten raycasten (beperk de lijst!); vergeten dat je ook je eigen speler of helpers raakt; een ray vanuit de camera is vanuit de camera onzichtbaar (een punt). Bevries hem om hem te debuggen (stap 5).

---

## 5. Shaders: wat de GPU doet

**Wat?** Een **shader** is een klein programma dat op de grafische kaart (GPU) draait. Elk materiaal in Three.js is in feite een shader die Three.js voor jou schreef.

**Hoe werkt het?** De GPU tekent driehoeken in twee fases:

```
hoekpunten ──► VERTEX-SHADER ──► driehoeken op het scherm ──► FRAGMENT-SHADER ──► pixels
(posities)     "waar komt dit                                  "welke kleur krijgt
               hoekpunt?"                                       deze pixel?"
               → positionNode                                   → colorNode / emissiveNode
```

- De **vertex-shader** draait **per hoekpunt**. Gras laten wiegen = hoekpunten verschuiven.
- De **fragment-shader** draait **per pixel**. Ramen tekenen = per pixel beslissen: raam of muur, licht aan of uit.
- **Alles gebeurt parallel.** Er is geen lus over de pixels: de GPU voert dezelfde code tegelijk uit op duizenden kernen. Daarom kan een pixel niet aan een andere pixel vragen wat die doet, en daarom is “willekeur” een functie (`hash(x)`) en geen `Math.random()`.

**Gegevens naar een shader sturen:**

| Soort | Wat | Voorbeeld uit het project |
|-------|-----|---------------------------|
| **uniform** | Eén waarde, gelijk voor alle hoekpunten/pixels, aanpasbaar vanuit JS | positie van de auto (gras wijkt), `time` |
| **attribute** | Per hoekpunt, zit in de geometry | `position`, `uv`, `normal`, de instance-matrix, de dakmaat `aSize` (stap 8) |
| **texture** | Een 2D-tabel met waarden die de shader kan opzoeken | het grasspoor (stap 6) |
| **varying** | Van vertex- naar fragment-shader, geïnterpoleerd | gebeurt automatisch bij `uv()`, `positionWorld` |

**Waarom shaders voor animatie?** 80 000 grassprieten elke frame in JavaScript bijwerken = 80 000 berekeningen na elkaar op de CPU (traag). In de vertex-shader = alles tegelijk op de GPU (bijna gratis).

---

## 6. TSL: shaders schrijven in JavaScript

**Wat?** **TSL (Three Shading Language)** laat je shaders schrijven met JavaScript-functies. Three.js vertaalt ze naar WGSL (WebGPU) of GLSL (WebGL 2).

**Hoe werkt het? TSL rekent niets uit, het BESCHRIJFT een berekening.**

```js
const wave = sin(time.mul(2).add(positionLocal.x))
```
Hier wordt geen sinus uitgerekend. `wave` is een **node**: een stukje van een boom die zegt “neem time, maal 2, plus x, dan sinus”. Pas als het materiaal gebruikt wordt, zet Three.js die boom om naar echte shadercode:
```glsl
float wave = sin(time * 2.0 + position.x);
```
Daarom schrijf je `.mul()` en `.add()` i.p.v. `*` en `+`: JavaScript laat niet toe om `*` voor eigen objecten te herdefiniëren.

**Opzet**
```js
import * as THREE from 'three/webgpu'                      // ⚠️ niet 'three'
import { uv, time, positionLocal, sin, mix, color, vec3 } from 'three/tsl'

const renderer = new THREE.WebGPURenderer()                // valt terug op WebGL 2 waar nodig

const material = new THREE.MeshStandardNodeMaterial()      // gewoon materiaal + "inpluggaten"
material.colorNode = mix(color('red'), color('blue'), uv().y)          // fragment: kleur
material.positionNode = positionLocal.add(vec3(0, sin(time), 0))      // vertex: positie
material.emissiveNode = color('yellow').mul(0.5)                       // fragment: zelf-licht
material.opacityNode = uv().x                                          // (met transparent: true)
```
Licht, schaduw en mist blijven werken: je vervangt alleen wat je inplugt.

**Spiekbrief: de bouwstenen**

| Node | Betekenis |
|------|-----------|
| `uv()` | 2D-coördinaat op het oppervlak (0..1, tenzij je het zelf anders maakt, zie stap 8) |
| `time` | seconden sinds de start |
| `positionLocal` / `positionWorld` | positie van het hoekpunt (object- / wereldruimte) |
| `normalLocal` | richting waarin het oppervlak wijst |
| `float(1)`, `vec2(…)`, `vec3(…)`, `color('#f00')` | waarden maken |
| `.add .sub .mul .div` | rekenen |
| `sin`, `cos`, `abs`, `pow`, `sqrt`, `min`, `max` | wiskunde |
| `mix(a, b, t)` | mengen: t=0 → a, t=1 → b |
| `step(rand, x)` | 0 als x < rand, anders 1 (een harde rand) |
| `smoothstep(a, b, x)` | zachte overgang van 0 naar 1 tussen a en b |
| `floor(x)` / `fract(x)` | geheel deel / kommagedeelte → **rasters** |
| `hash(x)` | “willekeurig” getal 0..1, altijd hetzelfde voor dezelfde x |
| `uniform(waarde)` | waarde uit JS; aanpassen met `.value` |
| `texture(tex, uv)` | een textuur uitlezen |
| `Fn(() => { … })()` | een shaderfunctie met meerdere stappen |
| `.toVar()` | een variabele die je kan aanpassen (`.addAssign`, `.mulAssign`) |

**Patronen die je steeds opnieuw gebruikt**

```js
// 1. Verloop: donker onderaan, licht bovenaan (gras)
mix(color('#123'), color('#9c6'), uv().y)

// 2. Golf die beweegt: sin(tijd + positie) → elke plek een andere fase (wind)
sin(time.mul(2).add(positionLocal.x.mul(0.3)))

// 3. Raster: in welke cel en waar in de cel? (ramen)
const cell = floor(uv().mul(10))     // welk vakje
const inCell = fract(uv().mul(10))   // positie in dat vakje, 0..1

// 4. Willekeur per cel (welk raam brandt)
const random = hash(cell.x.add(cell.y.mul(157)))

// 5. Masker: een rechthoek, cirkel of rand
const box = step(0.2, inCell.x).mul(step(inCell.x, 0.8))   // rechthoek in x
const circle = float(1).sub(smoothstep(0.4, 0.5, uv().sub(0.5).length()))

// 6. Eigen data per hoekpunt: attribute (bv. de maat van een dak)
//    JS:  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 2))
const roofSize = attribute('aSize', 'vec2')

// 7. Iets laten reageren op de game: uniform
const uPlayer = uniform(new THREE.Vector3())
// in de loop: uPlayer.value.copy(player.position)
```

**Stap-voor-stap: zo schrijf je een shader**
1. Begin met `colorNode = color('red')`. Werkt het materiaal? (Gebruik je `WebGPURenderer`?)
2. Voeg één bouwsteen toe en **toon hem als kleur**: `colorNode = vec3(fract(uv().mul(5)), 0)`. Je ziet meteen of de waarde klopt.
3. Bouw verder, één stap tegelijk.

**Debuggen:** shaders hebben geen `console.log`. **Maak waarden zichtbaar als kleur**: zwart = 0, wit = 1. Wil je weten of een textuur gelezen wordt? Vul ze helemaal (stap 6: `data.fill(255)`).

**⚠️ Het grootste denkverschil: `.toVar()`.**
```js
const position = positionLocal.toVar()
const worldZ = position.z.add(offset)     // dit is een FORMULE, geen getal!
position.z.addAssign(1)                   // ...dus worldZ verandert hier mee
const worldZ2 = position.z.add(offset).toVar() // dit is een KOPIE op dit moment
```

**In je eigen game:** water (golven in `positionNode`), lava (bewegende `uv` + `emissiveNode`), een hologram (`opacityNode` met strepen over `positionWorld.y`), een schild dat oplicht waar je geraakt wordt (uniform met het raakpunt), dissolve-effect (`hash` + drempel die stijgt), sneeuw op de bovenkant van objecten (`normalWorld.y`).

**Valkuilen:** `three` en `three/webgpu` door elkaar importeren; `*` i.p.v. `.mul()`; een uniform overschrijven (`u = …`) i.p.v. `u.value = …`; een vertex-effect op een geometry zonder segmenten (een vlak met 4 hoekpunten kan niet golven).

---

## 7. Instancing

**Wat?** Dezelfde geometry met hetzelfde materiaal **duizenden keren** tekenen in **één** keer.

**Hoe werkt het?** Elke `Mesh` = één **draw call**: de CPU zegt tegen de GPU “teken dit”. Die gesprekken zijn duur; na een paar duizend hapert je game. Een `InstancedMesh` stuurt **één** draw call met een lijst van **matrices** (positie + rotatie + schaal per kopie). De GPU tekent alle kopieën en past per kopie de juiste matrix toe in de vertex-shader.

```
80 000 × Mesh          → 80 000 draw calls  → 💀
1 × InstancedMesh      → 1 draw call         → 60 fps
```

**Recept**

```js
const count = 10_000
const trees = new THREE.InstancedMesh(treeGeometry, treeMaterial, count)

const dummy = new THREE.Object3D() // hulpobject om makkelijk een matrix te bouwen
for (let i = 0; i < count; i++) {
  dummy.position.set(Math.random() * 200 - 100, 0, Math.random() * 200 - 100)
  dummy.rotation.y = Math.random() * Math.PI * 2
  dummy.scale.setScalar(0.5 + Math.random())
  dummy.updateMatrix()
  trees.setMatrixAt(i, dummy.matrix)
  trees.setColorAt(i, new THREE.Color().setHSL(0.3, 0.6, 0.3 + Math.random() * 0.2)) // optioneel: kleur per kopie
}
scene.add(trees)
```

**Eén kopie later verplaatsen:**
```js
trees.setMatrixAt(42, dummy.matrix)
trees.instanceMatrix.needsUpdate = true
```

**Animeren: in de shader, niet in JS.** Het gras beweegt doordat de `positionNode` elk hoekpunt verschuift. In TSL is de instance-matrix al toegepast vóór je `positionNode`, dus `positionLocal` is daar de positie van het hoekpunt in het veld (stap 4). `instanceIndex` + `hash(instanceIndex)` geeft elke kopie een eigen willekeurig getal (bv. voor kleurvariatie).

**In je eigen game:** gras, bomen, stenen, sterren, munten, kogels, regen, menigtes, deeltjes, asteroïdenvelden.

**Valkuilen:** alle kopieën delen geometry én materiaal (een andere vorm = een andere InstancedMesh); `needsUpdate` vergeten; per frame duizenden matrices herberekenen in JS (doe het in de shader); raycasten tegen een enorme InstancedMesh is traag; met een meeschuivend veld `frustumCulled = false` zetten.

---

## 8. Een textuur als geheugen

**Wat?** Een textuur is niet alleen een afbeelding: het is een **2D-tabel met getallen** die de GPU razendsnel kan opzoeken. JavaScript kan erin schrijven, de shader kan ze lezen.

**Hoe werkt het? (het grasspoor)**
```
CPU: Uint8Array (64 × 1024)         GPU: texture(map, uv).r → 0..1
     "verf" 255 waar de auto rijdt  ──►   1 = gras plat, 0 = rechtop
     map.needsUpdate = true (upload)
```
Een uniform onthoudt één positie; een textuur onthoudt **duizenden** plekken. De kost hangt niet af van het aantal grassprieten.

**Recept**

```js
const width = 64, height = 64
const data = new Uint8Array(width * height)
const map = new THREE.DataTexture(data, width, height, THREE.RedFormat, THREE.UnsignedByteType)
map.magFilter = map.minFilter = THREE.LinearFilter
map.needsUpdate = true

// schrijven (CPU)
data[y * width + x] = 255
map.needsUpdate = true

// lezen (TSL): wereldpositie → 0..1
const u = positionWorld.x.add(halfSize).div(halfSize * 2)
const v = positionWorld.z.add(halfSize).div(halfSize * 2)
const value = texture(map, vec2(u, v)).r
```

**In je eigen game:** bandensporen, voetstappen in sneeuw, verf/graffiti, mist-of-war op een kaart, verbrande grond na een explosie, een minimap die “ontdekt” wordt.

**Valkuilen:** `needsUpdate` vergeten; verkeerde omrekening wereld → 0..1; bij een herhalende (`RepeatWrapping`) textuur vergeten oude stukken te wissen.

---

## 9. Licht, zwaailichten en wat licht kost

**Wat?** Er zijn twee manieren om iets te laten “lichten”, en het verschil is cruciaal.

| | **Emissive** | **Echte lichtbron** (`PointLight`, `SpotLight`, …) |
|---|---|---|
| Wat | het oppervlak heeft een kleur die niet donker wordt | verlicht andere objecten |
| Verlicht omgeving? | ❌ | ✅ |
| Kost | bijna niets | elke pixel van elk belicht materiaal rekent elk licht mee |
| Met bloom | gloeit ✨ | – |

**Hoe werkt het?** Het aantal lichten zit **ingebakken in de shaders**. Een licht toevoegen, verwijderen of `visible` wisselen dwingt Three.js om **alle** shaders opnieuw te compileren → het spel hapert.

**Recept: zwaailicht (stap 7–8)**

```js
// 1. lens: gloeit, verlicht niets
const lensMaterial = new THREE.MeshStandardMaterial({ color: '#2f6bff', emissive: '#2f6bff', emissiveIntensity: 0 })
const lens = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.2), lensMaterial)
lens.position.set(0.35, 1.86, 0)
car.add(lens) // kind van de auto → rijdt mee

// 2. echte lichtbron: verlicht de straat (optioneel, kost!)
const light = new THREE.PointLight('#2f6bff', 0, 12, 2) // kleur, sterkte, bereik, decay
light.position.copy(lens.position)
car.add(light)

// 3. knipperen: SterKTE aanpassen, NOOIT visible
function update(t) {
  const flash = (t * 3) % 1 < 0.2
  lensMaterial.emissiveIntensity = flash ? 8 : 0.3
  light.intensity = flash ? 25 : 0
}
```

**Licht-budget (stap 8):** 5 echte lichten (hemisphere, zon/maan, koplamp, 2 × zwaailicht), en die blijven er de hele tijd. Alle andere “lichten” zijn vals: ramen en neon (emissive + bloom), lantaarns en lichtvlekken onder lantaarns (een doorzichtig vlak met een zachte TSL-cirkel en `AdditiveBlending`), de lichtzuil boven de gewonde. Dag/nacht verandert alleen de **sterkte** (en één uniform `nightAmount`), nooit het aantal lichten.

**In je eigen game:** fakkels (emissive vlam + 1 licht dat zacht flikkert), lasers, UI-markers in de wereld, nachtlevels.

**Valkuilen:** lichten aan/uit zetten met `visible`; te veel PointLights (en zeker met schaduwen: een PointLight-schaduw = 6 schaduwkaarten); lichten toevoegen na het vooraf compileren.

---

## 10. Post-processing: bloom

**Wat?** Een effect op het **hele eindbeeld**, na het renderen. Bloom laat felle delen gloeien.

**Hoe werkt het?** (1) render de scene in een onzichtbare textuur, (2) neem enkel de pixels die feller zijn dan een **drempel**, (3) vervaag die sterk, (4) tel het resultaat op bij het origineel. In TSL is dat letterlijk een ketting van nodes.

**Recept (three r18x, WebGPURenderer)**
```js
import { pass } from 'three/tsl'
import { bloom } from 'three/addons/tsl/display/BloomNode.js'

const pipeline = new THREE.RenderPipeline(renderer)
const sceneColor = pass(scene, camera).getTextureNode('output')
pipeline.outputNode = sceneColor.add(bloom(sceneColor, 0.6, 0.4, 0.7)) // sterkte, straal, drempel

// in de loop: pipeline.render() i.p.v. renderer.render(scene, camera)
```
Zorg dat wat moet gloeien **feller** is dan de drempel (`emissiveIntensity` > 1) en de rest niet.

**In je eigen game:** neon, magie, lasers, zon, explosies. Andere effecten in `three/addons/tsl/display/`: depth of field, film grain, outline, …

---

## 11. Eindeloze werelden

**Wat?** De wereld lijkt oneindig, maar er bestaat altijd maar een klein stuk rond de speler.

**Hoe werkt het? Vier technieken:**

| Techniek | Wanneer | Voorbeeld |
|----------|---------|-----------|
| **Meeschuiven** | effen, zonder details | grond (`ground.position.z = player.z`) |
| **Meeschuiven in sprongen** | details die niet mogen “glijden” | grasveld per 40 m |
| **Recyclen** | vaste stukken die zich herhalen | weg- en stadstegels: achter je → naar voren |
| **Spawnen + opruimen** | elke keer anders | obstakels, verkeer |

**Recept: recyclen + spawnen**
```js
// recyclen
for (const tile of tiles) {
  if (tile.position.z + TILE / 2 < player.z - 30) tile.position.z += tiles.length * TILE
}
// spawnen
while (nextRowZ < player.z + 150) { spawnRow(nextRowZ); nextRowZ += spacing }
// opruimen (achterstevoren lopen bij splice!)
for (let i = things.length - 1; i >= 0; i--) {
  if (things[i].body.position.z < player.z - 30) {
    scene.remove(things[i].mesh); world.removeBody(things[i].body); things.splice(i, 1)
  }
}
```
De **mist** verbergt waar de wereld ophoudt.

**In je eigen game:** endless runners, flappy-achtige games, procedurele grotten, ruimteschieters.

**Valkuilen:** wel uit de scene, niet uit de physics-wereld verwijderen (of omgekeerd); niet opruimen (geheugen loopt vol); een oneerlijke rij spawnen (altijd een uitweg laten!).

---

## 12. Game-AI

**Wat?** Computergestuurde auto’s en voetgangers (autopilot, verkeer, voetgangers) zonder ingewikkelde AI.

**Hoe werkt het? Drie eenvoudige ideeën:**

1. **“Druk op dezelfde knoppen als de speler.”** De autopilot (stap 5) berekent `throttle` (−1..1) en `steer` (−1..1), dezelfde invoer als het toetsenbord. Zo werkt dezelfde rijcode voor speler én computer.
   ```js
   const desiredHeading = Math.atan2(target.x - pos.x, target.z - pos.z)
   let angle = desiredHeading - heading
   angle = Math.atan2(Math.sin(angle), Math.cos(angle)) // herleid naar -π..π
   const steer = THREE.MathUtils.clamp(angle * 2, -1, 1)
   ```
2. **Rijden op een raster** (verkeer, stap 8): een auto weet enkel *van welk kruispunt hij vertrok*, *in welke richting* en *hoe ver hij is* (`s`). Positie = kruispunt + richting × s + een stukje naar rechts (de rijstrook). Op het volgende kruispunt kiest hij willekeurig een nieuwe richting. Geen routes tekenen, toch eindeloos verkeer.
3. **Kijken vóór je** (remmen): staat er iets in een strook vóór mij?
   ```js
   const ahead = rx * dirX + rz * dirZ           // hoeveel meter vóór mij (dot product)
   const side = Math.abs(rx * -dirZ + rz * dirX) // hoeveel meter opzij
   if (ahead > 0 && ahead < 9 && side < 2.2) targetSpeed = 0
   ```

Voetgangers (stap 8) lopen van hoek naar hoek rond een blok en steken soms over. De **sirene** verandert beide: auto’s wijken uit en vertragen, voetgangers wachten met oversteken. Eén spelerskeuze die alle AI beïnvloedt: dat maakt een mechaniek betekenisvol.

**In je eigen game:** vijanden die je volgen of ontwijken, patrouilles (doelen afwisselen), een race-tegenstander die checkpoints afrijdt, NPC’s die rondwandelen.

---

## 13. Game state, moeilijkheid en HUD

**Game state:** één variabele die zegt in welke fase je zit.
```js
game.state = 'loading' | 'start' | 'playing' | 'gameover'
// in de loop: if (game.state === 'playing') { input, score, botsingen }
```
Schrijf een `resetGame()` die **alles** terugzet, in plaats van de pagina te herladen.

**Moeilijkheid als functie:** `maxSpeed: (afstand) => Math.min(36, 22 + afstand * 0.012)`. Eén plek om te tunen.

**Missie-lus (stap 8):** doel tonen (pijl, lichtzuil) → ter plaatse **stilstaan** (laadbalk) → nieuw doel. Met een **timer** per opdracht en een **schade-meter** (één getal dat bij elke fout stijgt; 100 = game over). Zeer herbruikbaar: koerier, taxi, brandweer, …

**HUD:** gewone HTML/CSS bovenop het canvas (`position: fixed; pointer-events: none`). Pop-ups = een div met een CSS-animatie (of GSAP!), daarna `remove()`.

---

## 14. Modellen laden, klonen en de preloader

**Een GLB afstemmen op je game:** controleer altijd **schaal** (1 eenheid = 1 m?), **richting** (voorkant naar +z?), **nulpunt** (op de grond?), en of **onderdelen een naam** hebben (`model.traverse(o => console.log(o.name))`).

**Meten i.p.v. raden:**
```js
const size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3())
```

**Eén keer laden, vaak gebruiken:**
```js
const templates = await Promise.all(urls.map((url) => loader.loadAsync(url))) // parallel
const taxi = templates[0].scene.clone() // deelt geometry en materialen → zuinig
```

**Preloader:**
```js
const manager = new THREE.LoadingManager()
manager.onProgress = (url, loaded, total) => bar.style.width = `${loaded / total * 100}%`
manager.onError = (url) => showError(url)
const loader = new GLTFLoader(manager)          // manager meegeven aan ELKE loader

const gltf = await loader.loadAsync('/models/car.glb')
await renderer.compileAsync(scene, camera)       // shaders vooraf compileren = geen hapering
hideLoader()
```
Modellen die pas later verschijnen (verkeer, vijanden) zet je even onzichtbaar in de scene tijdens `compileAsync` (“warm-up”, stap 8).

Lokaal laadt alles in een flits. Test met DevTools → *Network* → *Disable cache* + *Slow 4G*.

---

## 15. Geluid met de Web Audio API

**Wat?** Geluid maken en bewerken in de browser, zonder bestanden.

**Hoe werkt het?** Een **graaf van nodes** (zoals TSL!):
```
bron (OscillatorNode / BufferSource) → filter (BiquadFilter) → volume (GainNode) → ctx.destination 🔊
```

| Bouwsteen | Klank |
|-----------|-------|
| `OscillatorNode` `sine` / `square` / `sawtooth` / `triangle` | zacht / hol-retro / scherp-brommerig / tussenin |
| Ruisbuffer (`Math.random()`) | knal, crash, hihat, wind |
| Lowpass-filter | dof, ver weg |
| Gain met `exponentialRampToValueAtTime` | aanslag en uitsterven (envelope) |
| **LFO** (trage oscillator → parameter) | sirene, vibrato, wah |

**Recepten**
```js
const ctx = new AudioContext() // ⚠️ pas NA een klik/toets, anders blokkeert de browser

// korte "bliep"
function blip(freq) {
  const osc = ctx.createOscillator(), gain = ctx.createGain()
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0.1, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1)
  osc.connect(gain).connect(ctx.destination)
  osc.start(); osc.stop(ctx.currentTime + 0.1)
}

// sirene: een LFO bestuurt de toonhoogte
const tone = ctx.createOscillator()   // 510 Hz
const lfo = ctx.createOscillator()    // 0,8 Hz, blokgolf
const depth = ctx.createGain(); depth.gain.value = 75
lfo.type = 'square'; lfo.frequency.value = 0.8; tone.frequency.value = 510
lfo.connect(depth).connect(tone.frequency) // node → PARAMETER: 510 ± 75 Hz
```

**Muziek op tijd (radio):** `setTimeout` is niet precies genoeg. Gebruik een **lookahead scheduler**: elke 25 ms plan je de noten van de komende 0,1 s in op `ctx.currentTime` (`osc.start(exactTijdstip)`).

**Valkuilen:** `AudioContext` vóór een gebruikersactie; een oscillator twee keer `start()`en (kan niet: laat hem draaien en regel het volume); 30 geluiden tegelijk (rate-limit, zie `hit()`).

---

## 16. Performance-checklist

- [ ] **Draw calls:** veel gelijke objecten → `InstancedMesh`. Geometries en materialen **delen**.
- [ ] **Animatie van duizenden dingen** → in de shader, niet in JS.
- [ ] **Lichten:** zo weinig mogelijk echte lichten, vast aantal, nooit `visible` wisselen. Emissive + bloom + fake lighting voor de rest.
- [ ] **Schaduwen:** één schaduwlicht, met een schaduwcamera die de speler volgt.
- [ ] **Physics:** simpele shapes, `allowSleep`, opruimen wat ver weg is, vaste tijdstap.
- [ ] **Raycasting:** beperk de lijst met doelen.
- [ ] **Shaders vooraf compileren** (`compileAsync`) inclusief modellen die later verschijnen.
- [ ] **Meten:** DevTools → *Performance*, of `renderer.info` (aantal draw calls en driehoeken).
- [ ] **`setPixelRatio(Math.min(devicePixelRatio, 2))`**: een 3× retina-scherm rendert anders 9× zoveel pixels.
