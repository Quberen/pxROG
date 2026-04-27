// === entities.js ===

class Player {
    constructor() {
        this.sprite = sprites.player; this.w = this.sprite.width; this.h = this.sprite.height;
        this.x = width / 2; this.y = height - 120; this.targetX = this.x; this.targetY = this.y;
        
        let diffData = DIFF_CONFIG[currentDifficulty];
        this.maxHp = diffData.p_hp; this.hp = this.maxHp; 
        this.damage = diffData.p_dmg; 
        
        this.pt = 0; this.totalUpgradePoints = 0;
        
        this.skillEnergy = 0; this.maxSkillEnergy = 100;
        this.skillActiveTimer = 0; this.skillCdTimer = 0;
        
        this.healSpawnRate = 0.05; this.healMultiplier = 0.10; 
        this.pierce = 0; this.magnetRadius = 150; this.wingmen = 0; 
        this.critRate = 0.05; this.critDamage = 1.5; 
        this.upgrades = { damage: 0, hp: 0, pierce: 0, magnet: 0, aoe: 0, wingman: 0, healer_rate: 0, heal_up: 0, slot: 0, caliber: 0, crit_rate: 0, crit_dmg: 0 };
        
        this.maxSlots = 3; this.usedSlots = 0;
        this.equipment = {};
        upgradePool.filter(i => i.type === 'equip').forEach(i => {
            this.equipment[i.id] = { owned: false, equipped: false, slotCost: i.slotCost, name: i.name, level: 0, canUnequip: i.canUnequip !== false };
        });
        
        this.fireCooldown = 0; this.bursting = 0; this.burstTimer = 0; this.laserTick = 0; this.isFiringLaser = false;
        this.invincible = 0;
    }
    update() {
        this.x += (this.targetX - this.x) * 0.3; this.y += (this.targetY - this.y) * 0.3;
        this.x = Math.max(this.w/2, Math.min(width - this.w/2, this.x)); this.y = Math.max(this.h/2, Math.min(height - this.h/2, this.y));
        this.processShooting();
        
        if (this.invincible > 0) this.invincible--;
        if (this.skillActiveTimer > 0) {
            if (frameCount % 2 === 0 && particles.length < 200) particles.push(new Particle(this.x, this.y + this.h/2, '#00e5ff', (Math.random()-0.5)*5, 4 + Math.random()*4, 20));
        } else if (frameCount % 3 === 0 && particles.length < 150) {
            particles.push(new Particle(this.x, this.y + this.h/2 - 5, '#00e676', (Math.random()-0.5), 2 + Math.random()*2, 15));
        }
    }
    
    processShooting() {
        let eq = this.equipment; let currentFireRate = 20;
        if (eq.speed.equipped) currentFireRate = Math.max(7, 16 - (eq.speed.level - 1) * 3);
        
        let baseDmg = this.damage; 
        if (eq.debt_protocol.equipped) baseDmg *= 0.8; 
        
        let actCritRate = this.critRate; let actCritDmg = this.critDamage;
        if(this.skillActiveTimer > 0) { actCritRate += 0.8; }
        if(actCritRate > 1.0) { actCritDmg += (actCritRate - 1.0); actCritRate = 1.0; }

        let homingTurn = 0;
        if(eq.homing.equipped) { baseDmg *= (0.6 + (eq.homing.level - 1) * 0.15); homingTurn = 0.15 + (eq.homing.level - 1) * 0.1; }
        if(eq.spread.equipped) baseDmg *= Math.min(1.0, 0.8 + (eq.spread.level - 1) * 0.05); 
        
        let cw = 4 + (this.upgrades.damage || 0) * 0.3; let ch = 8 + (this.upgrades.damage || 0) * 0.6; 
        
        let pCnt = 0; let pRet = 1.0;
        if(eq.pierce.equipped) {
            pCnt = eq.pierce.level >= 3 ? 2 : 1; pRet = eq.pierce.level >= 2 ? 0.8 : 0.5;
        }

        let spawnBullet = (vx, vy) => {
            let b = new Bullet(this.x, this.y - this.h/2, vx, vy, cw, ch, baseDmg, pCnt, pRet, actCritRate, actCritDmg, '#ffffff'); 
            b.isHoming = eq.homing.equipped; b.homingTurn = homingTurn; bullets.push(b);
        };

        let doShoot = () => {
            if(eq.laser.equipped) return;
            if(eq.spread.equipped) {
                let spreadLvl = eq.spread.level; let count = Math.min(5, spreadLvl + 1);
                let startVx = -1.5 * (count - 1) / 2;
                for(let i=0; i<count; i++) { spawnBullet(startVx + 1.5 * i, -16); }
            } else { spawnBullet(0, -16); }
        };
        
        this.isFiringLaser = false;
        if (eq.laser.equipped) {
            if (eq.pulse.equipped) { if (this.bursting > 0) this.isFiringLaser = true; } 
            else { this.isFiringLaser = true; } 
            
            if (this.isFiringLaser) {
                this.laserTick++;
                if (this.laserTick % 5 === 0) {
                    let laserMult = 0.25 + (eq.laser.level - 1) * 0.15; let laserDmg = baseDmg * laserMult;
                    enemies.forEach(e => {
                        if (!e.active) return;
                        let hit = false; let hitOffset = 0;
                        if (Math.abs(e.x - this.x) < e.w/2 + 16 && e.y < this.y) { hit = true; hitOffset = 0; }
                        if (!hit && eq.spread.equipped) {
                            let dy = this.y - e.y;
                            if (dy > 0) {
                                let offset = dy * 0.15; 
                                if (Math.abs(e.x - (this.x - offset)) < e.w/2 + 16) { hit = true; hitOffset = -offset; }
                                else if (Math.abs(e.x - (this.x + offset)) < e.w/2 + 16) { hit = true; hitOffset = offset; }
                            }
                        }
                        if (hit) {
                            let isCrit = Math.random() < actCritRate; let finalDmg = isCrit ? laserDmg * actCritDmg : laserDmg;
                            e.takeDamage(finalDmg, true, isCrit, 'laser');
                            if(particles.length < 180) {
                                particles.push(new Particle(e.x, e.y + e.h/2, '#00e5ff', (Math.random()-0.5)*8, Math.random()*5, 8));
                                particles.push(new Particle(e.x, e.y + e.h/2, '#ffffff', (Math.random()-0.5)*4, Math.random()*3, 6));
                            }
                            if(this.upgrades.aoe > 0 && Math.random()<0.1) triggerAOE(e.x, e.y, finalDmg, 40);
                        }
                    });
                }
            }
        }

        if (eq.pulse.equipped) {
            let burstCount = eq.pulse.level >= 3 ? 4 : 3; let cdMult = 3.0 - (eq.pulse.level - 1) * 0.5;
            if (this.bursting > 0) {
                this.burstTimer--;
                if(this.burstTimer <= 0) { doShoot(); this.bursting--; this.burstTimer = 5; }
            } else {
                this.fireCooldown--;
                if(this.fireCooldown <= 0) { this.bursting = burstCount; this.burstTimer = 0; this.fireCooldown = currentFireRate * cdMult; }
            }
        } else {
            this.fireCooldown--; if (this.fireCooldown <= 0) { doShoot(); this.fireCooldown = currentFireRate; }
        }
    }

