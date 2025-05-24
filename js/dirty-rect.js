// Dirty Rectangle System for optimized rendering
class DirtyRectManager {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.dirtyRects = [];
        this.previousFrame = null;
        this.currentFrame = null;
        this.fullRedraw = true;
        
        // Create off-screen canvases for frame comparison
        this.previousCanvas = document.createElement('canvas');
        this.previousCanvas.width = width;
        this.previousCanvas.height = height;
        this.previousCtx = this.previousCanvas.getContext('2d');
        
        this.currentCanvas = document.createElement('canvas');
        this.currentCanvas.width = width;
        this.currentCanvas.height = height;
        this.currentCtx = this.currentCanvas.getContext('2d');
    }
    
    // Mark a rectangle as dirty
    markDirty(x, y, width, height) {
        // Clamp to canvas bounds
        x = Math.max(0, Math.floor(x));
        y = Math.max(0, Math.floor(y));
        width = Math.min(this.width - x, Math.ceil(width));
        height = Math.min(this.height - y, Math.ceil(height));
        
        if (width > 0 && height > 0) {
            this.dirtyRects.push({ x, y, width, height });
        }
    }
    
    // Mark entire screen as dirty
    markFullDirty() {
        this.fullRedraw = true;
        this.dirtyRects = [];
    }
    
    // Get optimized dirty rectangles (merge overlapping)
    getOptimizedRects() {
        if (this.fullRedraw) {
            return [{ x: 0, y: 0, width: this.width, height: this.height }];
        }
        
        if (this.dirtyRects.length === 0) {
            return [];
        }
        
        // Sort rects by position for better merging
        const rects = [...this.dirtyRects];
        rects.sort((a, b) => a.y - b.y || a.x - b.x);
        
        // Merge overlapping rectangles
        const merged = [];
        let current = rects[0];
        
        for (let i = 1; i < rects.length; i++) {
            const rect = rects[i];
            
            // Check if rectangles overlap or are close enough to merge
            if (this.shouldMerge(current, rect)) {
                current = this.mergeRects(current, rect);
            } else {
                merged.push(current);
                current = rect;
            }
        }
        
        merged.push(current);
        
        // If too many rects, just do full redraw
        if (merged.length > 10 || this.getTotalArea(merged) > this.width * this.height * 0.6) {
            return [{ x: 0, y: 0, width: this.width, height: this.height }];
        }
        
        return merged;
    }
    
    // Check if two rectangles should be merged
    shouldMerge(rect1, rect2, threshold = 50) {
        // Check if they overlap
        if (!(rect1.x + rect1.width < rect2.x ||
              rect2.x + rect2.width < rect1.x ||
              rect1.y + rect1.height < rect2.y ||
              rect2.y + rect2.height < rect1.y)) {
            return true;
        }
        
        // Check if they're close enough
        const distance = Math.min(
            Math.abs(rect1.x + rect1.width - rect2.x),
            Math.abs(rect2.x + rect2.width - rect1.x),
            Math.abs(rect1.y + rect1.height - rect2.y),
            Math.abs(rect2.y + rect2.height - rect1.y)
        );
        
        return distance < threshold;
    }
    
    // Merge two rectangles
    mergeRects(rect1, rect2) {
        const x = Math.min(rect1.x, rect2.x);
        const y = Math.min(rect1.y, rect2.y);
        const x2 = Math.max(rect1.x + rect1.width, rect2.x + rect2.width);
        const y2 = Math.max(rect1.y + rect1.height, rect2.y + rect2.height);
        
        return {
            x: x,
            y: y,
            width: x2 - x,
            height: y2 - y
        };
    }
    
    // Get total area of rectangles
    getTotalArea(rects) {
        return rects.reduce((sum, rect) => sum + rect.width * rect.height, 0);
    }
    
    // Clear dirty rectangles
    clear() {
        this.dirtyRects = [];
        this.fullRedraw = false;
    }
    
    // Begin frame - save current state
    beginFrame(ctx) {
        // Copy current to previous
        this.previousCtx.drawImage(this.currentCanvas, 0, 0);
        
        // Clear current
        this.currentCtx.clearRect(0, 0, this.width, this.height);
    }
    
    // End frame - detect changes
    endFrame(ctx) {
        // Draw the actual frame to our buffer
        this.currentCtx.drawImage(ctx.canvas, 0, 0);
        
        // If we don't have auto-detection enabled, just use manual dirty rects
        if (this.dirtyRects.length > 0 || this.fullRedraw) {
            return;
        }
        
        // Auto-detect changed regions (optional, expensive)
        // This would compare previousCanvas with currentCanvas
        // For now, we'll rely on manual marking
    }
    
    // Debug visualization
    drawDebug(ctx) {
        const rects = this.getOptimizedRects();
        
        ctx.strokeStyle = '#ff00ff';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        
        for (const rect of rects) {
            ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
        }
        
        ctx.setLineDash([]);
        
        // Show stats
        ctx.fillStyle = '#00ffff';
        ctx.font = '12px monospace';
        ctx.fillText(`Dirty Rects: ${rects.length}`, 10, 20);
        
        if (rects.length > 0) {
            const totalArea = this.getTotalArea(rects);
            const percent = ((totalArea / (this.width * this.height)) * 100).toFixed(1);
            ctx.fillText(`Coverage: ${percent}%`, 10, 35);
        }
    }
}

// Dirty rectangle tracker for individual objects
class DirtyObject {
    constructor(x, y, width, height) {
        this.bounds = { x, y, width, height };
        this.previousBounds = { ...this.bounds };
        this.isDirty = true;
    }
    
    // Update position/size
    update(x, y, width, height) {
        this.previousBounds = { ...this.bounds };
        this.bounds = { x, y, width, height };
        
        // Check if actually changed
        this.isDirty = (
            this.bounds.x !== this.previousBounds.x ||
            this.bounds.y !== this.previousBounds.y ||
            this.bounds.width !== this.previousBounds.width ||
            this.bounds.height !== this.previousBounds.height
        );
    }
    
    // Get the dirty rectangle (covering old and new positions)
    getDirtyRect() {
        if (!this.isDirty) return null;
        
        const x = Math.min(this.bounds.x, this.previousBounds.x);
        const y = Math.min(this.bounds.y, this.previousBounds.y);
        const x2 = Math.max(
            this.bounds.x + this.bounds.width,
            this.previousBounds.x + this.previousBounds.width
        );
        const y2 = Math.max(
            this.bounds.y + this.bounds.height,
            this.previousBounds.y + this.previousBounds.height
        );
        
        return {
            x: x,
            y: y,
            width: x2 - x,
            height: y2 - y
        };
    }
    
    // Mark as clean
    clean() {
        this.isDirty = false;
    }
}

// Export as globals
window.DirtyRectManager = DirtyRectManager;
window.DirtyObject = DirtyObject;