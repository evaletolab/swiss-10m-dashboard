# Dashboard Suisse 10 millions 2050

Dashboard React/TypeScript/Vite qui compare les trajectoires démographiques suisse et genevoise jusqu'en 2050, puis met ces trajectoires en regard de besoins matériels: logements, écoles, santé, transports et dépenses sociales.

La V1 est centrée sur Genève. Elle ne conclut pas pour ou contre l'initiative: elle expose les séries, les hypothèses et les points manquants. Les courbes de croissance cumulée partent de 2010 quand la série existe; les valeurs estimées ou proxy sont explicitement marquées.

## Installation

```bash
pnpm install
cp .env.example .env
pnpm data
pnpm dev
```

Commandes utiles:

```bash
pnpm download
pnpm normalize
pnpm simulate
pnpm export:web
pnpm validate
pnpm build
pnpm build:gh-pages
```

## Architecture

```txt
scripts/download/      Téléchargements optionnels depuis URLs configurées
scripts/normalize/     Normalisation CSV/XLSX/PDF vers data/normalized
scripts/simulate/      Scénarios 2050, besoins et croissance cumulée
scripts/export_to_web  Export JSON vers src/data
src/app/App.tsx        Composition des cartes et graphiques
src/charts/            Graphiques Recharts utilisés par l'interface
src/components/        Cartes, grilles, sélecteurs et notes de source
```

## Modes de données

Le projet ne doit jamais inventer de données réelles.

- `mock`: données synthétiques d'exemple, explicitement marquées comme mock, pour construire la V1 sans blocage.
- `manual`: fichiers déposés dans `data/raw/*/manual`.
- `official`: téléchargements automatisés via API ou fichiers officiels quand les URLs sont configurées.
- `auto`: tente les fichiers officiels/manuels, puis retombe sur le mock.

Définir le mode avec `DATA_MODE` dans `.env` ou l'environnement shell.

## Sources Utilisées Par Les Charts

Les métadonnées affichées par les cartes viennent de `data/generated/sources.json`, généré depuis `scripts/lib/sources.ts`.

| Chart | Données principales | Sources |
| --- | --- | --- |
| La Suisse ne remplace plus ses générations | Bilan démographique suisse, fécondité et remplacement | OFS STATPOP, fallback mock |
| Suisse : réel, tendance et initiative | Scénarios suisse générés depuis la démographie normalisée | OFS STATPOP, fallback mock |
| Genève : réel, tendance et initiative | Population observée Genève puis scénarios 2050 | OCSTAT population Genève, fallback mock |
| Croissance cumulée normalisée | Population, PIB, logement, classes scolaires, santé, TPG, aides santé; charges 2050 ajustées par tension d'absorption | `data/generated/growth_comparison_ge.csv` |
| Logement vs population et PIB | Stock de logements, population, PIB | OCSTAT construction/logement, OFS/OCSTAT PIB |
| Écoles / élèves vs population et PIB | Élèves et étudiants, population, PIB | Annuaire statistique SRED/OCSTAT, OFS/OCSTAT PIB |
| Santé vs population et PIB | Coût santé par assuré, population, PIB | OFSP dashboard AOS, OFS/OCSTAT PIB |
| Transports publics vs population et PIB | Charges d'exploitation TPG, population, PIB | Rapports annuels TPG, OFS/OCSTAT PIB |
| Aide sociale vs population et PIB | Aide sociale économique, population, PIB | Proxy OFS FIBS Suisse tant que l'export Genève manque |
| Aide santé vs population et PIB | Part cantonale des subsides LAMal, population, PIB | OFSP réduction des primes, OFS/OCSTAT PIB |

Notes importantes:

- `housing_stock` a un point 2010 estimé par rétropolation linéaire si la série OCSTAT disponible commence après 2010. Le statut est `estimated`.
- `social_assistance_spending` utilise actuellement `bfs_fibs_social_assistance_ch` comme proxy national. La demande cantonale Genève reste ouverte et doit remplacer ce proxy dès que disponible.
- `school_classes` est estimé depuis les élèves publics/subventionnés et la taille moyenne de classe; la donnée officielle directe reste demandée.
- Les références des charts thématiques sont toujours `population` et `gdp`: population en ligne forte, PIB en pointillé.

