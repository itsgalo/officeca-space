//blocks by office ca
//built for BuildFest '24 at the Bethel Woods Art and Architecture Festival


const hasTouch = 'ontouchstart' in document.documentElement;

function init(element) {

    const pointer = {
        x  : 0,
        y  : 0,
        px : 0,
        py : 0,
        pressed : false,
        lastClick : 0,
        doubleClick: function() { console.log('double clicked!')},
        hasTouch
    }

    function press(x, y, c){
        let rect = c.getBoundingClientRect();
        pointer.pressed = true;
        pointer.x = x - rect.left;
        pointer.y = y - rect.top;

        //handle double tap/click
        let dd = new Date();
        let tt = dd.getTime();
        const tapLag = 300; // 500ms
        if (tt - pointer.lastClick < tapLag) {
          pointer.doubleClick();
        }
        pointer.lastClick = tt;
    }

    function move(x, y, c){
        let rect = c.getBoundingClientRect();
        pointer.x  = x - rect.left;
        pointer.y  = y - rect.top;
    }

    function release(x, y){
        pointer.pressed = false;
    }

    if (hasTouch) {
        element.addEventListener("touchstart", function(e) {
            e.preventDefault();
            press(e.touches[0].clientX, e.touches[0].clientY, element);
        })
        element.addEventListener("touchmove", function(e) {
            e.preventDefault();
            move(e.touches[0].clientX, e.touches[0].clientY, element);
        })
        element.addEventListener("touchend", function(e) {
            e.preventDefault();
            pointer.pressed = false;
            //release(e.touches[0].clientX, e.touches[0].clientY);
        })
    } else {
        element.addEventListener('mousedown', function(e){
            press(e.clientX, e.clientY, element);
        })
        element.addEventListener('mousemove', function(e){
            move(e.clientX, e.clientY, element);
        })
        element.addEventListener('mouseup', function(e){
            release(e.clientX, e.clientY);
        })
    }

    return pointer;
}

// Class for a plane that extends to infinity.
class IntersectPlane {
  constructor(n1, n2, n3, p1, p2, p3) {
    this.normal = createVector(n1, n2, n3); // The normal vector of the plane
    this.pos = createVector(p1, p2, p3); // A point on the plane
    this.d = this.pos.dot(this.normal);
  }
 
  raycast(raycaster) {
    let hitRay = raycaster.castToObject(this);
    
    let intersection = null; // The point of intersection between the ray and a plane.
    
    // Where the ray intersects the object
    let t = (-this.d - this.normal.dot(raycaster.ray.origin)) / this.normal.dot(raycaster.ray.direction); 

    if (t > 0) {
      // Find the position of the intersection of the ray and the object.
      intersection = p5.Vector.add(raycaster.ray.origin, p5.Vector.mult(raycaster.ray.direction, t));
    }
    
    return intersection;

  }
  
  draw() {
    push();
      rotate(PI/2, createVector(0, 1, 0));
      //rotateX(PI/2);
      //plane(1000);
    pop();
  }
}

class IntersectCube {
  constructor(pos, dims) {
    this.active = false;
    this.pos = pos;
    this.dims = dims;
    this.color = color(random(colors));
    
    //min max corners of cube
    this.minX = this.pos.x - this.dims.x / 2;
    this.maxX = this.pos.x + this.dims.x / 2;
    this.minY = this.pos.y - this.dims.y / 2;
    this.maxY = this.pos.y + this.dims.y / 2;
    this.minZ = this.pos.z - this.dims.z / 2;
    this.maxZ = this.pos.z + this.dims.z / 2;
    
    //face normals
    this.norm1 = createVector(-1, 0, 0);
    this.norm2 = createVector(1, 0, 0);
    this.norm3 = createVector(0, -1, 0);
    this.norm4 = createVector(0, 1, 0);
    this.norm5 = createVector(0, 0, -1);
    this.norm6 = createVector(0, 0, 1);
  }

