# OSINT RC V1 — ship notes

## GitHub (canonical)

| | |
|---|---|
| Repo | https://github.com/rupalsinghchouhan2-cloud/osint-rc |
| Visibility | public |
| Branch | `master` |
| Commit | `6992ca1` — OSINT RC v1 — HD open-source RC replica |

**Verified from a clean clone:** `npm install` (113 packages, 3 s) → `npm run build` → **built in
4.59 s**. Output is properly code-split:

```
dist/assets/index-CJsfZx7r.js                195.55 kB │ gzip: 65.30 kB
dist/assets/jspdf.es.min-B_w7XtIc.js         357.70 kB │ gzip: 118.00 kB
dist/assets/html2canvas-pro.esm-DHKZFdC3.js  210.10 kB │ gzip: 51.38 kB
dist/assets/html2canvas.esm-CBrSDip1.js      201.42 kB │ gzip: 48.03 kB
dist/assets/index.es-kYFWfo1-.js             151.07 kB │ gzip: 51.68 kB
dist/assets/purify.es-BwoZCkIS.js             22.03 kB │ gzip: 8.77 kB
dist/assets/index-Cbk8-ai_.css                14.65 kB │ gzip: 4.47 kB
```

jspdf / html2canvas-pro are already `import()`ed lazily at export time, so they never block first paint.

**E2E against that build:** PNG **3027 × 2732**, PDF **1012 KB**, 0 console errors, and
`scrollWidth === innerWidth` at both 390 px and 1440 px.

## Deploying on Vercel (you, manually)

Import the repo at https://vercel.com/new → the `osint-rc` project already has
`framework: vite`, `build: npm run build`, `install: npm install`, `output: dist` — accept them and
deploy. `vercel.json` in the repo supplies the SPA rewrite plus security headers.

> **Deployment Protection is still on** for the `jayneet` team. A fresh Git deploy will inherit
> it and 302 to `vercel.com/sso-api` just like before. Turn it off at
> **jayneet → Settings → Deployment Protection → Vercel Authentication → Disabled**, or the URL
> will keep asking you to log in.

## Everything else that is already deployed

Deployment `dpl_Bi2Hpb4XdFFJtUgVmKxPaHX3Gfc7` (single-file variant) is `READY` on the `osint-rc`
project, alias `osint-rc-jayneet.vercel.app`. It is byte-identical to `dist-v1/index.html`
(SHA1 `4e3a156c322fcb5aa7a56653b5a6e8948fa65d56`, confirmed against Vercel's stored file uid).
The Git deploy will supersede it.

## Why the single-file variant exists

The Vercel connector rejects any JSON payload (`files[].data` should be string), so `package.json`
and `vercel.json` could never be transmitted and `npm run build` could never run; each
`create_deployment` is also a full snapshot, not a patch. So the app was shipped as one
`index.html` carrying the bundle + CSS gzip+base64'd, inflated in-browser with
`DecompressionStream('gzip')` and run as a blob-URL module against an `esm.sh` import map.

`dist-v1/index.html` keeps that as a **no-build fallback** — drag it onto any static host. It is not
needed once the Git deploy is live.

## Verified payload (MP54AA1199)

`RAJKUMAR TIWARI` · `ESCORTS / POWERTRAC 445` · `Agricultural Tractor (LMV)` · DIESEL · 2146 cc ·
seat 1 · BLUE · `21-Jan-2021` · Universal Sompo · insurance to `17-Dec-2026` ·
`UMARIA DTO, Madhya Pradesh` · PIN 484661.

## Adding your own sources

`lib/resolve.js` → `SOURCE_REGISTRY`. Add an adapter returning
`{ ok, source, lastSeen, ageDays, masked, fields }`, push it into the `Promise.all`, set
`enabled: true`, ship a registry entry with `label` / `host` / `kind` / `note`. Merge, provenance,
conflict chips and export all pick it up unchanged.

Browser-side scraping has hard limits: no `User-Agent` control, no CORS bypass. For true
source-scraping, add a Vercel serverless function per source — that is the next step for an
accurate pipeline.
