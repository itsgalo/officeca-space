import * as THREE from '../officeca-utils/three-modules/three.module.js';
import { OrbitControls } from '../officeca-utils/three-modules/OrbitControls.js';
import { EffectComposer } from '../officeca-utils/three-modules/EffectComposer.js';
import { RenderPass } from '../officeca-utils/three-modules/RenderPass.js';
import { ShaderPass } from '../officeca-utils/three-modules/ShaderPass.js';
import { SobelOperatorShader } from '../officeca-utils/three-modules/TestShader.js';
import { saveAsPNG, load3DM, loadGLB, clearFileInput } from '../officeca-utils/officeca-utils.js';
import { GUI } from '../officeca-utils/lil-gui.module.min.js';

const vshader = `
uniform float u_time;
uniform int wormseye;
varying vec3 vNormal;
varying vec3 posit;

const float shearAmount = 1.4142 / 2.0;
const float PI = 3.141592653;
//custom remap function
float map(float n, float low1, float high1, float low2, float high2) {
  return low2 + (n - low1) * (high2 - low2) / (high1 - low1);
}

//axonometric shear (must be function)
mat4 shearGeo( int w ) {
  mat4 shearMat = mat4(
    vec4(1, 0, 0, 0),
    vec4(0, 1, 1 * w, 0),
    vec4(0, 0, 1, 0),
    vec4(0, 0, 0, 1)
  );
  return shearMat;
}


mat4 rotAnim( float t ) {
  mat4 rotMatX = mat4(
    vec4(1, 0, 0, 0),
    vec4(0, cos(t), -sin(t), 0),
    vec4(0, sin(t), cos(t), 0),
    vec4(0, 0, 0, 1)
  );
  mat4 rotMatY = mat4(
    vec4(cos(t), 0, sin(t), 0),
    vec4(0, 1, 0, 0),
    vec4(-sin(t), 0, cos(t), 0),
    vec4(0, 0, 0, 1)
  );
  mat4 rotMatZ = mat4(
    vec4(cos(t), -sin(t), 0, 0),
    vec4(sin(t), cos(t), 0, 0),
    vec4(0, 0, 1, 0),
    vec4(0, 0, 0, 1)
  );
  return rotMatY;
}

void main() {
  vec4 pos = vec4(position, 1.0) * rotAnim(u_time*0.1) * shearGeo(wormseye);
  posit = pos.xyz;
  vNormal = normalMatrix * normalize(normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4( pos.xyz, 1.0 );
}
`
const fshader = `
varying vec3 vNormal;
varying vec3 posit;

void main() {
  vec3 p = posit;
  vec3 view_norm  = normalize(vNormal);
  vec3 lightDir1 = vec3(-0.5, 0.5, -0.5);
  vec3 lightDir2 = vec3(0.9, 0.5, 0.9);
  vec3 lightDir3 = vec3(-0.5, 0.5, 0.5);

  float intensity;
	intensity = mix(dot(lightDir1, view_norm), dot(lightDir2, view_norm), 0.5);
  intensity *= dot(lightDir3, view_norm);
  vec4 color = vec4(1.0-intensity, 1.0-intensity, 1.0-intensity, 1.0);

  float luma = 0.2126*color.r + 0.7152*color.g + 0.0722*color.b;
  gl_FragColor = vec4(1.3-luma);
}
`
const fshader2 = `
varying vec3 vNormal;
varying vec3 posit;

void main() {
  vec3 p = posit;
  vec3 view_norm  = normalize(vNormal);
  gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0)*3.0;
}
`
//GUI parameters
let gui, modelLoader, bgColor;

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
  color: '#000000'
};
document.getElementById('model-loader').addEventListener( 'change', loadModel);
//screengrab
document.getElementById('shotButton').addEventListener('click', screenShot);
//pause/play
document.getElementById('pauseButton').addEventListener('click', pause);
//toggle line drawing
document.getElementById('drawButton').addEventListener('click', drawingMode);
//handle scene clearing
document.getElementById("clearButton").addEventListener('click', clearScene);
//handle worms eye view
document.getElementById("flipButton").addEventListener('click', wormsEye);
//toggle fullscreen
window.addEventListener('keydown', fullscreen);

