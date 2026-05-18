export class UIManager {
    constructor(game) {
        this.game = game;
        this.uiLayer = document.getElementById('ui-layer');
        this.screens = {};

        // Relic Data (Moved from ShopSystem)
        // レアリティ: common (48%), rare (35%), epic (15%), legendary (2%)
        // 価格は基礎値の20%減（序盤の成長をしやすくするため）
        this.relics = [
            // ----------------------------------------------------
            // 4-Tier Stat Boosts
            // ----------------------------------------------------
            // 1. Attack Damage
            { id: 'atk_up_1', name: 'Cyber Katana (C)', desc: 'Attack Damage +10%', cost: 12, rarity: 'common', color: '#ff4444', rarityBorder: '#888888', weight: 58, category: 'red', effect: (p) => p.damage *= 1.10 },
            { id: 'atk_up_2', name: 'Cyber Katana (R)', desc: 'Attack Damage +15%', cost: 18, rarity: 'rare', color: '#ff4444', rarityBorder: '#4466ff', weight: 35, category: 'red', effect: (p) => p.damage *= 1.15 },
            { id: 'atk_up_3', name: 'Cyber Katana (E)', desc: 'Attack Damage +20%', cost: 26, rarity: 'epic', color: '#ff4444', rarityBorder: '#aa00ff', weight: 5, category: 'red', effect: (p) => p.damage *= 1.20 },
            { id: 'atk_up_4', name: 'Cyber Katana (L)', desc: 'Attack Damage +25%', cost: 40, rarity: 'legendary', color: '#ff4444', rarityBorder: '#ff8800', weight: 2, category: 'red', effect: (p) => p.damage *= 1.25 },

            // 2. Move Speed
            { id: 'spd_up_1', name: 'Neko Headphones (C)', desc: 'Move Speed +3%', cost: 12, rarity: 'common', color: '#4444ff', rarityBorder: '#888888', weight: 58, category: 'blue', effect: (p) => p.speed *= 1.03 },
            { id: 'spd_up_2', name: 'Neko Headphones (R)', desc: 'Move Speed +5%', cost: 18, rarity: 'rare', color: '#4444ff', rarityBorder: '#4466ff', weight: 35, category: 'blue', effect: (p) => p.speed *= 1.05 },
            { id: 'spd_up_3', name: 'Neko Headphones (E)', desc: 'Move Speed +10%', cost: 26, rarity: 'epic', color: '#4444ff', rarityBorder: '#aa00ff', weight: 5, category: 'blue', effect: (p) => p.speed *= 1.10 },
            { id: 'spd_up_4', name: 'Neko Headphones (L)', desc: 'Move Speed +15%', cost: 40, rarity: 'legendary', color: '#4444ff', rarityBorder: '#ff8800', weight: 2, category: 'blue', effect: (p) => p.speed *= 1.15 },

            // 3. Max HP
            { id: 'hp_up_1', name: 'Energy Drink (C)', desc: 'Max HP +30', cost: 12, rarity: 'common', color: '#44ff44', rarityBorder: '#888888', weight: 58, category: 'green', effect: (p) => { p.maxHp += 30; p.hp += 30; } },
            { id: 'hp_up_2', name: 'Energy Drink (R)', desc: 'Max HP +50', cost: 18, rarity: 'rare', color: '#44ff44', rarityBorder: '#4466ff', weight: 35, category: 'green', effect: (p) => { p.maxHp += 50; p.hp += 50; } },
            { id: 'hp_up_3', name: 'Energy Drink (E)', desc: 'Max HP +80', cost: 26, rarity: 'epic', color: '#44ff44', rarityBorder: '#aa00ff', weight: 5, category: 'green', effect: (p) => { p.maxHp += 80; p.hp += 80; } },
            { id: 'hp_up_4', name: 'Energy Drink (L)', desc: 'Max HP +120', cost: 40, rarity: 'legendary', color: '#44ff44', rarityBorder: '#ff8800', weight: 2, category: 'green', effect: (p) => { p.maxHp += 120; p.hp += 120; } },

            // 4. Fire Rate (Lower interval is better)
            { id: 'rate_up_1', name: 'Overclock Chip (C)', desc: 'Fire Rate +5%', cost: 12, rarity: 'common', color: '#ffaa00', rarityBorder: '#888888', weight: 58, category: 'red', effect: (p) => p.shootInterval *= 0.95 },
            { id: 'rate_up_2', name: 'Overclock Chip (R)', desc: 'Fire Rate +10%', cost: 18, rarity: 'rare', color: '#ffaa00', rarityBorder: '#4466ff', weight: 35, category: 'red', effect: (p) => p.shootInterval *= 0.90 },
            { id: 'rate_up_3', name: 'Overclock Chip (E)', desc: 'Fire Rate +15%', cost: 26, rarity: 'epic', color: '#ffaa00', rarityBorder: '#aa00ff', weight: 5, category: 'red', effect: (p) => p.shootInterval *= 0.85 },
            { id: 'rate_up_4', name: 'Overclock Chip (L)', desc: 'Fire Rate +20%', cost: 40, rarity: 'legendary', color: '#ffaa00', rarityBorder: '#ff8800', weight: 2, category: 'red', effect: (p) => p.shootInterval *= 0.80 },

            // 5. HP Regen
            { id: 'hp_regen_1', name: 'Nano Repair (C)', desc: 'HP Regen +0.5/sec', cost: 12, rarity: 'common', color: '#44ff88', rarityBorder: '#888888', weight: 58, category: 'green', effect: (p) => { if (!p.hpRegen) p.hpRegen = 0; p.hpRegen += 0.5; } },
            { id: 'hp_regen_2', name: 'Nano Repair (R)', desc: 'HP Regen +1.0/sec', cost: 18, rarity: 'rare', color: '#44ff88', rarityBorder: '#4466ff', weight: 35, category: 'green', effect: (p) => { if (!p.hpRegen) p.hpRegen = 0; p.hpRegen += 1.0; } },
            { id: 'hp_regen_3', name: 'Nano Repair (E)', desc: 'HP Regen +1.5/sec', cost: 26, rarity: 'epic', color: '#44ff88', rarityBorder: '#aa00ff', weight: 5, category: 'green', effect: (p) => { if (!p.hpRegen) p.hpRegen = 0; p.hpRegen += 1.5; } },
            { id: 'hp_regen_4', name: 'Nano Repair (L)', desc: 'HP Regen +2.0/sec', cost: 40, rarity: 'legendary', color: '#44ff88', rarityBorder: '#ff8800', weight: 2, category: 'green', effect: (p) => { if (!p.hpRegen) p.hpRegen = 0; p.hpRegen += 2.0; } },

            // 6. Crit Chance
            { id: 'crit_chance_1', name: 'Lucky Dice (C)', desc: 'Crit Chance +5%', cost: 12, rarity: 'common', color: '#ffdd00', rarityBorder: '#888888', weight: 58, category: 'red', effect: (p) => { if (!p.critChance) p.critChance = 0; p.critChance += 0.05; } },
            { id: 'crit_chance_2', name: 'Lucky Dice (R)', desc: 'Crit Chance +10%', cost: 18, rarity: 'rare', color: '#ffdd00', rarityBorder: '#4466ff', weight: 35, category: 'red', effect: (p) => { if (!p.critChance) p.critChance = 0; p.critChance += 0.10; } },
            { id: 'crit_chance_3', name: 'Lucky Dice (E)', desc: 'Crit Chance +15%', cost: 26, rarity: 'epic', color: '#ffdd00', rarityBorder: '#aa00ff', weight: 5, category: 'red', effect: (p) => { if (!p.critChance) p.critChance = 0; p.critChance += 0.15; } },
            { id: 'crit_chance_4', name: 'Lucky Dice (L)', desc: 'Crit Chance +20%', cost: 40, rarity: 'legendary', color: '#ffdd00', rarityBorder: '#ff8800', weight: 2, category: 'red', effect: (p) => { if (!p.critChance) p.critChance = 0; p.critChance += 0.20; } },

            // 7. Projectile Size
            { id: 'projectile_size_1', name: 'Amplifier Core (C)', desc: 'Proj Size +10%', cost: 12, rarity: 'common', color: '#ff6600', rarityBorder: '#888888', weight: 58, category: 'red', effect: (p) => { if (!p.projectileSize) p.projectileSize = 1; p.projectileSize *= 1.10; } },
            { id: 'projectile_size_2', name: 'Amplifier Core (R)', desc: 'Proj Size +15%', cost: 18, rarity: 'rare', color: '#ff6600', rarityBorder: '#4466ff', weight: 35, category: 'red', effect: (p) => { if (!p.projectileSize) p.projectileSize = 1; p.projectileSize *= 1.15; } },
            { id: 'projectile_size_3', name: 'Amplifier Core (E)', desc: 'Proj Size +20%', cost: 26, rarity: 'epic', color: '#ff6600', rarityBorder: '#aa00ff', weight: 5, category: 'red', effect: (p) => { if (!p.projectileSize) p.projectileSize = 1; p.projectileSize *= 1.20; } },
            { id: 'projectile_size_4', name: 'Amplifier Core (L)', desc: 'Proj Size +25%', cost: 40, rarity: 'legendary', color: '#ff6600', rarityBorder: '#ff8800', weight: 2, category: 'red', effect: (p) => { if (!p.projectileSize) p.projectileSize = 1; p.projectileSize *= 1.25; } },

            // 8. Damage Reduction (Armor)
            { id: 'armor_plate_1', name: 'Titanium Plating (C)', desc: 'Dmg Taken -10%', cost: 12, rarity: 'common', color: '#999999', rarityBorder: '#888888', weight: 58, category: 'green', effect: (p) => { if (!p.damageMultiplier) p.damageMultiplier = 1.0; p.damageMultiplier *= 0.90; } },
            { id: 'armor_plate_2', name: 'Titanium Plating (R)', desc: 'Dmg Taken -15%', cost: 18, rarity: 'rare', color: '#999999', rarityBorder: '#4466ff', weight: 35, category: 'green', effect: (p) => { if (!p.damageMultiplier) p.damageMultiplier = 1.0; p.damageMultiplier *= 0.85; } },
            { id: 'armor_plate_3', name: 'Titanium Plating (E)', desc: 'Dmg Taken -20%', cost: 26, rarity: 'epic', color: '#999999', rarityBorder: '#aa00ff', weight: 5, category: 'green', effect: (p) => { if (!p.damageMultiplier) p.damageMultiplier = 1.0; p.damageMultiplier *= 0.80; } },
            { id: 'armor_plate_4', name: 'Titanium Plating (L)', desc: 'Dmg Taken -25%', cost: 40, rarity: 'legendary', color: '#999999', rarityBorder: '#ff8800', weight: 2, category: 'green', effect: (p) => { if (!p.damageMultiplier) p.damageMultiplier = 1.0; p.damageMultiplier *= 0.75; } },

            // ----------------------------------------------------
            // Unique / Utility / Method items (Kept from original)
            // ----------------------------------------------------
            { id: 'pierce_shot', name: 'Plasma Orb', desc: 'Fire penetrating orbs +1', cost: 28, rarity: 'legendary', color: '#00aaff', rarityBorder: '#ff8800', weight: 2, category: 'yellow', effect: (p) => { if (!p.pierceShotCount) p.pierceShotCount = 0; p.pierceShotCount++; } },
            { id: 'range_up', name: 'Scope Lens', desc: 'Magnet Range +50%', cost: 10, rarity: 'rare', color: '#00ffff', rarityBorder: '#4466ff', weight: 35, category: 'blue', effect: (p) => { /* Handled in Drop */ } },
            { id: 'shield_gen', name: 'Energy Barrier', desc: 'Shield absorbs 20 damage', cost: 28, rarity: 'rare', color: '#8888ff', rarityBorder: '#4466ff', weight: 35, category: 'green', effect: (p) => { if (!p.shield) p.shield = 0; p.shield += 20; if (!p.maxShield) p.maxShield = 0; p.maxShield += 20; } },
            { id: 'multishot', name: 'Splitter Module', desc: 'Shoot 2 extra bullets', cost: 32, rarity: 'legendary', color: '#ff4488', rarityBorder: '#ff8800', weight: 2, category: 'yellow', effect: (p) => { if (!p.multiShotCount) p.multiShotCount = 1; p.multiShotCount += 1; } },

            // Epic (エピック) - 強力な強化
            { id: 'drone', name: 'Support Drone', desc: 'Summons a drone', cost: 32, rarity: 'legendary', color: '#00ffaa', rarityBorder: '#ff8800', weight: 2, category: 'yellow', effect: (p) => p.game.addDrone() },
            { id: 'lifesteal', name: 'Vampire Fang', desc: '20% chance to heal +1 HP on hit', cost: 40, rarity: 'epic', color: '#cc0044', rarityBorder: '#aa00ff', weight: 5, category: 'green', disabled: true, effect: (p) => { if (!p.lifeStealChance) p.lifeStealChance = 0.20; else p.lifeStealChance *= 1.5; } },
            { id: 'time_warp', name: 'Chrono Lens', desc: 'Speed +5%, Fire Rate +10%', cost: 44, rarity: 'epic', color: '#00ccff', rarityBorder: '#aa00ff', weight: 5, category: 'blue', effect: (p) => { p.speed *= 1.05; p.shootInterval *= 0.90; } },
            { id: 'missile', name: 'Missile Pod', desc: 'Fires homing missiles', cost: 40, rarity: 'legendary', color: '#ff0088', rarityBorder: '#ff8800', weight: 2, category: 'yellow', effect: (p) => p.missileCount++ },

            // Legendary (レジェンダリー) - 超強力
            { id: 'phoenix_heart', name: 'Phoenix Heart', desc: 'Revive once on death', cost: 64, rarity: 'legendary', color: '#ffaa00', rarityBorder: '#ff8800', weight: 2, category: 'green', effect: (p) => { if (!p.reviveCount) p.reviveCount = 0; p.reviveCount++; } },
            { id: 'phoenix_heart_used', name: 'Phoenix Heart (Used)', desc: 'Already consumed', cost: 0, rarity: 'legendary', color: '#666666', rarityBorder: '#444444', weight: 0, category: 'none', effect: (p) => { /* No effect */ } },
            
            // Special Effects (オレンジ - 特殊効果)
            { id: 'volatile_core', name: 'Volatile Core', desc: 'Explosion on enemy kill', cost: 45, rarity: 'legendary', color: '#ff5500', rarityBorder: '#ff8800', weight: 2, category: 'orange', effect: (p) => p.hasVolatileCore = true },
            { id: 'soul_seekers', name: 'Soul Seekers', desc: 'Fires missiles on enemy kill', cost: 50, rarity: 'legendary', color: '#ff8800', rarityBorder: '#ff8800', weight: 2, category: 'orange', effect: (p) => p.hasSoulSeekers = true },
            { id: 'revenge_protocol', name: 'Revenge Protocol', desc: 'Counter shockwave when hit', cost: 40, rarity: 'legendary', color: '#ff6600', rarityBorder: '#ff8800', weight: 2, category: 'orange', effect: (p) => p.hasRevengeProtocol = true },
            { id: 'chain_lightning', name: 'Chain Lightning', desc: 'Attacks can chain to nearby enemies', cost: 55, rarity: 'legendary', color: '#ffee00', rarityBorder: '#ff8800', weight: 2, category: 'orange', effect: (p) => p.hasChainLightning = true },
            { id: 'frost_aura', name: 'Frost Aura', desc: 'Slows down nearby enemies', cost: 45, rarity: 'legendary', color: '#00ccff', rarityBorder: '#ff8800', weight: 2, category: 'orange', effect: (p) => p.hasFrostAura = true },
            { id: 'executioner', name: 'Executioner', desc: 'Double damage to low HP enemies', cost: 40, rarity: 'legendary', color: '#cc0044', rarityBorder: '#ff8800', weight: 2, category: 'orange', effect: (p) => p.hasExecutioner = true },
            { id: 'repulsion_shield', name: 'Repulsion Shield', desc: 'Knockback enemies when hit', cost: 35, rarity: 'legendary', color: '#aaaaff', rarityBorder: '#ff8800', weight: 2, category: 'orange', effect: (p) => p.hasRepulsionShield = true },
            { id: 'midas_touch', name: 'Midas Touch', desc: 'Extra Ene drop on kill', cost: 50, rarity: 'legendary', color: '#ffd700', rarityBorder: '#ff8800', weight: 2, category: 'orange', effect: (p) => p.hasMidasTouch = true },
            { id: 'adrenaline', name: 'Adrenaline', desc: 'Extreme speed/fire rate at low HP', cost: 40, rarity: 'legendary', color: '#ff2222', rarityBorder: '#ff8800', weight: 2, category: 'orange', effect: (p) => p.hasAdrenaline = true },
            { id: 'orbital_blades', name: 'Orbital Blades', desc: 'Spinning blades damage nearby enemies', cost: 55, rarity: 'legendary', color: '#dddddd', rarityBorder: '#ff8800', weight: 2, category: 'orange', effect: (p) => p.game.addOrbitalBlades() },
            { id: 'time_stop', name: 'Time Stop', desc: 'Stop time when picking up potion', cost: 50, rarity: 'legendary', color: '#aa00ff', rarityBorder: '#ff8800', weight: 2, category: 'orange', effect: (p) => p.hasTimeStop = true },
            { id: 'holo_decoy', name: 'Holo Decoy', desc: 'Leave a decoy when taking damage', cost: 40, rarity: 'legendary', color: '#00ffff', rarityBorder: '#ff8800', weight: 2, category: 'orange', effect: (p) => p.hasHoloDecoy = true },
            { id: 'vampiric_aura', name: 'Vampiric Aura', desc: 'Drain HP from nearby enemies', cost: 60, rarity: 'legendary', color: '#990033', rarityBorder: '#ff8800', weight: 2, category: 'orange', effect: (p) => p.hasVampiricAura = true },
            
            // New Weapons (Yellow Category)
            { id: 'satellite_beam', name: 'Satellite Beam', desc: 'Fire massive beam from sky (+1 target)', cost: 45, rarity: 'legendary', color: '#ff00ff', rarityBorder: '#ff8800', weight: 2, category: 'yellow', effect: (p) => { p.satelliteBeamCount = (p.satelliteBeamCount || 0) + 1; } },
            { id: 'singularity', name: 'Singularity', desc: 'Create black holes that pull enemies (+1)', cost: 50, rarity: 'legendary', color: '#5500aa', rarityBorder: '#ff8800', weight: 2, category: 'yellow', effect: (p) => { p.singularityCount = (p.singularityCount || 0) + 1; } },
            { id: 'cyber_mine', name: 'Cyber Mine', desc: 'Drop mines behind you (+1)', cost: 35, rarity: 'legendary', color: '#ffcc00', rarityBorder: '#ff8800', weight: 2, category: 'yellow', effect: (p) => { p.cyberMineCount = (p.cyberMineCount || 0) + 1; } },
            { id: 'railgun', name: 'Railgun', desc: 'Powerful piercing laser (+1 beam)', cost: 45, rarity: 'legendary', color: '#00ffff', rarityBorder: '#ff8800', weight: 2, category: 'yellow', effect: (p) => { p.railgunCount = (p.railgunCount || 0) + 1; } },
            { id: 'boomerang_blade', name: 'Boomerang Blade', desc: 'Throws returning blades (+1)', cost: 40, rarity: 'legendary', color: '#00ff55', rarityBorder: '#ff8800', weight: 2, category: 'yellow', effect: (p) => { p.boomerangCount = (p.boomerangCount || 0) + 1; } },
            { id: 'cyber_fangs', name: 'Cyber Fangs', desc: 'Spikes from ground on enemies (+3 targets)', cost: 40, rarity: 'legendary', color: '#ff0055', rarityBorder: '#ff8800', weight: 2, category: 'yellow', effect: (p) => { p.cyberFangsCount = (p.cyberFangsCount || 0) + 1; } }
        ];

        this.setupScreens();
        console.log('UIManager initialized (v2 - Icons)');
    }

    setupScreens() {
        // Title Screen
        this.screens.title = this.createScreen('title-screen', `
            <h1 class="title-text">Cyber<br>Survivor</h1>
            <button id="btn-start" class="cyber-btn">START</button>
            <!-- Hide OPTIONS button but keep for future restoration -->
            <button id="btn-options" class="cyber-btn secondary" style="display: none;">OPTIONS</button>
            <button id="btn-reset" class="cyber-btn secondary" style="margin-top: 20px; background: #ff4444;">RESET DATA</button>
        `);

        // Options Screen
        this.screens.options = this.createScreen('options-screen', `
            <h2>OPTIONS</h2>
            <div class="options-container scrollable" style="max-height: 75vh; overflow-y: auto; width: 90%; max-width: 500px;">
                <label class="cyber-checkbox">
                    <input type="checkbox" id="chk-debug">
                    <span class="checkmark"></span>
                    DEBUG MODE (x100 Ene)
                </label>
                <button id="btn-debug-money" class="cyber-btn small" style="margin-top: 10px; width: 100%; color: #ffd700; border-color: #ffd700; font-weight: bold; background: rgba(255, 215, 0, 0.1);">💰 ADD 10,000 CREDITS</button>
                <div class="debug-option" style="margin-top: 15px;">
                    <label style="color: #00ffff; font-size: 14px; display: block; margin-bottom: 5px;">TEST BOSS (Debug Only):</label>
                    <select id="debug-boss-select" class="cyber-btn small" style="width: 100%; background: #000; color: #00ffff; border: 1px solid #00ffff;">
                        <option value="random">RANDOM</option>
                        <option value="overlord">OVERLORD</option>
                        <option value="slime_king">SLIME KING</option>
                        <option value="mecha_golem">MECHA GOLEM</option>
                        <option value="void_phantom">VOID PHANTOM</option>
                        <option value="crimson_dragon">CRIMSON DRAGON</option>
                        <option value="storm_weaver">STORM WEAVER</option>
                        <option value="iron_behemoth">IRON BEHEMOTH</option>
                        <option value="prism_mirror">PRISM MIRROR</option>
                        <option value="toxic_horror">TOXIC HORROR</option>
                        <option value="aura_knight">AURA KNIGHT</option>
                        <option value="celestial_eye">CELESTIAL EYE</option>
                    </select>
                </div>

                <div style="margin-top: 20px; border-top: 1px solid #333; padding-top: 15px;">
                    <label style="color: #ff00ff; font-size: 14px; display: block; margin-bottom: 10px;">⚡ DEBUG ITEM CHEATS (Give to Player):</label>
                    <div id="debug-abilities-container" style="display: flex; flex-wrap: wrap; gap: 6px; max-height: 250px; overflow-y: auto; padding: 6px; border: 1px solid #333; background: #050505; width: 100%; box-sizing: border-box;">
                        <!-- Populated dynamically -->
                    </div>
                    <div id="debug-ability-msg" style="margin-top: 8px; color: #0f0; font-size: 12px; min-height: 18px;"></div>
                </div>
            </div>
            <button id="btn-close-options" class="cyber-btn secondary" style="margin-top: 10px;">CLOSE</button>
        `);

        // Home Screen
        this.screens.home = this.createScreen('home-screen', `
            <h2>Home Base</h2>
            <div class="difficulty-select" style="position: absolute; top: 20px; left: 20px; text-align: left;">
                <h3 style="margin: 0 0 5px 0; font-size: 14px; color: #aaa;">DIFFICULTY</h3>
                <div class="difficulty-buttons" style="display: flex; gap: 5px;">
                    <button class="cyber-btn small difficulty-btn selected" data-diff="normal" style="font-size: 10px; padding: 5px 10px;">NORMAL</button>
                    <button class="cyber-btn small difficulty-btn" data-diff="hard" style="font-size: 10px; padding: 5px 10px;">HARD</button>
                    <button class="cyber-btn small difficulty-btn" data-diff="veryhard" style="font-size: 10px; padding: 5px 10px;">V.HARD</button>
                </div>
            </div>
            <div class="character-select" style="display: flex; gap: 2vw; margin-bottom: 2vh; flex-wrap: wrap; justify-content: center;">
                <div class="char-card selected" data-char="girl" style="width: min(20vw, 85px); height: min(20vw, 85px);">
                    <canvas width="64" height="64" class="char-preview"></canvas>
                    <span>Girl</span>
                </div>
                <div class="char-card" data-char="cat" style="width: min(20vw, 85px); height: min(20vw, 85px);">
                    <canvas width="64" height="64" class="char-preview"></canvas>
                    <span>Cat</span>
                </div>
                <div class="char-card" data-char="boy" style="width: min(20vw, 85px); height: min(20vw, 85px);">
                    <canvas width="64" height="64" class="char-preview"></canvas>
                    <span>Boy</span>
                </div>
                <div class="char-card" data-char="dog" style="width: min(20vw, 85px); height: min(20vw, 85px);">
                    <canvas width="64" height="64" class="char-preview"></canvas>
                    <span>Dog</span>
                </div>
            </div>
            <div class="stats-panel">
                <p>Money: <span id="player-money">0</span></p>
                <div class="gacha-container" style="margin-top: 10px;">
                    <button id="btn-gacha" class="cyber-btn" style="width: 100%; border-color: #ff00ff; box-shadow: 0 0 10px rgba(255,0,255,0.3);">TECH SALVAGE <span id="gacha-cost">100</span></button>
                    <p style="font-size: 10px; color: #aaa; margin-top: 5px;">Get a random item for the next run!</p>
                </div>
                <button id="btn-skilltree" class="cyber-btn" style="width: 100%; border-color: #00ffff; box-shadow: 0 0 10px rgba(0,255,255,0.3); margin-top: 10px;">NEURAL NETWORK (SKILL TREE)</button>
            </div>
            <div id="reserved-item-panel" style="margin-bottom: 2vh; min-height: 60px;">
                <h3 style="font-size: 12px; color: #00ffff; margin-bottom: 5px;">RESERVED ITEM</h3>
                <div id="reserved-item-preview" style="display: flex; align-items: center; justify-content: center; gap: 10px; background: rgba(0,255,255,0.05); border: 1px solid rgba(0,255,255,0.2); padding: 5px; border-radius: 5px;">
                    <span style="color: #666; font-style: italic;">None</span>
                </div>
            </div>
            <button id="btn-mission" class="cyber-btn">START MISSION</button>
            <button id="btn-back-title" class="cyber-btn secondary" style="margin-top: 10px;">BACK TO TITLE</button>
        `);

        // HUD (Heads Up Display)
        this.screens.hud = this.createScreen('hud-screen', `
            <div class="hud-top">
                <div class="hud-left">
                    <div class="hud-hp-ene-row">
                        <div class="bar-container">
                            <div id="shield-bar" class="bar shield"></div>
                            <div id="hp-bar" class="bar hp"></div>
                            <span id="hp-text" class="bar-text">100/100</span>
                        </div>
                        <div class="score-container">
                            Ene: <span id="score-ene">0</span>
                        </div>
                    </div>
                    <div class="time-container">
                        <span id="game-time">00:00</span>
                        <span id="game-difficulty" class="difficulty-text">Lv. 1.00</span>
                    </div>
                </div>
                <div class="hud-center">
                    <!-- Center is now empty or can be used for other things -->
                </div>
                <div class="hud-right">
                    <!-- Hide PAUSE button but keep for future restoration -->
                    <button id="btn-hud-pause" class="cyber-btn small" style="margin-bottom: 5px; pointer-events: auto; display: none;">PAUSE</button>
                    <!-- Minimap is positioned via CSS -->
                    <div id="kill-counter-container" class="kill-counter-container">
                        <span id="kill-counter-label" class="kill-label">SIGNAL:</span>
                        <span id="kill-counter-value" class="kill-value">20</span>
                    </div>
                </div>
            </div>
            
            <!-- Boss HP Bar Container -->
            <div id="boss-hud" class="boss-hud hidden">
                <div class="boss-info">
                    <span id="boss-name" class="boss-name">BOSS NAME</span>
                    <span id="boss-hp-text" class="boss-hp-text">100%</span>
                </div>
                <div class="boss-bar-container">
                    <div id="boss-hp-bar" class="boss-bar"></div>
                </div>
            </div>

            <div id="acquired-items-container" class="acquired-items">
                <!-- Acquired item icons will be added here -->
            </div>
        `);

        // Result Screen
        this.screens.result = this.createScreen('result-screen', `
            <h2>MISSION COMPLETE</h2>
            <div class="result-stats">
                <p>Ene Collected: <span id="result-ene">0</span></p>
                <p>Stage Reward: <span id="result-money">0</span></p>
                <p style="color: #ffd700; font-weight: bold;">Total Money Earned: <span id="result-run-money">0</span></p>
                <p>Damage Dealt: <span id="result-dmg-dealt">0</span></p>
                <p>Damage Taken: <span id="result-dmg-taken">0</span></p>
            </div>
            <div class="result-actions">
                <button id="btn-loop" class="cyber-btn">NEXT STAGE</button>
                <button id="btn-return-home" class="cyber-btn" style="display:none;">RETURN HOME</button>
                <button id="btn-cancel-result" class="cyber-btn secondary">CANCEL</button>
            </div>
        `);

        // Victory Screen
        this.screens.victory = this.createScreen('victory-screen', `
            <div class="victory-container">
                <h1 class="victory-title">🎉 VICTORY! 🎉</h1>
                <h2 class="victory-subtitle">ALL STAGES COMPLETED!</h2>
                <div class="difficulty-display" style="position: absolute; top: 20px; left: 20px; text-align: left;">
                    <span style="color: #aaa; font-size: 14px;">DIFFICULTY</span><br>
                    <span id="victory-difficulty" style="color: #ff00ff; font-size: 20px; font-weight: bold;">NORMAL</span>
                </div>
                <div class="result-stats-container">
                    <div class="result-section">
                        <h3>Total Ene Collected</h3>
                        <p class="result-big-text"><span id="victory-ene">0</span></p>
                    </div>
                    <div class="result-section">
                        <h3>Money Earned</h3>
                        <p class="result-big-text"><span id="victory-money">0</span></p>
                    </div>
                    <div class="result-section">
                        <h3>Stages Cleared</h3>
                        <p class="result-big-text"><span id="victory-level">10 / 10</span></p>
                    </div>

                    <div class="result-section">
                        <h3>Character Used</h3>
                        <div style="display: flex; justify-content: center; align-items: center; height: 60px; width: 100%;">
                            <canvas id="victory-character" width="50" height="50" style="width: 50px; height: 50px; display: block;"></canvas>
                        </div>
                    </div>
                    <div class="result-section">
                        <h3>Defeated Enemies</h3>
                        <div id="victory-enemies" class="result-grid"></div>
                    </div>
                    <div class="result-section">
                        <h3>Acquired Items</h3>
                        <div id="victory-items" class="result-grid"></div>
                    </div>
                    <div class="result-section" style="text-align: left; padding: 10px 20px; background: rgba(0,0,0,0.3); border-radius: 5px; margin-top: 10px;">
                        <p style="margin: 5px 0; font-size: 16px;">Damage Dealt: <span id="victory-dmg-dealt" style="color: #ffaa00; font-weight: bold; float: right;">0</span></p>
                        <p style="margin: 5px 0; font-size: 16px;">Damage Taken: <span id="victory-dmg-taken" style="color: #ff4444; font-weight: bold; float: right;">0</span></p>
                        <p style="margin: 5px 0; font-size: 16px;">Money Earned: <span id="victory-run-money" style="color: #ffd700; font-weight: bold; float: right;">0</span></p>
                    </div>
                </div>
                <button id="btn-victory-home" class="cyber-btn">RETURN TO HOME</button>
            </div>
        `);

        // Game Over Screen
        this.screens.gameover = this.createScreen('gameover-screen', `
            <div class="gameover-container">
                <h2 style="color: #ff0000;">GAME OVER</h2>
                <div class="difficulty-display" style="position: absolute; top: 20px; left: 20px; text-align: left;">
                    <span style="color: #aaa; font-size: 14px;">DIFFICULTY</span><br>
                    <span id="go-difficulty" style="color: #ff00ff; font-size: 20px; font-weight: bold;">NORMAL</span>
                </div>
                <div class="result-stats-container">
                    <div class="result-summary-row">
                        <div class="result-summary-item">
                            <h3>Character</h3>
                            <div style="display: flex; justify-content: center; align-items: center; height: 60px; width: 100%;">
                                <canvas id="go-character" width="50" height="50" style="width: 50px; height: 50px; display: block;"></canvas>
                            </div>
                        </div>
                        <div class="result-summary-item">
                            <h3>Stage</h3>
                            <p class="result-big-text"><span id="go-level">1</span></p>
                        </div>
                        <div class="result-summary-item">
                            <h3>Total Ene</h3>
                            <p class="result-big-text"><span id="go-ene">0</span></p>
                        </div>

                    </div>
                    <div class="result-section">
                        <h3>Defeated Enemies</h3>
                        <div id="go-enemies" class="result-grid"></div>
                    </div>
                    <div class="result-section">
                        <h3>Acquired Items</h3>
                        <div id="go-items" class="result-grid"></div>
                    </div>
                    <div class="result-section" style="text-align: left; padding: 10px 20px; background: rgba(0,0,0,0.3); border-radius: 5px; margin-top: 10px;">
                        <p style="margin: 5px 0; font-size: 16px;">Damage Dealt: <span id="go-dmg-dealt" style="color: #ffaa00; font-weight: bold; float: right;">0</span></p>
                        <p style="margin: 5px 0; font-size: 16px;">Damage Taken: <span id="go-dmg-taken" style="color: #ff4444; font-weight: bold; float: right;">0</span></p>
                        <p style="margin: 5px 0; font-size: 16px;">Money Earned: <span id="go-run-money" style="color: #ffd700; font-weight: bold; float: right;">0</span></p>
                    </div>
                </div>
                <div style="display: flex; justify-content: center; width: 100%;">
                    <button id="btn-go-home" class="cyber-btn">RETURN HOME</button>
                </div>
            </div>
        `);

        // Reward Screen (New)
        this.screens.reward = this.createScreen('reward-screen', `
            <h2>SELECT ITEM</h2>
            <div id="reward-container" class="shop-container">
                <!-- Relic cards injected here -->
            </div>
            <button id="btn-close-reward" class="cyber-btn secondary">CLOSE (Cancel)</button>
        `);

        // Skill Tree Screen
        this.screens.skilltree = this.createScreen('skilltree-screen', `
            <div id="skilltree-canvas-container" style="position: absolute; top:0; left:0; width:100%; height:100%; overflow:hidden;"></div>
            
            <div style="position: absolute; top: 20px; left: 20px; z-index: 10;">
                <h2 style="margin: 0; text-shadow: 0 0 10px #00ffff;">NEURAL NETWORK</h2>
                <p style="margin: 5px 0; color: #00ffff;">Money: <span id="skill-money">0</span></p>
                <div style="display: flex; gap: 10px; margin-top: 10px;">
                    <button id="btn-skill-back" class="cyber-btn secondary small">RETURN</button>
                    <button id="btn-skill-reset" class="cyber-btn secondary small" style="background: rgba(255,0,0,0.2); border-color: #ff4444; color: #ff4444;">RESET TREE</button>
                </div>
            </div>

            <div id="skill-detail-panel" style="position: absolute; bottom: 20px; right: 20px; width: 300px; background: rgba(0,0,0,0.8); border: 2px solid #00ffff; border-radius: 5px; padding: 15px; display: none; flex-direction: column; z-index: 10; box-shadow: 0 0 15px rgba(0,255,255,0.2);">
                <h3 id="skill-detail-name" style="margin: 0 0 10px 0; font-size: 18px; border-bottom: 1px solid #333; padding-bottom: 5px;">Node Name</h3>
                <p id="skill-detail-desc" style="margin: 0 0 15px 0; font-size: 14px; color: #ccc;">Description goes here.</p>
                <button id="btn-skill-unlock" class="cyber-btn" style="width: 100%;">UNLOCK</button>
            </div>
        `);

        // Bind Events
        this.bindEvents();

        // Draw Previews
        setTimeout(() => this.drawCharacterPreviews(), 100);
    }

    bindButton(id, action) {
        const btn = document.getElementById(id);
        if (!btn) return;

        const handlePress = (e) => {
            if (e.type === 'touchstart') {
                e.preventDefault(); // Prevent ghost click
            }
            try {
                console.log(`Button pressed: ${id}`);
                action(e);
            } catch (err) {
                console.error(err);
                alert(`Error: ${err.message}`);
            }
        };

        btn.addEventListener('touchstart', handlePress, { passive: false });
        btn.addEventListener('click', handlePress);
    }

    createScreen(id, content) {
        const div = document.createElement('div');
        div.id = id;
        div.className = 'ui-screen hidden';
        div.innerHTML = content;
        this.uiLayer.appendChild(div);
        return div;
    }

    bindEvents() {
        // Title
        this.bindButton('btn-start', () => this.game.setState('home'));
        this.bindButton('btn-options', () => this.showScreen('options'));

        // Reset Button
        this.bindButton('btn-reset', () => {
            if (confirm('全てのゲームデータをリセットしますか？\nReset all game data?')) {
                localStorage.clear();
                alert('データがリセットされました！\nData has been reset!');
                location.reload();
            }
        });

        // Options
        this.bindButton('btn-close-options', () => {
            if (this.isIngameOptions) {
                this.isIngameOptions = false;
                this.game.setState('playing');
            } else {
                this.showScreen('title');
                this.game.state = 'title';
            }
        });

        // HUD Pause
        this.bindButton('btn-hud-pause', () => {
            this.isIngameOptions = true;
            this.game.setState('options');
        });

        const chkDebug = document.getElementById('chk-debug');
        if (chkDebug) {
            chkDebug.addEventListener('change', (e) => {
                this.game.debugMode = e.target.checked;
                console.log('Debug Mode:', this.game.debugMode);
            });
        }

        const btnDebugMoney = document.getElementById('btn-debug-money');
        if (btnDebugMoney) {
            btnDebugMoney.addEventListener('click', () => {
                this.game.money = (this.game.money || 0) + 10000;
                this.game.upgradeSystem.save();
                console.log('Debug Money Added! Total:', this.game.money);
                
                // Update money display on Home Screen
                const elHome = document.getElementById('player-money');
                if (elHome) elHome.innerText = this.game.money;
                
                // Update money display on SkillTree Screen
                const elSkill = document.getElementById('skill-money');
                if (elSkill) elSkill.innerText = this.game.money;
            });
        }

        const selBoss = document.getElementById('debug-boss-select');
        if (selBoss) {
            selBoss.addEventListener('change', (e) => {
                this.game.debugBoss = e.target.value;
                console.log('Debug Boss Set:', this.game.debugBoss);
            });
        }

        // Debug: Test Ability Buttons (Dynamic Generation)
        const container = document.getElementById('debug-abilities-container');
        if (container) {
            container.innerHTML = '';
            const categoryOrder = { red: 1, blue: 2, green: 3, yellow: 4, orange: 5, none: 6 };
            const sortedRelics = [...this.relics].sort((a, b) => {
                const catA = categoryOrder[a.category] || 9;
                const catB = categoryOrder[b.category] || 9;
                if (catA !== catB) return catA - catB;
                return a.name.localeCompare(b.name);
            });

            sortedRelics.forEach(relic => {
                if (relic.id === 'phoenix_heart_used') return;

                const btn = document.createElement('button');
                btn.className = 'cyber-btn small debug-ability-btn';
                btn.style.fontSize = '10px';
                btn.style.padding = '4px 6px';
                btn.style.margin = '2px';
                btn.style.borderColor = relic.color;
                btn.style.color = relic.color;
                btn.style.flex = '1 1 auto';
                btn.style.textAlign = 'center';
                btn.textContent = relic.name;
                if (relic.disabled) {
                    btn.textContent += ' [DIS]';
                }
                
                btn.addEventListener('click', () => {
                    const msgEl = document.getElementById('debug-ability-msg');
                    const p = this.game.player;
                    if (!p) {
                        if (msgEl) msgEl.textContent = '⚠ ゲームプレイ中のみ使用可能 (Start a run first)';
                        return;
                    }
                    try {
                        relic.effect(p);
                        this.game.acquiredRelics.push(relic);
                        if (msgEl) msgEl.textContent = `✔ Applied: ${relic.name}`;
                        this.game.audio.playUpgrade();
                    } catch(err) {
                        if (msgEl) msgEl.textContent = `✖ Error: ${err.message}`;
                    }
                });
                container.appendChild(btn);
            });
        }

        // Home
        this.bindButton('btn-mission', () => {
            this.game.startRun();
            this.game.setState('playing');
        });

        this.bindButton('btn-gacha', () => {
            const relic = this.game.upgradeSystem.performGacha();
            if (relic) {
                this.showMessage(`TECH SALVAGE: ${relic.name}!`);
                this.updateHome();
            } else {
                this.showMessage(`Not enough Money!`, 2000);
            }
        });

        this.bindButton('btn-skilltree', () => {
            if(this.game.skillTreeUI) this.game.skillTreeUI.refresh();
            this.game.setState('skilltree');
        });

        this.bindButton('btn-skill-back', () => {
            this.game.setState('home');
        });

        // Back to Title from Home
        this.bindButton('btn-back-title', () => this.game.setState('title'));

        const CHARACTER_PRICES = { girl: 0, cat: 1000, boy: 1000, dog: 1000 };
        const charCards = document.querySelectorAll('.char-card');
        charCards.forEach(card => {
            const handleSelect = (e) => {
                if (e.type === 'touchstart') e.preventDefault();
                
                const charId = card.dataset.char;
                const unlockedChars = this.game.upgradeSystem.unlockedCharacters || ['girl'];
                
                if (unlockedChars.includes(charId)) {
                    // Already unlocked -> Select
                    charCards.forEach(c => c.classList.remove('selected'));
                    card.classList.add('selected');
                    this.game.selectedCharacter = charId;
                } else {
                    // Try to unlock
                    const price = CHARACTER_PRICES[charId];
                    if (this.game.money >= price) {
                        this.game.money -= price;
                        unlockedChars.push(charId);
                        this.game.upgradeSystem.unlockedCharacters = unlockedChars;
                        this.game.upgradeSystem.save();
                        this.game.audio.playUpgrade();
                        
                        // Select it after unlocking
                        charCards.forEach(c => c.classList.remove('selected'));
                        card.classList.add('selected');
                        this.game.selectedCharacter = charId;
                        
                        this.updateHome();
                    } else {
                        this.game.audio.playError();
                        this.showMessage('Not enough Money!', 2000);
                    }
                }
            };
            card.addEventListener('touchstart', handleSelect, { passive: false });
            card.addEventListener('click', handleSelect);
        });

        // Difficulty Selection
        const diffBtns = document.querySelectorAll('.difficulty-btn');
        diffBtns.forEach(btn => {
            const handleSelect = (e) => {
                if (e.type === 'touchstart') e.preventDefault();
                const diff = btn.dataset.diff;
                this.game.setDifficulty(diff);
                this.updateHome();
            };
            btn.addEventListener('touchstart', handleSelect, { passive: false });
            btn.addEventListener('click', handleSelect);
        });

        // Result
        this.bindButton('btn-loop', () => this.game.proceedToNextStage());
        this.bindButton('btn-return-home', () => this.game.returnToHomeAfterVictory());
        this.bindButton('btn-cancel-result', () => this.game.cancelStageTransition());

        // Victory
        this.bindButton('btn-victory-home', () => this.game.setState('home'));

        // Game Over
        this.bindButton('btn-go-home', () => this.game.setState('home'));

        // Reward close button
        this.bindButton('btn-close-reward', () => {
            this.game.closeRewardWithoutPurchase();
        });
    }

    drawCharacterPreviews() {
        const cards = document.querySelectorAll('.char-card');
        cards.forEach(card => {
            const canvas = card.querySelector('canvas');
            const ctx = canvas.getContext('2d');
            const charType = card.dataset.char;

            // Clear
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw using same style as Player.js
            const cx = canvas.width / 2;
            const cy = canvas.height / 2;
            const radius = 16;

            let color = '#fff';
            if (charType === 'girl') color = '#ff00ff';
            if (charType === 'cat') color = '#00ffff';
            if (charType === 'boy') color = '#00ff00';
            if (charType === 'dog') color = '#ff8800';

            ctx.save();
            ctx.translate(cx, cy);

            // Main Body Glow
            ctx.shadowBlur = 15;
            ctx.shadowColor = color;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            ctx.fill();

            // Tech Lines / Circuitry
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, radius * 0.7, 0, Math.PI * 2);
            ctx.stroke();

            // Inner White Core
            ctx.shadowBlur = 8;
            ctx.shadowColor = '#fff';
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(0, 0, radius * 0.4, 0, Math.PI * 2);
            ctx.fill();

            // Accessories (Match Player.js style)
            ctx.fillStyle = color;
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.shadowBlur = 8;
            ctx.shadowColor = color;

            if (charType === 'cat') {
                // Obtuse Cat Ears (Wider and Shorter)
                ctx.beginPath();
                ctx.moveTo(-12, -8);
                ctx.lineTo(-18, -16);
                ctx.lineTo(-4, -14);
                ctx.fill();
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(12, -8);
                ctx.lineTo(18, -16);
                ctx.lineTo(4, -14);
                ctx.fill();
                ctx.stroke();

                // Whiskers
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 1;
                ctx.beginPath();
                // Left
                ctx.moveTo(-4, 2); ctx.lineTo(-14, 0);
                ctx.moveTo(-4, 4); ctx.lineTo(-14, 5);
                // Right
                ctx.moveTo(4, 2); ctx.lineTo(14, 0);
                ctx.moveTo(4, 4); ctx.lineTo(14, 5);
                ctx.stroke();

                // Cyber Tail (Static for preview)
                ctx.strokeStyle = color;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(0, radius * 0.8);
                ctx.quadraticCurveTo(12, radius + 4, 14, radius - 4);
                ctx.stroke();

            } else if (charType === 'girl') {
                // Small Halo at Top (Blue Archive style)
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
                ctx.lineWidth = 2;
                ctx.shadowBlur = 12;
                ctx.shadowColor = '#fff';
                ctx.beginPath();
                ctx.arc(0, -radius * 2.2, radius * 0.4, 0, Math.PI * 2);
                ctx.stroke();

                // Inner glow
                ctx.strokeStyle = color;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(0, -radius * 2.2, radius * 0.3, 0, Math.PI * 2);
                ctx.stroke();

                // Crystal Halo (Hexagon) - Small, above head
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.lineWidth = 2;
                ctx.shadowBlur = 8;
                ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const angle = (i / 6) * Math.PI * 2;
                    const hx = Math.cos(angle) * (radius * 0.6);
                    const hy = -radius * 2.2 + Math.sin(angle) * (radius * 0.6);
                    if (i === 0) ctx.moveTo(hx, hy);
                    else ctx.lineTo(hx, hy);
                }
                ctx.closePath();
                ctx.stroke();

                // Orbital Ring
                ctx.strokeStyle = color;
                ctx.beginPath();
                ctx.ellipse(0, 0, radius * 2.0, radius * 0.6, Math.PI / 4, 0, Math.PI * 2);
                ctx.stroke();

                // Particle Tail (Static for preview)
                ctx.fillStyle = color;
                for (let i = 1; i <= 3; i++) {
                    ctx.beginPath();
                    ctx.arc(-i * 8, 12, 3 - i, 0, Math.PI * 2);
                    ctx.fill();
                }

            } else if (charType === 'dog') {
                // Dog Ears (Static for preview)
                ctx.fillStyle = '#ffaa00';
                // Left Ear
                ctx.beginPath();
                ctx.ellipse(-14, -4, 6, 11, Math.PI / 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                // Right Ear
                ctx.beginPath();
                ctx.ellipse(14, -4, 6, 11, -Math.PI / 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                // Collar
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(0, 8, 10, 0, Math.PI);
                ctx.stroke();

            } else if (charType === 'boy') {
                // Cooler Cyber Ninja - Dark tactical helmet
                ctx.fillStyle = '#004400';
                ctx.shadowBlur = 0;
                ctx.beginPath();
                // Helmet shape
                ctx.arc(0, -2, radius * 1.1, Math.PI * 0.8, Math.PI * 0.2);
                ctx.lineTo(radius * 0.9, 5);
                ctx.lineTo(-radius * 0.9, 5);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // Glowing Eye Visor (horizontal line)
                ctx.fillStyle = color;
                ctx.shadowBlur = 15;
                ctx.shadowColor = color;
                ctx.beginPath();
                ctx.rect(-radius * 0.8, -4, radius * 1.6, 2.5);
                ctx.fill();

                // Forehead plate detail
                ctx.strokeStyle = color;
                ctx.lineWidth = 1.5;
                ctx.shadowBlur = 8;
                ctx.beginPath();
                ctx.moveTo(-5, -7);
                ctx.lineTo(0, -10);
                ctx.lineTo(5, -7);
                ctx.stroke();

                // Shoulder guards
                ctx.fillStyle = '#003300';
                ctx.shadowBlur = 0;
                ctx.beginPath();
                ctx.moveTo(-radius, 7);
                ctx.lineTo(-radius * 1.3, 10);
                ctx.lineTo(-radius * 1.1, 15);
                ctx.lineTo(-radius * 0.8, 12);
                ctx.fill();
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(radius, 7);
                ctx.lineTo(radius * 1.3, 10);
                ctx.lineTo(radius * 1.1, 15);
                ctx.lineTo(radius * 0.8, 12);
                ctx.fill();
                ctx.stroke();
            }

            ctx.restore();
        });
    }


    showRewardSelection(predefinedRelics = null, fixedDifficulty = null) {
        const container = document.getElementById('reward-container');
        container.innerHTML = '';

        let choices;
        if (predefinedRelics && predefinedRelics.length > 0) {
            choices = predefinedRelics;
        } else {
            // Fallback: Pick 3 random relics, respecting the 5-weapon limit
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
            if (this.game.acquiredRelics) {
                this.game.acquiredRelics.forEach(r => {
                    if (ATTACK_RELIC_IDS.includes(r.id)) {
                        ownedAttacks.add(r.id);
                    }
                });
            }

            let pool = [...this.relics].filter(r => r.category !== 'none' && !r.disabled);
            if (ownedAttacks.size >= 5) {
                pool = pool.filter(r => {
                    if (ATTACK_RELIC_IDS.includes(r.id)) {
                        return ownedAttacks.has(r.id);
                    }
                    return true;
                });
            }

            const shuffled = pool.sort(() => 0.5 - Math.random());
            choices = shuffled.slice(0, 3);
        }

        // Calculate cost multiplier based on fixed difficulty (from chest) or current difficulty
        const currentDifficulty = fixedDifficulty || (this.game.waveManager ? this.game.waveManager.difficulty : 1.0);
        const priceScaling = 0.6 * Math.pow(currentDifficulty, 2.0);

        // Stage-based bonus: +50 per stage (Stage 1 = +0, Stage 2 = +50, etc.)
        const stageBonus = Math.max(0, (this.game.mapLevel - 1) * 50);

        choices.forEach(relic => {
            const scaledCost = Math.ceil(relic.cost * priceScaling) + stageBonus;
            const card = document.createElement('div');
            card.className = 'relic-card';

            const iconCanvas = document.createElement('canvas');
            iconCanvas.width = 64;
            iconCanvas.height = 64;
            iconCanvas.className = 'relic-icon';

            const ctx = iconCanvas.getContext('2d');
            this.drawRelicIcon(ctx, relic.id, 64, 64, relic.color);
            card.appendChild(iconCanvas);

            card.style.borderColor = relic.rarityBorder;
            card.style.borderWidth = '3px';

            const info = document.createElement('div');
            info.innerHTML = `
                <h3>${relic.name}</h3>
                <p>${relic.desc}</p>
                <p class="relic-cost">Cost: ${scaledCost} Ene</p>
            `;
            card.appendChild(info);

            if (this.game.ene < scaledCost) {
                card.style.opacity = '0.5';
                card.style.pointerEvents = 'none';
                info.querySelector('.relic-cost').style.color = '#ff4444';
            }

            const handleBuy = (e) => {
                if (e.type === 'touchstart') e.preventDefault();
                if (this.game.ene >= scaledCost) {
                    const relicToBuy = { ...relic, cost: scaledCost };
                    this.game.applyRelic(relicToBuy);
                } else {
                    card.style.border = '2px solid red';
                    setTimeout(() => card.style.border = '', 500);
                }
            };

            card.addEventListener('touchstart', handleBuy, { passive: false });
            card.addEventListener('click', handleBuy);
            container.appendChild(card);
        });

        this.showScreen('reward');
    }

    drawRelicIcon(ctx, id, w, h, color) {
        const cx = w / 2;
        const cy = h / 2;

        ctx.clearRect(0, 0, w, h);

        // Glow
        ctx.shadowBlur = 15;
        ctx.shadowColor = color;
        ctx.fillStyle = color;
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;

        if (id.startsWith('atk_up')) {
            // Cyber Katana (Sword)
            ctx.beginPath();
            ctx.moveTo(cx - 10, cy + 10);
            ctx.lineTo(cx + 15, cy - 15); // Blade
            ctx.stroke();
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(cx - 10, cy + 10);
            ctx.lineTo(cx - 15, cy + 15); // Handle
            ctx.stroke();
            // Tsuba (Guard)
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(cx - 8, cy + 8);
            ctx.lineTo(cx - 12, cy + 12);
            ctx.stroke();
        } else if (id.startsWith('spd_up')) {
            // Neko Headphones
            ctx.beginPath();
            ctx.arc(cx, cy, 15, Math.PI, 0); // Band
            ctx.stroke();
            // Ear cups
            ctx.fillRect(cx - 18, cy - 5, 6, 15);
            ctx.fillRect(cx + 12, cy - 5, 6, 15);
            // Cat ears
            ctx.beginPath();
            ctx.moveTo(cx - 10, cy - 15);
            ctx.lineTo(cx - 5, cy - 25);
            ctx.lineTo(cx, cy - 15);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(cx + 10, cy - 15);
            ctx.lineTo(cx + 5, cy - 25);
            ctx.lineTo(cx, cy - 15);
            ctx.fill();
        } else if (id.startsWith('hp_up')) {
            // Energy Drink (Can)
            ctx.fillRect(cx - 10, cy - 15, 20, 30);
            ctx.fillStyle = '#fff';
            ctx.fillRect(cx - 5, cy - 5, 10, 10); // Logo
        } else if (id.startsWith('rate_up')) {
            // Overclock Chip
            ctx.strokeRect(cx - 12, cy - 12, 24, 24);
            ctx.fillRect(cx - 6, cy - 6, 12, 12); // Core
            // Pins
            ctx.beginPath();
            ctx.moveTo(cx - 12, cy); ctx.lineTo(cx - 18, cy);
            ctx.moveTo(cx + 12, cy); ctx.lineTo(cx + 18, cy);
            ctx.moveTo(cx, cy - 12); ctx.lineTo(cx, cy - 18);
            ctx.moveTo(cx, cy + 12); ctx.lineTo(cx, cy + 18);
            ctx.stroke();
        } else if (id === 'range_up') {
            // Scope Lens
            ctx.beginPath();
            ctx.arc(cx, cy, 12, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(cx, cy, 6, 0, Math.PI * 2);
            ctx.fill();
            // Crosshair
            ctx.beginPath();
            ctx.moveTo(cx - 15, cy); ctx.lineTo(cx + 15, cy);
            ctx.moveTo(cx, cy - 15); ctx.lineTo(cx, cy + 15);
            ctx.stroke();
        } else if (id === 'drone') {
            // Drone Icon
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(cx, cy, 8, 0, Math.PI * 2); // Body
            ctx.fill();
            // Rotors
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(cx - 12, cy - 12); ctx.lineTo(cx + 12, cy + 12); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(cx + 12, cy - 12); ctx.lineTo(cx - 12, cy + 12); ctx.stroke();
        } else if (id === 'missile') {
            // Missile Icon
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(cx, cy - 15);
            ctx.lineTo(cx + 8, cy + 10);
            ctx.lineTo(cx, cy + 5);
            ctx.lineTo(cx - 8, cy + 10);
            ctx.fill();
        } else if (id === 'pierce_shot') {
            // Plasma Orb (貫通弾)
            ctx.beginPath();
            ctx.arc(cx, cy, 10, 0, Math.PI * 2);
            ctx.fill();
            // Inner glow
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(cx, cy, 5, 0, Math.PI * 2);
            ctx.fill();
            // Energy trails
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            for (let i = 0; i < 3; i++) {
                ctx.beginPath();
                ctx.moveTo(cx - 15 - i * 3, cy);
                ctx.lineTo(cx - 10 - i * 3, cy);
                ctx.stroke();
            }
        } else if (id.startsWith('hp_regen')) {
            // Nano Repair (HP回復)
            ctx.beginPath();
            ctx.arc(cx, cy, 12, 0, Math.PI * 2);
            ctx.stroke();
            // Plus sign
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(cx - 6, cy);
            ctx.lineTo(cx + 6, cy);
            ctx.moveTo(cx, cy - 6);
            ctx.lineTo(cx, cy + 6);
            ctx.stroke();
            // Pulse rings
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(cx, cy, 16, 0, Math.PI * 2);
            ctx.stroke();
        } else if (id.startsWith('crit_chance')) {
            // Lucky Dice (クリティカル)
            ctx.strokeRect(cx - 10, cy - 10, 20, 20);
            ctx.fillRect(cx - 10, cy - 10, 20, 20);
            // Dots
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(cx - 4, cy - 4, 2, 0, Math.PI * 2);
            ctx.arc(cx + 4, cy + 4, 2, 0, Math.PI * 2);
            ctx.arc(cx, cy, 2, 0, Math.PI * 2);
            ctx.fill();
            // Star sparkle
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.moveTo(cx + 8, cy - 8);
            ctx.lineTo(cx + 10, cy - 10);
            ctx.lineTo(cx + 12, cy - 8);
            ctx.lineTo(cx + 10, cy - 6);
            ctx.fill();
        } else if (id.startsWith('projectile_size')) {
            // Amplifier Core (弾サイズ)
            ctx.beginPath();
            ctx.arc(cx, cy, 6, 0, Math.PI * 2);
            ctx.fill();
            // Expanding waves
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(cx, cy, 10, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(cx, cy, 14, 0, Math.PI * 2);
            ctx.stroke();
            // Arrow indicators
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(cx - 8, cy);
            ctx.lineTo(cx - 14, cy);
            ctx.lineTo(cx - 11, cy - 3);
            ctx.moveTo(cx - 14, cy);
            ctx.lineTo(cx - 11, cy + 3);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(cx + 8, cy);
            ctx.lineTo(cx + 14, cy);
            ctx.lineTo(cx + 11, cy - 3);
            ctx.moveTo(cx + 14, cy);
            ctx.lineTo(cx + 11, cy + 3);
            ctx.stroke();
        } else if (id === 'shield_gen') {
            // Energy Barrier (シールド)
            ctx.beginPath();
            ctx.moveTo(cx, cy - 15);
            ctx.lineTo(cx + 12, cy - 5);
            ctx.lineTo(cx + 12, cy + 10);
            ctx.lineTo(cx, cy + 15);
            ctx.lineTo(cx - 12, cy + 10);
            ctx.lineTo(cx - 12, cy - 5);
            ctx.closePath();
            ctx.stroke();
            ctx.fill();
            // Inner shield pattern
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(cx, cy - 10);
            ctx.lineTo(cx + 8, cy - 2);
            ctx.lineTo(cx + 8, cy + 8);
            ctx.lineTo(cx, cy + 12);
            ctx.lineTo(cx - 8, cy + 8);
            ctx.lineTo(cx - 8, cy - 2);
            ctx.closePath();
            ctx.stroke();
        } else if (id === 'multishot') {
            // Splitter Module (マルチショット)
            ctx.lineWidth = 3;
            // Main beam
            ctx.beginPath();
            ctx.moveTo(cx - 15, cy);
            ctx.lineTo(cx - 5, cy);
            ctx.stroke();
            // Split arrows
            ctx.beginPath();
            ctx.moveTo(cx - 5, cy);
            ctx.lineTo(cx + 10, cy - 8);
            ctx.lineTo(cx + 15, cy - 8);
            ctx.lineTo(cx + 12, cy - 11);
            ctx.moveTo(cx + 15, cy - 8);
            ctx.lineTo(cx + 12, cy - 5);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(cx - 5, cy);
            ctx.lineTo(cx + 10, cy);
            ctx.lineTo(cx + 15, cy);
            ctx.lineTo(cx + 12, cy - 3);
            ctx.moveTo(cx + 15, cy);
            ctx.lineTo(cx + 12, cy + 3);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(cx - 5, cy);
            ctx.lineTo(cx + 10, cy + 8);
            ctx.lineTo(cx + 15, cy + 8);
            ctx.lineTo(cx + 12, cy + 5);
            ctx.moveTo(cx + 15, cy + 8);
            ctx.lineTo(cx + 12, cy + 11);
            ctx.stroke();
        } else if (id.startsWith('armor_plate')) {
            // Titanium Plating (防御)
            ctx.fillRect(cx - 12, cy - 10, 24, 20);
            // Rivets
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(cx - 8, cy - 6, 2, 0, Math.PI * 2);
            ctx.arc(cx + 8, cy - 6, 2, 0, Math.PI * 2);
            ctx.arc(cx - 8, cy + 6, 2, 0, Math.PI * 2);
            ctx.arc(cx + 8, cy + 6, 2, 0, Math.PI * 2);
            ctx.fill();
            // Armor lines
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(cx - 10, cy);
            ctx.lineTo(cx + 10, cy);
            ctx.stroke();
        } else if (id === 'lifesteal') {
            // Vampire Fang (ライフスティール)
            ctx.beginPath();
            ctx.arc(cx, cy + 5, 10, Math.PI, 0);
            ctx.fill();
            // Fangs
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.moveTo(cx - 5, cy + 5);
            ctx.lineTo(cx - 3, cy + 12);
            ctx.lineTo(cx - 1, cy + 5);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(cx + 1, cy + 5);
            ctx.lineTo(cx + 3, cy + 12);
            ctx.lineTo(cx + 5, cy + 5);
            ctx.fill();
            // Blood drops
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(cx - 3, cy + 14, 2, 0, Math.PI * 2);
            ctx.arc(cx + 3, cy + 14, 2, 0, Math.PI * 2);
            ctx.fill();
        } else if (id === 'time_warp') {
            // Chrono Lens (時間加速)
            ctx.beginPath();
            ctx.arc(cx, cy, 12, 0, Math.PI * 2);
            ctx.stroke();
            // Clock hands
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx, cy - 8);
            ctx.stroke();
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + 6, cy);
            ctx.stroke();
            // Speed lines
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(cx + 15, cy - 5);
            ctx.lineTo(cx + 20, cy - 5);
            ctx.moveTo(cx + 15, cy + 5);
            ctx.lineTo(cx + 20, cy + 5);
            ctx.stroke();
        } else if (id === 'phoenix_heart' || id === 'phoenix_heart_used') {
            // Phoenix Heart (復活) - same design for both active and used versions
            ctx.beginPath();
            ctx.moveTo(cx, cy + 10);
            ctx.bezierCurveTo(cx - 8, cy + 2, cx - 12, cy - 6, cx, cy - 12);
            ctx.bezierCurveTo(cx + 12, cy - 6, cx + 8, cy + 2, cx, cy + 10);
            ctx.fill();
            // Flame effect
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.moveTo(cx, cy - 8);
            ctx.lineTo(cx - 2, cy - 4);
            ctx.lineTo(cx, cy);
            ctx.lineTo(cx + 2, cy - 4);
            ctx.closePath();
            ctx.fill();
            // Phoenix wings
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(cx - 8, cy);
            ctx.lineTo(cx - 14, cy - 8);
            ctx.lineTo(cx - 10, cy - 12);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(cx + 8, cy);
            ctx.lineTo(cx + 14, cy - 8);
            ctx.lineTo(cx + 10, cy - 12);
            ctx.stroke();
        } else if (id === 'volatile_core') {
            // Volatile Core: Spiky ball
            ctx.beginPath();
            for (let i = 0; i < 16; i++) {
                const r = i % 2 === 0 ? 15 : 8;
                const angle = (i / 16) * Math.PI * 2;
                ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
            }
            ctx.closePath();
            ctx.fill();
            // Core glow
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(cx, cy, 4, 0, Math.PI * 2);
            ctx.fill();
        } else if (id === 'soul_seekers') {
            // Soul Seekers: Skull or Wisp
            ctx.beginPath();
            ctx.arc(cx, cy - 4, 8, 0, Math.PI * 2);
            ctx.fill();
            // Tail
            ctx.beginPath();
            ctx.moveTo(cx - 8, cy - 4);
            ctx.quadraticCurveTo(cx - 5, cy + 10, cx, cy + 15);
            ctx.quadraticCurveTo(cx + 5, cy + 10, cx + 8, cy - 4);
            ctx.fill();
            // Eyes
            ctx.fillStyle = '#000';
            ctx.beginPath(); ctx.arc(cx - 3, cy - 4, 1.5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(cx + 3, cy - 4, 1.5, 0, Math.PI * 2); ctx.fill();
        } else if (id === 'chain_lightning') {
            // Chain Lightning: Lightning bolt
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(cx + 5, cy - 15);
            ctx.lineTo(cx - 5, cy);
            ctx.lineTo(cx + 3, cy);
            ctx.lineTo(cx - 5, cy + 15);
            ctx.stroke();
            // Sparks
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(cx + 10, cy); ctx.lineTo(cx + 15, cy - 5); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(cx - 10, cy); ctx.lineTo(cx - 15, cy + 5); ctx.stroke();
        } else if (id === 'frost_aura') {
            // Frost Aura: Snowflake
            ctx.lineWidth = 2;
            for (let i = 0; i < 6; i++) {
                const angle = (i / 6) * Math.PI * 2;
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.lineTo(cx + Math.cos(angle) * 14, cy + Math.sin(angle) * 14);
                ctx.stroke();
                // Spikes
                const px = cx + Math.cos(angle) * 10;
                const py = cy + Math.sin(angle) * 10;
                const a1 = angle + Math.PI / 3;
                const a2 = angle - Math.PI / 3;
                ctx.beginPath();
                ctx.moveTo(px, py); ctx.lineTo(px + Math.cos(a1) * 5, py + Math.sin(a1) * 5);
                ctx.moveTo(px, py); ctx.lineTo(px + Math.cos(a2) * 5, py + Math.sin(a2) * 5);
                ctx.stroke();
            }
        } else if (id === 'executioner') {
            // Executioner: Axe
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(cx, cy - 15);
            ctx.lineTo(cx, cy + 15); // Handle
            ctx.stroke();
            // Blade
            ctx.beginPath();
            ctx.moveTo(cx, cy - 5);
            ctx.quadraticCurveTo(cx + 12, cy - 10, cx + 15, cy - 5);
            ctx.lineTo(cx + 15, cy + 5);
            ctx.quadraticCurveTo(cx + 12, cy + 10, cx, cy + 5);
            ctx.fill();
        } else if (id === 'orbital_blades') {
            // Orbital Blades: Orbiting circles/lines
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(cx, cy, 12, 0, Math.PI * 2);
            ctx.stroke();
            // Blades
            for (let i = 0; i < 3; i++) {
                const angle = (i / 3) * Math.PI * 2;
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(cx + Math.cos(angle) * 12, cy + Math.sin(angle) * 12, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (id === 'vampiric_aura') {
            // Vampiric Aura: Swirl
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(cx, cy, 10, 0, Math.PI * 2);
            ctx.stroke();
            // Spiral
            ctx.beginPath();
            for (let i = 0; i < 20; i++) {
                const r = i / 2;
                const angle = i / 2;
                ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
            }
            ctx.stroke();
        } else if (id === 'satellite_beam') {
            // Satellite Beam: Circle with crosshair and lines from top
            ctx.beginPath();
            ctx.arc(cx, cy, 10, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(cx - 15, cy); ctx.lineTo(cx + 15, cy);
            ctx.moveTo(cx, cy - 15); ctx.lineTo(cx, cy + 15);
            ctx.stroke();
            // Beam from top
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(cx, cy - 20); ctx.lineTo(cx, cy - 10);
            ctx.stroke();
        } else if (id === 'singularity') {
            // Singularity: Vortex/Spiral
            ctx.lineWidth = 3;
            ctx.beginPath();
            for (let i = 0; i < 30; i++) {
                const r = 15 - i * 0.5;
                const angle = i * 0.5;
                ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
            }
            ctx.stroke();
        } else if (id === 'cyber_mine') {
            // Cyber Mine: Circle with blinking light and spikes
            ctx.beginPath();
            ctx.arc(cx, cy, 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ff0000';
            ctx.beginPath();
            ctx.arc(cx, cy, 4, 0, Math.PI * 2);
            ctx.fill();
            // Spikes
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            for (let i = 0; i < 4; i++) {
                const angle = (i / 4) * Math.PI * 2;
                ctx.beginPath();
                ctx.moveTo(cx + Math.cos(angle) * 12, cy + Math.sin(angle) * 12);
                ctx.lineTo(cx + Math.cos(angle) * 18, cy + Math.sin(angle) * 18);
                ctx.stroke();
            }
        } else if (id === 'railgun') {
            // Railgun: Long triangle/line with sparks
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(cx - 15, cy);
            ctx.lineTo(cx + 15, cy);
            ctx.stroke();
            // Sparks
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(cx + 10, cy - 5); ctx.lineTo(cx + 15, cy - 10);
            ctx.moveTo(cx + 10, cy + 5); ctx.lineTo(cx + 15, cy + 10);
            ctx.stroke();
        } else if (id === 'boomerang_blade') {
            // Boomerang Blade: V-shape
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(cx - 12, cy - 8);
            ctx.lineTo(cx, cy + 12);
            ctx.lineTo(cx + 12, cy - 8);
            ctx.stroke();
        } else if (id === 'drone_swarm') {
            // Drone Swarm: Multiple small triangles
            ctx.fillStyle = color;
            for (let i = 0; i < 3; i++) {
                const angle = (i / 3) * Math.PI * 2;
                const dx = cx + Math.cos(angle) * 10;
                const dy = cy + Math.sin(angle) * 10;
                ctx.beginPath();
                ctx.moveTo(dx, dy - 4);
                ctx.lineTo(dx + 4, dy + 4);
                ctx.lineTo(dx - 4, dy + 4);
                ctx.closePath();
                ctx.fill();
            }
        } else if (id === 'cyber_fangs') {
            // Cyber Fangs: Multiple triangles pointing up
            ctx.fillStyle = color;
            for (let i = 0; i < 3; i++) {
                const dx = cx - 10 + i * 10;
                ctx.beginPath();
                ctx.moveTo(dx, cy + 10);
                ctx.lineTo(dx + 5, cy - 5);
                ctx.lineTo(dx + 10, cy + 10);
                ctx.closePath();
                ctx.fill();
            }
        } else {
            // Default: Cool Hexagon instead of boring circle
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (i / 6) * Math.PI * 2;
                ctx.lineTo(cx + Math.cos(angle) * 15, cy + Math.sin(angle) * 15);
            }
            ctx.closePath();
            ctx.fill();
            // Inner pattern
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (i / 6) * Math.PI * 2;
                ctx.lineTo(cx + Math.cos(angle) * 8, cy + Math.sin(angle) * 8);
            }
            ctx.closePath();
            ctx.stroke();
        }
    }

    showScreen(name) {
        Object.values(this.screens).forEach(s => s.classList.add('hidden'));
        if (this.screens[name]) {
            this.screens[name].classList.remove('hidden');
        }
        if (name === 'home') {
            this.drawCharacterPreviews();
            this.updateHome(); // Update difficulty buttons and other home screen elements
        }
    }

    updateHUD(hpPercent, ene, currentHp, maxHp, time, difficulty, currentShield = 0, maxShield = 0) {
        document.getElementById('hp-bar').style.width = `${hpPercent}%`;

        // Update Shield Bar
        const shieldBar = document.getElementById('shield-bar');
        if (shieldBar) {
            console.log('Shield Debug:', { currentShield, maxShield, shieldBar });
            if (maxShield > 0) {
                const shieldPercent = (currentShield / maxShield) * 100;
                shieldBar.style.width = `${shieldPercent}%`;
                shieldBar.style.display = 'block';
                console.log('Shield Bar Updated:', shieldPercent + '%', shieldBar.style.width);
            } else {
                shieldBar.style.display = 'none';
            }
        }

        document.getElementById('score-ene').innerText = ene;

        // Update HP Text (with shield)
        if (currentHp !== undefined && maxHp !== undefined) {
            let hpText = `${Math.ceil(currentHp)}/${Math.ceil(maxHp)}`;
            if (maxShield > 0) {
                hpText += ` (+${Math.ceil(currentShield)})`;
            }
            document.getElementById('hp-text').innerText = hpText;
        }

        // Update Time
        if (time !== undefined) {
            const m = Math.floor(time / 60).toString().padStart(2, '0');
            const s = Math.floor(time % 60).toString().padStart(2, '0');
            document.getElementById('game-time').innerText = `${m}:${s}`;
        }

        // Update Difficulty
        if (difficulty !== undefined) {
            document.getElementById('game-difficulty').innerText = `Lv. ${difficulty.toFixed(2)}`;
        }

        // Update Kill Counter
        const killCounter = document.getElementById('kill-counter-value');
        if (killCounter && this.game.waveManager) {
            const remaining = Math.max(0, this.game.waveManager.killsNeeded - this.game.waveManager.killsThisStage);
            if (this.game.waveManager.altarSpawned) {
                killCounter.innerText = "READY";
                killCounter.style.color = "#ff00ff";
                if (document.getElementById('kill-counter-label')) {
                    document.getElementById('kill-counter-label').innerText = "BOSS:";
                }
            } else {
                killCounter.innerText = remaining;
                killCounter.style.color = "#00ffff";
                if (document.getElementById('kill-counter-label')) {
                    document.getElementById('kill-counter-label').innerText = "SIGNAL:";
                }
            }
        }
    }

    updateHome() {
        document.getElementById('player-money').innerText = this.game.money;
        document.getElementById('gacha-cost').innerText = this.game.upgradeSystem.gachaCost;

        // Update Characters
        const CHARACTER_PRICES = { girl: 0, cat: 1000, boy: 1000, dog: 1000 };
        const unlockedChars = this.game.upgradeSystem.unlockedCharacters || ['girl'];
        const charCards = document.querySelectorAll('.char-card');
        
        charCards.forEach(card => {
            const charId = card.dataset.char;
            const isUnlocked = unlockedChars.includes(charId);
            
            let priceTag = card.querySelector('.char-price');
            if (!priceTag && !isUnlocked) {
                priceTag = document.createElement('div');
                priceTag.className = 'char-price';
                priceTag.style.position = 'absolute';
                priceTag.style.bottom = '5px';
                priceTag.style.left = '0';
                priceTag.style.width = '100%';
                priceTag.style.textAlign = 'center';
                priceTag.style.fontSize = '10px';
                priceTag.style.color = '#ff00ff';
                priceTag.style.fontWeight = 'bold';
                priceTag.style.textShadow = '0 0 5px #000';
                priceTag.style.zIndex = '5';
                priceTag.innerHTML = `🔒<br>${CHARACTER_PRICES[charId]}`;
                card.style.position = 'relative';
                card.appendChild(priceTag);
            }

            if (isUnlocked) {
                card.style.filter = 'none';
                card.style.opacity = '1.0';
                if (priceTag) priceTag.style.display = 'none';
            } else {
                card.style.filter = 'grayscale(100%)';
                card.style.opacity = '0.5';
                card.classList.remove('selected');
                if (priceTag) priceTag.style.display = 'block';
            }
        });

        // Update Reserved Item Preview
        const preview = document.getElementById('reserved-item-preview');
        if (preview) {
            preview.innerHTML = '';
            const reservedId = this.game.upgradeSystem.reservedRelicId;
            if (reservedId) {
                const relic = this.relics.find(r => r.id === reservedId);
                if (relic) {
                    const canvas = document.createElement('canvas');
                    canvas.width = 40;
                    canvas.height = 40;
                    this.drawRelicIcon(canvas.getContext('2d'), relic.id, 40, 40, relic.color);
                    preview.appendChild(canvas);

                    const info = document.createElement('div');
                    info.style.textAlign = 'left';
                    info.innerHTML = `
                        <div style="color:${relic.color}; font-size: 14px; font-weight: bold;">${relic.name}</div>
                        <div style="font-size: 10px; color: #aaa;">${relic.desc}</div>
                    `;
                    preview.appendChild(info);
                }
            } else {
                preview.innerHTML = '<span style="color: #666; font-style: italic;">None</span>';
            }
        }

        // Update Difficulty Buttons
        const diffBtns = document.querySelectorAll('.difficulty-btn');
        diffBtns.forEach(btn => {
            // Remove selected class and apply gray style
            btn.classList.remove('selected');
            btn.style.background = '#444';
            btn.style.boxShadow = 'none';
            btn.style.border = '2px solid #666';
            btn.style.transform = 'scale(1)';

            // If this is the selected difficulty, apply gradient style
            if (btn.dataset.diff === this.game.selectedDifficulty) {
                btn.classList.add('selected');
                btn.style.background = 'linear-gradient(45deg, #ff00ff, #00ffff)';
                btn.style.boxShadow = '0 0 15px rgba(255, 0, 255, 0.5)';
                btn.style.border = '2px solid #fff';
                btn.style.transform = 'scale(1.1)';
            }
        });
    }

    updateAcquiredItems(relics) {
        const container = document.getElementById('acquired-items-container');
        container.innerHTML = '';

        // Group relics by ID
        const counts = {};
        const uniqueRelics = [];

        relics.forEach(relic => {
            if (!counts[relic.id]) {
                counts[relic.id] = 0;
                uniqueRelics.push(relic);
            }
            counts[relic.id]++;
        });

        uniqueRelics.forEach(relic => {
            const wrapper = document.createElement('div');
            wrapper.className = 'acquired-item-wrapper';
            wrapper.style.position = 'relative';
            wrapper.style.display = 'inline-block';
            wrapper.style.margin = '0 5px';

            const iconCanvas = document.createElement('canvas');
            iconCanvas.width = 40;
            iconCanvas.height = 40;
            iconCanvas.className = 'acquired-item-icon';
            iconCanvas.title = relic.name; // Tooltip

            const ctx = iconCanvas.getContext('2d');
            // Use helper to draw icon (scaled down)
            this.drawRelicIcon(ctx, relic.id, 40, 40, relic.color);

            wrapper.appendChild(iconCanvas);

            // Add count badge if > 1
            if (counts[relic.id] > 1) {
                const badge = document.createElement('div');
                badge.className = 'item-count-badge';
                badge.innerText = `x${counts[relic.id]}`;
                badge.style.position = 'absolute';
                badge.style.bottom = '0';
                badge.style.right = '0';
                badge.style.background = 'rgba(0,0,0,0.8)';
                badge.style.color = '#fff';
                badge.style.fontSize = '10px';
                badge.style.padding = '2px 4px';
                badge.style.borderRadius = '4px';
                badge.style.border = '1px solid #fff';
                wrapper.appendChild(badge);
            }

            container.appendChild(wrapper);

        });
    }

    updateBossHP(boss) {
        const bossHud = document.getElementById('boss-hud');
        if (!bossHud) return;

        if (boss && boss.hp > 0) {
            if (bossHud.classList.contains('hidden')) {
                bossHud.classList.remove('hidden');
            }

            // Update Name
            const nameEl = document.getElementById('boss-name');
            if (nameEl && nameEl.innerText !== boss.name) {
                nameEl.innerText = boss.name || 'UNKNOWN ENTITY';
                nameEl.style.color = boss.color || '#ff0000';
                nameEl.style.textShadow = `0 0 10px ${boss.color || '#ff0000'}`;
            }

            // Update Bar
            const hpPercent = Math.max(0, (boss.hp / boss.maxHp) * 100);
            const bar = document.getElementById('boss-hp-bar');
            if (bar) {
                bar.style.width = `${hpPercent}%`;
            }

            // Update Text
            const textEl = document.getElementById('boss-hp-text');
            if (textEl) {
                textEl.innerText = `${Math.ceil(boss.hp)} / ${Math.ceil(boss.maxHp)}`;
            }

        } else {
            if (!bossHud.classList.contains('hidden')) {
                bossHud.classList.add('hidden');
            }
        }
    }

    updateGameOverStats(ene, killCount, relics, mapLevel, loopCount = 0, runMoney = 0) {
        document.getElementById('go-ene').innerText = ene;

        // Update Money Earned
        const goRunMoney = document.getElementById('go-run-money');
        if (goRunMoney) goRunMoney.innerText = runMoney;

        // Update Difficulty Display
        const diffText = this.game.selectedDifficulty.toUpperCase();
        const goDiffEl = document.getElementById('go-difficulty');
        if (goDiffEl) goDiffEl.innerText = diffText;

        const levelDisplay = document.getElementById('go-level');
        if (levelDisplay) {
            if (loopCount > 0) {
                levelDisplay.innerText = `Loop ${loopCount} - Stage ${mapLevel}`;
            } else {
                levelDisplay.innerText = mapLevel;
            }
        }

        const charCanvas = document.getElementById('go-character');
        if (charCanvas) {
            const ctx = charCanvas.getContext('2d');
            this.drawPlayerCharacter(ctx, this.game.selectedCharacter, 25, 25);
        }

        const enemyContainer = document.getElementById('go-enemies');
        enemyContainer.innerHTML = '';

        const enemyTypes = {
            'slime': { color: '#00ff88', name: 'Slime' },
            'lizard': { color: '#aa00ff', name: 'Lizard' },
            'golem': { color: '#ff4444', name: 'Golem' },
            'totem': { color: '#ff00ff', name: 'Totem' },
            'kamikaze': { color: '#ffaa00', name: 'Kamikaze' },
            'missile_enemy': { color: '#ff0088', name: 'Missile Bot' },
            'beam_enemy': { color: '#0088ff', name: 'Beam Bot' },
            'overlord': { color: '#ff00ff', name: 'Overlord', isBoss: true },
            'slime_king': { color: '#00ff88', name: 'Slime King', isBoss: true },
            'mecha_golem': { color: '#ff4444', name: 'Mecha Golem', isBoss: true },
            'void_phantom': { color: '#8800ff', name: 'Void Phantom', isBoss: true },
            'crimson_dragon': { color: '#ff0000', name: 'Crimson Dragon', isBoss: true }
        };

        for (const [type, count] of Object.entries(killCount)) {
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

            if (data.isBoss) this.drawBossIcon(ctx, type, data.color);
            else this.drawEnemyIcon(ctx, type, data.color);

            wrapper.appendChild(canvas);
            const badge = document.createElement('div');
            badge.innerText = `${count}`;
            badge.className = 'result-count-badge';
            wrapper.appendChild(badge);
            enemyContainer.appendChild(wrapper);
        }

        const itemContainer = document.getElementById('go-items');
        itemContainer.innerHTML = '';
        const itemCounts = {};
        relics.forEach(r => {
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
            this.drawRelicIcon(ctx, id, 40, 40, info.data.color);
            wrapper.appendChild(canvas);
            const badge = document.createElement('div');
            badge.innerText = `${info.count}`;
            badge.className = 'result-count-badge';
            wrapper.appendChild(badge);
            itemContainer.appendChild(wrapper);
        }
    }

    drawEnemyIcon(ctx, type, color) {
        const cx = 20;
        const cy = 20;
        ctx.fillStyle = color;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;

        if (type === 'slime') {
            // Slime: Blob shape with highlights
            ctx.beginPath();
            ctx.arc(cx, cy + 2, 12, 0, Math.PI * 2);
            ctx.fill();
            // Highlight
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.beginPath();
            ctx.arc(cx - 3, cy - 2, 4, 0, Math.PI * 2);
            ctx.fill();
        } else if (type === 'kamikaze') {
            // Kamikaze: Spiky ball
            ctx.beginPath();
            for (let i = 0; i < 8; i++) {
                const a = (Math.PI * 2 * i) / 8;
                const r = (i % 2 === 0 ? 14 : 8);
                if (i === 0) ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
                else ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
            }
            ctx.closePath();
            ctx.fill();
            // Center core
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(cx, cy, 4, 0, Math.PI * 2);
            ctx.fill();
        } else if (type === 'golem') {
            // Golem: Solid square with details
            ctx.fillRect(cx - 10, cy - 10, 20, 20);
            // Eyes
            ctx.fillStyle = '#fff';
            ctx.fillRect(cx - 6, cy - 4, 3, 3);
            ctx.fillRect(cx + 3, cy - 4, 3, 3);
            // Cracks
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(cx - 10, cy + 5);
            ctx.lineTo(cx + 10, cy + 5);
            ctx.stroke();
        } else if (type === 'lizard') {
            // Lizard: Triangle with tail
            ctx.beginPath();
            ctx.moveTo(cx + 12, cy);
            ctx.lineTo(cx - 8, cy + 10);
            ctx.lineTo(cx - 8, cy - 10);
            ctx.closePath();
            ctx.fill();
            // Tail
            ctx.beginPath();
            ctx.moveTo(cx - 8, cy);
            ctx.quadraticCurveTo(cx - 14, cy - 4, cx - 12, cy);
            ctx.quadraticCurveTo(cx - 14, cy + 4, cx - 8, cy);
            ctx.fill();
        } else if (type === 'totem') {
            // Totem: Vertical rectangles stacked
            ctx.fillRect(cx - 8, cy - 12, 16, 8);
            ctx.fillRect(cx - 6, cy - 4, 12, 16);
            // Eyes on top
            ctx.fillStyle = '#fff';
            ctx.fillRect(cx - 5, cy - 10, 3, 3);
            ctx.fillRect(cx + 2, cy - 10, 3, 3);
        } else if (type === 'missile_enemy') {
            // Missile Enemy: Robot with launcher
            ctx.fillRect(cx - 8, cy - 8, 16, 16);
            // Launcher
            ctx.fillStyle = '#fff';
            ctx.fillRect(cx - 2, cy - 12, 4, 8);
            // Eyes
            ctx.fillStyle = color;
            ctx.fillRect(cx - 5, cy - 2, 3, 3);
            ctx.fillRect(cx + 2, cy - 2, 3, 3);
        } else if (type === 'beam_enemy') {
            // Beam Enemy: Robot with beam emitter
            ctx.beginPath();
            ctx.arc(cx, cy, 10, 0, Math.PI * 2);
            ctx.fill();
            // Beam emitter (triangle)
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.moveTo(cx, cy - 10);
            ctx.lineTo(cx - 4, cy - 4);
            ctx.lineTo(cx + 4, cy - 4);
            ctx.closePath();
            ctx.fill();
        } else {
            // Default: Circle
            ctx.beginPath();
            ctx.arc(cx, cy, 10, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    drawPlayerCharacter(ctx, charType, cx, cy) {
        ctx.clearRect(0, 0, 50, 50);

        const radius = 15;
        let color = '#fff';
        if (charType === 'girl') color = '#ff00ff';
        if (charType === 'cat') color = '#00ffff';
        if (charType === 'boy') color = '#00ff00';
        if (charType === 'dog') color = '#ff8800';

        ctx.save();
        ctx.translate(cx, cy);

        // Glow
        ctx.shadowBlur = 10;
        ctx.shadowColor = color;

        // Body
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        // Inner
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();

        // Accessories
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        if (charType === 'cat') {
            ctx.beginPath(); ctx.moveTo(-8, -12); ctx.lineTo(-12, -20); ctx.lineTo(-4, -14); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(8, -12); ctx.lineTo(12, -20); ctx.lineTo(4, -14); ctx.stroke();
        } else if (charType === 'girl') {
            ctx.beginPath(); ctx.arc(0, -12, 4, 0, Math.PI * 2); ctx.fill();
        } else if (charType === 'dog') {
            ctx.beginPath(); ctx.ellipse(-12, -4, 4, 8, Math.PI / 4, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(12, -4, 4, 8, -Math.PI / 4, 0, Math.PI * 2); ctx.fill();
        } else if (charType === 'boy') {
            ctx.beginPath(); ctx.arc(0, -4, radius, Math.PI, 0); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(8, -4); ctx.lineTo(18, -4); ctx.stroke();
        }

        ctx.restore();
    }

    drawBossIcon(ctx, type, color) {
        const cx = 20;
        const cy = 20;
        ctx.fillStyle = color;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;

        if (type === 'overlord') {
            // Overlord: Evil sorcerer with tentacles
            ctx.beginPath();
            ctx.arc(cx, cy, 12, 0, Math.PI * 2);
            ctx.fill();

            // Horns
            ctx.fillStyle = '#ff00ff';
            ctx.beginPath();
            ctx.moveTo(cx - 8, cy - 8);
            ctx.lineTo(cx - 12, cy - 16);
            ctx.lineTo(cx - 6, cy - 10);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(cx + 8, cy - 8);
            ctx.lineTo(cx + 12, cy - 16);
            ctx.lineTo(cx + 6, cy - 10);
            ctx.fill();

            // Evil eyes
            ctx.fillStyle = '#ff0000';
            ctx.beginPath();
            ctx.arc(cx - 4, cy - 2, 2, 0, Math.PI * 2);
            ctx.arc(cx + 4, cy - 2, 2, 0, Math.PI * 2);
            ctx.fill();

            // Tentacles
            ctx.strokeStyle = '#aa00aa';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(cx - 10, cy + 8);
            ctx.quadraticCurveTo(cx - 14, cy + 12, cx - 12, cy + 16);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(cx + 10, cy + 8);
            ctx.quadraticCurveTo(cx + 14, cy + 12, cx + 12, cy + 16);
            ctx.stroke();

        } else if (type === 'slime_king') {
            // Slime King: Large slime with crown
            ctx.beginPath();
            ctx.ellipse(cx, cy + 3, 14, 12, 0, 0, Math.PI * 2);
            ctx.fill();

            // Shine/highlight
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.beginPath();
            ctx.arc(cx - 4, cy - 1, 5, 0, Math.PI * 2);
            ctx.fill();

            // Crown
            ctx.fillStyle = '#ffd700';
            ctx.beginPath();
            ctx.moveTo(cx - 10, cy - 8);
            ctx.lineTo(cx - 7, cy - 14);
            ctx.lineTo(cx - 3, cy - 10);
            ctx.lineTo(cx, cy - 16);
            ctx.lineTo(cx + 3, cy - 10);
            ctx.lineTo(cx + 7, cy - 14);
            ctx.lineTo(cx + 10, cy - 8);
            ctx.lineTo(cx - 10, cy - 8);
            ctx.fill();

        } else if (type === 'mecha_golem') {
            // Mecha Golem: Robot with mechanical parts
            ctx.fillRect(cx - 12, cy - 10, 24, 20);

            // Head antenna
            ctx.fillStyle = '#ffaa00';
            ctx.fillRect(cx - 2, cy - 16, 4, 6);
            ctx.beginPath();
            ctx.arc(cx, cy - 16, 3, 0, Math.PI * 2);
            ctx.fill();

            // Glowing eye visor
            ctx.fillStyle = '#00ffff';
            ctx.fillRect(cx - 8, cy - 4, 16, 4);

            // Shoulder cannons
            ctx.fillStyle = color;
            ctx.fillRect(cx - 14, cy - 6, 3, 8);
            ctx.fillRect(cx + 11, cy - 6, 3, 8);

            // Panel lines
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(cx, cy - 10);
            ctx.lineTo(cx, cy + 10);
            ctx.stroke();

        } else if (type === 'void_phantom') {
            // Void Phantom: Ghostly, ethereal
            // Wispy body
            ctx.globalAlpha = 0.7;
            ctx.beginPath();
            ctx.ellipse(cx, cy, 12, 14, 0, 0, Math.PI * 2);
            ctx.fill();

            // Trailing wisps
            ctx.globalAlpha = 0.5;
            for (let i = 0; i < 3; i++) {
                ctx.beginPath();
                ctx.ellipse(cx - 5 + i * 5, cy + 10 + i * 3, 4, 6, 0, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.globalAlpha = 1.0;

            // Hollow eyes
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(cx - 5, cy - 3, 3, 0, Math.PI * 2);
            ctx.arc(cx + 5, cy - 3, 3, 0, Math.PI * 2);
            ctx.fill();

            // Inner glow in eyes
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(cx - 5, cy - 3, 1.5, 0, Math.PI * 2);
            ctx.arc(cx + 5, cy - 3, 1.5, 0, Math.PI * 2);
            ctx.fill();

        } else if (type === 'crimson_dragon') {
            // Crimson Dragon: Dragon head with wings
            // Head
            ctx.beginPath();
            ctx.arc(cx, cy, 10, 0, Math.PI * 2);
            ctx.fill();

            // Horns
            ctx.fillStyle = '#ff8800';
            ctx.beginPath();
            ctx.moveTo(cx - 6, cy - 8);
            ctx.lineTo(cx - 10, cy - 14);
            ctx.lineTo(cx - 4, cy - 10);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(cx + 6, cy - 8);
            ctx.lineTo(cx + 10, cy - 14);
            ctx.lineTo(cx + 4, cy - 10);
            ctx.fill();

            // Eyes
            ctx.fillStyle = '#ffff00';
            ctx.beginPath();
            ctx.arc(cx - 3, cy - 2, 2, 0, Math.PI * 2);
            ctx.arc(cx + 3, cy - 2, 2, 0, Math.PI * 2);
            ctx.fill();

            // Pupils
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(cx - 3, cy - 2, 1, 0, Math.PI * 2);
            ctx.arc(cx + 3, cy - 2, 1, 0, Math.PI * 2);
            ctx.fill();

            // Nostrils breathing fire
            ctx.fillStyle = '#ffaa00';
            ctx.beginPath();
            ctx.arc(cx - 2, cy + 4, 1.5, 0, Math.PI * 2);
            ctx.arc(cx + 2, cy + 4, 1.5, 0, Math.PI * 2);
            ctx.fill();

            // Wings (simplified)
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.6;
            ctx.beginPath();
            ctx.moveTo(cx - 10, cy);
            ctx.lineTo(cx - 18, cy - 8);
            ctx.lineTo(cx - 14, cy + 4);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(cx + 10, cy);
            ctx.lineTo(cx + 18, cy - 8);
            ctx.lineTo(cx + 14, cy + 4);
            ctx.fill();
            ctx.globalAlpha = 1.0;
        } else if (type === 'storm_weaver') {
            // Storm Weaver: Spider with lightning arcs
            ctx.beginPath();
            ctx.ellipse(cx, cy, 10, 14, 0, 0, Math.PI * 2);
            ctx.fill();
            // Legs
            ctx.lineWidth = 1;
            for (let i = 0; i < 4; i++) {
                ctx.moveTo(cx - 8, cy - 8 + i * 4);
                ctx.lineTo(cx - 16, cy - 12 + i * 4);
                ctx.moveTo(cx + 8, cy - 8 + i * 4);
                ctx.lineTo(cx + 16, cy - 12 + i * 4);
            }
            ctx.stroke();
            // Bolt
            ctx.fillStyle = '#ffff00';
            ctx.beginPath();
            ctx.moveTo(cx - 4, cy - 4); ctx.lineTo(cx + 4, cy); ctx.lineTo(cx - 2, cy + 2); ctx.lineTo(cx + 2, cy + 6);
            ctx.stroke();
        } else if (type === 'iron_behemoth') {
            // Iron Behemoth: Tanky crab
            ctx.fillStyle = '#666';
            ctx.beginPath();
            ctx.arc(cx, cy, 14, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = color;
            ctx.fillRect(cx - 16, cy - 10, 6, 12);
            ctx.fillRect(cx + 10, cy - 10, 6, 12);
        } else if (type === 'prism_mirror') {
            // Prism Mirror: Crystalline
            ctx.strokeStyle = '#fff';
            ctx.beginPath();
            ctx.moveTo(cx, cy - 14); ctx.lineTo(cx + 12, cy); ctx.lineTo(cx, cy + 14); ctx.lineTo(cx - 12, cy); ctx.closePath();
            ctx.stroke();
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.5;
            ctx.fill();
            ctx.globalAlpha = 1.0;
        } else if (type === 'toxic_horror') {
            // Toxic Horror: Blobs
            ctx.fillStyle = 'rgba(0, 255, 0, 0.6)';
            ctx.beginPath();
            ctx.arc(cx - 4, cy, 8, 0, Math.PI * 2);
            ctx.arc(cx + 4, cy + 2, 7, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ff00ff'; // Toxic core
            ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2); ctx.fill();
        } else if (type === 'aura_knight') {
            // Aura Knight: Helmet
            ctx.fillStyle = '#333';
            ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = color;
            ctx.fillRect(cx - 5, cy - 4, 14, 3); // Visor
            ctx.globalAlpha = 0.4;
            ctx.beginPath(); ctx.moveTo(cx - 5, cy); ctx.lineTo(cx - 15, cy + 10); ctx.lineTo(cx - 15, cy - 5); ctx.fill();
            ctx.globalAlpha = 1.0;
        } else if (type === 'celestial_eye') {
            // Celestial Eye: Satellite
            ctx.fillStyle = '#111';
            ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = color;
            ctx.strokeRect(cx - 15, cy - 3, 30, 6);
            ctx.fillStyle = color;
            ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.fill();
        }
    }

    showMessage(text, duration = 3000) {
        const msgDiv = document.createElement('div');
        msgDiv.className = 'floating-message';
        msgDiv.innerText = text;
        msgDiv.style.position = 'absolute';
        msgDiv.style.top = '20%';
        msgDiv.style.left = '50%';
        msgDiv.style.transform = 'translate(-50%, -50%)';
        msgDiv.style.background = 'rgba(0, 0, 0, 0.8)';
        msgDiv.style.color = '#00ffff';
        msgDiv.style.padding = '20px 40px';
        msgDiv.style.border = '2px solid #00ffff';
        msgDiv.style.borderRadius = '10px';
        msgDiv.style.fontSize = '24px';
        msgDiv.style.fontWeight = 'bold';
        msgDiv.style.zIndex = '1000';
        msgDiv.style.pointerEvents = 'none';
        msgDiv.style.animation = 'fadeInOut 0.5s ease-in-out';

        this.uiLayer.appendChild(msgDiv);

        setTimeout(() => {
            msgDiv.style.opacity = '0';
            setTimeout(() => msgDiv.remove(), 500);
        }, duration);
    }

    showWarningMessage(text, duration = 4000) {
        const msgDiv = document.createElement('div');
        msgDiv.className = 'warning-message';
        msgDiv.innerText = text;
        msgDiv.style.position = 'absolute';
        msgDiv.style.top = '30%';
        msgDiv.style.left = '50%';
        msgDiv.style.transform = 'translate(-50%, -50%)';
        msgDiv.style.background = 'rgba(255, 0, 0, 0.2)';
        msgDiv.style.color = '#ff0000';
        msgDiv.style.padding = '30px 60px';
        msgDiv.style.border = '4px double #ff0000';
        msgDiv.style.fontSize = '32px';
        msgDiv.style.fontWeight = 'bold';
        msgDiv.style.zIndex = '1000';
        msgDiv.style.pointerEvents = 'none';
        msgDiv.style.textAlign = 'center';
        msgDiv.style.textShadow = '0 0 20px #ff0000';
        msgDiv.style.animation = 'warningPulse 0.5s infinite alternate, fadeInOut 0.5s ease-in-out';

        this.uiLayer.appendChild(msgDiv);

        setTimeout(() => {
            msgDiv.style.opacity = '0';
            setTimeout(() => msgDiv.remove(), 500);
        }, duration);
    }
}
