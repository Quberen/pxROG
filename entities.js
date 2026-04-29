// === entities.js ===
// 游戏实体库：包含玩家、敌人、子弹、道具与特效

class Player {
    constructor() {
        this.sprite = sprites.player;
        this.w = this.sprite.width;
        this.h = this.sprite.height;
        this.x = width / 2;
        this.y = height - 120;
        this.targetX = this.x;
        this.targetY = this.y;
        
        let diffData = DIFF_CONFIG[currentDifficulty];

        // 1. 基线属性 (Base)
        this.baseStats = {
            maxHp: diffData.p_hp,
            damage: diffData.p_dmg,
            fireRate: 20,          
            critRate: 0.05,
            critDamage: 1.5,
            moveSpeed: 1.0,
            magnetRadius: 150,
            aoeRadius: 40,
            healEfficiency: 1.0    
        };

        // 2. 局外预设养成 (Meta)
        this.metaStats = {
            inc_damage: 0.0,       
            inc_maxHp: 0.0,
            inc_critRate: 0.0,
            more_damage: []        
        };

        // 3. 局内科技树升级 (Tech/Blue Track)
        this.sectorTech = {
            inc_damage: 0.0,
            inc_fireRate: 0.0,     
            inc_critRate: 0.0,
            inc_magnet: 0.0,
            flat_damage: 0,        
            flat_maxHp: 0
        };

        this.equipment = {};
        upgradePool.filter(i => i.type === 'equip').forEach(i => {
            this.equipment[i.id] = { 
                owned: false, equipped: false, slotCost: i.slotCost, 
                name: i.name, level: 0, canUnequip: i.canUnequip !== false 
            };
        });

        // 【关键修复】：补全旧版 upgrade 字典，防止 Item 拾取时读取 heal_up 和 magnet 报错
        this.upgrades = { aoe: 0, wingman: 0, heal_up: 0, magnet: 0 }; 

        this.hp = this.getStat('maxHp');
        this.pt = 0;
        this.totalUpgradePoints = 0;
        
        this.skillEnergy = 0;
        this.maxSkillEnergy = 100;
        this.skillActiveTimer = 0;
        this.skillCdTimer = 0;
        
        this.maxSlots = 3;
        this.usedSlots = 0;
        
        this.fireCooldown = 0;
        this.bursting = 0;
        this.burstTimer = 0;
        this.laserTick = 0;
        this.isFiringLaser = false;
        this.invincible = 0;
    }

    // 【关键修复】：向后兼容的 Getter 代理。让掉落物能正确读取到计算后的磁吸范围和血量上限
    get magnetRadius() { return this.getStat('magnetRadius'); }
    get maxHp() { return this.getStat('maxHp'); }
    get damage() { return this.getStat('damage'); }

    getStat(statName) {
        let base = (this.baseStats[statName] || 0) + (this.sectorTech[`flat_${statName}`] || 0);
        let inc = 1.0 + (this.metaStats[`inc_${statName}`] || 0) + (this.sectorTech[`inc_${statName}`] || 0);
        
        if (statName === 'damage') {
            if (this.equipment.homing && this.equipment.homing.equipped) inc += (-0.4 + (this.equipment.homing.level - 1) * 0.15);
            if (this.equipment.spread && this.equipment.spread.equipped) inc += (-0.2 + (this.equipment.spread.level - 1) * 0.05);
        }
        if (statName === 'critRate' && this.skillActiveTimer > 0) inc += 0.8; 
        
        // 兼容旧版磁吸范围的直接乘区
        if (statName === 'magnetRadius') inc += (this.upgrades.magnet * 0.2);

        inc = Math.max(0.1, inc);
        let finalVal = (statName === 'fireRate') ? (base / inc) : (base * inc);

        let moreList = (this.metaStats[`more_${statName}`] || []).concat(this.sectorTech[`more_${statName}`] || []);
        moreList.forEach(mult => { finalVal *= mult; });

        if (statName === 'damage' && this.equipment.debt_protocol && this.equipment.debt_protocol.equipped) {
            finalVal *= 0.8; 
        }
        if (statName === 'critRate' && finalVal > 1.0) {
            finalVal = 1.0; 
        }
        return finalVal;
    }

    update() {
        this.x += (this.targetX - this.x) * 0.3;
        this.y += (this.targetY - this.y) * 0.3;
        this.x = Math.max(this.w / 2, Math.min(width - this.w / 2, this.x));
        this.y = Math.max(this.h / 2, Math.min(height - this.h / 2, this.y));
        
        this.processShooting();
        
        if (this.invincible > 0) this.invincible--;
        
        if (this.skillActiveTimer > 0) {
            if (frameCount % 2 === 0 && particles.length < 200) {
                particles.push(new Particle(this.x, this.y + this.h / 2, '#00e5ff', (Math.random() - 0.5) * 5, 4 + Math.random() * 4, 20));
            }
        } else if (frameCount % 3 === 0 && particles.length < 150) {
            particles.push(new Particle(this.x, this.y + this.h / 2 - 5, '#00e676', (Math.random() - 0.5), 2 + Math.random() * 2, 15));
        }
    }

