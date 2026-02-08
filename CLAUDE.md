# trip_globe

Interactive 3D globe for visualizing visited countries and places lived.
Live at https://globe.pierreschutz.com

## Commands

yarn install           # install dependencies
make dev               # dev server on :8080 (or make dev PORT=3000)
make serve-python      # fallback without Node

## Architecture

Static single-page app. No backend, no build step, no database.

- `index.html` — entry point, loads D3 v3 from CDN + topojson v1
- `src/main.js` — boot, sidebar init, data loading
- `src/globe.js` — D3 orthographic projection, rendering, drag/zoom interaction
- `src/dataLoader.js` — loads and normalizes JSON/TSV data files
- `src/viewState.js` — URL hash ↔ view state (explorer/visited/lived)
- `index.css` — all styles

## Data Files

- `visited.json` — ISO 3166 numeric codes of visited countries
- `lived.json` — records with country, cities, period, description
- `country-names.tsv` — code → name mapping (iso_n3, iso_a3, adm0_a3, sov_a3)
- `country-facts.json` — country metadata shown in explorer view
- `world.json` — TopoJSON world geometry

## Code Style

- ES modules (`import`/`export`), arrow functions, template literals
- 4-space indentation
- DOM IDs: camelCase (`mapViz`), CSS classes: BEM (`sidebar-nav__item--active`)
- D3 v3 API for rendering (geo.orthographic, behavior.drag/zoom)
- Assets in `images/`

## Task Tracking

ClickUp list ID: `901710732904` (under Coding Projects > trip_globe)

## Deployment

Firebase Hosting via GitHub Actions (`.github/workflows/`).
Preview: `firebase hosting:channel:deploy dev`
Custom domain via `CNAME`.

## Testing

No automated tests. Manual QA: globe spins, drag works, console clean,
world.json loads (200), external links work. Screenshots for visual changes.

## Views

Three views toggled via sidebar, persisted in URL hash:
- `#explorer` — all countries colored, shows facts on hover
- `#visited` — visited countries colored, others grey
- `#lived` — lived countries highlighted yellow, tooltip shows details
