// === main.js ===
// 引擎中枢：负责系统调度、事件管理与主循环

// --- [1] 全局事件总线 (Event Bus) ---
const EventBus = {
    events: {},
    on(event, callback) {
        if (!this.events[event]) this.events[event] = [];
        this.events[event].push(callback);
    },
    off(event, callback) {
        if (!this.events[event]) return;
        this.events[event] = this.events[event].filter(cb => cb !== callback);
    },
    emit(event, data) {
        if (!this.events[event]) return;
        this.events[event].forEach(callback => callback(data));
    },
    clear() {
        this.events = {};
    }
};
// --- [新增] 全局动态加载屏障 (免疫一切 HTML 缺失) ---
const AssetManager = {
    promises: [],
    loaderEl: null,
    initDOM() {
        this.loaderEl = document.createElement('div');
        this.loaderEl.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:#050510;z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#00e5ff;font-family:monospace;transition:opacity 0.5s;';
        this.loaderEl.innerHTML = '<h2 style="margin:0;letter-spacing:5px;">SYSTEM BOOTING</h2><p id="boot-status" style="color:#00e676;">装载核心资产库...</p>';
        document.body.appendChild(this.loaderEl);
    },
    add(promise) { this.promises.push(promise); },
    async boot(callback) {
        this.initDOM();
        let statusEl = document.getElementById('boot-status');
        try {
            const timeoutPromise = new Promise(resolve => setTimeout(() => resolve('TIMEOUT'), 3000));
            const result = await Promise.race([Promise.all(this.promises), timeoutPromise]);
            statusEl.innerText = result === 'TIMEOUT' ? "加载超时，启用后备协议。" : "系统自检完成。";
            
            setTimeout(() => {
                this.loaderEl.style.opacity = '0';
                setTimeout(() => { this.loaderEl.remove(); callback(); }, 500);
            }, 300);
        } catch (e) {
            statusEl.style.color = "#ff1744"; statusEl.innerText = "资产异常，强制启动。";
            setTimeout(() => { this.loaderEl.remove(); callback(); }, 500);
        }
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
waveToastEl.style.position = 'fixed';
waveToastEl.style.top = '15%';
waveToastEl.style.left = '50%';
waveToastEl.style.transform = 'translate(-50%, -50%)';
waveToastEl.style.color = '#fff';
waveToastEl.style.fontFamily = '"Press Start 2P", "DotGothic16", monospace';
waveToastEl.style.fontSize = '16px';
waveToastEl.style.textAlign = 'center';
waveToastEl.style.opacity = '0';
waveToastEl.style.transition = 'opacity 0.6s cubic-bezier(0.22, 1, 0.36, 1), transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)';
waveToastEl.style.pointerEvents = 'none';
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
    waveToast: document.getElementById('wave-toast'),
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
// [L2 蓝轨超频阶梯配置]
const BLUE_TECH_TIERS = {
    fireRate: { values: [0.05, 0.08, 0.13, 0.20], costs: [0.8, 1.5, 2.5, 3.8] },
    damage:   { values: [2, 3, 5, 8], costs: [0.4, 1.3, 3.0, 5.0] },
    maxHp:    { values: [20, 50, 80, 120], costs: [1.2, 2.2, 3.8, 6.5] }
};
// 物品图标映射（Unicode 像素风）
const ITEM_ICONS = {
    'high_explosive': '⚡', 'spread': '≋',  'burst_core': '≫',  'hp_max':    '♥',
    'homing':         '⊙',  'pulse':  '〰', 'laser':      '━',  'pierce':    '▸',
    'speed':          '▶',  'debt_protocol': '⚠',
    'rapid_charge':   '◉',  'phase_dodge': '◈', 'afterburn': '✦', 'skill_cd': '⟳',
    'crit_rate': '★',  'crit_dmg': '◆', 'aoe': '◎', 'wingman': '✈',
    'heal': '✚',  'heal_up': '✚', 'magnet': '⊕', 'shield_gen': '◈', 'slot': '▣',
    'healer_rate': '✚', 'skill_duration': '◉'
};
function getItemIcon(id) { return ITEM_ICONS[id] || (id ? '◆' : '◆'); }
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
let uiOffsets = { hp: { x: 0, y: 0, vx: 0, vy: 0 }, pt: { x: 0, y: 0, vx: 0, vy: 0 }, skill: { x: 0, y: 0, vx: 0, vy: 0 }, terminal: { x: 0, y: 0, vx: 0, vy: 0 } };

let shopInflation = 0.0;
let wasSkillFull = false;
let wasInRestPhase = false;
const BASE_REFRESH_COST = 1.0;
let taggedItemId = null;

// --- [6] 核心组件：音频引擎 (原生 Audio 标签直读本地流) ---
let globalAudioCtx = null;

const AudioSystem = {
    masterBus: null, sfxBus: null, bgmBus: null,
    compressor: null, bgmFilter: null,
    bgmAudioEl: null, bgmSourceNode: null, fallbackOsc: null,
    stopTimer: null, dmgFilterTimer: null, dmgFilterActive: false,
    
    config: { normalFreq: 20000, uiMuffleFreq: 600, uiFadeTime: 0.1, dmgMuffleFreq: 300, dmgDuration: 250, dmgFadeOut: 0.8 },

    initGraph() {
        if (globalAudioCtx) return;
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        globalAudioCtx = new AudioContext({ latencyHint: 'interactive' });
        this.masterBus = globalAudioCtx.createGain();
        this.sfxBus = globalAudioCtx.createGain();
        this.bgmBus = globalAudioCtx.createGain(); 

        this.bgmFilter = globalAudioCtx.createBiquadFilter();
        this.bgmFilter.type = 'lowpass';
        this.bgmFilter.frequency.value = this.config.normalFreq;

        this.compressor = globalAudioCtx.createDynamicsCompressor();
        this.compressor.threshold.value = -15;

        this.sfxBus.connect(this.compressor);
        this.compressor.connect(this.masterBus);
        this.bgmBus.connect(this.bgmFilter);
        this.bgmFilter.connect(this.masterBus);
        this.masterBus.connect(globalAudioCtx.destination);
        
        // 【绝对核心：用 HTML5 Audio 标签直读本地文件，免疫跨域拦截！】
        this.bgmAudioEl = new Audio('assets/audio/bgm.mp3');
        this.bgmAudioEl.loop = true;
        
        try {
            // 将本地音频流接管进 Web Audio API 的滤镜管线 (完美保留时停滤波功能)
            this.bgmSourceNode = globalAudioCtx.createMediaElementSource(this.bgmAudioEl);
        } catch(e) {
            console.warn("媒体流挂载受限", e);
        }
    },

    bindEvents() {
        EventBus.off('UI_OPENED', this.handleUIOpen);
        EventBus.off('UI_CLOSED', this.handleUIClosed);
        EventBus.off('SYS_LEVEL_EXITED', this.handleExit);
        EventBus.off('ENTITY_DAMAGED', this.handleDamage);

        this.handleUIOpen = () => this.transitionBGMState('ui');
        this.handleUIClosed = () => this.transitionBGMState('playing');
        this.handleExit = () => this.fadeOutAndStop();
        this.handleDamage = (data) => { if(data.isPlayer) this.triggerDamageFilter(); };

        EventBus.on('UI_OPENED', this.handleUIOpen);
        EventBus.on('UI_CLOSED', this.handleUIClosed);
        EventBus.on('SYS_LEVEL_EXITED', this.handleExit);
        EventBus.on('ENTITY_DAMAGED', this.handleDamage);
    },

    playBGM(trackKey = '') {
        if (!globalAudioCtx) this.initGraph();
        if (globalAudioCtx.state === 'suspended') globalAudioCtx.resume();

        if (this.stopTimer) clearTimeout(this.stopTimer);
        if (this.dmgFilterTimer) clearTimeout(this.dmgFilterTimer);
        this.dmgFilterActive = false;
        this.stopBGM();

        if (this.bgmBus) {
            this.bgmBus.disconnect();
            this.bgmBus = globalAudioCtx.createGain();
            this.bgmBus.connect(this.bgmFilter);
        }

        const t = globalAudioCtx.currentTime;
        this.bgmBus.gain.setValueAtTime(0, t); 
        this.bgmBus.gain.setTargetAtTime(1, t, 0.5); 

        this.bgmFilter.frequency.cancelScheduledValues(t);
        this.bgmFilter.frequency.setValueAtTime(this.config.normalFreq, t);

        if (this.bgmSourceNode && this.bgmAudioEl) {
            this.bgmSourceNode.disconnect();
            this.bgmSourceNode.connect(this.bgmBus);
            
            // [L2 架构：动态切换 Boss 音乐源]
            let srcPath = trackKey === 'boss' ? 'assets/audio/boss.mp3' : 'assets/audio/bgm.mp3';
            if (this.bgmAudioEl.getAttribute('src') !== srcPath) {
                this.bgmAudioEl.src = srcPath;
            }
            

            
            this.bgmAudioEl.currentTime = 0;
            let p = this.bgmAudioEl.play();
            if (p !== undefined) {
                p.catch(e => {
                    console.warn("本地音频解码失败或遭浏览器阻挡，启动备用音效:", e);
                    this.playFallbackOsc(t);
                });
            }
        } else {
            this.playFallbackOsc(t);
        }
    },
     // 【新增架构：绝对音频时钟】
    getTrackTime() {
        // 如果我们使用的是 HTML5 Audio 标签直读（之前为你接线的方案）
        if (this.bgmAudioEl && !this.bgmAudioEl.paused) {
            return this.bgmAudioEl.currentTime;
        }
        // 如果是 Web Audio API 缓冲播放
        if (globalAudioCtx && globalAudioCtx.state === 'running' && this.currentBgmSource) {
            if (!this._startTime) this._startTime = globalAudioCtx.currentTime;
            return globalAudioCtx.currentTime - this._startTime;
        }
        return 0;
    },
    playFallbackOsc(t) {
        this.fallbackOsc = globalAudioCtx.createOscillator();
        this.fallbackOsc.type = 'sawtooth';
        this.fallbackOsc.frequency.setValueAtTime(146.83, t); 
        this.fallbackOsc.connect(this.bgmBus);
        this.fallbackOsc.start();
    },

    transitionBGMState(state) {
        if (!this.bgmFilter || !globalAudioCtx) return;
        if (this.dmgFilterActive) return; 
        this.bgmFilter.frequency.cancelScheduledValues(globalAudioCtx.currentTime);
        let targetFreq = (state === 'ui') ? this.config.uiMuffleFreq : this.config.normalFreq;
        this.bgmFilter.frequency.setTargetAtTime(targetFreq, globalAudioCtx.currentTime, this.config.uiFadeTime);
    },

    triggerDamageFilter() {
        if (!this.bgmFilter || !globalAudioCtx) return;
        this.dmgFilterActive = true;
        if (this.dmgFilterTimer) clearTimeout(this.dmgFilterTimer);

        this.bgmFilter.frequency.cancelScheduledValues(globalAudioCtx.currentTime);
        this.bgmFilter.frequency.setValueAtTime(this.config.dmgMuffleFreq, globalAudioCtx.currentTime);

        this.dmgFilterTimer = setTimeout(() => {
            this.dmgFilterActive = false;
            let targetFreq = (gameState !== 'PLAYING') ? this.config.uiMuffleFreq : this.config.normalFreq;
            this.bgmFilter.frequency.setTargetAtTime(targetFreq, globalAudioCtx.currentTime, this.config.dmgFadeOut);
        }, this.config.dmgDuration);
    },

    fadeOutAndStop() {
        if (!this.bgmBus || !globalAudioCtx) return;
        const t = globalAudioCtx.currentTime;
        this.bgmBus.gain.cancelScheduledValues(t);
        this.bgmBus.gain.setTargetAtTime(0, t, 0.5); 
        if (this.stopTimer) clearTimeout(this.stopTimer);
        this.stopTimer = setTimeout(() => { this.stopBGM(); }, 1000); 
    },

    stopBGM() {
        if (this.bgmAudioEl) this.bgmAudioEl.pause();
        if (this.fallbackOsc) {
            try { this.fallbackOsc.stop(); this.fallbackOsc.disconnect(); this.fallbackOsc = null; } catch(e) {}
        }
    },
    resumeContext() { if (globalAudioCtx && globalAudioCtx.state === 'suspended') globalAudioCtx.resume(); }
};

const unlockAudio = () => {
    if (typeof AudioSystem !== 'undefined') AudioSystem.resumeContext();
    document.removeEventListener('touchstart', unlockAudio);
    document.removeEventListener('click', unlockAudio);
};
document.addEventListener('touchstart', unlockAudio, { once: true });
document.addEventListener('click', unlockAudio, { once: true });






// --- [7] 系统订阅 (Systems) ---

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

const LootSystem = {
    init() {
        EventBus.on('ENTITY_DIED', (data) => {
            if (!data.killedByPlayer) return;
            if (player && player.techTree && player.techTree.tech_energy) {
                player.skillEnergy = Math.min(player.maxSkillEnergy, player.skillEnergy + player.techTree.tech_energy * 0.5);
            }
            if (data.isCrystal) {
                let cnt = 3 + Math.floor(Math.random() * 3);
                for (let i = 0; i < cnt; i++) {
                    items.push(new Item(
                        data.x + (Math.random() - 0.5) * 30,
                        data.y + (Math.random() - 0.5) * 10,
                        'pale_crystal', 3.0
                    ));
                }
                return;
            }
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

const UIRefreshSystem = {
    init() {
        EventBus.on('UI_UPDATE_REQUESTED', () => { updateHUD(); });
    }
};

const WaveAnnouncementSystem = {
    timeoutId: null,
    init() {
        EventBus.on('WAVE_STARTED', (waveMeta) => {
            let name = waveMeta.name || "未知波次";
            let color = waveMeta.color || "#ffffff";
            
            ui.waveToast.innerText = `[ ${name} ]`;
            ui.waveToast.style.textShadow = `0 0 15px ${color}, 0 0 5px ${color}`;
            ui.waveToast.style.color = '#fff';
            
            ui.waveToast.style.transform = 'translate(-50%, -30%)';
            ui.waveToast.style.opacity = '1';
            
            requestAnimationFrame(() => {
                ui.waveToast.style.transform = 'translate(-50%, -50%)';
            });
            
            if (this.timeoutId) clearTimeout(this.timeoutId);
            
            this.timeoutId = setTimeout(() => {
                ui.waveToast.style.opacity = '0';
                ui.waveToast.style.transform = 'translate(-50%, -70%)';
            }, 3000);
        });
    }
};
// --- [新增架构：微秒级时间轴导演系统] ---
const DirectorSystem = {
    currentEvents: [],
    eventCursor: 0,
    
    // 装载磁带的“谱面”
    loadChoreography(choreoArray) {
        if (!choreoArray) { this.currentEvents = []; return; }
        // 按照时间强制排序，防止你在 JSON 里写错顺序
        this.currentEvents = choreoArray.sort((a, b) => a.time - b.time);
        this.eventCursor = 0;
    },
    
    // 被主循环的音频时钟驱动
    update(sec) {
        if (!this.currentEvents || this.eventCursor >= this.currentEvents.length) return;

        // 核心逻辑：只要当前音频时间大于等于下一个事件的时间，就立即触发！
        while (this.eventCursor < this.currentEvents.length && sec >= this.currentEvents[this.eventCursor].time) {
            let evt = this.currentEvents[this.eventCursor];
            this.executeEvent(evt);
            this.eventCursor++;
        }
    },
    
    // 执行具体指令
    executeEvent(evt) {
        // console.log(`[DIRECTOR] 卡点触发: ${evt.action} @ ${evt.time}s`);
        if (evt.action === 'SPAWN') {
            let spawnX = evt.x !== undefined ? evt.x : (40 + Math.random() * (width - 80));
            window.spawnEnemyByType(evt.type, spawnX, evt.options || {});
        } else if (evt.action === 'MESSAGE') {
            showSystemMessage(evt.text, evt.color || '#00e5ff');
            triggerShake(2, 5);
        } else if (evt.action === 'WAVE_TOAST') {
            EventBus.emit('WAVE_STARTED', { name: evt.text, color: evt.color || '#ff1744' });
        }
    }
};

// --- [8] 引擎底层函数 ---

function updateUIRects() {
    // [架构修复] 废弃 shop-btn-cvs，将货币的吸收视觉终点安全重定向至终端入口
    let termEl = document.getElementById('terminal-btn-cvs');
    if (termEl) {
        let sR = termEl.getBoundingClientRect(); 
        shopBtnRect = { x: sR.left + sR.width / 2, y: sR.top + sR.height / 2 };
    }
    
    let skEl = document.getElementById('skill-btn-cvs');
    if (skEl) {
        let skR = skEl.getBoundingClientRect(); 
        skillBtnRect = { x: skR.left + skR.width / 2, y: skR.top + skR.height / 2 };
    }
}


function openWorkshop() { 
    Object.values(screens).forEach(s => s.classList.remove('active')); 
    screens.workshop.classList.add('active'); 
    document.getElementById('workshop-textarea').value = JSON.stringify(WORKSHOP.data, null, 4); 
    document.getElementById('workshop-status').innerText = "等待指令..."; 
    document.getElementById('workshop-status').style.color = "#00e676"; 
}

function closeWorkshop() { 
    showScreen('start'); 
}

function applyWorkshopData() { 
    try { 
        let newData = JSON.parse(document.getElementById('workshop-textarea').value); 
        Object.assign(WORKSHOP.data, newData); 
        
        upgradePool.length = 0; 
        baseUpgradePool.forEach(item => { 
            upgradePool.push({ ...item, ...(WORKSHOP.data.items[item.id] || {}) }); 
        }); 
        
        ENEMY_TYPES.length = 0; 
        Object.keys(WORKSHOP.data.enemies).forEach(key => { 
            ENEMY_TYPES.push({ type: key, ...WORKSHOP.data.enemies[key] }); 
        }); 
        
        document.getElementById('workshop-status').innerText = "[SUCCESS] 数据已完美注入引擎内核。"; 
        document.getElementById('workshop-status').style.color = "#00e676"; 
    } catch (e) { 
        document.getElementById('workshop-status').innerText = "[ERROR] JSON 格式解析崩溃: " + e.message; 
        document.getElementById('workshop-status').style.color = "#ff1744"; 
    } 
}

window.spawnEnemyByType = function(type, x, options = {}) {
    let side = (x < width / 2) ? 'left' : 'right'; 
    let forceHeal = options.forceHeal || false; 
    let speedOver = options.speedOverride || null; 
    let isDF = options.isDumbFire || false; 
    let fireInt = options.fireInterval || null; 
    let forceBat = options.forceBattery || false;
    
    if (type.startsWith('Formation_')) { 
        let formName = type.replace('Formation_', ''); 
        let formDef = WORKSHOP.formations[formName]; 
        
        if (formDef) { 
            let cx = Math.max(40, Math.min(width - 40, x)); 
            formDef.forEach(en => { 
                let rx = cx + (en.x || 0); 
                let ry = options.y ? options.y + (en.y || 0) : -40 + (en.y || 0); 
                let eOpts = { 
                    forceHeal: en.forceHeal || forceHeal, 
                    forceBattery: en.forceBattery || forceBat, 
                    speedOverride: en.speed || null, 
                    y: ry, 
                    isDumbFire: en.isDumbFire || isDF, 
                    fireInterval: en.fireInterval || fireInt 
                }; 
                window.spawnEnemyByType(en.type, rx, eOpts); 
            }); 
        } 
        return; 
    }
    
    let e = null; 
    let startY = options.y || -40;
    
    switch (type) {
        case 'Locator': e = new Locator(x, startY, false, forceHeal, speedOver); break; 
        case 'LocatorSwarm': e = new Locator(x, startY, true, forceHeal, speedOver); break; 
        case 'WandererLow': e = new Wanderer(x, startY, false, null, false, forceHeal, side); break; 
        case 'WandererHigh': e = new Wanderer(x, startY, true, null, false, forceHeal, side); break; 
        case 'WandererSwarm': e = new Wanderer(x, startY, false, Math.random() * Math.PI * 2, true, forceHeal, side); break; 
        case 'Kamikaze': e = new Kamikaze(x, startY); break; 
        case 'KamikazeSwarm': e = new Kamikaze(x, startY, 'swarm'); break; 
        case 'KamikazeSpec': e = new Kamikaze(x, startY, 'special'); break; 
        case 'ArcFlyer': e = new ArcFlyer(0, startY + 20, Math.random() > 0.5); break; 
        case 'ArcFlyerSwarm': e = new ArcFlyer(0, startY + 20, Math.random() > 0.5, 0, true); break; 
        case 'Turret': e = new Turret(x, startY, false, forceHeal, isDF); break; 
        case 'TurretSwarm': e = new Turret(x, startY, true, forceHeal, isDF); break; 
        case 'Tank': e = new Tank(x, startY); break;
        case 'TankSwarm': e = new Tank(x, startY, false, true); break;
        case 'CrystalLocator': e = new CrystalLocator(x, startY, speedOver); break;
    }
    
    if (e) {
        if (speedOver !== null && e.speed !== undefined) e.speed = speedOver;
        if (isDF) e.isDumbFire = true;
        if (forceBat) e.isBattery = true;
        if (fireInt !== null) { e.fireInterval = fireInt; e.shootTimer = fireInt; }
        if (options.hpMod !== undefined) { e.hp = Math.max(1, Math.round(e.hp * options.hpMod)); e.maxHp = e.hp; }
        enemies.push(e);
    }
};

// --- [9] UI 控制与屏幕切换 ---

function showScreen(screenId) {
    Object.values(screens).forEach(s => s.classList.remove('active')); 
    
    if (screenId) screens[screenId].classList.add('active');
    
    const inGameUIElements = [ui.topLeftCont, ui.sideBtns];
    
    if (screenId === 'start' || screenId === 'gameOver' || screenId === 'workshop') { 
        inGameUIElements.forEach(el => { if (el) el.classList.add('hud-hidden'); }); 
        if (ui.bossHpCont) ui.bossHpCont.style.opacity = 0; 
        ui.waveToast.style.opacity = 0; 
    } else { 
        inGameUIElements.forEach(el => { if (el) el.classList.remove('hud-hidden'); }); 
        if (isBossSpawned && ui.bossHpCont) ui.bossHpCont.style.opacity = 1; 
    }

    // 核心引擎层挂载：根据 UI 面板开闭自动派发音频滤波事件
    if (screenId && ['settings', 'pause', 'shop', 'loadout', 'workshop'].includes(screenId)) {
        EventBus.emit('UI_OPENED');
    } else if (!screenId) { 
        EventBus.emit('UI_CLOSED');
    }

    updateUIRects();
}

function gameOver(title, isVictory) {
    gameState = 'GAMEOVER'; 
    EventBus.emit('SYS_LEVEL_EXITED'); 

    let m = Math.floor(gameTimeSeconds / 60).toString().padStart(2, '0'); 
    let s = (gameTimeSeconds % 60).toString().padStart(2, '0'); 
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

function initDifficultyUI() { 
    if (unlockedDifficulty >= 2) document.getElementById('diff-nightmare').classList.remove('locked'); 
    selectDifficulty(Math.min(currentDifficulty, unlockedDifficulty >= 2 ? 3 : 2)); 
}

function selectDifficulty(level) { 
    if (level === 3 && unlockedDifficulty < 2) return; 
    currentDifficulty = level; 
    document.querySelectorAll('.diff-btn').forEach((btn, idx) => { 
        if (idx === level) btn.classList.add('selected'); else btn.classList.remove('selected'); 
    }); 
    document.getElementById('diff-desc').innerText = DIFF_CONFIG[level].desc; 
    if (level === 3) document.getElementById('diff-desc').style.color = '#ff1744'; 
    else document.getElementById('diff-desc').style.color = '#ffeb3b'; 
}

function unlockNextDifficulty() { 
    if (currentDifficulty >= 1 && unlockedDifficulty < 2) { 
        unlockedDifficulty = 2; 
        try { localStorage.setItem('pixelRogueUnlockedDiff', '2'); } catch (e) {} 
    } 
    if (currentDifficulty === 3) { 
        abyssCleared = true; 
        try { localStorage.setItem('pixelRogueAbyssCleared', 'true'); } catch (e) {} 
    } 
}

function drawIndicator(color) { 
    let ic = ui.indCvs.getContext('2d'); 
    ic.clearRect(0, 0, 16, 16); 
    ic.fillStyle = '#555'; ic.beginPath(); ic.arc(8, 8, 7, 0, Math.PI * 2); ic.fill(); 
    ic.fillStyle = '#222'; ic.beginPath(); ic.arc(8, 8, 6, 0, Math.PI * 2); ic.fill(); 
    ic.shadowBlur = 4; ic.shadowColor = color; ic.fillStyle = color; ic.beginPath(); ic.arc(8, 8, 4, 0, Math.PI * 2); ic.fill(); 
    ic.shadowBlur = 0; ic.fillStyle = '#fff'; ic.fillRect(6, 5, 2, 2); 
}

function drawPixelButton(id, icon, progress, color) { 
    let cvs = document.getElementById(id); 
    if (!cvs) return; 
    let ctx = cvs.getContext('2d'); 
    ctx.clearRect(0, 0, 48, 48); 
    ctx.fillStyle = '#111'; ctx.fillRect(4, 4, 40, 40); 
    if (progress > 0) { 
        ctx.fillStyle = color; 
        ctx.globalAlpha = progress >= 1 ? 0.6 : 0.4; 
        let fillH = Math.floor(40 * Math.min(1, progress)); 
        ctx.fillRect(4, 44 - fillH, 40, fillH); 
        ctx.globalAlpha = 1.0; 
    } 
    ctx.fillStyle = '#555'; ctx.fillRect(4, 0, 40, 4); ctx.fillRect(4, 44, 40, 4); ctx.fillRect(0, 4, 4, 40); ctx.fillRect(44, 4, 4, 40); 
    ctx.fillRect(2, 2, 4, 4); ctx.fillRect(42, 2, 4, 4); ctx.fillRect(2, 42, 4, 4); ctx.fillRect(42, 42, 4, 4); 
    
    // 【L1 修复：白色的、尺寸与技能一致的原生像素加号】
    if (icon === '+') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(22, 16, 4, 16); 
        ctx.fillRect(16, 22, 16, 4); 
    } else if (icon) {
        ctx.drawImage(icon, 24 - icon.width / 2, 24 - icon.height / 2); 
    }
}

 

let offsetCanvas = document.getElementById('offsetCanvas'); 
let offsetCtx = offsetCanvas.getContext('2d'); 
let sensCanvas = document.getElementById('sensCanvas'); 
let sensCtx = sensCanvas.getContext('2d');

function setControlMode(mode) { 
    config.controlMode = mode; 
    document.getElementById('ctrl-mode-abs').classList.toggle('selected', mode === 'absolute'); 
    document.getElementById('ctrl-mode-rel').classList.toggle('selected', mode === 'relative'); 
    document.getElementById('settings-abs-ui').classList.toggle('ctrl-hidden', mode === 'relative'); 
    document.getElementById('settings-rel-ui').classList.toggle('ctrl-hidden', mode === 'absolute'); 
}

function setTouchMode(mode) { 
    config.touchMode = mode; 
    document.getElementById('ctrl-touch-single').classList.toggle('selected', mode === 'single'); 
    document.getElementById('ctrl-touch-multi').classList.toggle('selected', mode === 'multi'); 
}

function drawOffsetWidget() { 
    offsetCtx.clearRect(0, 0, 80, 80); offsetCtx.beginPath(); offsetCtx.arc(40, 40, 35, 0, Math.PI * 2); 
    offsetCtx.strokeStyle = '#444'; offsetCtx.lineWidth = 4; offsetCtx.stroke(); 
    offsetCtx.beginPath(); 
    let pct = Math.min(1, Math.max(0, config.controlOffsetY / 200)); 
    offsetCtx.arc(40, 40, 35, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * pct)); 
    offsetCtx.strokeStyle = '#00e676'; offsetCtx.stroke(); 
    document.getElementById('offset-val').innerText = config.controlOffsetY; 
}

function drawSensWidget() { 
    sensCtx.clearRect(0, 0, 80, 80); sensCtx.beginPath(); sensCtx.arc(40, 40, 35, 0, Math.PI * 2); 
    sensCtx.strokeStyle = '#444'; sensCtx.lineWidth = 4; sensCtx.stroke(); 
    sensCtx.beginPath(); 
    let pct = Math.min(1, Math.max(0, (config.controlSens - 0.5) / 2.5)); 
    sensCtx.arc(40, 40, 35, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * pct)); 
    sensCtx.strokeStyle = '#ab47bc'; sensCtx.stroke(); 
    document.getElementById('sens-val').innerText = config.controlSens.toFixed(1) + 'x'; 
}

function toggleSetting(key) { 
    config[key] = !config[key]; 
    ui.dmgBtn.innerText = `伤害飘字: ${config.dmgText ? '开' : '关'}`; 
    ui.shakeBtn.innerText = `屏幕震动: ${config.shake ? '开' : '关'}`; 
}

function openSettings(fromState) { 
    overlayHistory = fromState; 
    gameState = 'SETTINGS'; 
    document.getElementById('settings-sub-game').classList.add('ctrl-hidden'); 
    document.getElementById('settings-sub-control').classList.add('ctrl-hidden'); 
    document.getElementById('settings-main-list').classList.remove('ctrl-hidden'); 
    document.getElementById('settings-title').innerText = "系统设置"; 
    showScreen('settings'); 
}

function closeSettings() { 
    gameState = overlayHistory; 
    if (gameState === 'START') showScreen('start'); 
    else if (gameState === 'PAUSED') showScreen('pause'); 
    else showScreen(null); 
}

function enterSettingsSub(sub) { 
    document.getElementById('settings-main-list').classList.add('ctrl-hidden'); 
    document.getElementById('settings-sub-game').classList.add('ctrl-hidden'); 
    document.getElementById('settings-sub-control').classList.add('ctrl-hidden'); 
    document.getElementById('settings-sub-' + sub).classList.remove('ctrl-hidden'); 
    document.getElementById('settings-title').innerText = (sub === 'control') ? "操控设定" : "系统与画面"; 
    if (sub === 'control') { drawOffsetWidget(); drawSensWidget(); } 
}

function backToSettingsMain() { 
    document.getElementById('settings-sub-game').classList.add('ctrl-hidden'); 
    document.getElementById('settings-sub-control').classList.add('ctrl-hidden'); 
    document.getElementById('settings-main-list').classList.remove('ctrl-hidden'); 
    document.getElementById('settings-title').innerText = "系统设置"; 
}

function triggerShake(intensity, duration) { 
    if (!config.shake) return; 
    shakeIntensity = intensity; 
    shakeTimer = duration; 
}

function showSystemMessage(msg, color) { 
    ui.sysMessage.innerText = msg; 
    ui.sysMessage.style.color = color; 
    ui.sysMessage.style.opacity = 1; 
    setTimeout(() => { ui.sysMessage.style.opacity = 0; }, 3000); 
}

function startEnding(type) {
    if (endingState !== 'none') return;
    endingState = type;
    if (type === 'playerDead') { 
        endingTimer = 120; 
        createExplosion(player.x, player.y, '#00b0ff', 60); 
        triggerShake(20, 30); 
    } else if (type === 'bossDead') { 
        endingTimer = 240; 
        triggerShake(25, 240); 
    }
}

// --- [10] 环境与星空 ---

function initStars() {
    stars = [];
    const farColors = ['#0a0f24', '#120b1f', '#05111c'];
    for (let i = 0; i < 50; i++) { 
        stars.push({ x: Math.random() * width, y: Math.random() * height, speed: 0.1 + Math.random() * 0.1, size: 1, alpha: 0.15 + Math.random() * 0.15, color: farColors[Math.floor(Math.random() * farColors.length)], isStreaked: false }); 
    }
    const middleColors = ['#1a334d', '#2d1a4d'];
    for (let i = 0; i < 20; i++) { 
        stars.push({ x: Math.random() * width, y: Math.random() * height, speed: 0.4 + Math.random() * 0.2, size: 2, alpha: 0.25 + Math.random() * 0.15, color: middleColors[Math.floor(Math.random() * middleColors.length)], isStreaked: false }); 
    }
    const nearColors = ['#0088cc', '#6600cc'];
    for (let i = 0; i < 6; i++) { 
        stars.push({ x: Math.random() * width, y: Math.random() * height, speed: 2.0 + Math.random() * 1.0, streakWidth: 1, streakMultiplier: 1.5, alpha: 0.3 + Math.random() * 0.2, color: nearColors[Math.floor(Math.random() * nearColors.length)], isStreaked: true }); 
    }
}

function updateAndDrawStars(ctx, isPlaying) {
    stars.forEach(star => {
        if (isPlaying && hitStopFrames <= 0) star.y += star.speed;
        if (star.y > height) { star.y = 0; star.x = Math.random() * width; }
        ctx.globalAlpha = star.alpha; 
        ctx.fillStyle = star.color;
        if (star.isStreaked) { 
            ctx.fillRect(star.x, star.y, star.streakWidth, star.speed * star.streakMultiplier); 
        } else if (star.size === 2) { 
            ctx.fillRect(star.x, star.y, 1, 2); 
        } else { 
            ctx.fillRect(star.x, star.y, star.size, star.size); 
        }
    });
    ctx.globalAlpha = 1;
}

// --- [11] 核心战斗函数 ---

function activateSkill() {
    if (!player) return;
    if (player.skillEnergy >= player.maxSkillEnergy && player.skillCdTimer <= 0 && player.skillActiveTimer <= 0) {
        player.skillEnergy = 0;

        let bonusFrames = (player.upgrades['skill_duration'] || 0) * 60;
        player.skillActiveTimer = 600 + bonusFrames;

        // tech_ultimate：技能伤害乘区（通过临时标记传递到 Bullet）
        player.skillDamageMult = player.techTree && player.techTree.tech_ultimate
            ? Math.pow(1.4, player.techTree.tech_ultimate) : 1.0;

        // fp_ultimate：激活时发射20发全向弹
        if (player.techTree && player.techTree.fp_ultimate >= 1) {
            for (let i = 0; i < 20; i++) {
                let a = (Math.PI * 2 / 20) * i;
                let b = new Bullet(player.x, player.y, Math.cos(a) * 8, Math.sin(a) * 8,
                    4, 8, player.getStat('damage') * 0.5, 0, 1.0, 0.05, 1.5, '#ffea00');
                bullets.push(b);
            }
        }

        triggerShake(10, 10);
        flashScreenTimer = 15;
        flashScreenColor = '0, 229, 255';
        wasSkillFull = false;

        // 激活粒子圆环爆发
        for (let i = 0; i < 20; i++) {
            let angle = (Math.PI * 2 / 20) * i;
            let spd = 4 + Math.random() * 4;
            particles.push(new Particle(player.x, player.y, '#00e5ff',
                Math.cos(angle) * spd, Math.sin(angle) * spd, 22));
        }
        // 外圈黄色粒子
        for (let i = 0; i < 10; i++) {
            let angle = (Math.PI * 2 / 10) * i + 0.15;
            let spd = 2 + Math.random() * 2;
            particles.push(new Particle(player.x, player.y, '#ffea00',
                Math.cos(angle) * spd, Math.sin(angle) * spd, 30));
        }

        updateHUD();
    } else {
        triggerShake(4, 4);
    }
}


function applyElastic(obj, targetNode, type = 'hp') { 
    if (obj.vx === undefined) { obj.vx = 0; obj.vy = 0; } 
    let physConfig = WORKSHOP.data.physics; 
    obj.vx += -obj.x * physConfig.hp_bounce_force; 
    obj.vy += -obj.y * physConfig.hp_bounce_force; 
    obj.vx *= physConfig.hp_damping; 
    obj.vy *= physConfig.hp_damping; 
    obj.x += obj.vx; obj.y += obj.vy; 
    if (targetNode) targetNode.style.transform = `translate(${obj.x}px, ${obj.y}px)`; 
}

function updateHUD() {
    if (!player) return;
    let isFullNow = (player.skillEnergy >= player.maxSkillEnergy);
    
    if (isFullNow && !wasSkillFull && player.skillCdTimer <= 0) {
        let force = WORKSHOP.data.physics.skill_vibrate_force;
        uiOffsets.skill.x = (Math.random() > 0.5 ? 1 : -1) * force;
        uiOffsets.skill.y = (Math.random() > 0.5 ? 1 : -1) * force;
    }
    wasSkillFull = isFullNow;

    ui.ptVal.innerText = `${player.pt.toFixed(1)} PT`;
    const hpPercent = Math.max(0, player.hp / player.getStat('maxHp'));
    let hpColor = '#e60050';
    if (hpPercent > 0.7) hpColor = '#00e676';
    else if (hpPercent > 0.4) hpColor = '#ffea00';
    else if (hpPercent > 0.2) hpColor = '#ff9800';

    ui.hpVal.style.color = hpColor;
    ui.hpVal.innerText = `${Math.floor(player.hp)}%`;

    let indColor = '#00e676';
    let cassette = WORKSHOP.cassettes[currentLevel];
    if (cassette && cassette.timeline) {
        let st = cassette.state;
        let wave = cassette.timeline[st.currentWave];
        if (wave) {
            if (wave.type === 'p0_rest') {
                let remain = wave.duration - st.waveTimer;
                indColor = (remain <= 4) ? '#ffea00' : '#00e676';
            } else {
                indColor = '#ff1744';
            }
        } else {
            indColor = isBossSpawned ? '#ff1744' : '#00e676';
        }
        // 检测进入 p0_rest：终端按钮震荡提示商店可用
        let isRestNow = !!(wave && wave.type === 'p0_rest');
        if (isRestNow && !wasInRestPhase) {
            let force = WORKSHOP.data.physics.skill_vibrate_force || 8;
            uiOffsets.terminal.x = (Math.random() > 0.5 ? 1 : -1) * force;
            uiOffsets.terminal.y = (Math.random() > 0.5 ? 1 : -1) * force;
            if (player) player.ironWallUsed = false;
        }
        wasInRestPhase = isRestNow;
    } else {
        let isProtected = gameTimeSeconds < DIFF_CONFIG[currentDifficulty].protectionTime;
        if (isProtected) indColor = '#00e5ff'; else indColor = '#ffea00';
        wasInRestPhase = false;
    }
    
    drawIndicator(indColor); 
    updatePixelButtons();
}

function updatePixelButtons() {
    if (!player) return;
    let skProg = player.skillActiveTimer > 0 ? (player.skillActiveTimer / 600) : (player.skillCdTimer > 0 ? (1 - player.skillCdTimer / 900) : player.skillEnergy / player.maxSkillEnergy);
    let ratio = player.skillEnergy / player.maxSkillEnergy;
    let skColor;
    if (player.skillActiveTimer > 0)  skColor = '#00e5ff';
    else if (player.skillCdTimer > 0) skColor = '#ff1744';
    else                              skColor = '#00b0ff';
    
    drawPixelButton('skill-btn-cvs', sprites.i_skill, skProg, skColor); 
    drawPixelButton('pause-btn-cvs', sprites.i_pause, 0, '#fff');
    // [修改] 渲染终极统一入口 Terminal
    drawPixelButton('terminal-btn-cvs', '+', 0, '#00e5ff'); 
}

const setupMultiTouchButtons = () => {
    const btnMap = { 
        'pause-btn-cvs': togglePause, 
        'skill-btn-cvs': activateSkill, 
        // [修改] 接入 Terminal 呼出逻辑
        'terminal-btn-cvs': toggleTerminal 
    };
    for (let id in btnMap) { 
        let el = document.getElementById(id); 
        if (el) { 
            el.onpointerdown = (e) => { e.preventDefault(); e.stopPropagation(); btnMap[id](); }; 
        } 
    }
};


// --- [12] 商店与背包逻辑 ---
function getShopCost(opt) { 
    let baseCst = (opt.type === 'equip' && !player.equipment[opt.id].owned) ? opt.initialCost : (opt.type === 'equip' ? opt.cost + player.equipment[opt.id].level * opt.costStep : opt.cost); 
    let diffMult = currentDifficulty === 3 ? 1.2 : 1.0; 
    let inflationMult = 1.0 + (shopInflation / 100.0); 
    return parseFloat((baseCst * diffMult * inflationMult).toFixed(1)); 
}

function getWeightedRandomItem(excludeIds) { 
    let cassette = WORKSHOP.cassettes[currentLevel] || WORKSHOP.cassettes['debug']; 
    let shopItems = cassette.shopItems || 'ALL'; 
    let availableItems = upgradePool.filter(item => { 
        if (excludeIds.includes(item.id)) return false; 
        if (item.id === 'repair' || item.id === 'emergency_repair') return false; 
        if (shopItems !== 'ALL' && !shopItems.includes(item.id)) return false; 
        if (shopItems === 'ALL') { 
            if (player.totalUpgradePoints < item.unlockPT || gameTimeSeconds < item.unlockTime) return false; 
        } 
        if (item.type === 'equip') { 
            if (!player.equipment[item.id] || !player.equipment[item.id].owned) return true; 
            return player.equipment[item.id].level < item.max; 
        } 
        return (item.max === 999) ? true : ((player.upgrades[item.id] || 0) < item.max); 
    }); 
    
    if (availableItems.length === 0) return null; 
    
    // 【架构级修复：绝对防御机制】如果 RARITY 字典读取失败，默认赋予 10 点权重，绝不崩溃
    let totalWeight = availableItems.reduce((sum, item) => {
        let w = (typeof RARITY !== 'undefined' && RARITY[item.rarity]) ? RARITY[item.rarity].weight : 10;
        return sum + w;
    }, 0); 
    
    let roll = Math.random() * totalWeight; 
    let weightSum = 0; 
    for (let item of availableItems) { 
        let w = (typeof RARITY !== 'undefined' && RARITY[item.rarity]) ? RARITY[item.rarity].weight : 10;
        weightSum += w; 
        if (roll <= weightSum) return item; 
    } 
    return availableItems[availableItems.length - 1]; 
}




function generateShopItems() { 
    currentShopItems = []; 
    let excludeIds = []; 
    for (let i = 0; i < 3; i++) { 
        let item = getWeightedRandomItem(excludeIds); 
        if (item) { 
            currentShopItems.push(item); 
            if (item.max !== 999) excludeIds.push(item.id); 
        } 
    } 
}

function openShop() { 
    gameState = 'SHOP'; 
    if (currentShopItems.length === 0) generateShopItems(); 
    renderShopCards(); 
    showScreen('shop'); 
}

function closeShop() { 
    gameState = 'PLAYING'; 
    showScreen(null); 
}

function openLoadout(fromState) { 
    overlayHistory = fromState; 
    gameState = 'LOADOUT'; 
    renderLoadout(); 
    showScreen('loadout'); 
}

function closeLoadout() { 
    gameState = overlayHistory; 
    if (gameState === 'PLAYING') showScreen(null); 
    else showScreen(overlayHistory.toLowerCase()); 
}

function createIconCvs(id) { 
    let iconCvs = document.createElement('canvas'); 
    iconCvs.width = 12; iconCvs.height = 12; 
    iconCvs.getContext('2d').drawImage(sprites.eqIcons[id] || sprites.eqIcons['default'], 0, 0); 
    return iconCvs; 
}

function renderLoadout() { 
    ui.loadoutSlotsText.innerText = `${player.usedSlots} / ${player.maxSlots}`; 
    ui.coreSlotsGrid.innerHTML = ''; 
    ui.extSlotsGrid.innerHTML = ''; 
    ui.inventoryList.innerHTML = ''; 
    let renderedCoreSlots = 0; 
    let hasInv = false; 
    
    for (let id in player.equipment) { 
        let eq = player.equipment[id]; 
        if (!eq.owned) continue; 
        
        if (eq.equipped) { 
            let chip = document.createElement('div'); 
            let isLocked = eq.canUnequip === false; 
            chip.className = `equip-chip ${eq.slotCost > 0 ? 'core-chip' : 'ext-chip'} ${isLocked ? 'locked-chip' : ''}`; 
            chip.innerHTML = `<span style="font-size:8px; color:#fff">${eq.name} Lv.${eq.level}</span>`; 
            chip.onclick = function () { toggleEquipment(id); }; 
            
            if (eq.slotCost > 0) { 
                ui.coreSlotsGrid.appendChild(chip); 
                renderedCoreSlots += eq.slotCost; 
            } else { 
                ui.extSlotsGrid.appendChild(chip); 
            } 
        } else { 
            hasInv = true; 
            let card = document.createElement('div'); 
            card.className = 'upgrade-card equip-inactive'; 
            card.innerHTML = `<div class="card-title">${eq.name}</div>`; 
            card.onclick = function () { toggleEquipment(id); }; 
            ui.inventoryList.appendChild(card); 
        } 
    } 
}

function toggleEquipment(id) { 
    let eq = player.equipment[id]; 
    if (eq.equipped) { 
        if (!eq.canUnequip) { triggerShake(4, 4); return; } 
        eq.equipped = false; 
        player.usedSlots -= eq.slotCost; 
    } else { 
        if (player.usedSlots + eq.slotCost <= player.maxSlots) { 
            eq.equipped = true; 
            player.usedSlots += eq.slotCost; 
        } else { 
            triggerShake(4, 4); 
            return; 
        } 
    } 
    renderLoadout(); 
    updateHUD(); 
}

function renderShopCards() {
    ui.shopPts.innerText = player.pt.toFixed(1);
    ui.shopCards.innerHTML = '';
    currentShopItems.forEach((opt, i) => {
        if (opt.soldOut) {
            ui.shopCards.innerHTML += `<div class="upgrade-card disabled" style="opacity:0.25;justify-content:center;">
                <div style="font-family:'Press Start 2P',monospace;font-size:8px;color:#444;">— 已售出 —</div></div>`;
            return;
        }
        let itemCost = getShopCost(opt);
        let canBuy = player.pt >= itemCost;
        let rDef = (typeof RARITY !== 'undefined' && RARITY[opt.rarity]) ? RARITY[opt.rarity] : { color: '#fff', name: '' };
        let icon = getItemIcon(opt.id);
        let lvText = opt.type === 'equip'
            ? `Lv.${(player.equipment[opt.id] && player.equipment[opt.id].owned) ? player.equipment[opt.id].level : 0}/${opt.max || '?'}`
            : (opt.max && opt.max < 999 ? `${(player.upgrades[opt.id]||0)}/${opt.max}` : '');
        const el = document.createElement('div');
        el.className = `upgrade-card ${canBuy ? '' : 'disabled'}`;
        el.style.borderColor = rDef.color + '55';
        el.innerHTML = `
            <div class="card-item-icon">${icon}</div>
            <div class="card-info">
                <div class="card-title">
                    <span style="color:${rDef.color}">${opt.name}</span>
                    <span class="card-rarity" style="color:${rDef.color};border-color:${rDef.color};">${rDef.name || opt.rarity || ''}</span>
                </div>
                ${opt.desc ? `<div class="card-desc">${opt.desc}</div>` : ''}
            </div>
            <div class="card-cost-box">
                <div class="card-cost" style="color:${canBuy ? '#ffea00' : '#555'}">${itemCost.toFixed(1)}</div>
                <div class="card-cost-label">PT</div>
                <div class="card-max">${lvText}</div>
            </div>`;
        el.onclick = () => { if (canBuy) buyUpgrade(i); };
        ui.shopCards.appendChild(el);
    });
}

function refreshShop() { 
    let rc = BASE_REFRESH_COST; 
    if (player.pt >= rc) { 
        player.pt -= rc; 
        shopInflation += WORKSHOP.data.economy.refresh_inflation; 
        generateShopItems(); 
        renderShopCards(); 
    } 
}

function buyUpgrade(index) { 
    let opt = currentShopItems[index]; 
    if (!opt || opt.soldOut) return;
    
    let cost = getShopCost(opt); 
    if (player.pt >= cost) { 
        player.pt -= cost; 
        if (opt.type === 'equip') { 
            if (!player.equipment[opt.id].owned) { 
                player.equipment[opt.id].owned = true; 
                player.equipment[opt.id].level = 1; 
                if (player.usedSlots + player.equipment[opt.id].slotCost <= player.maxSlots) {
                    player.equipment[opt.id].equipped = true;
                    player.usedSlots += player.equipment[opt.id].slotCost;
                }
            } else { 
                player.equipment[opt.id].level++; 
            } 
        } else {
            player.upgrades[opt.id] = (player.upgrades[opt.id] || 0) + 1;
            if (opt.id === 'slot') player.maxSlots = 3 + player.upgrades.slot;
        }
        
        // [L1 经济学修复：买完后标记为售罄，绝不免费自动补货]
        currentShopItems[index] = { soldOut: true };
        
        switchTerminalTab('shop'); 
        updateHUD(); 
    } 
}


function getPlayerPowerScore() { 
    let power = (player.damage * (player.equipment['debt_protocol'].equipped ? 0.8 : 1.0) - 12) * 0.2; 
    if(player.equipment.speed.equipped) power += 3; 
    if(player.equipment.spread.equipped) power += 5; 
    if(player.equipment.laser.equipped) power += 10; 
    return isNaN(power) ? 0 : Math.max(0, power); 
}

// --- [13] 关卡导演逻辑 ---

function doDirectorSpawns(sec) {
    let maxE = DIFF_CONFIG[currentDifficulty].maxEnemies;
    if (enemies.length >= maxE) return;
}

function updateDifficultyMetrics() {
    if (frameCount % 60 === 0) {
        gameTimeSeconds++;
        levelHpMultiplier = 1 + Math.pow(gameTimeSeconds / 100, 1.2) * 0.5;
        if (shopInflation > 0) shopInflation = Math.max(0, shopInflation - WORKSHOP.data.economy.cooling_rate);
    }
}

// --- [14] 输入处理与主循环 ---

let widgetDragging = null; 
let lastTouchX = 0, lastTouchY = 0;

document.getElementById('offset-widget').addEventListener('touchstart', e => { 
    widgetDragging = 'offset'; lastTouchX = e.touches[0].clientX; lastTouchY = e.touches[0].clientY; e.preventDefault(); 
}, {passive: false});

document.getElementById('sens-widget').addEventListener('touchstart', e => { 
    widgetDragging = 'sens'; lastTouchX = e.touches[0].clientX; lastTouchY = e.touches[0].clientY; e.preventDefault(); 
}, {passive: false});

window.addEventListener('touchmove', e => {
    if (!widgetDragging) return;
    let dx = e.touches[0].clientX - lastTouchX; 
    let dy = lastTouchY - e.touches[0].clientY; 
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        let valChange = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : -1) : (dy > 0 ? 1 : -1);
        if (widgetDragging === 'offset') { 
            config.controlOffsetY = Math.max(0, Math.min(200, config.controlOffsetY + valChange * 2)); 
            drawOffsetWidget(); 
        } else if (widgetDragging === 'sens') { 
            config.controlSens = Math.max(0.5, Math.min(3.0, config.controlSens + valChange * 0.1)); 
            drawSensWidget(); 
        }
        lastTouchX = e.touches[0].clientX; 
        lastTouchY = e.touches[0].clientY;
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
                if (config.controlMode === 'absolute') { 
                    player.targetX = touchStartX; 
                    player.targetY = touchStartY - config.controlOffsetY; 
                }
                break;
            }
        }
    } else {
        isTouchActive = true; touchStartX = e.touches[0].clientX; touchStartY = e.touches[0].clientY;
        if (config.controlMode === 'absolute') { 
            player.targetX = touchStartX; 
            player.targetY = touchStartY - config.controlOffsetY; 
        }
    }
}

function handleTouchMove(e) {
    if (!isTouchActive || gameState !== 'PLAYING' || endingState !== 'none') return;
    let clientX, clientY;
    if (config.touchMode === 'multi') {
        let found = false;
        for(let i=0; i<e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === shipTouchId) { 
                clientX = e.changedTouches[i].clientX; clientY = e.changedTouches[i].clientY; found = true; break; 
            }
        }
        if (!found) return; 
    } else { 
        clientX = e.touches[0].clientX; clientY = e.touches[0].clientY; 
    }
    
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
    } else { 
        if (e.touches.length === 0) { isTouchActive = false; } 
    }
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
        if (player && player.hp > 0 && endingState !== 'playerDead') player.update();

        // === [绝对音频时钟与导演系统] ===
                // === [绝对音频时钟与导演系统] ===
        if (endingState === 'none') {
            let sec = (typeof AudioSystem !== 'undefined' && AudioSystem.getTrackTime() > 0) 
                      ? AudioSystem.getTrackTime() 
                      : (gameTimeSeconds + (frameCount % 60) / 60);
            
            gameTimeSeconds = Math.floor(sec);

            if (frameCount % 60 === 0) {
                levelHpMultiplier = 1 + Math.pow(sec / 100, 1.2) * 0.5;
                if (shopInflation > 0) shopInflation = Math.max(0, shopInflation - WORKSHOP.data.economy.cooling_rate);
            }

            // 【修复：重新声明 cassette 变量，供后续逻辑读取】
            let cassette = WORKSHOP.cassettes[currentLevel] || WORKSHOP.cassettes['debug'];

            // 高精度读谱器接管战场
            if (typeof DirectorSystem !== 'undefined') {
                DirectorSystem.update(sec);
            }

            // 波次时间线脚本（sector1 等基于 timeline 的关卡）
            if (cassette && typeof cassette.script === 'function') {
                cassette.script.call(cassette, sec, frameCount);
            }
            
            // 极简视觉律动引擎
            let currentBPM = (cassette && cassette.bpm) ? cassette.bpm : 120; 
            let beatInterval = 60 / currentBPM;
            let beat = (sec % beatInterval) / beatInterval;
            ctx.globalAlpha = 0.8 + 0.2 * (1 - beat);
        }


        if (player) {
            if (player.skillActiveTimer > 0) {
                player.skillActiveTimer--;
                if (player.skillActiveTimer <= 0) {
                    // skill_cd 缩减：每级冷却 -15%（tech_skillcd 科技树额外加成）
                    let totalCdLevels = (player.upgrades.skill_cd || 0) + ((player.techTree && player.techTree.tech_skillcd) || 0);
                    let cdReduction = 1.0 - Math.min(0.60, totalCdLevels * 0.15);
                    player.skillCdTimer = Math.round(900 * cdReduction);
                    player.skillDamageMult = 1.0;
                    // 技能结束时的短暂红色提示
                    flashScreenTimer = 8;
                    flashScreenColor = '255, 100, 0';
                    triggerShake(4, 4);
                }
            } else if (player.skillCdTimer > 0) { player.skillCdTimer--; }
        }

        applyElastic(uiOffsets.hp, ui.hpVal, 'hp');
        applyElastic(uiOffsets.skill, document.getElementById('skill-btn-cvs'), 'skill');
        applyElastic(uiOffsets.terminal, document.getElementById('terminal-btn-cvs'), 'terminal');
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
                    if (player.upgrades && player.upgrades.aoe > 0) triggerAOE(e.x, e.y);
                    // afterburn：命中后有概率留下燃烧AOE（小范围持续伤害）
                    let afterburnLevel = (player.upgrades && player.upgrades.afterburn || 0) + ((player.techTree && player.techTree.fp_afterburn) || 0);
                    if (afterburnLevel > 0 && Math.random() < 0.25 * afterburnLevel) {
                        triggerAOE(e.x, e.y, player.getStat('damage') * 0.3, 28);
                    }
                    if (b.hitEnemies.size > b.pierceCount) {
                        b.active = false;
                        if(!player.upgrades || player.upgrades.aoe === 0) particles.push(new Particle(b.x, b.y, isCrit ? '#ffea00' : '#ffffff', (Math.random()-0.5)*4, (Math.random()-0.5)*4, 6));
                    }
                }
            });
        });

        let totalWingman = ((player && player.upgrades && player.upgrades.wingman) || 0) + ((player && player.techTree && player.techTree.tech_wingman) || 0);
        if (player && totalWingman > 0 && player.hp > 0 && endingState !== 'playerDead') {
            let wTime = frameCount * 0.05;
            for (let i = 0; i < totalWingman; i++) {
                let angle = wTime + (i * Math.PI * 2 / totalWingman);
                let wx = player.x + Math.cos(angle) * 35; let wy = player.y + Math.sin(angle) * 35;
                ctx.fillStyle = '#ffea00'; ctx.fillRect(wx - 2, wy - 2, 4, 4);
                if (frameCount % 45 === 0) { bullets.push(new Bullet(wx, wy, 0, -18, 2, 8, player.damage * 0.4, 0, 1, player.critRate, player.critDamage, '#ffea00')); }
            }
        }
    }

    if (player && player.hp > 0 && endingState !== 'playerDead') player.draw(ctx);
    ctx.globalAlpha = 1.0; 
    
    processGroup(aoeEffects, isPlaying); processGroup(items, isPlaying); processGroup(bullets, isPlaying); processGroup(enemyBullets, isPlaying); processGroup(enemies, isPlaying); processGroup(particles, isPlaying); processGroup(floatingTexts, isPlaying);

    // === [生死结算状态机：之前被遗漏覆盖的区域] ===
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

