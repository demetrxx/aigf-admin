# Frontend Analytics Vision — Daily

This document describes the frontend API contract for daily analytics.

## Endpoint

`GET /admin/analytics/daily?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`

### Query params
- `startDate` (required) — day in `YYYY-MM-DD`, UTC.
- `endDate` (required) — day in `YYYY-MM-DD`, UTC.

### Response
```
[
  {
    "day": "2026-01-01",
    "unique": 120,
    "total": 340,
    "customers": 48,
    "revenue": 325.5,
    "conversion": 0.141,
    "arpu": 0.957,
    "arpc": 6.781
  }
]
```

## Metric definitions
- **unique**: users whose first `user_message` happened in the day.
- **total**: distinct users with ≥1 `chat_session` in the day.
- **customers**: distinct users with ≥1 payment in the day.
- **revenue**: sum of payment amount for the day, converted to USD.
- **conversion**: `customers / total`.
- **arpu**: `revenue / total`.
- **arpc**: `revenue / customers`.

## Notes
- All dates are UTC.
- Revenue values are in USD (amounts in stars converted via `STAR_TO_USD`).
- Current day is computed on-demand; past days are cached.
