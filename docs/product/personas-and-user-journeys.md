# Personas and user journeys

Status: **recommendation** derived from confirmed target groups (families, couples, solo travellers; German- and English-speaking tourists).

## Personas

The seven personas double as **test personas** in [../quality/testing-strategy.md](../quality/testing-strategy.md#test-personas).

### P1 — Anna & Jonas, German couple without a car
- Mid-30s, from Stuttgart, 4-day trip based in Konstanz. Travel by train, ferry, bicycle.
- Needs: public-transport reachability filter, "open now", distance from accommodation, ferry connections, café availability.
- Frustration today: municipal sites don't say how to arrive without a car.

### P2 — Claire, English-speaking solo traveller
- 28, from Ireland, first time in the region, based in Bregenz. No German.
- Needs: complete English content, currency clarity (EUR vs CHF), border-crossing basics, Sunday/holiday closures, which attractions offer English information, solo-friendly activities.
- Frustration today: most regional information is German-only; Swiss prices surprise her.

### P3 — Familie Weber, family with toddler (2) and stroller
- Based in a holiday apartment in Radolfzell, one week, car available.
- Needs: stroller suitability, child age fit, changing facilities proxy (toilets), picnic options, short visit durations, rain alternatives, parking.
- Frustration today: "family friendly" labels never say *which* ages.

### P4 — Familie Керимов/Meier, family with older children (9 and 13)
- Based in Friedrichshafen, bilingual household, mixed interests (tech museums vs. swimming).
- Needs: interest filters per family member, combining 2–3 stops into a day plan, expected duration, budget control.

### P5 — Herr Schneider, wheelchair user
- 61, travelling with his wife, based in Überlingen.
- Needs: verified wheelchair accessibility (not guesses), accessible toilets, step-free transport info, accessible ferries/boats.
- Hard rule for us: accessibility facts must be verified or explicitly marked unknown — never assumed ([../quality/data-quality-strategy.md](../quality/data-quality-strategy.md)).

### P6 — Rainy-day planner (any group)
- Cross-cutting situational persona: it is raining, plans collapsed, needs indoor options **now**, sorted by distance.
- Needs: rain-suitability filter + "open now" + distance sort in one tap ("rainy day" quick filter).

### P7 — Budget-conscious visitor
- Student/backpacker or family watching costs.
- Needs: free and low-price filters, picnic suitability, free viewpoints/beaches, guest-card discounts visibility.

## International-visitor information needs (confirmed requirement)

International tourists especially need clear information about the following. These map to attraction fields and static content pages:

| Need | Where it lives |
|---|---|
| Public transport | Per attraction: nearest stop, transport modes ([../architecture/domain-model.md](../architecture/domain-model.md)); static "getting around" guide page |
| Local guest cards | Static guide page per country + per-attraction note field (post-MVP structured field, see [../roadmap/open-questions.md](../roadmap/open-questions.md) OQ-6) |
| Currencies | Attraction price fields carry currency (EUR/CHF); static guide explains cash/card habits |
| Border crossings | Static guide page (documents, goods limits — marked "requires legal review") |
| Sunday and public holiday restrictions | Opening-hours model supports holidays ([../architecture/domain-model.md](../architecture/domain-model.md#opening-hours)); static guide explains CH/DE/AT differences |
| Reservation requirements | Structured field `bookingRequirement` per attraction |
| Accepted languages | Structured field `visitorLanguages` per attraction |
| Accessibility | Structured accessibility fields per attraction |
| Getting around without a car | Transport-mode filter + static guide page |

## Core user journeys

### J1 — Spontaneous discovery (MVP core)
Anna & Jonas, Saturday morning in Konstanz, 3 free hours.
1. Open app → list already sorted by distance from current position (geolocation permission optional; fallback: pick a place).
2. Quick filter: "open now" + "reachable by foot/public transport".
3. Scan list, switch to map to check direction, open a detail page.
4. Check opening hours, price (EUR), last-verified date; tap official website to double-check.
5. Go.

Success: steps 1–5 in under 90 seconds. → Flow detail: [../ux/core-user-flows.md](../ux/core-user-flows.md#f1-discover-nearby).

### J2 — Rainy-day rescue
P6: rain quick-filter → indoor + open now + sorted by distance → detail → transit note → done. → [../ux/core-user-flows.md](../ux/core-user-flows.md#f2-rainy-day).

### J3 — Family day planning the evening before
Familie Weber plans tomorrow:
1. Filter: suitable for age 2, stroller-friendly, max 30 min drive, tomorrow open.
2. Save 4 candidates as favorites.
3. Add 2 to "My Day" for tomorrow's date, set starting point = accommodation.
4. See total estimated duration and an opening-hour conflict warning ("closes 17:00, you'd arrive 16:40").
5. Reorder, save, share the plan link with grandparents.

→ [../ux/core-user-flows.md](../ux/core-user-flows.md#f3-plan-a-day).

### J4 — International orientation
Claire, evening before her trip: switches app to English → reads "Getting around", "Money & borders", "Sundays & holidays" guides → filters attractions with English audio guides near Bregenz → favorites five.

### J5 — Accessibility-first planning
Herr Schneider filters wheelchair-accessible attractions around Überlingen, checks the verified accessible-toilet field and last-verified date on each detail page, plans a two-stop day.

### J6 — Sharing and consuming a shared plan
A saved plan is shared via unguessable link; the recipient opens it read-only without an account, in their own language, and can copy it into their own "My Day". → [../ux/favorites-and-plans.md](../ux/favorites-and-plans.md#shared-plans).

## Later-phase journeys (not MVP)

- **J7 — Generated day plan (phase 2):** enter date, group, interests, budget, pace → deterministic planner proposes a feasible day → user tweaks manually. [../planning/deterministic-planner.md](../planning/deterministic-planner.md)
- **J8 — Conversational replanning (phase 3):** "It's raining this afternoon — replace the beach with something indoor near stop 2." [../planning/ai-travel-assistant.md](../planning/ai-travel-assistant.md)
