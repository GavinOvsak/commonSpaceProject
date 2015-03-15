
var media = {
  startQuat: {"_x":-0.4626123986821119,"_y":0.5132142156537645,"_z":0.5489737545041015,"_w":0.47034960859146524},
  type: 'video'
};

var WIDTH = 800,
  HEIGHT = 600;

var VIEW_ANGLE = 70,
  ASPECT = WIDTH / HEIGHT,
  NEAR = 0.1,
  FAR = 10000;

var $container = $('#viewer');

// var renderer = new THREE.WebGLRenderer();
var camera =
  new THREE.PerspectiveCamera(
    VIEW_ANGLE,
    ASPECT,
    NEAR,
    FAR);

// var cardboardEffect = new THREE.StereoEffect(renderer);
// var cardboardCamera = new THREE.PerspectiveCamera(90, 1, 0.001, 10000);
// var cardboardControls = new THREE.DeviceOrientationControls(cardboardCamera, true);
// //cardboardControls.freeze = false;
// var cardBoardLight = null;

camera.position.z = 0;
cardboardCamera.position.z = 0;

var phi = 0;
var theta = 0;
var roll = 0;

var imageUpdated = false;

camera.rotation.x = 0;
camera.rotation.y = 0;
camera.rotation.z = 0 + Math.PI/2;

var initCameraQuat = camera.quaternion.clone();

var scene = new THREE.Scene();
scene.add(camera);

renderer.setSize(WIDTH, HEIGHT);
$container.append(renderer.domElement);

var radius = 500,
    segments = 50,
    rings = 50;

video1 = $('#vid1')[0];
  compVideo = $('#remoteVideo')[0];
  video = video1;
texture = new THREE.Texture( video1 );
screenTexture = new THREE.Texture( compVideo );

// var sphereMaterial = new THREE.MeshLambertMaterial({ color : 'blue', side: THREE.DoubleSide });

var sphereMaterial = new THREE.MeshBasicMaterial( { 
	map: texture, 
	side: THREE.FrontSide 
});

var sphere = new THREE.Mesh(
  new THREE.SphereGeometry(
    radius,
    segments,
    rings),
  sphereMaterial);

scene.add(sphere);

//var planeMaterial = new THREE.MeshLambertMaterial({ color : 'red', side: THREE.DoubleSide });
var planeMaterial = new THREE.MeshBasicMaterial( { 
  map: screenTexture, 
  side: THREE.FrontSide 
});

var width = 50,
  height = 40,
  segments = 32;

var plane = new THREE.Mesh(
  new THREE.PlaneGeometry( width, height, segments ),
  planeMaterial);

plane.rotation.z = Math.PI/2;
plane.position.z = -50;

scene.add(plane);

// sphere.position.z = -100;


var pointLight =
  new THREE.PointLight(0xFFFFFF);

pointLight.position.x = 10;
pointLight.position.y = 10;
pointLight.position.z = 300;

scene.add(pointLight);


function getInverse(a) { 
  var t = a.inverse().clone(); 
  a.inverse(); 
  return t; 
}

//media.startQuat = {"x":"0.5538957696834955","y":"-0.43954462381734144","z":"0.5538957696834954","w":"0.43954462381734155"};

if (media.startQuat != null) {
  var sphereQuat = new THREE.Quaternion();
  sphereQuat.x = media.startQuat._x;
  sphereQuat.y = media.startQuat._y;
  sphereQuat.z = media.startQuat._z;
  sphereQuat.w = media.startQuat._w;
  sphere.rotation.setFromQuaternion( sphereQuat );
} else {
  var up = new THREE.Vector3(0, 0, 1);
  var forward = new THREE.Vector3(0, 0, 1 );
  var sphereQuat = new THREE.Quaternion().setFromUnitVectors( up, forward );
  sphere.rotation.setFromQuaternion( sphereQuat );
}

sphere.scale.x = -1;


if (isCardboard != null && isCardboard) {
  camera.fov = 90;
  scene.remove(camera);
  scene.add(cardboardCamera);
}

cardboardEffect = new THREE.StereoEffect(renderer);
cardboardEffect.separation = 0.2;
cardBoardLight = new THREE.HemisphereLight(0x777777, 0x000000, 0.6);

var changeType = function(newType) {
  console.log(newType);
  type = newType;
  if (type == 'mobile') {
    scene.add(cardboardCamera);
    scene.remove(camera);
  } else {
    scene.remove(cardboardCamera);
    scene.add(camera);
  }
}

var setOrientationControls = function(event) {
  if (event.alpha) {
    window.removeEventListener('deviceorientation', setOrientationControls, false);
    //renderer.domElement.addEventListener('click', cardboard.fullscreen, false);

    cardboardControls.connect();
    cardboardControls.update();

    changeType('mobile'); //This is mobile
  } else {
    changeType('fixed'); //Desktop / Laptop
  }
  window.removeEventListener('deviceorientation', setOrientationControls, true);
}
window.addEventListener('deviceorientation', setOrientationControls, false);


var clock = new THREE.Clock();

//renderer.render(scene, camera);

var useCam = camera;
function loop() {
  // console.log('loop');

  if( !texture.needsUpdate && video1 != null && video1.readyState === video1.HAVE_ENOUGH_DATA ){
      texture.needsUpdate = true;
  }

  if( !screenTexture.needsUpdate && compVideo != null && compVideo.readyState === compVideo.HAVE_ENOUGH_DATA ){
      screenTexture.needsUpdate = true;
  }

  if( !imageUpdated && media.type == 'image' && image != null && image.readyState === image.HAVE_ENOUGH_DATA ){
      texture.needsUpdate = true;
      imageUpdated = true;
  }

  if (roomState[self.username] != null && 
    roomState[self.username].state.theta != null && 
    roomState[self.username].state.x != null && 
    roomState[self.username].state.y != null) {

    camera.rotation.x = roomState[self.username].state.theta + theta;
    camera.rotation.y = phi;
    camera.rotation.z = roll + Math.PI/2;
  
    camera.position.x = 0;
    camera.position.y = roomState[self.username].state.y;
    camera.position.z = roomState[self.username].state.x;
  } else {
    camera.rotation.x = theta;
    camera.rotation.y = phi;
    camera.rotation.z = roll + Math.PI/2;
  }

  // camera.position.x = distance * Math.sin(-phi);
  // camera.position.y = distance * Math.sin(-theta - Math.PI) * Math.cos(-phi);
  // camera.position.z = distance * Math.cos(-theta - Math.PI) * Math.cos(-phi);

  useCam = camera;
  if (useCompass) {
    useCam = cardboardCamera;
  }

  if (isCardboard && type == 'mobile') {
    cardboardEffect.render(scene, useCam);
  } else {
    renderer.render(scene, useCam);
  }

  if (useCompass && cardboardControls != null) {
    cardboardControls.update(clock.getDelta());
    camera.updateProjectionMatrix();
  }

  if (state == STATE.None) {//} && !isZooming) {
    requestAnimationFrame(loop);
  }

  // controls.update();
}
loop();

var resize = function(event) {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  cardboardCamera.aspect = window.innerWidth / window.innerHeight;
  cardboardCamera.updateProjectionMatrix();

  renderer.setSize( window.innerWidth, window.innerHeight );
  cardboardEffect.setSize(window.innerWidth, window.innerHeight);
  loop();
  // effect.setSize(window.innerWidth, window.innerHeight);
  // cardboardEffect.setSize(window.innerWidth, window.innerHeight);
}
resize();

window.addEventListener( 'resize', resize, false );
