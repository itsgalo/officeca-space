import { mat4 } from "../gl-matrix/index.js";

export default class Scene {
  constructor() {
    this.children = [];
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

  traverse(callback) {
    callback(this);
    for (const child of this.children) {
      if (child.traverse) {
        child.traverse(callback);
      } else {
        callback(child);
      }
    }
  }
}