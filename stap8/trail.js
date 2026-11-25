// SPOORTEXTUUR – het geheugen van het gras
//
// Een uniform (stap 4b) onthoudt maar ÉÉN positie: het gras veert terug zodra de
// auto weg is. Voor een spoor moeten we ALLE plekken onthouden waar de auto reed.
//
// Oplossing: een zwart-wit TEXTUUR die als kaart over de baan ligt.
//   - JavaScript "verft" elke frame wit waar de auto rijdt  (CPU → texture.needsUpdate)
//   - de gras-shader leest de kaart: wit = platgereden      (GPU → texture(...))
//
//      x: -8 m ........ +8 m   (64 pixels breed, 4 pixels per meter)
//   z  ┌──────────────────┐
//   ↑  │      ░░██░░      │  ← spoor van de auto
//      │      ░░██░░      │
//      └──────────────────┘    256 m lang (1024 pixels), en dan begint hij opnieuw
//                              (RepeatWrapping): z = 0 en z = 256 vallen samen.
//
// Omdat de kaart zich herhaalt, wissen we steeds de rijen ver ACHTER de auto:
// die worden later opnieuw gebruikt voor de baan ver VÓÓR de auto.

import * as THREE from 'three/webgpu'
import { texture, vec2 } from 'three/tsl'

export function createTrail({ halfWidth = 8, length = 256, pixelsPerMeter = 4 } = {}) {
  const width = halfWidth * 2 * pixelsPerMeter // 64
  const height = length * pixelsPerMeter       // 1024
  const data = new Uint8Array(width * height)  // 1 byte per pixel: 0 = recht gras, 255 = plat

  const map = new THREE.DataTexture(data, width, height, THREE.RedFormat, THREE.UnsignedByteType)
  map.wrapS = THREE.ClampToEdgeWrapping
  map.wrapT = THREE.RepeatWrapping                     // eindeloos herhalen in z
  map.magFilter = map.minFilter = THREE.LinearFilter   // zachte randen tussen pixels
  map.needsUpdate = true

  const mod = (n, m) => ((n % m) + m) % m // modulo die ook voor negatieve getallen werkt

  // Verf een zachte cirkel op wereldpositie (x, z)
  function stamp(x, z, radius) {
    const cx = (x + halfWidth) * pixelsPerMeter
    const cz = z * pixelsPerMeter
    const r = radius * pixelsPerMeter
    for (let py = Math.floor(cz - r); py <= Math.ceil(cz + r); py++) {
      const row = mod(py, height)
      for (let px = Math.floor(cx - r); px <= Math.ceil(cx + r); px++) {
        if (px < 0 || px >= width) continue
        const distance = Math.hypot(px + 0.5 - cx, py + 0.5 - cz) / r // 0 in het midden, 1 aan de rand
        if (distance >= 1) continue
        const value = Math.min(255, (1 - distance) * 4 * 255)        // vol plat tot 75% van de straal, dan zachte rand
        const i = row * width + px
        if (value > data[i]) data[i] = value                          // nooit "terug omhoog" verven
      }
    }
    map.needsUpdate = true // stuur de nieuwe pixels naar de GPU
  }

  // Verf een lijn van (x0, z0) naar (x1, z1): bij hoge snelheid rijdt de auto
  // meer dan een pixel per frame, anders krijg je een stippellijn.
  function stampLine(x0, z0, x1, z1, radius) {
    const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, z1 - z0) * pixelsPerMeter))
    for (let i = 1; i <= steps; i++) {
      const t = i / steps
      stamp(x0 + (x1 - x0) * t, z0 + (z1 - z0) * t, radius)
    }
  }

  // Wis alle rijen tussen zFrom en zTo (wereld-z)
  function clear(zFrom, zTo) {
    for (let py = Math.floor(zFrom * pixelsPerMeter); py < Math.floor(zTo * pixelsPerMeter); py++) {
      const row = mod(py, height)
      data.fill(0, row * width, (row + 1) * width)
    }
    map.needsUpdate = true
  }

  function reset() {
    data.fill(0)
    map.needsUpdate = true
  }

  // TSL-helper: hoe plat is het gras op wereldpositie (x, z)? → 0..1
  // Wereldmeters omrekenen naar textuurcoördinaten (0..1).
  function sampleNode(xNode, zNode) {
    const u = xNode.add(halfWidth).div(halfWidth * 2)
    const v = zNode.div(length) // > 1 is geen probleem dankzij RepeatWrapping
    return texture(map, vec2(u, v)).r
  }

  return { stamp, stampLine, clear, reset, sampleNode }
}
