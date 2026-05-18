export class SkillTree {
    constructor(game) {
        this.game = game;
        this.unlockedNodes = ['core']; // Default start
        
        this.nodes = {
            'core': { id: 'core', name: 'Cyber Core', desc: 'The heart of your system.', cost: 0, x: 0, y: 0, requires: [], effect: (p) => {} }
        };

        this.generateTree();
    }

    generateTree() {
        const costCurve = [50, 100, 150, 250, 400, 600, 900, 1300, 2000];
        
        const createChain = (prefix, nameBase, descFmt, effectFunc, amounts, angle, color, reqNode) => {
            let prevId = reqNode;
            let currentX = this.nodes[reqNode].x;
            let currentY = this.nodes[reqNode].y;
            const spacing = 60;

            for (let i = 0; i < amounts.length; i++) {
                const id = `${prefix}_${i+1}`;
                const amount = amounts[i];
                currentX += Math.cos(angle) * spacing;
                currentY += Math.sin(angle) * spacing;
                
                this.nodes[id] = {
                    id: id,
                    name: `${nameBase} ${i+1}`,
                    desc: descFmt(amount),
                    cost: costCurve[i] || 2500,
                    x: currentX,
                    y: currentY,
                    requires: [prevId],
                    effect: effectFunc(amount),
                    color: color
                };
                prevId = id;
            }
            return prevId; // Return last node ID for advanced skills
        };

        // Right: Offense
        const lastAtk = createChain('atk', 'Overclock', (v) => `Damage +${v}%`, (v) => (p) => p.damage *= (1 + v/100), [1,1,1,1,1,2,2,3,3], 0, '#ff4444', 'core');
        const lastRate = createChain('rate', 'Cooling Sys', (v) => `Fire Rate +${v}%`, (v) => (p) => p.shootInterval *= (1 - v/100), [1,1,1,1,1,2,2,3,3], -Math.PI/4, '#ffaa00', 'atk_3');
        const lastCrit = createChain('crit', 'Precision', (v) => `Crit Chance +${v}%`, (v) => (p) => p.critChance = (p.critChance || 0) + (v/100), [1,1,1,1,1,2,2,3,3], Math.PI/4, '#ff00ff', 'atk_6');

        // Up: Shield & Armor
        const lastShield = createChain('shield', 'Energy Shield', (v) => `Base Shield +${v}`, (v) => (p) => p.maxShield = (p.maxShield || 0) + v, [5,5,5,5,5,10,10,15,15], -Math.PI/2, '#8888ff', 'core');
        const lastArmor = createChain('armor', 'Titanium Shell', (v) => `Damage Taken -${v}%`, (v) => (p) => p.damageMultiplier = (p.damageMultiplier || 1.0) * (1 - v/100), [1,1,1,1,1,2,2,3,3], -Math.PI*3/4, '#999999', 'shield_3');

        // Left: Utility
        const lastSpeed = createChain('spd', 'Motor Servo', (v) => `Move Speed +${v}%`, (v) => (p) => p.speed *= (1 + v/100), [2,2,2,2,2,3,3,4,4], Math.PI, '#00ffff', 'core');
        const lastMag = createChain('mag', 'Magnetic Field', (v) => `Pickup Range +${v}%`, (v) => (p) => p.magnetRange = (p.magnetRange || 1) * (1 + v/100), [5,5,5,5,5,10,10,10,10], -Math.PI*3/4, '#00aaff', 'spd_3');
        const lastLuck = createChain('luck', 'Lucky Coin', (v) => `Bonus Money +${v}%`, (v) => (p) => p.moneyBonus = (p.moneyBonus || 1) * (1 + v/100), [5,5,5,5,5,10,10,10,10], Math.PI*3/4, '#ffff00', 'spd_6');

        // Down: HP & Regen
        const lastHp = createChain('hp', 'Armor Plate', (v) => `Max HP +${v}`, (v) => (p) => p.maxHp += v, [5,5,5,5,5,10,10,15,15], Math.PI/2, '#44ff44', 'core');
        const lastRegen = createChain('regen', 'Nano Regen', (v) => `HP Regen +${v}/s`, (v) => (p) => p.hpRegen = (p.hpRegen || 0) + v, [0.05,0.05,0.05,0.05,0.05,0.1,0.1,0.1,0.1], Math.PI*3/4, '#44ff88', 'hp_3');

        // Advanced Nodes (Attached to the ends of chains)
        this.nodes['multi1'] = { id: 'multi1', name: 'Splitter Module', desc: 'Shoot +1 Bullet', cost: 3000, x: this.nodes[lastAtk].x + 80, y: this.nodes[lastAtk].y, requires: [lastAtk], effect: (p) => p.multiShotCount = (p.multiShotCount || 1) + 1, color: '#ff00aa' };
        this.nodes['pierce1'] = { id: 'pierce1', name: 'Plasma Orb', desc: 'Pierce +1', cost: 3000, x: this.nodes[lastRate].x + 60, y: this.nodes[lastRate].y - 60, requires: [lastRate], effect: (p) => p.pierceShotCount = (p.pierceShotCount || 0) + 1, color: '#00ccff' };
        this.nodes['lifesteal1'] = { id: 'lifesteal1', name: 'Vampire Protocol', desc: '5% chance to heal 1 HP on hit (Max 50/s)', cost: 3000, x: this.nodes[lastRegen].x - 60, y: this.nodes[lastRegen].y + 60, requires: [lastRegen], effect: (p) => p.lifeStealChance = (p.lifeStealChance || 0) + 0.05, color: '#cc0044' };
    }

    reset() {
        // Refund money for all unlocked nodes (except core)
        let refund = 0;
        for (const id of this.unlockedNodes) {
            if (id !== 'core' && this.nodes[id]) {
                refund += this.nodes[id].cost;
            }
        }
        this.game.money += refund;
        this.unlockedNodes = ['core'];
        this.game.upgradeSystem.save();
        return refund;
    }

    isUnlocked(id) {
        return this.unlockedNodes.includes(id);
    }

    canUnlock(id) {
        const node = this.nodes[id];
        if (!node) return false;
        if (this.isUnlocked(id)) return false;
        if (this.game.money < node.cost) return false;
        
        // All required nodes must be unlocked
        for (const req of node.requires) {
            if (!this.isUnlocked(req)) return false;
        }
        return true;
    }

    unlock(id) {
        if (this.canUnlock(id)) {
            this.game.money -= this.nodes[id].cost;
            this.unlockedNodes.push(id);
            this.game.upgradeSystem.save();
            return true;
        }
        return false;
    }
}
