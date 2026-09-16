# R3D

R3D is a standalone browser 3D editor/rendering prototype. It is intentionally separate from the other projects in this repository.

## Current release candidate

Version: **1.0.0-rc1**

### Editor
- WebGL realtime viewport
- Scene explorer
- Cube, sphere and cone creation
- Select / Move / Rotate / Scale tools
- Numeric position, rotation and scale editing
- Material and color editing
- Duplicate / Delete
- Undo / Redo
- Orbit, pan, zoom and frame-selection controls
- Keyboard shortcuts: Q/W/E/R, F, Delete, Ctrl/Cmd+Z, Ctrl/Cmd+Y, Ctrl/Cmd+D

### Renderer
- WebGPU compute renderer when available
- CPU path-tracing fallback
- SAH BVH construction
- GPU BVH traversal
- Exact cube, sphere and finite cone intersections
- Object rotations and uniform scale in traversal
- Directional-light shadows
- Diffuse GI bounces
- Metal reflection
- Glass reflection/refraction
- Hierarchical adaptive ray tiles to pixel level
- Persistent radiance reservoir reuse
- Exact-scene temporal accumulation
- Depth/normal-guided bilateral denoising with separate scratch output
- Internal-resolution rendering and final reconstruction
- PNG export

### Release gate
`node release-check.mjs`

The gate verifies:
- JavaScript syntax
- no inline script bodies
- unique required DOM IDs
- explicit startup/bootstrap files
- expected script order
- renderer/editor API contracts
- no cross-project naming contamination in R3D runtime code
- single editor animation-loop structure
- WebGPU compute code remains present

GitHub Actions additionally starts Chromium with Playwright, boots `/r3d/`, exercises editor actions and undo, then completes a final render.

## Files

- `index.html` — UI shell
- `r3d-editor.js` — authoritative editor/scene state and WebGL viewport
- `r3d-renderer.js` — WebGPU renderer + CPU fallback
- `r3d-bootstrap.js` — startup/render wiring
- `release-check.mjs` — static release gate
- `browser-smoke.spec.js` — browser smoke test

## Important validation rule

A release is production-confirmed only after the static gate and browser smoke gate pass. WebGPU execution depends on browser/GPU availability; on unsupported systems R3D deliberately falls back to its CPU renderer.

Standalone repository: https://github.com/3dmk/R3D
