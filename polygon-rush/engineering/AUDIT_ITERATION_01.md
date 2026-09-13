# Polygon Rush — Whole-Game Engineering Audit Iteration 1

Baseline audited: v14.8 Engineering Pass 1 on `main`.
Protected recovery baseline remains untouched.

Goal: improve smoothness, natural behavior, frame pacing, latency, CPU/GPU efficiency, memory stability, and hardware workload without degrading gameplay or visual quality.

## Priority scale
- P0: release/runtime correctness blocker
- P1: large gameplay/performance/latency impact
- P2: meaningful optimization or quality improvement
- P3: polish / lower-impact cleanup

## 1. Controls / input
Status: GOOD FOUNDATION, P1 refinement remaining.

Findings:
- v14.8 now filters throttle, brake, steering, and handbrake before Box3D/fallback physics.
- Speed-sensitive steering shaping is present.
- Keyboard input remains binary before shaping; gamepad/touch analog path is not present in the audited runtime.
- Input shaping is frame-delta based and clamps dt, which is good for consistency.

Next:
- Measure steering response at low/medium/high speed.
- Add analog input abstraction before adding device-specific controls.
- Keep input sampling before physics and avoid extra one-frame queues.

## 2. Vehicle physics / Box3D
Status: FUNCTIONAL ARCADE PHYSICS, P1.

Findings:
- Box3D owns rigid-body motion/collision.
- Vehicle is one dynamic box hull, not wheel/suspension rigid bodies.
- Control uses forward force, braking force, lateral damping and yaw torque.
- Fixed step is 1/60 with 4 substeps.
- Body sleep is disabled for all racers.
- `pr_b3_get_body_state()` allocates/frees heap memory on every state read.
- `pr_b3_get_contacts()` allocates/frees heap memory every contact poll.

Risks/cost:
- Repeated WASM allocator traffic can increase CPU cost and latency variance.
- Single-hull dynamics can feel artificial over curbs/jumps and cannot model axle-specific grip.

Next:
- P1: replace per-call malloc/free state/contact reads with persistent buffers or caller-supplied buffers.
- P2: tune center-of-mass/shape and progressive lateral force before considering true wheel physics.
- Keep true wheel/suspension implementation optional until profiling shows it is worth its hardware cost.

## 3. Collision system
Status: WORKING, P1/P2.

Findings:
- Continuous collision is enabled.
- Hit/contact events feed damage and camera feedback.
- Road is approximated by many short oriented static boxes.
- Barriers and rocks use coarse box colliders.

Risks:
- Segment seams can introduce small bumps/snags.
- Visual mesh and physical collision can diverge.
- Static collider count can grow unnecessarily.

Next:
- P1: verify road seam stability at high speed.
- P2: compare current segmented road against a lower-count mesh/heightfield representation if supported by the chosen Box3D path.

## 4. AI
Status: FEATURE-RICH BUT ALLOCATION-HEAVY, P1/P2.

Findings:
- Four opponents are created and share the same movement path.
- AI supports racing line, apex bias, overtaking, recovery, personalities and terrain-aware speed.
- AI creates multiple temporary `THREE.Vector3` objects inside per-frame/per-car loops.
- Racer arrays and avoidance vectors are rebuilt repeatedly.
- Recovery can directly reposition AI when stuck.

Risks:
- GC pressure and frame-time spikes.
- Hard recovery teleport can look unnatural.

Next:
- P1: reuse scratch vectors/arrays.
- P2: make recovery staged: steering recovery -> controlled reset -> hard teleport only last.
- P2: reduce decision randomness that causes twitching while preserving overtaking variation.

## 5. Track / terrain
Status: FUNCTIONAL PROCEDURAL TRACK, P2.

Findings:
- 260 track samples, Catmull-Rom visual route, procedural elevation.
- Asphalt/shoulder/dirt/rough terrain model is distance-based.
- Ground support is a broad static floor plus road boxes.
- No banking-aware physical road surface.

Next:
- Validate visual/physics height agreement.
- Add authored bank/camber only if it improves handling and does not complicate collision excessively.
- Avoid increasing track sample count until nearest-track lookup is optimized.

## 6. Nearest-track / route queries
Status: MAJOR CPU OPTIMIZATION TARGET, P1.

Findings:
- `nearestTrack(pos)` scans all track samples linearly.
- It is called from player physics, AI, progress projection, terrain queries, suspension sampling, recovery and ranking.
- Several calls happen multiple times per car per frame.

