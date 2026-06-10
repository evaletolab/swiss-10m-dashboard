import { writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { ensureDir, fromRoot } from '../lib/paths.ts'

const premiumArchives = [
  { year: 2011, url: 'https://opendata.bagnet.ch/?r=/download&path=L1ByYWVtaWVuL0FyY2hpdl9QcmFlbWllbl8yMDExLnppcA%3D%3D' },
  { year: 2013, url: 'https://opendata.bagnet.ch/?r=/download&path=L1ByYWVtaWVuL0FyY2hpdl9QcmFlbWllbl8yMDEzLnppcA%3D%3D' },
  { year: 2015, url: 'https://opendata.bagnet.ch/?r=/download&path=L1ByYWVtaWVuL0FyY2hpdl9QcmFlbWllbl8yMDE1LnppcA%3D%3D' },
  { year: 2017, url: 'https://opendata.bagnet.ch/?r=/download&path=L1ByYWVtaWVuL0FyY2hpdl9QcmFlbWllbl8yMDE3LnppcA%3D%3D' },
  { year: 2019, url: 'https://opendata.bagnet.ch/?r=/download&path=L1ByYWVtaWVuL0FyY2hpdl9QcmFlbWllbl8yMDE5LnppcA%3D%3D' },
  { year: 2021, url: 'https://opendata.bagnet.ch/?r=/download&path=L1ByYWVtaWVuL0FyY2hpdl9QcmFlbWllbl8yMDIxLnppcA%3D%3D' },
  { year: 2023, url: 'https://opendata.bagnet.ch/?r=/download&path=L1ByYWVtaWVuL0FyY2hpdl9QcmFlbWllbl8yMDIzLnppcA%3D%3D' },
  { year: 2025, url: 'https://opendata.bagnet.ch/?r=/download&path=L1ByYWVtaWVuL0FyY2hpdl9QcmFlbWllbl8yMDI1LnppcA%3D%3D' },
]

export async function downloadOfsp() {
  await ensureDir('data/raw/ofsp/manual')
  await ensureDir('data/raw/ofsp/archives')
  const url = process.env.OFSP_LAMAL_PREMIUMS_URL
  if (url) {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`OFSP download failed: ${response.status}`)
    await writeFile(fromRoot('data/raw/ofsp/lamal_premiums.csv'), Buffer.from(await response.arrayBuffer()))
  } else {
    console.warn('[download:ofsp] current premiums skipped: missing OFSP_LAMAL_PREMIUMS_URL')
  }

  if (process.env.OFSP_DOWNLOAD_ARCHIVES !== 'true') {
    console.warn('[download:ofsp] archive premiums skipped: set OFSP_DOWNLOAD_ARCHIVES=true to download large ZIP files')
    return
  }

  for (const archive of premiumArchives) {
    const output = `data/raw/ofsp/archives/Archiv_Praemien_${archive.year}.zip`
    if (existsSync(fromRoot(output))) {
      console.log(`[download:ofsp] archive ${archive.year} already exists`)
      continue
    }
    try {
      const response = await fetch(archive.url)
      if (!response.ok) throw new Error(`status ${response.status}`)
      await writeFile(fromRoot(output), Buffer.from(await response.arrayBuffer()))
      console.log(`[download:ofsp] archive ${archive.year} downloaded`)
    } catch (error) {
      console.warn(`[download:ofsp] archive ${archive.year} skipped: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
}
