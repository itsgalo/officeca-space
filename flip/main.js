//flip by office ca
//built for BuildFest '25 at the Bethel Woods Art and Architecture Festival

import { mat4, vec3, quat } from '../officeca-utils/pix/gl-matrix/index.js';
import FPS from '../officeca-utils/fps.js';
import { GIFEncoder, quantize, applyPalette } from '../officeca-utils/gifenc.esm.js';
import { cloneCanvas, lerp } from '../officeca-utils/ui-utils.js';
import { Material } from '../officeca-utils/pix/core/Shader.js';
import { InstanceCube } from '../officeca-utils/pix/geom/instanceCube.js';
import PixRenderer from '../officeca-utils/pix/core/PixRenderer.js';
import { IsometricCamera } from '../officeca-utils/pix/core/Camera.js';
import Scene from '../officeca-utils/pix/core/Scene.js';
import Object3D from '../officeca-utils/pix/core/Object3D.js';
import Flap from '../officeca-utils/flap.js';
import { shuffle } from '../officeca-utils/ui-utils.js';
import { GUI } from '../officeca-utils/lil-gui.module.min.js';

//shaders setup
//vs
let vs = `#version 300 es
layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec3 aNormal;
layout(location = 2) in vec2 aUV;
layout(location = 3) in vec4 color;
layout(location = 4) in vec3 instancePosition;
layout(location = 5) in vec4 instanceRotation;
layout(location = 6) in vec3 instanceScale;
layout(location = 7) in vec4 instanceColor;
layout(location = 8) in float aMove;

uniform mat4 uProjection;
uniform mat4 uView;
uniform mat4 uModel;
uniform float time;

out vec4 vColor;
out vec4 iColor;
out vec3 vNormal;
out vec3 vPos;
out vec2 vUV;

// Quaternion rotation function
vec3 rotateVector(vec4 q, vec3 v) {
    vec3 qv = q.xyz;
    float qs = q.w;
    return v + 2.0 * cross(qv, cross(qv, v) + qs * v);
}

void main() {
  // Apply instance transformations

  vec3 osc = vec3(
  0.0,//sin(time * 10.5 + aPosition.x + instanceColor.x * 6.28) * 0.5,
  sin(time * 54.5 + aPosition.x * 3.141 + instanceColor.x * time * 2.0) * 0.15,
  0.0//sin(time * 20.5 + aPosition.x + instanceColor.x * 6.28) * 0.5
  );

  vec3 pos = aPosition;

  vec3 transformed = pos * instanceScale;
  transformed = rotateVector(instanceRotation, transformed);
  transformed += instancePosition;

  gl_Position = uProjection * uView * uModel * vec4(transformed, 1.0);
  gl_PointSize = 4.0;

  // Transform normal by rotation quaternion
  vNormal = rotateVector(instanceRotation, aNormal);

  vPos = transformed;
  vUV = aUV;
  vColor = color;
  iColor = instanceColor;
}
`;

