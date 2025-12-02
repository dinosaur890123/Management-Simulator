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
        if (this.working) return;
        if (this.inputName) {
            if (game.inventory[this.inputName] > 0) {
                game.inventory[this.inputName]--;
                this.working = true;
            }
        } else {
            this.working = true;
        }
    }
    completeWork(game) {
        this.working = false;
        this.progress = 0;
        if (this.outputName === 'money') {
            game.addMoney(10 * game.businessLevel);
            game.spawnFloater(this.x + this.w/2, this.y, "+$$$");
        } else {
            game.inventory[this.outputName] = (game.inventory[this.outputName] || 0) + 1;
            game.spawnFloater(this.x + this.w/2, this.y, "+1 " + this.outputName);
        }
    }
    draw(ctx) {
        ctxfillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.w, this.h);
        ctx.strokeStyle = "#354454";
        ctx.lineWidth = 3;
        ctx.strokeRect(this.x, this.y, this.w, this.h);
        ctx.fillStyle = "white";
        ctx.font = "bold 14px Calibri";
        ctx.textAlign = "center";
        ctx.fillText(this.name, this.x + this.w/2, this.y + 20);
        ctx.font = "12px Calibri";
        ctx.fillText(`Lvl: ${this.level}`, this.x + this.w/2, this.y + 90);
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
        this.stations = [];
        this.setupStationsLevel1();
        this.particles = [];
        this.canvas.addEventListener('mousedown', (e) => this.handleClick(e));
        this.lastTime = 0;
        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
        this.updateUI();
    }
    setupStationsLevel1() {
        this.stations = [
            new Station(0, "Squeezer", 100, 100, "maker", "#f1c40f", null, "juice"),
            new Station(1, "Mixer", 340, 100, "processor", "#e67e22", "juice", "lemonade"),
            new Station(2, "Stand", 580, 100, "seller", "#27ae60", "lemonade", "money")
        ];
        document.getElementById('business-name').textContent = "Lemonade Stand";
        this.updateButtons("Juice", "Lemonade");
    }
    setupStationsLevel2() {
        this.stations = [
            new Station(0, "Grill", 100, 100, "maker", "#c0392b", null, "patty"),
            new Station(1, "Assembly", 340, 100, "processor", "#d35400", "patty", "burger"),
            new Station(2, "Counter", 580, 100, "seller", "#f39c12", "burger", "money")
        ];
        document.getElementById('business-name').textContent = "Burger Joint";
        this.updateButtons("Patty", "Burger");
    }
    updateButtons(res1, res2) {
        document.getElementById('hire-1').querySelector('.button-label').textContent = `Hire ${this.stations[0].name}`;
        document.getElementById('hire-2').querySelector('.button-label').textContent = `Hire ${this.stations[1].name}`;
        document.getElementById('hire-3').querySelector('.button-label').textContent = `Hire ${this.stations[2].name}`;
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
            }
        });
    }
    addMoney(amount) {
        this.money += amount;
        this.updateUI();
    }
    spawnFloater(x, y, text) {
        this.particles.push({
            x: x, y: y, text: text, life: 60
        });
    }
    hireManager(stationIndex) {
        const costs = [50, 150, 300];
        const cost = costs[stationIndex] * this.businessLevel;
        if (this.money >= cost && !this.stations[stationIndex].hasManager) {
            this.money -= cost;
            this.stations[stationIndex].hasManager = true;
            this.updateUI();
        }
    }
    upgradeStation(stationIndex) {
        const costs = [100, 250, 500];
        const cost = costs[stationIndex] * this.stations[stationIndex].level * this.businessLevel;
        if (this.money >= cost) {
            this.money -= cost;
            this.stations[stationIndex].level++;
            this.updateUI();
        }
    }
    unlockNextBusiness() {
        const cost = 2000;
        if (this.money >= cost && this.businessLevel === 1) {
            this.money -= cost;
            this.businessLevel = 2;
            this.inventory = {}; 
            this.setupStationsLevel2();
            const button = ocument.getElementById('next-biz-button');
            button.textContent = "Max level reached";
            button.disabled = true;
            this.updateUI();
        }
    }
    updateUI() {
        document.getElementById('money-display').textContent = '$' + this.money.toFixed(2);
        const nextBizButton = document.getElementById('next-biz-button');
        if (this.businessLevel === 1) {
            nextBizButton.disabled = this.money < 2000;
        }
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
        const input1 = this.stations[1].inputName;
        if (this.inventory[input1] > 0) {
            this.ctx.fillStyle = this.businessLevel === 1 ? "#f39c12" : "#c0392b";
            this.ctx.beginPath();
            thix.ctx.arc(280, 150, 10 + Math.min(10, this.inventory[input1]), 0, Math.PI*2);
            this.ctx.fill();
            this.ctx.fillStyle = "black";
            this.ctx.fillText(this.inventory[input1], 280, 155);
        }
        const input2 = this.stations[2].inputName;
        if (this.inventory[input2] > 0) {
            this.ctx.fillStyle = this.businessLevel === 1 ? "#f1c40f" : "#d35400";
            this.ctx.beginPath();
            this.ctx.arc(520, 150, 10 + Math.min(10, this.inventory[input2]), 0, Math.PI*2);
            this.ctx.fill();
            this.ctx.fillStyle = "black";
            this.ctx.fillText(this.inventory[input2], 520, 155);
        }
        this.stations.forEach(s => {
            s.tick(this);
            s.draw(this.ctx);
        });
        this.particles.forEach((p, index) => {
            p.y -= 1;
            p.life--;
            this.ctx.fillStyle = `rgba(46, 204, 113, ${p.life/60})`;
            this.ctx.font = "bold 16px Calibri";
            this.ctx.fillText(p.text, p.x, p.y);
            if (p.life <= 0) this.particles.splice(index, 1);
        });
        if (this.money > 0) this.updateUI();
        requestAnimationFrame(this.animate);
    }
}
const game = new Game();