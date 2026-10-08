# Ask AAROHAN AI integration audit

## Summary

The target repository already contains the real E1-E7 engine layer and the required permission model. The missing work was the product-level wiring around it: a dedicated Ask AAROHAN AI surface, route registration, and frontend visibility tied to the server-side RBAC matrix.

## Findings

### 1) Engine layer is already present and authoritative

The repository already includes the E1-E7 implementation set under:

- backend/app/ai/e1_extract/
- backend/app/ai/e2_anomaly/
- backend/app/ai/e3_rag/
- backend/app/ai/e4_policy/
- backend/app/ai/e5_narrative/
- backend/app/ai/e6_valuechain/
- backend/app/ai/e7_explainer/

These modules are used by the legacy AI router and are the source of truth for the actual business logic.

### 2) Permission matrix is the real gate

The canonical permission matrix is defined in:

- backend/app/security/rbac.py

This file defines the following AI permissions:

- ai:e1:use through ai:e7:use
- ai:approve

Visibility and access decisions must be enforced server-side; the frontend is only a UX layer.

### 3) Fallback defaults are disabled

The configuration exposes AI fallback controls, but the project default is to avoid mock outputs:

- backend/app/config/settings.py

AI fallback is off by default, which preserves the real engine behavior and prevents silent mock regression.

### 4) Ask AAROHAN AI is a thin product wrapper, not a replacement engine

The actual Ask AAROHAN feature should not replace the E1-E7 engines. It should sit above them and enforce permission checks before each engine run.

This repo now enforces that pattern with a dedicated AAROHAN router and engine catalog, instead of creating duplicate or mock implementations.

## Recommendation

Proceed with the product surface as a thin authorization and orchestration layer on top of the working engine implementations. Do not re-implement business logic in the UI or in fallback code paths.

## Audit result

Status: pass for the core architecture. The repo already contains the real working engines; the remaining integration work is product plumbing and policy gating.