let fs = `#version 300 es

precision highp float;

in vec4 vColor;
in vec4 iColor;
in vec3 vNormal;
in vec3 vPos;
in vec2 vUV;

out vec4 fragColor;

uniform mat4 uModel;
uniform vec4 uColor;
uniform sampler2D uTex;
uniform float time;
uniform float uWire;

// R dither mask
float intensity(vec2 pixel) {
    const float a1 = 0.75487766624669276;
    const float a2 = 0.569840290998;
    //const float a1 = 0.75;
    //const float a2 = 0.25;
    return fract(a1 * pixel.x + a2 * pixel.y);
}

//interleaved gradient noise
float IGN(vec2 coords) {
    return mod(52.9829189 * mod(0.06711056 * float(coords.x) + 0.00583715 * float(coords.y), 1.0), 1.0);
}

float dither(vec2 coords, float color, float grey) {
    // Calculated noised gray value
    float noised = (2.0/grey) * (IGN(coords)) + color - (1.0/grey);
    // Clamp to the number of gray levels we want
    float levels = clamp(floor(grey * noised) / (grey-1.0), 0.0, 1.0);
    return levels;
}

//map range
float map(float value, float inMin, float inMax, float outMin, float outMax) {
    return outMin + (outMax - outMin) * (value - inMin) / (inMax - inMin);
}

void main() {
    vec3 lightDir = normalize(vec3(-1.0, 1.0, 1.0));
    //vec3 lightDir = normalize(mat3(uModel) * vec3(-1.0, -1.0, -1.0));

    //for flat shading
    vec3 U = dFdx(vPos);                     
    vec3 V = dFdy(vPos);                 
    vec3 normal = normalize(cross(U,V));

    vec4 tex = texture(uTex, vUV);//gl_PointCoord.xy

    //vec3 normal = normalize(vNormal);
    float diff = dot(normal, lightDir) * 1.95 + 0.5;

    float greyLvl = 2.0; // Number of gray levels
    vec2 xyPos = gl_FragCoord.xy;
    //vec3 col = vec3(dither(xyPos, diff*uColor.r, greyLvl), dither(xyPos, diff*uColor.g, greyLvl), dither(xyPos, diff*uColor.b, greyLvl));

    //vec3 col = vec3(dither(xyPos, tex.r, greyLvl), dither(xyPos, tex.g, greyLvl), dither(xyPos, tex.b, greyLvl));
    //col.rgb = pow(col, vec3(1.0/2.2));

    //float r = map( ((mod(vColor.r, 6.28318530718) / 6.28318530718) * 2.0 - 1.0), 0.0, 1.0, 0.0, 256.0);
    float r = map(vColor.r, 0.0, 255.0, 0.0, 256.0);
    float x = mod(r, 256.0); //0, 255
    float y = 0.0;
    float idx = floor(x / 8.0) * 8.0;
    float idy = floor(y / 8.0) * 8.0;
    vec4 col = texture(uTex, vUV / vec2(32.0, 1.0) + (vec2(idx, idy) / vec2(256.0, 8.0)));

    if (uWire == 0.0) {
      //face
      fragColor = vec4(vColor.rgb, 1.0);
    } else {
      //outline
      fragColor = vec4(0.0, 0.0, 0.0, 1.0);
    }
}
`;

let palette = new Array(
  255/255, 255/255, 255/255, // white
  224/255, 224/255, 224/255,
  192/255, 192/255, 192/255,
  160/255, 160/255, 160/255,
  128/255, 128/255, 128/255,
   96/255,  96/255,  96/255,
   64/255,  64/255,  64/255,
   48/255,  48/255,  48/255,
   32/255,  32/255,  32/255,
    0/255,   0/255,   0/255  // black
);

// let palette = new Array(
//   249/255, 65/255, 68/255,   // red
//   243/255, 114/255, 44/255,  // orange
//   248/255, 150/255, 30/255,  // yellow-orange
//   249/255, 132/255, 74/255,  // coral
//   249/255, 199/255, 79/255,  // yellow
//   144/255, 190/255, 109/255, // light green
//   67/255, 170/255, 139/255,  // teal
//   77/255, 144/255, 142/255,  // blue-green
//   87/255, 117/255, 144/255,  // blue-gray
//   39/255, 125/255, 161/255   // blue
// );

//canvas setup
let canvas2D = document.querySelector("#canvas2D");
canvas2D.width = window.innerWidth;
canvas2D.height = window.innerHeight;
let ctx2D = canvas2D.getContext('2d');
ctx2D.imageSmoothingEnabled = false; // Disable interpolation for sharp rendering

let canvas = document.querySelector("#canvasGL");
canvas.width = canvas2D.width;
canvas.height = canvas2D.height;

//init rendering system
let renderer, scene, camera, material;
let fps = new FPS(30, 300);
//GIF recorder settings
let frames = [];

let gui;
let params = {
  spin: false,
  gif: () => { makeGIF(); },
  png: () => { saveAsImage(); },
  fullscreen: () => { toggleFullscreen(); }
}

//event listeners
document.addEventListener('keydown', keyPress);
window.addEventListener('resize', handleResize);