function resize() { 
    width = window.innerWidth; 
    height = window.innerHeight; 
    canvas.width = width; 
    canvas.height = height; 
    ctx.imageSmoothingEnabled = false; 
    updateUIRects(); 
}
// --- [新增] 战术终端逻辑 ---
function toggleTerminal() {
    let terminalEl = document.getElementById('tactical-terminal');
    if (gameState === 'PLAYING') {
        gameState = 'TERMINAL';
        terminalEl.classList.remove('hud-hidden');
        EventBus.emit('UI_OPENED'); 
        switchTerminalTab('shop');  
    } else if (gameState === 'TERMINAL') {
        gameState = 'PLAYING';
        terminalEl.classList.add('hud-hidden');
        EventBus.emit('UI_CLOSED'); 
    }
}

function switchTerminalTab(tabId) {
    let view = document.getElementById('terminal-viewport');
    if (!player || !view) return;

    // Tab 激活状态高亮
    let tabBtns = document.querySelectorAll('#terminal-tab-bar > button.term-tab');
    tabBtns.forEach(btn => {
        btn.style.color = '#666';
        btn.style.borderBottom = '2px solid transparent';
        btn.style.background = 'none';
    });
    let activeBtn = document.getElementById('term-tab-' + tabId);
    if (activeBtn) {
        activeBtn.style.color = '#ffea00';
        activeBtn.style.borderBottom = '2px solid #ffea00';
    }

    const PIXEL_FONT = "'Press Start 2P', 'DotGothic16', monospace";
    const S = (css) => `style="${css}"`;

    if (tabId === 'shop') {
        // 仅在波次缓冲期（p0_rest）允许访问商店
        let _cas = WORKSHOP.cassettes[currentLevel];
        let _inRest = !!(gameState === 'GAMEOVER' || !(_cas && _cas.timeline) ||
                         (_cas.timeline[_cas.state.currentWave] && _cas.timeline[_cas.state.currentWave].type === 'p0_rest'));
        if (!_inRest) {
            view.innerHTML = `<div style="font-family:'Press Start 2P',monospace;font-size:9px;color:#ff9800;text-align:center;padding:40px 20px;line-height:2;">⚠ 战场锁定<br><br>仅限波次缓冲期<br>访问黑市网络</div>`;
            return;
        }
        if (typeof currentShopItems === 'undefined' || currentShopItems.length === 0) generateShopItems();
        let html = `<div ${S('font-family:'+PIXEL_FONT+';font-size:10px;color:#ff1744;letter-spacing:2px;margin-bottom:10px;')}>⬡ 黑市网络</div>`;
        html += `<div ${S('display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;')}>
            <span ${S('font-size:9px;color:#aaa;font-family:'+PIXEL_FONT)}>算力</span>
            <span ${S('color:#ffea00;font-family:'+PIXEL_FONT+';font-size:12px;')}>${player.pt.toFixed(1)} PT</span>
        </div>`;
        html += `<div ${S('display:flex;gap:8px;margin-bottom:14px;')}>`;
        currentShopItems.forEach((opt, index) => {
            if (opt.soldOut) {
                html += `<div ${S('flex:1;border:2px solid #222;padding:12px 8px;background:rgba(0,0,0,0.4);text-align:center;border-radius:4px;')}>
                    <div ${S('font-size:16px;margin-bottom:6px;color:#333;')}>✕</div>
                    <div ${S('color:#444;font-family:'+PIXEL_FONT+';font-size:7px;')}>已售出</div></div>`;
                return;
            }
            let cost = getShopCost(opt);
            let canBuy = player.pt >= cost;
            let rDef = (typeof RARITY !== 'undefined' && RARITY[opt.rarity]) ? RARITY[opt.rarity] : { color: '#fff', name: '' };
            let icon = getItemIcon(opt.id);
            let borderCol = canBuy ? '#ff1744' : '#333';
            let bgCol = canBuy ? 'rgba(255,23,68,0.07)' : 'rgba(0,0,0,0.25)';
            html += `<div onclick="${canBuy ? `terminalBuyRed(${index})` : ''}" ${S(`flex:1;border:2px solid ${borderCol};border-radius:4px;padding:12px 8px;background:${bgCol};cursor:${canBuy?'pointer':'not-allowed'};text-align:center;`)}>
                <div ${S('font-size:22px;margin-bottom:6px;')}>${icon}</div>
                <div ${S('font-family:'+PIXEL_FONT+';font-size:8px;color:'+rDef.color+';margin-bottom:4px;line-height:1.4;')}>${opt.name}</div>
                <div ${S('font-size:7px;color:#555;border:1px solid '+rDef.color+'44;border-radius:3px;padding:1px 4px;display:inline-block;margin-bottom:6px;color:'+rDef.color+';')}>${rDef.name || ''}</div>
                ${opt.desc ? `<div ${S('font-size:7px;color:#666;line-height:1.5;margin-bottom:8px;')}>${opt.desc}</div>` : ''}
                <div ${S('font-family:'+PIXEL_FONT+';font-size:11px;color:'+(canBuy?'#ffea00':'#444')+';margin-top:4px;border-top:1px solid #222;padding-top:8px;')}>${cost.toFixed(1)} PT</div>
            </div>`;
        });
        html += `</div>`;
        html += `<button onclick="terminalRefreshShop()" ${S('width:100%;padding:10px;background:rgba(10,10,10,0.9);color:#ff1744;border:2px solid #ff1744;border-radius:4px;cursor:pointer;font-family:'+PIXEL_FONT+';font-size:8px;letter-spacing:1px;')}>⟳ 强制刷新 (-1.0 PT)</button>`;
        view.innerHTML = html;

    } else if (tabId === 'tech') {
        const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];
        const branchColors = { root: '#00e676', fire: '#ff5722', def: '#42a5f5', tech: '#66bb6a' };

        let html = `<div ${S('font-family:'+PIXEL_FONT+';font-size:10px;color:#00e676;letter-spacing:2px;margin-bottom:8px;')}>■ 科技树</div>`;
        html += `<div ${S('font-size:9px;color:#aaa;margin-bottom:10px;')}>可用算力: <span ${S('color:#00e5ff;font-family:'+PIXEL_FONT)}>${player.pt.toFixed(1)} PT</span></div>`;

        const renderNode = (node) => {
            let curLv = (player.techTree && player.techTree[node.id]) || 0;
            let isMax = curLv >= node.maxLevel;
            let prereqMet = !node.prereq || ((player.techTree && player.techTree[node.prereq]) || 0) >= 1;
            let cost = isMax ? null : node.costs[curLv];
            let canBuy = prereqMet && !isMax && player.pt >= cost;
            let col = branchColors[node.branch] || '#888';
            let bg = isMax ? 'rgba(0,230,118,0.10)' : (prereqMet ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.2)');
            let border = isMax ? '#00e676' : (prereqMet ? col : '#333');
            let lvText = isMax ? 'MAX' : (curLv > 0 ? (ROMAN[curLv] || curLv) : '—');
            return `<div ${S(`border:1px solid ${border};border-radius:3px;padding:6px 5px;background:${bg};margin-bottom:4px;${!prereqMet?'opacity:0.45;':''}`)}>
                <div ${S('font-family:'+PIXEL_FONT+';font-size:7px;color:'+col+';margin-bottom:2px;')}>${node.name}<span ${S('color:#888;margin-left:4px;')}>${lvText}</span></div>
                <div ${S('font-size:6px;color:#555;margin-bottom:4px;line-height:1.3;')}>${node.desc}</div>
                ${isMax ? `<div ${S('font-size:6px;color:#00e676;font-family:'+PIXEL_FONT)}>■ MAX</div>` : `<button onclick="techTreeBuy('${node.id}')" ${S('width:100%;background:'+(canBuy?col:'#222')+';color:'+(canBuy?'#000':'#444')+';border:none;padding:3px 0;cursor:'+(canBuy?'pointer':'not-allowed')+';font-family:'+PIXEL_FONT+';font-size:6px;border-radius:2px;')}>${prereqMet ? cost+'PT' : '已锁定'}</button>`}
            </div>`;
        };

        let rootNode = TECH_TREE.find(n => n.branch === 'root');
        html += `<div ${S('margin-bottom:8px;')}>${renderNode(rootNode)}</div>`;

        let fireNodes = TECH_TREE.filter(n => n.branch === 'fire');
        let defNodes  = TECH_TREE.filter(n => n.branch === 'def');
        let techNodes = TECH_TREE.filter(n => n.branch === 'tech');
        const colHeader = (name, color) => `<div ${S('font-family:'+PIXEL_FONT+';font-size:7px;color:'+color+';text-align:center;margin-bottom:4px;letter-spacing:1px;padding-bottom:3px;border-bottom:1px solid '+color+'44;')}>${name}</div>`;

        html += `<div ${S('display:flex;gap:5px;')}>
            <div ${S('flex:1;min-width:0;')}>${colHeader('火力','#ff5722')}${fireNodes.map(renderNode).join('')}</div>
            <div ${S('flex:1;min-width:0;')}>${colHeader('防御','#42a5f5')}${defNodes.map(renderNode).join('')}</div>
            <div ${S('flex:1;min-width:0;')}>${colHeader('科技','#66bb6a')}${techNodes.map(renderNode).join('')}</div>
        </div>`;
        view.innerHTML = html;

    } else if (tabId === 'loadout') {
        let html = `<div ${S('font-family:'+PIXEL_FONT+';font-size:10px;color:#00b0ff;letter-spacing:2px;margin-bottom:12px;')}>■ 模块装配</div>`;
        html += `<div ${S('font-size:9px;color:#aaa;margin-bottom:16px;')}>核心插槽: <span ${S('color:#fff;font-family:'+PIXEL_FONT)}>${player.usedSlots}/${player.maxSlots}</span></div>`;
        html += `<div ${S('display:flex;flex-wrap:wrap;gap:10px;')}>`;
        let hasAny = false;
        for (let id in player.equipment) {
            let eq = player.equipment[id];
            if (!eq.owned) continue;
            hasAny = true;
            let canToggle = eq.equipped ? eq.canUnequip !== false : (player.usedSlots + eq.slotCost <= player.maxSlots);
            let def = upgradePool.find(u => u.id === id) || {};
            let rarityColor = (typeof RARITY !== 'undefined' && RARITY[def.rarity]) ? RARITY[def.rarity].color : '#fff';
            html += `<div onclick="${canToggle ? `terminalToggleEquip('${id}')` : ''}" ${S(`border:2px solid ${eq.equipped?'#00b0ff':'#333'};padding:12px;background:${eq.equipped?'rgba(0,176,255,0.12)':'rgba(255,255,255,0.03)'};cursor:${canToggle?'pointer':'not-allowed'};width:calc(50% - 10px);box-sizing:border-box;`)}>
                <div ${S('font-family:'+PIXEL_FONT+';font-size:8px;color:'+rarityColor+';')}>${eq.name}</div>
                <div ${S('font-size:7px;color:#888;margin-top:4px;')}>Lv.${eq.level} · 占${eq.slotCost}槽</div>
                ${def.desc ? `<div ${S('font-size:7px;color:#666;margin-top:4px;line-height:1.4;')}>${def.desc}</div>` : ''}
                <div ${S('font-size:7px;margin-top:6px;color:'+(eq.equipped?'#00b0ff':'#555')+';font-family:'+PIXEL_FONT)}>
                    ${eq.equipped ? '[已装备]' : (canToggle ? '[点击装备]' : '[槽位不足]')}
                </div>
            </div>`;
        }
        if (!hasAny) html += `<div ${S('color:#555;font-size:9px;')}>尚未购买任何装备模块。</div>`;
        html += `</div>`;
        view.innerHTML = html;
    }
}