    draw(ctx) { 
        if (this.invincible % 4 < 2) ctx.drawImage(this.sprite, this.x - this.w/2, this.y - this.h/2); 
        
        if (this.isFiringLaser && this.hp > 0) {
            let laserBaseWidth = 12 + (this.upgrades.caliber || 0) * 2;
            if (this.equipment.pulse.equipped) laserBaseWidth += 4;
            let pulseWidth = laserBaseWidth + Math.sin(frameCount * 0.3) * 4;
            
            const drawLaserBeam = (offsetX, angle) => {
                ctx.save(); ctx.translate(this.x + offsetX, this.y - this.h/2); ctx.rotate(angle);
                let gradient = ctx.createLinearGradient(-pulseWidth/2, 0, pulseWidth/2, 0);
                gradient.addColorStop(0, "rgba(0, 229, 255, 0)"); gradient.addColorStop(0.3, "rgba(0, 229, 255, 0.6)");
                gradient.addColorStop(0.5, "rgba(0, 229, 255, 0.9)"); gradient.addColorStop(0.7, "rgba(0, 229, 255, 0.6)"); gradient.addColorStop(1, "rgba(0, 229, 255, 0)");
                ctx.fillStyle = gradient; ctx.globalAlpha = 0.8 + Math.sin(frameCount * 0.5) * 0.2;
                ctx.fillRect(-pulseWidth/2, -height, pulseWidth, height);
                ctx.globalAlpha = 1.0; ctx.fillStyle = '#ffffff'; ctx.fillRect(-pulseWidth/6, -height, pulseWidth/3, height);
                ctx.restore();
            };

            drawLaserBeam(0, 0);
            if (this.equipment.spread.equipped) { drawLaserBeam(0, -0.15); drawLaserBeam(0, 0.15); }
        }
    }

    takeDamage(amount, isPercent = false, sourceStr = 'normal') {
        if(this.invincible > 0 || endingState !== 'none') return;
        let isSwarm = sourceStr === 'swarm'; let isSpecial = sourceStr === 'special'; let isKamikaze = sourceStr === 'kamikaze' || isSpecial;
        
        let actualAmount = isPercent ? Math.max(40, Math.floor(this.maxHp * amount)) : amount;
        if (!isPercent && currentDifficulty === 3) actualAmount *= 1.25;

        this.hp -= actualAmount; this.invincible = 20; 
        
        // 动态位移坐标产生：被 main.js 中的高频弹簧捕获
        let dmgMag = 15 + Math.min(20, actualAmount * 0.6);
        let dmgAng = Math.random() * Math.PI * 2;
        uiOffsets.hp.x += Math.cos(dmgAng) * dmgMag;
        uiOffsets.hp.y += Math.sin(dmgAng) * dmgMag;
        
        let pColor = isSpecial ? '#424242' : '#9e9e9e'; let pCount = isSpecial ? 40 : (isKamikaze ? 30 : 12);
        createExplosion(this.x, this.y, pColor, pCount);

        if (isSpecial) { hitStopFrames = 8; flashScreenTimer = 10; flashScreenColor = '255,0,0'; triggerShake(18, 15); } 
        else if (isKamikaze) { hitStopFrames = 4; triggerShake(10, 10); } 
        else { triggerShake(6, 8); }
        
        let textColor = '#ff3333';
        if (isSpecial) textColor = '#8e0000';
        else if (isKamikaze && !isSpecial) textColor = '#ffea00'; 
        else if (isSwarm) textColor = '#ab47bc'; 
        
        if(config.dmgText) pushFloatingText(this.x, this.y-20, Math.floor(actualAmount), textColor, true);
        comboCount = Math.floor(comboCount / 2);
        
        if (this.hp <= 0) { this.hp = 0; startEnding('playerDead'); }
        updateHUD(); 
    }
    
