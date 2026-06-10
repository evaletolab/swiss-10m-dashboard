import { writeFile } from 'node:fs/promises'
import { fromRoot } from './paths.ts'

export type DownloadRequest = {
  id: string
  dataset: string
  missingFields: string[]
  reason: string
  preferredSource: string
  sourceUrl: string | null
  acceptedFormats: string[]
  destinationPath: string
  instructions: string
}

const requests = new Map<string, DownloadRequest>()

export function addDownloadRequest(request: DownloadRequest) {
  requests.set(request.id, request)
}

export function getDownloadRequests() {
  return [...requests.values()].sort((a, b) => a.id.localeCompare(b.id))
}

export async function writeDownloadRequests() {
  const all = getDownloadRequests()
  await writeFile(fromRoot('data/generated/download_requests.json'), `${JSON.stringify(all, null, 2)}\n`, 'utf8')
  const lines = ['# Demandes de téléchargement', '']
  if (all.length === 0) {
    lines.push('Aucune demande ouverte.')
  }
  for (const request of all) {
    lines.push(`## ${request.id}`)
    lines.push('')
    lines.push(`- Dataset: ${request.dataset}`)
    lines.push(`- Champs/années manquants: ${request.missingFields.join(', ')}`)
    lines.push(`- Raison: ${request.reason}`)
    lines.push(`- Source conseillée: ${request.preferredSource}`)
    lines.push(`- URL: ${request.sourceUrl ?? 'à compléter'}`)
    lines.push(`- Formats acceptés: ${request.acceptedFormats.join(', ')}`)
    lines.push(`- Destination: \`${request.destinationPath}\``)
    lines.push(`- Instruction: ${request.instructions}`)
    lines.push('')
  }
  await writeFile(fromRoot('data/generated/download_requests.md'), `${lines.join('\n')}\n`, 'utf8')
}
