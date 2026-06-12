# Demandes de téléchargement

## ge_education_manual_source_missing

- Dataset: ge_education
- Champs/années manquants: school_classes
- Raison: Comparer la croissance démographique avec la pression scolaire et les classes scolaires.
- Source conseillée: Annuaire statistique de l’enseignement public et privé à Genève / SRED / OCSTAT
- URL: https://www.ge.ch/annuaire-statistique-enseignement-public-prive-geneve
- Formats acceptés: CSV, XLS, XLSX, PDF
- Destination: `data/raw/ocstat/manual/ge_education.csv ou data/raw/ocstat/manual/ge_education.xlsx`
- Instruction: Déposer si disponible une série annuelle avec le nombre officiel de classes scolaires à Genève. Le fichier OFS actuel donne la taille moyenne des classes et permet seulement des classes équivalentes estimées.

## ge_housing_aid_subsidies_history_missing

- Dataset: ge_social_spending
- Champs/années manquants: year, housing_aid_subsidies_million_chf
- Raison: Comparer le poids des aides et subventions publiques directes au budget de fonctionnement de l’État.
- Source conseillée: Budgets et comptes de l’État de Genève, politique publique G Aménagement et logement, subventions au logement
- URL: https://ge.ch/grandconseil/data/texte/PL13535A.pdf
- Formats acceptés: CSV, XLS, XLSX, PDF
- Destination: `data/raw/ocstat/manual/ge_social_spending.csv`
- Instruction: Déposer une série annuelle 2010-2025 des subventions au logement / allocations logement en millions CHF nominaux. Le point budget 2025 disponible est 59 M CHF.

## ge_social_assistance_spending_missing

- Dataset: ge_social_spending
- Champs/années manquants: year, social_assistance_million_chf
- Raison: Comparer la croissance des dépenses nettes d’aide sociale avec la démographie et le PIB.
- Source conseillée: OCSTAT domaine 13 Sécurité sociale, prestations sociales sous condition de ressources / aide sociale, ou Comptes de l’État de Genève Tome 2 Cohésion sociale
- URL: https://statistique.ge.ch/domaines/13/13_03/
- Formats acceptés: CSV, XLS, XLSX, PDF
- Destination: `data/raw/ocstat/manual/ge_social_spending.csv`
- Instruction: Déposer une série annuelle avec les dépenses nettes d’aide sociale économique / Hospice général en millions CHF. Ne pas inclure les subsides LAMal afin d’éviter un double comptage.

## ge_state_budget_posts_history_missing

- Dataset: ge_state_budget_posts
- Champs/années manquants: year, total_charges_million_chf, cohesion_sociale_million_chf, formation_million_chf, sante_million_chf, mobilite_million_chf, securite_population_million_chf, justice_million_chf, amenagement_logement_million_chf, environnement_energie_million_chf, etats_majors_transversal_million_chf, impots_finances_million_chf, culture_sport_loisirs_million_chf, economie_emploi_million_chf
- Raison: Afficher une série stackée 2010-2024 des charges de fonctionnement de l’État par politique publique, puis une projection 2050.
- Source conseillée: Budgets et comptes de l’État de Genève, Tome 1, détail par politique publique et programme
- URL: https://www.ge.ch/finances-publiques/budget-comptes-etat
- Formats acceptés: CSV, XLS, XLSX
- Destination: `data/raw/etat_ge/manual/ge_state_budget_posts.csv`
- Instruction: Déposer une série annuelle 2010-2024 en millions CHF nominaux. Les colonnes par politique publique doivent totaliser les charges de fonctionnement hors imputations internes et subventions à redistribuer.

