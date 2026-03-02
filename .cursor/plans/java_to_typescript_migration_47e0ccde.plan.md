---
name: Java to TypeScript Migration
overview: Migrate the Crystals Java game (17 Java files, ~3,700 LOC) to a TypeScript browser game using Canvas 2D and Vite, including the WeltEditor, with all names translated to English.
todos:
  - id: resolve-welt-format
    content: "RESOLVED: Old PNG levels from alteWelten/ are the starting source. No need to convert .welt binaries. New WeltEditor saves as JSON."
    status: completed
  - id: layer-0-setup
    content: "Layer 0: Project setup -- Vite + TS + Vitest, move Java to /legacy, normalize + copy assets, convert audio"
    status: pending
  - id: layer-1-types
    content: "Layer 1: Data types -- BlockType, Command, ParticleSettings, DynamicLightSettings + tests"
    status: pending
  - id: layer-2-world
    content: "Layer 2: World -- grid, PNG loading, JSON save/load, pathfinding, visibility + tests"
    status: pending
  - id: layer-3-creatures
    content: "Layer 3: Creatures -- Creature base, Dwarf (3 types), 8 monsters, timer-based actions, spawn system + tests"
    status: pending
  - id: layer-4-rendering
    content: "Layer 4: Rendering -- Canvas renderer for tiles, creatures, particles, HUD, lighting, camera"
    status: pending
  - id: layer-5-gameloop
    content: "Layer 5: Game loop + input -- requestAnimationFrame loop, mouse/keyboard handling, save/load integration"
    status: pending
  - id: layer-6-audio
    content: "Layer 6: Audio -- Web Audio API, positional sound, background music, sound effects"
    status: pending
  - id: layer-7-menus
    content: "Layer 7: UI/Menus -- Main menu, world selection, tutorials, story/credits screens"
    status: pending
  - id: layer-8-editor
    content: "Layer 8: WeltEditor -- Canvas tile editor, paint blocks/monsters, JSON save/load"
    status: pending
isProject: false
---

# Crystals: Java to TypeScript Migration Plan

## Decisions Summary

- **Target**: Browser, Canvas 2D (no framework)
- **Build tool**: Vite + TypeScript (strict mode)
- **Naming**: Translate all German names to English
- **Map format**: JSON for new maps (created by WeltEditor), PNG import for legacy levels. No backwards compat with old binary `.welt` map files
- **Save format**: JSON for game saves (replaces Java ObjectOutputStream `LastSave.welt`)
- **Assets**: Normalize all filenames to lowercase
- **Audio**: Convert WAV to MP3/OGG for web
- **Threading**: Convert all Java Threads to delta-time / requestAnimationFrame
- **Behavior**: Modernize where it makes sense, same game feel
- **Tests**: Yes, with Vitest, added per layer
- **Scope**: Game + WeltEditor
- **Location**: Replace Java in-place, move Java source to `/legacy`
- **Hosting**: Local dev only (`npm run dev`) for now

---

## RESOLVED: File Formats

In the Java version, both maps and saves used the same `.welt` extension and Java binary serialization, but they are distinct concepts:

- **Maps/Levels** (`worlds/*.welt`): Created by the WeltEditor, define initial world state (tiles, monster spawns, base). These are NOT saves.
- **Game saves** (`LastSave.welt`): Created during gameplay, snapshot of current progress (mined tiles, positions, resources, health).

For the TypeScript version:

- Old PNG levels from `worlds/alteWelten/*.png` are valid and will be used as the starting level source (PNG parsing is RGB-based, unaffected by Java serialization issues)
- Old binary `.welt` map files do NOT need to be preserved or converted -- starting fresh (they suffered from `serialVersionUID` mismatch issues)
- **New map format**: JSON, created by the new WeltEditor. The game can also import legacy PNG levels (color-code format)
- **New save format**: Separate JSON schema capturing game state (world grid as modified during play, creature states, resources, camera position). Saved to browser download / loaded via file picker

---

## Project Structure (new)

