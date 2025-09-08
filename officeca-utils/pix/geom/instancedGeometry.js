class InstancedGeometry {
    constructor() {
        // Base geometry attributes
        this.positions = [];
        this.normals = [];
        this.uvs = [];
        this.colors = [];
        this.move = []; //boolean for animating vertex shader
        
        // Topology
        this.vertices = [];
        this.edges = [];
        this.faces = [];
        this.indices = [];
        
        // Instance attributes
        this.instanceCount = 0;
        this.instancePositions = []; // vec3 translations
        this.instanceRotations = []; // vec4 quaternions
        this.instanceScales = [];    // vec3 scales
        this.instanceColors = [];    // vec4 colors
        
        // WebGL buffers
        this.vao = null;
        this.positionBuffer = null;
        this.normalBuffer = null;
        this.uvBuffer = null;
        this.colorBuffer = null;
        this.indexBuffer = null;
        this.moveBuffer = null;
        
        // Instance buffers
        this.instancePositionBuffer = null;
        this.instanceRotationBuffer = null;
        this.instanceScaleBuffer = null;
        this.instanceColorBuffer = null;

        this.isInstance = true;
    }

    // Existing vertex/edge/face methods remain the same
    addVertex(position, normal = [0, 1, 0], uv = [0, 0], color = [Math.random(), Math.random(), Math.random(), 1], move = 0.0) {
        const index = this.vertices.length;
        
        this.vertices.push({
            position: position.slice(),
            normal: normal.slice(),
            uv: uv.slice(),
            color: color.slice(),
            edges: [],
            faces: [],
            move: move
        });
        
        this.positions.push(...position);
        this.normals.push(...normal);
        this.uvs.push(...uv);
        this.colors.push(...color);
        this.move.push(move);
        
        return index;
    }

    addEdge(v1Index, v2Index) {
        const edge = {
            vertices: [v1Index, v2Index],
            faces: []
        };
        
        const edgeIndex = this.edges.length;
        this.edges.push(edge);
        
        this.vertices[v1Index].edges.push(edgeIndex);
        this.vertices[v2Index].edges.push(edgeIndex);
        
        return edgeIndex;
    }

    addFace(vertexIndices, color = [1,1,1,1]) {
        const face = {
            vertices: vertexIndices.slice(),
            edges: []
        };
        
        const faceIndex = this.faces.length;
        this.faces.push(face);
        
        for (let i = 1; i < vertexIndices.length - 1; i++) {
            this.indices.push(
                vertexIndices[0],
                vertexIndices[i + 1],
                vertexIndices[i]
            );
        }
        
        for (const vIndex of vertexIndices) {
            this.vertices[vIndex].faces.push(faceIndex);
            //this.colors.splice(vIndex*4, 4, ...color);
        }
        
        return faceIndex;
    }

    // New method to add an instance
    addInstance(position = [0, 0, 0], rotation = [0, 0, 0, 1], scale = [1, 1, 1], color = [1, 1, 1, 1]) {
        this.instancePositions.push(...position);
        this.instanceRotations.push(...rotation);
        this.instanceScales.push(...scale);
        this.instanceColors.push(...color);
        this.instanceCount++;
    }

    // Clear all instances
    clearInstances() {
        this.instancePositions = [];
        this.instanceRotations = [];
        this.instanceScales = [];
        this.instanceColors = [];
        this.instanceCount = 0;
    }

    computeNormals() {
        this.normals = new Array(this.positions.length).fill(0);
        
        for (let i = 0; i < this.indices.length; i += 3) {
            const i0 = this.indices[i] * 3;
            const i1 = this.indices[i + 1] * 3;
            const i2 = this.indices[i + 2] * 3;
            
            const v0 = this.positions.slice(i0, i0 + 3);
            const v1 = this.positions.slice(i1, i1 + 3);
            const v2 = this.positions.slice(i2, i2 + 3);
            
            const edge1 = [
                v1[0] - v0[0],
                v1[1] - v0[1],
                v1[2] - v0[2]
            ];
            
            const edge2 = [
                v2[0] - v0[0],
                v2[1] - v0[1],
                v2[2] - v0[2]
            ];
            
            const normal = [
                edge1[1] * edge2[2] - edge1[2] * edge2[1],
                edge1[2] * edge2[0] - edge1[0] * edge2[2],
                edge1[0] * edge2[1] - edge1[1] * edge2[0]
            ];
            
            for (const idx of [i0, i1, i2]) {
                this.normals[idx] += normal[0];
                this.normals[idx + 1] += normal[1];
                this.normals[idx + 2] += normal[2];
            }
        }
        
        for (let i = 0; i < this.normals.length; i += 3) {
            const length = Math.sqrt(
                this.normals[i] * this.normals[i] +
                this.normals[i + 1] * this.normals[i + 1] +
                this.normals[i + 2] * this.normals[i + 2]
            );
            
            if (length > 0) {
                this.normals[i] /= length;
                this.normals[i + 1] /= length;
                this.normals[i + 2] /= length;
            }
        }
    }

    initBuffers(gl) {
        this.vao = gl.createVertexArray();
        gl.bindVertexArray(this.vao);
        
        // Base geometry buffers
        this.positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.positions), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
        
        this.normalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.normals), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(1);
        gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
        
        this.uvBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.uvs), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(2);
        gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 0, 0);
        
        this.colorBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.colors), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(3);
        gl.vertexAttribPointer(3, 4, gl.FLOAT, false, 0, 0);
        
        // Instance buffers - using location attributes 4-7
        this.instancePositionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.instancePositionBuffer);
        gl.enableVertexAttribArray(4);
        gl.vertexAttribPointer(4, 3, gl.FLOAT, false, 0, 0);
        gl.vertexAttribDivisor(4, 1); // This attribute advances once per instance
        
        this.instanceRotationBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceRotationBuffer);
        gl.enableVertexAttribArray(5);
        gl.vertexAttribPointer(5, 4, gl.FLOAT, false, 0, 0);
        gl.vertexAttribDivisor(5, 1);
        
        this.instanceScaleBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceScaleBuffer);
        gl.enableVertexAttribArray(6);
        gl.vertexAttribPointer(6, 3, gl.FLOAT, false, 0, 0);
        gl.vertexAttribDivisor(6, 1);
        
        this.instanceColorBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceColorBuffer);
        gl.enableVertexAttribArray(7);
        gl.vertexAttribPointer(7, 4, gl.FLOAT, false, 0, 0);
        gl.vertexAttribDivisor(7, 1);

        this.moveBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.moveBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.move), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(8);
        gl.vertexAttribPointer(8, 1, gl.FLOAT, false, 0, 0);
        
        if (this.indices.length > 0) {
            this.indexBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.indices), gl.STATIC_DRAW);

            this.edgeBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.edgeBuffer);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.edges), gl.STATIC_DRAW);
        }
        
        gl.bindVertexArray(null);
    }

    updateBuffers(gl) {
        gl.bindVertexArray(this.vao);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.positions), gl.STATIC_DRAW);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.normals), gl.STATIC_DRAW);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.uvs), gl.STATIC_DRAW);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.colors), gl.STATIC_DRAW);
        
        if (this.indexBuffer) {
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.indices), gl.STATIC_DRAW);
        }
        
        gl.bindVertexArray(null);
    }

    updateInstanceData(gl) {
        gl.bindVertexArray(this.vao);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.instancePositionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.instancePositions), gl.DYNAMIC_DRAW);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceRotationBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.instanceRotations), gl.DYNAMIC_DRAW);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceScaleBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.instanceScales), gl.DYNAMIC_DRAW);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceColorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.instanceColors), gl.DYNAMIC_DRAW);
        
        gl.bindVertexArray(null);
    }

    // render(gl, loc, wireCol) {
    //     if (this.instanceCount === 0) return;
        
    //     gl.bindVertexArray(this.vao);
        
    //     if (this.indexBuffer) {
    //         // Solid fill
    //         gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    //         gl.enable(gl.POLYGON_OFFSET_FILL);
    //         gl.polygonOffset(0.5, 0.5);
    //         gl.uniform1f(loc.wire, 0.0);
    //         gl.drawElementsInstanced(
    //             gl.TRIANGLES,
    //             this.indices.length,
    //             gl.UNSIGNED_SHORT,
    //             0,
    //             this.instanceCount
    //         );
            
    //         // Wireframe
    //         gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.edgeBuffer);
    //         gl.disable(gl.POLYGON_OFFSET_FILL);
    //         gl.uniform4fv(loc.color, wireCol);
    //         gl.uniform1f(loc.wire, 1.0);
    //         gl.drawElementsInstanced(
    //             gl.LINES,
    //             this.edges.length,
    //             gl.UNSIGNED_SHORT,
    //             0,
    //             this.instanceCount
    //         );

    //     } else {
    //         gl.drawArraysInstanced(
    //             gl.TRIANGLES,
    //             0,
    //             this.positions.length / 3,
    //             this.instanceCount
    //         );
    //     }
        
    //     gl.bindVertexArray(null);
    // }

    renderWithMaterial(gl, material) {
        if (this.instanceCount === 0) return;
        
        // Apply the material and get active shader
        const shader = material.use();
        gl.bindVertexArray(this.vao);
        
        if (this.indexBuffer) {
          // Draw solid geometry first
          gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
          gl.enable(gl.POLYGON_OFFSET_FILL);
          
          if (material.wireframeEnabled) {
            gl.polygonOffset(1.5, 1.5);
          }
          
          shader.setUniform("uWire", 0.0);
          
          gl.drawElementsInstanced(
            gl.TRIANGLES,
            this.indices.length,
            gl.UNSIGNED_SHORT,
            0,
            this.instanceCount
          );
          
          // Draw wireframe if enabled
          if (material.wireframeEnabled && this.edgeBuffer) {
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.edgeBuffer);
            gl.disable(gl.POLYGON_OFFSET_FILL);
            //shader.setUniform("uColor", material.wireframeColor);
            shader.setUniform("uWire", 1.0);
            
            gl.drawElementsInstanced(
              gl.LINES,
              this.edges.length,
              gl.UNSIGNED_SHORT,
              0,
              this.instanceCount
            );
          }
        } else {
          gl.drawArraysInstanced(
            gl.TRIANGLES,
            0,
            this.positions.length / 3,
            this.instanceCount
          );
        }
        
        gl.bindVertexArray(null);
    }

    dispose(gl) {
        if (this.vao) gl.deleteVertexArray(this.vao);
        if (this.positionBuffer) gl.deleteBuffer(this.positionBuffer);
        if (this.normalBuffer) gl.deleteBuffer(this.normalBuffer);
        if (this.uvBuffer) gl.deleteBuffer(this.uvBuffer);
        if (this.colorBuffer) gl.deleteBuffer(this.colorBuffer);
        if (this.indexBuffer) gl.deleteBuffer(this.indexBuffer);
        if (this.instancePositionBuffer) gl.deleteBuffer(this.instancePositionBuffer);
        if (this.instanceRotationBuffer) gl.deleteBuffer(this.instanceRotationBuffer);
        if (this.instanceScaleBuffer) gl.deleteBuffer(this.instanceScaleBuffer);
        if (this.instanceColorBuffer) gl.deleteBuffer(this.instanceColorBuffer);
    }
}

export { InstancedGeometry };