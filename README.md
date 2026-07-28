# Tages-Charts

A daily, self-updating gallery of news charts. A Claude Code routine researches
one current news event per day, verifies the figures, builds a self-contained
interactive chart, and commits it. The gallery shows every day, newest first.

## How it fits together

- `PROMPT.md` — the full instruction the daily routine follows (research →
  verify → build → register → commit). This is the logic; keep it versioned here.
- `manifest.json` — append-only index of all days (no chart code). The gallery
  sorts it newest-first at render time.
- `index.html` — the gallery. Reads `manifest.json` and renders one card per day
  with the chart embedded in a sandboxed, lazy-loaded `<iframe>`. Isolation means
  a broken day breaks only its own tile, never the whole page.
- `days/<date>.html` — one fully self-contained chart per day (React + Recharts
  via CDN, all data inline). The routine writes these; the example is
  `days/2026-07-27.html`.
- `scripts/precheck.mjs` — prints the current blocklist (categories/chart types
  used in the last 3 days, keywords in the last 7) so consecutive days stay
  varied in both topic and form.
- `scripts/register.mjs` — appends (or upserts by date) one entry to
  `manifest.json`.

## Setup order (do this once, before enabling the schedule)

1. **Connect GitHub** at claude.ai/code and give the cloud session access to
   this repo (clone + push).
2. **Commit this scaffold** to the repo (bootstrap). The routine depends on the
   scripts and `manifest.json` already existing.
3. **Enable GitHub Pages**: repo Settings → Pages → deploy from `main`, folder
   `/`. The gallery is then at `https://<user>.github.io/<repo>/`.
4. **Configure the cloud environment's network allowlist** with your research
   sources (e.g. srf.ch, keystone-sda.ch, opendata.swiss / bfs.admin.ch,
   ec.europa.eu/eurostat, meteoschweiz.admin.ch). Without this the session
   cannot reach them.
5. **Create the routine**: daily schedule, this repo, and this pointer as the
   prompt:

   ```
   Follow the instructions in PROMPT.md at the repository root, end to end.
   Use the trigger date as "today".
   ```

6. **Test before going live**: trigger the routine once by hand and read the
   session transcript — did it verify figures against the primary source, is the
   day file valid, was the manifest appended? Enable the daily schedule only
   after a couple of good runs.

## Local preview

Serve the folder over HTTP (not `file://`, which blocks `fetch`):

```
npx serve .
# then open the printed localhost URL
```

## Notes

- The blocklist windows live in `scripts/precheck.mjs` (`CATEGORY_WINDOW`,
  `CHARTTYPE_WINDOW`, `KEYWORD_WINDOW`) — tune them there.
- Day files post their height to the gallery via `postMessage` so cards fit
  their content.
- Reader-facing chart text is German (Swiss High German); code and this README
  are English.
This is a connectivity test from the GitHub Action.
