// UI Management System
class UIManager {
    constructor() {
        this.currentScreen = 'main-menu';
        this.gameSettings = {
            numPlayers: 2,
            players: [],
            rounds: 10,
            startingCash: 10000,
            gravity: 10,
            windType: 'random',
            computersBuy: true,
            supplyDemand: false,
            interest: false,
            meteors: false,
            lightning: false,
            talkingTanks: true,
            wallBehavior: 'wrap',
            ceilingBehavior: 'wrap'
        };
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Helper function to add both click and touch events
        const addClickAndTouch = (elementId, handler) => {
            const element = document.getElementById(elementId);
            if (element) {
                element.addEventListener('click', handler);
                element.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    handler();
                });
            }
        };
        
        // Main menu
        addClickAndTouch('new-game-btn', () => this.showGameSetup());
        addClickAndTouch('options-btn', () => this.showOptions());
        addClickAndTouch('help-btn', () => this.showHelp());
        
        // Game setup
        addClickAndTouch('back-btn', () => this.showMainMenu());
        addClickAndTouch('start-game-btn', () => this.startGame());
        
        // Game controls
        addClickAndTouch('fire-btn', () => this.fire());
        addClickAndTouch('inventory-btn', () => this.showInventory());
        
        // Shop
        document.getElementById('shop-done-btn').addEventListener('click', () => this.closeShop());
        
        // Inventory
        document.getElementById('close-inventory').addEventListener('click', () => this.hideInventory());
        
        // Sound toggle
        document.getElementById('sound-toggle').addEventListener('click', () => this.toggleSound());
        
        // Volume slider
        const volumeSlider = document.getElementById('volume-slider');
        volumeSlider.addEventListener('input', (e) => this.updateVolume(e.target.value));
        // Set initial value to match sound system
        volumeSlider.value = 70; // 70% default
        
        // Keyboard controls
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
        
        // Setup change listeners
        document.getElementById('gravity').addEventListener('change', (e) => {
            this.gameSettings.gravity = parseInt(e.target.value);
        });
        
        document.getElementById('wind-type').addEventListener('change', (e) => {
            this.gameSettings.windType = e.target.value;
        });
        
        document.getElementById('rounds').addEventListener('change', (e) => {
            this.gameSettings.rounds = parseInt(e.target.value);
        });
        
        document.getElementById('starting-cash').addEventListener('change', (e) => {
            this.gameSettings.startingCash = parseInt(e.target.value);
        });
        
        document.getElementById('computers-buy').addEventListener('change', (e) => {
            this.gameSettings.computersBuy = e.target.checked;
        });
    }
    
    showScreen(screenId) {
        // Hide all screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.add('hidden');
        });
        
        // Show requested screen
        document.getElementById(screenId).classList.remove('hidden');
        this.currentScreen = screenId;
        
        // Update canvas size when showing game screen
        if (screenId === 'game-screen' && window.game) {
            window.game.updateCanvasSize();
        }
    }
    
    showMainMenu() {
        this.showScreen('main-menu');
    }
    
    showGameSetup() {
        this.showScreen('game-setup');
        this.createPlayerSetup();
    }
    
    showOptions() {
        this.showModal('Options', 'Options menu coming soon!', [
            { text: 'OK', action: () => this.closeModal() }
        ]);
    }
    
    showHelp() {
        const isMobile = 'ontouchstart' in window;
        const content = document.createElement('div');
        content.style.cssText = 'text-align: left; font-size: 16px;';
        
        if (isMobile) {
            content.innerHTML = `
                <h3 style="color: #00ffff; margin-bottom: 15px;">Mobile Controls</h3>
                <ul style="list-style: none; padding: 0;">
                    <li>🎯 <strong>Aim:</strong> Drag on game canvas</li>
                    <li>🔼 <strong>Adjust:</strong> Tap angle/power buttons</li>
                    <li>💥 <strong>Fire:</strong> Tap FIRE! button</li>
                    <li>🎒 <strong>Weapons:</strong> Tap Inventory</li>
                </ul>
            `;
        } else {
            content.innerHTML = `
                <h3 style="color: #00ffff; margin-bottom: 15px;">Keyboard Controls</h3>
                <ul style="list-style: none; padding: 0;">
                    <li>⬆️⬇️ <strong>Arrow Keys:</strong> Adjust angle/power</li>
                    <li>⌨️ <strong>Ctrl + Arrow:</strong> Larger adjustments</li>
                    <li>🏯 <strong>Space/Enter:</strong> Fire</li>
                    <li>🆆 <strong>W:</strong> Select weapon</li>
                    <li>🅸 <strong>I:</strong> Open inventory</li>
                </ul>
            `;
        }
        
        this.showModal('How to Play', content, [
            { text: 'Got it!', action: () => this.closeModal() }
        ]);
    }
    
    createPlayerSetup() {
        const container = document.getElementById('player-setup');
        container.innerHTML = '';
        
        // Number of players selector
        const numPlayersDiv = document.createElement('div');
        numPlayersDiv.innerHTML = `
            <label>Number of Players: 
                <select id="num-players">
                    ${Array.from({length: 10}, (_, i) => 
                        `<option value="${i+1}" ${i+1 === this.gameSettings.numPlayers ? 'selected' : ''}>${i+1}</option>`
                    ).join('')}
                </select>
            </label>
        `;
        container.appendChild(numPlayersDiv);
        
        // Player slots
        const slotsDiv = document.createElement('div');
        slotsDiv.id = 'player-slots';
        container.appendChild(slotsDiv);
        
        // Listen for number change
        document.getElementById('num-players').addEventListener('change', (e) => {
            this.gameSettings.numPlayers = parseInt(e.target.value);
            this.updatePlayerSlots();
        });
        
        this.updatePlayerSlots();
    }
    
    updatePlayerSlots() {
        const container = document.getElementById('player-slots');
        container.innerHTML = '';
        
        // Ensure we have the right number of player configs
        while (this.gameSettings.players.length < this.gameSettings.numPlayers) {
            this.gameSettings.players.push({
                name: `Player ${this.gameSettings.players.length + 1}`,
                type: this.gameSettings.players.length === 0 ? 'human' : 'ai',
                aiType: 'SHOOTER'
            });
        }
        
        for (let i = 0; i < this.gameSettings.numPlayers; i++) {
            const player = this.gameSettings.players[i];
            const slot = document.createElement('div');
            slot.className = 'player-slot';
            slot.innerHTML = `
                <input type="text" value="${player.name}" data-index="${i}" class="player-name">
                <select data-index="${i}" class="player-type">
                    <option value="human" ${player.type === 'human' ? 'selected' : ''}>Human</option>
                    <option value="ai" ${player.type === 'ai' ? 'selected' : ''}>AI</option>
                </select>
                <select data-index="${i}" class="ai-type" ${player.type === 'human' ? 'disabled' : ''}>
                    ${Object.keys(CONSTANTS.AI_TYPES).map(aiType => 
                        `<option value="${aiType}" ${player.aiType === aiType ? 'selected' : ''}>${CONSTANTS.AI_TYPES[aiType].name}</option>`
                    ).join('')}
                </select>
            `;
            container.appendChild(slot);
        }
        
        // Add event listeners
        container.querySelectorAll('.player-name').forEach(input => {
            input.addEventListener('change', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.gameSettings.players[index].name = e.target.value;
            });
        });
        
        container.querySelectorAll('.player-type').forEach(select => {
            select.addEventListener('change', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.gameSettings.players[index].type = e.target.value;
                const aiSelect = container.querySelector(`.ai-type[data-index="${index}"]`);
                aiSelect.disabled = e.target.value === 'human';
            });
        });
        
        container.querySelectorAll('.ai-type').forEach(select => {
            select.addEventListener('change', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.gameSettings.players[index].aiType = e.target.value;
            });
        });
    }
    
    startGame() {
        if (window.game) {
            window.game.startNewGame(this.gameSettings);
        }
    }
    
    showGameScreen() {
        this.showScreen('game-screen');
    }
    
    updateHUD(gameState) {
        if (!gameState) return;
        
        const currentTank = gameState.tanks[gameState.currentPlayer];
        
        document.getElementById('current-player').textContent = currentTank.playerName;
        document.getElementById('round-info').textContent = `Round ${gameState.currentRound}/${gameState.totalRounds}`;
        document.getElementById('angle-display').textContent = `${Math.round(currentTank.angle)}°`;
        document.getElementById('power-display').textContent = Math.round(currentTank.power);
        document.getElementById('wind-display').textContent = `${gameState.wind > 0 ? '→' : '←'} ${Math.abs(Math.round(gameState.wind))}`;
        document.getElementById('weapon-display').textContent = CONSTANTS.WEAPONS[currentTank.selectedWeapon].name;
        document.getElementById('cash-display').textContent = currentTank.money;
        
        // Update fire button state
        const fireBtn = document.getElementById('fire-btn');
        fireBtn.disabled = gameState.projectileActive || currentTank.state === CONSTANTS.TANK_STATES.DESTROYED;
        
        // Update player progression if human player
        if (!currentTank.isAI && window.game && window.game.progression) {
            const stats = window.game.progression.getStats();
            const xpProgress = stats.xpProgress;
            
            // Create or update progression display
            let progDisplay = document.getElementById('progression-display');
            if (!progDisplay) {
                progDisplay = document.createElement('div');
                progDisplay.id = 'progression-display';
                progDisplay.style.cssText = `
                    position: absolute;
                    top: 5px;
                    right: 10px;
                    text-align: right;
                    color: #ff00ff;
                    font-size: 12px;
                    text-shadow: 0 0 5px rgba(255, 0, 255, 0.5);
                `;
                document.getElementById('hud').appendChild(progDisplay);
            }
            
            progDisplay.innerHTML = `
                Level ${stats.level}<br>
                <div style="display: inline-block; width: 100px; height: 8px; background: rgba(255,0,255,0.2); border: 1px solid #ff00ff; margin-top: 2px;">
                    <div style="width: ${xpProgress.percentage}%; height: 100%; background: #ff00ff;"></div>
                </div>
            `;
        }
    }
    
    adjustAngle(delta) {
        if (window.game && window.game.canPlayerAct()) {
            window.game.adjustCurrentTankAngle(delta);
            window.game.soundSystem.play('buttonClick');
        }
    }
    
    adjustPower(delta) {
        if (window.game && window.game.canPlayerAct()) {
            window.game.adjustCurrentTankPower(delta);
            window.game.soundSystem.play('buttonClick');
        }
    }
    
    fire() {
        if (window.game && window.game.canPlayerAct()) {
            window.game.fireCurrentTank();
        }
    }
    
    showInventory() {
        if (!window.game || !window.game.canPlayerAct()) return;
        
        const currentTank = window.game.getCurrentTank();
        if (!currentTank) return;
        
        const inventoryList = document.getElementById('inventory-list');
        inventoryList.innerHTML = '';
        
        // Add weapons
        const weaponsDiv = document.createElement('div');
        weaponsDiv.innerHTML = '<h4>Weapons</h4>';
        
        for (let weaponKey in currentTank.inventory.weapons) {
            const quantity = currentTank.inventory.weapons[weaponKey];
            if (quantity === 0) continue;
            
            const weapon = CONSTANTS.WEAPONS[weaponKey];
            const itemDiv = document.createElement('div');
            itemDiv.className = 'inventory-item';
            if (currentTank.selectedWeapon === weaponKey) {
                itemDiv.classList.add('selected');
            }
            
            itemDiv.innerHTML = `
                <span>${weapon.name}</span>
                <span>${quantity === -1 ? '∞' : quantity}</span>
            `;
            
            itemDiv.addEventListener('click', () => {
                currentTank.selectWeapon(weaponKey);
                this.showInventory(); // Refresh
                this.updateHUD(window.game.getGameState());
            });
            
            weaponsDiv.appendChild(itemDiv);
        }
        
        inventoryList.appendChild(weaponsDiv);
        
        // Add items
        const itemsDiv = document.createElement('div');
        itemsDiv.innerHTML = '<h4>Items</h4>';
        
        for (let itemKey in currentTank.inventory.items) {
            const quantity = currentTank.inventory.items[itemKey];
            if (quantity === 0) continue;
            
            const item = CONSTANTS.ITEMS[itemKey];
            const itemDiv = document.createElement('div');
            itemDiv.className = 'inventory-item';
            
            itemDiv.innerHTML = `
                <span>${item.name}</span>
                <span>${quantity}</span>
            `;
            
            if (item.type !== 'upgrade' || itemKey === 'TRACER') {
                itemDiv.addEventListener('click', () => {
                    if (currentTank.useItem(itemKey)) {
                        this.showInventory(); // Refresh
                    }
                });
            }
            
            itemsDiv.appendChild(itemDiv);
        }
        
        inventoryList.appendChild(itemsDiv);
        
        // Show modal
        document.getElementById('inventory-modal').classList.remove('hidden');
    }
    
    hideInventory() {
        document.getElementById('inventory-modal').classList.add('hidden');
    }
    
    closeShop() {
        if (window.game && window.game.shop) {
            window.game.shop.closeShop();
            window.game.startNextRound();
        }
    }
    
    toggleSound() {
        if (window.game && window.game.soundSystem) {
            const enabled = window.game.soundSystem.toggle();
            const btn = document.getElementById('sound-toggle');
            btn.textContent = enabled ? '🔊' : '🔇';
            window.game.soundSystem.play('buttonClick');
        }
    }
    
    updateVolume(value) {
        if (window.game && window.game.soundSystem) {
            const volume = value / 100; // Convert 0-100 to 0-1
            window.game.soundSystem.setVolume(volume);
            console.log(`Volume set to ${value}%`);
        }
    }
    
    handleKeyPress(e) {
        if (this.currentScreen !== 'game-screen') return;
        
        const key = e.key.toLowerCase();
        const ctrl = e.ctrlKey;
        
        switch(key) {
            case 'arrowleft':
                this.adjustAngle(ctrl ? 5 : 1);
                e.preventDefault();
                break;
            case 'arrowright':
                this.adjustAngle(ctrl ? -5 : -1);
                e.preventDefault();
                break;
            case 'arrowup':
                this.adjustPower(ctrl ? 5 : 1);
                e.preventDefault();
                break;
            case 'arrowdown':
                this.adjustPower(ctrl ? -5 : -1);
                e.preventDefault();
                break;
            case ' ':
            case 'enter':
                this.fire();
                e.preventDefault();
                break;
            case 'w':
                this.showInventory();
                e.preventDefault();
                break;
            case 'i':
                this.showInventory();
                e.preventDefault();
                break;
            case 'escape':
                this.hideInventory();
                e.preventDefault();
                break;
        }
    }
    
    showRoundEnd(winner) {
        // Create round end overlay
        const overlay = document.createElement('div');
        overlay.id = 'round-end-overlay';
        overlay.className = 'game-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        `;
        
        const content = document.createElement('div');
        content.className = 'round-end-content';
        content.style.cssText = `
            text-align: center;
            padding: 40px;
            background: linear-gradient(135deg, #1a0033 0%, #2d004d 100%);
            border: 2px solid #ff00ff;
            border-radius: 20px;
            box-shadow: 0 0 40px #ff00ff;
        `;
        
        const title = document.createElement('h2');
        title.style.cssText = `
            font-size: 48px;
            margin-bottom: 20px;
            color: ${winner ? '#00ff00' : '#ffff00'};
            text-shadow: 0 0 20px currentColor;
        `;
        title.textContent = 'ROUND OVER!';
        
        const result = document.createElement('p');
        result.style.cssText = `
            font-size: 32px;
            margin-bottom: 30px;
            color: #ffffff;
        `;
        result.textContent = winner ? `Winner: ${winner.playerName}` : 'DRAW!';
        
        const continueBtn = document.createElement('button');
        continueBtn.textContent = 'Continue';
        continueBtn.className = 'menu-btn';
        continueBtn.onclick = () => {
            document.body.removeChild(overlay);
        };
        
        content.appendChild(title);
        content.appendChild(result);
        content.appendChild(continueBtn);
        overlay.appendChild(content);
        document.body.appendChild(overlay);
        
        // Animate with GSAP if available
        if (window.gsap && window.UIAnimations) {
            const animations = new UIAnimations();
            gsap.from(content, {
                scale: 0.5,
                opacity: 0,
                duration: 0.5,
                ease: 'back.out(1.7)'
            });
            gsap.from(title, {
                y: -50,
                opacity: 0,
                delay: 0.2,
                duration: 0.5,
                ease: 'power3.out'
            });
            gsap.from(result, {
                x: -100,
                opacity: 0,
                delay: 0.4,
                duration: 0.5,
                ease: 'power3.out'
            });
            gsap.from(continueBtn, {
                y: 50,
                opacity: 0,
                delay: 0.6,
                duration: 0.5,
                ease: 'power3.out'
            });
        }
        
        // Auto-continue after 5 seconds
        setTimeout(() => {
            if (document.getElementById('round-end-overlay')) {
                document.body.removeChild(overlay);
            }
        }, 5000);
    }
    
    showGameOver(stats) {
        // Create game over overlay
        const overlay = document.createElement('div');
        overlay.id = 'game-over-overlay';
        overlay.className = 'game-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        `;
        
        const content = document.createElement('div');
        content.className = 'game-over-content';
        content.style.cssText = `
            text-align: center;
            padding: 40px;
            background: linear-gradient(135deg, #0a0015 0%, #1a0033 50%, #2d004d 100%);
            border: 3px solid #ff00ff;
            border-radius: 20px;
            box-shadow: 0 0 60px #ff00ff;
            max-width: 600px;
        `;
        
        const title = document.createElement('h1');
        title.style.cssText = `
            font-size: 64px;
            margin-bottom: 30px;
            color: #ff0066;
            text-shadow: 0 0 30px #ff0066;
            animation: pulse 2s infinite;
        `;
        title.textContent = 'GAME OVER';
        
        const scoresDiv = document.createElement('div');
        scoresDiv.style.cssText = `
            margin: 30px 0;
            padding: 20px;
            background: rgba(0, 0, 0, 0.5);
            border-radius: 10px;
        `;
        
        const scoresTitle = document.createElement('h3');
        scoresTitle.style.cssText = `
            font-size: 28px;
            color: #00ffff;
            margin-bottom: 20px;
        `;
        scoresTitle.textContent = 'FINAL SCORES';
        scoresDiv.appendChild(scoresTitle);
        
        const sortedTanks = stats.sort((a, b) => b.kills - a.kills);
        sortedTanks.forEach((tank, index) => {
            const scoreRow = document.createElement('div');
            scoreRow.style.cssText = `
                font-size: 20px;
                margin: 10px 0;
                color: ${index === 0 ? '#ffff00' : '#ffffff'};
                text-shadow: ${index === 0 ? '0 0 10px #ffff00' : 'none'};
            `;
            
            const medal = index === 0 ? '🏆' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
            scoreRow.textContent = `${medal} ${index + 1}. ${tank.playerName}: ${tank.kills} kills`;
            scoresDiv.appendChild(scoreRow);
        });
        
        const winner = sortedTanks[0];
        const winnerText = document.createElement('h2');
        winnerText.style.cssText = `
            font-size: 36px;
            margin: 20px 0;
            color: #00ff00;
            text-shadow: 0 0 20px #00ff00;
        `;
        winnerText.textContent = `🎉 ${winner.playerName} WINS! 🎉`;
        
        const menuBtn = document.createElement('button');
        menuBtn.textContent = 'Return to Menu';
        menuBtn.className = 'menu-btn';
        menuBtn.style.marginTop = '30px';
        menuBtn.onclick = () => {
            document.body.removeChild(overlay);
            this.showMainMenu();
        };
        
        content.appendChild(title);
        content.appendChild(winnerText);
        content.appendChild(scoresDiv);
        content.appendChild(menuBtn);
        overlay.appendChild(content);
        document.body.appendChild(overlay);
        
        // Add CSS animation for pulse effect
        if (!document.getElementById('game-over-styles')) {
            const style = document.createElement('style');
            style.id = 'game-over-styles';
            style.textContent = `
                @keyframes pulse {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                    100% { transform: scale(1); }
                }
            `;
            document.head.appendChild(style);
        }
        
        // Animate with GSAP if available
        if (window.gsap) {
            gsap.from(content, {
                scale: 0,
                rotation: 720,
                duration: 1,
                ease: 'back.out(1.7)'
            });
            
            gsap.from(title, {
                y: -100,
                opacity: 0,
                delay: 0.3,
                duration: 0.8,
                ease: 'elastic.out(1, 0.5)'
            });
            
            gsap.from(winnerText, {
                scale: 0,
                opacity: 0,
                delay: 0.6,
                duration: 0.8,
                ease: 'elastic.out(1, 0.5)'
            });
            
            const scoreRows = scoresDiv.querySelectorAll('div');
            gsap.from(scoreRows, {
                x: -200,
                opacity: 0,
                delay: 0.8,
                duration: 0.5,
                stagger: 0.1,
                ease: 'power3.out'
            });
            
            gsap.from(menuBtn, {
                y: 50,
                opacity: 0,
                delay: 1.2,
                duration: 0.5,
                ease: 'power3.out'
            });
            
            // Fireworks effect for winner
            if (window.UIAnimations) {
                for (let i = 0; i < 5; i++) {
                    setTimeout(() => {
                        this.createFirework(overlay);
                    }, i * 500);
                }
            }
        }
    }
    
    showModal(title, content, buttons = []) {
        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.id = 'modal-overlay';
        overlay.className = 'modal-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        `;
        
        const modal = document.createElement('div');
        modal.className = 'modal-content';
        modal.style.cssText = `
            background: linear-gradient(135deg, #1a0033 0%, #2d004d 100%);
            border: 2px solid #ff00ff;
            border-radius: 20px;
            padding: 30px;
            max-width: 500px;
            box-shadow: 0 0 40px #ff00ff;
        `;
        
        const modalTitle = document.createElement('h2');
        modalTitle.style.cssText = `
            color: #ff0066;
            margin-bottom: 20px;
            text-align: center;
            font-size: 32px;
            text-shadow: 0 0 20px #ff0066;
        `;
        modalTitle.textContent = title;
        
        const modalContent = document.createElement('div');
        modalContent.style.cssText = 'color: #ffffff; margin-bottom: 20px;';
        if (typeof content === 'string') {
            modalContent.textContent = content;
        } else {
            modalContent.appendChild(content);
        }
        
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = 'text-align: center; margin-top: 20px;';
        
        buttons.forEach(btn => {
            const button = document.createElement('button');
            button.textContent = btn.text;
            button.className = 'menu-btn';
            button.style.margin = '0 10px';
            button.onclick = btn.action;
            buttonContainer.appendChild(button);
        });
        
        modal.appendChild(modalTitle);
        modal.appendChild(modalContent);
        modal.appendChild(buttonContainer);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        // Animate modal
        if (window.gsap) {
            gsap.from(modal, {
                scale: 0.5,
                opacity: 0,
                duration: 0.3,
                ease: 'back.out(1.7)'
            });
        }
    }
    
    closeModal() {
        const overlay = document.getElementById('modal-overlay');
        if (overlay) {
            document.body.removeChild(overlay);
        }
    }
    
    createFirework(container) {
        const x = Math.random() * window.innerWidth;
        const y = window.innerHeight;
        const targetY = Math.random() * window.innerHeight * 0.5;
        
        const rocket = document.createElement('div');
        rocket.style.cssText = `
            position: absolute;
            width: 4px;
            height: 20px;
            background: #ffff00;
            left: ${x}px;
            top: ${y}px;
            box-shadow: 0 0 10px #ffff00;
        `;
        container.appendChild(rocket);
        
        gsap.to(rocket, {
            y: targetY - y,
            duration: 1,
            ease: 'power2.out',
            onComplete: () => {
                rocket.remove();
                
                // Create explosion
                for (let i = 0; i < 20; i++) {
                    const particle = document.createElement('div');
                    const color = ['#ff0066', '#00ff00', '#00ffff', '#ffff00'][Math.floor(Math.random() * 4)];
                    particle.style.cssText = `
                        position: absolute;
                        width: 6px;
                        height: 6px;
                        background: ${color};
                        left: ${x}px;
                        top: ${targetY}px;
                        border-radius: 50%;
                        box-shadow: 0 0 6px ${color};
                    `;
                    container.appendChild(particle);
                    
                    const angle = (Math.PI * 2 * i) / 20;
                    const distance = 50 + Math.random() * 100;
                    
                    gsap.to(particle, {
                        x: Math.cos(angle) * distance,
                        y: Math.sin(angle) * distance + 50,
                        opacity: 0,
                        duration: 1.5,
                        ease: 'power2.out',
                        onComplete: () => particle.remove()
                    });
                }
            }
        });
    }
}