Impact:
- This is one of the clearest CPU hot paths in the audited JavaScript.

Next:
- P1: add per-car cached nearest index with bounded local search and full-scan fallback after teleport/recovery.
- Alternative: build a small spatial grid for track sample lookup.

## 7. Renderer / frame pacing
Status: SOLID BASIC THREE.JS PIPELINE, P1/P2.

Findings:
- WebGL renderer with antialiasing, ACES tone mapping and SRGB output.
- Pixel ratio capped at 1.25, already helpful for GPU control.
- PCF soft shadows enabled.
- Render loop uses requestAnimationFrame and physics uses fixed Box3D accumulation.
- No dynamic resolution or frame-time budget controller.

Next:
- P1: add frame-time telemetry (mean, p95, worst frame, physics time, render time).
- P2: add optional adaptive pixel-ratio controller with conservative hysteresis.
- Never lower quality solely to chase FPS without a stable quality floor.

## 8. Lighting / shadows
Status: SIMPLE AND EXPENSIVE RELATIVE TO SCENE DETAIL, P2.

Findings:
- One HemisphereLight + one shadow-casting DirectionalLight.
- 1024 shadow map spans a very large +/-170 area.
- Many scenery objects cast shadows even when they are distant and low-value.

Next:
- P2: disable castShadow on low-value distant procedural scenery.
- Keep vehicle, ramps, nearby barriers and important landmarks casting shadows.
- Later: tune shadow camera around relevant race area/camera rather than increasing map resolution.

## 9. Shaders
Status: BASIC BUILT-IN PBR, P2/P3.

Findings:
- Mostly MeshStandardMaterial; no custom expensive shader graph.
- Good for maintainability and hardware compatibility.
- No shader variant management or shader warmup.

Next:
- Keep built-in materials unless a visible need justifies custom shaders.
- Avoid unnecessary transparency and custom branches.
- Add shader prewarm only if first-use hitching is observed.

## 10. Materials
Status: SIMPLE, DUPLICATION PRESENT, P2.

Findings:
- Many materials are created per car and per procedural object.
- Breakable barriers clone one material for each barrier even though the material is not individually modified.
- Particle effects create materials repeatedly.

Next:
- P2: share immutable materials by class/color where possible.
- Do not share materials that require per-object opacity unless using per-instance attributes or a pool.

## 11. Models / meshes
Status: GOOD STYLIZED PROTOTYPE, P2.

Findings:
- Buggy model is procedural and composed of many separate meshes.
- Five cars duplicate similar geometry/material structures.
- No LOD or merged static geometry strategy.

Next:
- P2: share immutable geometry across all buggy instances.
- P2: merge or instance repeated static decorative geometry.
- Do not increase polygon count until draw-call/geometry reuse is cleaned up.

## 12. World objects / scenery
Status: VISUALLY USEFUL, P1/P2 PERFORMANCE TARGET.

Findings:
- ~85 procedural trees/rocks plus track-edge pieces and props.
- Most scenery is separate Mesh objects.
- Many objects cast shadows.

Next:
- P1/P2: use InstancedMesh for repeated tree/rock categories.
- Disable shadows for far/low-value scenery first.
- Add distance culling/LOD only where it produces measurable savings.

## 13. Particles / visual FX
Status: HIGH ALLOCATION CHURN, P1.

Findings:
- Dust, exhaust and skid effects allocate geometry/material/mesh objects during gameplay.
- Expired effects dispose geometry/material and splice arrays.
- Hard caps exist, which prevents unlimited growth.

Impact:
- Frequent allocations/disposals can create GC and WebGL resource churn.

Next:
- P1: pool effect meshes.
- P1: share geometry where dimensions can be represented by transform scale.
- P2: replace array splice-heavy removal with compact pool/free-list behavior.

## 14. Memory / GC
Status: P1 OPTIMIZATION TARGET.

Main sources observed:
- temporary `THREE.Vector3` allocations inside AI/collision/camera logic
- particle Mesh/Geometry/Material allocation
- Box3D state/contact malloc/free calls
- repeated array creation and splice operations

Next:
- Introduce scratch vectors and small object pools.
- Add lightweight counters for effect pool usage and WASM allocations.

## 15. CPU efficiency
Status: P1.

