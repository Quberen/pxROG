// === mod_workshop.js ===
// 极客创意工坊：波次引擎的终极形态

window.WORKSHOP = {
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

    // 【核心黑科技】：波次导演的终极七印 + Boss
    patterns: {
        p0_rest: function(sec, frame, diff, w) { /* 喝茶中 */ },
        p1_intro: function(sec, frame, diff, w) {
            let interval = Math.max(30, 150 - sec * 4);
            if (frame % interval === 0) spawn('Locator', Math.random()*(w-60)+30, {speedOverride: 1.2});
        },
        p2_cover: function(sec, frame, diff, w) {
            let tType = diff >= 2 ? 'TurretSwarm' : 'Turret';
            if (sec === 1 && frame % 60 === 0) { spawn(tType, w*0.2); spawn(tType, w*0.8); if(diff === 3) spawn(tType, w*0.5); }
            if (frame % 80 === 0) spawn(diff >= 2 ? 'LocatorSwarm' : 'Locator', Math.random()*(w-60)+30, {speedOverride: 1.5});
        },
        // 铁桶阵 (强制均匀下落，外两列->内两列->普通缓冲列->中心直射炮)
        p3_gather: function(sec, frame, diff, w) {
            let colW = w / 7; let c = [colW*0.5, colW*1.5, colW*2.5, colW*3.5, colW*4.5, colW*5.5, colW*6.5];
            let eType = diff >= 2 ? 'LocatorSwarm' : 'Locator';
            if (sec < 25 && frame % 40 === 0) { spawn(eType, c[0], {speedOverride: 1.5}); spawn(eType, c[6], {speedOverride: 1.5}); }
            if (sec >= 5 && sec < 25 && frame % 40 === 0) { spawn(eType, c[1], {speedOverride: 1.5}); spawn(eType, c[5], {speedOverride: 1.5}); }
            if (sec >= 10 && sec < 25 && frame % 40 === 0) { spawn('Locator', c[2], {speedOverride: 1.5}); spawn('Locator', c[4], {speedOverride: 1.5}); }
            if (sec >= 15 && sec <= 20 && frame % 60 === 0) { spawn(diff >= 2 ? 'TurretSwarm' : 'Turret', c[3], {speedOverride: 1.0, isDumbFire: true}); }
        },
        // 集群掩护 (两侧极速弹幕墙，中间穿插缝隙堡垒阵)
        p4_swarm_cover: function(sec, frame, diff, w) {
            if (sec === 1 && frame % 60 === 0) {
                let tType = diff >= 2 ? 'TurretSwarm' : 'Turret';
                spawn(tType, 50, { isDumbFire: true, fireInterval: 25 });
                spawn(tType, w - 50, { isDumbFire: true, fireInterval: 25 });
            }
            if (sec >= 3 && frame % 90 === 0) {
                spawn('Tank', w/2 - 60, {speedOverride: 0.8}); spawn('Tank', w/2, {speedOverride: 0.8}); spawn('Tank', w/2 + 60, {speedOverride: 0.8});
            }
        },
        // 补给大方阵 (极高概率爆出能量/血包)
        p5_supply: function(sec, frame, diff, w) {
            if (sec === 1 && frame % 60 === 0) {
                let sW = w / 6;
                for(let r=0; r<4; r++) {
                    for(let c=1; c<=5; c++) {
                        let rand = Math.random(); let opt = { speedOverride: 1.2, y: -40 - r*40 };
                        if (rand < 0.25) opt.forceHeal = true; else if (rand < 0.6) opt.forceBattery = true;
                        spawn('Locator', sW * c, opt);
                    }
                }
            }
        },
        p6_press: function(sec, frame, diff, w) {
            if (diff < 3) return; 
            if (frame % 20 === 0) spawn(Math.random() > 0.5 ? 'LocatorSwarm' : 'Locator', Math.random()*(w-40)+20, {speedOverride: 2.0});
        },
        // 协同结阵 (完美的圆环包裹阵)
        p7_synergy: function(sec, frame, diff, w) {
            if (sec % 8 === 0 && frame % 60 === 0 && sec < 20) {
                let cx = Math.random() * (w - 100) + 50;
                spawn('Locator', cx, {speedOverride: 1.2}); 
                let elite = enemies[enemies.length-1]; if(elite) elite.makeElite(); 
                for(let i=0; i<6; i++) {
                    let angle = (Math.PI*2/6) * i;
                    spawn('Locator', cx + Math.cos(angle)*55, { speedOverride: 1.2, y: -40 + Math.sin(angle)*55 });
                }
            }
        },
        // Boss 直降模式
        p8_boss: function(sec, frame, diff, w) {
            if (sec === 1 && frame % 60 === 0 && !isBossSpawned) {
                isBossSpawned = true; enemies.push(new BossScrapDominator(w/2, -50)); enemies = enemies.filter(e => e.isSpecial || e.isBoss); updateHUD();
            }
        }
    },

    cassettes: {
        'sector1': {
            name: "区域 1: 废星边缘", duration: 999, // 由时间轴接管控制，不再硬编码
            allowed_enemies: ['Locator', 'LocatorSwarm', 'Turret', 'TurretSwarm', 'ArcFlyer', 'Tank'], allowed_formations: ['V_Strike', 'Turret_Wall'],
            disable_director: true, state: { currentWave: 0, waveTimer: 0 },
            // 波次剪辑时间轴 (大幅延长持续时间与间隔)
            timeline: [
                { type: "p1_intro", duration: 25 },
                { type: "p0_rest", duration: 10 },
                { type: "p5_supply", duration: 15 },
                { type: "p0_rest", duration: 10 },
                { type: "p2_cover", duration: 35 },
                { type: "p0_rest", duration: 10 },
                { type: "p3_gather", duration: 30 },
                { type: "p0_rest", duration: 12 },
                { type: "p4_swarm_cover", duration: 35 },
                { type: "p0_rest", duration: 12 },
                { type: "p7_synergy", duration: 25 },
                { type: "p0_rest", duration: 12 },
                { type: "p6_press", duration: 30 },
                { type: "p0_rest", duration: 10 },
                { type: "p8_boss", duration: 9999 } // Boss战不死不休
            ],
            script: function(sec, frame) {
                let w = window.innerWidth; let st = this.state; let wave = this.timeline[st.currentWave];
                if (!wave) return;
                if (WORKSHOP.patterns[wave.type]) WORKSHOP.patterns[wave.type](st.waveTimer, frame, currentDifficulty, w);
                if (frame % 60 === 0) { st.waveTimer++; if (st.waveTimer >= wave.duration) { st.currentWave++; st.waveTimer = 0; } }
            }
        },
        'debug': { 
            name: "代号: 调试", duration: 9999, allowed_enemies: 'ALL', allowed_formations: 'ALL', disable_director: false, script: function(sec, frame) {} 
        }
    }
};

function spawn(type, x, opt) { window.spawnEnemyByType(type, x, opt); }
