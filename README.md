# Scorched Earth - Browser Clone

A faithful browser-based recreation of the classic 1991 MS-DOS turn-based artillery game Scorched Earth, enhanced with modern retro synthwave aesthetics.

## Features

- **Classic Gameplay**: Turn-based artillery combat with destructible terrain
- **Retro Synthwave Visuals**: Neon colors, glowing effects, and 80s-inspired aesthetics
- **Multiple Weapons**: Missiles, lasers, nukes, and more exotic weapons
- **AI Opponents**: Various AI personalities with different strategies
- **Shop System**: Buy weapons and utilities between rounds
- **Sound Effects**: Procedurally generated retro sounds with volume control
- **Responsive Controls**: Keyboard and mouse support

## Quick Start

### Option 1: Using npm (recommended)
```bash
# Install dependencies
npm install

# Start the development server
npm start

# Open http://localhost:8080 in your browser
```

### Option 2: Direct file access
Simply open `index.html` in a modern web browser

## Development Scripts

- `npm start` - Start the HTTP server on port 8080
- `npm run dev` - Start server with file watching
- `npm run screenshot` - Take a screenshot of the main menu
- `npm run screenshot:menu` - Screenshot the main menu
- `npm run screenshot:game` - Screenshot the gameplay

## How to Play

1. Click "New Game" from the main menu
2. Configure players (human or AI) and game settings
3. Take turns aiming and firing at enemy tanks
4. Buy weapons and items between rounds
5. Last tank standing wins!

## Controls

- **Arrow Keys**: Adjust angle (left/right) and power (up/down)
- **Ctrl + Arrow**: Make larger adjustments
- **Space/Enter**: Fire weapon
- **I or W**: Open inventory
- **Mouse**: Click UI buttons and shop items
- **Volume Slider**: Adjust game sound volume

## Technologies Used

- Vanilla JavaScript (ES6+)
- HTML5 Canvas for rendering
- Web Audio API for sound generation
- CSS3 with custom animations
- Puppeteer for visual testing

## Project Structure

```
scorched-earth/
├── index.html          # Main HTML file
├── style.css           # All styling
├── package.json        # Project configuration
├── js/                 # Game logic
│   ├── constants.js    # Game configuration
│   ├── game.js         # Main game class
│   ├── tank.js         # Tank logic
│   ├── terrain.js      # Terrain generation
│   ├── weapons.js      # Weapon system
│   ├── physics.js      # Physics engine
│   ├── effects.js      # Visual effects
│   ├── sound.js        # Sound system
│   ├── ai.js           # AI controllers
│   ├── shop.js         # Shop system
│   ├── ui.js           # UI controller
│   └── menu-background.js  # Animated menu
├── scripts/            # Development scripts
│   └── screenshot.js   # Puppeteer screenshot tool
└── screenshots/        # Generated screenshots
```

## Debug Mode

Add `#debug` to the URL to quickly start a test game with preset players.

## Browser Requirements

- Modern browser with HTML5 Canvas support
- JavaScript enabled
- Web Audio API support
- Recommended: Chrome, Firefox, Safari, or Edge

## License

MIT License - Feel free to use this code for your own projects!

## Credits

- Original Scorched Earth created by Wendell Hicken (1991)
- This clone created with ❤️ and lots of neon glow effects