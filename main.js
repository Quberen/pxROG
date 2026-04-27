// === main.js ===

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d', { alpha: false });
let width, height;

let overlayHistory = 'START'; 
let hitStopFrames = 0; 
let flashScreenTimer = 0; let flashScreenColor = '255,0,0';
let currentLevel = 'debug';

let currentDifficulty = 0;
let unlockedDifficulty = 0;
let abyssCleared = false;
try { 
    unlockedDifficulty = parseInt(localStorage.getItem('pixelRogueUnlockedDiff') || '0'); 
    abyssCleared = localStorage.getItem('pixelRogueAbyssCleared') === 'true';
} catch(e) {}

const screens = { 
    start: document.getElementById('start-screen'), settings: document.getElementById('settings-menu'), 
    pause: document.getElementById('pause-menu'), shop: document.getElementById('shop-menu'), 
    loadout: document.getElementById('loadout-menu'), gameOver: document.getElementById('game-over-screen') 
};

const ui = { 
    hpVal: document.getElementById('hud-hp-val'), ptVal: document.getElementById('hud-pt-val'), 
    indCvs: document.getElementById('hud-indicator'),
    bossHpCont: document.getElementById('boss-hp-container'), bossHpDelay: document.getElementById('boss-hp-delay'), bossHpFill: document.getElementById('boss-hp-fill'), bossToast: document.getElementById('boss-name-toast'),
    shopCards: document.getElementById('shop-cards'), shopPts: document.getElementById('shop-pts'), refreshBtn: document.getElementById('refresh-btn'),
    finalScore: document.getElementById('final-score'), pauseScore: document.getElementById('pause-score-display'), dmgBtn: document.getElementById('toggle-dmg-btn'), shakeBtn: document.getElementById('toggle-shake-btn'),
    loadoutSlotsText: document.getElementById('loadout-slots-text'), coreSlotsGrid: document.getElementById('core-slots-grid'), extSlotsGrid: document.getElementById('ext-slots-grid'), inventoryList: document.getElementById('loadout-inventory-list'),
    sysMessage: document.getElementById('system-message'),
    topLeftCont: document.getElementById('hud-top-left'),
    topRightCont: document.getElementById('hud-top-right'),
    sideBtns: document.getElementById('side-btns-container')
};

let shopBtnRect = {x:0, y:0}; let skillBtnRect = {x:0, y:0};
function updateUIRects() {
    let sR = document.getElementById('shop-btn-cvs').getBoundingClientRect(); shopBtnRect = {x: sR.left + sR.width/2, y: sR.top + sR.height/2};
    let skR = document.getElementById('skill-btn-cvs').getBoundingClientRect(); skillBtnRect = {x: skR.left + skR.width/2, y: skR.top + skR.height/2};
}

let gameState = 'START'; 
let player;
let bullets = [], enemyBullets = [], enemies = [], particles = [], items = [], floatingTexts = [], stars = [], aoeEffects = [];
let score = 0, frameCount = 0, gameTimeSeconds = 0;
let shakeTimer = 0, shakeIntensity = 0; 
let comboCount = 0; let comboTimer = 0; const maxComboTimer = 90; 
let endingState = 'none'; let endingTimer = 0;

let directorPoints = 0; let difficultyScore = 1.0; 
let specialKamikazeMisses = 0;
let levelHpMultiplier = 1.0;
let isBossSpawned = false;

let directorState = 'BUILDUP'; let directorStateTimer = 0;
let healWaveEnemyType = null;

let uiOffsets = { hp: {x:0, y:0, vx:0, vy:0}, pt: {x:0, y:0, vx:0, vy:0} };

const BASE_REFRESH_COST = 1.0; let currentRefreshCost = BASE_REFRESH_COST; let currentShopItems = [];
let taggedItemId = null; 

function initDifficultyUI() {
    if(unlockedDifficulty >= 2) document.getElementById('diff-nightmare').classList.remove('locked');
    selectDifficulty(Math.min(currentDifficulty, unlockedDifficulty >= 2 ? 3 : 2));
}

function selectDifficulty(level) {
    if (level === 3 && unlockedDifficulty < 2) return; 
    currentDifficulty = level;
    document.querySelectorAll('.diff-btn').forEach((btn, idx) => {
        if(idx === level) btn.classList.add('selected'); else btn.classList.remove('selected');
    });
    document.getElementById('diff-desc').innerText = DIFF_CONFIG[level].desc;
    if(level === 3) document.getElementById('diff-desc').style.color = '#ff1744';
    else document.getElementById('diff-desc').style.color = '#ffeb3b';
}

function unlockNextDifficulty() {
    if (currentDifficulty >= 1 && unlockedDifficulty < 2) {
        unlockedDifficulty = 2; try { localStorage.setItem('pixelRogueUnlockedDiff', '2'); } catch(e) {}
    }
    if (currentDifficulty === 3) {
        abyssCleared = true; try { localStorage.setItem('pixelRogueAbyssCleared', 'true'); } catch(e) {}
    }
}