let tileSize = 0.25;
let maxNum = 720;
let rows = 48;
let cols = 32;
let flaps = [];
let spinning = false;
//generate flap grid
for (let r = 0; r < rows; r++) {
  let row = [];
  for (let c = 0; c < cols; c++) {
    let index = r * cols + c;
    let flap = new Flap(index, maxNum, 0);
    
    // Initial staggered delays
    const delay = Math.sqrt(r * r + c * c) * 3;
    flap.setTarget(180);
    flap.setDelay(delay);
    
    flaps.push(flap);
    //row.push(flap);
  }
  //flaps.push(row);
}

let cubeGeometry = new InstanceCube({
  width: tileSize * 0.85,//0.05,
  height: tileSize * 0.85,//0.1,
  depth: 0.05//0.05
});

cubeGeometry.setFaceColor(0, [145/255, 0, 0, 1]); // Front face - red
cubeGeometry.setFaceColor(1, [255/255, 199/255, 120/255, 1]); // Back face - green  
cubeGeometry.setFaceColor(2, [145/255, 0, 0, 1]); // Left face - blue
cubeGeometry.setFaceColor(3, [255/255, 199/255, 120/255, 1]); // Right face - yellow
cubeGeometry.setFaceColor(4, [255/255, 199/255, 120/255, 1]); // Top face - magenta
cubeGeometry.setFaceColor(5, [145/255, 0, 0, 1]); // Bottom face - cyan

for (let r = 0; r < rows; r++) {
  let row = [];
  for (let c = 0; c < cols; c++) {
    let index = r * cols + c;

    cubeGeometry.addInstance(
      [
        r * tileSize - ((rows - 1) * tileSize) / 2,    // Center rows around 0
        c * tileSize - ((cols - 1) * tileSize) / 2,    // Center columns around 0
        0
      ],
      [0, 0, 0, 1],
      [1, 1, 1],
      //[0.05, 0.05, 0.95, 1]
      [Math.random(), Math.random(), Math.random(), 1]
    );
  }
}

function initGUI() {
  gui = new GUI();
  gui.title('Flip Controls');
  
  // Grid settings folder
  // const gridFolder = gui.addFolder('Grid Settings');
  // gridFolder.add(params, 'rows', 4, 64, 1).name('Rows').onChange(resetGeometry);
  // gridFolder.add(params, 'cols', 4, 32, 1).name('Columns').onChange(resetGeometry);
  // gridFolder.add(params, 'tileSize', 0.1, 0.5, 0.05).name('Tile Size').onChange(resetGeometry);
  // gridFolder.open();
  
  gui.add(params, 'spin').name('SPIN').onChange(spinBoolean);
  gui.add(params, 'fullscreen').name('FULLSCREEN');
  gui.add(params, 'gif').name('save GIF');
  gui.add(params, 'png').name('save PNG');
}

function spinBoolean() {
  spinning = !spinning;
}

initGUI();

function initRenderer() {
  // Initialize the modular renderer
  renderer = new PixRenderer(canvas);
  renderer.setClearColor(255/255, 199/255, 120/255, 1);
  
  // Create scene
  scene = new Scene();
  
  // Create camera
  camera = new IsometricCamera();
  //camera.lookAt([0, 0, 0], [0, 0, 0], [0, 1, 0]);

  // Create material
  material = new Material(renderer.gl, vs, fs);
  material.wireframeEnabled = true;
  
  // Set up background
  document.body.style.backgroundColor = `rgb(195, 58, 54)`;
  
  // Initialize geometries  
  cubeGeometry.initBuffers(renderer.gl);
  cubeGeometry.updateInstanceData(renderer.gl);

  let obj2 = new Object3D();
  obj2.geometry = cubeGeometry;
  obj2.material = material;

  //scene.add(obj1);
  scene.add(obj2);
  
  // Start the render loop
  draw();
}