    processShooting() {
        let eq = this.equipment;
        let currentFireRate = this.getStat('fireRate');
        let currentDamage = this.getStat('damage');
        let actCritRate = this.getStat('critRate');
        let actCritDmg = this.getStat('critDamage');
        
        if (eq.speed && eq.speed.equipped) {
            currentFireRate = Math.max(7, 16 - (eq.speed.level - 1) * 3);
        }
        
        let baseCritCalc = 0.05 + (this.skillActiveTimer > 0 ? 0.8 : 0) + (this.metaStats.inc_critRate || 0);
        if (baseCritCalc > 1.0) actCritDmg += (baseCritCalc - 1.0);

        let homingTurn = 0;
        if (eq.homing && eq.homing.equipped) homingTurn = 0.15 + (eq.homing.level - 1) * 0.1;
        
        let cw = 4 + (this.sectorTech.inc_damage || 0) * 10;
        let ch = 8 + (this.sectorTech.inc_damage || 0) * 20;
        
        let pCnt = 0; let pRet = 1.0;
        if (eq.pierce && eq.pierce.equipped) {
            pCnt = eq.pierce.level >= 3 ? 2 : 1;
            pRet = eq.pierce.level >= 2 ? 0.8 : 0.5;
        }
        
        let spawnBullet = (vx, vy) => {
            let b = new Bullet(this.x, this.y - this.h / 2, vx, vy, cw, ch, currentDamage, pCnt, pRet, actCritRate, actCritDmg, '#ffffff');
            b.isHoming = eq.homing && eq.homing.equipped;
            b.homingTurn = homingTurn;
            bullets.push(b);
        };
        
        let doShoot = () => {
            if (eq.laser && eq.laser.equipped) return;
            if (eq.spread && eq.spread.equipped) {
                let count = Math.min(5, eq.spread.level + 1);
                let startVx = -1.5 * (count - 1) / 2;
                for (let i = 0; i < count; i++) spawnBullet(startVx + 1.5 * i, -16);
            } else {
                spawnBullet(0, -16);
            }
        };
        
        this.isFiringLaser = false;
        
        if (eq.laser && eq.laser.equipped) {
            if (eq.pulse && eq.pulse.equipped) { if (this.bursting > 0) this.isFiringLaser = true; } 
            else { this.isFiringLaser = true; }
            
            if (this.isFiringLaser) {
                this.laserTick++;
                if (this.laserTick % 5 === 0) {
                    let laserMult = 0.25 + (eq.laser.level - 1) * 0.15;
                    let laserDmg = currentDamage * laserMult;
                    
                    enemies.forEach(e => {
                        if (!e.active) return;
                        let hit = false;
                        if (Math.abs(e.x - this.x) < e.w / 2 + 16 && e.y < this.y) hit = true;
                        if (!hit && eq.spread && eq.spread.equipped) {
                            let dy = this.y - e.y;
                            if (dy > 0) {
                                let offset = dy * 0.15;
                                if (Math.abs(e.x - (this.x - offset)) < e.w / 2 + 16) hit = true;
                                else if (Math.abs(e.x - (this.x + offset)) < e.w / 2 + 16) hit = true;
                            }
                        }
                        
                        if (hit) {
                            let isCrit = Math.random() < actCritRate;
                            let finalDmg = isCrit ? laserDmg * actCritDmg : laserDmg;
                            e.takeDamage(finalDmg, true, isCrit, 'laser');
                            
                            if (particles.length < 180) particles.push(new Particle(e.x, e.y + e.h / 2, '#00e5ff', (Math.random() - 0.5) * 8, Math.random() * 5, 8));
                            if (this.upgrades.aoe > 0 && Math.random() < 0.1) triggerAOE(e.x, e.y, finalDmg, 40);
                        }
                    });
                }
            }
        }
        
        if (eq.pulse && eq.pulse.equipped) {
            let burstCount = eq.pulse.level >= 3 ? 4 : 3;
            let cdMult = 3.0 - (eq.pulse.level - 1) * 0.5;
            
            if (this.bursting > 0) {
                this.burstTimer--;
                if (this.burstTimer <= 0) { doShoot(); this.bursting--; this.burstTimer = 5; }
            } else {
                this.fireCooldown--;
                if (this.fireCooldown <= 0) { this.bursting = burstCount; this.burstTimer = 0; this.fireCooldown = currentFireRate * cdMult; }
            }
        } else {
            this.fireCooldown--;
            if (this.fireCooldown <= 0) { doShoot(); this.fireCooldown = currentFireRate; }
        }
    }

    draw(ctx) {
        if (this.invincible % 4 < 2) ctx.drawImage(this.sprite, this.x - this.w / 2, this.y - this.h / 2);
    }

    takeDamage(amount, isPercent = false, sourceStr = 'normal') {
        if (this.invincible > 0 || endingState !== 'none') return;
        
        let currentMaxHp = this.getStat('maxHp');
        let actualAmount = isPercent ? Math.max(40, Math.floor(currentMaxHp * amount)) : amount;
        if (!isPercent && currentDifficulty === 3) actualAmount *= 1.25;
        
        this.hp -= actualAmount;
        this.invincible = 20;
        
        let dmgMag = 15 + Math.min(20, actualAmount * 0.6);
        let dmgAng = Math.random() * Math.PI * 2;
        uiOffsets.hp.x += Math.cos(dmgAng) * dmgMag;
        uiOffsets.hp.y += Math.sin(dmgAng) * dmgMag;
        
        if (typeof EventBus !== 'undefined') EventBus.emit('ENTITY_DAMAGED', { isPlayer: true });
        
        if (config.dmgText) pushFloatingText(this.x, this.y - 20, Math.floor(actualAmount), '#ff3333', true);
        
        comboCount = Math.floor(comboCount / 2);
        
        if (this.hp <= 0) { this.hp = 0; startEnding('playerDead'); }
        if (typeof updateHUD !== 'undefined') updateHUD();
    }

