// === config.js ===

// 加入了相对滑动控制(relative)、灵敏度(controlSens) 以及 全新的单多指触控开关(touchMode)
const config = { dmgText: true, shake: true, controlOffsetY: 90, controlMode: 'relative', controlSens: 1.5, touchMode: 'single' };

const DIFF_CONFIG = [
    { name: "新兵", desc: "简单：新手教学。初盘保护 45 秒。", hpMod: 0.8, dmgMod: 1.0, spawnMod: 0.8, ptMod: 1.2, p_hp: 100, p_dmg: 12, maxEnemies: 20, protectionTime: 45 },
    { name: "老手", desc: "普通：标准战斗。初盘保护 30 秒。", hpMod: 1.0, dmgMod: 1.0, spawnMod: 1.0, ptMod: 1.0, p_hp: 100, p_dmg: 12, maxEnemies: 35, protectionTime: 30 },
    { name: "精英", desc: "困难：高压集群。初盘保护 20 秒。", hpMod: 1.5, dmgMod: 1.0, spawnMod: 1.5, ptMod: 1.0, p_hp: 100, p_dmg: 12, maxEnemies: 50, protectionTime: 20 },
    { name: "深渊", desc: "深渊：残血高物价。初盘保护 15 秒。", hpMod: 1.5, dmgMod: 1.25, spawnMod: 1.5, ptMod: 0.8, p_hp: 80,  p_dmg: 8, maxEnemies: 70, protectionTime: 15 }
];

const RARITY = { C: { name: '普通', color: '#fff', weight: 50 }, R: { name: '稀有', color: '#00b0ff', weight: 30 }, E: { name: '史诗', color: '#ab47bc', weight: 15 }, L: { name: '传说', color: '#ffea00', weight: 5 } };
const TYPE_TAGS = { 'equip': { label: '装' }, 'stat': { label: '属' }, 'utility': { label: '辅' } };