// --- [蓝轨系统超频：唯一合法数据总线] ---
// 请确保整个 main.js 中只有这一个 window.terminalBuyBlue
window.terminalBuyBlue = function(key) {
    if (!player) return;
    let lv = player.techLevels[key] || 0;
    let cfg = BLUE_TECH_TIERS[key];
    
    // 防御性拦截：配置缺失或已满级
    if (!cfg || lv >= cfg.values.length) return; 
    
    let cost = cfg.costs[lv];
    if (player.pt >= cost) {
        player.pt -= cost; // 精准扣除阶梯点数
        let nextVal = cfg.values[lv];
        
        // 动态注入四维引擎
        if (key === 'fireRate') player.sectorTech.inc_fireRate = nextVal;
        if (key === 'damage') player.sectorTech.flat_damage = nextVal;
        if (key === 'maxHp') { 
            let diff = nextVal - (lv > 0 ? cfg.values[lv-1] : 0);
            player.sectorTech.flat_maxHp = nextVal; 
            player.hp += diff; // 提升上限的同时补足血量
        }
        
        player.techLevels[key]++;
        switchTerminalTab('tech'); // 强制刷新终端 UI 显示
        updateHUD(); // 强制刷新外界状态栏
    } else {
        // 【架构净化】：余额不足时仅触发物理震动反馈，彻底剔除 Low 级飘字
        triggerShake(4, 4); 
    }
};