    heal(amount, isEliteDrop = false) {
        let actualHeal = Math.min(amount, Math.max(0, this.maxHp - this.hp));
        this.hp += actualHeal;
        if(config.dmgText && actualHeal > 0) {
            pushFloatingText(this.x, this.y-20, Math.floor(actualHeal), isEliteDrop ? '#ffea00' : '#00e676', false, false, "+");
        }
        updateHUD();
    }
}

class Bullet {
    constructor(x, y, vx, vy, w, h, dmg, pierceCount, pierceRetain, cRate, cDmg, color) { 
        this.x = x; this.y = y; this.vx = vx; this.vy = vy; this.w = w; this.h = h; 
        this.damage = dmg; this.pierceCount = pierceCount; this.pierceRetain = pierceRetain; 
        this.critRate = cRate; this.critDamage = cDmg;
        this.color = color; this.active = true; this.hitEnemies = new Set(); this.isHoming=false; this.homingTurn=0.15; 
    }
    update() { 
        if (this.isHoming && player.hp > 0 && endingState === 'none') {
            let target = null; let minDist = Infinity;
            for (let e of enemies) { if(!e.active) continue; let d = (e.x-this.x)**2 + (e.y-this.y)**2; if(d < minDist) { minDist = d; target = e; } }
            if (target && minDist < 90000) {
                let dx = target.x - this.x; let dy = target.y - this.y; let dist = Math.sqrt(dx*dx + dy*dy) || 1;
                this.vx += (dx/dist) * this.homingTurn; this.vy += (dy/dist) * this.homingTurn;
                let speed = Math.sqrt(this.vx**2 + this.vy**2);
                if (speed > 16) { this.vx = (this.vx/speed)*16; this.vy = (this.vy/speed)*16; }
            }
        }
        this.x += this.vx; this.y += this.vy; 
        if (this.y < -this.h || this.y > height+this.h || this.x < -this.w || this.x > width+this.w) this.active = false; 
    }
    draw(ctx) { 
        ctx.fillStyle = this.color; ctx.fillRect(this.x - this.w/2, this.y - this.h/2, this.w, this.h); 
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'; ctx.fillRect(this.x - this.w/2 + 1, this.y + this.h/2, this.w - 2, this.h * 0.8);
    }
}

class EnemyBullet {
    constructor(x, y, vx, vy, type='normal') { 
        this.x = x; this.y = y; this.vx = vx; this.vy = vy; this.size = 8; this.active = true; 
        this.type = type; this.homingTimer = 60; 
        this.color = type === 'homing' ? '#ab47bc' : '#ff1744'; 
        this.coreColor = type === 'homing' ? '#00b0ff' : '#ffeb3b';
    }
    update() { 
        if (this.type === 'homing' && player.hp > 0 && endingState === 'none' && this.homingTimer > 0) {
            this.homingTimer--;
            let dx = player.x - this.x; let dy = player.y - this.y; let dist = Math.sqrt(dx*dx + dy*dy) || 1;
            this.vx += (dx/dist) * 0.25; this.vy += (dy/dist) * 0.25;
            let speed = Math.sqrt(this.vx*this.vx + this.vy*this.vy);
            if (speed > 4.0) { this.vx = (this.vx/speed)*4.0; this.vy = (this.vy/speed)*4.0; }
        }
        this.x += this.vx; this.y += this.vy; 
        if (this.y > height + 20 || this.x < -20 || this.x > width + 20) this.active = false; 
        if (Math.abs(this.x - player.x) < player.w/2 + 2 && Math.abs(this.y - player.y) < player.h/2 + 2) { 
            let baseDmg = this.type === 'homing' ? 12 : 10;
            let diffDmg = baseDmg * DIFF_CONFIG[currentDifficulty].dmgMod;
            player.takeDamage(diffDmg); this.active = false; 
        } 
    }
    draw(ctx) { 
        ctx.fillStyle = this.color; ctx.fillRect(this.x - this.size/2, this.y - this.size/2, this.size, this.size); 
        ctx.fillStyle = this.coreColor; ctx.fillRect(this.x - this.size/4, this.y - this.size/4, this.size/2, this.size/2); 
    }
}

