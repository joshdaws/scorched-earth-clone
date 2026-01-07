// Shop System
class Shop {
    constructor() {
        this.currentPlayer = null;
        this.pendingPurchases = [];
        this.supplyDemandEnabled = false;
        this.priceModifiers = {};
        this.purchaseHistory = {};
        
        // Initialize price modifiers
        for (let key in CONSTANTS.WEAPONS) {
            this.priceModifiers[key] = 1.0;
        }
        for (let key in CONSTANTS.ITEMS) {
            this.priceModifiers[key] = 1.0;
        }
    }
    
    openShop(player, progression = null) {
        this.currentPlayer = player;
        this.pendingPurchases = [];
        this.progression = progression;
        this.updateShopDisplay();
        
        // Show shop screen
        document.getElementById('game-screen').classList.add('hidden');
        document.getElementById('shop-screen').classList.remove('hidden');
        
        // Show shop keeper one-liner if progression exists
        if (this.progression) {
            const oneLiner = this.progression.getRandomOneLiner('shop');
            if (oneLiner) {
                // Create temporary message at top of shop
                const message = document.createElement('div');
                message.className = 'shop-keeper-message';
                message.textContent = `"${oneLiner}"`;
                message.style.cssText = `
                    position: absolute;
                    top: 60px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: rgba(0, 0, 0, 0.8);
                    color: #ff00ff;
                    padding: 10px 20px;
                    border-radius: 10px;
                    font-style: italic;
                    z-index: 1000;
                    animation: fadeInOut 3s ease-in-out;
                `;
                document.getElementById('shop-screen').appendChild(message);
                setTimeout(() => message.remove(), 3000);
            }
        }
    }
    
    updateShopDisplay() {
        const shopItemsContainer = document.getElementById('shop-items');
        shopItemsContainer.innerHTML = '';
        
        // Update cash display
        document.getElementById('shop-cash').textContent = this.currentPlayer.money;
        
        // Add weapons section
        this.addShopSection(shopItemsContainer, 'Weapons', CONSTANTS.WEAPONS, 'weapon');
        
        // Add items section
        this.addShopSection(shopItemsContainer, 'Defensive & Utility Items', CONSTANTS.ITEMS, 'item');
    }
    
    addShopSection(container, title, items, type) {
        const section = document.createElement('div');
        section.className = 'shop-section';
        section.innerHTML = `<h3>${title}</h3>`;
        
        const grid = document.createElement('div');
        grid.className = 'shop-items-grid';
        
        for (let key in items) {
            const item = items[key];
            const currentPrice = this.getCurrentPrice(key, item.cost);
            const owned = this.getOwnedQuantity(key, type);
            const pending = this.getPendingQuantity(key, type);
            
            // Check if weapon is locked
            let isLocked = false;
            let requiredLevel = 0;
            if (type === 'weapon' && this.progression && !this.currentPlayer.isAI) {
                isLocked = !this.progression.isWeaponUnlocked(key);
                if (isLocked) {
                    // Find required level
                    const lockedWeapons = this.progression.getLockedWeapons();
                    const lockedWeapon = lockedWeapons.find(w => w.id === key);
                    if (lockedWeapon) {
                        requiredLevel = lockedWeapon.requiredLevel;
                    }
                }
            }
            
            const itemElement = document.createElement('div');
            itemElement.className = 'shop-item';
            if (pending > 0) {
                itemElement.classList.add('selected');
            }
            if (isLocked) {
                itemElement.classList.add('locked');
            }
            
            itemElement.innerHTML = `
                <h4>${item.name}</h4>
                ${isLocked 
                    ? `<div class="locked-info">🔒 Level ${requiredLevel}</div>`
                    : `<div class="price">$${currentPrice}</div>`
                }
                ${owned > 0 ? `<div class="owned">Owned: ${owned === -1 ? '∞' : owned}</div>` : ''}
                ${pending > 0 ? `<div class="pending">In Cart: ${pending}</div>` : ''}
                ${item.quantity && item.quantity > 1 ? `<div class="quantity">Qty: ${item.quantity}</div>` : ''}
            `;
            
            // Add click handler only if not locked
            if (!isLocked) {
                itemElement.addEventListener('click', () => this.toggleItem(key, type, currentPrice, item));
            } else {
                itemElement.style.opacity = '0.5';
                itemElement.style.cursor = 'not-allowed';
                itemElement.title = `Unlocks at level ${requiredLevel}`;
            }
            
            grid.appendChild(itemElement);
        }
        
        section.appendChild(grid);
        container.appendChild(section);
    }
    
    getOwnedQuantity(key, type) {
        if (type === 'weapon') {
            return this.currentPlayer.inventory.weapons[key] || 0;
        } else {
            return this.currentPlayer.inventory.items[key] || 0;
        }
    }
    
    getPendingQuantity(key, type) {
        return this.pendingPurchases.filter(p => p.key === key && p.type === type).length;
    }
    
