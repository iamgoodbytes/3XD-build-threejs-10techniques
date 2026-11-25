// Controleert of de codefragmenten in de slides nog overeenkomen met de echte code.
// Gebruik: node slides/check-snippets.mjs
//
// Elke regel van een snippet moet (zonder inspringing) voorkomen in het bestand uit `file`.
// Uitzonderingen: lege regels en eigen notities die beginnen met "// …" of "// in ".

import { readFileSync } from 'node:fs'
import content from './content.js'

let problems = 0
for (const [stepId, step] of Object.entries(content)) {
  step.slides.forEach((slide, n) => {
    for (const code of [].concat(slide.code || [])) {
      const path = code.file.split(' · ')[0]
      const source = new Set(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8').split('\n').map((l) => l.trim()))
      const lines = code.src.replace(/^\n+|\s+$/g, '').split('\n')
      lines.forEach((line, i) => {
        const t = line.trim()
        if (!t || t.startsWith('// …') || t.startsWith('// in ')) return
        if (!source.has(t)) {
          problems++
          console.log(`✗ ${stepId} slide ${n + 1} "${slide.title}" (${path}) regel ${i + 1}:\n    ${t}`)
        }
      })
      for (const h of code.hl || []) {
        if (h < 1 || h > lines.length) {
          problems++
          console.log(`✗ ${stepId} slide ${n + 1}: markering ${h} valt buiten de snippet (${lines.length} regels)`)
        }
      }
    }
  })
}
console.log(problems ? `\n${problems} probleem/problemen gevonden` : '✓ alle snippets komen overeen met de code')
process.exit(problems ? 1 : 0)
