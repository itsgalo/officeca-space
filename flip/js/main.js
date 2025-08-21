import FPS from './fps.js'
import Pointer from './pointer.js'
import Image from './image.js'
import Flap from './flap.js';
import { GIFEncoder, quantize, applyPalette } from './gifenc.esm.js';

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

//Mini Array Vector Lib
//vector defined as [x, y, z]

// vec3 add a + b
function v3Add(a, b) {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

// vec3 add a - b
function v3Sub(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

// vec3 mult a * b
function v3Scale(a, b) {
  return [a[0] * b, a[1] * b, a[2] * b];
}

function v3Mult(a, b) {
  return [a[0] * b[0], a[1] * b[1], a[2] * b[2]];
}

//length of 3d vector a
function v3Length(a) {
  return Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]);
}

//dot product a dot b
function v3Dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

//cross product a cross b
function v3Cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

//normalize vector a
function v3Normalize(a) {
  let r = [];
  let n = v3Length(a);
  if (n > 0.00001) {
    r = [a[0] / n, a[1] / n, a[2] / n];
  } else {
    r = [0, 0, 0];
  }
  return r;
}

function v3Reflect(v, n) {
  let dotProduct = v3Dot(v, n);
  let scaledNormal = v3Scale(n, 2 * dotProduct);
  return v3Sub(v, scaledNormal);
}

