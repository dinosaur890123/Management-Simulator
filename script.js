class Station {
    constructor(id, name, x, y, type, color, inputName, outputName) {
        this.id = id;
        this.name = name;
        this.x = x;
        this.y = y;
        this.w = 120;
        this.h = 100;
        this.color = color;
        this.progress = 0;
        this.maxProgress = 100;
        this.working = false;
        this.speed = 2;
        this.level = 1;
        this.hasManager = false;
        this.inputName = inputName;
        this.outputName = outputName; 
    }
    getSpeed() {
        return 2 * (1 + (this.level - 1) * 0.2);
    }
    tick(game) {
        if (this.hasManager && !this.working) {
            this.tryStartWork(game);
        }
        if (this.working) {
            this.progress += this.speed * (1 + (this.level * 0.5));
            if (this.progress >= this.maxProgress) {
                this.completeWork(game);
            }
        }
    }
    tryStartWork(game) {
        if (this.working) return false;
        if (this.inputName) {
            if (game.inventory[this.inputName] > 0) {
                game.inventory[this.inputName]--;
                this.working = true;
                return true;
            }
        } else {
            this.working = true;
            return true;
        }
        return false;
    }
    completeWork(game) {
        this.working = false;
        this.progress = 0;
        if (this.outputName === 'money') {
            const baseValue = 10 * Math.pow(1.5, this.id);
            const revenue = baseValue * game.businessLevel;
            game.addMoney(revenue);
            game.spawnFloater(this.x + this.w/2, this.y, `+$${revenue.toFixed(0)}`);
        } else {
            game.inventory[this.outputName] = (game.inventory[this.outputName] || 0) + 1;
            game.spawnFloater(this.x + this.w/2, this.y, `+1 ${this.outputName}`);
        }
    }
    draw(ctx) {
        const drawX = this.x + scrollX;
        if (drawX + this.w < 0 || drawX > ctx.canvas.width) return; 
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.w, this.h);

        ctx.strokeStyle = "#354454";
        ctx.lineWidth = 3;
        ctx.strokeRect(this.x, this.y, this.w, this.h);

        ctx.fillStyle = "white";
        ctx.font = "bold 14px Calibri";
        ctx.textAlign = "center";
        ctx.fillText(this.name, this.x + this.w/2, this.y + 20);

        ctx.font = "12px Calibri";
        ctx.fillText(`Lvl: ${this.level}`, this.x + this.w/2, this.y + 85);

        ctx.font = "10px Calibri";
        ctx.fillStyle = "#e6dede";
        ctx.fillText(`Speed: ${this.getSpeed().toFixed(1)}x`, this.x + this.w/2, this.y + 97)
        if (this.hasManager) {
            ctx.fillStyle = "#3498db";
            ctx.beginPath();
            ctx.arc(this.x + this.w - 15, this.y + 15, 8, 0, Math.PI*2);
            ctx.fill();
            ctx.fillStyle = "white";
            ctx.font = "10px Arial";
            ctx.fillText("M", this.x + this.w - 15, this.y + 18);
        }
        ctx.fillStyle = "#4d4a4a";
        ctx.fillRect(this.x + 10, this.y + 40, this.w - 20, 10);
        ctx.fillStyle = this.working ? "#2ecc71" : "#7f8c8d";
        const pct = Math.min(1, this.progress / this.maxProgress);
        ctx.fillRect(this.x + 10, this.y + 40, (this.w - 20) * pct, 10);
    }
    isClicked(mx, my) {
        const worldMx = mx - scrollX;
        return worldMx >= this.x && worldMx <= this.x + this.w && my >= this.y && my <= this.y + this.h;
    }
}
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.scrollX = 0;
        this.isDragging = false;
        this.lastMouseX = 0;
        this.money = 0;
        this.businessLevel = 1;
        this.inventory = {
            juice: 0,
            lemonade: 0,
            patty: 0,
            burger: 0
        };
        this.loadGame();
        this.stations = [];
        this.particles = [];
        this.canvas.addEventListener('mousedown', (e) => this.handleClick(e));
        window.addEventListener('mousemove', (e) => this.onMouseMove(e));
        window.addEventListener('mouseup', () => this.onMouseUp());
        setInterval(() => this.saveGame(), 5000);
        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
        this.generateControls();
        this.updateUI();
    }
    setupStations() {
        const gap = 180;
        const y = 100;
        if (this.businessLevel === 1) {
            document.getElementById('business-name').textContent = "Lemonade Factory";
            this.stations = [
                new Station(0, "Picker", 50, y, "#27ae60", null, "lemons"),
                new Station(1, "Squeezer", 50 + gap, y, "#f1c40f", "lemons", "juice"),
                new Station(2,  "Mixer", 50 + gap*2, y, "#e67e22", "juice", "lemonade"),
                new Station(3, "Bottler", 50 + gap*3, y, "#3498db", "lemonade", "bottles"),
                new Station(4, "Stand", 50 + gap*4, y, "#2ecc71", "bottles", "money")
            ];
        } else if (this.businessLevel === 2) {
            document.getElementById('business-name').textContent = "Burger Empire";
            this.stations = [
                new Station(0, "Butcher", 50, y, "#c0392b", null, "meat"),
                new Station(1, "Grill", 50 + gap, y, "#d35400", "meat", "patty"),
                new Station(2, "Baker", 50 + gap*2, y, "#f39c12", null, "buns"),
                new Station(3, "Assembly", 50 + gap*3, y, "#e67e22", ["patty", "buns"], "burger"),
                new Station(4, "Drive-Thru", 50 + gap*4, y, "#27ae60", "burger", "money")
            ];
            this.stations[3].inputName = "patty";
        }
    }
    generateControls() {
        const container = document.getElementById('dynamic-controls');
        container.innerHTML = '';
        const managerDiv = document.createElement('div');
        managerDiv.className = 'station-control-group';
        managerDiv.innerHTML = '<h3>Hire Managers</h3>';
        const upgradeDiv = document.createElement('div');
        upgradeDiv.className = 'station-control-group';
        upgradeDiv.innerHTML = '<h3>Upgrades</h3>';
        this.stations.forEach((s, i) => {
            const mButton = document.createElement('button');
            mButton.className = 'upgrade-button';
            mButton.id = `hire-${i}`;
            mButton.onclick = () => this.hireManager(i);
            mButton.innerHTML = `
            <div>
                <div class="button-label">Hire ${s.name}</div>
                <div class="button-sub">Auto-work</div>
            <div>
            <div class="button-cost">...</div>
            `;
            managerDiv.appendChild(mButton);
            const uButton = document.createElement('button');
            uButton.className = 'upgrade-button';
            uButton.id = `upgrade-${i}`;
            uButton.onclick = () => this.upgradeStation(i);
            uButton.innerHTML = `
            <div>
                <div class="button-label">${s.name} Mk.II</div>
                <div class="button-sub">Speed x1.25</div>
            </div>
            <div class="button-cost">...</div>
            `;
            upgradeDiv.appendChild(uButton);
        });
        container.appendChild(managerDiv);
        container.appendChild(upgradeDiv);
    }
    onMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        this.isDragging = false;
        this.lastMouseX = e.clientX;
        let clickedStation = false;
        this.stations.forEach(s => {
            clickedStation = true;
            const started = s.tryStartWork(this);
            if (started) {
                    this.spawnFloater(s.x + s.w/2 + this.scrollX, s.y, "Click!", "#ffffff");
                }
        });
        if (!clickedStation) {
            this.isDragging = true;
        }
    }
    onMouseMove(e) {
        if (this.isDragging) {
            const dx = e.clientX - this.lastMouseX;
            this.scrollX += dx;
            const maxScroll = 0;
            const minScroll = -(this.stations.length * 180 + 100 - this.canvas.width);
            if (this.scrollX > maxScroll) this.scrollX = maxScroll;
            if (this.scrollX < minScroll) this.scrollX = minScroll;
            this.lastMouseX = e.clientX;
        }
    }
    onMouseUp() {
        this.isDragging = false;
    }
    addMoney(amount) {
        this.money += amount;
        this.updateUI();
    }
    spawnFloater(x, y, text) {
        this.particles.push({
            x: x, y: y, text: text, life: 60, color: color
        });
    }
    getManagerCost(i) {return (100 * (i+1)) * Math.pow(1.5, i) * this.businessLevel;}
    getUpgradeCost(i) {
        const station = this.stations[i];
        return Math.floor(50 * (i+1) * Math.pow(1.6, station.level) * this.businessLevel);
    }
    hireManager(i) {
        const cost = this.getManagerCost(index);
        if (!this.stations[i].hasManager && this.money >= cost) {
            this.money -= cost;
            this.stations[i].hasManager = true;
            this.updateUI();
            this.saveGame();
        }
        
    }
    upgradeStation(i) {
        const cost = this.getUpgradeCost(index);
        if (this.money >= cost) {
            this.money -= cost;
            this.stations[i].level++;
            this.updateUI();
            this.saveGame();
        }
    }
    unlockNextBusiness() {
        const cost = 2000;
        if (this.money >= cost && this.businessLevel === 1) {
            this.money -= cost;
            this.businessLevel = 2;
            this.inventory = {}; 
            this.setupStations();
            this.generateControls();
            this.updateUI();
            this.saveGame();
            this.scrollX = 0;
        }
    }
    updateUI() {
        document.getElementById('money-display').textContent = '$' + Math.floor(this.money).toLocaleString();
        this.stations.forEach((s, i) => {
            const hireButton = document.getElementById(`hire-${i}`);
            if (hireButton) {
                const cost = this.getManagerCost(i);
                if (s.hasManager) {
                    hireButton.disabled = true;
                    hireButton.querySelector('.button-cost').textContent = "OWNED";
                    hireButton.style.background = "#e1f7d5";
                } else {
                    hireButton.disabled = this.money < cost;
                    hireButton.querySelector('.button-cost').textContent = `$${Math.floor(cost).toLocaleString()}`;
                }
            }
            const upgradeButton = document.getElementById(`upgrade-${i}`);
            if (upgradeButton) {
                const cost = this.getUpgradeCost(i);
                uButton.disabled = this.money < cost;
                uButton.querySelector('.button-cost').textContent = `$${Math.floor(cost).toLocaleString()}`;
                uButton.querySelector('.button-label').textContent = `${s.name} (Level ${s.level})`;
            }
        });
        const nextButton = document.getElementById('next-biz-button');
        if (this.businessLevel === 1) {
            nextButton.textContent = "Unlock Burger Empire ($10,000)";
            nextButton.disabled = this.money < 10000;
        } else {
            nextButton.textContent.textContent = "Max Business Reached";
            nextButton.disabled = true;
        }
    }
    saveGame() {
        const data = {
            money: this.money,
            businessLevel: this.businessLevel,
            inventory: this.inventory,
            stations: this.stations.map(s => ({
                level: s.level,
                hasManager: s.hasManager
            }))
        };
        localStorage.setItem('tycoonSave', JSON.stringify(data));
    }
    loadGame() {
        const saveString = localStorage.getItem('tycoonSave');
        this.setupStations();
        if (saveString) {
            try {
                const data = JSON.parse(saveString);
                this.money = data.money || 0;
                this.businessLevel = data.businessLevel || 1;
                this.inventory = data.inventory || {};
                this.setupStations();
                if (data.stations) {
                    data.stations.forEach((saved, i) => {
                        if (this.stations[i]) {
                            this.stations[i].level = saved.level;
                            this.stations[i].hasManager = saved.hasManager;
                        }
                    });
                }
            } catch (e) {
                console.error("Save file corrupted, resetting.", e);
            }
        }
    }
    resetGame() {
        localStorage.removeItem('tycoonSave');
        location.reload();
    }
    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = this.businessLevel === 1 ? "#ecf0f1" : "#5d4037";
        this.ctx.fillRect(0, 200, this.canvas.width, 100);
        this.ctx.strokeStyle = "rgba(0,0,0,0.1)";
        this.ctx.beginPath();
        for (let i=0; i<20; i++) {
            let x = (i * 100 + this.scrollX) % (20 * 100);
            this.ctx.moveTo(x, 200);
            this.ctx.lineTo(x, 300);
        }
        this.ctx.stroke();
        this.ctx.setLineDash([10, 5]);
        this.ctx.strokeStyle = "#bdc3c7";
        this.ctx.lineWidth = 4;
        this.stations.forEach((s, i) => {
            if (i < this.stations.length - 1) {
                const nextS = this.stations[i+1];
                const startX = s.x + s.w + this.scrollX;
                const endX = nextS.x + this.scrollX;
                if (endX > 0 && startX < this.canvas.width) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(startX, s.y + 50);
                    this.ctx.lineTo(endX, s.y + 50);
                    this.ctx.stroke();
                }
            }
        });
        this.ctx.setLineDash([]);
        this.stations.forEach((s) => {
            if (s.inputName && this.inventory[s.inputName] > 0) {
                const drawX = s.x - 30 + this.scrollX;
                if (drawX > -50 && drawX < this.canvas.width) {
                    this.ctx.fillStyle = s.color;
                    this.ctx.beginPath();
                    this.ctx.arc(drawX, s.y + 50, 10 + Math.min(10, this.inventory[s.inputName]), 0, Math.PI*2);
                    this.ctx.fill();
                    this.ctx.fillStyle = "#ffffff";
                    this.ctx.font = "10px Calibri";
                    this.ctx.fillText(this.inventory[s.inputName], drawX, s.y + 55);
                }
            }
        });
        this.stations.forEach(s => s.draw(this.ctx, this.scrollX));
        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];
            const drawX = p.x;
            p.y -= 1;
            p.life--;
            this.ctx.fillStyle = p.color;
            this.ctx.globalAlpha = Math.max(0, p.life / 40);
            this.ctx.font = "bold 14px Calibri";
            this.ctx.fillText(p.text, p.x, p.y);
            this.ctx.globalAlpha = 1.0;
            if (p.life <= 0) this.particles.splice(i, 1);
        }
        if (this.money > 0 || this.stations.some(s => s.working)) {
            this.updateUI();
        }
        requestAnimationFrame(this.animate);
    }
}
const game = new Game();