  getNormalAt(point) {
    const tolerance = 1e-6; // Small tolerance to account for floating-point precision issues
    let normal = createVector(0, 0, 0);
    
    // Calculate distances from the point to each face of the bounding box
    let distMinX = Math.abs(this.minX - point.x);
    let distMaxX = Math.abs(this.maxX - point.x);
    let distMinY = Math.abs(this.minY - point.y);
    let distMaxY = Math.abs(this.maxY - point.y);
    let distMinZ = Math.abs(this.minZ - point.z);
    let distMaxZ = Math.abs(this.maxZ - point.z);
    
    // Compare distances with tolerance to determine which face the point is on
    if (distMinX < tolerance) {
        normal = this.norm1; // Normal of the min X face
    } else if (distMaxX < tolerance) {
        normal = this.norm2; // Normal of the max X face
    } else if (distMinY < tolerance) {
        normal = this.norm3; // Normal of the min Y face
    } else if (distMaxY < tolerance) {
        normal = this.norm4; // Normal of the max Y face
    } else if (distMinZ < tolerance) {
        normal = this.norm5; // Normal of the min Z face
    } else if (distMaxZ < tolerance) {
        normal = this.norm6; // Normal of the max Z face
    }
    
    return normal;
  }
  
  raycast(raycaster) {
    let hitRay = raycaster.castToObject(this);
    
    let x0 = raycaster.ray.origin.x;
    let y0 = raycaster.ray.origin.y;
    let z0 = raycaster.ray.origin.z;
    
    let dx = raycaster.ray.direction.x;
    let dy = raycaster.ray.direction.y;
    let dz = raycaster.ray.direction.z;
    
    let t1 = (this.minX - x0) / dx;
    let t2 = (this.maxX - x0) / dx;
    let t3 = (this.minY - y0) / dy;
    let t4 = (this.maxY - y0) / dy;
    let t5 = (this.minZ - z0) / dz;
    let t6 = (this.maxZ - z0) / dz;
    
    let tmin = max(max(min(t1, t2), min(t3, t4)), min(t5, t6));
    let tmax = min(min(max(t1, t2), max(t3, t4)), max(t5, t6));
    
    let x = x0 + tmin * dx;
    let y = y0 + tmin * dy;
    let z = z0 + tmin * dz;
    
    let intersection = null;
    let n = createVector(0, 0, 0);
    
    // if tmax < 0, ray (line) is intersecting AABB, but whole AABB is behing us
    // if (tmax < 0) {
    //   this.color = color(0, 255, 0);
    // }

    // if tmin > tmax, ray doesn't intersect AABB
    if (tmin > tmax) {
      this.active = false;
      intersection = null;
    }
    else {
      this.active = true;
      intersection = createVector(x, y, z);
    }
    
    if (intersection != null) {
      n = this.getNormalAt(intersection);
    }
    
    let normal = p5.Vector.add(this.pos, p5.Vector.mult(n, 30));
    //draw normal line
    stroke(0);
    line(this.pos.x, this.pos.y, this.pos.z, normal.x, normal.y, normal.z);
    
    return normal;//intersection;
    
  }
  
  draw() {
    push();
      if (this.active) {
        //this.color = color(0, 255, 255);
        stroke(0);
        fill(this.color);
      } else {
        //this.color = color(0, 0, 255);
        noStroke();
        fill(this.color);
      }
      translate(this.pos);
      box(this.dims.x, this.dims.y, this.dims.z);
    pop();
  }
}

class Ray {
  constructor(origin, direction, length) {
    this.origin = origin;
    this.direction = direction;
    this.length = length;
  }
  
  set(origin, direction) {
    this.origin = origin.copy();
    this.direction = direction.copy();
    
    return this;
  }
  
  at(t, target) {
    target = this.origin.copy();
    target.add(this.direction.x * t, this.direction.y * t, this.direction.z * t);
    return target;
  }
  
  lookAt(v) {
    this.direction = v.copy().sub(this.origin.x, this.origin.y, this.origin.z).normalize();
    return this;
  } 
}

