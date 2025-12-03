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
        this.stock = 0; 
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
            const revenue = 10 * game.businessLevel;
            game.addMoney(revenue);
            game.spawnFloater(this.x + this.w/2, this.y, `+$${revenue.toFixed(0)}`);
        } else {
            game.inventory[this.outputName] = (game.inventory[this.outputName] || 0) + 1;
            game.spawnFloater(this.x + this.w/2, this.y, `+1 ${this.outputName}`);
        }
    }
    draw(ctx) {
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
        ctx.fillStyle = "#2ecc71";
        const pct = Math.min(1, this.progress / this.maxProgress);
        ctx.fillRect(this.x + 10, this.y + 40, (this.w - 20) * pct, 10);
    }
    isClicked(mx, my) {
        return mx >= this.x && mx <= this.x + this.w && my >= this.y && my <= this.y + this.h;
    }
}
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
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
        setInterval(() => this.saveGame(), 5000);
        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
        this.updateUI();
    }
    setupStations() {
        if (this.businessLevel === 1) {
            this.setupStationsLevel1();
        } else {
            this.setupStationsLevel2();
        }
    }
    setupStationsLevel1() {
        this.stations = [
            new Station(0, "Squeezer", 100, 100, "maker", "#f1c40f", null, "juice"),
            new Station(1, "Mixer", 340, 100, "processor", "#e67e22", "juice", "lemonade"),
            new Station(2, "Stand", 580, 100, "seller", "#27ae60", "lemonade", "money")
        ];
        document.getElementById('business-name').textContent = "Lemonade Stand";
        this.updateButtonLabels();
    }
    setupStationsLevel2() {
        this.stations = [
            new Station(0, "Grill", 100, 100, "maker", "#c0392b", null, "patty"),
            new Station(1, "Assembly", 340, 100, "processor", "#d35400", "patty", "burger"),
            new Station(2, "Counter", 580, 100, "seller", "#f39c12", "burger", "money")
        ];
        document.getElementById('business-name').textContent = "Burger Joint";
        this.updateButtonLabels();
    }
    handleClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        this.stations.forEach(s => {
            if (s.isClicked(mx, my)) {
                s.tryStartWork(this);
                this.ctx.fillStyle = "rgba(255,255,255,0.3)";
                this.ctx.fillRect(s.x, s.y, s.w, s.h);
                if (started) {
                    if (Math.random() < 0.1) {
                        s.progress += 50;
                        this.spawnFloater(mx, my, "CRIT!", "#e74c3c");
                    }
                }
            }
        });
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
    getManagerCost(index) {
        const base = [50, 150, 300]; 
        return base[index] * this.businessLevel;
    }
    getUpgradeCost(index) {
        const base = [100, 250, 500];
        const station = this.stations[index];
        return Math.floor(base[index] * Math.pow(1.5, station.level) * this.businessLevel);
    }
    hireManager(index) {
        const cost = this.getManagerCost(index);
        const station = this.stations[index];
        
        if (!station.hasManager && this.money >= cost) {
            this.money -= cost;
            station.hasManager = true;
            this.updateUI();
            this.saveGame();
        }
        
    }
    upgradeStation(stationIndex) {
        const cost = this.getUpgradeCost(index);
        const station = this.stations[index];
        if (this.money >= cost) {
            this.money -= cost;
            station.level++;
            this.updateUI();
            this.saveGame();
            this.spawnFloater(station.x + station.w/2, station.y, "UPGRADED!", "#f1c40f");
        }
    }
    unlockNextBusiness() {
        const cost = 2000;
        if (this.money >= cost && this.businessLevel === 1) {
            this.money -= cost;
            this.businessLevel = 2;
            this.inventory = {}; 
            this.setupStationsLevel2();
            this.updateUI();
            this.saveGame();
        }
    }
    updateUI() {
        document.getElementById('money-display').textContent = '$' + this.money.toFixed(2);
        this.stations.forEach((s, i) => {
            const upgradeButton = document.getElementById(`upg-${i+1}`);
            const hireButton = document.getElementById(`hire-${i+1}`);
            const upCost = this.getUpgradeCost(i);
            upgradeButton.querySelector('.button-cost').textContent = `$${upCost.toLocaleString()}`;
            upgradeButton = this.money < upCost;
            const hireCost = this.getManagerCost(i);
            if (s.hasManager) {
                hireButton.disabled = true;
                hireButton.querySelector('.button-label').textContent = "Hired";
                hireButton.querySelector('.button-cost').textContent = "---";
            } else {
                hireButton.disabled = this.money < hireCost;
                hireButton.querySelector('.button-cost').textContent = `$${hireCost.toLocaleString()}`;
            }
        });
        const nextButton = document.getElementById('next-biz-button');
        if (this.businessLevel === 1) {
            nextButton.disabled = this.money < 2000;
            nextButton.textContent = "Unlock Burger joint ($2,000)";
        } else {
            nextButton.disabled = true;
            nextButton.textContent = "Empire maxed out";
        }
    }
    updateButtonLabels() {
        this.stations.forEach((s, i) => {
            document.querySelector(`#hire-${i+1} .button-label`).textContent = `Hire ${s.name}`;
            document.querySelector(`#upg-${i+1} .button-label`).textContent = `Upgrade ${s.name}`;
        });
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
        this.setupStationsLevel1(); 
        if (saveString) {
            try {
                const data = JSON.parse(saveString);
                this.money = data.money || 0;
                this.businessLevel = data.businessLevel || 1;
                this.inventory = data.inventory || {};
                if (this.businessLevel === 2) {
                    this.setupStationsLevel2();
                }
                if (data.stations && data.stations.length === 3) {
                    data.stations.forEach((savedS, i) => {
                        this.stations[i].level = savedS.level;
                        this.stations[i].hasManager = savedS.hasManager;
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
        this.ctx.fillRect(0, 200, 800, 100);
        this.ctx.strokeStyle = "#8ca2a3";
        this.ctx.lineWidth = 4;
        this.ctx.beginPath();
        this.ctx.moveTo(220, 150);
        this.ctx.lineTo(340, 150);
        this.ctx.moveTo(460, 150);
        this.ctx.lineTo(580, 150);
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        const drawPile = (name, x) => {
            if (this.inventory[name] > 0) {
                this.ctx.fillStyle = (name === 'juice' || name === 'lemonade') ? "#f39c12" : "#c0392b";
                this.ctx.beginPath();
                this.ctx.arc(x, 150, 12, 0, Math.PI*2);
                this.ctx.fill();
                this.ctx.fillStyle = "white";
                this.ctx.font = "bold 10px Arial";
                this.ctx.textAlign = "center";
                this.ctx.fillText(this.inventory[name], x, 154);
            }
        };
        if (this.stations[1]) drawPile(this.stations[1].inputName, 280);
        if (this.stations[2]) drawPile(this.stations[2].inputName, 520);
        this.stations.forEach(s => {
            s.tick(this);
            s.draw(this.ctx);
        });
        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];
            p.y -= 1.5;
            p.life--;
            this.ctx.fillStyle = p.color || "#2ecc71";
            this.ctx.globalAlpha = Math.max(0, p.life / 30);
            this.ctx.font = "bold 16px Calibri";
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