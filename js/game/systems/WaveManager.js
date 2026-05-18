import { Slime, Golem, Lizard, Totem, KamikazeEnemy, MissileEnemy, BeamEnemy } from '../entities/Enemy.js';
import { BossAltar } from '../entities/BossAltar.js';
import { Chest } from '../entities/Chest.js';
import { Overlord, SlimeKing, MechaGolem, VoidPhantom, CrimsonDragon, StormWeaver, IronBehemoth, PrismMirror, ToxicHorror, AuraKnight, CelestialEye } from '../entities/Boss.js';

export class WaveManager {
    constructor(game, initialDifficulty = 1.0, initialTime = 0) {
        this.game = game;
        this.enemies = [];
        this.spawnTimer = 0;
        this.spawnInterval = 1.5;

        this.time = initialTime; // Total run time in seconds
        this.initialDifficulty = initialDifficulty;
        this.difficulty = initialDifficulty; // Difficulty coefficient

        this.bossAltar = null;
        this.bossActive = false;
        this.bossAltarPos = { x: 0, y: 0 }; // Track where the altar was
        this.spawningStopped = false;

        this.killsThisStage = 0;
        this.killsNeeded = (this.game.debugMode) ? 1 : (20 + (this.game.mapLevel - 1) * 10);
        this.altarSpawned = false;
    }

    spawnAltar() {
        if (this.bossActive || this.altarSpawned) return;
        // Spawn near player but offset (Called by Game.js now)
        const angle = Math.random() * Math.PI * 2;
        const dist = 800; // Far enough
        const x = this.game.player.x + Math.cos(angle) * dist;
        const y = this.game.player.y + Math.sin(angle) * dist;

        // Clamp to world
        const cx = Math.max(100, Math.min(x, this.game.worldWidth - 100));
        const cy = Math.max(100, Math.min(y, this.game.worldHeight - 100));

        this.bossAltar = new BossAltar(this.game, cx, cy);
        this.bossAltarPos = { x: cx, y: cy }; // Save position
        this.altarSpawned = true;

        this.game.ui.showWarningMessage("WARNING: HIGH ENERGY SIGNAL DETECTED");
        console.log("Boss Altar Spawned at", cx, cy);
    }

    summonBoss() {
        this.bossActive = true;
        this.bossAltar = null; // Remove altar

        // Select boss type
        let BossClass;
        if (this.game.debugMode && this.game.debugBoss && this.game.debugBoss !== 'random') {
            const bossMap = {
                'overlord': Overlord,
                'slime_king': SlimeKing,
                'mecha_golem': MechaGolem,
                'void_phantom': VoidPhantom,
                'crimson_dragon': CrimsonDragon,
                'storm_weaver': StormWeaver,
                'iron_behemoth': IronBehemoth,
                'prism_mirror': PrismMirror,
                'toxic_horror': ToxicHorror,
                'aura_knight': AuraKnight,
                'celestial_eye': CelestialEye
            };
            BossClass = bossMap[this.game.debugBoss] || Overlord;
        } else {
            const mapLevel = this.game.mapLevel || 1;
            let candidates;

            if (mapLevel >= 10) {
                candidates = [Overlord];
            } else {
                switch (mapLevel) {
                    case 1: candidates = [SlimeKing, ToxicHorror]; break;
                    case 2: candidates = [IronBehemoth, MechaGolem]; break;
                    case 3: candidates = [StormWeaver, AuraKnight]; break;
                    case 4: candidates = [VoidPhantom, PrismMirror]; break;
                    case 5: candidates = [CrimsonDragon, CelestialEye]; break;
                    case 6: candidates = [SlimeKing, IronBehemoth]; break;
                    case 7: candidates = [MechaGolem, ToxicHorror]; break;
                    case 8: candidates = [VoidPhantom, PrismMirror]; break;
                    case 9: candidates = [CrimsonDragon, CelestialEye]; break;
                    default: candidates = [Overlord];
                }
            }
            BossClass = candidates[Math.floor(Math.random() * candidates.length)];
        }

        // Spawn the new Boss entity
        const boss = new BossClass(this.game, this.game.player.x, this.game.player.y - 300);

        // Get difficulty setting multipliers (Normal: HP*0.5/Atk*0.3, Hard: HP*0.6/Atk*0.6, Very Hard: HP*1.0/Atk*1.0)
        let hpMultiplier = 1.0;
        let damageMultiplier = 1.0;
        const diffSetting = this.game.selectedDifficulty;
        if (diffSetting === 'normal') {
            hpMultiplier = 0.5;
            damageMultiplier = 0.3;
        } else if (diffSetting === 'hard') {
            hpMultiplier = 0.6;
            damageMultiplier = 0.6;
        } else if (diffSetting === 'veryhard') {
            hpMultiplier = 1.0;
            damageMultiplier = 1.0;
        }

        // Scale Boss stats
        boss.hp *= this.difficulty * hpMultiplier;
        boss.maxHp *= this.difficulty * hpMultiplier;
        boss.damage *= this.difficulty * damageMultiplier;

        // Map Level Scaling (Make later bosses even tougher)
        const mapLevel = this.game.mapLevel || 1;
        boss.hp *= (1 + (mapLevel - 1) * 0.15);
        boss.maxHp = boss.hp;

        this.enemies.push(boss);

        this.game.audio.playBossSummon(); // Sound effect
        console.log(`BOSS SUMMONED! Type: ${boss.type}, HP: ${boss.hp}`);
    }