class Raycaster {
  constructor(origin, direction, near = 0, far = 90000) {
    this.ray = new Ray(origin, direction, far);
    //must be normalized direction
    this.near = near;
    this.far = far;
    this.camera = null;
    this.worldPos = null;
    this.intersections = [];
  }
  
  setFromCamera(coords, camera) {
    this.camera = camera;
    
    this.worldPos = unproject(coords, camera);

    // Ray length - distance from camera to far field
    let dRay = this.ray.length;

    // Position of the tip of the ray in world space
    let phi = atan2(this.worldPos.y - camera.eyeY, dist(this.worldPos.x, this.worldPos.z, camera.eyeX, camera.eyeZ));
    let th = -atan2(this.worldPos.x - camera.eyeX, this.worldPos.z - camera.eyeZ) + PI/2;
    let ray = createVector(camera.eyeX + dRay * cos(phi) * cos(th), 
             camera.eyeY + dRay * sin(phi), 
             camera.eyeZ + dRay * cos(phi) * sin(th));
    
    //console.log(cammat, campos);
    this.ray.origin = createVector(camera.eyeX, camera.eyeY, camera.eyeZ); //camera position
    this.ray.direction = ray;
    
  }
  
  castToObject(object) {
    let cam = this.camera;
    let worldPos = this.worldPos;
    // Ray length - distance from camera to pickable object
    let distanceToObject = this.ray.origin.dist(object.pos);

    // Position of the tip of the ray in world space
    let phi = atan2(worldPos.y - cam.eyeY, dist(worldPos.x, worldPos.z, cam.eyeX, cam.eyeZ));
    let th = -atan2(worldPos.x - cam.eyeX, worldPos.z - cam.eyeZ) + PI/2;
    let ray = createVector(cam.eyeX + distanceToObject * cos(phi) * cos(th), 
             cam.eyeY + distanceToObject * sin(phi), 
             cam.eyeZ + distanceToObject * cos(phi) * sin(th));
    
    return ray;
  }
  
  intersectObjects(objects) {
    this.intersections = [];
    let nearest = null;
    
    // Loop through objects to find intersections and sort by distance
    for (let i = 0; i < objects.length; i++) {
        const intersection = objects[i].raycast(this);
        if (intersection != null && objects[i].active == true) {
            this.intersections.push(intersection);
        }
    }
    
    // Sort intersections by distance from the ray's origin
    if (this.intersections.length > 0) {
        this.intersections.sort((a, b) => a.dist(this.ray.origin) - b.dist(this.ray.origin));
        nearest = this.intersections[0];
        //sort objects by distance to ray
        objects.sort((a, b) => a.pos.dist(nearest) - b.pos.dist(nearest));
        objects[0].active = true;
        // Loop through objects and deactivate all but the nearest
        for (let i = 1; i < objects.length; i++) {
          objects[i].active = false;  // Deactivate all others
        }
    }

    return nearest;
  }
  
  debug() {
    background(255);
    //box(50, 50, 50)
    //line(this.ray.origin.x, this.ray.origin.y-100, this.ray.origin.z, this.ray.direction.x, this.ray.direction.y, this.ray.direction.z);
    //line(this.ray.origin.x, this.ray.origin.y-100, this.ray.origin.z, this.ray.direction.x, this.ray.direction.y, this.ray.direction.z);

  }
}

function unproject(vector, camera) {
  //(-1 : 1)  Normalized Device Coordinates
  let mx = (vector.x - width/2) / width * 2;
  let my = (vector.y - height/2) / height * 2;
  let mz = vector.z
  let coordsVec = createVector(mx, -my, mz)  //mouse vector

  // Projection Matrix
  let projmat = new p5.Matrix();
  projmat.apply(camera.projMatrix.mat4);
  projmat.invert(projmat); //get inverse projection matrix from camera

  // Eye/view/camera space vector  
  let camVec = projmat.multiplyPoint(coordsVec);

  // Division factor for perspective compensation
  let w = 1;

  // Model View Matrix
  let cammat = new p5.Matrix();
  cammat.apply(camera.cameraMatrix.mat4);
  cammat.invert(cammat); //get inverse projection matrix from camera

  // World space
  let worldSpace = cammat.multiplyPoint(camVec);

  // World space (compensating for perspective)
  let worldSpaceNorm = createVector(worldSpace.x/w, worldSpace.y/w, worldSpace.z/w);

  return worldSpaceNorm;
}

