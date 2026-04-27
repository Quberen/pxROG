// === config.js ===
const config = { dmgText: true, shake: true, controlOffsetY: 90 };

const DIFF_CONFIG = [
    { name: "新兵", desc: "简单：新手教学，无集群敌人。", hpMod: 0.8, dmgMod: 1.0, spawnMod: 0.8, ptMod: 1.2, p_hp: 100, p_dmg: 12, maxEnemies: 20 },
    { name: "老手", desc: "普通：标准战斗，基础生存环境。", hpMod: 1.0, dmgMod: 1.0, spawnMod: 1.0, ptMod: 1.0, p_hp: 100, p_dmg: 12, maxEnemies: 35 },
    { name: "精英", desc: "困难：高压集群，敌人规模极大增加。", hpMod: 1.5, dmgMod: 1.0, spawnMod: 1.5, ptMod: 1.0, p_hp: 100, p_dmg: 12, maxEnemies: 50 },
    { name: "深渊", desc: "深渊：残血开局，极高物价与承伤！", hpMod: 1.5, dmgMod: 1.25, spawnMod: 1.5, ptMod: 0.8, p_hp: 80,  p_dmg: 8, maxEnemies: 70 }
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

const ENEMY_TYPES = [
    { type: 'Locator',       weight: 1,  unlockTime: 0   },
    { type: 'WandererLow',   weight: 3,  unlockTime: 5   }, 
    { type: 'Kamikaze',      weight: 4,  unlockTime: 20  },
    { type: 'LocatorSwarm',  weight: 6,  unlockTime: 20  }, 
    { type: 'WandererHigh',  weight: 8,  unlockTime: 15  },  
    { type: 'Turret',        weight: 10, unlockTime: 45  },
    { type: 'ArcFlyer',      weight: 12, unlockTime: 30  },
    { type: 'WandererSwarm', weight: 15, unlockTime: 25  },  
    { type: 'KamikazeSwarm', weight: 16, unlockTime: 40  },
    { type: 'ArcFlyerSwarm', weight: 20, unlockTime: 50  },
    { type: 'TurretSwarm',   weight: 22, unlockTime: 70  },
    { type: 'KamikazeSpec',  weight: 25, unlockTime: 60  },
    { type: 'Tank',          weight: 30, unlockTime: 85  },
    { type: 'TankSwarm',     weight: 40, unlockTime: 100 }
];

const LEVELS = {
    'sector1': {
        id: 'sector1', duration: 150, shopItems: ['damage', 'speed', 'spread', 'heal'],
        timeHpMultiplier: (sec) => 1 + (sec / 150) * 1.5, 
        spawnLoop: function() {
            if (isBossSpawned) return;
            if (gameTimeSeconds >= this.duration) {
                isBossSpawned = true; enemies.push(new BossScrapDominator(width/2, -50)); enemies = enemies.filter(e => e.isSpecial || e.isBoss);
                updateHUD(); return;
            }
            
            let sec = gameTimeSeconds + (frameCount % 60) / 60;
            let diffMod = DIFF_CONFIG[currentDifficulty].spawnMod;
            let isEasy = currentDifficulty === 0;
            
            let checkInt = (f) => frameCount % Math.max(10, Math.floor(f / diffMod)) === 0;

            let spawnLoc = (x, y, isHeal) => {
                let e = new Locator(x, y, false, isHeal);
                enemies.push(e);
            }
            let spawnV = (cx, y) => {
                enemies.push(new Locator(cx, y)); enemies.push(new Locator(cx-35, y-35)); enemies.push(new Locator(cx+35, y-35));
                enemies.push(new Locator(cx-70, y-70)); enemies.push(new Locator(cx+70, y-70));
            };
            let spawnG = (y, r, c) => {
                for(let i=0; i<r; i++) for(let j=0; j<c; j++) {
                    let px = width/2 - ((c-1)*35)/2 + j*35; enemies.push(new Locator(px, y - i*35, true, false, 0.8)); 
                }
            };

            if (sec < 15) { 
                if (checkInt(150)) spawnLoc(Math.random()*(width-60)+30, -40, Math.random()<0.2); 
            } else if (sec < 30) { 
                if (checkInt(240)) spawnV(Math.random()*(width-140)+70, -40); 
                if (checkInt(180)) enemies.push(new Wanderer(Math.random()*(width-60)+30, -40, false, null, false, Math.random()<0.15)); 
            } else if (sec < 50) { 
                if (checkInt(180)) spawnV(width/2, -40); 
                if (checkInt(200) && !isEasy) { 
                    let bX = Math.max(80, Math.min(width - 80, Math.random()*width));
                    for(let i=-2; i<=2; i++) enemies.push(new Locator(bX + i*35, -40, true, false, 1.8)); 
                }
            } else if (sec < 70) { 
                if (checkInt(150)) enemies.push(new Wanderer(Math.random()*(width-60)+30, -40, true, null, false, false)); 
            }
            else if (sec >= 70 && sec < 71 && frameCount % 60 === 0) spawnG(-40, 3, 7); 
            else if (sec < 85) { 
                if (checkInt(120)) enemies.push(new Wanderer(Math.random()*(width-60)+30, -40, false, null, false, true)); 
            }
            else if (sec >= 85 && sec < 86 && frameCount % 60 === 0) { 
                spawnG(-40, 4, 6); 
                if(!isEasy) {
                    let ph = Math.random() * Math.PI * 2; 
                    for(let i=0; i<4; i++) enemies.push(new Wanderer(width/2, -180 - i*35, false, ph, true));
                }
            }
            else if (sec >= 95 && sec < 105) {
                if (frameCount % 45 === 0) {
                    let e = new Locator(Math.random()*(width-60)+30, -40, false, true, 1.2);
                    e.hp *= 2; e.maxHp *= 2; e.scale = 1.2; enemies.push(e);
                }
            }
            else if (sec >= 105 && sec < 140) { 
                if (checkInt(180)) {
                    for(let i=0; i<3; i++) enemies.push(new Wanderer(width/2, -40-i*40, true, i, false, false, 'left'));
                }
                if (checkInt(120)) spawnLoc(Math.random()*(width-60)+30, -40, true); 
                if (checkInt(150)) spawnV(Math.random()*(width-140)+70, -40); 
            }
        }
    },
    'debug': {
        id: 'debug', shopItems: 'ALL', timeHpMultiplier: (sec) => 1 + Math.pow(sec/100, 1.2) * 0.5,
        spawnLoop: function() {
            if (gameTimeSeconds < 10 && directorPoints < 2) directorPoints = 2; 
            
            let maxE = DIFF_CONFIG[currentDifficulty].maxEnemies;
            
            // 只有当场上怪物未达上限时，才允许产怪
            if (frameCount % 20 === 0 && enemies.length < maxE) {
                if (directorPoints >= 0) {
                    
                    if (directorState === 'COOLDOWN') {
                        // 导演休息阶段不再强制产怪，由 main.js 控制静默清场，清完才进入下一阶段
                        return;
                    }

                    let unlocked = ENEMY_TYPES.filter(type => gameTimeSeconds >= type.unlockTime && directorPoints >= type.weight);
                    if (currentDifficulty === 0) unlocked = unlocked.filter(t => !t.type.includes('Swarm') && !t.type.includes('Spec'));

                    let purchases = 0;
                    
                    // 【高压智能调控】：如果点数大量积压，或者快触及怪物数量上限，就指数级放大高危怪物的抽取概率！
                    let pointPressure = directorPoints / 20.0;
                    
                    while (unlocked.length > 0 && purchases < 2 && directorPoints > 0 && enemies.length < maxE) {
                        let totalInverseWeight = 0;
                        unlocked.forEach(t => {
                            let drawProb = 100 / t.weight;
                            if (currentDifficulty >= 2 && t.type.includes('Swarm')) drawProb *= 3; 
                            
                            // 压力越大，高花费(大体重)怪物的概率越高
                            if (pointPressure > 1.0) {
                                drawProb *= Math.pow(t.weight, pointPressure * 0.8); 
                            }
                            
                            t.drawProb = drawProb; totalInverseWeight += drawProb;
                        });

                        let roll = Math.random() * totalInverseWeight; let selected = null;
                        for (let type of unlocked) { roll -= type.drawProb; if (roll <= 0) { selected = type; break; } }
                        
                        if (selected) {
                            let x = Math.random() * (width - 60) + 30;
                            let side = null; if (Math.random() < 0.15) side = Math.random() < 0.5 ? 'left' : 'right';
                            let enemyInstance = null;
                            
                            switch(selected.type) {
                                case 'Locator': enemyInstance = new Locator(x, -40, false, false); break;
                                case 'LocatorSwarm': 
                                    let formType = Math.floor(Math.random() * 3); let baseX = Math.max(80, Math.min(width - 80, x)); let swarmSpeed = 1.6 + Math.random() * 0.4; 
                                    if (formType === 0) { enemies.push(new Locator(baseX, -40, true, false, swarmSpeed)); enemies.push(new Locator(baseX - 35, -75, true, false, swarmSpeed)); enemies.push(new Locator(baseX + 35, -75, true, false, swarmSpeed)); enemies.push(new Locator(baseX - 70, -110, true, false, swarmSpeed)); enemies.push(new Locator(baseX + 70, -110, true, false, swarmSpeed)); } 
                                    else if (formType === 1) { for(let i=-2; i<=2; i++) enemies.push(new Locator(baseX + i*35, -40, true, false, swarmSpeed)); } 
                                    else { let dir = Math.random() > 0.5 ? 1 : -1; if (baseX + 4*35*dir > width - 20) dir = -1; if (baseX + 4*35*dir < 20) dir = 1; for(let i=0; i<5; i++) enemies.push(new Locator(baseX + i*35*dir, -40 - i*35, true, false, swarmSpeed)); } break;
                                case 'WandererLow': enemyInstance = new Wanderer(x, -40, false, null, false, false, side); break;
                                case 'WandererHigh': enemyInstance = new Wanderer(x, -40, true, null, false, false, side); break;
                                case 'WandererSwarm': let phase = Math.random() * Math.PI * 2; for(let i=0; i<4; i++) enemies.push(new Wanderer(x, -40 - i*35, false, phase, true, false, side)); break;
                                case 'Kamikaze': enemyInstance = new Kamikaze(x, -40); break;
                                case 'KamikazeSwarm': 
                                    let kDir = Math.random() > 0.5 ? 1 : -1; let kStartX = Math.max(80, Math.min(width - 80, x)); 
                                    if (kStartX + 4*40*kDir > width - 20) kDir = -1; if (kStartX + 4*40*kDir < 20) kDir = 1; 
                                    for(let i=0; i<5; i++) enemies.push(new Kamikaze(kStartX + i*40*kDir, -40 - i*45, 'swarm')); break;
                                case 'KamikazeSpec': enemies.push(new Kamikaze(x, -40, 'special')); break;
                                case 'ArcFlyer': enemies.push(new ArcFlyer(0, -20, Math.random() > 0.5)); break;
                                case 'ArcFlyerSwarm': let isLeft = Math.random() > 0.5; for(let i=0; i<3; i++) enemies.push(new ArcFlyer(0, -20, isLeft, -0.15 * i, true)); break;
                                case 'Turret': enemyInstance = new Turret(x, -40, false, false); break;
                                case 'TurretSwarm': enemies.push(new Turret(x - 35, -40, true)); enemies.push(new Turret(x + 35, -40, true)); break;
                                case 'Tank': enemyInstance = new Tank(x, -40); break;
                                case 'TankSwarm': enemyInstance = new Tank(x, -40, false, true); break;
                            }
                            
                            if (enemyInstance) { 
                                if (Math.random() < 0.05 && gameTimeSeconds > 45) enemyInstance.makeElite(); 
                                enemies.push(enemyInstance); 
                            }
                            directorPoints -= selected.weight; purchases++; 
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
    
    sprites.locator = createPixelTexture([[1,0,0,0,1],[0,1,2,1,0],[1,2,3,2,1],[0,1,2,1,0],[0,1,0,1,0]], ['#546e7a', '#90a4ae', '#ff1744'], 3);
    sprites.locator_swarm = createPixelTexture([[1,0,0,0,1],[0,1,2,1,0],[1,2,3,2,1],[0,1,2,1,0],[0,1,0,1,0]], ['#4a148c', '#ab47bc', '#00b0ff'], 3); 
    sprites.locator_healer = createPixelTexture([[1,0,0,0,1],[0,1,2,1,0],[1,2,3,2,1],[0,1,2,1,0],[0,1,0,1,0]], ['#1b5e20', '#4caf50', '#b2ff59'], 3);
    
    sprites.wanderer = createPixelTexture([[1,0,0,0,1],[0,1,2,1,0],[0,1,1,1,0],[1,2,3,2,1],[1,1,1,1,1],[0,1,0,1,0]], ['#424242', '#757575', '#ff1744'], pSize); 
    sprites.wanderer_swarm = createPixelTexture([[1,0,0,0,1],[0,1,2,1,0],[0,1,1,1,0],[1,2,3,2,1],[1,1,1,1,1],[0,1,0,1,0]], ['#4a148c', '#ab47bc', '#00b0ff'], pSize); 
    sprites.wanderer_healer = createPixelTexture([[1,0,0,0,1],[0,1,2,1,0],[0,1,1,1,0],[1,2,3,2,1],[1,1,1,1,1],[0,1,0,1,0]], ['#1b5e20', '#4caf50', '#b2ff59'], pSize);
    
    sprites.kamikaze_idle = createPixelTexture([[0,0,1,0,0],[0,1,2,1,0],[1,1,2,1,1],[1,0,1,0,1]], ['#ffaa00', '#ffeb3b'], pSize);
    sprites.kamikaze_warn = createPixelTexture([[0,0,1,0,0],[0,1,2,1,0],[1,1,2,1,1],[1,0,1,0,1]], ['#ff1744', '#ffeb3b'], pSize); 
    sprites.kamikaze_swarm_idle = createPixelTexture([[0,0,1,0,0],[0,1,2,1,0],[1,1,2,1,1],[1,0,1,0,1]], ['#d500f9', '#f57f17'], pSize); 
    sprites.kamikaze_swarm_warn = createPixelTexture([[0,0,1,0,0],[0,1,2,1,0],[1,1,2,1,1],[1,0,1,0,1]], ['#d500f9', '#f57f17'], pSize);
    sprites.kamikaze_special_idle = createPixelTexture([[0,0,1,0,0],[0,1,2,1,0],[1,1,2,1,1],[1,0,1,0,1]], ['#7f0000', '#b71c1c'], 4); 
    sprites.kamikaze_special_warn = createPixelTexture([[0,0,1,0,0],[0,1,2,1,0],[1,1,2,1,1],[1,0,1,0,1]], ['#ffffff', '#ff1744'], 4);
    
    sprites.turret = createPixelTexture([[1,1,1,1,1,1],[1,2,2,2,2,1],[1,2,3,3,2,1],[1,2,2,2,2,1],[0,1,1,1,1,0]], ['#424242', '#757575', '#ff1744'], pSize);
    sprites.turret_swarm = createPixelTexture([[1,1,1,1,1,1],[1,2,2,2,2,1],[1,2,3,3,2,1],[1,2,2,2,2,1],[0,1,1,1,1,0]], ['#4a148c', '#ab47bc', '#00b0ff'], pSize);
    sprites.turret_healer = createPixelTexture([[1,1,1,1,1,1],[1,2,2,2,2,1],[1,2,3,3,2,1],[1,2,2,2,2,1],[0,1,1,1,1,0]], ['#1b5e20', '#4caf50', '#b2ff59'], pSize);
    
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
