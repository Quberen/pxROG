# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**像素肉鸽战机 (pxROG)** — A mobile-first pixel roguelite shoot-em-up running entirely in the browser with no build step. All game logic lives in four JS files loaded directly by `index.html`. No npm, no bundler, no tests.

## Running the Game

Open `index.html` in a browser. A local HTTP server is needed for audio (due to CORS on `file://`):

```bash
python3 -m http.server 8080
# then open http://localhost:8080
```

There is no build, lint, or test command.

## File Architecture

The entire game is four JS files plus `index.html`:

| File | Role |
|------|------|
| `config.js` | Static data: `config`, `DIFF_CONFIG`, `RARITY`, `baseUpgradePool`, `upgradePool`, `TECH_TREE`, sprite pixel matrices. No game logic. |
| `mod_workshop.js` | Wave data & patterns: `WORKSHOP.data` (enemy/item stats), `WORKSHOP.formations`, `WORKSHOP.patterns` (wave scripts), `WORKSHOP.cassettes` (level timelines). Also defines `spawn()` helper. |
| `entities.js` | All entity classes: `Player`, `BaseEnemy` (+ subclasses), `EnemyBullet`, `Item`, `Particle`, `AOEEffect`, `BurnEffect`, `DamageText`. |
| `main.js` | Engine: game loop (`requestAnimationFrame`), input, HUD, UI screens, shop, tech terminal, systems, checkpoint I/O. |

**Load order in `index.html`**: `mod_workshop.js` → `config.js` → `entities.js` → `main.js`. `config.js` reads `WORKSHOP.data` at parse time to build `ENEMY_TYPES` and `upgradePool`.

## Key Systems and Patterns

### Game Loop (`main.js`)
The main `gameLoop()` drives everything via `requestAnimationFrame`. Key globals:
- `frameCount` — absolute frame counter (used as timeline for shake queue `endAt`, not wall clock)
- `hitStopFrames` — when > 0, entity `update()` is skipped (hitstop effect)
- `shakeQueue` — array of `{ intensity, endAt }`, rendered from `shakeQueue[0]`
- `bossEnterPhase` — countdown; while > 0, player `update()` and `takeDamage()` return early
- `endingState` — `'none' | 'playerDead' | 'bossDead'`

### Entity Update Pattern
`processGroup(array, isPlaying)` iterates backwards, calls `ent.update()` then `ent.draw(ctx)`, and splices inactive entries. All entities expose `this.active = true/false`.

### Player Stat System (`Player.getStat`)
Three-layer stat architecture:
1. **`baseStats`** — base values (damage, fireRate, etc.) set by difficulty
2. **`sectorTech`** — in-run blue-track upgrades (`flat_*` additive, `inc_*` multiplicative)
3. **`metaStats`** — cross-run meta progression

`getStat(name)` computes: `(base + flat) * inc * more[]`. For `damage`, `ATK_DMG_FLAT = [0,2,5,9]` indexed by `techTree.atk_dmg` level is added to `base` before multiplication.

### Equipment vs Upgrades
- **`player.equipment[id]`** — equippable items with `{ owned, equipped, level, slotCost }`. Only `type: 'equip'` entries from `upgradePool`. Slot system enforced at equip time.
- **`player.upgrades[id]`** — stackable stat/utility upgrades (integers).
- **`player.techTree[id]`** — persistent tech tree nodes (level integers). Bought via `window.techTreeBuy(nodeId)`.
- **`player.techLevels`** — blue-track levels (`fireRate`, `damage`, `maxHp`) bought via `window.terminalBuyBlue(key)`.

### Boss State Machine (`BossScrapDominator`, `entities.js`)
States: `ENTER → HOVER → ATTACK_* → HOVER → ...`, plus `PHASE_TRANS`, `PHASE_HALF_EXIT`, `PHASE_HALF_RETURN`.

Phase transitions at 75%/50%/25% HP (tracked in `this.phaseTransDone` Set). At 50% HP triggers `PHASE_HALF_EXIT` special event. `efficiencyMult = 1.2` when `phase >= 3`.

`_enterHoverAfter(attackState)` applies `BOSS_CD[attackState] × cdScale / eff` as the hover cooldown.

### Wave System (`mod_workshop.js` + `main.js`)
Cassette timelines (`WORKSHOP.cassettes['sector1'].timeline`) are arrays of `{ type, duration }`. The cassette `script()` runs each frame, reads `state.currentWave`, and calls `WORKSHOP.patterns[wave.type](waveTimer, frame, diff, width)`. `spawn(type, x, opts)` is a thin wrapper over `window.spawnEnemyByType`.

### Enemy Variant System (`BaseEnemy.baseUpdate`)
On first update (`_initMods` flag), non-special enemies randomly become healer or battery variants. **`forceHeal` / `forceBattery`** options in `spawnEnemyByType` bypass this: `forceHeal` is passed to the constructor; `forceBattery` is applied post-construction and also immediately updates `sprite` and `particleColor`.

### Damage Vignette & Screen Effects
- `damageVignetteTimer` (60 frames) — set in `Player.takeDamage`; rendered as radial gradient + four edge linear gradients in `main.js` render loop
- `flashScreenTimer` — full-screen color flash
- `shakeQueue` — push via `triggerShake(intensity, duration)` from anywhere

### Checkpoint / Save System
Saved to `localStorage` as `pxROG_ckpt_<levelId>` on entering rest waves. `startGame(levelId, useCheckpoint)` restores or resets state. `player.pt` and `techTree` are only reset when `!useCheckpoint`.

### Skill Button UI (`drawPixelButton` / `updatePixelButtons`)
`drawPixelButton(id, icon, progress, color, isActive, cdProgress)`:
- `progress` = energy ratio (forced to `1` when `skillActiveTimer > 0`)
- `isActive` = true while skill fires → draws spark particles at top of bar
- `cdProgress` = `skillCdTimer / 900` → dark overlay + red bar from bottom

### Audio (`AudioSystem`)
Uses Web Audio API + `<audio>` element. `triggerDamageFilter()` applies low-pass muffle (`dmgMuffleFreq: 300 Hz`) for `dmgDuration: 600ms`, then fades back over `dmgFadeOut: 2.5s` time-constant.

## Entity Class Hierarchy

```
BaseEnemy
  ├── Locator
  ├── CrystalLocator      (this.speed = speedOverride || 0.8; this.isCrystal = true)
  ├── Wanderer
  ├── ArcFlyer
  ├── Kamikaze            (vType: 'normal' | 'swarm' | 'special')
  ├── Turret
  ├── Tank
  └── BossScrapDominator
```

## Common Pitfalls

- **sprite set in constructor** — if `forceBattery` is applied post-construction, sprite and `particleColor` must be updated manually (done in `spawnEnemyByType`).
- **`0 || fallback`** bug — `speedOverride || default` will ignore a speed of `0`. Always check `!== null` for speed guards when 0 is a valid value.
- **`_initMods` guard** — `BaseEnemy.baseUpdate()` runs variant init once on first frame. Setting `isBattery/isHealer` before first update prevents re-roll but doesn't auto-update sprite.
- **`hitStopFrames > 0`** — entity `update()` is skipped in `processGroup`; `draw()` still runs. Don't rely on update side-effects during hitstop.
- **`frameCount` vs wall time** — `frameCount` is suspended during hitstop. Use it for relative durations in `shakeQueue.endAt`, not absolute timing.
