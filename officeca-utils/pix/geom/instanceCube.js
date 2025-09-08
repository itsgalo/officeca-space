import { InstancedGeometry } from "./instancedGeometry.js";
import { vec3, mat4, quat } from '../gl-matrix/index.js';


//noise
let ZX = Array.from(new Array(1024), (_) => (Math.random()*1024));
let ZY = Array.from(new Array(1024), (_) => (Math.random()*1024));
let ZZ = Array.from(new Array(1024), (_) => (Math.random()*1024));
let NZS = 154003976;

let ri = (i,j,k)=>(i = Math.imul((((i & 1023) << 20) | ((j & 1023) << 10) | (k & 1023)) ^ NZS, 0x9e3779b1),
  i <<= 3 + (i >>> 29),
  (i >>> 1) / 2 ** 31 - 0.5);

let nz = (x,y,z,s,i,o=1,oc=o < 2 ? 0 : nz(x, y, z, s * 2, (i + 73) % 99, o - 1) / 2,p=Math.floor(x = x * s + ZX[i]),q=Math.floor(y = y * s + ZY[i]),r=Math.floor(z = z * s + ZZ[i])) => (x -= p,
  y -= q,
  z -= r,
  x *= x * (3 - 2 * x),
  y *= y * (3 - 2 * y),
  z *= z * (3 - 2 * z),
  ri(p, q, r) * (1 - x) * (1 - y) * (1 - z) + ri(p, q, r + 1) * (1 - x) * (1 - y) * z + ri(p, q + 1, r) * (1 - x) * y * (1 - z) + ri(p, q + 1, r + 1) * (1 - x) * y * z + ri(p + 1, q, r) * x * (1 - y) * (1 - z) + ri(p + 1, q, r + 1) * x * (1 - y) * z + ri(p + 1, q + 1, r) * x * y * (1 - z) + ri(p + 1, q + 1, r + 1) * x * y * z + oc);

class InstanceCube extends InstancedGeometry {
    constructor(options = {}) {
        super();

        // Default options
        const {
            width = 1.0,
            height = 1.0,
            depth = 1.0,
            position = [0, 0, 0],
            color = [0, 0, 1, 1],
            uvScale = 1.0
        } = options;

        this.position = vec3.fromValues(...position);
        this.rotation = quat.create();
        
        this.originalPositions = []; // To store the original vertex positions
        this.createCube(width, height, depth, position, color, uvScale);
        this.originalPositions = this.vertices.map(vertex => vertex.position.slice());
    }
    createCube(width, height, depth, position, color, uvScale) {
        // Dimensions of the cube
        const halfWidth = width / 2;
        const halfHeight = height / 2;
        const halfDepth = depth / 2;
    
        // Vertex positions for the cube (duplicated for each face to allow unique UVs)
        const vertices = [
            // Front face
            [-halfWidth,  halfHeight,  halfDepth], // 0
            [ halfWidth,  halfHeight,  halfDepth], // 1
            [-halfWidth, -halfHeight,  halfDepth], // 2
            [ halfWidth, -halfHeight,  halfDepth], // 3
            // Back face
            [ halfWidth,  halfHeight, -halfDepth], // 4
            [-halfWidth,  halfHeight, -halfDepth], // 5
            [ halfWidth, -halfHeight, -halfDepth], // 6
            [-halfWidth, -halfHeight, -halfDepth], // 7
            // Left face
            [-halfWidth,  halfHeight, -halfDepth], // 8
            [-halfWidth,  halfHeight,  halfDepth], // 9
            [-halfWidth, -halfHeight, -halfDepth], // 10
            [-halfWidth, -halfHeight,  halfDepth], // 11
            // Right face
            [ halfWidth,  halfHeight,  halfDepth], // 12
            [ halfWidth,  halfHeight, -halfDepth], // 13
            [ halfWidth, -halfHeight,  halfDepth], // 14
            [ halfWidth, -halfHeight, -halfDepth], // 15
            // Top face
            [-halfWidth,  halfHeight, -halfDepth], // 16
            [ halfWidth,  halfHeight, -halfDepth], // 17
            [-halfWidth,  halfHeight,  halfDepth], // 18
            [ halfWidth,  halfHeight,  halfDepth], // 19
            // Bottom face
            [-halfWidth, -halfHeight,  halfDepth], // 20
            [ halfWidth, -halfHeight,  halfDepth], // 21
            [-halfWidth, -halfHeight, -halfDepth], // 22
            [ halfWidth, -halfHeight, -halfDepth]  // 23
        ];

        this.edges = [
            // Front face
            0, 1,  1, 3,  3, 2,  2, 0,
            // Back face
            5, 4,  4, 6,  6, 7,  7, 5,
            // Left face
            5, 0,  7, 2,
            // Right face
            1, 4,  3, 6,
            // Top face
            5, 0,  4, 1,
            // Bottom face
            7, 2,  6, 3
        ];
    
        // UV coordinates for each face
        const uvTemplate = [
            [0, 0], [uvScale, 0], [0, uvScale], [uvScale, uvScale]
        ];
        const uvs = [
            ...uvTemplate, // Front face
            ...uvTemplate, // Back face
            ...uvTemplate, // Left face
            ...uvTemplate, // Right face
            ...uvTemplate, // Top face
            ...uvTemplate  // Bottom face
        ];
    
        // Indices for drawing the cube using triangles
        const indices = [
            // Front face
            0, 1, 2,  1, 3, 2,
            // Back face
            4, 5, 6,  5, 7, 6,
            // Left face
            8, 9, 10,  9, 11, 10,
            // Right face
            12, 13, 14,  13, 15, 14,
            // Top face
            16, 17, 18,  17, 18, 19,
            // Bottom face
            20, 21, 22,  21, 23, 22
        ];
    
        // Add the vertices, UVs, and faces to the mesh
        vertices.forEach((vertex, i) => {
            this.addVertex(
                [
                    vertex[0] + position[0],
                    vertex[1] + position[1],
                    vertex[2] + position[2]
                ],
                vertex.map(v => v / Math.max(halfWidth, halfHeight, halfDepth)), // normalized vertex position
                uvs[i],
                color
            );
        });
    
        // Add the faces using indices
        for (let i = 0; i < indices.length; i += 3) {
            this.addFace([
                indices[i],
                indices[i + 1],
                indices[i + 2]
            ]);
        }
    
        // Compute normals for the mesh
        this.computeNormals();
    }