    heal(amount, isEliteDrop = false) {
        let currentMaxHp = this.getStat('maxHp');
        let eff = this.getStat('healEfficiency');
        let actualHeal = Math.min(amount * eff, Math.max(0, currentMaxHp - this.hp));
        this.hp += actualHeal;
        
        if (config.dmgText && actualHeal > 0) {
            pushFloatingText(this.x, this.y - 20, Math.floor(actualHeal), isEliteDrop ? '#ffea00' : '#00e676', false, false, "+");
        }
        if (typeof updateHUD !== 'undefined') updateHUD();
    }
}



class Bullet {
    constructor(x, y, vx, vy, w, h, dmg, pCount, pRet, cRate, cDmg, color) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.w = w;
        this.h = h;
        this.damage = dmg;
        this.pierceCount = pCount;
        this.pierceRetain = pRet;
        this.critRate = cRate;
        this.critDamage = cDmg;
        this.color = color;
        this.active = true;
        this.hitEnemies = new Set();
        this.isHoming = false;
        this.homingTurn = 0.15;
    }

    update() {
        if (this.isHoming && player.hp > 0 && endingState === 'none') {
            let target = null;
            let minDist = Infinity;
            
            for (let e of enemies) {
                if (!e.active) continue;
                let d = (e.x - this.x) ** 2 + (e.y - this.y) ** 2;
                if (d < minDist) {
                    minDist = d;
                    target = e;
                }
            }
            
            if (target && minDist < 90000) {
                let dx = target.x - this.x;
                let dy = target.y - this.y;
                let dist = Math.sqrt(dx * dx + dy * dy) || 1;
                
                this.vx += (dx / dist) * this.homingTurn;
                this.vy += (dy / dist) * this.homingTurn;
                
                let speed = Math.sqrt(this.vx ** 2 + this.vy ** 2);
                if (speed > 16) {
                    this.vx = (this.vx / speed) * 16;
                    this.vy = (this.vy / speed) * 16;
                }
            }
        }
        
        this.x += this.vx;
        this.y += this.vy;
        
        if (this.y < -this.h || this.y > height + this.h || this.x < -this.w || this.x > width + this.w) {
            this.active = false;
        }
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - this.w / 2, this.y - this.h / 2, this.w, this.h);
    }
}

class EnemyBullet {
    constructor(x, y, vx, vy, type = 'normal') {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.size = 8;
        this.active = true;
        this.type = type;
        this.homingTimer = 60;
        this.color = type === 'homing' ? '#ab47bc' : '#ff1744';
        this.coreColor = type === 'homing' ? '#00b0ff' : '#ffeb3b';
    }

    update() {
        if (this.type === 'homing' && player.hp > 0 && endingState === 'none' && this.homingTimer > 0) {
            this.homingTimer--;
            let dx = player.x - this.x;
            let dy = player.y - this.y;
            let dist = Math.sqrt(dx * dx + dy * dy) || 1;
            
            this.vx += (dx / dist) * 0.25;
            this.vy += (dy / dist) * 0.25;
            
            let speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
            if (speed > 4.0) {
                this.vx = (this.vx / speed) * 4.0;
                this.vy = (this.vy / speed) * 4.0;
            }
        }
        
        this.x += this.vx;
        this.y += this.vy;
        
        if (this.y > height + 20 || this.x < -20 || this.x > width + 20) {
            this.active = false;
        }
        
        if (Math.abs(this.x - player.x) < player.w / 2 + 2 && Math.abs(this.y - player.y) < player.h / 2 + 2) {
            let diffDmg = (this.type === 'homing' ? 12 : 10) * DIFF_CONFIG[currentDifficulty].dmgMod;
            player.takeDamage(diffDmg);
            this.active = false;
        }
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
        ctx.fillStyle = this.coreColor;
        ctx.fillRect(this.x - this.size / 4, this.y - this.size / 4, this.size / 2, this.size / 2);
    }
}

class BaseEnemy {
    constructor(x, y, sprite, hpRaw, weight, particleColor) {
        this.x = x;
        this.y = y;
        this.sprite = sprite;
        this.w = sprite.width;
        this.h = sprite.height;
        
        let diffData = DIFF_CONFIG[currentDifficulty];
        this.hp = hpRaw * diffData.hpMod * levelHpMultiplier;
        this.maxHp = this.hp;
        this.weight = weight;
        this.active = true;
        
        this.isHealer = false;
        this.isAbyss = false;
        this.isKamikaze = false;
        this.isSpecial = false;
        this.isBoss = false;
        this.isBossMinion = false;
        this.isBattery = false;
        
        this._initMods = false;
        this.particleColor = particleColor || '#757575';
        this.scale = 1.0;
        this.isElite = false;
        this.eliteFireTimer = 0;
    }

    makeElite() {
        this.isElite = true;
        this.scale = 1.5;
        this.hp *= 10;
        this.maxHp = this.hp;
        this.eliteFireTimer = 120;
    }

    checkBounds() {
        if (this.isBoss) return;
        if (this.y > height + 100 || this.y < -150 || this.x < -100 || this.x > width + 100) {
            this.active = false;
            if (this.isSpecial) {
                specialKamikazeMisses++;
            }
        }
    }

