'use strict';

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

var room = parse('room');
var username = parse('user');

var socket = io.connect();
var roomState = {};

var self = {
  username: username,
  type: 'controls'
};

$('#viewerInfo').text('Try out the viewer at https://localhost:2015/viewer.html?user=' + self.username + '&room=' + room);

var rtc;

var screenStream, audioStream, screen, audio;
var localVideo = document.createElement("video");

socket.on('log', function (array) {
  console.log.apply(console, array);
});

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

    if (self.type == 'controls' && data.type == 'viewer') {
      var user = roomState[data.username];
      console.log('connecting to viewer');
      rtc.connect(data.username, 'viewer', screenStream);
    }
  }
});
socket.on('peer-removed', function(data) {
  //data.username, data.type;
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
  if (data.username != null && data.key != null && data.value != null && roomState[data.username] != null) {
    if (roomState[data.username].state == null) {
      roomState[data.username].state = {};
    }

    roomState[data.username].state[data.key] = data.value;
  }
});
socket.on('enter-valid', function(data) {
  console.log(data);

  roomState = data;
  rtc = new RTC(socket, roomState, self);

  rtc.onAudioUpdate(function(username, type) {
    console.log('Received alert about audio update');

    if (roomState[username][type].audio != null) {
      var audioList = document.getElementById('audioList');
      roomState[username][type].audio.controls = true;
      roomState[username][type].audio.autoplay = true;
      audioList.appendChild(roomState[username][type].audio);
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
        rtc.connect(usernames[i], 'controls', audioStream);
      }

      if (user.viewer != null && user.viewer.id != null && !(self.username == usernames[i] && self.type == 'viewer')) {
        rtc.connect(usernames[i], 'viewer', screenStream);
      }
    }
  }

});

socket.on('enter-invalid', function() {
  //Close window
  alert('Username is currently being used elsewhere');
  window.close();
});

$('#exit').click(function() {
  window.close();
});

socket.on('message', function (data){
  console.log('got message', data);
  var message = data.message;
//  console.log('message received');
});

var audioSelect = document.querySelector("select#audioSource");

$(document).ready(function() {

  /** 
    Try to connect to websockets. If success, get screenshare and microphone. Else, alert and close window.
    **/

  if (room !== '') {
    console.log('Joining room', room);

    var handleUserMedia = function(stream) {
      audioStream = stream;
      audio = document.createElement('audio');
      audio.src = URL.createObjectURL(stream);

      console.log('got user media');

      getScreenId(function (error, sourceId, screen_constraints) {
        if (screen_constraints != null) {
          getUserMedia(screen_constraints, function (stream) {
              screenStream = stream;
              screen = document.createElement('video');
              screen.src = URL.createObjectURL(stream);
            
              socket.emit('enter', {
                username: self.username,
                type: self.type,
                room: room
              });
              
              localVideo.src = URL.createObjectURL(stream);
              //localVideo.play();
          }, function (error) {
              console.log('getUserMedia error: ', error);
          });
        }
      });
    }

    if (typeof MediaStreamTrack === 'undefined'){
      alert('This browser does not support MediaStreamTrack.\n\nTry Chrome Canary.');
    } else {
      MediaStreamTrack.getSources(function(sourceInfos) {
        for (var i = 0; i != sourceInfos.length; ++i) {
          var sourceInfo = sourceInfos[i];
          var option = document.createElement("option");
          option.value = sourceInfo.id;
          if (sourceInfo.kind === 'audio') {
            option.text = sourceInfo.label || 'microphone ' + (audioSelect.length + 1);
            audioSelect.appendChild(option);
          } else if (sourceInfo.kind === 'video') {
            //option.text = sourceInfo.label || 'camera ' + (videoSelect.length + 1);
            //videoSelect.appendChild(option);
          } else {
            console.log('Some other kind of source: ', sourceInfo);
          }
          if (audioSelect.length >= 3)
          {   
            audioSelect.selectedIndex = 2;
          }
        }

        var audioSource = audioSelect.value;
        //var videoSource = videoSelect.value;
        var constraints = {
          audio: {
            optional: [{sourceId: audioSource}]
          }
          /*,video: {
            optional: [{sourceId: videoSource}]
          }*/
        };
        getUserMedia(constraints, handleUserMedia, function(error){
          console.log('getUserMedia error: ', error);
        });
        console.log('Getting user media with constraints', constraints);
      });
    }
    
  }

});