class BaseEnemy {
    constructor(x, y, sprite, hpRaw, weight, particleColor) { 
        this.x = x; this.y = y; this.sprite = sprite; this.w = sprite.width; this.h = sprite.height; 
        let diffData = DIFF_CONFIG[currentDifficulty];
        
        this.hp = hpRaw * diffData.hpMod * levelHpMultiplier; 
        this.maxHp = this.hp; 
        
        this.weight = weight;
        this.active = true; this.isHealer = false; this.isSwarm = false; this.isKamikaze = false; this.isSpecial = false; this.isBoss = false; this.isBossMinion = false;
        
        this.isBattery = false; 
        this._initMods = false; 
        
        this.particleColor = particleColor || '#757575'; 
        this.scale = 1.0; this.isElite = false; this.eliteFireTimer = 0;
    }
    makeElite() {
        this.isElite = true; this.scale = 1.5; this.hp *= 15; this.maxHp = this.hp;
        this.speed *= 0.6; this.eliteFireTimer = 120;
    }
    checkBounds() { 
        if (this.isBoss) return; 
        if (this.y > height + 100 || this.y < -150 || this.x < -100 || this.x > width + 100) {
            this.active = false;
            if (this.isSpecial) specialKamikazeMisses++;
        }
    }
    checkPlayerCollision(isPercent = false, overrideDmg = null) { 
        let r_w = this.w * this.scale; let r_h = this.h * this.scale;
        if (Math.abs(this.x - player.x) < (r_w/2 + player.w/2 - 8) && Math.abs(this.y - player.y) < (r_h/2 + player.h/2 - 8)) { 
            let sourceStr = 'normal';
            if(this.isSpecial) sourceStr = 'special'; else if(this.isKamikaze) sourceStr = 'kamikaze'; else if(this.isSwarm) sourceStr = 'swarm';
            
            let baseDmg = this.isSwarm ? 18 : 15;
            if (overrideDmg !== null) baseDmg = overrideDmg;

            let actualDmg = isPercent ? baseDmg : (baseDmg * DIFF_CONFIG[currentDifficulty].dmgMod);
            if (this.isElite) actualDmg *= 2;
            
            player.takeDamage(actualDmg, isPercent, sourceStr); 
            if(!this.isBoss) {
                if (this.isSpecial) specialKamikazeMisses = 0; 
                this.die(false); 
            }
        } 
    }
    baseUpdate() {
        if (!this._initMods) {
            this._initMods = true;
            if (!this.isHealer && !this.isSpecial && !this.isBoss) {
                if (Math.random() < 0.15) { this.isBattery = true; }
            }
            
            if (this.isBattery) {
                if (this.sprite === sprites.locator || this.sprite === sprites.locator_swarm) this.sprite = sprites.locator_battery;
                else if (this.sprite === sprites.wanderer || this.sprite === sprites.wanderer_swarm) this.sprite = sprites.wanderer_battery;
                else if (this.sprite === sprites.turret || this.sprite === sprites.turret_swarm) this.sprite = sprites.turret_battery;
            }
        }

        if (this.isElite && this.y > 0 && this.y < height * 0.8) {
            this.eliteFireTimer--;
            if (this.eliteFireTimer <= 0) {
                for(let i=0; i<8; i++) { let angle = (Math.PI * 2 / 8) * i; enemyBullets.push(new EnemyBullet(this.x, this.y, Math.cos(angle)*2.5, Math.sin(angle)*2.5, 'normal')); }
                this.eliteFireTimer = 180;
            }
        }
    }
    draw(ctx) { 
        ctx.save(); ctx.translate(this.x, this.y);
        if(this.isElite) { ctx.shadowBlur = 15; ctx.shadowColor = '#ff1744'; }
        ctx.scale(this.scale, this.scale); ctx.drawImage(this.sprite, -this.w/2, -this.h/2); ctx.restore();
    }
    takeDamage(amount, showText=true, isCrit=false, damageType='normal') {
        this.hp -= amount; 
        if(particles.length < 150) {
            let pCount = this.isElite || this.isBoss ? 4 : 2; let pCol = this.isBattery ? '#00e5ff' : this.particleColor; 
            for(let i=0; i<pCount; i++) particles.push(new Particle(this.x, this.y, pCol, (Math.random()-0.5)*4, (Math.random()-0.5)*4, 10));
        }
        if(showText && config.dmgText) {
            let color = '#ffffff'; if (isCrit) color = '#ffea00'; else if (damageType === 'laser') color = '#00e5ff';
            pushFloatingText(this.x + (Math.random()-0.5)*15, this.y - this.h/2*this.scale, amount, color, false, isCrit);
        }
        if (this.hp <= 0 && endingState === 'none') { if (this.isBoss) { this.hp = 0; startEnding('bossDead'); } else { this.die(true); } }
    }
    die(killed) {
        this.active = false; let pColor = this.isBattery ? '#00e5ff' : this.particleColor;
        createExplosion(this.x, this.y, pColor, this.isElite || this.isBoss ? 40 : 12); triggerShake(this.isElite || this.isBoss ? 8 : 2, 5); 
        
        if (killed) { 
            if (this.isSpecial) specialKamikazeMisses = 0; 
            comboCount++; comboTimer = maxComboTimer;
            if (comboCount > 0 && comboCount % 50 === 0) {
                let color = comboCount >= 200 ? '#e60050' : (comboCount >= 100 ? '#ffea00' : '#00b0ff');
                createExplosion(this.x, this.y, color, 30); triggerShake(4, 5); items.push(new Item(this.x, this.y, 'combo_reward', comboCount * 0.1, color));
            }
            if (this.isHealer) { items.push(new Item(this.x, this.y, 'hp', { isElite: this.isElite })); } 
            else if (this.isBattery) { items.push(new Item(this.x, this.y, 'energy', Math.max(15, this.weight * 5))); } 
            else {
                let ptVal = this.weight * 0.1; if (this.isElite) ptVal *= 30; if (this.isBossMinion) ptVal = this.weight * 0.1 * 1.5; 
                items.push(new Item(this.x, this.y, ptVal >= 1.0 ? 'pt_core' : 'pt_shard', ptVal)); 
            }
        }
    }
}

// 【数据剥离实现】：所有继承类在构建时直接抽取 WORKSHOP 中的字典数据
class Locator extends BaseEnemy {
    constructor(x, y, isSwarm=false, isHealer=false, speedOverride=null) { 
        let pColor = isHealer ? '#00e676' : (isSwarm ? '#ab47bc' : '#757575');
        let key = isSwarm ? 'LocatorSwarm' : 'Locator'; let def = WORKSHOP.data.enemies[key];
        let spr = isHealer ? sprites.locator_healer : (isSwarm ? sprites.locator_swarm : sprites.locator);
        super(x, y, spr, def.hp, def.weight, pColor); 
        this.speed = speedOverride || (isSwarm ? 1.5 : 1.0 + Math.random()*0.5); 
        this.isHealer = isHealer; this.isSwarm = isSwarm;
    }
    update() { this.baseUpdate(); this.y += this.speed; this.checkBounds(); this.checkPlayerCollision(); }
}