    checkPlayerCollision(isPercent = false, overrideDmg = null) {
        let r_w = this.w * this.scale;
        let r_h = this.h * this.scale;
        
        if (Math.abs(this.x - player.x) < (r_w / 2 + player.w / 2 - 8) && Math.abs(this.y - player.y) < (r_h / 2 + player.h / 2 - 8)) {
            let baseDmg = this.isAbyss ? 18 : 15;
            if (overrideDmg !== null) baseDmg = overrideDmg;
            
            let actualDmg = isPercent ? baseDmg : (baseDmg * DIFF_CONFIG[currentDifficulty].dmgMod);
            if (this.isElite) actualDmg *= 2;
            
            player.takeDamage(actualDmg, isPercent, 'collision');
            
            if (!this.isBoss) {
                if (this.isSpecial) specialKamikazeMisses = 0;
                this.die(false);
            }
        }
    }

    baseUpdate() {
        if (!this._initMods) {
            this._initMods = true;
            if (!this.isHealer && !this.isSpecial && !this.isBoss && !this.isAbyss && !this.isBattery) {
                if (Math.random() < 0.15) {
                    this.isBattery = true;
                }
            }
            if (this.isBattery) {
                if (this.sprite === sprites.locator) this.sprite = sprites.locator_battery;
                else if (this.sprite === sprites.wanderer) this.sprite = sprites.wanderer_battery;
                else if (this.sprite === sprites.turret) this.sprite = sprites.turret_battery;
            }
        }
        
        if (this.isElite && this.y > 0 && this.y < height * 0.8) {
            this.eliteFireTimer--;
            if (this.eliteFireTimer <= 0) {
                for (let i = 0; i < 8; i++) {
                    let angle = (Math.PI * 2 / 8) * i;
                    enemyBullets.push(new EnemyBullet(this.x, this.y, Math.cos(angle) * 2.5, Math.sin(angle) * 2.5, 'normal'));
                }
                this.eliteFireTimer = 180;
            }
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        if (this.isElite) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#ff1744';
        }
        ctx.scale(this.scale, this.scale);
        ctx.drawImage(this.sprite, -this.w / 2, -this.h / 2);
        ctx.restore();
    }

    takeDamage(amount, showText = true, isCrit = false, damageType = 'normal') {
        this.hp -= amount;
        
        if (particles.length < 150) {
            let pCount = this.isElite || this.isBoss ? 4 : 2;
            let pCol = this.isBattery ? '#00e5ff' : this.particleColor;
            for (let i = 0; i < pCount; i++) {
                particles.push(new Particle(this.x, this.y, pCol, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4, 10));
            }
        }
        
        if (showText && config.dmgText) {
            let color = isCrit ? '#ffea00' : (damageType === 'laser' ? '#00e5ff' : '#ffffff');
            pushFloatingText(this.x + (Math.random() - 0.5) * 15, this.y - this.h / 2 * this.scale, amount, color, false, isCrit);
        }
        
        if (this.hp <= 0 && endingState === 'none') {
            if (this.isBoss) {
                this.hp = 0;
                startEnding('bossDead');
            } else {
                this.die(true);
            }
        }
    }

    // 【核心解耦：只负责广播死亡事件】
    die(killedByPlayer) {
        this.active = false;
        
        EventBus.emit('ENTITY_DIED', {
            entity: this,
            killedByPlayer: killedByPlayer,
            x: this.x,
            y: this.y,
            isElite: this.isElite,
            isBoss: this.isBoss,
            isBattery: this.isBattery,
            isHealer: this.isHealer,
            isBossMinion: this.isBossMinion,
            particleColor: this.particleColor,
            weight: this.weight
        });
    }
}

class Locator extends BaseEnemy {
    constructor(x, y, isAbyss = false, isHealer = false, speedOverride = null) {
        let pColor = isHealer ? '#00e676' : (isAbyss ? '#ab47bc' : '#757575');
        let def = WORKSHOP.data.enemies[isAbyss ? 'LocatorSwarm' : 'Locator'];
        super(x, y, isHealer ? sprites.locator_healer : (isAbyss ? sprites.locator_swarm : sprites.locator), def.hp, def.weight, pColor);
        
        this.speed = speedOverride || (isAbyss ? 1.5 : 1.0 + Math.random() * 0.5);
        this.isHealer = isHealer;
        this.isAbyss = isAbyss;
    }

    update() {
        this.baseUpdate();
        this.y += this.speed;
        this.checkBounds();
        this.checkPlayerCollision();
    }
}

class Wanderer extends BaseEnemy {
    constructor(x, y, isHighThreat, phase = null, isAbyss = false, isHealer = false, side = null) {
        let pColor = isHealer ? '#00e676' : (isAbyss ? '#ab47bc' : '#757575');
        let key = isAbyss ? 'WandererSwarm' : (isHighThreat ? 'WandererHigh' : 'WandererLow');
        let def = WORKSHOP.data.enemies[key];
        
        super(x, y, isHealer ? sprites.wanderer_healer : (isAbyss ? sprites.wanderer_swarm : sprites.wanderer), def.hp, def.weight, pColor);
        
        this.isHealer = isHealer;
        this.isAbyss = isAbyss;
        this.side = side;
        this.swayPhase = phase !== null ? phase : Math.random() * Math.PI * 2;
        
        let baseSpeed = isHighThreat ? (1.6 + Math.random() * 1.5) : (0.8 + Math.random() * 0.6);
        this.swayAmp = isHighThreat ? (3.5 + Math.random() * 3.5) : (1.0 + Math.random() * 1.5);
        
        if (this.side === 'left') {
            this.x = -40;
            this.vx = 2.0;
            this.vy = baseSpeed;
        } else if (this.side === 'right') {
            this.x = width + 40;
            this.vx = -2.0;
            this.vy = baseSpeed;
        } else {
            this.vx = 0;
            this.vy = baseSpeed;
        }
    }