function drawIndicator(color) {
    let ic = ui.indCvs.getContext('2d'); ic.clearRect(0,0,16,16);
    ic.fillStyle = '#222'; ic.beginPath(); ic.arc(8,8,6,0,Math.PI*2); ic.fill();
    ic.fillStyle = color; ic.beginPath(); ic.arc(8,8,4,0,Math.PI*2); ic.fill();
    ic.fillStyle = '#fff'; ic.fillRect(6,5,2,2); 
}

function drawPixelButton(id, icon, progress, color) {
    let cvs = document.getElementById(id); if(!cvs) return;
    let ctx = cvs.getContext('2d'); ctx.clearRect(0,0,48,48);
    
    ctx.fillStyle = '#111'; ctx.fillRect(4,4,40,40);

    if (progress > 0) {
        ctx.fillStyle = color;
        ctx.globalAlpha = progress >= 1 ? 0.6 : 0.4;
        let fillH = Math.floor(40 * Math.min(1, progress));
        ctx.fillRect(4, 44 - fillH, 40, fillH);
        ctx.globalAlpha = 1.0;
    }

    ctx.fillStyle = '#555'; 
    ctx.fillRect(4,0,40,4); ctx.fillRect(4,44,40,4); 
    ctx.fillRect(0,4,4,40); ctx.fillRect(44,4,4,40); 
    ctx.fillRect(2,2,4,4); ctx.fillRect(42,2,4,4); ctx.fillRect(2,42,4,4); ctx.fillRect(42,42,4,4); 

    if(icon) ctx.drawImage(icon, 24 - icon.width/2, 24 - icon.height/2);
}

let offsetCanvas = document.getElementById('offsetCanvas');
let offsetCtx = offsetCanvas.getContext('2d');

function drawOffsetWidget() {
    offsetCtx.clearRect(0, 0, 80, 80);
    offsetCtx.beginPath(); offsetCtx.arc(40, 40, 35, 0, Math.PI * 2);
    offsetCtx.strokeStyle = '#444'; offsetCtx.lineWidth = 4; offsetCtx.stroke();
    offsetCtx.beginPath();
    let pct = Math.min(1, Math.max(0, config.controlOffsetY / 200));
    offsetCtx.arc(40, 40, 35, -Math.PI/2, -Math.PI/2 + (Math.PI * 2 * pct));
    offsetCtx.strokeStyle = '#00e676'; offsetCtx.stroke();
    document.getElementById('offset-val').innerText = config.controlOffsetY;
}

let offsetDragging = false; let lastTouchX = 0, lastTouchY = 0;
document.getElementById('offset-widget').addEventListener('touchstart', e => {
    offsetDragging = true; lastTouchX = e.touches[0].clientX; lastTouchY = e.touches[0].clientY; e.preventDefault();
}, {passive: false});
window.addEventListener('touchmove', e => {
    if (!offsetDragging) return;
    let dx = e.touches[0].clientX - lastTouchX; let dy = lastTouchY - e.touches[0].clientY; 
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        let valChange = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 2 : -2) : (dy > 0 ? 2 : -2);
        config.controlOffsetY = Math.max(0, Math.min(200, config.controlOffsetY + valChange));
        drawOffsetWidget(); lastTouchX = e.touches[0].clientX; lastTouchY = e.touches[0].clientY;
    }
}, {passive: false});
window.addEventListener('touchend', () => offsetDragging = false);

function switchSettingsTab(tabId) {
    document.getElementById('tab-game').classList.add('hidden'); document.getElementById('tab-control').classList.add('hidden');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('tab-' + tabId).classList.remove('hidden');
    document.querySelector(`.tab-btn[onclick="switchSettingsTab('${tabId}')"]`).classList.add('active');
    if (tabId === 'control') drawOffsetWidget();
}

function triggerShake(intensity, duration) { if (!config.shake) return; shakeIntensity = intensity; shakeTimer = duration; }

function showSystemMessage(msg, color) {
    ui.sysMessage.innerText = msg; ui.sysMessage.style.color = color; ui.sysMessage.style.opacity = 1;
    setTimeout(() => { ui.sysMessage.style.opacity = 0; }, 3000);
}

function startEnding(type) {
    if(endingState !== 'none') return;
    endingState = type;
    if (type === 'playerDead') {
        endingTimer = 120; createExplosion(player.x, player.y, '#00b0ff', 60); triggerShake(20, 30);
    } else if (type === 'bossDead') {
        endingTimer = 240; triggerShake(25, 240);
    }
}

function initStars() { stars = []; for(let i=0; i<60; i++) stars.push({ x: Math.random() * width, y: Math.random() * height, speed: 0.4 + Math.random() * 2.5, size: Math.random() > 0.7 ? 2 : 1, alpha: 0.5 + Math.random() * 0.5 }); }
function updateAndDrawStars(ctx, isPlaying) {
    ctx.fillStyle = '#ffffff';
    stars.forEach(star => { if(isPlaying && hitStopFrames <= 0) star.y += star.speed; if (star.y > height) { star.y = 0; star.x = Math.random() * width; } ctx.globalAlpha = star.alpha; ctx.fillRect(star.x, star.y, star.size, star.size); });
    ctx.globalAlpha = 1;
}

