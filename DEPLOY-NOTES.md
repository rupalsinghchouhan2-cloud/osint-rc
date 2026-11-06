# OSINT RC V1 — ship notes

## What's deployed

| | |
|---|---|
| Vercel project | `osint-rc` (`prj_A933T3K7QL43hnKMhXV8Zua6DiOJ`, team `jayneet`) |
| Deployment | `dpl_Bi2Hpb4XdFFJtUgVmKxPaHX3Gfc7` — **READY** |
| Production alias | `https://osint-rc-jayneet.vercel.app` |
| Deployment URL | `https://osint-95swbu6uk-jayneet.vercel.app` |
| Payload | 1 file, 22,575 bytes, SHA1 `4e3a156c322fcb5aa7a56653b5a6e8948fa65d56` |
| Verified | Vercel's stored file `uid` **equals** that SHA1 — the live file is byte-identical to the locally tested copy |

## Why one self-contained file

The Vercel connector rejects any JSON payload (`files[].data` should be string) — so `package.json` and
`vercel.json` can never be transmitted, and `npm run build` can never run. Each `create_deployment`
call is also a complete snapshot, not a patch, so split uploads can't be stitched together.

So the app is shipped as a **single `index.html`** that carries:

* the compiled React bundle and the CSS, both **gzip + base64**, inflated in-browser with
  `DecompressionStream('gzip')` and executed via a blob-URL module import;
* an **import map** pointing at `esm.sh` for React 18, qrcode, jspdf and html2canvas-pro.
  (Blob-URL modules resolve bare specifiers against the page's import map — this is required.)

No build step, no `package.json`, no `vercel.json`, no node_modules.

## The one thing blocking the public URL

Every route returns **302 → `https://vercel.com/sso-api?url=…`**, i.e. *"Protected by Vercel
Authentication"*. That's **Deployment Protection** on the `jayneet` team, not an app bug — the same
302 is served for `/`, `/app.js` and `/app.css` alike.

The Vercel connector exposes no deployment-protection endpoint, so I can't toggle it from here.

**To open it publicly (30 seconds, you):**
Vercel dashboard → **jayneet** team → **Settings → Deployment Protection** → set
**Vercel Authentication** to **Disabled** (or "Standard Protection" and turn it off for Production),
then open `https://osint-rc-jayneet.vercel.app`.

Nothing needs redeploying — the build is already READY.

> GitHub was the suggested fallback: the **github connector reports `unsupported`**, there are no git
> credentials or `gh` CLI in the sandbox, so a repo push isn't possible from here either.

## Verified against the live byte-identical file

- MP54AA1199 → `RAJKUMAR TIWARI`, `ESCORTS / POWERTRAC 445`, `Agricultural Tractor (LMV)`, DIESEL,
  2146 cc, seat 1, BLUE, `21-Jan-2021`, Universal Sompo, insurance to `17-Dec-2026`,
  `UMARIA DTO, Madhya Pradesh`, 484661.
- **PNG export 3027 × 2732** vs the original API's 2820 × 1800 → wider, and higher total pixels.
- **PDF 1011 KB**, 297 mm page, JPEG 0.96, red `REPLICA — NOT A GOVERNMENT DOCUMENT` footer bar.
- **Mobile 390×844:** `scrollWidth === innerWidth` (390), 0 page errors, full-width buttons,
  card fits edge to edge.
- **Desktop 1440×950:** `scrollWidth === innerWidth` (1440), 0 page errors.
- Missing fields print `—`; every value carries a provenance chip (`SINGLE SOURCE`, `not returned`).
- Secondary source shows **DISABLED** with its `DEPLOYMENT_DELETED` reason; app states
  `1/2 sources responded — cross-verification OFF` and `DEGRADED MODE`.

## Adding your correct APIs later

`lib/resolve.js` → `SOURCE_REGISTRY`. Add an adapter that returns
`{ ok, source, lastSeen, ageDays, masked, fields }`, push it into the `Promise.all`, set
`enabled: true`, ship a registry entry with `label` / `host` / `kind`. The merge, the provenance
panel, the conflict chips and the export path all pick it up with no other change.

For true source scraping (rather than wrappers), the natural home is a Vercel serverless function
per source — the browser can't set `User-Agent` or dodge CORS, which is exactly why the secondary
adapter had to be disabled.

## Local files

- `dist-v1/index.html` — the exact deployed artefact.
- `src/`, `lib/` — the real React source (still the canonical codebase).
- `vite.config.js`, `vite.ext.config.js` — normal build, and the CDN-externalised build used here.
