# Polygon Rush — Complete All-Category Engineering Audit

Audit scope: current engineering line through v14.10 candidate, with v14.9 as last fully deployed baseline at audit time.
Method: direct engineering/static/runtime-path audit. L3N is intentionally excluded from this project phase.
Goal: smooth/natural gameplay, low input and simulation latency, stable frame pacing, efficient CPU/GPU/memory use, low unnecessary hardware load, and no regression of already-good behavior.

Priority key:
- P0 — correctness/release blocker
- P1 — high gameplay/performance/latency value
- P2 — meaningful quality/efficiency improvement
- P3 — polish/cleanup

Promotion rule: same or better perceptual/gameplay result with less work is preferred. Any pass that worsens startup, movement, AI presence, collision stability, frame pacing, input response, or deployment safety is rejected.

---

## 1. Startup / runtime bootstrap — AUDIT COMPLETE
Status: GOOD, keep P0 gate.

Findings:
- Start flow is hardened with immediate UI transition, try/catch/finally and error recovery.
- Startup validates one player + four AI.
- When Box3D is active, startup validates five racer bodies.
- Three.js is still loaded from a CDN, so offline/network failure can prevent startup.

Required next work:
- Bundle/pin Three.js locally for production.
- Keep syntax/startup validation mandatory.

## 2. Input / controls — AUDIT COMPLETE
Status: GOOD FOUNDATION, P1/P2 refinement.

Findings:
- v14.8 added smoothed throttle, brake, steering and handbrake intent.
- Speed-sensitive steering shaping exists.
- Keyboard input is binary before shaping.
- No unified analog input abstraction for gamepad/touch yet.

Required next work:
- Add input abstraction with keyboard/gamepad/touch sources.
- Measure input-to-physics latency and steering rise/return time.
- Avoid extra frame queues.

## 3. Vehicle physics / Box3D — AUDIT COMPLETE
Status: FUNCTIONAL ARCADE RIGID-BODY MODEL, P1.

Findings:
- Box3D owns rigid-body collision/motion when active.
- Fixed step: 1/60, 4 substeps.
- Continuous collision enabled.
- Vehicle is a single box hull; no physical wheels/axles/suspension contacts.
- Control is forward force + braking + lateral damping + yaw torque.
- Body sleep disabled for racers.
- Current state/contact bridge allocates/frees WASM heap buffers on reads.

Required next work:
- Replace per-read malloc/free with persistent or caller-provided buffers.
- Profile whether all racers truly require sleep disabled.
- Tune COM/hull/grip progression before considering expensive true-wheel physics.

## 4. Collision response — AUDIT COMPLETE
Status: WORKING, P1/P2.

Findings:
- Native hit/contact events feed damage and camera feedback.
- Manual JS collision response is bypassed under Box3D.
- Breakables/static props are coarse boxes.
- Road collision is many short oriented static boxes.

Risks:
- Segment seams can create high-speed bumps/snags.
- Visual and physical road surfaces can diverge.

Required next work:
- High-speed seam stress test.
- Reduce static collider count or use a more continuous representation if Box3D path supports it cleanly.

## 5. Road / terrain physical agreement — AUDIT COMPLETE
Status: FUNCTIONAL, P1/P2.

Findings:
- Visual road has elevation and shoulder layers.
- Terrain type is distance based: asphalt/shoulder/dirt/rough.
- Broad floor + road boxes provide support.
- No physical banking/camber model.

Required next work:
- Compare visual road height/normal against physical contact height around full circuit.
- Add banking only where measurable handling benefit justifies added collision complexity.

## 6. Track route lookup — AUDIT COMPLETE / FIX IN v14.10
Status: MAJOR CPU HOT PATH ADDRESSED.

Findings:
- Original nearestTrack scanned all 260 samples for every query.
- It is called by physics, terrain, suspension, AI, ranking, progress and recovery.
- v14.10 adds spatial track lookup with exact full-scan fallback.

Required next work:
- Record query count, candidate count and fallback rate in real races.
- If fallback rate is low and correctness stable, keep this approach.

