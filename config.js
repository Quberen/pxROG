// === config.js ===
// 纯净数据库：存放系统级开关、UI 枚举、静态文本与像素贴图矩阵
// (注意：数值与关卡逻辑已移交 mod_workshop.js 管理)

const config = { 
    dmgText: true, shake: true, controlOffsetY: 90, controlMode: 'relative', controlSens: 1.5, touchMode: 'single' 
};

const DIFF_CONFIG = [
    { name: "新兵", desc: "简单：新手教学。初盘保护 45 秒。", hpMod: 0.8, dmgMod: 1.0, spawnMod: 0.8, ptMod: 1.2, p_hp: 100, p_dmg: 12, maxEnemies: 20, protectionTime: 45 },
    { name: "老手", desc: "普通：标准战斗。初盘保护 30 秒。", hpMod: 1.0, dmgMod: 1.0, spawnMod: 1.0, ptMod: 1.0, p_hp: 100, p_dmg: 12, maxEnemies: 35, protectionTime: 30 },
    { name: "精英", desc: "困难：高压集群。初盘保护 20 秒。", hpMod: 1.5, dmgMod: 1.0, spawnMod: 1.5, ptMod: 1.0, p_hp: 100, p_dmg: 12, maxEnemies: 50, protectionTime: 20 },
    { name: "深渊", desc: "深渊：残血高物价。初盘保护 15 秒。", hpMod: 1.5, dmgMod: 1.25, spawnMod: 1.5, ptMod: 0.8, p_hp: 80,  p_dmg: 8, maxEnemies: 70, protectionTime: 15 }
];

const RARITY = { C: { name: '普通', color: '#fff', weight: 50 }, R: { name: '稀有', color: '#00b0ff', weight: 30 }, E: { name: '史诗', color: '#ab47bc', weight: 15 }, L: { name: '传说', color: '#ffea00', weight: 5 } };
const TYPE_TAGS = { 'equip': { label: '装' }, 'stat': { label: '属' }, 'utility': { label: '辅' } };

// 【动态拼装】：从工坊读取数值，拼装为引擎可用的敌人数组
const ENEMY_TYPES = Object.keys(WORKSHOP.data.enemies).map(key => {
    return { type: key, ...WORKSHOP.data.enemies[key] };
});