//draw loop
function draw(time) {
  
  //animation control
  fps.stepTime(time);

  //time wrapper, corrects fps
  if (fps.delta > fps.interval) {

    //update time
    fps.updateTime(time);
    //document.title = `${fps.loopTime}`;

    // Update camera transform
    camera.translate([0, 0, 0]);

    const modelMatrix = mat4.create();
    mat4.scale(modelMatrix, modelMatrix, [0.3, 0.3, 0.3]);
    if (spinning) {
      mat4.rotateY(modelMatrix, modelMatrix, fps.loopTime);
    }

    material.setProperty("uProjection", camera.projectionMatrix);
    material.setProperty("uModel", modelMatrix);
    material.setProperty("uView", camera.viewMatrix);
    //material.setProperty("uColor", [1.0, 1.0, 0.0, 1.0]);
    material.setProperty("uWire", 1.0);
    //material.setProperty("time", fps.loopTime);

    // for (let i = 0; i < cubeGeometry.instanceScales.length; i += 3) {

    //   let flap = flaps[i / 3];
    //   cubeGeometry.instanceScales[i] = 1;
    //   cubeGeometry.instanceScales[i + 1] = 1;
    //   cubeGeometry.instanceScales[i + 2] = flap.current * 0.5;
    // }
    
    for (let i = 0; i < cubeGeometry.instanceRotations.length; i += 4) {

      let flap = flaps[i / 4];
      flap.flip();
      flap.update();

      const rot = quat.create();
      // Create axis perpendicular to direction and up vector
      const axis = vec3.fromValues(1, 1, 0);
      vec3.normalize(axis, axis);
      
      // Calculate angle from up vector (0, 1, 0) to direction
      //const radians = Math.acos( (flap.current / 360) * 2 * Math.PI );
      const radians = flap.current * Math.PI / 180;
      // Set quaternion from axis and angle
      quat.setAxisAngle(rot, axis, radians);

      cubeGeometry.instanceRotations[i] = rot[0];
      cubeGeometry.instanceRotations[i+1] = rot[1];
      cubeGeometry.instanceRotations[i+2] = rot[2];
      cubeGeometry.instanceRotations[i+3] = rot[3];

      if (fps.frameStep % 100 == 0) {
        // flap.setDelay(i / 2);
        // flap.setTarget(Math.floor((Math.random() * 360) / 180) * 180);
        setTargets();
      }
    }

    cubeGeometry.updateInstanceData(renderer.gl);

    renderer.render(scene, camera);

    //render to 2d
    ctx2D.clearRect(0, 0, canvas2D.width, canvas2D.height); // Clear the 2D canvas
    ctx2D.drawImage(canvas, 0, 0, canvas2D.width, canvas2D.height); // Copy WebGL canvas to 2D canvas

    //write frames to array (similar to RASTER)
    frames[fps.frameStep % 300] = cloneCanvas(canvas2D);

    //step frame last
    fps.frameStep++;

    // --- Stats ------------------
    //const fpsout = Math.round(fps.calcFPS(time));
    //document.querySelector('#log').innerHTML = "FPS: " + fpsout;
    let out = 'flip! by office ca + Fabio Castellanos\n';
    // out += 'Frame Rate: ' + Math.round(fps.calcFPS(time)) + '\n';
    // out += 'Total Time: ' + Math.round(fps.totalTime) + '\n';
    // out += 'Frame: ' + Math.round(fps.frameStep) + '\n'
    // out += 'Cycle: ' + Math.round(fps.cycle) + '\n';
    document.querySelector('#stats').innerHTML = out;

  }

  requestAnimationFrame(draw);
}