function activateSkill() {
    if (player.skillEnergy >= player.maxSkillEnergy && player.skillCdTimer <= 0 && player.skillActiveTimer <= 0) {
        player.skillEnergy = 0;
        player.skillActiveTimer = 600; 
        triggerShake(10, 10);
        flashScreenTimer = 15;
        flashScreenColor = '0, 229, 255';
        updateHUD();
    }
}

// 增强弹性系数，为接下来的高速位移做准备
function applyElastic(obj, targetNode) {
    obj.vx -= obj.x * 0.7; 
    obj.vy -= obj.y * 0.7;
    obj.vx *= 0.6;        
    obj.vy *= 0.6;
    obj.x += obj.vx; obj.y += obj.vy;
    targetNode.style.transform = `translate(${obj.x}px, ${obj.y}px)`;
}

function updatePixelButtons() {
    if(!player) return;
    let skProg = player.skillActiveTimer > 0 ? (player.skillActiveTimer/600) : (player.skillCdTimer > 0 ? (1 - player.skillCdTimer/900) : player.skillEnergy / player.maxSkillEnergy);
    let skColor = player.skillActiveTimer > 0 ? '#00e5ff' : (player.skillCdTimer > 0 ? '#ff1744' : (player.skillEnergy >= player.maxSkillEnergy ? '#ffea00' : '#00b0ff'));
    
    drawPixelButton('skill-btn-cvs', sprites.i_skill, skProg, skColor);
    drawPixelButton('loadout-btn-cvs', sprites.i_loadout, 0, '#fff');
    drawPixelButton('shop-btn-cvs', sprites.i_shop, 0, '#fff');
    drawPixelButton('pause-btn-cvs', sprites.i_pause, 0, '#fff');
}

function updateHUD() {
    if (!player) return;

    applyElastic(uiOffsets.hp, ui.hpVal);
    
    if (player.hp / player.maxHp < 0.3 && frameCount % 4 === 0) {
        uiOffsets.hp.vx += (Math.random()-0.5)*5;
        uiOffsets.hp.vy += (Math.random()-0.5)*5;
    }

    ui.ptVal.innerText = `${player.pt.toFixed(1)} PT`;
    const hpPercent = Math.max(0, player.hp / player.maxHp);
    
    let hpColor = '#e60050';
    if (hpPercent > 0.7) hpColor = '#00e676';
    else if (hpPercent > 0.4) hpColor = '#ffea00';
    else if (hpPercent > 0.2) hpColor = '#ff9800';

    ui.hpVal.style.color = hpColor;
    
    // 【新设定】：血量永远显示实际数值的百分比，可以直接突破100%
    ui.hpVal.innerText = `${Math.floor(player.hp)}%`;

    // 【新设定】：无尽模式渐变色危险指示灯
    let indColor = '#00e676';
    if (currentLevel === 'sector1') {
        let progress = Math.min(1, gameTimeSeconds / LEVELS['sector1'].duration);
        if(isBossSpawned) indColor = '#ff1744';
        else if(progress > 0.8) indColor = '#ff9800';
        else if(progress > 0.4) indColor = '#ffea00';
    } else {
        if (directorState === 'COOLDOWN') {
            if (!healWaveEnemyType) indColor = '#ffea00'; // 黄色：停火警戒，等待清场
            else indColor = '#00e5ff'; // 科技蓝：补给波次正在下达
        } else {
            // BUILDUP：根据压力指数，进行丝滑的 绿 -> 黄 -> 红 渐变
            let pressure = Math.min(1, directorPoints / 25);
            let r = 0, g = 0;
            if (pressure < 0.5) {
                r = Math.floor(0 + 255 * (pressure * 2));
                g = 230;
            } else {
                r = 255;
                g = Math.floor(230 * (1 - (pressure - 0.5) * 2));
            }
            indColor = `rgb(${r}, ${g}, 50)`;
        }
    }
    drawIndicator(indColor);
    updatePixelButtons();
}

function getShopCost(opt) {
    if (opt.type === 'equip') {
        let baseCst = (!player.equipment[opt.id].owned) ? opt.initialCost : opt.cost + player.equipment[opt.id].level * opt.costStep;
        return parseFloat((baseCst * (currentDifficulty === 3 ? 1.2 : 1.0)).toFixed(1));
    } 
    return parseFloat((opt.cost * (currentDifficulty === 3 ? 1.2 : 1.0)).toFixed(1));
}