function app(){

    const rows = 32;
    const cols = 10;
    const MAX_NUM = rows * cols;
    const TAU = Math.PI * 2;

    const points = new Float32Array(MAX_NUM * 3);
    const off = new Array(MAX_NUM);
    const flaps = [];//new Array(MAX_NUM);
    const flapSize = 32;

    const maxNum = 255;

    const canvas  = document.querySelector('canvas');
    //const gl = canvas.getContext('webgl');
    let devicePixelRatio = window.devicePixelRatio || 1;
    let divider = 16;
    let w, h;
    //window.innerHeight <= window.innerWidth ? (w = Math.max(window.innerHeight, 1) * 1.0, h = Math.max(window.innerHeight, 1)) : (w = Math.max(window.innerWidth, 1), h = Math.max(window.innerWidth, 1) / 1.0);
    w = rows * flapSize;// window.innerWidth;
    h = cols * flapSize;//window.innerHeight;
    canvas.width = Math.floor(w / divider) * divider;
    canvas.height = Math.floor(h / divider) * divider;
    console.log(canvas.width, canvas.height)
    const gl = canvas.getContext('webgl2', { antialias: false, preserveDrawingBuffer: true, premultipliedAlpha: false, alpha: true });
    //gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    canvas.style.imageRendering = "pixelated";
    canvas.imageSmoothingEnabled = false;

    //drawing canvas
    const drawCan = document.createElement('canvas');
    const ctx = drawCan.getContext('2d', { alpha: true, willReadFrequently: true});
    drawCan.style.imageRendering = "pixelated";
    drawCan.style.textRendering = "geometricPrecision";
    drawCan.imageSmoothingEnabled = false;
    drawCan.width = rows;
    drawCan.height = cols;

    //handles rendering
    document.body.appendChild(drawCan);
    drawCan.style.display = 'none';

    const pointer = Pointer.init(canvas);

    //new time/frame handler
    const fps = new FPS(30, 300);
    let saveframes = false;
    let fs = 1;
    let imgs = [];
    let hasBeenCaptured = false;

    const grid = 8;

    let shader_program, glTexture, drawTexture;
    const glBuffer = gl.createBuffer();

    const tex = Image.load("assets/ascii.png", function(){
        start();
        requestAnimationFrame(loop);
    });

    //keypressed
    document.addEventListener('keydown', keyPress);

    console.log(tex);

    // let palette = new Array(
    //   249/255, 65/255, 68/255,
    //   243/255, 114/255, 44/255,
    //   248/255, 150/255, 30/255,
    //   249/255, 132/255, 74/255,
    //   249/255, 199/255, 79/255,
    //   144/255, 190/255, 109/255,
    //   67/255, 170/255, 139/255,
    //   77/255, 144/255, 142/255,
    //   87/255, 117/255, 144/255,
    //   39/255, 125/255, 161/255
    // );

    let palette = new Array(
      0/255, 48/255, 73/255,
      214/255, 40/255, 40/255,
      247/255, 127/255, 0/255,
      252/255, 191/255, 73/255,
      234/255, 226/255, 183/255,
      244/255, 241/255, 222/255,
      224/255, 192/255, 95/255,
      61/255, 64/255, 91/255,
      129/255, 178/255, 154/255,
      242/255, 204/255, 143/255
    );

    function shuffle(array, seed) {
        let m = array.length, t, i;
        //deterministic seed function
        let seedFunc = function() {
            let x = Math.sin(seed++) * 10000;
            return x - Math.floor(x);
        };
        // While there remain elements to shuffle…
        while (m) {
          // Pick a remaining element…
          i = Math.floor(seedFunc() * m--);
          // And swap it with the current element.
          t = array[m];
          array[m] = array[i];
          array[i] = t;
        }
        return array;
      }

    function snapToPt(pt) {
        let cell = Math.round(pt / (grid));
        return cell * (grid);
    }

    function map(n, start1, stop1, start2, stop2, withinBounds) {
        const newval = (n - start1) / (stop1 - start1) * (stop2 - start2) + start2;
        if (!withinBounds) {
          return newval;
        }
        if (start2 < stop2) {
          return constrain(newval, start2, stop2);
        } else {
          return constrain(newval, stop2, start2);
        }
    }

    function divideRect(x, y, w, h, n) {

        if (n == 0) {
            ctx.save();
            ctx.fillStyle = `rgb(${Math.floor(Math.random()*255)}, 0, 0)`;
            //ctx.lineWidth = 0.1;

            //ctx.translate(x, y);
            ctx.fillRect(x, y, w, h);
            ctx.restore();
        }

        n--;

        if (n >= 0) {
            if (w >= h) {
                let randomW = Math.random() * (w * 0.7) + (w * 0.3);
                divideRect(x, y, randomW, h, n);
                divideRect(x + randomW, y, w - randomW, h, n);
            }

            if (w < h) {
                let randomH = Math.random() * (h * 0.7) + (h * 0.3);
                divideRect(x, y, w, randomH, n);
                divideRect(x, y + randomH, w, h - randomH, n);
            }
        }
    }

    function start(){

        // const w = Math.floor(gl.canvas.clientWidth);
        // const h = Math.floor(gl.canvas.clientHeight);

        ctx.fillStyle = `rgb(205, 0, 0)`;
        ctx.fillRect(0, 0, 64, 64);

        ctx.fillStyle = `rgb(${Math.floor(Math.random()*255)}, 0, 0)`;
        ctx.font = "8px ibm";
        ctx.textBaseline = "top";
        ctx.fillText(`1234`, 0, 0);
        ctx.fillText(`XXXX`, 0, 16);
        ctx.fillText(`text`, 0, 32);
        ctx.fillText(`mode`, 0, 48);

        //divideRect(0, 0, drawCan.width, drawCan.height, 6);

        points.fill(0)

        for (let r = 0; r < rows; r++) {
            let row = [];
            for (let c = 0; c < cols; c++) {
              let index = r * cols + c;
              let flap = new Flap(index, 255, 0);
              
              // Initial staggered delays
              const delay = Math.sqrt(r * r + c * c) * 3;
              flap.setDelay(delay);
              
              row.push(flap);
            }
            flaps.push(row);
        }

        // for (let i=0; i<MAX_NUM; i++){
        //     //   let x = i % (canvas.width / 8);
        //     //   let y = Math.floor(i / (canvas.width / 8));
        //     //   return [x*8, canvas.height - y*8, 0, 0]
        //     const x = Math.floor(i % (canvas.width) / 16);
        //     const y = Math.floor(i / (canvas.width) / 16);

        //     const cx = Math.floor(i % (Math.floor(64)));
        //     const cy = Math.floor(i / (Math.floor(64)));

        //     //const z = tex.getColor((x/1 + time *0.01) % 80, (y/1) % 8 - 1);

        //     const pixel = ctx.getImageData(cx, cy, 1, 1);
        //     const data = pixel.data;

        //     flaps[i] = new Flap(Math.floor(i % 12), 255, Math.floor(Math.random() * 80));
            
        //     //flaps[i].setRandom();
        //     //flaps[i].setDelay(i % 50);
        //     //flaps[i].setDelay(0);
        //     //flaps[i].setTarget(data[0]);

        //     //off[i] = Math.floor(Math.random() * 80); //random number for character

        //     //points[i*3    ] = x * 16 + 8;
        //     //points[i*3 + 1] = y * 16 + 8;
        //     //points[i*3 + 2] = flaps[i].out;//Math.floor(Math.random()*1024); //random number for character
        // }

        //console.log(flaps)

        // --- Shaders ------------------
        const vs = `#version 300 es
        precision mediump float;

        uniform vec2 screen_size;
        uniform float pixel_ratio;
        uniform float screen_aspect;
        uniform float time;

        in vec3 a_sprite_pos;
        out vec3 pos;

        void main() {
            pos = a_sprite_pos;
            vec4 screenTransform = vec4(2.0 / screen_size.x, -2.0 / screen_size.y, -1.0, 1.0);
            gl_Position  = vec4(a_sprite_pos.xy * screenTransform.xy + screenTransform.zw, 0.0, 1.0);
            //gl_Position = vec4(a_sprite_pos.x * screen_aspect, a_sprite_pos.y,  0.0, 1.0);
            gl_PointSize = 32.0 * pixel_ratio;
        }
        `;

        const fs = `#version 300 es
        precision mediump float;

        uniform sampler2D spriteTexture;
        uniform sampler2D drawTexture;
        uniform vec2 screen_size;
        uniform vec3 colors[10];
        uniform float time;

        in vec3 pos;
        out vec4 outColor;

        // All components are in the range [0…1], including hue.
        vec3 rgb2hsv(vec3 c)
        {
            vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
            vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
            vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));

            float d = q.x - min(q.w, q.y);
            float e = 1.0e-10;
            return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
        }

        // All components are in the range [0…1], including hue.
        vec3 hsv2rgb(vec3 c)
        {
            vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
            vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
            return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
        }

        vec3 closestColor(vec3 color) {
            vec3 targetHSV = rgb2hsv(color);

            vec3 closest = colors[0];
            float minDist = 999.0;
          
            //float dmin = distance(idealColor, color0);
          
            for (int i = 0; i < 10; i++) {
                vec3 col = colors[i];
                vec3 colHSV = rgb2hsv(col);
                
                float dr = abs(color.r - col.r);
                float dg = abs(color.g - col.g);
                float db = abs(color.b - col.b);
                
                float dist = sqrt(dr * dr + dg * dg + db * db);
                
                if (dist < minDist) {
                    closest = col;
                    minDist = dist;
                }
            }
            return closest;
        }

        //map range
        float map(float value, float inMin, float inMax, float outMin, float outMax) {
            return outMin + (outMax - outMin) * (value - inMin) / (inMax - inMin);
        }

        vec2 getValueFrom2DAs1DArray(vec2 dimensions, float index) {
            float y = floor(index / dimensions.x);
            float x = mod(index, dimensions.x);
            vec2 texcoord = (vec2(x, y) + 0.5) / dimensions;
            return texcoord;
            }

        void main() {
            //img is 256 x 128 so scale is x 256 / 8, y 128 / 8
            //gl_PointCoord is normalised (coordinates range from 0.0 to 1.0, so 1.0 is the width of the point), 
            //while gl_FragCoord is in pixels (coordinates range from 0.0 to the width/height of the window, 
            //and 1.0 is the width/height of a single pixel)

            //float t = floor(time * 0.5);

            //vec2 spriteUV = gl_FragCoord.xy / vec2(80.0, 8.0);

            //vec4 spriteCoords = texture2D(drawTexture, vuv / 16.0); //scale must be a multiple of 32.0 (sprite size)

            float r = map(pos.z, 0.0, 255.0, 0.0, 256.0);
            float x = mod(r, 256.0); //0, 255
            //float y = floor((spriteCoords.r) / 8.0);
            float y = 0.0;//map(spriteCoords.r, 0.0, 1.0, 0.0, 8.0);
            float idx = floor(x / 8.0) * 8.0;
            float idy = floor(y / 8.0) * 8.0;
            //vec2 index = pos.xy * vec2(256.0, 8.0);

            //gl_PointCoord / vec2(32.0, 4.0) this is the aspect ratio of the character map image 32 cols by 4 rows
            //( vec2(idx, idy) / vec2(256.0, 32.0)) character offset coordinates, img is 256 x 32 pixels

            vec4 col = texture(spriteTexture, gl_PointCoord / vec2(32.0, 1.0) + (vec2(idx, idy) / vec2(256.0, 8.0)));

            //vec4 col = texture2D(spriteTexture, gl_PointCoord / vec2(32.0, 4.0) + (vec2(mod(idx, 32.0), mod(idy, 32.0)) / vec2(256.0, 32.0)));
            //gl_FragColor = vec4(vec3(0.0, pos.z/256.0, 0.0), 1.0) + col;
            //outColor = vec4(x / 256.0, 0.0, y / 32.0, 1.0);
            //outColor = vec4(0.0, 0.0, 1.0, 1.0);
            outColor = vec4(closestColor(col.rgb), 1.0);
        }
        `;

        function loadShader(gl, type, source) {
            const shader = gl.createShader(type);
            gl.shaderSource(shader, source);
            gl.compileShader(shader);

            const status = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
            if (!status) {
                throw new TypeError(`Shader ERROR:\n${gl.getShaderInfoLog(shader)}`);
            }
            return shader;
        }

        const vertex_shader   = loadShader(gl, gl.VERTEX_SHADER, vs);
        const fragment_shader = loadShader(gl, gl.FRAGMENT_SHADER, fs);

        shader_program = gl.createProgram();
        gl.attachShader(shader_program, vertex_shader);
        gl.attachShader(shader_program, fragment_shader);
        gl.linkProgram(shader_program);

        const status = gl.getProgramParameter(shader_program, gl.LINK_STATUS);
        if (!status) {
            throw new TypeError(`Shader ERROR (status=${status}): ${gl.getProgramInfoLog(shader_program)}`);
        }

        gl.useProgram(shader_program);


        // --- Buffers ------------------
        //ascii text texture
        glTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, glTexture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tex.img);
        //gl.generateMipmap(gl.TEXTURE_2D);

        //drawing texture
        drawTexture = gl.createTexture();
        drawTexture.image = drawCan;
        gl.bindTexture(gl.TEXTURE_2D, drawTexture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        //gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, drawCan);

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    }

    let toggle = false;

    function cloneCanvas(can) {
        //create a new canvas
        let ncan = document.createElement('canvas');
        let nctx = ncan.getContext('2d');
        //set dimensions
        ncan.width = can.width;
        ncan.height = can.height;
        //apply the old canvas to the new one
        nctx.drawImage(can, 0, 0);
        //return the new canvas
        return ncan;
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

        // Setup an encoder that we will write frames into
        const gif = GIFEncoder();

        // We use for 'of' to loop with async await
        for (let i = 0; i < fps.totalFrames; i++) {

            //get context
            const context = imgs[i].getContext('2d');

            // Get RGBA data from canvas
            const data = context.getImageData(0, 0, imgs[i].width, imgs[i].height).data;

            // Choose a pixel format: rgba4444, rgb444, rgb565
            const format = "rgb444";

            // If necessary, quantize your colors to a reduced palette
            const palette = quantize(data, 10, { format });

            // Apply palette to RGBA data to get an indexed bitmap
            const index = applyPalette(data, palette, format);

            // Write frame into GIF
            gif.writeFrame(index, imgs[i].width, imgs[i].height, { palette, delay: 30 });

            // Wait a tick so that we don't lock up browser
            await new Promise(resolve => setTimeout(resolve, 0));
        }

        // Finalize stream
        gif.finish();

        // Get a direct typed array view into the buffer to avoid copying it
        const buffer = gif.bytesView();
        download(buffer, 'ASCII.gif', { type: 'image/gif' });

    }

    function keyPress(e) {
        if (e.key === 's') {
            saveAsImage();
        }
        if (e.key === 'z') {
            targetFPS = 3;
            frameStep = 0;
            saveframes = true;
        }
        if (e.key === 'q') {
            targetFPS = 30;
            saveframes = false;
        }
        if (e.key === 'g') {
            console.log('grab!')
            if (imgs.length == fps.totalFrames) {
                makeGIF();
            } else {
                alert("Not all frames recorded, yet. Please let the canvas run for a bit longer. For best results let the piece run for at least 10 seconds.")
            }
        }
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
    'Cross',
    'X Pattern',
    'Noise',
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

  function circleSDF(x, y, centerX = 0, centerY = 0, radius = 1) {
    // Create position vector [x, y, 0] (using z=0 for 2D)
    const pos = [x, y, 0];
    
    // Create center vector [centerX, centerY, 0]
    const center = [centerX, centerY, 0];
    
    // Calculate vector from center to point
    const offset = v3Sub(pos, center);
    
    // Calculate distance from center to point
    const distance = v3Length(offset);
    
    // Return signed distance (distance from point to circle edge)
    return distance - radius;
  }

  function circleStep(x, y, centerX = 0, centerY = 0, radius = 1, smoothness = 0.0) {
    const sdf = circleSDF(x, y, centerX, centerY, radius);
    
    if (smoothness <= 0) {
      // Hard edge
      return sdf <= 0 ? 1.0 : 0.0;
    } else {
      // Smoothstep for anti-aliasing
      return 1.0 - Math.max(0, Math.min(1, sdf / smoothness));
    }
  }
  
  let count = 0;
  // Modified setTargets function to support separate target and delay patterns
  function setTargets(targetPattern, delayPattern) {
    const centerR = Math.floor(rows / 2);
    const centerC = Math.floor(cols / 2);

    count++;
    
    // If patterns aren't specified, pick random ones
    if (!targetPattern) {
      //const randomPatterns = getRandomPattern();

      const randomPatterns = getCyclePattern(count % targetPatterns.length);
      targetPattern = randomPatterns.targetPattern;
      delayPattern = randomPatterns.delayPattern;
    }
    
    // If only target pattern is specified, use default delay
    if (!delayPattern) {
      delayPattern = 'Spiral Delay';
    }
        
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        let flap = flaps[r][c];
        
        // Set target based on pattern
        switch (targetPattern) {
          case 'Random':
            flap.setTarget(Math.floor(Math.random() * maxNum));
            break;

          case 'SDF':
            flap.setTarget(circleStep(r+0.5, c+0.5, centerR+Math.cos(fps.loopTime)*16, centerC+Math.sin(fps.loopTime)*16, 2 * Math.abs(Math.sin(fps.loopTime)), 29)*255);
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
          
          case 'Noise':
            flap.setTarget(nz(r, c, 0, 0.1, 10, 3) * 255+128);
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
            const sawtoothFrequency = 0.02;  // Controls frequency of the wave (lower = wider teeth)
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

    function loop(time) {

        // --- Resize ------------------
        const ratio  = 1.0;//window.devicePixelRatio;
        const w = canvas.width;
        const h = canvas.height;

        //animation control
        fps.stepTime(time);

        //time wrapper, corrects fps
        if (fps.delta > fps.interval) {

            //update time
            fps.updateTime(time);

            gl.viewport(0, 0, canvas.width, canvas.height);
            gl.uniform2f(gl.getUniformLocation(shader_program, 'screen_size'), w, h);
            gl.uniform1f(gl.getUniformLocation(shader_program, 'screen_aspect'), h / w);
            gl.uniform1f(gl.getUniformLocation(shader_program, 'pixel_ratio'), ratio);
            gl.uniform1f(gl.getUniformLocation(shader_program, 'time'), fps.loopTime);
            gl.uniform3fv(gl.getUniformLocation(shader_program, "colors"), palette);

            // --- Update ------------------

            // for (const flap of flaps) {
            //     flap.flip();
            //     flap.update();
            // }

            if (fps.frameStep % 60 == 0) {
                //divideRect(0, 0, drawCan.width, drawCan.height, 6);
            }

            const gradient = ctx.createLinearGradient(0, 64, 0, 0);

            // Add three color stops
            gradient.addColorStop(0, "white");
            gradient.addColorStop(0.5, "black");
            gradient.addColorStop(1, "white");

            ctx.clearRect(0, 0, 64, 64);
            //ctx.fillStyle = gradient;
            ctx.fillStyle = `rgb(128, 0, 0)`;
            //ctx.fillRect(0, 0, 32, 32);
            //ctx.fillRect(16+Math.cos(fps.loopTime) * 16, 16+Math.sin(fps.loopTime) * 16, 32, 32);

            //ctx.fillRect(16+Math.cos(fps.loopTime+30) * 16, 16+Math.sin(fps.loopTime) * 16, 32, 32);

            // ctx.strokeStyle = 'rgb(32, 0, 0)';
            // ctx.lineWidth = 20;

            // ctx.beginPath();
            // ctx.arc(32+Math.cos(fps.loopTime) * 16, 32+Math.sin(fps.loopTime) * 16, Math.abs(Math.sin(fps.loopTime) * 16), 0, 2 * Math.PI);
            // ctx.stroke();

            ctx.beginPath();
            ctx.arc(32+Math.cos(fps.loopTime+30) * 16, 32+Math.sin(fps.loopTime+30) * 16, Math.abs(Math.sin(fps.loopTime+15) * 32), 0, 2 * Math.PI);
            ctx.fill();

            points.fill(0);

            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                  let flap = flaps[r][c];
                    flap.flip();
                    flap.update();

                    let index = r * cols + c;
                    //let point = points[index];  // or points[index] = someValue;
                    points[index*3    ] = r * (flapSize) + (flapSize/2);//offset because point is on center // 32 + 16 for 32x32 grid
                    points[index*3 + 1] = c * (flapSize) + (flapSize/2);
                    points[index*3 + 2] = flap.current;
                }
            }

            // --- Send data ------------------
            gl.bindBuffer(gl.ARRAY_BUFFER, glBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, points, gl.DYNAMIC_DRAW);  // upload data

            const loc = gl.getAttribLocation(shader_program, 'a_sprite_pos');
            gl.enableVertexAttribArray(loc);
            gl.vertexAttribPointer(
                loc,
                3,          // x, y, radius
                gl.FLOAT,   // vec3 contains floats
                false,      // ignored
                0,          // each value is next to each other
                0           // starts at start of array
            );

            // --- Draw ------------------
            gl.clearColor(0.0, 0.0, 0.0, 1.0);
            gl.clear(gl.COLOR_BUFFER_BIT);

            gl.uniform1i(gl.getUniformLocation(shader_program,"spriteTexture"), 0);
            gl.uniform1i(gl.getUniformLocation(shader_program,"drawTexture"), 1);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, glTexture);
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, drawTexture);
            //update img
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, drawCan);

            gl.drawArrays(gl.POINTS, 0, MAX_NUM);

            //console.log(off[100], flaps[100].current);

            if(fps.frameStep % 75 == 0) {
                setTargets();
            }

            //write frames to array (similar to RASTER)
            imgs[fps.frameStep] = cloneCanvas(canvas);

            //step frame last
            fps.frameStep++;

            // --- Stats ------------------
            //const fpsout = Math.round(fps.calcFPS(time));
            //document.querySelector('#log').innerHTML = "FPS: " + fpsout;
            let out = '';
            out += 'Frame Rate: ' + Math.round(fps.calcFPS(time)) + '\n';
            out += 'Total Time: ' + Math.round(fps.totalTime) + '\n';
            out += 'Frame: ' + Math.round(fps.frameStep) + '\n'
            out += 'Cycle: ' + Math.round(fps.cycle) + '\n';
            document.querySelector('#stats').innerHTML = out;

        }

        requestAnimationFrame(loop);
    }

}

export default {
    app
}