let modal;
let can;
let pointer;
let grid = 30;
let camera;
let raycaster;
let objects = [];
let intersects;
let lastTap = 0;  // Stores the time of the last tap
let world;
let bodies = [];
let bodyColors = [];
let groundMaterial, boxMaterial, contactMaterial;

let groundBody;


let colors = ['#265b98', '#ffbe1b', '#be3b37'];

function snapToPt(pt) {
  let cell = round(pt / (grid));
  return cell * (grid);
}

function setup() {
  
  can = createCanvas(windowWidth, windowHeight, WEBGL);

  //custom pointer
  pointer = init(can.elt);
  //set custom double click function here
  pointer.doubleClick = function () {
      //console.log('hit')
      onDoubleTap();
  }

  // Select the existing div by its ID
  modal = select('#about');
  // Hide the modal when it's clicked
  modal.mousePressed(hideModal);

  let title = createButton('blocks by office ca');
  title.position(10, 10);
  title.mousePressed(screenshot);

  let resetButton = createButton('reset');
  resetButton.position(10, 50);
  resetButton.mousePressed(resetAll);

  let button = createButton('collapse');
  button.position(10, 90);
  button.mousePressed(collapse);

  camera = createCamera();//height / 2 / tan((30 * PI) / 180);
  
  //camera.ortho();
  // Set the perspective camera
  let fov = PI / 8;            // Field of view angle (60 degrees)
  let aspect = width / height;  // Aspect ratio (canvas width divided by height)
  let near = 0.1;               // Near clipping plane
  let far = 8000;               // Far clipping plane
  camera.perspective(fov, aspect, near, far);

  camera.setPosition(800, -800, 800);
  camera.lookAt(0, 0, 0);
  raycaster = new Raycaster();

  // Create a physics world
  world = new CANNON.World();
  world.gravity.set(0, -9.82, 0);  // Gravity in negative Y direction
	world.broadphase = new CANNON.NaiveBroadphase();
  // Create ground material
  groundMaterial = new CANNON.Material("groundMaterial");

  // Create box material
  boxMaterial = new CANNON.Material("boxMaterial");

  // Create contact material between ground and box with custom friction and restitution
  contactMaterial = new CANNON.ContactMaterial(groundMaterial, boxMaterial, {
    friction: 0.3,// Set friction value (e.g., 0.3 for medium friction)
    restitution: 0.1 // Set restitution (bounciness), lower for less bounce
  });

  // Add the contact material to the world
  world.addContactMaterial(contactMaterial);

  //Create a ground plane in the physics world
  let groundShape = new CANNON.Plane();
  groundBody = new CANNON.Body({ mass: 0, material: groundMaterial });  // mass = 0 makes it static
  groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);  // Rotate to be horizontal
  groundBody.addShape(groundShape);
  world.addBody(groundBody);
  
  for (let i = 0; i < 3; i++) {
    //objects.push(new IntersectCube(createVector((30*i)-90, -30, 30), createVector(30, 30, 30)));
    objects.push(new IntersectCube(createVector(snapToPt(random(-150, 150)), -30, snapToPt(random(-150, 150))), createVector(30, 30, 30)));
  }


}