const upgradePool = [
    { id: 'damage', type: 'stat', name: '高能弹头', rarity: 'R', cost: 1.4, max: 20, unlockPT: 0, unlockTime: 0, desc: '单发基础杀伤力+6，子弹略微变大。' },
    { id: 'heal', type: 'utility', name: '紧急修复', rarity: 'C', cost: 0.5, max: 999, unlockPT: 0, unlockTime: 0, desc: '立刻固定恢复20点耐久度。' },
    { id: 'heal_up', type: 'utility', name: '修复增幅', rarity: 'R', cost: 1.0, max: 10, unlockPT: 0, unlockTime: 0, desc: '增加血包恢复量(+5%)。' },
    { id: 'magnet', type: 'utility', name: '引力场', rarity: 'C', cost: 1.0, max: 5, unlockPT: 0, unlockTime: 0, desc: '扩大能量晶体与补给的拾取范围。' },
    { id: 'crit_rate', type: 'stat', name: '精准校准', rarity: 'R', cost: 1.2, max: 10, unlockPT: 1.0, unlockTime: 0, desc: '暴击概率提升5%。' },
    { id: 'crit_dmg', type: 'stat', name: '弱点分析', rarity: 'E', cost: 1.5, max: 10, unlockPT: 2.0, unlockTime: 0, desc: '暴击伤害提升20%。' },
    { id: 'healer_rate', type: 'utility', name: '补给雷达', rarity: 'E', cost: 1.4, max: 5, unlockPT: 2.0, unlockTime: 30, desc: '增加携带修复包的机体概率(+3%)。' }, 
    { id: 'aoe', type: 'stat', name: '高爆弹头', rarity: 'L', cost: 2.2, max: 3, unlockPT: 8.0, unlockTime: 60, desc: '部分攻击能引发大范围爆炸。' }, 
    { id: 'wingman', type: 'stat', name: '战斗僚机', rarity: 'L', cost: 3.5, max: 4, unlockPT: 12.0, unlockTime: 90, desc: '部署一台自动攻击敌人的浮游炮。' },
    { id: 'slot', type: 'utility', name: '系统插槽', rarity: 'L', cost: 1.8, max: 5, unlockPT: 2.0, unlockTime: 0, desc: '背包容量扩充，+1 装备插槽。' }, 
    
    { id: 'hp_max', type: 'equip', name: '装甲重塑', rarity: 'E', initialCost: 1.8, cost: 1.5, costStep: 0.5, max: 3, slotCost: 1, unlockPT: 0, unlockTime: 0, desc: '提升血量上限(30-30-40)。获取时自动回复对应血量。' },
    { id: 'speed', type: 'equip', name: '连发核心', rarity: 'R', initialCost: 2.0, cost: 1.2, costStep: 0.4, max: 4, slotCost: 1, unlockPT: 0, unlockTime: 0, desc: '提升基础射速。升级达到极致。' }, 
    { id: 'spread', type: 'equip', name: '散弹模组', rarity: 'R', initialCost: 3.0, cost: 1.5, costStep: 0.5, max: 4, slotCost: 2, unlockPT: 3.0, unlockTime: 45, desc: '发射散弹。升级降低伤害惩罚。' },
    { id: 'homing', type: 'equip', name: '追踪模块', rarity: 'E', initialCost: 3.5, cost: 2.0, costStep: 0.5, max: 3, slotCost: 2, unlockPT: 5.0, unlockTime: 60, desc: '子弹弱追踪。升级提升制导。' },
    { id: 'pulse', type: 'equip', name: '脉冲发射', rarity: 'R', initialCost: 2.5, cost: 1.5, costStep: 0.5, max: 3, slotCost: 2, unlockPT: 4.0, unlockTime: 60, desc: '点射模式。升级缩短发射间隔。' },
    { id: 'laser', type: 'equip', name: '高能激光', rarity: 'L', initialCost: 6.0, cost: 3.0, costStep: 1.0, max: 4, slotCost: 3, unlockPT: 15.0, unlockTime: 120, desc: '发射贯穿屏障的高频光束。' },
    { id: 'pierce', type: 'equip', name: '穿透弹头', rarity: 'E', initialCost: 2.5, cost: 1.5, costStep: 1.0, max: 3, slotCost: 1, unlockPT: 4.0, unlockTime: 60, desc: '子弹可穿透敌机。升级降低衰减并增加穿透次数。' },
    { id: 'debt_protocol', type: 'equip', name: '恶魔剥削', rarity: 'E', initialCost: 0, cost: 0, costStep: 0, max: 1, slotCost: 0, canUnequip: false, unlockPT: 3.0, unlockTime: 60, desc: '立刻获得 3.0 PT。绑定外置槽不可卸下。代价：火力永久衰减20%。' }
];

function getHpMaxBoost(level) {
    if(level === 0) return 0; if(level === 1) return 30; if(level === 2) return 60; return 100;
}

// 【加入阵型代币与分类】：显著提升精英游荡者权重，引入独立阵型单位
const ENEMY_TYPES = [
    { type: 'Locator',       weight: 1,  unlockTime: 0,   role: 'fodder' },
    { type: 'WandererLow',   weight: 3,  unlockTime: 5,   role: 'fodder' }, 
    { type: 'Kamikaze',      weight: 4,  unlockTime: 20,  role: 'special' },
    { type: 'LocatorSwarm',  weight: 6,  unlockTime: 20,  role: 'swarm' }, 
    // 【修改】：精英游荡者权重显著提升，配合实体的强化，它将极度危险
    { type: 'WandererHigh',  weight: 15, unlockTime: 15,  role: 'elite' },  
    { type: 'Turret',        weight: 10, unlockTime: 45,  role: 'elite' },
    { type: 'ArcFlyer',      weight: 12, unlockTime: 30,  role: 'special' },
    { type: 'WandererSwarm', weight: 15, unlockTime: 25,  role: 'swarm' },  
    { type: 'KamikazeSwarm', weight: 16, unlockTime: 40,  role: 'swarm' },
    { type: 'ArcFlyerSwarm', weight: 20, unlockTime: 50,  role: 'swarm' },
    { type: 'TurretSwarm',   weight: 22, unlockTime: 70,  role: 'swarm' },
    { type: 'KamikazeSpec',  weight: 30, unlockTime: 60,  role: 'elite' },
    { type: 'Tank',          weight: 30, unlockTime: 85,  role: 'tank' },
    { type: 'TankSwarm',     weight: 40, unlockTime: 100, role: 'tank' },
    
    // 【全新机制】：复合阵型卡组，导演不再乱刷，而是成建制投送
    { type: 'Formation_V_Strike', weight: 12, unlockTime: 20, role: 'formation' },
    { type: 'Formation_Turret_Wall', weight: 25, unlockTime: 50, role: 'formation' },
    { type: 'Formation_Ambush', weight: 28, unlockTime: 65, role: 'formation' }
];

