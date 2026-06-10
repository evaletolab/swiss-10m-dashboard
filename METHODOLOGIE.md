# Méthodologie: tension d'absorption composite

## Référence méthodologique

Nom court: **ITAC-V1**

Nom complet: **Indice de tension d'absorption composite, version 1**

Cette méthode est une construction interne au projet. Elle n'est pas une statistique officielle, ni une prévision académique ou budgétaire. Elle sert à rendre lisible une question simple: si la population augmente, les capacités matérielles suivent-elles au même rythme ?

L'ITAC-V1 mesure une **tension d'absorption**. Il ne mesure pas directement l'inflation ni la croissance naturelle des coûts. La croissance naturelle des coûts existe déjà dans les séries observées: santé, subsides, charges TPG, salaires, prix, énergie, décisions politiques, etc. La tension est une couche supplémentaire qui représente le risque de coût lié à une capacité insuffisante.

## Pourquoi cette méthode

La méthode a été choisie parce qu'elle est lisible, comparable entre scénarios et suffisamment simple pour éviter une fausse précision. Elle relie la démographie à quatre capacités concrètes: logement, écoles, santé et transports.

L'objectif n'est pas de dire: "le coût sera exactement X". L'objectif est de dire: "si ce scénario produit plus de population à absorber, quelle pression supplémentaire apparaît sur les capacités disponibles ?"

## Formule principale

```txt
ITAC = 35% logement + 20% écoles + 20% santé + 25% transports
```

Chaque composante mesure un effort relatif:

```txt
effort = besoin additionnel / capacité de base
tension composite = somme(effort composante x poids composante)
```

## Composantes

### Logement

```txt
tension logement = logements additionnels requis / stock de logements de base
```

Poids V1: **35%**

Le logement est surpondéré parce qu'il est la contrainte matérielle la plus directement visible: rareté, loyers, construction, foncier et coûts publics indirects.

### Écoles

```txt
tension écoles = classes additionnelles requises / classes de base
classes estimées = élèves publics/subventionnés / taille moyenne de classe
```

Poids V1: **20%**

La donnée officielle directe `school_classes` reste à compléter. En V1, les classes peuvent être estimées depuis les effectifs et la taille moyenne de classe.

### Santé

```txt
tension santé = médecins additionnels requis / médecins théoriques de base
```

Poids V1: **20%**

La capacité médicale est approximée avec un objectif de médecins pour 1000 habitants. Cette constante doit être recalibrée si une meilleure référence genevoise est disponible.

### Transports

```txt
tension transports = trajets publics additionnels requis / fréquentation quotidienne TPG de base
```

Poids V1: **25%**

Les transports reçoivent un poids élevé parce qu'ils conditionnent la capacité réelle du territoire à absorber plus d'habitants et d'emplois.

## Constantes V1

Les constantes viennent de `src/data/assumptions.json` et sont des hypothèses de travail.

| Constante | Valeur | Usage |
| --- | ---: | --- |
| Taille moyenne de ménage | `2.1` personnes / ménage | Convertir population additionnelle en logements requis |
| Taille moyenne de classe | `21` élèves / classe | Estimer les classes si la donnée officielle manque |
| Objectif médecins | `4.5` médecins / 1000 habitants | Estimer l'effort médical |
| Trajets quotidiens | `3` trajets / personne / jour | Estimer l'effort de transport |

Ces constantes ne sont pas neutres. Elles sont assumées comme choix méthodologiques V1 et doivent être remplacées dès que de meilleures séries officielles ou locales sont disponibles.

## Historique, scénario et double comptage

La tension existe déjà sur la période historique `2010 -> 2024`.

Dans les données actuelles, le score 2024 est d'environ **19.8 points**. Cette tension historique est probablement déjà partiellement intégrée aux coûts observés: loyers, subsides, coûts de santé, charges de transport, fonctionnement public.

Pour éviter le double comptage, le modèle n'ajoute pas toute la tension `2010 -> 2050` aux coûts. Il ajoute seulement la tension additionnelle après la base observée:

```txt
tension additionnelle = ITAC 2050 - ITAC 2024
charge 2050 ajustée = projection naturelle de coût 2050 x (1 + tension additionnelle / 100)
```

Exemple:

```txt
ITAC 2024 = 19.8 points
ITAC 2050 scénario initiative = 34.2 points
tension additionnelle = 34.2 - 19.8 = +14.4 points

100 CHF projetés en 2050 deviennent 114 CHF
```

## Annualisation

Les valeurs `0.7%`, `1.1%` ou `1.2% par an` ne sont pas la croissance naturelle des coûts. Elles sont l'annualisation du score composite `2010 -> 2050`.

```txt
annualisation = (1 + ITAC_2050 / 100)^(1 / 40) - 1
```

Exemples indicatifs:

| Scénario | ITAC 2050 | Annualisation |
| --- | ---: | ---: |
| Scénario initiative | `34.2 pts` | environ `0.7%/an` |
| Tendance linéaire | `52.4 pts` | environ `1.1%/an` |
| Tendance CAGR | `62.7 pts` | environ `1.2%/an` |

Ces rythmes donnent une lecture temporelle du score composite. Ils s'ajoutent conceptuellement à la croissance naturelle des coûts, mais le modèle applique uniquement la tension additionnelle `2024 -> 2050` pour éviter de compter deux fois la tension historique.

## 5 why sur la valeur composite

### 1. Pourquoi le score composite existe ?

Parce qu'une population plus élevée ne produit pas seulement une courbe démographique. Elle produit des besoins matériels: logements, classes, médecins, transports. Le score agrège ces besoins en une valeur comparable entre scénarios.

### 2. Pourquoi ne pas utiliser seulement les courbes de coûts actuelles ?

Parce que les coûts observés suivent déjà leur propre dynamique: inflation, salaires, décisions politiques, prix médicaux, énergie, vieillissement, organisation des services. Ces coûts ne disent pas toujours si les capacités physiques suivent la population.

### 3. Pourquoi la tension ne suit pas simplement la tendance naturelle ?

Parce que la tension mesure un écart de capacité. Un budget peut augmenter sans que les logements, classes, médecins ou transports augmentent assez vite. Inversement, une capacité peut être créée avant que le coût complet soit visible.

### 4. Pourquoi distinguer 2010-2024 et 2024-2050 ?

Parce que la tension `2010 -> 2024` existe déjà. Elle est probablement déjà partiellement incorporée dans les coûts observés. Si on ajoutait toute la tension `2010 -> 2050` aux charges futures, on compterait deux fois la partie historique.

### 5. Pourquoi ajouter seulement la tension additionnelle aux charges 2050 ?

Parce que la projection naturelle de coût part déjà des coûts observés à la base. La seule partie à ajouter est donc la pression supplémentaire créée par le scénario après la base observée:

```txt
surcoût tension = ITAC 2050 - ITAC 2024
```

Cette règle reste simple, transparente et améliorable.

## Limites

- L'ITAC-V1 est une méthode de lecture, pas une vérité statistique.
- Les poids sont assumés et peuvent être discutés.
- Les constantes doivent être remplacées par de meilleures données locales si disponibles.
- Les coûts 2050 restent des projections: la tension ne remplace pas un modèle budgétaire complet.
- Les résultats doivent être lus comme des ordres de grandeur, pas comme des montants définitifs.