```
/legacy/                    # archived Java source + build.xml
/public/
  assets/                   # all PNGs (lowercase), converted audio
  worlds/                   # level files (new JSON format or PNGs)
/src/
  types/                    # BlockType, Command, ParticleSettings, LightSettings
  world/                    # World class: grid, load from PNG, save/load JSON, pathfinding, visibility
  creatures/                # Creature base + all 8 monster types + Dwarf
  game/                     # Game loop, input handling, camera
  rendering/                # Canvas renderer: tiles, creatures, HUD, particles
  audio/                    # AudioManager: Web Audio API, positional sound
  ui/                       # Main menu, world selection, tutorial screens
  editor/                   # WeltEditor (separate entry point)
  main.ts                   # Entry point
/tests/                     # Vitest tests per layer
index.html
vite.config.ts
package.json
tsconfig.json
```

## Java to TypeScript Class Mapping

- `Welt` -> `World` (world grid, block types, pathfinding, fog of war, save/load)
- `Kreatur` -> `Creature` (base class: stats, movement, command queue, combat)
- `Zwerg` -> `Dwarf` (3 specializations: worker, axe, hammer; class switching, leveling)
- `Ratte` -> `Rat`, `Spinne` -> `Spider`, `Schleim` -> `Slime`, `Auge` -> `Eyebat`, `Klaue` -> `Claw`, `Geist` -> `Ghost`, `Schlange` -> `Snake`, `Spectre` -> `Spectre`
- `Befehl` -> `Command` (walk, mine, regionMine, wait, attack)
- `Partikel` / `PartikelSettings` -> `Particle` / `ParticleSettings`
- `DynamicLightSettings` -> `DynamicLightSettings`
- `Fenster` -> split into `Game` (loop + input), `Renderer` (drawing), `AudioManager` (sound)
- `ZwergenLoch` -> `MainMenu` (menu screens, world selection, tutorials)

## Migration Layers (execution order)

### Layer 0: Project Setup

- Initialize Vite + TS project, install Vitest
- Move all Java source to `/legacy`
- Copy + lowercase all asset PNGs to `/public/assets/`
- Convert WAV files to MP3/OGG, place in `/public/assets/`
- Copy PNG levels from `alteWelten/` to `/public/worlds/`

**Manual test after Layer 0:**
1. Run `npm run dev` -- Vite dev server should start without errors
2. Open `http://localhost:5173` -- you should see a blank page (or placeholder text), no console errors
3. Open browser DevTools > Network tab, confirm asset files are accessible (e.g. navigate to `http://localhost:5173/assets/leer.png` -- should show the tile image)
4. Run `npm test` -- Vitest should run with 0 tests, 0 failures
5. Check `/legacy/` folder contains all original Java files

---

### Layer 1: Data Types (no I/O, no rendering)

- `BlockType` enum (EMPTY, DIRT, STONE, GOLD, IRON, MITHRIL, CRYSTAL, BASE, ROCK, SHADOW, TRAP, LAVA)
- `Command` class (type: walk | mine | regionMine | wait | attack, position, region bounds)
- `ParticleSettings`, `DynamicLightSettings` (plain data)
- Tests: enum completeness, command construction

**Manual test after Layer 1:**
1. Run `npm test` -- all type/enum tests should pass
2. No browser test needed (this is pure data, no visuals)

---

### Layer 2: World (grid, PNG loading, save/load, pathfinding, visibility)

- `World` class: 2D grid of BlockType, creature registry per cell, visibility grid
- PNG loader: read image pixels, map colors to BlockType + monster spawns (using `<canvas>` to read pixel data)
- JSON map format: schema for level files (created by WeltEditor or converted from PNG)
- JSON save format: schema for game saves (extends map format with in-progress game state)
- Pathfinding (BFS, ported from `Welt.wegBerechnen`)
- Fog of war / visibility calculation (ported from `sichtbarkeitberechnenvon`)
- Tests: PNG loading, pathfinding, visibility, map JSON round-trip, save JSON round-trip