Largest likely hot paths from static audit:
1. repeated O(N) nearest-track scanning
2. AI vector allocation / route queries
3. Box3D state/contact memory marshalling
4. many separate scene objects / draw submission overhead
5. repeated DOM writes every frame

Next:
- Optimize in that order unless profiling disproves it.

## 16. GPU efficiency
Status: P2.

Findings:
- Pixel ratio cap is good.
- Shadow casting is broad.
- Many separate meshes increase draw calls.
- No postprocessing stack, which is good for current cost.

Next:
- Reduce shadow casters and instance static scenery before reducing image quality.

## 17. UI / HUD
Status: FUNCTIONAL, P2.

Findings:
- Many HUD fields are updated every frame.
- Speed/rank are written from more than one path.
- Handling dropdown is present but is not wired into audited movement code.

Next:
- P2: remove duplicate HUD writes.
- P2: update slow-changing HUD values at a lower cadence.
- Either wire Handling modes correctly or remove the dead control until implemented.

## 18. Race systems
Status: FUNCTIONAL, P2.

Findings:
- Checkpoints/laps/wrong-way/ranking/finish/recovery exist.
- Ranking is calculated in more than one place.
- Start flow was hardened in v14.8 deployment path.

Next:
- Consolidate ranking into one authority.
- Add full-race automated completion/recovery test later.

## 19. Audio
Status: GAP IN AUDITED CURRENT RUNTIME, P2.

Finding:
- No active game audio/soundtrack system is visible in the audited v14.6 source reconstruction.

Next:
- Reconnect engine, tire, impact, UI and soundtrack layers after core frame-time work.
- Audio updates should be event/state driven, not allocate nodes every frame.

## 20. Networking / multiplayer
Status: NOT PRESENT IN AUDITED CURRENT SINGLE-PAGE RUNTIME, P1 PRODUCT GAP.

Finding:
- Current audited race runtime does not contain the earlier LAN host/join flow.

Next:
- Treat multiplayer as a separate integration domain after single-player physics/performance stabilizes.
- Network snapshots should not drive render transforms directly; interpolate/extrapolate into presentation state.

## 21. Code structure
Status: P1/P2.

Findings:
- Main gameplay remains a large reconstructed single HTML/JS runtime.
- Systems are functionally separated by functions, but ownership boundaries are informal.
- Build workflow still reconstructs from split source parts.

Next:
- Gradually extract modules after behavior is stable: input, vehicle, AI, race, FX, render/world, UI.
- Do not perform a large rewrite before measurable hot paths and regressions are controlled.

## 22. Deployment/runtime safety
Status: GOOD AFTER v14.8 FIX, P0 gate preserved.

Verified:
- v14.8 deployment workflow completed successfully.
- Box3D library build passed.
- WASM bridge build passed.
- generated JavaScript syntax validation passed.
- GitHub Pages deployment passed.

Keep as hard release gates:
- JS syntax
- Box3D/WASM build
- player + 4 AI spawn
- 5 physics bodies when Box3D active
- startup error recovery
- Pages deployment

# Ranked next engineering iterations

1. Pass 2 — remove obvious duplicate work and low-value shadow cost.
2. Pass 3 — nearest-track cached/local lookup.
3. Pass 4 — Box3D persistent state/contact buffers; remove per-frame malloc/free.
4. Pass 5 — FX pooling and shared geometry.
5. Pass 6 — AI scratch vectors and smoother recovery.
6. Pass 7 — model geometry/material sharing across five cars.
7. Pass 8 — scenery instancing and draw-call reduction.
8. Pass 9 — frame-time/CPU/GPU telemetry and frame-pacing audit.
9. Pass 10 — dynamic quality controls with quality floor.
10. Pass 11 — lighting/shadow refinement.
11. Pass 12 — material/shader cleanup and warmup check.
12. Pass 13 — track/collision seam audit.
13. Pass 14 — race-system authority cleanup.
14. Pass 15 — HUD/UI update cadence + handling-mode wiring.
15. Pass 16 — audio re-integration and audio performance.
16. Pass 17 — LAN multiplayer integration audit.
17. Pass 18 — latency/input/network interpolation audit.
18. Pass 19 — dead code, ownership and module-boundary cleanup.
19. Pass 20 — full regression, race completion, performance certification.

# Promotion rule
A pass is promoted only if intended behavior is preserved or improved and no release gate regresses. Prefer the simpler/cheaper implementation when two results are perceptually equivalent.