    update() {
        this.baseUpdate();
        this.x += this.vx;
        this.y += this.vy;
        
        if (!this.side) {
            this.x += Math.sin(frameCount * 0.04 + this.swayPhase) * this.swayAmp;
        }
        
        if (this.y > 0) {
            let bW = this.w / 2 * this.scale;
            if (this.x < bW) {
                this.x = bW;
                if (this.vx < 0) this.vx *= -1;
            }
            if (this.x > width - bW) {
                this.x = width - bW;
                if (this.vx > 0) this.vx *= -1;
            }
        }
        
        this.checkBounds();
        this.checkPlayerCollision();
    }
}

class Kamikaze extends BaseEnemy {
    constructor(x, y, vType = 'normal') {
        let pColor = vType === 'special' ? '#8e0000' : (vType === 'swarm' ? '#ab47bc' : '#ffeb3b');
        let key = vType === 'special' ? 'KamikazeSpec' : (vType === 'swarm' ? 'KamikazeSwarm' : 'Kamikaze');
        let def = WORKSHOP.data.enemies[key];
        
        super(x, y, vType === 'special' ? sprites.kamikaze_special_idle : (vType === 'swarm' ? sprites.kamikaze_swarm_idle : sprites.kamikaze_idle), def.hp, def.weight, pColor);
        
        this.vType = vType;
        this.state = 'ENTER';
        this.timer = 0;
        this.vx = 0;
        this.vy = 2;
        this.warnTime = vType === 'special' ? 75 : 45;
        this.dashSpeed = vType === 'special' ? 16 : (8 + Math.random() * 3);
        
        this.isKamikaze = true;
        this.isSpecial = vType === 'special';
        this.isAbyss = vType === 'swarm';
    }

    update() {
        this.baseUpdate();
        
        if (this.state === 'ENTER') {
            this.y += this.vy;
            if (this.y > 60) {
                this.state = 'WARN';
                this.timer = this.warnTime;
                this.sprite = this.vType === 'special' ? sprites.kamikaze_special_warn : (this.vType === 'swarm' ? sprites.kamikaze_swarm_warn : sprites.kamikaze_warn);
            }
        } else if (this.state === 'WARN') {
            this.timer--;
            this.x += (Math.random() - 0.5) * (this.vType === 'special' ? 3 : 2);
            if (this.timer <= 0) {
                this.state = 'DASH';
                let dx = player.x - this.x;
                let dy = player.y - this.y;
                let dist = Math.sqrt(dx * dx + dy * dy) || 1;
                this.vx = (dx / dist) * this.dashSpeed;
                this.vy = (dy / dist) * this.dashSpeed;
            }
        } else if (this.state === 'DASH') {
            this.x += this.vx;
            this.y += this.vy;
            this.checkBounds();
        }
        
        if (this.vType === 'special') {
            this.checkPlayerCollision(true, 0.35);
        } else {
            this.checkPlayerCollision(false, 30);
        }
    }
}

class Turret extends BaseEnemy {
    constructor(x, y, isAbyss = false, isHealer = false, isDumbFire = false) {
        let pColor = isHealer ? '#00e676' : (isAbyss ? '#ab47bc' : '#757575');
        let def = WORKSHOP.data.enemies[isAbyss ? 'TurretSwarm' : 'Turret'];
        
        super(x, y, isHealer ? sprites.turret_healer : (isAbyss ? sprites.turret_swarm : sprites.turret), def.hp, def.weight, pColor);
        
        this.isAbyss = isAbyss;
        this.targetY = 50 + Math.random() * 100;
        this.isHealer = isHealer;
        this.isDumbFire = isDumbFire;
        
        this.fireInterval = this.isAbyss ? 120 : 100;
        this.shootTimer = this.fireInterval;
    }

    update() {
        this.baseUpdate();
        
        if (this.y < this.targetY) {
            this.y += 2;
        } else {
            this.shootTimer--;
            if (this.shootTimer <= 0) {
                let vx = 0, vy = 3;
                if (!this.isDumbFire) {
                    let dx = player.x - this.x;
                    let dy = player.y - this.y;
                    let dist = Math.sqrt(dx * dx + dy * dy) || 1;
                    vx = (dx / dist) * 3;
                    vy = (dy / dist) * 3;
                }
                
                enemyBullets.push(new EnemyBullet(this.x, this.y + this.h / 2, vx, vy, (this.isAbyss && !this.isDumbFire) ? 'homing' : 'normal'));
                this.shootTimer = this.fireInterval;
            }
        }
        
        this.checkBounds();
        this.checkPlayerCollision();
    }
}

class ArcFlyer extends BaseEnemy {
    constructor(x, y, isLeft, progressOffset = 0, isAbyss = false) {
        let def = WORKSHOP.data.enemies[isAbyss ? 'ArcFlyerSwarm' : 'ArcFlyer'];
        super(0, y, isAbyss ? sprites.arc_swarm : sprites.arc, def.hp, def.weight, isAbyss ? '#ab47bc' : '#37474f');
        
        this.isLeft = isLeft;
        this.x = this.isLeft ? -30 : width + 30;
        this.startY = y + 80;
        this.progress = progressOffset;
        this.bombTimer = 0;
        this.isAbyss = isAbyss;
    }

