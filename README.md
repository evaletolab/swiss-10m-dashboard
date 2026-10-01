# Dashboard de statistiques publiques suisses

Projet React/TypeScript/Vite qui transforme des statistiques officielles suisses en graphiques documentés. Les données viennent de l'OFS et de Swiss Stats Explorer, de l'OCSTAT genevois et de l'OFSP. Le dépôt contient la chaîne complète: téléchargement, normalisation, projection, export JSON et interface.

Le projet n'est pas un support de campagne. Il expose les séries, nomme la source de chaque chiffre et le dénominateur de chaque pourcentage, marque les valeurs estimées ou proxy, et ne conclut pas pour ou contre un texte politique. Quand un camp et son opposant avancent deux chiffres différents, les deux sont affichés avec leur source respective.

## Dossiers

| Dossier | Code | État |
| --- | --- | --- |
| Coûts du système de santé et LAMal: niveau, financement, primes cantonales, projection 2050 et hypothèses de baisse chiffrées | `scripts/lamal/`, `src/lamal/` | monté par `src/main.tsx` |
| Suisse à 10 millions: trajectoires démographiques suisse et genevoise jusqu'en 2050, confrontées aux besoins en logements, écoles, santé, transports et dépenses sociales | `src/app/App.tsx`, `src/charts/` | présent dans le dépôt, pas monté |

