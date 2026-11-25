// DAG / NACHT – één uniform voor de hele stad
//
// nightAmount = 0 → dag, 1 → nacht. Alle materialen die licht "geven" (ramen, lantaarns,
// lichtvlekken) gebruiken deze ene uniform in hun TSL-code. In main.js schuiven we hem
// zacht van 0 naar 1 (toets N) → de hele stad gaat tegelijk aan of uit.
//
// Dat is de kracht van een uniform: één getal in JavaScript, duizenden pixels die reageren.

import { uniform } from 'three/tsl'

export const nightAmount = uniform(0)
