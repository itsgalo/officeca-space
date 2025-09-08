import { vec3, quat, mat4 } from '../gl-matrix/index.js';

export default class Object3D {
  constructor() {
    this.position = vec3.fromValues(0, 0, 0);
    this.rotation = quat.create();
    this.scale = vec3.fromValues(1, 1, 1);
    this.matrixWorld = mat4.create();
    this.parent = null;
    this.children = [];
    this.geometry = null;
    this.material = null;
    this.visible = true;
  }

  add(object) {
    this.children.push(object);
    object.parent = this;
  }

  remove(object) {
    const index = this.children.indexOf(object);
    if (index > -1) {
      this.children.splice(index, 1);
      object.parent = null;
    }
  }

  updateMatrix() {
    mat4.identity(this.matrixWorld);
    mat4.translate(this.matrixWorld, this.matrixWorld, this.position);
    
    // Apply quaternion rotation
    const rotMatrix = mat4.create();
    mat4.fromQuat(rotMatrix, this.rotation);
    mat4.multiply(this.matrixWorld, this.matrixWorld, rotMatrix);
    
    mat4.scale(this.matrixWorld, this.matrixWorld, this.scale);
  }

  traverse(callback) {
    callback(this);
    for (const child of this.children) {
      child.traverse(callback);
    }
  }
}