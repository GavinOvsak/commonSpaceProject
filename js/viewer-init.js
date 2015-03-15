'use strict';



var texture = null;
var screenTexture = null;
var image = null;
//var media = album.media[item];
var rotationOn = false;

var video1 = $('#vid1')[0];

var compVideo = $('#remoteVideo')[0];

var video = video1;

var media = {
  startQuat: {"_x":-0.4626123986821119,"_y":0.5132142156537645,"_z":0.5489737545041015,"_w":0.47034960859146524},
  type: 'video'
};

var STATE = {
  None: 'none',
  Down: 'down',
  Drag: 'drag'
};

var state = STATE.None;

var n = 0;
var distance = 0;

var BaseRotation = null;
var isCardboard = false;
var useCompass = false;
var renderer = new THREE.WebGLRenderer();
var cardboardEffect = new THREE.StereoEffect(renderer);
var cardboardCamera = new THREE.PerspectiveCamera(90, 1, 0.001, 10000);
var cardboardControls = new THREE.DeviceOrientationControls(cardboardCamera, true);
//cardboardControls.freeze = false;
var cardBoardLight = null;

var type = 'fixed'; //Default to not mobile
var WIDTH = 800,
  HEIGHT = 600;

var VIEW_ANGLE = 70,
  ASPECT = WIDTH / HEIGHT,
  NEAR = 0.1,
  FAR = 10000;

var room = parse('room');
var username = parse('user');

var socket = io.connect();
var roomState = {};

var self = {
  username: username,
  type: 'viewer'
};

var rtc;

var screenVideo = document.createElement("video");

socket.on('log', function (array){
  console.log.apply(console, array);
});

var hasMouse = false;
var mouse = null;

socket.on('message', function (data){
  var message = data.message;
  if (data.label == 'mouse') {
    hasMouse = true;
    mouse = data.message;
  } else if (data.label == 'mouseend'){
    hasMouse = false;
  }
  console.log(hasMouse, mouse);
//  console.log('message received');
});

  /** 
    Try to connect to websockets. If success, get screenshare and microphone. Else, alert and close window.
    **/

  if (room !== '') {
    console.log('Joining room', room);

    socket.on('peer-added', function(data) {
      console.log('Peer Added!', data);
      //data.username, data.type, data.state, data.id;
      if (data.type != null && data.username != null && data.state != null) {
        if (roomState[data.username] == null) {
          roomState[data.username] = {};
        }

        roomState[data.username].state = data.state;

        roomState[data.username][data.type] = {
          id: data.id
        };

      }
    });
    socket.on('peer-removed', function(data) {
      //data.username, data.type;
      if (data.username == self.username && data.type == 'controls') {
        debugger; //Need to exit or wait to reload when controls come back.
      }

      if (data.username != null && data.type != null && roomState[data.username] != null) {

        if (data.type == 'controls') {
          //remove whole object. Maybe disconnect?
          roomState[data.username] = null;
        } else if (data.type == 'viewer') {
          //remove that type. Maybe disconnect?
          roomState[data.username][data.type] = null;
        }
      }
    });
    socket.on('peer-updated', function(data) {
      //data.username, data.key, data.value;
      console.log('Updated!');
      //debugger;
      if (data.username != null && data.key != null && data.value != null && roomState[data.username] != null) {

        if (roomState[data.username].state == null) {
          roomState[data.username].state = {};
        }

        roomState[data.username].state[data.key] = data.value;
      }
    });
    socket.on('enter-invalid', function(data) {
      alert('Invalid!');
    });
    socket.on('enter-valid', function(data) {
      console.log(data);

      roomState = data;
      rtc = new RTC(socket, roomState, self);

      rtc.onScreenUpdate(function(username, type) {
        console.log('Received alert about screen update');

        if (username == self.username && type == 'controls' && roomState[username][type].screenStream != null) {
          compVideo.src = URL.createObjectURL(roomState[username][type].screenStream);
          compVideo.autoplay = true;
        } else {
          //Remove items that have been removed
        }
      });

      if (self.type == 'controls') {
        var usernames = Object.keys(data);
        console.log('usernames in room', usernames);
        for (var i = 0; i < usernames.length; i++) {
          var user = roomState[usernames[i]];

          if (user.controls != null && user.controls.id != null && !(self.username == usernames[i] && self.type == 'controls')) {
            rtc.connect(usernames[i], 'controls');
          }

          if (user.viewer != null && user.viewer.id != null && !(self.username == usernames[i] && self.type == 'viewer')) {
            rtc.connect(usernames[i], 'viewer');
          }
        }
      }
    });

    socket.emit('enter', {
      username: self.username,
      type: self.type,
      room: room
    });
  }


