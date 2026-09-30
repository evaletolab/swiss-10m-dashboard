import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartCard } from '../components/ChartCard'
import lamal from '../data/lamal.json'
import { colors } from '../lib/colors'
import { formatNumber, formatPercent, toNumber } from '../lib/format'

const page = lamal

type Level = (typeof page.national)[number]
type Share = (typeof page.posts2024)[number]
type Premium = (typeof page.premiums)[number]
type Subsidy = (typeof page.subsidies)[number]

function cell(value: number | null, digits = 0): string {
  return formatNumber(value, digits)
}

function rate(value: number | null): string {
  return formatPercent(value, 1)
}

function part(value: number | null): string {
  const parsed = toNumber(value)
  if (parsed === null) return 'donnée manquante'
  return `${formatNumber(parsed, 1)} %`
}

const tooltipStyle = {
  backgroundColor: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: 12,
  color: '#0f172a',
}

function tooltipNumber(value: unknown, digits = 0): string {
  return formatNumber(typeof value === 'number' ? value : null, digits)
}

function statusLabel(status: string | null): string {
  if (status === 'retropolated') return 'rétropolé'
  if (status === 'provisional') return 'provisoire'
  if (status === 'estimated') return 'estimé'
  return ''
}

function LevelTable({ rows }: { rows: Level[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="text-slate-500">
          <tr>
            <th className="py-2 pr-3 font-medium">Indicateur</th>
            <th className="py-2 pr-3 font-medium">2000</th>
            <th className="py-2 pr-3 font-medium">2010</th>
            <th className="py-2 pr-3 font-medium">2024</th>
            <th className="py-2 pr-3 font-medium">Taux composé 2010-2024</th>
            <th className="py-2 font-medium">2050</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-slate-100">
              <td className="py-3 pr-3 font-medium text-slate-900">{row.label}<span className="mt-1 block font-normal text-slate-500">{row.unit}</span></td>
              <td className="py-3 pr-3">{row.unit === 'pourcent' ? part(row.y2000) : cell(row.y2000)}{row.status2000 === 'retropolated' ? <span className="block text-xs text-slate-500">rétropolé</span> : null}</td>
              <td className="py-3 pr-3">{row.unit === 'pourcent' ? part(row.y2010) : cell(row.y2010)}</td>
              <td className="py-3 pr-3">{row.unit === 'pourcent' ? part(row.y2024) : cell(row.y2024, 0)}{statusLabel(row.status2024) ? <span className="block text-xs text-slate-500">{statusLabel(row.status2024)}</span> : null}</td>
              <td className="py-3 pr-3">{row.cagr2010to2024 === null ? '-' : rate(row.cagr2010to2024)}</td>
              <td className="py-3">{row.unit === 'pourcent' ? part(row.y2050) : cell(row.y2050)}<span className="block text-xs text-slate-500">estimé</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ShareTable({ rows, total }: { rows: Share[], total: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead className="text-slate-500">
          <tr>
            <th className="py-2 pr-3 font-medium">Poste</th>
            <th className="py-2 pr-3 font-medium">2024, millions de francs</th>
            <th className="py-2 font-medium">Part 2024</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-slate-100">
              <td className="py-3 pr-3 font-medium text-slate-900">{row.label}</td>
              <td className="py-3 pr-3">{cell(row.millionChf)}</td>
              <td className="py-3">{rate(row.share)}</td>
            </tr>
          ))}
          <tr className="border-t border-slate-200 font-medium">
            <td className="py-3 pr-3">Total publié</td>
            <td className="py-3 pr-3">{cell(total)}</td>
            <td className="py-3">100 %</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function PremiumTable({ rows }: { rows: Premium[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="text-slate-500">
          <tr>
            <th className="py-2 pr-3 font-medium">Canton</th>
            <th className="py-2 pr-3 font-medium">2000</th>
            <th className="py-2 pr-3 font-medium">2010</th>
            <th className="py-2 pr-3 font-medium">2024</th>
            <th className="py-2 pr-3 font-medium">Taux composé 2010-2024</th>
            <th className="py-2 font-medium">2050</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.canton} className="border-t border-slate-100">
              <td className="py-3 pr-3 font-medium text-slate-900">{row.label}</td>
              <td className="py-3 pr-3">{cell(row.y2000)}</td>
              <td className="py-3 pr-3">{cell(row.y2010)}</td>
              <td className="py-3 pr-3">{cell(row.y2024)}</td>
              <td className="py-3 pr-3">{rate(row.cagr2010to2024)}</td>
              <td className="py-3">{cell(row.y2050)}<span className="block text-xs text-slate-500">estimé</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SubsidyTable({ rows }: { rows: Subsidy[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] text-left text-sm">
        <thead className="text-slate-500">
          <tr>
            <th className="py-2 pr-3 font-medium">Canton</th>
            <th className="py-2 pr-3 font-medium">2010</th>
            <th className="py-2 pr-3 font-medium">2024</th>
            <th className="py-2 pr-3 font-medium">Part cantonale 2024</th>
            <th className="py-2 pr-3 font-medium">Bénéficiaires 2024</th>
            <th className="py-2 pr-3 font-medium">Taux composé 2010-2024</th>
            <th className="py-2 font-medium">2050</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const hospital = page.premiums.find((premium) => premium.canton === row.canton)?.universityHospital
            return (
            <tr key={row.canton} className="border-t border-slate-100">
              <td className="py-3 pr-3 font-medium text-slate-900">
                {row.label}
                {hospital ? <span className="mt-1 block font-normal text-slate-500">{hospital}</span> : null}
              </td>
              <td className="py-3 pr-3">{cell(row.y2010, 0)}</td>
              <td className="py-3 pr-3">{cell(row.y2024, 0)}</td>
              <td className="py-3 pr-3">{rate(row.cantonalShare2024)}</td>
              <td className="py-3 pr-3">{rate(row.beneficiaryRate2024)}</td>
              <td className="py-3 pr-3">{rate(row.cagr2010to2024)}</td>
              <td className="py-3">{cell(row.y2050)}<span className="block text-xs text-slate-500">{row.projectionWindow ?? 'estimé'}</span></td>
            </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

const indexRows = page.index2010.filter((point) => point.year >= 2010).map((point) => ({
  year: point.year,
  costs: point.year === 2050 ? null : point.costs,
  costsForecast: point.year === 2024 || point.year === 2050 ? point.costs : null,
  population: point.year === 2050 ? null : point.population,
  populationForecast: point.year === 2024 || point.year === 2050 ? point.population : null,
  gdp: point.year === 2050 ? null : point.gdp,
  gdpForecast: point.year === 2024 || point.year === 2050 ? point.gdp : null,
}))

const postBar = [{
  name: '2024',
  hospitals: page.posts2024.find((row) => row.id === 'hospitals')?.millionChf ?? 0,
  ems: page.posts2024.find((row) => row.id === 'ems')?.millionChf ?? 0,
  ambulatory: page.posts2024.find((row) => row.id === 'ambulatory')?.millionChf ?? 0,
  administration: page.posts2024.find((row) => row.id === 'administration')?.millionChf ?? 0,
}]

const financingRows = page.financingAnnual.map((point) => ({
  year: point.year,
  households: point.year === 2050 ? null : point.households,
  householdsForecast: point.year === 2024 || point.year === 2050 ? point.households : null,
  premiums: point.year === 2050 ? null : point.premiums,
  premiumsForecast: point.year === 2024 || point.year === 2050 ? point.premiums : null,
  public: point.year === 2050 ? null : point.public,
  publicForecast: point.year === 2024 || point.year === 2050 ? point.public : null,
  other: point.year === 2050 ? null : point.other,
  otherForecast: point.year === 2024 || point.year === 2050 ? point.other : null,
}))

function cantonSeries(canton: string) {
  const premium = page.premiums.find((row) => row.canton === canton)
  const subsidy = page.subsidies.find((row) => row.canton === canton)
  if (!premium || !subsidy || subsidy.y2010 === null) return []
  const years = [...new Set([...premium.annual.map((point) => point.year), ...subsidy.annual.map((point) => point.year), 2050])].sort((left, right) => left - right)
  return years.filter((year) => year >= 2010).map((year) => {
    const premiumValue = year === 2050 ? premium.y2050 : premium.annual.find((point) => point.year === year)?.value
    const subsidyValue = year === 2050 ? subsidy.y2050 : subsidy.annual.find((point) => point.year === year)?.value
    const premiumIndex = premiumValue === undefined || premiumValue === null ? null : (premiumValue / premium.y2010) * 100
    const subsidyIndex = subsidyValue === undefined || subsidyValue === null || subsidy.y2010 === null ? null : (subsidyValue / subsidy.y2010) * 100
    return {
      year,
      premium: year === 2050 ? null : premiumIndex,
      premiumForecast: year === 2024 || year === 2050 ? premiumIndex : null,
      subsidy: year === 2050 ? null : subsidyIndex,
      subsidyForecast: year === 2024 || year === 2050 ? subsidyIndex : null,
    }
  })
}

export default function LamalPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 md:px-6">
      <section className="rounded-[2rem] bg-slate-950 px-6 py-10 text-white md:px-10 md:py-14">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-red-300">LAMal et facture nationale</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-6xl">Ce que coûte la santé en Suisse</h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-200">
          La prime est cantonale. La facture, elle, est nationale. En 2024, l'OFS compte 97 201 millions de francs de coûts, 11,4 % du PIB. Les frais d'administration de l'assurance obligatoire, 1,7 milliard selon l'OFSP, restent à côté de cette somme.
        </p>
      </section>

      <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 text-sm leading-6 text-slate-600 shadow-sm md:p-6">
        <p>
          Les chiffres viennent des fichiers OFSP et OFS déposés dans le projet. 2024 est encore provisoire dans le classeur des coûts. La projection 2050 prolonge le taux composé 2010-2024, sans hypothèse de vieillissement. Une correction peut être signalée <a className="font-medium text-slate-900 underline" href="https://github.com/evaletolab/swiss-10m-dashboard" target="_blank" rel="noreferrer">ici</a>.
        </p>
      </section>

      <div className="mt-8 grid gap-6">
        <ChartCard title="Prime annuelle moyenne" description="Francs par assuré et par an, groupe d'âge total. L'année 2000 est un niveau. Le taux relie 2010 à 2024, puis la projection ajoute 26 ans." sourceIds={['ofsp_lamal_annual_premiums_and_subsidies']} contentClassName="h-auto">
          <PremiumTable rows={page.premiums} />
          <p className="mt-4 text-sm leading-6 text-slate-600">
            Le taux de Genève, {rate(page.premiums.find((row) => row.canton === 'GE')?.cagr2010to2024 ?? null)}, se calcule sur la prime genevoise seule. Le taux suisse, {rate(page.premiums.find((row) => row.canton === 'CH')?.cagr2010to2024 ?? null)}, se calcule sur la prime moyenne suisse du même fichier. Genève part de {cell(page.premiums.find((row) => row.canton === 'GE')?.y2010 ?? null)} francs en 2010, la Suisse de {cell(page.premiums.find((row) => row.canton === 'CH')?.y2010 ?? null)}. Un taux un peu plus bas peut donc élargir l'écart en francs. Le taux du subside cantonal, plus bas dans la page, est une autre série.
          </p>
        </ChartCard>

        <ChartCard title="Coûts suisses et part du PIB" description="Millions de francs nominaux, sauf la part du PIB. La part 2050 reprend les francs projetés des coûts et du PIB. Le taux n'est pas appliqué au pourcentage." sourceIds={['bfs_health_costs_since_1960']} contentClassName="h-auto">
          <LevelTable rows={page.national} />
          <p className="mt-4 text-sm leading-6 text-slate-600">
            Le même fichier donne {cell(page.costPerInhabitantMonth2024)} francs par habitant et par mois en 2024. C'est le coût total divisé par la population moyenne. La prime annuelle est dans le tableau au-dessus.
          </p>
        </ChartCard>

        <ChartCard title="Indice 2010 = 100" description="Coûts, PIB et population du classeur OFS, de 2010 à 2024. L'axe des années est continu, donc 2050 est 26 ans après 2024. Le trait plein s'arrête en 2024, le pointillé prolonge. La population est le trait épais. Le PIB reste en pointillés." sourceIds={['bfs_health_costs_since_1960']}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={indexRows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#e2e8f0" />
              <XAxis dataKey="year" type="number" domain={[2010, 2050]} ticks={[2010, 2015, 2020, 2024, 2050]} allowDecimals={false} />
              <YAxis />
              <Tooltip contentStyle={tooltipStyle} formatter={(value) => tooltipNumber(value, 1)} />
              <Legend />
              <Line type="monotone" dataKey="costs" name="Coûts" stroke={colors.health} strokeWidth={2} dot={false} connectNulls={false} />
              <Line type="monotone" dataKey="costsForecast" name="Coûts, prolongement" stroke={colors.health} strokeWidth={2} strokeDasharray="6 4" dot={false} legendType="none" />
              <Line type="monotone" dataKey="population" name="Population" stroke={colors.observed} strokeWidth={3} dot={false} />
              <Line type="monotone" dataKey="populationForecast" name="Population, prolongement" stroke={colors.observed} strokeWidth={3} strokeDasharray="6 4" dot={false} legendType="none" />
              <Line type="monotone" dataKey="gdp" name="PIB" stroke={colors.neutral} strokeWidth={2} strokeDasharray="2 3" dot={false} />
              <Line type="monotone" dataKey="gdpForecast" name="PIB, prolongement" stroke={colors.neutral} strokeWidth={2} strokeDasharray="6 4" dot={false} legendType="none" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Où va la facture en 2024" description="Quatre groupes, en millions de francs. Les parts sont recalculées sur 97 201 millions. La ventilation s'arrête en 2024. Le classeur des années précédentes s'arrête en 2020 et classe les postes autrement." sourceIds={['bfs_health_costs_since_1960']} contentClassName="h-auto">
          <div className="h-28">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={postBar} layout="vertical" margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" hide />
                <Tooltip contentStyle={tooltipStyle} formatter={(value) => `${tooltipNumber(value)} millions`} />
                <Legend />
                <Bar dataKey="hospitals" name="Hôpitaux" stackId="posts" fill={colors.health} />
                <Bar dataKey="ems" name="EMS" stackId="posts" fill={colors.pressure} />
                <Bar dataKey="ambulatory" name="Cabinets, domicile et biens" stackId="posts" fill={colors.observed} />
                <Bar dataKey="administration" name="Administration et autres" stackId="posts" fill={colors.neutral} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4">
            <ShareTable rows={page.posts2024} total={page.postsTotalMillion} />
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            Cabinets, soins à domicile et biens réunit les cabinets médicaux, les dentistes, les soins à domicile, les services auxiliaires et le commerce de détail. Un séjour d'hôpital de moins de 24 heures, sans nuit dans un lit, est facturé comme ambulatoire, mais il reste dans la ligne Hôpitaux quand c'est l'hôpital qui le produit. Le transfert du stationnaire vers l'ambulatoire, en vigueur depuis 2019, déplace donc des coûts à l'intérieur de la ligne Hôpitaux.
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Les assurances comme prestataires représentent 3 560 millions, déjà dans le groupe administration. Les 1,7 milliard de frais d'administration de l'AOS publiés par l'OFSP restent hors de cette ligne. Les additionner compterait deux fois.
          </p>
        </ChartCard>

        <ChartCard title="Qui finance" description="Millions de francs, cube OFS du 24 avril 2026, de 2010 à 2024. Le total 2024 est 98 269 millions. Il diffère du total des coûts, 97 201 millions. L'axe des années est continu. Le pointillé prolonge chaque groupe jusqu'en 2050. Les parts 2050 sont recalculées sur les francs projetés." sourceIds={['bfs_health_costs_since_1960']} contentClassName="h-auto">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={financingRows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#e2e8f0" />
                <XAxis dataKey="year" type="number" domain={[2010, 2050]} ticks={[2010, 2015, 2020, 2024, 2050]} allowDecimals={false} />
                <YAxis />
                <Tooltip contentStyle={tooltipStyle} formatter={(value) => `${tooltipNumber(value)} millions`} />
                <Legend />
                <Line type="monotone" dataKey="households" name="Ménages, paiements directs" stroke={colors.observed} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="householdsForecast" name="Ménages, prolongement" stroke={colors.observed} strokeWidth={2} strokeDasharray="6 4" dot={false} legendType="none" />
                <Line type="monotone" dataKey="premiums" name="Primes" stroke={colors.health} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="premiumsForecast" name="Primes, prolongement" stroke={colors.health} strokeWidth={2} strokeDasharray="6 4" dot={false} legendType="none" />
                <Line type="monotone" dataKey="public" name="Collectivités publiques" stroke={colors.housing} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="publicForecast" name="Collectivités, prolongement" stroke={colors.housing} strokeWidth={2} strokeDasharray="6 4" dot={false} legendType="none" />
                <Line type="monotone" dataKey="other" name="Entreprises et inconnu" stroke={colors.neutral} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="otherForecast" name="Entreprises, prolongement" stroke={colors.neutral} strokeWidth={2} strokeDasharray="6 4" dot={false} legendType="none" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th className="py-2 pr-3 font-medium">Source</th>
                  <th className="py-2 pr-3 font-medium">2010</th>
                  <th className="py-2 pr-3 font-medium">2024</th>
                  <th className="py-2 pr-3 font-medium">Taux composé 2010-2024</th>
                  <th className="py-2 pr-3 font-medium">2050</th>
                  <th className="py-2 pr-3 font-medium">Part 2024</th>
                  <th className="py-2 font-medium">Part 2050</th>
                </tr>
              </thead>
              <tbody>
                {page.financingLevels.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="py-3 pr-3 font-medium text-slate-900">{row.label}</td>
                    <td className="py-3 pr-3">{cell(row.y2010)}</td>
                    <td className="py-3 pr-3">{cell(row.y2024)}<span className="block text-xs text-slate-500">provisoire</span></td>
                    <td className="py-3 pr-3">{rate(row.cagr2010to2024)}</td>
                    <td className="py-3 pr-3">{cell(row.y2050)}<span className="block text-xs text-slate-500">estimé</span></td>
                    <td className="py-3 pr-3">{rate(row.share2024)}</td>
                    <td className="py-3">{rate(row.share2050)}</td>
                  </tr>
                ))}
                <tr className="border-t border-slate-200 font-medium">
                  <td className="py-3 pr-3">Total</td>
                  <td className="py-3 pr-3">{cell(page.financingLevels.reduce((sum, row) => sum + row.y2010, 0))}</td>
                  <td className="py-3 pr-3">{cell(page.financingTotalMillion)}</td>
                  <td className="py-3 pr-3">-</td>
                  <td className="py-3 pr-3">{cell(page.financingLevels.reduce((sum, row) => sum + row.y2050, 0))}</td>
                  <td className="py-3 pr-3">100 %</td>
                  <td className="py-3">100 %</td>
                </tr>
              </tbody>
            </table>
          </div>
        </ChartCard>

        <ChartCard title="Coût par âge" description="Le graphique par classe d'âge reste vide. Le fichier OFS qui croise l'âge et le coût manque dans les tableaux déposés." contentClassName="h-auto">
          <p className="text-sm leading-6 text-slate-600">
            Une famille est faite de personnes déjà présentes sur cette courbe, une fois le fichier publié. L'enfant a une prime réduite. La personne retraitée paie une prime d'adulte. La prime adulte suit donc une autre logique que le coût par âge.
          </p>
        </ChartCard>

        <ChartCard title="Cinq cantons, prime et subside" description="Millions de francs de la part cantonale de la réduction des primes. L'année 2000 est vide. Les francs commencent en 2005. La projection genevoise prolonge 2020-2024, parce que la réforme de 2020 change le rythme. Les autres cantons prolongent 2010-2024." sourceIds={['ofsp_lamal_annual_premiums_and_subsidies']} contentClassName="h-auto">
          <SubsidyTable rows={page.subsidies} />
          <p className="mt-4 text-sm leading-6 text-slate-600">
            Genève a la prime la plus haute des cinq, 5 365 francs en 2024, et le canton paie 68 % du subside, 448 millions sur 656, avec 44 % de bénéficiaires. Vaud est dans le même groupe de subsides, 589 millions cantonaux sur 902, environ 65 %, mais la prime est plus basse, 4 762 francs. En francs absolus, Vaud paie plus que Genève.
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Le taux du subside genevois est {rate(page.subsidies.find((row) => row.canton === 'GE')?.cagr2010to2024 ?? null)}. Le taux de la prime genevoise est {rate(page.premiums.find((row) => row.canton === 'GE')?.cagr2010to2024 ?? null)}. La réforme de 2020 fait monter la part cantonale de 158 millions en 2010 à 348 en 2020, puis 448 en 2024. La projection genevoise prolonge ce rythme récent. Les quatre autres cantons prolongent 2010-2024.
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Berne, Genève, Vaud et Zurich ont un hôpital universitaire. Les coûts de l'OFS suivent le domicile du patient. Le lieu de l'hôpital est une autre question. La répartition ménages, primes et collectivités est publiée pour la Suisse. Le subside de réduction des primes est l'effort cantonal comparable dans le même fichier.
          </p>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {page.subsidies.map((row) => (
              <div key={row.canton}>
                <h4 className="mb-2 text-base font-semibold text-slate-950">{row.label}, indice 2010 = 100</h4>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={cantonSeries(row.canton)} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke="#e2e8f0" />
                      <XAxis dataKey="year" type="number" domain={[2010, 2050]} ticks={[2010, 2020, 2024, 2050]} allowDecimals={false} />
                      <YAxis />
                      <Tooltip contentStyle={tooltipStyle} formatter={(value) => tooltipNumber(value, 1)} />
                      <Legend />
                      <Line type="monotone" dataKey="premium" name="Prime" stroke={colors.health} strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="premiumForecast" name="Prime, prolongement" stroke={colors.health} strokeWidth={2} strokeDasharray="6 4" dot={false} legendType="none" />
                      <Line type="monotone" dataKey="subsidy" name="Subside cantonal" stroke={colors.observed} strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="subsidyForecast" name="Subside, prolongement" stroke={colors.observed} strokeWidth={2} strokeDasharray="6 4" dot={false} legendType="none" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>
    </main>
  )
}
