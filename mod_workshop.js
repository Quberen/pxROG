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
            "damage": { cost: 1.4, max: 20 }, "heal": { cost: 0.5, max: 999 }, "heal_up": { cost: 1.0, max: 5 }, "magnet": { cost: 1.0, max: 5 }, "crit_rate": { cost: 1.2, max: 10 }, "crit_dmg": { cost: 1.5, max: 10 }, "healer_rate": { cost: 1.4, max: 5 }, "aoe": { cost: 2.2, max: 3 }, "wingman": { cost: 3.5, max: 4 }, "slot": { cost: 1.8, max: 5 },
            "hp_max": { initialCost: 1.8, cost: 1.5, costStep: 0.5, max: 3 }, "speed": { initialCost: 2.0, cost: 1.2, costStep: 0.4, max: 4 },
            "spread":  { initialCost: 4.0, cost: 4.0, costStep: 0.5, max: 4 },
            "homing":  { initialCost: 2.5, cost: 1.6, costStep: 0.4, max: 3 },
            "pulse":   { initialCost: 2.5, cost: 1.5, costStep: 0.5, max: 3 },
            "laser":   { initialCost: 5.0, cost: 2.5, costStep: 1.0, max: 4 },
            "pierce":  { initialCost: 2.5, cost: 1.2, costStep: 0.8, max: 3 },
            "rapid_charge": { cost: 1.5, max: 3 }, "phase_dodge": { cost: 2.5, max: 3 },
            "afterburn": { cost: 3.0, max: 2 }, "shield_gen": { cost: 1.8, max: 4 }, "skill_cd": { cost: 2.0, max: 3 }
        }
    },

    formations: {
        "V_Strike": [ { type: 'Locator', x: 0, y: 0, speed: 2.0 }, { type: 'Locator', x: -35, y: -35, speed: 2.0 }, { type: 'Locator', x: 35, y: -35, speed: 2.0, forceHeal: true }, { type: 'Locator', x: -70, y: -70, speed: 2.0 }, { type: 'Locator', x: 70, y: -70, speed: 2.0 } ],
        "Turret_Wall": [ { type: 'Turret', x: -60, y: 0 }, { type: 'Turret', x: 60, y: 0, forceHeal: true }, { type: 'Turret', x: 0, y: -50 } ],
        "Ambush": [ { type: 'WandererHigh', x: 0, y: 0, side: 'left' }, { type: 'WandererHigh', x: 0, y: 0, side: 'right' } ]
    },

    // 【全新架构：独立的波次名称注册表 (Data-Driven Notifications)】
    waveNames: {
        "p0_rest":      { name: "休整缓冲期",          color: "#00e676" },
        "p1_intro":     { name: "波次 1: 前奏试探",    color: "#00e5ff" },
        "p2_cover":     { name: "波次 2: 炮台掩护",    color: "#00e5ff" },
        "p3_gather":    { name: "波次 3: 压迫铁桶阵",  color: "#00e5ff" },
        "p4_swarm_cover": { name: "波次 4: 弹幕走廊",  color: "#00e5ff" },
        "p5_supply":    { name: "补给方阵 — 掠夺资源", color: "#00e676" },
        "p6_press":     { name: "波次 6: 绝境暴兵",    color: "#ff9800" },
        "p7_synergy":   { name: "波次 7: 协同结阵",    color: "#ff9800" },
        "p8_boss":      { name: "警告: 废铁主宰者",    color: "#ff1744" },
        "p9_flanker":   { name: "波次 9: 双翼夹击",    color: "#ff9800" },
        "p10_aerial":   { name: "波次 10: 空中打击",   color: "#ab47bc" },
        "p11_corridor": { name: "波次 11: 移动走廊",   color: "#00e5ff" },
        "p12_crossfire":{ name: "波次 12: 交叉弹幕",   color: "#ff9800" },
        "p13_blitz":    { name: "波次 13: 闪电压制",   color: "#ff1744" }
    },

    // 【核心黑科技】：波次导演的终极七印 + Boss
    patterns: {
        p0_rest: function(sec, frame, diff, w) { /* 喝茶中 */ },
        p1_intro: function(sec, frame, diff, w) {
            let interval = Math.max(30, 150 - sec * 4);
            if (frame % interval === 0) spawn('Locator', Math.random() * (w - 60) + 30, { speedOverride: 1.2 });
            // 10秒后混入 WandererLow，让玩家接触变速敌人
            if (sec >= 10 && frame % 120 === 0) spawn('WandererLow', Math.random() * (w - 80) + 40, { speedOverride: 1.0 });
        },
        p2_cover: function(sec, frame, diff, w) {
            let tType = diff >= 2 ? 'TurretSwarm' : 'Turret';
            if (sec === 1 && frame % 60 === 0) { spawn(tType, w * 0.2); spawn(tType, w * 0.8); if (diff === 3) spawn(tType, w * 0.5); }
            if (frame % 80 === 0) spawn(diff >= 2 ? 'LocatorSwarm' : 'Locator', Math.random() * (w - 60) + 30, { speedOverride: 1.5 });
            // 15秒后加入 ArcFlyer 协同炮台压制
            if (sec >= 15 && frame % 200 === 0) spawn('ArcFlyer', Math.random() * (w - 120) + 60, { speedOverride: 1.1 });
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
                    for (let c = 1; c <= 3; c++) {
                        let rand = Math.random(); let opt = { speedOverride: 1.2, y: -40 - r * 40 };
                        if (rand < 0.25) opt.forceHeal = true; else if (rand < 0.6) opt.forceBattery = true;
                        spawn('Locator', sW * c, opt);
                    }
                    // 后两列改为 WandererLow，提供更多PT收益
                    spawn('WandererLow', sW * 4, { speedOverride: 0.8, forceHeal: true, y: -40 - r * 40 });
                    spawn('WandererLow', sW * 5, { speedOverride: 0.8, y: -40 - r * 40 });
                }
            }
        },
        p6_press: function(sec, frame, diff, w) {
            // 全难度生效，按难度档次调整强度
            let interval = diff >= 3 ? 20 : (diff >= 2 ? 35 : 55);
            let eType = diff >= 2 ? 'LocatorSwarm' : 'Locator';
            let spd = diff >= 3 ? 2.0 : (diff >= 2 ? 1.6 : 1.3);
            if (frame % interval === 0) spawn(Math.random() > 0.5 ? eType : 'Locator', Math.random() * (w - 40) + 20, { speedOverride: spd });
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
        },

        // 双翼夹击：Kamikaze 从左右两侧同时突袭，配合 Wanderer 推进
        p9_flanker: function(sec, frame, diff, w) {
            if (frame % 90 === 0) {
                spawn('Kamikaze', w * 0.08, { speedOverride: 1.8 });
                spawn('Kamikaze', w * 0.92, { speedOverride: 1.8 });
            }
            if (sec >= 5 && frame % 110 === 0) {
                let wType = diff >= 2 ? 'WandererSwarm' : 'WandererHigh';
                spawn(wType, w * 0.15, { speedOverride: 1.2 });
                spawn(wType, w * 0.85, { speedOverride: 1.2 });
            }
            if (sec >= 12 && frame % 150 === 0) {
                spawn(diff >= 3 ? 'KamikazeSwarm' : 'Kamikaze', w * 0.5, { speedOverride: 2.0 });
            }
        },

        // 空中打击：ArcFlyer 纵队轰炸，考验玩家横向走位
        p10_aerial: function(sec, frame, diff, w) {
            if (sec === 1 && frame % 60 === 0) {
                let cnt = diff >= 2 ? 4 : 3;
                for (let i = 0; i < cnt; i++) {
                    spawn('ArcFlyer', w * 0.15 + i * (w * 0.7 / (cnt - 1)), { speedOverride: 1.2, y: -30 - i * 20 });
                }
            }
            if (sec >= 6 && frame % 180 === 0) {
                spawn(diff >= 3 ? 'ArcFlyerSwarm' : 'ArcFlyer', Math.random() * (w - 100) + 50, { speedOverride: 1.3 });
            }
            // 陆空协同：地面辅助兵
            if (sec >= 10 && frame % 100 === 0) {
                spawn('Locator', Math.random() * (w - 80) + 40, { speedOverride: 1.4 });
            }
        },

        // 移动走廊：Turret 横排留缺口，考验位置预判
        p11_corridor: function(sec, frame, diff, w) {
            if (frame % 240 === 0) {
                let gap = Math.floor(Math.random() * 5);
                for (let col = 0; col < 5; col++) {
                    if (col === gap) continue;
                    spawn('Turret', w * (col + 0.5) / 5, { isDumbFire: true, fireInterval: 40, speedOverride: 0.6 });
                }
            }
            if (sec >= 12 && frame % 90 === 0) {
                spawn(diff >= 2 ? 'WandererHigh' : 'WandererLow', Math.random() > 0.5 ? w * 0.05 : w * 0.95, { speedOverride: 1.5 });
            }
        },

        // 交叉弹幕：左右炮台射线交叉，子弹地狱入门
        p12_crossfire: function(sec, frame, diff, w) {
            if (sec === 1 && frame % 60 === 0) {
                let n = diff >= 2 ? 3 : 2;
                for (let i = 0; i < n; i++) {
                    spawn('Turret', w * 0.08, { speedOverride: 0.4, y: -40 - i * 60, fireInterval: 50 + i * 10 });
                    spawn('Turret', w * 0.92, { speedOverride: 0.4, y: -40 - i * 60, fireInterval: 55 + i * 10 });
                }
                if (diff >= 3) spawn('TurretSwarm', w * 0.5, { speedOverride: 0.3, fireInterval: 35 });
            }
            if (sec >= 5 && frame % 70 === 0) {
                spawn('Locator', Math.random() * (w - 80) + 40, { speedOverride: 1.6 });
            }
        },

        // 闪电压制：8秒节奏循环——冲锋→续压→恢复，考验技能时机
        p13_blitz: function(sec, frame, diff, w) {
            let cycle = sec % 8;
            if (cycle === 0 && frame % 60 === 0) {
                let cnt = diff >= 2 ? 5 : 3;
                for (let i = 0; i < cnt; i++) {
                    spawn('Kamikaze', w * (i + 0.5) / cnt, { speedOverride: 2.0 + diff * 0.3 });
                }
            }
            if (cycle >= 2 && cycle <= 5 && frame % 100 === 0) {
                spawn('WandererHigh', Math.random() * (w - 80) + 40, { speedOverride: 1.4 });
            }
            if (diff >= 2 && cycle >= 6 && frame % 120 === 0) {
                spawn('KamikazeSwarm', Math.random() * (w - 80) + 40, { speedOverride: 1.8 });
            }
        }
    },

    cassettes: {
        
        
        'sector1': {

            name: "区域 1: 废星边缘",
            shopItems: ['high_explosive', 'spread', 'skill_duration', 'burst_core',
                        'rapid_charge', 'phase_dodge', 'afterburn', 'shield_gen', 'skill_cd',
                        'pierce', 'homing', 'crit_rate', 'heal_up', 'slot'],
            allowed_enemies: ['Locator', 'LocatorSwarm', 'WandererLow', 'WandererHigh', 'WandererSwarm',
                              'Kamikaze', 'KamikazeSwarm', 'Turret', 'TurretSwarm', 'ArcFlyer', 'Tank'],
            allowed_formations: ['V_Strike', 'Turret_Wall', 'Ambush'],
            disable_director: true,
            state: { currentWave: 0, waveTimer: 0 },

            timeline: [
                { type: "p1_intro",      duration: 20 },
                { type: "p0_rest",       exitConditions: { logic: "OR", rules: [{ type: "time_limit", value: 8  }, { type: "clear_all", value: true }] } },
                { type: "p5_supply",     duration: 12 },
                { type: "p0_rest",       duration: 8 },
                { type: "p2_cover",      duration: 28 },
                { type: "p0_rest",       exitConditions: { logic: "OR", rules: [{ type: "time_limit", value: 12 }, { type: "clear_all", value: true }] } },
                { type: "p9_flanker",    duration: 22 },
                { type: "p0_rest",       duration: 10 },
                { type: "p11_corridor",  duration: 22 },
                { type: "p0_rest",       exitConditions: { logic: "OR", rules: [{ type: "time_limit", value: 12 }, { type: "clear_all", value: true }] } },
                { type: "p3_gather",     duration: 25 },
                { type: "p0_rest",       duration: 10 },
                { type: "p12_crossfire", duration: 20 },
                { type: "p0_rest",       exitConditions: { logic: "OR", rules: [{ type: "time_limit", value: 12 }, { type: "clear_all", value: true }] } },
                { type: "p4_swarm_cover",duration: 28 },
                { type: "p0_rest",       duration: 10 },
                { type: "p13_blitz",     duration: 22 },
                { type: "p0_rest",       exitConditions: { logic: "OR", rules: [{ type: "time_limit", value: 10 }, { type: "clear_all", value: true }] } },
                { type: "p6_press",      duration: 25 },
                { type: "p0_rest",       exitConditions: { logic: "OR", rules: [{ type: "time_limit", value: 10 }, { type: "clear_all", value: true }] } },
                { type: "p8_boss",       duration: 9999 }
            ],

            script: function(sec, frame) {
                let w = window.innerWidth;
                let st = this.state;
                let wave = this.timeline[st.currentWave];
                if (!wave) return;

                if (WORKSHOP.patterns[wave.type]) WORKSHOP.patterns[wave.type](st.waveTimer, frame, currentDifficulty, w);

                if (frame % 60 === 0) {
                    if (st.waveTimer === 0) {
                        let waveMeta = WORKSHOP.waveNames[wave.type] || { name: `未知波次: ${wave.type}`, color: "#ffffff" };
                        if (typeof EventBus !== 'undefined') EventBus.emit('WAVE_STARTED', waveMeta);
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
                        // shield_gen 效果：进入休整波次时回复血量
                        let nextWave = this.timeline[st.currentWave + 1];
                        if (nextWave && nextWave.type === 'p0_rest' && player && player.upgrades && player.upgrades.shield_gen > 0) {
                            let healAmt = player.getStat('maxHp') * 0.08 * player.upgrades.shield_gen;
                            player.hp = Math.min(player.getStat('maxHp'), player.hp + healAmt);
                            if (typeof showSystemMessage === 'function') showSystemMessage(`屏障再生 +${Math.round(healAmt)}`, '#00e676');
                        }
                        st.currentWave++;
                        st.waveTimer = 0;
                    }
                }
            }
        },
        'debug': { name: "代号: 调试", duration: 9999, allowed_enemies: 'ALL', allowed_formations: 'ALL', disable_director: false, script: function(sec, frame) {} },
                 'neon_crash': {
            name: "霓虹幻灭 - 碰撞交响曲",
            bpm: 120, // 假设值，可根据你的原曲微调
            shopItems: ['damage', 'spread', 'skill_duration', 'speed'], 
            
            // 【引擎机制劫持】
            overrides: {
                disableCollisionDamage: true,   // 撞击免伤
                rammingTriggersAOE: true,       // 撞击引发音波清屏 (需你在 takeDamage 中实装)
                stats: { damage: 0.1 }          // 强行把子弹伤害削弱 90%
            },
            
            choreography: [
                { time: 1.0, action: 'MESSAGE', text: '>> 神经漫游者协议：已激活', color: '#00e676' },
                { time: 2.0, action: 'MESSAGE', text: '>> 警告：武器伤害输出受限 (10%)', color: '#ff1744' },
                { time: 3.0, action: 'MESSAGE', text: '>> 授权：动能撞击屏障 [在线]', color: '#00e5ff' },
                { time: 4.959, action: "WAVE_TOAST", text: "DROP 01: 律动涌入", color: "#ffea00" },
                
                // [10s - 19s] 扫荡式波浪出怪 (引导玩家左右摇摆)
                { time: 10.817, action: "SPAWN", type: "Locator", x: 50 },
                { time: 11.183, action: "SPAWN", type: "Locator", x: 100 },
                { time: 11.623, action: "SPAWN", type: "Locator", x: 150 },
                { time: 12.005, action: "SPAWN", type: "Locator", x: 200 },
                { time: 12.382, action: "SPAWN", type: "Locator", x: 250 },
                { time: 12.84, action: "SPAWN", type: "Locator", x: 300 },
                { time: 13.227, action: "SPAWN", type: "Locator", x: 350 },
                { time: 13.62, action: "SPAWN", type: "Locator", x: 300 },
                { time: 14.014, action: "SPAWN", type: "Locator", x: 250 },
                { time: 14.421, action: "SPAWN", type: "Locator", x: 200 },
                { time: 14.849, action: "SPAWN", type: "Locator", x: 150 },
                { time: 15.254, action: "SPAWN", type: "Locator", x: 100 },
                { time: 15.615, action: "SPAWN", type: "Locator", x: 50 },
                { time: 15.989, action: "SPAWN", type: "Locator", x: 100 },
                { time: 16.404, action: "SPAWN", type: "Locator", x: 150 },
                { time: 16.802, action: "SPAWN", type: "Locator", x: 200 },
                { time: 17.215, action: "SPAWN", type: "Locator", x: 250 },
                { time: 17.589, action: "SPAWN", type: "Locator", x: 300 },
                { time: 17.962, action: "SPAWN", type: "Locator", x: 350 },
                { time: 18.31, action: "SPAWN", type: "Locator", x: 200 },
                { time: 18.683, action: "SPAWN", type: "Locator", x: 100 },
                { time: 19.098, action: "SPAWN", type: "Locator", x: 300 },

                // [19s - 30s] 叹息之墙 (重音卡点，两侧锁死)
                { time: 19.706, action: "SPAWN", type: "Tank", x: 50 },
                { time: 20.399, action: "SPAWN", type: "Tank", x: 350 },
                { time: 20.799, action: "SPAWN", type: "Tank", x: 50 },
                { time: 20.837, action: "SPAWN", type: "Tank", x: 350 },
                { time: 22.249, action: "SPAWN", type: "Tank", x: 200 }, // 中心重压
                { time: 23.938, action: "SPAWN", type: "Tank", x: 100 },
                { time: 25.339, action: "SPAWN", type: "Tank", x: 300 },
                { time: 26.999, action: "SPAWN", type: "Tank", x: 50 },
                { time: 28.642, action: "SPAWN", type: "Tank", x: 350 },
                { time: 30.219, action: "SPAWN", type: "Tank", x: 200 },
                
                { time: 31.778, action: "SPAWN", type: "Locator", x: 150 },
                { time: 32.244, action: "SPAWN", type: "Locator", x: 250 },
                { time: 38.242, action: "SPAWN", type: "Tank", x: 200 },
                
                // 桥段前的小碎拍
                { time: 40.049, action: "SPAWN", type: "Locator" },
                { time: 40.353, action: "SPAWN", type: "Locator" },
                { time: 41.478, action: "SPAWN", type: "Locator" },
                { time: 41.773, action: "SPAWN", type: "Locator" },
                { time: 43.17, action: "SPAWN", type: "Tank", x: 200 },
                
                // [43s - 56s] 真空休整期... 可以在此期间打开终端花掉积攒的 PT

                { time: 56.204, action: "SPAWN", type: "Locator", x: 100 },
                { time: 56.559, action: "SPAWN", type: "Locator", x: 300 },
                { time: 56.979, action: "SPAWN", type: "Locator", x: 200 },
                { time: 57.371, action: "SPAWN", type: "Locator", x: 200 },
                
                // [57s - 99s] 终极高潮：群狼战术与碰撞狂欢
                { time: 57.813, action: "WAVE_TOAST", text: "FINAL DROP: 全员自毁协议", color: "#ff1744" },
                
                // 这里我将原本的单个怪升级为 Swarm(集群) 和特化怪，最大化撞击AOE的收益
                { time: 64.329, action: "SPAWN", type: "LocatorSwarm", x: 200 },
                { time: 64.475, action: "SPAWN", type: "Locator" },
                { time: 64.665, action: "SPAWN", type: "Locator" },
                { time: 64.859, action: "SPAWN", type: "Kamikaze" },
                { time: 65.052, action: "SPAWN", type: "Kamikaze" },
                { time: 65.242, action: "SPAWN", type: "Locator" },
                { time: 65.426, action: "SPAWN", type: "Locator" },
                { time: 65.615, action: "SPAWN", type: "Locator" },
                { time: 65.811, action: "SPAWN", type: "Locator" },
                { time: 66.02, action: "SPAWN", type: "LocatorSwarm", x: 100 },
                { time: 66.212, action: "SPAWN", type: "LocatorSwarm", x: 300 },
                { time: 66.404, action: "SPAWN", type: "Locator" },
                { time: 66.597, action: "SPAWN", type: "Locator" },
                { time: 66.833, action: "SPAWN", type: "Locator" },
                { time: 66.967, action: "SPAWN", type: "Locator" },
                { time: 67.159, action: "SPAWN", type: "Kamikaze" },
                
                // 坦克阵列压场
                { time: 67.41, action: "SPAWN", type: "Tank", x: 50 },
                { time: 67.588, action: "SPAWN", type: "Locator" },
                { time: 67.801, action: "SPAWN", type: "Locator" },
                { time: 67.971, action: "SPAWN", type: "Locator" },
                { time: 68.2, action: "SPAWN", type: "Tank", x: 350 },
                { time: 68.392, action: "SPAWN", type: "Locator" },
                { time: 68.624, action: "SPAWN", type: "Locator" },
                { time: 68.78, action: "SPAWN", type: "Locator" },
                { time: 69.021, action: "SPAWN", type: "Tank", x: 200 },
                { time: 69.201, action: "SPAWN", type: "Locator" },
                { time: 69.393, action: "SPAWN", type: "Locator" },
                { time: 69.523, action: "SPAWN", type: "Locator" },
                { time: 69.584, action: "SPAWN", type: "Locator" },
                { time: 69.836, action: "SPAWN", type: "Tank", x: 100 },
                { time: 70.046, action: "SPAWN", type: "Tank", x: 300 },
                { time: 70.251, action: "SPAWN", type: "Tank", x: 50 },
                { time: 70.468, action: "SPAWN", type: "Tank", x: 350 },
                { time: 70.696, action: "SPAWN", type: "Tank", x: 200 },
                
                // 尾奏散怪
                { time: 73.864, action: "SPAWN", type: "Locator" },
                { time: 74.615, action: "SPAWN", type: "Locator" },
                { time: 75.349, action: "SPAWN", type: "Locator" },
                { time: 76.195, action: "SPAWN", type: "Locator" },
                { time: 76.995, action: "SPAWN", type: "Locator" },
                { time: 77.808, action: "SPAWN", type: "Locator" },
                { time: 78.608, action: "SPAWN", type: "Locator" },
                { time: 79.407, action: "SPAWN", type: "Locator" },
                { time: 80.185, action: "SPAWN", type: "Locator" },
                { time: 81.021, action: "SPAWN", type: "Locator" },
                { time: 81.765, action: "SPAWN", type: "Locator" },
                { time: 82.609, action: "SPAWN", type: "Locator" },
                { time: 83.484, action: "SPAWN", type: "Locator" },
                { time: 84.247, action: "SPAWN", type: "Locator" },
                { time: 85.015, action: "SPAWN", type: "Locator" },
                
                // 最终大混战
                { time: 85.878, action: "SPAWN", type: "Tank", x: 100 },
                { time: 86.3, action: "SPAWN", type: "Tank", x: 300 },
                { time: 87.124, action: "SPAWN", type: "LocatorSwarm", x: 200 },
                { time: 87.508, action: "SPAWN", type: "Locator" },
                { time: 89.185, action: "SPAWN", type: "Locator" },
                { time: 89.955, action: "SPAWN", type: "Locator" },
                { time: 90.701, action: "SPAWN", type: "Locator" },
                { time: 91.448, action: "SPAWN", type: "Tank", x: 50 },
                { time: 91.85, action: "SPAWN", type: "Tank", x: 350 },
                { time: 92.234, action: "SPAWN", type: "Tank", x: 150 },
                { time: 92.626, action: "SPAWN", type: "Tank", x: 250 },
                { time: 93.058, action: "SPAWN", type: "Locator" },
                { time: 93.453, action: "SPAWN", type: "Locator" },
                { time: 93.88, action: "SPAWN", type: "Locator" },
                { time: 94.261, action: "SPAWN", type: "Locator" },
                { time: 94.705, action: "SPAWN", type: "Tank", x: 200 },
                { time: 95.531, action: "SPAWN", type: "Locator" },
                { time: 96.301, action: "SPAWN", type: "Locator" },
                { time: 97.277, action: "SPAWN", type: "Locator" },
                { time: 97.677, action: "SPAWN", type: "Locator" },
                { time: 97.727, action: "SPAWN", type: "Locator" },
                { time: 98.198, action: "SPAWN", type: "Locator" },
                { time: 98.601, action: "SPAWN", type: "Locator" },
                { time: 98.647, action: "SPAWN", type: "Locator" },
                { time: 98.699, action: "SPAWN", type: "Locator" },
                { time: 98.751, action: "SPAWN", type: "Locator" },
                { time: 99.406, action: "SPAWN", type: "Locator" },
                { time: 99.763, action: "SPAWN", type: "Locator" },
                
                { time: 102.0, action: "MESSAGE", text: ">> 信号中断。残存敌军清理中...", color: "#00e676" }
            ]
        }

    }
};

function spawn(type, x, opt) { window.spawnEnemyByType(type, x, opt); }