// Function to render debug mode
function drawDebug(world) {
  let idx = 0;
  world.bodies.forEach(body => {
    body.shapes.forEach(shape => {
      push();
      translate(body.position.x, -body.position.y, body.position.z);  // Convert meters to p5.js pixels

      // Apply body rotation
      let rot = new CANNON.Vec3();
      body.quaternion.toEuler(rot);
      rotateY(rot.y);
      rotateZ(rot.z);
      rotateX(rot.x);

      // Draw wireframes based on shape type
      if (shape instanceof CANNON.Box) {
        //console.log(idx-1);
        //stroke(0);
        noStroke();
        //noFill();
        fill(bodyColors[idx-1]);
        let size = shape.halfExtents;  // Box size
        box(size.x * 2, size.y * 2, size.z * 2);  // Scale up from meters to pixels
      }
      pop();
      idx++;
    });
  });
}

function draw() {
  background(234, 119, 0);
  orbitControl();

  ambientLight(150, 150, 150);
  directionalLight(color(255), 1, 1, 1);
  directionalLight(color(255), -1, 1, 1);
  //debugMode();
  raycaster.setFromCamera(createVector(mouseX, mouseY), camera);
  intersects = raycaster.intersectObjects(objects);
    
  for (let y = -300; y < 300; y+=grid) {
    for (let x = -300; x < 300; x+=grid) {
      stroke(255);
      point(x, 0, y);
    }
  }
  
  for (let i = 0; i < objects.length; i++) {
    objects[i].draw();
  }
  
  if(intersects != null) {
    push();
      stroke(0);
      strokeWeight(1);
      noFill();
      //fill(255, 0, 0);
      translate((intersects.x), (intersects.y), (intersects.z));
      box(30);
    pop();
  }

  // Update the physics world
  world.step(1 / 60);

  drawDebug(world);
  
}

function collapse() {

  for (let i = 0; i < objects.length; i++) {
    //store colors of the boxes before removing
    bodyColors.push(objects[i].color);
    // Create bodies in the physics world
    let boxSize = new CANNON.Vec3(objects[i].dims.x/2, objects[i].dims.y/2, objects[i].dims.z/2);
    let boxShape = new CANNON.Box(boxSize);
    let body = new CANNON.Body({ mass: 200, material: boxMaterial });  // mass > 0 makes it dynamic
    //body.angularDamping = 0.01;
    body.position.set(objects[i].pos.x, -objects[i].pos.y, objects[i].pos.z);
    //body.quaternion.setFromAxisAngle(new CANNON.Vec3(1,0,0), 0.9);
    body.addShape(boxShape);
    world.addBody(body);
  }
  objects = [];
}

// Function to remove all bodies except the ground from the world
function removeAllBodiesExceptGround(world) {
  // Loop through the bodies array in reverse to safely remove bodies
  for (let i = world.bodies.length - 1; i >= 0; i--) {
    let body = world.bodies[i];
    
    // Remove the body only if it's not the ground (based on a custom property or mass check)
    if (body.mass !== 0) {
      world.removeBody(body);
    }
  }
}

function resetAll() {
  objects = [];
  bodyColors = [];
  removeAllBodiesExceptGround(world);
  for (let i = 0; i < 3; i++) {
    objects.push(new IntersectCube(createVector(snapToPt(random(-150, 150)), -30, snapToPt(random(-150, 150))), createVector(30, 30, 30)));
  }
}

function screenshot() {
  //save('myBlocks.png');
  modal.show();
}

// Function to hide the modal when clicked
function hideModal() {
  modal.hide();
}

// Use the touchStarted function to detect touch events on mobile
// function mousePressed() {
//   let currentTime = millis();  // Get the current time in milliseconds
//   let timeSinceLastTap = currentTime - lastTap;  // Calculate the time difference

//   // If the time difference is less than 300 milliseconds, it's a double-tap
//   if (timeSinceLastTap < 300 && timeSinceLastTap > 0) {
//     onDoubleTap();
//   }

//   lastTap = currentTime;  // Update the last tap time
//   return false;
// }

// This function is triggered on a double-tap
function onDoubleTap() {
  if(intersects != null) {
    objects.push(new IntersectCube(intersects, createVector(30, 30, 30)));
  }
}