## 7. AI driving — AUDIT COMPLETE
Status: FEATURE-RICH, P1/P2 optimization.

Findings:
- Four AI racers are explicitly spawned.
- AI has racing line, apex bias, overtaking, defensive choices, terrain-aware speed and recovery.
- Multiple temporary Vector3 objects are created in per-car/per-frame loops.
- Decision randomness can produce twitchy behavior.
- Hard teleport recovery is used after severe stuck/off-track states.

Required next work:
- Reuse scratch vectors and racer arrays.
- Smooth decision transitions.
- Use staged recovery: steer back -> controlled reset -> hard teleport only last.

## 8. AI fairness / shared physics — AUDIT COMPLETE
Status: GENERALLY SHARED, P2.

Findings:
- Player and AI use the same hybrid movement path.
- AI still has direct recovery/reposition assistance.
- AI speed targets/personality differ intentionally.

Required next work:
- Keep recovery aid visible only as last-resort safety, not normal race advantage.
- Add lap-completion AI regression test.

## 9. Race logic — AUDIT COMPLETE
Status: FUNCTIONAL, P2 cleanup.

Findings:
- Countdown, checkpoints, laps, wrong-way, health disable/recovery and finish exist.
- Ranking authority was duplicated; v14.9 removed one duplicate loop path.
- Player and AI checkpoint logic are not fully unified.

Required next work:
- One authoritative race-progress/ranking calculation.
- Automated full 3-lap completion test.

## 10. Recovery / respawn — AUDIT COMPLETE
Status: FUNCTIONAL, P2.

Findings:
- Player recovery resets position, heading, velocity and Box3D body.
- AI recovery can hard reset after stuck/off-track timeout.

Required next work:
- Preserve last-safe transform more explicitly.
- Prevent reset into another racer/barrier.
- Add recovery cooldown and safe-space validation.

## 11. Rendering pipeline — AUDIT COMPLETE
Status: SIMPLE/STABLE, P1/P2.

Findings:
- Three.js WebGL renderer.
- SRGB output and ACES filmic tone mapping.
- Pixel ratio capped at 1.25.
- No heavy post-processing stack.
- No dynamic resolution controller.

Required next work:
- Add frame-time telemetry before adaptive quality.
- If needed, add conservative resolution hysteresis with a visual-quality floor.

## 12. Frame pacing / latency — AUDIT COMPLETE
Status: NEEDS INSTRUMENTATION, P1.

Findings:
- requestAnimationFrame drives rendering.
- Box3D uses fixed-step accumulator.
- dt is clamped.
- No p50/p95/p99 frame-time telemetry yet.
- No explicit render/physics/input timing breakdown.

Required next work:
- Track mean/p95/p99/worst frame time.
- Track physics time, AI time, render submission time and GC-like spikes.
- Track input sampled -> physics applied latency.

## 13. Lighting — AUDIT COMPLETE
Status: BASIC, P2.

Findings:
- Hemisphere + one directional sun.
- Environment palettes vary, lighting rig largely does not.
- Night/neon scene lacks dedicated local-light treatment.

Required next work:
- Environment-specific sun/ambient tuning.
- Use emissive presentation before adding many expensive dynamic lights.
- Headlights/local lights only if GPU budget supports them.

## 14. Shadows — AUDIT COMPLETE / PARTIAL FIX IN v14.9
Status: IMPROVED, P2.

Findings:
- 1024 PCF soft shadow map covers very broad +/-170 region.
- v14.9 disables shadows on low-value distant procedural scenery.
- Important objects still cast shadows.

Required next work:
- Tighten/follow shadow camera around relevant race region.
- Do not increase shadow-map resolution until coverage is fixed.

## 15. Shaders — AUDIT COMPLETE
Status: GOOD LEAN BASE, P2/P3.

Findings:
- Mostly MeshStandardMaterial and MeshBasicMaterial.
- No complex custom shader graph.
- No shader warmup.
- No major transparency stack beyond effects.

Required next work:
- Keep built-in shaders unless a visible feature justifies custom code.
- Check first-use shader compilation hitching before adding warmup.

