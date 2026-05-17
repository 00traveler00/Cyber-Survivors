
window.onerror = function(msg, url, line, col, error) {
    const div = document.createElement('div');
    div.style.position = 'fixed';
    div.style.top = '0';
    div.style.left = '0';
    div.style.width = '100%';
    div.style.background = 'rgba(255, 0, 0, 0.8)';
    div.style.color = 'white';
    div.style.padding = '10px';
    div.style.zIndex = '9999';
    div.style.fontSize = '12px';
    div.style.wordBreak = 'break-all';
    div.innerText = 'Error: ' + msg + '\n' + url + ':' + line + ':' + col;
    document.body.appendChild(div);
    return false;
};
console.log = (function(oldLog) {
    return function(...args) {
        oldLog(...args);
        // Optional: display logs on screen if needed
    };
})(console.log);


// --- js/game/InputHandler.js ---
class InputHandler {
    constructor() {
        this.keys = {};
        this.touchActive = false;
        this.touchStart = { x: 0, y: 0 };
        this.touchCurrent = { x: 0, y: 0 };
        this.joystickVector = { x: 0, y: 0 };

        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });

        // Touch events for virtual joystick
        window.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
        window.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
        window.addEventListener('touchend', (e) => this.handleTouchEnd(e));
    }

    handleTouchStart(e) {
        // Allow scrolling/interaction on specific UI containers
        if (e.target.closest('.victory-container') ||
            e.target.closest('.gameover-container') ||
            e.target.closest('.options-container') ||
            e.target.closest('.scrollable')) {
            return;
        }

        e.preventDefault();
        this.touchActive = true;
        this.touchStart.x = e.touches[0].clientX;
        this.touchStart.y = e.touches[0].clientY;
        this.touchCurrent.x = this.touchStart.x;
        this.touchCurrent.y = this.touchStart.y;
        this.updateJoystickVector();
    }

    handleTouchMove(e) {
        // Allow scrolling/interaction on specific UI containers
        if (e.target.closest('.victory-container') ||
            e.target.closest('.gameover-container') ||
            e.target.closest('.options-container') ||
            e.target.closest('.scrollable')) {
            return;
        }

        e.preventDefault();
        if (!this.touchActive) return;
        this.touchCurrent.x = e.touches[0].clientX;
        this.touchCurrent.y = e.touches[0].clientY;
        this.updateJoystickVector();
    }

    handleTouchEnd(e) {
        // Allow scrolling/interaction on specific UI containers
        if (e.target.closest('.victory-container') ||
            e.target.closest('.gameover-container') ||
            e.target.closest('.options-container') ||
            e.target.closest('.scrollable')) {
            return;
        }

        e.preventDefault();
        this.touchActive = false;
        this.joystickVector = { x: 0, y: 0 };
    }

    updateJoystickVector() {
        const dx = this.touchCurrent.x - this.touchStart.x;
        const dy = this.touchCurrent.y - this.touchStart.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const maxDist = 50; // Max joystick radius

        if (distance > 0) {
            const normalized = distance > maxDist ? maxDist : distance;
            this.joystickVector.x = (dx / distance) * (normalized / maxDist);
            this.joystickVector.y = (dy / distance) * (normalized / maxDist);
        } else {
            this.joystickVector = { x: 0, y: 0 };
        }
    }

    getMovementVector() {
        let x = 0;
        let y = 0;

        if (this.keys['ArrowUp'] || this.keys['KeyW']) y -= 1;
        if (this.keys['ArrowDown'] || this.keys['KeyS']) y += 1;
        if (this.keys['ArrowLeft'] || this.keys['KeyA']) x -= 1;
        if (this.keys['ArrowRight'] || this.keys['KeyD']) x += 1;

        // Normalize keyboard vector
        if (x !== 0 || y !== 0) {
            const length = Math.sqrt(x * x + y * y);
            x /= length;
            y /= length;
        }

        // Combine with joystick (priority to joystick if active)
        if (this.touchActive) {
            return this.joystickVector;
        }

        return { x, y };
    }
}


// --- js/game/audio/AudioManager.js ---
class AudioManager {
    constructor() {
        this.audioContext = null;
        this.bgmGain = null;
        this.sfxGain = null;
        this.compressor = null;
        this.bgmOscillators = [];
        this.enabled = true;

        // Initialize on user interaction (required by browsers)
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;

        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

            // Dynamics Compressor to handle overlapping sounds
            this.compressor = this.audioContext.createDynamicsCompressor();
            this.compressor.threshold.setValueAtTime(-24, this.audioContext.currentTime);
            this.compressor.knee.setValueAtTime(30, this.audioContext.currentTime);
            this.compressor.ratio.setValueAtTime(12, this.audioContext.currentTime);
            this.compressor.attack.setValueAtTime(0.003, this.audioContext.currentTime);
            this.compressor.release.setValueAtTime(0.25, this.audioContext.currentTime);
            this.compressor.connect(this.audioContext.destination);

            // Master gain nodes
            this.bgmGain = this.audioContext.createGain();
            this.bgmGain.gain.value = 0.5;
            this.bgmGain.connect(this.compressor);

            this.sfxGain = this.audioContext.createGain();
            this.sfxGain.gain.value = 0.5;
            this.sfxGain.connect(this.compressor);

            this.initialized = true;
            console.log('AudioManager initialized (v2 - Fixed)');
        } catch (e) {
            console.error('Web Audio API not supported', e);
            this.enabled = false;
        }
    }

    playBGM() {
        if (!this.enabled || !this.initialized) return;

        // Ensure context is running (fixes "BGM not playing" issue)
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        this.stopBGM();
        // Simple ambient chord progression loop
        const chordProgression = [
            // A minor (A C E)
            [220, 261.63, 329.63],
            // B diminished (B D F)
            [246.94, 293.66, 369.99],
            // C major (C E G)
            [261.63, 329.63, 392.00],
            // D minor (D F A)
            [293.66, 369.99, 440.00]
        ];
        let step = 0;
        const scheduleChord = () => {
            const now = this.audioContext.currentTime;
            const freqs = chordProgression[step % chordProgression.length];
            freqs.forEach(freq => {
                const osc = this.audioContext.createOscillator();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now);
                const gain = this.audioContext.createGain();
                gain.gain.setValueAtTime(0.05, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);
                osc.connect(gain);
                gain.connect(this.bgmGain);
                osc.start(now);
                osc.stop(now + 2.5);
                this.bgmOscillators.push(osc);
            });
            step++;
        };
        // Start first chord immediately
        scheduleChord();
        // Repeat every 3 seconds
        this.bgmInterval = setInterval(() => {
            if (!this.enabled || !this.initialized) return;
            scheduleChord();
        }, 3000);
        console.log('Ambient BGM loop started');
    }

    stopBGM() {
        if (!this.enabled || !this.initialized) return;
        if (this.bgmInterval) {
            clearInterval(this.bgmInterval);
            this.bgmInterval = null;
        }
        this.bgmOscillators.forEach(osc => {
            try { osc.stop(); } catch (e) { }
        });
        this.bgmOscillators = [];
    }

    // Simple short sound effects for actions
    // Volume lowered significantly to reduce noise
    playShoot() { this._playOneShot('square', 800, 0.02, 0.05, 0.01); }
    playHit() { this._playOneShot('sawtooth', 200, 0.1, 0.1, 0.01); }
    playCollect() { this._playOneShot('sine', 800, 0.1, 0.1, 0.01, 1200); }

    playLevelUp() {
        if (!this.enabled || !this.initialized) return;
        const now = this.audioContext.currentTime;
        // Ascending arpeggio
        [523, 659, 784, 1047].forEach((freq, i) => {
            const start = now + i * 0.1;
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, start);
            gain.gain.setValueAtTime(0.1, start);
            gain.gain.exponentialRampToValueAtTime(0.01, start + 0.2);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(start);
            osc.stop(start + 0.2);
        });
    }

    playBossSummon() { this._playOneShot('sawtooth', 100, 0.2, 1.0, 0.01, 50); }

    playUpgrade() {
        this.playLevelUp(); // 再利用するか、新しい音を設定
    }

    playError() {
        this._playOneShot('sawtooth', 150, 0.1, 0.2, 0.01, 100);
    }

    // Helper for one‑shot effects – optional endFreq for pitch slide
    _playOneShot(type, startFreq, startGain, duration, endGain, endFreq) {
        if (!this.enabled || !this.initialized) return;

        // Resume context if suspended (e.g. user clicked but audio didn't start)
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        const now = this.audioContext.currentTime;
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(startFreq, now);
        if (endFreq !== undefined) {
            osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);
        }
        gain.gain.setValueAtTime(startGain, now);
        gain.gain.exponentialRampToValueAtTime(endGain, now + duration);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + duration);
    }

    setVolume(bgmVolume, sfxVolume) {
        if (!this.enabled || !this.initialized) return;

        if (bgmVolume !== undefined) {
            this.bgmGain.gain.value = bgmVolume;
        }
        if (sfxVolume !== undefined) {
            this.sfxGain.gain.value = sfxVolume;
        }
    }
}


// --- js/game/entities/Particle.js ---
class Particle {
    constructor(game, x, y, color) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = Math.random() * 3 + 1;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 100 + 50;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.life = 1.0; // Seconds
        this.decay = Math.random() * 0.5 + 0.5;
        this.markedForDeletion = false;
    }

    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.life -= this.decay * dt;
        if (this.life <= 0) {
            this.markedForDeletion = true;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}


// --- js/game/entities/FloatingText.js ---
class FloatingText {
    constructor(x, y, text, color, borderColor = null) {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.borderColor = borderColor;
        this.velocity = { x: (Math.random() - 0.5) * 20, y: -50 };
        this.life = 1.0; // Seconds
        this.opacity = 1.0;
        this.markedForDeletion = false;
    }

    update(dt) {
        this.x += this.velocity.x * dt;
        this.y += this.velocity.y * dt;
        this.life -= dt;
        this.opacity = Math.max(0, this.life);

        if (this.life <= 0) {
            this.markedForDeletion = true;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.font = 'bold 20px "Courier New", monospace';

        // Draw outline if specified
        if (this.borderColor) {
            ctx.strokeStyle = this.borderColor;
            ctx.lineWidth = 3;
            ctx.strokeText(this.text, this.x, this.y);
        }

        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 5;
        ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
    }
}


// --- js/game/entities/Projectile.js ---
class Projectile {
    constructor(game, x, y, target, angleOffset = 0) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.speed = 300;
        this.radius = 5 * (game.player.projectileSize || 1); // Amplifier Core effect
        this.damage = game.player.damage; // Use player damage

        // Debug: Check initial damage
        if (isNaN(this.damage)) {
            console.error("Projectile created with NaN damage!", { playerDamage: game.player.damage, player: game.player });
        }

        this.markedForDeletion = false;
        this.color = '#ffff00';
        this.isCrit = false; // Lucky Dice: Critical hit flag

        // Lucky Dice: Critical hit chance
        if (game.player.critChance && Math.random() < game.player.critChance) {
            this.isCrit = true;
            this.damage *= 2; // Critical damage is 2x
            // this.color = '#ff8800'; // REMOVED: Keep original bullet color

            // Debug: Check damage after crit
            if (isNaN(this.damage)) {
                console.error("Projectile damage became NaN after crit calculation!", { damage: this.damage });
            }
        }

        // Safeguard: Ensure damage is a valid number
        if (isNaN(this.damage)) {
            console.warn("Projectile damage was NaN, resetting to default 10");
            this.damage = 10;
        }

        // Calculate direction to target
        const dx = target.x - x;
        const dy = target.y - y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Base angle
        let angle = Math.atan2(dy, dx);

        // Apply offset
        angle += angleOffset;

        this.vx = Math.cos(angle) * this.speed;
        this.vy = Math.sin(angle) * this.speed;
    }

    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // Check world bounds instead of canvas bounds
        if (this.x < 0 || this.x > this.game.worldWidth ||
            this.y < 0 || this.y > this.game.worldHeight) {
            this.markedForDeletion = true;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = 0.6; // Semi-transparent for better visibility
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.restore();
    }
}


// --- js/game/entities/PiercingProjectile.js ---
class PiercingProjectile {
    constructor(game, x, y, target, angleOffset = 0) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.speed = 250; // Slightly slower than normal
        this.radius = 7; // Slightly larger
        this.damage = game.player.damage * 0.8; // 80% damage for balance
        this.markedForDeletion = false;
        this.color = '#00aaff'; // Cyan/blue color
        this.isCrit = false; // Lucky Dice: Critical hit flag
        this.hitEnemies = new Set(); // Track hit enemies to avoid multiple hits

        // Lucky Dice: Critical hit chance
        if (game.player.critChance && Math.random() < game.player.critChance) {
            this.isCrit = true;
            this.damage *= 2; // Critical damage is 2x
        }

        // Safeguard: Ensure damage is a valid number
        if (isNaN(this.damage)) {
            console.warn("PiercingProjectile damage was NaN, resetting to default 8");
            this.damage = 8;
        }

        // Calculate direction to target
        const dx = target.x - x;
        const dy = target.y - y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Base angle
        let angle = Math.atan2(dy, dx);

        // Apply offset
        angle += angleOffset;

        this.vx = Math.cos(angle) * this.speed;
        this.vy = Math.sin(angle) * this.speed;
    }

    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // Check world bounds instead of canvas bounds
        if (this.x < 0 || this.x > this.game.worldWidth ||
            this.y < 0 || this.y > this.game.worldHeight) {
            this.markedForDeletion = true;
        }
    }

    draw(ctx) {
        // Outer glow
        ctx.save();
        ctx.globalAlpha = 0.6; // Semi-transparent
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Inner core
        ctx.shadowBlur = 5;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    hasHit(enemyId) {
        return this.hitEnemies.has(enemyId);
    }

    markHit(enemyId) {
        this.hitEnemies.add(enemyId);
    }
}


// --- js/game/entities/Missile.js ---



class Missile extends Projectile {
    constructor(game, x, y, target) {
        super(game, x, y, target);
        this.target = target;

        // Missile Stats
        this.speed = 450;
        this.turnSpeed = 5.0; // Radians per second
        this.damage = game.player.damage * 2.0;
        this.color = '#ff0088';
        this.radius = 8;
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


// --- js/game/entities/Drone.js ---


class Drone {
    constructor(game, player) {
        this.game = game;
        this.player = player;
        this.x = player.x;
        this.y = player.y;
        this.radius = 10;
        this.color = '#00ffaa';

        // Orbit parameters
        this.angle = Math.random() * Math.PI * 2;
        this.distance = 60;
        this.speed = 2; // Orbit speed

        // Combat
        this.shootInterval = 1.0;
        this.shootTimer = 0;
        this.range = 300;
    }

    update(dt) {
        // Validate and clear invalid target
        if (this.game.droneTarget) {
            if (this.game.droneTarget.markedForDeletion ||
                this.game.droneTarget.hp <= 0 ||
                !this.game.waveManager ||
                !this.game.waveManager.enemies.includes(this.game.droneTarget)) {
                this.game.droneTarget = null;
            }
        }

        // Determine orbit center
        let centerX = this.player.x;
        let centerY = this.player.y;
        let orbitSpeed = this.speed;

        // If valid target exists, orbit around it
        if (this.game.droneTarget) {
            centerX = this.game.droneTarget.x;
            centerY = this.game.droneTarget.y;
            orbitSpeed = this.speed * 2; // Orbit faster around enemies
        }

        // Orbit logic
        this.angle += orbitSpeed * dt;

        // Target position
        const targetX = centerX + Math.cos(this.angle) * this.distance;
        const targetY = centerY + Math.sin(this.angle) * this.distance;

        // Smooth movement to target position (Lerp)
        const lerpFactor = 5.0 * dt;
        this.x += (targetX - this.x) * lerpFactor;
        this.y += (targetY - this.y) * lerpFactor;

        // Shoot nearest enemy
        this.shootTimer -= dt;
        if (this.shootTimer <= 0) {
            this.shoot();
            this.shootTimer = this.player.shootInterval; // Sync with player attack speed
        }
    }

    shoot() {
        if (!this.game.waveManager) return;

        // Shared Target Logic
        // Check if current target is valid
        if (this.game.droneTarget && (this.game.droneTarget.markedForDeletion || this.game.droneTarget.hp <= 0)) {
            this.game.droneTarget = null;
        }

        // If no target, find new one
        if (!this.game.droneTarget) {
            let nearest = null;
            let minDist = Infinity;

            this.game.waveManager.enemies.forEach(enemy => {
                if (enemy.markedForDeletion) return;

                const dx = enemy.x - this.player.x; // Find nearest to player, not drone
                const dy = enemy.y - this.player.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < this.range && dist < minDist) {
                    minDist = dist;
                    nearest = enemy;
                }
            });

            if (nearest) {
                this.game.droneTarget = nearest;
            }
        }

        // Attack shared target
        if (this.game.droneTarget) {
            const target = this.game.droneTarget;

            // Check if target is within range of THIS drone
            const dx = target.x - this.x;
            const dy = target.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < this.range) {
                // Drones shoot standard projectiles for now
                const proj = new Projectile(this.game, this.x, this.y, target);
                proj.damage = this.game.player.damage * 1.0; // 100% of player damage
                proj.color = this.color;   // Override color
                this.game.player.projectiles.push(proj);
            }
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Rotors animation
        const time = performance.now() / 100;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;

        ctx.save();
        ctx.rotate(time);
        ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(12, 0); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(0, 12); ctx.stroke();
        ctx.restore();

        ctx.restore();
    }
}


// --- js/game/entities/EnemyProjectile.js ---
class EnemyProjectile {
    constructor(game, x, y, target, type = 'normal', damage = 10) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.type = type; // normal, fireball, void, slime, plasma
        this.speed = 200;
        this.radius = 6;
        this.damage = damage;
        this.markedForDeletion = false;
        this.color = '#ff4400';
        this.timer = 0; // For animation