function getWeightedRandomItem(excludeIds) {
    let lvlConfig = LEVELS[currentLevel];
    let availableItems = upgradePool.filter(item => {
        if (excludeIds.includes(item.id)) return false;
        if (lvlConfig.shopItems !== 'ALL' && !lvlConfig.shopItems.includes(item.id)) return false;
        if (lvlConfig.shopItems === 'ALL') {
            if (player.totalUpgradePoints < item.unlockPT) return false;
            if (gameTimeSeconds < item.unlockTime) return false;
        }
        if (item.type === 'equip') {
            if (!player.equipment[item.id].owned) return true; return player.equipment[item.id].level < item.max; 
        }
        return (item.max === 999) ? true : ((player.upgrades[item.id] || 0) < item.max);
    });
    if (availableItems.length === 0) return null;
    let totalWeight = availableItems.reduce((sum, item) => sum + RARITY[item.rarity].weight, 0);
    let roll = Math.random() * totalWeight; let weightSum = 0;
    for (let item of availableItems) { weightSum += RARITY[item.rarity].weight; if (roll <= weightSum) return item; }
    return availableItems[availableItems.length - 1];
}

function generateShopItems() {
    currentShopItems = []; let excludeIds = [];
    for(let i=0; i<3; i++) { 
        let item = getWeightedRandomItem(excludeIds); 
        if (item) { currentShopItems.push(item); if(item.max !== 999) excludeIds.push(item.id); } 
    }
}

function openShop() { gameState = 'SHOP'; if (currentShopItems.length === 0) generateShopItems(); renderShopCards(); showScreen('shop'); }
function closeShop() { gameState = 'PLAYING'; player.targetX = player.x; player.targetY = player.y; showScreen(null); }

function openLoadout(fromState) { overlayHistory = fromState; gameState = 'LOADOUT'; renderLoadout(); showScreen('loadout'); }
function closeLoadout() { gameState = overlayHistory; if(gameState === 'PLAYING') showScreen(null); else showScreen(overlayHistory.toLowerCase()); }

function createIconCvs(id) {
    let iconCvs = document.createElement('canvas');
    iconCvs.width = 12; iconCvs.height = 12;
    iconCvs.getContext('2d').drawImage(sprites.eqIcons[id] || sprites.eqIcons['default'], 0, 0);
    return iconCvs;
}

function renderLoadout() {
    ui.loadoutSlotsText.innerText = `${player.usedSlots} / ${player.maxSlots}`;
    ui.coreSlotsGrid.innerHTML = ''; ui.extSlotsGrid.innerHTML = ''; ui.inventoryList.innerHTML = '';
    
    let renderedCoreSlots = 0; let hasInv = false;

    for (let id in player.equipment) {
        let eq = player.equipment[id]; 
        if (!eq.owned) continue; 
        
        if (eq.equipped) {
            let chip = document.createElement('div');
            let isLocked = eq.canUnequip === false;
            chip.className = `equip-chip ${eq.slotCost > 0 ? 'core-chip' : 'ext-chip'} ${isLocked ? 'locked-chip' : ''}`;
            
            let nameSpan = `<span style="font-size:8px; color:#fff">${eq.name} Lv.${eq.level}</span>`;
            let costSpan = eq.slotCost > 0 ? `<span style="font-size:6px; color:#00b0ff">[占用:${eq.slotCost}]</span>` : `<span style="font-size:6px; color:#ab47bc">[模块化]</span>`;
            if(isLocked) costSpan = `<span style="font-size:6px; color:#ffea00">[系统死锁]</span>`;
            
            chip.appendChild(createIconCvs(id));
            chip.innerHTML += `<div style="display:flex; flex-direction:column; align-items:flex-start;">${nameSpan}${costSpan}</div>`;
            chip.onclick = function() { toggleEquipment(id); this.classList.add('anim-pop'); setTimeout(()=>this.classList.remove('anim-pop'), 200); };
            
            if (eq.slotCost > 0) { ui.coreSlotsGrid.appendChild(chip); renderedCoreSlots += eq.slotCost; } 
            else { ui.extSlotsGrid.appendChild(chip); }
        } else {
            hasInv = true;
            let card = document.createElement('div'); card.className = 'upgrade-card equip-inactive';
            let costHtml = eq.slotCost > 0 ? `<div class="card-cost" style="color: #00b0ff">占槽: ${eq.slotCost}</div>` : `<div class="card-cost" style="color: #ab47bc">外置模块</div>`;
            card.innerHTML = `
                <div style="display:flex; align-items:center; gap:8px;">
                    <div class="icon-wrap"></div>
                    <div class="card-info"><div class="card-title" style="color:#fff;"><span>${eq.name} (Lv.${eq.level})</span></div></div>
                </div>
                <div class="card-cost-box" style="background: rgba(255,255,255,0.1)">${costHtml}</div>
            `;
            card.querySelector('.icon-wrap').appendChild(createIconCvs(id));
            card.onclick = function() { toggleEquipment(id); this.classList.add('anim-pop'); setTimeout(()=>this.classList.remove('anim-pop'), 200); };
            ui.inventoryList.appendChild(card);
        }
    }

    let emptySlots = player.maxSlots - renderedCoreSlots;
    for(let i=0; i<emptySlots; i++){
        let em = document.createElement('div'); em.className = 'empty-slot'; em.innerText = '+';
        ui.coreSlotsGrid.appendChild(em);
    }

    if(ui.extSlotsGrid.children.length === 0) ui.extSlotsGrid.innerHTML = '<span style="color:#555; font-size:8px;">(空)</span>';
    if(!hasInv) ui.inventoryList.innerHTML = '<p style="color:#555; text-align:center; font-size:8px;">暂无闲置模块</p>';
}