class Wanderer extends BaseEnemy { 
    constructor(x, y, isHighThreat, phase=null, isSwarm=false, isHealer=false, side=null) { 
        let pColor = isHealer ? '#00e676' : (isSwarm ? '#ab47bc' : '#757575');
        let key = isSwarm ? 'WandererSwarm' : (isHighThreat ? 'WandererHigh' : 'WandererLow'); let def = WORKSHOP.data.enemies[key];
        let spr = isHealer ? sprites.wanderer_healer : (isSwarm ? sprites.wanderer_swarm : sprites.wanderer);
        super(x, y, spr, def.hp, def.weight, pColor); 
        this.isHealer = isHealer; this.isSwarm = isSwarm;
        this.side = side; this.swayPhase = phase !== null ? phase : Math.random() * Math.PI * 2; 
        let baseSpeed = isHighThreat ? (1.6 + Math.random()*1.5) : (0.8 + Math.random()*0.6);
        this.swayAmp = isHighThreat ? (3.5 + Math.random()*3.5) : (1.0 + Math.random()*1.5);
        if (this.side === 'left') { this.x = -40; this.y = -40; this.vx = 2.0; this.vy = baseSpeed; }
        else if (this.side === 'right') { this.x = width+40; this.y = -40; this.vx = -2.0; this.vy = baseSpeed; }
        else { this.vx = 0; this.vy = baseSpeed; }
    } 
    update() { 
        this.baseUpdate(); this.x += this.vx; this.y += this.vy; 
        if (!this.side) this.x += Math.sin(frameCount * 0.04 + this.swayPhase) * this.swayAmp; 
        if (this.y > 0) { let boundedW = this.w/2 * this.scale; if (this.x < boundedW) { this.x = boundedW; if(this.vx < 0) this.vx *= -1; } if (this.x > width - boundedW) { this.x = width - boundedW; if(this.vx > 0) this.vx *= -1; } }
        this.checkBounds(); this.checkPlayerCollision(); 
    } 
}

class Kamikaze extends BaseEnemy {
    constructor(x, y, vType='normal') { 
        let pColor = vType === 'special' ? '#8e0000' : (vType === 'swarm' ? '#ab47bc' : '#ffeb3b');
        let key = vType === 'special' ? 'KamikazeSpec' : (vType === 'swarm' ? 'KamikazeSwarm' : 'Kamikaze'); let def = WORKSHOP.data.enemies[key];
        let spr = vType === 'special' ? sprites.kamikaze_special_idle : (vType === 'swarm' ? sprites.kamikaze_swarm_idle : sprites.kamikaze_idle);
        
        let actHp = def.hp;
        if (vType === 'special') { actHp = (currentDifficulty === 3 ? 180 : 120) * (1 + specialKamikazeMisses * 1.5); }
        super(x, y, spr, actHp, def.weight, pColor); 
        this.vType = vType; this.state = 'ENTER'; this.timer = 0; this.vx = 0; this.vy = 2; 
        this.warnTime = vType === 'special' ? 75 : 45; this.dashSpeed = vType === 'special' ? 16 : (8 + Math.random()*3); 
        this.isKamikaze = true; this.isSpecial = vType === 'special'; this.isSwarm = vType === 'swarm';
    }
    update() {
        this.baseUpdate();
        if (this.state === 'ENTER') { 
            this.y += this.vy; if (this.y > 60) { this.state = 'WARN'; this.timer = this.warnTime; this.sprite = this.vType === 'special' ? sprites.kamikaze_special_warn : (this.vType === 'swarm' ? sprites.kamikaze_swarm_warn : sprites.kamikaze_warn); } 
        } else if (this.state === 'WARN') { 
            this.timer--; this.x += (Math.random() - 0.5) * (this.vType === 'special' ? 3 : 2); 
            if (this.timer <= 0) { this.state = 'DASH'; let dx = player.x - this.x; let dy = player.y - this.y; let dist = Math.sqrt(dx*dx + dy*dy) || 1; this.vx = (dx/dist) * this.dashSpeed; this.vy = (dy/dist) * this.dashSpeed; } 
        } else if (this.state === 'DASH') { this.x += this.vx; this.y += this.vy; this.checkBounds(); }
        
        let overrideDmg = 30; if(this.vType === 'swarm') overrideDmg = 20;
        if (this.vType === 'special') this.checkPlayerCollision(true, 0.35); else this.checkPlayerCollision(false, overrideDmg);
    }
}

class Turret extends BaseEnemy {
    constructor(x, y, isSwarm=false, isHealer=false) { 
        let pColor = isHealer ? '#00e676' : (isSwarm ? '#ab47bc' : '#757575');
        let key = isSwarm ? 'TurretSwarm' : 'Turret'; let def = WORKSHOP.data.enemies[key];
        let spr = isHealer ? sprites.turret_healer : (isSwarm ? sprites.turret_swarm : sprites.turret);
        super(x, y, spr, def.hp, def.weight, pColor); 
        this.isSwarm = isSwarm; this.targetY = 50 + Math.random() * 100; 
        this.shootTimer = 60 + Math.random() * 60; this.isHealer = isHealer;
    }
    update() {
        this.baseUpdate();
        if (this.y < this.targetY) this.y += 2; else { 
            this.shootTimer--; 
            if(this.shootTimer <= 0) { let dx = player.x - this.x; let dy = player.y - this.y; let dist = Math.sqrt(dx*dx + dy*dy) || 1; enemyBullets.push(new EnemyBullet(this.x, this.y + this.h/2, (dx/dist)*3, (dy/dist)*3, this.isSwarm ? 'homing' : 'normal')); this.shootTimer = this.isSwarm ? 120 : 100; } 
        }
        this.checkBounds(); this.checkPlayerCollision();
    }
}

