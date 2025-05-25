const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// Get the screenshot type from command line arguments
const screenshotType = process.argv[2] || 'menu';

async function takeScreenshot() {
    console.log('Starting Puppeteer...');
    
    // Launch browser
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        
        // Set viewport to a nice resolution
        await page.setViewport({
            width: 1920,
            height: 1080,
            deviceScaleFactor: 2
        });
        
        // Navigate to the game
        console.log('Navigating to game...');
        await page.goto('http://localhost:8080', {
            waitUntil: 'networkidle2'
        });
        
        // Wait for the game to load
        await page.waitForSelector('#main-menu', { timeout: 5000 });
        
        // Handle different screenshot types
        switch(screenshotType) {
            case 'menu':
                console.log('Taking screenshot of main menu...');
                // Wait a bit for animations to start
                await new Promise(resolve => setTimeout(resolve, 2000));
                break;
                
            case 'game':
                console.log('Starting new game...');
                // Click New Game button
                await page.click('#new-game-btn');
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Click Start Game button (skip setup)
                await page.click('#start-game-btn');
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Click Start Next Round button to skip shop
                try {
                    await page.waitForSelector('button', { timeout: 1000 });
                    const buttons = await page.$$('button');
                    for (const button of buttons) {
                        const text = await page.evaluate(el => el.textContent, button);
                        if (text.includes('Start Next Round')) {
                            await button.click();
                            break;
                        }
                    }
                } catch (e) {
                    // Shop might not appear
                }
                
                await new Promise(resolve => setTimeout(resolve, 2000));
                console.log('Taking screenshot of gameplay...');
                break;
                
            case 'both':
                // Take menu screenshot first
                console.log('Taking screenshot of main menu...');
                await new Promise(resolve => setTimeout(resolve, 2000));
                await page.screenshot({
                    path: path.join(__dirname, '../screenshots/menu.png'),
                    fullPage: true
                });
                
                // Then take game screenshot
                console.log('Starting new game...');
                await page.click('#new-game-btn');
                await new Promise(resolve => setTimeout(resolve, 500));
                await page.click('#start-game-btn');
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                console.log('Taking screenshot of gameplay...');
                break;
        }
        
        // Create screenshots directory if it doesn't exist
        const screenshotsDir = path.join(__dirname, '../screenshots');
        if (!fs.existsSync(screenshotsDir)) {
            fs.mkdirSync(screenshotsDir);
        }
        
        // Take screenshot
        const filename = screenshotType === 'both' ? 'game.png' : `${screenshotType}.png`;
        await page.screenshot({
            path: path.join(screenshotsDir, filename),
            fullPage: true
        });
        
        console.log(`Screenshot saved to screenshots/${filename}`);
        
        // Also take a cropped version focusing on the main content
        if (screenshotType === 'menu') {
            const menuElement = await page.$('#main-menu');
            if (menuElement) {
                await menuElement.screenshot({
                    path: path.join(screenshotsDir, 'menu-cropped.png')
                });
                console.log('Cropped menu screenshot saved to screenshots/menu-cropped.png');
            }
        }
        
    } catch (error) {
        console.error('Error taking screenshot:', error);
    } finally {
        await browser.close();
    }
}

// Make sure the server is running
console.log('Make sure the game server is running on http://localhost:8080');
console.log('You can start it with: npm start\n');

takeScreenshot();