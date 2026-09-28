# Guidelines

- For new DOM/browser API usage, use `app.ownerDocument` and `app.ownerWindow` instead of globals; without `app`, derive them from the mounted node's `ownerDocument` and its `defaultView`.
- When overriding properties of an existing type, prefer `Merge<Base, Overrides>` from `@excalidraw/common/utility-types` over `Omit<Base, keyof Overrides> & Overrides`.

## Base44 preview

- Run `docker compose -f docker-compose.base44.yml up -d --build` to serve the source with Vite on port 3000; the production Dockerfile/compose serve a frozen nginx build and must not be used for iterative edits.
- Vite must not try to open a browser in the headless container (`server.open: false`); it crashes with `spawn xdg-open ENOENT` otherwise.
- Check `docker compose -f docker-compose.base44.yml ps` for `healthy` and `curl -f http://localhost:3000/` for live HTML. No local database is required for the editor canvas.