function handleResize() {
  // Update canvas dimensions
  canvas2D.width = window.innerWidth;
  canvas2D.height = window.innerHeight;
  ctx2D.imageSmoothingEnabled = false;
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// Arrays of pattern options
const targetPatterns = shuffle([
  'Random',
  'Wave',
  'Diagonal', 
  'Spiral',
  'Brick',
  //'Clear',
  'Checkerboard',
  'Vertical Stripes',
  'Horizontal Stripes',
  'Concentric Circles',
  'Corner Wave',
  //'Cross',
  //'X Pattern',
  'Pulse Wave',
  'Rain',
  'Diamond',
  'Random Row',
  'Random Column',
  'Gradient'
], Math.random()*999);

const delayPatterns = shuffle([
  'Center Outward', // Default center-based delay
  'Left To Right',
  'Right To Left',
  'Top To Bottom',
  'Bottom To Top',
  'Spiral Delay',
  'Random Delay',
  'Checkerboard Delay'
], Math.random()*999);

// Function to get a random pattern
function getRandomPattern() {
  const randomTargetPattern = targetPatterns[Math.floor(Math.random() * targetPatterns.length)];
  const randomDelayPattern = delayPatterns[Math.floor(Math.random() * delayPatterns.length)];
  return { targetPattern: randomTargetPattern, delayPattern: randomDelayPattern };
}

function getCyclePattern(idx) {
  const randomTargetPattern = targetPatterns[idx];
  const randomDelayPattern = delayPatterns[idx];
  return { targetPattern: randomTargetPattern, delayPattern: randomDelayPattern };
}

let count = 0;
// Modified setTargets function to support separate target and delay patterns
function setTargets(targetPattern, delayPattern) {
  const centerR = Math.floor(rows / 2);
  const centerC = Math.floor(cols / 2);

  count++;
  
  // If patterns aren't specified, pick random ones
  if (!targetPattern) {
    const randomPatterns = getRandomPattern();

    //const randomPatterns = getCyclePattern(count % targetPatterns.length);
    targetPattern = randomPatterns.targetPattern;
    delayPattern = randomPatterns.delayPattern;
  }
  
  // If only target pattern is specified, use default delay
  if (!delayPattern) {
    delayPattern = 'Spiral Delay';
  }
      
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let flap = flaps[r * cols + c];
      
      // Set target based on pattern
      switch (targetPattern) {
        case 'Random':
          flap.setTarget(Math.floor(Math.random() * maxNum));
          break;

      case 'Brick':
          let step = (r + r + r) % 4.0;

          if ((r % 4.0) == step) {
              flap.setTarget(128);
          } else if (c % 4 == step) {
              flap.setTarget(128);
          } else {
              flap.setTarget(0);
          }
          break;

        case 'Wave':
          let value = Math.floor((Math.sin((r + c) * 1.5) + 1) * (maxNum / 2));
          flap.setTarget(value);
          break;
          
        case 'Diagonal':
          flap.setTarget((r + c) % maxNum);
          break;
          
        case 'Spiral':
          // Adjustable spiral parameters
          const spiralTightness = 0.018;  // Controls how tightly wound the spiral is (lower = tighter)
          const spiralScale = 1.5;      // Scales the overall size of the spiral
          const spiralOffset = 0;       // Adds an offset to the values
          const spiralWrap = maxNum;    // How the values wrap around

          // Calculate distance from center with adjustable scale
          let dx = (c - centerC) * spiralScale;
          let dy = (r - centerR) * spiralScale;
          let distance = Math.sqrt(dx * dx + dy * dy);
          
          // Calculate angle in radians
          let angle = Math.atan2(dy, dx);
          if (angle < 0) angle += 2 * Math.PI;  // Convert to 0-2π range
          
          // Combine distance and angle for spiral pattern
          // The division by spiralTightness affects how quickly values change along the spiral
          let spiralValue = (distance / spiralTightness + angle / (Math.PI / 8)) + spiralOffset;
          
          // Set target with wrapping
          flap.setTarget(Math.floor(spiralValue) % spiralWrap);
          break;
          
        case 'Clear':
          flap.setTarget(0);
          break;
          
        case 'Checkerboard':
          // Adjustable parameters
          const squareSize = 2;     // Size of each square (2 means 2x2 cells per square)
          const value1 = 0;         // First checkerboard value
          const value2 = 128;         // Second checkerboard value
          
          // Calculate which square this cell belongs to
          const squareRow = Math.floor(r / squareSize);
          const squareCol = Math.floor(c / squareSize);
          
          // Determine if this is a "black" or "white" square
          const isAlternateSquare = (squareRow + squareCol) % 2 === 0;
          
          // Set the target based on which square this cell is in
          flap.setTarget(isAlternateSquare ? value1 : value2);
          break;
          
        case 'Vertical Stripes':
          flap.setTarget(c % 2 * 128);
          break;
          
        case 'Horizontal Stripes':
          flap.setTarget(r % 2 * 128);
          break;
          
        case 'Concentric Circles':
          let dist = Math.round(Math.sqrt(Math.pow(r - centerR, 2) + Math.pow(c - centerC, 2)));
          flap.setTarget(dist % maxNum/4);
          break;
          
        case 'Corner Wave':
          let cornerDist = Math.sqrt(r * r + c * c);
          flap.setTarget(Math.floor(cornerDist) % maxNum);
          break;
          
        case 'Cross':
          // Adjustable thickness
          const crossThickness = 2; // Number of cells thick (odd number recommended)
          const crossValue = 2;     // Value to display in the cross
          const bgValue = 255;        // Background value
          
          // Calculate half thickness for centered cross
          const halfThick = Math.floor(crossThickness / 2);
          
          // Check if within the thickness range of either axis
          if (Math.abs(r - centerR) <= halfThick || Math.abs(c - centerC) <= halfThick) {
              flap.setTarget(crossValue);
          } else {
              flap.setTarget(bgValue);
          }
          break;
          
        case 'X Pattern':
          // Adjustable thickness
          const xThickness = 2;   // How many cells thick in each direction
          const xValue = 2;       // Value to display in the X
          const xBgValue = 255;     // Background value
          
          // Check if within range of either diagonal
          // First diagonal: r-c = constant
          // Second diagonal: r+c = constant
          if (Math.abs(r - c - (centerR - centerC)) <= xThickness || 
              Math.abs(r + c - (centerR + centerC)) <= xThickness) {
              flap.setTarget(xValue);
          } else {
              flap.setTarget(xBgValue);
          }
          break;
          
        case 'Sawtooth':
          // Adjustable parameters
          const sawtoothFrequency = 0.2;  // Controls frequency of the wave (lower = wider teeth)
          const sawtoothAmplitude = maxNum - 128; // Height of the wave
          const sawtoothDirection = 'diagonal'; // 'horizontal', 'vertical', or 'diagonal'
          const sawtoothPhase = 0; // Shift the pattern
          
          let position;
          
          // Calculate position based on direction
          switch(sawtoothDirection) {
              case 'horizontal':
              position = c + sawtoothPhase;
              break;
              case 'vertical':
              position = r + sawtoothPhase;
              break;
              case 'diagonal':
              default:
              position = r + c + sawtoothPhase;
              break;
          }
          
          // Calculate sawtooth wave value
          // The formula creates a sawtooth pattern that ranges from 0 to sawtoothAmplitude
          const sawtoothValue = (position * sawtoothFrequency) % 1.0; // Create repeating pattern from 0 to 1
          const v = Math.floor(sawtoothValue * sawtoothAmplitude);
          
          flap.setTarget(v);
          break;
          
        case 'Pulse Wave':
          let phaseOffset = Math.sin(r * 0.3) + Math.cos(c * 0.3);
          flap.setTarget(Math.floor((phaseOffset + 2) * maxNum / 4));
          break;
          
        case 'Rain':
          flap.setTarget(Math.floor(Math.random() * maxNum * (r / rows)));
          break;
          
        case 'Diamond':
          let diamondDist = (Math.abs(r - centerR) + Math.abs(c - centerC)) * 0.10;
          flap.setTarget(diamondDist % maxNum);
          break;
          
        case 'Random Row':
          flap.setTarget(Math.floor(Math.random() * maxNum * ((r % 2) + 1) / 2));
          break;
          
        case 'Random Column':
          flap.setTarget(Math.floor(Math.random() * maxNum * ((c % 2) + 1) / 2));
          break;
          
        case 'Gradient':
          flap.setTarget(Math.floor((r * c) / (rows * cols) * maxNum));
          break;
      }
      
      // Set delay based on pattern
      switch (delayPattern) {
        case 'Center Outward':
          // Default center-based delay
          let centerDistance = Math.sqrt(Math.pow(r - centerR, 2) + Math.pow(c - centerC, 2));
          flap.setDelay(centerDistance * 2);
          break;

        case 'None':
          flap.setDelay(0);
          break;

        case 'Left To Right':
          flap.setDelay(c * 2);
          break;
          
        case 'Right To Left':
          flap.setDelay((cols - c - 1) * 2);
          break;
          
        case 'Top To Bottom':
          flap.setDelay(r * 2);
          break;
          
        case 'Bottom To Top':
          flap.setDelay((rows - r - 1) * 2);
          break;
          
        case 'Spiral Delay':
          let angle = Math.atan2((r - centerR), (c - centerC));
          let spiralDist = Math.sqrt(Math.pow(r - centerR, 2) + Math.pow(c - centerC, 2));
          let spiralPosition = spiralDist + (angle / (2 * Math.PI)) * 1;
          flap.setDelay(spiralPosition * 2);
          break;
          
        case 'Random Delay':
          flap.setDelay(Math.random() * 128);
          break;
          
        case 'Checkerboard Delay':
          // flap.setDelay(((r + c) % 2) * 128);
          // break;

          // Adjustable parameters
          const squareSize = 2;     // Size of each square (2 means 2x2 cells per square)
          const value1 = 0;         // First checkerboard value
          const value2 = 128;         // Second checkerboard value
          
          // Calculate which square this cell belongs to
          const squareRow = Math.floor(r / squareSize);
          const squareCol = Math.floor(c / squareSize);
          
          // Determine if this is a "black" or "white" square
          const isAlternateSquare = (squareRow + squareCol) % 2 === 0;
          
          // Set the target based on which square this cell is in
          flap.setDelay(isAlternateSquare ? value1 : value2);
          break;
      }
    }
  }
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    // Enter fullscreen
    document.documentElement.requestFullscreen().catch(err => {
      console.error(`Error attempting fullscreen: ${err.message}`);
    });
  } else {
    // Exit fullscreen
    document.exitFullscreen();
  }
}