Les deux dossiers partagent la même chaîne de données et le même registre de sources. Pour afficher le second, importer `App.tsx` dans `src/main.tsx` à la place de `LamalPage.tsx`.

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
pnpm test
pnpm build
pnpm build:gh-pages
```

## Architecture

```txt
scripts/download/      Téléchargements optionnels depuis URLs configurées
scripts/normalize/     Normalisation CSV/XLSX/PDF vers data/normalized
scripts/simulate/      Scénarios 2050, besoins et croissance cumulée
scripts/lamal/         Modèle des coûts de la santé: build, math, model et tests
scripts/lib/sources.ts Registre des sources, exporté vers sources.json
scripts/export_to_web  Export JSON vers src/data
src/main.tsx           Point d'entrée, monte la page affichée
src/lamal/LamalPage.tsx Page des coûts de la santé
src/app/App.tsx        Page démographie et absorption
src/charts/            Graphiques Recharts utilisés par l'interface
src/components/        Cartes, grilles, sélecteurs et notes de source
```

`pnpm normalize` construit aussi `data/generated/lamal.json` via `scripts/lamal/build.ts`, puis `pnpm export:web` le copie dans `src/data`. Les fichiers de `src/data` et `data/generated` sont générés: les modifier à la main n'a pas de sens, il faut relancer la chaîne.

## Exploiter Les Données De Swiss Stats Explorer

Les cubes de l'OFS publiés sur [stats.swiss](https://stats.swiss) sont interrogeables en SDMX sans clé. L'hôte de l'API n'est pas celui du portail: `stats.swiss` renvoie l'application web, les données sont sur `disseminate.stats.swiss`.

```bash
curl "https://disseminate.stats.swiss/rest/data/CH1.COU,DF_COU_HEALTH_COSTS,1.0.0/_T..._T._T._T._T.CHF.A?startPeriod=2024&endPeriod=2024&dimensionAtObservation=AllDimensions&format=csvfilewithlabels"
```

Points à connaître:

- la clé porte une valeur par dimension du cube, séparées par des points, dans l'ordre de la structure; une position vide ouvre la dimension, `_T` demande le total. Une clé incomplète renvoie `422` en indiquant le nombre de positions attendu;
- `format=csvfilewithlabels` ajoute le libellé lisible à côté de chaque code, ce qui rend le fichier déposé dans `data/raw` relisible sans le dictionnaire;
- retirer la version de l'identifiant, `CH1.COU,DF_COU_HEALTH_COSTS`, suit automatiquement la dernière version publiée. Les fichiers du dépôt épinglent la version pour que les chiffres cités restent reproductibles;
- le même total peut être ventilé selon plusieurs axes, par exemple par prestataire et par prestation: deux ventilations du même total ne s'additionnent pas.

La documentation de l'API est publiée par l'OFS sous le numéro de commande `do-e-00.02-sse-02`.

## Modes de données

Le projet ne doit jamais inventer de données réelles.

- `mock`: données synthétiques d'exemple, explicitement marquées comme mock, pour avancer sans blocage.
- `manual`: fichiers déposés dans `data/raw/*/manual`.
- `official`: téléchargements automatisés via API ou fichiers officiels quand les URLs sont configurées.
- `auto`: tente les fichiers officiels/manuels, puis retombe sur le mock.

Définir le mode avec `DATA_MODE` dans `.env` ou l'environnement shell.

Le dossier santé ne connaît pas le mode `mock`: `scripts/lamal/build.ts` lit les fichiers officiels et échoue si l'un manque ou si un total ne se referme pas. Un chiffre affiché y vient toujours d'une publication OFS ou OFSP.

## Sources Utilisées Par Les Charts

Les métadonnées affichées par les cartes viennent de `data/generated/sources.json`, généré depuis `scripts/lib/sources.ts`.

### Dossier santé

| Chart | Données principales | Sources |
| --- | --- | --- |
| Prime annuelle moyenne | Prime par assuré et par an, groupe d'âge total | OFSP dashboard assurance-maladie |
| Coûts suisses et part du PIB | Coûts, PIB et part du PIB depuis 1960 | OFS, classeur des coûts de la santé |
| Indice 2010 = 100 | Coûts, PIB et population indexés, projetés année par année | OFS, classeur des coûts de la santé |
| Où va la facture en 2024 | Ventilation par prestataire, quatre groupes sur 97 201 millions | OFS, tableau Coût et financement 2024 |
| Qui finance | Ménages, primes, collectivités publiques et autres, 1995-2024 | OFS, cube `DF_COU_HEALTH_FINANCING` |
| Cinq cantons, prime et subside | Part cantonale de la réduction des primes | OFSP réduction des primes |
| Hypothèses de baisse | Coûts 2024 par prestation et mode de fourniture | OFS, cube `DF_COU_HEALTH_COSTS` |

### Dossier démographie et absorption

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
| Aide santé vs population et PIB | Part cantonale des subsides LAMal, population, PIB | OFSP réduction des primes, RTS réforme genevoise 2020, OFS/OCSTAT PIB |

Notes importantes:

- `housing_stock` a un point 2010 estimé par rétropolation linéaire si la série OCSTAT disponible commence après 2010. Le statut est `estimated`.
- `social_assistance_spending` utilise actuellement `bfs_fibs_social_assistance_ch` comme proxy national. La demande cantonale Genève reste ouverte et doit remplacer ce proxy dès que disponible.
- `school_classes` est estimé depuis les élèves publics/subventionnés et la taille moyenne de classe; la donnée officielle directe reste demandée.
- `health_premium_subsidy_cantonal` contient une rupture 2020 documentée par la réforme genevoise des subsides. La projection utilise un lissage linéaire 10 ans au lieu d’un CAGR brut.
- Les références des charts thématiques sont toujours `population` et `gdp`: population en ligne forte, PIB en pointillé.

## Liens Sources Pour Reprise

Ces liens permettent de retrouver ou reconstruire les données utilisées:

- OFS, coût et financement du système de santé: https://www.bfs.admin.ch/bfs/fr/home/statistiques/sante/cout-financement.html
- OFS, cube des coûts par prestataire, prestation et mode de fourniture: https://stats.swiss/vis?df[ag]=CH1.COU&df[id]=DF_COU_HEALTH_COSTS
- OFS, cube du financement par régime: https://stats.swiss/vis?df[ag]=CH1.COU&df[id]=DF_COU_HEALTH_FINANCING
- OFS STATPOP, bilan démographique: https://opendata.swiss/fr/dataset/demografische-bilanz-nach-institutionellen-gliederungen2
- OCSTAT population Genève: https://statistique.ge.ch/graphiques/affichage.asp?filtreGraph=01_01
- OCSTAT construction et logement: https://statistique.ge.ch/domaines/09/09_02/
- OCSTAT logements subventionnés: https://statistique.ge.ch/domaines/09/09_02/tableaux.asp
- OCSTAT transports publics et véhicules: https://statistique.ge.ch/domaines/11/11_02/tableaux.asp
- OCSTAT frontaliers: https://statistique.ge.ch/domaines/03/03_05/tableaux.asp
- OCSTAT système de santé: https://statistique.ge.ch/domaines/14/14_02/tableaux.asp
- OCSTAT / Hospice général, aide sociale économique: https://statistique.ge.ch/domaines/13/13_03/
- OCSTAT indice genevois des prix: https://statistique.ge.ch/graphiques/affichage.asp?dom=1&filtreGraph=05_02
- OFSP primes LAMal: https://opendata.swiss/fr/dataset/health-insurance-premiums
- OFSP dashboard assurance-maladie AOS: https://opendata.swiss/fr/dataset/dashboard-krankenversicherung-okp
- OFSP dashboard primes et réduction des primes: https://dashboardassurancemaladie.admin.ch/primes.html
- OFS FIBS aide sociale Suisse: https://www.bfs.admin.ch/bfs/fr/home/statistiques/securite-sociale/aide-sociale/depenses-prestations-sociales-sous-condition-ressources.html
- OFS FIBS aide sociale cantonale: https://www.aidesocialeasl.bfs.admin.ch/
- PIB cantonal OFS: https://www.bfs.admin.ch/bfs/fr/home/statistiques/economie-nationale/comptes-nationaux/produit-interieur-brut-canton.html
- Annuaire statistique enseignement Genève: https://www.ge.ch/annuaire-statistique-enseignement-public-prive-geneve
- Rapports annuels TPG: https://www.tpg.ch/fr/nous-connaitre/publications/rapports-annuels
- RTS, réforme genevoise des subsides maladie 2020: https://www.rts.ch/info/regions/geneve/10883302-le-nombre-de-beneficiaires-des-subsides-maladie-va-doubler-a-geneve.html

## Dossier Démographie: Tension D'absorption Et Coûts

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

Les fichiers manuels attendus peuvent être déposés ici:

```txt
data/raw/bfs/manual/cou_health_costs_since_1960.xlsx
data/raw/bfs/manual/cou_2024_breakdown.csv
data/raw/bfs/manual/cou_2024_services.csv
data/raw/bfs/manual/cou_financing_1995_2024.csv
data/raw/ofsp/manual/dashboardassurancemaladie-donnees/Daten/04_Primes_prime-moyenne-mensuelle.xlsx
data/raw/ofsp/manual/dashboardassurancemaladie-donnees/Daten/04_Primes_reduction-des-primes.xlsx
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

Le site ne conclut pour ou contre aucun texte soumis au vote. Il montre les séries, les hypothèses utilisées et ce qui manque. Quand une donnée manque, l'interface affiche `donnée manquante`; quand une valeur est une hypothèse, elle est visible avec source, confiance et commentaire.

Règles de chiffrage appliquées aux deux dossiers:

- tout pourcentage nomme son dénominateur. Une baisse de 1 % est 1 % du niveau d'aujourd'hui, pas un point retiré du taux de croissance annuel. Une mesure qui aplatit seulement la pente vaut 0 % de baisse de niveau, et le dit;
- un transfert entre payeurs n'est pas une baisse de coût. Le coût est ce que paie l'ensemble, la facture est ce que paie le bénéficiaire, et les deux ont leur propre dénominateur;
- pour une initiative populaire, chaque chiffre est donné selon les initiants et selon les opposants, chacun avec sa source. Les intitulés reprennent le nom employé par les initiants;
- un montant est ponctuel sauf si la source dit qu'il est annuel;
- les prémisses citées dans les textes sont verrouillées par des tests, qui échouent si l'OFS révise une série.

## Licence

Code publié sous licence MIT. Voir [`LICENSE`](./LICENSE).

## Sources Et Demandes

- `data/generated/sources.json` contient les sources affichables par graphique.
- `data/generated/download_requests.json` et `.md` listent les données manquantes, la source recommandée et le chemin exact où déposer le fichier.

## Validation

Avant de considérer une modification terminée:

```bash
pnpm data
pnpm validate
pnpm test
pnpm lint
npx tsc -p tsconfig.app.json --noEmit
pnpm build
```

`pnpm test` exécute `scripts/lamal/lamal.test.ts` avec le lanceur de Node: fermeture des totaux, cohérence des taux composés, forme des courbes projetées et montants cités dans les textes.

Pour produire le dossier statique compatible GitHub Pages du repository:

```bash
pnpm build:gh-pages
```

La commande génère `dist/` avec la base Vite `/swiss-10m-dashboard/` et ajoute `dist/.nojekyll`.

Les warnings `Syntax Warning: Invalid Font Weight` pendant la normalisation viennent de l'extraction PDF et ne bloquent pas la génération.
