
var pc_config = webrtcDetectedBrowser === 'firefox' ?
  {'iceServers':[{'url':'stun:23.21.150.121'}]} : // number IP
  {'iceServers': [{'url': 'stun:stun.l.google.com:19302'}]};

var pc_constraints = {
  'optional': [
    {'DtlsSrtpKeyAgreement': true},
    {'RtpDataChannels': true}
  ]};

// Set up audio and video regardless of what devices are present.
var sdpConstraints = {'mandatory': {
  'OfferToReceiveAudio':true,
  'OfferToReceiveVideo':true }};


if (location.hostname != "localhost") {
  requestTurn('https://computeengineondemand.appspot.com/turn?username=41784574&key=4080218913');
}

function requestTurn(turn_url) {
  var turnExists = false;
  for (var i in pc_config.iceServers) {
    if (pc_config.iceServers[i].url.substr(0, 5) === 'turn:') {
      turnExists = true;
      turnReady = true;
      break;
    }
  }
  if (!turnExists) {
    console.log('Getting TURN server from ', turn_url);
    // No TURN server. Get one from computeengineondemand.appspot.com:
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function(){
      if (xhr.readyState === 4 && xhr.status === 200) {
        var turnServer = JSON.parse(xhr.responseText);
      	console.log('Got TURN server: ', turnServer);
        pc_config.iceServers.push({
          'url': 'turn:' + turnServer.username + '@' + turnServer.turn,
          'credential': turnServer.password
        });
        turnReady = true;
      }
    };
    xhr.open('GET', turn_url, true);
    xhr.send();
  }
}

// function hangup() {
//   console.log('Hanging up.');
//    pc.close();
//    //stop();
//   sendMessage('bye');
// }

// function handleRemoteHangup() {
//   console.log('Session terminated.');
//   stop();
// //  isInitiator = false;
// }

// function stop() {
//   isStarted = false;
//   // isAudioMuted = false;
//   // isVideoMuted = false;
//   pc.close();
//   pc = null;
// }

///////////////////////////////////////////

// Set Opus as the default audio codec if it's present.
function preferOpus(sdp) {
  var sdpLines = sdp.split('\r\n');
  var mLineIndex;
  // Search for m line.
  for (var i = 0; i < sdpLines.length; i++) {
      if (sdpLines[i].search('m=audio') !== -1) {
        mLineIndex = i;
        break;
      }
  }
  if (mLineIndex == null) {
    return sdp;
  }

  // If Opus is available, set it as the default in m line.
  for (i = 0; i < sdpLines.length; i++) {
    if (sdpLines[i].search('opus/48000') !== -1) {
      var opusPayload = extractSdp(sdpLines[i], /:(\d+) opus\/48000/i);
      if (opusPayload) {
        sdpLines[mLineIndex] = setDefaultCodec(sdpLines[mLineIndex], opusPayload);
      }
      break;
    }
  }

  // Remove CN in m line and sdp.
  sdpLines = removeCN(sdpLines, mLineIndex);

  sdp = sdpLines.join('\r\n');
  return sdp;
}

function extractSdp(sdpLine, pattern) {
  var result = sdpLine.match(pattern);
  return result && result.length === 2 ? result[1] : null;
}

// Set the selected codec to the first in m line.
function setDefaultCodec(mLine, payload) {
  var elements = mLine.split(' ');
  var newLine = [];
  var index = 0;
  for (var i = 0; i < elements.length; i++) {
    if (index === 3) { // Format of media starts from the fourth.
      newLine[index++] = payload; // Put target payload to the first.
    }
    if (elements[i] !== payload) {
      newLine[index++] = elements[i];
    }
  }
  return newLine.join(' ');
}

