import * as THREE from '../officeca-utils/three-modules/three.module.js';
import { OrbitControls } from '../officeca-utils/three-modules/OrbitControls.js';
import { EffectComposer } from '../officeca-utils/three-modules/EffectComposer.js';
import { RenderPass } from '../officeca-utils/three-modules/RenderPass.js';
import { ShaderPass } from '../officeca-utils/three-modules/ShaderPass.js';
import { SobelOperatorShader } from '../officeca-utils/three-modules/TestShader.js';
import { Rhino3dmLoader } from '../officeca-utils/three-modules/3DMLoader.js';
import { GLTFLoader } from '../officeca-utils/three-modules/GLTFLoader.js';
import { CustomOutlinePass } from '../officeca-utils/three-modules/CustomOutlinePass.js';
import { DitheringShader } from '../officeca-utils/three-modules/DitheringShader.js';
import { ASCIIShader } from '../officeca-utils/three-modules/ASCIIShader.js';
import { FindSurfaces } from '../officeca-utils/three-modules/FindSurfaces.js';
import { saveAsPNG, load3DM, loadGLB, clearFileInput } from '../officeca-utils/officeca-utils.js';
import { GUI } from '../officeca-utils/lil-gui.module.min.js';

function getSurfaceIdMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      maxSurfaceId: { value: 1 },
    },
    vertexShader: getVertexShader(),
    fragmentShader: getFragmentShader(),
    vertexColors: true,
  });
}

function getVertexShader() {
  return `
  varying vec2 v_uv;
  varying vec4 vColor;

  void main() {
     v_uv = uv;
     vColor = color;

     gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
  `;
}

function getFragmentShader() {
  return `
  varying vec2 v_uv;
  varying vec4 vColor;
  uniform float maxSurfaceId;

  void main() {
    // Normalize the surfaceId when writing to texture
    float surfaceId = vColor.r / maxSurfaceId;
    gl_FragColor = vec4(surfaceId, 0.0, 0.0, 1.0);
  }
  `;
}

function getDebugSurfaceIdMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {},
    vertexShader: getVertexShader(),
    fragmentShader: `
      varying vec2 v_uv;
      varying vec4 vColor;
      void main() {      
          int surfaceId = int(vColor.r * 100.0);
          float R = float(surfaceId % 255) / 255.0;
          float G = float((surfaceId + 50) % 255) / 255.0;
          float B = float((surfaceId * 20) % 255) / 255.0;
          gl_FragColor = vec4(R, G, B, 1.0);
          //gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
      }
      `,
    vertexColors: true,
  });
}

//GUI parameters
let gui, modelLoader, outlineColor, bgColor, lightColor;

let params = {
  loadFile: function() { 
    document.getElementById('model-loader').click();
  },
  label: 'none',
  pause: function() {
    document.getElementById('pauseButton').click();
  },
  screenshot: function() {
    document.getElementById('shotButton').click();
  },
  flip: function() {
    document.getElementById('flipButton').click();
  },
  line: function() {
    document.getElementById('drawButton').click();
  },
  clear: function() {
    document.getElementById('clearButton').click();
  },
  color: '#000000',
  outline: '#ffffff',
  pixelSize: 1,
  outlineSize: 1,
  light: '#c4c4c4'
};
document.getElementById('model-loader').addEventListener( 'change', loadModel);
//screengrab
document.getElementById('shotButton').addEventListener('click', screenShot);
//pause/play
document.getElementById('pauseButton').addEventListener('click', pause);
//handle scene clearing
document.getElementById("clearButton").addEventListener('click', clearScene);
//toggle fullscreen
window.addEventListener('keydown', fullscreen);

let width = window.innerWidth;
let height = window.innerHeight;
let lineDrawing = false;
let uploadVisible = true;

let surfaceFinder = new FindSurfaces();

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera( width / - 200, width / 200, height / 200, height / - 200, -4000, 4000 );
camera.position.z = 100;
camera.left = -width / 200;
camera.right = width / 200;
camera.top = height / 200;
camera.bottom = -height / 200;
camera.updateProjectionMatrix();

const renderer = new THREE.WebGLRenderer({alpha: true, preserveDrawingBuffer: true, antialias: true});
renderer.autoClear = true;
renderer.setPixelRatio(1);
renderer.setSize(width, height);
document.body.appendChild( renderer.domElement );
document.body.style.backgroundColor = params.color;

const composer = new EffectComposer(renderer);
const renderPass = new RenderPass( scene, camera );
renderPass.clearColor = new THREE.Color( 0, 0, 0 );
renderPass.clearAlpha = 0;
composer.addPass( renderPass );

// Outline pass.
const customOutline = new CustomOutlinePass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  scene,
  camera,
  params.pixelSize
);
composer.addPass(customOutline);

const dithering = new ShaderPass( DitheringShader );
dithering.uniforms[ 'resolution' ].value.x = window.innerWidth;// * window.devicePixelRatio;
dithering.uniforms[ 'resolution' ].value.y = window.innerHeight;// * window.devicePixelRatio;
composer.addPass( dithering );

const clock = new THREE.Clock({autoStart : false});

//lights
const directionalLight = new THREE.DirectionalLight( 0xffffff, 1.0 );
directionalLight.position.set(1, 1, 1 ).normalize();
scene.add( directionalLight );

const light = new THREE.AmbientLight( 0xc4c4c4, 2.0 ); // soft white light
scene.add( light );

//init orbit controls
const controls = new OrbitControls(camera, renderer.domElement);