function toggleEquipment(id) {
    let eq = player.equipment[id];
    if (eq.equipped) {
        if (!eq.canUnequip) { triggerShake(4, 4); return; }
        eq.equipped = false; player.usedSlots -= eq.slotCost;
        if(id === 'hp_max') { 
            let oldMax = getHpMaxBoost(eq.level);
            player.maxHp -= oldMax; 
            if(player.hp > player.maxHp) player.hp = player.maxHp; 
        }
    } else {
        if (player.usedSlots + eq.slotCost <= player.maxSlots) {
            eq.equipped = true; player.usedSlots += eq.slotCost;
            if(id === 'hp_max') {
                let boost = getHpMaxBoost(eq.level);
                player.maxHp += boost;
            }
        } else { triggerShake(4, 4); return; }
    }
    renderLoadout(); updateHUD();
}

function renderShopCards() {
    ui.shopPts.innerText = player.pt.toFixed(1); ui.shopCards.innerHTML = '';
    currentShopItems.forEach(opt => {
        let itemCost = getShopCost(opt); const canBuy = player.pt >= itemCost;
        const el = document.createElement('div'); const rData = RARITY[opt.rarity]; const tData = TYPE_TAGS[opt.type] || TYPE_TAGS['stat'];
        let currentLv = 0; let isUpgrade = false;
        if(opt.type === 'equip') { currentLv = player.equipment[opt.id].level; if(player.equipment[opt.id].owned) isUpgrade = true; }
        else { currentLv = player.upgrades[opt.id] || 0; }
        let isTagged = (taggedItemId === opt.id);
        el.className = `upgrade-card ${canBuy ? '' : 'disabled'} ${isTagged ? 'tagged-item' : ''}`; el.style.borderColor = rData.color;
        let lvText = opt.max === 999 ? '∞' : `Lv.${currentLv}/${opt.max}`; let titleText = isUpgrade ? `▲ ${opt.name} 升级` : `${opt.name}`;
        el.innerHTML = `<div class="card-info"><div class="card-title" style="color: ${rData.color}"><span>${isTagged ? '★ ' : ''}<span style="color:#aaa; font-size:8px; margin-right:4px;">[${tData.label}]</span>${titleText}</span><span style="font-size:8px; opacity:0.8">[${rData.name}]</span></div><div class="card-desc">${opt.desc}</div></div><div class="card-cost-box" style="background: ${rData.color}33"><div class="card-cost" style="color: ${rData.color}">${itemCost.toFixed(1)}</div><div class="card-max" style="color: ${rData.color}">${lvText}</div></div>`;
        el.onclick = function() { 
            if (canBuy) { 
                if (taggedItemId === opt.id) taggedItemId = null; 
                this.classList.add('anim-pop'); setTimeout(()=> { this.classList.remove('anim-pop'); buyUpgrade(opt.id); }, 150);
            } else { 
                taggedItemId = (taggedItemId === opt.id) ? null : opt.id; renderShopCards(); updateHUD(); 
            } 
        };
        ui.shopCards.appendChild(el);
    });
    
    let rc = currentDifficulty === 3 ? parseFloat((BASE_REFRESH_COST * 1.2).toFixed(1)) : BASE_REFRESH_COST;
    const canRefresh = player.pt >= rc; ui.refreshBtn.innerText = `刷新 (-${rc.toFixed(1)})`;
    if(canRefresh) ui.refreshBtn.classList.remove('btn-disabled'); else ui.refreshBtn.classList.add('btn-disabled');
}

function refreshShop() { 
    let rc = currentDifficulty === 3 ? parseFloat((BASE_REFRESH_COST * 1.2).toFixed(1)) : BASE_REFRESH_COST;
    if (player.pt >= rc) { 
        player.pt -= rc; 
        ui.shopCards.classList.add('refreshing-cards');
        setTimeout(() => { generateShopItems(); renderShopCards(); updateHUD(); }, 150);
        setTimeout(() => { ui.shopCards.classList.remove('refreshing-cards'); }, 300);
    } 
}

