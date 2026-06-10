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
```

`pnpm build` runs `pnpm data` before Vite. PDF extraction can print `Syntax Warning: Invalid Font Weight`; this is currently expected.

## Data Pipeline

1. `scripts/download/download_all.ts` optionally downloads configured official sources.
2. `scripts/normalize/normalize_all.ts` writes normalized CSVs into `data/normalized`.
3. `scripts/simulate/simulate_all.ts` writes scenarios, infrastructure needs and growth comparisons into `data/generated`.
4. `scripts/export_to_web.ts` exports generated CSV/JSON data into `src/data`.

Missing data must create actionable entries in `data/generated/download_requests.md` instead of blocking the app.

## Current Chart Contract

- The global chart `Croissance cumulée normalisée` is toggleable because it contains many series.
- The thematic growth charts must show exactly three curves: the subject metric, `population` and `gdp`.
- `population` is the demographic reference and should stay visually stronger.
- `gdp` is the PIB reference and should stay dashed.
- Do not reintroduce removed charts such as housing absorption, visible costs or the old subsidy comparison unless the product direction changes.

## Current Thematic Metrics

- Logement: `housing_stock`. The 2010 point can be `estimated` if OCSTAT stock starts later.
- Écoles: `students`. `school_classes` is still requested but not used as the visible chart metric while empty.
- Santé: `health_cost_per_insured`.
- Transports publics: `operating_expenses`.
- Aide sociale: `social_assistance_spending`; currently backed by `bfs_fibs_social_assistance_ch` as an official national proxy until the Geneva export is provided.
- Aide santé: `health_premium_subsidy_cantonal`.

## Open Data Gaps

Check `data/generated/download_requests.md` for the live list. At the time of this handoff, important gaps are:

- `school_classes` for Geneva.
- `adult_annual_subscription_chf` for TPG / unireso annual adult subscription.
- Geneva-specific `social_assistance_million_chf`, to replace the Swiss FIBS proxy.

## Source Discipline

- Keep source metadata in `scripts/lib/sources.ts`; regenerate with `pnpm data`.
- Prefer official or manual structured sources over hardcoded values.
- If a value is estimated, set the corresponding `data_type_*` field to `estimated`.
- If a non-Geneva source is used only to keep a curve visible, mark it as `official_proxy` and say so in the label/note.
- Never silently convert a national series into a Geneva series.

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