// Strip CN from sdp before CN constraints is ready.
function removeCN(sdpLines, mLineIndex) {
  var mLineElements = sdpLines[mLineIndex].split(' ');
  // Scan from end for the convenience of removing an item.
  for (var i = sdpLines.length-1; i >= 0; i--) {
    var payload = extractSdp(sdpLines[i], /a=rtpmap:(\d+) CN\/\d+/i);
    if (payload) {
      var cnPos = mLineElements.indexOf(payload);
      if (cnPos !== -1) {
        // Remove CN payload from m line.
        mLineElements.splice(cnPos, 1);
      }
      // Remove CN line in sdp
      sdpLines.splice(i, 1);
    }
  }

  sdpLines[mLineIndex] = mLineElements.join(' ');
  return sdpLines;
}
////////////////

function getConstraints() {
	var constraints = {'optional': [], 'mandatory': {'MozDontOfferDataChannel': true}};
	// temporary measure to remove Moz* constraints in Chrome
	if (webrtcDetectedBrowser === 'chrome') {
		for (var prop in constraints.mandatory) {
			if (prop.indexOf('Moz') !== -1) {
				delete constraints.mandatory[prop];
			}
		}
	}
	var merged = constraints;
	for (var name in sdpConstraints.mandatory) {
		merged.mandatory[name] = sdpConstraints.mandatory[name];
	}
	merged.optional.concat(sdpConstraints.optional);
	return merged;
}


function setLocalAndSendMessage(socket, pc, to, label) {
	return function(sessionDescription) {
		// Set Opus as the preferred codec in SDP if Opus is present.
		console.log(sessionDescription);
		sessionDescription.sdp = preferOpus(sessionDescription.sdp);
		console.log('Set Local Description');
		pc.setLocalDescription(sessionDescription); //this may be where the problems start
		console.log('sending description');
		sendMessageTo(socket, sessionDescription, to, label);
	}
}

function sendMessageTo(socket, message, to, label) {
	socket.emit('message', {
		to: to,
		label: label,
		message: message
	});
}

function handleIceCandidate(socket, to) {
	return function(event) {
//		debugger;
		console.log('handleIceCandidate');
		if (event.candidate) {
			var message = {
			  type: 'candidate',
			  label: event.candidate.sdpMLineIndex,
			  id: event.candidate.sdpMid,
			  candidate: event.candidate.candidate
			};

			sendMessageTo(socket, message, to, 'candidate');
		} else {
			console.log('End of candidates.');
		}
	}
}


