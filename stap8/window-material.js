// ★ DE TSL-SHADER VAN STAP 8: verlichte ramen, zonder één textuur
//
// Eén materiaal voor ALLE gebouwen. De shader tekent op elke gevel een raster van
// ramen. Per raam beslist een "willekeurig" getal (hash) of het licht aan is,
// welke kleur het heeft en of het flikkert (tv).
//
// Hoe weet de shader waar de ramen moeten komen?
// In city.js hebben we de uv-coördinaten van elk gebouw omgerekend naar METERS:
//   uv = (0, 0) linksonder op de gevel, uv = (12, 30) = 12 m naar rechts, 30 m hoog.
// Elk gebouw krijgt daarbovenop een eigen "verschuiving" van een veelvoud van 600 m,
// zodat elk gebouw andere ramen krijgt (zie buildingId hieronder).
//
//      ┌──┬──┬──┐   ← 1 cel = 2 m breed × 3 m hoog (1 verdieping)
//      │▓▓│  │▓▓│     ▓▓ = raam met licht
//      ├──┼──┼──┤
//      │  │▓▓│  │
//      └──┴──┴──┘

import * as THREE from 'three/webgpu'
import { uv, time, floor, fract, hash, step, mix, color, vec2, float, normalLocal, abs, sin, min, attribute } from 'three/tsl'
import { nightAmount } from './daynight.js'

export const WINDOW_CELL = { width: 2, height: 3 } // meter
export const BUILDING_ID_SIZE = 600                // meter: uv-verschuiving per gebouw (veelvoud van 2 én 3)

