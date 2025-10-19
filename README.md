
# World map visualisation


World map visualisation with Countries in color, borders, and blue ocean!




CREDITS: 
- Country MAP shapes data: https://unpkg.com/browse/world-atlas@1.1.4/world/
- Rotating globe visualisation: http://bl.ocks.org/infographicstw/bfdaf2a075225043c967
- Sky background with starts: http://bl.ocks.org/marcneuwirth/2865882

- Universe background: https://pintraveler.net/


RESOURCES:

- Idea of more advanced app: https://pintraveler.net/

## Local Development
1. Install node: `brew install node`
1. Install Yarn: `brew install yarn`
2. Install project dependencies: `yarn install`.
3. Launch the dev server: `make dev`. Override the port with `make dev PORT=3000` if necessary. This uses `http-server` with caching disabled so changes to `index.js` reload immediately.
4. Open http://localhost:8080 (or your chosen port) to view the globe.
5. Without Node.js tooling, fall back to `make serve-python PORT=8080`, noting it lacks the CORS headers provided by the default target.
