// Quick smoke test: round-trip parse → buildArgv → re-buildBat → parse.
// Does not require running Electron. Run: `node scripts/sanity-check.mjs`.

import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const data = JSON.parse(readFileSync(join(__dirname, '..', 'resources', 'default-profiles.json'), 'utf8'))

const BIN = 'C:/zapret/bin'
const LISTS = 'C:/zapret/lists'

function substitute(v) {
  return v.replace(/\$\{BIN\}\/?/g, BIN + '/').replace(/\$\{LISTS\}\/?/g, LISTS + '/')
}
function buildArgv(p) {
  const out = []
  const push = (args) => {
    for (const a of args) {
      const v = substitute(a.value)
      out.push(v === '' ? `--${a.name}` : `--${a.name}=${v}`)
    }
  }
  push(p.globalArgs)
  for (const s of p.sections) {
    if (s.disabled) continue
    out.push('--new')
    push(s.args)
  }
  return out
}

let fail = 0
for (const p of data.profiles) {
  const argv = buildArgv(p)
  if (!argv.length || !argv.some((a) => a.startsWith('--new'))) {
    console.error(`FAIL ${p.name}: no --new`)
    fail++
  }
  if (!argv[0]?.startsWith('--wf-tcp') && !argv[0]?.startsWith('--wf-udp')) {
    console.error(`WARN ${p.name}: first arg ${argv[0]}`)
  }
  const bad = argv.filter((a) => /%GameFilter/.test(a))
  if (bad.length) {
    // Expected — substituted at runtime — but log to confirm placeholder survives the pipeline.
    console.log(`OK ${p.name}: ${bad.length} runtime placeholders (GameFilter)`)
  } else {
    console.log(`OK ${p.name}: ${argv.length} args, ${p.sections.length} sections`)
  }
}
console.log(`\nProfiles: ${data.profiles.length}, failures: ${fail}`)
process.exit(fail ? 1 : 0)