        // Calculate direction to target (player)
        // Target can be an object {x, y} or the player entity
        const dx = target.x - x;
        const dy = target.y - y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0) {
            this.vx = (dx / dist) * this.speed;
            this.vy = (dy / dist) * this.speed;
        } else {
            this.vx = this.speed;
            this.vy = 0;
        }

        // Set default colors based on type
        if (this.type === 'fireball') this.color = '#ffaa00';
        else if (this.type === 'void') this.color = '#aa00ff';
        else if (this.type === 'slime') this.color = '#00ff88';
        else if (this.type === 'plasma') this.color = '#00ffff';
    }

    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.timer += dt;

        // Check world bounds instead of canvas bounds
        if (this.x < 0 || this.x > this.game.worldWidth ||
            this.y < 0 || this.y > this.game.worldHeight) {
            this.markedForDeletion = true;
        }
    }

    draw(ctx) {
        ctx.save();
        if (this.type === 'fireball') {
            // Fireball Effect
            const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius * 2);
            gradient.addColorStop(0, '#ffff00');
            gradient.addColorStop(0.4, '#ff4400');
            gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * 2, 0, Math.PI * 2);
            ctx.fill();

            // Core
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * 0.5, 0, Math.PI * 2);
            ctx.fill();

        } else if (this.type === 'void') {
            // Void Orb Effect
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.stroke();

            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * 0.7, 0, Math.PI * 2);
            ctx.fill();

            // Orbiting particles
            const angle = this.timer * 10;
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x + Math.cos(angle) * this.radius, this.y + Math.sin(angle) * this.radius, 2, 0, Math.PI * 2);
            ctx.fill();

        } else if (this.type === 'slime') {
            // Slime Ball Effect
            const wobble = Math.sin(this.timer * 10) * 2;
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + wobble, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.stroke();

        } else if (this.type === 'plasma') {
            // Plasma Bolt Effect
            ctx.shadowBlur = 10;
            ctx.shadowColor = this.color;
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            ctx.strokeStyle = this.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 2, 0, Math.PI * 2);
            ctx.stroke();

        } else {
            // Normal
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.stroke();
        }
        ctx.restore();
    }
}


// --- js/game/entities/EnemyMissile.js ---



class EnemyMissile extends EnemyProjectile {
    constructor(game, x, y, target, damage = 8) {
        super(game, x, y, target, 'missile', damage);
        this.target = target;
        this.speed = 162.5; // Increased by 30% from 125
        this.turnSpeed = 2.5;
        this.color = '#ff0000';
        this.lifeTime = 20.0; // 5x duration

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


// --- js/game/entities/Drop.js ---
class Drop {
    constructor(game, x, y, type = 'energy', value = 1) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.type = type; // 'energy' or 'money'
        this.value = value;
        this.radius = 6;
        this.magnetRadius = 100; // Distance to start flying to player
        this.speed = 400;
        this.markedForDeletion = false;
        
        if (type === 'energy') {
            this.color = '#00ffff';
        } else if (type === 'potion') {
            this.color = '#00ff00';
            this.radius = 8; // Slightly larger
        } else {
            this.color = '#ffd700';
        }
        
        this.time = Math.random() * 100;
    }

    update(dt) {
        this.time += dt;
        const dx = this.game.player.x - this.x;
        const dy = this.game.player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < this.magnetRadius) {
            this.x += (dx / dist) * this.speed * dt;
            this.y += (dy / dist) * this.speed * dt;
        }

        if (dist < this.game.player.radius) {
            // Collected
            this.markedForDeletion = true;
            if (this.type === 'energy') {
                const multiplier = this.game.debugMode ? 100 : 1;
                const val = Math.ceil(this.value * multiplier);
                this.game.ene += val;
                if (this.game.totalEneCollected !== undefined) {
                    this.game.totalEneCollected += val;
                }
                this.game.audio.playCollect(); // Sound effect
            } else if (this.type === 'potion') {
                this.game.player.hp = Math.min(this.game.player.maxHp, this.game.player.hp + this.value);
                this.game.showDamage(this.game.player.x, this.game.player.y - 30, '+' + this.value, '#00ff00');
                this.game.audio.playUpgrade(); // or playCollect
                
                // Orange Item: Time Stop
                if (this.game.player.hasTimeStop) {
                    this.game.timeStopTimer = 3.0; // 3 seconds
                    this.game.showDamage(this.game.player.x, this.game.player.y - 50, "TIME STOP!", '#aa00ff');
                }
            }
            // console.log("Collected " + this.type, "Value:", this.value);
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        // Rotate
        ctx.rotate(this.time * 2);

        // Neon Glow
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;

        if (this.type === 'potion') {
            // Draw Plus sign for potion
            ctx.fillRect(-this.radius / 3, -this.radius, (this.radius / 3) * 2, this.radius * 2);
            ctx.fillRect(-this.radius, -this.radius / 3, this.radius * 2, (this.radius / 3) * 2);
            
            ctx.fillStyle = '#fff';
            ctx.shadowBlur = 0;
            ctx.fillRect(-this.radius / 6, -this.radius / 2, (this.radius / 6) * 2, this.radius);
            ctx.fillRect(-this.radius / 2, -this.radius / 6, this.radius, (this.radius / 6) * 2);
        } else {
            // Diamond shape (Data Crystal)
            ctx.beginPath();
            ctx.moveTo(0, -this.radius);
            ctx.lineTo(this.radius, 0);
            ctx.lineTo(0, this.radius);
            ctx.lineTo(-this.radius, 0);
            ctx.closePath();
            ctx.fill();

            // Inner white core
            ctx.fillStyle = '#fff';
            ctx.shadowBlur = 0;
            ctx.beginPath();
            ctx.moveTo(0, -this.radius * 0.5);
            ctx.lineTo(this.radius * 0.5, 0);
            ctx.lineTo(0, this.radius * 0.5);
            ctx.lineTo(-this.radius * 0.5, 0);
            ctx.closePath();
            ctx.fill();
        }

        ctx.restore();
    }
}


// --- js/game/entities/Obstacle.js ---
class Obstacle {
    constructor(game, x, y, type = 'rock') {
        this.game = game;
        this.x = x;
        this.y = y;
        this.type = type;
        this.radius = 30;
        this.color = '#888888';
        this.time = Math.random() * 100;

        // Set visuals based on map level
        const mapLevel = game.mapLevel || 1;
        if (mapLevel === 1) {
            // Stage 1: Green Forest
            this.color = '#00ff88';
            this.type = 'tree';
        } else if (mapLevel === 2) {
            // Stage 2: Lava Zone
            this.color = '#ff8844';
            this.type = 'rock';
        } else if (mapLevel === 3) {
            // Stage 3: Void Realm
            this.color = '#ff00ff';
            this.type = 'crystal';
        } else if (mapLevel === 4) {
            // Stage 4: Ice Cave
            this.color = '#88ffff';
            this.type = 'ice';
        } else if (mapLevel === 5) {
            // Stage 5: Desert Ruins
            this.color = '#ffff88';
            this.type = 'cactus';
        } else if (mapLevel === 6) {
            // Stage 6: Deep Ocean
            this.color = '#4488ff';
            this.type = 'coral';
        } else if (mapLevel === 7) {
            // Stage 7: Volcanic Core
            this.color = '#ff4400';
            this.type = 'lava_rock';
        } else if (mapLevel === 8) {
            // Stage 8: Storm Plains
            this.color = '#aaaaff';
            this.type = 'lightning';
        } else if (mapLevel === 9) {
            // Stage 9: Neon City
            this.color = '#ff00ff';
            this.type = 'neon';
        } else {
            // Stage 10: Chaos Dimension
            this.color = `hsl(${Math.random() * 360}, 100%, 50%)`;
            this.type = 'chaos';
        }
    }

