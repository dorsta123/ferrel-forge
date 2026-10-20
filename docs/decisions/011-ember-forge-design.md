# 011 — Ember Forge visual design
**Status:** Accepted · **Date:** 2026-10-19 · **Phase:** redesign

## Context
The site needed a distinctive look for a portfolio piece.

## Decision
"Ember Forge": warm near-black default with a molten amber/ember accent, Bricolage Grotesque headings, grain and glow effects, plus a light theme via a toggle (`next-themes`, remembered per visitor). shadcn/ui components (Base UI flavor).

## Alternatives considered
"Vinyl Editorial" (light, serif, record-shop feel); "Neon Market" (violet/cyan trading-floor look). For theming: one look only, or follow the device setting.

## Consequences
- Every screen is designed and checked in both themes, desktop and phone.
- Chart colors are validated with the dataviz palette validator against both surfaces.
- No fake content: stats show real values, demo charts run the real pricing engine.