    update() {
        this.baseUpdate();
        this.progress += 0.012;
        
        if (this.progress > 0) {
            this.x = this.isLeft ? -30 + (width + 60) * this.progress : width + 30 - (width + 60) * this.progress;
            this.y = this.startY + Math.sin(this.progress * Math.PI) * 150;
            
            this.bombTimer--;
            if (this.bombTimer <= 0 && this.x > 10 && this.x < width - 10) {
                enemyBullets.push(new EnemyBullet(this.x, this.y, 0, 4, 'normal'));
                this.bombTimer = 35;
            }
        }
        
        if (this.progress >= 1) {
            this.active = false;
        }
        if (this.progress > 0) {
            this.checkPlayerCollision();
        }
    }
}

class Tank extends BaseEnemy {
    constructor(x, y, isSpecial = false, isAbyss = false) {
        let def = WORKSHOP.data.enemies[isAbyss ? 'TankSwarm' : 'Tank'];
        super(x, y, isAbyss ? sprites.tank_swarm : sprites.tank, def.hp, def.weight, isAbyss ? '#ab47bc' : '#757575');
        
        this.speed = isAbyss ? 0.15 : 0.4;
        this.spawnTimer = 180;
        this.isAbyss = isAbyss;
    }

    update() {
        this.baseUpdate();
        this.y += this.speed;
        
        if (this.isAbyss && this.y > 0 && this.y < height * 0.7) {
            this.spawnTimer--;
            if (this.spawnTimer <= 0) {
                if (Math.random() < 0.5) {
                    enemies.push(new Kamikaze(this.x - 20, this.y + 20, 'swarm'));
                    enemies.push(new Kamikaze(this.x + 20, this.y + 20, 'swarm'));
                } else {
                    enemies.push(new Locator(this.x - 30, this.y + 20, true));
                    enemies.push(new Locator(this.x, this.y + 30, true));
                    enemies.push(new Locator(this.x + 30, this.y + 20, true));
                }
                this.spawnTimer = 240;
            }
        }
        
        this.checkBounds();
        this.checkPlayerCollision();
    }
}

class BossScrapDominator extends BaseEnemy {
    constructor(x, y) {
        super(x, y, sprites.boss_scrap, (currentDifficulty <= 1) ? 4000 : 8000, 100, '#7b1fa2');
        this.hp = this.maxHp;
        this.phase = 1;
        this.state = 'ENTER';
        this.timer = 120;
        this.targetX = width / 2;
        
        this.isSpecial = true;
        this.isBoss = true;
        
        this.laserWarnTimer = 0;
        this.laserFireTimer = 0;
        
        ui.bossHpCont.style.opacity = 1;
        ui.bossToast.innerText = "废铁主宰者";
        ui.bossToast.style.opacity = 1;
        setTimeout(() => { ui.bossToast.style.opacity = 0; }, 4000);
    }

    update() {
        if (endingState === 'bossDead') return;
        
        let hpPct = Math.max(0, this.hp / this.maxHp);
        ui.bossHpFill.style.width = `${hpPct * 100}%`;
        ui.bossHpDelay.style.width = `${hpPct * 100}%`;
        
        if (this.phase === 1 && this.hp < this.maxHp * 0.5) {
            this.phase = 2;
            this.sprite = sprites.boss_scrap_phase2;
            triggerShake(20, 30);
            createExplosion(this.x, this.y, '#ff1744', 40);
            this.state = 'HOVER';
            this.timer = 60;
        }
        
        if (this.state === 'ENTER') {
            this.y += 1;
            if (this.y >= 100) {
                this.state = 'HOVER';
                this.timer = 60;
            }
        } else if (this.state === 'HOVER') {
            this.x += (this.targetX - this.x) * 0.02;
            this.timer--;
            
            if (this.timer <= 0) {
                let roll = Math.random();
                if (this.phase === 1) {
                    if (roll < 0.4) {
                        this.state = 'ATTACK_SPAWN';
                        this.timer = 45;
                    } else {
                        this.state = 'ATTACK_RING';
                        this.timer = 60;
                    }
                } else {
                    if (roll < 0.25) {
                        this.state = 'ATTACK_SPAWN';
                        this.timer = 45;
                    } else if (roll < 0.55) {
                        this.state = 'ATTACK_RING';
                        this.timer = 60;
                    } else if (roll < 0.8) {
                        this.state = 'ATTACK_LASER';
                        this.laserWarnTimer = 60;
                        this.laserFireTimer = 60;
                    } else {
                        this.state = 'ATTACK_TURRETS';
                        this.timer = 30;
                    }
                }
            }
            
            if (Math.abs(this.targetX - this.x) < 10 && Math.random() < 0.02) {
                this.targetX = Math.random() * (width - 100) + 50;
            }
        } else if (this.state === 'ATTACK_SPAWN') {
            this.timer--;
            this.x += (this.targetX - this.x) * 0.01;
            
            if (this.timer === 0) {
                if (currentDifficulty >= 2) {
                    let colW = width / 5;
                    for (let i = 1; i <= 4; i++) {
                        let e = new Locator(colW * i, this.y + 40, true, false, 2.0);
                        e.weight *= 1.5;
                        e.isBossMinion = true;
                        enemies.push(e);
                    }
                } else {
                    for (let i = 0; i < 4; i++) {
                        let e = new Locator(this.x + (i - 1.5) * 40, this.y + 40);
                        e.weight *= 1.5;
                        e.isBossMinion = true;
                        enemies.push(e);
                    }
                }
                this.state = 'HOVER';
                this.timer = 60;
            }
        } else if (this.state === 'ATTACK_RING') {
            this.timer--;
            this.x += (this.targetX - this.x) * 0.005;
            
            if (this.timer % 15 === 0) {
                let bCount = this.phase === 1 ? 12 : 16;
                let offset = (this.timer / 15) * 0.2;
                for (let i = 0; i < bCount; i++) {
                    let angle = (Math.PI * 2 / bCount) * i + offset;
                    enemyBullets.push(new EnemyBullet(this.x, this.y, Math.cos(angle) * 3, Math.sin(angle) * 3, 'normal'));
                }
            }
            
            if (this.timer <= 0) {
                this.state = 'HOVER';
                this.timer = 90;
            }
        } else if (this.state === 'ATTACK_TURRETS') {
            this.timer--;
            if (this.timer === 0) {
                window.spawnEnemyByType('TurretSwarm', 40, { y: 60, isDumbFire: true, fireInterval: 30 });
                window.spawnEnemyByType('TurretSwarm', width - 40, { y: 60, isDumbFire: true, fireInterval: 30 });
                this.state = 'HOVER';
                this.timer = 90;
            }
        } else if (this.state === 'ATTACK_LASER') {
            if (this.laserWarnTimer > 0) {
                this.laserWarnTimer--;
            } else if (this.laserFireTimer > 0) {
                this.laserFireTimer--;
                if (Math.abs(player.x - this.x) < 30 && player.y > this.y) {
                    let diffDmg = 20 * DIFF_CONFIG[currentDifficulty].dmgMod;
                    player.takeDamage(diffDmg, false, 'special');
                }
                triggerShake(3, 2);
            } else {
                this.state = 'HOVER';
                this.timer = 90;
                this.targetX = Math.random() * (width - 100) + 50;
            }
        }
        
        this.checkPlayerCollision(false, 40);
    }

