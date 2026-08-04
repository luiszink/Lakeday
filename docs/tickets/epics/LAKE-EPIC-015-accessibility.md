# LAKE-EPIC-015 — Accessibility

**Phase:** MVP (M6; per-ticket duties throughout) · **Status:** open

## Goal
WCAG 2.2 AA closure (REQ-A11Y-01): axe automation in CI, full keyboard/screen-reader audit with fixes, reduced-motion and contrast verification including map markers, and the map-alternative guarantee. Accessibility is built per-ticket via the [definition of done](../../agents/definition-of-done.md); this epic is the infrastructure + audits.

## Success criteria
- Zero axe violations on core screens; keyboard-only and screen-reader passes of flows F1–F6 succeed; reduced-motion respected globally; marker contrast verified against actual tiles.

## Tickets
[LAKE-058](../tasks/LAKE-EPIC-015-tasks.md#lake-058--axe-ci-and-keyboardscreen-reader-audit) axe+audit · [LAKE-059](../tasks/LAKE-EPIC-015-tasks.md#lake-059--reduced-motion-contrast-and-map-accessibility) motion+contrast+map

## Dependencies
All core UI epics (6–12) merged.

## Key specs
[accessibility.md](../../quality/accessibility.md)