///// pointer lock code


var havePointerLock = 'pointerLockElement' in document ||
    'mozPointerLockElement' in document ||
    'webkitPointerLockElement' in document;

var element = document.getElementById('portal');
var requestedElement = element;

element.requestPointerLock = element.requestPointerLock ||
                 element.mozRequestPointerLock ||
                 element.webkitRequestPointerLock;

document.exitPointerLock = document.exitPointerLock ||
               document.mozExitPointerLock ||
               document.webkitExitPointerLock;

var isLocked = false,
    cumulativeX = 0,
    cumulativeY = 0;

element.addEventListener('click', function() {
    if (!isLocked) {
        element.requestPointerLock();
        isLocked = true;
    } else {//if (Math.abs(cumulativeX) < 200 && Math.abs(cumulativeY) < 200) {
        document.exitPointerLock();
        isLocked = false;
        cumulativeX = 0;
        cumulativeY = 0;
    }
  }, false);


document.addEventListener('pointerlockchange', changeCallback, false);
document.addEventListener('mozpointerlockchange', changeCallback, false);
document.addEventListener('webkitpointerlockchange', changeCallback, false);

document.addEventListener('pointerlockerror', errorCallback, false);
document.addEventListener('mozpointerlockerror', errorCallback, false);
document.addEventListener('webkitpointerlockerror', errorCallback, false);

function moveCallback(e) {

    var movementX = e.movementX ||
        e.mozMovementX          ||
        e.webkitMovementX       ||
        0,
    movementY = e.movementY ||
        e.mozMovementY      ||
        e.webkitMovementY   ||
        0;

    cumulativeX += movementX;
    cumulativeY -= movementY;

    if (roomState[self.username].viewer != null) {
      socket.emit('message', {
        to: roomState[self.username].viewer.id,
        label: 'mouse',
        message: {
          movementX: movementX,
          movementY: movementY,
          cumulativeX: cumulativeX,
          cumulativeY: cumulativeY
        }
      });
    }

    //send mouse methods over websocket message to the viewer.
    console.log('move', [movementX, movementY], 'total', [cumulativeX, cumulativeY]);
}

function changeCallback(e) {
    console.log('change', e);

    if (document.pointerLockElement === requestedElement ||
      document.mozPointerLockElement === requestedElement ||
      document.webkitPointerLockElement === requestedElement) {
      // Pointer was just locked
      // Enable the mousemove listener
      document.addEventListener("mousemove", moveCallback, false);
    } else {
      // Pointer was just unlocked
      // Disable the mousemove listener
      if (roomState[self.username].viewer != null) {
        socket.emit('message', {
          to: roomState[self.username].viewer.id,
          label: 'mouseend'
        });
      }
      document.removeEventListener("mousemove", moveCallback, false);
      //this.unlockHook(this.element);
    }
}
function errorCallback(e) {
    console.log('error', e);
}

/////// Select change

function setState(key, value) {
  roomState[self.username].state[key] = value;
  socket.emit('self-update', {
    key: key,
    value: value
  });
}

function getState(key, value) {
  return roomState[self.username].state;
}

$('#background').change(function() {
  console.log('screen change', this.value);
  setState('background', this.value);

});

/////// Keyboard data

$(window).bind('keypress', function(e) {

  var code = (e.keyCode ? e.keyCode : e.which);

  var dist = 5;

  var state = getState();
  if (state.x == null || state.y == null || state.theta == null) {
    setState('x', 0);
    setState('y', 0);
    setState('theta', 0);
  }

  if(code == 97) {
    //A
    console.log('A');
    setState('theta', state.theta - 0.2);
  } else if (code == 119) {
    //W
    console.log('W');
    setState('x', state.x - dist * Math.cos(-state.theta));
    setState('y', state.y - dist * Math.sin(-state.theta));
  } else if (code == 115) {
    //S
    console.log('S');
    setState('x', state.x + dist * Math.cos(-state.theta));
    setState('y', state.y + dist * Math.sin(-state.theta));
  } else if (code == 100) {
    //D
    console.log('D');
    setState('theta', state.theta + 0.2);
  }
  
  console.log(code);
});



$(window).focus(function() {
   console.log('focus', arguments);
})

$(window).blur(function() {
   console.log('no focus', arguments);
});

// $(document).keydown(function() {
//   console.log('keydown', arguments);
// });
// $(document).keyup(function() {
//   console.log('keyup', arguments);
// });




