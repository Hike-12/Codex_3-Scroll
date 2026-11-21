# voxel-melt

A browser based pixel physics sandbox built with React, TypeScript, Vite, and a typed-array cellular automata engine. The 360 × 220 simulation runs locally in the browser and renders straight to a pixel canvas.

## Run locally

```sh
npm install
npm run dev
```

## Controls

- Drag on the stage to paint or use the selected tool.
- `1`–`9` and `0` select Steel through Water. Click the horizontally scrollable palette for every other material.
- `Space` pauses or resumes; `E` detonates all planted C4.
- Choose Circle, Square, or Spray for the brush; adjust size, gravity direction, and wind in the tool dock.
- Use the scenario menu to load Skyline Tower, Volcanic Island, Acid & Hydro-Dam, or Empty Sandbox.
- Toggle audio and glow in the top bar.

## Materials and tools

The palette includes structural blocks, powders, fluids, gases, and energy cells. Materials react through the simulation rules: water quenches lava, acid corrodes blocks, fire spreads to fuel, oil floats above pooled water, and explosions fracture terrain. Tools include a vertical cutting laser, C4 charges, a vortex, and continuous material emitters.

## Checks

```sh
npm test
npm run build
```

## Deployment

The `main` branch is connected to Vercel. Pushes to `main` create production deployments; other branches create previews.