    setFaceColor(faceIndex, color) {
        // Define which vertices belong to each face
        const faceVertexRanges = {
            0: [0, 1, 2, 3],    // Front face
            1: [4, 5, 6, 7],    // Back face  
            2: [8, 9, 10, 11],  // Left face
            3: [12, 13, 14, 15], // Right face
            4: [16, 17, 18, 19], // Top face
            5: [20, 21, 22, 23]  // Bottom face
        };
        
        // Validate face index
        if (faceIndex < 0 || faceIndex > 5) {
            console.error('Face index must be between 0 and 5');
            return this;
        }
        
        // Get the vertex indices for this face
        const vertexIndices = faceVertexRanges[faceIndex];
        
        // Update color for each vertex in this face
        vertexIndices.forEach(vertexIndex => {
            if (this.vertices[vertexIndex]) {
                this.vertices[vertexIndex].color = [...color]; // Copy the color array
                
                // Also update the colors array if it exists (for GPU buffer)
                if (this.colors) {
                    const colorIndex = vertexIndex * 4; // 4 components per color (RGBA)
                    this.colors[colorIndex] = color[0];     // R
                    this.colors[colorIndex + 1] = color[1]; // G  
                    this.colors[colorIndex + 2] = color[2]; // B
                    this.colors[colorIndex + 3] = color[3]; // A
                }
            }
        });
        
        return this;
    }

    applyTransformation(callback) {
      // Apply transformation to vertices
      for (let i = 0; i < this.vertices.length; i++) {
          const vertex = this.vertices[i];
          const originalPosition = vertex.position.slice(); // Copy the original position
          const transformedPosition = callback(originalPosition, i);
  
          // Update position in both vertex object and positions array
          vertex.position = transformedPosition;
          const posIndex = i * 3;
          this.positions[posIndex] = transformedPosition[0];
          this.positions[posIndex + 1] = transformedPosition[1];
          this.positions[posIndex + 2] = transformedPosition[2];
      }
  
      // Recompute normals after transformation
      this.computeNormals();
    }

    // Apply current transformation (position, rotation, scale) to vertices
    applyCurrentTransform() {
        const transformMatrix = mat4.create();
        
        // Create transformation matrix (translate, rotate, scale)
        mat4.fromRotationTranslation(
            transformMatrix, 
            this.rotation,
            this.position
        );
        
        // Apply to all vertices
        this.applyTransformation((position, i) => {
            const originalPos = vec3.fromValues(...this.originalPositions[i]);
            const transformedPos = vec3.create();
            
            // Apply transformation matrix to original position
            vec3.transformMat4(transformedPos, originalPos, transformMatrix);
            
            return [transformedPos[0], transformedPos[1], transformedPos[2]];
        });
        
        return this;
    }

    // Set rotation from Euler angles (radians)
    setRotation(x, y, z) {
        // Convert radians to degrees for gl-matrix
        quat.fromEuler(this.rotation, 
            x * 180 / Math.PI, 
            y * 180 / Math.PI, 
            z * 180 / Math.PI
        );
        
        // Apply the transformation
        this.applyCurrentTransform();
        
        return this;
    }

