import { readdir, writeFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
const root = fileURLToPath(new URL('../dist/', import.meta.url))
async function files(dir) {
  const result = []
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, item.name)
    result.push(...(item.isDirectory() ? await files(path) : [path]))
  }
  return result
}
const assets = ['./', ...(await files(root)).filter(path => !path.endsWith('sw.js')).map(path => './' + relative(root, path).replaceAll('\\', '/'))]
await writeFile(join(root, 'sw.js'), `const CACHE='msp-${Date.now()}';const ASSETS=${JSON.stringify(assets)};self.addEventListener('install',event=>{self.skipWaiting();event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)))});self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))));self.clients.claim()});self.addEventListener('fetch',event=>{if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy))}return response})))})`)
