import { downloadBfsPxweb } from './download_bfs_pxweb.ts'
import { downloadOcstat } from './download_ocstat.ts'
import { downloadOfsp } from './download_ofsp.ts'
import { downloadOfl } from './download_ofl.ts'
import { ensureDataDirs } from '../lib/paths.ts'
import { writeSources } from '../lib/sources.ts'

async function main() {
  await ensureDataDirs()
  await downloadBfsPxweb()
  await downloadOcstat()
  await downloadOfsp()
  await downloadOfl()
  await writeSources()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