function parse(val) {
    var result = "Not found",
        tmp = [];
    location.search
    //.replace ( "?", "" ) 
    // this is better, there might be a question mark inside
    .substr(1)
        .split("&")
        .forEach(function (item) {
        tmp = item.split("=");
        if (tmp[0] === val) result = decodeURIComponent(tmp[1]);
    });
    return result;
}

// var $container = $('#viewer');

// var renderer = new THREE.WebGLRenderer();
// var camera =
//   new THREE.PerspectiveCamera(
//     VIEW_ANGLE,
//     ASPECT,
//     NEAR,
//     FAR);

// var scene = new THREE.Scene();
// scene.add(camera);

// renderer.setSize(WIDTH, HEIGHT);
// $container.append(renderer.domElement);

// var radius = 500,
//     segments = 50,
//     rings = 50;


// texture = new THREE.Texture( video1 );
// screenTexture = new THREE.Texture( compVideo );

// // var sphereMaterial = new THREE.MeshLambertMaterial({ color : 'blue', side: THREE.DoubleSide });

// var sphereMaterial = new THREE.MeshBasicMaterial( { 
//   map: texture, 
//   side: THREE.FrontSide 
// });

// var sphere = new THREE.Mesh(
//   new THREE.SphereGeometry(
//     radius,
//     segments,
//     rings),
//   sphereMaterial);

// scene.add(sphere);

// //var planeMaterial = new THREE.MeshLambertMaterial({ color : 'red', side: THREE.DoubleSide });
// var planeMaterial = new THREE.MeshBasicMaterial( { 
//   map: screenTexture, 
//   side: THREE.FrontSide 
// });

// var width = 50,
//   height = 40,
//   segments = 32;

// var plane = new THREE.Mesh(
//   new THREE.PlaneGeometry( width, height, segments ),
//   planeMaterial);

// plane.rotation.z = Math.PI/2;
// plane.position.z = -50;

// scene.add(plane);

// // sphere.position.z = -100;


// var pointLight =
//   new THREE.PointLight(0xFFFFFF);

// pointLight.position.x = 10;
// pointLight.position.y = 10;
// pointLight.position.z = 300;

// scene.add(pointLight);


// function getInverse(a) { 
//   var t = a.inverse().clone(); 
//   a.inverse(); 
//   return t; 
// }

// //media.startQuat = {"x":"0.5538957696834955","y":"-0.43954462381734144","z":"0.5538957696834954","w":"0.43954462381734155"};

// if (media.startQuat != null) {
//   var sphereQuat = new THREE.Quaternion();
//   sphereQuat.x = media.startQuat._x;
//   sphereQuat.y = media.startQuat._y;
//   sphereQuat.z = media.startQuat._z;
//   sphereQuat.w = media.startQuat._w;
//   sphere.rotation.setFromQuaternion( sphereQuat );
// } else {
//   var up = new THREE.Vector3(0, 0, 1);
//   var forward = new THREE.Vector3(0, 0, 1 );
//   var sphereQuat = new THREE.Quaternion().setFromUnitVectors( up, forward );
//   sphere.rotation.setFromQuaternion( sphereQuat );
// }

//  sphere.scale.x = -1;

  // video = document.createElement('video');
  // video.crossOrigin = '';
  // video.src = media.url;
  // video.width    = 600;
  // video.height   = 600;
  // video.autoplay = true;
  // video.loop = true;
  // video.controls = false;
  // video.onloadstart = function() {
  //   scene.add(sphere);
  //   sphereMaterial.map = texture;    
  // }

//  video = document.createElement('video');
  // video.src = media.url;
  // video.crossOrigin = true;
  // scene.add(sphere);
  // video.setAttribute('style', 'height:100%;width:100%;');
  // texture = new THREE.Texture( video );
  // sphereMaterial.map = texture;    
  // video.controls = true;

//<video src="https://drive.google.com/uc?export=download&amp;id=0B8bzJAxYLr2nalcxWUZJZVZEN1E" style="height:100%;width:100%;" controls=""></video>

// <video style="height:100%;width:100%;" src="https://drive.google.com/uc?export=download&amp;id=0B8bzJAxYLr2nalcxWUZJZVZEN1E" controls=""></video>