    setDirection(dir) {
        // dir is assumed to be normalized [x, y, z]
        const dirVec = vec3.fromValues(...dir);
        vec3.normalize(dirVec, dirVec);
        
        if (dirVec[1] > 0.99999) {
            // Looking straight up
            quat.set(this.rotation, 0, 0, 0, 1);
        } else if (dirVec[1] < -0.99999) {
            // Looking straight down
            quat.set(this.rotation, 1, 0, 0, 0);
        } else {
            // Create axis perpendicular to direction and up vector
            const axis = vec3.fromValues(dirVec[2], 0, -dirVec[0]);
            vec3.normalize(axis, axis);
            
            // Calculate angle from up vector (0, 1, 0) to direction
            const radians = Math.acos(dirVec[1]);
            
            // Set quaternion from axis and angle
            quat.setAxisAngle(this.rotation, axis, radians);
        }
        
        // Apply the transformation
        this.applyCurrentTransform();        
    }

    // Rotate by adding Euler angles (radians)
    rotate(x, y, z) {
        // Create a quaternion from the euler angles
        const rotQuat = quat.create();
        quat.fromEuler(rotQuat, 
            x * 180 / Math.PI, 
            y * 180 / Math.PI, 
            z * 180 / Math.PI
        );
        
        // Multiply with current rotation
        quat.multiply(this.rotation, this.rotation, rotQuat);
        
        // Apply the transformation
        this.applyCurrentTransform();
        
        return this;
    }

    // Rotate around a specific axis and angle (radians)
    rotateAxis(axis, angle) {
        // Create normalized axis vector
        const axisVec = vec3.fromValues(...axis);
        vec3.normalize(axisVec, axisVec);
        
        // Create rotation quaternion
        const rotQuat = quat.create();
        quat.setAxisAngle(rotQuat, axisVec, angle);
        
        // Combine with current rotation
        quat.multiply(this.rotation, this.rotation, rotQuat);
        
        // Apply the transformation
        this.applyCurrentTransform();
        
        return this;
    }

    // Get the current euler angles (in radians)
    getEulerAngles() {
        // Create array to store euler angles
        const eulerAngles = [0, 0, 0];
        
        // Extract euler angles from quaternion
        // This is a simplified conversion and may have gimbal lock issues
        // Get yaw (y-axis rotation)
        const sinrCosp = 2 * (this.rotation[3] * this.rotation[1] + this.rotation[0] * this.rotation[2]);
        const cosrCosp = 1 - 2 * (this.rotation[1] * this.rotation[1] + this.rotation[2] * this.rotation[2]);
        eulerAngles[1] = Math.atan2(sinrCosp, cosrCosp);
        
        // Get pitch (x-axis rotation)
        const sinp = 2 * (this.rotation[3] * this.rotation[0] - this.rotation[2] * this.rotation[1]);
        if (Math.abs(sinp) >= 1) {
            eulerAngles[0] = Math.PI / 2 * Math.sign(sinp); // Use 90 degrees if out of range
        } else {
            eulerAngles[0] = Math.asin(sinp);
        }
        
        // Get roll (z-axis rotation)
        const sinyCosp = 2 * (this.rotation[3] * this.rotation[2] + this.rotation[0] * this.rotation[1]);
        const cosyCosp = 1 - 2 * (this.rotation[0] * this.rotation[0] + this.rotation[2] * this.rotation[2]);
        eulerAngles[2] = Math.atan2(sinyCosp, cosyCosp);
        
        return eulerAngles;
    }

    scale(sx, sy, sz) {
      this.applyTransformation((position, i) => {
          const originalPosition = this.originalPositions[i];
          return [
              originalPosition[0] * sx,
              originalPosition[1] * sy,
              originalPosition[2] * sz
          ];
      });
    }

    translate(x, y, z) {
      const translation = [x, y, z]; // Translate by x, y, z
      //vec3.add(this.position, this.position, translation);
      //this.applyCurrentTransform();
      this.applyTransformation((position, i) => {
        const originalPosition = this.originalPositions[i];
        return [
            originalPosition[0] + translation[0],
            originalPosition[1] + translation[1],
            originalPosition[2] + translation[2]
        ];
      });
    }

    // Static method to create a grid of cubes with variable dimensions
    static createGrid(options = {}) {
        const {
            rows = 1,
            cols = 1,
            spacing = 1.2,
            width = 1.0,
            height = 1.0,
            depth = 1.0,
            baseColor = [1, 0, 1, 1],
            colorVariation = 0.2,
            uvScale = 1.0
        } = options;

        const cubes = [];
        const halfRows = (rows - 1) / 2;
        const halfCols = (cols - 1) / 2;

        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                // Calculate position
                const x = (j - halfCols) * spacing;
                const z = (i - halfRows) * spacing;

                // Create slightly varied color
                const color = baseColor.map((component, index) => {
                    if (index === 3) return component; // Don't vary alpha
                    return component * x + z* colorVariation;
                });
                let n = nz(i, j, 0, 0.05, 1, 6);
                let h = n * 2.0;
                // Create cube
                cubes.push(new Cube({
                    width,
                    height,
                    depth,
                    position: [x, 0, z],//Math.abs(h/2)-0.15
                    color,
                    uvScale
                }));
            }
        }

        return cubes;
    }
}

export { InstanceCube };