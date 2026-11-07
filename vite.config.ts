import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'
import { cpSync, existsSync, mkdirSync, readFileSync } from 'node:fs'

// R in the browser: webR (R compiled to WebAssembly) is served from the site itself, copied
// from the webr package into public/webr (not committed), so no outside download is needed.
// Source maps, the REPL and tests are left out. See NOTICE for its licences.
function webr(): Plugin {
  return {
    name: 'copy-webr',
    configResolved() {
      const src = fileURLToPath(new URL('./node_modules/webr/dist', import.meta.url)), out = fileURLToPath(new URL('./public/webr', import.meta.url))
      const version = JSON.parse(readFileSync(fileURLToPath(new URL('./node_modules/webr/package.json', import.meta.url)), 'utf8')).version
      if (existsSync(`${out}/VERSION-${version}`)) return
      mkdirSync(out, { recursive: true })
      cpSync(src, out, { recursive: true, filter: (f) => !/\.map$|[\\/](repl|tests)([\\/]|$)|esbuild\.d\.ts$|webr\.cjs$/.test(f) })
      cpSync(fileURLToPath(new URL('./node_modules/webr/LICENSE.md', import.meta.url)), `${out}/LICENSE.md`)
      cpSync(`${out}/LICENSE.md`, `${out}/VERSION-${version}`)
    },
  }
}

// Relative base so the built site works from any GitHub Pages path.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), webr()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
})
