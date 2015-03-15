var makeViewDefault = function() {
  var del = new THREE.Quaternion();
  var next = new THREE.Quaternion();
  
  next.multiplyQuaternions(del.multiplyQuaternions(initCameraQuat, getInverse(camera.quaternion)), sphere.quaternion);
  sphere.rotation.setFromQuaternion(next);


  // $.post(window.location.href, {
  //   x: next.x,
  //   y: next.y,
  //   z: next.z,
  //   w: next.w,
  // });

  phi = 0;
  theta = 0;
  roll = 0;

  loop();
  initCameraQuat = camera.quaternion.clone();
}

$(window).bind('keypress', function(e) {

  var code = (e.keyCode ? e.keyCode : e.which);
  if(code == 97) {
    roll += 0.02;
    loop();
  } else if (code == 100) {
    roll -= 0.02;
    loop();
  } else if (code == 115) {
    roll = 0;
    loop();
  } else if (code == 114) {
    makeViewDefault();
  } else if (code == 61) {
    distance += 20;
    loop();
    // camera.fov += 1;
  } else if (code == 45) {
    distance -= 20;
    loop();
    // camera.fov -= 1;
  } else if (code == 32) { //spacebar
    if (media.type == 'video') {
      if (video1.paused) {
        video1.play();
      } else {
        video1.pause();
      }
    }
  } else {
    console.log(code);
  }

  isZooming = (code == 45 || code == 61);
  
  camera.updateProjectionMatrix();
});