    draw(ctx) {
        super.draw(ctx);
        if (this.state === 'ATTACK_LASER' && endingState === 'none') {
            if (this.laserWarnTimer > 0) {
                ctx.fillStyle = `rgba(255, 23, 68, ${0.2 + (60 - this.laserWarnTimer) / 60 * 0.4})`;
                ctx.fillRect(this.x - 30, this.y, 60, height);
            } else if (this.laserFireTimer > 0) {
                ctx.save();
                ctx.shadowBlur = 20;
                ctx.shadowColor = '#ff1744';
                ctx.fillStyle = '#ff1744';
                ctx.fillRect(this.x - 25, this.y, 50, height);
                ctx.shadowBlur = 0;
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(this.x - 10, this.y, 20, height);
                ctx.restore();
            }
        }
    }
}

class Item {
    constructor(x, y, type, value, overrideColor = null) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.value = value;
        this.active = true;
        this.vy = 1.5;
        this.color = overrideColor;
        
        if (type === 'hp') this.sprite = sprites.hp;
        else if (type === 'pt_core') this.sprite = sprites.pt_core;
        else if (type === 'pt_shard') this.sprite = sprites.pt_shard;
        else if (type === 'energy') this.sprite = sprites.energy_crystal;
        else this.sprite = sprites.pt_shard;
        
        this.w = this.sprite.width;
        this.h = this.sprite.height;
    }

    update() {
        if (player.hp <= 0) return;
        
        if (this.type === 'combo_reward') {
            if (!this.color) this.color = '#00e5ff';
            if (frameCount % 2 === 0) {
                particles.push(new Particle(this.x, this.y, this.color, 0, 0, 10));
            }
            
            let dx = shopBtnRect.x - this.x;
            let dy = shopBtnRect.y - this.y;
            let dist = Math.sqrt(dx * dx + dy * dy) || 1;
            
            this.x += (dx / dist) * 15;
            this.y += (dy / dist) * 15;
            
            if (dist < 20) {
                this.active = false;
                player.pt += this.value;
                pushFloatingText(50 + Math.random() * 15, 45 + Math.random() * 10, `+${this.value % 1 === 0 ? this.value : this.value.toFixed(1)} PT`, this.color, false, true, "", 7);
            }
            return;
        }
        
        let dx = player.x - this.x;
        let dy = player.y - this.y;
        let distSq = dx * dx + dy * dy;
        let magnetArea = player.magnetRadius * player.magnetRadius;
        
        if (distSq < magnetArea) {
            const force = 800 / (distSq + 100);
            this.x += dx * force;
            this.y += dy * force;
        } else {
            this.y += this.vy;
        }
        
        if (distSq < 900) {
            this.active = false;
            if (this.type.startsWith('pt')) {
                player.pt += this.value;
                pushFloatingText(50 + (Math.random() - 0.5) * 15, 45 + (Math.random() - 0.5) * 10, `+${this.value % 1 === 0 ? this.value : this.value.toFixed(1)}`, '#e0e0e0', false, false, "", 6);
            } else if (this.type === 'hp') {
                let healAmt = this.value.isElite ? player.maxHp * 0.60 : player.maxHp * (0.20 + (player.upgrades.heal_up * 0.05));
                player.heal(healAmt, this.value.isElite);
            } else if (this.type === 'energy') {
                player.skillEnergy = Math.min(player.maxSkillEnergy, player.skillEnergy + this.value);
                pushFloatingText(skillBtnRect.x, skillBtnRect.y - 30, `+ENG`, '#00e5ff', false, false, "", 8);
                updateHUD();
            }
        }
        
        if (this.y > height + 50) {
            this.active = false;
        }
    }

    draw(ctx) {
        if (this.type === 'combo_reward') return;
        ctx.save();
        if (this.type === 'hp') {
            ctx.shadowBlur = 12;
            ctx.shadowColor = '#00e676';
        } else if (this.type === 'energy') {
            ctx.shadowBlur = 12;
            ctx.shadowColor = '#00e5ff';
        }
        ctx.drawImage(this.sprite, this.x - this.w / 2, this.y - this.h / 2 + Math.sin(frameCount * 0.1) * 3);
        ctx.restore();
    }
}