// } else if (media.type == 'image') {
//   image = document.createElement('img');
//   image.crossOrigin = '';
//   image.src = media.url;
//   image.width    = 600;
//   texture = new THREE.Texture( image );
//   image.onload = function() {
//     scene.add(sphere);
//     sphereMaterial.map = texture;    
//   }
//   // image.onload = function() {
//   //   texture.needsUpdate = true;
//   //   console.log('loaded');
//   // };
//   // if (image.complete) {
//   //   texture.needsUpdate = true;
//   //   console.log('loaded2');
//   // }
//   image.height   = 600;
// }



// if (isCardboard != null && isCardboard) {
//   camera.fov = 90;
//   scene.remove(camera);
//   scene.add(cardboardCamera);
// }

// cardboardEffect = new THREE.StereoEffect(renderer);
// cardboardEffect.separation = 0.2;
// cardBoardLight = new THREE.HemisphereLight(0x777777, 0x000000, 0.6);

// 


// // renderer.render(scene, camera);


// /*

// Mobile: If compass detected: (home, info, compass, cardboard) tap to go full screen
// Desktop: If no compass detected: (home, set up, download, cardboard) information visible on top
// */

// //Add info

// var changeType = function(newType) {
// //  alert(newType);
//   console.log(newType);
//   type = newType;
//   // updateRotationVisbility();
//   // updateBottomLeftIcon();
//   // if (media.type == 'video') {
//   //   $('#top-right').find('.glyphicon').addClass('glyphicon-backward').removeClass('glyphicon-retweet');
//   // } else if (media.type == 'image') {
//   //   $('#top-right').find('.glyphicon').addClass('glyphicon-retweet').removeClass('glyphicon-backward');
//   // }

//   // if (type == 'mobile') {
//   //   if (media.info != null) {
//   //     $('#bottom-right').removeClass('hidden');
//   //   } else {
//   //     $('#bottom-right').addClass('hidden');
//   //   }
//   //   $('#bottom-right').find('.glyphicon').removeClass('glyphicon-camera').addClass('glyphicon-info-sign');
//   //   $('#top-info').addClass('hidden');
//   // } else {

//   //   $('#bottom-right').find('.glyphicon').addClass('glyphicon-camera').removeClass('glyphicon-info-sign');
//   //   $('#top-info').removeClass('hidden');
//   // }

//   if (type == 'mobile') {
//     scene.add(cardboardCamera);
//     scene.remove(camera);
//   } else {
//     scene.remove(cardboardCamera);
//     scene.add(camera);
//   }
// }

// var setOrientationControls = function(event) {
//   if (event.alpha) {
//     window.removeEventListener('deviceorientation', setOrientationControls, false);
//     //renderer.domElement.addEventListener('click', cardboard.fullscreen, false);

//     cardboardControls.connect();
//     cardboardControls.update();

//     changeType('mobile'); //This is mobile
//   } else {
//     changeType('fixed'); //Desktop / Laptop
//   }
//   window.removeEventListener('deviceorientation', setOrientationControls, true);
// }
// window.addEventListener('deviceorientation', setOrientationControls, false);

// camera.position.z = 0;
// // cardboardCamera.position.z = 0;

// var phi = 0;
// var theta = 0;
// var roll = 0;

// var imageUpdated = false;

// camera.rotation.x = 0;
// camera.rotation.y = 0;
// camera.rotation.z = 0 + Math.PI/2;

// var initCameraQuat = camera.quaternion.clone();

// var clock = new THREE.Clock();

// var useCam = camera;
// var loop = function() {

//   if( !texture.needsUpdate && video1 != null && video1.readyState === video1.HAVE_ENOUGH_DATA ){
//       texture.needsUpdate = true;
//   }

//   if( !screenTexture.needsUpdate && compVideo != null && compVideo.readyState === compVideo.HAVE_ENOUGH_DATA ){
//       screenTexture.needsUpdate = true;
//   }

//   if( !imageUpdated && media.type == 'image' && image != null && image.readyState === image.HAVE_ENOUGH_DATA ){
//       texture.needsUpdate = true;
//       imageUpdated = true;
//   }

//   camera.rotation.x = theta;
//   camera.rotation.y = phi;
//   camera.rotation.z = roll + Math.PI/2;
  
//   camera.position.x = distance * Math.sin(-phi);
//   camera.position.y = distance * Math.sin(-theta - Math.PI) * Math.cos(-phi);
//   camera.position.z = distance * Math.cos(-theta - Math.PI) * Math.cos(-phi);