    stopSpawning() {
        this.spawningStopped = true;
        // Optional: Clear existing non-boss enemies?
        // this.enemies = this.enemies.filter(e => e.isBoss);
    }

    update(dt) {
        if (this.bossAltar) this.bossAltar.update(dt);

        this.time += dt;

        if (!this.spawningStopped) {
            this.spawnTimer += dt;

            // Time-based Scaling (Exponential growth for gradual early game, accelerating late game)
            // Changed: 180→300 for slower early scaling, 1.5→1.3 for gentler curve
            const timeScaling = Math.pow(1.0 + (this.time / 300.0), 1.3);
            this.difficulty = this.initialDifficulty * timeScaling;

            // Spawn Interval decreases with difficulty
            // Base 2.0s -> limit to 0.3s
            const currentInterval = Math.max(0.3, 2.0 / Math.sqrt(this.difficulty));

            if (this.spawnTimer >= currentInterval) {
                this.spawnEnemy();
                this.spawnTimer = 0;
            }
        }

        this.enemies.forEach(enemy => {
            enemy.update(dt);
            if (enemy.hp <= 0 && !enemy.killCounted) {
                // Enemy died this frame
                if (!enemy.isBoss) {
                    this.killsThisStage++;
                    enemy.killCounted = true; // Mark as counted
                    // Check for altar spawn
                    if (!this.altarSpawned && this.killsThisStage >= this.killsNeeded) {
                        this.spawnAltar();
                    }
                }
            }
            if (enemy.isBoss && enemy.hp <= 0) {
                this.game.bossDefeated();
            }
        });
        this.enemies = this.enemies.filter(enemy => !enemy.markedForDeletion);
    }

    draw(ctx) {
        if (this.bossAltar) this.bossAltar.draw(ctx);
        this.enemies.forEach(enemy => enemy.draw(ctx));
    }

    spawnChest() {
        // Spawn chest near player
        let cx = 0, cy = 0;
        let chestSpawned = false;
        let attempts = 0;

        while (!chestSpawned && attempts < 100) {
            attempts++;
            const angle = Math.random() * Math.PI * 2;
            const dist = 200 + Math.random() * 200;
            const x = this.game.player.x + Math.cos(angle) * dist;
            const y = this.game.player.y + Math.sin(angle) * dist;

            // Clamp to world
            const tx = Math.max(50, Math.min(x, this.game.worldWidth - 50));
            const ty = Math.max(50, Math.min(y, this.game.worldHeight - 50));

            // Check collision with obstacles
            let overlaps = false;
            if (this.game.obstacles) {
                for (const obs of this.game.obstacles) {
                    const odx = tx - obs.x;
                    const ody = ty - obs.y;
                    if (Math.sqrt(odx * odx + ody * ody) < obs.radius + 35) { // Obstacle radius (30) + Chest radius (20) + padding
                        overlaps = true;
                        break;
                    }
                }
            }

            if (!overlaps) {
                cx = tx;
                cy = ty;
                chestSpawned = true;
            }
        }

        // Fallback in case we couldn't find a free spot in 100 attempts
        if (!chestSpawned) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 200 + Math.random() * 200;
            cx = Math.max(50, Math.min(this.game.player.x + Math.cos(angle) * dist, this.game.worldWidth - 50));
            cy = Math.max(50, Math.min(this.game.player.y + Math.sin(angle) * dist, this.game.worldHeight - 50));
        }

