# Research output schema

Status: **architectural decision** — this JSON Schema is the binding contract between research agents and the import pipeline. Version: `1.0.0` (semver; import endpoint accepts same-major). The machine-readable copy lives at `packages/domain/schemas/research-output.schema.json` once scaffolding exists (ticket LAKE-020); until then this document is authoritative.

## Design rules

1. Every fact is wrapped in an **evidence envelope** — value + provenance + confidence. A bare value is invalid.
2. `"not_found"` status is a first-class result; absence of evidence must be recorded, not omitted.
3. Enum values reference the taxonomy codes ([tag-and-filter-taxonomy.md](tag-and-filter-taxonomy.md)) verbatim; unknown concepts go to `unmappedSignals`.
4. German is the source language of textual fields; English appears only in `localizations.en` after verification ([research-workflow.md](research-workflow.md)).

## Evidence envelope (reused for every researched field)

```json
{
  "value": "…typed per field…",
  "status": "found | not_found | conflicting",
  "confidence": "low | medium | high",
  "evidence": [
    {
      "sourceUrl": "https://…",
      "sourceType": "official_website | tourism_org | public_feed | osm | wikidata | wikipedia | other",
      "retrievedAt": "2026-08-04T10:00:00Z",
      "quoteOrData": "verbatim snippet or extracted data backing the value",
      "note": "optional"
    }
  ],
  "conflictNote": "required when status=conflicting: describe the disagreement"
}
```

Constraints: `status=found` ⇒ ≥1 evidence entry; `sourceType` `osm|wikidata|wikipedia` alone is insufficient for critical fields (hours, prices, closures, accessibility) — those require `official_website` or `tourism_org` evidence to reach `confidence: high`.

