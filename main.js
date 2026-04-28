// === main.js ===
// 引擎中枢：负责系统调度、事件管理与主循环

// --- [1] 全局事件总线 (Event Bus) ---
const EventBus = {
    events: {},
    on(event, callback) {
        if (!this.events[event]) this.events[event] = [];
        this.events[event].push(callback);
    },
    emit(event, data) {
        if (!this.events[event]) return;
        this.events[event].forEach(callback => callback(data));
    },
    clear() {
        this.events = {};
    }
};

// --- [2] 核心变量定义 ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d', { alpha: false });
let width, height;

let overlayHistory = 'START';
let hitStopFrames = 0;
let flashScreenTimer = 0;
let flashScreenColor = '255,0,0';
let currentLevel = 'debug';

let currentDifficulty = 0;
let unlockedDifficulty = 0;
let abyssCleared = false;

try {
    unlockedDifficulty = parseInt(localStorage.getItem('pixelRogueUnlockedDiff') || '0');
    abyssCleared = localStorage.getItem('pixelRogueAbyssCleared') === 'true';
} catch (e) {}

// --- [3] 动态注入专属的 Wave Toast (免改 HTML) ---
const waveToastEl = document.createElement('div');
waveToastEl.id = 'wave-toast';
waveToastEl.style.position = 'fixed'; // 固定在屏幕上方
waveToastEl.style.top = '15%';
waveToastEl.style.left = '50%';
waveToastEl.style.transform = 'translate(-50%, -50%)';
waveToastEl.style.color = '#fff';
waveToastEl.style.fontFamily = '"Press Start 2P", "DotGothic16", monospace';
waveToastEl.style.fontSize = '16px';
waveToastEl.style.textAlign = 'center';
waveToastEl.style.opacity = '0'; // 默认隐藏
waveToastEl.style.transition = 'opacity 0.6s cubic-bezier(0.22, 1, 0.36, 1), transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)';
waveToastEl.style.pointerEvents = 'none'; // 绝对不能阻挡多指触摸！
waveToastEl.style.zIndex = '9999';
document.body.appendChild(waveToastEl);

// --- [4] UI 节点映射 ---
const screens = {
    start: document.getElementById('start-screen'),
    settings: document.getElementById('settings-menu'),
    pause: document.getElementById('pause-menu'),
    shop: document.getElementById('shop-menu'),
    loadout: document.getElementById('loadout-menu'),
    gameOver: document.getElementById('game-over-screen'),
    workshop: document.getElementById('workshop-menu')
};

const ui = {
    hpVal: document.getElementById('hud-hp-val'),
    ptVal: document.getElementById('hud-pt-val'),
    indCvs: document.getElementById('hud-indicator'),
    bossHpCont: document.getElementById('boss-hp-container'),
    bossHpDelay: document.getElementById('boss-hp-delay'),
    bossHpFill: document.getElementById('boss-hp-fill'),
    bossToast: document.getElementById('boss-name-toast'),
    waveToast: document.getElementById('wave-toast'), // 刚创建的
    shopCards: document.getElementById('shop-cards'),
    shopPts: document.getElementById('shop-pts'),
    refreshBtn: document.getElementById('refresh-btn'),
    finalScore: document.getElementById('final-score'),
    pauseScore: document.getElementById('pause-score-display'),
    dmgBtn: document.getElementById('toggle-dmg-btn'),
    shakeBtn: document.getElementById('toggle-shake-btn'),
    loadoutSlotsText: document.getElementById('loadout-slots-text'),
    coreSlotsGrid: document.getElementById('core-slots-grid'),
    extSlotsGrid: document.getElementById('ext-slots-grid'),
    inventoryList: document.getElementById('loadout-inventory-list'),
    sysMessage: document.getElementById('system-message'),
    topLeftCont: document.getElementById('hud-top-left'),
    sideBtns: document.getElementById('side-btns-container'),
    inflationText: document.getElementById('inflation-text'),
    inflationFill: document.getElementById('inflation-bar-fill')
};

// --- [5] 游戏状态数据 ---
let gameState = 'START';
let player;
let bullets = [], enemyBullets = [], enemies = [], particles = [], items = [], floatingTexts = [], stars = [], aoeEffects = [];
let score = 0, frameCount = 0, gameTimeSeconds = 0;
let shakeTimer = 0, shakeIntensity = 0;
let comboCount = 0, comboTimer = 0;
const maxComboTimer = 90;
let endingState = 'none', endingTimer = 0;

let directorPoints = 0;
let difficultyScore = 1.0;
let specialKamikazeMisses = 0;
let levelHpMultiplier = 1.0;
let isBossSpawned = false;

let shopBtnRect = { x: 0, y: 0 };
let skillBtnRect = { x: 0, y: 0 };
let uiOffsets = { hp: { x: 0, y: 0, vx: 0, vy: 0 }, pt: { x: 0, y: 0, vx: 0, vy: 0 }, skill: { x: 0, y: 0, vx: 0, vy: 0 } };

let shopInflation = 0.0;
let wasSkillFull = false;
const BASE_REFRESH_COST = 1.0;
let taggedItemId = null;

// --- [6] 系统订阅 (Systems) ---

// 1. 特效系统：负责屏幕震动、死亡爆炸粒子
const FXSystem = {
    init() {
        EventBus.on('ENTITY_DAMAGED', (data) => {
            if (data.isPlayer) triggerShake(6, 8);
        });

        EventBus.on('ENTITY_DIED', (data) => {
            let pColor = data.isBattery ? '#00e5ff' : (data.particleColor || '#757575');
            let pCount = (data.isElite || data.isBoss) ? 40 : 12;
            createExplosion(data.x, data.y, pColor, pCount);
            triggerShake((data.isElite || data.isBoss) ? 8 : 2, 5);
        });
    }
};

// 2. 掉落系统：负责生成 PT 晶体、血包和电池
const LootSystem = {
    init() {
        EventBus.on('ENTITY_DIED', (data) => {
            if (!data.killedByPlayer) return;
            if (data.isHealer) {
                items.push(new Item(data.x, data.y, 'hp', { isElite: data.isElite }));
            } else if (data.isBattery) {
                items.push(new Item(data.x, data.y, 'energy', Math.max(15, (data.weight || 1) * 5)));
            } else {
                let ptVal = (data.weight || 1) * 0.1;
                if (data.isElite) ptVal *= 30;
                if (data.isBossMinion) ptVal *= 1.5;
                items.push(new Item(data.x, data.y, ptVal >= 1.0 ? 'pt_core' : 'pt_shard', ptVal));
            }
        });
    }
};

// 3. 计分系统：负责连击逻辑与连击奖励
const ScoreSystem = {
    init() {
        EventBus.on('ENTITY_DIED', (data) => {
            if (data.killedByPlayer) {
                comboCount++;
                comboTimer = maxComboTimer;
                if (comboCount > 0 && comboCount % 50 === 0) {
                    let color = comboCount >= 200 ? '#e60050' : (comboCount >= 100 ? '#ffea00' : '#00b0ff');
                    EventBus.emit('SPAWN_COMBO_REWARD', { x: data.x, y: data.y, value: comboCount * 0.1, color: color });
                }
            }
        });

        EventBus.on('SPAWN_COMBO_REWARD', (data) => {
            items.push(new Item(data.x, data.y, 'combo_reward', data.value, data.color));
            triggerShake(4, 5);
        });
    }
};

