// === mod_workshop.js ===
// 极客创意工坊：数据驱动的核心

window.WORKSHOP = {
    // 【核心数据区】这里的数据会被提取成 JSON 供你在极客终端中修改！
    data: {
        physics: {
            hp_bounce_force: 0.6,
            hp_damping: 0.65,
            skill_vibrate_force: 20,
            dmg_text_player_speed_x: 3,
            dmg_text_player_speed_y: -4,
            dmg_text_player_gravity: 0.25
        },
        economy: {
            inflation_growth: 0.5,
            inflation_min_buy: 5.0,
            cooling_rate: 0.6,
            refresh_inflation: 2.0
        },
        // 敌人的数值档案库，你可以随意修改它们的血量和权重！
        enemies: {
            "Locator":       { hp: 12,  weight: 1,  unlockTime: 0,   role: 'fodder' },
            "WandererLow":   { hp: 18,  weight: 3,  unlockTime: 5,   role: 'fodder' },
            "Kamikaze":      { hp: 18,  weight: 4,  unlockTime: 20,  role: 'special' },
            "LocatorSwarm":  { hp: 18,  weight: 6,  unlockTime: 20,  role: 'swarm' },
            "WandererHigh":  { hp: 24,  weight: 15, unlockTime: 15,  role: 'elite' },
            "Turret":        { hp: 48,  weight: 10, unlockTime: 45,  role: 'elite' },
            "ArcFlyer":      { hp: 72,  weight: 12, unlockTime: 30,  role: 'special' },
            "WandererSwarm": { hp: 30,  weight: 15, unlockTime: 25,  role: 'swarm' },
            "KamikazeSwarm": { hp: 12,  weight: 16, unlockTime: 40,  role: 'swarm' },
            "ArcFlyerSwarm": { hp: 144, weight: 20, unlockTime: 50,  role: 'swarm' },
            "TurretSwarm":   { hp: 72,  weight: 22, unlockTime: 70,  role: 'swarm' },
            "KamikazeSpec":  { hp: 180, weight: 30, unlockTime: 60,  role: 'elite' },
            "Tank":          { hp: 120, weight: 30, unlockTime: 85,  role: 'tank' },
            "TankSwarm":     { hp: 180, weight: 40, unlockTime: 100, role: 'tank' },
            "Formation_V_Strike":    { weight: 12, unlockTime: 20, role: 'formation' },
            "Formation_Turret_Wall": { weight: 25, unlockTime: 50, role: 'formation' },
            "Formation_Ambush":      { weight: 28, unlockTime: 65, role: 'formation' }
        },
        // 物品的价格与等级上限控制中心
        items: {
            "damage":      { cost: 1.4, max: 20 },
            "heal":        { cost: 0.5, max: 999 },
            "heal_up":     { cost: 1.0, max: 10 },
            "magnet":      { cost: 1.0, max: 5 },
            "crit_rate":   { cost: 1.2, max: 10 },
            "crit_dmg":    { cost: 1.5, max: 10 },
            "healer_rate": { cost: 1.4, max: 5 },
            "aoe":         { cost: 2.2, max: 3 },
            "wingman":     { cost: 3.5, max: 4 },
            "slot":        { cost: 1.8, max: 5 },
            "hp_max": { initialCost: 1.8, costStep: 0.5, max: 3 },
            "speed":  { initialCost: 2.0, costStep: 0.4, max: 4 },
            "spread": { initialCost: 3.0, costStep: 0.5, max: 4 },
            "homing": { initialCost: 3.5, costStep: 0.5, max: 3 },
            "pulse":  { initialCost: 2.5, costStep: 0.5, max: 3 },
            "laser":  { initialCost: 6.0, costStep: 1.0, max: 4 },
            "pierce": { initialCost: 2.5, costStep: 1.0, max: 3 }
        }
    },

    // 【机制数据区】无法被 JSON 直接转化的函数和复杂结构放在这里
    formations: {
        "V_Strike": [ 
            { type: 'Locator', x: 0,   y: 0,   speed: 2.0 },
            { type: 'Locator', x: -35, y: -35, speed: 2.0 },
            { type: 'Locator', x: 35,  y: -35, speed: 2.0, forceHeal: true },
            { type: 'Locator', x: -70, y: -70, speed: 2.0 },
            { type: 'Locator', x: 70,  y: -70, speed: 2.0 }
        ],
        "Turret_Wall": [ 
            { type: 'Turret', x: -60,  y: 0 },
            { type: 'Turret', x: 60,   y: 0, forceHeal: true },
            { type: 'Turret', x: 0,    y: -50 }
        ],
        "Ambush": [ 
            // 游荡者的 side 属性会让它从两边出场，不需要依赖 width
            { type: 'WandererHigh', x: 0, y: 0, side: 'left' },
            { type: 'WandererHigh', x: 0, y: 0, side: 'right' }
        ]
    },

    cassettes: {
        'sector1': {
            name: "区域 1: 废星边缘",
            description: "无人机派系领地。移除所有游荡者，适合新手热身。",
            duration: 150,
            allowed_enemies: ['Locator', 'LocatorSwarm', 'Turret', 'TurretSwarm', 'ArcFlyer', 'Tank'],
            allowed_formations: ['V_Strike', 'Turret_Wall'],
            script: function(sec, frame) {
                let w = window.innerWidth;
                if (sec < 20) { 
                    if (frame % 120 === 0) spawn('Locator', Math.random()*(w-60)+30); 
                    if (sec > 10 && frame % 180 === 0) spawn('Locator', Math.random()*(w-60)+30, {forceHeal: true}); 
                } else if (sec < 45) { 
                    if (frame % 150 === 0) spawn('Formation_V_Strike', Math.random()*(w-100)+50); 
                    if (frame % 200 === 0) spawn('Turret', Math.random()*(w-60)+30); 
                }
            }
        },
        'debug': {
            name: "代号: 调试",
            description: "全兵种无尽模式。导演系统火力全开。",
            duration: 9999,
            allowed_enemies: 'ALL',
            allowed_formations: 'ALL',
            script: function(sec, frame) {}
        }
    }
};

function spawn(type, x, opt) { window.spawnEnemyByType(type, x, opt); }
