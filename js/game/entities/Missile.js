import { Projectile } from './Projectile.js';
import { Particle } from './Particle.js';

export class Missile extends Projectile {
    constructor(game, x, y, target) {
        super(game, x, y, target);
        this.target = target;

        // Missile Stats
        this.speed = 450;
        this.turnSpeed = 10.0; // Radians per second (was 5.0)
        this.damage = game.player.damage * 2.0;
        this.color = '#ff0088';
        this.radius = 8 * (game.player.projectileSize || 1);
        this.lifeTime = 2.5;

        // Initial Launch: Randomize angle slightly for "spread" effect
        const currentAngle = Math.atan2(this.vy, this.vx);
        const spread = (Math.random() - 0.5) * 1.5; // +/- 0.75 rad spread
        const startSpeed = 100; // Start slow

        this.vx = Math.cos(currentAngle + spread) * startSpeed;
        this.vy = Math.sin(currentAngle + spread) * startSpeed;
    }

    findNearestEnemy() {
        let nearest = null;
        let minDist = Infinity;

        if (!this.game.waveManager || !this.game.waveManager.enemies) {
            return null;
        }

        this.game.waveManager.enemies.forEach(enemy => {
            if (enemy.markedForDeletion) return;

            const dx = enemy.x - this.x;
            const dy = enemy.y - this.y;
            const dist = dx * dx + dy * dy;

            if (dist < minDist) {
                minDist = dist;
                nearest = enemy;
            }
        });

        return nearest;
    }

    update(dt) {
        this.lifeTime -= dt;
        if (this.lifeTime <= 0) {
            this.markedForDeletion = true;
            return;
        }

        // Accelerate
        const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (currentSpeed < this.speed) {
            const newSpeed = currentSpeed + 300 * dt; // Acceleration
            const angle = Math.atan2(this.vy, this.vx);
            this.vx = Math.cos(angle) * newSpeed;
            this.vy = Math.sin(angle) * newSpeed;
        }

        // Homing Logic
        if (this.target && !this.target.markedForDeletion) {
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            const targetAngle = Math.atan2(dy, dx);
            let currentAngle = Math.atan2(this.vy, this.vx);

            let diff = targetAngle - currentAngle;
            // Normalize angle difference
            while (diff <= -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;

            const maxTurn = this.turnSpeed * dt;
            if (Math.abs(diff) > maxTurn) {
                currentAngle += Math.sign(diff) * maxTurn;
            } else {
                currentAngle = targetAngle;
            }

            // Apply new direction while maintaining speed
            const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
            this.vx = Math.cos(currentAngle) * speed;
            this.vy = Math.sin(currentAngle) * speed;
        } else {
            // If target lost, find new target
            const newTarget = this.findNearestEnemy();
            if (newTarget) {
                this.target = newTarget;
            }
            // If no new target, just fly straight
        }

        // Move
        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // Bounds check
        if (this.x < 0 || this.x > this.game.worldWidth ||
            this.y < 0 || this.y > this.game.worldHeight) {
            this.markedForDeletion = true;
        }

        // Particle Trail
        if (Math.random() < 0.4) {
            this.game.particles.push(new Particle(this.game, this.x, this.y, '#ffaa00'));
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = 0.6; // Semi-transparent
        ctx.translate(this.x, this.y);
        ctx.rotate(Math.atan2(this.vy, this.vx));
        
        const sizeScale = this.game.player.projectileSize || 1;
        ctx.scale(sizeScale, sizeScale);

        // Missile Body
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(10, 0);
        ctx.lineTo(-6, 6);
        ctx.lineTo(-4, 0);
        ctx.lineTo(-6, -6);
        ctx.fill();

        // Thruster Glow
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ffaa00';
        ctx.fillStyle = '#ffaa00';
        ctx.beginPath();
        ctx.moveTo(-4, 0);
        ctx.lineTo(-12, 4);
        ctx.lineTo(-12, -4);
        ctx.fill();

        ctx.restore();
    }
}