const LEVELS = {
    // 【第一关完全重做】：移除所有非无人机敌人（Wanderer/Kamikaze），节奏手工控制，随后转交导演
    'sector1': {
        id: 'sector1', duration: 150, shopItems: ['damage', 'speed', 'spread', 'heal', 'hp_max', 'magnet', 'crit_rate'], 
        timeHpMultiplier: (sec) => 1 + (sec / 150) * 1.5, 
        spawnLoop: function() {
            if (isBossSpawned) return;
            if (gameTimeSeconds >= this.duration) {
                isBossSpawned = true; enemies.push(new BossScrapDominator(width/2, -50)); enemies = enemies.filter(e => e.isSpecial || e.isBoss);
                updateHUD(); return;
            }
            
            let sec = gameTimeSeconds + (frameCount % 60) / 60;
            let isEasy = currentDifficulty === 0;
            
            // 前45秒：手工设计的新手引导节奏，只有无人机和炮台
            if (sec < 20) { 
                if (frameCount % 120 === 0) window.spawnEnemyByType('Locator', Math.random()*(width-60)+30); 
                if (sec > 10 && frameCount % 180 === 0) window.spawnEnemyByType('Locator', Math.random()*(width-60)+30, {forceHeal: true}); 
            } else if (sec < 45) { 
                if (frameCount % 150 === 0) window.spawnEnemyByType('Formation_V_Strike', Math.random()*(width-100)+50); 
                if (frameCount % 200 === 0) window.spawnEnemyByType('Turret', Math.random()*(width-60)+30); 
            } else {
                // 45秒后：交由导演，但兵种池被严格锁定在“无人机科技”风格内
                if (directorState === 'COOLDOWN' && !healWaveEnemyType) return;
                
                let allowed = ['Locator', 'LocatorSwarm', 'Turret', 'TurretSwarm', 'ArcFlyer', 'ArcFlyerSwarm', 'Tank', 'Formation_V_Strike', 'Formation_Turret_Wall'];
                let unlocked = ENEMY_TYPES.filter(t => allowed.includes(t.type) && gameTimeSeconds >= t.unlockTime && directorPoints >= t.weight);
                if (isEasy) unlocked = unlocked.filter(t => !t.type.includes('Swarm') && !t.type.includes('Wall'));

                let pointPressure = directorPoints / 25.0;
                if (frameCount % 30 === 0 && unlocked.length > 0 && directorPoints > 0 && enemies.length < DIFF_CONFIG[currentDifficulty].maxEnemies) {
                    let totalW = 0;
                    unlocked.forEach(t => {
                        let drawProb = 100 / t.weight;
                        if (pointPressure > 1.0) drawProb *= Math.pow(t.weight, pointPressure * 0.8); 
                        t.drawProb = drawProb; totalW += drawProb;
                    });
                    let roll = Math.random() * totalW; let selected = null;
                    for (let type of unlocked) { roll -= type.drawProb; if (roll <= 0) { selected = type; break; } }
                    if (selected) {
                        directorPoints -= selected.weight;
                        window.spawnEnemyByType(selected.type, Math.random() * (width - 60) + 30);
                    }
                }
            }
        }
    },
    'debug': {
        id: 'debug', shopItems: 'ALL', timeHpMultiplier: (sec) => 1 + Math.pow(sec/100, 1.2) * 0.5,
        spawnLoop: function() {
            // 【导演初盘保护机制在无尽模式的应用】：详见 main.js 的点数累加控制
            let maxE = DIFF_CONFIG[currentDifficulty].maxEnemies;
            
            if (frameCount % 20 === 0 && enemies.length < maxE) {
                if (directorPoints >= 0) {
                    
                    if (directorState === 'COOLDOWN') {
                        if (healWaveEnemyType && directorPoints > healWaveEnemyType.weight * 0.5) {
                            window.spawnEnemyByType(healWaveEnemyType.type, Math.random() * (width - 60) + 30, {forceHeal: true});
                            directorPoints -= healWaveEnemyType.weight;
                        }
                        return; // 等待清场阶段，严格阻止产怪
                    }

                    let unlocked = ENEMY_TYPES.filter(type => gameTimeSeconds >= type.unlockTime && directorPoints >= type.weight);
                    if (currentDifficulty === 0) unlocked = unlocked.filter(t => !t.type.includes('Swarm') && !t.type.includes('Spec') && !t.type.includes('Formation'));

                    let purchases = 0;
                    let pointPressure = directorPoints / 25.0; 
                    
                    while (unlocked.length > 0 && purchases < 2 && directorPoints > 0 && enemies.length < maxE) {
                        let totalInverseWeight = 0;
                        unlocked.forEach(t => {
                            let drawProb = 100 / t.weight;
                            if (currentDifficulty >= 2 && t.role === 'swarm') drawProb *= 3; 
                            
                            // 【智能防积压】：点数溢出时，极大提高高消耗阵型/精英怪的刷新几率
                            if (pointPressure > 1.0) drawProb *= Math.pow(t.weight, pointPressure * 0.8); 
                            
                            t.drawProb = drawProb; totalInverseWeight += drawProb;
                        });

                        let roll = Math.random() * totalInverseWeight; let selected = null;
                        for (let type of unlocked) { roll -= type.drawProb; if (roll <= 0) { selected = type; break; } }
                        
                        if (selected) {
                            directorPoints -= selected.weight; purchases++;
                            window.spawnEnemyByType(selected.type, Math.random() * (width - 60) + 30);
                            unlocked = unlocked.filter(type => directorPoints >= type.weight);
                        }
                    }
                }
            }
        }
    }
};

