# Polygon Rush — Whole-Game Engineering Audit Iteration 2

Baseline audited: v14.9 Engineering Pass 2 on `main`.

v14.9 release gate result: PASS — reconstruction, Box3D source build, WASM bridge build, generated JavaScript validation and GitHub Pages deployment all completed successfully.

## What changed since Audit 1
- Input shaping from v14.8 remains active.
- Low-value procedural scenery no longer casts shadows.
- Breakable barriers share one immutable material instead of cloning it per barrier.
- Duplicate speed/ranking HUD work was removed.
- Box3D body ownership now uses a persistent reverse lookup map instead of rebuilding a Map for each contact batch.

## Re-ranked current priorities

### P1 — nearest-track route queries
`nearestTrack(pos)` still scans all 260 track samples. It is called from terrain, player physics, AI, progress projection, suspension, recovery and race ranking. Because several systems call it more than once per racer per frame, this remains the clearest JavaScript CPU hot path.

Action in Engineering Pass 3:
- replace unconditional O(N) scans with a 2D spatial hash of track samples;
- query a bounded 5x5 cell neighborhood for normal race positions;
- retain an exact full-scan fallback for teleports, recovery or positions far from indexed track cells;
- rebuild the spatial index only when a track is generated/changed;
- add lookup counters for later profiling.

Expected result: materially fewer sample-distance tests per normal lookup with identical nearest-point semantics near the race corridor.

### P1 — Box3D WASM memory marshalling
Still pending. `pr_b3_get_body_state()` and `pr_b3_get_contacts()` allocate and free WASM heap memory repeatedly.

Next after Pass 3:
- persistent/caller-owned state buffer;
- persistent contact buffer;
- no malloc/free in the per-frame physics readback path;
- preserve the current exported runtime contract or version it explicitly.

### P1 — FX allocation churn
Dust, exhaust and skid effects still allocate/dispose runtime graphics resources. Pooling remains Pass 5.

### P1/P2 — AI allocations
AI still constructs temporary vectors/arrays and uses hard recovery teleport as a final recovery mechanism. Scratch-vector reuse and staged recovery remain Pass 6.

### P2 — rendering and GPU cost
The largest obvious low-value shadow cost was already removed. Remaining GPU work should be measured before further quality reductions. Scenery instancing and vehicle geometry sharing remain better targets than lowering image quality.

### P2 — materials/models
Five procedural cars still duplicate many geometries/materials. Share immutable geometry/material classes before increasing model complexity.

### P2 — UI/race authority
Handling dropdown remains unwired. Race ranking authority is cleaner after Pass 2 but HUD cadence can still be reduced for slow-changing fields.

### P2 — audio and networking
Audio remains absent from the audited current race runtime. Earlier LAN functionality is not present in this current single-page runtime and should be reintegrated only after single-player performance/physics stabilizes.

## Engineering Pass 3 release requirements
- v14.8 input shaping preserved.
- v14.9 Pass 2 optimizations preserved.
- spatial index built after every track generation.
- full-scan safety fallback retained.
- JavaScript syntax passes.
- player + 4 AI startup assertions remain.
- 5 Box3D racer bodies remain required when Box3D is live.
- Box3D/WASM builds successfully.
- GitHub Pages deployment succeeds before promotion.

## Next sequence
1. Pass 3 — spatial nearest-track lookup.
2. Pass 4 — persistent Box3D state/contact buffers.
3. Pass 5 — pooled dust/exhaust/skid effects.
4. Pass 6 — AI scratch vectors and staged recovery.
5. Pass 7 — shared vehicle geometry/materials.
6. Pass 8 — scenery instancing.
7. Pass 9 — frame-time/physics/render telemetry.

Promotion rule remains: preserve or improve behavior, reduce unnecessary work, and reject any iteration that regresses startup, physics stability, racer count, race flow, visual quality floor or deployment safety.
