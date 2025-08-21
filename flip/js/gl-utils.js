//misc webgl2 utils

const defaultShaderType = [
  "VERTEX_SHADER",
  "FRAGMENT_SHADER",
];

function loadShader(gl, shaderSource, shaderType) {
  // Create the shader object
  const shader = gl.createShader(shaderType);

  // Load the shader source
  gl.shaderSource(shader, shaderSource);

  // Compile the shader
  gl.compileShader(shader);

  // Check the compile status
  const compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (!compiled) {
    // Something went wrong during compilation; get the error
    const lastError = gl.getShaderInfoLog(shader);
    console.log(`Error compiling shader: ${lastError}`);
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

function createProgram(gl, shaders, opt_attribs, opt_locations, opt_errorCallback) {
  const program = gl.createProgram();
  shaders.forEach(function(shader) {
    gl.attachShader(program, shader);
  });
  if (opt_attribs) {
    opt_attribs.forEach(function(attrib, ndx) {
      gl.bindAttribLocation(
          program,
          opt_locations ? opt_locations[ndx] : ndx,
          attrib);
    });
  }
  gl.linkProgram(program);

  // Check the link status
  const linked = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (!linked) {
      // something went wrong with the link
      const lastError = gl.getProgramInfoLog(program);
      console.log(`Error in program linking: ${lastError}`);

      gl.deleteProgram(program);
      return null;
  }
  return program;
}


function createProgramFromSources(
    gl, shaderSources, opt_attribs, opt_locations, opt_errorCallback) {
  const shaders = [];
  for (let ii = 0; ii < shaderSources.length; ++ii) {
    shaders.push(loadShader(
        gl, shaderSources[ii], gl[defaultShaderType[ii]], opt_errorCallback));
  }
  return createProgram(gl, shaders, opt_attribs, opt_locations, opt_errorCallback);
}


function resizeCanvasToDisplaySize(canvas, multiplier) {
  multiplier = multiplier || 1;
  const width  = canvas.clientWidth  * multiplier | 0;
  const height = canvas.clientHeight * multiplier | 0;
  if (canvas.width !== width ||  canvas.height !== height) {
    canvas.width  = width;
    canvas.height = height;
    return true;
  }
  return false;
}

export {loadShader, createProgram, createProgramFromSources, resizeCanvasToDisplaySize}
