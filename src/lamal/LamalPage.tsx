import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartCard } from '../components/ChartCard'
import { SourceNote } from '../components/SourceNote'
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

type YearValue = { year: number; value: number }

// La ligne pleine s'arrête en 2024, la ligne tiretée reprend au même point pour que les deux se touchent.
const observedUntil2024 = (year: number) => year <= 2024
const forecastFrom2024 = (year: number) => year >= 2024

const indexRows = page.index2010.filter((point) => point.year >= 2010).map((point) => ({
  year: point.year,
  costs: observedUntil2024(point.year) ? point.costs : null,
  costsForecast: forecastFrom2024(point.year) ? point.costs : null,
  population: observedUntil2024(point.year) ? point.population : null,
  populationForecast: forecastFrom2024(point.year) ? point.population : null,
  gdp: observedUntil2024(point.year) ? point.gdp : null,
  gdpForecast: forecastFrom2024(point.year) ? point.gdp : null,
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
  households: observedUntil2024(point.year) ? point.households : null,
  householdsForecast: forecastFrom2024(point.year) ? point.households : null,
  premiums: observedUntil2024(point.year) ? point.premiums : null,
  premiumsForecast: forecastFrom2024(point.year) ? point.premiums : null,
  public: observedUntil2024(point.year) ? point.public : null,
  publicForecast: forecastFrom2024(point.year) ? point.public : null,
  other: observedUntil2024(point.year) ? point.other : null,
  otherForecast: forecastFrom2024(point.year) ? point.other : null,
}))

const leverEmoji = '🔧'

// Les chiffres forts sont entourés de ** dans les textes des hypothèses.
function withStrongFigures(text: string) {
  return text.split('**').map((part, index) => (index % 2 === 1 ? <strong key={index} className="font-bold text-slate-950">{part}</strong> : part))
}

type SolutionLever = {
  name: string
  potential: string
  effective?: string
  feasibility?: string
}

type Solution = {
  title: string
  hook: string
  costRank: number
  metrics: { facture: string; couts: string; qualite: string; deuxVitesses: string }
  proposedBy: string
  advantage: string
  risk: string
  levers: SolutionLever[]
  sources: { href: string; label: string }[]
}

