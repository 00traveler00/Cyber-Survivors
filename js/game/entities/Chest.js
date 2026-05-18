export class Chest {
    constructor(game, x, y, category = 'random') {
        this.game = game;
        this.x = x;
        this.y = y;
        this.radius = 20;
        this.active = true;
        this.category = category;
        this.glow = 0;

        // Set color based on category
        switch(this.category) {
            case 'red': this.color = '#ff4444'; break;
            case 'blue': this.color = '#4444ff'; break;
            case 'green': this.color = '#44ff44'; break;
            case 'yellow': this.color = '#ffff00'; break;
            case 'orange': this.color = '#ff8800'; break;
            default: this.color = '#ffd700'; break; // random/gold
        }

        // Pre-roll rewards
        this.contents = this.generateRewards();

        this.requiresExit = false;
        // Store difficulty at generation time for price scaling
        this.difficulty = (game.waveManager) ? game.waveManager.difficulty : 1.0;
    }

    generateRewards() {
        if (!this.game.ui || !this.game.ui.relics) return [];

        const selected = [];
        
        // Filter by category if one is set and it's not 'random'
        let available = [...this.game.ui.relics].filter(r => r.category !== 'none' && !r.disabled);

        // Enforce the 5 attack method limit (including basic attack)
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

        // Base attack is always present and counts as 1 attack method
        const ownedAttacks = new Set();
        ownedAttacks.add('base');

        if (this.game.acquiredRelics) {
            this.game.acquiredRelics.forEach(r => {
                if (ATTACK_RELIC_IDS.includes(r.id)) {
                    ownedAttacks.add(r.id);
                }
            });
        }

        // If player already has 5 or more attack types, exclude any other new yellow attacks
        if (ownedAttacks.size >= 5) {
            available = available.filter(r => {
                if (ATTACK_RELIC_IDS.includes(r.id)) {
                    return ownedAttacks.has(r.id);
                }
                return true;
            });
        }

        if (this.category !== 'random') {
            available = available.filter(r => r.category === this.category);
        }

        // Select up to 3 items (or less if not enough in category/filtered list)
        for (let i = 0; i < 3 && available.length > 0; i++) {
            // Calculate the total weight of remaining items
            const totalWeight = available.reduce((sum, r) => sum + r.weight, 0);
            let random = Math.random() * totalWeight;

            // Select based on weight
            let selectedRelic = null;
            for (const relic of available) {
                random -= relic.weight;
                if (random <= 0) {
                    selectedRelic = relic;
                    break;
                }
            }

            // Add selected item and remove from temporary pool
            if (selectedRelic) {
                selected.push(selectedRelic);
                const index = available.findIndex(r => r.id === selectedRelic.id);
                if (index !== -1) available.splice(index, 1);
            }
        }

        return selected;
    }

    update(dt) {
        if (!this.active) return;

        this.glow += dt * 3;

        // Check interaction (smaller radius to prevent immediate reopening)
        const dx = this.game.player.x - this.x;
        const dy = this.game.player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // If we require the player to exit, check if they are far enough away
        if (this.requiresExit) {
            if (dist > this.radius + 20) {
                this.requiresExit = false;
            }
            return; // Don't open yet
        }

        // Only open if player is very close and chest is active
        if (dist < this.radius + 10) {
            // Open Chest
            this.game.openChest(this);
            this.active = false;
        }
    }

    draw(ctx) {
        if (!this.active) return;

        ctx.save();
        ctx.translate(this.x, this.y);

        // Pulsing effect
        const scale = 1 + Math.sin(this.glow) * 0.1;
        ctx.scale(scale, scale);

        // Draw Chest Box (Simple rect for now, or sprite later)
        ctx.fillStyle = this.color;
        ctx.fillRect(-15, -10, 30, 20);

        // Lid
        ctx.fillStyle = '#ffec8b';
        ctx.fillRect(-15, -10, 30, 5);

        // Lock
        ctx.fillStyle = '#000';
        ctx.fillRect(-2, -2, 4, 6);

        // Text hint
        ctx.fillStyle = '#fff';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText("OPEN", 0, -15);

        ctx.restore();
    }
}
