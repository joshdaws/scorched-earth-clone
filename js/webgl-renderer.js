// WebGL Renderer for hardware-accelerated graphics
class WebGLRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        
        if (!this.gl) {
            throw new Error('WebGL not supported');
        }
        
        this.programs = {};
        this.textures = new Map();
        this.framebuffers = new Map();
        
        // Initialize WebGL settings
        this.init();
    }
    
    init() {
        const gl = this.gl;
        
        // Enable blending for transparency
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        
        // Set clear color
        gl.clearColor(0, 0, 0, 0);
        
        // Create shaders
        this.createShaders();
        
        // Create buffers
        this.createBuffers();
    }
    
    createShaders() {
        // Basic sprite shader
        const spriteVS = `
            attribute vec2 a_position;
            attribute vec2 a_texCoord;
            
            uniform mat3 u_matrix;
            
            varying vec2 v_texCoord;
            
            void main() {
                gl_Position = vec4((u_matrix * vec3(a_position, 1.0)).xy, 0.0, 1.0);
                v_texCoord = a_texCoord;
            }
        `;
        
        const spriteFS = `
            precision mediump float;
            
            uniform sampler2D u_texture;
            uniform vec4 u_color;
            
            varying vec2 v_texCoord;
            
            void main() {
                vec4 texColor = texture2D(u_texture, v_texCoord);
                gl_FragColor = texColor * u_color;
            }
        `;
        
        // Glow shader for neon effects
        const glowFS = `
            precision mediump float;
            
            uniform sampler2D u_texture;
            uniform vec4 u_color;
            uniform float u_glowAmount;
            
            varying vec2 v_texCoord;
            
            void main() {
                vec4 sum = vec4(0.0);
                float blurSize = u_glowAmount / 512.0;
                
                // 9-tap blur for glow effect
                sum += texture2D(u_texture, vec2(v_texCoord.x - blurSize, v_texCoord.y - blurSize)) * 0.045;
                sum += texture2D(u_texture, vec2(v_texCoord.x, v_texCoord.y - blurSize)) * 0.122;
                sum += texture2D(u_texture, vec2(v_texCoord.x + blurSize, v_texCoord.y - blurSize)) * 0.045;
                
                sum += texture2D(u_texture, vec2(v_texCoord.x - blurSize, v_texCoord.y)) * 0.122;
                sum += texture2D(u_texture, vec2(v_texCoord.x, v_texCoord.y)) * 0.332;
                sum += texture2D(u_texture, vec2(v_texCoord.x + blurSize, v_texCoord.y)) * 0.122;
                
                sum += texture2D(u_texture, vec2(v_texCoord.x - blurSize, v_texCoord.y + blurSize)) * 0.045;
                sum += texture2D(u_texture, vec2(v_texCoord.x, v_texCoord.y + blurSize)) * 0.122;
                sum += texture2D(u_texture, vec2(v_texCoord.x + blurSize, v_texCoord.y + blurSize)) * 0.045;
                
                gl_FragColor = sum * u_color;
            }
        `;
        
        this.programs.sprite = this.createProgram(spriteVS, spriteFS);
        this.programs.glow = this.createProgram(spriteVS, glowFS);
    }
    
    createProgram(vertexSource, fragmentSource) {
        const gl = this.gl;
        
        const vertexShader = this.compileShader(gl.VERTEX_SHADER, vertexSource);
        const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, fragmentSource);
        
        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            throw new Error('Program link failed: ' + gl.getProgramInfoLog(program));
        }
        
        // Get attribute and uniform locations
        const attributes = {};
        const uniforms = {};
        
        const numAttributes = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
        for (let i = 0; i < numAttributes; i++) {
            const info = gl.getActiveAttrib(program, i);
            attributes[info.name] = gl.getAttribLocation(program, info.name);
        }
        
        const numUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
        for (let i = 0; i < numUniforms; i++) {
            const info = gl.getActiveUniform(program, i);
            uniforms[info.name] = gl.getUniformLocation(program, info.name);
        }
        
        return { program, attributes, uniforms };
    }
    
    compileShader(type, source) {
        const gl = this.gl;
        const shader = gl.createShader(type);
        
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            throw new Error('Shader compile failed: ' + gl.getShaderInfoLog(shader));
        }
        
        return shader;
    }
    
    createBuffers() {
        const gl = this.gl;
        
        // Create a quad buffer for sprites
        const positions = new Float32Array([
            0, 0,
            1, 0,
            0, 1,
            0, 1,
            1, 0,
            1, 1,
        ]);
        
        this.positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
        
        // Texture coordinates
        const texCoords = new Float32Array([
            0, 0,
            1, 0,
            0, 1,
            0, 1,
            1, 0,
            1, 1,
        ]);
        
        this.texCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);
    }
    
    // Create texture from canvas or image
    createTexture(source, name) {
        const gl = this.gl;
        
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        
        // Upload the source to the texture
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
        
        // Set texture parameters
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        
        if (name) {
            this.textures.set(name, texture);
        }
        
        return texture;
    }
    
    // Update existing texture
    updateTexture(texture, source) {
        const gl = this.gl;
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    }
    
    // Clear the canvas
    clear() {
        const gl = this.gl;
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        gl.clear(gl.COLOR_BUFFER_BIT);
    }
    
    // Draw a sprite
    drawSprite(texture, x, y, width, height, color = [1, 1, 1, 1], rotation = 0) {
        const gl = this.gl;
        const program = this.programs.sprite;
        
        gl.useProgram(program.program);
        
        // Set up attributes
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.enableVertexAttribArray(program.attributes.a_position);
        gl.vertexAttribPointer(program.attributes.a_position, 2, gl.FLOAT, false, 0, 0);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
        gl.enableVertexAttribArray(program.attributes.a_texCoord);
        gl.vertexAttribPointer(program.attributes.a_texCoord, 2, gl.FLOAT, false, 0, 0);
        
        // Create transformation matrix
        const matrix = this.createMatrix(x, y, width, height, rotation);
        gl.uniformMatrix3fv(program.uniforms.u_matrix, false, matrix);
        
        // Set color
        gl.uniform4fv(program.uniforms.u_color, color);
        
        // Bind texture
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1i(program.uniforms.u_texture, 0);
        
        // Draw
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
    
    // Draw with glow effect
    drawGlow(texture, x, y, width, height, color = [1, 1, 1, 1], glowAmount = 5.0) {
        const gl = this.gl;
        const program = this.programs.glow;
        
        gl.useProgram(program.program);
        
        // Set up attributes
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.enableVertexAttribArray(program.attributes.a_position);
        gl.vertexAttribPointer(program.attributes.a_position, 2, gl.FLOAT, false, 0, 0);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
        gl.enableVertexAttribArray(program.attributes.a_texCoord);
        gl.vertexAttribPointer(program.attributes.a_texCoord, 2, gl.FLOAT, false, 0, 0);
        
        // Create transformation matrix
        const matrix = this.createMatrix(x, y, width, height, 0);
        gl.uniformMatrix3fv(program.uniforms.u_matrix, false, matrix);
        
        // Set uniforms
        gl.uniform4fv(program.uniforms.u_color, color);
        gl.uniform1f(program.uniforms.u_glowAmount, glowAmount);
        
        // Bind texture
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1i(program.uniforms.u_texture, 0);
        
        // Draw
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
    
    // Create transformation matrix
    createMatrix(x, y, width, height, rotation) {
        // Convert from pixel coordinates to clip space (-1 to 1)
        const scaleX = width / this.canvas.width * 2;
        const scaleY = height / this.canvas.height * 2;
        const translateX = x / this.canvas.width * 2 - 1;
        const translateY = 1 - y / this.canvas.height * 2 - scaleY;
        
        // Create 3x3 transformation matrix
        const cos = Math.cos(rotation);
        const sin = Math.sin(rotation);
        
        return new Float32Array([
            scaleX * cos, scaleX * sin, 0,
            -scaleY * sin, scaleY * cos, 0,
            translateX, translateY, 1
        ]);
    }
    
    // Create framebuffer for off-screen rendering
    createFramebuffer(width, height, name) {
        const gl = this.gl;
        
        const framebuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
        
        if (name) {
            this.framebuffers.set(name, { framebuffer, texture, width, height });
        }
        
        // Unbind
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        
        return { framebuffer, texture };
    }
    
    // Begin rendering to framebuffer
    beginFramebuffer(name) {
        const fb = this.framebuffers.get(name);
        if (fb) {
            const gl = this.gl;
            gl.bindFramebuffer(gl.FRAMEBUFFER, fb.framebuffer);
            gl.viewport(0, 0, fb.width, fb.height);
        }
    }
    
    // End framebuffer rendering
    endFramebuffer() {
        const gl = this.gl;
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }
}

// Export as global
window.WebGLRenderer = WebGLRenderer;