class Particle {
    constructor(x, y, color, vx, vy, life) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.vx = vx;
        this.vy = vy;
        this.life = life;
        this.maxLife = life;
        this.size = 1 + Math.random() * 3;
        this.active = true;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vx *= 0.92;
        this.vy *= 0.92;
        this.life--;
        if (this.life <= 0) {
            this.active = false;
        }
    }

    draw(ctx) {
        ctx.globalAlpha = this.life / this.maxLife;
        ctx.fillStyle = this.color;
        ctx.fillRect(Math.round(this.x), Math.round(this.y), this.size, this.size);
        ctx.globalAlpha = 1;
    }
}

class DamageText {
    constructor(x, y, amtStr, colStr, isP = false, isC = false, pre = "", fS = 10) {
        this.x = x;
        this.y = y;
        this.fontSize = fS;
        
        let disp = amtStr;
        if (typeof amtStr === 'number') {
            disp = Math.floor(amtStr);
        }
        
        this.text = (isP ? "-" : pre) + disp + (isC && typeof amtStr === 'number' ? "!" : "");
        this.color = colStr || '#ffffff';
        this.life = 45;
        this.maxLife = 45;
        
        let phys = WORKSHOP.data.physics;
        if (isP) {
            this.vx = (Math.random() - 0.5) * phys.dmg_text_player_speed_x;
            this.vy = phys.dmg_text_player_speed_y - Math.random() * 2;
            this.gravity = phys.dmg_text_player_gravity;
        } else {
            this.vx = (Math.random() - 0.5) * 2;
            this.vy = -3 - Math.random() * 2;
            this.gravity = 0.2;
        }
        
        this.active = true;
        this.isCrit = isC;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity;
        this.life--;
        if (this.life <= 0) {
            this.active = false;
        }
    }

    draw(ctx) {
        let progress = 1 - (this.life / this.maxLife);
        ctx.globalAlpha = this.life < 15 ? this.life / 15 : 1;
        
        let scale = progress < 0.2 ? 1 + (progress / 0.2) * 0.5 : 1.5 - ((progress - 0.2) / 0.8) * 0.5;
        if (this.isCrit) {
            scale *= 1.3;
        }
        
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(scale, scale);
        
        ctx.fillStyle = this.color;
        ctx.font = `${this.fontSize}px "Press Start 2P", "DotGothic16", monospace`;
        ctx.textAlign = 'center';
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#000";
        
        ctx.strokeText(this.text, 0, 0);
        ctx.fillText(this.text, 0, 0);
        
        ctx.restore();
        ctx.globalAlpha = 1;
    }
}

function pushFloatingText(x, y, amt, col, isP, isC = false, pre = "", fS = 10) {
    if (floatingTexts.length > 50) {
        floatingTexts.shift();
    }
    floatingTexts.push(new DamageText(x, y, amt, col, isP, isC, pre, fS));
}

class AOEEffect {
    constructor(x, y, maxR) {
        this.x = x;
        this.y = y;
        this.radius = 0;
        this.maxRadius = maxR;
        this.life = 15;
        this.active = true;
    }

    update() {
        this.radius += (this.maxRadius - this.radius) * 0.3;
        this.life--;
        if (this.life <= 0) {
            this.active = false;
        }
    }

    draw(ctx) {
        ctx.strokeStyle = '#ab47bc';
        ctx.lineWidth = 3;
        ctx.globalAlpha = this.life / 15;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
    }
}

function createExplosion(x, y, col, count) {
    if (particles.length > 300) return;
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 5;
        particles.push(new Particle(x, y, col, Math.cos(angle) * speed, Math.sin(angle) * speed, 20 + Math.random() * 25));
    }
}

function triggerAOE(x, y, exDmg = null, exR = null) {
    let level = player.upgrades.aoe;
    if (level === 0 && exDmg === null) return;
    
    let radius = exR !== null ? exR : (40 + level * 15);
    let aoeDmg = exDmg !== null ? exDmg : (player.damage * (level * 0.2));
    
    aoeEffects.push(new AOEEffect(x, y, radius));
    createExplosion(x, y, '#ab47bc', 8);
    
    enemies.forEach(e => {
        if (e.active) {
            let dx = e.x - x;
            let dy = e.y - y;
            if (dx * dx + dy * dy < (radius + e.w / 2 * e.scale + 6) ** 2) {
                let isCrit = Math.random() < player.critRate;
                let finalDmg = isCrit ? aoeDmg * player.critDamage : aoeDmg;
                e.takeDamage(finalDmg, true, isCrit, 'aoe');
            }
        }
    });
    
    if (level >= 3 && exDmg === null) {
        enemyBullets.forEach(b => {
            if (b.active) {
                let dx = b.x - x;
                let dy = b.y - y;
                if (dx * dx + dy * dy < (radius + 10) ** 2) {
                    b.active = false;
                    particles.push(new Particle(b.x, b.y, '#ffffff', 0, 0, 5));
                }
            }
        });
    }
}
