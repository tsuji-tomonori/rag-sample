---
name: no-mock-product-ui
description: Prevent fake business data, users, groups, counts, dates, and nonfunctional controls from entering production UI paths.
---
# No-mock product UI

Production values must come from user input, verified identity, API responses, persisted state,
configuration, or honest loading/empty/error/permission states. Test route interception and fixtures
are allowed only under test directories. Do not add demo fallbacks, placeholder actions, fixed users,
fake metrics, or fabricated documents to production components.