// 4. UI 刷新系统：负责更新 HUD 界面数据
const UIRefreshSystem = {
    init() {
        EventBus.on('UI_UPDATE_REQUESTED', () => { updateHUD(); });
    }
};

// 5. 波次播报系统：负责顶部浮现波次名称
const WaveAnnouncementSystem = {
    timeoutId: null,
    init() {
        EventBus.on('WAVE_STARTED', (waveMeta) => {
            let name = waveMeta.name || "未知波次";
            let color = waveMeta.color || "#ffffff";
            
            ui.waveToast.innerText = `[ ${name} ]`;
            ui.waveToast.style.textShadow = `0 0 15px ${color}, 0 0 5px ${color}`;
            ui.waveToast.style.color = '#fff';
            
            // 动画重置与触发
            ui.waveToast.style.transition = 'none';
            ui.waveToast.style.transform = 'translate(-50%, -30%)';
            ui.waveToast.style.opacity = '0';
            
            requestAnimationFrame(() => {
                ui.waveToast.style.transition = 'opacity 0.6s cubic-bezier(0.22, 1, 0.36, 1), transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)';
                ui.waveToast.style.transform = 'translate(-50%, -50%)';
                ui.waveToast.style.opacity = '1';
            });

            if (this.timeoutId) clearTimeout(this.timeoutId);
            this.timeoutId = setTimeout(() => {
                ui.waveToast.style.opacity = '0';
                ui.waveToast.style.transform = 'translate(-50%, -70%)';
            }, 3000);
        });
    }
};

// 6. 终极音频引擎 (完美生命周期 + 平滑过渡打磨版)
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let globalAudioCtx = null;

const AudioSystem = {
    unlocked: false,
    masterBus: null, sfxBus: null, bgmBus: null, compressor: null,
    bgmFilter: null, 
    buffers: {},
    activeExplosions: 0,
    currentBgmSource: null,
    totalAssets: 0,
    loadedCount: 0,

    initGraph() {
        if (globalAudioCtx) return;
        globalAudioCtx = new AudioCtx({ latencyHint: 'interactive' });
        
        this.masterBus = globalAudioCtx.createGain();
        this.sfxBus = globalAudioCtx.createGain();
        this.bgmBus = globalAudioCtx.createGain();
        
        this.bgmFilter = globalAudioCtx.createBiquadFilter();
        this.bgmFilter.type = 'lowpass';
        this.bgmFilter.frequency.value = 20000; 

        this.compressor = globalAudioCtx.createDynamicsCompressor();
        this.compressor.threshold.value = -15;

        this.sfxBus.connect(this.compressor);
        this.compressor.connect(this.masterBus);
        
        this.bgmFilter.connect(this.bgmBus);
        this.bgmBus.connect(this.masterBus);
        
        this.masterBus.connect(globalAudioCtx.destination);

        this.masterBus.gain.value = 1.0;
        this.sfxBus.gain.value = 0.8;
        this.bgmBus.gain.value = 0.001; // 初始极低，准备淡入
    },

    async loadAudio(name, url) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error("HTTP error");
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await globalAudioCtx.decodeAudioData(arrayBuffer);
            this.buffers[name] = audioBuffer;
            this.loadedCount++;
            
            // 【简易 Loading 提示】：动态修改开始界面文本
            let startBtn = document.getElementById('start-btn') || document.querySelector('.diff-btn');
            if (startBtn && this.loadedCount < this.totalAssets) {
                startBtn.innerText = `加载音频...(${this.loadedCount}/${this.totalAssets})`;
            } else if (startBtn) {
                startBtn.innerText = "新兵"; // 恢复按钮文字
            }

            console.log(`[AudioSystem] 成功解码资产: ${name}`);

            if (name === 'bgm_main' && gameState === 'PLAYING') {
                this.playMainBGM();
                let currentWave = ui.waveToast ? ui.waveToast.innerText : "";
                if (currentWave.includes("休整")) this.transitionBGMState('muffled', 2.0);
                else this.transitionBGMState('open', 1.5);
            }
        } catch (e) {
            console.warn(`[AudioSystem] 资产缺失, 将启用算法降级: ${name}`);
        }
    },

    async preloadAllAssets() {
        const manifest = [
            { name: 'bgm_main', url: './assets/audio/bgm_main.mp3' }, 
            { name: 'hit', url: './assets/audio/hit.wav' },
            { name: 'exp_small', url: './assets/audio/exp_small.wav' },
            { name: 'exp_large', url: './assets/audio/exp_large.wav' }
        ];
        this.totalAssets = manifest.length;
        this.loadedCount = 0;
        const promises = manifest.map(asset => this.loadAudio(asset.name, asset.url));
        await Promise.all(promises);
    },

    playMainBGM() {
        if (!globalAudioCtx || !this.buffers['bgm_main'] || this.currentBgmSource) return;
        
        let source = globalAudioCtx.createBufferSource();
        source.buffer = this.buffers['bgm_main'];
        source.loop = true;
        source.connect(this.bgmFilter);
        source.start(0);
        this.currentBgmSource = source;

        // 【优化】：完美的 BGM 淡入 (Fade-in) 效果
        const t = globalAudioCtx.currentTime;
        this.bgmBus.gain.setValueAtTime(0.001, t);
        this.bgmBus.gain.exponentialRampToValueAtTime(0.6, t + 2.0);
    },

    stopMainBGM() {
        if (!globalAudioCtx || !this.currentBgmSource) return;
        
        // 【优化】：退出关卡时的 BGM 淡出 (Fade-out) 效果
        const t = globalAudioCtx.currentTime;
        this.bgmBus.gain.setValueAtTime(this.bgmBus.gain.value || 0.6, t);
        this.bgmBus.gain.exponentialRampToValueAtTime(0.001, t + 1.0);
        
        this.currentBgmSource.stop(t + 1.5);
        this.currentBgmSource = null;
    },

    transitionBGMState(state, duration = 1.0) {
        if (!globalAudioCtx || !this.bgmFilter) return;
        const t = globalAudioCtx.currentTime;
        
        // 【核心修复】：必须先锚定当前频率，才能进行平滑过渡！
        this.bgmFilter.frequency.setValueAtTime(Math.max(100, this.bgmFilter.frequency.value), t);

        if (state === 'muffled') {
            this.bgmFilter.frequency.exponentialRampToValueAtTime(600, t + duration); // 下潜更深
        } else if (state === 'open') {
            this.bgmFilter.frequency.exponentialRampToValueAtTime(20000, t + duration); // 瞬间或平滑拉开
        }
    },

    playSFX(name, pitchRandomness = 0, volume = 1.0) {
        if (!globalAudioCtx || !this.unlocked) return;
        if (this.buffers[name]) {
            let source = globalAudioCtx.createBufferSource();
            let gain = globalAudioCtx.createGain();
            source.buffer = this.buffers[name];
            gain.gain.value = volume;
            if (pitchRandomness > 0) source.playbackRate.value = 1.0 + (Math.random() * pitchRandomness * 2 - pitchRandomness);
            source.connect(gain); gain.connect(this.sfxBus); source.start();
        } else {
            // 降级硬搓算法
            let osc = globalAudioCtx.createOscillator(); let gain = globalAudioCtx.createGain(); let t = globalAudioCtx.currentTime;
            if (name === 'hit') {
                osc.type = 'sawtooth'; osc.frequency.setValueAtTime(400 + Math.random()*200, t); osc.frequency.exponentialRampToValueAtTime(40, t + 0.1);
                gain.gain.setValueAtTime(volume * 0.3, t); gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
                osc.start(t); osc.stop(t + 0.1);
            } else if (name.startsWith('exp')) {
                let isLarge = name === 'exp_large'; let dur = isLarge ? 0.3 : 0.15;
                osc.type = 'square'; osc.frequency.setValueAtTime(isLarge ? 100 : 250 + (Math.random()-0.5)*50, t); osc.frequency.exponentialRampToValueAtTime(isLarge ? 20 : 50, t + dur);
                gain.gain.setValueAtTime(volume * 0.3, t); gain.gain.exponentialRampToValueAtTime(0.01, t + dur);
                osc.start(t); osc.stop(t + dur);
            }
            osc.connect(gain); gain.connect(this.sfxBus);
        }
    },

    unlockAudio() {
        this.initGraph();
        if (globalAudioCtx.state === 'suspended') globalAudioCtx.resume();
        this.unlocked = true;
        this.preloadAllAssets();
    },

    init() {
        window.addEventListener('pointerdown', () => { if (!this.unlocked) this.unlockAudio(); }, { once: true });

        EventBus.on('ENTITY_DAMAGED', (data) => { 
            this.playSFX('hit', 0.1, 0.4); 
            // 【新增】：玩家受伤瞬间带来强烈的滤波压抑 (匹配20帧的无敌时间，约330ms)
            if (data.isPlayer) {
                this.transitionBGMState('muffled', 0.05); // 0.05秒极速发闷
                setTimeout(() => {
                    if (gameState === 'PLAYING') this.transitionBGMState('open', 0.8); // 平滑解压
                }, 350); 
            }
        });

        EventBus.on('ENTITY_DIED', (data) => {
            if (this.activeExplosions > 4) return;
            this.activeExplosions++;
            let isLarge = (data.isElite || data.isBoss);
            this.playSFX(isLarge ? 'exp_large' : 'exp_small', 0.2, isLarge ? 1.0 : 0.4);
            setTimeout(() => { this.activeExplosions--; }, 200);
        });

        EventBus.on('WAVE_STARTED', (data) => {
            this.playMainBGM(); 
            if (data.name.includes("休整")) this.transitionBGMState('muffled', 2.0); 
            else this.transitionBGMState('open', 1.5);    
        });
    }
};