// --- 挂载至全局 Window 提供给 HTML ---
window.terminalBuyRed = function(id) { buyUpgrade(id); };
window.terminalRefreshShop = function() { refreshShop(); switchTerminalTab('shop'); };

window.techTreeBuy = function(nodeId) {
    if (!player || typeof TECH_TREE === 'undefined') return;
    let node = TECH_TREE.find(n => n.id === nodeId);
    if (!node) return;
    let curLv = (player.techTree && player.techTree[nodeId]) || 0;
    if (curLv >= node.maxLevel) return;
    let prereqMet = !node.prereq || ((player.techTree && player.techTree[node.prereq]) || 0) >= 1;
    if (!prereqMet) { triggerShake(4, 4); return; }
    let cost = node.costs[curLv];
    if (player.pt < cost) { triggerShake(4, 4); return; }
    player.pt -= cost;
    player.techTree[nodeId] = curLv + 1;
    switchTerminalTab('tech');
    updateHUD();
};



window.terminalToggleEquip = function(id) {
    let eq = player.equipment[id]; 
    if (eq.equipped) { 
        if (eq.canUnequip) { eq.equipped = false; player.usedSlots -= eq.slotCost; }
    } else { 
        if (player.usedSlots + eq.slotCost <= player.maxSlots) { eq.equipped = true; player.usedSlots += eq.slotCost; } 
    } 
    switchTerminalTab('loadout');
    updateHUD(); 
};



