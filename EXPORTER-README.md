# Public calendar feed, schema 2

The public feed adds verified national presidential poll registrations to the economic calendar. The widget selects **Brazil at every importance level, United States high importance only, and national presidential polls**. The broader economic feed continues the prior weekly-source selection: Brazil all, United States/Eurozone/United Kingdom medium and high, other countries only central-bank rate decisions. The weekly PDF renderer and its filters are unchanged.

## Dates and coverage

- `updated_at` is the actual economic-source collection timestamp, never the export time
- Top-level `coverage_start` and `coverage_end` describe economic coverage, in `America/Sao_Paulo`
- `polls.coverage_start` and `polls.coverage_end` describe the separate poll-registration check
- Economic events have an offset-aware `starts_at`, a derived BRT `date`, and `time_status: "exact"`
- Polls have `kind: "poll"`, `starts_at: null`, `date`, `time_status: "unknown"`, `institute`, `registration`, and `permitted_release_date`
- A poll's date is the first date release is permitted according to the TSE registration. It is not a claim of actual or scheduled publication. Midnight dates in the TSE export do not provide a publication time
- Poll `title` includes institute, registration and “divulgação permitida”
- `polls.status: "checked"` requires a fresh full source and no unresolved scope classifications. `pending` must not be rendered as “no polls”
- Consumers must check source freshness separately. `polls.checked_at` does not make an old archive fresh; use `polls.source_generated_at`, with a maximum age of 48 hours

The official 2026 first round is October 4. A possible presidential runoff is October 25. `active_until: "2026-10-25"` is the maximum possible cutoff, with `runoff_conditional: true`. Stop polling earlier if the presidential election is officially resolved in the first round. Do not assume a runoff will occur.

Official election dates: https://www.tse.jus.br/comunicacao/noticias/2026/Marco/eleicoes-2026-confira-as-principais-datas-do-calendario-eleitoral

## Source validation

The exporter lives in the authorized private `rotinas` repository at
`modules/calendar-widget/export_feed.py`, alongside `INPUT-CONTRACT.md` and its
tests. It is not included in this public feed repository. It is independent of the weekly renderer. It verifies a real, complete Investing snapshot against every original downloaded page, page hashes, terminal pagination and unfiltered coverage. It rejects future or older-than-48-hour economic snapshots. The optional `--us-all` switch is diagnostic/opt-in and is not the current widget or weekly-PDF policy.

For TSE, download the current ZIP linked from the official dataset page for every refresh. Read the single consolidated `pesquisa_eleitoral_2026_BRASIL.csv` member, not the union of state files. Validate its schema, unique generation, age of at most 48 hours, dates and registrations. `SG_UF=BR` identifies electoral jurisdiction; it does not establish a nationally sampled poll.

Review methodology and sample plan for every presidential registration within the requested dates. An optional **private** scope audit is bound to the exact source archive SHA-256 and each registration's combined methodology/sample-plan hash. Every decision retains an exact source excerpt. A source change invalidates the archive-bound audit; review the new evidence before declaring coverage checked. Unfamiliar scope remains pending, never silently excluded. Nationwide lists of federative units must not be mistaken for a single-state scope.

The exporter constructs the output field-by-field. The complete current public contract is [PUBLIC-FEED-SCHEMA.json](PUBLIC-FEED-SCHEMA.json), version 2. [schema.json](schema.json) is retained only as the historical version 1 contract. Never publish source ZIPs, raw Investing pages, scope audits, collection receipts or private validation reports. Publish only the selected final feed and explicitly approved widget assets/docs.

Sources:
- https://www.investing.com/economic-calendar/
- https://dadosabertos.tse.jus.br/dataset/pesquisas-eleitorais-2026
- https://cdn.tse.jus.br/estatistica/sead/odsele/pesquisa_eleitoral/pesquisa_eleitoral_2026.zip

## Refresh command

With authorized access to the private `rotinas` checkout, collect fresh sources
and review poll scopes. From that checkout's root, invoke the command below.
`INPUT`, `OUTPUT` and `PRIVATE` are operator-selected local paths; this public
repository does not contain those runtime inputs or the exporter.

```sh
python modules/calendar-widget/export_feed.py INPUT/investing.json OUTPUT/events.json \
  --tse-zip INPUT/tse.zip \
  --scope-review PRIVATE/national-scope-audit.json \
  --polls-start YYYY-MM-DD \
  --private-proof PRIVATE/poll-proof.json
```

Use today's BRT date for `--polls-start`. Keep private source evidence outside the publication directory. The exporter defaults to the existing economic selection. A successful output does not mean it was published; validate the schema, reconcile source counts, upload only the approved files, and verify the exact live bytes separately.

## Historical 2026-10-01 verification snapshot

These counts describe the earlier verification sample below, not a live counter.
The later feed at commit `fb28e780cd56393652bbc818a65dfe1a7d8ecd12` contains
179 events. Read the current `events.json` for its own counts, coverage and collection
time; do not treat this historical section as current source freshness.

- Economic coverage: September 28–October 11; 159 prior economic entries retained without changing their seven original fields
- TSE generation: September 30 at 05:46:47 BRT, freshly downloaded October 1
- TSE full archive: 3,467 rows; 157 presidential-jurisdiction candidates with permitted dates October 1–25
- Scope review: 13 national, 144 regional, 0 unresolved
- National polls: 2 on October 1, 3 on October 2, 8 on October 3
- No later national registration in this snapshot; this does not predict future registrations
- Public feed: 172 events; October 1 widget selection has 4 US-high releases, 1 Brazil event and 2 polls
- 22 offline exporter regressions passed, including unchanged economics, source/hash rejection, scope audits, nullable times, permitted-date wording and public-field checks