// --- [7] 引擎底层函数 ---

function updateUIRects() {
    let sR = document.getElementById('shop-btn-cvs').getBoundingClientRect(); shopBtnRect = { x: sR.left + sR.width / 2, y: sR.top + sR.height / 2 };
    let skR = document.getElementById('skill-btn-cvs').getBoundingClientRect(); skillBtnRect = { x: skR.left + skR.width / 2, y: skR.top + skR.height / 2 };
}

function openWorkshop() { Object.values(screens).forEach(s => s.classList.remove('active')); screens.workshop.classList.add('active'); document.getElementById('workshop-textarea').value = JSON.stringify(WORKSHOP.data, null, 4); document.getElementById('workshop-status').innerText = "等待指令..."; document.getElementById('workshop-status').style.color = "#00e676"; }
function closeWorkshop() { showScreen('start'); }
function applyWorkshopData() { try { let newData = JSON.parse(document.getElementById('workshop-textarea').value); Object.assign(WORKSHOP.data, newData); upgradePool.length = 0; baseUpgradePool.forEach(item => { upgradePool.push({ ...item, ...(WORKSHOP.data.items[item.id] || {}) }); }); ENEMY_TYPES.length = 0; Object.keys(WORKSHOP.data.enemies).forEach(key => { ENEMY_TYPES.push({ type: key, ...WORKSHOP.data.enemies[key] }); }); document.getElementById('workshop-status').innerText = "[SUCCESS] 数据已完美注入引擎内核。"; document.getElementById('workshop-status').style.color = "#00e676"; } catch (e) { document.getElementById('workshop-status').innerText = "[ERROR] JSON 格式解析崩溃: " + e.message; document.getElementById('workshop-status').style.color = "#ff1744"; } }

window.spawnEnemyByType = function(type, x, options = {}) {
    let side = (x < width / 2) ? 'left' : 'right'; let forceHeal = options.forceHeal || false; let speedOver = options.speedOverride || null; let isDF = options.isDumbFire || false; let fireInt = options.fireInterval || null; let forceBat = options.forceBattery || false;
    if (type.startsWith('Formation_')) { let formName = type.replace('Formation_', ''); let formDef = WORKSHOP.formations[formName]; if (formDef) { let cx = Math.max(40, Math.min(width - 40, x)); formDef.forEach(en => { let rx = cx + (en.x || 0); let ry = options.y ? options.y + (en.y || 0) : -40 + (en.y || 0); let eOpts = { forceHeal: en.forceHeal || forceHeal, forceBattery: en.forceBattery || forceBat, speedOverride: en.speed || null, y: ry, isDumbFire: en.isDumbFire || isDF, fireInterval: en.fireInterval || fireInt }; window.spawnEnemyByType(en.type, rx, eOpts); }); } return; }
    let e = null; let startY = options.y || -40;
    switch (type) {
        case 'Locator': e = new Locator(x, startY, false, forceHeal, speedOver); break; case 'LocatorSwarm': e = new Locator(x, startY, true, forceHeal, speedOver); break; case 'WandererLow': e = new Wanderer(x, startY, false, null, false, forceHeal, side); break; case 'WandererHigh': e = new Wanderer(x, startY, true, null, false, forceHeal, side); break; case 'WandererSwarm': e = new Wanderer(x, startY, false, Math.random() * Math.PI * 2, true, forceHeal, side); break; case 'Kamikaze': e = new Kamikaze(x, startY); break; case 'KamikazeSwarm': e = new Kamikaze(x, startY, 'swarm'); break; case 'KamikazeSpec': e = new Kamikaze(x, startY, 'special'); break; case 'ArcFlyer': e = new ArcFlyer(0, startY + 20, Math.random() > 0.5); break; case 'ArcFlyerSwarm': e = new ArcFlyer(0, startY + 20, Math.random() > 0.5, 0, true); break; case 'Turret': e = new Turret(x, startY, false, forceHeal, isDF); break; case 'TurretSwarm': e = new Turret(x, startY, true, forceHeal, isDF); break; case 'Tank': e = new Tank(x, startY); break; case 'TankSwarm': e = new Tank(x, startY, false, true); break;
    }
    if (e) { if (speedOver !== null && e.speed !== undefined) e.speed = speedOver; if (isDF) e.isDumbFire = true; if (forceBat) e.isBattery = true; if (fireInt !== null) { e.fireInterval = fireInt; e.shootTimer = fireInt; } enemies.push(e); }
};