//   useCam = camera;
//   if (useCompass) {
//     useCam = cardboardCamera;
//   }

//   if (isCardboard && type == 'mobile') {
//     cardboardEffect.render(scene, useCam);
//   } else {
//     renderer.render(scene, useCam);
//   }

//   if (useCompass && cardboardControls != null) {
//     cardboardControls.update(clock.getDelta());
//     camera.updateProjectionMatrix();
//   }

//   if (state == STATE.None) {//} && !isZooming) {
//     requestAnimationFrame(loop);
//   }

//   // controls.update();
// }
// loop();

// var makeViewDefault = function() {
//   var del = new THREE.Quaternion();
//   var next = new THREE.Quaternion();
  
//   next.multiplyQuaternions(del.multiplyQuaternions(initCameraQuat, getInverse(camera.quaternion)), sphere.quaternion);
//   sphere.rotation.setFromQuaternion(next);


//   // $.post(window.location.href, {
//   //   x: next.x,
//   //   y: next.y,
//   //   z: next.z,
//   //   w: next.w,
//   // });

//   phi = 0;
//   theta = 0;
//   roll = 0;

//   loop();
//   initCameraQuat = camera.quaternion.clone();
// }

// var lastMove = Date.now();
// var controlsVisible = true;
// var timeThresh = 5000;

// var isZooming = false;

// $(window).bind('keypress', function(e) {

//   var code = (e.keyCode ? e.keyCode : e.which);
//   if(code == 97) {
//     roll += 0.02;
//     loop();
//   } else if (code == 100) {
//     roll -= 0.02;
//     loop();
//   } else if (code == 115) {
//     roll = 0;
//     loop();
//   } else if (code == 114) {
//     makeViewDefault();
//   } else if (code == 61) {
//     distance += 20;
//     loop();
//     // camera.fov += 1;
//   } else if (code == 45) {
//     distance -= 20;
//     loop();
//     // camera.fov -= 1;
//   } else if (code == 32) { //spacebar
//     if (media.type == 'video') {
//       if (video1.paused) {
//         video1.play();
//       } else {
//         video1.pause();
//       }
//     }
//   } else {
//     console.log(code);
//   }

//   isZooming = (code == 45 || code == 61);
  
//   camera.updateProjectionMatrix();
// });

// var mouse = {
//   startX: 0,
//   startY: 0,
//   startTheta: 0,
//   startPhi: 0
// }

// function getGeneralEvent(event) {
//   event.stopPropagation();

//   if (event.originalEvent != null && event.originalEvent.changedTouches != null &&
//     event.originalEvent.changedTouches.length == 1)
//     return event.originalEvent.changedTouches[0];

//   if (event.clientX != null && event.clientY != null)
//     return event;
//   if (event.touches != null && event.touches.length > 0)
//     return event.touches[0];
//   return null;
// }

// function rotateCamera(e) {
//   var deltaX, deltaY;
//   deltaX = e.clientX - mouse.startX;
//   deltaY = e.clientY - mouse.startY;

//   theta = mouse.startTheta - deltaX * 0.01;
//   phi = Math.max(Math.min(mouse.startPhi + deltaY * 0.01,Math.PI/2),-Math.PI/2);

// }

// function requestFullScreen(element)
// {
//     if (element.requestFullscreen)
//         element.requestFullscreen();
//     else if (element.msRequestFullscreen)
//         element.msRequestFullscreen();
//     else if (element.mozRequestFullScreen)
//         element.mozRequestFullScreen();
//     else if (element.webkitRequestFullscreen)
//         element.webkitRequestFullscreen();
// }

// var twoFingerRotating = false;
// var initAngle = 0;
// var prevRoll = 0;
// var prevDist = 0;
// var initDist = 0;

// function onMove(event) {
//   var e = getGeneralEvent(event);

//   if (event.originalEvent != null && event.originalEvent.changedTouches != null &&
//     event.originalEvent.changedTouches.length == 2) {
//     var touches = event.originalEvent.changedTouches;
//     var angle = Math.atan2(touches[1].clientY-touches[0].clientY, touches[1].clientX-touches[0].clientX);
//     var dist = Math.sqrt(Math.pow(touches[1].clientY-touches[0].clientY,2),Math.pow(touches[1].clientX-touches[0].clientX,2));
//     if (!twoFingerRotating) {
//       //calculate angle and set as init.
//       prevRoll = roll;
//       prevDist = distance;
//       initAngle = angle;
//       initDist = dist;
//       twoFingerRotating = true;
//     } else {
//       //shift theta by delta
//       roll = prevRoll + (angle - initAngle);
//       distance = prevDist + (dist - initDist)*4;
//       loop();
//     }
//   }

