// Spatial Grid for efficient collision detection
class SpatialGrid {
    constructor(width, height, cellSize = 50) {
        this.width = width;
        this.height = height;
        this.cellSize = cellSize;
        this.cols = Math.ceil(width / cellSize);
        this.rows = Math.ceil(height / cellSize);
        this.grid = new Map();
        this.objectCells = new WeakMap(); // Track which cells each object is in
    }
    
    // Clear all objects from the grid
    clear() {
        this.grid.clear();
        this.objectCells = new WeakMap();
    }
    
    // Get the grid key for a position
    getKey(col, row) {
        return `${col},${row}`;
    }
    
    // Get all grid cells that an object occupies
    getCellsForBounds(x, y, width = 0, height = 0) {
        const cells = [];
        const minCol = Math.floor(x / this.cellSize);
        const maxCol = Math.floor((x + width) / this.cellSize);
        const minRow = Math.floor(y / this.cellSize);
        const maxRow = Math.floor((y + height) / this.cellSize);
        
        for (let col = minCol; col <= maxCol; col++) {
            for (let row = minRow; row <= maxRow; row++) {
                if (col >= 0 && col < this.cols && row >= 0 && row < this.rows) {
                    cells.push({ col, row, key: this.getKey(col, row) });
                }
            }
        }
        
        return cells;
    }
    
    // Add an object to the grid
    add(object, x, y, width = 0, height = 0) {
        const cells = this.getCellsForBounds(x, y, width, height);
        const cellKeys = [];
        
        for (const cell of cells) {
            if (!this.grid.has(cell.key)) {
                this.grid.set(cell.key, new Set());
            }
            this.grid.get(cell.key).add(object);
            cellKeys.push(cell.key);
        }
        
        // Track which cells this object is in for easy removal
        this.objectCells.set(object, cellKeys);
    }
    
    // Remove an object from the grid
    remove(object) {
        const cellKeys = this.objectCells.get(object);
        if (!cellKeys) return;
        
        for (const key of cellKeys) {
            const cell = this.grid.get(key);
            if (cell) {
                cell.delete(object);
                if (cell.size === 0) {
                    this.grid.delete(key);
                }
            }
        }
        
        this.objectCells.delete(object);
    }
    
    // Update an object's position
    update(object, x, y, width = 0, height = 0) {
        this.remove(object);
        this.add(object, x, y, width, height);
    }
    
    // Get all objects near a point
    getNearby(x, y, searchRadius = 0) {
        const nearby = new Set();
        const cells = this.getCellsForBounds(
            x - searchRadius, 
            y - searchRadius, 
            searchRadius * 2, 
            searchRadius * 2
        );
        
        for (const cell of cells) {
            const objects = this.grid.get(cell.key);
            if (objects) {
                for (const obj of objects) {
                    nearby.add(obj);
                }
            }
        }
        
        return Array.from(nearby);
    }
    
    // Get objects in a rectangle
    getInRectangle(x, y, width, height) {
        const objects = new Set();
        const cells = this.getCellsForBounds(x, y, width, height);
        
        for (const cell of cells) {
            const cellObjects = this.grid.get(cell.key);
            if (cellObjects) {
                for (const obj of cellObjects) {
                    objects.add(obj);
                }
            }
        }
        
        return Array.from(objects);
    }
    
    // Debug: visualize the grid
    draw(ctx) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        
        // Draw grid lines
        for (let col = 0; col <= this.cols; col++) {
            ctx.beginPath();
            ctx.moveTo(col * this.cellSize, 0);
            ctx.lineTo(col * this.cellSize, this.height);
            ctx.stroke();
        }
        
        for (let row = 0; row <= this.rows; row++) {
            ctx.beginPath();
            ctx.moveTo(0, row * this.cellSize);
            ctx.lineTo(this.width, row * this.cellSize);
            ctx.stroke();
        }
        
        // Highlight occupied cells
        ctx.fillStyle = 'rgba(0, 255, 255, 0.1)';
        for (const [key, objects] of this.grid) {
            if (objects.size > 0) {
                const [col, row] = key.split(',').map(Number);
                ctx.fillRect(col * this.cellSize, row * this.cellSize, this.cellSize, this.cellSize);
            }
        }
    }
}

// Export as global
window.SpatialGrid = SpatialGrid;