function initGUI() {
  gui = new GUI();
  gui.title('controls');
  const viewFolder = gui.addFolder('view tools');

  gui.add(params, 'loadFile').name('load model');
  modelLoader = gui.add( params, 'label' ).name( 'file name:' );
  gui.add(params, 'pause').name('pause');
  gui.add(params, 'screenshot');
  gui.add(params, 'clear');

  outlineColor = viewFolder.addColor(params, 'outline').name('outline color');
  bgColor = viewFolder.addColor(params, 'color').name('bg color');
  lightColor = viewFolder.addColor(params, 'light').name('light color').onChange( () => {
    light.color = new THREE.Color(lightColor.getValue());
  });

  viewFolder.add(params, 'pixelSize', 1, 16, 1).onChange( () => {
    dithering.uniforms.pixelSize.value = params.pixelSize;
  } );
  viewFolder.add(params, 'outlineSize', 1, 16, 1).min( 1 ).onChange( () => {
    customOutline.setPixelSize(params.outlineSize);
  } );
}

function fullscreen(e) {
  if (e.key == 'x') {
    uploadVisible = !uploadVisible;
  }
}

function clearScene() {
  // Iterate over the scene's children array in reverse to safely remove items
  for (let i = scene.children.length - 1; i >= 0; i--) {
    const child = scene.children[i];
    // Check if the child is not a light
    if (!(child.isLight)) {
      scene.remove(child);
    }
  }

  clearFileInput('model-loader', function() {
    //reset modeluploader for even listener
    document.getElementById('model-loader').addEventListener( 'change', loadModel);
    modelLoader.setValue('none');
  });
  //reappear instructions
  document.getElementById('main').style.display = 'block';
}

function loadModel(e) {
  let file = e.target.files[0].name;
  modelLoader.setValue( e.target.files[0].name );
  let lastDot = file.lastIndexOf('.');
  let ext = file.substring(lastDot + 1);
  //console.log(ext);
  if (ext == 'glb' || ext == 'gltf') {
    let loader = new GLTFLoader();
    let url = URL.createObjectURL(e.target.files[0]);
    loader.load(url, function( gltf) {
      scene.add(gltf.scene);
      surfaceFinder.surfaceId = 0;
      gltf.scene.traverse( function ( child ) {
        if ( child.isMesh ) {
          const colorsTypedArray = surfaceFinder.getSurfaceIdAttribute(child);
          child.geometry.setAttribute(
            "color",
            new THREE.BufferAttribute(colorsTypedArray, 4)
          );
          child.geometry.rotateY(Math.PI/1);
          //child.scale.set(100, 100, 100); //this is immportant for sobel detection and jagged edges.
          //child.material = getSurfaceIdMaterial();
          //child.material = getDebugSurfaceIdMaterial();
          //child.material = new THREE.MeshLambertMaterial({color: new THREE.Color(Math.floor(Math.random()*255),Math.floor(Math.random()*255), Math.floor(Math.random()*255)), side: THREE.DoubleSide});
          child.material = new THREE.MeshLambertMaterial({color: 0xEEEEEE});
          //child.geometry.applyMatrix4(matrix);
          child.castShadow = true;
          child.receiveShadow = true;
          
        }
      });
      customOutline.updateMaxSurfaceId(surfaceFinder.surfaceId + 1);
    });

    //clear instructions
    document.getElementById('main').style.display = 'none';
    
  } else if (ext == '3dm') {
    let loader = new Rhino3dmLoader();
    let url = URL.createObjectURL(e.target.files[0]);
    loader.setLibraryPath( 'https://cdn.jsdelivr.net/npm/rhino3dm@8.4.0/' );
    loader.load(url, function(object) {
      scene.add(object);
      surfaceFinder.surfaceId = 0;
      object.traverse( function ( child ) {
        if ( child.isMesh ) {
          const colorsTypedArray = surfaceFinder.getSurfaceIdAttribute(child);
          child.geometry.setAttribute(
            "color",
            new THREE.BufferAttribute(colorsTypedArray, 4)
          );
          child.geometry.rotateX(-Math.PI / 2);
          //child.scale.set(100, 100, 100); //this is immportant for sobel detection and jagged edges.
          //child.material = getSurfaceIdMaterial();
          //child.material = getDebugSurfaceIdMaterial();
          //child.material = new THREE.MeshNormalMaterial();
          //child.material = new THREE.MeshLambertMaterial({color: new THREE.Color(Math.floor(Math.random()*255),Math.floor(Math.random()*255), Math.floor(Math.random()*255)), side: THREE.DoubleSide});
          child.material = new THREE.MeshLambertMaterial({color: 0xEEEEEE});
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      customOutline.updateMaxSurfaceId(surfaceFinder.surfaceId + 1);
      document.getElementById('main').style.display = 'none';
      console.log(customOutline.fsQuad.material.uniforms);
      console.log(directionalLight)
      URL.revokeObjectURL(url);

    }, function ( progress ) {
  
      console.log( ( progress.loaded / progress.total * 100 ) + '%' );
  
    }, function ( error ) {
  
      console.log( error );
  
    } );

  } else {
    console.log('not a valid file type')
  }
}

const debugMat = new THREE.MeshBasicMaterial({
  color: 0xffffff
});

function pause() {
  if (clock.running) {
    clock.stop();
  } else {
    clock.start();
  }
}

function animate() {
  requestAnimationFrame( animate );
  document.body.style.backgroundColor = bgColor.getValue();

  if (!clock.running) {
    scene.rotateY(0.0005, 90, 0);
  }
  
  customOutline.fsQuad.material.uniforms.outlineColor.value = new THREE.Color(outlineColor.getValue());

  if (!uploadVisible) {
    document.getElementById('upload').style.display = 'none';
  } else {
    document.getElementById('upload').style.display = 'block';
  }

  composer.render();

}

function screenShot() {
  saveAsPNG(renderer, 'low-res.png');
}

initGUI();
animate();