// --- [8] UI 控制与屏幕切换 ---

function showScreen(screenId) {
    Object.values(screens).forEach(s => s.classList.remove('active')); if (screenId) screens[screenId].classList.add('active');
    const inGameUIElements = [ui.topLeftCont, ui.sideBtns];
    if (screenId === 'start' || screenId === 'gameOver' || screenId === 'workshop') { inGameUIElements.forEach(el => { if (el) el.classList.add('hud-hidden'); }); if (ui.bossHpCont) ui.bossHpCont.style.opacity = 0; ui.waveToast.style.opacity = 0; } 
    else { inGameUIElements.forEach(el => { if (el) el.classList.remove('hud-hidden'); }); if (isBossSpawned && ui.bossHpCont) ui.bossHpCont.style.opacity = 1; }
    updateUIRects();
}

function gameOver(title, isVictory) {
    gameState = 'GAMEOVER'; let m = Math.floor(gameTimeSeconds / 60).toString().padStart(2, '0'); let s = (gameTimeSeconds % 60).toString().padStart(2, '0'); let fancyTitle = title; let isAbyssClear = isVictory && currentDifficulty === 3;
    const titleEl = document.getElementById('game-over-title'); titleEl.className = '';
    if (isAbyssClear) { fancyTitle = "ABYSS CLEARED"; titleEl.classList.add('abyss-clear-title'); } else { titleEl.style.color = isVictory ? "#00e676" : "#e60050"; }
    titleEl.innerText = fancyTitle; let extraText = isAbyssClear ? "<br><br><span style='color:#00b0ff'>[DATABASE UNLOCKED]</span>" : ""; ui.finalScore.innerHTML = `战绩结算: ${score} PTS<br>存活时间: ${m}:${s}${extraText}`;
    showScreen('gameOver');
}

function initDifficultyUI() { if (unlockedDifficulty >= 2) document.getElementById('diff-nightmare').classList.remove('locked'); selectDifficulty(Math.min(currentDifficulty, unlockedDifficulty >= 2 ? 3 : 2)); }
function selectDifficulty(level) { if (level === 3 && unlockedDifficulty < 2) return; currentDifficulty = level; document.querySelectorAll('.diff-btn').forEach((btn, idx) => { if (idx === level) btn.classList.add('selected'); else btn.classList.remove('selected'); }); document.getElementById('diff-desc').innerText = DIFF_CONFIG[level].desc; if (level === 3) document.getElementById('diff-desc').style.color = '#ff1744'; else document.getElementById('diff-desc').style.color = '#ffeb3b'; }
function unlockNextDifficulty() { if (currentDifficulty >= 1 && unlockedDifficulty < 2) { unlockedDifficulty = 2; try { localStorage.setItem('pixelRogueUnlockedDiff', '2'); } catch (e) {} } if (currentDifficulty === 3) { abyssCleared = true; try { localStorage.setItem('pixelRogueAbyssCleared', 'true'); } catch (e) {} } }
function drawIndicator(color) { let ic = ui.indCvs.getContext('2d'); ic.clearRect(0, 0, 16, 16); ic.fillStyle = '#555'; ic.beginPath(); ic.arc(8, 8, 7, 0, Math.PI * 2); ic.fill(); ic.fillStyle = '#222'; ic.beginPath(); ic.arc(8, 8, 6, 0, Math.PI * 2); ic.fill(); ic.shadowBlur = 4; ic.shadowColor = color; ic.fillStyle = color; ic.beginPath(); ic.arc(8, 8, 4, 0, Math.PI * 2); ic.fill(); ic.shadowBlur = 0; ic.fillStyle = '#fff'; ic.fillRect(6, 5, 2, 2); }
function drawPixelButton(id, icon, progress, color) { let cvs = document.getElementById(id); if (!cvs) return; let ctx = cvs.getContext('2d'); ctx.clearRect(0, 0, 48, 48); ctx.fillStyle = '#111'; ctx.fillRect(4, 4, 40, 40); if (progress > 0) { ctx.fillStyle = color; ctx.globalAlpha = progress >= 1 ? 0.6 : 0.4; let fillH = Math.floor(40 * Math.min(1, progress)); ctx.fillRect(4, 44 - fillH, 40, fillH); ctx.globalAlpha = 1.0; } ctx.fillStyle = '#555'; ctx.fillRect(4, 0, 40, 4); ctx.fillRect(4, 44, 40, 4); ctx.fillRect(0, 4, 4, 40); ctx.fillRect(44, 4, 4, 40); ctx.fillRect(2, 2, 4, 4); ctx.fillRect(42, 2, 4, 4); ctx.fillRect(2, 42, 4, 4); ctx.fillRect(42, 42, 4, 4); if (icon) ctx.drawImage(icon, 24 - icon.width / 2, 24 - icon.height / 2); }

let offsetCanvas = document.getElementById('offsetCanvas'); let offsetCtx = offsetCanvas.getContext('2d'); let sensCanvas = document.getElementById('sensCanvas'); let sensCtx = sensCanvas.getContext('2d');
function setControlMode(mode) { config.controlMode = mode; document.getElementById('ctrl-mode-abs').classList.toggle('selected', mode === 'absolute'); document.getElementById('ctrl-mode-rel').classList.toggle('selected', mode === 'relative'); document.getElementById('settings-abs-ui').classList.toggle('ctrl-hidden', mode === 'relative'); document.getElementById('settings-rel-ui').classList.toggle('ctrl-hidden', mode === 'absolute'); }
function setTouchMode(mode) { config.touchMode = mode; document.getElementById('ctrl-touch-single').classList.toggle('selected', mode === 'single'); document.getElementById('ctrl-touch-multi').classList.toggle('selected', mode === 'multi'); }
function drawOffsetWidget() { offsetCtx.clearRect(0, 0, 80, 80); offsetCtx.beginPath(); offsetCtx.arc(40, 40, 35, 0, Math.PI * 2); offsetCtx.strokeStyle = '#444'; offsetCtx.lineWidth = 4; offsetCtx.stroke(); offsetCtx.beginPath(); let pct = Math.min(1, Math.max(0, config.controlOffsetY / 200)); offsetCtx.arc(40, 40, 35, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * pct)); offsetCtx.strokeStyle = '#00e676'; offsetCtx.stroke(); document.getElementById('offset-val').innerText = config.controlOffsetY; }
function drawSensWidget() { sensCtx.clearRect(0, 0, 80, 80); sensCtx.beginPath(); sensCtx.arc(40, 40, 35, 0, Math.PI * 2); sensCtx.strokeStyle = '#444'; sensCtx.lineWidth = 4; sensCtx.stroke(); sensCtx.beginPath(); let pct = Math.min(1, Math.max(0, (config.controlSens - 0.5) / 2.5)); sensCtx.arc(40, 40, 35, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * pct)); sensCtx.strokeStyle = '#ab47bc'; sensCtx.stroke(); document.getElementById('sens-val').innerText = config.controlSens.toFixed(1) + 'x'; }

