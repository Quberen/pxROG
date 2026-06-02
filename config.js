// === config.js ===
// 纯净数据库：存放系统级开关、UI 枚举、静态文本与像素贴图矩阵
// (注意：数值与关卡逻辑已移交 mod_workshop.js 管理)

const config = { 
    dmgText: true, shake: true, controlOffsetY: 90, controlMode: 'relative', controlSens: 1.5, touchMode: 'single' 
};

const DIFF_CONFIG = [
    { name: "简单", desc: "简单：新手引导。初盘保护 45 秒。", hpMod: 0.8, dmgMod: 1.0, spawnMod: 0.8, ptMod: 1.2, p_hp: 100, p_dmg: 12, maxEnemies: 20, protectionTime: 45 },
    { name: "普通", desc: "普通：标准战斗。初盘保护 30 秒。", hpMod: 1.0, dmgMod: 1.0, spawnMod: 1.0, ptMod: 1.0, p_hp: 100, p_dmg: 12, maxEnemies: 35, protectionTime: 30 },
    { name: "困难", desc: "困难：高压集群。初盘保护 20 秒。", hpMod: 1.5, dmgMod: 1.0, spawnMod: 1.5, ptMod: 1.0, p_hp: 100, p_dmg: 12, maxEnemies: 50, protectionTime: 20 },
    { name: "深渊", desc: "深渊：残血高密度。初盘保护 15 秒。", hpMod: 1.5, dmgMod: 1.0, spawnMod: 1.5, ptMod: 1.0, p_hp: 80,  p_dmg: 8, maxEnemies: 70, protectionTime: 15 }
];

const RARITY = { C: { name: '普通', color: '#fff', weight: 80 }, R: { name: '稀有', color: '#00b0ff', weight: 15 }, E: { name: '史诗', color: '#ab47bc', weight: 5 }, L: { name: '传说', color: '#ffea00', weight: 5 } };
const TYPE_TAGS = { 'equip': { label: '装' }, 'stat': { label: '属' }, 'utility': { label: '辅' } };

const SHIPS = {
    rt1: {
        name: '拯救者', nameEn: 'RT-1 RESCUER',
        desc: '均衡型战机。三联分体僚机独立索敌，双翼副武器覆盖广。',
        shootSlots: 1,
        wingmanGroups: [1, 1, 1],
        subweaponGroups: [2, 2],
        initSlots: 5,
        sprite: 'player'
    },
    rtg2: {
        name: 'RTG-II', nameEn: 'RTG-II',
        desc: '双炮战机。双槽僚机始终锁定同一目标，副武器搭载受限。',
        shootSlots: 2,
        wingmanGroups: [2],
        subweaponGroups: [1],
        initSlots: 4,
        sprite: 'player_exp'
    }
};

const WINGMAN_TYPES = {
    as1: { id: 'as1', name: 'AS-1',  desc: '自爆机。弧线突袭敌人，接触引爆。',               color: '#ffea00' },
    ds1: { id: 'ds1', name: 'DS-1',  desc: '拦截者。护卫机体，每3秒拦截最近敌人子弹。',     color: '#00b0ff' }
};
const SUBWEAPON_TYPES = {
    rfa:     { id: 'rfa',     name: 'RF-A',        desc: '自动机枪。每0.4秒攻击最近敌人，伤害0.5。', color: '#ff9800' },
    avenger: { id: 'avenger', name: "AS'AVENGER'", desc: '制导导弹。手动发射，35伤害+25溅射，装填6秒。', color: '#ab47bc' }
};

// 【动态拼装】：从工坊读取数值，拼装为引擎可用的敌人数组
const ENEMY_TYPES = Object.keys(WORKSHOP.data.enemies).map(key => {
    return { type: key, ...WORKSHOP.data.enemies[key] };
});

