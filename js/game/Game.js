import { InputHandler } from './InputHandler.js';
import { Player } from './entities/Player.js';
import { WaveManager } from './systems/WaveManager.js';
import { Drop } from './entities/Drop.js';
import { UIManager } from '../ui/UIManager.js';
import { UpgradeSystem } from './systems/UpgradeSystem.js';
import { EnemyProjectile } from './entities/EnemyProjectile.js';
import { Chest } from './entities/Chest.js';
import { FloatingText } from './entities/FloatingText.js';
import { Obstacle } from './entities/Obstacle.js';
import { AudioManager } from './audio/AudioManager.js';
import { Minimap } from './ui/Minimap.js';
import { Particle } from './entities/Particle.js';
import { Drone } from './entities/Drone.js';
import { NextStageAltar } from './entities/NextStageAltar.js';
import { SkillTree } from './systems/SkillTree.js';
import { SkillTreeUI } from '../ui/SkillTreeUI.js';
import { Missile } from './entities/Missile.js';

export class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        // World & Camera
        this.worldWidth = 2000;
        this.worldHeight = 2000;
        this.camera = { x: 0, y: 0 };

        // Game Entities
        this.waveManager = null;
        this.player = null;
        this.drops = [];
        this.enemyProjectiles = [];
        this.chests = [];
        this.floatingTexts = [];
        this.acquiredRelics = [];
        this.obstacles = [];
        this.particles = []; // New Particle System
        this.currentChest = null; // Track which chest is currently open
        this.drones = [];

        // No more sprite assets - Procedural Neon Graphics

        this.state = 'title'; // title, home, playing, reward, result

        // Progression
        this.money = 0;
        this.ene = 0;
        this.totalEneCollected = 0;
        this.mapLevel = 1;
        this.loopCount = 0; // ステージ10クリア後のループ回数
        this.totalStagesCleared = 0; // 通算ステージクリア回数（難易度計算用）
        this.selectedCharacter = 'girl';
        this.selectedDifficulty = localStorage.getItem('difficulty') || 'normal'; // normal, hard, veryhard
        this.debugMode = false;

        this.resize();
        window.addEventListener('resize', () => this.resize());

        this.input = new InputHandler();
        this.ui = new UIManager(this);
        this.skillTree = new SkillTree(this);
        this.skillTreeUI = new SkillTreeUI(this, this.ui);
        this.skillTreeUI.init('skilltree-canvas-container');
        this.upgradeSystem = new UpgradeSystem(this);
        this.audio = new AudioManager();
        this.minimap = null; // Created after game starts

        this.setState('title');
        this.running = false;
        this.lastTime = 0;
    }

    start() {
        this.running = true;
        this.lastTime = performance.now();
        requestAnimationFrame(this.loop.bind(this));
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.ctx.imageSmoothingEnabled = false;
    }

    setState(newState) {
        this.state = newState;
        this.ui.showScreen(newState === 'playing' ? 'hud' : newState);

        // Toggle body class for minimap visibility
        if (newState === 'playing') {
            document.body.classList.add('playing');
        } else {
            document.body.classList.remove('playing');
        }

        if (newState === 'playing') {
            if (!this.player) this.startRun(); // Only start run if not resuming
        } else if (newState === 'title') {
            // Reset
        } else if (newState === 'home') {
            this.mapLevel = 1; // Reset to stage 1 when returning home
            this.ui.updateHome();
        }
    }

    setDifficulty(diff) {
        this.selectedDifficulty = diff;
        localStorage.setItem('difficulty', diff);
        console.log(`Difficulty set to: ${diff}`);
    }

    startRun(preserveStats = false) {
        if (!preserveStats) {
            // Reset run-specific stats for a new game
            this.totalStagesCleared = 0;
            this.loopCount = 0;
            this.mapLevel = 1;
            this.ene = 0;
            this.acquiredRelics = [];
            this.totalDamageDealt = 0;
            this.totalDamageTaken = 0;
            this.runMoney = 0; // Accumulated money during this run
            this.killCount = {}; // Track kills by type
            console.log("Starting new run: Stats reset.");
        }

        // Initialize audio on first start
        this.audio.init();
        this.audio.playBGM();

        // Create minimap
        this.minimap = new Minimap(this);

        // Save previous stats if preserving
        let prevHp = this.player ? this.player.hp : null;
        let prevMaxHp = this.player ? this.player.maxHp : null;
        let prevDamage = this.player ? this.player.damage : null;
        let prevSpeed = this.player ? this.player.speed : null;
        let prevRelics = this.acquiredRelics;

        let initialTime = 0;
        if (preserveStats && this.waveManager) {
            initialTime = this.waveManager.time;
        }

        // Calculate difficulty based on total stages cleared (Time scaling is handled in WaveManager)
        // 通算ステージクリア回数に基づく基礎難易度
        // 1ステージクリアごとに +0.1 (10%)
        const stageDifficulty = 1.0 + (this.totalStagesCleared * 0.1);
        const loopDifficulty = this.loopCount * 0.5; // ループごとの難易度上昇を少しマイルドに

        // Difficulty Selection Multiplier
        let diffMultiplier = 1.0;
        if (this.selectedDifficulty === 'hard') diffMultiplier = 1.5;
        if (this.selectedDifficulty === 'veryhard') diffMultiplier = 2.0;

        const baseDifficulty = (stageDifficulty + loopDifficulty) * diffMultiplier;

        // Debug: Log difficulty breakdown
        console.log(`[Difficulty Init] Total Stages: ${this.totalStagesCleared}, Loop: ${this.loopCount}`);
        console.log(`[Difficulty Init] Base: ${baseDifficulty.toFixed(2)} (Stage: ${stageDifficulty.toFixed(2)} + Loop: ${loopDifficulty.toFixed(2)})`);

        this.waveManager = new WaveManager(this, baseDifficulty, initialTime);
        this.player = new Player(this, this.worldWidth / 2, this.worldHeight / 2);
        this.drones = []; // Initialize before applying upgrades (which might add drones)

        // Re-apply upgrades (Base stats)
        this.upgradeSystem.applyUpgrades(this.player);
        // Sync HP and Shield with upgraded Max values
        this.player.hp = this.player.maxHp;
        this.player.shield = this.player.maxShield || 0;

        if (preserveStats) {
            // Restore Relics FIRST to establish Max Stats correctly
            // (Base Stats + Upgrades are already applied by new Player() and applyUpgrades())
            this.acquiredRelics = prevRelics;
            this.acquiredRelics.forEach(relic => {
                relic.effect(this.player);
            });

            // Restore HP (Maintain percentage from previous run)
            if (prevHp && prevMaxHp) {
                const hpPercent = prevHp / prevMaxHp;
                this.player.hp = this.player.maxHp * hpPercent;
            }

            // Heal player slightly on new stage
            this.player.hp = Math.min(this.player.hp + 20, this.player.maxHp);
        } else {
            this.acquiredRelics = [];
            this.ene = 0;
            this.totalEneCollected = 0; // Reset total collected

            // Apply Gacha (Reserved) Item if any
            if (this.upgradeSystem.reservedRelicId) {
                const relic = this.ui.relics.find(r => r.id === this.upgradeSystem.reservedRelicId);
                if (relic) {
                    console.log(`Starting run with reserved item: ${relic.name}`);
                    const startingRelic = { ...relic };
                    this.acquiredRelics.push(startingRelic);
                    startingRelic.effect(this.player);
                }
                // Reset Gacha state after run starts
                this.upgradeSystem.resetGachaCost();
            }
        }

        // Debug Mode: Super stats
        if (this.debugMode) {
            this.player.hp = 999999999;
            this.player.maxHp = 999999999;
            console.log('DEBUG MODE ACTIVE: Super HP enabled!');
        }

        // Reset Slo-Mo & Screen Shake parameters
        this.timeScale = 1.0;
        this.sloMoTimer = 0;
        this.screenShakeIntensity = 0;
        this.screenShakeDuration = 0;

        this.drops = [];
        this.enemyProjectiles = [];
        this.chests = [];
        this.floatingTexts = [];
        this.particles = [];

        // Generate obstacles
        this.obstacles = [];
        const obstacleCount = 15 + this.mapLevel * 5;
        for (let i = 0; i < obstacleCount; i++) {
            const x = Math.random() * this.worldWidth;
            const y = Math.random() * this.worldHeight;
            // Avoid spawning near player start
            const dx = x - this.worldWidth / 2;
            const dy = y - this.worldHeight / 2;
            if (Math.sqrt(dx * dx + dy * dy) > 200) {
                this.obstacles.push(new Obstacle(this, x, y));
            }
        }

        // Spawn Initial Chests (Scattered) - Exactly 2 Yellow chests per stage
        const baseCategories = ['blue', 'green', 'red', 'yellow', 'yellow'];
        const randomPool = ['blue', 'green', 'red'];
        let chestCategories = [...baseCategories];
        
        // Add 2 random chests from Blue, Green, Red to make a total of 7 chests
        for (let i = 0; i < 2; i++) {
            const randomIndex = Math.floor(Math.random() * randomPool.length);
            chestCategories.push(randomPool[randomIndex]);
        }
        
        // Shuffle the 7 categories
        for (let i = chestCategories.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [chestCategories[i], chestCategories[j]] = [chestCategories[j], chestCategories[i]];
        }

        let spawnedChests = 0;
        let attempts = 0;
        while (spawnedChests < 7 && attempts < 100) {
            attempts++;
            const x = Math.random() * (this.worldWidth - 100) + 50;
            const y = Math.random() * (this.worldHeight - 100) + 50;
            const dx = x - this.player.x;
            const dy = y - this.player.y;
            if (dx * dx + dy * dy > 40000) {
                // Prevent spawning on top of obstacles
                let overlaps = false;
                for (const obs of this.obstacles) {
                    const odx = x - obs.x;
                    const ody = y - obs.y;
                    if (Math.sqrt(odx * odx + ody * ody) < obs.radius + 35) { // Obstacle radius (30) + Chest radius (20) + padding
                        overlaps = true;
                        break;
                    }
                }
                if (!overlaps) {
                    const category = chestCategories[spawnedChests];
                    this.chests.push(new Chest(this, x, y, category));
                    spawnedChests++;
                }
            }
        }



        // Spawn Orange Chest every 2 stages
        if (this.mapLevel % 2 === 0) {
            let orangeSpawned = false;
            let orangeAttempts = 0;
            while (!orangeSpawned && orangeAttempts < 100) {
                orangeAttempts++;
                const x = Math.random() * (this.worldWidth - 100) + 50;
                const y = Math.random() * (this.worldHeight - 100) + 50;
                const dx = x - this.player.x;
                const dy = y - this.player.y;
                if (dx * dx + dy * dy > 40000) {
                    // Prevent spawning on top of obstacles
                    let overlaps = false;
                    for (const obs of this.obstacles) {
                        const odx = x - obs.x;
                        const ody = y - obs.y;
                        if (Math.sqrt(odx * odx + ody * ody) < obs.radius + 35) {
                            overlaps = true;
                            break;
                        }
                    }
                    if (!overlaps) {
                        this.chests.push(new Chest(this, x, y, 'orange'));
                        orangeSpawned = true;
                    }
                }
            }
        }

        // Update HUD immediately
        this.ui.updateAcquiredItems(this.acquiredRelics);
    }

    loop(timestamp) {
        if (!this.running) return;

        const deltaTime = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;

        this.update(deltaTime);
        this.draw();

        requestAnimationFrame(this.loop.bind(this));
    }

    update(dt) {
        // Real-time timers (unscaled by slo-mo)
        if (this.sloMoTimer && this.sloMoTimer > 0) {
            this.sloMoTimer -= dt;
            if (this.sloMoTimer <= 0) {
                this.timeScale = 1.0;
            }
        }
        if (this.screenShakeDuration > 0) {
            this.screenShakeDuration -= dt;
            if (this.screenShakeDuration <= 0) {
                this.screenShakeIntensity = 0;
            }
        }

        if (this.state === 'skilltree') {
            if (this.skillTreeUI) this.skillTreeUI.update(dt);
            return;
        }
        if (this.state === 'reward') return; // Pause for reward selection

        if (this.state === 'dying') {
            this.deathTimer += dt;
            
            // Keep updating particles so they explode outwards beautifully!
            this.particles.forEach(p => p.update(dt));
            this.particles = this.particles.filter(p => p.life > 0);
            
            // Keep updating floating texts
            this.floatingTexts.forEach(t => t.update(dt));
            this.floatingTexts = this.floatingTexts.filter(t => t.life > 0);

            // Camera stays on player position
            if (this.player) {
                this.updateCamera();
            }

            if (this.deathTimer >= 2.0) {
                this.triggerGameOverScreen();
            }
            return;
        }

        if (this.state === 'playing') {
            // Scale dt for all gameplay updates inside this block to achieve slow-motion beautifully!
            dt = dt * (this.timeScale || 1.0);
            if (this.player) {
                this.player.update(dt);
                this.updateCamera();
            }
            
            // Orange Item: Time Stop
            if (this.timeStopTimer && this.timeStopTimer > 0) {
                this.timeStopTimer -= dt;
                // Skip waveManager and enemy updates if time is stopped
            } else {
                if (this.waveManager) this.waveManager.update(dt);
            }

            // Update Next Stage Altar
            if (this.nextStageAltar) {
                this.nextStageAltar.update(dt);
            }

            this.drops.forEach(d => d.update(dt));
            this.drops = this.drops.filter(d => !d.markedForDeletion);

            // Update enemy projectiles (skip if time is stopped)
            if (!(this.timeStopTimer && this.timeStopTimer > 0)) {
                this.enemyProjectiles.forEach(p => p.update(dt));
                this.enemyProjectiles = this.enemyProjectiles.filter(p => !p.markedForDeletion);
            }

            this.chests.forEach(c => c.update(dt));

            this.particles.forEach(p => p.update(dt));
            this.particles = this.particles.filter(p => !p.markedForDeletion);

            this.floatingTexts.forEach(t => t.update(dt));
            this.floatingTexts = this.floatingTexts.filter(t => !t.markedForDeletion);

            this.obstacles.forEach(o => o.update(dt));
            
            this.drones.forEach(d => {
                d.update(dt);
                if (d.life !== undefined) {
                    d.life -= dt;
                    if (d.life <= 0) d.markedForDeletion = true;
                }
            });
            this.drones = this.drones.filter(d => !d.markedForDeletion);

            // HP Regeneration (Nano Repair)
            if (this.player && this.player.hpRegen && this.player.hp < this.player.maxHp) {
                this.player.hp = Math.min(this.player.maxHp, this.player.hp + this.player.hpRegen * dt);
            }

            // Shield Regeneration (Energy Barrier)
            if (this.player && this.player.maxShield && this.player.maxShield > 0) {
                // Initialize shield regen timer
                if (this.player.shieldRegenTimer === undefined) {
                    this.player.shieldRegenTimer = 0;
                }

                // Increment timer
                this.player.shieldRegenTimer += dt;

                // Regenerate shield after 5 seconds of not being hit
                if (this.player.shieldRegenTimer >= 5.0 && this.player.shield < this.player.maxShield) {
                    this.player.shield = Math.min(this.player.maxShield, this.player.shield + 10 * dt); // 10 shield/sec
                }
            }

            this.checkCollisions(dt);

            // Global Death Check (catches non-collision damage like self-destructs)
            if (this.player && this.player.hp <= 0) {
                this.gameOver();
            }


            // Update HUD
            if (this.player && this.waveManager) {
                const hpPercent = (this.player.hp / this.player.maxHp) * 100;


                // Calculate effective difficulty for display (マップボーナス廃止)
                const effectiveDifficulty = this.waveManager.difficulty;

                this.ui.updateHUD(
                    hpPercent,
                    this.ene,
                    this.player.hp,
                    this.player.maxHp,
                    this.waveManager.time,
                    effectiveDifficulty,
                    this.player.shield || 0,
                    this.player.maxShield || 0
                );

                // Update Boss HP Bar
                const boss = this.waveManager.enemies.find(e => e.isBoss);
                this.ui.updateBossHP(boss);
            }
        }
    }

    updateCamera() {
        // Center camera on player
        this.camera.x = this.player.x - this.canvas.width / 2;
        this.camera.y = this.player.y - this.canvas.height / 2;

        // Clamp camera to world bounds
        this.camera.x = Math.max(0, Math.min(this.camera.x, this.worldWidth - this.canvas.width));
        this.camera.y = Math.max(0, Math.min(this.camera.y, this.worldHeight - this.canvas.height));
    }

    checkCollisions(dt) {
        if (!this.player || !this.waveManager) return;

        // Player vs Enemies
        this.waveManager.enemies.forEach(enemy => {
            const dx = enemy.x - this.player.x;
            const dy = enemy.y - this.player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < enemy.radius + this.player.radius) {
                let dmg = enemy.damage * dt; // Scale damage by dt
                dmg = dmg * (this.player.damageMultiplier || 1.0); // Titanium Plating effect
                this.totalDamageTaken += dmg;

                // Energy Barrier: Shield absorbs damage first
                if (this.player.shield && this.player.shield > 0) {
                    const shieldAbsorb = Math.min(this.player.shield, dmg);
                    this.player.shield -= shieldAbsorb;
                    dmg -= shieldAbsorb;
                    if (shieldAbsorb > 0) {
                        this.showDamage(this.player.x, this.player.y - 20, Math.round(shieldAbsorb), '#8888ff');
                    }
                }

                // Reset shield regeneration timer on hit
                if (this.player.shieldRegenTimer !== undefined) {
                    this.player.shieldRegenTimer = 0;
                }

                // Orange Items: On Player Hit
                if (dmg > 0 && this.player.hp > 0) {
                    if (this.player.hasRevengeProtocol) {
                        const sizeScale = this.player.projectileSize || 1;
                        const radius = 150 * sizeScale;
                        const dmg = Math.round(this.player.damage * 5.0);
                        this.waveManager.enemies.forEach(e => {
                            const edx = e.x - this.player.x;
                            const edy = e.y - this.player.y;
                            const edist = Math.sqrt(edx*edx + edy*edy);
                            if (edist < radius) {
                                e.takeDamage(dmg);
                                this.showDamage(e.x, e.y, dmg.toString(), '#ff6600');
                                // Lightning effect to each enemy
                                for(let i=0; i<5; i++) {
                                    const p = new Particle(this, this.player.x + (e.x - this.player.x)*Math.random(), this.player.y + (e.y - this.player.y)*Math.random(), '#ffaa00');
                                    p.size = 4 * sizeScale;
                                    this.particles.push(p);
                                }
                            }
                        });
                        // Big Shockwave
                        for(let i=0; i<30; i++) {
                            const p = new Particle(this, this.player.x, this.player.y, '#ff6600');
                            p.size = 5 * sizeScale;
                            p.vx *= 3 * sizeScale;
                            p.vy *= 3 * sizeScale;
                            this.particles.push(p);
                        }
                    }
                    if (this.player.hasRepulsionShield) {
                        this.waveManager.enemies.forEach(e => {
                            const edx = e.x - this.player.x;
                            const edy = e.y - this.player.y;
                            const edist = Math.sqrt(edx*edx + edy*edy);
                            if (edist < 150 && edist > 0) {
                                // Apply smooth knockback velocity
                                e.knockbackX = (edx / edist) * 2000;
                                e.knockbackY = (edy / edist) * 2000;
                            }
                        });
                        // Blue Repulsion Wave
                        for(let i=0; i<30; i++) {
                            const p = new Particle(this, this.player.x, this.player.y, '#aaaaff');
                            p.size = 6;
                            p.vx *= 4;
                            p.vy *= 4;
                            this.particles.push(p);
                        }
                    }
                    if (this.player.hasHoloDecoy) {
                        this.player.decoys = this.player.decoys || [];
                        this.player.decoys.push({
                            x: this.player.x,
                            y: this.player.y,
                            lifeTime: 5.0
                        });
                        for(let i=0; i<20; i++) {
                            const p = new Particle(this, this.player.x, this.player.y, '#00ffff');
                            p.size = 4;
                            p.vx *= 0.2; // Slow fading particles
                            p.vy *= 0.2;
                            p.life = 1.0; 
                            p.decay = 0.2; // Lasts exactly 5.0s (1.0 / 0.2)
                            this.particles.push(p);
                        }
                    }
                }

                this.player.hp -= dmg;
                if (this.player.hp <= 0) {
                    this.gameOver();
                }
            }
        });

        // Player vs Obstacles
        this.obstacles.forEach(obstacle => {
            if (obstacle.collidesWith(this.player.x, this.player.y, this.player.radius)) {
                // Push player back
                const dx = this.player.x - obstacle.x;
                const dy = this.player.y - obstacle.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 0) {
                    const overlap = (obstacle.radius + this.player.radius) - dist;
                    this.player.x += (dx / dist) * overlap;
                    this.player.y += (dy / dist) * overlap;
                }
            }
        });

        // Enemies vs Obstacles
        this.waveManager.enemies.forEach(enemy => {
            this.obstacles.forEach(obstacle => {
                if (obstacle.collidesWith(enemy.x, enemy.y, enemy.radius)) {
                    // Push enemy back
                    const dx = enemy.x - obstacle.x;
                    const dy = enemy.y - obstacle.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist > 0) {
                        const overlap = (obstacle.radius + enemy.radius) - dist;
                        enemy.x += (dx / dist) * overlap;
                        enemy.y += (dy / dist) * overlap;
                    }
                }
            });
        });

        // Player Projectiles vs Obstacles
        this.player.projectiles.forEach(proj => {
            if (proj.markedForDeletion) return;
            this.obstacles.forEach(obstacle => {
                if (proj.markedForDeletion) return;
                if (obstacle.collidesWith(proj.x, proj.y, proj.radius)) {
                    proj.markedForDeletion = true;
                }
            });
        });

        // Enemy Projectiles vs Obstacles
        this.enemyProjectiles.forEach(proj => {
            if (proj.markedForDeletion) return;
            this.obstacles.forEach(obstacle => {
                if (proj.markedForDeletion) return;
                if (obstacle.collidesWith(proj.x, proj.y, proj.radius)) {
                    proj.markedForDeletion = true;
                }
            });
        });

        // Projectiles vs Enemies
        this.player.projectiles.forEach(proj => {
            this.waveManager.enemies.forEach(enemy => {
                if (proj.markedForDeletion || enemy.markedForDeletion) return;

                // For piercing projectiles, skip if already hit this enemy
                if (proj.hasHit && proj.hasHit(enemy.id || enemy)) {
                    return;
                }

                const dx = enemy.x - proj.x;
                const dy = enemy.y - proj.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < enemy.radius + proj.radius) {
                    // Orange Item: Executioner
                    let actualDamage = proj.damage;
                    if (this.player.hasExecutioner && (enemy.hp / enemy.maxHp) <= 0.2) {
                        actualDamage *= 2;
                        // Flashy Red Effect
                        for(let i=0; i<8; i++) {
                            const p = new Particle(this, enemy.x, enemy.y, '#cc0044');
                            p.size = 4;
                            this.particles.push(p);
                        }
                    }

                    // Check if damage is taken
                    if (enemy.takeDamage(actualDamage)) {
                        // Debug: Check damage before display
                        if (isNaN(actualDamage)) {
                            actualDamage = 1; // Fallback to 1
                        }
                        this.totalDamageDealt += actualDamage;

                        let damageVal = Math.round(actualDamage);
                        if (isNaN(damageVal)) damageVal = 1;

                        // Always use standard display (White, no '!')
                        const damageColor = '#fff';
                        const damageText = damageVal;

                        // Lucky Dice: Orange outline for critical hits
                        const outlineColor = proj.isCrit ? '#ff8800' : null;

                        this.showDamage(enemy.x, enemy.y, damageText, damageColor, outlineColor);
                        this.audio.playHit(); // Sound effect

                        // Spawn Particles
                        for (let i = 0; i < 5; i++) {
                            this.particles.push(new Particle(this, enemy.x, enemy.y, enemy.color));
                        }
                        
                        // Orange Item: Chain Lightning
                        if (this.player.hasChainLightning && Math.random() < 0.3 && !proj.isChainLightning) { // 30% chance, prevent infinite loops
                            let closestEnemy = null;
                            let closestDist = Infinity;
                            this.waveManager.enemies.forEach(e => {
                                if (e === enemy) return;
                                const edx = e.x - enemy.x;
                                const edy = e.y - enemy.y;
                                const edist = edx*edx + edy*edy;
                                if (edist < 40000 && edist < closestDist) { // 200px range
                                    closestDist = edist;
                                    closestEnemy = e;
                                }
                            });
                            if (closestEnemy) {
                                // Simulate chain lightning hit directly
                                closestEnemy.takeDamage(actualDamage * 0.5); // 50% damage
                                this.showDamage(closestEnemy.x, closestEnemy.y, Math.round(actualDamage * 0.5), '#ffee00');
                                
                                // Flashy Lightning Line
                                const steps = 10;
                                for (let i = 0; i <= steps; i++) {
                                    const lx = enemy.x + (closestEnemy.x - enemy.x) * (i / steps);
                                    const ly = enemy.y + (closestEnemy.y - enemy.y) * (i / steps);
                                    const p = new Particle(this, lx, ly, '#ffee00');
                                    p.size = 5;
                                    p.vx *= 0.1;
                                    p.vy *= 0.1;
                                    p.life = 0.5;
                                    this.particles.push(p);
                                }
                                for (let i = 0; i < 5; i++) {
                                    this.particles.push(new Particle(this, closestEnemy.x, closestEnemy.y, '#ffffff'));
                                }
                            }
                        }


                        // Legacy Flat Lifesteal (if still exists for compatibility)
                        if (this.player.lifeStealFlat) {
                            const healAmount = this.player.lifeStealFlat;
                            this.player.hp = Math.min(this.player.maxHp, this.player.hp + healAmount);
                            this.showDamage(this.player.x, this.player.y - 30, '+' + Math.round(healAmount), '#00ff00');
                        }

                        // Vampire Fang (Old): Percentage-based lifesteal on kill (kept for compatibility)
                        if (enemy.hp <= 0) {
                            this.processEnemyDeath(enemy, proj);
                        }

                        // For piercing projectiles, mark the enemy as hit instead of deleting the projectile
                        if (proj.markHit) {
                            proj.markHit(enemy.id || enemy);
                        } else {
                            // Normal projectile: mark for deletion
                            proj.markedForDeletion = true;
                        }
                    } else {
                        // Damage Blocked (Sound effect?)
                        this.audio.playHit(); // Maybe a different sound for block?

                        // Non-piercing projectiles still get deleted on block
                        if (!proj.markHit) {
                            proj.markedForDeletion = true;
                        }
                    }
                }
            });
        });

        // Enemy Projectiles vs Player
        this.enemyProjectiles.forEach(proj => {
            if (proj.markedForDeletion) return;
            const dx = this.player.x - proj.x;
            const dy = this.player.y - proj.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < this.player.radius + proj.radius) {
                let dmg = proj.damage * (this.player.damageMultiplier || 1.0); // Titanium Plating effect
                this.totalDamageTaken += dmg;

                // Energy Barrier: Shield absorbs damage first
                if (this.player.shield && this.player.shield > 0) {
                    const shieldAbsorb = Math.min(this.player.shield, dmg);
                    this.player.shield -= shieldAbsorb;
                    dmg -= shieldAbsorb;
                    if (shieldAbsorb > 0) {
                        this.showDamage(this.player.x, this.player.y - 20, Math.round(shieldAbsorb), '#8888ff');
                    }
                }

                // Reset shield regeneration timer on hit
                if (this.player.shieldRegenTimer !== undefined) {
                    this.player.shieldRegenTimer = 0;
                }

                this.player.hp -= dmg;
                this.showDamage(this.player.x, this.player.y, Math.round(dmg), '#ff0000');
                proj.markedForDeletion = true;
                if (this.player.hp <= 0) {
                    this.gameOver();
                }
            }
        });
    }

    showDamage(x, y, amount, color, outlineColor = null) {
        this.floatingTexts.push(new FloatingText(x, y, amount, color, outlineColor));
    }

    openChest(chest) {
        console.log("Chest Opened!");
        this.currentChest = chest; // Track this chest
        
        // Enforce the 5 attack method limit dynamically while keeping pre-rolled choices fixed!
        const ATTACK_RELIC_IDS = [
            'pierce_shot',      // Plasma Orb
            'multishot',        // Splitter Module
            'drone',            // Support Drone
            'missile',          // Missile Pod
            'satellite_beam',
            'singularity',
            'cyber_mine',
            'railgun',
            'boomerang_blade',
            'cyber_fangs'
        ];

        const ownedAttacks = new Set();
        ownedAttacks.add('base');
        if (this.acquiredRelics) {
            this.acquiredRelics.forEach(r => {
                if (ATTACK_RELIC_IDS.includes(r.id)) {
                    ownedAttacks.add(r.id);
                }
            });
        }

        // If player already has 5 or more attack types, replace any forbidden new yellow attacks in the chest
        if (ownedAttacks.size >= 5) {
            chest.contents = chest.contents.map(relic => {
                if (ATTACK_RELIC_IDS.includes(relic.id) && !ownedAttacks.has(relic.id)) {
                    // Find a random allowed replacement relic (MUST be an owned yellow attack to maintain category integrity)
                    const allowedRelics = this.ui.relics.filter(r => {
                        if (r.category === 'none' || r.disabled) return false;
                        if (ATTACK_RELIC_IDS.includes(r.id)) {
                            return ownedAttacks.has(r.id);
                        }
                        return false; // Do not allow other categories (Red, Blue, Green) to leak into Yellow weapon replacements!
                    });
                    if (allowedRelics.length > 0) {
                        return { ...allowedRelics[Math.floor(Math.random() * allowedRelics.length)] };
                    }
                }
                return relic;
            });
        }
        
        this.audio.playLevelUp(); // Sound effect
        this.setState('reward');
        this.ui.showRewardSelection(chest.contents, chest.difficulty);
    }

    closeRewardWithoutPurchase() {
        // Re-activate the chest but require player to step away
        if (this.currentChest) {
            const chest = this.currentChest;
            chest.active = true;
            chest.requiresExit = true;
        }
        this.currentChest = null;
        this.setState('playing');
    }

    applyRelic(relic) {
        console.log(`Applied Relic: ${relic.name}`);

        // Deduct Ene
        this.ene -= relic.cost;

        // Apply effect
        relic.effect(this.player);
        this.acquiredRelics.push(relic);

        // Update acquired items HUD
        this.ui.updateAcquiredItems(this.acquiredRelics);

        // Clear current chest (purchase was made)
        this.currentChest = null;

        this.setState('playing');
    }
    
    processEnemyDeath(enemy, proj = null) {
        if (enemy.markedForDeletion) return;
        enemy.markedForDeletion = true;

        if (this.player.lifeSteal) {
            const healAmount = (proj ? proj.damage : this.player.damage) * this.player.lifeSteal;
            this.player.hp = Math.min(this.player.maxHp, this.player.hp + healAmount);
            this.showDamage(this.player.x, this.player.y - 30, '+' + Math.round(healAmount), '#00ff00');
        }

        // Drop Scaling: Value based on Max HP (1.2倍に増加)
        const dropValue = Math.max(1, Math.floor(enemy.maxHp / 10 * 1.2));
        this.drops.push(new Drop(this, enemy.x, enemy.y, 'energy', dropValue));
        
        // Orange Item: Midas Touch
        if (this.player.hasMidasTouch && Math.random() < 0.05) {
            this.drops.push(new Drop(this, enemy.x + 10, enemy.y + 10, 'energy', dropValue * 5));
            // Flashy Gold Particles
            for(let i=0; i<15; i++) {
                const p = new Particle(this, enemy.x, enemy.y, '#ffd700');
                p.size = 6;
                p.vx *= 1.5;
                p.vy *= 1.5;
                this.particles.push(p);
            }
        }

        // HP Potion drop (0.5% chance)
        if (Math.random() < 0.005) {
            this.drops.push(new Drop(this, enemy.x + (Math.random()-0.5)*20, enemy.y + (Math.random()-0.5)*20, 'potion', 50));
        }
        
        // Orange Items: On Enemy Kill
        if (this.player.hasVolatileCore) {
            const sizeScale = this.player.projectileSize || 1;
            const radius = 100 * sizeScale;
            const dmg = Math.round(this.player.damage * 3.0);
            this.waveManager.enemies.forEach(e => {
                if (e === enemy || e.markedForDeletion) return;
                const edx = e.x - enemy.x;
                const edy = e.y - enemy.y;
                if (edx*edx + edy*edy < radius * radius) {
                    e.takeDamage(dmg);
                    this.showDamage(e.x, e.y, dmg.toString(), '#ff5500');
                    if (e.hp <= 0) this.processEnemyDeath(e);
                }
            });
            // Huge Explosion Effect
            for(let i=0; i<40; i++) {
                const colors = ['#ff5500', '#ff0000', '#ffff00', '#ffffff'];
                const color = colors[Math.floor(Math.random() * colors.length)];
                const p = new Particle(this, enemy.x, enemy.y, color);
                p.size = (Math.random() * 5 + 3) * sizeScale;
                p.vx *= 2.5 * sizeScale;
                p.vy *= 2.5 * sizeScale;
                this.particles.push(p);
            }
        }
        
        if (this.player.hasSoulSeekers) {
            // Find enemy closest to the DYING enemy (instead of player)
            let target = null;
            let minDist = Infinity;
            this.waveManager.enemies.forEach(e => {
                if (e === enemy || e.markedForDeletion) return;
                const dx = e.x - enemy.x;
                const dy = e.y - enemy.y;
                const dist = dx * dx + dy * dy;
                if (dist < minDist) {
                    minDist = dist;
                    target = e;
                }
            });

            if (target) {
                this.player.projectiles.push(new Missile(this, enemy.x, enemy.y, target));
                this.player.projectiles.push(new Missile(this, enemy.x, enemy.y, target));
            } else {
                // If no target, create missiles that just fly up or random direction
                this.player.projectiles.push(new Missile(this, enemy.x, enemy.y, { x: enemy.x, y: enemy.y - 100 }));
                this.player.projectiles.push(new Missile(this, enemy.x, enemy.y, { x: enemy.x, y: enemy.y + 100 }));
            }
            // Flashy Missile Spawn Particles
            for(let i=0; i<20; i++) {
                const p = new Particle(this, enemy.x, enemy.y, '#ff8800');
                p.size = 3;
                this.particles.push(p);
            }
        }

        // Track Kill
        if (!this.killCount[enemy.type]) this.killCount[enemy.type] = 0;
        this.killCount[enemy.type]++;
    }

    addOrbitalBlades() {
        if (!this.player) return;
        this.player.orbitalBlades = [];
        for (let i = 0; i < 6; i++) {
            this.player.orbitalBlades.push({ angle: (Math.PI * 2 / 6) * i });
        }
    }

    draw() {
        if (this.state === 'skilltree') {
            if (this.skillTreeUI) this.skillTreeUI.draw();
            return;
        }

        // Clear screen
        this.ctx.fillStyle = '#101018';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.state === 'playing' || this.state === 'reward' || this.state === 'dying') {
            this.ctx.save();
            
            // Apply Screen Shake if active
            let shakeX = 0;
            let shakeY = 0;
            if (this.screenShakeDuration > 0) {
                shakeX = (Math.random() - 0.5) * this.screenShakeIntensity;
                shakeY = (Math.random() - 0.5) * this.screenShakeIntensity;
            }
            this.ctx.translate(-this.camera.x + shakeX, -this.camera.y + shakeY);

            this.drawBackground();
            this.drawGrid();

            this.ctx.lineWidth = 5;
            this.ctx.strokeRect(0, 0, this.worldWidth, this.worldHeight);

            // Draw Entities
            this.obstacles.forEach(o => o.draw(this.ctx));
            this.chests.forEach(c => c.draw(this.ctx));
            this.drops.forEach(d => d.draw(this.ctx));

            // Draw player only if NOT in dying state (to look like they exploded completely!)
            if (this.player && this.state !== 'dying') this.player.draw(this.ctx);
            if (this.waveManager) this.waveManager.draw(this.ctx);

            if (this.nextStageAltar) this.nextStageAltar.draw(this.ctx);


            this.drones.forEach(d => d.draw(this.ctx));
            this.enemyProjectiles.forEach(p => p.draw(this.ctx));
            this.particles.forEach(p => p.draw(this.ctx));
            this.floatingTexts.forEach(t => t.draw(this.ctx));

            this.ctx.restore();
            
            // Orange Item: Time Stop Effect (Screen space)
            if (this.timeStopTimer && this.timeStopTimer > 0) {
                this.ctx.save();
                this.ctx.globalCompositeOperation = 'screen'; // Use screen or lighter for cool effect
                this.ctx.fillStyle = 'rgba(170, 0, 255, 0.2)'; // Semi-transparent purple
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
                this.ctx.restore();
            }

            // Show minimap only during active gameplay
            if (this.state === 'playing') {
                this.minimap.draw();

                // Directional Altar Guide (Boss Altar)
                if (this.waveManager.bossAltar && this.waveManager.bossAltar.active) {
                    this.drawDirectionalArrow(this.waveManager.bossAltar.x, this.waveManager.bossAltar.y, '#ff00ff', 'BOSS');
                }
                // Directional Altar Guide (Next Stage Altar)
                if (this.nextStageAltar) {
                    this.drawDirectionalArrow(this.nextStageAltar.x, this.nextStageAltar.y, '#00ffff', 'EXIT');
                }
            }

            // Dying Fade to Black Effect (Screen space overlay)
            if (this.state === 'dying') {
                const alpha = Math.min(1.0, this.deathTimer / 2.0); // Fades completely over 2.0s
                this.ctx.save();
                this.ctx.fillStyle = `rgba(16, 16, 24, ${alpha})`; // Blends beautifully to match the canvas clear color
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
                this.ctx.restore();
            }
        } else {
            this.drawGrid(); // Static grid for menus
        }
    }

    drawDirectionalArrow(tx, ty, color, label = "") {
        const dx = tx - (this.camera.x + this.canvas.width / 2);
        const dy = ty - (this.camera.y + this.canvas.height / 2);
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Only draw if sufficiently far (approximately off-screen)
        const margin = 60;
        if (dist < Math.min(this.canvas.width, this.canvas.height) * 0.4) return;

        const angle = Math.atan2(dy, dx);
        const arrowX = Math.cos(angle) * (this.canvas.width / 2 - margin) + this.canvas.width / 2;
        const arrowY = Math.sin(angle) * (this.canvas.height / 2 - margin) + this.canvas.height / 2;

        this.ctx.save();
        this.ctx.translate(arrowX, arrowY);
        this.ctx.rotate(angle);

        // Draw Glow
        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = color;
        this.ctx.fillStyle = color;

        // Arrow Head
        this.ctx.beginPath();
        this.ctx.moveTo(15, 0);
        this.ctx.lineTo(-10, -10);
        this.ctx.lineTo(-10, 10);
        this.ctx.closePath();
        this.ctx.fill();

        // Label
        if (label) {
            this.ctx.rotate(-angle); // Keep text horizontal
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 12px Rajdhani';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(label, 0, 25);
        }

        this.ctx.restore();
    }

    drawBackground() {
        // Map-specific background
        const mapLevel = this.mapLevel || 1;
        const time = this.waveManager ? this.waveManager.time : 0;

        if (mapLevel === 1) {
            // Stage 1: Green Forest
            const gradient = this.ctx.createRadialGradient(
                this.worldWidth / 2, this.worldHeight / 2, 0,
                this.worldWidth / 2, this.worldHeight / 2, this.worldWidth
            );
            gradient.addColorStop(0, '#0a2a1a');
            gradient.addColorStop(1, '#051510');
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(0, 0, this.worldWidth, this.worldHeight);

            // Sparkles
            this.ctx.fillStyle = 'rgba(0, 255, 136, 0.3)';
            for (let i = 0; i < 50; i++) {
                const x = (i * 317 + time * 10) % this.worldWidth;
                const y = (i * 213 + time * 5) % this.worldHeight;
                this.ctx.fillRect(x, y, 2, 2);
            }
        } else if (mapLevel === 2) {
            // Stage 2: Lava Zone
            const gradient = this.ctx.createRadialGradient(
                this.worldWidth / 2, this.worldHeight / 2, 0,
                this.worldWidth / 2, this.worldHeight / 2, this.worldWidth
            );
            gradient.addColorStop(0, '#2a1a0a');
            gradient.addColorStop(1, '#150a05');
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(0, 0, this.worldWidth, this.worldHeight);

            // Rocky textures
            this.ctx.fillStyle = 'rgba(255, 136, 68, 0.2)';
            for (let i = 0; i < 20; i++) {
                const x = (i * 457) % this.worldWidth;
                const y = (i * 283) % this.worldHeight;
                this.ctx.fillRect(x, y, 50, 30);
            }
        } else if (mapLevel === 3) {
            // Stage 3: Void Realm
            const gradient = this.ctx.createRadialGradient(
                this.worldWidth / 2, this.worldHeight / 2, 0,
                this.worldWidth / 2, this.worldHeight / 2, this.worldWidth
            );
            gradient.addColorStop(0, '#1a0a2a');
            gradient.addColorStop(1, '#0a0515');
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(0, 0, this.worldWidth, this.worldHeight);

            // Glitch stripes
            this.ctx.fillStyle = 'rgba(255, 0, 255, 0.1)';
            for (let i = 0; i < 10; i++) {
                const y = (i * 137 + time * 50) % this.worldHeight;
                const h = 10 + Math.sin(time + i) * 5;
                this.ctx.fillRect(0, y, this.worldWidth, h);
            }
        } else if (mapLevel === 4) {
            // Stage 4: Ice Cave
            const gradient = this.ctx.createRadialGradient(
                this.worldWidth / 2, this.worldHeight / 2, 0,
                this.worldWidth / 2, this.worldHeight / 2, this.worldWidth
            );
            gradient.addColorStop(0, '#0a1a2a');
            gradient.addColorStop(1, '#050a15');
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(0, 0, this.worldWidth, this.worldHeight);

            // Ice crystals
            this.ctx.fillStyle = 'rgba(136, 255, 255, 0.2)';
            for (let i = 0; i < 30; i++) {
                const x = (i * 241 + time * 3) % this.worldWidth;
                const y = (i * 191 - time * 2) % this.worldHeight;
                const size = 3 + Math.sin(time + i) * 2;
                this.ctx.beginPath();
                this.ctx.moveTo(x, y - size);
                this.ctx.lineTo(x + size, y + size);
                this.ctx.lineTo(x - size, y + size);
                this.ctx.fill();
            }
        } else if (mapLevel === 5) {
            // Stage 5: Desert Ruins
            const gradient = this.ctx.createRadialGradient(
                this.worldWidth / 2, this.worldHeight / 2, 0,
                this.worldWidth / 2, this.worldHeight / 2, this.worldWidth
            );
            gradient.addColorStop(0, '#2a2a0a');
            gradient.addColorStop(1, '#151005');
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(0, 0, this.worldWidth, this.worldHeight);

            // Sand particles
            this.ctx.fillStyle = 'rgba(255, 255, 136, 0.15)';
            for (let i = 0; i < 40; i++) {
                const x = (i * 373 + time * 30) % this.worldWidth;
                const y = (i * 251 + Math.sin(time * 0.5 + i) * 100) % this.worldHeight;
                this.ctx.fillRect(x, y, 1, 1);
            }
        } else if (mapLevel === 6) {
            // Stage 6: Deep Ocean
            const gradient = this.ctx.createRadialGradient(
                this.worldWidth / 2, this.worldHeight / 2, 0,
                this.worldWidth / 2, this.worldHeight / 2, this.worldWidth
            );
            gradient.addColorStop(0, '#0a151a');
            gradient.addColorStop(1, '#020508');
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(0, 0, this.worldWidth, this.worldHeight);

            // Bubbles
            this.ctx.fillStyle = 'rgba(136, 255, 255, 0.2)';
            for (let i = 0; i < 25; i++) {
                const x = (i * 311) % this.worldWidth;
                const y = (this.worldHeight - (i * 197 + time * 40) % (this.worldHeight + 200));
                const r = 2 + (i % 3);
                this.ctx.beginPath();
                this.ctx.arc(x, y, r, 0, Math.PI * 2);
                this.ctx.fill();
            }
        } else if (mapLevel === 7) {
            // Stage 7: Volcanic Core
            const gradient = this.ctx.createRadialGradient(
                this.worldWidth / 2, this.worldHeight / 2, 0,
                this.worldWidth / 2, this.worldHeight / 2, this.worldWidth
            );
            gradient.addColorStop(0, '#3a1a0a');
            gradient.addColorStop(1, '#1a0a05');
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(0, 0, this.worldWidth, this.worldHeight);

            // Lava flows
            this.ctx.fillStyle = 'rgba(255, 100, 0, 0.2)';
            for (let i = 0; i < 15; i++) {
                const y = (i * 133 + time * 20) % this.worldHeight;
                const w = 80 + Math.sin(time + i) * 40;
                this.ctx.fillRect(0, y, w, 15);
                this.ctx.fillRect(this.worldWidth - w, y, w, 15);
            }
        } else if (mapLevel === 8) {
            // Stage 8: Storm Plains
            const gradient = this.ctx.createRadialGradient(
                this.worldWidth / 2, this.worldHeight / 2, 0,
                this.worldWidth / 2, this.worldHeight / 2, this.worldWidth
            );
            gradient.addColorStop(0, '#1a1a2a');
            gradient.addColorStop(1, '#0a0a15');
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(0, 0, this.worldWidth, this.worldHeight);

            // Lightning
            if (Math.floor(time * 3) % 5 === 0) {
                this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
                this.ctx.lineWidth = 3;
                for (let i = 0; i < 3; i++) {
                    const x = (i * 700) % this.worldWidth;
                    this.ctx.beginPath();
                    this.ctx.moveTo(x, 0);
                    this.ctx.lineTo(x + 50, 300);
                    this.ctx.lineTo(x, 600);
                    this.ctx.lineTo(x + 30, 1000);
                    this.ctx.lineTo(x, this.worldHeight);
                    this.ctx.stroke();
                }
            }
        } else if (mapLevel === 9) {
            // Stage 9: Neon City
            const gradient = this.ctx.createRadialGradient(
                this.worldWidth / 2, this.worldHeight / 2, 0,
                this.worldWidth / 2, this.worldHeight / 2, this.worldWidth
            );
            gradient.addColorStop(0, '#1a0a1a');
            gradient.addColorStop(1, '#0a050a');
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(0, 0, this.worldWidth, this.worldHeight);

            // Neon grid
            this.ctx.strokeStyle = 'rgba(255, 0, 255, 0.1)';
            this.ctx.lineWidth = 1;
            const gridSize = 50;
            for (let x = 0; x < this.worldWidth; x += gridSize) {
                this.ctx.beginPath();
                this.ctx.moveTo(x, 0);
                this.ctx.lineTo(x, this.worldHeight);
                this.ctx.stroke();
            }
            for (let y = 0; y < this.worldHeight; y += gridSize) {
                this.ctx.beginPath();
                this.ctx.moveTo(0, y);
                this.ctx.lineTo(this.worldWidth, y);
                this.ctx.stroke();
            }

            // Scanlines
            this.ctx.fillStyle = 'rgba(0, 255, 255, 0.05)';
            for (let i = 0; i < 20; i++) {
                const y = (i * 100 + time * 80) % this.worldHeight;
                this.ctx.fillRect(0, y, this.worldWidth, 2);
            }
        } else {
            // Stage 10: Chaos Dimension
            const gradient = this.ctx.createRadialGradient(
                this.worldWidth / 2, this.worldHeight / 2, 0,
                this.worldWidth / 2, this.worldHeight / 2, this.worldWidth
            );
            const hue1 = (time * 50) % 360;
            const hue2 = (time * 50 + 180) % 360;
            gradient.addColorStop(0, `hsl(${hue1}, 50%, 15%)`);
            gradient.addColorStop(1, `hsl(${hue2}, 50%, 5%)`);
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(0, 0, this.worldWidth, this.worldHeight);

            // Random shapes
            for (let i = 0; i < 20; i++) {
                const hue = (time * 100 + i * 36) % 360;
                this.ctx.fillStyle = `hsla(${hue}, 100%, 50%, 0.1)`;
                const x = (i * 317 + time * 50) % this.worldWidth;
                const y = (i * 241 + time * 30) % this.worldHeight;
                const size = 20 + Math.sin(time + i) * 15;
                if (i % 3 === 0) {
                    this.ctx.fillRect(x, y, size, size);
                } else {
                    this.ctx.beginPath();
                    this.ctx.arc(x, y, size / 2, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            }
        }
    }

    drawGrid() {
        this.ctx.strokeStyle = 'rgba(0, 255, 255, 0.1)';
        this.ctx.lineWidth = 1;
        const gridSize = 100;

        // Draw grid based on world coordinates
        const startX = Math.floor(this.camera.x / gridSize) * gridSize;
        const startY = Math.floor(this.camera.y / gridSize) * gridSize;
        const endX = startX + this.canvas.width + gridSize;
        const endY = startY + this.canvas.height + gridSize;

        for (let x = startX; x < endX; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, this.camera.y);
            this.ctx.lineTo(x, this.camera.y + this.canvas.height);
            this.ctx.stroke();
        }

        for (let y = startY; y < endY; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(this.camera.x, y);
            this.ctx.lineTo(this.camera.x + this.canvas.width, y);
            this.ctx.stroke();
        }
    }

    addDrone() {
        if (!this.player) return;
        const drone = new Drone(this, this.player);
        // Offset angle for multiple drones
        drone.angle = (Math.PI * 2 / (this.drones.length + 1)) * this.drones.length;
        this.drones.push(drone);
        console.log("Drone added!");
    }

    nextMap() {
        // Increment total stages cleared (used for difficulty calculation)
        this.totalStagesCleared++;

        // Loop back to stage 1 after stage 10
        if (this.mapLevel >= 10) {
            this.mapLevel = 1;
            this.loopCount++; // ループ回数を増やす
            console.log(`Loop ${this.loopCount} started!`);
        } else {
            this.mapLevel++;
        }
        this.startRun(true); // Preserve stats
        this.setState('playing');
    }

    bossDefeated() {
        console.log("BOSS DEFEATED!");

        // 1. Screen Shake (15px intensity for 1.2s)
        this.screenShakeIntensity = 15;
        this.screenShakeDuration = 1.2;

        // 2. Slow Motion (Time Scale 0.15 for 2.0s of real time)
        this.timeScale = 0.15;
        this.sloMoTimer = 2.0;

        // 3. Audio Explosion + Level Up Sound
        if (this.audio) {
            this.audio.playLevelUp();
            this.audio._playOneShot('sawtooth', 400, 0.6, 1.5, 0.01, 30);
            this.audio._playOneShot('triangle', 200, 0.6, 1.5, 0.01, 10);
            this.audio._playOneShot('sine', 1000, 0.3, 0.8, 0.01, 200); // Dramatic synth slide
        }

        // Stop Spawning
        this.waveManager.stopSpawning();

        // 4. Find boss position and spawn MEGA particles explosion!
        const boss = this.waveManager.enemies.find(e => e.isBoss) || { x: this.player.x, y: this.player.y - 150 };
        const bx = boss.x;
        const by = boss.y;

        const bossColors = ['#ff00ff', '#ff5500', '#ffff00', '#00ffff', '#ffffff'];
        for (let i = 0; i < 200; i++) {
            const color = bossColors[Math.floor(Math.random() * bossColors.length)];
            const p = new Particle(this, bx, by, color);
            const angle = Math.random() * Math.PI * 2;
            const speed = 200 + Math.random() * 800;
            p.vx = Math.cos(angle) * speed;
            p.vy = Math.sin(angle) * speed;
            p.size = Math.random() * 8 + 4; // Big chunks of boss debris!
            p.life = 0.8 + Math.random() * 1.8;
            p.maxLife = p.life;
            this.particles.push(p);
        }

        // Spawn Next Stage Altar at the location where the boss altar was
        const pos = this.waveManager.bossAltarPos;
        // Fallback if pos is missing (shouldn't happen if waveManager is correct)
        const tx = pos ? pos.x : this.player.x;
        const ty = pos ? pos.y : this.player.y - 100;

        this.nextStageAltar = new NextStageAltar(this, tx, ty);

        // Show message
        this.ui.showMessage("BOSS DEFEATED! GO TO THE ALTAR!", 5000);
    }


    getStageReward(stageNum) {
        // Base Stage Reward: Stage 1: 100, Stage 2: 150, Stage 3: 200, ...
        const base = 100 + (stageNum - 1) * 50;

        // Difficulty Bonus Multiplier
        let diffMultiplier = 1.0;
        if (this.selectedDifficulty === 'hard') diffMultiplier = 1.5;
        else if (this.selectedDifficulty === 'veryhard') diffMultiplier = 2.0;

        // Skill Tree (Lucky Coin) Bonus
        let skillBonus = 1.0;
        if (this.player && this.player.moneyBonus) {
            skillBonus = this.player.moneyBonus;
        }

        return Math.floor(base * diffMultiplier * skillBonus);
    }

    nextStage() {
        // Deprecated - 互換性のために残す
        this.showStageResult();
    }

    showStageResult() {
        // 台座に触れた時に呼ばれる - 結果画面のみ表示
        this.setState('result');

        // ステージクリア報酬を表示（まだ保存しない）
        const stageReward = this.getStageReward(this.mapLevel);
        document.getElementById('result-ene').innerText = this.ene;
        document.getElementById('result-money').innerText = stageReward;
        document.getElementById('result-run-money').innerText = this.runMoney + stageReward;
        document.getElementById('result-dmg-dealt').innerText = Math.round(this.totalDamageDealt || 0);
        document.getElementById('result-dmg-taken').innerText = Math.round(this.totalDamageTaken || 0);

        // ボタンテキストを設定
        const btnLoop = document.getElementById('btn-loop');
        const btnReturnHome = document.getElementById('btn-return-home');

        if (this.mapLevel >= 10) {
            btnLoop.innerText = "NEXT STAGE (Loop to Stage 1)";
            btnReturnHome.style.display = 'inline-block';  // ステージ10のみ表示
        } else {
            btnLoop.innerText = `NEXT STAGE (Stage ${this.mapLevel + 1})`;
            btnReturnHome.style.display = 'none';  // 非表示
        }
    }

    cancelStageTransition() {
        // CANCELボタン押下時 - ゲームプレイに戻る
        this.setState('playing');
        // 台座はそのまま残る
    }

    proceedToNextStage() {
        // NEXT STAGEボタン押下時 - 次のマップへ
        // 台座を削除
        this.nextStageAltar = null;

        // ステージクリア報酬を蓄積
        this.runMoney += this.getStageReward(this.mapLevel);

        // Reset Ene (Do not carry over to next stage)
        this.ene = 0;

        // 次のマップへ（お金はまだ保存しない）
        this.nextMap();
    }

    returnToHomeAfterVictory() {
        // ステージ10クリア後、RETURN HOMEボタン押下時
        // 台座を削除
        this.nextStageAltar = null;

        // ステージクリア報酬を蓄積
        this.runMoney += this.getStageReward(this.mapLevel);

        // ランの合計お金を保存
        this.money += this.runMoney;
        this.upgradeSystem.save();

        // 勝利画面を表示
        this.setState('victory');
        document.getElementById('victory-ene').innerText = this.totalEneCollected;
        document.getElementById('victory-money').innerText = this.runMoney;
        const vicRunMoney = document.getElementById('victory-run-money');
        if (vicRunMoney) vicRunMoney.innerText = this.runMoney;
        document.getElementById('victory-dmg-dealt').innerText = Math.round(this.totalDamageDealt || 0);
        document.getElementById('victory-dmg-taken').innerText = Math.round(this.totalDamageTaken || 0);

        // Update Difficulty Display
        const diffText = this.selectedDifficulty.toUpperCase();
        const vicDiffEl = document.getElementById('victory-difficulty');
        if (vicDiffEl) vicDiffEl.innerText = diffText;

        const victoryLevel = document.getElementById('victory-level');
        if (victoryLevel) {
            if (this.loopCount > 0) {
                victoryLevel.innerText = `Loop ${this.loopCount} Complete`;
            } else {
                victoryLevel.innerText = '10 / 10';
            }
        }

        // Draw Player Character
        const charCanvas = document.getElementById('victory-character');
        if (charCanvas) {
            const ctx = charCanvas.getContext('2d');
            this.ui.drawPlayerCharacter(ctx, this.selectedCharacter, 25, 25);
        }

        // 敵の表示
        const enemyContainer = document.getElementById('victory-enemies');
        enemyContainer.innerHTML = '';

        const enemyTypes = {
            'slime': { color: '#00ff88', name: 'Slime' },
            'lizard': { color: '#aa00ff', name: 'Lizard' },
            'golem': { color: '#ff4444', name: 'Golem' },
            'totem': { color: '#ff00ff', name: 'Totem' },
            'kamikaze': { color: '#ffaa00', name: 'Kamikaze' },
            'missile_enemy': { color: '#ff0088', name: 'Missile Bot' },
            'beam_enemy': { color: '#0088ff', name: 'Beam Bot' },
            // Bosses
            'overlord': { color: '#ff00ff', name: 'Overlord', isBoss: true },
            'slime_king': { color: '#00ff88', name: 'Slime King', isBoss: true },
            'mecha_golem': { color: '#ff4444', name: 'Mecha Golem', isBoss: true },
            'void_phantom': { color: '#8800ff', name: 'Void Phantom', isBoss: true },
            'crimson_dragon': { color: '#ff0000', name: 'Crimson Dragon', isBoss: true }
        };

        for (const [type, count] of Object.entries(this.killCount)) {
            if (count <= 0) continue;
            const data = enemyTypes[type] || { color: '#fff', name: 'Unknown' };

            const wrapper = document.createElement('div');
            wrapper.className = 'result-item-wrapper';
            wrapper.style.position = 'relative';
            wrapper.style.display = 'inline-block';
            wrapper.style.margin = '5px';

            const canvas = document.createElement('canvas');
            canvas.width = 40;
            canvas.height = 40;
            canvas.className = 'result-item-icon';
            const ctx = canvas.getContext('2d');

            if (data.isBoss) {
                this.ui.drawBossIcon(ctx, type, data.color);
            } else {
                this.ui.drawEnemyIcon(ctx, type, data.color);
            }

            wrapper.appendChild(canvas);

            const badge = document.createElement('div');
            badge.innerText = `${count}`;
            badge.className = 'result-count-badge';

            wrapper.appendChild(badge);
            enemyContainer.appendChild(wrapper);
        }

        // アイテムの表示
        const itemContainer = document.getElementById('victory-items');
        itemContainer.innerHTML = '';

        const itemCounts = {};
        this.acquiredRelics.forEach(r => {
            if (!itemCounts[r.id]) itemCounts[r.id] = { count: 0, data: r };
            itemCounts[r.id].count++;
        });

        for (const [id, info] of Object.entries(itemCounts)) {
            const wrapper = document.createElement('div');
            wrapper.className = 'result-item-wrapper';
            wrapper.style.position = 'relative';
            wrapper.style.display = 'inline-block';
            wrapper.style.margin = '5px';

            const canvas = document.createElement('canvas');
            canvas.width = 40;
            canvas.height = 40;
            canvas.className = 'result-item-icon';
            const ctx = canvas.getContext('2d');
            this.ui.drawRelicIcon(ctx, id, 40, 40, info.data.color);

            wrapper.appendChild(canvas);

            const badge = document.createElement('div');
            badge.innerText = `${info.count}`;
            badge.className = 'result-count-badge';

            wrapper.appendChild(badge);
            itemContainer.appendChild(wrapper);
        }
    }

    completeStage() {
        // Deprecated - 互換性のために残す
        this.showStageResult();
    }

    gameOver() {
        // Phoenix Heart: Check for revive before game over
        const phoenixHeartIndex = this.acquiredRelics.findIndex(r => r.id === 'phoenix_heart');

        if (phoenixHeartIndex !== -1) {
            console.log("🔥 Phoenix Heart activated! Reviving player...");

            // Remove Phoenix Heart from acquired relics
            this.acquiredRelics.splice(phoenixHeartIndex, 1);

            // Add used Phoenix Heart
            const usedPhoenixHeart = this.ui.relics.find(r => r.id === 'phoenix_heart_used');
            if (usedPhoenixHeart) {
                this.acquiredRelics.push(usedPhoenixHeart);
            }

            // Update HUD to reflect the change
            this.ui.updateAcquiredItems(this.acquiredRelics);

            // Reset NextStageAltar flags to prevent automatic activation
            if (this.nextStageAltar) {
                this.nextStageAltar.wasPlayerNear = true; // Mark as "already near" to prevent trigger
            }

            // Revive with 50% HP
            this.player.hp = this.player.maxHp * 0.5;

            // Visual feedback
            this.ui.showMessage("💛 PHOENIX HEART ACTIVATED! 💛", 3000);
            this.audio.playLevelUp(); // Revival sound

            // Spawn particles for effect
            for (let i = 0; i < 20; i++) {
                this.particles.push(new Particle(this, this.player.x, this.player.y, '#ffaa00'));
            }

            return; // Don't actually game over
        }

        // --- NEW DEATH PERFORMANCE STATE ---
        if (this.state !== 'dying') {
            this.state = 'dying';
            this.deathTimer = 0;

            // Dramatic exploding sawtooth & triangle SFX
            if (this.audio) {
                this.audio._playOneShot('sawtooth', 300, 0.4, 1.2, 0.01, 40);
                this.audio._playOneShot('triangle', 150, 0.4, 1.2, 0.01, 20);
            }

            // Cyber exploding particles
            const particleColors = ['#ff00ff', '#00ffff', '#ffff00', '#ffffff'];
            for (let i = 0; i < 150; i++) {
                const color = particleColors[Math.floor(Math.random() * particleColors.length)];
                const p = new Particle(this, this.player.x, this.player.y, color);
                const angle = Math.random() * Math.PI * 2;
                const speed = 150 + Math.random() * 600;
                p.vx = Math.cos(angle) * speed;
                p.vy = Math.sin(angle) * speed;
                p.life = 0.5 + Math.random() * 1.5;
                p.maxLife = p.life;
                p.size = Math.random() * 5 + 3;
                this.particles.push(p);
            }
        }
    }

    triggerGameOverScreen() {
        // ステージクリア失敗時の報酬を計算
        const stageReward = this.getStageReward(this.mapLevel);
        const failRate = (this.mapLevel === 1) ? 0.1 : 0.5;
        const failReward = Math.floor(stageReward * failRate);
        this.runMoney += failReward;

        // ランの合計お金を保存
        this.money += this.runMoney;
        this.upgradeSystem.save();

        this.setState('gameover');
        this.ui.updateGameOverStats(this.totalEneCollected, this.killCount, this.acquiredRelics, this.mapLevel, this.loopCount, this.runMoney);
        const elDealt = document.getElementById('go-dmg-dealt');
        if (elDealt) elDealt.innerText = Math.round(this.totalDamageDealt || 0);
        const elTaken = document.getElementById('go-dmg-taken');
        if (elTaken) elTaken.innerText = Math.round(this.totalDamageTaken || 0);
        // Reset map level on game over
        this.mapLevel = 1;
    }

    // === Debug Helpers ===
    giveItem(itemId) {
        if (!this.player) {
            console.error('❌ Game not started! Start a mission first.');
            return;
        }

        const relic = this.ui.relics.find(r => r.id === itemId);
        if (!relic) {
            console.error(`❌ Item not found: ${itemId}`);
            console.log('Available items:', this.ui.relics.map(r => r.id).join(', '));
            return;
        }

        // Apply effect without cost
        relic.effect(this.player);
        this.acquiredRelics.push(relic);
        this.ui.updateAcquiredItems(this.acquiredRelics);

        console.log(`✅ Obtained: ${relic.name} (${relic.desc})`);
    }

    listItems() {
        console.log('=== Available Items ===');
        this.ui.relics.forEach(r => {
            const rarityColor = {
                'common': '⬜',
                'rare': '🔵',
                'epic': '🟣',
                'legendary': '🟠'
            }[r.rarity];
            console.log(`${rarityColor} ${r.id.padEnd(20)} - ${r.name} (${r.desc})`);
        });
        console.log('\nUsage: game.giveItem("item_id")');
    }
}