**Manual test after Layer 2:**
1. Run `npm test` -- all world tests should pass (pathfinding, visibility, save/load round-trip)
2. Open the browser -- there should be a temporary debug view that loads a PNG level (e.g. "Loose Gold (Easy).png") and prints the parsed grid to the console
3. Check the console output: verify the grid dimensions match the PNG size, spot-check a few block types against the color codes (e.g. green pixels = DIRT, blue = STONE)
4. Test save/load: the debug view should have a "Save" button that downloads a JSON file, and a "Load" button that reads it back. Verify the loaded world matches the original

---

### Layer 3: Creatures (state, behavior, commands -- no rendering)

- `Creature` base: stats, position, command queue, movement (delta-time), combat
- `Dwarf`: 3 specializations, class switching, leveling, mining logic
- 8 monster subclasses: stats, sprite config, AI (random wandering, attack dwarves)
- Convert inner Thread classes (Abbauen, Angreifen, Regenerieren) to timer-based actions
- Monster spawn system
- Tests: movement, combat resolution, mining, leveling, command queue

**Manual test after Layer 3:**
1. Run `npm test` -- all creature tests should pass (movement, combat, mining, leveling, command queue)
2. Open the browser -- the debug view should now show creature positions as colored dots on the parsed grid (no sprites yet, just markers)
3. Verify: 3 dwarves appear at the base location, monsters appear on their spawn tiles
4. Watch for ~10 seconds: monsters should wander randomly (dots moving), dwarves should be idle at base
5. Check console for any errors (especially around combat -- confirm no phantom loop)

---

### Layer 4: Rendering (Canvas 2D)

- `Renderer` class: draw world tiles, fog of war overlay, creature sprites, selection frame
- Particle rendering (floating numbers, mining debris)
- HUD: resource counts, help overlay, dwarf info panel
- Dynamic lighting overlay
- Camera system (viewport offset, mouse-edge scrolling)
- Tests: mostly visual / manual, but can test camera math

**Manual test after Layer 4:**
1. Run `npm test` -- camera math tests should pass
2. Open the browser -- you should now see the actual game world rendered with tile sprites
3. Verify tile rendering: compare a few tiles against the Java version (dirt, stone, gold, crystal should look right)
4. Check fog of war: unexplored areas should be dark/hidden, area around base should be visible
5. Check creature sprites: dwarves and monsters should show their correct PNG sprites (standing pose)
6. Move mouse to screen edges -- camera should scroll smoothly
7. Check HUD: resource counts (Gold: 0, Iron: 0, etc.) should display at the top

---

### Layer 5: Game Loop and Input

- `Game` class: init, load world, requestAnimationFrame loop (update + render)
- Mouse input: select creature (left click), issue commands (right click), shift-queue
- Keyboard input: number keys for dwarf switching, shift for command queuing, H for help
- Camera scrolling from mouse position
- Integrate creature updates, particle updates, spawn timer
- Save/load to browser (download JSON / file picker to load)

**Manual test after Layer 5 -- this is the BIG playtest:**
1. Open the browser -- the game should be fully playable (without audio)
2. **Selection**: Left-click a dwarf -- a selection frame should appear around it
3. **Movement**: Right-click an empty visible tile -- the selected dwarf should walk there
4. **Mining**: Right-click a dirt/stone tile adjacent to a visible empty tile -- the dwarf should walk there and start mining. Particles should appear. The tile should become empty when done
5. **Shift-queue**: Hold Shift, right-click multiple tiles -- dwarf should queue commands and execute them in order
6. **Combat**: Send a dwarf toward a monster -- combat should start, damage numbers should appear. Verify combat ENDS when one dies (no phantom loop!)
7. **Dwarf types**: Press number keys to switch dwarf class. Verify sprite changes (worker/axe/hammer)
8. **Resources**: Mine gold/iron/mithril/crystal tiles -- resource counters in HUD should increase
9. **Fog of war**: As dwarves explore, new tiles should become visible
10. **Save/Load**: Save the game, reload the page, load the save -- verify world state is preserved (resources, dwarf positions, mined tiles)
11. **Press H**: Help overlay should toggle on/off
12. **Monster AI**: Monsters should wander and attack dwarves that enter their tile

---

