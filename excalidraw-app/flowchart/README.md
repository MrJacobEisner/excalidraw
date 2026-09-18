# Flowchart lab

An app-level exploration of three authoring approaches, using native Excalidraw elements rather than introducing a second canvas or diagram format.

Open **Flowcharts** at the upper left of the canvas.

| Approach | Best for | Current tradeoff |
| --- | --- | --- |
| Build | Quickly entering and editing an ordered sequence | Connects steps in order; use Text for branching |
| Templates | Starting from approval, onboarding, or incident workflows | Fixed starting structure; edit the resulting shapes on the canvas |
| Text | Describing branches, joins, and loops quickly | Uses a small local syntax, not Mermaid or an AI service |

All approaches support vertical and horizontal layout. Insertions append beside existing content, receive fresh element IDs, and form a single undoable change. Shapes, labels, and bound arrows remain editable with the normal canvas tools. The panel is an insertion tool, not a live two-way editor for existing diagrams.

## Text syntax

```text
Start -> Review -> Approved?
Approved? -Yes-> Done
Approved? -No-> Revise -> Review
```

Labels identify nodes (case-sensitive, surrounding whitespace ignored). `Start`, `End`, and `Done` become terminators; a trailing `?` creates a decision. A labelled continuation such as `-No-> Revise` starts from the preceding line's first node. Limits: 40 nodes, 80 connections, 60 characters per node label.

Layout uses strongly connected components and ranked spacing to handle cycles. Arrows are straight native bound connectors; obstacle avoidance and sophisticated edge routing are intentionally not part of this exploration.

## Development

From the repository root:

```sh
yarn install --frozen-lockfile
yarn test:typecheck
yarn test:app excalidraw-app/flowchart --run --maxWorkers=1 --minWorkers=1
```

For a low-memory headless preview, run checks separately from Vite:

```sh
cd excalidraw-app
BROWSER=none VITE_APP_ENABLE_TYPECHECK=false VITE_APP_ENABLE_ESLINT=false \
  ../node_modules/.bin/vite --host 0.0.0.0 --port 3000
```

The lab is currently an English-only prototype. Before promoting it into the core editor: localize its copy, evaluate native sidebar integration, and compare user completion rates across the three approaches.