    getCurrentPrice(key, basePrice) {
        if (!this.supplyDemandEnabled) {
            return basePrice;
        }
        
        const modifier = this.priceModifiers[key] || 1.0;
        return Math.round(basePrice * modifier);
    }
    
    toggleItem(key, type, price, item) {
        // Check if already in cart
        const pendingIndex = this.pendingPurchases.findIndex(p => p.key === key && p.type === type);
        
        if (pendingIndex >= 0) {
            // Remove from cart
            this.pendingPurchases.splice(pendingIndex, 1);
            if (window.game && window.game.soundSystem) {
                window.game.soundSystem.play('buttonClick');
            }
        } else {
            // Check if player can afford it
            const totalCost = this.calculateTotalCost() + price;
            if (totalCost <= this.currentPlayer.money) {
                this.pendingPurchases.push({
                    key: key,
                    type: type,
                    price: price,
                    item: item
                });
                if (window.game && window.game.soundSystem) {
                    window.game.soundSystem.play('menuSelect');
                }
            } else {
                // Show insufficient funds message
                if (window.game && window.game.soundSystem) {
                    window.game.soundSystem.play('shopDenied');
                }
                alert('Insufficient funds!');
            }
        }
        
        this.updateShopDisplay();
    }
    
    calculateTotalCost() {
        return this.pendingPurchases.reduce((sum, p) => sum + p.price, 0);
    }
    
    completePurchases() {
        // Play purchase sound if any items bought
        if (this.pendingPurchases.length > 0 && window.game && window.game.soundSystem) {
            window.game.soundSystem.play('shopPurchase');
        }
        
        // Process all pending purchases
        for (let purchase of this.pendingPurchases) {
            this.currentPlayer.money -= purchase.price;
            
            if (purchase.type === 'weapon') {
                const quantity = purchase.item.quantity || 1;
                this.currentPlayer.addWeapon(purchase.key, quantity);
            } else {
                this.currentPlayer.addItem(purchase.key, 1);
            }
            
            // Track for supply/demand
            if (!this.purchaseHistory[purchase.key]) {
                this.purchaseHistory[purchase.key] = 0;
            }
            this.purchaseHistory[purchase.key]++;
        }
        
        // Update supply/demand if enabled
        if (this.supplyDemandEnabled) {
            this.updatePrices();
        }
        
        this.pendingPurchases = [];
    }
    
    updatePrices() {
        // Calculate average purchases
        const totalPurchases = Object.values(this.purchaseHistory).reduce((sum, v) => sum + v, 0);
        const averagePurchases = totalPurchases / Object.keys(this.purchaseHistory).length || 1;
        
        // Update price modifiers based on demand
        for (let key in this.priceModifiers) {
            const purchases = this.purchaseHistory[key] || 0;
            const demandFactor = purchases / averagePurchases;
            
            // Adjust price based on demand
            if (demandFactor > 1.5) {
                this.priceModifiers[key] *= 1.1; // Increase price
            } else if (demandFactor < 0.5) {
                this.priceModifiers[key] *= 0.9; // Decrease price
            }
            
            // Clamp modifiers
            this.priceModifiers[key] = Math.max(0.5, Math.min(2.0, this.priceModifiers[key]));
        }
    }
    
    closeShop() {
        this.completePurchases();
        this.currentPlayer = null;
        
        // Hide shop screen
        document.getElementById('shop-screen').classList.add('hidden');
    }
    
    // Handle AI shopping
    processAIPurchases(aiController, tank) {
        const purchases = aiController.handleShopPhase(tank.money);
        
        for (let purchase of purchases) {
            const item = purchase.type === 'weapon' ? 
                CONSTANTS.WEAPONS[purchase.item] : 
                CONSTANTS.ITEMS[purchase.item];
                
            if (!item) continue;
            
            const cost = this.getCurrentPrice(purchase.item, item.cost);
            const totalCost = cost * (purchase.quantity || 1);
            
            if (tank.money >= totalCost) {
                tank.money -= totalCost;
                
                if (purchase.type === 'weapon') {
                    const weaponQty = item.quantity || 1;
                    tank.addWeapon(purchase.item, weaponQty * (purchase.quantity || 1));
                } else {
                    tank.addItem(purchase.item, purchase.quantity || 1);
                }
                
                // Track for supply/demand
                if (!this.purchaseHistory[purchase.item]) {
                    this.purchaseHistory[purchase.item] = 0;
                }
                this.purchaseHistory[purchase.item] += (purchase.quantity || 1);
            }
        }
        
        // Update prices if supply/demand is enabled
        if (this.supplyDemandEnabled) {
            this.updatePrices();
        }
    }
    
    enableSupplyDemand(enabled) {
        this.supplyDemandEnabled = enabled;
        if (!enabled) {
            // Reset all price modifiers
            for (let key in this.priceModifiers) {
                this.priceModifiers[key] = 1.0;
            }
        }
    }
}