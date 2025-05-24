// Menu Background Animation
class MenuBackground {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.time = 0;
        this.sunY = 200;
        
        // Set canvas size
        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        // Start animation
        this.animate();
    }
    
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    
    drawSun() {
        const centerX = this.canvas.width / 2;
        const centerY = this.sunY;
        const radius = 150;
        
        // Sun gradient
        const gradient = this.ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
        gradient.addColorStop(0, '#ffff00');
        gradient.addColorStop(0.5, '#ff6600');
        gradient.addColorStop(1, '#ff0066');
        
        // Draw sun
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Add sun rays/glow
        this.ctx.shadowBlur = 80;
        this.ctx.shadowColor = '#ff6600';
        this.ctx.fillStyle = 'rgba(255, 102, 0, 0.3)';
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius * 1.5, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.shadowBlur = 0;
        
        // Horizontal stripes through sun
        this.ctx.fillStyle = 'rgba(255, 0, 102, 0.5)';
        for (let i = 0; i < 5; i++) {
            const y = centerY - radius + (radius * 2 / 5) * i + 20;
            this.ctx.fillRect(centerX - radius, y, radius * 2, 8);
        }
    }
    
    drawGrid() {
        const horizonY = this.canvas.height * 0.5;
        const vanishingPointX = this.canvas.width / 2;
        const vanishingPointY = horizonY;
        
        // Grid parameters
        const verticalLines = 41; // Odd number to have center line
        const horizontalLines = 20;
        
        this.ctx.strokeStyle = '#ff00ff';
        this.ctx.lineWidth = 2;
        this.ctx.shadowBlur = 5;
        this.ctx.shadowColor = '#ff00ff';
        
        // Draw horizontal lines with perspective
        for (let i = 0; i <= horizontalLines; i++) {
            const factor = i / horizontalLines;
            const y = horizonY + (this.canvas.height - horizonY) * Math.pow(factor, 0.7);
            
            // Make lines fade out towards horizon
            this.ctx.globalAlpha = 0.3 + factor * 0.7;
            
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
        
        // Draw vertical lines with perspective
        for (let i = 0; i <= verticalLines; i++) {
            const centerIndex = Math.floor(verticalLines / 2);
            const distFromCenter = i - centerIndex;
            const maxDist = centerIndex;
            
            // Calculate x position at bottom of screen
            const xBottom = this.canvas.width / 2 + (distFromCenter / maxDist) * this.canvas.width * 2;
            
            // Lines should converge to vanishing point
            const convergeFactor = 0.8;
            const xTop = vanishingPointX + (xBottom - vanishingPointX) * (1 - convergeFactor);
            
            this.ctx.globalAlpha = 0.5;
            
            this.ctx.beginPath();
            this.ctx.moveTo(xBottom, this.canvas.height);
            this.ctx.lineTo(xTop, vanishingPointY);
            this.ctx.stroke();
        }
        
        this.ctx.globalAlpha = 1;
        this.ctx.shadowBlur = 0;
    }
    
    drawMountains() {
        // Mountain silhouettes
        this.ctx.fillStyle = '#000';
        
        // Left mountain range
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.canvas.height * 0.6);
        this.ctx.lineTo(0, this.canvas.height * 0.4);
        this.ctx.lineTo(this.canvas.width * 0.15, this.canvas.height * 0.35);
        this.ctx.lineTo(this.canvas.width * 0.25, this.canvas.height * 0.45);
        this.ctx.lineTo(this.canvas.width * 0.35, this.canvas.height * 0.38);
        this.ctx.lineTo(this.canvas.width * 0.45, this.canvas.height * 0.5);
        this.ctx.lineTo(this.canvas.width * 0.5, this.canvas.height * 0.6);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Right mountain range
        this.ctx.beginPath();
        this.ctx.moveTo(this.canvas.width * 0.5, this.canvas.height * 0.6);
        this.ctx.lineTo(this.canvas.width * 0.55, this.canvas.height * 0.5);
        this.ctx.lineTo(this.canvas.width * 0.65, this.canvas.height * 0.38);
        this.ctx.lineTo(this.canvas.width * 0.75, this.canvas.height * 0.45);
        this.ctx.lineTo(this.canvas.width * 0.85, this.canvas.height * 0.35);
        this.ctx.lineTo(this.canvas.width, this.canvas.height * 0.4);
        this.ctx.lineTo(this.canvas.width, this.canvas.height * 0.6);
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
        // Draw gradient background
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#0a0015');
        gradient.addColorStop(0.3, '#1a0033');
        gradient.addColorStop(0.5, '#4a1a66');
        gradient.addColorStop(0.7, '#ff0066');
        gradient.addColorStop(0.85, '#ff6600');
        gradient.addColorStop(1, '#ffcc00');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    animate() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Update time
        this.time += 0.01;
        
        // Animate sun position slightly
        this.sunY = 200 + Math.sin(this.time) * 10;
        
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

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('menu-background');
    if (canvas) {
        new MenuBackground(canvas);
    }
});