# Four-Week Projected Cash Flow PDF

## Objective
Enable the existing Finance export action to generate a useful four-week projected cash flow PDF using the currently applied fictional dashboard data.

## Scope and constraints
- Use the applied dashboard period and current balance as the baseline; distinguish retrospective comparison from forward projection.
- At the user's subsequent request, do not label the PDF's source data as fictional. Explain the hypothetical spending scenario, assumptions, dates, reserve effects, uncertainty and that it is not investment advice.
- No fabricated guarantees, actual investment decisions, financial writes or live service calls in fixture mode; preserve existing live export behavior.
- Use the original web repository, existing PDF dependency and feature branch. Preserve unrelated untracked files; no remote publication or real-data mutations.
- Delivery strategy: ask-on-risk; forecast 300–600 authored lines, generated output excluded.

## Tasks
- [x] FPP-1: Implement a deterministic four-week forward baseline and illustrative expense scenario with reconciliation and edge-case tests. Route: delegated direct; financial calculations and tests. Focused suite: 25 passed; typecheck and lint passed with existing warnings. Independent verification and parent rerun passed.
- [x] FPP-2: Design and implement a readable PDF and wire fixture export without altering live mode. Route: delegated direct; multiple UI/PDF files and tests. Generated fictional sample and checked page breaks; real-browser download and full accessibility review remain unverified.
- [x] FPP-3: Redesign the fixture PDF with legible graphs and data-derived conclusions while preserving fictional-data disclosure and calculation accuracy. Route: delegated direct; PDF and tests. Focused suite: 34 passed; typecheck and lint passed with existing warnings. Independent verification and parent rerun passed.
- [x] FPP-4: Improve chart readability and remove fictional-data wording at the user's request, while retaining explicit assumptions and hypothetical-scenario descriptions. Route: delegated direct; PDF and tests. Focused suite: 39 passed; typecheck and lint passed with existing warnings. Independent verification, sample visual inspection and parent rerun passed.

## Progress
User approved a four-week horizon. Existing fixture weekly comparison describes the selected historical period and must not be reused as future dates. Started from Web `main` in `feat/finance-projection-pdf`.

The forecast starts after the export day's Buenos Aires date. Historical baseline gaps are bridged with explicitly labeled estimates; a future applied end date is rejected. The example is a one-time hypothetical 10% of opening excess above reserve, not a transaction or investment recommendation. RDD is disabled; failed risk assessment treated as high. No production build was run while the development server was active. Tests emit a jsdom navigation warning despite passing.

FPP-1 and FPP-2 work-unit commit: `763033d`. Next: verify the download in a real browser, review PDF accessibility and run the production build after the development server is stopped.

User requested a more visual report with charts and conclusions instead of predominantly textual content.

The PDF uses graphical weekly comparisons, reserve reference and data-derived conclusions limited to weekly closes. Monetary amounts and intermediate calculations are bounded to ±ARS 1 trillion; excessive values fail closed. A representative fictional PDF was visually inspected. The PDF has selectable text but is not tagged; full accessibility and real-browser download remain unverified. No production build was run while the development server was active.

FPP-3 work-unit commit: `9a6cdb2`. Next: review the sample report and verify browser download.

User subsequently requested a clearer chart and removal of all references to fictional data. Dashboard and report values remain fixture-derived; unlabeled values may be mistaken for actual business data.

The revised graph uses explicitly labeled linear bounds based on weekly balances and a separate reserve comparison. It retains hypothetical-scenario and uncertainty statements. Live browser download and accessibility remain unverified; production build was not run while development server was active.

FPP-4 work-unit commit: `9526d31`. Next: user reviews the sample and verifies browser download.
