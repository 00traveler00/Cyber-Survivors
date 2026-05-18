import { Projectile } from './Projectile.js';
import { Missile } from './Missile.js';
import { PiercingProjectile } from './PiercingProjectile.js';
import { Particle } from './Particle.js';
import { Drone } from './Drone.js';

export class Player {
    constructor(game, x, y) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.radius = 20;
        this.projectiles = [];
        this.shootTimer = 0;
        this.time = 0; // For animation

        // Character specific stats
        this.initCharacter(this.game.selectedCharacter);

        // Relic Stats
        this.missileCount = 0; // Number of missile launchers acquired
        this.missileTimer = 0;
        
        // New Weapon Counts (stacks with each pickup, like missileCount)
        this.satelliteBeamCount = 0;
        this.singularityCount = 0;
        this.cyberMineCount = 0;
        this.railgunCount = 0;
        this.boomerangCount = 0;
        this.cyberFangsCount = 0;
        this.hasCyberShotgun = false; // Reserved for future

        // New Weapon Timers
        this.satelliteBeamTimer = 0;
        this.singularityTimer = 0;
        this.mineTimer = 0;
        this.railgunTimer = 0;
        this.boomerangTimer = 0;
        this.fangsTimer = 0;
        this.singularities = [];
        this.mines = [];
        this.boomerangs = [];
        this.beams = []; // Visual laser effects
        this.missileQueue = 0; // Number of missiles waiting to fire
        this.missileBurstTimer = 0; // Timer for burst firing
    }

    initCharacter(charType) {
        switch (charType) {
            case 'girl':
                this.speed = 200;
                this.maxHp = 100;
                this.shootInterval = 0.5;
                this.damage = 10;
                this.color = '#ff00ff'; // Pink
                break;
            case 'cat':
                this.speed = 250;
                this.maxHp = 80;
                this.shootInterval = 0.3;
                this.damage = 5;
                this.color = '#00ffff'; // Cyan
                break;
            case 'boy':
                this.speed = 180;
                this.maxHp = 150;
                this.shootInterval = 0.7;
                this.damage = 10;
                this.color = '#00ff00'; // Green
                break;
            case 'dog':
                this.speed = 220;
                this.maxHp = 120;
                this.shootInterval = 0.5;
                this.damage = 7;
                this.color = '#ff8800'; // Orange
                break;
            default:
                this.speed = 200;
                this.maxHp = 100;
                this.shootInterval = 0.5;
                this.damage = 10;
                this.color = '#ffffff';
                break;
        }
        this.hp = this.maxHp;
        this.charType = charType;
        console.log(`Player initialized: ${charType}, Damage: ${this.damage}`);
    }

    update(dt) {
        this.time += dt;
        const sizeScale = this.projectileSize || 1;

        // Update Holo Decoys
        if (this.decoys) {
            this.decoys.forEach(decoy => {
                decoy.lifeTime -= dt;
            });
            this.decoys = this.decoys.filter(decoy => decoy.lifeTime > 0);
        }
        
        // Orange Item: Adrenaline (Calculate effective stats)
        let effectiveSpeed = this.speed;
        let effectiveShootInterval = this.shootInterval;
        if (this.hasAdrenaline && (this.hp / this.maxHp) <= 0.3) {
            effectiveSpeed *= 1.5; // 50% faster
            effectiveShootInterval *= 0.5; // 50% faster shooting
        }

        // Movement
        const input = this.game.input.getMovementVector();
        this.x += input.x * effectiveSpeed * dt;
        this.y += input.y * effectiveSpeed * dt;
        
        // Orange Items: Auras and Visuals
        if (this.game.waveManager && this.game.waveManager.enemies) {
            // Adrenaline visual (Red trail/particles)
            if (this.hasAdrenaline && (this.hp / this.maxHp) <= 0.3) {
                if (Math.random() < 0.2) {
                    const p = new Particle(this.game, this.x + (Math.random()-0.5)*20, this.y + (Math.random()-0.5)*20, '#ff2222');
                    p.size = 2;
                    p.life = 0.5;
                    this.game.particles.push(p);
                }
            }

            // Frost Aura visual (Blue snowflakes)
            if (this.hasFrostAura && Math.random() < 0.1) {
                const angle = Math.random() * Math.PI * 2;
                const dist = Math.random() * 200 * sizeScale;
                const p = new Particle(this.game, this.x + Math.cos(angle)*dist, this.y + Math.sin(angle)*dist, '#00ccff');
                p.size = 3 * sizeScale;
                p.vx = 0; p.vy = -10; // Float up
                p.life = 1.0;
                this.game.particles.push(p);
            }

            // Vampiric Aura timer (tick once per 0.5s)
            let vampiricTick = false;
            if (this.hasVampiricAura) {
                if (!this.vampiricAuraTimer) this.vampiricAuraTimer = 0;
                this.vampiricAuraTimer += dt;
                if (this.vampiricAuraTimer > 0.5) {
                    vampiricTick = true;
                    this.vampiricAuraTimer = 0;
                }
            }

            this.game.waveManager.enemies.forEach(enemy => {
                const edx = enemy.x - this.x;
                const edy = enemy.y - this.y;
                const edist = Math.sqrt(edx*edx + edy*edy);
                
                // Frost Aura (Slow)
                if (this.hasFrostAura && edist < 200 * sizeScale) {
                    if (!enemy.frostAuraTimer) {
                        enemy.originalSpeed = enemy.originalSpeed || enemy.speed; // Store original speed once
                        enemy.speed = enemy.originalSpeed * 0.5; // Half speed
                    }
                    enemy.frostAuraTimer = 0.5; // Refresh duration
                }

                // Vampiric Aura (Damage and Drain)
                if (this.hasVampiricAura && edist < 150 * sizeScale && vampiricTick) {
                    enemy.takeDamage(8);
                    this.game.showDamage(enemy.x, enemy.y, "8", '#990033');
                    
                    // Accumulate healing (0.5 HP per tick per enemy)
                    if (this.hp < this.maxHp) {
                        this.vampiricHealAccumulator = (this.vampiricHealAccumulator || 0) + 0.5;
                    }
                    
                    // Flashy Drain Effect
                    const p = new Particle(this.game, enemy.x, enemy.y, '#990033');
                    p.vx = (this.x - enemy.x) * 2;
                    p.vy = (this.y - enemy.y) * 2;
                    p.life = 0.5;
                    this.game.particles.push(p);

                    if (enemy.hp <= 0) {
                        this.game.processEnemyDeath(enemy);
                    }
                }
            });

            // Process accumulated Vampiric Aura healing with green floating text on Player
            if (this.hasVampiricAura && this.vampiricHealAccumulator && this.vampiricHealAccumulator >= 1.0) {
                const healAmount = Math.floor(this.vampiricHealAccumulator);
                this.hp = Math.min(this.maxHp, this.hp + healAmount);
                this.game.showDamage(this.x, this.y - 30, `+${healAmount}`, '#00ff00');
                this.vampiricHealAccumulator -= healAmount;
            }
        }

        // Boundary checks (World Bounds)
        if (this.x < this.radius) this.x = this.radius;
        if (this.y < this.radius) this.y = this.radius;
        if (this.x > this.game.worldWidth - this.radius) this.x = this.game.worldWidth - this.radius;
        if (this.y > this.game.worldHeight - this.radius) this.y = this.game.worldHeight - this.radius;

        // Shooting
        this.shootTimer += dt;
        if (this.shootTimer >= effectiveShootInterval) {
            const target = this.findNearestEnemy();
            if (target) {
                this.shoot(target);
                this.shootTimer = 0;
            }
        }

        // Update Projectiles
        this.projectiles.forEach(p => p.update(dt));
        this.projectiles = this.projectiles.filter(p => !p.markedForDeletion);

        // Missile Launcher Logic - Fire missiles sequentially
        if (this.missileCount > 0) {
            this.missileTimer += dt;

            // Queue missiles to fire
            if (this.missileTimer >= 1.5 && this.missileQueue === 0) {
                const target = this.findNearestEnemy();
                if (target) {
                    this.missileQueue = this.missileCount; // Queue all missiles
                    this.missileBurstTimer = 0;
                    this.missileTimer = 0;
                }
            }

            // Fire missiles from queue sequentially
            if (this.missileQueue > 0) {
                this.missileBurstTimer += dt;
                if (this.missileBurstTimer >= 0.1) { // Fire one every 0.1s
                    const target = this.findNearestEnemy();
                    if (target) {
                        this.projectiles.push(new Missile(this.game, this.x, this.y, target));
                        this.missileQueue--;
                        this.missileBurstTimer = 0;
                    } else {
                        // No target, cancel queue
                        this.missileQueue = 0;
                    }
                }
            }
        }
        
        // Orange Item: Orbital Blades update
        if (this.orbitalBlades && this.orbitalBlades.length > 0) {
            const bladeRadius = 60 * sizeScale; // Distance from player
            const rotationSpeed = 3; // Radians per second
            
            this.orbitalBlades.forEach(blade => {
                blade.angle += rotationSpeed * dt;
                const bx = this.x + Math.cos(blade.angle) * bladeRadius;
                const by = this.y + Math.sin(blade.angle) * bladeRadius;
                
                // Check collisions with enemies
                if (this.game.waveManager && this.game.waveManager.enemies) {
                    this.game.waveManager.enemies.forEach(enemy => {
                        const edx = enemy.x - bx;
                        const edy = enemy.y - by;
                        if (edx*edx + edy*edy < (enemy.radius + 15 * sizeScale)*(enemy.radius + 15 * sizeScale)) { // 15 is blade radius
                            if (!enemy.bladeHitTimer) enemy.bladeHitTimer = 0;
                            if (this.time - enemy.bladeHitTimer > 0.2) { // 0.2s cooldown per enemy
                                enemy.takeDamage(this.damage * 0.5); // 50% player damage
                                this.game.showDamage(enemy.x, enemy.y, Math.round(this.damage * 0.5), '#dddddd');
                                enemy.bladeHitTimer = this.time;
                                
                                if (enemy.hp <= 0) {
                                    this.game.processEnemyDeath(enemy);
                                }
                            }
                        }
                    });
                }
            });
        }
        // New Weapons Logic
        
        // 1. Satellite Beam (全ビームを発射し、敵が複数なら分散・1体なら集中)
        if (this.satelliteBeamCount > 0) {
            this.satelliteBeamTimer += dt;
            if (this.satelliteBeamTimer >= effectiveShootInterval * 5.0) {
                const availableTargets = this.findNearestEnemies(
                    Math.min(this.satelliteBeamCount, this.game.waveManager.enemies.length)
                );
                if (availableTargets.length > 0) {
                    this.satelliteBeamTimer = 0;
                    // Build beam list: distribute across available enemies (cycle if fewer than beams)
                    const beamTargets = Array.from({ length: this.satelliteBeamCount },
                        (_, i) => availableTargets[i % availableTargets.length]
                    );
                    beamTargets.forEach(target => {
                        this.game.waveManager.enemies.forEach(enemy => {
                            const dx = enemy.x - target.x;
                            const dy = enemy.y - target.y;
                            const satelliteRadius = 100 * sizeScale;
                            if (dx*dx + dy*dy < satelliteRadius*satelliteRadius) {
                                enemy.takeDamage(this.damage * 4.0);
                                this.game.showDamage(enemy.x, enemy.y, Math.round(this.damage * 4.0), '#ff00ff');
                                if (enemy.hp <= 0) {
                                    this.game.processEnemyDeath(enemy);
                                }
                            }
                        });
                        this.beams.push({
                            type: 'satellite',
                            x1: target.x, y1: target.y - 1000,
                            x2: target.x, y2: target.y,
                            color: '#ff00ff', width: 30 * sizeScale, life: 0.5, maxLife: 0.5
                        });
                        for (let i = 0; i < 20; i++) {
                            const p = new Particle(this.game, target.x + (Math.random()-0.5)*50*sizeScale, target.y + (Math.random()-0.5)*50*sizeScale, '#ff00ff');
                            p.size = (2 + Math.random()*2) * sizeScale;
                            this.game.particles.push(p);
                        }
                    });
                }
            }
        }
        
        // 2. Railgun (fires railgunCount beams in fan pattern, each beam damages independently)
        if (this.railgunCount > 0) {
            this.railgunTimer += dt;
            if (this.railgunTimer >= effectiveShootInterval * 5.0) {
                const target = this.findNearestEnemy();
                if (target) {
                    this.railgunTimer = 0;
                    const baseAngle = Math.atan2(target.y - this.y, target.x - this.x);
                    const spreadAngle = 0.18;
                    const halfSpread = (this.railgunCount - 1) / 2;

                    for (let b = 0; b < this.railgunCount; b++) {
                        const angle = baseAngle + (b - halfSpread) * spreadAngle;
                        const ndx = Math.cos(angle);
                        const ndy = Math.sin(angle);
                        const maxDist = 1500;

                        // Reset per-beam: each beam independently damages enemies
                        this.game.waveManager.enemies.forEach(enemy => enemy.railgunHit = false);

                        for (let d = 0; d < maxDist; d += 10) {
                            const px = this.x + ndx * d;
                            const py = this.y + ndy * d;
                            this.game.waveManager.enemies.forEach(enemy => {
                                const edx = enemy.x - px;
                                const edy = enemy.y - py;
                                const beamRadius = 15 * sizeScale;
                                if (edx*edx + edy*edy < (enemy.radius + beamRadius)*(enemy.radius + beamRadius)) {
                                    if (!enemy.railgunHit) {
                                        enemy.takeDamage(this.damage * 5.0);
                                        this.game.showDamage(enemy.x, enemy.y, Math.round(this.damage * 5.0), '#00ffff');
                                        enemy.railgunHit = true;
                                        if (enemy.hp <= 0) {
                                            this.game.processEnemyDeath(enemy);
                                        }
                                    }
                                }
                            });
                        }
                        this.beams.push({
                            type: 'railgun',
                            x1: this.x, y1: this.y,
                            x2: this.x + ndx * maxDist,
                            y2: this.y + ndy * maxDist,
                            color: '#00ffff', width: 15 * sizeScale, life: 0.3, maxLife: 0.3
                        });
                    }
                    // Final cleanup
                    this.game.waveManager.enemies.forEach(enemy => enemy.railgunHit = false);
                }
            }
        }
        
        // 3. Cyber Fangs (hits cyberFangsCount * 3 enemies with spike visual)
        if (this.cyberFangsCount > 0) {
            this.fangsTimer += dt;
            if (this.fangsTimer >= effectiveShootInterval * 2.0) {
                this.fangsTimer = 0;
                const enemies = this.game.waveManager.enemies;
                if (enemies.length > 0) {
                    const count = Math.min(this.cyberFangsCount * 3, enemies.length);
                    const shuffled = [...enemies].sort(() => 0.5 - Math.random());
                    for (let i = 0; i < count; i++) {
                        const target = shuffled[i];
                        target.takeDamage(this.damage * 1.5);
                        this.game.showDamage(target.x, target.y, Math.round(this.damage * 1.5), '#ff0055');
                        if (target.hp <= 0) {
                            this.game.processEnemyDeath(target);
                        }
                        // Spike beam: rise from below
                        this.beams.push({
                            type: 'fang',
                            x1: target.x, y1: target.y + 80 * sizeScale,
                            x2: target.x, y2: target.y - 30 * sizeScale,
                            color: '#ff0055', width: 10 * sizeScale, life: 0.35, maxLife: 0.35
                        });
                        // Burst particles (outward explosion)
                        for (let j = 0; j < 14; j++) {
                            const angle = (j / 14) * Math.PI * 2;
                            const p = new Particle(this.game, target.x, target.y, j % 2 === 0 ? '#ff0055' : '#ff88aa');
                            p.vx = Math.cos(angle) * (80 + Math.random() * 60) * sizeScale;
                            p.vy = Math.sin(angle) * (80 + Math.random() * 60) * sizeScale;
                            p.life = 0.5;
                            p.size = 4 * sizeScale;
                            this.game.particles.push(p);
                        }
                    }
                }
            }
        }

        // 4. Singularity (spawns singularityCount black holes at once)
        if (this.singularityCount > 0) {
            this.singularityTimer += dt;
            if (this.singularityTimer >= effectiveShootInterval * 5.0) {
                this.singularityTimer = 0;
                for (let i = 0; i < this.singularityCount; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const dist = 100 + Math.random() * 150;
                    this.singularities.push({
                        x: this.x + Math.cos(angle) * dist,
                        y: this.y + Math.sin(angle) * dist,
                        radius: 80 * sizeScale, life: 4.0, pullForce: 50
                    });
                }
            }
        }
        
        if (this.singularities) {
            this.singularities = this.singularities.filter(s => s.life > 0);
            this.singularities.forEach(s => {
                s.life -= dt;
                this.game.waveManager.enemies.forEach(enemy => {
                    const dx = s.x - enemy.x;
                    const dy = s.y - enemy.y;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    if (dist < s.radius * 2) {
                        const force = (1 - dist / (s.radius * 2)) * s.pullForce;
                        enemy.x += (dx / dist) * force * dt;
                        enemy.y += (dy / dist) * force * dt;
                        
                        if (dist < s.radius) {
                            if (!enemy.singularityHitTimer) enemy.singularityHitTimer = 0;
                            if (this.time - enemy.singularityHitTimer >= 0.2) {
                                const dmg = this.damage * 1.5 * 0.2; // 3x damage over 0.2s tick (0.5 * 3 * 0.2)
                                enemy.takeDamage(dmg);
                                this.game.showDamage(enemy.x, enemy.y, Math.round(dmg), '#8844ff');
                                enemy.singularityHitTimer = this.time;
                                if (enemy.hp <= 0) {
                                    this.game.processEnemyDeath(enemy);
                                }
                            }
                        }
                    }
                });
            });
        }

        // 5. Cyber Mine (drops cyberMineCount mines at once)
        if (this.cyberMineCount > 0) {
            this.mineTimer += dt;
            if (this.mineTimer >= effectiveShootInterval * 2.0) {
                this.mineTimer = 0;
                for (let i = 0; i < this.cyberMineCount; i++) {
                    const angle = (i / this.cyberMineCount) * Math.PI * 2;
                    const spread = this.cyberMineCount > 1 ? 25 * sizeScale : 0;
                    this.mines.push({
                        x: this.x + Math.cos(angle) * spread,
                        y: this.y + Math.sin(angle) * spread,
                        radius: 15 * sizeScale, exploded: false
                    });
                }
            }
        }
        
        if (this.mines) {
            this.mines = this.mines.filter(m => !m.exploded);
            this.mines.forEach(m => {
                this.game.waveManager.enemies.forEach(enemy => {
                    const dx = m.x - enemy.x;
                    const dy = m.y - enemy.y;
                    if (dx*dx + dy*dy < (m.radius + enemy.radius)*(m.radius + enemy.radius)) {
                        m.exploded = true;
                        this.game.waveManager.enemies.forEach(e => {
                            const edx = e.x - m.x;
                            const edy = e.y - m.y;
                            const blastRad = 80 * sizeScale;
                            if (edx*edx + edy*edy < blastRad*blastRad) {
                                e.takeDamage(this.damage * 2);
                                this.game.showDamage(e.x, e.y, Math.round(this.damage * 2), '#ffcc00');
                                if (e.hp <= 0) {
                                    this.game.processEnemyDeath(e);
                                }
                            }
                        });
                        for (let i = 0; i < 10; i++) {
                            this.game.particles.push(new Particle(this.game, m.x, m.y, '#ffcc00'));
                        }
                    }
                });
            });
        }

        // 6. Boomerang Blade (throws boomerangCount blades in fan pattern, range x2)
        if (this.boomerangCount > 0) {
            this.boomerangTimer += dt;
            if (this.boomerangTimer >= effectiveShootInterval) {
                const target = this.findNearestEnemy();
                if (target) {
                    this.boomerangTimer = 0;
                    const baseAngle = Math.atan2(target.y - this.y, target.x - this.x);
                    const spreadAngle = 0.3;
                    const halfSpread = (this.boomerangCount - 1) / 2;
                    for (let i = 0; i < this.boomerangCount; i++) {
                        const angle = baseAngle + (i - halfSpread) * spreadAngle;
                        this.boomerangs.push({
                            x: this.x, y: this.y,
                            startX: this.x, startY: this.y,
                            angle: angle,
                            distance: 0, maxDistance: 400,
                            returning: false, radius: 15 * sizeScale, life: 4.0
                        });
                    }
                }
            }
        }
        
        if (this.boomerangs) {
            this.boomerangs = this.boomerangs.filter(b => b.life > 0);
            this.boomerangs.forEach(b => {
                b.life -= dt;
                const speed = 300;
                if (!b.returning) {
                    b.distance += speed * dt;
                    b.x = b.startX + Math.cos(b.angle) * b.distance;
                    b.y = b.startY + Math.sin(b.angle) * b.distance;
                    if (b.distance >= b.maxDistance) {
                        b.returning = true;
                    }
                } else {
                    const dx = this.x - b.x;
                    const dy = this.y - b.y;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    if (dist < 20) {
                        b.life = 0;
                    } else {
                        b.x += (dx / dist) * speed * dt;
                        b.y += (dy / dist) * speed * dt;
                    }
                }
                
                this.game.waveManager.enemies.forEach(enemy => {
                    const dx = b.x - enemy.x;
                    const dy = b.y - enemy.y;
                    if (dx*dx + dy*dy < (b.radius + enemy.radius)*(b.radius + enemy.radius)) {
                        if (!enemy.boomerangHitTimer) enemy.boomerangHitTimer = 0;
                        if (this.time - enemy.boomerangHitTimer > 0.3) {
                            enemy.takeDamage(this.damage * 1.0);
                            this.game.showDamage(enemy.x, enemy.y, Math.round(this.damage * 1.0), '#ffffff');
                            enemy.boomerangHitTimer = this.time;
                            if (enemy.hp <= 0) {
                                this.game.processEnemyDeath(enemy);
                            }
                        }
                    }
                });
            });
        }


        
        // Update Beams
        if (this.beams) {
            this.beams = this.beams.filter(b => b.life > 0);
            this.beams.forEach(b => b.life -= dt);
        }
    }

    shoot(target) {
        this.game.audio.playShoot(); // Sound effect

        // Calculate base shots (1 for normal, 3 for dog)
        let baseShots = [];
        if (this.charType === 'dog') {
            // Dog Skill: 3-way shot
            baseShots = [0, 0.2, -0.2];
        } else {
            // Normal shot
            baseShots = [0];
        }

        // Fire base shots
        baseShots.forEach(angle => {
            if (this.charType === 'cat') {
                this.projectiles.push(new PiercingProjectile(this.game, this.x, this.y, target, angle));
            } else if (this.charType === 'boy') {
                // Missile already handles targeting
                this.projectiles.push(new Missile(this.game, this.x, this.y, target));
            } else {
                this.projectiles.push(new Projectile(this.game, this.x, this.y, target, angle));
            }
        });

        // Splitter Module: Add extra normal shots (Projectiles) with wider angles
        if (this.multiShotCount && this.multiShotCount > 1) {
            const extraShots = this.multiShotCount - 1;
            const angleStep = 0.15; // Spread angle between extra shots

            for (let i = 0; i < extraShots; i++) {
                const angleOffset = angleStep * (i + 1);
                this.projectiles.push(new Projectile(this.game, this.x, this.y, target, angleOffset));
                this.projectiles.push(new Projectile(this.game, this.x, this.y, target, -angleOffset));
            }
        }

        // Plasma Orb: Fire piercing projectiles
        if (this.pierceShotCount && this.pierceShotCount > 0) {
            for (let i = 0; i < this.pierceShotCount; i++) {
                // Offset piercing shots slightly to avoid complete overlap
                const pierceAngle = i * 0.05;
                this.projectiles.push(new PiercingProjectile(this.game, this.x, this.y, target, pierceAngle));
            }
        }
    }

    findNearestEnemy() {
        let nearest = null;
        let minDist = Infinity;
        if (!this.game.waveManager || !this.game.waveManager.enemies) return null;
        this.game.waveManager.enemies.forEach(enemy => {
            const dx = enemy.x - this.x;
            const dy = enemy.y - this.y;
            const dist = dx * dx + dy * dy;
            if (dist < minDist) { minDist = dist; nearest = enemy; }
        });
        return nearest;
    }

    // Returns up to n nearest enemies (sorted by distance)
    findNearestEnemies(n) {
        if (!this.game.waveManager || !this.game.waveManager.enemies) return [];
        return [...this.game.waveManager.enemies]
            .map(e => ({ e, dist: (e.x-this.x)**2 + (e.y-this.y)**2 }))
            .sort((a, b) => a.dist - b.dist)
            .slice(0, n)
            .map(item => item.e);
    }

    draw(ctx) {
        const sizeScale = this.projectileSize || 1;

        // Draw Holo Decoys
        if (this.decoys && this.decoys.length > 0) {
            this.decoys.forEach(decoy => {
                ctx.save();
                ctx.translate(decoy.x, decoy.y);
                
                const r = this.radius;
                
                // Cyan Glow Aura
                ctx.shadowBlur = 25;
                ctx.shadowColor = '#00ffff';
                ctx.fillStyle = 'rgba(0, 255, 255, 0.15)';
                ctx.beginPath();
                ctx.arc(0, 0, r * 1.2, 0, Math.PI * 2);
                ctx.fill();
                
                // Silhouette Body
                ctx.fillStyle = 'rgba(0, 255, 255, 0.4)';
                ctx.beginPath();
                ctx.arc(0, 0, r, 0, Math.PI * 2);
                ctx.fill();
                
                // Digital Grid Lines
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(0, 0, r * 0.7, 0, Math.PI * 2);
                ctx.stroke();
                
                ctx.beginPath();
                ctx.moveTo(-r, 0);
                ctx.lineTo(r, 0);
                ctx.stroke();
                
                ctx.restore();
            });
        }
        // Draw Auras
        if (this.hasFrostAura) {
            ctx.save();
            ctx.strokeStyle = 'rgba(0, 204, 255, 0.3)';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.arc(this.x, this.y, 200 * sizeScale, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
        
        if (this.hasVampiricAura) {
            ctx.save();
            ctx.strokeStyle = 'rgba(153, 0, 51, 0.3)';
            ctx.lineWidth = 2;
            ctx.setLineDash([10, 10]);
            ctx.beginPath();
            ctx.arc(this.x, this.y, 150 * sizeScale, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        if (this.singularities) {
            this.singularities.forEach(s => {
                ctx.save();
                ctx.fillStyle = 'rgba(85, 0, 170, 0.4)';
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
                ctx.fill();
                // Inner core
                ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.radius * 0.3, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            });
        }

        if (this.mines) {
            this.mines.forEach(m => {
                ctx.save();
                ctx.fillStyle = '#ffcc00';
                ctx.beginPath();
                ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
                ctx.fill();
                // blinking center
                if (Math.floor(this.time * 5) % 2 === 0) {
                    ctx.fillStyle = '#ff0000';
                    ctx.beginPath();
                    ctx.arc(m.x, m.y, m.radius * 0.5, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
            });
        }

        if (this.boomerangs) {
            this.boomerangs.forEach(b => {
                ctx.save();
                ctx.translate(b.x, b.y);
                ctx.rotate(this.time * 10); // Spin fast
                ctx.fillStyle = '#00ff55';
                ctx.beginPath();
                ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
                ctx.fill();
                // Blade shape
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(0, -b.radius);
                ctx.lineTo(b.radius, b.radius);
                ctx.lineTo(-b.radius, b.radius);
                ctx.closePath();
                ctx.stroke();
                ctx.restore();
            });
        }

        // Draw Beams
        if (this.beams) {
            this.beams.forEach(b => {
                ctx.save();
                ctx.strokeStyle = b.color;
                ctx.lineWidth = b.width * (b.life / b.maxLife);
                ctx.beginPath();
                ctx.moveTo(b.x1, b.y1);
                ctx.lineTo(b.x2, b.y2);
                ctx.stroke();
                
                // Add white core
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = (b.width * 0.3) * (b.life / b.maxLife);
                ctx.beginPath();
                ctx.moveTo(b.x1, b.y1);
                ctx.lineTo(b.x2, b.y2);
                ctx.stroke();
                
                ctx.restore();
            });
        }

        this.projectiles.forEach(p => p.draw(ctx));
        
        // Draw Orbital Blades
        if (this.orbitalBlades && this.orbitalBlades.length > 0) {
            const bladeRadius = 60 * sizeScale;
            ctx.save();
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#dddddd';
            ctx.fillStyle = '#dddddd';
            this.orbitalBlades.forEach(blade => {
                const bx = this.x + Math.cos(blade.angle) * bladeRadius;
                const by = this.y + Math.sin(blade.angle) * bladeRadius;
                
                ctx.save();
                ctx.translate(bx, by);
                ctx.rotate(blade.angle + Math.PI/2);
                ctx.scale(sizeScale, sizeScale);
                ctx.beginPath();
                ctx.moveTo(0, -10);
                ctx.lineTo(5, 5);
                ctx.lineTo(-5, 5);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            });
            ctx.restore();
        }

        // Draw Neon Character
        ctx.save();
        ctx.translate(this.x, this.y);

        // Breathing Animation
        const breath = Math.sin(this.time * 4) * 2;
        const r = this.radius + breath;

        // Outer Glow (Aura)
        ctx.shadowBlur = 30 + Math.sin(this.time * 10) * 10;
        ctx.shadowColor = this.color;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.beginPath();
        ctx.arc(0, 0, r * 1.2, 0, Math.PI * 2);
        ctx.fill();

        // Main Body Glow
        ctx.shadowBlur = 20;
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();

        // Tech Lines / Circuitry
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.7, 0, Math.PI * 2); // Inner ring
        ctx.stroke();

        // Inner White Core
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#fff';
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.4, 0, Math.PI * 2);
        ctx.fill();

        // Electric Sparks (Cat specific)
        if (this.charType === 'cat' && Math.random() < 0.1) {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            const angle = Math.random() * Math.PI * 2;
            ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
            ctx.lineTo(Math.cos(angle) * (r + 10), Math.sin(angle) * (r + 10));
            ctx.stroke();
        }

        // Accessories
        this.drawAccessories(ctx, r);

        ctx.restore();
    }

    drawAccessories(ctx, r) {
        ctx.fillStyle = this.color;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;

        if (this.charType === 'cat') {
            // Obtuse Cat Ears (Wider and Shorter)
            ctx.beginPath();
            ctx.moveTo(-15, -10);
            ctx.lineTo(-22, -20);
            ctx.lineTo(-5, -18);
            ctx.fill();
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(15, -10);
            ctx.lineTo(22, -20);
            ctx.lineTo(5, -18);
            ctx.fill();
            ctx.stroke();

            // Whiskers
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.beginPath();
            // Left
            ctx.moveTo(-5, 2); ctx.lineTo(-18, 0);
            ctx.moveTo(-5, 5); ctx.lineTo(-18, 6);
            // Right
            ctx.moveTo(5, 2); ctx.lineTo(18, 0);
            ctx.moveTo(5, 5); ctx.lineTo(18, 6);
            ctx.stroke();

            // Cyber Tail (Animated)
            const tailWag = Math.sin(this.time * 4) * 10;
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(0, r * 0.8);
            ctx.quadraticCurveTo(15 + tailWag, r + 5, 18 + tailWag, r - 5);
            ctx.stroke();

        } else if (this.charType === 'girl') {
            // Small Halo at Top (Blue Archive style)
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.lineWidth = 2;
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#fff';
            ctx.beginPath();
            ctx.arc(0, -r * 2.2, r * 0.4, 0, Math.PI * 2);
            ctx.stroke();

            // Inner glow
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(0, -r * 2.2, r * 0.3, 0, Math.PI * 2);
            ctx.stroke();

            // Crystal Halo (Hexagon) - Small, above head
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.lineWidth = 2;
            ctx.shadowBlur = 10;
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (i / 6) * Math.PI * 2 + this.time;
                const hx = Math.cos(angle) * (r * 0.6);
                const hy = -r * 2.2 + Math.sin(angle) * (r * 0.6);
                if (i === 0) ctx.moveTo(hx, hy);
                else ctx.lineTo(hx, hy);
            }
            ctx.closePath();
            ctx.stroke();

            // Orbital Ring
            ctx.strokeStyle = this.color;
            ctx.beginPath();
            ctx.ellipse(0, 0, r * 2.0, r * 0.6, this.time * 2, 0, Math.PI * 2);
            ctx.stroke();

            // Particle Tail (Simulated)
            const tailY = Math.sin(this.time * 5) * 5;
            ctx.fillStyle = this.color;
            for (let i = 1; i <= 3; i++) {
                ctx.beginPath();
                ctx.arc(-i * 10, 15 + tailY * (i / 2), 4 - i, 0, Math.PI * 2);
                ctx.fill();
            }

        } else if (this.charType === 'dog') {
            // Animated Ears (Synchronized up/down)
            const earWiggle = Math.sin(this.time * 10) * 3;

            ctx.fillStyle = '#ffaa00';
            // Both ears move together
            ctx.beginPath();
            ctx.ellipse(-18, -5 + earWiggle, 8, 14, Math.PI / 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.beginPath();
            ctx.ellipse(18, -5 + earWiggle, 8, 14, -Math.PI / 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Collar
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 10, 12, 0, Math.PI);
            ctx.stroke();

        } else if (this.charType === 'boy') {
            // Cooler Cyber Ninja - Dark tactical helmet
            ctx.fillStyle = '#004400';
            ctx.shadowBlur = 0;
            ctx.beginPath();
            // Helmet shape
            ctx.arc(0, -2, r * 1.1, Math.PI * 0.8, Math.PI * 0.2);
            ctx.lineTo(r * 0.9, 5);
            ctx.lineTo(-r * 0.9, 5);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Glowing Eye Visor (horizontal line)
            ctx.fillStyle = this.color;
            ctx.shadowBlur = 20;
            ctx.shadowColor = this.color;
            ctx.beginPath();
            ctx.rect(-r * 0.8, -4, r * 1.6, 3);
            ctx.fill();

            // Forehead plate detail
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 2;
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.moveTo(-6, -8);
            ctx.lineTo(0, -12);
            ctx.lineTo(6, -8);
            ctx.stroke();

            // Shoulder guards
            ctx.fillStyle = '#003300';
            ctx.shadowBlur = 0;
            ctx.beginPath();
            ctx.moveTo(-r, 8);
            ctx.lineTo(-r * 1.4, 12);
            ctx.lineTo(-r * 1.2, 18);
            ctx.lineTo(-r * 0.8, 15);
            ctx.fill();
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(r, 8);
            ctx.lineTo(r * 1.4, 12);
            ctx.lineTo(r * 1.2, 18);
            ctx.lineTo(r * 0.8, 15);
            ctx.fill();
            ctx.stroke();
        }
    }
}