function togglePause() { 
    if (gameState === 'PLAYING') { 
        gameState = 'PAUSED'; 
        ui.pauseScore.innerText = `当前战绩: ${score} PTS`; 
        showScreen('pause'); 
    } else if (gameState === 'PAUSED') { 
        gameState = 'PLAYING'; 
        showScreen(null); 
    } 
}

function quitGame() { 
    gameState = 'START'; 
    EventBus.emit('SYS_LEVEL_EXITED'); 
    showScreen('start'); 
    initUI(); 
}

function startGame(levelId) {
    currentLevel = levelId || 'debug';
    resize(); initSprites(); initStars();
    
    player = new Player();
    enemies = []; bullets = []; enemyBullets = []; items = []; particles = []; floatingTexts = []; aoeEffects = [];
    score = 0; frameCount = 0; gameTimeSeconds = 0;
    shakeTimer = 0; hitStopFrames = 0; flashScreenTimer = 0;
    comboCount = 0; comboTimer = 0; endingState = 'none'; endingTimer = 0;
    shopInflation = 0.0; wasSkillFull = false; wasInRestPhase = false; currentShopItems = [];
    directorPoints = 0; difficultyScore = 1.0;
    isBossSpawned = false; taggedItemId = null;
    ui.bossHpCont.style.opacity = 0; ui.bossToast.style.opacity = 0;
    specialKamikazeMisses = 0; levelHpMultiplier = 1.0;
    ui.sysMessage.style.opacity = 0;
    isTouchActive = false; shipTouchId = null;
    uiOffsets = { hp: { x: 0, y: 0, vx: 0, vy: 0 }, pt: { x: 0, y: 0, vx: 0, vy: 0 }, skill: { x: 0, y: 0, vx: 0, vy: 0 }, terminal: { x: 0, y: 0, vx: 0, vy: 0 } };
    
    // 初始化系统
    EventBus.clear();
    FXSystem.init(); LootSystem.init(); ScoreSystem.init(); UIRefreshSystem.init(); WaveAnnouncementSystem.init();

    // 唤醒并播放音频
    if (typeof AudioSystem !== 'undefined') {
        AudioSystem.initGraph();
        AudioSystem.bindEvents();
        AudioSystem.playBGM();
    }

    // 【架构修复：统一的装载逻辑，绝对杜绝重复声明】
    let c = WORKSHOP.cassettes[currentLevel];
    if (c) { 
        if (c.state) { c.state.currentWave = 0; c.state.waveTimer = 0; }
        if (c.choreography) { DirectorSystem.loadChoreography(c.choreography); }
        else { DirectorSystem.loadChoreography([]); }
    } else {
        DirectorSystem.loadChoreography([]);
    }

    updateHUD(); 
    gameState = 'PLAYING'; 
    showScreen(null);
}


