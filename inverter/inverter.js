//turning gltf inside out using vertex shaders
//by office ca
//based on mobius transformations by Daniel Piker

import * as THREE from '../officeca-utils/three-modules/three.module.js';
import { OrbitControls } from '../officeca-utils/three-modules/OrbitControls.js';
import { saveAsPNG, load3DM, loadGLB, clearFileInput } from '../officeca-utils/officeca-utils.js';

const vshader = `
uniform float u_time;
uniform float u_radius;

varying vec3 vNormal;

// rotate 4th dimension
void pR(inout vec2 p, float a) {
  p = cos(a)*p + sin(a)*vec2(p.y, -p.x);
}
vec4 inverseStereographic(vec3 p) {
  float k = 2.0/(1.0+dot(p,p));
  return vec4(k*p,k-1.0);
}
vec3 stereographic(vec4 p4) {
  float k = 1.0/(1.0+p4.w);
  return k*p4.xyz;
}
vec3 sceneWarped(vec3 p, float r) {

    vec3 pt = p / (r * 4.0);

    // Project to 4d
    vec4 p4 = inverseStereographic(pt);

    // Rotate in the 4th dimension
    pR(p4.zw, u_time*0.9);

    // Project back to 3d
    pt = stereographic(p4);

    return pt * r;
}

void main() {
  vNormal = normalMatrix * normalize(normal);
  vec3 pos = sceneWarped(position, u_radius);
  gl_Position = projectionMatrix * modelViewMatrix * vec4( pos, 1.0 );
}
`
const fshader = `
varying vec3 vNormal;

void main() {
  vec3 view_norm  = normalize(vNormal);
  vec3 lightDir1 = vec3(-0.5, 0.5, -0.5);
  vec3 lightDir2 = vec3(0.9, 0.5, 0.9);
  vec3 lightDir3 = vec3(-0.5, 0.5, 0.5);

  float intensity;
	intensity = mix(dot(lightDir1, view_norm), dot(lightDir2, view_norm), 0.5);
  intensity *= dot(lightDir3, view_norm);
  vec4 color = vec4(1.0-intensity, 1.0-intensity, 1.0-intensity, 1.0);

  float luma = 0.2126*color.r + 0.7152*color.g + 0.0722*color.b;
  vec4 final = mix(vec4(view_norm.r, view_norm.g, view_norm.b, 1.0), vec4(luma), 0.6);

  gl_FragColor = final;
}
`
const fshader2 = `
varying vec3 vNormal;

void main() {
  vec3 view_norm  = normalize(vNormal);
  gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0)*3.0;
}
`

let width = window.innerWidth;
let height = window.innerHeight;
let uploadVisible = true;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.001,
    10000
  );
camera.position.z = 10;

const renderer = new THREE.WebGLRenderer( {alpha: true, preserveDrawingBuffer: true, antialias: true} );
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );
document.body.style.backgroundColor = document.getElementById('color-input').value;

//init clock and no autostart
const clock = new THREE.Clock({autoStart : false});
let running = false;

//screengrab
document.getElementById('shotButton').addEventListener('click', screenShot);
//pause/play
document.getElementById('pauseButton').addEventListener('click', pause);
//handle scene clearing
document.getElementById("clearButton").addEventListener('click', clearScene);
//toggle fullscreen
window.addEventListener('keydown', fullscreen);
//init uploader
let modelUploader = document.getElementById('model-loader');
modelUploader.addEventListener( 'change', loadModel);
//init orbit controls
const controls = new OrbitControls(camera, renderer.domElement);

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
    modelUploader = document.getElementById('model-loader');
    modelUploader.addEventListener( 'change', loadModel);
  });
  //reappear instructions
  document.getElementById('main').style.display = 'block';
}

function loadModel(e) {
  let file = e.target.files[0].name;
  let lastDot = file.lastIndexOf('.');
  let ext = file.substring(lastDot + 1);
  //console.log(ext);
  if (ext == 'glb' || ext == 'gltf') {
    loadGLB(e, scene, warpMat, wireMat, function(){
      //reset time
      uniforms.u_time.value = 0.0;
      //clear instructions
      document.getElementById('main').style.display = 'none';
    });
  } else if (ext == '3dm') {
    load3DM(e, scene, warpMat, wireMat, function(){
      uniforms.u_time.value = 0.0;
      document.getElementById('main').style.display = 'none';
    });
  } else {
    console.log('not a valid file type')
  }
}

const uniforms = {};
uniforms.u_time = { value: 0.0 };
uniforms.u_mouse = { value:{ x:0.0, y:0.0 }};
uniforms.u_resolution = { value:{ x:0, y:0 }};
uniforms.u_radius = { value: 2.0 };

const warpMat = new THREE.ShaderMaterial( {
  uniforms: uniforms,
  vertexShader: vshader,
  fragmentShader: fshader,
  wireframe: false
} );

const wireMat = new THREE.ShaderMaterial( {
  uniforms: uniforms,
  vertexShader: vshader,
  fragmentShader: fshader2,
  wireframe: false
} );

const debugMat = new THREE.MeshBasicMaterial({
  color: 0xffffff,
  wireframe: false
});


onWindowResize();

if ('ontouchstart' in window){
  document.addEventListener('touchmove', move);
}else{
  window.addEventListener( 'resize', onWindowResize, false );
  document.addEventListener('mousemove', move);
}

function move(evt){
  uniforms.u_mouse.value.x = (evt.touches) ? evt.touches[0].clientX : evt.clientX;
  uniforms.u_mouse.value.y = (evt.touches) ? evt.touches[0].clientY : evt.clientY;
}

function onWindowResize( event ) {
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize( window.innerWidth, window.innerHeight );
  uniforms.u_resolution.value.x = window.innerWidth;
  uniforms.u_resolution.value.y = window.innerHeight;
}

function pause() {
  if (clock.running) {
    clock.stop();
  } else {
    clock.start();
  }
}

function animate() {
  requestAnimationFrame( animate );
  uniforms.u_time.value += clock.getDelta();
  document.body.style.backgroundColor = document.getElementById('color-input').value;

  if (!uploadVisible) {
    document.getElementById('upload').style.display = 'none';
  } else {
    document.getElementById('upload').style.display = 'block';
  }

  renderer.render( scene, camera );
}

function screenShot() {
  const rnd = new THREE.WebGLRenderer({alpha: true, preserveDrawingBuffer: true, antialias: true});
  rnd.setSize( renderer.domElement.width * 3, renderer.domElement.height * 3);
  rnd.render(scene, camera);
  saveAsPNG(rnd, 'inverter.png');
}

animate();
