// Terrain Generation and Management
class Terrain {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.heightMap = new Array(Math.floor(width / CONSTANTS.TERRAIN_RESOLUTION));
        this.canvas = document.createElement('canvas');
        this.canvas.width = width;
        this.canvas.height = height;
        this.ctx = this.canvas.getContext('2d');
        this.generateTerrain();
    }
    
    generateTerrain(type = 'random') {
        switch(type) {
            case 'mountains':
                this.generateMountains();
                break;
            case 'valleys':
                this.generateValleys();
                break;
            case 'random':
            default:
                this.generateRandom();
        }
        this.renderTerrain();
    }
    
    clampTerrainAboveButton() {
        // Ensure terrain stays above fire button
        const fireButtonHeight = 120;
        const minHeight = this.height - fireButtonHeight;
        for (let i = 0; i < this.heightMap.length; i++) {
            this.heightMap[i] = Math.max(minHeight, this.heightMap[i]);
        }
    }
    
    generateRandom() {
        // Use midpoint displacement algorithm
        const points = this.heightMap.length;
        const fireButtonHeight = 120; // Reserve space for fire button (60px + padding)
        const minHeight = Math.max(this.height * 0.15, this.height - fireButtonHeight);  // Ensure terrain stays above fire button
        const maxHeight = this.height * 0.9;   // Higher maximum for taller peaks
        
        // Set initial endpoints with more variation
        this.heightMap[0] = Math.random() * (maxHeight - minHeight) + minHeight;
        this.heightMap[points - 1] = Math.random() * (maxHeight - minHeight) + minHeight;
        
        // Recursive midpoint displacement with more displacement for rougher terrain
        this.midpointDisplacement(0, points - 1, (maxHeight - minHeight) * 0.7);
        
        // Add some random peaks and valleys
        const numFeatures = 3 + Math.floor(Math.random() * 3);
        for (let f = 0; f < numFeatures; f++) {
            const featureX = Math.floor(Math.random() * points);
            const featureSize = 20 + Math.floor(Math.random() * 40);
            const featureHeight = (Math.random() - 0.5) * this.height * 0.3;
            
            for (let i = Math.max(0, featureX - featureSize); 
                 i < Math.min(points, featureX + featureSize); i++) {
                const dist = Math.abs(i - featureX);
                const factor = Math.cos((dist / featureSize) * Math.PI / 2);
                this.heightMap[i] += featureHeight * factor * factor;
                // Clamp
                this.heightMap[i] = Math.max(this.height * 0.1, 
                    Math.min(this.height * 0.95, this.heightMap[i]));
            }
        }
        
        // Less smoothing for more dramatic terrain
        this.smoothTerrain(1);
        
        // Final clamp to ensure terrain stays above fire button
        this.clampTerrainAboveButton();
    }
    
    generateMountains() {
        const points = this.heightMap.length;
        const baseHeight = this.height * 0.7;  // Higher base for more dramatic mountains
        
        // Create multiple mountain peaks
        const numPeaks = 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < points; i++) {
            let height = baseHeight;
            
            for (let p = 0; p < numPeaks; p++) {
                const peakX = (p + 0.5) * points / numPeaks;
                const peakHeight = this.height * (0.4 + Math.random() * 0.4);  // Taller peaks
                const peakWidth = points / (numPeaks * 1.5);  // Wider peaks
                
                const dist = Math.abs(i - peakX);
                if (dist < peakWidth) {
                    const factor = Math.cos((dist / peakWidth) * Math.PI / 2);
                    height -= peakHeight * factor * factor;
                }
            }
            
            this.heightMap[i] = height + (Math.random() - 0.5) * 30;  // More noise
        }
        
        this.smoothTerrain(1);  // Less smoothing for sharper peaks
        
        // Final clamp to ensure terrain stays above fire button
        this.clampTerrainAboveButton();
    }
    
    generateValleys() {
        const points = this.heightMap.length;
        const baseHeight = this.height * 0.5;
        
        // Create dramatic valleys with high walls
        for (let i = 0; i < points; i++) {
            const x = i / points;
            // Multiple sine waves for complex terrain
            const height = baseHeight + 
                Math.sin(x * Math.PI * 3) * this.height * 0.3 +    // Big valleys
                Math.sin(x * Math.PI * 8) * this.height * 0.1 +    // Smaller variations
                Math.cos(x * Math.PI * 5) * this.height * 0.15 +   // More complexity
                (Math.random() - 0.5) * 40;                        // More noise
            this.heightMap[i] = height;
        }
        
        // Add some steep cliffs
        const numCliffs = 1 + Math.floor(Math.random() * 2);
        for (let c = 0; c < numCliffs; c++) {
            const cliffX = Math.floor(Math.random() * (points - 40)) + 20;
            const cliffHeight = this.height * (0.2 + Math.random() * 0.2);
            
            for (let i = cliffX; i < Math.min(cliffX + 20, points); i++) {
                const t = (i - cliffX) / 20;
                this.heightMap[i] -= cliffHeight * (1 - t);
            }
        }
        
        this.smoothTerrain(1);  // Less smoothing for sharper features
        
        // Final clamp to ensure terrain stays above fire button
        this.clampTerrainAboveButton();
    }
    
    midpointDisplacement(left, right, displacement) {
        if (right - left <= 1) return;
        
        const mid = Math.floor((left + right) / 2);
        this.heightMap[mid] = (this.heightMap[left] + this.heightMap[right]) / 2 + 
            (Math.random() - 0.5) * displacement;
        
        // Clamp to valid range with wider range for more variation
        this.heightMap[mid] = Math.max(this.height * 0.1, 
            Math.min(this.height * 0.95, this.heightMap[mid]));
        
        // Recurse with slower displacement reduction for rougher terrain
        this.midpointDisplacement(left, mid, displacement * 0.65);
        this.midpointDisplacement(mid, right, displacement * 0.65);
    }
    
    smoothTerrain(passes) {
        for (let pass = 0; pass < passes; pass++) {
            const newHeightMap = [...this.heightMap];
            for (let i = 1; i < this.heightMap.length - 1; i++) {
                newHeightMap[i] = (this.heightMap[i - 1] + 
                    this.heightMap[i] * 2 + 
                    this.heightMap[i + 1]) / 4;
            }
            this.heightMap = newHeightMap;
        }
    }
    
    renderTerrain() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // Create gradient for terrain - matching the mockup's purple/blue theme
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
        gradient.addColorStop(0, '#1a0033');    // Dark purple at top
        gradient.addColorStop(0.3, '#2d1b4e');  // Medium purple
        gradient.addColorStop(0.6, '#0f0620');  // Dark blue-purple
        gradient.addColorStop(1, '#000000');    // Black at bottom
        
        // Draw terrain
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.height);
        
        for (let i = 0; i < this.heightMap.length; i++) {
            const x = i * CONSTANTS.TERRAIN_RESOLUTION;
            const y = this.heightMap[i];
            this.ctx.lineTo(x, y);
        }
        
        this.ctx.lineTo(this.width, this.height);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Add texture
        this.addTerrainTexture();
        
        // Add surface highlights with neon glow
        this.ctx.shadowBlur = 3;
        this.ctx.shadowColor = '#ff00ff';
        this.ctx.strokeStyle = '#ff00ff';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        for (let i = 0; i < this.heightMap.length; i++) {
            const x = i * CONSTANTS.TERRAIN_RESOLUTION;
            const y = this.heightMap[i];
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }
        this.ctx.stroke();
        this.ctx.shadowBlur = 0;
    }
    
    addTerrainTexture() {
        const imageData = this.ctx.getImageData(0, 0, this.width, this.height);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            if (data[i] > 0) { // If pixel is part of terrain
                // Add some noise for texture
                const noise = Math.random() * 20 - 10;
                data[i] = Math.max(0, Math.min(255, data[i] + noise));
                data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
                data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
            }
        }
        
        this.ctx.putImageData(imageData, 0, 0);
    }
    
    getHeightAt(x) {
        const index = Math.floor(x / CONSTANTS.TERRAIN_RESOLUTION);
        if (index < 0 || index >= this.heightMap.length) {
            return this.height;
        }
        return this.heightMap[index];
    }
    
    deformTerrain(x, y, radius, type = 'explosion') {
        const startIndex = Math.max(0, Math.floor((x - radius * 1.5) / CONSTANTS.TERRAIN_RESOLUTION));
        const endIndex = Math.min(this.heightMap.length - 1, 
            Math.ceil((x + radius * 1.5) / CONSTANTS.TERRAIN_RESOLUTION));
        
        for (let i = startIndex; i <= endIndex; i++) {
            const terrainX = i * CONSTANTS.TERRAIN_RESOLUTION;
            const dist = Math.abs(terrainX - x);
            
            if (type === 'explosion') {
                if (dist <= radius) {
                    // Create deeper crater with more dramatic shape
                    const normalizedDist = dist / radius;
                    // Use power curve for more dramatic crater shape
                    const depth = Math.pow(1 - normalizedDist, 2) * radius * 1.2;
                    this.heightMap[i] = Math.max(this.heightMap[i], y + depth);
                } else if (dist <= radius * 1.5) {
                    // Create raised rim around crater
                    const rimDist = (dist - radius) / (radius * 0.5);
                    const rimHeight = (1 - rimDist) * radius * 0.1;
                    this.heightMap[i] = Math.max(this.height * 0.1, this.heightMap[i] - rimHeight);
                }
            } else if (type === 'dirt') {
                if (dist <= radius) {
                    // Add more dramatic dirt pile
                    const normalizedDist = dist / radius;
                    const height = Math.pow(1 - normalizedDist, 1.5) * radius * 0.8;
                    this.heightMap[i] = Math.max(this.height * 0.1, this.heightMap[i] - height);
                }
            }
        }
        
        // Less smoothing for more dramatic effect
        this.smoothArea(startIndex, endIndex, 1);
        this.renderTerrain();
    }
    
    smoothArea(start, end, passes) {
        for (let pass = 0; pass < passes; pass++) {
            const newValues = [];
            for (let i = start; i <= end; i++) {
                if (i === 0 || i === this.heightMap.length - 1) {
                    newValues.push(this.heightMap[i]);
                } else {
                    newValues.push((this.heightMap[i - 1] + 
                        this.heightMap[i] * 2 + 
                        this.heightMap[i + 1]) / 4);
                }
            }
            
            for (let i = 0; i < newValues.length; i++) {
                this.heightMap[start + i] = newValues[i];
            }
        }
    }
    
    checkCollision(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return false;
        }
        
        const terrainHeight = this.getHeightAt(x);
        return y >= terrainHeight;
    }
    
    // Create a flat spot for tank placement
    createFlatSpot(x, width) {
        const halfWidth = Math.floor(width / 2 / CONSTANTS.TERRAIN_RESOLUTION);
        const centerIndex = Math.floor(x / CONSTANTS.TERRAIN_RESOLUTION);
        const startIndex = Math.max(0, centerIndex - halfWidth);
        const endIndex = Math.min(this.heightMap.length - 1, centerIndex + halfWidth);
        
        // Find the average height in this area
        let totalHeight = 0;
        let count = 0;
        for (let i = startIndex; i <= endIndex; i++) {
            totalHeight += this.heightMap[i];
            count++;
        }
        const avgHeight = totalHeight / count;
        
        // Flatten the area
        for (let i = startIndex; i <= endIndex; i++) {
            this.heightMap[i] = avgHeight;
        }
        
        // Smooth the edges to blend with surrounding terrain
        if (startIndex > 0) {
            for (let i = 0; i < 3; i++) {
                const blendIndex = startIndex - i - 1;
                if (blendIndex >= 0) {
                    const t = (3 - i) / 3;
                    this.heightMap[blendIndex] = this.heightMap[blendIndex] * (1 - t) + avgHeight * t;
                }
            }
        }
        
        if (endIndex < this.heightMap.length - 1) {
            for (let i = 0; i < 3; i++) {
                const blendIndex = endIndex + i + 1;
                if (blendIndex < this.heightMap.length) {
                    const t = (3 - i) / 3;
                    this.heightMap[blendIndex] = this.heightMap[blendIndex] * (1 - t) + avgHeight * t;
                }
            }
        }
        
        return avgHeight;
    }
    
    // Check if terrain has support (for collapse detection)
    checkTerrainSupport(index) {
        // Check if this terrain point has support from neighbors
        const currentHeight = this.heightMap[index];
        const threshold = 40; // Maximum height difference before terrain collapses
        
        let leftSupport = false;
        let rightSupport = false;
        let leftHeight = currentHeight;
        let rightHeight = currentHeight;
        
        // Check left side for support
        if (index > 0) {
            leftHeight = this.heightMap[index - 1];
            // Terrain is supported if neighbor is at similar height or below
            if (currentHeight - leftHeight < threshold) {
                leftSupport = true;
            }
        } else {
            leftSupport = true; // Edge always has support
        }
        
        // Check right side for support
        if (index < this.heightMap.length - 1) {
            rightHeight = this.heightMap[index + 1];
            // Terrain is supported if neighbor is at similar height or below
            if (currentHeight - rightHeight < threshold) {
                rightSupport = true;
            }
        } else {
            rightSupport = true; // Edge always has support
        }
        
        // Need support from at least one side
        return leftSupport || rightSupport;
    }
    
    // Apply terrain collapse physics
    applyTerrainCollapse(effectsSystem = null, soundSystem = null) {
        let changed = false;
        const collapseLocations = [];
        
        // First pass: detect unsupported terrain segments
        const unsupportedSegments = [];
        for (let i = 1; i < this.heightMap.length - 1; i++) {
            if (!this.checkTerrainSupport(i)) {
                unsupportedSegments.push(i);
            }
        }
        
        // Second pass: make unsupported terrain fall
        for (let i of unsupportedSegments) {
            const oldHeight = this.heightMap[i];
            const leftHeight = this.heightMap[i - 1];
            const rightHeight = this.heightMap[i + 1];
            
            // Find the target height (where the dirt should settle)
            const targetHeight = Math.max(leftHeight, rightHeight);
            
            // Make terrain fall with gravity-like acceleration
            const fallDistance = targetHeight - oldHeight;
            if (fallDistance > 2) {
                // Fall faster for larger gaps
                const fallSpeed = Math.min(fallDistance * 0.3, 10);
                this.heightMap[i] = oldHeight + fallSpeed;
                
                // Create falling dirt particles
                if (effectsSystem) {
                    // Multiple particles for more realistic effect
                    for (let j = 0; j < 3; j++) {
                        const particleX = i * CONSTANTS.TERRAIN_RESOLUTION + (Math.random() - 0.5) * 5;
                        const particleY = oldHeight + Math.random() * 10;
                        effectsSystem.createFallingDirt(particleX, particleY, fallSpeed);
                    }
                }
                
                changed = true;
                collapseLocations.push({ x: i * CONSTANTS.TERRAIN_RESOLUTION, y: oldHeight });
            }
        }
        
        // Third pass: smooth the terrain to simulate dirt settling
        if (changed) {
            this.smoothCollapsedTerrain(unsupportedSegments);
        }
        
        // Play collapse sound if terrain changed
        if (changed && soundSystem && collapseLocations.length > 0) {
            soundSystem.play('terrainCollapse');
        }
        
        if (changed) {
            this.renderTerrain();
        }
        
        return changed;
    }
    
    // Smooth collapsed terrain sections
    smoothCollapsedTerrain(segments) {
        for (let i of segments) {
            if (i > 0 && i < this.heightMap.length - 1) {
                // Average with neighbors to create natural settling
                const prev = this.heightMap[i - 1];
                const curr = this.heightMap[i];
                const next = this.heightMap[i + 1];
                this.heightMap[i] = (prev * 0.25 + curr * 0.5 + next * 0.25);
            }
        }
    }
    
    draw(ctx) {
        ctx.drawImage(this.canvas, 0, 0);
    }
}