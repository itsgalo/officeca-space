import FPS from './fps.js'
import Pointer from './pointer.js'
import Image from './image.js'
import Flap from './flap.js';
import { GIFEncoder, quantize, applyPalette } from './gifenc.esm.js';

function app(){

    const MAX_NUM = 64*64;
    const TAU = Math.PI * 2;

    const points = new Float32Array(MAX_NUM * 3);
    const off = new Array(MAX_NUM);
    const flaps = new Array(MAX_NUM);

    const canvas  = document.querySelector('canvas');
    //const gl = canvas.getContext('webgl');
    let devicePixelRatio = window.devicePixelRatio || 1;
    let divider = 256;
    let w, h;
    window.innerHeight <= window.innerWidth ? (w = Math.max(window.innerHeight, 1) * 1.0, h = Math.max(window.innerHeight, 1)) : (w = Math.max(window.innerWidth, 1), h = Math.max(window.innerWidth, 1) / 1.0);
    //w = window.innerWidth;
    //h = window.innerHeight;
    canvas.width = Math.floor(w / divider) * divider;
    canvas.height = Math.floor(h / divider) * divider;

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
    drawCan.width = 64;
    drawCan.height = 64;

    //handles rendering
    document.body.appendChild(drawCan);
    //drawCan.style.display = 'none';

    const pointer = Pointer.init(canvas);

    //new time/frame handler
    const fps = new FPS(30, 120);
    let saveframes = false;
    let fs = 1;
    let imgs = [];
    let hasBeenCaptured = false;

    const grid = 8;

    let shader_program, glTexture, drawTexture;
    const glBuffer = gl.createBuffer();

    const tex = Image.load("assets/cga8.png", function(){
        start();
        requestAnimationFrame(loop);
    });

    //keypressed
    document.addEventListener('keydown', keyPress);

    console.log(tex);

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

        for (let i=0; i<MAX_NUM; i++){
            //   let x = i % (canvas.width / 8);
            //   let y = Math.floor(i / (canvas.width / 8));
            //   return [x*8, canvas.height - y*8, 0, 0]
            const x = Math.floor(i % (canvas.width) / 16);
            const y = Math.floor(i / (canvas.width) / 16);

            const cx = Math.floor(i % (Math.floor(64)));
            const cy = Math.floor(i / (Math.floor(64)));

            //const z = tex.getColor((x/1 + time *0.01) % 80, (y/1) % 8 - 1);

            const pixel = ctx.getImageData(cx, cy, 1, 1);
            const data = pixel.data;

            flaps[i] = new Flap(Math.floor(i % 12), 255, Math.floor(Math.random() * 80));
            
            //flaps[i].setRandom();
            //flaps[i].setDelay(i % 50);
            //flaps[i].setDelay(0);
            //flaps[i].setTarget(data[0]);

            //off[i] = Math.floor(Math.random() * 80); //random number for character

            //points[i*3    ] = x * 16 + 8;
            //points[i*3 + 1] = y * 16 + 8;
            //points[i*3 + 2] = flaps[i].out;//Math.floor(Math.random()*1024); //random number for character
        }

        console.log(flaps)

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
            gl_PointSize = 16.0 * pixel_ratio;
        }
        `;

        const fs = `#version 300 es
        precision mediump float;

        uniform sampler2D spriteTexture;
        uniform sampler2D drawTexture;
        uniform vec2 screen_size;
        uniform float time;

        in vec3 pos;
        out vec4 outColor;

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
            outColor = col;
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
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tex.canvas);
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

            // ctx.beginPath();
            // ctx.arc(32+Math.cos(fps.loopTime+60) * 16, 32+Math.sin(fps.loopTime+60) * 16, Math.abs(Math.sin(fps.loopTime+30) * 16), 0, 2 * Math.PI);
            // ctx.fill();

            // ctx.beginPath();
            // ctx.arc(32, 32, Math.abs(Math.sin(fps.loopTime) * 32), 0, 2 * Math.PI);
            // ctx.stroke();

            //ctx.fillRect(0, Math.abs(Math.sin(fps.loopTime)) * 64, 16, 4);
            //ctx.fillRect(16, Math.abs(Math.cos(fps.loopTime)) * 64, 16, 4);

            //ctx.fillStyle = '#fff';
            //ctx.fillRect(32, Math.abs(Math.sin(fps.loopTime)) * 64, 16, 4);
            //ctx.fillRect(48, Math.abs(Math.cos(fps.loopTime)) * 64, 16, 4);

            // ctx.fillStyle = `rgb(${Math.floor(Math.random()*255)}, 0, 0)`;
            // ctx.font = "16px ibm";
            // ctx.textBaseline = "top";
            // ctx.textRendering = "optimizeLegibility";
            // ctx.fillText(`${Math.random()*1000000}`, 0, 0);
            // ctx.fillText(`${Math.random()*1000000}`, 0, 32);
            // // //ctx.fillText(`/0+=`, 0, 0);
            // ctx.fillText(`${Math.random()*1000000}`, 0, 16);
            // // //ctx.fillText(`%$@*`, 0, 32);
            // ctx.fillText(`${Math.random()*1000000}`, 0, 48);

            points.fill(0);

            for (let i = 0; i < MAX_NUM; i++){
                //   let x = i % (canvas.width / 8);
                //   let y = Math.floor(i / (canvas.width / 8));
                //   return [x*8, canvas.height - y*8, 0, 0]
                //width * y + x = idx;
                
                const x = Math.floor(i % (Math.floor(canvas.width) / 16));
                const y = Math.floor(i / (Math.floor(canvas.width) / 16));

                const pixel = ctx.getImageData(x*1, y*1, 1, 1);
                const data = pixel.data;

                off[i] = Math.round(data[0] / 4) * 4; //40 //red channel rgb

                flaps[i].flip();
                flaps[i].update();

                points[i*3    ] = x * 16 + 8;//offset because point is on center // 32 + 16 for 32x32 grid
                points[i*3 + 1] = y * 16 + 8;
                points[i*3 + 2] = flaps[i].current;

                //flaps[i].setDelay(i % 3);
                //flaps[i].setTarget(off[i]);
            }
            //console.log(flaps[0].current)

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

            if(fps.frameStep % 1 == 0) {

                //divideRect(0, 0, drawCan.width, drawCan.height, 6);
                //let d = Math.floor(Math.random()*64);
                
                //let newTarget = Math.floor(Math.random()*255);
                for (let i = 0; i < MAX_NUM; i++){
                    //flaps[i].frame = 0;
                    //flaps[i].setDelay(Math.floor(Math.random()*25));
                    //flaps[i].setDelay(i % 64);
                    //flaps[i].setDelay(0);
                    //if (toggle == false) {

                    flaps[i].setTarget(off[i]);

                    //flaps[i].setDelay(Math.floor(i % 120));
                    let a = Math.floor(Math.random()*5);
                    //flaps[i].setTarget(a % 360);
                    flaps[i].setDelay(a);
                    // } else {
                    //    flaps[i].setTarget(off[i]);
                    //     flaps[i].setTarget(Math.floor(Math.random()*255));
                    // }
                }
                //toggle = !toggle;
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
