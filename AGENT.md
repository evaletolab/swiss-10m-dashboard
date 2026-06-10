# Agent Handoff

## Project Goal

Build a data-driven dashboard about Swiss and Geneva demographic trajectories to 2050. The app must show simulations, source status and assumptions without taking an editorial position for or against the initiative.

## Stack

- Frontend: Vite, React, TypeScript, Recharts, Tailwind CSS.
- Data pipeline: Node.js 20+, TypeScript scripts, pnpm, CSV/XLSX/PDF parsing.
- Generated web data lives in `src/data`; do not edit these JSON files manually.

## Core Commands

```bash
pnpm install
pnpm data
pnpm validate
pnpm lint
pnpm build
pnpm build:gh-pages
```

`pnpm build` and `pnpm build:gh-pages` run `pnpm data` before Vite. PDF extraction can print `Syntax Warning: Invalid Font Weight`; this is currently expected.

## Data Pipeline

1. `scripts/download/download_all.ts` optionally downloads configured official sources.
2. `scripts/normalize/normalize_all.ts` writes normalized CSVs into `data/normalized`.
3. `scripts/simulate/simulate_all.ts` writes scenarios, infrastructure needs and growth comparisons into `data/generated`.
4. `scripts/export_to_web.ts` exports generated CSV/JSON data into `src/data`.

Missing data must create actionable entries in `data/generated/download_requests.md` instead of blocking the app.

Generated files:

- `data/generated/*` is produced by simulation/export scripts.
- `src/data/*` is generated for the frontend. Do not edit these files manually; change the source CSV/script, then run `pnpm data`.

## How To Add Data

1. Add or update a normalizer in `scripts/normalize/*`.
2. Write normalized CSV output under `data/normalized`.
3. Add missing-data requests through `addDownloadRequest()` when the official/manual source is unavailable.
4. Add source metadata in `scripts/lib/sources.ts`.
5. If the data affects scenarios or growth charts, update `scripts/simulate/*`.
6. Run `pnpm data`, then inspect `data/generated/*` and `src/data/*`.
7. Run `pnpm validate`, `pnpm lint`, and `pnpm build` or `pnpm build:gh-pages`.

Manual files should go under `data/raw/<provider>/manual`. Prefer structured CSV/XLSX over PDF when possible. If a national or Swiss series is used as a temporary proxy for Geneva, mark it as `official_proxy` and make the label/note explicit.

## How To Add A Chart

1. Add the chart component in `src/charts` if it needs custom rendering.
2. Add the card in `src/app/App.tsx` using `ChartCard`.
3. Pass `sourceIds` so detailed source notes render under the block.
4. If the chart uses generated growth rows, prefer `GrowthComparisonChart`.
5. Thematic growth charts should normally show exactly three curves: subject metric, population reference, GDP reference.
6. If a chart has a dense legend, use `ChartCard contentClassName` or chart-specific props instead of shrinking labels.

## How To Change Visuals

- Shared card layout lives in `src/components/ChartCard.tsx`.
- Source rendering lives in `src/components/SourceNote.tsx` and `StudySourcesBlock.tsx`.
- Global cumulative chart behavior lives in `src/charts/GrowthComparisonChart.tsx`.
- `Croissance cumulée normalisée` currently uses a fixed `yDomain={[0, 1200]}` and a taller card to keep scenarios visually comparable.
- Do not change generated JSON to fix visuals; change React components or simulation inputs.

## Current Chart Contract

- The global chart `Croissance cumulée normalisée` is toggleable because it contains many series.
- The global chart compares against `Tendance actuelle` in dashed lines for pressure-adjusted cost metrics.
- The global chart uses fixed Y-axis max `1200%` for scenario comparability.
- The thematic growth charts must show exactly three curves: the subject metric, `population` and `gdp`.
- `population` is the demographic reference and should stay visually stronger.
- `gdp` is the PIB reference and should stay dashed.
- Do not reintroduce removed charts such as housing absorption, visible costs or the old subsidy comparison unless the product direction changes.

## Current Thematic Metrics

- Logement: `housing_stock`. The 2010 point can be `estimated` if OCSTAT stock starts later.
- Écoles chart: `students`; note says `school_classes = élèves publics/subventionnés / taille moyenne de classe`.
- Global chart: uses `school_classes` so scenario-driven school capacity needs are visible.
- Santé: `health_cost_per_insured`.
- Transports publics: `operating_expenses`.
- Aide sociale: `social_assistance_spending`; currently backed by `bfs_fibs_social_assistance_ch` as an official national proxy until the Geneva export is provided.
- Aide santé: `health_premium_subsidy_cantonal`; 2020 is a documented Geneva reform break and the 2050 projection uses a 10-year linear smoothing instead of raw CAGR.

## Methodology

Detailed methodology is in `METHODOLOGIE.md`.

Current named reference: `ITAC-V1` (Indice de tension d'absorption composite, version 1).

Main rules:

- Tension components: 35% housing, 20% schools, 20% health, 25% transport.
- Historical tension `2010 -> 2024` already exists and should not be double-counted.
- Costs use natural trend plus only additional tension `2024 -> 2050`.
- Health premium subsidies have a 2020 policy/regime break documented by RTS and Grand Conseil context. Use the documented smoothing rule unless the methodology changes.
- A future TODO exists for a theoretical ideal absorption curve. Do not present a 10%, 15% or 20% margin as a convention unless calibrated.

## Open Data Gaps

Check `data/generated/download_requests.md` for the live list. At the time of this handoff, important gaps are:

- `school_classes` for Geneva.
- `adult_annual_subscription_chf` for TPG / unireso annual adult subscription.
- Geneva-specific `social_assistance_million_chf`, to replace the Swiss FIBS proxy.

## Source Discipline

- Keep source metadata in `scripts/lib/sources.ts`; regenerate with `pnpm data`.
- Keep source reprise links in `README.md` when useful for manual rebuilds.
- Prefer official or manual structured sources over hardcoded values.
- If a value is estimated, set the corresponding `data_type_*` field to `estimated`.
- If a non-Geneva source is used only to keep a curve visible, mark it as `official_proxy` and say so in the label/note.
- Never silently convert a national series into a Geneva series.

## Publishing

- GitHub Pages build command: `pnpm build:gh-pages`.
- The command builds Vite with base `/swiss-10m-dashboard/` and creates `dist/.nojekyll`.
- GitHub Actions workflow: `.github/workflows/pages.yml`.
- Pages deploys on push to `master` and via manual `workflow_dispatch`.
- License: MIT (`LICENSE`).

## Cleanup Notes

Unused legacy components were removed after the current chart refactor:

- `HousingAbsorptionChart`
- `CostPressureChart`
- `SubsidyEvolutionChart`
- `InfrastructureNeedsChart`
- `CapacityRadar`
- `DataTable`
- `MetricCard`

Before deleting more files, search for imports and generated-data dependencies, then run `pnpm lint` and `pnpm build`.

## Known Caveats

- `data/raw/ofsp/manual/dashboardassurancemaladie-donnees.zip` may appear as deleted in the working tree. Do not commit that deletion unless intentionally removing the raw OFSP archive.
- `pnpm normalize` can emit many PDF `Syntax Warning: Invalid Font Weight` messages; they are non-blocking.
- Some generated values depend on manually provided files under `data/raw/*/manual`; document any replacement source in `README.md` and `scripts/lib/sources.ts`.
