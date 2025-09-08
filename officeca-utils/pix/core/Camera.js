import { vec3, mat4 } from '../gl-matrix/index.js';

export class Camera {
  constructor() {
    this.position = vec3.fromValues(0, 0, 0);
    this.target = vec3.fromValues(0, 0, 0);
    this.up = vec3.fromValues(0, 1, 0);
    this.projectionMatrix = mat4.create();
    this.viewMatrix = mat4.create();
    mat4.lookAt(this.viewMatrix,
      this.position,    // Camera position
      this.target,    // Look at point
      this.up     // Up vector
    );
  }

  lookAt(position, target, up = [0, 1, 0]) {
    this.position = position;
    this.target = target;
    this.up = up;
    mat4.lookAt(this.viewMatrix,
      this.position,    // Camera position
      this.target,    // Look at point
      this.up     // Up vector
    );
  }

  updateMatrices(aspect) {
    // Override in subclasses
  }
}

export class IsometricCamera extends Camera {
  constructor() {
    super();
    this.far = 100; 
    this.near = -100;
  }

  updateMatrices(aspect) {
    // Create isometric projection
    const scale = -2.0 / (this.far - this.near);
    const offset = -(this.far + this.near) / (this.far - this.near);
    
    mat4.identity(this.projectionMatrix);
    this.projectionMatrix[0] = 1/aspect;
    this.projectionMatrix[5] = 1;
    this.projectionMatrix[9] = 0//-1 / 2; // y shear for isometric
    this.projectionMatrix[10] = scale;
    this.projectionMatrix[14] = offset;
    this.projectionMatrix[15] = 1;
    
    // Update view matrix
    //mat4.lookAt(this.viewMatrix, this.position, this.target, this.up);
  }

  translate(target) {
    mat4.identity(this.viewMatrix);
    mat4.translate(this.viewMatrix, this.viewMatrix, target);
  }
}

export class PerspectiveCamera extends Camera {
  constructor(fov = 85, aspect = 1, near = 0.1, far = 1000) {
    super();
    this.fov = fov;
    this.aspect = aspect;
    this.near = near;
    this.far = far;
  }

  updateMatrices(aspect) {
    this.aspect = aspect;
    mat4.perspective(this.projectionMatrix, 
      this.fov * Math.PI / 180, 
      this.aspect, 
      this.near, 
      this.far
    );
    mat4.lookAt(this.viewMatrix, this.position, this.target, this.up);
  }
}