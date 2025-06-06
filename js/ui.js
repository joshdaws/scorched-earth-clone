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
        const current = document.querySelector('.screen:not(.hidden)');
        const next = document.getElementById(screenId);

        if (!next || current === next) return;

        if (current) {
            window.motion
                ? window.motion.animate(current, { opacity: 0 }, { duration: 0.25 })
                      .finished.then(() => current.classList.add('hidden'))
                : current.classList.add('hidden');
        }

        next.classList.remove('hidden');
        if (window.motion) {
            next.style.opacity = 0;
            window.motion.animate(next, { opacity: 1 }, { duration: 0.25 });
        }

        this.currentScreen = screenId;

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
        alert('Options menu not yet implemented');
    }
    
    showHelp() {
        const isMobile = 'ontouchstart' in window;
        if (isMobile) {
            alert('Mobile Controls:\n' +
                  'Tap angle/power buttons to adjust\n' +
                  'Drag on game canvas to aim\n' +
                  'Tap FIRE! button to shoot\n' +
                  'Tap Inventory to select weapons');
        } else {
            alert('Controls:\n' +
                  'Arrow Keys: Adjust angle/power\n' +
                  'Ctrl + Arrow: Larger adjustments\n' +
                  'Space/Enter: Fire\n' +
                  'W: Select weapon\n' +
                  'I: Open inventory');
        }
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
            const updateName = (e) => {
                const index = parseInt(e.target.dataset.index);
                this.gameSettings.players[index].name = e.target.value;
            };
            // Use the input event so the latest value is captured even if the
            // user does not blur the field before starting the game
            input.addEventListener('input', updateName);
            // Fallback for older behaviour
            input.addEventListener('change', updateName);
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
        
        // Show modal with animation
        const modal = document.getElementById('inventory-modal');
        modal.classList.remove('hidden');
        if (window.motion) {
            modal.style.opacity = 0;
            modal.style.transform = 'scale(0.95)';
            window.motion.animate(modal, { opacity: 1, scale: 1 }, { duration: 0.2 });
        }
    }

    hideInventory() {
        const modal = document.getElementById('inventory-modal');
        if (window.motion) {
            window.motion
                .animate(modal, { opacity: 0, scale: 0.95 }, { duration: 0.2 })
                .finished.then(() => modal.classList.add('hidden'));
        } else {
            modal.classList.add('hidden');
        }
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
        alert(`Round Over!\n${winner ? `Winner: ${winner.playerName}` : 'Draw!'}`);
    }
    
    showGameOver(stats) {
        let message = 'Game Over!\n\nFinal Scores:\n';
        
        const sortedTanks = stats.sort((a, b) => b.kills - a.kills);
        sortedTanks.forEach((tank, index) => {
            message += `${index + 1}. ${tank.playerName}: ${tank.kills} kills\n`;
        });
        
        alert(message);
        this.showMainMenu();
    }
}