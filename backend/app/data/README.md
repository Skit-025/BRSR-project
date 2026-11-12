# ESG Data Store (`esgData.json`)

This file is the **single source of truth** for Principle 6 BRSR data across:
- Role-specific ESG forms (prefill, draft, submit, accept/reject)
- Downward roll-up totals (SUM, LIST, NONE, and LI-3 water-stressed filtering)
- Dashboard KPI cards & stacked bar chart
- Lineage drill-down drawer
- BRSR Annexure I Principle 6 report generation

## Format
```json
{
  "fy": {
    "current": "2024-25",
    "previous": "2023-24"
  },
  "nodes": [
    { "id": "MEIL-GROUP", "name": "...", "type": "group", "parentId": null }
  ],
  "statuses": {
    "<nodeId>": {
      "<ownerRole>": { "status": "draft | submitted | rejected | accepted", "reason": null }
    }
  },
  "entries": {
    "<nodeId>": {
      "<ownerRole>": {
        "<fieldId>": { "current": "<value>", "previous": "<value>", "_sample": true }
      }
    }
  }
}
```

## Notes
- Every sample value carries `"_sample": true` so you can find and replace sample values with real audited figures.
- Table-row fields store arrays of row objects in `"current"` and `"previous"`.
- Empty / untouched fields are omitted or `null` (treated as **not reported**, never `0`).
- Allowed calculations are plain `SUM` totals only (no intensity, turnover, or emission factors).