function createPixelTexture(grid, colors, pixelSize) {
    const rows = grid.length; const cols = grid[0].length;
    const c = document.createElement('canvas'); c.width = cols * pixelSize; c.height = rows * pixelSize;
    const cctx = c.getContext('2d');
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (grid[y][x] > 0 && colors[grid[y][x] - 1]) { cctx.fillStyle = colors[grid[y][x] - 1]; cctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize); }
    return c;
}

const sprites = {};
function initSprites() {
    const pSize = 3; 
    sprites.player = createPixelTexture([[0,0,0,0,0,1,0,0,0,0,0],[0,0,0,0,1,2,1,0,0,0,0],[0,0,0,0,1,2,1,0,0,0,0],[0,0,1,1,1,2,1,1,1,0,0],[0,1,2,2,1,2,1,2,2,1,0],[1,2,2,2,2,3,2,2,2,2,1],[1,1,1,1,1,1,1,1,1,1,1],[1,0,0,1,0,3,0,1,0,0,1]], ['#ffffff', '#00b0ff', '#00e676'], pSize);
    sprites.hp = createPixelTexture([[0,1,0],[1,2,1],[0,1,0]], ['#00e676', '#ffffff'], pSize);
    
    sprites.pt_shard = createPixelTexture([[1]], ['#eeeeee'], 3);
    sprites.pt_core = createPixelTexture([[0,1,0],[1,2,1],[0,1,0]], ['#ffffff', '#e0e0e0'], 3);
    sprites.energy_crystal = createPixelTexture([[0,1,0],[1,2,1],[0,1,0]], ['#00e5ff', '#ffffff'], 3);
    
    // 原生绘制的深蓝科技贴图
    sprites.locator = createPixelTexture([[1,0,0,0,1],[0,1,2,1,0],[1,2,3,2,1],[0,1,2,1,0],[0,1,0,1,0]], ['#546e7a', '#90a4ae', '#ff1744'], 3);
    sprites.locator_swarm = createPixelTexture([[1,0,0,0,1],[0,1,2,1,0],[1,2,3,2,1],[0,1,2,1,0],[0,1,0,1,0]], ['#4a148c', '#ab47bc', '#00b0ff'], 3); 
    sprites.locator_healer = createPixelTexture([[1,0,0,0,1],[0,1,2,1,0],[1,2,3,2,1],[0,1,2,1,0],[0,1,0,1,0]], ['#1b5e20', '#4caf50', '#b2ff59'], 3);
    sprites.locator_battery = createPixelTexture([[1,0,0,0,1],[0,1,2,1,0],[1,2,3,2,1],[0,1,2,1,0],[0,1,0,1,0]], ['#0277bd', '#03a9f4', '#00e5ff'], 3);
    
    sprites.wanderer = createPixelTexture([[1,0,0,0,1],[0,1,2,1,0],[0,1,1,1,0],[1,2,3,2,1],[1,1,1,1,1],[0,1,0,1,0]], ['#424242', '#757575', '#ff1744'], pSize); 
    sprites.wanderer_swarm = createPixelTexture([[1,0,0,0,1],[0,1,2,1,0],[0,1,1,1,0],[1,2,3,2,1],[1,1,1,1,1],[0,1,0,1,0]], ['#4a148c', '#ab47bc', '#00b0ff'], pSize); 
    sprites.wanderer_healer = createPixelTexture([[1,0,0,0,1],[0,1,2,1,0],[0,1,1,1,0],[1,2,3,2,1],[1,1,1,1,1],[0,1,0,1,0]], ['#1b5e20', '#4caf50', '#b2ff59'], pSize);
    sprites.wanderer_battery = createPixelTexture([[1,0,0,0,1],[0,1,2,1,0],[0,1,1,1,0],[1,2,3,2,1],[1,1,1,1,1],[0,1,0,1,0]], ['#01579b', '#0288d1', '#00e5ff'], pSize);
    
    sprites.turret = createPixelTexture([[1,1,1,1,1,1],[1,2,2,2,2,1],[1,2,3,3,2,1],[1,2,2,2,2,1],[0,1,1,1,1,0]], ['#424242', '#757575', '#ff1744'], pSize);
    sprites.turret_swarm = createPixelTexture([[1,1,1,1,1,1],[1,2,2,2,2,1],[1,2,3,3,2,1],[1,2,2,2,2,1],[0,1,1,1,1,0]], ['#4a148c', '#ab47bc', '#00b0ff'], pSize);
    sprites.turret_healer = createPixelTexture([[1,1,1,1,1,1],[1,2,2,2,2,1],[1,2,3,3,2,1],[1,2,2,2,2,1],[0,1,1,1,1,0]], ['#1b5e20', '#4caf50', '#b2ff59'], pSize);
    sprites.turret_battery = createPixelTexture([[1,1,1,1,1,1],[1,2,2,2,2,1],[1,2,3,3,2,1],[1,2,2,2,2,1],[0,1,1,1,1,0]], ['#01579b', '#0288d1', '#00e5ff'], pSize);

    sprites.kamikaze_idle = createPixelTexture([[0,0,1,0,0],[0,1,2,1,0],[1,1,2,1,1],[1,0,1,0,1]], ['#ffaa00', '#ffeb3b'], pSize);
    sprites.kamikaze_warn = createPixelTexture([[0,0,1,0,0],[0,1,2,1,0],[1,1,2,1,1],[1,0,1,0,1]], ['#ff1744', '#ffeb3b'], pSize); 
    sprites.kamikaze_swarm_idle = createPixelTexture([[0,0,1,0,0],[0,1,2,1,0],[1,1,2,1,1],[1,0,1,0,1]], ['#d500f9', '#f57f17'], pSize); 
    sprites.kamikaze_swarm_warn = createPixelTexture([[0,0,1,0,0],[0,1,2,1,0],[1,1,2,1,1],[1,0,1,0,1]], ['#d500f9', '#f57f17'], pSize);
    sprites.kamikaze_special_idle = createPixelTexture([[0,0,1,0,0],[0,1,2,1,0],[1,1,2,1,1],[1,0,1,0,1]], ['#7f0000', '#b71c1c'], 4); 
    sprites.kamikaze_special_warn = createPixelTexture([[0,0,1,0,0],[0,1,2,1,0],[1,1,2,1,1],[1,0,1,0,1]], ['#ffffff', '#ff1744'], 4);
    
    sprites.arc = createPixelTexture([[1,0,0,0,0,0,1],[1,1,0,0,0,1,1],[0,1,1,2,1,1,0],[0,0,1,1,1,0,0]], ['#37474f', '#ffffff'], pSize);
    sprites.arc_swarm = createPixelTexture([[1,0,0,0,0,0,1],[1,1,0,0,0,1,1],[0,1,1,2,1,1,0],[0,0,1,1,1,0,0]], ['#6a1b9a', '#00b0ff'], pSize); 
    
    sprites.tank = createPixelTexture([[1,1,1,1,1,1,1,1],[1,2,2,1,1,2,2,1],[1,2,2,1,1,2,2,1],[1,1,1,3,3,1,1,1],[1,1,1,3,3,1,1,1],[1,1,1,1,1,1,1,1],[0,1,1,0,0,1,1,0]], ['#424242', '#757575', '#ff1744'], 4); 
    sprites.tank_swarm = createPixelTexture([[1,1,1,1,1,1,1,1],[1,2,2,1,1,2,2,1],[1,2,2,1,1,2,2,1],[1,1,1,3,3,1,1,1],[1,1,1,3,3,1,1,1],[1,1,1,1,1,1,1,1],[0,1,1,0,0,1,1,0]], ['#4a148c', '#ab47bc', '#00b0ff'], 4); 
    
    sprites.boss_scrap = createPixelTexture([
        [0,0,0,0,0,1,1,1,1,1,0,0,0,0,0],
        [0,0,0,1,1,2,2,2,2,2,1,1,0,0,0],
        [0,0,1,2,2,3,3,3,3,3,2,2,1,0,0],
        [0,1,2,3,3,4,4,4,4,4,3,3,2,1,0],
        [0,1,2,3,4,4,5,5,5,4,4,3,2,1,0],
        [1,2,3,4,4,5,6,6,6,5,4,4,3,2,1],
        [1,2,3,4,5,6,7,7,7,6,5,4,3,2,1],
        [1,2,3,4,5,6,7,8,7,6,5,4,3,2,1],
        [1,2,3,4,5,6,7,7,7,6,5,4,3,2,1],
        [1,2,3,4,4,5,6,6,6,5,4,4,3,2,1],
        [0,1,2,3,4,4,5,5,5,4,4,3,2,1,0],
        [0,1,2,3,3,4,4,4,4,4,3,3,2,1,0],
        [0,0,1,2,2,3,3,3,3,3,2,2,1,0,0],
        [0,0,0,1,1,2,2,2,2,2,1,1,0,0,0],
        [0,0,0,0,0,1,1,1,1,1,0,0,0,0,0]
    ], ['#0f0f1a', '#1a1a2e', '#2a2a4a', '#311b92', '#4a148c', '#7b1fa2', '#00b0ff', '#00e5ff'], 6);

    sprites.boss_scrap_phase2 = createPixelTexture([
        [0,0,0,0,0,1,1,1,1,1,0,0,0,0,0],
        [0,0,0,1,1,2,2,2,2,2,1,1,0,0,0],
        [0,0,1,2,2,3,3,3,3,3,2,2,1,0,0],
        [0,1,2,3,3,4,4,4,4,4,3,3,2,1,0],
        [0,1,2,3,4,4,5,5,5,4,4,3,2,1,0],
        [1,2,3,4,4,5,6,6,6,5,4,4,3,2,1],
        [1,2,3,4,5,6,7,7,7,6,5,4,3,2,1],
        [1,2,3,4,5,6,7,8,7,6,5,4,3,2,1],
        [1,2,3,4,5,6,7,7,7,6,5,4,3,2,1],
        [1,2,3,4,4,5,6,6,6,5,4,4,3,2,1],
        [0,1,2,3,4,4,5,5,5,4,4,3,2,1,0],
        [0,1,2,3,3,4,4,4,4,4,3,3,2,1,0],
        [0,0,1,2,2,3,3,3,3,3,2,2,1,0,0],
        [0,0,0,1,1,2,2,2,2,2,1,1,0,0,0],
        [0,0,0,0,0,1,1,1,1,1,0,0,0,0,0]
    ], ['#0f0f1a', '#1a1a2e', '#2a2a4a', '#311b92', '#4a148c', '#7b1fa2', '#ff1744', '#ffea00'], 6);

    sprites.eqIcons = {
        'hp_max': createPixelTexture([[0,1,1,0],[1,1,1,1],[1,1,1,1],[0,1,1,0]], ['#00e676'], 3),
        'speed': createPixelTexture([[0,1,0,0],[1,1,1,0],[0,1,0,0],[0,1,0,0]], ['#ffea00'], 3),
        'spread': createPixelTexture([[1,0,0,1],[0,1,1,0],[1,0,0,1],[0,0,0,0]], ['#ff9800'], 3),
        'homing': createPixelTexture([[0,1,1,0],[1,0,0,1],[1,0,0,1],[0,1,1,0]], ['#ab47bc'], 3),
        'pulse': createPixelTexture([[1,1,0,0],[0,1,1,0],[0,0,1,1],[0,0,0,0]], ['#00e5ff'], 3),
        'laser': createPixelTexture([[1,1,1,1],[1,1,1,1],[0,0,0,0],[0,0,0,0]], ['#ff1744'], 3),
        'pierce': createPixelTexture([[0,0,1,0],[0,1,1,1],[0,0,1,0],[0,0,0,0]], ['#ffffff'], 3),
        'debt_protocol': createPixelTexture([[1,0,0,1],[0,1,1,0],[0,1,1,0],[1,0,0,1]], ['#ff1744'], 3),
        'default': createPixelTexture([[1,1,1,1],[1,0,0,1],[1,0,0,1],[1,1,1,1]], ['#888888'], 3)
    };

    const i_pause = createPixelTexture([[0,0,0,0,0,0,0],[0,1,1,0,1,1,0],[0,1,1,0,1,1,0],[0,1,1,0,1,1,0],[0,1,1,0,1,1,0],[0,0,0,0,0,0,0]], ['#fff'], 2);
    const i_shop = createPixelTexture([[1,1,1,0,0,0,0,0],[0,0,1,1,1,1,1,0],[0,0,1,2,2,2,1,1],[0,0,1,2,2,2,1,0],[0,0,1,1,1,1,1,0],[0,0,0,1,0,1,0,0],[0,0,1,1,0,1,1,0]], ['#fff', '#00b0ff'], 2);
    const i_loadout = createPixelTexture([[0,0,1,1,1,1,0,0],[0,1,2,2,2,2,1,0],[1,2,3,3,3,3,2,1],[1,2,3,3,3,3,2,1],[1,2,2,2,2,2,2,1],[0,1,1,1,1,1,1,0]], ['#fff', '#aaa', '#00e676'], 2);
    const i_skill = createPixelTexture([[0,0,0,1,1,0,0],[0,0,1,1,0,0,0],[0,1,1,0,0,0,0],[0,1,1,1,1,0,0],[0,0,0,1,1,0,0],[0,0,1,1,0,0,0],[0,1,1,0,0,0,0]], ['#fff'], 2);

    sprites.i_pause = i_pause; sprites.i_shop = i_shop; sprites.i_loadout = i_loadout; sprites.i_skill = i_skill;
}