function buyUpgrade(id) {
    let opt = currentShopItems.find(i => i.id === id); let itemCost = getShopCost(opt);
    if (!opt || player.pt < itemCost) return;
    player.pt -= itemCost; 
    
    if (opt.type === 'equip') {
        if (!player.equipment[id].owned) {
            player.equipment[id].owned = true; player.equipment[id].level = 1;
            if (player.usedSlots + player.equipment[id].slotCost <= player.maxSlots) {
                player.equipment[id].equipped = true; player.usedSlots += player.equipment[id].slotCost;
                if(id === 'hp_max') {
                    let boost = getHpMaxBoost(1);
                    player.maxHp += boost; player.heal(boost);
                }
                if(id === 'debt_protocol') {
                    player.pt += 3.0;
                    pushFloatingText(30, 45, "+3.0 PT", "#ff1744", false, true);
                }
            }
        } else { 
            let oldLevel = player.equipment[id].level;
            player.equipment[id].level++; 
            if(id === 'hp_max') {
                let diff = getHpMaxBoost(player.equipment[id].level) - getHpMaxBoost(oldLevel);
                if(player.equipment[id].equipped) player.maxHp += diff;
                player.heal(diff); 
            } 
        }
    } else {
        if(opt.max !== 999) player.upgrades[id] = (player.upgrades[id] || 0) + 1;
        switch(id) {
            case 'damage': player.damage += 6; break;
            case 'heal': player.heal(20); break; 
            case 'magnet': player.magnetRadius += 60; break;
            case 'crit_rate': player.critRate += 0.05; break;
            case 'crit_dmg': player.critDamage += 0.20; break;
            case 'wingman': player.wingmen++; break;
            case 'aoe': player.damage = Math.max(4, player.damage - 2); break; 
            case 'healer_rate': player.healSpawnRate = Math.min(0.20, player.healSpawnRate + 0.03); break; 
            case 'slot': player.maxSlots++; break;
        }
    }
    generateShopItems(); updateHUD(); renderShopCards();
}

function getPlayerPowerScore() {
    let power = (player.damage * (player.equipment['debt_protocol'].equipped ? 0.8 : 1.0) - 12) * 0.2;
    if(player.equipment.speed.equipped) power += 3; 
    if(player.equipment.spread.equipped) power += 5; 
    if(player.equipment.laser.equipped) power += 10;
    return isNaN(power) ? 0 : Math.max(0, power);
}

// 【核心机制】：AI导演状态机与等待清场逻辑
function updateDifficultyMetrics() {
    if (frameCount % 60 === 0) { 
        gameTimeSeconds++; 
        levelHpMultiplier = LEVELS[currentLevel].timeHpMultiplier(gameTimeSeconds);
        
        if (currentLevel !== 'sector1') {
            directorStateTimer++;
            
            if (directorState === 'COOLDOWN') {
                if (!healWaveEnemyType) {
                    // 等待清场阶段：只要场上少于4只怪，或者等了太久(20秒)，就强行派出特种波次
                    if (enemies.length <= 4 || directorStateTimer > 20) {
                        let possible = ENEMY_TYPES.filter(t => ['Locator', 'WandererLow', 'WandererHigh'].includes(t.type));
                        healWaveEnemyType = possible[Math.floor(Math.random() * possible.length)];
                        directorPoints += 20; 
                    }
                } else {
                    // 特种波次持续期间，到期自动恢复常规出怪
                    if (directorStateTimer > 30) { 
                        directorState = 'BUILDUP'; 
                        directorStateTimer = 0; 
                        healWaveEnemyType = null; 
                    }
                }
            } else if (directorState === 'BUILDUP' && directorStateTimer > 30 && Math.random() < 0.05 && gameTimeSeconds > 60) {
                directorState = 'COOLDOWN'; 
                directorStateTimer = 0;
                healWaveEnemyType = null; // 置空以触发“等待清场”阶段
            }
        }

        let pPower = getPlayerPowerScore(); 
        let baseDiff = 1.0 + Math.pow(gameTimeSeconds / 60, 1.5) * 0.4 + (pPower * 0.04);
        difficultyScore = baseDiff; 
        updateHUD(); 
    }
    
    // 资金注入
    directorPoints += (difficultyScore * DIFF_CONFIG[currentDifficulty].spawnMod) / 25;
}

function resize() { width = window.innerWidth; height = window.innerHeight; canvas.width = width; canvas.height = height; ctx.imageSmoothingEnabled = false; updateUIRects(); }

function showScreen(screenId) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    if(screenId) screens[screenId].classList.add('active');
    const inGameUIElements = [ui.topLeftCont, ui.topRightCont, ui.sideBtns];
    if(screenId === 'start' || screenId === 'gameOver') {
        inGameUIElements.forEach(el => el.classList.add('hud-hidden')); ui.bossHpCont.style.opacity = 0;
    } else {
        inGameUIElements.forEach(el => el.classList.remove('hud-hidden'));
        if(isBossSpawned) ui.bossHpCont.style.opacity = 1;
    }
    updateUIRects();
}

function toggleSetting(key) { config[key] = !config[key]; ui.dmgBtn.innerText = `伤害飘字: ${config.dmgText ? '开' : '关'}`; ui.shakeBtn.innerText = `屏幕震动: ${config.shake ? '开' : '关'}`; }