function initUI() { 
    initDifficultyUI(); 
    setControlMode(config.controlMode); 
    setTouchMode(config.touchMode); 
    setupMultiTouchButtons(); 
}

canvas.addEventListener('touchstart', e => { e.preventDefault(); handleTouchStart(e); }, {passive: false});
canvas.addEventListener('touchmove', e => { e.preventDefault(); handleTouchMove(e); }, {passive: false});
canvas.addEventListener('touchend', e => { e.preventDefault(); handleTouchEnd(e); }, {passive: false});
canvas.addEventListener('touchcancel', e => { e.preventDefault(); handleTouchEnd(e); }, {passive: false});
canvas.addEventListener('mousedown', e => { 
    if (gameState !== 'PLAYING' || endingState !== 'none') return; 
    isTouchActive = true; 
    touchStartX = e.clientX; 
    touchStartY = e.clientY; 
    if(config.controlMode === 'absolute') { 
        player.targetX = touchStartX; 
        player.targetY = touchStartY - config.controlOffsetY; 
    } 
});
canvas.addEventListener('mousemove', e => { 
    if (!isTouchActive || e.buttons !== 1 || gameState !== 'PLAYING') return; 
    if (config.controlMode === 'absolute') { 
        player.targetX = e.clientX; 
        player.targetY = e.clientY - config.controlOffsetY; 
    } else { 
        player.targetX += (e.clientX - touchStartX) * config.controlSens; 
        player.targetY += (e.clientY - touchStartY) * config.controlSens; 
        touchStartX = e.clientX; 
        touchStartY = e.clientY; 
    } 
});
canvas.addEventListener('mouseup', () => { isTouchActive = false; });
canvas.addEventListener('mouseleave', () => { isTouchActive = false; });
window.addEventListener('resize', resize);

// 初始化同步渲染资产
initUI(); showScreen('start'); resize(); initSprites(); initStars(); 

// 字体与音频就绪后再点火主循环
if (document.fonts && document.fonts.ready) AssetManager.add(document.fonts.ready);
AssetManager.boot(() => {
    requestAnimationFrame(loop);
});