//   if (e != null) {
//     if (state !== STATE.None) {
//       state = STATE.Drag;
//   //    console.log('move');

//       rotateCamera(e);    

//       loop(); 
//     } else {
//       // $('.overlay:not(.hidden)').fadeIn();
//       // controlsVisible = true;
//       lastMove = Date.now();
//     }

//     // console.log('a2');
//     $('.overlay:not(.hidden)').fadeIn();
//     controlsVisible = true;

//     //Update theta, phi
// //    e.stopPropagation();
//   }
// }

// var lastUp = Date.now();

// function onUp(event) {
//   var e = getGeneralEvent(event);

//   if (e != null) {
//     if (state == STATE.Drag) {
//       //End Drag
//       rotateCamera(e);
//     } else {
//       //Clicked

//       if (Date.now() - lastUp > 100 && !twoFingerRotating) {
//         if (media.type == 'video') {
//           if (video1.paused) {
//             video1.play();
//           } else {
//             video1.pause();
//           }
//         } else if (media.type == 'image' && !isCardboard) {
//           console.log('a1');
//           $('.overlay:not(.hidden)').fadeIn();
//           controlsVisible = true;
//         }
//       }
//     }
//     lastMove = Date.now();
//     state = STATE.None;
//     loop();

//     // console.log(e.button);
//     // if (e.button == null || e.button == 0) {
// //      e.stopPropagation();
//     // }

//   }

//   if (twoFingerRotating && event.originalEvent != null && event.originalEvent.changedTouches != null &&
//     event.originalEvent.changedTouches.length != 2) {
//     twoFingerRotating = false;
//   }


//   lastUp = Date.now();
// }


// function onDown(event) {
//   //go full screen if type is mobile.
//   var e = getGeneralEvent(event);

//   if (event.originalEvent != null && event.originalEvent.targetTouches != null && 
//     event.originalEvent.targetTouches.length == 3) {
//     if (!useCompass) {
//       makeViewDefault();
//     }
//   }

//   if (e != null) {

//     mouse.startX = e.clientX;
//     mouse.startY = e.clientY;
//     mouse.startTheta = theta;
//     mouse.startPhi = phi;

//     state = STATE.Down;


//     if (type == 'mobile') {
//       var elem = document.getElementById("viewer");
//       requestFullScreen(elem);
//     }

//     if (controlsVisible) {
//       if (rotationOn) {
//         rotationOn = false;
//         updateRotationVisbility();
//       }

//       if (useCompass) {
//         useCompass = false;
//         isCardboard = false;
// //        updateBottomLeftIcon();
//       }
//     }

//     console.log('a3');
//     $('.overlay:not(.hidden)').fadeIn();
//     controlsVisible = true;
//     // console.log(e.button);
//     // if (e.button == null || e.button == 0) {
//      // e.stopPropagation();
//     // }
//   }
  
// }

// function onMouseWheel(e) {

// }

// var resize = function(event) {
//   camera.aspect = window.innerWidth / window.innerHeight;
//   camera.updateProjectionMatrix();
//   cardboardCamera.aspect = window.innerWidth / window.innerHeight;
//   cardboardCamera.updateProjectionMatrix();

//   renderer.setSize( window.innerWidth, window.innerHeight );
//   cardboardEffect.setSize(window.innerWidth, window.innerHeight);
//   loop();
//   // effect.setSize(window.innerWidth, window.innerHeight);
//   // cardboardEffect.setSize(window.innerWidth, window.innerHeight);
// }
// resize();


// window.addEventListener( 'resize', resize, false );

// document.addEventListener( 'contextmenu', function ( event ) { event.preventDefault(); }, false );

// document.addEventListener( 'DOMMouseScroll', onMouseWheel, false ); // firefox


// $('canvas').on('mousewheel', onMouseWheel);

// $('canvas').on('mousedown touchstart', onDown);
// $('canvas').on('mousemove touchmove', onMove);
// $('canvas').on('mouseup touchend', onUp);

// $('canvas').dblclick(function(e) {
//   console.log('double!');
//   requestFullScreen(e);
// })