function toggleSetting(key) { config[key] = !config[key]; ui.dmgBtn.innerText = `伤害飘字: ${config.dmgText ? '开' : '关'}`; ui.shakeBtn.innerText = `屏幕震动: ${config.shake ? '开' : '关'}`; }
function openSettings(fromState) { overlayHistory = fromState; gameState = 'SETTINGS'; document.getElementById('settings-sub-game').classList.add('ctrl-hidden'); document.getElementById('settings-sub-control').classList.add('ctrl-hidden'); document.getElementById('settings-main-list').classList.remove('ctrl-hidden'); document.getElementById('settings-title').innerText = "系统设置"; showScreen('settings'); }
function closeSettings() { gameState = overlayHistory; if (gameState === 'START') showScreen('start'); else if (gameState === 'PAUSED') showScreen('pause'); else showScreen(null); }
function enterSettingsSub(sub) { document.getElementById('settings-main-list').classList.add('ctrl-hidden'); document.getElementById('settings-sub-game').classList.add('ctrl-hidden'); document.getElementById('settings-sub-control').classList.add('ctrl-hidden'); document.getElementById('settings-sub-' + sub).classList.remove('ctrl-hidden'); document.getElementById('settings-title').innerText = (sub === 'control') ? "操控设定" : "系统与画面"; if (sub === 'control') { drawOffsetWidget(); drawSensWidget(); } }
function backToSettingsMain() { document.getElementById('settings-sub-game').classList.add('ctrl-hidden'); document.getElementById('settings-sub-control').classList.add('ctrl-hidden'); document.getElementById('settings-main-list').classList.remove('ctrl-hidden'); document.getElementById('settings-title').innerText = "系统设置"; }
function triggerShake(intensity, duration) { if (!config.shake) return; shakeIntensity = intensity; shakeTimer = duration; }
function showSystemMessage(msg, color) { ui.sysMessage.innerText = msg; ui.sysMessage.style.color = color; ui.sysMessage.style.opacity = 1; setTimeout(() => { ui.sysMessage.style.opacity = 0; }, 3000); }

function startEnding(type) {
    if (endingState !== 'none') return;
    endingState = type;
    if (type === 'playerDead') { endingTimer = 120; createExplosion(player.x, player.y, '#00b0ff', 60); triggerShake(20, 30); } 
    else if (type === 'bossDead') { endingTimer = 240; triggerShake(25, 240); }
}

// --- [9] 环境与星空 ---

function initStars() {
    stars = [];
    const farColors = ['#0a0f24', '#120b1f', '#05111c'];
    for (let i = 0; i < 50; i++) { stars.push({ x: Math.random() * width, y: Math.random() * height, speed: 0.1 + Math.random() * 0.1, size: 1, alpha: 0.15 + Math.random() * 0.15, color: farColors[Math.floor(Math.random() * farColors.length)], isStreaked: false }); }
    const middleColors = ['#1a334d', '#2d1a4d'];
    for (let i = 0; i < 20; i++) { stars.push({ x: Math.random() * width, y: Math.random() * height, speed: 0.4 + Math.random() * 0.2, size: 2, alpha: 0.25 + Math.random() * 0.15, color: middleColors[Math.floor(Math.random() * middleColors.length)], isStreaked: false }); }
    const nearColors = ['#0088cc', '#6600cc'];
    for (let i = 0; i < 6; i++) { stars.push({ x: Math.random() * width, y: Math.random() * height, speed: 2.0 + Math.random() * 1.0, streakWidth: 1, streakMultiplier: 1.5, alpha: 0.3 + Math.random() * 0.2, color: nearColors[Math.floor(Math.random() * nearColors.length)], isStreaked: true }); }
}

function updateAndDrawStars(ctx, isPlaying) {
    stars.forEach(star => {
        if (isPlaying && hitStopFrames <= 0) star.y += star.speed;
        if (star.y > height) { star.y = 0; star.x = Math.random() * width; }
        ctx.globalAlpha = star.alpha; ctx.fillStyle = star.color;
        if (star.isStreaked) { ctx.fillRect(star.x, star.y, star.streakWidth, star.speed * star.streakMultiplier); } 
        else if (star.size === 2) { ctx.fillRect(star.x, star.y, 1, 2); } 
        else { ctx.fillRect(star.x, star.y, star.size, star.size); }
    });
    ctx.globalAlpha = 1;
}

// --- [10] 核心战斗函数 ---

function activateSkill() { if (player.skillEnergy >= player.maxSkillEnergy && player.skillCdTimer <= 0 && player.skillActiveTimer <= 0) { player.skillEnergy = 0; player.skillActiveTimer = 600; triggerShake(10, 10); flashScreenTimer = 15; flashScreenColor = '0, 229, 255'; wasSkillFull = false; updateHUD(); } }
function applyElastic(obj, targetNode, type = 'hp') { if (obj.vx === undefined) { obj.vx = 0; obj.vy = 0; } let physConfig = WORKSHOP.data.physics; obj.vx += -obj.x * physConfig.hp_bounce_force; obj.vy += -obj.y * physConfig.hp_bounce_force; obj.vx *= physConfig.hp_damping; obj.vy *= physConfig.hp_damping; obj.x += obj.vx; obj.y += obj.vy; if (targetNode) targetNode.style.transform = `translate(${obj.x}px, ${obj.y}px)`; }
function updateHUD() {
    if (!player) return;
    let isFullNow = (player.skillEnergy >= player.maxSkillEnergy);
    if (isFullNow && !wasSkillFull && player.skillCdTimer <= 0) { let force = WORKSHOP.data.physics.skill_vibrate_force; uiOffsets.skill.x = (Math.random() > 0.5 ? 1 : -1) * force; uiOffsets.skill.y = (Math.random() > 0.5 ? 1 : -1) * force; }
    wasSkillFull = isFullNow; ui.ptVal.innerText = `${player.pt.toFixed(1)} PT`;
    const hpPercent = Math.max(0, player.hp / player.maxHp); let hpColor = '#e60050';
    if (hpPercent > 0.7) hpColor = '#00e676'; else if (hpPercent > 0.4) hpColor = '#ffea00'; else if (hpPercent > 0.2) hpColor = '#ff9800';
    ui.hpVal.style.color = hpColor; ui.hpVal.innerText = `${Math.floor(player.hp)}%`;

    let indColor = '#00e676'; let cassette = WORKSHOP.cassettes[currentLevel];
    if (cassette && cassette.timeline) {
        let st = cassette.state; let wave = cassette.timeline[st.currentWave];
        if (wave) { if (wave.type === 'p0_rest') { let remain = wave.duration - st.waveTimer; indColor = (remain <= 4) ? '#ffea00' : '#00e676'; } else { indColor = '#ff1744'; } } 
        else { indColor = isBossSpawned ? '#ff1744' : '#00e676'; }
    } else {
        let isProtected = gameTimeSeconds < DIFF_CONFIG[currentDifficulty].protectionTime;
        if (isProtected) indColor = '#00e5ff'; else indColor = '#ffea00';
    }
    drawIndicator(indColor); updatePixelButtons();
}