    update(dt) {
        this.time += dt;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;

        if (this.type === 'tree') {
            // Tree: Trunk + Crown
            // Trunk
            ctx.fillStyle = '#8b4513';
            ctx.fillRect(-5, 0, 10, 30);

            // Crown (triangle)
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.moveTo(0, -20);
            ctx.lineTo(-20, 20);
            ctx.lineTo(20, 20);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        } else if (this.type === 'rock') {
            // Rock: Irregular hexagon
            const sway = Math.sin(this.time) * 2;
            ctx.beginPath();
            ctx.moveTo(0, -this.radius + sway);
            ctx.lineTo(this.radius * 0.8, -this.radius * 0.4);
            ctx.lineTo(this.radius, this.radius * 0.2);
            ctx.lineTo(this.radius * 0.3, this.radius);
            ctx.lineTo(-this.radius * 0.3, this.radius);
            ctx.lineTo(-this.radius, this.radius * 0.2);
            ctx.lineTo(-this.radius * 0.8, -this.radius * 0.4);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        } else if (this.type === 'crystal') {
            // Crystal: Floating diamond
            const hover = Math.sin(this.time * 2) * 5;
            ctx.rotate(this.time * 0.5);

            ctx.beginPath();
            ctx.moveTo(0, -this.radius + hover);
            ctx.lineTo(this.radius * 0.7, 0);
            ctx.lineTo(0, this.radius + hover);
            ctx.lineTo(-this.radius * 0.7, 0);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Inner glow
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.moveTo(0, -this.radius * 0.3 + hover);
            ctx.lineTo(this.radius * 0.3, 0);
            ctx.lineTo(0, this.radius * 0.3 + hover);
            ctx.lineTo(-this.radius * 0.3, 0);
            ctx.closePath();
            ctx.fill();
        } else if (this.type === 'ice') {
            // Ice Crystal: Six-pointed star
            const sparkle = Math.sin(this.time * 3) * 0.1 + 0.9;
            ctx.scale(sparkle, sparkle);
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (i * Math.PI * 2) / 6;
                const x1 = Math.cos(angle) * this.radius;
                const y1 = Math.sin(angle) * this.radius;
                const x2 = Math.cos(angle + Math.PI / 6) * (this.radius * 0.4);
                const y2 = Math.sin(angle + Math.PI / 6) * (this.radius * 0.4);
                if (i === 0) ctx.moveTo(x1, y1);
                else ctx.lineTo(x1, y1);
                ctx.lineTo(x2, y2);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        } else if (this.type === 'cactus') {
            // Cactus: Main body + arms
            ctx.fillStyle = this.color;
            // Main body
            ctx.fillRect(-8, -this.radius, 16, this.radius * 2);
            // Left arm
            ctx.fillRect(-this.radius * 0.6, -10, 10, 20);
            // Right arm
            ctx.fillRect(this.radius * 0.3, -5, 10, 15);
            // Add spikes
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 2;
            for (let i = 0; i < 8; i++) {
                const y = -this.radius + (i / 8) * this.radius * 2;
                ctx.beginPath();
                ctx.moveTo(-10, y);
                ctx.lineTo(-13, y);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(10, y);
                ctx.lineTo(13, y);
                ctx.stroke();
            }
        } else if (this.type === 'coral') {
            // Coral: Branching structure
            ctx.fillStyle = this.color;
            const wave = Math.sin(this.time * 2) * 3;
            // Main stem
            ctx.fillRect(-4, 0, 8, this.radius);
            // Branches
            ctx.beginPath();
            ctx.arc(-10 + wave, this.radius * 0.3, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(10 + wave, this.radius * 0.5, 7, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(-8 - wave, this.radius * 0.7, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        } else if (this.type === 'lava_rock') {
            // Lava Rock: Jagged rock with glowing cracks
            const pulse = Math.sin(this.time * 2) * 0.5 + 0.5;
            ctx.beginPath();
            ctx.moveTo(0, -this.radius);
            ctx.lineTo(this.radius * 0.9, -this.radius * 0.3);
            ctx.lineTo(this.radius * 0.7, this.radius * 0.4);
            ctx.lineTo(0, this.radius);
            ctx.lineTo(-this.radius * 0.7, this.radius * 0.4);
            ctx.lineTo(-this.radius * 0.9, -this.radius * 0.3);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            // Glowing cracks
            ctx.strokeStyle = `rgba(255, 200, 0, ${pulse})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(0, -this.radius);
            ctx.lineTo(0, this.radius);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(-this.radius * 0.5, 0);
            ctx.lineTo(this.radius * 0.5, 0);
            ctx.stroke();
        } else if (this.type === 'lightning') {
            // Lightning Pillar: Vertical jagged line with glow
            const flicker = Math.random() > 0.8 ? 1.5 : 1;
            ctx.shadowBlur = 20 * flicker;
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(0, -this.radius);
            ctx.lineTo(5, -this.radius * 0.5);
            ctx.lineTo(-5, 0);
            ctx.lineTo(7, this.radius * 0.5);
            ctx.lineTo(0, this.radius);
            ctx.stroke();
            // Core glow
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.stroke();
        } else if (this.type === 'neon') {
            // Neon Pillar: Glowing box with grid
            ctx.shadowBlur = 15;
            ctx.fillRect(-this.radius * 0.4, -this.radius, this.radius * 0.8, this.radius * 2);
            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 2;
            ctx.strokeRect(-this.radius * 0.4, -this.radius, this.radius * 0.8, this.radius * 2);
            // Horizontal lines
            for (let i = 0; i < 3; i++) {
                const y = -this.radius + (i + 1) * (this.radius * 2 / 4);
                ctx.beginPath();
                ctx.moveTo(-this.radius * 0.4, y);
                ctx.lineTo(this.radius * 0.4, y);
                ctx.stroke();
            }
        } else if (this.type === 'chaos') {
            // Chaos Orb: Shifting random shape
            const segments = 8;
            const shift = Math.sin(this.time * 3);
            ctx.beginPath();
            for (let i = 0; i < segments; i++) {
                const angle = (i / segments) * Math.PI * 2;
                const r = this.radius * (0.7 + Math.sin(this.time * 2 + i) * 0.3);
                const x = Math.cos(angle) * r;
                const y = Math.sin(angle) * r;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            // Rotating inner shapes
            ctx.rotate(this.time);
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            for (let i = 0; i < 3; i++) {
                ctx.beginPath();
                ctx.arc(0, 0, this.radius * (0.3 + i * 0.2), 0, Math.PI * 2);
                ctx.stroke();
            }
        }

        ctx.restore();
    }

    // Check collision with circle (player/projectile)
    collidesWith(x, y, radius) {
        const dx = this.x - x;
        const dy = this.y - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        return dist < this.radius + radius;
    }
}


// --- js/game/entities/Enemy.js ---




class Enemy {
    constructor(game, x, y) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.speed = 50;
        this.radius = 15;
        this.hp = 10;
        this.maxHp = 10;
        this.damage = 5;
        this.markedForDeletion = false;
        this.type = 'enemy';
        this.color = '#ff0000';
        this.time = Math.random() * 100; // For animation
    }

    update(dt) {
        this.time += dt;

        if (this.frostAuraTimer && this.frostAuraTimer > 0) {
            this.frostAuraTimer -= dt;
            if (this.frostAuraTimer <= 0) {
                this.speed = this.originalSpeed || this.speed;
                this.frostAuraTimer = 0;
            }
        }

        // Move towards player (default behavior)
        const dx = this.game.player.x - this.x;
        const dy = this.game.player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0) {
            this.x += (dx / dist) * this.speed * dt;
            this.y += (dy / dist) * this.speed * dt;
        }
    }

    takeDamage(amount) {
        this.hp -= amount;
        return true;
    }

    draw(ctx) {
        // Draw Neon Shape
        ctx.save();
        ctx.translate(this.x, this.y);

        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;

        this.drawShape(ctx);

        ctx.restore();

        // Draw HP Bar
        this.drawHpBar(ctx);
    }

    drawShape(ctx) {
        // Default Circle
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }

    drawHpBar(ctx) {
        let width = 30;
        let height = 4;
        let yOffset = -this.radius - 15;

        if (this.isBoss) {
            width = 100;
            height = 10;
            yOffset = -this.radius - 30;
        }

        // Background
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(this.x - width / 2, this.y + yOffset, width, height);

        // HP
        const hpPercent = Math.max(0, this.hp / this.maxHp);
        ctx.fillStyle = '#ff0000'; // Red
        ctx.fillRect(this.x - width / 2, this.y + yOffset, width * hpPercent, height);
    }
}

class Slime extends Enemy {
    constructor(game, x, y) {
        super(game, x, y);
        this.speed = 80;
        this.hp = 20;
        this.maxHp = 20;
        this.type = 'slime';
        this.color = '#00ff88'; // Neon Green
    }

    drawShape(ctx) {
        // Wobbling Shell with Glitch Effect
        const wobble = Math.sin(this.time * 5) * 2;
        const r = this.radius + wobble;

        // Glitch offset
        const gx = (Math.random() - 0.5) * 4;
        const gy = (Math.random() - 0.5) * 4;

        ctx.beginPath();
        ctx.arc(gx, gy, r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 255, 136, 0.3)'; // Translucent shell
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.stroke();

        // Digital Noise Lines
        ctx.beginPath();
        ctx.moveTo(-r, 0);
        ctx.lineTo(r, 0);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.stroke();

        // Nucleus
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();

        // Eyes
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(-5, -5 + wobble, 2, 0, Math.PI * 2);
        ctx.arc(5, -5 + wobble, 2, 0, Math.PI * 2);
        ctx.fill();
    }
}

class Golem extends Enemy {
    constructor(game, x, y) {
        super(game, x, y);
        this.speed = 40;
        this.hp = 100;
        this.maxHp = 100;
        this.radius = 25;
        this.damage = 10;
        this.type = 'golem';
        this.color = '#ff4444'; // Neon Red
    }

    drawShape(ctx) {
        const s = this.radius;

        // Energy Lines connecting parts
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(-s - 5, -s / 2); // To Left Arm
        ctx.moveTo(0, 0); ctx.lineTo(s / 2 + 5, -s / 2); // To Right Arm
        ctx.moveTo(0, 0); ctx.lineTo(0, -s); // To Head
        ctx.stroke();

        // Torso (Hexagon-ish)
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(-s / 2, -s / 2);
        ctx.lineTo(s / 2, -s / 2);
        ctx.lineTo(s / 2, s / 2);
        ctx.lineTo(-s / 2, s / 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Head
        ctx.fillRect(-s / 4, -s, s / 2, s / 2);

        // Arms (floating)
        const armOffset = Math.sin(this.time * 3) * 5;
        ctx.fillRect(-s - 5, -s / 2 + armOffset, s / 2, s); // Left
        ctx.fillRect(s / 2 + 5, -s / 2 - armOffset, s / 2, s); // Right

        // Core
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#ffff00';
        ctx.fillStyle = '#ffff00';
        ctx.fillRect(-5, -5, 10, 10);
    }
}

class Lizard extends Enemy {
    constructor(game, x, y) {
        super(game, x, y);
        this.speed = 100;
        this.hp = 30;
        this.maxHp = 30;
        this.type = 'lizard';
        this.color = '#aa00ff'; // Neon Purple

        this.shootTimer = 0;
        this.shootInterval = 2.0;
    }

    update(dt) {
        super.update(dt);

        this.shootTimer += dt;
        if (this.shootTimer >= this.shootInterval) {
            this.shoot();
            this.shootTimer = 0;
        }
    }

    shoot() {
        this.game.enemyProjectiles.push(
            new EnemyProjectile(this.game, this.x, this.y, this.game.player, 'normal', this.damage)
        );
    }

    drawShape(ctx) {
        // Calculate angle to player for rotation
        const dx = this.game.player.x - this.x;
        const dy = this.game.player.y - this.y;
        const angle = Math.atan2(dy, dx);

        ctx.rotate(angle);

        // Cyber Spine
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.radius, 0);
        ctx.lineTo(-this.radius, 0);
        ctx.stroke();

        // Body (Triangle)
        ctx.beginPath();
        ctx.moveTo(this.radius, 0);
        ctx.lineTo(-this.radius, this.radius * 0.8);
        ctx.lineTo(-this.radius, -this.radius * 0.8);
        ctx.closePath();
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.strokeStyle = this.color;
        ctx.stroke();

        // Scales / Armor Plates
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-10, 5);
        ctx.lineTo(-5, 0);
        ctx.lineTo(-10, -5);
        ctx.fill();

        // Tail
        const tailWag = Math.sin(this.time * 10) * 5;
        ctx.beginPath();
        ctx.moveTo(-this.radius, 0);
        ctx.lineTo(-this.radius * 2, tailWag);
        ctx.strokeStyle = this.color;
        ctx.stroke();

        // Limbs
        ctx.beginPath();
        ctx.moveTo(0, this.radius * 0.5);
        ctx.lineTo(5, this.radius + 5); // Leg R
        ctx.moveTo(0, -this.radius * 0.5);
        ctx.lineTo(5, -this.radius - 5); // Leg L
        ctx.stroke();

        ctx.rotate(-angle); // Reset rotation
    }
}

class Totem extends Enemy {
    constructor(game, x, y) {
        super(game, x, y);
        this.speed = 0; // Stationary
        this.hp = 50;
        this.maxHp = 50;
        this.radius = 20;
        this.type = 'totem';
        this.color = '#ff00ff'; // Magenta

        this.laserTimer = 0;
        this.laserInterval = 3.0;
        this.isFiring = false;
        this.laserDuration = 0.5;
        this.firingTimer = 0;
    }

    update(dt) {
        if (this.isFiring) {
            this.firingTimer += dt;
            if (this.firingTimer > this.laserDuration) {
                this.isFiring = false;
                this.firingTimer = 0;
            }
            this.checkLaserCollision();
        } else {
            this.laserTimer += dt;
            if (this.laserTimer > this.laserInterval) {
                this.isFiring = true;
                this.laserTimer = 0;
            }
        }
    }

    checkLaserCollision() {
        const dx = this.game.player.x - this.x;
        const dy = this.game.player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 150) { // Blast radius
            this.game.player.hp -= this.damage * 2.0 * 0.016; // Rapid damage (scaled)
            if (this.game.player.hp <= 0) this.game.gameOver();
        }
    }

    draw(ctx) {
        // Draw Laser/Blast warning
        if (this.isFiring) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, 150, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 0, 255, 0.3)';
            ctx.fill();
            ctx.strokeStyle = 'magenta';
            ctx.stroke();
        } else if (this.laserTimer > this.laserInterval - 1.0) {
            // Warning charge
            ctx.beginPath();
            ctx.arc(this.x, this.y, 150 * (this.laserTimer - (this.laserInterval - 1.0)), 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 0, 255, 0.5)';
            ctx.stroke();
        }

        super.draw(ctx);
    }

    drawShape(ctx) {
        // Stacked segments
        const hover = Math.sin(this.time * 2) * 5;

        // Rotating Rings
        ctx.save();
        ctx.rotate(this.time);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.arc(0, -10 + hover, 30, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // Base
        ctx.fillStyle = this.color;
        ctx.fillRect(-10, 10, 20, 10);

        // Middle (Floating)
        ctx.fillRect(-15, -5 + hover, 30, 10);

        // Top (Floating)
        ctx.fillRect(-10, -20 + hover, 20, 10);

        // Eye (Pulsating)
        const pulse = (Math.sin(this.time * 10) + 1) * 0.5;
        ctx.fillStyle = `rgba(255, 255, 255, ${0.5 + pulse * 0.5})`;
        ctx.shadowBlur = 10 + pulse * 10;
        ctx.shadowColor = '#fff';
        ctx.beginPath();
        ctx.arc(0, -15 + hover, 3 + pulse * 2, 0, Math.PI * 2);
        ctx.fill();
    }
}

class KamikazeEnemy extends Enemy {
    constructor(game, x, y) {
        super(game, x, y);
        this.speed = 90; // 50% slower
        this.hp = 15;
        this.maxHp = 15;
        this.damage = 10; // 50% damage
        this.type = 'kamikaze';
        this.color = '#ffaa00'; // Orange
        this.radius = 12;
    }

    update(dt) {
        super.update(dt);

        // Self-destruct check
        const dx = this.game.player.x - this.x;
        const dy = this.game.player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < this.radius + this.game.player.radius + 5) {
            this.explode();
        }
    }

    explode() {
        this.markedForDeletion = true;
        let dmg = this.damage * (this.game.player.damageMultiplier || 1.0); // Titanium Plating effect

        // Energy Barrier: Shield absorbs damage first
        if (this.game.player.shield && this.game.player.shield > 0) {
            const shieldAbsorb = Math.min(this.game.player.shield, dmg);
            this.game.player.shield -= shieldAbsorb;
            dmg -= shieldAbsorb;
            if (shieldAbsorb > 0) {
                this.game.showDamage(this.game.player.x, this.game.player.y - 20, Math.round(shieldAbsorb), '#8888ff');
            }
        }

        // Reset shield regeneration timer on hit
        if (this.game.player.shieldRegenTimer !== undefined) {
            this.game.player.shieldRegenTimer = 0;
        }

        this.game.player.hp -= dmg;
        this.game.showDamage(this.game.player.x, this.game.player.y, Math.round(dmg), '#ffaa00');

        // Explosion visual
        for (let i = 0; i < 20; i++) {
            const p = new Particle(this.game, this.x, this.y, this.color);
            p.speed *= 2; // Faster particles
            this.game.particles.push(p);
        }

        // Sound (using hit sound for now, ideally explosion sound)
        this.game.audio.playHit();
    }

    drawShape(ctx) {
        // Spiky shape
        const spikes = 8;
        ctx.beginPath();
        for (let i = 0; i < spikes * 2; i++) {
            const angle = (Math.PI * 2 * i) / (spikes * 2);
            const r = i % 2 === 0 ? this.radius : this.radius * 0.5;
            const x = Math.cos(angle + this.time * 15) * r; // Faster rotation
            const y = Math.sin(angle + this.time * 15) * r;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.stroke();

        // Pulse effect
        if (Math.floor(this.time * 10) % 2 === 0) {
            ctx.fillStyle = '#ffffff';
            ctx.fill();
        }
    }
}

class MissileEnemy extends Enemy {
    constructor(game, x, y) {
        super(game, x, y);
        this.speed = 60;
        this.hp = 40;
        this.maxHp = 40;
        this.type = 'missile_enemy';
        this.color = '#ff0088';
        this.radius = 20;

        this.shootTimer = 0;
        this.shootInterval = 3.0;
    }

    update(dt) {
        super.update(dt);
        this.shootTimer += dt;
        if (this.shootTimer >= this.shootInterval) {
            this.shoot();
            this.shootTimer = 0;
        }
    }

    shoot() {
        this.game.enemyProjectiles.push(
            new EnemyMissile(this.game, this.x, this.y, this.game.player, this.damage)
        );
    }

    drawShape(ctx) {
        // Boxy with missile pods
        ctx.fillStyle = this.color;
        ctx.fillRect(-15, -15, 30, 30);

        // Pods
        ctx.fillStyle = '#440022';
        ctx.fillRect(-20, -10, 5, 20);
        ctx.fillRect(15, -10, 5, 20);
    }
}

class BeamEnemy extends Enemy {
    constructor(game, x, y) {
        super(game, x, y);
        this.speed = 30;
        this.hp = 60;
        this.maxHp = 60;
        this.type = 'beam_enemy';
        this.color = '#0088ff';
        this.radius = 25;

        this.chargeTimer = 0;
        this.chargeDuration = 2.0;
        this.fireDuration = 1.0;
        this.isFiring = false;
        this.beamAngle = 0;
    }

    update(dt) {
        // Stop moving when charging/firing
        if (this.chargeTimer > 1.0 || this.isFiring) {
            // Don't move
        } else {
            super.update(dt);
        }

        if (this.isFiring) {
            this.chargeTimer += dt;
            if (this.chargeTimer > this.fireDuration) {
                this.isFiring = false;
                this.chargeTimer = 0;
            } else {
                // Check collision
                this.checkBeamCollision();
            }
        } else {
            this.chargeTimer += dt;
            // Track player while charging
            const dx = this.game.player.x - this.x;
            const dy = this.game.player.y - this.y;
            this.beamAngle = Math.atan2(dy, dx);

            if (this.chargeTimer > this.chargeDuration) {
                this.isFiring = true;
                this.chargeTimer = 0;
            }
        }
    }

    checkBeamCollision() {
        // Raycast check
        const range = 400;
        const p = this.game.player;

        // Simplified: Check if player is within angle cone and distance
        const dx = p.x - this.x;
        const dy = p.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < range) {
            const angleToPlayer = Math.atan2(dy, dx);
            let angleDiff = angleToPlayer - this.beamAngle;
            while (angleDiff <= -Math.PI) angleDiff += Math.PI * 2;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

            if (Math.abs(angleDiff) < 0.15) { // Narrow beam
                p.hp -= this.damage * 2.0 * 0.016; // Rapid damage (scaled)
                if (p.hp <= 0) this.game.gameOver();
            }
        }
    }

    draw(ctx) {
        super.draw(ctx);

        // Draw Beam
        if (this.isFiring) {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.beamAngle);

            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(400, 0);
            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 10 + Math.sin(this.game.waveManager.time * 20) * 5;
            ctx.stroke();

            // Core
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 4;
            ctx.stroke();

            ctx.restore();
        } else if (this.chargeTimer > 1.0) {
            // Charging line
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.beamAngle);

            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(400, 0);
            ctx.strokeStyle = `rgba(0, 255, 255, 0.2)`;
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.restore();
        }
    }

    drawShape(ctx) {
        // Eye shape
        ctx.beginPath();
        ctx.ellipse(0, 0, 20, 12, 0, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.stroke();

        // Pupil
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();
    }
}


// --- js/game/entities/Chest.js ---
class Chest {
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
        let available = [...this.game.ui.relics].filter(r => r.category !== 'none');
        if (this.category !== 'random') {
            available = available.filter(r => r.category === this.category);
        }

        // Select up to 3 items (or less if not enough in category)
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

            // 選択したアイテムを追加し、リストから削除
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


// --- js/game/entities/BossAltar.js ---
class BossAltar {
    constructor(game, x, y) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.radius = 40;
        this.active = true;
        this.color = '#ff00ff';
        this.glow = 0;
    }

    update(dt) {
        if (!this.active) return;

        this.glow += dt * 5;

        // Check interaction
        const dx = this.game.player.x - this.x;
        const dy = this.game.player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < this.radius + this.game.player.radius) {
            // Summon Boss!
            this.game.waveManager.summonBoss();
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

        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 0, 255, 0.3)';
        ctx.fill();

        ctx.strokeStyle = this.color;
        ctx.lineWidth = 3;
        ctx.stroke();

        // Text
        ctx.fillStyle = '#fff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText("SUMMON BOSS", 0, 5);

        ctx.restore();
    }
}


// --- js/game/entities/Boss.js ---




// --- Base Boss Class ---
class BaseBoss extends Enemy {
    constructor(game, x, y, type = 'boss') {
        super(game, x, y);
        this.type = type;
        this.isBoss = true;

        // Base Stats (Will be scaled by WaveManager)
        this.radius = 60;
        this.speed = 80;
        this.hp = 1000;
        this.maxHp = 1000;
        this.damage = 15;
        this.color = '#ff0000';

        // State Machine
        this.state = 'chase';
        this.stateTimer = 0;
        this.stateDuration = 5.0;

        this.pulse = 0;
        this.angle = 0; // Facing angle
    }

    update(dt) {
        this.pulse += dt * 5;
        this.stateTimer += dt;

        // State Transitions
        if (this.stateTimer >= this.stateDuration) {
            this.switchState();
        }

        this.updateState(dt);

        // Always check bounds
        this.x = Math.max(this.radius, Math.min(this.x, this.game.worldWidth - this.radius));
        this.y = Math.max(this.radius, Math.min(this.y, this.game.worldHeight - this.radius));
    }

    switchState() {
        this.stateTimer = 0;
        this.state = 'chase';
        this.stateDuration = 2.0;
    }

    updateState(dt) {
        if (this.state === 'chase') {
            this.behaviorChase(dt);
        }
    }

    behaviorChase(dt) {
        const dx = this.game.player.x - this.x;
        const dy = this.game.player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0) {
            this.x += (dx / dist) * this.speed * dt;
            this.y += (dy / dist) * this.speed * dt;
        }
    }

    drawShape(ctx) {
        // Default Boss Shape
        ctx.save();
        ctx.rotate(this.pulse * 0.2);
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
}

// --- Boss 1: Overlord (Balanced) ---
class Overlord extends BaseBoss {
    constructor(game, x, y) {
        super(game, x, y, 'overlord');
        this.color = '#ff0000';

        // Attack Vars
        this.chargeTarget = { x: 0, y: 0 };
        this.barrageCount = 0;
        this.laserAngle = 0;
        this.isFiringLaser = false;
    }

    switchState() {
        this.stateTimer = 0;
        const rand = Math.random();

        if (this.state === 'chase') {
            if (rand < 0.4) this.startBarrage();
            else if (rand < 0.7) this.startCharge();
            else this.startLaser();
        } else {
            this.state = 'chase';
            this.stateDuration = 2.0 + Math.random() * 2.0;
            this.speed = 80;
            this.color = '#ff0000';
        }
    }

    updateState(dt) {
        switch (this.state) {
            case 'chase': this.behaviorChase(dt); break;
            case 'charge': this.behaviorCharge(dt); break;
            case 'barrage': this.behaviorBarrage(dt); break;
            case 'laser': this.behaviorLaser(dt); break;
        }
    }

    // -- Overlord Attacks --
    startCharge() {
        this.state = 'charge';
        this.stateDuration = 2.0;
        const dx = this.game.player.x - this.x;
        const dy = this.game.player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        this.chargeTarget = {
            x: this.x + (dx / dist) * 1000,
            y: this.y + (dy / dist) * 1000
        };
        this.color = '#ffaa00';
    }

    behaviorCharge(dt) {
        const dx = this.chargeTarget.x - this.x;
        const dy = this.chargeTarget.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 10) {
            this.x += (dx / dist) * 400 * dt;
            this.y += (dy / dist) * 400 * dt;
        } else {
            this.stateTimer = this.stateDuration;
        }
        if (Math.random() < 0.5) this.game.particles.push(new Particle(this.game, this.x, this.y, '#ffaa00'));
    }

    startBarrage() {
        this.state = 'barrage';
        this.stateDuration = 3.0;
        this.barrageCount = 0;
        this.color = '#ff00ff';
    }

    behaviorBarrage(dt) {
        this.behaviorChase(dt * 0.2);
        if (this.stateTimer > this.barrageCount * 0.2) {
            this.barrageCount++;
            const projectiles = 12;
            const offset = this.barrageCount * 0.2;
            for (let i = 0; i < projectiles; i++) {
                const angle = (Math.PI * 2 / projectiles) * i + offset;
                const tx = this.x + Math.cos(angle) * 100;
                const ty = this.y + Math.sin(angle) * 100;
                const p = new EnemyProjectile(this.game, this.x, this.y, { x: tx, y: ty }, 'plasma', this.damage);
                p.speed = 250;
                p.color = '#ff00ff'; // Override color for Overlord plasma
                this.game.enemyProjectiles.push(p);
            }
            this.game.audio.playHit();
        }
    }

    startLaser() {
        this.state = 'laser';
        this.stateDuration = 4.0;
        this.isFiringLaser = false;
        this.color = '#00ffff';
    }

    behaviorLaser(dt) {
        if (this.stateTimer < 1.0) {
            const dx = this.game.player.x - this.x;
            const dy = this.game.player.y - this.y;
            this.laserAngle = Math.atan2(dy, dx);
        } else {
            this.isFiringLaser = true;
            this.laserAngle += dt * 0.5;
            this.checkLaserCollision();
        }
    }

    checkLaserCollision() {
        const range = 600;
        const p = this.game.player;
        const dx = p.x - this.x;
        const dy = p.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < range) {
            const angleToPlayer = Math.atan2(dy, dx);
            let angleDiff = angleToPlayer - this.laserAngle;
            while (angleDiff <= -Math.PI) angleDiff += Math.PI * 2;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            if (Math.abs(angleDiff) < 0.2) {
                const dmg = this.damage * 2.0 * 0.016; // Rapid damage
                p.hp -= dmg;
                if (p.hp <= 0) this.game.gameOver();
                this.game.showDamage(p.x, p.y, Math.ceil(dmg), '#00ffff');
            }
        }
    }

    drawShape(ctx) {
        // Complex Rotating Rings
        ctx.save();

        // Outer Ring (Slow)
        ctx.rotate(this.pulse * 0.2);
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 4;
        ctx.beginPath();
        const r = this.radius + Math.sin(this.pulse) * 5;
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI * 2 / 6) * i;
            const x = Math.cos(angle) * r;
            const y = Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();

        // Middle Ring (Fast Reverse)
        ctx.rotate(-this.pulse * 0.5);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.7, 0, Math.PI * 2);
        ctx.stroke();

        // Nodes on Middle Ring
        for (let i = 0; i < 4; i++) {
            const a = (Math.PI * 2 / 4) * i;
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(Math.cos(a) * this.radius * 0.7, Math.sin(a) * this.radius * 0.7, 5, 0, Math.PI * 2);
            ctx.fill();
        }

        // Inner Core (Pulsing)
        ctx.rotate(this.pulse * 0.3);
        const coreSize = this.radius * 0.4 + Math.sin(this.pulse * 5) * 5;
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, coreSize);
        gradient.addColorStop(0, '#fff');
        gradient.addColorStop(0.5, this.color);
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, coreSize, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // Laser Visuals
        if (this.state === 'laser' && this.isFiringLaser) {
            ctx.save();
            ctx.rotate(this.laserAngle);
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(600, 0);
            ctx.lineWidth = 30 + Math.sin(this.pulse * 10) * 10;
            ctx.strokeStyle = 'rgba(0, 255, 255, 0.5)'; ctx.stroke();
            ctx.lineWidth = 10; ctx.strokeStyle = '#fff'; ctx.stroke();
            ctx.restore();
        } else if (this.state === 'laser') {
            ctx.save();
            ctx.rotate(this.laserAngle);
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(600, 0);
            ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
            ctx.setLineDash([10, 10]); ctx.stroke();
            ctx.restore();
        }
    }
}

// --- Boss 2: Slime King (Giant Slime) ---
class SlimeKing extends BaseBoss {
    constructor(game, x, y) {
        super(game, x, y, 'slime_king');
        this.name = 'SLIME KING';
        this.color = '#00ff88';
        this.radius = 80;
        this.jumpTarget = { x: 0, y: 0 };
        this.bubbles = [];
        for (let i = 0; i < 10; i++) {
            this.bubbles.push({
                x: (Math.random() - 0.5) * 40,
                y: (Math.random() - 0.5) * 40,
                r: Math.random() * 5 + 2,
                s: Math.random() * 20 + 10
            });
        }
    }

    switchState() {
        this.stateTimer = 0;
        const rand = Math.random();
        if (this.state === 'chase') {
            if (rand < 0.6) this.startJump();
            else this.startSpawnMinions();
        } else {
            this.state = 'chase';
            this.stateDuration = 2.0;
            this.speed = 60;
        }
    }

    updateState(dt) {
        if (this.state === 'chase') this.behaviorChase(dt);
        else if (this.state === 'jump') this.behaviorJump(dt);
        else if (this.state === 'spawn') this.behaviorSpawn(dt);

        // Update bubbles
        this.bubbles.forEach(b => {
            b.y -= dt * b.s;
            if (b.y < -40) b.y = 40;
        });
    }

    // --- Boss 2: Slime King (Giant Slime) ---
    startJump() {
        this.state = 'jump';
        this.stateDuration = 2.0;
        this.jumpTarget = { x: this.game.player.x, y: this.game.player.y };
        this.jumpProgress = 0;
    }

    behaviorJump(dt) {
        this.jumpProgress += dt;

        // 0.0s - 1.0s: Charge up / Jump Up (Visual only)
        if (this.jumpProgress < 1.0) {
            // Shadow at target
            // Handled in drawShape
        }
        // 1.0s: Impact
        else if (this.jumpProgress >= 1.0 && this.jumpProgress - dt < 1.0) {
            this.x = this.jumpTarget.x;
            this.y = this.jumpTarget.y;
            const dist = Math.hypot(this.game.player.x - this.x, this.game.player.y - this.y);
            if (dist < 150) {
                this.game.player.hp -= this.damage;
                this.game.showDamage(this.game.player.x, this.game.player.y, Math.round(this.damage), '#00ff88');
            }
            // Impact Particles
            for (let i = 0; i < 30; i++) {
                const p = new Particle(this.game, this.x, this.y, this.color);
                p.speed *= 2;
                this.game.particles.push(p);
            }
            this.game.audio.playHit();
        }
        // 1.0s - 2.0s: Recovery
    }

    startSpawnMinions() {
        this.state = 'spawn';
        this.stateDuration = 1.0;
        for (let i = 0; i < 3; i++) {
            const angle = Math.random() * Math.PI * 2;
            const p = new EnemyProjectile(this.game, this.x, this.y, { x: this.x + Math.cos(angle) * 100, y: this.y + Math.sin(angle) * 100 }, 'slime', this.damage);
            p.radius = 10;
            this.game.enemyProjectiles.push(p);
        }
    }

    behaviorSpawn(dt) { }

    drawShape(ctx) {
        // Wobbling Giant Slime
        const wobble = Math.sin(this.pulse) * 5;
        let scale = 1.0;
        let alpha = 1.0;

        if (this.state === 'jump') {
            if (this.jumpProgress < 1.0) {
                // Jumping up (scale down to simulate height)
                scale = 1.0 + Math.sin(this.jumpProgress * Math.PI) * 0.5;
                // Draw Target Indicator
                ctx.save();
                ctx.translate(this.jumpTarget.x - this.x, this.jumpTarget.y - this.y); // Relative to current pos
                ctx.beginPath();
                ctx.arc(0, 0, this.radius * (this.jumpProgress), 0, Math.PI * 2); // Growing circle
                ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
                ctx.fill();
                ctx.strokeStyle = 'red';
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                ctx.stroke();
                ctx.restore();
            } else {
                // Landing squish
                scale = 1.0 - Math.sin((this.jumpProgress - 1.0) * Math.PI) * 0.3;
            }
        }

        ctx.save();
        ctx.scale(scale, scale);

        // Outer Shell (Translucent)
        ctx.fillStyle = `rgba(0, 255, 136, ${0.3 * alpha})`;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius + wobble, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Inner Core
        ctx.fillStyle = `rgba(0, 255, 136, ${0.8 * alpha})`;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.6 + wobble * 0.5, 0, Math.PI * 2);
        ctx.fill();

        // Bubbles
        ctx.fillStyle = `rgba(255, 255, 255, ${0.5 * alpha})`;
        this.bubbles.forEach(b => {
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
            ctx.fill();
        });

        // Crown (Detailed)
        ctx.fillStyle = '#ffd700';
        ctx.strokeStyle = '#b8860b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-25, -this.radius + 5);
        ctx.lineTo(-15, -this.radius - 25);
        ctx.lineTo(0, -this.radius - 10);
        ctx.lineTo(15, -this.radius - 25);
        ctx.lineTo(25, -this.radius + 5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Gem on Crown
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(0, -this.radius - 8, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

// --- Boss 3: Mecha Golem (Giant Golem) ---
class MechaGolem extends BaseBoss {
    constructor(game, x, y) {
        super(game, x, y, 'mecha_golem');
        this.name = 'MECHA GOLEM';
        this.color = '#ff4444';
        this.radius = 90;
    }

    switchState() {
        this.stateTimer = 0;
        const rand = Math.random();
        if (this.state === 'chase') {
            if (rand < 0.5) this.startRocketPunch();
            else this.startShield();
        } else {
            this.state = 'chase';
            this.stateDuration = 3.0;
        }
    }

    updateState(dt) {
        if (this.state === 'chase') this.behaviorChase(dt);
        else if (this.state === 'rocket') this.behaviorRocket(dt);
        else if (this.state === 'shield') this.behaviorShield(dt);
    }

    startRocketPunch() {
        this.state = 'rocket';
        this.stateDuration = 2.0;
        for (let i = -1; i <= 1; i++) {
            const angle = Math.atan2(this.game.player.y - this.y, this.game.player.x - this.x) + i * 0.3;
            const tx = this.x + Math.cos(angle) * 100;
            const ty = this.y + Math.sin(angle) * 100;
            const p = new EnemyProjectile(this.game, this.x, this.y, { x: tx, y: ty }, 'plasma', this.damage * 1.5);
            p.radius = 20;
            // p.damage = 40; // Removed hardcode
            p.color = '#ff0000';
            this.game.enemyProjectiles.push(p);
        }
    }

    behaviorRocket(dt) { }

    startShield() {
        this.state = 'shield';
        this.stateDuration = 4.0;
        this.hp = Math.min(this.hp + 10, this.maxHp);
    }

    behaviorShield(dt) { }

    takeDamage(amount) {
        if (this.state === 'shield') {
            // Block damage
            this.game.showDamage(this.x, this.y, 0, '#ffff00'); // Show 0 or "BLOCK"
            return false;
        }
        return super.takeDamage(amount);
    }

    drawShape(ctx) {
        // Hexagonal Golem Body
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 5;
        ctx.fillStyle = 'rgba(50, 0, 0, 0.8)';
        ctx.beginPath();
        const r = this.radius;
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI * 2 / 6) * i;
            if (i === 0) ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
            else ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Mechanical Joints
        ctx.fillStyle = '#444';
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI * 2 / 6) * i;
            ctx.beginPath();
            ctx.arc(Math.cos(angle) * r, Math.sin(angle) * r, 8, 0, Math.PI * 2);
            ctx.fill();
        }

        // Glowing Eyes
        const eyeOffset = Math.sin(this.pulse * 2) * 2;
        ctx.fillStyle = '#00ffff';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#00ffff';
        ctx.fillRect(-20, -10 + eyeOffset, 15, 5);
        ctx.fillRect(5, -10 + eyeOffset, 15, 5);
        ctx.shadowBlur = 0;

        // Shield Effect
        if (this.state === 'shield') {
            ctx.strokeStyle = '#ffff00';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, r + 15, 0, Math.PI * 2);
            ctx.stroke();

            // Scanlines
            ctx.fillStyle = 'rgba(255, 255, 0, 0.1)';
            ctx.beginPath();
            ctx.arc(0, 0, r + 15, 0, Math.PI * 2);
            ctx.fill();

            ctx.beginPath();
            for (let i = -r; i < r; i += 10) {
                ctx.moveTo(-r, i + (this.pulse * 20) % 20);
                ctx.lineTo(r, i + (this.pulse * 20) % 20);
            }
            ctx.strokeStyle = 'rgba(255, 255, 0, 0.2)';
            ctx.stroke();
        }
    }
}

// --- Boss 4: Void Phantom (Teleporter) ---
class VoidPhantom extends BaseBoss {
    constructor(game, x, y) {
        super(game, x, y, 'void_phantom');
        this.name = 'VOID PHANTOM';
        this.color = '#aa00ff';
        this.radius = 50;
        this.teleportTarget = { x: 0, y: 0 };
        this.teleportTimer = 0;
    }

    switchState() {
        this.stateTimer = 0;
        const rand = Math.random();
        if (this.state === 'chase') {
            if (rand < 0.5) this.startTeleport();
            else this.startVoidOrbs();
        } else {
            this.state = 'chase';
            this.stateDuration = 2.0;
        }
    }

    updateState(dt) {
        if (this.state === 'chase') this.behaviorChase(dt);
        else if (this.state === 'teleport') this.behaviorTeleport(dt);
        else if (this.state === 'orbs') this.behaviorOrbs(dt);
    }

    startTeleport() {
        this.state = 'teleport';
        this.stateDuration = 1.5;
        this.teleportTimer = 0;
        const angle = Math.random() * Math.PI * 2;
        this.teleportTarget.x = this.game.player.x + Math.cos(angle) * 200;
        this.teleportTarget.y = this.game.player.y + Math.sin(angle) * 200;
        // Clamp
        this.teleportTarget.x = Math.max(50, Math.min(this.teleportTarget.x, this.game.worldWidth - 50));
        this.teleportTarget.y = Math.max(50, Math.min(this.teleportTarget.y, this.game.worldHeight - 50));
    }

    behaviorTeleport(dt) {
        this.teleportTimer += dt;

        // 0.0s - 1.0s: Fade Out & Show Portal
        if (this.teleportTimer >= 1.0 && this.teleportTimer - dt < 1.0) {
            this.x = this.teleportTarget.x;
            this.y = this.teleportTarget.y;
        }
    }

    startVoidOrbs() {
        this.state = 'orbs';
        this.stateDuration = 2.0;
        const projectiles = 8;
        for (let i = 0; i < projectiles; i++) {
            const angle = (Math.PI * 2 / projectiles) * i;
            const tx = this.x + Math.cos(angle) * 100;
            const ty = this.y + Math.sin(angle) * 100;
            const p = new EnemyProjectile(this.game, this.x, this.y, { x: tx, y: ty }, 'void', this.damage);
            this.game.enemyProjectiles.push(p);
        }
    }

    behaviorOrbs(dt) { }

    drawShape(ctx) {
        let alpha = 1.0;
        if (this.state === 'teleport') {
            if (this.teleportTimer < 1.0) {
                alpha = 1.0 - this.teleportTimer; // Fade out

                // Draw Portal at target
                ctx.save();
                ctx.translate(this.teleportTarget.x - this.x, this.teleportTarget.y - this.y);
                ctx.beginPath();
                ctx.arc(0, 0, this.radius * this.teleportTimer, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(170, 0, 255, 0.3)';
                ctx.fill();
                ctx.strokeStyle = '#aa00ff';
                ctx.lineWidth = 2;
                ctx.stroke();

                // Swirl
                ctx.rotate(this.teleportTimer * 10);
                ctx.beginPath();
                ctx.moveTo(-20, 0); ctx.lineTo(20, 0);
                ctx.moveTo(0, -20); ctx.lineTo(0, 20);
                ctx.stroke();
                ctx.restore();
            } else {
                alpha = (this.teleportTimer - 1.0) * 2; // Fade in
            }
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

        // Distortion Effect (Multiple Arcs)
        for (let i = 0; i < 5; i++) {
            ctx.strokeStyle = `rgba(170, 0, 255, ${0.5 - i * 0.1})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            const r = this.radius + Math.sin(this.pulse + i) * 10;
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Void Center (Black Hole)
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.5, 0, Math.PI * 2);
        ctx.stroke();

        // Glowing Eyes
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#aa00ff';
        ctx.beginPath();
        ctx.arc(-15, -10, 6, 0, Math.PI * 2);
        ctx.arc(15, -10, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.restore();
    }
}

// --- Boss 5: Crimson Dragon (Fire Beast) ---
class CrimsonDragon extends BaseBoss {
    constructor(game, x, y) {
        super(game, x, y, 'crimson_dragon');
        this.name = 'CRIMSON DRAGON';
        this.color = '#ffaa00';
        this.radius = 100;
        this.angle = 0;
    }

    switchState() {
        this.stateTimer = 0;
        const rand = Math.random();
        if (this.state === 'chase') {
            if (rand < 0.5) this.startFireBreath();
            else this.startMeteor();
        } else {
            this.state = 'chase';
            this.stateDuration = 3.0;
        }
    }

    updateState(dt) {
        // Always face player
        const dx = this.game.player.x - this.x;
        const dy = this.game.player.y - this.y;
        this.angle = Math.atan2(dy, dx);

        if (this.state === 'chase') this.behaviorChase(dt);
        else if (this.state === 'breath') this.behaviorBreath(dt);
        else if (this.state === 'meteor') this.behaviorMeteor(dt);
    }

    startFireBreath() {
        this.state = 'breath';
        this.stateDuration = 2.0;
    }

    behaviorBreath(dt) {
        if (this.stateTimer % 0.1 < dt) {
            const angleToPlayer = Math.atan2(this.game.player.y - this.y, this.game.player.x - this.x);
            const spread = (Math.random() - 0.5) * 0.5;
            const angle = angleToPlayer + spread;
            const tx = this.x + Math.cos(angle) * 100;
            const ty = this.y + Math.sin(angle) * 100;
            const p = new EnemyProjectile(this.game, this.x, this.y, { x: tx, y: ty }, 'fireball', this.damage);
            p.radius = 12;
            this.game.enemyProjectiles.push(p);
        }
    }

    startMeteor() {
        this.state = 'meteor';
        this.stateDuration = 1.0;
        const p = new EnemyProjectile(this.game, this.x, this.y, this.game.player, 'fireball', this.damage * 2.0);
        p.speed = 400;
        p.radius = 30;
        this.game.enemyProjectiles.push(p);
    }

    behaviorMeteor(dt) { }

    drawShape(ctx) {
        // Rotate entire dragon to face player
        ctx.save();
        ctx.rotate(this.angle);

        // Dragon Head Shape
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(this.radius, 0); // Nose
        ctx.lineTo(-this.radius * 0.5, this.radius * 0.6);
        ctx.lineTo(-this.radius, this.radius * 0.4); // Back Head
        ctx.lineTo(-this.radius, -this.radius * 0.4);
        ctx.lineTo(-this.radius * 0.5, -this.radius * 0.6);
        ctx.closePath();
        ctx.fill();

        // Scales
        ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
        for (let i = 0; i < 5; i++) {
            ctx.beginPath();
            ctx.arc(-this.radius * 0.5 + i * 10, 0, 5, 0, Math.PI * 2);
            ctx.fill();
        }

        // Wings (Detailed)
        ctx.strokeStyle = '#ff4400';
        ctx.lineWidth = 4;
        ctx.beginPath();
        // Left Wing
        ctx.moveTo(0, 0);
        ctx.lineTo(-this.radius * 0.5, -this.radius * 1.8);
        ctx.lineTo(-this.radius * 1.5, -this.radius * 1.2);
        ctx.lineTo(-this.radius * 0.5, 0);
        // Right Wing
        ctx.moveTo(0, 0);
        ctx.lineTo(-this.radius * 0.5, this.radius * 1.8);
        ctx.lineTo(-this.radius * 1.5, this.radius * 1.2);
        ctx.lineTo(-this.radius * 0.5, 0);
        ctx.stroke();

        // Wing Membranes
        ctx.fillStyle = 'rgba(255, 100, 0, 0.2)';
        ctx.fill();

        // Eyes
        ctx.fillStyle = '#ffff00';
        ctx.beginPath();
        ctx.arc(this.radius * 0.2, -this.radius * 0.2, 5, 0, Math.PI * 2);
        ctx.arc(this.radius * 0.2, this.radius * 0.2, 5, 0, Math.PI * 2);
        ctx.fill();

        // Fire Breath Particles (Visual only)
        if (this.state === 'breath') {
            ctx.fillStyle = `rgba(255, 170, 0, ${Math.random()})`;
            ctx.beginPath();
            ctx.arc(this.radius + 20, 0, 10 + Math.random() * 10, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}

// --- Boss 6: Storm Weaver (Electric Spider) ---
class StormWeaver extends BaseBoss {
    constructor(game, x, y) {
        super(game, x, y, 'storm_weaver');
        this.name = 'STORM WEAVER';
        this.color = '#ffff00';
        this.radius = 70;
        this.webTimer = 0;
    }

    switchState() {
        this.stateTimer = 0;
        const rand = Math.random();
        if (this.state === 'chase') {
            if (rand < 0.5) this.state = 'web';
            else this.state = 'lightning';
        } else {
            this.state = 'chase';
            this.stateDuration = 2.0;
        }
    }

    updateState(dt) {
        if (this.state === 'chase') this.behaviorChase(dt);
        else if (this.state === 'web') this.behaviorWeb(dt);
        else if (this.state === 'lightning') this.behaviorLightning(dt);
    }

    behaviorWeb(dt) {
        if (this.stateTimer % 0.5 < dt) {
            // Spawn slowing "web" particles or projectiles
            const p = new EnemyProjectile(this.game, this.x, this.y, this.game.player, 'plasma', this.damage * 0.5);
            p.color = '#ffffff';
            p.speed = 150;
            this.game.enemyProjectiles.push(p);
        }
    }

    behaviorLightning(dt) {
        if (this.stateTimer % 0.8 < dt) {
            const p = new EnemyProjectile(this.game, this.x, this.y, this.game.player, 'plasma', this.damage);
            p.speed = 400;
            p.color = '#ffff00';
            this.game.enemyProjectiles.push(p);
        }
    }

    drawShape(ctx) {
        ctx.save();
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 3;

        // Spider Body
        ctx.beginPath();
        ctx.ellipse(0, 0, 30, 40, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Legs
        const legWiggle = Math.sin(this.pulse);
        for (let i = 0; i < 8; i++) {
            const side = i < 4 ? -1 : 1;
            const yPos = (i % 4) * 20 - 30;
            ctx.beginPath();
            ctx.moveTo(side * 10, yPos);
            ctx.lineTo(side * 60, yPos + legWiggle * 10);
            ctx.lineTo(side * 80, yPos + 20 + legWiggle * 5);
            ctx.stroke();
        }

        // Electric Glow
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#00ffff';
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(0, -20, 5, 0, Math.PI * 2);
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

// --- Boss 7: Iron Behemoth (Armored Crab) ---
class IronBehemoth extends BaseBoss {
    constructor(game, x, y) {
        super(game, x, y, 'iron_behemoth');
        this.name = 'IRON BEHEMOTH';
        this.color = '#ff8800';
        this.radius = 110;
        this.spinAngle = 0;
    }

    switchState() {
        this.stateTimer = 0;
        const rand = Math.random();
        if (this.state === 'chase') {
            if (rand < 0.5) this.state = 'mortar';
            else this.state = 'spin';
        } else {
            this.state = 'chase';
            this.stateDuration = 3.0;
        }
    }

    updateState(dt) {
        if (this.state === 'chase') this.behaviorChase(dt);
        else if (this.state === 'mortar') this.behaviorMortar(dt);
        else if (this.state === 'spin') this.behaviorSpin(dt);
    }

    behaviorMortar(dt) {
        if (this.stateTimer % 0.4 < dt) {
            const tx = this.game.player.x + (Math.random() - 0.5) * 200;
            const ty = this.game.player.y + (Math.random() - 0.5) * 200;
            const p = new EnemyProjectile(this.game, this.x, this.y, { x: tx, y: ty }, 'fireball', this.damage);
            p.speed = 150;
            this.game.enemyProjectiles.push(p);
        }
    }

    behaviorSpin(dt) {
        this.spinAngle += dt * 10;
        this.behaviorChase(dt * 1.5); // Charge faster while spinning
    }

    drawShape(ctx) {
        ctx.save();
        ctx.rotate(this.state === 'spin' ? this.spinAngle : 0);

        ctx.fillStyle = '#666';
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 5;

        // Shell
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Claws
        ctx.fillStyle = this.color;
        ctx.fillRect(this.radius - 20, -50, 40, 40);
        ctx.fillRect(-this.radius - 20, -50, 40, 40);

        // Industrial Detail
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.moveTo(-this.radius + 20, 0);
        ctx.lineTo(this.radius - 20, 0);
        ctx.stroke();

        ctx.restore();
    }
}

// --- Boss 8: Prism Mirror (Crystal Entity) ---
class PrismMirror extends BaseBoss {
    constructor(game, x, y) {
        super(game, x, y, 'prism_mirror');
        this.name = 'PRISM MIRROR';
        this.color = '#ffffff';
        this.radius = 60;
        this.hue = 0;
    }

    switchState() {
        this.stateTimer = 0;
        this.state = this.state === 'chase' ? 'beam' : 'chase';
        this.stateDuration = 3.0;
    }

    updateState(dt) {
        this.hue = (this.hue + dt * 100) % 360;
        this.color = `hsl(${this.hue}, 100%, 70%)`;
        if (this.state === 'chase') this.behaviorChase(dt);
        else this.behaviorBeam(dt);
    }

    behaviorBeam(dt) {
        if (this.stateTimer % 1.0 < dt) {
            for (let i = 0; i < 8; i++) {
                const angle = (Math.PI * 2 / 8) * i + this.stateTimer;
                const tx = this.x + Math.cos(angle) * 100;
                const ty = this.y + Math.sin(angle) * 100;
                const p = new EnemyProjectile(this.game, this.x, this.y, { x: tx, y: ty }, 'plasma', this.damage);
                p.color = this.color;
                this.game.enemyProjectiles.push(p);
            }
        }
    }

    drawShape(ctx) {
        ctx.save();
        ctx.rotate(this.pulse * 0.1);

        ctx.strokeStyle = this.color;
        ctx.lineWidth = 3;
        ctx.shadowBlur = 20;
        ctx.shadowColor = this.color;

        // Diamond Shape
        ctx.beginPath();
        ctx.moveTo(0, -this.radius);
        ctx.lineTo(this.radius, 0);
        ctx.lineTo(0, this.radius);
        ctx.lineTo(-this.radius, 0);
        ctx.closePath();
        ctx.stroke();

        // Inner Fragments
        for (let i = 0; i < 4; i++) {
            ctx.rotate(Math.PI / 2);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(this.radius * 0.5, this.radius * 0.5);
            ctx.stroke();
        }

        ctx.restore();
    }
}

// --- Boss 9: Toxic Horror (Bio-Mutant) ---
class ToxicHorror extends BaseBoss {
    constructor(game, x, y) {
        super(game, x, y, 'toxic_horror');
        this.name = 'TOXIC HORROR';
        this.color = '#00ff44';
        this.radius = 80;
    }

    switchState() {
        this.stateTimer = 0;
        this.state = this.state === 'chase' ? 'burst' : 'chase';
    }

    updateState(dt) {
        if (this.state === 'chase') {
            this.behaviorChase(dt);
            // Leave poison trail (Visual for now)
            if (this.stateTimer % 0.2 < dt) {
                this.game.particles.push(new Particle(this.game, this.x, this.y, '#00ff44'));
            }
        } else {
            this.behaviorBurst(dt);
        }
    }

    behaviorBurst(dt) {
        if (this.stateTimer > 0.5 && this.stateTimer - dt <= 0.5) {
            for (let i = 0; i < 20; i++) {
                const angle = (Math.PI * 2 / 20) * i;
                const tx = this.x + Math.cos(angle) * 100;
                const ty = this.y + Math.sin(angle) * 100;
                const p = new EnemyProjectile(this.game, this.x, this.y, { x: tx, y: ty }, 'slime', this.damage);
                this.game.enemyProjectiles.push(p);
            }
        }
    }

    drawShape(ctx) {
        ctx.save();
        const wobble = Math.sin(this.pulse * 2) * 10;

        ctx.fillStyle = 'rgba(0, 255, 68, 0.4)';
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 4;

        // Blobby Body
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 / 8) * i;
            const r = this.radius + (i % 2 === 0 ? wobble : -wobble);
            const x = Math.cos(angle) * r;
            const y = Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Pulsing Organ
        ctx.fillStyle = '#ff00ff';
        ctx.beginPath();
        ctx.arc(0, 0, 20 + wobble, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

// --- Boss 10: Aura Knight (Neon Swordsman) ---
class AuraKnight extends BaseBoss {
    constructor(game, x, y) {
        super(game, x, y, 'aura_knight');
        this.name = 'AURA KNIGHT';
        this.color = '#00ffff';
        this.radius = 50;
        this.dashAngle = 0;
    }

    switchState() {
        this.stateTimer = 0;
        const rand = Math.random();
        if (this.state === 'chase') {
            if (rand < 0.6) this.state = 'dash';
            else this.state = 'waves';
        } else {
            this.state = 'chase';
            this.stateDuration = 2.0;
        }
    }

    updateState(dt) {
        if (this.state === 'chase') {
            this.behaviorChase(dt);
            this.angle = Math.atan2(this.game.player.y - this.y, this.game.player.x - this.x);
        }
        else if (this.state === 'dash') this.behaviorDash(dt);
        else if (this.state === 'waves') this.behaviorWaves(dt);
    }

    behaviorDash(dt) {
        if (this.stateTimer < 0.5) {
            this.dashAngle = Math.atan2(this.game.player.y - this.y, this.game.player.x - this.x);
        } else {
            this.x += Math.cos(this.dashAngle) * 600 * dt;
            this.y += Math.sin(this.dashAngle) * 600 * dt;
        }
    }

    behaviorWaves(dt) {
        if (this.stateTimer % 0.3 < dt) {
            const angle = Math.atan2(this.game.player.y - this.y, this.game.player.x - this.x);
            const p = new EnemyProjectile(this.game, this.x, this.y, { x: this.x + Math.cos(angle) * 100, y: this.y + Math.sin(angle) * 100 }, 'plasma', this.damage);
            p.radius = 15;
            p.speed = 300;
            this.game.enemyProjectiles.push(p);
        }
    }

    drawShape(ctx) {
        ctx.save();
        ctx.rotate(this.angle);

        // Knight Helmet
        ctx.fillStyle = '#111';
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Visor
        ctx.fillStyle = this.color;
        ctx.fillRect(-10, -20, 40, 5);

        // Cape / Aura
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(-this.radius, 0);
        ctx.lineTo(-this.radius - 40, -20 + Math.sin(this.pulse) * 10);
        ctx.lineTo(-this.radius - 40, 20 + Math.sin(this.pulse + 1) * 10);
        ctx.fill();

        ctx.restore();
    }
}

// --- Boss 11: Celestial Eye (Sentient Satellite) ---
class CelestialEye extends BaseBoss {
    constructor(game, x, y) {
        super(game, x, y, 'celestial_eye');
        this.name = 'CELESTIAL EYE';
        this.color = '#ffcc00';
        this.radius = 60;
    }

    switchState() {
        this.stateTimer = 0;
        this.state = this.state === 'chase' ? 'orbital' : 'chase';
    }

    updateState(dt) {
        if (this.state === 'chase') {
            this.behaviorChase(dt * 0.5);
        } else {
            this.behaviorOrbital(dt);
        }
    }

    behaviorOrbital(dt) {
        if (this.stateTimer % 1.5 < dt) {
            // "Orbital Laser" - just a fast spread
            for (let i = 0; i < 3; i++) {
                const angle = Math.atan2(this.game.player.y - this.y, this.game.player.x - this.x) + (i - 1) * 0.2;
                const p = new EnemyProjectile(this.game, this.x, this.y, { x: this.x + Math.cos(angle) * 100, y: this.y + Math.sin(angle) * 100 }, 'plasma', this.damage * 2);
                p.speed = 500;
                p.color = '#ffcc00';
                this.game.enemyProjectiles.push(p);
            }
        }
    }

    drawShape(ctx) {
        ctx.save();

        ctx.strokeStyle = this.color;
        ctx.lineWidth = 4;

        // Satellite Frame
        ctx.strokeRect(-this.radius, -10, this.radius * 2, 20);

        // Large Eye
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(0, 0, 30, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Pupil
        ctx.fillStyle = '#ffcc00';
        const dx = (this.game.player.x - this.x) / 100;
        const dy = (this.game.player.y - this.y) / 100;
        ctx.beginPath();
        ctx.arc(Math.max(-10, Math.min(10, dx)), Math.max(-10, Math.min(10, dy)), 8, 0, Math.PI * 2);
        ctx.fill();

        // Solar Panels
        ctx.fillStyle = 'rgba(0, 100, 255, 0.5)';
        ctx.fillRect(-this.radius - 30, -30, 30, 60);
        ctx.fillRect(this.radius, -30, 30, 60);

        ctx.restore();
    }
}


// --- js/game/entities/NextStageAltar.js ---
class NextStageAltar {
    constructor(game, x, y) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.radius = 40;
        this.active = true;
        this.pulse = 0;
        this.activated = false;  // 今回の接触で既に反応したか
        this.wasPlayerNear = false;  // 前フレームでプレイヤーが近くにいたか
    }

    update(dt) {
        this.pulse += dt * 3;

        // Check collision with player
        const dx = this.game.player.x - this.x;
        const dy = this.game.player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const isNear = dist < this.radius + this.game.player.radius;

        // 近づいたタイミングで処理（連続発火を防ぐ）
        if (isNear && !this.wasPlayerNear && !this.activated) {
            this.game.showStageResult();  // 結果画面のみ表示
            this.activated = true;
        }

        // プレイヤーが離れたらリセット
        if (!isNear) {
            this.activated = false;
        }

        this.wasPlayerNear = isNear;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        // Glow effect
        const glowSize = 50 + Math.sin(this.pulse) * 10;
        const gradient = ctx.createRadialGradient(0, 0, 10, 0, 0, glowSize);
        gradient.addColorStop(0, 'rgba(0, 255, 255, 1)');
        gradient.addColorStop(0.5, 'rgba(0, 255, 255, 0.5)');
        gradient.addColorStop(1, 'rgba(0, 255, 255, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, glowSize, 0, Math.PI * 2);
        ctx.fill();

        // Base
        ctx.fillStyle = '#222';
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, -30);
        ctx.lineTo(26, 15);
        ctx.lineTo(-26, 15);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Floating Icon (Arrow Up or Portal)
        ctx.fillStyle = '#fff';
        ctx.font = '30px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('▲', 0, -10 + Math.sin(this.pulse * 2) * 5);

        // Text
        ctx.fillStyle = '#00ffff';
        ctx.font = '16px monospace';
        ctx.fillText('NEXT STAGE', 0, 40);

        ctx.restore();
    }
}


// --- js/game/entities/Player.js ---




class Player {
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
                const dist = Math.random() * 200;
                const p = new Particle(this.game, this.x + Math.cos(angle)*dist, this.y + Math.sin(angle)*dist, '#00ccff');
                p.size = 3;
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
                if (this.hasFrostAura && edist < 200) {
                    if (!enemy.frostAuraTimer) {
                        enemy.originalSpeed = enemy.originalSpeed || enemy.speed; // Store original speed once
                        enemy.speed = enemy.originalSpeed * 0.5; // Half speed
                    }
                    enemy.frostAuraTimer = 0.5; // Refresh duration
                }

                // Vampiric Aura (Damage and Drain)
                if (this.hasVampiricAura && edist < 150 && vampiricTick) {
                    enemy.takeDamage(2);
                    this.game.showDamage(enemy.x, enemy.y, "2", '#990033');
                    this.hp = Math.min(this.maxHp, this.hp + 0.1); // Small heal
                    
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
            const bladeRadius = 60; // Distance from player
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
                        if (edx*edx + edy*edy < (enemy.radius + 15)*(enemy.radius + 15)) { // 15 is blade radius
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

        // Safety check
        if (!this.game.waveManager || !this.game.waveManager.enemies) {
            return null;
        }

        this.game.waveManager.enemies.forEach(enemy => {
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

    draw(ctx) {
        // Draw Auras
        if (this.hasFrostAura) {
            ctx.save();
            ctx.strokeStyle = 'rgba(0, 204, 255, 0.3)';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.arc(this.x, this.y, 200, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
        
        if (this.hasVampiricAura) {
            ctx.save();
            ctx.strokeStyle = 'rgba(153, 0, 51, 0.3)';
            ctx.lineWidth = 2;
            ctx.setLineDash([10, 10]);
            ctx.beginPath();
            ctx.arc(this.x, this.y, 150, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        this.projectiles.forEach(p => p.draw(ctx));
        
        // Draw Orbital Blades
        if (this.orbitalBlades && this.orbitalBlades.length > 0) {
            const bladeRadius = 60;
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


// --- js/game/ui/Minimap.js ---
class Minimap {
    constructor(game) {
        this.game = game;
        this.canvas = document.getElementById('minimapCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = 150;
        this.height = 150;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        // Scaling factor
        this.scaleX = this.width / game.worldWidth;
        this.scaleY = this.height / game.worldHeight;
    }

    worldToMinimap(x, y) {
        return {
            x: x * this.scaleX,
            y: y * this.scaleY
        };
    }

    draw() {
        // Only show minimap during active gameplay
        if (this.game.state !== 'playing') {
            return;
        }

        // Clear
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Draw world border
        this.ctx.strokeStyle = '#00ffff';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(0, 0, this.width, this.height);

        // Draw obstacles (optional, might be too cluttered)
        // this.game.obstacles.forEach(obstacle => {
        //     const pos = this.worldToMinimap(obstacle.x, obstacle.y);
        //     this.ctx.fillStyle = '#444';
        //     this.ctx.fillRect(pos.x - 1, pos.y - 1, 2, 2);
        // });

        // Draw enemies
        if (this.game.waveManager) {
            this.game.waveManager.enemies.forEach(enemy => {
                const pos = this.worldToMinimap(enemy.x, enemy.y);

                if (enemy.isBoss) {
                    // Boss - large red circle
                    this.ctx.fillStyle = '#ff0000';
                    this.ctx.shadowBlur = 5;
                    this.ctx.shadowColor = '#ff0000';
                    this.ctx.beginPath();
                    this.ctx.arc(pos.x, pos.y, 5, 0, Math.PI * 2);
                    this.ctx.fill();
                    this.ctx.shadowBlur = 0;
                } else {
                    // Normal enemy - small red dot
                    this.ctx.fillStyle = '#ff4444';
                    this.ctx.fillRect(pos.x - 1, pos.y - 1, 2, 2);
                }
            });
        }

        // Draw chests
        this.game.chests.forEach(chest => {
            if (chest.active) {
                const pos = this.worldToMinimap(chest.x, chest.y);
                this.ctx.fillStyle = '#ffd700';
                this.ctx.shadowBlur = 3;
                this.ctx.shadowColor = '#ffd700';
                this.ctx.beginPath();
                this.ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.shadowBlur = 0;
            }
        });

        // Draw boss altar
        if (this.game.waveManager && this.game.waveManager.bossAltar) {
            const altar = this.game.waveManager.bossAltar;
            const pos = this.worldToMinimap(altar.x, altar.y);
            this.ctx.fillStyle = '#ff00ff';
            this.ctx.shadowBlur = 4;
            this.ctx.shadowColor = '#ff00ff';
            this.ctx.beginPath();
            this.ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
        }

        // Draw Next Stage Altar
        if (this.game.nextStageAltar) {
            const altar = this.game.nextStageAltar;
            const pos = this.worldToMinimap(altar.x, altar.y);
            this.ctx.fillStyle = '#00ff00'; // Green
            this.ctx.shadowBlur = 5;
            this.ctx.shadowColor = '#00ff00';
            this.ctx.beginPath();
            this.ctx.rect(pos.x - 3, pos.y - 3, 6, 6);
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
        }

        // Draw player (always on top)
        if (this.game.player) {
            const pos = this.worldToMinimap(this.game.player.x, this.game.player.y);
            this.ctx.fillStyle = '#00ffff';
            this.ctx.shadowBlur = 5;
            this.ctx.shadowColor = '#00ffff';
            this.ctx.beginPath();
            this.ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
        }
    }
}


// --- js/game/systems/UpgradeSystem.js ---
class UpgradeSystem {
    constructor(game) {
        this.game = game;
        this.reservedRelicId = null;
        this.gachaCost = 100;
        this.gachaMultiplier = 1.1;
        this.baseGachaCost = 100;
        this.unlockedCharacters = ['girl'];

        this.load();
    }

    performGacha() {
        if (this.game.money >= this.gachaCost) {
            this.game.money -= this.gachaCost;

            // Pick a random relic from UIManager
            const availableRelics = this.game.ui.relics.filter(r => r.id !== 'phoenix_heart_used');
            const randomRelic = availableRelics[Math.floor(Math.random() * availableRelics.length)];

            this.reservedRelicId = randomRelic.id;

            // Increase cost
            this.gachaCost = Math.floor(this.gachaCost * this.gachaMultiplier);

            this.save();
            return randomRelic;
        }
        return null;
    }

    resetGachaCost() {
        this.gachaCost = this.baseGachaCost;
        this.reservedRelicId = null;
        this.save();
    }

    applyUpgrades(player) {
        // Reserved item is now handled directly in Game.startRun
        
        // Apply unlocked skill tree nodes
        if (this.game.skillTree && this.game.skillTree.unlockedNodes) {
            for (const id of this.game.skillTree.unlockedNodes) {
                const node = this.game.skillTree.nodes[id];
                if (node && node.effect) {
                    node.effect(player);
                }
            }
        }
    }

    save() {
        const data = {
            money: this.game.money,
            totalStagesCleared: this.game.totalStagesCleared,
            reservedRelicId: this.reservedRelicId,
            gachaCost: this.gachaCost,
            unlockedSkillNodes: this.game.skillTree ? this.game.skillTree.unlockedNodes : ['core'],
            unlockedCharacters: this.unlockedCharacters
        };
        localStorage.setItem('yurufuwa_save', JSON.stringify(data));
    }

    load() {
        const json = localStorage.getItem('yurufuwa_save');
        if (json) {
            const data = JSON.parse(json);
            this.game.money = data.money || 0;
            this.game.totalStagesCleared = data.totalStagesCleared || 0;
            this.reservedRelicId = data.reservedRelicId || null;
            this.gachaCost = data.gachaCost || this.baseGachaCost;
            if (data.unlockedSkillNodes && this.game.skillTree) {
                this.game.skillTree.unlockedNodes = data.unlockedSkillNodes;
            }
            if (data.unlockedCharacters) {
                this.unlockedCharacters = data.unlockedCharacters;
            }
        }
    }
}


// --- js/game/systems/WaveManager.js ---





class WaveManager {
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

        // Scale Boss stats
        boss.hp *= this.difficulty;
        boss.maxHp *= this.difficulty;
        boss.damage *= this.difficulty;

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
        const angle = Math.random() * Math.PI * 2;
        const dist = 200 + Math.random() * 200;
        const x = this.game.player.x + Math.cos(angle) * dist;
        const y = this.game.player.y + Math.sin(angle) * dist;

        // Clamp to world
        const cx = Math.max(50, Math.min(x, this.game.worldWidth - 50));
        const cy = Math.max(50, Math.min(y, this.game.worldHeight - 50));

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
            enemyType.hp *= hpScaling;
            enemyType.maxHp *= hpScaling;

            // Damage: 線形スケーリングのまま（HPほど上げない）
            enemyType.damage *= this.difficulty;

            // Map Level Scaling: 廃止


            this.enemies.push(enemyType);
        }
    }
}


// --- js/game/systems/SkillTree.js ---
class SkillTree {
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
        this.nodes['lifesteal1'] = { id: 'lifesteal1', name: 'Vampire Protocol', desc: '10% chance to heal on hit', cost: 3000, x: this.nodes[lastRegen].x - 60, y: this.nodes[lastRegen].y + 60, requires: [lastRegen], effect: (p) => p.lifeStealChance = (p.lifeStealChance || 0) + 0.1, color: '#cc0044' };
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


// --- js/ui/UIManager.js ---
class UIManager {
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
            { id: 'atk_up_1', name: 'Cyber Katana (C)', desc: 'Attack Damage +10%', cost: 12, rarity: 'common', color: '#ff4444', rarityBorder: '#888888', weight: 10, category: 'red', effect: (p) => p.damage *= 1.10 },
            { id: 'atk_up_2', name: 'Cyber Katana (R)', desc: 'Attack Damage +15%', cost: 18, rarity: 'rare', color: '#ff4444', rarityBorder: '#4466ff', weight: 5, category: 'red', effect: (p) => p.damage *= 1.15 },
            { id: 'atk_up_3', name: 'Cyber Katana (E)', desc: 'Attack Damage +20%', cost: 26, rarity: 'epic', color: '#ff4444', rarityBorder: '#aa00ff', weight: 2, category: 'red', effect: (p) => p.damage *= 1.20 },
            { id: 'atk_up_4', name: 'Cyber Katana (L)', desc: 'Attack Damage +25%', cost: 40, rarity: 'legendary', color: '#ff4444', rarityBorder: '#ff8800', weight: 1, category: 'red', effect: (p) => p.damage *= 1.25 },

            // 2. Move Speed
            { id: 'spd_up_1', name: 'Neko Headphones (C)', desc: 'Move Speed +10%', cost: 12, rarity: 'common', color: '#4444ff', rarityBorder: '#888888', weight: 10, category: 'blue', effect: (p) => p.speed *= 1.10 },
            { id: 'spd_up_2', name: 'Neko Headphones (R)', desc: 'Move Speed +15%', cost: 18, rarity: 'rare', color: '#4444ff', rarityBorder: '#4466ff', weight: 5, category: 'blue', effect: (p) => p.speed *= 1.15 },
            { id: 'spd_up_3', name: 'Neko Headphones (E)', desc: 'Move Speed +20%', cost: 26, rarity: 'epic', color: '#4444ff', rarityBorder: '#aa00ff', weight: 2, category: 'blue', effect: (p) => p.speed *= 1.20 },
            { id: 'spd_up_4', name: 'Neko Headphones (L)', desc: 'Move Speed +25%', cost: 40, rarity: 'legendary', color: '#4444ff', rarityBorder: '#ff8800', weight: 1, category: 'blue', effect: (p) => p.speed *= 1.25 },

            // 3. Max HP
            { id: 'hp_up_1', name: 'Energy Drink (C)', desc: 'Max HP +30', cost: 12, rarity: 'common', color: '#44ff44', rarityBorder: '#888888', weight: 10, category: 'green', effect: (p) => { p.maxHp += 30; p.hp += 30; } },
            { id: 'hp_up_2', name: 'Energy Drink (R)', desc: 'Max HP +50', cost: 18, rarity: 'rare', color: '#44ff44', rarityBorder: '#4466ff', weight: 5, category: 'green', effect: (p) => { p.maxHp += 50; p.hp += 50; } },
            { id: 'hp_up_3', name: 'Energy Drink (E)', desc: 'Max HP +80', cost: 26, rarity: 'epic', color: '#44ff44', rarityBorder: '#aa00ff', weight: 2, category: 'green', effect: (p) => { p.maxHp += 80; p.hp += 80; } },
            { id: 'hp_up_4', name: 'Energy Drink (L)', desc: 'Max HP +120', cost: 40, rarity: 'legendary', color: '#44ff44', rarityBorder: '#ff8800', weight: 1, category: 'green', effect: (p) => { p.maxHp += 120; p.hp += 120; } },

            // 4. Fire Rate (Lower interval is better)
            { id: 'rate_up_1', name: 'Overclock Chip (C)', desc: 'Fire Rate +10%', cost: 12, rarity: 'common', color: '#ffaa00', rarityBorder: '#888888', weight: 10, category: 'red', effect: (p) => p.shootInterval *= 0.90 },
            { id: 'rate_up_2', name: 'Overclock Chip (R)', desc: 'Fire Rate +15%', cost: 18, rarity: 'rare', color: '#ffaa00', rarityBorder: '#4466ff', weight: 5, category: 'red', effect: (p) => p.shootInterval *= 0.85 },
            { id: 'rate_up_3', name: 'Overclock Chip (E)', desc: 'Fire Rate +20%', cost: 26, rarity: 'epic', color: '#ffaa00', rarityBorder: '#aa00ff', weight: 2, category: 'red', effect: (p) => p.shootInterval *= 0.80 },
            { id: 'rate_up_4', name: 'Overclock Chip (L)', desc: 'Fire Rate +25%', cost: 40, rarity: 'legendary', color: '#ffaa00', rarityBorder: '#ff8800', weight: 1, category: 'red', effect: (p) => p.shootInterval *= 0.75 },

            // 5. HP Regen
            { id: 'hp_regen_1', name: 'Nano Repair (C)', desc: 'HP Regen +0.5/sec', cost: 12, rarity: 'common', color: '#44ff88', rarityBorder: '#888888', weight: 10, category: 'green', effect: (p) => { if (!p.hpRegen) p.hpRegen = 0; p.hpRegen += 0.5; } },
            { id: 'hp_regen_2', name: 'Nano Repair (R)', desc: 'HP Regen +1.0/sec', cost: 18, rarity: 'rare', color: '#44ff88', rarityBorder: '#4466ff', weight: 5, category: 'green', effect: (p) => { if (!p.hpRegen) p.hpRegen = 0; p.hpRegen += 1.0; } },
            { id: 'hp_regen_3', name: 'Nano Repair (E)', desc: 'HP Regen +1.5/sec', cost: 26, rarity: 'epic', color: '#44ff88', rarityBorder: '#aa00ff', weight: 2, category: 'green', effect: (p) => { if (!p.hpRegen) p.hpRegen = 0; p.hpRegen += 1.5; } },
            { id: 'hp_regen_4', name: 'Nano Repair (L)', desc: 'HP Regen +2.0/sec', cost: 40, rarity: 'legendary', color: '#44ff88', rarityBorder: '#ff8800', weight: 1, category: 'green', effect: (p) => { if (!p.hpRegen) p.hpRegen = 0; p.hpRegen += 2.0; } },

            // 6. Crit Chance
            { id: 'crit_chance_1', name: 'Lucky Dice (C)', desc: 'Crit Chance +5%', cost: 12, rarity: 'common', color: '#ffdd00', rarityBorder: '#888888', weight: 10, category: 'red', effect: (p) => { if (!p.critChance) p.critChance = 0; p.critChance += 0.05; } },
            { id: 'crit_chance_2', name: 'Lucky Dice (R)', desc: 'Crit Chance +10%', cost: 18, rarity: 'rare', color: '#ffdd00', rarityBorder: '#4466ff', weight: 5, category: 'red', effect: (p) => { if (!p.critChance) p.critChance = 0; p.critChance += 0.10; } },
            { id: 'crit_chance_3', name: 'Lucky Dice (E)', desc: 'Crit Chance +15%', cost: 26, rarity: 'epic', color: '#ffdd00', rarityBorder: '#aa00ff', weight: 2, category: 'red', effect: (p) => { if (!p.critChance) p.critChance = 0; p.critChance += 0.15; } },
            { id: 'crit_chance_4', name: 'Lucky Dice (L)', desc: 'Crit Chance +20%', cost: 40, rarity: 'legendary', color: '#ffdd00', rarityBorder: '#ff8800', weight: 1, category: 'red', effect: (p) => { if (!p.critChance) p.critChance = 0; p.critChance += 0.20; } },

            // 7. Projectile Size
            { id: 'projectile_size_1', name: 'Amplifier Core (C)', desc: 'Proj Size +15%', cost: 12, rarity: 'common', color: '#ff6600', rarityBorder: '#888888', weight: 10, category: 'red', effect: (p) => { if (!p.projectileSize) p.projectileSize = 1; p.projectileSize *= 1.15; } },
            { id: 'projectile_size_2', name: 'Amplifier Core (R)', desc: 'Proj Size +30%', cost: 18, rarity: 'rare', color: '#ff6600', rarityBorder: '#4466ff', weight: 5, category: 'red', effect: (p) => { if (!p.projectileSize) p.projectileSize = 1; p.projectileSize *= 1.30; } },
            { id: 'projectile_size_3', name: 'Amplifier Core (E)', desc: 'Proj Size +45%', cost: 26, rarity: 'epic', color: '#ff6600', rarityBorder: '#aa00ff', weight: 2, category: 'red', effect: (p) => { if (!p.projectileSize) p.projectileSize = 1; p.projectileSize *= 1.45; } },
            { id: 'projectile_size_4', name: 'Amplifier Core (L)', desc: 'Proj Size +60%', cost: 40, rarity: 'legendary', color: '#ff6600', rarityBorder: '#ff8800', weight: 1, category: 'red', effect: (p) => { if (!p.projectileSize) p.projectileSize = 1; p.projectileSize *= 1.60; } },

            // 8. Damage Reduction (Armor)
            { id: 'armor_plate_1', name: 'Titanium Plating (C)', desc: 'Dmg Taken -10%', cost: 12, rarity: 'common', color: '#999999', rarityBorder: '#888888', weight: 10, category: 'green', effect: (p) => { if (!p.damageMultiplier) p.damageMultiplier = 1.0; p.damageMultiplier *= 0.90; } },
            { id: 'armor_plate_2', name: 'Titanium Plating (R)', desc: 'Dmg Taken -15%', cost: 18, rarity: 'rare', color: '#999999', rarityBorder: '#4466ff', weight: 5, category: 'green', effect: (p) => { if (!p.damageMultiplier) p.damageMultiplier = 1.0; p.damageMultiplier *= 0.85; } },
            { id: 'armor_plate_3', name: 'Titanium Plating (E)', desc: 'Dmg Taken -20%', cost: 26, rarity: 'epic', color: '#999999', rarityBorder: '#aa00ff', weight: 2, category: 'green', effect: (p) => { if (!p.damageMultiplier) p.damageMultiplier = 1.0; p.damageMultiplier *= 0.80; } },
            { id: 'armor_plate_4', name: 'Titanium Plating (L)', desc: 'Dmg Taken -25%', cost: 40, rarity: 'legendary', color: '#999999', rarityBorder: '#ff8800', weight: 1, category: 'green', effect: (p) => { if (!p.damageMultiplier) p.damageMultiplier = 1.0; p.damageMultiplier *= 0.75; } },

            // ----------------------------------------------------
            // Unique / Utility / Method items (Kept from original)
            // ----------------------------------------------------
            { id: 'pierce_shot', name: 'Plasma Orb', desc: 'Fire penetrating orbs +1', cost: 28, rarity: 'rare', color: '#00aaff', rarityBorder: '#4466ff', weight: 7, category: 'yellow', effect: (p) => { if (!p.pierceShotCount) p.pierceShotCount = 0; p.pierceShotCount++; } },
            { id: 'range_up', name: 'Scope Lens', desc: 'Magnet Range +50%', cost: 10, rarity: 'rare', color: '#00ffff', rarityBorder: '#4466ff', weight: 7, category: 'blue', effect: (p) => { /* Handled in Drop */ } },
            { id: 'shield_gen', name: 'Energy Barrier', desc: 'Shield absorbs 20 damage', cost: 28, rarity: 'rare', color: '#8888ff', rarityBorder: '#4466ff', weight: 7, category: 'green', effect: (p) => { if (!p.shield) p.shield = 0; p.shield += 20; if (!p.maxShield) p.maxShield = 0; p.maxShield += 20; } },
            { id: 'multishot', name: 'Splitter Module', desc: 'Shoot 2 extra bullets', cost: 32, rarity: 'rare', color: '#ff4488', rarityBorder: '#4466ff', weight: 7, category: 'yellow', effect: (p) => { if (!p.multiShotCount) p.multiShotCount = 1; p.multiShotCount += 1; } },

            // Epic (エピック) - 強力な強化
            { id: 'drone', name: 'Support Drone', desc: 'Summons a drone', cost: 32, rarity: 'epic', color: '#00ffaa', rarityBorder: '#aa00ff', weight: 4, category: 'yellow', effect: (p) => p.game.addDrone() },
            { id: 'lifesteal', name: 'Vampire Fang', desc: '20% chance to heal +1 HP on hit', cost: 40, rarity: 'epic', color: '#cc0044', rarityBorder: '#aa00ff', weight: 4, category: 'green', effect: (p) => { if (!p.lifeStealChance) p.lifeStealChance = 0.20; else p.lifeStealChance *= 1.5; } },
            { id: 'time_warp', name: 'Chrono Lens', desc: 'Speed +20%, Fire Rate +15%', cost: 44, rarity: 'epic', color: '#00ccff', rarityBorder: '#aa00ff', weight: 4, category: 'blue', effect: (p) => { p.speed *= 1.2; p.shootInterval *= 0.85; } },
            { id: 'missile', name: 'Missile Pod', desc: 'Fires homing missiles', cost: 40, rarity: 'epic', color: '#ff0088', rarityBorder: '#aa00ff', weight: 4, category: 'yellow', effect: (p) => p.missileCount++ },

            // Legendary (レジェンダリー) - 超強力
            { id: 'phoenix_heart', name: 'Phoenix Heart', desc: 'Revive once on death', cost: 64, rarity: 'legendary', color: '#ffaa00', rarityBorder: '#ff8800', weight: 2, category: 'green', effect: (p) => { if (!p.reviveCount) p.reviveCount = 0; p.reviveCount++; } },
            { id: 'phoenix_heart_used', name: 'Phoenix Heart (Used)', desc: 'Already consumed', cost: 0, rarity: 'legendary', color: '#666666', rarityBorder: '#444444', weight: 0, category: 'none', effect: (p) => { /* No effect */ } },
            
            // Special Effects (オレンジ - 特殊効果)
            { id: 'volatile_core', name: 'Volatile Core', desc: 'Explosion on enemy kill', cost: 45, rarity: 'epic', color: '#ff5500', rarityBorder: '#ffaa00', weight: 3, category: 'orange', effect: (p) => p.hasVolatileCore = true },
            { id: 'soul_seekers', name: 'Soul Seekers', desc: 'Fires missiles on enemy kill', cost: 50, rarity: 'epic', color: '#ff8800', rarityBorder: '#ffaa00', weight: 3, category: 'orange', effect: (p) => p.hasSoulSeekers = true },
            { id: 'revenge_protocol', name: 'Revenge Protocol', desc: 'Counter shockwave when hit', cost: 40, rarity: 'epic', color: '#ff6600', rarityBorder: '#ffaa00', weight: 3, category: 'orange', effect: (p) => p.hasRevengeProtocol = true },
            { id: 'chain_lightning', name: 'Chain Lightning', desc: 'Attacks can chain to nearby enemies', cost: 55, rarity: 'legendary', color: '#ffee00', rarityBorder: '#ffaa00', weight: 2, category: 'orange', effect: (p) => p.hasChainLightning = true },
            { id: 'frost_aura', name: 'Frost Aura', desc: 'Slows down nearby enemies', cost: 45, rarity: 'epic', color: '#00ccff', rarityBorder: '#ffaa00', weight: 3, category: 'orange', effect: (p) => p.hasFrostAura = true },
            { id: 'executioner', name: 'Executioner', desc: 'Double damage to low HP enemies', cost: 40, rarity: 'epic', color: '#cc0044', rarityBorder: '#ffaa00', weight: 3, category: 'orange', effect: (p) => p.hasExecutioner = true },
            { id: 'repulsion_shield', name: 'Repulsion Shield', desc: 'Knockback enemies when hit', cost: 35, rarity: 'epic', color: '#aaaaff', rarityBorder: '#ffaa00', weight: 3, category: 'orange', effect: (p) => p.hasRepulsionShield = true },
            { id: 'midas_touch', name: 'Midas Touch', desc: 'Extra Ene drop on kill', cost: 50, rarity: 'legendary', color: '#ffd700', rarityBorder: '#ffaa00', weight: 2, category: 'orange', effect: (p) => p.hasMidasTouch = true },
            { id: 'adrenaline', name: 'Adrenaline', desc: 'Extreme speed/fire rate at low HP', cost: 40, rarity: 'epic', color: '#ff2222', rarityBorder: '#ffaa00', weight: 3, category: 'orange', effect: (p) => p.hasAdrenaline = true },
            { id: 'orbital_blades', name: 'Orbital Blades', desc: 'Spinning blades damage nearby enemies', cost: 55, rarity: 'legendary', color: '#dddddd', rarityBorder: '#ffaa00', weight: 2, category: 'orange', effect: (p) => p.game.addOrbitalBlades() },
            { id: 'time_stop', name: 'Time Stop', desc: 'Stop time when picking up potion', cost: 50, rarity: 'legendary', color: '#aa00ff', rarityBorder: '#ffaa00', weight: 2, category: 'orange', effect: (p) => p.hasTimeStop = true },
            { id: 'holo_decoy', name: 'Holo Decoy', desc: 'Leave a decoy when taking damage', cost: 40, rarity: 'epic', color: '#00ffff', rarityBorder: '#ffaa00', weight: 3, category: 'orange', effect: (p) => p.hasHoloDecoy = true },
            { id: 'vampiric_aura', name: 'Vampiric Aura', desc: 'Drain HP from nearby enemies', cost: 60, rarity: 'legendary', color: '#990033', rarityBorder: '#ffaa00', weight: 2, category: 'orange', effect: (p) => p.hasVampiricAura = true }
        ];

        this.setupScreens();
        console.log('UIManager initialized (v2 - Icons)');
    }

    setupScreens() {
        // Title Screen
        this.screens.title = this.createScreen('title-screen', `
            <h1 class="title-text">Cyber<br>Survivor</h1>
            <button id="btn-start" class="cyber-btn">START</button>
            <button id="btn-options" class="cyber-btn secondary">OPTIONS</button>
            <button id="btn-reset" class="cyber-btn secondary" style="margin-top: 20px; background: #ff4444;">RESET DATA</button>
        `);

        // Options Screen
        this.screens.options = this.createScreen('options-screen', `
            <h2>OPTIONS</h2>
            <div class="options-container">
                <label class="cyber-checkbox">
                    <input type="checkbox" id="chk-debug">
                    <span class="checkmark"></span>
                    DEBUG MODE (x100 Ene)
                </label>
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
            </div>
            <button id="btn-close-options" class="cyber-btn secondary">CLOSE</button>
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
        this.bindButton('btn-close-options', () => this.showScreen('title'));

        const chkDebug = document.getElementById('chk-debug');
        if (chkDebug) {
            chkDebug.addEventListener('change', (e) => {
                this.game.debugMode = e.target.checked;
                console.log('Debug Mode:', this.game.debugMode);
            });
        }

        const selBoss = document.getElementById('debug-boss-select');
        if (selBoss) {
            selBoss.addEventListener('change', (e) => {
                this.game.debugBoss = e.target.value;
                console.log('Debug Boss Set:', this.game.debugBoss);
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
            // Fallback: Pick 3 random relics
            const shuffled = [...this.relics].sort(() => 0.5 - Math.random());
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
        } else {
            // Default Circle
            ctx.beginPath();
            ctx.arc(cx, cy, 15, 0, Math.PI * 2);
            ctx.fill();
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


// --- js/ui/SkillTreeUI.js ---
class SkillTreeUI {
    constructor(game, uimanager) {
        this.game = game;
        this.uimanager = uimanager;
        this.canvas = null;
        this.ctx = null;
        
        this.panX = 0;
        this.panY = 0;
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.selectedNodeId = null;
        
        this.pulseTime = 0;
    }

    init(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        this.canvas = document.createElement('canvas');
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');
        
        this.bindEvents();
        
        this.panX = this.canvas.width / 2;
        this.panY = this.canvas.height / 2;
    }

    bindEvents() {
        // Drag to pan
        let lastClientX = 0;
        let lastClientY = 0;
        let hasDragged = false;

        const getClientPos = (e) => {
            if (e.changedTouches && e.changedTouches.length > 0) {
                return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
            }
            if (e.touches && e.touches.length > 0) {
                return { x: e.touches[0].clientX, y: e.touches[0].clientY };
            }
            return { x: e.clientX, y: e.clientY };
        };

        const startDrag = (e) => {
            this.isDragging = true;
            hasDragged = false;
            const pos = getClientPos(e);
            lastClientX = pos.x;
            lastClientY = pos.y;
            this.dragStartX = pos.x - this.panX;
            this.dragStartY = pos.y - this.panY;
        };

        const doDrag = (e) => {
            if (this.isDragging) {
                const pos = getClientPos(e);
                if (Math.hypot(pos.x - lastClientX, pos.y - lastClientY) > 5) {
                    hasDragged = true;
                }
                lastClientX = pos.x;
                lastClientY = pos.y;
                this.panX = pos.x - this.dragStartX;
                this.panY = pos.y - this.dragStartY;
            }
        };

        // Click to select node
        const handleClick = (e) => {
            if (hasDragged) return; // Ignore clicks if dragged

            const rect = this.canvas.getBoundingClientRect();
            const pos = getClientPos(e);
            const mouseX = pos.x - rect.left - this.panX;
            const mouseY = pos.y - rect.top - this.panY;
            
            let clickedNode = null;
            for (const id in this.game.skillTree.nodes) {
                const n = this.game.skillTree.nodes[id];
                const dist = Math.hypot(mouseX - n.x, mouseY - n.y);
                if (dist < 20) {
                    clickedNode = id;
                    break;
                }
            }
            
            if (clickedNode) {
                this.selectedNodeId = clickedNode;
                this.updateDetailPanel();
            } else {
                this.selectedNodeId = null;
                this.hideDetailPanel();
            }
        };

        const stopDrag = (e) => {
            this.isDragging = false;
            if (!hasDragged && e && e.type === 'touchend') {
                // Simulate click for touch devices
                handleClick({ clientX: lastClientX, clientY: lastClientY });
            }
        };

        this.canvas.addEventListener('mousedown', startDrag);
        this.canvas.addEventListener('mousemove', doDrag);
        this.canvas.addEventListener('mouseup', stopDrag);
        this.canvas.addEventListener('mouseleave', stopDrag);
        
        this.canvas.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) startDrag(e);
        }, {passive: true});
        this.canvas.addEventListener('touchmove', (e) => {
            if (e.touches.length === 1) {
                e.preventDefault();
                doDrag(e);
            }
        }, {passive: false});
        this.canvas.addEventListener('touchend', stopDrag);

        this.canvas.addEventListener('click', handleClick);

        window.addEventListener('resize', () => {
            if (this.canvas) {
                this.canvas.width = window.innerWidth;
                this.canvas.height = window.innerHeight;
            }
        });

        // Setup UI buttons
        const btnUnlock = document.getElementById('btn-skill-unlock');
        if (btnUnlock) {
            btnUnlock.addEventListener('click', () => {
                if (this.selectedNodeId && this.game.skillTree.unlock(this.selectedNodeId)) {
                    this.game.audio.playUpgrade();
                    this.updateDetailPanel();
                    document.getElementById('skill-money').innerText = this.game.money;
                } else {
                    this.game.audio.playError();
                }
            });
        }

        const btnReset = document.getElementById('btn-skill-reset');
        if (btnReset) {
            btnReset.addEventListener('click', () => {
                const refund = this.game.skillTree.reset();
                if (refund > 0) {
                    this.game.audio.playUpgrade(); // or maybe a different sound
                    this.refresh();
                    this.game.showDamage(this.canvas.width / 2, this.canvas.height / 2, `+${refund} Ene`, '#ffff00');
                }
            });
        }
    }

    refresh() {
        document.getElementById('skill-money').innerText = this.game.money;
        this.selectedNodeId = null;
        this.hideDetailPanel();
        
        // Recenter
        this.panX = this.canvas.width / 2;
        this.panY = this.canvas.height / 2;
    }

    update(dt) {
        this.pulseTime += dt;
    }

    draw() {
        if (!this.ctx) return;
        
        // Background
        this.ctx.fillStyle = '#050510';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Grid pattern
        this.ctx.strokeStyle = 'rgba(0, 255, 255, 0.05)';
        this.ctx.lineWidth = 1;
        const gridSize = 50;
        const offsetX = this.panX % gridSize;
        const offsetY = this.panY % gridSize;
        
        this.ctx.beginPath();
        for (let x = offsetX; x < this.canvas.width; x += gridSize) {
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
        }
        for (let y = offsetY; y < this.canvas.height; y += gridSize) {
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
        }
        this.ctx.stroke();
        
        this.ctx.save();
        this.ctx.translate(this.panX, this.panY);
        
        const nodes = this.game.skillTree.nodes;
        
        // Draw Lines
        this.ctx.lineWidth = 3;
        for (const id in nodes) {
            const n = nodes[id];
            for (const reqId of n.requires) {
                const req = nodes[reqId];
                
                const isUnlocked = this.game.skillTree.isUnlocked(id);
                const isReqUnlocked = this.game.skillTree.isUnlocked(reqId);
                
                this.ctx.beginPath();
                this.ctx.moveTo(req.x, req.y);
                this.ctx.lineTo(n.x, n.y);
                
                if (isUnlocked) {
                    this.ctx.strokeStyle = n.color || '#00ffff';
                    this.ctx.shadowBlur = 10;
                    this.ctx.shadowColor = this.ctx.strokeStyle;
                } else if (isReqUnlocked) {
                    this.ctx.strokeStyle = '#555555';
                    this.ctx.shadowBlur = 0;
                } else {
                    this.ctx.strokeStyle = '#222222';
                    this.ctx.shadowBlur = 0;
                }
                
                this.ctx.stroke();
            }
        }
        
        // Draw Nodes
        for (const id in nodes) {
            const n = nodes[id];
            const isUnlocked = this.game.skillTree.isUnlocked(id);
            const isAvailable = this.game.skillTree.canUnlock(id);
            
            this.ctx.beginPath();
            this.ctx.arc(n.x, n.y, 14, 0, Math.PI * 2);
            
            const color = n.color || '#00ffff';
            
            if (isUnlocked) {
                this.ctx.fillStyle = color;
                this.ctx.shadowBlur = 15;
                this.ctx.shadowColor = color;
                this.ctx.fill();
                
                // Active Pulse
                const pulse = Math.sin(this.pulseTime * 5 + n.x) * 4 + 4;
                this.ctx.beginPath();
                this.ctx.arc(n.x, n.y, 14 + pulse, 0, Math.PI * 2);
                this.ctx.strokeStyle = `rgba(255, 255, 255, 0.3)`;
                this.ctx.lineWidth = 1;
                this.ctx.stroke();
                
            } else if (isAvailable) {
                this.ctx.fillStyle = '#111';
                this.ctx.strokeStyle = color;
                this.ctx.lineWidth = 3;
                this.ctx.shadowBlur = Math.abs(Math.sin(this.pulseTime * 3)) * 10;
                this.ctx.shadowColor = color;
                this.ctx.fill();
                this.ctx.stroke();
            } else {
                this.ctx.fillStyle = '#111';
                this.ctx.strokeStyle = '#333';
                this.ctx.lineWidth = 2;
                this.ctx.shadowBlur = 0;
                this.ctx.fill();
                this.ctx.stroke();
            }
            
            // Selection ring
            if (this.selectedNodeId === id) {
                this.ctx.beginPath();
                this.ctx.arc(n.x, n.y, 22, 0, Math.PI * 2);
                this.ctx.strokeStyle = '#fff';
                this.ctx.lineWidth = 2;
                this.ctx.shadowBlur = 10;
                this.ctx.shadowColor = '#fff';
                this.ctx.stroke();
            }
        }
        
        this.ctx.restore();
    }

    updateDetailPanel() {
        const panel = document.getElementById('skill-detail-panel');
        if (!panel || !this.selectedNodeId) return;
        
        const n = this.game.skillTree.nodes[this.selectedNodeId];
        const isUnlocked = this.game.skillTree.isUnlocked(this.selectedNodeId);
        const canUnlock = this.game.skillTree.canUnlock(this.selectedNodeId);
        
        let statusHtml = '';
        if (isUnlocked) {
            statusHtml = `<span style="color:#00ff00; font-size:12px; float:right; margin-top:4px;">[UNLOCKED]</span>`;
        } else if (canUnlock) {
            statusHtml = `<span style="color:#ffff00; font-size:12px; float:right; margin-top:4px;">[AVAILABLE]</span>`;
        } else {
            statusHtml = `<span style="color:#ff0000; font-size:12px; float:right; margin-top:4px;">[LOCKED]</span>`;
        }

        document.getElementById('skill-detail-name').innerHTML = `<span style="color:${n.color || '#fff'}">${n.name}</span> ${statusHtml}`;
        document.getElementById('skill-detail-desc').innerText = n.desc;
        
        const btn = document.getElementById('btn-skill-unlock');
        if (isUnlocked) {
            btn.style.display = 'none';
        } else {
            btn.style.display = 'block';
            btn.innerText = `UNLOCK (${n.cost} Money)`;
            btn.disabled = !canUnlock;
            if (canUnlock) {
                btn.className = 'cyber-btn';
                btn.style.borderColor = n.color || '#00ffff';
                btn.style.color = n.color || '#00ffff';
            } else {
                btn.className = 'cyber-btn';
                btn.style.borderColor = '#555';
                btn.style.color = '#555';
            }
        }
        
        panel.style.display = 'flex';
    }

    hideDetailPanel() {
        const panel = document.getElementById('skill-detail-panel');
        if (panel) panel.style.display = 'none';
    }
}


// --- js/game/Game.js ---


















class Game {
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

        // Spawn Initial Chests (Scattered)
        const rbg = ['red', 'blue', 'green'];
        for (let i = rbg.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [rbg[i], rbg[j]] = [rbg[j], rbg[i]];
        }
        
        let chestCategories = [
            'yellow', 'yellow',
            rbg[0], 
            rbg[1], rbg[1],
            rbg[2], rbg[2]
        ];
        
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
                const category = chestCategories[spawnedChests];
                this.chests.push(new Chest(this, x, y, category));
                spawnedChests++;
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
                    this.chests.push(new Chest(this, x, y, 'orange'));
                    orangeSpawned = true;
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
        if (this.state === 'skilltree') {
            if (this.skillTreeUI) this.skillTreeUI.update(dt);
            return;
        }
        if (this.state === 'reward') return; // Pause for reward selection

        if (this.state === 'playing') {
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

            this.enemyProjectiles.forEach(p => p.update(dt));
            this.enemyProjectiles = this.enemyProjectiles.filter(p => !p.markedForDeletion);

            this.chests.forEach(c => c.update(dt));

            this.particles.forEach(p => p.update(dt));
            this.particles = this.particles.filter(p => !p.markedForDeletion);

            this.floatingTexts.forEach(t => t.update(dt));
            this.floatingTexts = this.floatingTexts.filter(t => !t.markedForDeletion);

            this.obstacles.forEach(o => o.update(dt));
            this.drones.forEach(d => d.update(dt));

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
                        this.waveManager.enemies.forEach(e => {
                            const edx = e.x - this.player.x;
                            const edy = e.y - this.player.y;
                            const edist = Math.sqrt(edx*edx + edy*edy);
                            if (edist < 150) {
                                e.takeDamage(50);
                                this.showDamage(e.x, e.y, "50", '#ff6600');
                                // Lightning effect to each enemy
                                for(let i=0; i<5; i++) {
                                    const p = new Particle(this, this.player.x + (e.x - this.player.x)*Math.random(), this.player.y + (e.y - this.player.y)*Math.random(), '#ffaa00');
                                    p.size = 4;
                                    this.particles.push(p);
                                }
                            }
                        });
                        // Big Shockwave
                        for(let i=0; i<30; i++) {
                            const p = new Particle(this, this.player.x, this.player.y, '#ff6600');
                            p.size = 5;
                            p.vx *= 3;
                            p.vy *= 3;
                            this.particles.push(p);
                        }
                    }
                    if (this.player.hasRepulsionShield) {
                        this.waveManager.enemies.forEach(e => {
                            const edx = e.x - this.player.x;
                            const edy = e.y - this.player.y;
                            const edist = Math.sqrt(edx*edx + edy*edy);
                            if (edist < 150 && edist > 0) {
                                e.x += (edx/edist) * 100;
                                e.y += (edy/edist) * 100;
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
                        for(let i=0; i<20; i++) {
                            const p = new Particle(this, this.player.x, this.player.y, '#00ffff');
                            p.size = 4;
                            p.vx *= 0.2; // Slow fading particles
                            p.vy *= 0.2;
                            p.life = 2.0; // Last longer
                            p.decay = 0.5;
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

                        // Vampire Fang: Chance-based life steal on hit
                        if (this.player.lifeStealChance) {
                            // Roll for heal chance
                            const roll = Math.random();
                            if (roll < this.player.lifeStealChance) {
                                const healAmount = 1; // Always heal 1 HP on success
                                this.player.hp = Math.min(this.player.maxHp, this.player.hp + healAmount);
                                this.showDamage(this.player.x, this.player.y - 30, '+' + healAmount, '#00ff00');
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
        if (this.player.hasMidasTouch && Math.random() < 0.1) {
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
            this.waveManager.enemies.forEach(e => {
                if (e === enemy || e.markedForDeletion) return;
                const edx = e.x - enemy.x;
                const edy = e.y - enemy.y;
                if (edx*edx + edy*edy < 10000) { // 100px radius
                    e.takeDamage(30);
                    this.showDamage(e.x, e.y, "30", '#ff5500');
                    if (e.hp <= 0) this.processEnemyDeath(e);
                }
            });
            // Huge Explosion Effect
            for(let i=0; i<40; i++) {
                const colors = ['#ff5500', '#ff0000', '#ffff00', '#ffffff'];
                const color = colors[Math.floor(Math.random() * colors.length)];
                const p = new Particle(this, enemy.x, enemy.y, color);
                p.size = Math.random() * 5 + 3;
                p.vx *= 2.5;
                p.vy *= 2.5;
                this.particles.push(p);
            }
        }
        
        if (this.player.hasSoulSeekers) {
            const target = this.player.findNearestEnemy();
            if (target && !target.markedForDeletion) {
                this.player.projectiles.push(new Missile(this, enemy.x, enemy.y, target, 15));
                this.player.projectiles.push(new Missile(this, enemy.x, enemy.y, target, 15));
                // Flashy Missile Spawn Particles
                for(let i=0; i<20; i++) {
                    const p = new Particle(this, enemy.x, enemy.y, '#ff8800');
                    p.size = 3;
                    this.particles.push(p);
                }
            }
        }

        // Track Kill
        if (!this.killCount[enemy.type]) this.killCount[enemy.type] = 0;
        this.killCount[enemy.type]++;
    }

    addOrbitalBlades() {
        if (!this.player) return;
        if (!this.player.orbitalBlades) {
            this.player.orbitalBlades = [];
        }
        // Add 2 blades at a time
        this.player.orbitalBlades.push({ angle: 0 });
        this.player.orbitalBlades.push({ angle: Math.PI });
    }

    draw() {
        if (this.state === 'skilltree') {
            if (this.skillTreeUI) this.skillTreeUI.draw();
            return;
        }

        // Clear screen
        this.ctx.fillStyle = '#101018';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.state === 'playing' || this.state === 'reward') {
            this.ctx.save();
            this.ctx.translate(-this.camera.x, -this.camera.y);

            this.drawBackground();
            this.drawGrid();

            this.ctx.lineWidth = 5;
            this.ctx.strokeRect(0, 0, this.worldWidth, this.worldHeight);

            // Draw Entities
            this.obstacles.forEach(o => o.draw(this.ctx));
            this.chests.forEach(c => c.draw(this.ctx));
            this.drops.forEach(d => d.draw(this.ctx));

            if (this.player) this.player.draw(this.ctx);
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
        this.audio.playLevelUp(); // Victory sound

        // Stop Spawning
        this.waveManager.stopSpawning();

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
        // Stage 1: 100, Stage 2: 150, Stage 3: 200, ...
        return 100 + (stageNum - 1) * 50;
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
        document.getElementById('go-dmg-dealt').innerText = Math.round(this.totalDamageDealt || 0);
        document.getElementById('go-dmg-taken').innerText = Math.round(this.totalDamageTaken || 0);
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


// --- js/game/main.js ---


window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    const game = new Game(canvas);
    window.game = game; // グローバルに公開（デバッグ用）
    game.start();
});


