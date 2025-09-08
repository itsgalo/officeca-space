// Simple WebGL Renderer System
// Similar to Three.js WebGLRenderer but much simpler

export default class PixRenderer {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.gl = canvas.getContext("webgl2", {
      antialias: options.antialias || false,
      preserveDrawingBuffer: options.preserveDrawingBuffer || true,
      premultipliedAlpha: options.premultipliedAlpha || false,
      ...options
    });

    if (!this.gl) {
      throw new Error('WebGL 2 not supported');
    }

    this.width = canvas.width;
    this.height = canvas.height;
    this.aspect = this.width / this.height;
    
    // Renderer state
    this.clearColor = [0, 0, 0, 1];
    this.enableDepthTest = true;
    this.enableBlend = true;
    
    this.init();
  }

  init() {
    const gl = this.gl;

    gl.getExtension('EXT_color_buffer_float');
    gl.getExtension('OES_texture_float');
    
    if (this.enableDepthTest) {
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LESS);
    }
    
    if (this.enableBlend) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    }
  }

  setSize(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.width = width;
    this.height = height;
    this.aspect = width / height;
    this.gl.viewport(0, 0, width, height);
  }

  setClearColor(r, g, b, a = 1) {
    this.clearColor = [r, g, b, a];
  }

  clear() {
    const gl = this.gl;
    gl.clearColor(...this.clearColor);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  }

  render(scene, camera) {
    this.clear();
    
    // Update camera matrices
    camera.updateMatrices(this.aspect);
    
    // Render all objects in the scene
    scene.traverse((object) => {
      if (object.geometry && object.material) {
        this.renderObject(object, camera);
      }
    });
  }

  renderObject(object, camera) {
    const material = object.material;
    const geometry = object.geometry;
    
    // Use the material's shader program
    //material.use(this.gl);
    
    // Set common uniforms
    // material.setProperty("uProjection", camera.projectionMatrix);
    // material.setProperty("uModel", object.modelMatrix);
    // material.setProperty("uView", camera.viewMatrix);
    //material.setProperty("uColor", [1.0, 1.0, 0.0, 1.0]);
    //material.setProperty("uWire", 1.0);
    //material.setProperty("colors", palette);

    geometry.updateBuffers(this.gl);
    
    if (geometry.isInstance) {
      geometry.updateInstanceData(this.gl);
    }
    
    // Render the geometry
    geometry.renderWithMaterial(this.gl, material);
  }
}