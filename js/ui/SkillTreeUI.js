export class SkillTreeUI {
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

        let startTouchX = 0;
        let startTouchY = 0;

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
            startTouchX = pos.x;
            startTouchY = pos.y;
            lastClientX = pos.x;
            lastClientY = pos.y;
            this.dragStartX = pos.x - this.panX;
            this.dragStartY = pos.y - this.panY;
        };

        const doDrag = (e) => {
            if (this.isDragging) {
                const pos = getClientPos(e);
                if (Math.hypot(pos.x - startTouchX, pos.y - startTouchY) > 15) {
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
