import { defineConfig } from 'vite'
import { readdirSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// Elke map "stapX" met een index.html wordt automatisch een eigen pagina.
const root = fileURLToPath(new URL('.', import.meta.url))
const input = { main: root + 'index.html' }
for (const dir of readdirSync(root)) {
  if (dir.startsWith('stap') && existsSync(root + dir + '/index.html')) {
    input[dir] = root + dir + '/index.html'
  }
}

export default defineConfig({
  build: { rollupOptions: { input }, chunkSizeWarningLimit: 1500 },
})
