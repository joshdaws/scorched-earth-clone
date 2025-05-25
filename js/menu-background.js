// Menu Background Animation
class MenuBackground {
    constructor(canvas) {
        console.log('MenuBackground constructor called', canvas);
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.time = 0;
        this.sunY = this.canvas.height * 0.25;
        
        // Set canvas size
        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        // Start animation
        this.animate();
    }
    
    resize() {
        // Make canvas fill the screen
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    
    drawSun() {
        const centerX = this.canvas.width / 2;
        // Sun position: top edge about 16% from top, so center is at 16% + radius
        const sunDiameter = this.canvas.height * 0.35; // 35% of canvas height
        const radius = sunDiameter / 2;
        const centerY = this.canvas.height * 0.16 + radius;
        
        // Draw dithered sun background with exact colors
        this.ctx.fillStyle = '#FFB942'; // Sun Yellow - center
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Create dithered texture pattern
        const ditherSize = 3;
        this.ctx.fillStyle = '#FF6C27'; // Sun Orange - lower/outer
        
        for (let x = centerX - radius; x < centerX + radius; x += ditherSize * 2) {
            for (let y = centerY - radius; y < centerY + radius; y += ditherSize * 2) {
                const dx = x - centerX;
                const dy = y - centerY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < radius) {
                    // Checkerboard dither pattern
                    const checkX = Math.floor(x / ditherSize);
                    const checkY = Math.floor(y / ditherSize);
                    if ((checkX + checkY) % 2 === 0) {
                        this.ctx.fillRect(x, y, ditherSize, ditherSize);
                    }
                }
            }
        }
        
        // Add sun rays/glow
        this.ctx.shadowBlur = 80;
        this.ctx.shadowColor = '#FF6C27'; // Sun Orange glow
        this.ctx.fillStyle = 'rgba(255, 108, 39, 0.2)';
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius * 1.5, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.shadowBlur = 0;
        
        // Horizontal scanlines through sun - 5 visible bands
        const numLines = 5;
        const lineHeight = Math.max(8, radius * 0.06); // 8-10px thick
        const lineSpacing = radius * 0.3; // Even spacing across sun
        
        for (let i = 0; i < numLines; i++) {
            const lineY = centerY - (numLines * lineSpacing / 2) + (i * lineSpacing);
            
            // Alternating orange and magenta
            this.ctx.fillStyle = (i % 2 === 0) ? '#FF6C27' : '#FF20B8';
            
            // Only draw lines that intersect with the sun circle
            const distFromCenter = Math.abs(lineY - centerY);
            if (distFromCenter < radius) {
                // Calculate line width based on circle intersection
                const lineWidth = Math.sqrt(radius * radius - distFromCenter * distFromCenter) * 2;
                this.ctx.fillRect(centerX - lineWidth/2, lineY, lineWidth, lineHeight);
            }
        }
    }
    