class ArcFlyer extends BaseEnemy { 
    constructor(x, y, isLeft, progressOffset=0, isSwarm=false) { 
        let pColor = isSwarm ? '#ab47bc' : '#37474f';
        let key = isSwarm ? 'ArcFlyerSwarm' : 'ArcFlyer'; let def = WORKSHOP.data.enemies[key];
        super(0, y, isSwarm ? sprites.arc_swarm : sprites.arc, def.hp, def.weight, pColor); 
        this.isLeft = isLeft; this.x = this.isLeft ? -30 : width + 30; 
        this.startY = y + 80; this.progress = progressOffset; this.bombTimer = 0; this.isSwarm = isSwarm;
    } 
    update() { 
        this.baseUpdate(); this.progress += 0.012; 
        if(this.progress > 0) {
            this.x = this.isLeft ? -30 + (width + 60) * this.progress : width + 30 - (width + 60) * this.progress; this.y = this.startY + Math.sin(this.progress * Math.PI) * 150; 
            this.bombTimer--; if (this.bombTimer <= 0 && this.x > 10 && this.x < width - 10) { enemyBullets.push(new EnemyBullet(this.x, this.y, 0, 4, 'normal')); this.bombTimer = 35; }
        }
        if (this.progress >= 1) this.active = false; if (this.progress > 0) this.checkPlayerCollision(); 
    } 
}

class Tank extends BaseEnemy { 
    constructor(x, y, isSpecial=false, isSwarm=false) { 
        let pColor = isSwarm ? '#ab47bc' : '#757575';
        let key = isSwarm ? 'TankSwarm' : 'Tank'; let def = WORKSHOP.data.enemies[key];
        let spr = isSwarm ? sprites.tank_swarm : sprites.tank;
        super(x, y, spr, def.hp, def.weight, pColor); 
        this.speed = isSwarm ? 0.15 : 0.4; this.spawnTimer = 180; this.isSwarm = isSwarm;
    } 
    update() { 
        this.baseUpdate(); this.y += this.speed; 
        if(this.isSwarm && this.y > 0 && this.y < height * 0.7) {
            this.spawnTimer--;
            if(this.spawnTimer <= 0) { 
                if (Math.random() < 0.5) { enemies.push(new Kamikaze(this.x - 20, this.y + 20, 'swarm')); enemies.push(new Kamikaze(this.x + 20, this.y + 20, 'swarm')); } 
                else { enemies.push(new Locator(this.x - 30, this.y + 20, true)); enemies.push(new Locator(this.x, this.y + 30, true)); enemies.push(new Locator(this.x + 30, this.y + 20, true)); }
                this.spawnTimer = 240; 
            }
        }
        this.checkBounds(); this.checkPlayerCollision(); 
    } 
}

class BossScrapDominator extends BaseEnemy {
    constructor(x, y) {
        super(x, y, sprites.boss_scrap, (currentDifficulty <= 1) ? 4000 : 8000, 100, '#7b1fa2');
        this.hp = this.maxHp; this.phase = 1; this.state = 'ENTER'; this.timer = 120; this.targetX = width / 2;
        this.isSpecial = true; this.isBoss = true; this.laserWarnTimer = 0; this.laserFireTimer = 0;
        
        ui.bossHpCont.style.opacity = 1; ui.bossToast.innerText = "废铁主宰者"; ui.bossToast.style.opacity = 1; setTimeout(() => { ui.bossToast.style.opacity = 0; }, 4000);
    }
    