// 【数据混入】：保留静态描述，混入工坊里的价格与等级上限
const baseUpgradePool = [
{ id: 'high_explosive', type: 'equip', name: '高能弹头',  slotCost: 1, rarity: 'R', prices: [3,5,10,15,19], max: 5, desc: '弹头伤害提升。每级+20%基础伤害。' },
{ id: 'spread',         type: 'equip', name: '散弹模组',  slotCost: 2, rarity: 'R', prices: [3,6,9,16],    max: 4, desc: '发射扇形散弹。分弹头伤害为主弹80%。' },
{ id: 'skill_duration', type: 'upgrade', name: '超频运转', rarity: 'R', cost: 3, max: 3, desc: '技能持续时间+1秒/级。' },
{ id: 'burst_core',     type: 'equip', name: '连发核心',  slotCost: 1, rarity: 'E', initialCost: 2,   cost: 3.0, costStep: 2, max: 3, desc: '射速大幅提升。每级额外缩短射击间隔。' },

    { id: 'heal',       type: 'utility', name: '紧急修复', rarity: 'C', unlockPT: 0,    unlockTime: 0,   desc: '立刻固定恢复20点耐久度。' },
    { id: 'heal_up',    type: 'utility', name: '修复增幅', rarity: 'C', unlockPT: 0,    unlockTime: 0,   prices: [2,4,6,9,12], desc: '血包恢复量+80%/级。' },
    { id: 'magnet',     type: 'utility', name: '引力场',   rarity: 'C', unlockPT: 0,    unlockTime: 0,   desc: '扩大能量晶体与补给的拾取范围。' },
    { id: 'crit_rate',  type: 'stat',    name: '精准校准', rarity: 'C', unlockPT: 1.0,  unlockTime: 0,   prices: [2,4,6,8,10],  desc: '暴击概率+5%/级。' },
    { id: 'crit_dmg',   type: 'stat',    name: '弱点分析', rarity: 'C', unlockPT: 2.0,  unlockTime: 0,   prices: [2,5,7,9,12],  desc: '暴击伤害+25%/级。' },
    { id: 'aoe',        type: 'equip',   name: '高爆弹头', slotCost: 2, rarity: 'E', initialCost: 3.0, unlockPT: 8.0,  unlockTime: 60,  desc: '部分攻击引发大范围爆炸。' },
    { id: 'wingman',    type: 'stat',    name: '战斗僚机', shopHidden: true, rarity: 'E', unlockPT: 12.0, unlockTime: 90, prices: [9,16,24], desc: '强化战斗僚机系统，提升伤害与冷却效率。' },
    { id: 'slot',       type: 'utility', name: '系统插槽', rarity: 'R', unlockPT: 2.0,  unlockTime: 0,   desc: '背包容量扩充，+1 装备插槽。' },

    { id: 'homing',   type: 'equip', name: '追踪模块', rarity: 'E', slotCost: 2, unlockPT: 5.0,  unlockTime: 60,  initialCost: 2.5, desc: '子弹弱追踪敌机。升级提升制导强度。' },
    { id: 'pulse',    type: 'equip', name: '脉冲发射', rarity: 'R', slotCost: 2, unlockPT: 4.0,  unlockTime: 60,  desc: '点射模式。升级缩短发射间隔。' },
    { id: 'laser',    type: 'equip', name: '高能激光', rarity: 'E', slotCost: 3, unlockPT: 15.0, unlockTime: 120, initialCost: 5.0, desc: '发射贯穿屏障的高频光束。' },
    { id: 'pierce',   type: 'equip', name: '穿透弹头', rarity: 'E', slotCost: 1, unlockPT: 4.0,  unlockTime: 60,  desc: '子弹穿透敌机。升级降低衰减并增加穿透数。' },

    { id: 'rapid_charge', type: 'stat',    name: '快速充能', rarity: 'C', unlockPT: 1.0,  unlockTime: 0,  prices: [2,3,5,7,12], desc: '拾取能量晶体获得+15%额外充能/级。' },
    { id: 'phase_dodge',  type: 'stat',    name: '相位闪避', rarity: 'E', unlockPT: 3.0,  unlockTime: 30, prices: [2,4,6,15],   desc: '受伤减免+2/2/2/4%（满级共-10%）。' },
    { id: 'afterburn',    type: 'equip',   name: '余烬',     slotCost: 1, rarity: 'R', prices: [5,9,18], unlockPT: 5.0, unlockTime: 60, desc: '子弹命中后留下燃烧区域，以绝对值灼烧。' },
    { id: 'shield_gen',   type: 'utility', name: '屏障再生', rarity: 'R', unlockPT: 1.5,  unlockTime: 0,  desc: '每次休整波次结束时回复8%最大HP/级。' },
    { id: 'skill_cd',     type: 'upgrade', name: '超频缩减', rarity: 'C', unlockPT: 2.0,  unlockTime: 0,  prices: [2,4,6,9,12], desc: '技能冷却时间-10%/级（最多-50%）。' },
    { id: 'temp_armor',   type: 'utility', name: '临时装甲', rarity: 'R', unlockPT: 0,    unlockTime: 0,  prices: [4],  max: 999, desc: '一次性获得50点临时护甲（最多3层=150）。' }
];

