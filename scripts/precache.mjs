import { readdir, readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
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
const paths = (await files(root)).filter(path => relative(root, path) !== 'sw.js').sort()
const template = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8')
const hash = createHash('sha256').update(template)
const assets = ['./']
for (const path of paths) {
  const name = relative(root, path).replaceAll('\\', '/')
  hash.update(name).update('\0').update(await readFile(path)).update('\0')
  assets.push('./' + name)
}
const version = hash.digest('hex').slice(0, 20)
await writeFile(join(root, 'sw.js'), template
  .replace('__BUILD_VERSION__', version)
  .replace('/* __PRECACHE_MANIFEST__ */ []', JSON.stringify(assets)))
console.log('Offline build:', version)