    drawGrid() {
        const horizonY = this.canvas.height * 0.55;
        const vanishingPointX = this.canvas.width / 2;
        // Vanishing point under the sun
        const sunDiameter = this.canvas.height * 0.35;
        const sunCenterY = this.canvas.height * 0.16 + sunDiameter / 2;
        const vanishingPointY = sunCenterY + 20; // Slightly below sun center
        
        // Grid parameters - 16-18 horizontal, 12-15 vertical visible lines
        const horizontalLines = 17;
        const verticalLines = 14;
        
        this.ctx.strokeStyle = '#FF20B8'; // Grid Magenta - exact color
        this.ctx.lineWidth = 2; // 2-3px thick
        this.ctx.shadowBlur = 2;
        this.ctx.shadowColor = '#FF20B8';
        
        // Draw horizontal lines - spaced every 32px equivalent
        const horizontalSpacing = 32;
        const actualHorizontalLines = Math.min(horizontalLines, Math.floor((this.canvas.height - horizonY) / horizontalSpacing));
        
        for (let i = 0; i <= actualHorizontalLines; i++) {
            const y = horizonY + i * horizontalSpacing;
            if (y > this.canvas.height) break;
            
            const factor = i / actualHorizontalLines;
            this.ctx.globalAlpha = 0.3 + factor * 0.6; // Fade with distance
            
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
        
        // Draw vertical lines with proper perspective - spaced every 48px at bottom
        const verticalSpacing = 48;
        const centerX = this.canvas.width / 2;
        
        for (let i = 0; i <= verticalLines; i++) {
            const centerIndex = Math.floor(verticalLines / 2);
            const distFromCenter = i - centerIndex;
            
            // Position at bottom: every 48px from center
            const xBottom = centerX + distFromCenter * verticalSpacing;
            
            // Skip lines that are way off-screen
            if (xBottom < -200 || xBottom > this.canvas.width + 200) continue;
            
            // All lines converge to vanishing point under sun
            this.ctx.globalAlpha = 0.4;
            
            this.ctx.beginPath();
            this.ctx.moveTo(xBottom, this.canvas.height);
            this.ctx.lineTo(vanishingPointX, vanishingPointY);
            this.ctx.stroke();
        }
        
        this.ctx.globalAlpha = 1;
        this.ctx.shadowBlur = 0;
    }
    
    drawMountains() {
        // Mountain silhouettes - peaks range from 20% to 45% of canvas height
        const horizonY = this.canvas.height * 0.55; // Horizon line
        this.ctx.fillStyle = '#221045'; // Mountain Purple - exact color
        
        // Sharp, angular zig-zag mountains - 7 major peaks
        this.ctx.beginPath();
        this.ctx.moveTo(0, horizonY);
        
        // Leftmost peak at ~22% width, rightmost at ~78%
        const startX = this.canvas.width * 0.22;
        const endX = this.canvas.width * 0.78;
        const peakCount = 7;
        
        // Create sharp peaks with heights from 20% to 45% of canvas
        const peakHeights = [
            this.canvas.height * 0.25, // 25% from bottom
            this.canvas.height * 0.35, // 35%
            this.canvas.height * 0.20, // 20% 
            this.canvas.height * 0.45, // 45% (tallest)
            this.canvas.height * 0.30, // 30%
            this.canvas.height * 0.38, // 38%
            this.canvas.height * 0.28  // 28%
        ];
        
        // Start from left edge to first peak
        this.ctx.lineTo(startX, horizonY - peakHeights[0]);
        
        // Draw the 7 major peaks with sharp transitions
        for (let i = 1; i < peakCount; i++) {
            const x = startX + (endX - startX) * (i / (peakCount - 1));
            const peakY = horizonY - peakHeights[i];
            
            // Sharp valley between peaks
            const valleyX = x - (endX - startX) / (peakCount - 1) * 0.3;
            const valleyY = horizonY - Math.min(peakHeights[i-1], peakHeights[i]) * 0.6;
            
            this.ctx.lineTo(valleyX, valleyY);
            this.ctx.lineTo(x, peakY);
        }
        
        // Connect to right edge
        this.ctx.lineTo(this.canvas.width, horizonY);
        this.ctx.lineTo(0, horizonY);
        this.ctx.closePath();
        this.ctx.fill();
    }
    
    drawStars() {
        // Random stars in the sky
        this.ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 50; i++) {
            const x = Math.random() * this.canvas.width;
            const y = Math.random() * this.canvas.height * 0.3;
            const size = Math.random() * 2;
            const opacity = Math.random() * 0.8 + 0.2;
            
            this.ctx.globalAlpha = opacity;
            this.ctx.fillRect(x, y, size, size);
        }
        this.ctx.globalAlpha = 1;
        
        // Shooting star occasionally
        if (Math.random() < 0.01) {
            const x = Math.random() * this.canvas.width;
            const y = Math.random() * this.canvas.height * 0.3;
            
            this.ctx.strokeStyle = '#00ffff';
            this.ctx.lineWidth = 2;
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = '#00ffff';
            
            this.ctx.beginPath();
            this.ctx.moveTo(x, y);
            this.ctx.lineTo(x + 50, y + 20);
            this.ctx.stroke();
            
            this.ctx.shadowBlur = 0;
        }
    }
    