    update() {
        if (endingState === 'bossDead') return;
        let hpPct = Math.max(0, this.hp / this.maxHp);
        ui.bossHpFill.style.width = `${hpPct * 100}%`; ui.bossHpDelay.style.width = `${hpPct * 100}%`;

        if (this.phase === 1 && this.hp < this.maxHp * 0.5) { this.phase = 2; this.sprite = sprites.boss_scrap_phase2; triggerShake(20, 30); createExplosion(this.x, this.y, '#ff1744', 40); this.state = 'HOVER'; this.timer = 60; }
        if (this.state === 'ENTER') { this.y += 1; if (this.y >= 100) { this.state = 'HOVER'; this.timer = 60; } }
        else if (this.state === 'HOVER') {
            this.x += (this.targetX - this.x) * 0.02; this.timer--;
            if (this.timer <= 0) {
                let roll = Math.random();
                if (this.phase === 1) { if (roll < 0.5) { this.state = 'ATTACK_SPAWN'; this.timer = 30; } else { this.state = 'ATTACK_RING'; this.timer = 60; } } 
                else { if (roll < 0.3) { this.state = 'ATTACK_SPAWN'; this.timer = 30; } else if (roll < 0.6) { this.state = 'ATTACK_RING'; this.timer = 60; } else { this.state = 'ATTACK_LASER'; this.laserWarnTimer = 60; this.laserFireTimer = 60; } }
            }
            if (Math.abs(this.targetX - this.x) < 10 && Math.random() < 0.02) this.targetX = Math.random() * (width - 100) + 50;
        }
        else if (this.state === 'ATTACK_SPAWN') {
            this.timer--; this.x += (this.targetX - this.x) * 0.01;
            if (this.timer === 0) {
                if (this.phase === 1) { for(let i=0; i<4; i++) { let e = new Locator(this.x + (i-1.5)*40, this.y + 40); e.weight *= 1.5; e.isBossMinion = true; enemies.push(e); } } 
                else { let phaseAngle = Math.random() * Math.PI * 2; for(let i=0; i<4; i++) { let e = new Wanderer(i%2===0 ? 40 : width-40, -40, false, phaseAngle + i*Math.PI/2, true); e.weight *= 1.5; e.isBossMinion = true; enemies.push(e); } }
                this.state = 'HOVER'; this.timer = 60;
            }
        }
        else if (this.state === 'ATTACK_RING') {
            this.timer--; this.x += (this.targetX - this.x) * 0.005;
            if (this.timer % 15 === 0) { let bCount = this.phase === 1 ? 12 : 16; let offset = (this.timer / 15) * 0.2; for (let i = 0; i < bCount; i++) { let angle = (Math.PI * 2 / bCount) * i + offset; let speed = 3; enemyBullets.push(new EnemyBullet(this.x, this.y, Math.cos(angle)*speed, Math.sin(angle)*speed, 'normal')); } }
            if (this.timer <= 0) { this.state = 'HOVER'; this.timer = 90; }
        }
        else if (this.state === 'ATTACK_LASER') {
            if (this.laserWarnTimer > 0) this.laserWarnTimer--;
            else if (this.laserFireTimer > 0) { this.laserFireTimer--; if (Math.abs(player.x - this.x) < 30 && player.y > this.y) { let diffDmg = 10 * DIFF_CONFIG[currentDifficulty].dmgMod; player.takeDamage(diffDmg, false, 'special'); } triggerShake(3, 2); } 
            else { this.state = 'HOVER'; this.timer = 90; this.targetX = Math.random() * (width - 100) + 50; }
        }
        this.checkPlayerCollision(false, 40);
    }
    
    draw(ctx) {
        super.draw(ctx);
        if (this.state === 'ATTACK_LASER' && endingState === 'none') {
            if (this.laserWarnTimer > 0) { ctx.fillStyle = `rgba(255, 23, 68, ${0.2 + (60-this.laserWarnTimer)/60 * 0.4})`; ctx.fillRect(this.x - 30, this.y, 60, height); } 
            else if (this.laserFireTimer > 0) { ctx.save(); ctx.shadowBlur = 20; ctx.shadowColor = '#ff1744'; ctx.fillStyle = '#ff1744'; ctx.fillRect(this.x - 25, this.y, 50, height); ctx.shadowBlur = 0; ctx.fillStyle = '#ffffff'; ctx.fillRect(this.x - 10, this.y, 20, height); ctx.restore(); }
        }
    }
}

class Item {
    constructor(x, y, type, value, overrideColor = null) { 
        this.x = x; this.y = y; this.type = type; this.value = value; this.active = true; 
        this.vy = 1.5; this.color = overrideColor;
        if (type === 'hp') this.sprite = sprites.hp; else if (type === 'pt_core') this.sprite = sprites.pt_core; else if (type === 'pt_shard') this.sprite = sprites.pt_shard; else if (type === 'energy') this.sprite = sprites.energy_crystal; else this.sprite = sprites.pt_shard;
        this.w = this.sprite.width; this.h = this.sprite.height; 
    }
    update() {
        if(player.hp <= 0) return;
        if (this.type === 'combo_reward') {
            if(!this.color) this.color = '#00e5ff';
            if(frameCount % 2 === 0) particles.push(new Particle(this.x, this.y, this.color, 0, 0, 10));
            let dx = shopBtnRect.x - this.x; let dy = shopBtnRect.y - this.y; let dist = Math.sqrt(dx*dx + dy*dy) || 1; this.x += (dx/dist) * 15; this.y += (dy/dist) * 15;
            if (dist < 20) { this.active = false; player.pt += this.value; pushFloatingText(50 + Math.random()*15, 45 + Math.random()*10, `+${this.value % 1 === 0 ? this.value : this.value.toFixed(1)} PT`, this.color, false, true, "", 7); if(ui.shopBtn) { let s = document.getElementById('shop-btn-cvs'); s.style.transform = 'scale(1.2)'; setTimeout(()=> { s.style.transform = 'translate(3px, 3px)'; }, 100); } } return;
        }

        let dx = player.x - this.x; let dy = player.y - this.y; let distSq = dx*dx + dy*dy; let magnetArea = player.magnetRadius * player.magnetRadius;
        if (distSq < magnetArea) { const force = 800 / (distSq + 100); this.x += dx * force; this.y += dy * force; } else { this.y += this.vy; }
        
        if (distSq < 900) { 
            this.active = false; 
            if (this.type.startsWith('pt')) { player.pt += this.value; pushFloatingText(50 + (Math.random()-0.5)*15, 45 + (Math.random()-0.5)*10, `+${this.value % 1 === 0 ? this.value : this.value.toFixed(1)}`, '#e0e0e0', false, false, "", 6); } 
            else if (this.type === 'hp') { let healAmt = this.value.isElite ? player.maxHp * 0.60 : player.maxHp * (0.20 + (player.upgrades.heal_up * 0.05)); player.heal(healAmt, this.value.isElite); }
            else if (this.type === 'energy') { player.skillEnergy = Math.min(player.maxSkillEnergy, player.skillEnergy + this.value); pushFloatingText(skillBtnRect.x, skillBtnRect.y - 30, `+ENG`, '#00e5ff', false, false, "", 8); updateHUD(); }
        }
        if (this.y > height + 50) this.active = false;
    }
    draw(ctx) { 
        if(this.type === 'combo_reward') return; ctx.save();
        if (this.type === 'hp') { ctx.shadowBlur = 12; ctx.shadowColor = '#00e676'; } else if (this.type === 'energy') { ctx.shadowBlur = 12; ctx.shadowColor = '#00e5ff'; }
        ctx.drawImage(this.sprite, this.x - this.w/2, this.y - this.h/2 + Math.sin(frameCount * 0.1) * 3); ctx.restore();
    }
}

