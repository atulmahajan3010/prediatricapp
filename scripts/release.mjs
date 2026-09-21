import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const packagePath = path.join(root, 'package.json')
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
const versionParts = packageJson.version.split('.').map(Number)

if (versionParts.length !== 3 || versionParts.some(Number.isNaN)) {
  throw new Error(`Expected a numeric semver version, received: ${packageJson.version}`)
}

versionParts[2] += 1
packageJson.version = versionParts.join('.')
fs.writeFileSync(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`)
console.log(`Building Doctor Prescription App ${packageJson.version}`)

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const build = spawnSync(npmCommand, ['run', 'build'], { cwd: root, stdio: 'inherit' })
if (build.status !== 0) process.exit(build.status || 1)

const electronBuilder = spawnSync(npmCommand, ['exec', '--', 'electron-builder', '--win', 'portable', '--config.directories.output=release-portable'], {
  cwd: root,
  stdio: 'inherit'
})
process.exit(electronBuilder.status || 0)
