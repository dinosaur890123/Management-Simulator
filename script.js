class Station {
    constructor(id, name, x, y, color, inputName, outputName) {
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
        let speed = 2 * (1 + (this.level - 1) * 0.25);
        if (game.hasResearch('speed_1')) speed *= 1.1;
        if (game.hasResearch('speed_2')) speed *= 1.25;
        return speed;
    }
    tick(game) {
        if (this.hasManager && !this.working) {
            this.tryStartWork(game);
        }
        if (this.working) {
            this.progress += this.getSpeed();
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
            const revenue = this.calculateRevenue(game);
            game.addMoney(revenue);
            game.spawnFloater(this.x + this.w/2, this.y, `+$${Math.floor(revenue).toLocaleString()}`);
            if (game.tutorialActive && game.tutorialStep === 3) {
                game.nextTutorialStep();
            }
        } else {
            game.inventory[this.outputName] = (game.inventory[this.outputName] || 0) + 1;
            game.spawnFloater(this.x + this.w/2, this.y, `+1 ${this.outputName}`);
        }
    }
    calculateRevenue(game) {
        const baseValue = 10 * Math.pow(1.5, this.id);
        const prestigeMult = 1 + (game.investors * 0.1);
        let researchMult = 1.0;
        if (game.hasResearch('profit_1')) researchMult *= 1.15;
        if (game.hasResearch('profit_2')) researchMult *= 1.50;
        return baseValue * game.businessLevel * prestigeMult * researchMult;
    }
    draw(ctx, scrollX) {
        const drawX = this.x + scrollX;
        if (drawX + this.w < 0 || drawX > ctx.canvas.width) return; 
        ctx.fillStyle = this.color;
        ctx.fillRect(drawX, this.y, this.w, this.h);

        ctx.strokeStyle = "#354454";
        ctx.lineWidth = 3;
        ctx.strokeRect(drawX, this.y, this.w, this.h);

        ctx.fillStyle = "white";
        ctx.font = "bold 14px Calibri";
        ctx.textAlign = "center";
        ctx.fillText(this.name, drawX + this.w/2, this.y + 20);

        ctx.font = "12px Calibri";
        ctx.fillText(`Lvl: ${this.level}`, drawX + this.w/2, this.y + 85);

        ctx.font = "10px Calibri";
        ctx.fillStyle = "#e6dede";
        ctx.fillText(`Speed: ${this.getSpeed().toFixed(1)}x`, drawX + this.w/2, this.y + 97)
        if (this.hasManager) {
            ctx.fillStyle = "#3498db";
            ctx.beginPath();
            ctx.arc(drawX + this.w - 15, this.y + 15, 8, 0, Math.PI*2);
            ctx.fill();
            ctx.fillStyle = "white";
            ctx.font = "10px Arial";
            ctx.fillText("M", drawX + this.w - 15, this.y + 18);
        }
        ctx.fillStyle = "#4d4a4a";
        ctx.fillRect(drawX + 10, this.y + 40, this.w - 20, 10);
        ctx.fillStyle = this.working ? "#2ecc71" : "#7f8c8d";
        const pct = Math.min(1, this.progress / this.maxProgress);
        ctx.fillRect(drawX + 10, this.y + 40, (this.w - 20) * pct, 10);
    }
    isClicked(mx, my, scrollX) {
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
        this.investors = 0;
        this.businessLevel = 1;
        this.inventory = {
            juice: 0,
            lemonade: 0,
            patty: 0,
            burger: 0
        };
        this.stations = [];
        this.loadGame();
        this.particles = [];
        this.purchasedResearch = [];
        this.researchTree = [
            {id: 'profit_1', name: "Marketing campaign", cost: 500, desc: "Global Income x1.15"},
            {id: 'speed_1', name: "Better Equipment", cost: 1200, desc: "All Stations Speed x1.1"},
            {id: 'hiring_1', name: "Recruiter", cost: 2500, desc: "Managers Cost -20%"},
            {id: 'profit_2', name: "TV Commercial", cost: 10000, desc: "Global income x1.5"},
            {id: 'speed_2', name: "Robotic Arms", cost: 25000, desc: "All stations speed x1.25"}
        ]
        this.tutorialActive = false;
        this.tutorialStep = 0;
        this.tutorialComplete = false;
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        window.addEventListener('mousemove', (e) => this.onMouseMove(e));
        window.addEventListener('mouseup', () => this.onMouseUp());
        setInterval(() => this.saveGame(), 5000);
        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
        this.generateControls();
        this.updateUI();
        if (!this.tutorialComplete) {
            this.showTutorialPrompt();
        }
    }
    showTutorialPrompt() {
        document.getElementById('tutorial-modal').style.display = 'flex';
    }
    startTutorial() {
        document.getElementById('tutorial-modal').style.display = 'none';
        this.tutorialActive = true;
        this.tutorialStep = 1;
        this.money = 0;
        this.updateTutorialUI();
    }
    skipTutorial() {
        document.getElementById('tutorial-modal').style.display = 'none';
        this.tutorialComplete = true;
        this.saveGame();
    }
    nextTutorialStep() {
        this.tutorialStep++;
        if (this.tutorialStep > 4) {
            this.finishTutorial();
        } else {
            this.updateTutorialUI();
        }
    }
    finishTutorial() {
        this.tutorialActive = false;
        this.tutorialComplete = true;
        this.tooltip.style.display = 'none';
        this.spawnFloater(400, 150, "Tutorial complete!", "#f1c40f");
        this.saveGame();
    }
    updateTutorialUI() {
        if (!this.tutorialActive) return;
        this.tooltip.style.display = 'block';
        switch(this.tutorialStep) {
            case 1:
                this.tooltipText.textContent = "Click the Picker to harvest lemons!";
                break;
            case 2:
                this.tooltipText.textContent = "Good! Now click the squeezer to make juice.";
                break;
            case 3:
                this.tooltipText.textContent = "Keep clicking subsequent stations to sell lemonade!";
                break;
            case 4:
                this.tooltipText.textContent = "Great job! Use money to Hire Managers below to automate clicks.";
                setTimeout(() => this.finishTutorial(), 4000);
                break;
        }
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
        for (let i = 0; i < this.stations.length; i++) {
            const s = this.stations[i];
            if (s.isClicked(mx, my, this.scrollX)) {
                clickedStation = true;
                const started = s.tryStartWork(this);
                if (started) {
                    this.spawnFloater(s.x + s.w/2 + this.scrollX, s.y, "Click!", "#ffffff");
                }
                break;
            }
        }
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
    spawnFloater(x, y, text, color = '#ffffff') {
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
        const cost = this.getManagerCost(i);
        if (!this.stations[i].hasManager && this.money >= cost) {
            this.money -= cost;
            this.stations[i].hasManager = true;
            this.updateUI();
            this.saveGame();
        }
        
    }
    upgradeStation(i) {
        const cost = this.getUpgradeCost(i);
        if (this.money >= cost) {
            this.money -= cost;
            this.stations[i].level++;
            this.updateUI();
            this.saveGame();
        }
    }
    doPrestige() {
        const pendingInvestors = Math.floor(this.money / 50000);
        if (pendingInvestors < 1) return;
        if (confirm(`Sell business? You will reset but gain ${pendingInvestors} Investors!`)) {
            this.investors += pendingInvestors;
            this.money = 0;
            this.businessLevel = 1;
            this.inventory = {};
            this.stations = [];
            this.scrollX = 0;
            this.setupStations();
            this.generateControls();
            this.updateUI();
            this.saveGame();
            alert(`Sold! You now have ${this.investors} Investors giving a +${(this.investors*10).toFixed(0)}% bonus.`);
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
        document.getElementById('investor-count').textContent = this.investors;
        document.getElementById('investor-bonus').textContent = `+${(this.investors * 10)}%`;
        const mult = 1 + (this.investors * 0.1);
        document.getElementById('multiplier-display').textContent = mult.toFixed(1);
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
                upgradeButton.disabled = this.money < cost;
                upgradeButton.querySelector('.button-cost').textContent = `$${Math.floor(cost).toLocaleString()}`;
                upgradeButton.querySelector('.button-label').textContent = `${s.name} (Level ${s.level})`;
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
        const pendingInvestors = Math.floor(this.money / 50000);
        const prestigeButton = document.getElementById('prestige-button');
        if (pendingInvestors > 0) {
            prestigeButton.disabled = false;
            prestigeButton.textContent = `Sell & gain ${pendingInvestors} investors`;
            document.getElementById('prestige-preview').textContent = "Click to Restart with bonus";
        } else {
            prestigeButton.disabled = false;
            prestigeButton.textContent = "Sell Company";
            document.getElementById('prestige-preview').textContent = `Need $${(50000 - this.money).toLocaleString()} more value`;

        }
    }
    saveGame() {
        const data = {
            money: this.money,
            investors: this.investors,
            businessLevel: this.businessLevel,
            inventory: this.inventory,
            stations: this.stations.map(s => ({
                level: s.level,
                hasManager: s.hasManager
            }))
        };
        data.lastSaveTime = Date.now();
        localStorage.setItem('tycoonSave', JSON.stringify(data));
    }
    loadGame() {
        const saveString = localStorage.getItem('tycoonSave');
        this.setupStations();
        if (saveString) {
            try {
                const data = JSON.parse(saveString);
                this.money = data.money || 0;
                this.investors = data.investors || 0;
                this.businessLevel = data.businessLevel || 1;
                this.inventory = data.inventory || {};
                if (this.businessLevel !== 1) this.setupStations();
                this.setupStations();
                if (data.stations) {
                    data.stations.forEach((saved, i) => {
                        if (this.stations[i]) {
                            this.stations[i].level = saved.level;
                            this.stations[i].hasManager = saved.hasManager;
                        }
                    });
                }
                if (data.lastSaveTime) {
                    this.calculateOfflineEarnings(data.lastSaveTime);
                }
            } catch (e) {
                console.error("Save file corrupted, resetting.", e);
            }
        }
    }
    calculateOfflineEarnings(lastSaveTime) {
        const now = Date.now();
        const diffSeconds = (now - lastSaveTime) / 1000;
        if (diffSeconds > 10) {
            const moneyStation = this.stations[this.stations.length - 1];
            if (moneyStation && moneyStation.hasManager) {
                const speed = moneyStation.getSpeed();
                const itemsPerSec = (speed * 60) / 100;
                const revenuePerItem = moneyStation.calculateRevenue(this);
                const earned = Math.floor(itemsPerSec * revenuePerItem * diffSeconds);
                if (earned > 0) {
                    this.money += earned;
                    setTimeout(() => alert(`Welcome back! Your manager earned $${earned.toLocaleString()} while you were away.`), 500);
                }
            }
        }
    }
    hardReset() {
        if (confirm("Full reset: This deletes save, investors and everything. Sure?")) {
            localStorage.removeItem('tycoonSaveV3');
            location.reload();
        }
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
        if (this.tutorialActive && this.tutorialStep <= 3) {
            let targetIndex = -1;
            if (this.tutorialStep === 1) targetIndex = 0;
            if (this.tutorialStep === 2) targetIndex = 1;
            if (this.tutorialStep === 3) targetIndex = -1;
            if (targetIndex >= 0) {
                const tS = this.stations[targetIndex];
                const drawX = tS.x + this.scrollX;
                this.ctx.strokeStyle = `rgba(241, 196, 15, ${(Math.sin(Date.now()/200)+1)/2})`;
                this.ctx.lineWidth = 5;
                this.ctx.strokeRect(drawX - 5, tS.y - 5, tS.w + 10, tS.h + 10);
                const canvasRect = this.canvas.getBoundingClientRect();
                this.tooltip.style.left = (drawX + tS.w/2) + 'px';
                this.tooltip.style.top = (tS.y - 10) + 'px';
            } else if (this.tutorialStep === 3) {
                this.tooltip.style.left = '400px';
                this.tooltip.style.top = '100px';
            }
        }
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