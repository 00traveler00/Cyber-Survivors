import { EnemyProjectile } from './EnemyProjectile.js';
import { Particle } from './Particle.js';

export class EnemyMissile extends EnemyProjectile {
    constructor(game, x, y, target, damage = 8) {
        super(game, x, y, target, 'missile', damage);
        this.target = target;
        this.speed = 162.5; // Increased by 30% from 125
        this.turnSpeed = 2.5;
        this.color = '#ff0000';
        this.lifeTime = 5.0;

        // Initial random spread
        const angle = Math.atan2(this.vy, this.vx) + (Math.random() - 0.5) * 1.0;
        this.vx = Math.cos(angle) * this.speed;
        this.vy = Math.sin(angle) * this.speed;
    }

    update(dt) {
        this.lifeTime -= dt;
        if (this.lifeTime <= 0) {
            this.markedForDeletion = true;
            return;
        }

        // Homing Logic
        if (this.target) {
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            const targetAngle = Math.atan2(dy, dx);
            let currentAngle = Math.atan2(this.vy, this.vx);

            let diff = targetAngle - currentAngle;
            while (diff <= -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;

            const maxTurn = this.turnSpeed * dt;
            if (Math.abs(diff) > maxTurn) {
                currentAngle += Math.sign(diff) * maxTurn;
            } else {
                currentAngle = targetAngle;
            }

            this.vx = Math.cos(currentAngle) * this.speed;
            this.vy = Math.sin(currentAngle) * this.speed;
        }

        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // Bounds check
        if (this.x < 0 || this.x > this.game.worldWidth ||
            this.y < 0 || this.y > this.game.worldHeight) {
            this.markedForDeletion = true;
        }

        // Trail
        if (Math.random() < 0.3) {
            this.game.particles.push(new Particle(this.game, this.x, this.y, '#ff4400'));
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(Math.atan2(this.vy, this.vx));

        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(8, 0);
        ctx.lineTo(-4, 4);
        ctx.lineTo(-4, -4);
        ctx.fill();

        // Glow
        ctx.shadowBlur = 5;
        ctx.shadowColor = '#ff0000';
        ctx.fill();

        ctx.restore();
    }
}
