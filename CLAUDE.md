# trip_globe

Interactive 3D globe for visualizing visited countries and places lived.
Live at https://globe.pierreschutz.com

## Commands

yarn install           # install dependencies
make dev               # dev server on :8080 (or make dev PORT=3000)
make serve-python      # fallback without Node

## Architecture

Single-page app with Firebase backend. No build step.

- `index.html` — entry point, loads D3 v3 + Firebase SDK from CDN
- `src/main.js` — boot, sidebar init, auth integration, route-aware data loading
- `src/router.js` — client-side path routing (`/{username}` → public profiles)
- `src/globe.js` — D3 orthographic projection, rendering, drag/zoom interaction
- `src/dataLoader.js` — loads static map data + user trip data from Firestore
- `src/viewState.js` — URL hash ↔ view state (explorer/visited/lived)
- `src/firebase.js` — Firebase app initialization and config
- `src/auth.js` — Google OAuth sign-in/out, auth state management
- `src/userService.js` — user profile CRUD, username validation
- `src/usernameModal.js` — first-login username picker UI
- `src/tripService.js` — Firestore CRUD for visited/lived data
- `index.css` — all styles
- `firestore.rules` — Firestore security rules

## Data

**Static (committed, shared):**
- `world.json` — TopoJSON world geometry
- `country-names.tsv` — code → name mapping (iso_n3, iso_a3, adm0_a3, sov_a3)
- `country-facts.json` — country metadata shown in explorer view

**Per-user (Firestore):**
- `users/{uid}/visited/{code}` — visited countries
- `users/{uid}/lived/{id}` — places lived records

**Legacy (reference only, no longer read by app):**
- `visited.json`, `lived.json` — Pierre's original data, migrated to Firestore

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
