export class InputHandler {
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
            e.target.closest('.scrollable') ||
            e.target.closest('.ui-screen') ||
            e.target.tagName === 'BUTTON' ||
            e.target.tagName === 'SELECT' ||
            e.target.tagName === 'INPUT' ||
            e.target.tagName === 'LABEL') {
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
            e.target.closest('.scrollable') ||
            e.target.closest('.ui-screen') ||
            e.target.tagName === 'BUTTON' ||
            e.target.tagName === 'SELECT' ||
            e.target.tagName === 'INPUT' ||
            e.target.tagName === 'LABEL') {
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
            e.target.closest('.scrollable') ||
            e.target.closest('.ui-screen') ||
            e.target.tagName === 'BUTTON' ||
            e.target.tagName === 'SELECT' ||
            e.target.tagName === 'INPUT' ||
            e.target.tagName === 'LABEL') {
            return;
        }

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