var RTC = function(socket, roomState, self) {

	this.onAudioUpdateCallback = function() {};
	this.onScreenUpdateCallback = function() {};

	var handleRemoteStreamAdded = function(username, type) {
		return function(event) {
			console.log('Remote stream added.', event);

			//need to figure out from event.stream whether it is audio or screen video
			if (self.type == 'viewer') {
				//Receive screen video
				roomState[username][type].screenStream = event.stream;
				var screen = document.createElement('video');
				screen.src = URL.createObjectURL(event.stream);
				roomState[username][type].screen = screen;
				rtc.onScreenUpdateCallback(username, type);
			} else if (self.type == 'controls') {
				//Receive audio
				roomState[username][type].audioStream = event.stream;
				var audio = document.createElement('audio');
				audio.src = URL.createObjectURL(event.stream);
				roomState[username][type].audio = audio;
				rtc.onAudioUpdateCallback(username, type);
			}

			remoteStream = event.stream;
		}
	}

	var handleRemoteStreamRemoved = function(username, type) {
		return function(event) {
			console.log('Remote stream removed.', event);

			//need to figure out from event.stream whether it is audio or screen video
			var type = 'screen';
			if (type == 'screen') {
				rtc.onScreenUpdateCallback(username, type);
				roomState[username][type].screen = null;
				roomState[username][type].screenStream = null;
			} else if (type == 'audio') {
				roomState[username][type].audioStream = event.stream;
				var audio = document.createElement('audio');
				audio.src = URL.createObjectURL(event.stream);
				roomState[username][type].audio = audio;
				rtc.onAudioUpdateCallback(username, type);
			}

			remoteStream = event.stream;
		}
	}

	socket.on('message', function (data) {
		var message = data.message;
		console.log('Received message', data.label);

		if (data.message != null && data.label != null && data.fromUser != null && data.fromType != null) {
			var from = roomState[data.fromUser];
			var pc = from[data.fromType].pc;

			if (data.label === 'offer' && pc == null) {

				//make pc;
//				debugger;
				try {
					pc = new RTCPeerConnection(null);//pc_config, pc_constraints);
					from[data.fromType].pc = pc;

					pc.onicecandidate = handleIceCandidate(socket, data.from);

					console.log('Created RTCPeerConnnection with:\n' +
					  '  config: \'' + JSON.stringify(pc_config) + '\';\n' +
					  '  constraints: \'' + JSON.stringify(pc_constraints) + '\'.');
				} catch (e) {
					console.log('Failed to create PeerConnection, exception: ' + e.message);
					return;
				}

				pc.onaddstream = handleRemoteStreamAdded(data.fromUser, data.fromType);
				pc.onremovestream = handleRemoteStreamRemoved(data.fromUser, data.fromType);

				//add any local streams
				if (self.type == 'controls') {
					if (data.fromType == 'controls' && audioStream != null) {
						//if(self.username == 'GavinOvsak')  {
							console.log('Adding audio stream 1');
							pc.addStream(audioStream);
						//}
					}
					if (data.fromType == 'viewer' && screenStream != null) {
						console.log('Adding screen stream');
						pc.addStream(screenStream);
					}
				}

				console.log('Set Remote Description - From Offer');
				pc.setRemoteDescription(new RTCSessionDescription(message));
				pc.createAnswer(setLocalAndSendMessage(socket, pc, data.from, 'answer'), null, sdpConstraints);

			} else if (data.label === 'answer' && pc != null) {

				console.log('Set Remote Description - From Answer');
				pc.setRemoteDescription(new RTCSessionDescription(message));

			} else if (data.label === 'candidate' && pc != null) {

				var candidate = new RTCIceCandidate({sdpMLineIndex: message.label,
				  candidate:message.candidate});
				pc.addIceCandidate(candidate);

			}
		}
	});

/**

Can't connect until all streams are ready.

Viewer can connect whenever to start receiving streams, but controls can't

When a viewer wants to connect to a control, control needs to go first. Viewers shouldn't connect to other viewers?

When controller joins, pair with everyone.
When viewer joins, don't pair with everyone.

**/

	this.connect = function(toUsername, toType, stream) {

		console.log('connect, make PC');
		//self.id, self.username, self.type

		if (roomState[toUsername][toType] != null) {
			try {
				pc = new RTCPeerConnection(null);//pc_config, pc_constraints);
			} catch (e) {
				console.log('Failed to create PeerConnection, exception: ' + e.message);
				return;
			}

			roomState[toUsername][toType].pc = pc;

			pc.onicecandidate = handleIceCandidate(socket, roomState[toUsername][toType].id);

			console.log('Created RTCPeerConnnection with:\n' +
			  '  config: \'' + JSON.stringify(pc_config) + '\';\n' +
			  '  constraints: \'' + JSON.stringify(pc_constraints) + '\'.');

			pc.onaddstream = handleRemoteStreamAdded(toUsername, toType);
			pc.onremovestream = handleRemoteStreamRemoved(toUsername, toType);

			if (stream != null){//} && self.username == 'GavinOvsak') {
				console.log('adding stream to ' + toType);
				pc.addStream(stream);
			}

			console.log('creating offer');
			pc.createOffer(setLocalAndSendMessage(socket, pc, roomState[toUsername][toType].id, 'offer'), function(event){
			  console.log('createOffer() error: ', e);
			});//, constraints);
		}
	}

	this.onAudioUpdate = function(callback) {
		if (callback != null) {
			this.onAudioUpdateCallback = callback;
		}
	}

	this.onScreenUpdate = function(callback) {
		if (callback != null) {
			this.onScreenUpdateCallback = callback;
		}
	}

}