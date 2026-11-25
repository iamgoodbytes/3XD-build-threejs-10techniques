# Lessenplan – Three.js: van groene kubus tot eindeloze game

## Overzicht

| Stap | Onderwerp | Nieuwe begrippen | Duur (richtwaarde) |
|------|-----------|------------------|--------------------|
| 1 | Basis scene: groene kubus | scene, camera, renderer, mesh, licht, animatie-lus, delta time | 20–30 min |
| 2 | Voertuig (gefaket) | Group/hiërarchie, input, eigen bewegingslogica, volgcamera, lerp | 60–75 min |
| 3 | Physics: auto rijdt blokjes omver | cannon-es, world/body/shape, static/dynamic/kinematic, synchroniseren, fixed timestep, sleeping | 60–75 min |
| 4a | Shader-opwarmer (TSL) | WebGPURenderer, node material, `colorNode`, `positionNode`, `uv`, `time`, `mix`, `sin` | 30–40 min |
| 4b | Gras-shader (TSL) | InstancedMesh, `Fn`, `toVar`, uniform (JS → GPU), wind, interactie met de auto | 60–75 min |
| 5 | Raycasting | Raycaster, NDC, `setFromCamera`, intersect, mesh ↔ body, impuls, autopilot (`atan2`) | 60–75 min |
| 6 | Eindeloze game | modules, game states, recyclen/spawnen/opruimen, spoortextuur (DataTexture → shader), moeilijkheidscurve, Box3-botsing, static → dynamic, Web Audio | 2–3 × 75 min |
| 7 | Ambulance-model + preloader + sirene | GLTFLoader, model afstemmen, objecten op naam, `attach`, Box3 meten, LoadingManager, `compileAsync`, emissive vs. echt licht, LFO-modulatie (Web Audio) | 2 × 75 min |
| 8 | Nachtdienst: ambulance in de stad | TSL-ramen en -tegels (`floor`/`fract`/`hash`), dag/nacht met één uniform, bloom, fake lighting, top-down camera, stad als raster, verkeer- en voetganger-AI, botsingen zonder physics, missie-lus | 3 × 75 min |

**Doelgroep en voorkennis:** de studenten kennen **JavaScript, basis Three.js, meshes, textures, materials, GLB-modellen en GSAP**.
Nieuw voor hen, en dus waar het zwaartepunt ligt: **de game loop met delta time, physics, raycasting, instancing, shaders/TSL, licht als kostenpost (zwaailichten, bloom), eindeloze werelden, game-AI en Web Audio**.

> 📘 **[CONCEPTEN.md](CONCEPTEN.md)** is het naslagwerk voor de studenten: per techniek *wat het is*, *hoe het werkt* en een **recept** om het in hun eigen game te gebruiken. Het lessenplan hieronder is voor de lesgever en verwijst ernaar.
>
> **Brug vanuit GSAP:** studenten die GSAP kennen, denken in *tweens* (“beweeg van A naar B in 1 s”). Een game denkt in **toestand per frame** (“waar ben ik nu, wat is de input, waar ben ik over 1/60 s?”). Leg dit verschil expliciet uit in stap 1–2 (zie CONCEPTEN §1): het is het grootste denkkantelpunt van de hele reeks.

**Opzet:** elke stap staat in een eigen map (`stap1/`, `stap2/`, …) en bevat **de volledige code tot dat punt**.
Studenten kunnen zo twee stappen naast elkaar leggen (bv. met *Compare files* in VS Code) en zien wat er nieuw is.

### Project starten

```bash
npm install
npm run dev
```