## 16. Materials — AUDIT COMPLETE
Status: SIMPLE BUT DUPLICATED, P2.

Findings:
- v14.9 shares barrier material.
- Car material sets are recreated per car.
- Many lamps/lights create individual materials.
- FX create individual materials during gameplay.

Required next work:
- Cache/share immutable material families.
- Preserve per-object emissive/opacity only where actually needed.

## 17. Vehicle models / meshes — AUDIT COMPLETE
Status: GOOD STYLIZED PROTOTYPE, P2.

Findings:
- Procedural buggy contains many separate submeshes.
- All five cars duplicate geometry construction.
- Tubes/cage/suspension/wheels are built repeatedly.
- No vehicle LOD.

Required next work:
- Cache immutable geometries.
- Instantiate/reuse shared geometry among five cars.
- Keep visual detail stable while lowering geometry construction/draw overhead.

## 18. Scenery / world objects — AUDIT COMPLETE
Status: P1/P2 PERFORMANCE TARGET.

Findings:
- ~85 procedural scenery objects plus road-edge pieces, props, barriers, gates, rocks and ramps.
- Most are separate meshes.
- v14.9 removes low-value scenery shadow casting.

Required next work:
- Use InstancedMesh for repeated scenery classes.
- Add conservative distance culling/LOD only after draw-call measurement.

## 19. Particles / FX — AUDIT COMPLETE
Status: HIGH ALLOCATION CHURN, P1.

Confirmed:
- Dust creates SphereGeometry + Material + Mesh per spawn.
- Exhaust creates SphereGeometry + Material + Mesh per spawn.
- Skids create PlaneGeometry + Material + Mesh per spawn.
- Expiry disposes GPU resources and splices arrays.

Required next work:
- Pool dust/exhaust/skid objects.
- Share geometry and use scale for size variation.
- Prefer free-list reuse over repeated create/dispose/splice.

## 20. Memory / JavaScript GC — AUDIT COMPLETE
Status: P1.

Main pressure sources:
- AI temporary vectors.
- Camera/collision temporary vectors.
- FX object/geometry/material churn.
- Repeated small object/array creation.
- DOM text writes.

Required next work:
- Scratch-vector pool.
- FX pools.
- Cached arrays/objects for recurrent queries.
- Add allocation counters where practical.

## 21. WASM memory / bridge — AUDIT COMPLETE
Status: P1.

Confirmed:
- pr_b3_get_body_state mallocs 7 floats per read.
- pr_b3_get_contacts callocates contact payload per poll.
- JS frees both after each call.

Required next work:
- Persistent fixed-capacity state/contact buffers or caller-allocated memory.
- Remove allocator traffic from normal frame loop.

## 22. CPU efficiency — AUDIT COMPLETE
Status: P1.

Ranked CPU risks:
1. route queries — partially addressed in v14.10
2. WASM state/contact marshalling
3. AI temporary vector/object work
4. particle lifecycle churn
5. many separate scene objects/draw submission
6. repeated DOM/HUD updates

Required next work:
- Optimize in this order unless runtime telemetry disproves it.

## 23. GPU efficiency — AUDIT COMPLETE
Status: P2.

Findings:
- Pixel ratio cap helps.
- No expensive post-process chain.
- Shadow coverage and draw calls are primary current risks.
- Many separate mesh objects increase submission overhead.

Required next work:
- Instance scenery and share model geometry.
- Tighten shadows.
- Measure renderer.info calls/triangles/textures.

## 24. HUD / DOM updates — AUDIT COMPLETE
Status: IMPROVED, P2.

Findings:
- v14.9 removed duplicated speed/rank work.
- Many HUD labels still update every frame even when values did not change.

Required next work:
- Cache last displayed values.
- Update slow-changing values at 10-20 Hz rather than every render frame.

## 25. Menu / settings — AUDIT COMPLETE
Status: FUNCTIONAL SHELL, P2.

Findings:
- World and Handling selectors exist.
- Handling selector is not wired into current audited movement path.
- Preview/start/pause/debug are present.

