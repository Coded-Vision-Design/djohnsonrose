// Picks the newest iPhone simulator on the runner and prints it for $GITHUB_ENV.
import { execFileSync } from 'node:child_process'

const { devices } = JSON.parse(execFileSync('xcrun', ['simctl', 'list', 'devices', 'available', '-j'], { encoding: 'utf8' }))

const phones = Object.entries(devices)
  .filter(([runtime]) => runtime.includes('SimRuntime.iOS-'))
  .flatMap(([runtime, list]) =>
    list
      .filter((device) => device.name.startsWith('iPhone'))
      .map((device) => ({ ...device, version: runtime.split('SimRuntime.iOS-')[1].replace(/-/g, '.') })),
  )
  .sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true }))

// A plain model, such as "iPhone 16", has the most common screen size.
const newest = phones.filter((device) => device.version === phones[0]?.version)
const pick = newest.find((device) => /^iPhone \d+$/.test(device.name)) ?? newest[0]
if (!pick) throw new Error('No iPhone simulator is available on this runner.')

console.log(`IOS_UDID=${pick.udid}`)
console.log(`IOS_VERSION=${pick.version}`)
console.log(`IOS_NAME=${pick.name}`)
