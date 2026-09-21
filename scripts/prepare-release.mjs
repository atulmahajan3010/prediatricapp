import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outputDirs = [
  path.join(root, 'release-portable'),
  path.join(root, 'release-installer'),
  path.join(root, 'latest-release')
]

function removeIfExists(target) {
  if (!target) return
  try {
    fs.rmSync(target, { recursive: true, force: true })
  } catch {
    // Ignore transient Windows file-lock races from stale temp folders.
  }
}

outputDirs.forEach((outputDir) => {
  removeIfExists(outputDir)
  removeIfExists(path.join(outputDir, 'win-unpacked'))
  removeIfExists(path.join(outputDir, 'win-unpacked.tmp'))
})

console.log(`Prepared fresh release directories: ${outputDirs.join(', ')}`)
