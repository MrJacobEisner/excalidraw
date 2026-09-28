# Guidelines

- For new DOM/browser API usage, use `app.ownerDocument` and `app.ownerWindow` instead of globals; without `app`, derive them from the mounted node's `ownerDocument` and its `defaultView`.
- When overriding properties of an existing type, prefer `Merge<Base, Overrides>` from `@excalidraw/common/utility-types` over `Omit<Base, keyof Overrides> & Overrides`.

## Base44 development

- Use `docker compose -f docker-compose.base44.yml up -d --build` to launch the live-source Vite app on port 3000; the first Yarn workspace install can take about a minute.
- The existing `docker-compose.yml` builds a production-style image, so use the Base44 compose for editable previews.
- Verify with `docker compose -f docker-compose.base44.yml ps` (web healthy) and `curl http://localhost:3000/` (HTML includes `/@vite/client`).
- The committed `.env.development` includes optional Excalidraw service URLs and a public Firebase client configuration; those remote integrations are not part of the local preview stack.