Required next work:
- Wire Arcade/Grippy/Drift presets to real controlled parameters or remove the dead selector until ready.

## 26. Audio — AUDIT COMPLETE
Status: CURRENT RUNTIME GAP, P2.

Findings:
- No active audio engine is visible in the current reconstructed gameplay runtime.

Required next work:
- Reconnect engine RPM/load loop, tire/slip, collision, nitro, UI and environment/music layers.
- Use persistent audio nodes/voices; avoid per-frame node creation.

## 27. Networking / LAN multiplayer — AUDIT COMPLETE
Status: PRODUCT GAP IN CURRENT RUNTIME, P1.

Findings:
- Earlier project lineage included LAN work, but current audited race runtime does not contain host/join/lobby synchronization.

Required next work:
- Reintegrate as a separate system after single-player physics/performance stabilizes.
- Snapshot/interpolate presentation rather than directly slaving render transforms to network packets.

## 28. Network latency architecture — AUDIT COMPLETE
Status: P1 WHEN MULTIPLAYER RETURNS.

Required design:
- host-authoritative simulation
- sequence/timestamp snapshots
- interpolation buffer for remote racers
- local input prediction where necessary
- reconciliation without hard visual snapping
- bandwidth cap / update-rate control

## 29. Mobile / Android readiness — AUDIT COMPLETE
Status: PARTIAL, P1/P2.

Findings:
- Responsive HTML viewport exists.
- Current audited runtime has keyboard-centric controls.
- No audited touch/gamepad abstraction in this runtime.
- GPU/thermal scaling strategy not yet present.

Required next work:
- Touch/gamepad input abstraction.
- lower mobile quality tier: pixel ratio, shadow range, scenery density.
- thermal-friendly frame cap option.

## 30. PC hardware efficiency / heat / power — AUDIT COMPLETE
Status: NEEDS TELEMETRY, P1/P2.

Findings:
- Current renderer requests high-performance GPU preference.
- Frame loop renders continuously even in menus/paused state.
- Reduced scene work exists but there is no explicit idle/paused FPS cap.

Required next work:
- Lower update/render cadence in menus and pause.
- Optional 60/90/120/uncapped FPS settings.
- Avoid using maximum GPU continuously when the visual result does not need it.

## 31. Asset/dependency resilience — AUDIT COMPLETE
Status: P1 PRODUCTION GAP.

Findings:
- Box3D runtime is compiled/deployed with the project.
- Three.js is fetched from cdnjs at runtime.

Required next work:
- Vendor/pin Three.js locally.
- Validate offline startup.
- Cache/version static assets.

## 32. Code structure / ownership — AUDIT COMPLETE
Status: P1/P2.

Findings:
- Gameplay still lives largely in one reconstructed HTML/JS runtime.
- Functions are separated but ownership boundaries are informal.
- Build reconstructs from split source parts plus engineering patches.

Required next work:
- Gradually extract stable modules: input, vehicle, Box3D bridge, AI, race, FX, world/render, UI/audio/network.
- Do not perform a big rewrite before performance/regression telemetry exists.

## 33. Dead / duplicated code — AUDIT COMPLETE
Status: P2.

Known examples:
- Handling menu currently unwired.
- Ranking had duplicate calculation path, partially cleaned in v14.9.
- Some fallback-only physics/suspension logic remains alongside Box3D path intentionally.

Required next work:
- Keep fallback logic only when intentionally supported and tested.
- Remove dead UI/options and duplicated authority paths.

## 34. Error handling / diagnostics — AUDIT COMPLETE
Status: GOOD BASIC DIAGNOSTICS, P1/P2.

Findings:
- F3 debug panel exists.
- Start failure surfaces stack/error.
- Current debug includes physics state and racer data.

Required next work:
- Add frame-time, route-query, allocator/FX-pool and draw-call counters.
- Add structured race/runtime certification output.

## 35. Build / deployment — AUDIT COMPLETE
Status: GOOD GATED PIPELINE.