class Particle {
    constructor(x, y, color, vx, vy, life) { this.x = x; this.y = y; this.color = color; this.vx = vx; this.vy = vy; this.life = life; this.maxLife = life; this.size = 1 + Math.random() * 3; this.active = true; }
    update() { this.x += this.vx; this.y += this.vy; this.vx *= 0.92; this.vy *= 0.92; this.life--; if(this.life <= 0) this.active = false; }
    draw(ctx) { ctx.globalAlpha = this.life / this.maxLife; ctx.fillStyle = this.color; ctx.fillRect(Math.round(this.x), Math.round(this.y), this.size, this.size); ctx.globalAlpha = 1; }
}

class DamageText {
    constructor(x, y, amountStr, colorStr, isPlayerDamage = false, isCrit = false, prefix = "", fontSize = 10) { 
        this.x = x; this.y = y; this.fontSize = fontSize; let disp = amountStr; if(typeof amountStr === 'number') { disp = Math.floor(amountStr); } 
        this.text = (isPlayerDamage ? "-" : prefix) + disp + (isCrit && typeof amountStr === 'number' ? "!" : ""); 
        this.color = colorStr || '#ffffff'; this.life = 45; this.maxLife = 45;
        
        let phys = WORKSHOP.data.physics;
        if (isPlayerDamage) {
            this.vx = (Math.random() - 0.5) * phys.dmg_text_player_speed_x; 
            this.vy = phys.dmg_text_player_speed_y - Math.random() * 2; 
            this.gravity = phys.dmg_text_player_gravity;
        } else {
            this.vx = (Math.random() - 0.5) * 2; this.vy = -3 - Math.random() * 2; this.gravity = 0.2;
        }
        this.active = true; this.isCrit = isCrit;
    }
    update() { this.x += this.vx; this.y += this.vy; this.vy += this.gravity; this.life--; if (this.life <= 0) this.active = false; }
    draw(ctx) { 
        let progress = 1 - (this.life / this.maxLife); ctx.globalAlpha = this.life < 15 ? this.life / 15 : 1; 
        let scale = progress < 0.2 ? 1 + (progress / 0.2) * 0.5 : 1.5 - ((progress - 0.2) / 0.8) * 0.5; if(this.isCrit) scale *= 1.3;
        ctx.save(); ctx.translate(this.x, this.y); ctx.scale(scale, scale);
        ctx.fillStyle = this.color; ctx.font = `${this.fontSize}px "Press Start 2P", "DotGothic16", monospace`; ctx.textAlign = 'center'; 
        ctx.lineWidth = 3; ctx.strokeStyle = "#000"; ctx.strokeText(this.text, 0, 0); ctx.fillText(this.text, 0, 0); ctx.restore(); ctx.globalAlpha = 1; 
    }
}
function pushFloatingText(x, y, amt, col, isP, isCrit=false, prefix="", fSize=10) { if(floatingTexts.length > 50) floatingTexts.shift(); floatingTexts.push(new DamageText(x, y, amt, col, isP, isCrit, prefix, fSize)); }

class AOEEffect {
    constructor(x, y, maxRadius) { this.x = x; this.y = y; this.radius = 0; this.maxRadius = maxRadius; this.life = 15; this.active = true; }
    update() { this.radius += (this.maxRadius - this.radius) * 0.3; this.life--; if (this.life <= 0) this.active = false; }
    draw(ctx) { ctx.strokeStyle = '#ab47bc'; ctx.lineWidth = 3; ctx.globalAlpha = this.life / 15; ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1; }
}

function createExplosion(x, y, color, count) { 
    if (particles.length > 300) return; 
    for(let i=0; i<count; i++) { const angle = Math.random() * Math.PI * 2; const speed = 1 + Math.random() * 5; particles.push(new Particle(x, y, color, Math.cos(angle) * speed, Math.sin(angle) * speed, 20 + Math.random()*25)); } 
}

function triggerAOE(x, y, explicitDmg = null, explicitRadius = null) {
    let level = player.upgrades.aoe; if (level === 0 && explicitDmg === null) return;
    let radius = explicitRadius !== null ? explicitRadius : (40 + level * 15); let aoeDmg = explicitDmg !== null ? explicitDmg : (player.damage * (level * 0.2));
    aoeEffects.push(new AOEEffect(x, y, radius)); createExplosion(x, y, '#ab47bc', 8); 
    enemies.forEach(e => {
        if(e.active) {
            let dx = e.x - x; let dy = e.y - y;
            if(dx*dx + dy*dy < (radius + e.w/2 * e.scale + 6)**2) {
                let isCrit = Math.random() < player.critRate; let finalDmg = isCrit ? aoeDmg * player.critDamage : aoeDmg; e.takeDamage(finalDmg, true, isCrit, 'aoe'); 
            }
        }
    });
    if (level >= 3 && explicitDmg === null) {
        enemyBullets.forEach(b => { if(b.active) { let dx = b.x - x; let dy = b.y - y; if(dx*dx + dy*dy < (radius+10)**2) { b.active = false; particles.push(new Particle(b.x, b.y, '#ffffff', 0, 0, 5)); } } });
    }
}
