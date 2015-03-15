
var twoFingerRotating = false;
var initAngle = 0;
var prevRoll = 0;
var prevDist = 0;
var initDist = 0;

var mouse = {
  startX: 0,
  startY: 0,
  startTheta: 0,
  startPhi: 0
}

var lastMove = Date.now();

function rotateCamera(e) {
  var deltaX, deltaY;
  deltaX = e.clientX - mouse.startX;
  deltaY = e.clientY - mouse.startY;

  theta = mouse.startTheta - deltaX * 0.01;
  phi = Math.max(Math.min(mouse.startPhi + deltaY * 0.01,Math.PI/2),-Math.PI/2);
}

function getGeneralEvent(event) {
  event.stopPropagation();

  if (event.originalEvent != null && event.originalEvent.changedTouches != null &&
    event.originalEvent.changedTouches.length == 1)
    return event.originalEvent.changedTouches[0];

  if (event.clientX != null && event.clientY != null)
    return event;
  if (event.touches != null && event.touches.length > 0)
    return event.touches[0];
  return null;
}

function onMove(event) {
  var e = getGeneralEvent(event);

  if (event.originalEvent != null && event.originalEvent.changedTouches != null &&
    event.originalEvent.changedTouches.length == 2) {
    var touches = event.originalEvent.changedTouches;
    var angle = Math.atan2(touches[1].clientY-touches[0].clientY, touches[1].clientX-touches[0].clientX);
    var dist = Math.sqrt(Math.pow(touches[1].clientY-touches[0].clientY,2),Math.pow(touches[1].clientX-touches[0].clientX,2));
    if (!twoFingerRotating) {
      //calculate angle and set as init.
      prevRoll = roll;
      prevDist = distance;
      initAngle = angle;
      initDist = dist;
      twoFingerRotating = true;
    } else {
      //shift theta by delta
      roll = prevRoll + (angle - initAngle);
      distance = prevDist + (dist - initDist)*4;
      loop();
    }
  }

  if (e != null) {
    if (state !== STATE.None) {
      state = STATE.Drag;
  //    console.log('move');

      rotateCamera(e);    

      loop(); 
    } else {
      // $('.overlay:not(.hidden)').fadeIn();
      // controlsVisible = true;
      lastMove = Date.now();
    }

    // console.log('a2');
    $('.overlay:not(.hidden)').fadeIn();
    controlsVisible = true;

    //Update theta, phi
//    e.stopPropagation();
  }
}

lastUp = Date.now();

function onUp(event) {
  var e = getGeneralEvent(event);

  if (e != null) {
    if (state == STATE.Drag) {
      //End Drag
      rotateCamera(e);
    } else {
      //Clicked

      if (Date.now() - lastUp > 100 && !twoFingerRotating) {
        if (media.type == 'video') {
          if (video1.paused) {
            video1.play();
          } else {
            video1.pause();
          }
        } else if (media.type == 'image' && !isCardboard) {
          console.log('a1');
          $('.overlay:not(.hidden)').fadeIn();
          controlsVisible = true;
        }
      }
    }
    lastMove = Date.now();
    state = STATE.None;
    loop();

    // console.log(e.button);
    // if (e.button == null || e.button == 0) {
    //  e.stopPropagation();
    // }

  }

  if (twoFingerRotating && event.originalEvent != null && event.originalEvent.changedTouches != null &&
    event.originalEvent.changedTouches.length != 2) {
    twoFingerRotating = false;
  }


  lastUp = Date.now();
}


function onDown(event) {
  //go full screen if type is mobile.
  var e = getGeneralEvent(event);

  if (event.originalEvent != null && event.originalEvent.targetTouches != null && 
    event.originalEvent.targetTouches.length == 3) {
    if (!useCompass) {
      makeViewDefault();
    }
  }

  if (e != null) {

    mouse.startX = e.clientX;
    mouse.startY = e.clientY;
    mouse.startTheta = theta;
    mouse.startPhi = phi;

    state = STATE.Down;


    if (type == 'mobile') {
      var elem = document.getElementById("viewer");
      requestFullScreen(elem);
    }

    if (controlsVisible) {
      if (rotationOn) {
        rotationOn = false;
        updateRotationVisbility();
      }

      if (useCompass) {
        useCompass = false;
        isCardboard = false;
//        updateBottomLeftIcon();
      }
    }

    console.log('a3');
    $('.overlay:not(.hidden)').fadeIn();
    controlsVisible = true;
    // console.log(e.button);
    // if (e.button == null || e.button == 0) {
     // e.stopPropagation();
    // }
  }
  
}

function onMouseWheel(e) {

}

function requestFullScreen(element)
{
    if (element.requestFullScreen)
        element.requestFullscreen();
    else if (element.msRequestFullscreen)
        element.msRequestFullscreen();
    else if (element.mozRequestFullScreen)
        element.mozRequestFullScreen();
    else if (element.webkitRequestFullscreen)
        element.webkitRequestFullscreen();
}

function resize(event) {
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

window.addEventListener( 'resize', resize, false );

document.addEventListener( 'contextmenu', function ( event ) { event.preventDefault(); }, false );

document.addEventListener( 'DOMMouseScroll', onMouseWheel, false ); // firefox


$('canvas').on('mousewheel', onMouseWheel);

$('canvas').on('mousedown touchstart', onDown);
$('canvas').on('mousemove touchmove', onMove);
$('canvas').on('mouseup touchend', onUp);

$('canvas').dblclick(function(e) {
  console.log('double!');
  requestFullScreen(e);
})