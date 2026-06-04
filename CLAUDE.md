# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 语言规则

所有回复必须使用**简体中文**。思考过程可以使用英文。

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

**Sector 2 时间线**采用 5 幕结构：资源建设 → 机制引入 → 压力升级 → 精英测试 → 最终冲刺 → Boss。新增 4 个波次：
- `p_fragment_rain`（碎片雨）：三区域轮转 Locator
- `p_rainbow_cross`（虹桥交叉）：两侧 ArcFlyer + 中央 Kamikaze
- `p_phantom_assassin`（幻影刺客）：CrystalLocator 群掩护 KamikazeSpec
- `p_meat_grinder`（绞肉机）：高频 Locator + 定时 Tank

### Enemy Variant System (`BaseEnemy.baseUpdate`)
On first update (`_initMods` flag), non-special enemies randomly become healer or battery variants. **`forceHeal` / `forceBattery`** options in `spawnEnemyByType` bypass this: `forceHeal` is passed to the constructor; `forceBattery` is applied post-construction and also immediately updates `sprite` and `particleColor`.

### Damage Vignette & Screen Effects
- `damageVignetteTimer` (60 frames) — set in `Player.takeDamage`; rendered as radial gradient + four edge linear gradients in `main.js` render loop
- `flashScreenTimer` — full-screen color flash
- `shakeQueue` — push via `triggerShake(intensity, duration)` from anywhere

### Checkpoint / Save System
Saved to `localStorage` as `pxROG_ckpt_<levelId>` on entering rest waves. `startGame(levelId, useCheckpoint)` restores or resets state. `player.pt` and `techTree` are only reset when `!useCheckpoint`.

`waveTimer` 也随检查点保存/恢复（`main.js` `saveCheckpoint`/`restoreFromCheckpoint`），防止重入时计时器归零导致波次名称 Toast 重复弹出。

### Skill Button UI (`drawPixelButton` / `updatePixelButtons`)
`drawPixelButton(id, icon, progress, color, isActive, cdProgress)`:
- `progress` = energy ratio (forced to `1` when `skillActiveTimer > 0`)
- `isActive` = true while skill fires → draws spark particles at top of bar
- `cdProgress` = `skillCdTimer / 900` → dark overlay + red bar from bottom

`drawPixelButton` 内部对每个按钮画布应用 DPR 缩放，所有坐标仍以 CSS 像素为单位（见下方 HiDPI Canvas 渲染节）。

### Audio (`AudioSystem`)
Uses Web Audio API + `<audio>` element. `triggerDamageFilter()` applies low-pass muffle (`dmgMuffleFreq: 300 Hz`) for `dmgDuration: 600ms`, then fades back over `dmgFadeOut: 2.5s` time-constant.

### PNG 资源预加载系统 (`main.js` + `config.js`)

**`window.preloadedImages`** — 全局对象，存放已加载的 `HTMLImageElement`，必须用 `window.X` 声明（`const/let` 不挂 `window`，`config.js` 读不到）。

**`preloadGameImages()`**（`main.js` ~line 171）— fire-and-forget 异步预加载，在启动序列中 `initSprites()` 之前调用。`startGame()` 内部会再次调用 `initSprites()`，此时图片必定已加载完成。

**`_imgToCanvas(img, w, h)`**（`config.js` ~line 124）— 将 `HTMLImageElement` 缩放到指定画布尺寸，`imageSmoothingEnabled=false` 保持像素锐利；自动去除背景：从左上角像素采样背景色，对色差（欧几里得距离）< 60 的像素清零 alpha。此算法可处理任意颜色背景（白色/灰色均适用），阈值 60 足以覆盖缩放引入的轻微颜色漂移。

**DPR 缩放精灵**：在 `initSprites()` 内，PNG 精灵以物理像素创建：
```javascript
let _dpr = window.canvasDPR || window.devicePixelRatio || 1;
let s = _imgToCanvas(img, Math.round(cssW * _dpr), Math.round(cssH * _dpr));
s.cssW = cssW; s.cssH = cssH;  // 存储 CSS 逻辑尺寸
```
绘制时必须通过 `cssW/cssH` 指定显示尺寸（而非 `spr.width`），否则 DPR>1 时精灵会按物理像素尺寸绘制，导致显示偏大。

### HiDPI Canvas 渲染 (`main.js`)

**`window.canvasDPR`** — 在 `resize()` 中设置，值为 `window.devicePixelRatio || 1`。