function openSettings(fromState) { overlayHistory = fromState; gameState = 'SETTINGS'; switchSettingsTab('control'); showScreen('settings'); }
function closeSettings() { gameState = overlayHistory; if (gameState === 'START') showScreen('start'); else if (gameState === 'PAUSED') showScreen('pause'); else showScreen(null); }

function togglePause() { 
    if (gameState === 'PLAYING') { gameState = 'PAUSED'; ui.pauseScore.innerText = `当前战绩: ${score} PTS`; showScreen('pause'); } 
    else if (gameState === 'PAUSED') { gameState = 'PLAYING'; showScreen(null); player.targetX = player.x; player.targetY = player.y; } 
}
function quitGame() { gameState = 'START'; showScreen('start'); initDifficultyUI(); }

function startGame(levelId) {
    currentLevel = levelId || 'debug'; resize(); initSprites(); initStars();
    player = new Player(); bullets = []; enemyBullets = []; enemies = []; particles = []; items = []; floatingTexts = []; aoeEffects = [];
    score = 0; frameCount = 0; gameTimeSeconds = 0; shakeTimer = 0; hitStopFrames = 0; flashScreenTimer = 0;
    comboCount = 0; comboTimer = 0; endingState = 'none'; endingTimer = 0;
    currentRefreshCost = BASE_REFRESH_COST; currentShopItems = []; directorPoints = 0; difficultyScore = 1.0;
    isBossSpawned = false; taggedItemId = null; ui.bossHpCont.style.opacity = 0; ui.bossToast.style.opacity = 0;
    specialKamikazeMisses = 0; levelHpMultiplier = 1.0; directorState = 'BUILDUP'; directorStateTimer = 0; ui.sysMessage.style.opacity = 0;
    
    uiOffsets = {hp:{x:0,y:0,vx:0,vy:0}, pt:{x:0,y:0,vx:0,vy:0}};

    updateHUD(); gameState = 'PLAYING'; showScreen(null);
}

function gameOver(title, isVictory) {
    gameState = 'GAMEOVER'; let m = Math.floor(gameTimeSeconds / 60).toString().padStart(2, '0'); let s = (gameTimeSeconds % 60).toString().padStart(2, '0');
    
    let fancyTitle = title;
    let isAbyssClear = isVictory && currentDifficulty === 3;
    
    const titleEl = document.getElementById('game-over-title');
    titleEl.className = '';
    if (isAbyssClear) {
        fancyTitle = "ABYSS CLEARED";
        titleEl.classList.add('abyss-clear-title');
    } else {
        titleEl.style.color = isVictory ? "#00e676" : "#e60050";
    }
    
    titleEl.innerText = fancyTitle; 
    
    let extraText = isAbyssClear ? "<br><br><span style='color:#00b0ff'>[DATABASE UNLOCKED]</span>" : "";
    ui.finalScore.innerHTML = `战绩结算: ${score} PTS<br>存活时间: ${m}:${s}${extraText}`; 
    
    showScreen('gameOver');
}

function handleMove(clientX, clientY) { if (gameState !== 'PLAYING' || endingState !== 'none') return; player.targetX = clientX; player.targetY = clientY - config.controlOffsetY; }
canvas.addEventListener('touchmove', e => { e.preventDefault(); handleMove(e.touches[0].clientX, e.touches[0].clientY); }, {passive: false});
canvas.addEventListener('touchstart', e => { e.preventDefault(); handleMove(e.touches[0].clientX, e.touches[0].clientY); }, {passive: false});
canvas.addEventListener('mousemove', e => { if(e.buttons === 1) handleMove(e.clientX, e.clientY); });
window.addEventListener('resize', resize);

function processGroup(group, isPlaying) { for (let i = group.length - 1; i >= 0; i--) { let entity = group[i]; if (isPlaying && hitStopFrames <= 0) entity.update(); entity.draw(ctx); if (isPlaying && (!entity.active)) group.splice(i, 1); } }