Findings:
- GitHub Actions rebuilds source, compiles official Box3D v0.1.0 with Emscripten, validates JS/WASM and deploys Pages.
- v14.9 passed the full gate.
- v14.10 had reconstruction, Box3D compile, WASM build and generated-game validation passing at audit time; Pages upload/deploy was still completing.

Required next work:
- Keep current hard gates.
- Add offline dependency validation once Three.js is local.

## 36. Regression testing — AUDIT COMPLETE
Status: NEEDS EXPANSION, P0/P1.

Current gates cover startup/build/static assertions.

Still needed:
- player movement under real runtime
- 4 AI movement and persistence
- 3-lap race completion
- recovery/reset
- collision stress
- road seam high-speed pass
- long-run memory/FX stability
- frame-time p95/p99
- pause/menu low-load behavior
- handling modes when wired
- multiplayer tests when restored

---

# Completed engineering passes

- Pass 1 / v14.8 — input smoothing and speed-sensitive steering shaping. COMPLETE + deployed.
- Pass 2 / v14.9 — duplicate HUD/rank cleanup, scenery shadow reduction, barrier material sharing, persistent Box3D body-owner lookup. COMPLETE + deployed.
- Pass 3 / v14.10 — spatial nearest-track lookup with exact full-scan fallback and route-query telemetry counters. IMPLEMENTED; release pipeline in progress at final audit time.

# Full ranked implementation list after all audits

1. P1 — Box3D persistent state/contact buffers; remove frame-loop malloc/free.
2. P1 — FX pools for dust, exhaust and skids; shared geometry/materials.
3. P1 — AI scratch vectors/arrays and smoother staged recovery.
4. P1 — frame-time/physics/AI/render telemetry with p95/p99/worst-frame reporting.
5. P1 — vendor Three.js locally; offline dependency/startup validation.
6. P1 — paused/menu low-power mode and configurable FPS cap.
7. P1/P2 — road collider seam/high-speed stress and collision continuity cleanup.
8. P2 — shared buggy geometries/material families across all five cars.
9. P2 — InstancedMesh for repeated scenery/edge props where measurable.
10. P2 — tighten/follow sun shadow coverage before increasing quality.
11. P2 — environment-specific lighting; cheap emissive-first night/neon strategy.
12. P2 — HUD value caching and lower update cadence for slow values.
13. P2 — one authoritative race progress/rank/checkpoint path.
14. P2 — safe recovery transforms/cooldown/occupancy checks.
15. P2 — wire Arcade/Grippy/Drift handling modes or remove dead selector.
16. P2 — reconnect performant pooled/state-driven audio system.
17. P1 product integration — restore LAN multiplayer on stable single-player core.
18. P1 networking — snapshot/interpolation/prediction/reconciliation latency architecture.
19. P1/P2 — mobile touch/gamepad abstraction and mobile thermal-quality tier.
20. P2 — gradual module extraction and dead-code/ownership cleanup.
21. P0/P1 — full automated race/runtime regression suite.
22. P1/P2 — final long-run performance, memory, GPU-load and latency certification.

# Recommended execution order

Phase A — frame-loop cost:
1) WASM buffers
2) FX pooling
3) AI scratch allocations
4) telemetry

Phase B — rendering/hardware efficiency:
5) model geometry sharing
6) scenery instancing
7) shadow tightening
8) menu/pause low-power + FPS cap
9) dependency bundling

Phase C — natural gameplay:
10) road/collision seams
11) vehicle COM/grip progression
12) AI recovery/decision smoothing
13) race/recovery authority cleanup
14) handling modes

Phase D — presentation/product:
15) lighting/material refinement
16) HUD cadence
17) audio
18) mobile controls/tier
19) LAN multiplayer + network latency architecture

Phase E — cleanup/certification:
20) modules/dead code
21) full regression suite
22) long-run performance and hardware-efficiency certification

Audit conclusion: the project does not need more broad discovery before engineering continues. The main remaining work is now well-defined and should proceed from measurable runtime cost first, then gameplay naturalness, then presentation/product integration, with the current startup/Box3D/deployment gates kept intact.