function updatePixelButtons() {
    if (!player) return;
    let skProg = player.skillActiveTimer > 0 ? (player.skillActiveTimer / 600) : (player.skillCdTimer > 0 ? (1 - player.skillCdTimer / 900) : player.skillEnergy / player.maxSkillEnergy);
    let skColor = player.skillActiveTimer > 0 ? '#00e5ff' : (player.skillCdTimer > 0 ? '#ff1744' : (player.skillEnergy >= player.maxSkillEnergy ? '#ffea00' : '#00b0ff'));
    drawPixelButton('skill-btn-cvs', sprites.i_skill, skProg, skColor); drawPixelButton('loadout-btn-cvs', sprites.i_loadout, 0, '#fff'); drawPixelButton('shop-btn-cvs', sprites.i_shop, 0, '#fff'); drawPixelButton('pause-btn-cvs', sprites.i_pause, 0, '#fff');
}

// --- [11] 商店与背包逻辑 ---
function getShopCost(opt) { let baseCst = (opt.type === 'equip' && !player.equipment[opt.id].owned) ? opt.initialCost : (opt.type === 'equip' ? opt.cost + player.equipment[opt.id].level * opt.costStep : opt.cost); let diffMult = currentDifficulty === 3 ? 1.2 : 1.0; let inflationMult = 1.0 + (shopInflation / 100.0); return parseFloat((baseCst * diffMult * inflationMult).toFixed(1)); }
function getWeightedRandomItem(excludeIds) { let cassette = WORKSHOP.cassettes[currentLevel] || WORKSHOP.cassettes['debug']; let shopItems = cassette.shopItems || 'ALL'; let availableItems = upgradePool.filter(item => { if (excludeIds.includes(item.id)) return false; if (shopItems !== 'ALL' && !shopItems.includes(item.id)) return false; if (shopItems === 'ALL') { if (player.totalUpgradePoints < item.unlockPT || gameTimeSeconds < item.unlockTime) return false; } if (item.type === 'equip') { if (!player.equipment[item.id].owned) return true; return player.equipment[item.id].level < item.max; } return (item.max === 999) ? true : ((player.upgrades[item.id] || 0) < item.max); }); if (availableItems.length === 0) return null; let totalWeight = availableItems.reduce((sum, item) => sum + RARITY[item.rarity].weight, 0); let roll = Math.random() * totalWeight; let weightSum = 0; for (let item of availableItems) { weightSum += RARITY[item.rarity].weight; if (roll <= weightSum) return item; } return availableItems[availableItems.length - 1]; }
function generateShopItems() { currentShopItems = []; let excludeIds = []; for (let i = 0; i < 3; i++) { let item = getWeightedRandomItem(excludeIds); if (item) { currentShopItems.push(item); if (item.max !== 999) excludeIds.push(item.id); } } }
function openShop() { gameState = 'SHOP'; if (currentShopItems.length === 0) generateShopItems(); renderShopCards(); showScreen('shop'); }
function closeShop() { gameState = 'PLAYING'; showScreen(null); }
function openLoadout(fromState) { overlayHistory = fromState; gameState = 'LOADOUT'; renderLoadout(); showScreen('loadout'); }
function closeLoadout() { gameState = overlayHistory; if (gameState === 'PLAYING') showScreen(null); else showScreen(overlayHistory.toLowerCase()); }
function createIconCvs(id) { let iconCvs = document.createElement('canvas'); iconCvs.width = 12; iconCvs.height = 12; iconCvs.getContext('2d').drawImage(sprites.eqIcons[id] || sprites.eqIcons['default'], 0, 0); return iconCvs; }
function renderLoadout() { ui.loadoutSlotsText.innerText = `${player.usedSlots} / ${player.maxSlots}`; ui.coreSlotsGrid.innerHTML = ''; ui.extSlotsGrid.innerHTML = ''; ui.inventoryList.innerHTML = ''; let renderedCoreSlots = 0; let hasInv = false; for (let id in player.equipment) { let eq = player.equipment[id]; if (!eq.owned) continue; if (eq.equipped) { let chip = document.createElement('div'); let isLocked = eq.canUnequip === false; chip.className = `equip-chip ${eq.slotCost > 0 ? 'core-chip' : 'ext-chip'} ${isLocked ? 'locked-chip' : ''}`; chip.innerHTML = `<span style="font-size:8px; color:#fff">${eq.name} Lv.${eq.level}</span>`; chip.onclick = function () { toggleEquipment(id); }; if (eq.slotCost > 0) { ui.coreSlotsGrid.appendChild(chip); renderedCoreSlots += eq.slotCost; } else { ui.extSlotsGrid.appendChild(chip); } } else { hasInv = true; let card = document.createElement('div'); card.className = 'upgrade-card equip-inactive'; card.innerHTML = `<div class="card-title">${eq.name}</div>`; card.onclick = function () { toggleEquipment(id); }; ui.inventoryList.appendChild(card); } } }
function toggleEquipment(id) { let eq = player.equipment[id]; if (eq.equipped) { if (!eq.canUnequip) { triggerShake(4, 4); return; } eq.equipped = false; player.usedSlots -= eq.slotCost; } else { if (player.usedSlots + eq.slotCost <= player.maxSlots) { eq.equipped = true; player.usedSlots += eq.slotCost; } else { triggerShake(4, 4); return; } } renderLoadout(); updateHUD(); }
function renderShopCards() { ui.shopPts.innerText = player.pt.toFixed(1); ui.shopCards.innerHTML = ''; currentShopItems.forEach(opt => { let itemCost = getShopCost(opt); const el = document.createElement('div'); el.className = `upgrade-card ${player.pt >= itemCost ? '' : 'disabled'}`; el.innerHTML = `<div class="card-info"><div class="card-title">${opt.name}</div></div><div class="card-cost">${itemCost.toFixed(1)}</div>`; el.onclick = () => { if (player.pt >= itemCost) buyUpgrade(opt.id); }; ui.shopCards.appendChild(el); }); }
function refreshShop() { let rc = BASE_REFRESH_COST; if (player.pt >= rc) { player.pt -= rc; shopInflation += WORKSHOP.data.economy.refresh_inflation; generateShopItems(); renderShopCards(); } }
function buyUpgrade(id) { let opt = currentShopItems.find(i => i.id === id); let cost = getShopCost(opt); if (player.pt >= cost) { player.pt -= cost; if (opt.type === 'equip') { if (!player.equipment[id].owned) { player.equipment[id].owned = true; player.equipment[id].level = 1; } else { player.equipment[id].level++; } } else { player.upgrades[id] = (player.upgrades[id] || 0) + 1; } generateShopItems(); renderShopCards(); updateHUD(); } }
function getPlayerPowerScore() { let power = (player.damage * (player.equipment['debt_protocol'].equipped ? 0.8 : 1.0) - 12) * 0.2; if(player.equipment.speed.equipped) power += 3; if(player.equipment.spread.equipped) power += 5; if(player.equipment.laser.equipped) power += 10; return isNaN(power) ? 0 : Math.max(0, power); }

// --- [12] 关卡导演逻辑 ---

function doDirectorSpawns(sec) {
    let maxE = DIFF_CONFIG[currentDifficulty].maxEnemies;
    if (enemies.length >= maxE) return;
    // 基础刷怪逻辑 (调试模式用)
}

function updateDifficultyMetrics() {
    if (frameCount % 60 === 0) {
        gameTimeSeconds++;
        levelHpMultiplier = 1 + Math.pow(gameTimeSeconds / 100, 1.2) * 0.5;
        if (shopInflation > 0) shopInflation = Math.max(0, shopInflation - WORKSHOP.data.economy.cooling_rate);
    }
}