Open de link die verschijnt (meestal http://localhost:5173). De overzichtspagina linkt naar elke stap.

---

## Stap 1 – Basis scene met een groene kubus

📁 `stap1/main.js`

### Leerdoelen

Na deze stap kan de student:

- de drie bouwstenen van elke Three.js toepassing benoemen: **scene, camera, renderer**;
- uitleggen dat een zichtbaar object (**mesh**) bestaat uit een **geometry** (vorm) en een **material** (uiterlijk);
- uitleggen waarom een `MeshStandardMaterial` **licht** nodig heeft;
- een **animatie-lus** schrijven die met **delta time** werkt;
- het 3D-assenstelsel lezen (x = rechts, y = omhoog, z = naar de kijker).

### Lesverloop

1. **Intro (2 min)** – Vergelijk met Unity/Blender: *scene* = hiërarchie, *camera* = camera, *renderer* = de “Play”-knop die elke frame een beeld maakt.
2. **Live coderen (10–15 min)** – Bouw `main.js` op in deze volgorde, en ververs na elk blok de browser:
   1. scene + camera + renderer → je ziet een lichtblauw scherm;
   2. kubus toevoegen → **zwart** blok! (er is nog geen licht);
   3. lichten toevoegen → groene kubus;
   4. `GridHelper` en `AxesHelper` → de ruimte wordt leesbaar;
   5. animatie-lus → de kubus draait;
   6. `OrbitControls` en resize-handler.
3. **Oefeningen (10 min)** – kies 1–2 basisoefeningen + de uitdaging – zie hieronder.
4. **Afsluiter (5 min)** – Vraag: “Wat gebeurt er als we `dt` weglaten en gewoon `+= 0.01` doen?” (antwoord: op een 144 Hz scherm draait de kubus meer dan 2× zo snel).

### Kernbegrippen

| Begrip | Uitleg |
|--------|--------|
| `Scene` | Container voor alle objecten, lichten, … |
| `PerspectiveCamera(fov, aspect, near, far)` | Kijkt zoals een echt oog: verre dingen zijn kleiner. Alles buiten `near`–`far` wordt niet getekend. |
| `WebGLRenderer` | Tekent de scene via de GPU op een `<canvas>`. |
| `Mesh = Geometry + Material` | Vorm + uiterlijk. Eén geometry kan door veel meshes gedeeld worden. |
| `AmbientLight` / `DirectionalLight` | Zacht licht overal / evenwijdige stralen zoals de zon. |
| Radialen | Three.js draait in radialen: `Math.PI` = 180°, `Math.PI / 2` = 90°. |
| Delta time (`dt`) | Tijd sinds de vorige frame (in seconden). Beweging × `dt` = beweging die op elk scherm even snel gaat. |
| `setAnimationLoop` | Roept onze functie op vlak voor elke schermverversing. |

### Oefeningen

**Basis**
1. Maak de kubus rood en 2× zo groot.
2. Zet een tweede kubus naast de eerste (tip: hergebruik `geometry`).
3. Vervang `BoxGeometry` door een `SphereGeometry(0.7, 32, 16)` of een `TorusKnotGeometry`.
4. Zet de `AmbientLight` uit. Wat zie je? En de `DirectionalLight`?

**Uitdaging**
5. Laat de kubus op en neer “zweven” met `Math.sin(time / 1000)`.
6. Maak een rij van 10 kubussen met een `for`-lus, elk met een andere kleur (`new THREE.Color().setHSL(i / 10, 0.7, 0.5)`).

### Veelgemaakte fouten

- **Zwart object** → geen licht in de scene, of het licht staat achter het object.
- **Niets te zien** → camera staat ín het object (positie `0,0,0`), of het object staat buiten `near`/`far`.
- **Uitgerekt beeld na resize** → `camera.updateProjectionMatrix()` vergeten.
- **Rotatie in graden** ingegeven (`rotation.y = 90`) → gebruik radialen (`Math.PI / 2`).
- **Waarschuwing `PCFSoftShadowMap has been removed`** (vanaf stap 2) → in three r18x bestaat die niet meer; gebruik `THREE.PCFShadowMap`. Online tutorials zijn vaak ouder dan je Three.js-versie: lees de console!

---

## Stap 2 – Een voertuig toevoegen (en faken)

📁 `stap2/main.js`

> **Kernidee:** we laten de auto bewegen met onze eigen wiskunde, zonder physics engine.
> De auto rijdt dwars door de kisten. Dat is de bedoeling: zo voelen studenten waarom we in stap 3 physics nodig hebben.

### Leerdoelen

Na deze stap kan de student:

- een object opbouwen uit meerdere meshes met `THREE.Group` en uitleggen wat **lokale vs. wereldcoördinaten** zijn;
- een **pivot** gebruiken om twee rotaties te scheiden (sturen rond Y, rollen rond X);
- toetsenbordinput bijhouden met een `Set` en `event.code`;
- beweging berekenen met **snelheid × richting × dt**, waarbij de richting volgt uit `sin`/`cos` van de hoek;
- een **volgcamera** maken met `localToWorld` en framerate-onafhankelijke `lerp`.

### Lesverloop

1. **Demo (5 min)** – Toon het eindresultaat. Laat de studenten zelf door de kisten rijden. *“Wat klopt hier niet?”*
2. **De auto bouwen (15 min)** – `createCar()`:
   - Teken eerst de hiërarchie op het bord:
     ```
     car (Group)            ← positie + richting van de hele auto
      ├─ body, cabin, lampen
      └─ wheelPivot (Group) ← rotation.y = sturen (enkel voorwielen)
          └─ wheel (Mesh)   ← rotation.x = rollen
     ```
   - Waarom een pivot? Probeer eerst stuur- én rolrotatie op dezelfde mesh te zetten. Het wiel gaat dan “wiebelen”, omdat Euler-rotaties in een vaste volgorde worden toegepast. Met twee geneste objecten heeft elk object één taak.
   - `tireGeometry.rotateZ(Math.PI / 2)`: we draaien de **geometry** zelf (één keer), niet de mesh. Zo blijft `rotation.x` van de mesh vrij om te rollen.
   - De koplampen (`emissive`) tonen meteen waar “vooraan” (+z) is.
3. **Input (5 min)** – `keydown`/`keyup` vullen een `Set`. In de lus vragen we op of een toets *nu* ingedrukt is. `event.code` (`KeyW`) is de fysieke toets, dus werkt ook op AZERTY.
4. **Rijgedrag (20 min)** – `updateCar(dt)`, in 4 delen:
   1. **Gas/rem/uitbollen** – snelheid verandert met versnelling × dt; `clamp` begrenst ze.
   2. **Sturen** – `heading += input × turnSpeed × (speed / maxSpeed) × dt`. Stilstaand kan je dus niet draaien, en achteruit stuurt omgekeerd, net als bij een echte auto.
   3. **Verplaatsen** – teken de eenheidscirkel: bij hoek `θ` is de voorwaartse richting `(sin θ, 0, cos θ)`.
   4. **Wielen animeren** – rolhoek = afgelegde afstand / straal (dat is de definitie van een radiaal). `MathUtils.damp` laat de stuurhoek zacht bijdraaien.
5. **Volgcamera (10 min)** – `updateCamera(dt)`:
   - `cameraOffset = (0, 4, -8)` is een punt *in de ruimte van de auto* (achter en boven). `car.mesh.localToWorld()` zet het om naar wereldcoördinaten, waarbij rotatie en positie van de auto meegerekend worden.
   - `lerp(target, t)` schuift elke frame een fractie richting het doel. `t = 1 - exp(-k·dt)` maakt dit **framerate-onafhankelijk** (gewoon `0.1` zou op 144 Hz sneller volgen dan op 60 Hz).
   - We lerpen ook het *kijkpunt*, anders schokt de camera bij snel sturen.
6. **Extra’s (5 min)** – schaduwen (`castShadow`/`receiveShadow`, shadow camera die de auto volgt), `Fog`, `HemisphereLight`.
7. **Oefeningen (15 min)**.

### Kernbegrippen

| Begrip | Uitleg |
|--------|--------|
| `THREE.Group` | Leeg object dat kinderen groepeert. Transformaties stapelen zich op (ouder × kind). |
| Lokale vs. wereldcoördinaten | `wheel.position` is t.o.v. de auto; `localToWorld()` geeft de positie in de wereld. |
| Pivot | Extra (lege) ouder om een rotatiepunt of -as te scheiden. |
| Heading | De richting van de auto als hoek rond Y. Richting = `(sin, 0, cos)`. |
| `MathUtils.clamp / damp / lerp` | Begrenzen / zacht naar een doel bewegen / lineair mengen. |
| `1 - Math.exp(-k * dt)` | Lerp-factor die op elk scherm hetzelfde gevoel geeft. |
| Z-fighting | Twee vlakken op exact dezelfde hoogte flikkeren → schuif één ervan een klein beetje op. |

### Oefeningen

**Basis**
1. Pas `settings` aan zodat de auto aanvoelt als (a) een zware vrachtwagen, (b) een go-kart.
2. Verander `cameraOffset` voor een bumpercam (`0, 1.2, 1.5`) en een bovenaanzicht (`0, 20, -1`).
3. Geef de auto een spoiler of een dakkoffer. Zit hij goed vast als je stuurt?

**Uitdaging**
4. **Boost:** houd `Shift` ingedrukt om tijdelijk sneller te gaan, met een grotere `camera.fov` voor een snelheidsgevoel (vergeet `updateProjectionMatrix()` niet).
5. **Body roll:** laat de carrosserie (niet de wielen!) een beetje kantelen in de bocht (`body.rotation.z` afhankelijk van `steer × speed`). Welk object in de hiërarchie moet je daarvoor draaien?
6. **Remlichten:** voeg rode lampen achteraan toe die oplichten (`emissiveIntensity`) als je remt.
7. Denkvraag: hoe zou je met de huidige code detecteren dat de auto een kist raakt? (Leidt naar `Box3`, en naar het idee van een physics engine in stap 3.)

### Veelgemaakte fouten

- **Auto rijdt zijwaarts** → `sin` en `cos` omgewisseld, of het model kijkt niet naar +z.
- **Sturen is omgekeerd** → onthoud dat de camera naar +z kijkt; links op het scherm is dan +x.
- **Wielen wiebelen bij sturen** → rol- en stuurrotatie op hetzelfde object gezet (gebruik een pivot).
- **Camera schokt** → `lookAt` direct op de auto in plaats van op een gelerpt kijkpunt, of lerp zonder dt.
- **Schaduw verdwijnt als je wegrijdt** → de shadow camera blijft op zijn plaats; laat `sun` en `sun.target` meebewegen.

> **Let op:** de blokjesauto blijft tot en met de eindeloze game de **referentie** voor schaal en assen (1 eenheid = 1 m, voorkant = +z, nulpunt op de grond).
> In stap 7 vervangen we hem door de ambulance uit de Kenney Car Kit en stemmen we die hierop af.

---

## Stap 3 – Physics: een auto die blokjes omver rijdt

📁 `stap3/main.js` · 📦 `cannon-es` (`npm install cannon-es`)

> **Kernidee:** er zijn nu **twee werelden**. cannon-es berekent wat er *gebeurt* (bodies), Three.js tekent wat je *ziet* (meshes).
> Elke frame kopiëren we positie + rotatie van body → mesh.

### Leerdoelen

Na deze stap kan de student:

- een physics-wereld opzetten met zwaartekracht en die elke frame laten **steppen**;
- het verschil uitleggen tussen **shape** (vorm voor botsingen), **body** (massa, snelheid, positie) en **mesh** (wat je ziet);
- de drie body-types kiezen: **STATIC**, **DYNAMIC**, **KINEMATIC**;
- physics en graphics **synchroniseren**;
- uitleggen waarom physics met een **vaste tijdstap** werkt.

### Lesverloop

1. **Recap + probleem (5 min)** – In stap 2 rijdt de auto door de kisten. Zelf botsingen schrijven? Dan heb je zwaartekracht, kantelen, wrijving, stapelen, … nodig. Daarvoor bestaat een physics engine.
2. **Physics-wereld (10 min)**
   - `new CANNON.World({ gravity })`. Zwaartekracht is gewoon een vector: zet ze eens op `(0, +2, 0)` of `(5, -9.82, 0)`.
   - De grond is een **STATIC** body met een `Plane`. Een Plane wijst naar +z, dus kantelen met `setFromEuler(-π/2, 0, 0)`, net zoals de Three.js `PlaneGeometry`.
   - `SAPBroadphase`: de engine checkt eerst grof “wie is in de buurt van wie” vóór de dure, precieze check.
3. **Blokjes (15 min)** – `createBlock()`:
   - Eén blokje = één mesh + één body. We bewaren ze samen in `blocks`.
   - ⚠️ `CANNON.Box` gebruikt **halve afmetingen** (`halfExtents`); `THREE.BoxGeometry` volle. Klassieke bug!
   - `mass: 1` maakt een body **DYNAMIC**: zwaartekracht en botsingen werken erop.
   - Geometry, shape en materialen worden **gedeeld** door alle blokjes (zuinig met geheugen).
   - `createWall`, `createPyramid`, `createTower` zijn gewone lussen: laat studenten zelf een vorm bedenken.
4. **De auto als KINEMATIC body (15 min)**
   - Vergelijk de drie types:

     | Type | Zwaartekracht? | Wordt geduwd? | Duwt anderen? | Voorbeeld |
     |------|---------------|---------------|---------------|-----------|
     | STATIC | nee | nee | ja | grond, muren |
     | DYNAMIC | ja | ja | ja | blokjes, ballen |
     | KINEMATIC | nee | nee | ja (oneindig sterk) | lift, bewegend platform, *onze auto* |

   - Waarom kinematic? Zo kunnen we **onze besturing van stap 2 houden**. Een echte physics-auto (dynamic, met wielen en vering) is een vak apart.
   - Het enige verschil met stap 2: we zetten niet meer `mesh.position`, maar **`carBody.velocity`**. Waarom niet gewoon de positie? Dan “teleporteert” de body elke frame en weet de engine niet hoe snel hij ging, dus ook niet hoe hard hij moet duwen. Probeer het: zet `carBody.position` direct en kijk hoe de blokjes reageren.
   - De physics-vorm van de auto is één simpele box. Physics-vormen zijn bijna altijd simpeler dan wat je ziet.
5. **De lus (10 min)** – teken de volgorde op het bord:
   ```
   input → carBody.velocity → world.step() → body → mesh → camera → render
   ```
   - `world.step(1/60, dt, 3)`: physics rekent altijd met **vaste stappen** van 1/60 s (anders gedraagt de simulatie zich op elk scherm anders en kan ze ontploffen bij een haperende frame). Is `dt` groter, dan doet cannon-es tot 3 inhaalstappen.
   - `syncPhysicsToMeshes()`: `mesh.position.copy(body.position)` en `mesh.quaternion.copy(body.quaternion)`. Dat werkt omdat beide objecten `x, y, z(, w)` hebben.
   - Waarom **quaternion** en niet `rotation`? cannon-es kent alleen quaternions. Kort: een quaternion is een rotatie zonder “gimbal lock”; je hoeft de wiskunde niet te kennen om ze te kopiëren.
6. **Stabiliteit (5 min)**
   - `solver.iterations = 20`: hoe vaak de engine per stap alle contacten “oplost”. Hoger = stabielere stapels, maar trager. Zet het op 5 en kijk hoe de torens wiebelen.
   - `allowSleep`: blokjes die stilliggen “slapen” en kosten dan bijna niets. **Maar:** de auto mag niet slapen (`carBody.allowSleep = false`), anders negeert hij zijn snelheid nadat hij even heeft stilgestaan.
7. **Oefeningen (15 min)**.

### Kernbegrippen

| Begrip | Uitleg |
|--------|--------|
| `World` | De physics-simulatie: zwaartekracht, alle bodies, `step()`. |
| `Shape` | Botsvorm: `Box`, `Sphere`, `Plane`, `Cylinder`, … (simpeler dan de mesh). |
| `Body` | Heeft massa, positie, snelheid, rotatie en één of meer shapes. |
| STATIC / DYNAMIC / KINEMATIC | Zie tabel hierboven. |
| Fixed timestep | Physics rekent in vaste stapjes, los van de framerate. |
| Synchroniseren | Elke frame `mesh ← body` kopiëren. |
| Solver iterations | Nauwkeurigheid van het oplossen van contacten. |
| Sleeping | Stilliggende bodies worden overgeslagen tot iets ze raakt. |
| Restitution / friction | Stuiterigheid / wrijving van een contact. |

### Oefeningen

**Basis**
1. Verander de zwaartekracht naar die van de maan (`-1.62`). Rij tegen de muur.
2. Geef de blokjes `mass: 10`. Wat verandert er, en waarom duwt de auto ze nog altijd weg? (Hint: kinematic.)
3. Bouw je eigen constructie: een trap, een brug of je initialen in blokjes.
4. Zet `restitution` op `0.9`. Wat gebeurt er?

**Uitdaging**
5. **Ballen:** voeg een `createBall()` toe met `CANNON.Sphere` en `THREE.SphereGeometry`. Let op: Sphere krijgt een straal, geen halve afmeting.
6. **Debugger:** installeer `cannon-es-debugger` en toon de physics-vormen als wireframe. Klopt de box van de auto met de mesh?
7. **Teleport vs. velocity:** vervang `carBody.velocity.set(...)` door het direct aanpassen van `carBody.position`. Beschrijf het verschil in hoe de blokjes reageren.
8. **Kanon:** druk op spatie om een blokje vanuit de auto naar voren te schieten (`body.velocity` in de kijkrichting van de auto).

### Veelgemaakte fouten

- **Blokjes zweven of zakken half in de grond** → volle i.p.v. halve afmetingen aan `CANNON.Box` gegeven.
- **Alles valt door de grond** → grond-Plane niet gekanteld (wijst dan naar +z).
- **Meshes bewegen niet** → `syncPhysicsToMeshes()` vergeten, of `world.step()` niet opgeroepen.
- **Auto beweegt niet meer na stilstaan** → de kinematic body is in slaap gevallen (`allowSleep = false`).
- **Blokjes ontploffen bij de start** → ze overlappen bij het aanmaken (positie verkeerd berekend).
- **Simulatie ontploft na een tabwissel** → `dt` niet begrensd, of `world.step` zonder vaste stap.

---

## Stap 4 – Shaders met TSL: bewegend gras

📁 `stap4a/main.js` (opwarmer) · `stap4b/main.js` (gras in de autoscene)

> **Kernidee:** een shader is een programmaatje dat de GPU **voor elk hoekpunt** (vertex) of **voor elke pixel** (fragment) **tegelijk** uitvoert.
> Met **TSL** (Three Shading Language) schrijf je die shader in JavaScript. Three.js vertaalt hem naar WGSL (WebGPU) of GLSL (WebGL 2).

### Waarom TSL?

- Geen aparte GLSL-strings: autocompletion, imports en gewone JS-functies.
- Hetzelfde materiaal werkt op WebGPU **en** WebGL 2 (automatische terugval).
- Je **breidt bestaande materialen uit** (`MeshStandardNodeMaterial`): licht, schaduw en mist blijven werken. Je overschrijft alleen wat je nodig hebt (`colorNode`, `positionNode`, …).

⚠️ **Overstap:** TSL werkt alleen met de `WebGPURenderer`. Vanaf stap 4 importeren we `three/webgpu` in plaats van `three`, en TSL-functies uit `three/tsl`. De rest van de code (meshes, lichten, cannon-es) blijft hetzelfde.

### Leerdoelen

Na deze stap kan de student:

- het verschil uitleggen tussen een **vertex-** en een **fragmentshader**;
- een node material maken en `colorNode` en `positionNode` instellen;
- TSL-bouwstenen gebruiken: `uv()`, `time`, `positionLocal`, `sin`, `mix`, `smoothstep`, `.add()/.mul()/…`;
- een **uniform** gebruiken om elke frame een waarde van JavaScript naar de GPU te sturen;
- duizenden objecten tekenen met een **InstancedMesh**.

### Deel A – Opwarmer (`stap4a`)

Drie vlakken naast elkaar, telkens één concept erbij:

| # | Wat | TSL | Concept |
|---|-----|-----|---------|
| 1 | Kleurverloop | `colorNode = vec3(uv().x, uv().y, 0.5)` | **uv** = 2D-coördinaat op het oppervlak (0..1). Elke pixel krijgt een eigen kleur zonder textuur. |
| 2 | Bewegende strepen | `sin(uv().x.mul(20).add(time.mul(3)))` + `mix(a, b, t)` | **time** is een ingebouwde node. `sin` geeft −1..1; `× 0.5 + 0.5` maakt er 0..1 van. |
| 3 | Wapperende vlag | `positionNode = positionLocal.add(vec3(0, 0, wave))` | **Vertex-shader**: hoekpunten verschuiven. Zonder genoeg segmenten (`64 × 64`) valt er niets te golven! |

**Lesverloop deel A (30 min)**

1. **Theorie (5 min)** – Teken de pipeline: *vertices → vertex-shader → rasterisatie → fragment-shader → pixels*. Benadruk: de GPU voert dezelfde code tegelijk uit voor **elk** hoekpunt of **elke** pixel. Er is geen lus.
2. **Live coderen (15 min)** – vlak 1, 2, 3. Laat studenten na elke stap de getallen aanpassen.
3. **Schrijfwijze (5 min)** – In TSL kan je niet `a * b` schrijven: elke bewerking is een methode (`a.mul(b)`). Je bouwt een **boom van nodes** die Three.js later naar shadercode vertaalt. JavaScript rekent hier dus *niets* uit: het beschrijft de berekening.
4. **Mini-oefening (5 min)** – Maak van vlak 1 een cirkel: `uv().sub(0.5).length()` geeft de afstand tot het midden; gebruik `step()` of `smoothstep()`.

### Deel B – Gras (`stap4b`)

**Lesverloop deel B (60–75 min)**

1. **Eén grasspriet (10 min)**
   - `PlaneGeometry(0.1, 1, 1, 4)`: smal, 4 segmenten in de hoogte zodat hij kan **buigen**.
   - `translate(0, 0.5, 0)`: de voet op `y = 0`, dan kunnen we hem gewoon op de grond zetten.
   - De x-coördinaten vermenigvuldigen met `(1 - y)` → een **punt** bovenaan. Dit doen we één keer op de CPU, in de geometry zelf.
2. **80 000 sprieten: InstancedMesh (10 min)**
   - 80 000 gewone meshes = 80 000 draw calls = haperend beeld. Een `InstancedMesh` is **één** draw call: één geometry, één material, maar per instantie een eigen **matrix** (positie/rotatie/schaal).
   - `dummy` is een hulp-`Object3D`: positie/rotatie/schaal instellen → `updateMatrix()` → `setMatrixAt(i, dummy.matrix)`.
3. **Kleur – `colorNode` (5 min)**: `mix(donkergroen, lichtgroen, uv().y)`. Omdat het een `MeshStandardNodeMaterial` is, werken licht en schaduw gewoon mee.
4. **Wind – `positionNode` (15 min)** – binnen `Fn(() => { ... })`:
   - `positionLocal.toVar()`: een **variabele** die we stap voor stap aanpassen.
   - Bij een InstancedMesh is de instance-matrix **al toegepast** vóór onze `positionNode`: `positionLocal` is dus de echte plek van het hoekpunt in het veld. Daardoor kunnen we x en z gebruiken voor golven die over het veld lopen.
   - `bend = uv().y²`: de voet (0) staat vast, de top (1) beweegt het meest, en het kwadraat geeft een natuurlijke kromming.
   - Twee sinussen: een snelle golf (`wave`) en trage windvlagen (`gust`). Speel met de getallen!
5. **De auto duwt het gras weg – uniform (15 min)**
   - `const uCarPosition = uniform(new THREE.Vector3())`: een waarde die voor **alle** sprieten dezelfde is en die we vanuit JS aanpassen.
   - In de lus: `uCarPosition.value.copy(car.mesh.position)`. Dit is **de brug tussen game-logica en GPU**.
   - In de shader: afstand tot de auto → `push = 1 - smoothstep(0.8, 2.5, afstand)` (1 vlakbij, 0 ver weg) → de top verschuiven in de richting *weg van de auto* (`away / afstand` = eenheidsvector) en wat naar beneden drukken.
6. **Oefeningen (15 min)**.

### Kernbegrippen

| Begrip | Uitleg |
|--------|--------|
| Vertex-shader | Draait per hoekpunt, bepaalt de positie → `positionNode`. |
| Fragment-shader | Draait per pixel, bepaalt de kleur → `colorNode`. |
| TSL | Shaders in JS; je bouwt een boom van nodes (`.add`, `.mul`, `sin`, …). |
| Node material | `MeshBasicNodeMaterial`, `MeshStandardNodeMaterial`, …: gewone materialen met “haakjes” om nodes in te pluggen. |
| `uv()` | 2D-coördinaat op het oppervlak, 0..1. |
| `time` | Seconden sinds de start, automatisch bijgewerkt. |
| `positionLocal` | Positie van het hoekpunt in objectruimte (bij instancing: na de instance-matrix). |
| `Fn`, `toVar()` | Een shaderfunctie met meerdere stappen; een aanpasbare variabele. |
| `uniform()` | Waarde van JS → GPU, gelijk voor alle vertices/pixels. Aanpassen via `.value`. |
| `mix`, `smoothstep` | Mengen tussen twee waarden; zachte overgang van 0 naar 1 tussen twee grenzen. |
| `InstancedMesh` | Veel kopieën van dezelfde geometry in één draw call. |

### Oefeningen

**Basis**
1. Maak het herfst: verander de kleuren naar geel/oranje.
2. Maak een **storm**: hogere frequentie en amplitude van de wind. Welke getallen pas je aan?
3. Verander de straal waarin de auto het gras wegduwt (`smoothstep(0.8, 2.5, …)`).
4. Halveer en verdubbel `GRASS_COUNT`. Merk je verschil in vloeiendheid? (Bekijk de FPS met de DevTools *Performance*-tab of `stats.js`.)

**Uitdaging**
5. **Windrichting als uniform:** maak `uWindDirection` (een `Vector2`) en laat de wind met de pijltjes of een slider van richting veranderen.
6. **Kleurvariatie per spriet:** gebruik `instanceIndex` en `hash(instanceIndex)` om elke spriet een iets andere tint te geven.
7. **Sporen:** het gras veert nu meteen terug als de auto weg is. Hoe zou je sporen laten liggen? (Denkvraag: een uniform onthoudt maar één positie… → render target/textuur met het spoor.)
8. **Vlag op de auto:** gebruik de vlag uit 4a als vlaggetje op het dak van de auto.

### Veelgemaakte fouten

- **`TypeError: … .mul is not a function`** → je gebruikt een gewoon JS-getal waar een node verwacht wordt (bv. `0.5.mul(…)`); gebruik `float(0.5)`, of zet het getal als argument (`x.mul(0.5)`).
- **`a * b` in TSL** → geeft `NaN`/rommel: gebruik `.mul()`.
- **Niets te zien / zwart scherm** → `WebGLRenderer` met een node material; gebruik `WebGPURenderer` uit `three/webgpu`.
- **Twee versies van Three.js** → gemengde imports `three` en `three/webgpu` in je eigen code. Kies er één.
- **Gras golft niet** → te weinig segmenten in de geometry, of `bend` is overal 0 (verkeerde uv-richting).
- **Shader-aanpassing zonder effect** → je past `uCarPosition = …` aan i.p.v. `uCarPosition.value.copy(…)`.

---

## Stap 5 – Raycasting

📁 `stap5/main.js`

> **Kernidee:** een **ray** is een halve rechte: een startpunt + een richting. De **Raycaster** zoekt welke objecten die ray raakt en geeft per treffer het **object**, het **raakpunt** en de **afstand**.
> Raycasting is overal in games: klikken op objecten, kogels, zichtlijnen, “staat mijn personage op de grond?”, sensoren, …

### Leerdoelen

Na deze stap kan de student:

- een muispositie omzetten naar **NDC** en een ray maken met `raycaster.setFromCamera()`;
- met `intersectObjects()` bepalen wat er geraakt wordt en waar, en de lijst met treffers begrijpen (gesorteerd op afstand);
- via `userData` van een geraakte **mesh** naar de bijbehorende **physics-body** gaan;
- een **impuls** geven op een specifiek punt (`applyImpulse`), met rotatie tot gevolg;
- een **raakpunt als doel** gebruiken en de auto er met `atan2` naartoe sturen;
- een debug-visualisatie maken om onzichtbare dingen (rays) zichtbaar te maken.

### Lesverloop

1. **Theorie (5 min)** – Teken op het bord: camera → muis op het scherm → ray de wereld in → eerste object dat ze raakt. Vraag: *“Waar heb je dit al gezien in games?”*
2. **Muis → NDC (5 min)**
   - Pixels (0..breedte, 0..hoogte, y naar **beneden**) → NDC (−1..1, y naar **boven**):
     `x = clientX / innerWidth * 2 - 1`, `y = -(clientY / innerHeight) * 2 + 1`.
   - `raycaster.setFromCamera(pointer, camera)` doet de rest: startpunt = camera, richting = door die pixel heen.
3. **Wat mag de ray raken? (5 min)** – `getRaycastTargets()` geeft enkel de grond + de blokjes. Bewuste keuze: het gras (80 000 instanties) zou traag zijn en we willen erdoorheen klikken. **Beperk altijd je lijst met doelen.**
4. **Hover + debug (15 min)**
   - We raycasten **elke frame** (niet enkel bij `pointermove`): de camera beweegt mee met de auto, dus ook als de muis stilstaat verandert wat eronder ligt.
   - `hits[0]` is de dichtstbijzijnde treffer. `hit.point` → magenta bolletje.
   - **Oplichten:** de blokjes **delen** materialen. `material.emissive` aanpassen zou dus alle blokjes van die kleur laten oplichten! Daarom wisselen we het materiaal van die ene mesh (`userData.baseMaterial` onthoudt het origineel).
   - **De ray als lijn:** vanuit de camera zie je de ray als een **punt**, want ze loopt recht van je weg. Daarom bevriezen we de laatste ray bij een klik: rij weg en bekijk hem van opzij. (`L` = aan/uit.)
   - `needsUpdate = true` en `computeBoundingSphere()`: als je vertices aanpast, moet je dat aan Three.js laten weten.
5. **Klik op een blokje = wegschieten (10 min)**
   - Van mesh naar body: `mesh.userData.body` (ingesteld in `createBlock`). **Dit patroon (mesh ↔ body via userData) heb je in elke physics-game nodig.**
   - `body.applyImpulse(impuls, relatiefPunt)`: het punt is relatief t.o.v. het **midden** van de body. Raak je het blokje aan de rand, dan gaat het tollen. Laat dit zien door op een hoekje te klikken!
   - `body.wakeUp()`: slapende bodies (stap 3) negeren anders de impuls.
6. **Klik op de grond = autopilot (15 min)**
   - De autopilot “drukt zelf op de toetsen”: hij geeft dezelfde `throttle` en `steer` (−1..1) terug als de speler. Zo hoeft de rest van `updateCar` niet te veranderen.
   - Gewenste richting: `Math.atan2(dx, dz)` (x en z in die volgorde, omdat onze forward `(sin, cos)` is).
   - Hoekverschil herleiden naar −π..π met `atan2(sin(a), cos(a))`, anders draait de auto soms 340° de verkeerde kant op.
   - **Leermoment – een bug in stap 2:** met `speedFactor = speed / maxSpeed` is de draaicirkel **altijd** `maxSpeed / turnSpeed ≈ 9 m`, ook als je traag rijdt. De eerste versie van de autopilot bleef daardoor rond dichtbije doelen cirkelen. Oplossing: vanaf 5 m/s al op volle kracht draaien (`clamp(speed / 5, -1, 1)`) en traag rijden in scherpe bochten. Toon eerst de oude versie en laat studenten zelf de oorzaak zoeken!
   - Gebruikt de speler W/A/S/D, dan wordt het doel geannuleerd.
7. **Oefeningen (15 min)**.

### Kernbegrippen

| Begrip | Uitleg |
|--------|--------|
| `Raycaster` | Zoekt snijpunten tussen een ray en objecten. |
| NDC | Normalized Device Coordinates: −1..1 in x en y, y naar boven. |
| `setFromCamera(ndc, camera)` | Ray vanuit de camera door een punt op het scherm. |
| `intersectObjects(list, recursive)` | Lijst met treffers `{ object, point, distance, face }`, dichtstbijzijnde eerst. |
| `userData` | Vrij object op elke `Object3D` om je eigen gegevens aan te hangen (bv. de body). |
| `applyImpulse(impuls, punt)` | Ogenblikkelijke duw; buiten het midden → ook rotatie. |
| `wakeUp()` | Slapende body wakker maken. |
| `Math.atan2(x, z)` | Hoek van een richting; omgekeerde van `(sin, cos)`. |

### Oefeningen

**Basis**
1. Maak de impuls sterker of zwakker. Wat gebeurt er met `direction.y * 8 + 3` als je die `+ 3` weglaat?
2. Laat bij een klik op een blokje ook de kleur permanent veranderen (let op de gedeelde materialen!).
3. Toon in de HUD de **afstand** tot het object onder de muis (`hit.distance`).

**Uitdaging**
4. **Sensorstralen:** schiet elke frame 3 rays vanuit de voorkant van de auto (links, midden, rechts) met `raycaster.set(origin, direction)` en `raycaster.far = 8`. Toon de afstand tot het dichtstbijzijnde obstakel, of laat de autopilot automatisch remmen.
5. **Ontploffing:** klik op de grond met `Shift` ingedrukt: alle blokjes binnen 4 m krijgen een impuls weg van het raakpunt (hoe dichter, hoe harder).
6. **Grondhoogte:** maak een heuvel (een geschaalde, half ingegraven bol) en gebruik een ray **naar beneden** vanuit de auto om hem op de juiste hoogte te zetten.
7. **Optimalisatie:** de lijst `getRaycastTargets()` wordt elke frame opnieuw gemaakt. Hoe zou je dat efficiënter doen?

### Veelgemaakte fouten

- **Raycaster raakt alles “een beetje naast”** → y niet omgekeerd bij NDC, of het canvas is niet even groot als het venster (gebruik dan `getBoundingClientRect()`).
- **Klik doet niets bij slapende blokjes** → `wakeUp()` vergeten.
- **Alle blokjes van dezelfde kleur lichten op** → gedeeld materiaal aangepast i.p.v. gewisseld.
- **Ray raakt de auto zelf of de helpers** → beperk de doelenlijst.
- **Impuls gaat de verkeerde kant op** → relatief punt in wereldcoördinaten gegeven i.p.v. t.o.v. het midden van de body.

---

## Stap 6 – Eindeloze rit (de game)

📁 `stap6/main.js` · `car.js` · `grass.js` · `trail.js` · `audio.js`

> **Kernidee:** alles uit stap 1–5 komt samen in een echte game. Nieuw zijn vooral **game-architectuur**-begrippen: toestanden, eindeloos genereren en opruimen, en moeilijkheid.

### Het spel

- De speler geeft **gas en remt** (`W/S`, `↑/↓`) en stuurt (`A/D`, `←/→`). Sturen **draait** de auto (max. ±20°); hij beweegt in de richting waarin hij kijkt. Stilstaand kan je dus niet opzij. De **topsnelheid** stijgt met de afstand.
- De baan is een **grasbaan**: het gras van stap 4 groeit over de hele baan. De auto **rijdt een spoor** in het gras dat blijft liggen.
- **Blokjes** omver rijden = +10 punten. Afstand = 1 punt per meter.
- **Rode barrières** raken = game over. Per rij is er altijd minstens één rijstrook zonder barrière.
- **Klik** op een barrière om ze op te blazen (raycasting + physics). Je hebt beperkte **ladingen** 💣: start met 3, +1 per 200 m, max 5.
- Startscherm, game-over-scherm, herstarten met `Spatie` zonder de pagina te herladen.
- Geluid via de **Web Audio API**: motor, tikjes, knal, crash. Allemaal gegenereerd, zonder geluidsbestanden.

### Leerdoelen

Na deze stap kan de student:

- een groter project opsplitsen in **ES-modules** (`export` / `import`);
- een game bouwen rond **toestanden** (`start` → `playing` → `gameover`) en een **reset** schrijven;
- een “eindeloze” wereld maken door te **recyclen** (weg), **mee te schuiven** (grond, gras) en te **spawnen/opruimen** (obstakels);
- moeilijkheid uitdrukken als **functie van de afstand**;
- uitleggen waarom een kinematic en een static body niet botsen, en dat oplossen met een **`Box3`**-test;
- een static body “losmaken” door hem te vervangen door een dynamic body;
- eenvoudige geluiden synthetiseren met oscillators, ruis, filters en gain.

### Architectuur (op het bord)

```
main.js
 ├─ car.js     createCar()            ← stap 2
 ├─ grass.js   createGrass()          ← stap 4b + spoor
 ├─ trail.js   createTrail()          ← nieuw: spoortextuur
 ├─ audio.js   createAudio()          ← nieuw
 └─ game loop:
     updateCar → world.step → syncMeshes → checkCrash → updateScore
       → updateWorld (recyclen/spawnen/opruimen) → updateCamera → updateHover → render
```

Elke module **exporteert een functie** die iets bouwt en teruggeeft. `main.js` beslist wat ermee gebeurt. Bespreek waarom `createAudio()` een object met methodes teruggeeft (`hit()`, `blast()`, …): de rest van de game hoeft niet te weten *hoe* een geluid gemaakt wordt.

### Lesverloop – sessie 1 (75 min): de wereld eindeloos maken

1. **Demo + analyse (10 min)** – Laat spelen. Vraag: *“De weg is oneindig. Hoeveel wegstukken zijn er?”* (Antwoord: 5.)
2. **Modules (10 min)** – Verhuis `createCar` uit stap 5 naar `car.js` en het gras naar `grass.js`. Let op: `import * as THREE from 'three/webgpu'` in **elke** module.
3. **Drie technieken voor “eindeloos” (25 min)**

   | Techniek | Wat | Waarom zo |
   |----------|-----|-----------|
   | **Meeschuiven** | Grasgrond (`groundMesh.position.z = carZ`) | Effen kleur: je ziet niet dat hij beweegt. |
   | **Meeschuiven in sprongen** | Gras (`floor(carZ / 40) * 40`) | Meeschuiven per frame laat de sprieten “meeglijden”. In sprongen van 40 m valt de verspringing weg in de mist. |
   | **Recyclen** | Wegstukken | Een stuk dat achter de auto ligt, springt 5 × 40 m naar voren. Altijd dezelfde 5 objecten: geen nieuwe geheugenallocaties. |
   | **Spawnen + opruimen** | Obstakels | Elke rij is anders, dus maken we nieuwe aan (`spawnAhead`) en verwijderen we oude (`removeObstacle`: uit de scene **én** uit de physics-wereld!). |

   - De **physics-grond** is een oneindige `CANNON.Plane`: die hoeft niet mee.
   - `SAPBroadphase.axisIndex = 2`: de wereld is lang in z, dus sorteren op z is het efficiëntst.
   - De **mist** verbergt waar de wereld ophoudt. Zet de mist uit en bekijk de rand!
4. **Spawnen van rijen (15 min)** – `spawnRow()`: rijstroken schudden, de eerste 1 of 2 krijgen een barrière, de rest misschien een blokjesgroep. **Ontwerpregel:** er is altijd minstens één vrije baan, anders is het spel oneerlijk.
5. **Moeilijkheid (5 min)** – het object `difficulty` bevat functies van de afstand (topsnelheid, afstand tussen rijen, kans op dubbele barrières). Eén plek om de hele curve te tunen.
   - **Gras + meeschuiven:** de grass-mesh schuift mee, dus `positionLocal` in de shader is niet de wereldpositie. Een uniform `offsetZ` (= `grass.position.z`) laat de shader zelf omrekenen: `worldZ = positionLocal.z + offsetZ`. Vergeet je dat, dan ligt het spoor op een andere plek dan de auto. Een mooie oefening om te laten debuggen!
   - Het gras staat voor 60% op de baan (`denseFraction`): dichter waar de speler kijkt, ijler waar niemand kijkt. Zo verdeel je een GPU-budget.
6. **Opdracht (10 min)** – voeg een vierde soort rij toe (bv. een slalom van torens).

### Lesverloop – het grasspoor (45–75 min, kan als aparte sessie)

**Probleem:** in stap 4b buigt het gras weg met een **uniform** (de positie van de auto). Een uniform onthoudt maar **één** waarde: zodra de auto weg is, veert het gras terug. Voor een spoor moet de shader weten waar de auto **ooit** gereden heeft.

**Oplossing: een textuur als geheugen.** Een textuur is niet alleen een afbeelding, het is gewoon een 2D-tabel met getallen die de GPU razendsnel kan lezen.

```
 CPU (trail.js)                                  GPU (grass.js)
 ──────────────                                  ──────────────
 Uint8Array 64 × 1024 (1 byte per pixel)         texture(map, uv).r → 0..1
 stamp(x, z): pixels rond de auto → 255   ──▶    flat = 1 → spriet plat + voorover
 map.needsUpdate = true (upload naar GPU)        colorNode: bleker waar plat
```

1. **De kaart (10 min)** – `DataTexture(data, 64, 1024, RedFormat)`: één kanaal (rood), 4 pixels per meter, 16 m breed × 256 m lang. Bespreek: een textuur maakt dit **onafhankelijk van het aantal sprieten**. Of er nu 10 000 of 200 000 sprieten zijn, de CPU verft altijd dezelfde paar pixels.
2. **Wereld → textuurcoördinaten (10 min)** – `u = (x + 8) / 16`, `v = z / 256`. Teken het op het bord. Vergelijk met NDC uit stap 5: telkens dezelfde truc, “een bereik omrekenen naar 0..1”.
3. **Eindeloos met een herhalende textuur (10 min)** – `wrapT = RepeatWrapping`: z = 10 en z = 266 vallen op dezelfde rij. Daarom **wissen** we de rijen ±60 m achter de auto (`trail.clear`). Die worden later hergebruikt voor de baan ver vóór de auto. Zelfde idee als de wegstukken recyclen, maar dan in pixels.
4. **Verven (10 min)** – `stamp()` verft een zachte cirkel. `stampLine()` verft tussen de vorige en de huidige positie: bij 120 km/u rijdt de auto 0,5 m per frame, dus anders krijg je een stippellijn. `Math.max(oud, nieuw)`: gras gaat nooit terug omhoog.
5. **Uitlezen in de shader (15 min)** – zie `grass.js`:
   - **vertex:** `flat` uit de kaart → `y × (1 − 0,92·flat)` (plat) en `z + 0,5·flat·uv.y` (voorover in de rijrichting); minder wind op platgereden gras.
   - **fragment:** `positionWorld` → dezelfde kaart → kleur mengen met bleekgroen.
   - **Wereldcoördinaten:** de grass-mesh schuift mee, dus `worldZ = positionLocal.z + offsetZ` (een uniform).
   - ⚠️ **`toVar()` als kopie:** `const worldZ = position.z.add(offsetZ)` zonder `toVar()` is een *formule* die later opnieuw uitgerekend wordt, met de al aangepaste `position`. Met `.toVar()` maak je een kopie op dat moment. Dit is het grootste denkverschil tussen TSL en gewoon JavaScript!
6. **Debuggen (5 min)** – Truc die we zelf gebruikt hebben: vul de hele kaart met 255 (`data.fill(255); map.needsUpdate = true`). Wordt al het gras plat? Dan werkt het uitlezen en zit een eventueel probleem bij het verven (of omgekeerd).

**Oefeningen spoor**
- Laat het spoor langzaam **herstellen**: trek elke seconde een klein beetje af van alle pixels (`data[i] = max(0, data[i] - 1)`). Wat kost dat op de CPU? (Tip: alleen de zichtbare rijen.)
- Maak **twee bandensporen** in plaats van één brede strook (stamp onder elk wiel).
- Laat geraakte blokjes ook een klein spoor achterlaten.

### Lesverloop – sessie 2 (75 min): gameplay en afwerking

1. **Game states (15 min)**
   - `game.state` bepaalt wat de lus doet: enkel in `playing` sturen, botsingen checken en score tellen.
   - `resetGame()` zet **alles** terug: obstakels weg, auto naar 0, wegstukken terug, nieuwe rijen. Bespreek waarom dit beter is dan `location.reload()` (geen laadtijd, geluid en GPU-resources blijven klaar).
2. **Botsen met barrières (15 min)**
   - **Probleem:** een KINEMATIC en een STATIC body botsen niet in cannon-es (geen van beide kan door een botsing bewegen, dus de engine slaat het paar over).
   - **Oplossing:** zelf testen met `THREE.Box3` (axis-aligned bounding boxes): `carBox.intersectsBox(barrierBox)`. Een iets kleinere box voor de auto voelt **eerlijker** voor de speler. Dat is een game-design-keuze, geen physics-keuze!
3. **Barrière opblazen (15 min)**
   - Raycasting zoals stap 5, maar enkel op **actieve barrières**.
   - Een STATIC body kan niet bewegen. We **vervangen** hem door een DYNAMIC body op dezelfde plek (`position.clone()`, `quaternion.clone()`) en geven een impuls **omhoog en opzij**, zodat hij niet terug voor de auto landt.
   - Ladingen: een eenvoudige **resource** die je verdient door te rijden. Zo wordt opblazen een keuze en geen spam.
4. **Score en blokjes (5 min)** – een blokje telt als het voor het eerst sneller dan 2 m/s beweegt (`counted`-vlag). Dat is simpel en werkt ook voor blokjes die door andere blokjes geraakt worden.
5. **Geluid (15 min)** – `audio.js`:
   - Een graaf van nodes: **bron → filter → gain → speakers** (lijkt op de TSL-nodes van stap 4!).
   - Motor: `sawtooth`-oscillator; de frequentie volgt de snelheid (`setTargetAtTime` om klikjes te vermijden).
   - Knal/crash: een buffer met **ruis** door een lowpass-filter dat snel dichtgaat, met een uitstervend volume (`exponentialRampToValueAtTime`).
   - ⚠️ Browsers blokkeren geluid tot de gebruiker iets doet: daarom `audio.init()` bij de eerste spatie.
   - Rate limiting in `hit()`: 12 blokjes tegelijk mogen geen 12 tikjes geven.
6. **Physics-tunneling (5 min)** – bij 120 km/u legt de auto 0,56 m per 1/60 s af, bijna een heel blokje. Daarom `world.step(1/120, dt, 10)`. Laat het verschil zien met `1/30`.
7. **Oefeningen / eigen uitbreiding (rest)**.

### Kernbegrippen

| Begrip | Uitleg |
|--------|--------|
| ES-modules | `export function …` / `import { … } from './x.js'`; elk bestand één verantwoordelijkheid. |
| Game state | Eén variabele die bepaalt in welke fase het spel zit. |
| Object recycling | Objecten hergebruiken i.p.v. verwijderen en opnieuw aanmaken. |
| Spawnen / opruimen | Nieuwe objecten maken vóór de speler, oude verwijderen erachter (scene **en** world). |
| Moeilijkheidscurve | Parameters als functie van de voortgang. |
| `Box3` / AABB | Rechthoekige doos langs de assen; snelle overlapping-test. |
| Tunneling | Snel object “springt” door een ander tussen twee physics-stappen. |
| Web Audio API | Geluid als graaf van nodes: oscillator/buffer → filter → gain → destination. |

### Oefeningen

**Basis**
1. Pas `difficulty` en `ACCELERATION`/`BRAKE` aan zodat het spel (a) heel rustig, (b) waanzinnig snel is.
2. Geef punten per meter **maal** de snelheid, zodat snel rijden beloond wordt (anders kan je veilig blijven kruipen).
3. Geef barrières een andere vorm (bv. smal maar hoog) en pas `BARRIER_SIZE` aan.
4. Laat de camera kort **schudden** bij een crash of een explosie.
5. Bewaar een **highscore** in `localStorage` en toon die op het startscherm.

**Uitdaging**
6. **Power-up:** een gele bol op de weg die +1 lading geeft (detectie met `Box3` of afstand).
7. **Near miss:** gebruik **sensorstralen** (stap 5, oefening 4) om een bonus te geven als je rakelings langs een barrière rijdt.
8. **Bochten:** de weg is nu altijd recht. Hoe zou je bochten maken? (Denkvraag: wat moet er dan gebeuren met de wegstukken, de camera en het spawnen?)
9. **Object pooling:** obstakels worden nu telkens nieuw aangemaakt. Schrijf een pool die verwijderde blokjes hergebruikt. Meet het verschil.
10. **Physics-chaos:** rondvliegende blokjes blijven nu op de weg liggen en duwen je niet. Maak de auto *dynamic* (of geef hem een terugslag) zodat blokjes je ook kunnen hinderen.

### Veelgemaakte fouten

- **Obstakel verdwijnt visueel maar je botst er nog tegen** → wel uit de scene gehaald, niet uit de physics-wereld (of omgekeerd).
- **Geheugen/FPS loopt op na een paar minuten** → obstakels nooit opgeruimd. Log `obstacles.length` en `world.bodies.length`.
- **Je botst niet met barrières** → je verwacht een physics-botsing tussen kinematic en static (die bestaat niet); gebruik `Box3`.
- **Geen geluid** → `AudioContext` gemaakt vóór een gebruikersactie, of het tabblad staat op mute.
- **Pagina scrolt bij spatie** → `e.preventDefault()` vergeten.
- **Gras buigt weg / spoor ligt op de verkeerde plek** → in de shader `offsetZ` vergeten bij het omrekenen naar wereldcoördinaten.
- **Spoor is onzichtbaar** → `map.needsUpdate = true` vergeten, of het spoor is smaller dan je denkt (zachte rand!). Test met de “alles vullen”-truc.
- **Spoor verschijnt plots vóór de auto** → rijen achter de auto niet gewist (de textuur herhaalt zich).
- **Auto schuift zijwaarts bij stilstand** → zijwaartse snelheid los van de rijsnelheid. Gebruik een stuurhoek: `velocity = (sin h, 0, cos h) × speed`.
- **Na herstarten vliegen er nog dingen rond** → `resetGame()` vergeet iets terug te zetten (snelheid, wegstukken, `nextRowZ`, …).

---

## Stap 7 – Een echt model (ambulance) + een preloader

📁 `stap7/main.js` · `car.js` (nieuw: model laden) · `preloader.js` (nieuw) · `emergency-lights.js` (nieuw) · `audio.js` (+ sirene) · 📦 `public/carkit/` (Kenney Car Kit, CC0)

> **Kernidee:** een 3D-model laden is meer dan `loader.load()`. Je moet het model **afstemmen** op je game (schaal, richting, nulpunt, onderdelen terugvinden), en de speler laten **wachten** tot alles klaar is.

### Leerdoelen

Na deze stap kan de student:

- een GLB-bestand laden met `GLTFLoader` en `loadAsync` + `await`;
- uitleggen wat er in een GLB zit (scene-hiërarchie, meshes, materialen, texturen) en waarom statische bestanden in `public/` staan;
- een model controleren op **schaal, richting en nulpunt**;
- onderdelen terugvinden **op naam** en de hiërarchie aanpassen met een **pivot** en `attach()`;
- afmetingen **meten** met `Box3` in plaats van getallen te raden;
- een **preloader** bouwen met `LoadingManager`, en shaders vooraf compileren met `renderer.compileAsync()`.

### Lesverloop

1. **Het bestand (10 min)**
   - Open `public/carkit/` en bekijk `ambulance.glb` in een viewer (sleep hem naar <https://gltf-viewer.donmccurdy.com/> of open hem in Blender).
   - Een GLB is een **doos**: hiërarchie (`body`, `wheel-front-left`, …, `door-left`), meshes, materialen. De textuur `Textures/colormap.png` zit **niet** in de GLB maar ernaast: alle Kenney-modellen delen één kleurenpalet-textuur. Daarom moet de hele map in `public/`.
   - **`public/`** in Vite: bestanden worden ongewijzigd geserveerd vanaf `/`. `public/carkit/ambulance.glb` → `/carkit/ambulance.glb`.
2. **Laden met async/await (10 min)**
   - `await loader.loadAsync(url)`: de code **wacht** tot het model er is. In `main.js` staat dit bovenaan de module (**top-level await**). Alles daaronder loopt pas als de ambulance geladen is, en daardoor kan de rest van de code `car` gewoon gebruiken.
   - `try/catch`: een ontbrekend bestand moet een duidelijke melding geven, geen zwart scherm.
3. **Afstemmen (15 min)** – de checklist bovenaan `car.js`:

   | Controle | Ambulance | Als het niet klopt |
   |----------|-----------|--------------------|
   | Schaal: 1 eenheid = 1 m? | ja (3,25 m lang) | `model.scale.setScalar(…)` |
   | Voorkant naar +z? | ja | `model.rotation.y = Math.PI` (of een tussen-Group) |
   | Nulpunt op de grond? | ja | `model.position.y = -box.min.y` |
   | Wielen apart en benoemd? | ja | wielen niet animeren, of zelf losmaken in Blender |

   Tip: `model.traverse((o) => console.log(o.name, o.type))` toont de hele hiërarchie.
4. **Wielen (15 min)**
   - Terugvinden **op naam**: `obj.name.startsWith('wheel')`, `name.includes('front')`.
   - Eerst verzamelen, dan pas de hiërarchie aanpassen: tijdens `traverse()` objecten verhangen geeft onvoorspelbare resultaten.
   - **Hetzelfde probleem als stap 2:** sturen + rollen op één object = wiebelen. Dus weer een **pivot**, nu in het midden van het wiel (`Box3.getCenter`).
   - `pivot.attach(wheel)` vs. `pivot.add(wheel)`: `attach` behoudt de **wereldpositie**; `add` zou de oude lokale positie van het wiel t.o.v. de pivot interpreteren, waardoor het wiel verschuift. Laat beide zien!
5. **Meten i.p.v. raden (5 min)** – `Box3().setFromObject(model).getSize()` geeft 1,5 × 1,8 × 3,25 m. Daaruit volgen de physics-box (`CANNON.Box`), de botsingsbox (`carBoxSize`) en de wielstraal. Vervang je later de ambulance door een ander model, dan past alles zich vanzelf aan.
6. **Preloader (15 min)** – `preloader.js` + de `#loader`-div in `index.html`:
   - `new THREE.LoadingManager()` en die meegeven aan **elke** loader: `new GLTFLoader(manager)`. Eén centrale plek voor alle voortgang.
   - `onProgress(url, loaded, total)`: let op, `total` kan **stijgen**. De GLB verwijst naar een textuur die pas ontdekt wordt als de GLB uitgepakt is (1/1 → 1/2 → 2/2).
   - `onError(url)`: toon een duidelijke fout.
   - **Shaders compileren** (`renderer.compileAsync(scene, camera)`): de eerste frame met 140 000 grassprieten en TSL-shaders hapert anders zichtbaar. Dit is vaak het traagste deel van het laden!
   - Volgorde: bestanden (0–80%) → shaders (80–100%) → uitfaden (CSS `transition` op `opacity`) → `remove()` → startscherm.
   - De game-state begint nu op `'loading'`: spatie doet niets tot alles klaar is.
   - **Demo in de klas:** lokaal laadt alles in een fractie van een seconde. Open DevTools → *Network* → vink **Disable cache** aan en kies **Slow 4G**. Herlaad, en de balk loopt zichtbaar vol.

### Sirene en zwaailichten (sessie 2, 45–60 min)

`H` zet de sirene en de zwaailichten aan of uit. De lichten blijven zwaaien na een crash; de sirene stopt dan.

#### Zwaailichten – `emergency-lights.js`

Een zwaailicht bestaat uit **twee** onderdelen, en het verschil tussen beide is de kern van deze les:

| Onderdeel | Wat | Verlicht het de omgeving? | Kost |
|-----------|-----|---------------------------|------|
| **Lens** | blokje met `emissive`-materiaal | ❌ nee, het object lijkt alleen zelf te gloeien | bijna niets |
| **PointLight** | echte lichtbron | ✅ ja: dak, gras, blokjes worden blauw | elke pixel van elk belicht materiaal rekent dit licht mee |

1. **Plaats bepalen (10 min)** – waar zit het dak? We lazen het af uit de geometrie: het hoogste dakdeel ligt op y = 1,80 m en loopt vooraan tot z ≈ 0,05 m. De lichten staan op `(±0,35; 1,86; −0,05)` en zijn **kinderen van het model** (`model.add`), dus ze rijden en draaien vanzelf mee. Zelfde idee als de wielen in stap 2!
2. **Eigen materiaal per lens (5 min)** – links en rechts flitsen om de beurt, dus elk een eigen materiaal. Herinnering aan de gedeelde materialen uit stap 5.
3. **Flitspatroon (10 min)** – alles is een functie van de tijd:
   ```
   cycle = (t × 1,5) % 1            → 0..1, anderhalve cyclus per seconde
   helft  = cycle < 0,5 ? links : rechts
   binnen de helft: aan van 0–0,2 en 0,3–0,5 → dubbele flits, dan pauze
   ```
   Laat studenten het patroon tekenen op een tijdlijn vóór ze de code lezen.
4. ⚠️ **Knipperen met `intensity`, niet met `visible` (10 min)** – het aantal zichtbare lichten zit ingebakken in de shaders. `light.visible = false` → Three.js moet de shaders van **alle** materialen opnieuw compileren (ook die van 140 000 grassprieten), en het spel hapert bij **elke flits**. Daarom staan de lichten altijd “aan” met `intensity = 0` als ze uit zijn. Ze worden ook toegevoegd **vóór** `compileAsync` in de preloader, zodat ze meteen in de gecompileerde shaders zitten. Demonstreer het verschil met `visible`!
5. **PointLight-parameters** – `new PointLight(kleur, intensiteit, distance = 12, decay = 2)`: `distance` = tot waar het licht reikt (begrenst ook de kost); `decay = 2` = natuurkundig correct afnemen met het kwadraat van de afstand.

#### Sirene – `audio.js`

Een Belgische/Nederlandse **tweetoon**: de toon springt tussen 435 Hz en 585 Hz.

```
  LFO: blokgolf 0,8 Hz (±1) ──► × 75 (gain) ──┐
                                               ▼  opgeteld bij .frequency
  toon: zaagtand 510 Hz ───────────────────────► lowpass 1800 Hz ──► volume ──► 🔊
```

1. **Modulatie (15 min)** – het nieuwe idee: een node verbinden met een **parameter** van een andere node (`lfo.connect(lfoDepth).connect(sirenTone.frequency)`). De LFO (*Low Frequency Oscillator*) is te traag om te horen; hij **bestuurt** de toonhoogte. 510 ± 75 = 435 / 585 Hz. Vergelijk met TSL in stap 4: ook daar stuurt een sinus (`sin(time)`) een andere waarde aan.
2. **Aan/uit = volume (5 min)** – oscillators kan je maar één keer `start()`en. Daarom laten we ze altijd draaien en schuiven we enkel het volume open of dicht (`setTargetAtTime` → geen klikjes).
3. **Experimenteer** – `lfo.type = 'sine'` en `lfo.frequency.value = 0.3` met een grotere diepte → een Amerikaanse “wail”. `lfo.type = 'triangle'` met `frequency = 4` → een “yelp”.

#### Oefeningen (sirene en lichten)
1. Maak de lichten rood/blauw (politie) of oranje (takeldienst).
2. Voeg twee extra lichten achteraan het dak toe. Wat merk je aan de FPS met 4 PointLights? Probeer `distance` kleiner te maken.
3. Laat de sirene automatisch aangaan boven 100 km/u.
4. **Dopplereffect (uitdaging):** maak de sirene hoger als je nadert en lager als je wegrijdt. (Tip: het geluid zit nu vast aan de auto, dus je hebt een tweede geluidsbron nodig, bv. een politieauto die je inhaalt, met `PannerNode` of zelf de frequentie aanpassen.)
5. Laat de lens ook een `PointLight`-schaduw werpen (`castShadow`). Waarom is dat duur? (6 schaduwkaarten per PointLight: een cubemap!)

### Kernbegrippen

| Begrip | Uitleg |
|--------|--------|
| Emissive | Materiaal dat “zelf gloeit” maar niets verlicht. |
| `PointLight` | Lichtbron die in alle richtingen schijnt; `distance` en `decay` bepalen het bereik. |
| Shader-recompilatie | Lichten toevoegen of (on)zichtbaar maken verandert alle shaders → haperen. |
| LFO / modulatie | Een trage oscillator die een parameter van een andere node bestuurt. |
| glTF / GLB | Standaard 3D-formaat voor het web (“de JPEG van 3D”); GLB = binaire versie in één bestand. |
| `GLTFLoader.loadAsync` | Laadt en pakt een model uit; geeft een Promise terug (`gltf.scene`). |
| `public/` | Map met statische bestanden die Vite ongewijzigd serveert. |
| Top-level await | `await` buiten een functie, bovenaan een module. |
| `getObjectByName` / `traverse` | Objecten in een hiërarchie zoeken. |
| `attach()` vs `add()` | Verhangen mét / zonder behoud van wereldpositie. |
| `Box3.setFromObject` | Afmetingen en midden van een object meten. |
| `LoadingManager` | Houdt de voortgang van alle loaders bij (`onProgress`, `onLoad`, `onError`). |
| `compileAsync` | Shaders vooraf compileren om haperingen te vermijden. |
| CC0 | Licentie: vrij te gebruiken, ook commercieel, zonder naamsvermelding (Kenney). |

### Oefeningen

**Basis**
1. Vervang de ambulance door een ander model uit `public/carkit/` (bv. `police.glb`, `race.glb`, `tractor.glb`). Wat past zich vanzelf aan dankzij het meten? Werken de wielen van de tractor? (Kijk naar de namen!)
2. Zet een tikfout in de bestandsnaam. Wat toont de preloader?
3. Gebruik *Slow 3G* in DevTools en beschrijf de stappen die de laadbalk doorloopt.

**Uitdaging**
4. **Achterdeuren:** de ambulance heeft `door-left` en `door-right`. Laat ze openzwaaien bij game over (pivot op het scharnier!).
5. **Autokeuze:** laad meerdere modellen via dezelfde `LoadingManager` en laat de speler op het startscherm kiezen met ←/→.
6. **Kegels en dozen:** vervang de blokjes door `cone.glb` en `box.glb` uit de kit. Laad elk model één keer en maak kopieën met `model.clone()`.

### Veelgemaakte fouten

- **404 op het model of de textuur** → bestand niet in `public/`, of de map `Textures/` ontbreekt naast de GLB.
- **Model is een reus of een mier** → andere schaal (cm vs m); meet met `Box3` en schaal.
- **Auto rijdt achteruit** → het model kijkt naar −z; draai het 180°.
- **Wiel verspringt na het verhangen** → `add()` gebruikt i.p.v. `attach()`.
- **Code loopt verder voor het model er is** → `await` vergeten (`car` is dan `undefined` of een Promise).
- **Balk blijft op 50% staan** → `onProgress` deelt door een `total` die later nog steeg; of er is een fout (kijk naar `onError` en de console).
- **Spel hapert bij de eerste seconde** → shaders niet vooraf gecompileerd.
- **Spel hapert bij elke flits van de zwaailichten** → `light.visible` gewisseld i.p.v. `intensity`.
- **Geen sirene** → `audio.init()` nog niet opgeroepen (geen gebruikersactie), of het volume staat op 0.

---

## Stap 8 – Nachtdienst: ambulance in de stad

📁 `stap8/` · `main.js` · `window-material.js` ★ · `city.js` · `daynight.js` · `traffic.js` · `pedestrians.js` · `vehicles.js` · `emergency-lights.js` · `audio.js` · `radio.js` · `grass.js` · `trail.js` · `preloader.js`

> **Kernidee:** een eigen top-down stadsgame. Je rijdt met de ambulance door een stad, haalt gewonden op en brengt ze naar het ziekenhuis vóór de tijd op is, zonder te botsen. Alles uit stap 1–7 komt terug. Het zwaartepunt ligt op **TSL** (ramen, tegels, dag/nacht) en op **eenvoudige AI** (verkeer en voetgangers).

### Het spel

- Bovenaanzicht met “noorden boven” (`C` = volgcamera). 70 auto’s (10 soorten) en 45 voetgangers. `W/S` gas/achteruit, `A/D` sturen, `H` sirene, `N` dag/nacht, `M` radio.
- **Missie:** een gewonde ligt ergens op de stoep (rode lichtzuil + pijl). Stop ernaast → laadbalk → “Gewonde ingeladen”. Rij naar het ziekenhuis (rood kruis) en stop in de groene zone → “Afgeleverd! +punten”. Elke gewonde heeft een **timer**.
- **Schade:** gebouw raken −10, auto −25, voetganger −30 (die valt om en staat weer op). Met de sirene aan ×1,5.
- **Handrem** (`Spatie`): driften door bochten, met bandensporen. **Sirene** (`H`): sneller rijden, maar breekbaarder. Met een gewonde aan boord verliest die ook gezondheid. Schade 100 = **TOTAL LOSS**.
- **Sirene:** auto’s vertragen en wijken uit, voetgangers wachten met oversteken. Zo heeft de sirene een echte functie in het spel.
- Een park met het gras uit stap 4: wie erdoor rijdt, laat een spoor na (stap 6).

### Sessie 1 (75 min) – De stad en de TSL-shaders ★

1. **De stad als raster (15 min)** – `city.js`. Kruispunt (i, j) = (i × 56, j × 56). Een blok = stoep + 2 × 2 gebouwen. Waarom een raster? Alles wordt eenvoudig te berekenen: waar de straten liggen, waar auto’s rijden, waar voetgangers wandelen.
2. **Instancing, overal (10 min)** – strepen, zebrapaden, lantaarnpalen, lampen en lichtvlekken zijn telkens **één** `InstancedMesh` (duizenden objecten, een handvol draw calls). Herhaling van stap 4.
3. **TSL-ramen (25 min)** – `window-material.js`, zie het eerdere stappenplan: uv in meters → `floor`/`fract` → `step`-rechthoek → `hash` per raam → licht aan/uit → kleur → `emissiveNode`. Toon elk tussenresultaat als kleur.
4. **TSL-tegelstoep (10 min)** – `city.js`, `sidewalkMaterial`: dezelfde truc met `positionWorld.xz` in plaats van uv. Laat studenten de tegelgrootte en de voegbreedte aanpassen.
5. **Daken met een gegenereerde textuur (15 min)** – `window-material.js`, stap 8. Drie soorten daken (grind, bitumen met naden, zonnepanelen), vlekken en een lichte dakrand, allemaal met `floor`/`fract`/`hash`, zonder afbeelding.
   - **Nieuw: een eigen attribute.** Voor de dakrand moet de shader weten hoe groot het dak is. In `city.js` geven we elk hoekpunt de afmetingen mee (`geometry.setAttribute('aSize', …)`), en in TSL lezen we ze met `attribute('aSize', 'vec2')`. Vergelijk: **uniform** = één waarde voor alles (de tijd, nacht), **attribute** = een waarde per hoekpunt (positie, uv, dakmaat).
   - Dakobjecten (airco's, trappenhuizen, watertanks) en het asfalt met herstelplekken: instancing en nog een kleine TSL-shader.
6. **Dag/nacht met één uniform (15 min)** – `daynight.js`: `nightAmount = uniform(0)`. Ramen, lampkoppen, lichtvlekken en neon vermenigvuldigen hun licht met `nightAmount`. In `main.js` schuift één regel (`nightAmount.value = …`) de hele stad van dag naar nacht. De **lichten** (zon, hemisphere, koplampen) en de bloom-sterkte veranderen enkel van **sterkte**, nooit van aantal (zie stap 7).

### Sessie 2 (75 min) – Rijden, botsen en AI

1. **Vrij rijden, slippen en driften (20 min)** – het rijmodel van stap 2/5, met één belangrijke uitbreiding:
   - Tot nu toe reed de auto **altijd** in de richting van zijn neus. Nu bewaren we de echte snelheid als **vector** (`velocity`), die elke frame naar “vooruit × snelheid” schuift: `velocity += (doel − velocity) × (1 − e^(−grip·dt))`. Zelfde lerp-truc als de camera!
   - **Veel grip** (10) = bijna meteen in de rijrichting = gewoon rijden. **Handrem** (spatie) = weinig grip (1,2): de auto draait, maar glijdt nog door in de oude richting = **drift**. Plus scherper sturen en afremmen.
   - **Slip** = de zijwaartse snelheid = dot product van `velocity` met de “rechts”-richting van de auto. Boven 2,5 m/s: bandensporen (een **ringbuffer** van 800 streepjes in één InstancedMesh: nieuwe overschrijven de oudste) en een piepend geluid (ruis door een smal filter, volume = slip).
   - **Sirene als risico-keuze:** topsnelheid 72 → 108 km/u en sneller optrekken, maar botsingen ×1,5 schade. Een goede game-mechaniek geeft de speler een *afweging*, geen gratis voordeel.
2. **Botsen zonder physics engine (20 min)** – de ambulance = **twee cirkels** (voor en achter). Gebouw = rechthoek. Dichtstbijzijnde punt op de rechthoek (`clamp`) → afstand < straal? → duw terug en bots terug. Auto’s en voetgangers: cirkel tegen cirkel. Bespreek: waarom hier geen cannon-es? (Een stad van rechthoeken en cirkels is snel en voorspelbaar zelf te berekenen; cannon-es gebruiken we nog voor de kegels en dozen.)
3. **Verkeer (20 min)** – `traffic.js`: positie = kruispunt + richting × s + rijstrook naar rechts. Op een kruispunt een willekeurige nieuwe richting. Remmen met het dot product (“wat staat er vóór mij?”), wachten als het kruispunt bezet is, uitwijken voor de sirene. De mesh schuift zacht naar zijn logische positie (`lerp`), zodat bochten vloeiend lijken.
4. **Voetgangers (15 min)** – `pedestrians.js`: figuurtjes uit vormen, benen aan een heup-pivot (stap 2) die zwaaien met `Math.sin`. Lopen van hoek naar hoek, soms oversteken via het zebrapad. Het verkeer stopt voor overstekers.
5. **Opdracht (10 min)** – laat voetgangers zwaaien naar de ambulance als de sirene aan staat.

### Sessie 3 (75 min) – De missie en afwerking

1. **Missie-lus (20 min)** – `spawnPatient()` en `updateMission()`: doel kiezen → lichtzuil + pijl → **stilstaan** op de plek vult een laadbalk → volgend doel. Timer per gewonde = route-afstand ÷ 5 m/s + marge.
2. **Lichtzuil (10 min)** – nog een TSL-shader: een open cilinder met `opacityNode = (1 − uv.y) × puls`. Onderaan fel, bovenaan weg, en hij ademt mee met `sin(time)`.
3. **Navigatiepijl (10 min)** – `atan2` van ambulance naar doel (stap 5) → de pijl draait rond de ambulance.
4. **Top-down camera (10 min)** – `camera.up = (0, 0, 1)` zodat scherm-boven = noorden; hoogte en vooruitkijken groeien met de snelheid. Waarom lage gebouwen? Een perspectiefcamera van bovenaf laat hoge gebouwen “omvallen” naar de randen van het scherm. Leuk, maar ze mogen het zicht niet blokkeren.
5. **Eigen uitbreiding (25 min)** – zie oefeningen.

### Oefeningen

**Basis**
1. Pas `DAMAGE` en de timerformule aan. Maak een “makkelijke” en een “moeilijke” modus.
2. Voeg een tweede ziekenhuis toe, en laat de pijl naar het dichtstbijzijnde wijzen.
3. Maak de TSL-tegels groter, of geef het park een ander tegelpatroon.
4. Verander het akkoordenschema van de radio.

**Uitdaging**
5. **Garage:** een blok waar je je schade kan laten herstellen (stilstaan + laadbalk, zoals de missie).
6. **Regen:** InstancedMesh van 5 000 strepen die vallen in de vertex-shader (`fract(time …)`), plus natte straten ’s nachts.
7. **Minimap:** een tweede, orthografische camera die de hele stad toont in een hoekje (`renderer.setViewport`/`setScissor`).
8. **Spoedgeval:** soms twee gewonden tegelijk; de speler kiest wie eerst.

### Veelgemaakte fouten

- **Alle gebouwen hebben dezelfde ramen** → uv-verschuiving per gebouw vergeten.
- **Ramen branden overdag** → `emissiveNode` niet vermenigvuldigd met `nightAmount`.
- **Haperen bij dag/nacht wisselen** → lichten aan/uit gezet (`visible`) i.p.v. hun sterkte aangepast.
- **Auto rijdt door gebouwen** → botsing pas gecontroleerd vóór de beweging, of de rechthoeken kloppen niet met de gebouwen.
- **Verkeer schokt in bochten** → mesh direct op de logische positie gezet i.p.v. er zacht naartoe te schuiven.
- **Laadbalk vult niet** → “stilstaan” te streng (`STOP_SPEED`) of de zone te klein.
