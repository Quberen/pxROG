// === mod_workshop.js ===
// 极客创意工坊：数据驱动与波次引擎

window.WORKSHOP = {
    // 【纯净数据区】
    data: {
        physics: { hp_bounce_force: 0.6, hp_damping: 0.65, skill_vibrate_force: 20, dmg_text_player_speed_x: 3, dmg_text_player_speed_y: -4, dmg_text_player_gravity: 0.25 },
        economy: { inflation_growth: 5.0, inflation_min_buy: 10.0, cooling_rate: 0.4, refresh_inflation: 5.0 },
        enemies: {
            "Locator":       { hp: 12,  weight: 1,  unlockTime: 0,   role: 'fodder' }, "WandererLow":   { hp: 18,  weight: 3,  unlockTime: 5,   role: 'fodder' },
            "Kamikaze":      { hp: 18,  weight: 4,  unlockTime: 20,  role: 'special' }, "LocatorSwarm":  { hp: 18,  weight: 6,  unlockTime: 20,  role: 'swarm' },
            "WandererHigh":  { hp: 24,  weight: 15, unlockTime: 15,  role: 'elite' }, "Turret":        { hp: 48,  weight: 10, unlockTime: 45,  role: 'elite' },
            "ArcFlyer":      { hp: 72,  weight: 12, unlockTime: 30,  role: 'special' }, "WandererSwarm": { hp: 30,  weight: 15, unlockTime: 25,  role: 'swarm' },
            "KamikazeSwarm": { hp: 12,  weight: 16, unlockTime: 40,  role: 'swarm' }, "ArcFlyerSwarm": { hp: 144, weight: 20, unlockTime: 50,  role: 'swarm' },
            "TurretSwarm":   { hp: 72,  weight: 22, unlockTime: 70,  role: 'swarm' }, "KamikazeSpec":  { hp: 180, weight: 30, unlockTime: 60,  role: 'elite' },
            "Tank":          { hp: 120, weight: 30, unlockTime: 85,  role: 'tank' }, "TankSwarm":     { hp: 180, weight: 40, unlockTime: 100, role: 'tank' },
            "Formation_V_Strike":    { weight: 12, unlockTime: 20, role: 'formation' }, "Formation_Turret_Wall": { weight: 25, unlockTime: 50, role: 'formation' }, "Formation_Ambush": { weight: 28, unlockTime: 65, role: 'formation' }
        },
        items: {
            "damage": { cost: 1.4, max: 20 }, "heal": { cost: 0.5, max: 999 }, "heal_up": { cost: 1.0, max: 10 }, "magnet": { cost: 1.0, max: 5 }, "crit_rate": { cost: 1.2, max: 10 }, "crit_dmg": { cost: 1.5, max: 10 }, "healer_rate": { cost: 1.4, max: 5 }, "aoe": { cost: 2.2, max: 3 }, "wingman": { cost: 3.5, max: 4 }, "slot": { cost: 1.8, max: 5 },
            "hp_max": { initialCost: 1.8, cost: 1.5, costStep: 0.5, max: 3 }, "speed": { initialCost: 2.0, cost: 1.2, costStep: 0.4, max: 4 }, "spread": { initialCost: 3.0, cost: 1.5, costStep: 0.5, max: 4 }, "homing": { initialCost: 3.5, cost: 2.0, costStep: 0.5, max: 3 }, "pulse": { initialCost: 2.5, cost: 1.5, costStep: 0.5, max: 3 }, "laser": { initialCost: 6.0, cost: 3.0, costStep: 1.0, max: 4 }, "pierce": { initialCost: 2.5, cost: 1.5, costStep: 1.0, max: 3 }
        }
    },

    formations: {
        "V_Strike": [ { type: 'Locator', x: 0, y: 0, speed: 2.0 }, { type: 'Locator', x: -35, y: -35, speed: 2.0 }, { type: 'Locator', x: 35, y: -35, speed: 2.0, forceHeal: true }, { type: 'Locator', x: -70, y: -70, speed: 2.0 }, { type: 'Locator', x: 70, y: -70, speed: 2.0 } ],
        "Turret_Wall": [ { type: 'Turret', x: -60, y: 0 }, { type: 'Turret', x: 60, y: 0, forceHeal: true }, { type: 'Turret', x: 0, y: -50 } ],
        "Ambush": [ { type: 'WandererHigh', x: 0, y: 0, side: 'left' }, { type: 'WandererHigh', x: 0, y: 0, side: 'right' } ]
    },

    // 【全新架构：独立的波次名称注册表 (Data-Driven Notifications)】
    waveNames: {
        "p0_rest": { name: "休整缓冲期", color: "#00e676" },
        "p1_intro": { name: "波次 1: 前奏试探", color: "#00e5ff" },
        "p2_cover": { name: "波次 2: 炮台掩护", color: "#00e5ff" },
        "p3_gather": { name: "波次 3: 压迫铁桶阵", color: "#00e5ff" },
        "p4_swarm_cover": { name: "波次 4: 弹幕走廊", color: "#00e5ff" },
        "p5_supply": { name: "波次 5: 补给方阵", color: "#00e676" },
        "p6_press": { name: "波次 6: 绝境暴兵", color: "#ff9800" },
        "p7_synergy": { name: "波次 7: 协同结阵", color: "#ff9800" },
        "p8_boss": { name: "警告: 废铁主宰者", color: "#ff1744" }
        // 未来如果有 p9_new_wave，只要在这里加一行即可！
    },

    // 【核心黑科技】：波次导演的终极七印 + Boss
    patterns: {
        p0_rest: function(sec, frame, diff, w) { /* 喝茶中 */ },
        p1_intro: function(sec, frame, diff, w) {
            let interval = Math.max(30, 150 - sec * 4);
            if (frame % interval === 0) spawn('Locator', Math.random() * (w - 60) + 30, { speedOverride: 1.2 });
        },
        p2_cover: function(sec, frame, diff, w) {
            let tType = diff >= 2 ? 'TurretSwarm' : 'Turret';
            if (sec === 1 && frame % 60 === 0) { spawn(tType, w * 0.2); spawn(tType, w * 0.8); if (diff === 3) spawn(tType, w * 0.5); }
            if (frame % 80 === 0) spawn(diff >= 2 ? 'LocatorSwarm' : 'Locator', Math.random() * (w - 60) + 30, { speedOverride: 1.5 });
        },
        p3_gather: function(sec, frame, diff, w) {
            let colW = w / 7; let c = [colW * 0.5, colW * 1.5, colW * 2.5, colW * 3.5, colW * 4.5, colW * 5.5, colW * 6.5];
            let eType = diff >= 2 ? 'LocatorSwarm' : 'Locator';
            if (sec < 25 && frame % 40 === 0) { spawn(eType, c[0], { speedOverride: 1.5 }); spawn(eType, c[6], { speedOverride: 1.5 }); }
            if (sec >= 5 && sec < 25 && frame % 40 === 0) { spawn(eType, c[1], { speedOverride: 1.5 }); spawn(eType, c[5], { speedOverride: 1.5 }); }
            if (sec >= 10 && sec < 25 && frame % 40 === 0) { spawn('Locator', c[2], { speedOverride: 1.5 }); spawn('Locator', c[4], { speedOverride: 1.5 }); }
            if (sec >= 15 && sec <= 20 && frame % 60 === 0) { spawn(diff >= 2 ? 'TurretSwarm' : 'Turret', c[3], { speedOverride: 1.0, isDumbFire: true }); }
        },
        p4_swarm_cover: function(sec, frame, diff, w) {
            if (sec === 1 && frame % 60 === 0) {
                let tType = diff >= 2 ? 'TurretSwarm' : 'Turret';
                spawn(tType, 50, { isDumbFire: true, fireInterval: 25 });
                spawn(tType, w - 50, { isDumbFire: true, fireInterval: 25 });
            }
            if (sec >= 3 && frame % 90 === 0) {
                spawn('Tank', w / 2 - 60, { speedOverride: 0.8 }); spawn('Tank', w / 2, { speedOverride: 0.8 }); spawn('Tank', w / 2 + 60, { speedOverride: 0.8 });
            }
        },
        p5_supply: function(sec, frame, diff, w) {
            if (sec === 1 && frame % 60 === 0) {
                let sW = w / 6;
                for (let r = 0; r < 4; r++) {
                    for (let c = 1; c <= 5; c++) {
                        let rand = Math.random(); let opt = { speedOverride: 1.2, y: -40 - r * 40 };
                        if (rand < 0.25) opt.forceHeal = true; else if (rand < 0.6) opt.forceBattery = true;
                        spawn('Locator', sW * c, opt);
                    }
                }
            }
        },
        p6_press: function(sec, frame, diff, w) {
            if (diff < 3) return;
            if (frame % 20 === 0) spawn(Math.random() > 0.5 ? 'LocatorSwarm' : 'Locator', Math.random() * (w - 40) + 20, { speedOverride: 2.0 });
        },
        p7_synergy: function(sec, frame, diff, w) {
            if (sec % 8 === 0 && frame % 60 === 0 && sec < 20) {
                let cx = Math.random() * (w - 100) + 50;
                spawn('Locator', cx, { speedOverride: 1.2 });
                let elite = enemies[enemies.length - 1]; if (elite) elite.makeElite();
                for (let i = 0; i < 6; i++) {
                    let angle = (Math.PI * 2 / 6) * i;
                    spawn('Locator', cx + Math.cos(angle) * 55, { speedOverride: 1.2, y: -40 + Math.sin(angle) * 55 });
                }
            }
        },
        p8_boss: function(sec, frame, diff, w) {
            if (sec === 1 && frame % 60 === 0 && !isBossSpawned) {
                isBossSpawned = true;
                enemies.push(new BossScrapDominator(w / 2, -50));
                enemies = enemies.filter(e => e.isSpecial || e.isBoss);
                if (typeof EventBus !== 'undefined') EventBus.emit('UI_UPDATE_REQUESTED', {});
            }
        }
    },

    cassettes: {
        'sector1': {
            name: "区域 1: 废星边缘",
            allowed_enemies: ['Locator', 'LocatorSwarm', 'Turret', 'TurretSwarm', 'ArcFlyer', 'Tank'],
            allowed_formations: ['V_Strike', 'Turret_Wall'],
            disable_director: true,
            state: { currentWave: 0, waveTimer: 0 },
            
            timeline: [
                { type: "p1_intro", duration: 25 },
                {
                    type: "p0_rest",
                    exitConditions: { logic: "OR", rules: [ { type: "time_limit", value: 10 }, { type: "clear_all", value: true } ] }
                },
                { type: "p5_supply", duration: 15 }, { type: "p0_rest", duration: 10 },
                { type: "p2_cover", duration: 35 }, { type: "p0_rest", duration: 10 },
                { type: "p3_gather", duration: 30 }, { type: "p0_rest", duration: 12 },
                { type: "p4_swarm_cover", duration: 35 }, { type: "p0_rest", duration: 12 },
                { type: "p7_synergy", duration: 25 }, { type: "p0_rest", duration: 12 },
                { type: "p6_press", duration: 30 }, { type: "p0_rest", duration: 10 },
                { type: "p8_boss", duration: 9999 } 
            ],
            
            script: function(sec, frame) {
                let w = window.innerWidth;
                let st = this.state;
                let wave = this.timeline[st.currentWave];
                if (!wave) return; 
                
                if (WORKSHOP.patterns[wave.type]) WORKSHOP.patterns[wave.type](st.waveTimer, frame, currentDifficulty, w);
                
                if (frame % 60 === 0) {
                    
                    // 【核心重构：彻底抛弃飘字，直接派发 WAVE_STARTED 专属事件】
                    if (st.waveTimer === 0) {
                        let waveMeta = WORKSHOP.waveNames[wave.type] || { name: `未知波次: ${wave.type}`, color: "#ffffff" };
                        if (typeof EventBus !== 'undefined') {
                            EventBus.emit('WAVE_STARTED', waveMeta);
                        }
                    }

                    st.waveTimer++;
                    let shouldExit = false;
                    
                    if (wave.exitConditions) {
                        let rules = wave.exitConditions.rules || [];
                        let logic = wave.exitConditions.logic || "OR";
                        let ruleResults = rules.map(rule => {
                            if (rule.type === "time_limit") return st.waveTimer >= rule.value;
                            if (rule.type === "clear_all") return enemies.length === 0 && st.waveTimer > 2;
                            if (rule.type === "player_hp_below") return (player.hp / player.maxHp) < rule.value;
                            return false;
                        });
                        if (logic === "AND") shouldExit = ruleResults.length > 0 && ruleResults.every(r => r === true);
                        else shouldExit = ruleResults.some(r => r === true);
                    } else {
                        if (st.waveTimer >= (wave.duration || 999)) shouldExit = true;
                    }
                    
                    if (shouldExit) {
                        st.currentWave++;
                        st.waveTimer = 0;
                    }
                }
            }
        },
        'debug': { name: "代号: 调试", duration: 9999, allowed_enemies: 'ALL', allowed_formations: 'ALL', disable_director: false, script: function(sec, frame) {} }
    }
};

function spawn(type, x, opt) { window.spawnEnemyByType(type, x, opt); }