//GIF download functions
function keyPress(e) {
  if (e.key === 'g') {
      if (frames.length == 300) {
          makeGIF();
      } else {
          alert("Not all frames recorded, yet. Please let the canvas run for a bit longer. For best results let the piece run for at least 10 seconds.")
      }
  }
  if (e.key === 's') {
    saveAsImage();
  }
}

function saveAsImage() {
  let imgData, imgNode;
  try {
      let str = "image/png";
      imgData = canvas2D.toDataURL(str, 1.0);
      saveFile(imgData.replace(str, 'image/octet-stream'), "flip.png");
  } catch (e) {
      console.log(e);
      return;
  }
}

function saveFile(strData, filename) {
  let link = document.createElement('a');
  if (typeof link.download === 'string') {
      document.body.appendChild(link); //Firefox requires the link to be in the body
      link.download = filename;
      link.href = strData;
      link.click();
      document.body.removeChild(link); //remove the link when done
  } else {
      location.replace(uri);
  }
}

function download(buf, filename, type) {
  const blob = buf instanceof Blob ? buf : new Blob([buf], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
};

async function makeGIF() {

  const gif = GIFEncoder();
  for (let i = 0; i < 300; i++) {
      const context = frames[i].getContext('2d');
      const data = context.getImageData(0, 0, frames[i].width, frames[i].height).data;
      const format = "rgb444";
      const palette = quantize(data, 10, { format });
      const index = applyPalette(data, palette, format);
      gif.writeFrame(index, frames[i].width, frames[i].height, { palette, delay: 30 });
      await new Promise(resolve => setTimeout(resolve, 0));
  }

  gif.finish();
  const buffer = gif.bytesView();
  download(buffer, 'flip.gif', { type: 'image/gif' });

}

initRenderer();