function loop() {
    requestAnimationFrame(loop);
    if (gameState === 'START') { ctx.fillStyle = '#050510'; ctx.fillRect(0, 0, width, height); updateAndDrawStars(ctx, true); return; }
    const isPlaying = (gameState === 'PLAYING');
    
    ctx.fillStyle = '#050510'; ctx.fillRect(0, 0, width, height); updateAndDrawStars(ctx, isPlaying);
    
    ctx.save(); 
    if (shakeTimer > 0) { let dx = (Math.random() - 0.5) * shakeIntensity; let dy = (Math.random() - 0.5) * shakeIntensity; ctx.translate(dx, dy); if(isPlaying) shakeTimer--; }
    
    if (isPlaying && hitStopFrames > 0) {
        hitStopFrames--; 
    } else if (isPlaying) {
        frameCount++; if(player.hp > 0 && endingState !== 'playerDead') player.update(); 
        
        if (endingState === 'none') { 
            updateDifficultyMetrics(); 
            LEVELS[currentLevel].spawnLoop();
        }

        if(player.skillActiveTimer > 0) {
            player.skillActiveTimer--;
            if(player.skillActiveTimer <= 0) { player.skillCdTimer = 900; }
            updateHUD();
        } else if (player.skillCdTimer > 0) {
            player.skillCdTimer--;
            updateHUD();
        } else if (frameCount % 10 === 0) {
            updateHUD(); 
        }

        bullets.forEach(b => {
            if (!b.active) return;
            enemies.forEach(e => {
                if (!e.active || e.hp <= 0) return;
                let r_w = e.w * e.scale; let r_h = e.h * e.scale;
                if (!b.hitEnemies.has(e) && Math.abs(b.x - e.x) < (b.w/2 + r_w/2 + 6) && Math.abs(b.y - e.y) < (b.h/2 + r_h/2 + 6)) {
                    let isCrit = Math.random() < b.critRate; 
                    let curDmg = b.damage * Math.pow(b.pierceRetain, b.hitEnemies.size);
                    let finalDmg = isCrit ? curDmg * b.critDamage : curDmg;
                    
                    e.takeDamage(finalDmg, true, isCrit, 'bullet'); 
                    b.hitEnemies.add(e);
                    
                    if (player.upgrades.aoe > 0) triggerAOE(e.x, e.y);
                    
                    if (b.hitEnemies.size > b.pierceCount) { 
                        b.active = false; 
                        if(player.upgrades.aoe === 0) particles.push(new Particle(b.x, b.y, isCrit ? '#ffea00' : '#ffffff', (Math.random()-0.5)*4, (Math.random()-0.5)*4, 6));
                    }
                }
            });
        });
        if (player.wingmen > 0 && player.hp > 0 && endingState !== 'playerDead') {
            let wTime = frameCount * 0.05;
            for(let i=0; i<player.wingmen; i++) {
                let angle = wTime + (i * Math.PI * 2 / player.wingmen);
                let wx = player.x + Math.cos(angle) * 35; let wy = player.y + Math.sin(angle) * 35;
                ctx.fillStyle = '#ffea00'; ctx.fillRect(wx - 2, wy - 2, 4, 4);
                if (frameCount % 45 === 0) bullets.push(new Bullet(wx, wy, 0, -18, 2, 8, player.damage * 0.4, 0, 1, player.critRate, player.critDamage, '#ffea00'));
            }
        }
    }
    
    if(player.hp > 0 && endingState !== 'playerDead') player.draw(ctx);
    processGroup(aoeEffects, isPlaying); processGroup(items, isPlaying);
    processGroup(bullets, isPlaying); processGroup(enemyBullets, isPlaying);
    processGroup(enemies, isPlaying); processGroup(particles, isPlaying);
    processGroup(floatingTexts, isPlaying);
    
    if (isPlaying && endingState !== 'none') {
        endingTimer--;
        if (endingState === 'bossDead') {
            if (endingTimer % 15 === 0 && endingTimer > 60 && enemies[0]) {
                let bx = enemies[0].x + (Math.random()-0.5)*150; let by = enemies[0].y + (Math.random()-0.5)*100;
                createExplosion(bx, by, '#ff1744', 40); triggerShake(15, 10);
            }
            if (endingTimer === 60 && enemies[0]) { createExplosion(enemies[0].x, enemies[0].y, '#ffffff', 200); flashScreenTimer = 30; flashScreenColor = '255,255,255'; enemies = []; ui.bossHpCont.style.opacity = 0; }
        }
        if (endingTimer <= 0) {
            if (endingState === 'playerDead') gameOver('连接丢失', false); else if (endingState === 'bossDead') { unlockNextDifficulty(); gameOver('区域清剿完成！', true); }
            endingState = 'none';
        }
    }

    if (flashScreenTimer > 0) { ctx.fillStyle = `rgba(${flashScreenColor}, ${flashScreenTimer * 0.05})`; ctx.fillRect(0, 0, width, height); if (isPlaying) flashScreenTimer--; }
    
    if (comboCount > 1 || comboTimer > 0) {
        ctx.save(); let color = comboCount >= 200 ? '#e60050' : (comboCount >= 100 ? '#ffea00' : '#00b0ff');
        ctx.fillStyle = color; ctx.globalAlpha = Math.min(1, comboTimer / 30); 
        let scale = 1 + (comboTimer / maxComboTimer) * 0.3; if (comboCount >= 100) scale += Math.sin(frameCount * 0.3) * 0.15; 
        ctx.translate(width - 20, 85); ctx.scale(scale, scale); ctx.font = '10px "Press Start 2P", "DotGothic16", monospace';
        ctx.textAlign = 'right'; ctx.fillText(comboCount + 'X', 0, 0); ctx.restore();
        if (isPlaying && hitStopFrames <= 0) { comboTimer--; if (comboTimer <= 0) comboCount = 0; }
    }
    ctx.restore(); 
}

initDifficultyUI(); showScreen('start'); resize(); initSprites(); initStars(); requestAnimationFrame(loop);
