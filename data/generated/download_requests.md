# Demandes de téléchargement

## ge_education_manual_source_missing

- Dataset: ge_education
- Champs/années manquants: school_classes
- Raison: Comparer la croissance démographique avec la pression scolaire et les classes scolaires.
- Source conseillée: Annuaire statistique de l’enseignement public et privé à Genève / SRED / OCSTAT
- URL: https://www.ge.ch/annuaire-statistique-enseignement-public-prive-geneve
- Formats acceptés: CSV, XLS, XLSX, PDF
- Destination: `data/raw/ocstat/manual/ge_education.csv ou data/raw/ocstat/manual/ge_education.xlsx`
- Instruction: Déposer si disponible une série annuelle avec le nombre de classes scolaires à Genève. Les effectifs élèves, enseignants ETP et taille moyenne de classe sont déjà couverts par SRED/OFS.

## ge_public_transport_fare_missing

- Dataset: ge_public_transport_finance
- Champs/années manquants: adult_annual_subscription_chf
- Raison: Comparer le prix usager des transports publics avec les subventions et la croissance démographique.
- Source conseillée: Tarifs unireso / TPG, lois tarifaires et archives Grand Conseil
- URL: https://www.tpg.ch/fr/tarifs-titres-de-transport
- Formats acceptés: CSV, XLS, XLSX, PDF
- Destination: `data/raw/tpg/manual/ge_public_transport_finance.csv ou data/raw/tpg/manual/ge_public_transport_finance.xlsx`
- Instruction: Compléter la série avec le prix de l’abonnement annuel adulte Tout Genève/zone 10 par année.

## ge_social_assistance_spending_missing

- Dataset: ge_social_spending
- Champs/années manquants: year, social_assistance_million_chf
- Raison: Comparer la croissance des dépenses nettes d’aide sociale avec la démographie et le PIB.
- Source conseillée: OCSTAT domaine 13 Sécurité sociale, prestations sociales sous condition de ressources / aide sociale, ou Comptes de l’État de Genève Tome 2 Cohésion sociale
- URL: https://statistique.ge.ch/domaines/13/13_03/
- Formats acceptés: CSV, XLS, XLSX, PDF
- Destination: `data/raw/ocstat/manual/ge_social_spending.csv`
- Instruction: Déposer une série annuelle avec les dépenses nettes d’aide sociale économique / Hospice général en millions CHF. Ne pas inclure les subsides LAMal afin d’éviter un double comptage.

