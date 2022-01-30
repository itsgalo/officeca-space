//common officeca utilities
import { EdgesGeometry, LineSegments } from './three-modules/three.module.js';
import { Rhino3dmLoader } from './three-modules/3DMLoader.js';
import { GLTFLoader } from './three-modules/GLTFLoader.js';


//load Rhino 3dm file
//usage (file, scene, face material, edge material, callback for extra functions)
const load3DM = function (f, s, facemat, edgemat, callback) {
  let file = f.target.files[0];
  let loader = new Rhino3dmLoader();
  let url = URL.createObjectURL(file);
  loader.setLibraryPath( 'https://cdn.jsdelivr.net/npm/rhino3dm@7.11.1/' );
  loader.load(url, function(object) {
    s.add(object);
    object.traverse( function ( child ) {
      if ( child.isMesh ) {
        child.material = facemat;
        child.geometry.rotateX(-Math.PI / 2);
        let geom = child.geometry;
        const edges = new EdgesGeometry( geom, 20 );
        const line = new LineSegments( edges, edgemat );
        s.add(line);
      }
    });
    callback();
    URL.revokeObjectURL(url);
  });
}
//load Rhino 3dm file
//usage (file, scene, face material, edge material, callback for extra functions)
const loadGLB = function (f, s, facemat, edgemat, callback) {
  let file = f.target.files[0];
  let loader = new GLTFLoader();
  let url = URL.createObjectURL(file);
  loader.load(url, function(gltf) {
    s.add(gltf.scene);
    gltf.scene.traverse( function ( child ) {
      if ( child.isMesh ) {
        child.material = facemat;
        let geom = child.geometry;
        const edges = new EdgesGeometry(geom, 20);
        const line = new LineSegments(edges, edgemat);
        s.add(line);
      }
    });
    callback();
    URL.revokeObjectURL(url)
  });
}

//clear an input field
const clearFileInput = function (id, callback) {
    let oldInput = document.getElementById(id);
    let newInput = document.createElement('input');
    newInput.type = "file";
    newInput.id = oldInput.id;
    newInput.name = oldInput.name;
    newInput.className = oldInput.className;
    newInput.style.cssText = oldInput.style.cssText;

    oldInput.parentNode.replaceChild(newInput, oldInput);
    //use callback to reset element for event listener
    callback();
}

//save a file
//usage (target renderer, file name string)
const saveAsPNG = function (rndr, fileName) {
  let imgData, imgNode;
  try {
      let str = "image/png";
      imgData = rndr.domElement.toDataURL(str, 1.0);
      saveFile(imgData.replace(str, 'image/octet-stream'), fileName);
  } catch (e) {
      console.log(e);
      return;
  }
}

const saveFile = function (strData, filename) {
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

export {saveAsPNG, load3DM, loadGLB, clearFileInput};