// --- [13] 输入处理与主循环 ---

let widgetDragging = null; let lastTouchX = 0, lastTouchY = 0;
document.getElementById('offset-widget').addEventListener('touchstart', e => { widgetDragging = 'offset'; lastTouchX = e.touches[0].clientX; lastTouchY = e.touches[0].clientY; e.preventDefault(); }, {passive: false});
document.getElementById('sens-widget').addEventListener('touchstart', e => { widgetDragging = 'sens'; lastTouchX = e.touches[0].clientX; lastTouchY = e.touches[0].clientY; e.preventDefault(); }, {passive: false});
window.addEventListener('touchmove', e => {
    if (!widgetDragging) return;
    let dx = e.touches[0].clientX - lastTouchX; let dy = lastTouchY - e.touches[0].clientY; 
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        let valChange = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : -1) : (dy > 0 ? 1 : -1);
        if (widgetDragging === 'offset') { config.controlOffsetY = Math.max(0, Math.min(200, config.controlOffsetY + valChange * 2)); drawOffsetWidget(); } 
        else if (widgetDragging === 'sens') { config.controlSens = Math.max(0.5, Math.min(3.0, config.controlSens + valChange * 0.1)); drawSensWidget(); }
        lastTouchX = e.touches[0].clientX; lastTouchY = e.touches[0].clientY;
    }
}, {passive: false});
window.addEventListener('touchend', () => widgetDragging = null);

let isTouchActive = false; let shipTouchId = null; let touchStartX = 0; let touchStartY = 0;

function handleTouchStart(e) {
    if (gameState !== 'PLAYING' || endingState !== 'none') return;
    if (config.touchMode === 'multi') {
        for(let i=0; i<e.changedTouches.length; i++) {
            let touch = e.changedTouches[i];
            if (shipTouchId === null) {
                shipTouchId = touch.identifier;
                isTouchActive = true;
                touchStartX = touch.clientX;
                touchStartY = touch.clientY;
                if (config.controlMode === 'absolute') { player.targetX = touchStartX; player.targetY = touchStartY - config.controlOffsetY; }
                break;
            }
        }
    } else {
        isTouchActive = true; touchStartX = e.touches[0].clientX; touchStartY = e.touches[0].clientY;
        if (config.controlMode === 'absolute') { player.targetX = touchStartX; player.targetY = touchStartY - config.controlOffsetY; }
    }
}

function handleTouchMove(e) {
    if (!isTouchActive || gameState !== 'PLAYING' || endingState !== 'none') return;
    let clientX, clientY;
    if (config.touchMode === 'multi') {
        let found = false;
        for(let i=0; i<e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === shipTouchId) { clientX = e.changedTouches[i].clientX; clientY = e.changedTouches[i].clientY; found = true; break; }
        }
        if (!found) return; 
    } else { clientX = e.touches[0].clientX; clientY = e.touches[0].clientY; }
    
    if (config.controlMode === 'absolute') {
        player.targetX = clientX; player.targetY = clientY - config.controlOffsetY;
    } else {
        let dx = clientX - touchStartX; let dy = clientY - touchStartY;
        player.targetX += dx * config.controlSens; player.targetY += dy * config.controlSens;
        touchStartX = clientX; touchStartY = clientY;
    }
}

function handleTouchEnd(e) {
    if (config.touchMode === 'multi') {
        for(let i=0; i<e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === shipTouchId) { shipTouchId = null; isTouchActive = false; break; }
        }
    } else { if (e.touches.length === 0) { isTouchActive = false; } }
}

let lastFrameTime = 0;
const FPS_INTERVAL = 1000 / 60;

function loop(timestamp) {
    requestAnimationFrame(loop);
    if (!lastFrameTime) lastFrameTime = timestamp;
    let dt = timestamp - lastFrameTime;
    if (dt < FPS_INTERVAL) return;
    lastFrameTime = timestamp - (dt % FPS_INTERVAL);

    if (gameState === 'START' || gameState === 'SETTINGS' || gameState === 'WORKSHOP') {
        ctx.fillStyle = '#050510'; ctx.fillRect(0, 0, width, height); updateAndDrawStars(ctx, true); return;
    }

    if (gameState === 'GAMEOVER') {
        ctx.fillStyle = '#050510'; ctx.fillRect(0, 0, width, height); updateAndDrawStars(ctx, false);
        if(player && player.hp > 0) player.draw(ctx);
        processGroup(enemies, false); processGroup(particles, false); return;
    }

    const isPlaying = (gameState === 'PLAYING');
    ctx.fillStyle = '#050510'; ctx.fillRect(0, 0, width, height); updateAndDrawStars(ctx, isPlaying);

    ctx.save();
    if (shakeTimer > 0) {
        let dx = (Math.random() - 0.5) * shakeIntensity; let dy = (Math.random() - 0.5) * shakeIntensity;
        ctx.translate(dx, dy);
        if (isPlaying) shakeTimer--;
    }

    if (isPlaying && hitStopFrames > 0) {
        hitStopFrames--;
    } else if (isPlaying) {
        frameCount++;
        if (player.hp > 0 && endingState !== 'playerDead') player.update();

        if (endingState === 'none') {
            updateDifficultyMetrics();
            let cassette = WORKSHOP.cassettes[currentLevel] || WORKSHOP.cassettes['debug'];
            let sec = gameTimeSeconds + (frameCount % 60) / 60;
            if (cassette.script) cassette.script(sec, frameCount);
            if (frameCount % 20 === 0 && !cassette.disable_director) doDirectorSpawns(sec);
        }

        if (player.skillActiveTimer > 0) {
            player.skillActiveTimer--; if (player.skillActiveTimer <= 0) player.skillCdTimer = 900;
        } else if (player.skillCdTimer > 0) { player.skillCdTimer--; }

        applyElastic(uiOffsets.hp, ui.hpVal, 'hp'); applyElastic(uiOffsets.skill, document.getElementById('skill-btn-cvs'), 'skill');

        if (frameCount % 10 === 0) updateHUD();

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
            for (let i = 0; i < player.wingmen; i++) {
                let angle = wTime + (i * Math.PI * 2 / player.wingmen);
                let wx = player.x + Math.cos(angle) * 35; let wy = player.y + Math.sin(angle) * 35;
                ctx.fillStyle = '#ffea00'; ctx.fillRect(wx - 2, wy - 2, 4, 4);
                if (frameCount % 45 === 0) { bullets.push(new Bullet(wx, wy, 0, -18, 2, 8, player.damage * 0.4, 0, 1, player.critRate, player.critDamage, '#ffea00')); }
            }
        }
    }

    if (player && player.hp > 0 && endingState !== 'playerDead') player.draw(ctx);
    
    processGroup(aoeEffects, isPlaying); processGroup(items, isPlaying); processGroup(bullets, isPlaying); processGroup(enemyBullets, isPlaying); processGroup(enemies, isPlaying); processGroup(particles, isPlaying); processGroup(floatingTexts, isPlaying);

    if (isPlaying && endingState !== 'none') {
        endingTimer--;
        if (endingState === 'bossDead') {
            if (endingTimer % 15 === 0 && endingTimer > 60 && enemies[0]) {
                let bx = enemies[0].x + (Math.random()-0.5)*150; let by = enemies[0].y + (Math.random()-0.5)*100;
                createExplosion(bx, by, '#ff1744', 40); triggerShake(15, 10);
            }
            if (endingTimer === 60 && enemies[0]) {
                createExplosion(enemies[0].x, enemies[0].y, '#ffffff', 200);
                flashScreenTimer = 30; flashScreenColor = '255,255,255'; enemies = []; ui.bossHpCont.style.opacity = 0;
            }
        }
        if (endingTimer <= 0) {
            if (endingState === 'playerDead') gameOver('连接丢失', false);
            else if (endingState === 'bossDead') { unlockNextDifficulty(); gameOver('区域清剿完成！', true); }
            endingState = 'none';
        }
    }

    if (flashScreenTimer > 0) { ctx.fillStyle = `rgba(${flashScreenColor}, ${flashScreenTimer * 0.05})`; ctx.fillRect(0, 0, width, height); if (isPlaying) flashScreenTimer--; }

    if (comboCount > 1 || comboTimer > 0) {
        ctx.save();
        let color = comboCount >= 200 ? '#e60050' : (comboCount >= 100 ? '#ffea00' : '#00b0ff');
        ctx.fillStyle = color; ctx.globalAlpha = Math.min(1, comboTimer / 30);
        let scale = 1 + (comboTimer / maxComboTimer) * 0.3; if (comboCount >= 100) scale += Math.sin(frameCount * 0.3) * 0.15;
        ctx.translate(width - 20, 85); ctx.scale(scale, scale);
        ctx.font = '10px "Press Start 2P", "DotGothic16", monospace'; ctx.textAlign = 'right'; ctx.fillText(comboCount + 'X', 0, 0);
        ctx.restore();
        if (isPlaying && hitStopFrames <= 0) { comboTimer--; if (comboTimer <= 0) comboCount = 0; }
    }
    ctx.restore();
}

