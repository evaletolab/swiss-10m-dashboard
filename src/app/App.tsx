import { useState } from 'react'
import { AssumptionsPanel } from '../components/AssumptionsPanel'
import { ChartCard } from '../components/ChartCard'
import { ComparisonGrid } from '../components/ComparisonGrid'
import { ConclusionBlock } from '../components/ConclusionBlock'
import { ScenarioSelector } from '../components/ScenarioSelector'
import { FertilityReplacementChart } from '../charts/FertilityReplacementChart'
import { GenevaPopulationChart } from '../charts/GenevaPopulationChart'
import { GrowthComparisonChart } from '../charts/GrowthComparisonChart'
import { SwitzerlandPopulationChart } from '../charts/SwitzerlandPopulationChart'
import { narrative } from '../content/narrative'
import assumptionsData from '../data/assumptions.json'
import chDemographyData from '../data/ch_demography.json'
import downloadRequestsData from '../data/download_requests.json'
import growthComparisonData from '../data/growth_comparison_ge.json'
import scenariosChData from '../data/scenarios_ch.json'
import scenariosGeData from '../data/scenarios_ge.json'
import summaryData from '../data/summary.json'
import { TARGET_YEAR } from '../lib/series'
import type { DemographyRow, GrowthComparisonRow, ScenarioName, ScenarioRow } from '../lib/types'

type Summary = {
  baseYear?: number | string | null
  geneva?: {
    baseYear?: number | string | null
  }
  fertility?: {
    latestRate?: number | string | null
    replacementRate?: number | string | null
    generationReplacementRatio?: number | string | null
    twoGenerationBase?: number | string | null
  }
}

function App() {
  const [scenario, setScenario] = useState<ScenarioName>('initiative_linear')
  const scenariosCh = scenariosChData as ScenarioRow[]
  const scenariosGe = scenariosGeData as ScenarioRow[]
  const chDemography = chDemographyData as DemographyRow[]
  const growthComparison = growthComparisonData as GrowthComparisonRow[]
  const summary = summaryData as Summary
  const downloadRequests = downloadRequestsData as Array<Record<string, unknown>>
  const baseYear = Number(summary.geneva?.baseYear ?? summary.baseYear ?? 2024)

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <section className="rounded-[2rem] bg-slate-950 px-6 py-10 text-white md:px-10 md:py-14">
        <div className="max-w-4xl">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-red-300">Simulation data-driven</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-6xl">{narrative.title}</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-200">{narrative.framing}</p>
        </div>
      </section>

      {downloadRequests.length > 0 ? (
        <section className="mt-8 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-950">
          <h2 className="text-lg font-semibold">Données à compléter</h2>
          <p className="mt-2 text-sm leading-6">{downloadRequests.length} demande(s) de téléchargement sont ouvertes. Le site fonctionne en mode mock, mais ces fichiers doivent être déposés aux destinations indiquées dans <code>data/generated/download_requests.md</code>.</p>
        </section>
      ) : null}

      <section className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <h2 className="text-xl font-semibold text-slate-950">Caricature médiatique</h2>
          <p className="mt-3 text-slate-600">Limiter = fermeture. Ne pas limiter = prospérité automatique. Ce cadrage masque les contraintes matérielles.</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <h2 className="text-xl font-semibold text-slate-950">Question technique réelle</h2>
          <p className="mt-3 text-slate-600">Quelle pente démographique, quelle capacité de logement, quels médecins, quelles écoles, quels transports et quels budgets ?</p>
        </div>
      </section>

      <ComparisonGrid baseYear={baseYear} targetYear={TARGET_YEAR} scenario={scenario} rows={growthComparison} />

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <ChartCard title="La Suisse ne remplace plus ses générations" description={narrative.fertility} sourceIds={['bfs_statpop_population_balance', 'mock_v1_sample']}>
          <FertilityReplacementChart rows={chDemography} summary={summary.fertility} />
        </ChartCard>
        <ChartCard title="Suisse : réel, tendance et initiative" description="Les observations, extrapolations maison et scénarios doivent rester distingués." sourceIds={['bfs_statpop_population_balance', 'mock_v1_sample']}>
          <SwitzerlandPopulationChart rows={scenariosCh} />
        </ChartCard>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <ChartCard title="Genève : réel, tendance et initiative" description="Les lignes séparent l’observé, la tendance historique et la trajectoire initiative traduite pour Genève." sourceIds={['ocstat_geneva_population', 'mock_v1_sample']}>
          <GenevaPopulationChart rows={scenariosGe} />
        </ChartCard>
        <ChartCard title="Croissance cumulée normalisée" description="Chaque série part de 0 % en 2010. La comparaison montre ce qui croît plus vite ou moins vite que la population et le PIB.">
          <div className="mb-4 flex justify-end"><ScenarioSelector value={scenario} onChange={setScenario} /></div>
          <div className="h-[300px]"><GrowthComparisonChart rows={growthComparison} scenario={scenario} toggleable /></div>
        </ChartCard>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <ChartCard title="Logement vs population et PIB" description="Croissance du stock de logements comparée aux références démographique et économique." sourceIds={['ocstat_geneva_housing', 'bfs_ocstat_geneva_gdp']}>
          <GrowthComparisonChart rows={growthComparison} scenario={scenario} domain="Logement" metric="housing_stock" />
        </ChartCard>
        <ChartCard title="Écoles / élèves vs population et PIB" description="Croissance des élèves et étudiants comparée aux références démographique et économique." sourceIds={['ge_education_annuary', 'bfs_ocstat_geneva_gdp']}>
          <GrowthComparisonChart rows={growthComparison} scenario={scenario} domain="Écoles" metric="students" />
        </ChartCard>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <ChartCard title="Santé vs population et PIB" description="Croissance du coût de santé par assuré comparée aux références démographique et économique." sourceIds={['ofsp_dashboard_health_insurance', 'bfs_ocstat_geneva_gdp']}>
          <GrowthComparisonChart rows={growthComparison} scenario={scenario} domain="Santé" metric="health_cost_per_insured" />
        </ChartCard>
        <ChartCard title="Transports publics vs population et PIB" description="Croissance des charges d’exploitation TPG comparée aux références démographique et économique." sourceIds={['tpg_annual_reports_finance', 'bfs_ocstat_geneva_gdp']}>
          <GrowthComparisonChart rows={growthComparison} scenario={scenario} domain="Transports publics" metric="operating_expenses" />
        </ChartCard>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <ChartCard title="Aide sociale vs population et PIB" description="Croissance cumulée des dépenses nettes d’aide sociale comparée à la démographie et au PIB. Si l’export cantonal Genève manque, le fichier OFS Suisse sert de proxy de croissance clairement libellé." sourceIds={['ocstat_geneva_social_assistance', 'bfs_fibs_social_assistance_ch', 'bfs_ocstat_geneva_gdp']}>
          <GrowthComparisonChart rows={growthComparison} scenario={scenario} domain="Aide sociale" metric="social_assistance_spending" />
        </ChartCard>
        <ChartCard title="Aide santé vs population et PIB" description="Croissance cumulée de la part cantonale des subsides d’assurance-maladie comparée à la démographie et au PIB." sourceIds={['ofsp_health_premium_subsidies', 'bfs_ocstat_geneva_gdp']}>
          <GrowthComparisonChart rows={growthComparison} scenario={scenario} domain="Aide santé" metric="health_premium_subsidy_cantonal" />
        </ChartCard>
      </section>

      <AssumptionsPanel rows={assumptionsData as Array<Record<string, string | number | null>>} />

      <section className="mt-8"><ConclusionBlock /></section>
    </main>
  )
}

export default App
