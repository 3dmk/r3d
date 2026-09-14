# Polygon Rush production structure

Polygon Rush now separates editable engineering history from deployable game files.

## Folders

- `polygon-rush/engineering/` — development migrations, physics experiments, diagnostics, and historical patch scripts.
- `polygon-rush/v14.6/` — protected historical source baseline used only when regenerating a production build.
- `polygon-rush/production/` — authoritative ready-to-run browser build. Hosting providers should publish this directory directly.
- `polygon-rush/archive/` — optional future frozen production snapshots.

## Production rule

Hosting must never reconstruct the game from the historical patch chain. A production build is generated and validated first, then committed to `polygon-rush/production/`. GitHub Pages, Cloudflare Pages, local web servers, and other static hosts all serve the same committed files.

Expected production files:

- `index.html`
- `three.min.js`
- `VERSION.txt`
- `BUILD.json`
- `_headers`

## Update flow

1. Modify engineering/source code.
2. Generate a candidate production build.
3. Run syntax and browser gameplay gates.
4. Commit the successful candidate into `polygon-rush/production/`.
5. Static hosting publishes only `polygon-rush/production/`.
6. Previous production commit remains recoverable through Git history.

## Cloudflare Pages

Use `polygon-rush/production` as the Pages output directory. No application server or framework build is required once a production build is committed.

This architecture prevents deployment from failing because an old migration script no longer recognizes a newer source string. Those migration scripts are build-time engineering history, not runtime/deployment dependencies.
