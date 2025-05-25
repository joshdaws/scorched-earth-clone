// Main entry point
document.addEventListener('DOMContentLoaded', () => {
    // Get canvas
    const canvas = document.getElementById('game-canvas');
    
    // Create UI manager
    const ui = new UIManager();
    
    // Create game instance
    const game = new Game(canvas, ui);
    
    // Make game accessible globally for UI
    window.game = game;
    
    // Sound system initializes automatically with Howler.js
    // No need for user interaction with the new implementation
    
    // Show main menu
    ui.showMainMenu();
    
    // Canvas sizing is now handled in Game class
    
    // Debug - quick start game for testing
    if (window.location.hash === '#debug') {
        setTimeout(() => {
            ui.gameSettings = {
                numPlayers: 4,
                players: [
                    { name: 'Player 1', type: 'human', aiType: null },
                    { name: 'Shooter Bot', type: 'ai', aiType: 'SHOOTER' },
                    { name: 'Cyborg', type: 'ai', aiType: 'CYBORG' },
                    { name: 'Killer', type: 'ai', aiType: 'KILLER' }
                ],
                rounds: 3,
                startingCash: 15000,
                gravity: 10,
                windType: 'changing',
                computersBuy: true,
                supplyDemand: false,
                interest: false,
                meteors: false,
                lightning: false,
                talkingTanks: true,
                wallBehavior: 'wrap',
                ceilingBehavior: 'wrap'
            };
            
            game.startNewGame(ui.gameSettings);
        }, 100);
    }
});