        this.game.chests.push(new Chest(this.game, cx, cy));
        console.log("Chest Spawned!");
    }

    spawnEnemy() {
        // Enemy Count Limit: Cap at 40 enemies to prevent performance issues
        const MAX_ENEMIES = 40;
        if (this.enemies.length >= MAX_ENEMIES) {
            return; // Skip spawning if at capacity
        }

        // Spawn Count scales with difficulty
        // Cap at 5 per interval to prevent performance kill
        const spawnCount = Math.min(5, Math.floor(this.difficulty));

        for (let i = 0; i < spawnCount; i++) {
            // Check again inside loop to prevent overshooting the limit
            if (this.enemies.length >= MAX_ENEMIES) {
                break;
            }

            // Spawn around player (outside camera view)
            const angle = Math.random() * Math.PI * 2;
            const dist = 500 + Math.random() * 200; // Outside screen
            let x = this.game.player.x + Math.cos(angle) * dist;
            let y = this.game.player.y + Math.sin(angle) * dist;

            // Clamp to world bounds
            x = Math.max(0, Math.min(x, this.game.worldWidth));
            y = Math.max(0, Math.min(y, this.game.worldHeight));

            let enemyType;
            const rand = Math.random();
            const mapDifficulty = this.game.mapLevel;

            // Adjust probabilities based on difficulty
            const diffFactor = Math.min(0.5, (this.difficulty - 1.0) * 0.1);

            // Stage-based spawn tables
            if (mapDifficulty === 1) {
                // Stage 1: Green Forest
                if (rand < 0.55 - diffFactor) enemyType = new Slime(this.game, x, y);
                else if (rand < 0.9 - diffFactor / 2) enemyType = new Lizard(this.game, x, y);
                else enemyType = new KamikazeEnemy(this.game, x, y);
            } else if (mapDifficulty === 2) {
                // Stage 2: Lava Zone
                if (rand < 0.35 - diffFactor) enemyType = new Slime(this.game, x, y);
                else if (rand < 0.55 - diffFactor) enemyType = new Lizard(this.game, x, y);
                else if (rand < 0.75 - diffFactor / 2) enemyType = new Golem(this.game, x, y);
                else if (rand < 0.9) enemyType = new MissileEnemy(this.game, x, y);
                else enemyType = new KamikazeEnemy(this.game, x, y);
            } else if (mapDifficulty === 3) {
                // Stage 3: Void Realm
                if (rand < 0.25 - diffFactor) enemyType = new Slime(this.game, x, y);
                else if (rand < 0.4 - diffFactor) enemyType = new Lizard(this.game, x, y);
                else if (rand < 0.55 - diffFactor / 2) enemyType = new Golem(this.game, x, y);
                else if (rand < 0.7) enemyType = new Totem(this.game, x, y);
                else if (rand < 0.8) enemyType = new MissileEnemy(this.game, x, y);
                else if (rand < 0.95) enemyType = new BeamEnemy(this.game, x, y);
                else enemyType = new KamikazeEnemy(this.game, x, y);
            } else if (mapDifficulty === 4) {
                // Stage 4: Ice Cave
                if (rand < 0.1 - diffFactor) enemyType = new Slime(this.game, x, y);
                else if (rand < 0.25 - diffFactor) enemyType = new Lizard(this.game, x, y);
                else if (rand < 0.45) enemyType = new Golem(this.game, x, y);
                else if (rand < 0.65) enemyType = new Totem(this.game, x, y);
                else if (rand < 0.8) enemyType = new BeamEnemy(this.game, x, y);
                else enemyType = new MissileEnemy(this.game, x, y);
            } else if (mapDifficulty === 5) {
                // Stage 5: Desert Ruins
                if (rand < 0.2 - diffFactor) enemyType = new Slime(this.game, x, y);
                else if (rand < 0.4 - diffFactor) enemyType = new Lizard(this.game, x, y);
                else if (rand < 0.55) enemyType = new Totem(this.game, x, y);
                else if (rand < 0.75) enemyType = new MissileEnemy(this.game, x, y);
                else if (rand < 0.95) enemyType = new KamikazeEnemy(this.game, x, y);
                else enemyType = new Golem(this.game, x, y);
            } else if (mapDifficulty === 6) {
                // Stage 6: Deep Ocean
                if (rand < 0.3 - diffFactor) enemyType = new Slime(this.game, x, y);
                else if (rand < 0.45 - diffFactor) enemyType = new Lizard(this.game, x, y);
                else if (rand < 0.65) enemyType = new BeamEnemy(this.game, x, y);
                else if (rand < 0.9) enemyType = new MissileEnemy(this.game, x, y);
                else enemyType = new KamikazeEnemy(this.game, x, y);
            } else if (mapDifficulty === 7) {
                // Stage 7: Volcanic Core
                if (rand < 0.2 - diffFactor) enemyType = new Lizard(this.game, x, y);
                else if (rand < 0.4) enemyType = new Golem(this.game, x, y);
                else if (rand < 0.55) enemyType = new Totem(this.game, x, y);
                else if (rand < 0.75) enemyType = new BeamEnemy(this.game, x, y);
                else if (rand < 0.95) enemyType = new KamikazeEnemy(this.game, x, y);
                else enemyType = new MissileEnemy(this.game, x, y);
            } else if (mapDifficulty === 8) {
                // Stage 8: Storm Plains
                if (rand < 0.15 - diffFactor) enemyType = new Slime(this.game, x, y);
                else if (rand < 0.25 - diffFactor) enemyType = new Lizard(this.game, x, y);
                else if (rand < 0.4) enemyType = new Golem(this.game, x, y);
                else if (rand < 0.55) enemyType = new Totem(this.game, x, y);
                else if (rand < 0.7) enemyType = new MissileEnemy(this.game, x, y);
                else if (rand < 0.9) enemyType = new BeamEnemy(this.game, x, y);
                else enemyType = new KamikazeEnemy(this.game, x, y);
            } else if (mapDifficulty === 9) {
                // Stage 9: Neon City
                if (rand < 0.2) enemyType = new Golem(this.game, x, y);
                else if (rand < 0.35) enemyType = new Totem(this.game, x, y);
                else if (rand < 0.55) enemyType = new MissileEnemy(this.game, x, y);
                else if (rand < 0.75) enemyType = new BeamEnemy(this.game, x, y);
                else if (rand < 0.95) enemyType = new KamikazeEnemy(this.game, x, y);
                else enemyType = new Lizard(this.game, x, y);
            } else {
                // Stage 10: Chaos Dimension
                const types = [Slime, Lizard, Golem, Totem, MissileEnemy, BeamEnemy, KamikazeEnemy];
                const RandomEnemy = types[Math.floor(Math.random() * types.length)];
                enemyType = new RandomEnemy(this.game, x, y);
            }


            // Apply Difficulty Scaling
            // HP: 時間経過で指数的に上昇（序盤は控えめ、後半は大きく）
            // difficulty^1.5 で序盤を緩やかに（1.8→1.5に調整）
            const hpScaling = Math.pow(this.difficulty, 1.5);
            
            // Get difficulty setting multipliers (Normal: HP*0.5/Atk*0.3, Hard: HP*0.6/Atk*0.6, Very Hard: HP*1.0/Atk*1.0)
            let hpMultiplier = 1.0;
            let damageMultiplier = 1.0;
            const diffSetting = this.game.selectedDifficulty;
            if (diffSetting === 'normal') {
                hpMultiplier = 0.5;
                damageMultiplier = 0.3;
            } else if (diffSetting === 'hard') {
                hpMultiplier = 0.6;
                damageMultiplier = 0.6;
            } else if (diffSetting === 'veryhard') {
                hpMultiplier = 1.0;
                damageMultiplier = 1.0;
            }

            enemyType.hp *= hpScaling * hpMultiplier;
            enemyType.maxHp *= hpScaling * hpMultiplier;

            // Damage: 線形スケーリングのまま（HPほど上げない）
            enemyType.damage *= this.difficulty * damageMultiplier;

            // Map Level Scaling: 廃止


            this.enemies.push(enemyType);
        }
    }
}