### Layer 6: Audio

- `AudioManager`: Web Audio API
- Load MP3/OGG files
- Positional audio (volume based on camera distance, ported from `lokalersoundLaden`)
- Background music (normal vs enemy)
- Sound effects: mining, levelup, damage, pickup, new cave, lose

**Manual test after Layer 6:**
1. Open the browser -- background music should start playing after first click (browser autoplay policy)
2. **Mining sound**: Order a dwarf to mine -- "abbau" sound should play, louder when camera is near the dwarf
3. **Combat sound**: Engage a monster -- damage sound should play
4. **Positional audio**: Scroll camera far away from an active dwarf -- sounds from that dwarf should get quieter
5. **Music switch**: When a monster is nearby/in combat, music should switch to the enemy track
6. **Level up**: Level up a dwarf -- level-up sound should play
7. **Sound toggle**: Verify the sound toggle (from menus) mutes everything

---

### Layer 7: UI / Menus

- `MainMenu`: Play, Sound toggle, Credits, Tutorial, Story screens
- World selection screen (list available worlds, load on click)
- Tutorial image viewer (7 tutorial slides)

**Manual test after Layer 7:**
1. Open the browser -- you should see the main menu (background image, buttons)
2. **Play**: Click "Play" -- world selection screen should appear, listing available levels
3. **Level select**: Click a level name (e.g. "Loose Gold (Easy)") -- the game should load and start
4. **Sound toggle**: Click sound button on main menu -- verify it toggles
5. **Credits**: Click credits -- "Das Team" image should display, click to go back
6. **Tutorial**: Click tutorial -- 7 tutorial slides should display one by one, clicking advances
7. **Story**: Click story -- story image should display
8. **Navigation**: All "Back" buttons should return to the correct previous screen

---

### Layer 8: WeltEditor

- Separate Vite entry point (`editor.html`)
- Canvas-based tile editor: paint block types, place monsters with level
- Save/load worlds as JSON
- Export as PNG (optional, for backwards compat with color-code format)

**Manual test after Layer 8:**
1. Open `http://localhost:5173/editor.html` -- the editor should load
2. **New world**: Create a new world (set width/height) -- empty grid should appear
3. **Paint tiles**: Select a block type (dirt, stone, gold, etc.) and click/drag on the grid -- tiles should change
4. **Place monsters**: Select a monster type + level, click on a tile -- monster marker should appear
5. **Place base**: Place a base tile -- should be marked distinctly
6. **Save**: Click save -- a JSON file should download
7. **Load**: Click load, pick the JSON file -- the world should restore exactly
8. **Test in game**: Load the JSON world in the main game -- verify it plays correctly (blocks, monsters, base position all match what you painted)

---

## Known Bugs to Fix in Migration

- **Phantom combat loop**: In the Java version, walking onto a tile with a freshly spawned monster could trigger a never-ending combat loop. Root cause: the `Angreifen` (attack) thread runs concurrently with the `update()` game loop, causing race conditions on the command queue (`weg`) and creature registry. Multiple attack threads could spawn for the same encounter, and the `warten` (wait) command guard could desync. **Fix**: In TypeScript, combat is a frame-based state machine (elapsed-time accumulator on each creature), not a recursive thread chain. One combat check per frame, no concurrency, no phantom loops.

## Key Technical Decisions

- **Game loop**: single `requestAnimationFrame` loop; all entity updates receive `deltaTime` in ms
- **Threading replacement**: mining/attack/regen timers become accumulated elapsed-time counters on each creature, checked every frame
- **Pathfinding**: keep BFS from Java (it works for grid-based movement)
- **Rendering**: offscreen canvas (1250x1250 like Java's `paintTo` BufferedImage), scaled to window
- **Sprites**: preload all PNGs into `HTMLImageElement` objects at startup
- **Map format**: JSON with grid as a flat array, monster spawn list, base position, metadata (created by WeltEditor)
- **Save format**: Separate JSON schema extending the map format with current creature states, mined tiles, resources, camera position
- **Positional audio**: use Web Audio API gain nodes based on distance from camera center

