# OSINT RC

Enter an Indian registration number → get an **HD PDF replica** of the RC template, assembled
**only** from openly available data, with provenance printed on every single field.

> **This is not an RC.** OSINT RC produces a document-shaped *replica* from publicly scraped
> data. It is not issued, endorsed or verified by the Ministry of Road Transport & Highways,
> Parivahan, Vahan, or any RTO. It has no legal standing and must never be presented as proof
> of registration or ownership. The State Emblem is omitted by design.

## What it does

1. You type a plate (e.g. `MP54AA1199`).
2. It queries every **enabled** source in the registry in parallel, client-side.
3. Values are reconciled **field by field** — agreement, masked-pattern verification, or conflict.
   A conflict is never averaged: the fresher source wins and the loser is kept in provenance.
4. It renders a fixed **946 px** card, fit-scaled for the preview, and captures the *offscreen
   natural* node at `scale: 3.2` (≈**3027 px** wide) for export.
5. PDF is a 297 mm page, JPEG q=0.96, with a red `REPLICA — NOT A GOVERNMENT DOCUMENT` footer bar.

Fields no source returns print `—`. **Nothing is ever invented to fill the card.**

## Honest status

The app currently runs in **DEGRADED MODE**. Of two registered sources, the live scraper is
`enabled: false` (its deployment returned `DEPLOYMENT_NOT_FOUND`), so only the scraped snapshot
table answers. Every field is therefore tagged `SINGLE SOURCE` and **cross-verification is off**.
The UI says so, prominently, rather than pretending otherwise.

## Run it locally

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # → dist/
```

Requires Node 18+.

## Adding your own sources

The pipeline is built to be extended. Open `lib/resolve.js`:

1. Write an adapter returning:

   ```js
   { ok, source, lastSeen, ageDays, masked, fields: { owner, maker, chassis, … } }
   ```

   Return `null` for anything the source didn't supply — never a placeholder.

2. Add it to the `Promise.all` alongside `fetchPrimary` / `fetchSecondary`.
3. Add an entry to `SOURCE_REGISTRY` with `enabled: true`, plus `id`, `label`, `host`, `kind`,
   `note`.

The merge, the provenance panel, the confidence chips and the export path all pick it up with
**no other changes**.

> Browser-side scraping is limited: you cannot set `User-Agent` and you cannot bypass CORS.
> For real source scraping, put a serverless function in front of each source — that is the
> natural next step for an accurate pipeline.

## Layout

```
src/App.jsx        lookup flow, fit/view-100% preview, export (dynamic import of jspdf + html2canvas-pro)
src/RCCard.jsx     the 946px card: chakra SVG, QR, REPLICA stamp, disclaimer footer
src/styles.css     liquid-glass shell + the RC card itself
lib/resolve.js     SOURCE_REGISTRY, adapters, merge/chimera logic, provenance
dist-v1/index.html single-file build: bundle + CSS gzipped/base64'd, esm.sh import map
                   (drop-in static deploy, no build step needed)
```

## Provenance tags

| chip | meaning |
|---|---|
| `both sources` | two independent endpoints agreed |
| `mask-verified` | a full value fits the other source's masked pattern |
| `single source` | only one endpoint returned it |
| `conflict` | they disagreed — fresher wins, other kept in provenance |
| `not returned` | no source had it |

## License

No license granted. For research and educational use. Do not use a replica as an official
document.
