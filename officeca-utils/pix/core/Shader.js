class Shader {
  constructor(gl, vertexSource, fragmentSource) {
    this.gl = gl;
    this.program = null;
    this.uniforms = new Map();
    this.textureUnits = new Map();
    this.nextTextureUnit = 0;
    this.init(vertexSource, fragmentSource);
  }

  init(vertexSource, fragmentSource) {
    const vertexShader = this.compileShader(vertexSource, this.gl.VERTEX_SHADER);
    const fragmentShader = this.compileShader(fragmentSource, this.gl.FRAGMENT_SHADER);
    
    this.program = this.gl.createProgram();
    this.gl.attachShader(this.program, vertexShader);
    this.gl.attachShader(this.program, fragmentShader);
    this.gl.linkProgram(this.program);

    if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
      throw new Error(`Program link error: ${this.gl.getProgramInfoLog(this.program)}`);
    }

    // Cleanup shaders after linking
    this.gl.detachShader(this.program, vertexShader);
    this.gl.detachShader(this.program, fragmentShader);
    this.gl.deleteShader(vertexShader);
    this.gl.deleteShader(fragmentShader);
    
    // Cache uniform locations after program is linked
    //this.cacheUniformLocations();
  }

  cacheUniformLocations() {
    const numUniforms = this.gl.getProgramParameter(this.program, this.gl.ACTIVE_UNIFORMS);
    
    for (let i = 0; i < numUniforms; i++) {
      const info = this.gl.getActiveUniform(this.program, i);
      if (!info) continue;
      
      const location = this.gl.getUniformLocation(this.program, info.name);
      // Store uniform info and location
      this.uniforms.set(info.name, {
        location,
        type: info.type,
        size: info.size,
        value: null // Will be set when uniform is updated
      });

      // For sampler uniforms, automatically assign texture units
      if (info.type === this.gl.SAMPLER_2D || info.type === this.gl.SAMPLER_CUBE) {
        this.textureUnits.set(info.name, this.nextTextureUnit++);
      }
    }
  }

  setUniform(name, value) {
    this.use();
    
    if (!this.uniforms.has(name)) {
      const location = this.gl.getUniformLocation(this.program, name);
      if (location === null) {
        console.warn(`Uniform '${name}' not found in shader program.`);
        return;
      }
      
      // Guess type from value
      let type;
      if (value instanceof Float32Array) {
        if (value.length === 2) type = this.gl.FLOAT_VEC2;
        else if (value.length === 3) type = this.gl.FLOAT_VEC3;
        else if (value.length === 4) type = this.gl.FLOAT_VEC4;
        else if (value.length === 16) type = this.gl.FLOAT_MAT4;
        else if (value.length === 9) type = this.gl.FLOAT_MAT3;
        else type = this.gl.FLOAT;
      } else if (Array.isArray(value)) {
        if (value.length === 2) type = this.gl.FLOAT_VEC2;
        else if (value.length === 3) type = this.gl.FLOAT_VEC3;
        else if (value.length === 4) type = this.gl.FLOAT_VEC4;
        else if (value.length === 30) type = this.gl.FLOAT_VEC3;
        else type = this.gl.FLOAT;
      } else if (typeof value === 'number') {
        type = this.gl.FLOAT;
      } else if (typeof value === 'boolean' || (typeof value === 'number' && Number.isInteger(value))) {
        type = this.gl.INT;
      } else {
        console.warn(`Unknown type for uniform '${name}'`);
        return;
      }
      
      this.uniforms.set(name, {
        location,
        type,
        size: 1,
        value: null
      });
    }
    
    const uniform = this.uniforms.get(name);
    // Don't update if value hasn't changed
    if (this._valuesEqual(uniform.value, value)) return;
    
    uniform.value = this._cloneValue(value);
    this._setUniformValue(uniform.location, uniform.type, value);
  }

  setUniforms(uniformsObject) {
    this.use();
    for (const [name, value] of Object.entries(uniformsObject)) {
      this.setUniform(name, value);
    }
  }

  setTextures(textureMap) {
    this.use();
    const entries = textureMap instanceof Map ? 
      textureMap.entries() : Object.entries(textureMap);
      
    for (const [name, texture] of entries) {
      if (!this.textureUnits.has(name)) {
        this.textureUnits.set(name, this.nextTextureUnit++);
      }
      const unit = this.textureUnits.get(name);
      const location = this.gl.getUniformLocation(this.program, name);
      
      if (location) {
        this.gl.uniform1i(location, unit);
        this.gl.activeTexture(this.gl.TEXTURE0 + unit);
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        
        // Update our uniforms map
        this.uniforms.set(name, {
          location,
          type: this.gl.SAMPLER_2D,
          size: 1,
          value: texture
        });
      } else {
        console.warn(`Texture uniform '${name}' not found in shader.`);
      }
    }
  }

  setTexture(name, texture, unit = null, target = null) {
    this.use();
    
    if (unit === null) {
      if (!this.textureUnits.has(name)) {
        this.textureUnits.set(name, this.nextTextureUnit++);
      }
      unit = this.textureUnits.get(name);
    }
    
    const location = this.gl.getUniformLocation(this.program, name);
    if (location === null) {
      console.warn(`Texture uniform '${name}' not found in shader.`);
      return;
    }
    
    const textureTarget = target || this.gl.TEXTURE_2D;
    this.gl.uniform1i(location, unit);
    this.gl.activeTexture(this.gl.TEXTURE0 + unit);
    this.gl.bindTexture(textureTarget, texture);
    
    // Update our uniforms map
    this.uniforms.set(name, {
      location,
      type: textureTarget === this.gl.TEXTURE_2D ? this.gl.SAMPLER_2D : this.gl.SAMPLER_CUBE,
      size: 1,
      value: texture
    });
  }

  _setUniformValue(location, type, value) {
    const gl = this.gl;
    
    switch (type) {
      case gl.FLOAT:
        gl.uniform1f(location, value);
        break;
      case gl.FLOAT_VEC2:
        gl.uniform2fv(location, value);
        break;
      case gl.FLOAT_VEC3:
        gl.uniform3fv(location, value);
        break;
      case gl.FLOAT_VEC4:
        gl.uniform4fv(location, value);
        break;
      case gl.INT:
      case gl.BOOL:
        gl.uniform1i(location, value);
        break;
      case gl.INT_VEC2:
      case gl.BOOL_VEC2:
        gl.uniform2iv(location, value);
        break;
      case gl.INT_VEC3:
      case gl.BOOL_VEC3:
        gl.uniform3iv(location, value);
        break;
      case gl.INT_VEC4:
      case gl.BOOL_VEC4:
        gl.uniform4iv(location, value);
        break;
      case gl.FLOAT_MAT2:
        gl.uniformMatrix2fv(location, false, value);
        break;
      case gl.FLOAT_MAT3:
        gl.uniformMatrix3fv(location, false, value);
        break;
      case gl.FLOAT_MAT4:
        gl.uniformMatrix4fv(location, false, value);
        break;
      case gl.SAMPLER_2D:
      case gl.SAMPLER_CUBE:
        // Handled in setTexture/setTextures
        break;
      default:
        console.warn(`Unhandled uniform type: ${type}`);
    }
  }
  
  _valuesEqual(a, b) {
    if (a === b) return true;
    if (a === null || b === null) return false;
    
    // Handle arrays and typed arrays
    if ((Array.isArray(a) || ArrayBuffer.isView(a)) && 
        (Array.isArray(b) || ArrayBuffer.isView(b))) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
      }
      return true;
    }
    
    return false;
  }
  
  _cloneValue(value) {
    if (value === null) return null;
    if (typeof value !== 'object') return value;
    
    // Handle arrays
    if (Array.isArray(value)) {
      return [...value];
    }
    
    // Handle typed arrays
    if (ArrayBuffer.isView(value)) {
      return new (value.constructor)(value);
    }
    
    return value; // For WebGLTexture and other objects
  }

  getUniformLocation(name) {
    if (this.uniforms.has(name)) {
      return this.uniforms.get(name).location;
    }
    const location = this.gl.getUniformLocation(this.program, name);
    if (location !== null) {
      this.uniforms.set(name, {
        location,
        type: null, // Unknown until set
        size: 1,
        value: null
      });
    }
    return location;
  }

  getUniformsInfo() {
    return Object.fromEntries(this.uniforms);
  }

  compileShader(source, type) {
    const shader = this.gl.createShader(type);
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      throw new Error(`Shader compile error: ${this.gl.getShaderInfoLog(shader)}`);
    }

    return shader;
  }

  use() {
    this.gl.useProgram(this.program);
  }

  destroy() {
    this.gl.deleteProgram(this.program);
    this.uniforms.clear();
    this.textureUnits.clear();
  }
}