let width = window.innerWidth;
let height = window.innerHeight;
let lineDrawing = false;
let uploadVisible = true;

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera( width / - 200, width / 200, height / 200, height / - 200, -4000, 4000 );
camera.position.z = 100;
camera.left = -width / 200;
camera.right = width / 200;
camera.top = height / 200;
camera.bottom = -height / 200;
camera.updateProjectionMatrix();

const renderer = new THREE.WebGLRenderer({alpha: true, preserveDrawingBuffer: true, antialias: true});
renderer.setSize(width, height);
document.body.appendChild( renderer.domElement );
document.body.style.backgroundColor = params.color;

const composer = new EffectComposer(renderer);
const renderPass = new RenderPass( scene, camera );
composer.addPass( renderPass );
const effectSobel = new ShaderPass( SobelOperatorShader );
effectSobel.uniforms[ 'resolution' ].value.x = width;// * window.devicePixelRatio;
effectSobel.uniforms[ 'resolution' ].value.y = height;// * window.devicePixelRatio;
composer.addPass( effectSobel );

const clock = new THREE.Clock({autoStart : false});

//init orbit controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableRotate = false;

function initGUI() {
  gui = new GUI();
  gui.title('controls');
  const viewFolder = gui.addFolder('view tools');

  gui.add(params, 'loadFile').name('load model');
  modelLoader = gui.add( params, 'label' ).name( 'file name:' );
  gui.add(params, 'pause').name('pause');
  gui.add(params, 'screenshot');
  gui.add(params, 'clear');

  viewFolder.add(params, 'flip').name('flip axon');
  viewFolder.add(params, 'line').name('line dwg');
  bgColor = viewFolder.addColor( params, 'color').name('bg color');


}

function fullscreen(e) {
  if (e.key == 'x') {
    uploadVisible = !uploadVisible;
  }
}

function clearScene() {
  while(scene.children.length > 0){
    scene.remove(scene.children[0]);
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
    loadGLB(e, scene, solidMat, wireMat, function(){
      //reset time
      uniforms.u_time.value = 0.0;
      //clear instructions
      document.getElementById('main').style.display = 'none';
    });
  } else if (ext == '3dm') {
    load3DM(e, scene, solidMat, wireMat, function(){
      uniforms.u_time.value = 0.0;
      document.getElementById('main').style.display = 'none';
    });
  } else {
    console.log('not a valid file type')
  }
}


const uniforms = {};
uniforms.u_time = { value: 0.0 };
//uniforms.u_resolution = { value:{ x:0, y:0 }};
uniforms.wormseye = { value: -1};

const wireMat = new THREE.ShaderMaterial( {
  uniforms: uniforms,
  vertexShader: vshader,
  fragmentShader: fshader2,
  wireframe: false
} );

const solidMat = new THREE.ShaderMaterial({
  uniforms: uniforms,
  vertexShader: vshader,
  fragmentShader: fshader,
  wireframe: false
});

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

function drawingMode() {
  lineDrawing = !lineDrawing;
}

function wormsEye() {
  uniforms.wormseye.value *= -1;
}

function animate() {
  requestAnimationFrame( animate );
  uniforms.u_time.value += clock.getDelta();
  document.body.style.backgroundColor = bgColor.getValue();

  if (!uploadVisible) {
    document.getElementById('upload').style.display = 'none';
  } else {
    document.getElementById('upload').style.display = 'block';
  }

  if (lineDrawing == true) {
    composer.render();
  } else {
    renderer.render(scene, camera);
  }
}

function screenShot() {
  const rnd = new THREE.WebGLRenderer({alpha: true, preserveDrawingBuffer: true, antialias: true});
  rnd.setSize( renderer.domElement.width * 3, renderer.domElement.height * 3);
  if (lineDrawing == true) {
    const comp = new EffectComposer(rnd);
    const rp = new RenderPass(scene, camera);
    comp.addPass( rp );
    const sobel = new ShaderPass(SobelOperatorShader);
    sobel.uniforms['resolution'].value.x = renderer.domElement.width * 3;
    sobel.uniforms['resolution'].value.y = renderer.domElement.height * 3;
    comp.addPass(sobel);
    comp.render();
  } else {
    rnd.render(scene, camera);
  }
  saveAsPNG(rnd, 'live-axon.png');
}

initGUI();
animate();