const upgradePool = baseUpgradePool.map(item => {
    return { ...item, ...(WORKSHOP.data.items[item.id] || {}) };
});

function getHpMaxBoost(level) {
    if(level === 0) return 0; if(level === 1) return 30; if(level === 2) return 60; return 100;
}

const TECH_TREE = [
    { id: 'root',      branch: 'root', maxLevel: 4, costs: [3, 8, 18, 35],
      prereq: null,    minRootLevel: 0,
      name: '系统核心', desc: 'Lv.1一阶 · Lv.2二阶 · Lv.3三阶 · Lv.4特化' },
    { id: 'atk_dmg',   branch: 'atk', maxLevel: 3, costs: [4, 8, 14],
      prereq: 'root',  minRootLevel: 1, name: '基础攻击',  desc: '1级+2·2级再+3·3级再+4（基础伤害平值）' },
    { id: 'atk_crit',  branch: 'atk', maxLevel: 1, costs: [18],
      prereq: 'atk_dmg', minRootLevel: 4, name: '暴击锐化', desc: '暴击时伤害额外×2' },
    { id: 'def_red',   branch: 'def', maxLevel: 3, costs: [4, 8, 14],
      prereq: 'root',  minRootLevel: 1, name: '伤害减免',  desc: '每级受伤减少5%' },
    { id: 'def_dodge', branch: 'def', maxLevel: 3, costs: [12, 18, 28],
      prereq: 'def_red', minRootLevel: 4, name: '概率免伤', desc: '每级+10%受击完全免疫概率' },
    { id: 'hp_max',    branch: 'hp',  maxLevel: 3, costs: [4, 8, 14],
      prereq: 'root',  minRootLevel: 1, name: '最大血量',  desc: '每级最大HP+20' },
    { id: 'hp_regen',  branch: 'hp',  maxLevel: 3, costs: [6, 10, 16],
      prereq: 'hp_max', minRootLevel: 4, name: '纳米修复', desc: '每级每60帧回1HP' },
    { id: 'spd_rate',  branch: 'spd', maxLevel: 3, costs: [4, 8, 14],
      prereq: 'root',  minRootLevel: 1, name: '基础射速',  desc: '每级射速+10%' },
    { id: 'spd_skill', branch: 'spd', maxLevel: 1, costs: [18],
      prereq: 'spd_rate', minRootLevel: 4, name: '技能超载', desc: '技能激活期间射速额外+50%' },
];

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
    sprites.player_exp = createPixelTexture([[0,0,1,0,0,0,0,0,1,0,0],[0,1,2,1,0,0,0,1,2,1,0],[0,1,2,1,0,1,0,1,2,1,0],[1,2,2,2,1,2,1,2,2,2,1],[1,2,2,2,2,3,2,2,2,2,1],[1,1,2,2,1,1,1,2,2,1,1],[1,1,1,1,1,1,1,1,1,1,1],[0,1,3,1,0,0,0,1,3,1,0]], ['#ffffff', '#00b0ff', '#00e676'], pSize);
    sprites.hp = createPixelTexture([[0,1,0],[1,2,1],[0,1,0]], ['#00e676', '#ffffff'], pSize);
    
    sprites.pt_shard = createPixelTexture([[1]], ['#eeeeee'], 3);
    sprites.pt_core = createPixelTexture([[0,1,0],[1,2,1],[0,1,0]], ['#ffffff', '#e0e0e0'], 3);
    sprites.energy_crystal = createPixelTexture([[0,1,0],[1,2,1],[0,1,0]], ['#00e5ff', '#ffffff'], 3);
    
    sprites.crystal_locator = createPixelTexture([[1,0,0,0,1],[0,1,2,1,0],[1,2,3,2,1],[0,1,2,1,0],[0,1,0,1,0]], ['#90a4ae', '#cfd8dc', '#ffffff'], 3);
    sprites.node_fire  = createPixelTexture([[0,0,1,0,0],[0,1,2,1,0],[1,2,2,2,1],[0,1,2,1,0],[0,0,1,0,0]], ['#ff5722', '#ff8a65'], 3);
    sprites.node_def   = createPixelTexture([[0,1,1,1,0],[1,2,2,2,1],[1,2,2,2,1],[0,1,2,1,0],[0,0,1,0,0]], ['#1565c0', '#42a5f5'], 3);
    sprites.node_tech  = createPixelTexture([[0,0,1,0,0],[0,1,2,1,0],[1,2,1,2,1],[0,1,2,1,0],[0,0,1,0,0]], ['#2e7d32', '#66bb6a'], 3);
    sprites.pale_crystal = createPixelTexture([[0,1,0],[1,2,1],[0,1,0]], ['#e0f7fa', '#ffffff'], 3);
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
'default': createPixelTexture([[1,1,1,1],[1,0,0,1],[1,0,0,1],[1,1,1,1]], ['#888888'], 3)
    };

    sprites.i_pause = createPixelTexture([[0,0,0,0,0,0,0],[0,1,1,0,1,1,0],[0,1,1,0,1,1,0],[0,1,1,0,1,1,0],[0,1,1,0,1,1,0],[0,0,0,0,0,0,0]], ['#fff'], 2);
    sprites.i_shop = createPixelTexture([[1,1,1,0,0,0,0,0],[0,0,1,1,1,1,1,0],[0,0,1,2,2,2,1,1],[0,0,1,2,2,2,1,0],[0,0,1,1,1,1,1,0],[0,0,0,1,0,1,0,0],[0,0,1,1,0,1,1,0]], ['#fff', '#00b0ff'], 2);
    sprites.i_loadout = createPixelTexture([[0,0,1,1,1,1,0,0],[0,1,2,2,2,2,1,0],[1,2,3,3,3,3,2,1],[1,2,3,3,3,3,2,1],[1,2,2,2,2,2,2,1],[0,1,1,1,1,1,1,0]], ['#fff', '#aaa', '#00e676'], 2);
    sprites.i_skill = createPixelTexture([[0,0,0,1,1,0,0],[0,0,1,1,0,0,0],[0,1,1,0,0,0,0],[0,1,1,1,1,0,0],[0,0,0,1,1,0,0],[0,0,1,1,0,0,0],[0,1,1,0,0,0,0]], ['#fff'], 2);
    sprites.i_avenger = createPixelTexture([
        [0,0,1,1,0,0],
        [0,1,0,0,1,0],
        [0,1,0,0,1,0],
        [1,1,0,0,1,1],
        [0,1,0,0,1,0],
        [0,0,1,1,0,0],
        [0,0,1,1,0,0]
    ], ['#ffffff'], 4);
    sprites.i_avenger_orange = createPixelTexture([
        [0,0,1,1,0,0],
        [0,1,1,1,1,0],
        [0,1,1,1,1,0],
        [1,1,1,1,1,1],
        [0,1,1,1,1,0],
        [0,0,1,1,0,0],
        [0,0,1,1,0,0]
    ], ['#ff9800'], 2);
}