    drawBackground() {
        // Draw gradient background with exact colors from mockup
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#1A0033');    // Background - Deep night sky
        gradient.addColorStop(0.3, '#380067');  // Far Sky Purple - Upper mid sky
        gradient.addColorStop(0.6, '#FA30B9');  // Horizon Pink - Near grid/floor
        gradient.addColorStop(0.8, '#FF6C27');  // Sun Orange
        gradient.addColorStop(1, '#FFB942');    // Sun Yellow
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    animate() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Update time
        this.time += 0.01;
        
        // Animate sun position slightly
        this.sunY = this.canvas.height * 0.25 + Math.sin(this.time) * 5;
        
        // Draw elements in order
        this.drawBackground();
        this.drawStars();
        this.drawSun();
        this.drawMountains();
        this.drawGrid();
        
        // Continue animation
        requestAnimationFrame(() => this.animate());
    }
}

// Draw pixel art tanks on the menu
class MenuTanks {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.tankWidth = 70; // Exact dimensions from mockup
        this.tankHeight = 40;
        this.pixelSize = 5; // Larger pixels for visibility
        
        // Set canvas size
        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        // Draw tanks
        this.draw();
    }
    
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = 200;
    }
    
    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw left tank (blue) - exact color
        this.drawPixelTank(this.canvas.width * 0.1, 120, '#00CFFF', false); // Tank Blue
        
        // Draw right tank (red) - exact color  
        this.drawPixelTank(this.canvas.width * 0.9, 120, '#FF5523', true); // Tank Red
    }
    
    drawPixelTank(x, y, color, facingLeft) {
        const p = this.pixelSize;
        
        // Add glow effect - outer ring
        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = color;
        this.ctx.fillStyle = color;
        
        // Tank pixel art design (16x12 pixels)
        const tankDesign = [
            '      ####      ',
            '     ######     ',
            '     ######     ',
            '    ########    ',
            '  ############  ',
            ' ############## ',
            '################',
            '################',
            ' ############## ',
            '  ####    ####  ',
            '  ####    ####  ',
            '                '
        ];
        
        // Turret design
        const turretLength = 8;
        const turretAngle = facingLeft ? 135 : 45;
        
        // Draw tank body
        this.ctx.fillStyle = color;
        this.ctx.shadowBlur = 20;
        this.ctx.shadowColor = color;
        
        for (let row = 0; row < tankDesign.length; row++) {
            for (let col = 0; col < tankDesign[row].length; col++) {
                if (tankDesign[row][col] === '#') {
                    const pixelX = x - (tankDesign[row].length * p / 2) + col * p;
                    const pixelY = y - (tankDesign.length * p / 2) + row * p;
                    this.ctx.fillRect(pixelX, pixelY, p, p);
                }
            }
        }
        
        // Draw turret
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = p;
        this.ctx.lineCap = 'square';
        
        const turretStartX = x;
        const turretStartY = y - 6 * p;
        const angleRad = turretAngle * Math.PI / 180;
        const turretEndX = turretStartX + Math.cos(angleRad) * turretLength * p;
        const turretEndY = turretStartY - Math.sin(angleRad) * turretLength * p;
        
        this.ctx.beginPath();
        this.ctx.moveTo(turretStartX, turretStartY);
        this.ctx.lineTo(turretEndX, turretEndY);
        this.ctx.stroke();
        
        // Add highlight pixels
        this.ctx.fillStyle = '#ffffff';
        this.ctx.shadowBlur = 0;
        this.ctx.globalAlpha = 0.5;
        
        // Add some highlight pixels for depth
        for (let row = 0; row < 3; row++) {
            for (let col = 6; col < 10; col++) {
                if (tankDesign[row][col] === '#') {
                    const pixelX = x - (tankDesign[row].length * p / 2) + col * p;
                    const pixelY = y - (tankDesign.length * p / 2) + row * p;
                    this.ctx.fillRect(pixelX, pixelY, p/2, p/2);
                }
            }
        }
        
        this.ctx.globalAlpha = 1;
    }
}

// Initialize menu background - wait for window load to ensure everything is ready
window.addEventListener('load', () => {
    const canvas = document.getElementById('menu-background');
    if (canvas) {
        console.log('Initializing menu background', canvas.width, canvas.height);
        window.menuBackground = new MenuBackground(canvas);
    } else {
        console.error('Menu background canvas not found');
    }
    
    const tankCanvas = document.getElementById('tank-sprites');
    if (tankCanvas) {
        console.log('Initializing menu tanks');
        window.menuTanks = new MenuTanks(tankCanvas);
    } else {
        console.error('Tank sprites canvas not found');
    }
});