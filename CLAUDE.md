# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A browser-based fireworks simulator (烟花模拟器) — a static HTML/CSS/JS project with no build system, no bundler, no tests, and no package manager. Open `index.html` directly in a browser to run.

## Architecture

The app follows a module pattern where each file registers a frozen namespace on `window` via IIFEs. Script load order in `index.html` matters — later scripts depend on globals set by earlier ones.

### Load order and dependency chain

```
js/lib/fscreen.js          → window.fscreen (fullscreen API polyfill)
js/lib/Stage.js            → window.Ticker, window.Stage (canvas + rAF loop + pointer events)
js/lib/MyMath.js           → window.MyMath (math utilities)
js/app/config.js           → window.FireworksAppConfig (frozen config constants)
js/app/store.js            → window.FireworksAppStore (state management with localStorage persistence)
js/app/background-manager.js → window.FireworksBackgroundManager (background image/style loader)
js/app/ui.js               → window.FireworksAppUI (DOM binding and rendering)
js/fireworks/runtime.js    → wires everything together; defines global state (store, stages, color constants, selectors)
js/fireworks/shells.js     → shell type definitions (crysanthemum, ring, willow, etc.) and launch sequences
js/fireworks/interaction.js → pointer/keyboard handlers, auto-launch timing, sim speed control
js/fireworks/simulation.js → the `Shell` class, particle systems (Star, Spark, BurstFlash), `update()`/`render()` loop
js/fireworks/audio.js      → soundManager (Web Audio API, preloads MP3s from audio/)
js/fireworks/engine.js     → init() entry point, `startSequence()` orchestration
```

### Key architectural concepts

- **Two-canvas rendering**: `trails-canvas` draws persistent trails (fading with `fillRect`), `main-canvas` draws fresh particles each frame. Both managed by `Stage` which handles DPI scaling.
- **Particle pool pattern**: `Star`, `Spark`, and `BurstFlash` use object pooling (`_pool` array) to avoid GC pressure. `add()` pops from pool or creates new; `returnInstance()` pushes back.
- **State management**: `FireworksAppStore.createStore()` provides a simple pub-sub store. State is persisted to `localStorage` under key `cm_fireworks_data` with schema versioning (current: `"1.0"`). Migrations exist for versions `1.1`/`1.2`/`2.0`/`2.1`.
- **Config vs Store**: `config.js` holds immutable app constants (selectors, quality levels, help text). `store.js` holds mutable user preferences (quality setting, shell choice, etc.).
- **Shell system**: Each shell type (crysanthemum, ring, willow, etc.) is a factory function in `shells.js` returning an options object. The `Shell` class in `simulation.js` consumes these options to launch comets and create burst patterns.
- **Word fireworks**: Text is rasterized to dot patterns via `MyMath.literalLattice()` (canvas-based text-to-points), then particles are spawned at each dot position. Controlled by `wordBurstTracker` which enforces a burst interval (`config.wordBurstInterval`).

### Device detection

`runtime.js` detects `IS_MOBILE` (≤640px), `IS_DESKTOP` (>800px), and `IS_HEADER` (desktop with viewport height <300px, used for embedding as a page header). Quality defaults and shell sizes adjust per device class.

## Configuration

- **Default background**: Edit `js/app/config.js` lines 9-12. `mode` can be `"none"`, `"image"`, or `"style"`.
- **Default words for text fireworks**: Edit `js/app/config.js` line 7 (`defaultWords` array).
- **Default text fireworks enabled**: Edit `js/app/store.js` line 79 (`wordShell` in `buildDefaultConfig`).

## License

Apache-2.0. Copyright © 2022 NianBroken.
