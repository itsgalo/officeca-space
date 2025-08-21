import FPS from './fps.js';
import Pointer from './pointer.js';
import { createProgramFromSources, createProgram, resizeCanvasToDisplaySize} from './gl-utils.js';

function app(){

    const canvas  = document.querySelector('canvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.imageRendering = "pixelated";
    canvas.imageSmoothingEnabled = false;
    const gl = canvas.getContext('webgl2', { antialias: false, preserveDrawingBuffer: true, premultipliedAlpha: false, alpha: true });
    if (!gl) {
        return;
    }
    //gl.getExtension('OES_texture_float');

    let program, vao, positionBuffer, resolutionLocation, imageLocation, srcTexLoc;

    const pointer = Pointer.init(canvas);

    //new time/frame handler
    const fps = new FPS(30, 90);

    let image = new Image();
    image.src = "./assets/cga8t.png";  // MUST BE SAME DOMAIN!!!
    image.onload = function() {
        start();
    };

    function setRectangle(gl, x, y, width, height) {
        let x1 = x;
        let x2 = x + width;
        let y1 = y;
        let y2 = y + height;
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
           x1, y1,
           x2, y1,
           x1, y2,
           x1, y2,
           x2, y1,
           x2, y2,
        ]), gl.STATIC_DRAW);
      }

    function start(){

        // --- Shaders ------------------
        const vs = `#version 300 es

        // an attribute is an input (in) to a vertex shader.
        // It will receive data from a buffer
        in vec2 a_position;
        in vec2 a_texCoord;
        
        // Used to pass in the resolution of the canvas
        uniform vec2 u_resolution;
        
        // Used to pass the texture coordinates to the fragment shader
        out vec2 v_texCoord;
        
        // all shaders have a main function
        void main() {
        
          // convert the position from pixels to 0.0 to 1.0
          vec2 zeroToOne = a_position / u_resolution;
        
          // convert from 0->1 to 0->2
          vec2 zeroToTwo = zeroToOne * 2.0;
        
          // convert from 0->2 to -1->+1 (clipspace)
          vec2 clipSpace = zeroToTwo - 1.0;
        
          gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
        
          // pass the texCoord to the fragment shader
          // The GPU will interpolate this value between points.
          v_texCoord = a_texCoord;
        }
        `;

        const fs = `#version 300 es

        // fragment shaders don't have a default precision so we need
        // to pick one. highp is a good default. It means "high precision"
        precision highp float;
        
        // our texture
        uniform sampler2D srcTex;
        uniform vec2 u_resolution;
        uniform float time;
        
        // the texCoords passed in from the vertex shader.
        in vec2 v_texCoord;
        
        // we need to declare an output for the fragment shader
        out vec4 outColor;

        #define MAX_STEPS 80
        #define MAX_DIST 16.0
        #define SURF_DIST 0.0001


        float hash1( float n ) {
            return fract(sin(n)*43758.5453123);
        }
        
        vec2 hash2( float n ) {
            return fract(sin(vec2(n,n+1.0))*vec2(43758.5453123,22578.1459123));
        }
        
        vec3 hash3( float n ) {
            return fract(sin(vec3(n,n+1.0,n+2.0))*vec3(43758.5453123,22578.1459123,19642.3490423));
        }

        //sdf shapes
        float sdSphere( vec3 p, vec3 c, float s ) {
            //p is ray point, c is position, s is size
            return length(p-c)-s;
        }

        float sdBox( vec3 p, vec3 c, vec3 b ) {
            p = p - c;
            vec3 q = abs(p) - b;
            return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0);
        }

        // union of two objects
        vec2 opU(vec2 a, vec2 b) {
            return a.x < b.x ? a : b;
        }

        float opSmoothUnion( float d1, float d2, float k ) {
            float h = clamp( 0.5 + 0.5*(d2-d1)/k, 0.0, 1.0 );
            return mix( d2, d1, h ) - k*h*(1.0-h); 
        }

        //scene sdfs
        vec2 map(vec3 p) {
            vec2 d = vec2(1e10);

            float s = 1.0;
            //shape is vec2(dist shape, material index)
            for (int i = 0; i < 10; i++) {
                //ivec2 texelCoord = ivec2(gl_FragCoord.xy);
                vec4 value = texelFetch(srcTex, ivec2(i, i), 0);
                float sph = sdSphere(p, value.rgb*3.0-1.5, 0.15);
                s = opSmoothUnion(s, sph, 0.5);
            }
            vec2 sphere1 = vec2(s, 2.0);
            vec2 box1 = vec2(sdBox(p, vec3(0.0, 1.0, 0.0), vec3(2.0, 0.5, 0.5)), 1.0);
            vec2 plane = vec2(p.y + 0.5, 0.0);
            d = opU(sphere1, plane);
            //d = opU(d, box1);

            return d;
        }

        //raymarching loop
        float rayMarch(vec3 ro, vec3 rd) {
            float t = 0.0; //distance
            float s = sign(map(ro).x); //inside and outside the surface;
            vec2 h; //scene sdf and material index;

            float tmax = MAX_DIST;

            for(int i = 0; i < MAX_STEPS; i++) {
                vec3 p = ro + rd * t;
                h = map(p); //get scene distance + mat index
                h.x *= s; //multiply dist by in/out
                if (abs(h.x) < SURF_DIST) {
                    break;
                }
                t += h.x;
            }

            if (t > SURF_DIST && t < tmax) {
                //vec3 p = ro + rd * t;
                return t;
            }

            return tmax;
        }

        //gets normal and an extra slot for data
        vec4 calcNormal(vec3 pointOnSurface) {
            vec2 distanceAtPoint = map(pointOnSurface);
            vec2 e = vec2(0.01, 0.0);
            vec3 norm = distanceAtPoint.x - vec3(
                map(pointOnSurface - e.xyy).x,
                map(pointOnSurface - e.yxy).x,
                map(pointOnSurface - e.yyx).x);
            return vec4(normalize(norm), distanceAtPoint.y);
        }

        vec3 render(vec3 ro, vec3 rd) {
            vec3 rayOrigin = ro;
            vec3 rayDir = rd;
            vec3 col = vec3(0.9); //sky/env color
            float IOR = 1./1.32; //index of refraction
            float dist = rayMarch(rayOrigin, rayDir);

            if (dist >= 1e10) { //no hit
                //simple sky
                vec3 sky = vec3(0.0, 0.0, 1.0);
                return col * sky;
            } else { //hit
                vec3 p = rayOrigin + rayDir * dist; //hit point
                vec3 lightPos = vec3(-1.0, 3.0, 5.0);
                vec3 lightDir = normalize(lightPos - p);
                vec4 data = calcNormal(p);
                vec3 norm = data.xyz;
                float matid = data.w;

                float diffuseLight = 0.3 * clamp(dot(norm, lightDir), 0.0, 1.0);
                col += diffuseLight;

                float lambert = dot(norm, normalize(vec3(0.0, 2.0, -3.0)))*0.5+0.5;

                vec3 material = vec3(0.0);

                if (matid == 0.0) {
                    material = vec3(1.0, 0.0, 0.0);
                } else if (matid == 1.0) {
                    material = vec3(0.0, 0.0, 1.0);
                } else {
                    material = vec3(0.0, 1.0, 0.0);
                }

                col *= lambert * material;
            }
            return col;
        }
        
        void main() {
            //vec2 onePixel = vec2(1) / vec2(textureSize(u_image, 0));
            //screen coords
            vec2 uv = gl_FragCoord.xy / u_resolution.xy;

            //centered coords for raymarching
            vec2 st = (gl_FragCoord.xy-0.5*u_resolution.xy) / u_resolution.y;

            //basic perspective camera setup with origin and normalized direction
            vec3 rayOrigin = vec3(0.0, 0.0, -4.6);
            vec3 rayDir = normalize(vec3(st.x, st.y, 1.0));
        
            //basic orthographic camera
            // vec3 rayOrigin = vec3(0.0, 0.0, -8.0) + vec3(st * 8.0, 0.);
            // vec3 rayDir = normalize(vec3(0., 0.0, 0.5));

            vec3 final = render(rayOrigin, rayDir);

            outColor = vec4(final, 1.0);
            //outColor = vec4(v_texCoord.x, v_texCoord.y, 0.0, 1.0);
        }
        `;

        // setup GLSL program
        program = createProgramFromSources(gl, [vs, fs]);

        // look up where the vertex data needs to go.
        let positionAttributeLocation = gl.getAttribLocation(program, "a_position");
        let texCoordAttributeLocation = gl.getAttribLocation(program, "a_texCoord");

        // lookup uniforms
        resolutionLocation = gl.getUniformLocation(program, "u_resolution");
        imageLocation = gl.getUniformLocation(program, "u_image");
        srcTexLoc = gl.getUniformLocation(program, 'srcTex');


        // setup a full canvas clip space quad
        positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1,
        1, -1,
        -1,  1,
        -1,  1,
        1, -1,
        1,  1,
        ]), gl.STATIC_DRAW);

        // Create a vertex array object (attribute state)
        vao = gl.createVertexArray();

        // and make it the one we're currently working with
        gl.bindVertexArray(vao);

        // Turn on the attribute
        gl.enableVertexAttribArray(positionAttributeLocation);

        gl.vertexAttribPointer(
            positionAttributeLocation, 
            2, 
            gl.FLOAT, 
            false, 
            0, 
            0);

        // create our source texture
        const srcWidth = 10;
        const srcHeight = 10;
        const numParticles = srcWidth * srcHeight;
        const ids = new Array(numParticles).fill(0).map((_, i) => i);
        const positions = new Float32Array(
        ids.map(_ => [Math.random(), Math.random(), Math.random(), Math.random()]).flat());
        console.log(positions);
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1); // see https://webgl2fundamentals.org/webgl/lessons/webgl-data-textures.html
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,                // mip level
            gl.RGBA32F,            // internal format
            srcWidth,
            srcHeight,
            0,                // border
            gl.RGBA,           // format
            gl.FLOAT, // type
            positions);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        loop();
    }

    function loop(time) {

        
        //resize canvas
        resizeCanvasToDisplaySize(gl.canvas);

        //animation control
        fps.stepTime(time);

        //time wrapper, corrects fps
        if (fps.delta > fps.interval) {

            //update time
            fps.updateTime(time);

            // Tell WebGL how to convert from clip space to pixels
            gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

            // Clear the canvas
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

            // Tell it to use our program (pair of shaders)
            gl.useProgram(program);

            // Bind the attribute/buffer set we want.
            gl.bindVertexArray(vao);

            // Pass in the canvas resolution so we can convert from
            // pixels to clipspace in the shader
            gl.uniform2f(resolutionLocation, gl.canvas.width, gl.canvas.height);
            gl.uniform1f(gl.getUniformLocation(program, "time"), fps.loopTime);
            gl.uniform1i(srcTexLoc, 0);  // tell the shader the src texture is on texture unit 0

            // Tell the shader to get the texture from texture unit 0
            gl.uniform1i(imageLocation, 0);

            // Bind the position buffer so gl.bufferData that will be called
            // in setRectangle puts data in the position buffer
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

            // Set a rectangle the same size as the image.
            setRectangle(gl, 0, 0, canvas.width, canvas.height);

            // Draw the rectangle.
            let primitiveType = gl.TRIANGLES;
            let offset = 0;
            let count = 6;
            gl.drawArrays(primitiveType, offset, count);

            //step frame last
            fps.frameStep++;

            // --- Stats ------------------
            let out = '';
            out += 'Frame Rate: ' + Math.round(fps.calcFPS(time)) + '\n';
            out += 'Total Time: ' + Math.round(fps.totalTime) + '\n';
            out += 'Frame: ' + Math.round(fps.frameStep) + '\n'
            out += 'Cycle: ' + Math.round(fps.cycle) + '\n';
            document.querySelector('#stats').innerHTML = out;
        }

        requestAnimationFrame(loop)
    }

}

export default {
    app
}