**主画布缩放**（`resize()`，~line 2178）：
- `canvas.width = Math.round(width * dpr)` — 物理像素
- `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)` — 缩放上下文，游戏所有逻辑坐标不变（CSS 像素）
- 注意：`canvas.width` 赋值会重置 context 全部状态，`setTransform` 必须在其之后调用

**按钮画布缩放**（`drawPixelButton`，~line 792）：
- 像素按钮是独立的 48×48 `<canvas>` 元素，不受主画布 DPR 影响
- `drawPixelButton` 内部检测 `cvs.width !== BASE*dpr` 时重置尺寸并调用 `ctx.setTransform`
- 所有内部坐标（0..48 范围）无需改动，DPR 变换自动处理

**帧清除兼容**：`ctx.fillRect(0, 0, width, height)` 经 DPR 变换后等效于清除整个物理画布，无需更改。

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

## Game Balance Data

### DIFF_CONFIG（`config.js` ~line 9）

| 难度 | 名称 | hpMod | p_hp | p_dmg | maxEnemies | protectionTime |
|------|------|-------|------|-------|------------|----------------|
| 0 | 简单 | 0.8 | 100 | 12 | 20 | 45 |
| 1 | 普通 | 1.0 | 100 | 12 | 35 | 30 |
| 2 | 困难 | 1.5 | 100 | 12 | 50 | 20 |
| 3 | 深渊 | 1.5 | 100 | 8  | 70 | 15 |

### SHIPS（`config.js` ~line 19）

| shipId | 名称 | 僚机组 | 副武器组 | p_hp | 初始插槽 |
|--------|------|--------|----------|------|----------|
| rt1 | 拯救者 | [1,1,1] | [2,2] | —（读 DIFF_CONFIG） | 5 |
| rtg2 | RTG-II | [2] | [1] | 120（独立配置） | 4 |

`Player` 构造器中 `maxHp = shipCfg.p_hp || diffData.p_hp`（`entities.js` ~line 28）。

### AS-1 自爆僚机数值（`main.js` ~line 1790，按 wingLevel 索引）

| wingLevel | swoopCD（帧） | directDmg | splashDmg |
|-----------|-------------|-----------|-----------|
| 0 | 180 | 80 | 20 |
| 1 | 165 | 100 | 28 |
| 2 | 150 | 125 | 39 |
| 3 | 135 | 155 | 54 |

### AvengerMissile 导航参数（`entities.js` ~line 1882）

```javascript
let angSpeed = Math.min(0.15, 0.025 + this.timer * 0.00035);
```
基础转向 0.025 rad/frame，随飞行时间渐进加强，上限 0.15；噪音 ±0.01。

## Common Pitfalls

- **sprite set in constructor** — if `forceBattery` is applied post-construction, sprite and `particleColor` must be updated manually (done in `spawnEnemyByType`).
- **`0 || fallback`** bug — `speedOverride || default` will ignore a speed of `0`. Always check `!== null` for speed guards when 0 is a valid value.
- **`_initMods` guard** — `BaseEnemy.baseUpdate()` runs variant init once on first frame. Setting `isBattery/isHealer` before first update prevents re-roll but doesn't auto-update sprite.
- **`hitStopFrames > 0`** — entity `update()` is skipped in `processGroup`; `draw()` still runs. Don't rely on update side-effects during hitstop.
- **`frameCount` vs wall time** — `frameCount` is suspended during hitstop. Use it for relative durations in `shakeQueue.endAt`, not absolute timing.
- **`const` vs `window` 全局变量** — 非模块脚本中 `const/let` 在全局作用域不挂载到 `window`。跨文件共享的全局对象必须用 `window.X = ...` 声明（例：`window.preloadedImages`，`window.canvasDPR`）。
- **DPR 变换与 canvas 重置** — `canvas.width =` 赋值会重置 context 全部状态，包括 transform。`ctx.setTransform(dpr,…)` 必须在 `canvas.width` 赋值之后调用，否则变换丢失。
- **PNG 精灵 cssW/cssH** — PNG 精灵画布以 `cssW * DPR` 物理像素创建，`spr.width` 等于物理像素数。`drawImage` 时必须显式传入 CSS 像素尺寸（`spr.cssW`, `spr.cssH`），不能用 `spr.width/2` 计算偏移，否则 DPR>1 时绘制尺寸偏大。
- **isRFA 检查** — 机枪（RFA）子弹命中时不应触发 AOE 和余烬效果；在 `main.js` 碰撞处理中用 `!b.isRFA` 守卫相关代码块。