export function createWindowMaterial() {
  const material = new THREE.MeshStandardNodeMaterial({ roughness: 0.8, metalness: 0.1 })

  // ---- 1. In welke cel (raam) zitten we, en waar binnen die cel? ----
  const meters = uv()                                                     // in meter (zie city.js)
  const cellCoord = meters.div(vec2(WINDOW_CELL.width, WINDOW_CELL.height))
  const cell = floor(cellCoord)   // geheel getal: kolom en verdieping   bv. (3, 7)
  const inCell = fract(cellCoord) // kommagedeelte: positie in de cel   bv. (0.4, 0.6)

  // ---- 2. Elk gebouw een eigen nummer ----
  const buildingId = floor(meters.div(BUILDING_ID_SIZE))

  // ---- 3. "Willekeurig" getal per raam ----
  // hash(x) geeft voor hetzelfde x altijd hetzelfde getal tussen 0 en 1 terug,
  // maar voor x en x+1 totaal verschillende getallen. Perfect voor "willekeur per raam".
  // We maken één getal uit kolom, verdieping en gebouw (de vermenigvuldigers zijn willekeurige priemgetallen).
  const windowSeed = cell.x.add(cell.y.mul(157)).add(buildingId.x.mul(311)).add(buildingId.y.mul(73))
  const random = (offset) => hash(windowSeed.add(offset))

  // ---- 4. Is dit pixel een raam? (rechthoek binnen de cel) ----
  // step(a, b) = 1 als b >= a, anders 0. Vier keer step = binnen een rechthoek.
  const isWindow = step(0.2, inCell.x).mul(step(inCell.x, 0.8))
    .mul(step(0.25, inCell.y)).mul(step(inCell.y, 0.75))

  // Geen ramen op het dak: de normaal (richting van het vlak) wijst daar omhoog
  const isWall = float(1).sub(step(0.5, abs(normalLocal.y)))

  // ---- 5. Licht aan of uit? ----
  // ±38% van de ramen brandt. Door de tijd erbij op te tellen springen ramen af en toe
  // aan of uit (elk raam op een ander moment) → de stad "leeft".
  const isLit = step(0.62, fract(random(1).add(time.mul(0.015))))

  // ---- 6. Kleur: meestal warm lamplicht, soms het blauwe licht van een tv ----
  const isTv = step(0.85, random(2))
  const windowColor = mix(color('#ffc46b'), color('#6fa8ff'), isTv)
  // tv's flikkeren: helderheid tussen 0,5 en 1, elk aan een eigen tempo
  const flicker = mix(float(1), sin(time.mul(random(3).mul(15).add(5))).mul(0.25).add(0.75), isTv)

  // ---- 7. Naar het materiaal ----
  // colorNode = de "verf" (reageert op licht). emissiveNode = licht dat het oppervlak ZELF geeft
  // (en dat de bloom straks laat gloeien).
  // Gevel- en dakkleur per gebouw: steen, beton of blauwgrijs (zoals platte daken van bovenaf)
  const buildingRandom = hash(buildingId.x.add(buildingId.y.mul(13)))
  const facade = mix(mix(color('#8a7f73'), color('#5d6b86'), step(0.5, buildingRandom)), color('#a39a8c'), step(0.8, buildingRandom))
  const glass = color('#1d2740')
  const wallColor = mix(facade, glass, isWindow.mul(isWall))

  // ---- 8. HET DAK: een gegenereerde textuur, ook zonder afbeelding ----
  // Probleem: om een rand rond het dak te tekenen, moet de shader weten hoe GROOT het dak is.
  // Oplossing: een eigen ATTRIBUTE. In city.js geven we elk hoekpunt van het gebouw
  // de afmetingen mee (aSize = breedte, diepte). Een attribute is data per hoekpunt,
  // net als position en uv – een uniform is één waarde voor alles.
  const roofSize = attribute('aSize', 'vec2')
  const roof = meters.sub(buildingId.mul(BUILDING_ID_SIZE)) // positie op het dak in meter: (0,0) tot (breedte, diepte)

  // afstand tot de dichtstbijzijnde rand → opstaande rand (dakopstand) van 0,5 m
  const edge = min(min(roof.x, roof.y), min(roofSize.x.sub(roof.x), roofSize.y.sub(roof.y)))
  const isParapet = float(1).sub(step(0.5, edge))

  // korrel: elk blokje van 12 cm een iets andere tint (grind / ruw bitumen)
  const grain = hash(floor(roof.mul(8)).x.add(floor(roof.mul(8)).y.mul(57.0)).add(buildingId.x))
  // vlekken: grote plekken van 3 m die iets donkerder zijn (vuil, regen)
  const stain = hash(floor(roof.div(3)).x.add(floor(roof.div(3)).y.mul(17.0)).add(buildingId.y))

  // drie soorten daken, gekozen per gebouw:
  const gravel = mix(color('#8d8a83'), color('#6f6c66'), grain)                                  // grind
  const seams = step(0.94, fract(roof.x.div(1.2)))                                              // naden om de 1,2 m
  const bitumen = mix(mix(color('#3b3d42'), color('#2f3135'), grain), color('#1f2024'), seams)  // zwart dak met naden
  const panelCell = fract(roof.sub(1.5).div(vec2(1.1, 1.8)))                                    // zonnepanelen van 1 × 1,7 m
  const panelInside = step(0.06, panelCell.x).mul(step(panelCell.x, 0.94)).mul(step(0.05, panelCell.y)).mul(step(panelCell.y, 0.95))
  const inPanelArea = step(1.5, edge)                                                            // niet tegen de rand
  const solar = mix(gravel, mix(color('#c9cdd4'), color('#1c2a4a'), panelInside), inPanelArea)

  const roofType = hash(buildingId.x.mul(7).add(buildingId.y))
  let roofColor = mix(gravel, bitumen, step(0.45, roofType))
  roofColor = mix(roofColor, solar, step(0.8, roofType))
  roofColor = mix(roofColor, roofColor.mul(0.82), step(0.7, stain))   // vlekken
  roofColor = mix(roofColor, color('#b3aea4'), isParapet)             // lichte rand

  const isRoof = step(0.5, normalLocal.y)
  material.colorNode = mix(wallColor, roofColor, isRoof)
  // × nightAmount: overdag geven de ramen geen licht, 's nachts wel (zie daynight.js)
  material.emissiveNode = windowColor.mul(isWindow).mul(isWall).mul(isLit).mul(flicker).mul(1.1).mul(nightAmount)

  return material
}