// 【数据混入】：保留静态描述，混入工坊里的价格与等级上限
const baseUpgradePool = [
    { id: 'damage', type: 'stat', name: '高能弹头', rarity: 'R', unlockPT: 0, unlockTime: 0, desc: '单发基础杀伤力+6，子弹略微变大。' },
    { id: 'heal', type: 'utility', name: '紧急修复', rarity: 'C', unlockPT: 0, unlockTime: 0, desc: '立刻固定恢复20点耐久度。' },
    { id: 'heal_up', type: 'utility', name: '修复增幅', rarity: 'R', unlockPT: 0, unlockTime: 0, desc: '增加血包恢复量(+5%)。' },
    { id: 'magnet', type: 'utility', name: '引力场', rarity: 'C', unlockPT: 0, unlockTime: 0, desc: '扩大能量晶体与补给的拾取范围。' },
    { id: 'crit_rate', type: 'stat', name: '精准校准', rarity: 'R', unlockPT: 1.0, unlockTime: 0, desc: '暴击概率提升5%。' },
    { id: 'crit_dmg', type: 'stat', name: '弱点分析', rarity: 'E', unlockPT: 2.0, unlockTime: 0, desc: '暴击伤害提升20%。' },
    { id: 'healer_rate', type: 'utility', name: '补给雷达', rarity: 'E', unlockPT: 2.0, unlockTime: 30, desc: '增加携带修复包的机体概率(+3%)。' }, 
    { id: 'aoe', type: 'stat', name: '高爆弹头', rarity: 'L', unlockPT: 8.0, unlockTime: 60, desc: '部分攻击能引发大范围爆炸。' }, 
    { id: 'wingman', type: 'stat', name: '战斗僚机', rarity: 'L', unlockPT: 12.0, unlockTime: 90, desc: '部署一台自动攻击敌人的浮游炮。' },
    { id: 'slot', type: 'utility', name: '系统插槽', rarity: 'L', unlockPT: 2.0, unlockTime: 0, desc: '背包容量扩充，+1 装备插槽。' }, 
    
    { id: 'hp_max', type: 'equip', name: '装甲重塑', rarity: 'E', slotCost: 1, unlockPT: 0, unlockTime: 0, desc: '提升血量上限(30-30-40)。获取时自动回复对应血量。' },
    { id: 'speed', type: 'equip', name: '连发核心', rarity: 'R', slotCost: 1, unlockPT: 0, unlockTime: 0, desc: '提升基础射速。升级达到极致。' }, 
    { id: 'spread', type: 'equip', name: '散弹模组', rarity: 'R', slotCost: 2, unlockPT: 3.0, unlockTime: 45, desc: '发射散弹。升级降低伤害惩罚。' },
    { id: 'homing', type: 'equip', name: '追踪模块', rarity: 'E', slotCost: 2, unlockPT: 5.0, unlockTime: 60, desc: '子弹弱追踪。升级提升制导。' },
    { id: 'pulse', type: 'equip', name: '脉冲发射', rarity: 'R', slotCost: 2, unlockPT: 4.0, unlockTime: 60, desc: '点射模式。升级缩短发射间隔。' },
    { id: 'laser', type: 'equip', name: '高能激光', rarity: 'L', slotCost: 3, unlockPT: 15.0, unlockTime: 120, desc: '发射贯穿屏障的高频光束。' },
    { id: 'pierce', type: 'equip', name: '穿透弹头', rarity: 'E', slotCost: 1, unlockPT: 4.0, unlockTime: 60, desc: '子弹可穿透敌机。升级降低衰减并增加穿透次数。' },
    { id: 'debt_protocol', type: 'equip', name: '恶魔剥削', rarity: 'E', initialCost: 0, cost: 0, costStep: 0, max: 1, slotCost: 0, canUnequip: false, unlockPT: 3.0, unlockTime: 60, desc: '立刻获得 3.0 PT。绑定外置槽不可卸下。代价：火力永久衰减20%。' }
];

const upgradePool = baseUpgradePool.map(item => {
    return { ...item, ...(WORKSHOP.data.items[item.id] || {}) };
});

function getHpMaxBoost(level) {
    if(level === 0) return 0; if(level === 1) return 30; if(level === 2) return 60; return 100;
}

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

    sprites.i_pause = createPixelTexture([[0,0,0,0,0,0,0],[0,1,1,0,1,1,0],[0,1,1,0,1,1,0],[0,1,1,0,1,1,0],[0,1,1,0,1,1,0],[0,0,0,0,0,0,0]], ['#fff'], 2);
    sprites.i_shop = createPixelTexture([[1,1,1,0,0,0,0,0],[0,0,1,1,1,1,1,0],[0,0,1,2,2,2,1,1],[0,0,1,2,2,2,1,0],[0,0,1,1,1,1,1,0],[0,0,0,1,0,1,0,0],[0,0,1,1,0,1,1,0]], ['#fff', '#00b0ff'], 2);
    sprites.i_loadout = createPixelTexture([[0,0,1,1,1,1,0,0],[0,1,2,2,2,2,1,0],[1,2,3,3,3,3,2,1],[1,2,3,3,3,3,2,1],[1,2,2,2,2,2,2,1],[0,1,1,1,1,1,1,0]], ['#fff', '#aaa', '#00e676'], 2);
    sprites.i_skill = createPixelTexture([[0,0,0,1,1,0,0],[0,0,1,1,0,0,0],[0,1,1,0,0,0,0],[0,1,1,1,1,0,0],[0,0,0,1,1,0,0],[0,0,1,1,0,0,0],[0,1,1,0,0,0,0]], ['#fff'], 2);
}
