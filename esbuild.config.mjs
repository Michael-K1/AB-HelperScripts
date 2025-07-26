// esbuild.config.mts
import { readdirSync } from 'node:fs'
import { build } from 'esbuild'


// Automatically find all handlers in src/lambda
const entries = readdirSync('src/lambda')
  .filter((file) => file.endsWith('.mts'))
  .map((file) => ({
    entryPoints: [`src/lambda/${file}`],
    outfile: `build/${file.split('.')[0]}/${file.replace(/\.mts$/, '.mjs')}`,
  }))

// Build all files in parallel
await Promise.all(entries.map((entry) =>
  build({
    entryPoints: entry.entryPoints,
    outfile: entry.outfile,
    platform: 'node',
    target: 'node22',
    format: 'esm',
    packages: 'external',
    sourcemap: true,
    bundle: true,
    outExtension: { '.js': '.mjs' }, // keep ESM extension
  })
))
