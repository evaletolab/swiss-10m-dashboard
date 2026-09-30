import { writeJson } from '../lib/csv.ts'
import { writeSources } from '../lib/sources.ts'
import { assertPostsClosed, buildLamalModel } from './build.ts'

const model = await buildLamalModel()
assertPostsClosed(model)
await writeJson('data/generated/lamal.json', model)
await writeSources()
console.log(`lamal.json écrit, coûts 2024 ${model.national.find((row) => row.id === 'costs')?.y2024 ?? 'absents'} millions`)