function processGroup(group, isPlaying) {
    for (let i = group.length - 1; i >= 0; i--) {
        let ent = group[i];
        if (isPlaying && hitStopFrames <= 0) ent.update();
        ent.draw(ctx);
        if (!ent.active) group.splice(i, 1);
    }
}

function resize() { width = window.innerWidth; height = window.innerHeight; canvas.width = width; canvas.height = height; ctx.imageSmoothingEnabled = false; updateUIRects(); }

const setupMultiTouchButtons = () => {
    const btnMap = { 'pause-btn-cvs': togglePause, 'skill-btn-cvs': activateSkill, 'loadout-btn-cvs': () => openLoadout('PLAYING'), 'shop-btn-cvs': openShop };
    for (let id in btnMap) { let el = document.getElementById(id); if (el) { el.onpointerdown = (e) => { e.preventDefault(); e.stopPropagation(); btnMap[id](); }; } }
};

function togglePause() { if (gameState === 'PLAYING') { gameState = 'PAUSED'; ui.pauseScore.innerText = `当前战绩: ${score} PTS`; showScreen('pause'); } else if (gameState === 'PAUSED') { gameState = 'PLAYING'; showScreen(null); } }
function quitGame() { gameState = 'START'; showScreen('start'); initUI(); }

function startGame(levelId) {
    currentLevel = levelId || 'debug';
    resize(); 
    initSprites(); 
    initStars();
    
    player = new Player();
    enemies = []; 
    bullets = []; 
    enemyBullets = []; 
    items = []; 
    particles = []; 
    floatingTexts = []; 
    aoeEffects = [];
    
    score = 0; 
    frameCount = 0; 
    gameTimeSeconds = 0;
    shakeTimer = 0; 
    hitStopFrames = 0; 
    flashScreenTimer = 0;
    comboCount = 0; 
    comboTimer = 0; 
    endingState = 'none'; 
    endingTimer = 0;
    
    currentRefreshCost = BASE_REFRESH_COST; 
    currentShopItems = [];
    directorPoints = 0; 
    difficultyScore = 1.0;
    isBossSpawned = false; 
    taggedItemId = null;
    
    ui.bossHpCont.style.opacity = 0; 
    ui.bossToast.style.opacity = 0;
    ui.waveToast.style.opacity = 0; // 重置波次提示
    
    specialKamikazeMisses = 0; 
    levelHpMultiplier = 1.0;
    directorState = 'BUILDUP'; 
    directorStateTimer = 0;
    ui.sysMessage.style.opacity = 0;
    shopInflation = 0.0; 
    wasSkillFull = false;
    isTouchActive = false; 
    shipTouchId = null;
    
    uiOffsets = { 
        hp: { x: 0, y: 0, vx: 0, vy: 0 }, 
        pt: { x: 0, y: 0, vx: 0, vy: 0 }, 
        skill: { x: 0, y: 0, vx: 0, vy: 0 } 
    };
    
    // 【核心补全：在这里拧动所有系统的钥匙】
    EventBus.clear();
    FXSystem.init();
    LootSystem.init();
    ScoreSystem.init();
    UIRefreshSystem.init();
    WaveAnnouncementSystem.init(); // 激活波次播报
    AudioSystem.init();            // 激活音频系统

    let c = WORKSHOP.cassettes[currentLevel];
    if (c && c.state) { 
        c.state.currentWave = 0; 
        c.state.waveTimer = 0; 
    }

    updateHUD(); 
    gameState = 'PLAYING'; 
    showScreen(null);
}


function initUI() { initDifficultyUI(); setControlMode(config.controlMode); setTouchMode(config.touchMode); setupMultiTouchButtons(); }

canvas.addEventListener('touchstart', e => { e.preventDefault(); handleTouchStart(e); }, {passive: false});
canvas.addEventListener('touchmove', e => { e.preventDefault(); handleTouchMove(e); }, {passive: false});
canvas.addEventListener('touchend', e => { e.preventDefault(); handleTouchEnd(e); }, {passive: false});
canvas.addEventListener('touchcancel', e => { e.preventDefault(); handleTouchEnd(e); }, {passive: false});
canvas.addEventListener('mousedown', e => { if (gameState !== 'PLAYING' || endingState !== 'none') return; isTouchActive = true; touchStartX = e.clientX; touchStartY = e.clientY; if(config.controlMode === 'absolute') { player.targetX = touchStartX; player.targetY = touchStartY - config.controlOffsetY; } });
canvas.addEventListener('mousemove', e => { if (!isTouchActive || e.buttons !== 1 || gameState !== 'PLAYING') return; if (config.controlMode === 'absolute') { player.targetX = e.clientX; player.targetY = e.clientY - config.controlOffsetY; } else { player.targetX += (e.clientX - touchStartX) * config.controlSens; player.targetY += (e.clientY - touchStartY) * config.controlSens; touchStartX = e.clientX; touchStartY = e.clientY; } });
canvas.addEventListener('mouseup', () => { isTouchActive = false; });
canvas.addEventListener('mouseleave', () => { isTouchActive = false; });
window.addEventListener('resize', resize);

initUI(); showScreen('start'); resize(); initSprites(); initStars(); requestAnimationFrame(loop);