const solutions: Solution[] = [
  {
    title: 'Pour une caisse publique d\'assurance-maladie',
    hook: 'Une seule caisse à la place de 61. Le volume de soins ne change pas. Les initiants comptaient la publicité et les changements de caisse, les opposants le coût de la bascule. Refusé à 61,8 % le 28 septembre 2014.',
    costRank: 3,
    metrics: {
      facture: 'Rapporté aux primes LAMal, 31 914 millions. Initiants, fonctionnement des caisses : **350 millions** en une fois, soit **1,10 % de la prime**. Initiants, avec la coordination des soins : jusqu\'à **3 milliards** en une fois, soit **9,40 % de la prime**. Opposants : 80 millions en une fois, soit 0,25 % de la prime, ou une prime plus haute si les franchises à option sautent.',
      couts: 'Initiants : **0,36 %** ou **3,1 %** en une fois. Opposants : 0,08 % en une fois.',
      qualite: 'Initiants : inchangée. Opposants : inchangée sur le soin, la prime peut changer.',
      deuxVitesses: 'Oui, les complémentaires restent',
    },
    proposedBy: 'Initiative populaire votée le 28 septembre 2014. Le slogan des initiants était « Stop à l\'explosion des primes ». Initiants : Stéphane Rossini et Jean-François Steiert. Opposants : le Conseil fédéral, Alliance santé et Urs Schwaller. Ce sont les opposants qui disaient « caisse unique ».',
    advantage: 'Les initiants visent la publicité, les courtiers, les changements de caisse, puis la coordination des soins. Les opposants limitent le gain à l\'admin et chiffrent le coût de la bascule.',
    risk: 'La bascule coûte 1,56 à 2,15 milliards une fois, avant toute économie. Le volume de soins, qui fait l\'essentiel des 97 201 millions, ne bouge pas. Si les franchises à option disparaissaient, Zweifel chiffre 17 % de prime en plus, 575 francs. Et une fois la caisse seule en place, plus personne ne peut changer d\'assureur pour faire pression.',
    levers: [
      {
        name: 'Fusionner les caisses de l\'assurance de base.',
        potential: 'Initiants : Stéphane Rossini annonce **2,5 à 3 milliards** à long terme. 3 000 / 97 201 = **3,1 % du total**. 3 000 / 31 914 = **9,40 % de la prime LAMal**. C\'est en une fois. Le plancher, **350 millions** sur le fonctionnement des 61 caisses, fait 350 / 97 201 = 0,36 % du total et 350 / 31 914 = 1,10 % de la prime. Il évoque aussi un milliard, soit 1,0 % du total et 3,13 % de la prime. Jean-François Steiert compte **300 à 400 millions** sur la publicité, les changements de caisse et les intermédiaires, soit 0,31 % à 0,41 % du total. Opposants : Urs Schwaller limite l\'économie à 80 millions, soit 80 / 97 201 = 0,08 % du total et 80 / 31 914 = 0,25 % de la prime. L\'étude ZHAW, commandée par Alliance santé, chiffre la bascule entre 1,56 et 2,15 milliards, une fois, et ne chiffre pas le fonctionnement ensuite. Peter Zweifel, cité par Schwaller, ajoute 17 % de prime, 575 francs, si les franchises à option et les rabais enfants disparaissaient. Les initiants disent que le texte ne l\'impose pas.',
        feasibility: 'Mesure lourde, refusée trois fois, la dernière à 61,8 % le 28 septembre 2014. Genève avait dit oui à 57,4 %. Le gain annuel des initiants et les 80 millions des opposants ne sont pas le même objet. La bascule, elle, est un coût unique de 1,5 à 2,1 milliards.',
      },
      {
        name: 'Reporter la facture sur l\'impôt ou la dette.',
        potential: '0 % du niveau. La prime du bénéficiaire disparaît et l\'impôt prend la place. La France, qui a déjà une caisse sociale, dépense 11,5 % du PIB et creuse un déficit.',
        feasibility: 'Le déplacement est faisable. Le bénéficiaire paie ailleurs. L\'ensemble coûte le même soin.',
      },
    ],
    sources: [
      { href: 'https://www.rts.ch/info/suisse/6076074-les-initiants-ont-lance-leur-campagne-pour-la-caisse-maladie-publique.html', label: 'RTS, Rossini, 350 millions au minimum, 2,5 à 3 milliards à long terme' },
      { href: 'https://www.lematin.ch/story/passer-a-la-caisse-unique-couterait-2-milliards-439481262299', label: 'Le Matin, Steiert, 300 à 400 millions par an' },
      { href: 'https://www.lematin.ch/story/caisse-unique-le-conseil-des-etats-rejette-l-initiative-216547075409', label: 'Le Matin, Schwaller, 80 millions d\'admin et de marketing' },
      { href: 'https://www.letemps.ch/suisse/passage-caisse-publique-devise-2-milliards-francs', label: 'Le Temps, étude ZHAW, 1,5 à 2,1 milliards' },
      { href: 'https://www.letemps.ch/opinions/caisse-publique-points-fachent', label: 'Le Temps, Schwaller cite Zweifel, prime +17 %' },
      { href: 'https://www.rts.ch/info/suisse/6179669-les-suisses-repoussent-la-caisse-publique-sur-fond-de-roestigraben.html', label: 'RTS, votation du 28 septembre 2014' },
      { href: 'https://www.oecd.org/en/publications/health-at-a-glance-2025_15a55280-en/switzerland_7139bf0d-en.html', label: 'OCDE, Suisse' },
      { href: 'https://www.oecd.org/content/dam/oecd/en/publications/reports/2025/11/health-at-a-glance-2025-country-notes_2f94481e/france_fc92ff53/fea63dd5-en.pdf', label: 'OCDE, France' },
    ],
  },
  {
    title: 'L\'IA et les robots rattrapent la hausse, objectif 6 % par an',
    hook: 'Proposition générée par trois IA, GPT, Claude et Grok, selon la méthode des premiers principes utilisée en physique : partir de ce que le geste demande vraiment en temps, en matière et en énergie, pas de la pratique héritée. Ce qui est possible en physique doit être tenté dans la santé. L\'objectif est de contraindre la productivité à un niveau élevé, **6 % par an**, face à des coûts qui montent de 4,1 %. Ce taux **divise par deux le prix d\'un acte en douze ans** et le réduit de **68,8 % en vingt ans**. Sur la facture totale, où le volume et les besoins continuent de croître, il retire **31,7 % en vingt ans**, de 97,2 à 66,4 milliards ; la division par deux de la facture arrive à 36 ans, ou à vingt ans si la productivité tient 7,7 %.',
    costRank: 1,
    metrics: {
      facture: 'Simulation à 6 % : **9,1 % en cinq ans**, si le tarif baisse avec. Démontré : 0 %.',
      couts: 'Simulation à 6 % : **9,1 % en cinq ans**. À 4 % : 0 %. Démontré : 0 %.',
      qualite: '**Mieux sur le dépistage du sein.** Inchangée ailleurs.',
      deuxVitesses: 'Oui, si l\'outil n\'est pas partout.',
    },
    proposedBy: 'Aucun parti, aucune organisation. Les postes viennent de la base détaillée de l\'OFS, 2024, provisoire. Les gains par tâche viennent d\'essais publiés. La simulation prend 4 % de hausse par an pour rester comparable aux projections de la page.',
    advantage: 'Les coûts montent de 4,1 % en 2024. La productivité doit rattraper cette pente, puis passer devant pour que le niveau descende. Un gain de 4 % par an net tient la dépense à son niveau d\'aujourd\'hui. Il faut 6 % pour la faire descendre. Les gains par tâche sont réels et mesurés. Leur généralisation est le problème.',
    risk: 'Le gain peut partir en volume : un examen moins cher et deux fois plus d\'examens ne baisse rien. Le coût complet, licences, intégration, formation et maintenance, peut dépasser le gain ; NICE le conclut pour la chirurgie robotisée. Si l\'outil n\'est pas partout, l\'accès devient inégal. Et l\'acheteur dépend du fournisseur tant que les données ne sont pas exportables.',
    levers: [
      {
        name: 'Fixer l\'objectif : 6 % de productivité nette par an',
        potential: 'À 4 % par an pendant cinq ans, la capacité monte de **21,7 %** et le coût unitaire baisse de **17,8 %**. À 6 %, **33,8 %** et **25,3 %**. Sur vingt ans, 6 % par an divisent le prix d\'un acte par **3,2**. Si la dépense devait monter de 4 % par an, elle atteindrait 118,3 milliards en cinq ans. Avec 2 % de gain net, 107,1 milliards. Avec 4 %, 97,2 milliards, le niveau d\'aujourd\'hui. Avec 6 %, **88,4 milliards, soit 9,1 % sous ce niveau**, et **66,4 milliards à vingt ans**. C\'est une simulation, pas une prévision : elle suppose un gain net applicable à tous les coûts, et compter plus d\'actes par médecin ne suffit pas, il faut le coût d\'un parcours comparable à résultat clinique et accès préservés. Aucun programme suisse ne publie ce gain.',
      },
      {
        name: 'Refaire le processus avant d\'acheter l\'outil',
        potential: 'Définir le résultat visé, décomposer les ressources, justifier chaque étape, supprimer celles sans valeur démontrée, simplifier, puis automatiser avec la solution la moins chère qui répond au besoin. Exemple illustratif : une tâche pèse 20 % du coût d\'un parcours, l\'outil retire 25 % de ses ressources, il sert dans 80 % des cas. Gain brut 20 % x 25 % x 80 % = **4 % du parcours**, une fois, avant licences, intégration, formation et maintenance. Pour gagner encore 4 % l\'année suivante, il faut une nouvelle amélioration.',
      },
      {
        name: 'Ce qui est déjà mesuré, tâche par tâche',
        potential: 'Imagerie : dans l\'essai randomisé MASAI, la charge de lecture des mammographies baisse de **44,2 %**, avec plus de cancers détectés. Comptes rendus : dans un essai randomisé sur 238 médecins et 14 spécialités, publié dans NEJM AI, Nabla réduit le temps par note de **9,5 %** face au groupe témoin, soit 41 secondes, de 4 min 30 à 3 min 49. L\'autre outil testé, DAX, n\'obtient pas de résultat significatif. Logistique : à Singapour, la pharmacie d\'urgence du KKH gagne **près de 30 % de capacité à effectif constant** avec le système OPAS. Ces gains portent sur une tâche : 44 % sur la lecture n\'est pas 44 % de la radiologie, l\'acquisition des images, les équipements et le personnel technique restent. Et la chirurgie robotisée va dans l\'autre sens, NICE conclut à un surcoût probable à un an sur les tissus mous. Aucun de ces gains n\'est encore passé dans le tarif suisse.',
      },
      {
        name: 'Viser les postes qui pèsent, sans compter deux fois',
        potential: 'Dans la ventilation par prestation, les quatre premiers postes de 2024 font **58,5 % du total** : soins curatifs somatiques ambulatoires 17 688 millions, stationnaires 14 866, soins de longue durée en établissement 12 580, médicaments 11 707. Laboratoire et imagerie font 7 417 millions, soit **7,6 %**. Une baisse de 20 % sur ces deux postes, à volume égal, retire **1 483 millions, soit 1,5 % du total**, une fois. Une économie de documentation ne doit pas être comptée dans le poste clinique puis une seconde fois en administration.',
        effective: 'Sur le laboratoire, **la coupe linéaire de 10 % en 2022 est en vigueur**. Sur l\'imagerie, le prix du point a à peine bougé et la dépense a monté par le nombre d\'examens.',
      },
      {
        name: 'Un réseau commun EPFL, startups et entreprises suisses, sur des données partagées',
        potential: 'Le réseau d\'abord : l\'EPFL et les HES pour la recherche et l\'ingénierie, les hôpitaux, les soins à domicile et les cabinets pour le terrain, les assureurs et les cantons pour le paiement, les startups et les entreprises suisses pour construire. Personne n\'y arrive seul : le chercheur n\'a pas les patients, l\'hôpital n\'a pas les ingénieurs, la startup n\'a pas accès au tarif. Les données partagées entre tous ensuite, parce que c\'est la matière première : sans base commune, chaque équipe entraîne son outil sur son seul hôpital et aucun résultat n\'est transposable. Cette base existe déjà. Le Swiss Personalized Health Network relie **6 hôpitaux universitaires, 5 hôpitaux cantonaux et le Swiss Cancer Institute**, avec des données normalisées en SNOMED CT et LOINC, analysées dans l\'environnement sécurisé BioMedIT. La Confédération le reconnaît comme centre national de compétence et finance son centre de coordination à hauteur de **20,7 millions pour 2025 à 2028**. L\'EPFL y est, dans la plateforme romande SENSA 2.0 avec l\'UNIL, le SIB, SWITCH, le SDSC et le CHUV, et sa spin-off Tune Insight fournit l\'anonymisation. Le financement sur le modèle Y Combinator : le même contrat pour tous, un montant identique, pas de négociation au cas par cas, et beaucoup de paris en même temps plutôt que quelques gros mandats. YC investit **500 000 dollars**, 125 000 contre 7 % fixes et 375 000 sans plafond, dans des promotions de **166 à 230 entreprises**, plusieurs par an. L\'argent d\'entrée n\'est conditionné à aucun jalon : c\'est le financement suivant qui dépend du prototype et de l\'objectif fonctionnel atteint. C\'est ce qui rend l\'innovation de rupture possible, changer la façon de faire au lieu d\'accélérer celle d\'aujourd\'hui. La plupart des tentatives échouent, et il faut que l\'échec soit bon marché pour que les quelques réussites paient le reste. Conditions pour que le gain descende sur la facture : coût complet obligatoire, développement, équipement, migration, abonnement, supervision et maintenance ; heures libérées, dépenses évitées et dépenses réellement baissées comptées séparément ; évaluation indépendante ajustée à la gravité des patients ; interfaces ouvertes et données exportables pour changer de fournisseur ; achats communs pour qu\'une solution validée entre dans plusieurs établissements sans refaire la procédure ; et un contrôle des volumes, parce qu\'un prix par examen plus bas compensé par plus d\'examens n\'est pas une économie. Le réseau de données existe aujourd\'hui pour la recherche, pas pour baisser le coût des soins courants, et aucun guichet ne financerait ce réseau : Innosuisse a le bon modèle de consortium avec Flagship, mais son appel 2026 porte sur la défense et la mobilité.',
      },
      {
        name: 'Financer la plomberie des données, et laisser le gain à celui qui le fait',
        potential: 'Un potentiel suisse existe hors technologie. L\'étude ZHAW et INFRAS pour l\'OFSP, du 2 septembre 2019, chiffre **16 à 19 % des prestations LAMal, soit 7,1 à 8,4 milliards** par an, ou **855 à 1 012 francs par personne**. Base 2016 : 45,3 milliards de prestations LAMal, 56 % des 80,5 milliards de coûts d\'alors. Ce n\'est donc pas 16 à 19 % des 97 201 millions, et ce n\'est pas un gain qui se répète chaque année. Sans dossier partagé, l\'examen déjà fait est refait. DigiSanté, de 2025 à 2034, porte un crédit d\'engagement de près de 400 millions, mais ne disposera que de 31,5 millions au lieu de 59 en 2027, puis 5 millions de moins par an dès 2028. Il faut aussi que l\'établissement garde un moment sa part du gain, sinon supprimer une prestation facturée le pénalise, puis que le gain passe dans les tarifs.',
      },
    ],
    sources: [
      { href: 'https://stats.swiss/vis?df[ag]=CH1.COU&df[ds]=ds:disseminate&df[id]=DF_COU_HEALTH_COSTS&df[vs]=1.0.0&lc=fr', label: 'OFS, coûts de la santé selon les prestations, 2024 provisoire' },
      { href: 'https://www.bfs.admin.ch/asset/fr/36515477', label: 'OFS, coûts 2024, +4,1 %, longue durée +5,9 %, curatif ambulatoire +1,6 %, prévention −15,8 %' },
      { href: 'https://www.thelancet.com/journals/lanonc/article/PIIS1470-2045(23)00298-X/abstract', label: 'Lancet Oncology, essai MASAI, charge de lecture −44 %' },
      { href: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC12768499/', label: 'NEJM AI, essai randomisé sur 238 médecins, Nabla −9,5 % de temps par note' },
      { href: 'https://www.moh.gov.sg/newsroom/automation-and-productivity/', label: 'MOH Singapour, OPAS, capacité de pharmacie +30 % à effectif constant' },
      { href: 'https://www.nice.org.uk/guidance/htg742/chapter/3-Committee-discussion', label: 'NICE, chirurgie robotisée des tissus mous, surcoût probable à un an' },
      { href: 'https://digitalcollection.zhaw.ch/handle/11475/20579', label: 'ZHAW et INFRAS pour l\'OFSP, 2019, 16 à 19 % des prestations LAMal, 7,1 à 8,4 milliards' },
      { href: 'https://www.digisante.admin.ch/fr/mesures-deconomie-digisante', label: 'DigiSanté, 31,5 millions au lieu de 59 en 2027, puis 5 millions de moins par an' },
      { href: 'https://www.ycombinator.com/deal', label: 'Y Combinator, 500 000 dollars, 125 000 pour 7 %, et aucun jalon à l\'entrée' },
      { href: 'https://www.sams.ch/dam/jcr:c60c86ad-e494-47a5-99fd-3ae355bfe88b/annual_report_sphn_2025.pdf', label: 'SPHN, rapport 2025, 6 hôpitaux universitaires, 5 cantonaux, BioMedIT, SENSA 2.0 avec l\'EPFL' },
      { href: 'https://www.sib.swiss/fr/news/le-swiss-personalized-health-network-passe-de-la-phase-de-mise-en-place-a-celle', label: 'SIB, SPHN reconnu centre national, 20,7 millions pour 2025 à 2028' },
      { href: 'https://sphn.ch/wp-content/uploads/2024/03/bms-2023-1250296756.pdf', label: 'SPHN, Thomas Geiger, hôpitaux concurrents et esprit de clocher cantonal' },
      { href: 'https://www.innosuisse.admin.ch/fr/initiative-flagship', label: 'Innosuisse, modèle de consortium Flagship, trois partenaires de recherche et deux de mise en œuvre' },
      { href: 'https://www.innosuisse.admin.ch/fr/appel-a-projets-initiative-flagship', label: 'Innosuisse, appel Flagship 2026, défense et mobilité' },
      { href: 'https://www.bag.admin.ch/fr/la-revision-des-tarifs-de-laboratoire-avance', label: 'OFSP, coupe de 10 % des tarifs de laboratoire' },
      { href: 'https://www.efk.admin.ch/wp-content/uploads/publikationen/berichte/bildung_und_soziales/gesundheit/22613/22613_version_definitive_v04.pdf', label: 'CDF, imagerie ambulatoire, le prix du point a à peine bougé' },
    ],
  },
]

const hypothesisSources = [...new Map(solutions.flatMap((solution) => solution.sources).map((source) => [source.href, source])).values()]

const initiativeSources = [
  { href: 'https://www.rts.ch/info/suisse/6179669-les-suisses-repoussent-la-caisse-publique-sur-fond-de-roestigraben.html', label: 'Pour une caisse publique d\'assurance-maladie, initiative populaire refusée à 61,8 % le 28 septembre 2014' },
  { href: 'https://swissvotes.ch/vote/668.00', label: 'Pour des primes plus basses, frein aux coûts, initiative populaire refusée à 62,8 % le 9 juin 2024' },
  { href: 'https://www.bag.admin.ch/fr/assurance-maladie-reduction-des-primes', label: 'Maximum 10 % du revenu pour les primes, initiative d\'allègement des primes refusée le 9 juin 2024, contre-projet en vigueur au 1er janvier 2026' },
  { href: 'https://www.bag.admin.ch/fr/modification-de-la-lamal-financement-uniforme-des-prestations', label: 'Financement uniforme des prestations, EFAS, accepté en votation le 24 novembre 2024, en vigueur en 2028 et 2032' },
  { href: 'https://www.sp-ps.ch/fr/artikel/nouvelle-explosion-en-2027-il-est-grand-temps-de-rendre-les-primes-dassurance-maladie-abordables/', label: 'Initiative du PS pour des primes liées au revenu, lancée le 29 septembre 2026, en récolte de signatures' },
  { href: 'https://www.rts.ch/info/regions/valais/2026/article/valais-initiative-pour-plafonner-les-primes-maladie-a-10-du-revenu-deposee-29124262.html', label: 'Maximum 10 % du revenu, initiative cantonale valaisanne déposée avec 4 902 signatures validées' },
  { href: 'https://www.admin.ch/fr/newnsb/lCw7tC_x3NSVit2XLLYny', label: 'Deuxième volet de maîtrise des coûts, adopté en mars 2025, rabais de quantité sur les médicaments, environ 350 millions par an visés' },
  { href: 'https://www.rts.ch/info/suisse/2026/article/franchise-maladie-a-400-francs-le-projet-divise-la-suisse-29283558.html', label: 'Franchise minimale de 300 à 400 francs, projet du Conseil fédéral en consultation' },
  { href: 'https://www.bag.admin.ch/fr/tardoc-et-forfaits-ambulatoires', label: 'TARDOC et forfaits ambulatoires, en vigueur depuis le 1er janvier 2026, neutralité des coûts exigée' },
  { href: 'https://www.priminfo.admin.ch/downloads/medienmitteilung_2027_FR.pdf', label: 'OFSP, primes 2027, hausse moyenne de 5,0 % et prime mensuelle moyenne de 412 francs' },
]

const methodNotes = [
  'La moyenne arithmétique des hausses annuelles ne retombe pas sur la valeur de 2024. Elle n\'est pas utilisée, et un test le vérifie.',
  'Les graphiques tracent chaque année projetée. Un segment droit entre 2024 et 2050 afficherait une croissance linéaire alors que le taux est composé : à ~3 % par an, la vraie courbe passe sous cette droite de près de 9 % du niveau au milieu de la période.',
  'La part du PIB en 2050 est recalculée à partir des francs projetés des coûts et du PIB. Le pourcentage lui-même n\'est jamais composé.',
  'Dans les hypothèses, une baisse de 1 % est 1 % du niveau d\'aujourd\'hui, environ 970 millions sur les 97 201. Ce n\'est pas 1 point retiré des 3 % de hausse annuelle. Une mesure qui ne fait qu\'aplatir la pente vaut 0 % de baisse de niveau, et le dit.',
  'La facture est ce que paie le bénéficiaire, et elle se lit sur deux lignes de financement. La ligne des primes, 40 006 millions, additionne les primes LAMal, 31 914, les primes LCA, 7 342, et 750 millions d\'autres financements des ménages. La franchise, la quote-part et les paiements directs forment une ligne séparée de 20 907 millions, ce qui porte la facture complète des ménages à 60 913 millions. Une mesure qui ne touche que l\'assurance de base est donc divisée par 31 914, pas par 40 006.',
  'Les coûts sont l\'ensemble, 97 201 millions. L\'OFS les ventile deux fois, par prestataire et par prestation : les deux ventilations partent du même total et ne s\'additionnent pas. Chaque pourcentage de la page nomme son dénominateur.',
  'Le cube du financement totalise 98 269 millions, soit 1 068 de plus que le cube des coûts. L\'écart est celui des deux périmètres OFS ; il est surveillé par un test et aucun pourcentage ne mélange les deux totaux.',
  'Pour une initiative populaire, chaque case donne le gain annoncé par les initiants et celui annoncé par les opposants, chacun avec sa propre source. Les deux camps ne chiffrent pas toujours le même objet.',
  'Les montants des hypothèses sont des gains en une fois, sauf si la source dit le contraire.',
]

function cantonSeries(canton: string) {
  const premium = page.premiums.find((row) => row.canton === canton)
  const subsidy = page.subsidies.find((row) => row.canton === canton)
  if (!premium || !subsidy || subsidy.y2010 === null) return []
  const years = [...new Set([
    ...premium.annual.map((point) => point.year),
    ...subsidy.annual.map((point) => point.year),
    ...premium.projected.map((point) => point.year),
    ...subsidy.projected.map((point) => point.year),
  ])].sort((left, right) => left - right)
  return years.filter((year) => year >= 2010).map((year) => {
    const valueAt = (observed: YearValue[], projected: YearValue[]) => (
      year > 2024 ? projected.find((point) => point.year === year)?.value : observed.find((point) => point.year === year)?.value
    )
    const premiumValue = valueAt(premium.annual, premium.projected)
    const subsidyValue = valueAt(subsidy.annual, subsidy.projected)
    const premiumIndex = premiumValue === undefined || premiumValue === null ? null : (premiumValue / premium.y2010) * 100
    const subsidyIndex = subsidyValue === undefined || subsidyValue === null || subsidy.y2010 === null ? null : (subsidyValue / subsidy.y2010) * 100
    return {
      year,
      premium: observedUntil2024(year) ? premiumIndex : null,
      premiumForecast: forecastFrom2024(year) ? premiumIndex : null,
      subsidy: observedUntil2024(year) ? subsidyIndex : null,
      subsidyForecast: forecastFrom2024(year) ? subsidyIndex : null,
    }
  })
}

export default function LamalPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 md:px-6">
      <section className="rounded-[2rem] bg-slate-950 px-6 py-10 text-white md:px-10 md:py-14">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-red-300">LAMal et facture nationale</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-6xl">Ce que coûte la santé en Suisse</h1>
        <div className="mt-6 max-w-3xl space-y-2 text-lg leading-8 text-slate-200">
          <p>Cette page montre la facture suisse : primes, coûts, part du PIB, financement, et cinq cantons.</p>
          <p>Les chiffres viennent des fichiers OFSP et OFS. En 2024, les coûts sont de 97 201 millions, 11,4 % du PIB. La prime est cantonale, la facture est nationale.</p>
          <p>2024 est provisoire. La colonne 2050 prolonge le taux composé 2010-2024, sans scénario de vieillissement.</p>
          <p>Les leviers qui peuvent changer cette pente sont <a className="font-medium text-white underline" href="#solutions">en bas de page</a>, suivis des <a className="font-medium text-white underline" href="#sources">sources et de la méthode</a>.</p>
        </div>
      </section>

      <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 text-sm leading-6 text-slate-600 shadow-sm md:p-6">
        <p>
          Cette page est produite par un robot. Il assemble les tableaux à partir des fichiers déposés. Une correction peut être signalée <a className="font-medium text-slate-900 underline" href="https://github.com/evaletolab/swiss-10m-dashboard" target="_blank" rel="noreferrer">ici</a>.
        </p>
        <SourceNote sourceIds={['bfs_health_costs_since_1960', 'ofsp_lamal_annual_premiums_and_subsidies']} />
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

      <section id="solutions" className="mt-8 scroll-mt-8">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Solutions</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Classées de la plus forte baisse des coûts à la plus faible. Une baisse de 1 % est 1 % du niveau d'aujourd'hui, environ 970 millions sur les 97 201. C'est une part des 100 %, pas 1 point retiré des 3 % de hausse annuelle. La facture, c'est ce que paie le bénéficiaire. Les coûts, c'est l'ensemble. Pour une initiative populaire, les cases donnent le gain des initiants et celui des opposants.</p>
        <div className="mt-4 grid gap-6">
          {solutions.slice().sort((left, right) => left.costRank - right.costRank).map((solution, index) => (
            <article key={solution.title} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Hypothèse {index + 1}</p>
              <h3 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">{solution.title}</h3>
              <p className="mt-2 max-w-3xl text-base leading-7 text-slate-700">{withStrongFigures(solution.hook)}</p>
              <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl bg-slate-50 px-3 py-3">
                  <dt className="text-xs font-medium text-slate-500">Baisse de la facture</dt>
                  <dd className="mt-1 text-sm font-semibold leading-5 text-slate-950">{withStrongFigures(solution.metrics.facture)}</dd>
                </div>
                <div className="rounded-2xl bg-slate-50 px-3 py-3">
                  <dt className="text-xs font-medium text-slate-500">Baisse des coûts</dt>
                  <dd className="mt-1 text-sm font-semibold leading-5 text-slate-950">{withStrongFigures(solution.metrics.couts)}</dd>
                </div>
                <div className="rounded-2xl bg-slate-50 px-3 py-3">
                  <dt className="text-xs font-medium text-slate-500">Qualité des soins</dt>
                  <dd className="mt-1 text-sm font-semibold leading-5 text-slate-950">{withStrongFigures(solution.metrics.qualite)}</dd>
                </div>
                <div className="rounded-2xl bg-slate-50 px-3 py-3">
                  <dt className="text-xs font-medium text-slate-500">Santé à deux vitesses</dt>
                  <dd className="mt-1 text-sm font-semibold leading-5 text-slate-950">{solution.metrics.deuxVitesses}</dd>
                </div>
              </dl>
              <h4 className="mt-6 text-xs font-semibold uppercase tracking-wide text-slate-500">Le détail</h4>
              <p className="mt-2 text-sm leading-6 text-slate-600"><span className="font-medium text-slate-800">Qui propose.</span> {solution.proposedBy}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600"><span className="font-medium text-slate-800">Avantage.</span> {solution.advantage}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600"><span className="font-medium text-slate-800">Risque.</span> {solution.risk}</p>
              <ol className="mt-4 space-y-4">
                {solution.levers.map((lever, leverIndex) => (
                  <li key={lever.name} className="border-l-2 border-slate-300 pl-4">
                    <p className="text-sm font-semibold leading-6 text-slate-950">{leverEmoji} {leverIndex + 1}. {lever.name}</p>
                    <dl className="mt-2 space-y-1 text-sm leading-6 text-slate-600">
                      <div>
                        <dt className="inline font-medium text-slate-800">Potentiel. </dt>
                        <dd className="inline">{withStrongFigures(lever.potential)}</dd>
                      </div>
                      {lever.effective ? (
                        <div>
                          <dt className="inline font-medium text-slate-800">Déjà effectif. </dt>
                          <dd className="inline">{withStrongFigures(lever.effective)}</dd>
                        </div>
                      ) : null}
                      {lever.feasibility ? (
                        <div>
                          <dt className="inline font-medium text-slate-800">Faisabilité. </dt>
                          <dd className="inline">{withStrongFigures(lever.feasibility)}</dd>
                        </div>
                      ) : null}
                    </dl>
                  </li>
                ))}
              </ol>
              <p className="mt-4 border-t border-slate-100 pt-3 text-xs leading-5 text-slate-500">
                Sources.{' '}
                {solution.sources.map((source, index) => (
                  <span key={source.href}>
                    {index > 0 ? ' · ' : null}
                    <a className="font-medium text-slate-600 underline" href={source.href} target="_blank" rel="noreferrer">{source.label}</a>
                  </span>
                ))}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section id="sources" className="mt-8 scroll-mt-8">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Sources et méthode</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Tout ce que la page affiche vient des fichiers listés ici. Les calculs sont rejoués à chaque construction et vérifiés par des tests.</p>

        <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <h3 className="text-base font-semibold text-slate-950">Méthode de calcul</h3>
          <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-600">
            {methodNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>

          <h3 className="mt-6 text-base font-semibold text-slate-950">Lecture des fichiers</h3>
          <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-600">
            {page.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>

          <h3 className="mt-6 text-base font-semibold text-slate-950">Fichiers de données</h3>
          <SourceNote sourceIds={['bfs_health_costs_since_1960', 'ofsp_lamal_annual_premiums_and_subsidies', 'ofsp_dashboard_health_insurance', 'ofsp_health_premium_subsidies', 'bfs_statpop_population_balance', 'cagr_method_explanation']} />

          <h3 className="mt-6 text-base font-semibold text-slate-950">Sources des hypothèses</h3>
          <ul className="mt-2 space-y-1 text-xs leading-5 text-slate-500">
            {hypothesisSources.map((source) => (
              <li key={source.href}>
                <a className="font-medium text-slate-600 underline" href={source.href} target="_blank" rel="noreferrer">{source.label}</a>
              </li>
            ))}
          </ul>

          <h3 className="mt-6 text-base font-semibold text-slate-950">Initiatives et réformes citées comme sources</h3>
          <ul className="mt-2 space-y-1 text-xs leading-5 text-slate-500">
            {initiativeSources.map((source) => (
              <li key={source.href}>
                <a className="font-medium text-slate-600 underline" href={source.href} target="_blank" rel="noreferrer">{source.label}</a>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  )
}