class FBO {
  constructor(gl, width, height, count = 1) {
    this.gl = gl;
    this.width = width;
    this.height = height;
    
    // Check float texture support
    this.floatSupported = gl.getExtension('EXT_color_buffer_float');
    
    // this.fbo = gl.createFramebuffer();
    // this.texture = this.createTexture();
    // this.setupFramebuffer();
    this.textures = new Array(count);
    this.init(count);
  }

  init(count) {
    const gl = this.gl;
    this.fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);

    for (let i = 0; i < count; i++) {
      this.textures[i] = this.createTexture();
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0 + i,
        gl.TEXTURE_2D,
        this.textures[i],
        0
      );
    }

    if (count > 1) {
      gl.drawBuffers(Array.from(
        { length: count },
        (_, i) => gl.COLOR_ATTACHMENT0 + i
      ));
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  createTexture() {
    const gl = this.gl;
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    
    const internalFormat = this.floatSupported ? gl.RGBA32F : gl.RGBA;
    const type = this.floatSupported ? gl.FLOAT : gl.UNSIGNED_BYTE;
    
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, this.width, this.height, 0, gl.RGBA, type, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    
    return texture;
  }

  // setupFramebuffer() {
  //   const gl = this.gl;
  //   gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
  //   gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture, 0);
  //   gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  // }

  begin() {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
  }

  end() {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  destroy() {
    const gl = this.gl;
    gl.deleteFramebuffer(this.fbo);
    gl.deleteTexture(this.texture);
  }
}

class Material {
  constructor(gl, vertexSource, fragmentSource) {
    this.shader = new Shader(gl, vertexSource, fragmentSource);
    this.properties = new Map();
    this.textures = new Map();
    this.wireframeEnabled = true;
    this.wireframeColor = [1.0, 1.0, 1.0, 1.0];
  }

  static createTexture(gl, image) {
    const texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    
    return texture;
  }

  static createDataTexture(gl, data, width, height) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(
        gl.TEXTURE_2D, 0, gl.RGBA32F, width, height, 0, gl.RGBA, gl.FLOAT, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tex;
  }

  setProperty(name, value) {
    this.properties.set(name, value);
    return this;
  }

  setTexture(name, texture) {
    this.textures.set(name, texture);
    return this;
  }

  setWireframe(enabled, color = null) {
    this.wireframeEnabled = enabled;
    if (color) {
      this.wireframeColor = color;
    }
    return this;
  }

  use() {
    this.shader.use();
    
    // Set all properties
    const uniforms = {};
    for (const [name, value] of this.properties.entries()) {
      uniforms[name] = value;
    }
    this.shader.setUniforms(uniforms);
    
    // Set all textures
    if (this.textures.size > 0) {
      this.shader.setTextures(this.textures);
    }
    
    return this.shader;
  }
}

export { Shader, FBO, Material };