# Repository Guidelines

## Project Structure & Module Organization
Root holds the static globe app. `index.html` pulls D3 v3 from the CDN and wires the DOM. `index.js` drives the globe projection and fetches `world.json`; keep related helpers beside it for clarity. Visual styling lives in `index.css`, while logos and icons sit under `images/`. Preserve `CNAME` for GitHub Pages DNS.

## Build, Test, and Development Commands
- `npm install` installs the declared D3 packages when you want local tooling support.
- `npx http-server . --port 8080` serves the site with proper CORS headers; open http://localhost:8080 to preview.
- `python3 -m http.server 8080` works as a lightweight fallback when Node.js is unavailable.

## Coding Style & Naming Conventions
JavaScript stays ES5-compatible with 4-space indentation, matching `index.js`; avoid arrow functions unless you introduce a build step. Name DOM ids in camelCase (`mapViz`) and classes in kebab-case (`appbar-link`), and place new assets in `images/` with descriptive filenames. CSS keeps the bold monospace look—extend existing selectors rather than adding inline styles. No shared lint config is checked in, so mirror the current formatting before submitting.

## Testing Guidelines
There is no automated test suite yet; rely on manual QA before opening a pull request. While serving locally, confirm the globe spins, drag interaction works, and the console stays clean. Verify `world.json` loads successfully (200 in the network panel) and that external links in the app bar behave as expected. Capture screenshots for any visual changes.

## Commit & Pull Request Guidelines
Recent history uses short, imperative summaries such as `Create CNAME` and `fix small bugs`; follow that tone, keep subjects under ~50 characters, and add body context when needed. Group related UI changes so rollbacks stay simple. Pull requests should explain motivation, list manual test steps, and link issues or demo URLs. Attach before/after screenshots for visual tweaks and call out any changes touching deployment files like `CNAME`.

## Deployment & Configuration Notes
The site ships via GitHub Pages, so keep `CNAME` intact to preserve the custom domain. Static assets are aggressively cached; rename files when you need to bust caches. Document any new third-party keys in the README and never commit secrets to the repository.