## Hypothèse V1: Tension D'absorption Et Coûts

La référence détaillée est documentée dans [`METHODOLOGIE.md`](./METHODOLOGIE.md).

La tension d'absorption est un indicateur interne destiné à rendre lisible l'écart entre croissance démographique et capacités matérielles. Elle n'est pas une statistique officielle, ni une prévision budgétaire. Son annualisation est une estimation de lecture, obtenue depuis des indices pondérés selon un choix méthodologique explicite.

Formule V1:

```txt
tension = 35% logement + 20% écoles + 20% santé + 25% transports
```

Chaque composante mesure un effort relatif par rapport à une capacité de base disponible ou estimée:

- logement: logements additionnels requis / stock de logements de base;
- écoles: classes additionnelles requises / classes de base estimées;
- santé: médecins additionnels requis / médecins théoriques de base;
- transports: trajets publics additionnels requis / fréquentation quotidienne TPG de base.

La tension affichée pour 2050 cumule l'effort historique 2010-base et l'effort additionnel du scénario 2050. Pour les courbes de charges, seule la tension additionnelle base-2050 est utilisée comme coefficient simple:

```txt
charge 2050 ajustée = projection tendance coût x (1 + tension additionnelle / 100)
```

Exemple de lecture: si la tension additionnelle vaut 14%, une charge projetée à 100 CHF devient environ 114 CHF. L'objectif est de matérialiser un ordre de grandeur, pas d'affirmer un coût comptable.

## Données Manuelles

Si une source officielle manque ou si un tableau OCSTAT est seulement disponible en Excel/PDF, déposer le fichier dans le chemin demandé par `data/generated/download_requests.md`, puis relancer:

```bash
pnpm normalize
pnpm simulate
pnpm export:web
pnpm validate
```

Les fichiers manuels attendus en V1 peuvent être déposés ici:

```txt
data/raw/bfs/manual/ch_demography.csv
data/raw/ocstat/manual/ge_demography.csv
data/raw/ocstat/manual/ge_housing.csv ou data/raw/ocstat/manual/ge_housing_stock.xlsx
data/raw/ocstat/manual/ge_prices.csv
data/raw/ocstat/manual/ge_health.csv
data/raw/ocstat/manual/ge_transport.csv
data/raw/ocstat/manual/ge_education.csv ou data/raw/ocstat/manual/ge_education.xlsx
data/raw/ocstat/manual/ge_social_spending.csv ou data/raw/ocstat/manual/ge_social_spending.xlsx
data/raw/tpg/manual/ge_public_transport_finance.csv ou data/raw/tpg/manual/ge_public_transport_finance.xlsx
```

Les demandes ouvertes sont générées dans `data/generated/download_requests.md`.

## Contraintes Éditoriales

Le site ne conclut pas automatiquement pour ou contre l'initiative. Il montre la pente démographique, les capacités d'absorption et les hypothèses utilisées. Quand une donnée manque, l'interface affiche `donnée manquante`; quand une valeur est une hypothèse, elle est visible avec source, confiance et commentaire.

## Sources Et Demandes

- `data/generated/sources.json` contient les sources affichables par graphique.
- `data/generated/download_requests.json` et `.md` listent les données manquantes, la source recommandée et le chemin exact où déposer le fichier.

## Validation

Avant de considérer une modification terminée:

```bash
pnpm data
pnpm validate
pnpm lint
pnpm build
```

Pour produire le dossier statique compatible GitHub Pages du repository:

```bash
pnpm build:gh-pages
```

La commande génère `dist/` avec la base Vite `/swiss-10m-dashboard/` et ajoute `dist/.nojekyll`.

Les warnings `Syntax Warning: Invalid Font Weight` pendant la normalisation viennent de l'extraction PDF et ne bloquent pas la génération.