## Top-level record schema (abridged JSON Schema)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://bodenseeguide.example/schemas/research-output/1.0.0",
  "type": "object",
  "required": ["schemaVersion", "researchMeta", "identity", "geo", "classification", "localizations"],
  "properties": {
    "schemaVersion": { "const": "1.0.0" },
    "researchMeta": {
      "type": "object",
      "required": ["sector", "researchedAt", "agent", "promptVersion"],
      "properties": {
        "sector": { "pattern": "^BS-(0[1-9]|1[0-5])$" },
        "researchedAt": { "format": "date-time" },
        "agent": { "type": "string" },
        "promptVersion": { "type": "string" },
        "pipelineStep": { "enum": ["discovery", "details", "verified", "translated"] }
      }
    },
    "identity": {
      "type": "object",
      "required": ["candidateId", "nameDe"],
      "properties": {
        "candidateId": { "description": "ULID assigned at discovery; stable through the pipeline" },
        "nameDe": { "$ref": "#/$defs/evidenced" },
        "officialWebsite": { "$ref": "#/$defs/evidenced" },
        "externalIds": {
          "type": "array",
          "items": { "type": "object", "required": ["system", "id"],
            "properties": { "system": { "enum": ["osm", "wikidata", "official"] }, "id": {} } }
        }
      }
    },
    "geo": {
      "type": "object",
      "required": ["coordinates", "countryCode", "municipality", "scopeCheck"],
      "properties": {
        "coordinates": { "$ref": "#/$defs/evidenced", "description": "value: {lat, lon} WGS84" },
        "countryCode": { "enum": ["DE", "CH", "AT"] },
        "municipality": { "$ref": "#/$defs/evidenced" },
        "scopeCheck": {
          "type": "object",
          "required": ["withinBand"],
          "properties": {
            "withinBand": { "type": "boolean" },
            "estimatedShorelineDistanceM": { "type": "number" },
            "exceptionProposed": { "type": "boolean" },
            "exceptionJustification": { "type": "string" }
          }
        },
        "suggestedRegionCode": { "enum": ["UEBERLINGER_SEE", "OBERSEE_NORD", "BAYERN_UFER", "VORARLBERG_UFER", "OBERSEE_SUED", "THURGAU_UFER", "KONSTANZ_SEERHEIN", "UNTERSEE_NORD", "UNTERSEE_SUED"] }
      }
    },
    "classification": {
      "type": "object",
      "properties": {
        "primaryCategory": { "$ref": "#/$defs/evidenced" },
        "subcategories": { "$ref": "#/$defs/evidenced" },
        "interests": { "$ref": "#/$defs/evidenced" },
        "audiences": { "$ref": "#/$defs/evidenced" },
        "childAgeBands": { "$ref": "#/$defs/evidenced" },
        "indoorOutdoor": { "$ref": "#/$defs/evidenced" },
        "rainSuitability": { "$ref": "#/$defs/evidenced" },
        "heatSuitability": { "$ref": "#/$defs/evidenced" },
        "seasons": { "$ref": "#/$defs/evidenced" },
        "typicalDurationMin": { "$ref": "#/$defs/evidenced" },
        "typicalDurationMax": { "$ref": "#/$defs/evidenced" }
      }
    },
    "practical": {
      "type": "object",
      "properties": {
        "openingHours": { "$ref": "#/$defs/evidenced", "description": "value: structured rules {validFrom, validTo, rules:[{days, opens, closes, holidays}]} or {hoursUnknown:true}" },
        "exceptionalClosures": { "$ref": "#/$defs/evidenced" },
        "priceLevel": { "$ref": "#/$defs/evidenced" },
        "prices": { "$ref": "#/$defs/evidenced", "description": "value: [{audience, amount, currency}]" },
        "bookingRequirement": { "$ref": "#/$defs/evidenced" },
        "bookingUrl": { "$ref": "#/$defs/evidenced" },
        "foodOnSite": { "$ref": "#/$defs/evidenced" },
        "cafeOnSite": { "$ref": "#/$defs/evidenced" },
        "picnicAllowed": { "$ref": "#/$defs/evidenced" },
        "toilets": { "$ref": "#/$defs/evidenced" },
        "strollerSuitable": { "$ref": "#/$defs/evidenced" },
        "wheelchairAccess": { "$ref": "#/$defs/evidenced" },
        "wheelchairToilet": { "$ref": "#/$defs/evidenced" },
        "dogPolicy": { "$ref": "#/$defs/evidenced" },
        "visitorLanguages": { "$ref": "#/$defs/evidenced" },
        "transportModes": { "$ref": "#/$defs/evidenced" },
        "nearestStop": { "$ref": "#/$defs/evidenced", "description": "value: {name, distanceM}" },
        "parking": { "$ref": "#/$defs/evidenced" },
        "bicycleAccess": { "$ref": "#/$defs/evidenced" }
      }
    },
    "localizations": {
      "type": "object",
      "required": ["de"],
      "properties": {
        "de": { "type": "object", "required": ["name", "summary"],
          "properties": { "name": {}, "summary": { "description": "original prose, 40–80 words, no copied sentences" }, "description": {}, "practicalNotes": {} } },
        "en": { "type": "object",
          "properties": { "name": {}, "summary": {}, "description": {}, "practicalNotes": {},
            "translationMeta": { "required": ["translatedAt", "sourceLocale", "promptVersion"] } } }
      }
    },
    "duplicateCheck": {
      "type": "object",
      "properties": {
        "checkedAgainst": { "description": "dataset snapshot id / batch ids" },
        "candidates": { "type": "array", "items": { "required": ["matchType", "matchedId", "score"],
          "properties": { "matchType": { "enum": ["external_id", "official_url", "coordinates", "name"] }, "matchedId": {}, "score": {}, "resolution": { "enum": ["distinct", "duplicate", "unclear"] }, "reasoning": {} } } }
      }
    },
    "unmappedSignals": {
      "type": "array",
      "items": { "required": ["signal", "sourceUrl"], "properties": { "signal": {}, "sourceUrl": {}, "suggestedDimension": {} } }
    },
    "reviewFlags": {
      "type": "array",
      "items": { "required": ["reason"], "properties": { "reason": { "enum": ["low_confidence_critical_field", "conflicting_sources", "possible_duplicate", "scope_exception", "unmapped_signals", "other"] }, "detail": {} } }
    }
  },
  "$defs": { "evidenced": { "description": "Evidence envelope as defined above" } }
}
```

## Import validation (beyond schema)

The import endpoint additionally rejects records where: coordinates fall outside the scope bbox without `exceptionProposed` · critical fields claim `high` confidence without official-source evidence · `en` localization exists but `pipelineStep != "translated"` · summary similarity vs. any evidence quote > 0.7 trigram (copied-prose guard) · taxonomy codes unknown. Rejections return machine-readable reasons for agent retry ([../architecture/api-contracts.md](../architecture/api-contracts.md#admin-api-apiadmin-session--role-guarded-noindex-csrf-protected)).

## Versioning

Breaking schema changes bump the major version; the import endpoint supports the current and previous major during a migration window. Prompt versions ride along in `researchMeta.promptVersion` so output quality can be traced to prompt revisions.
