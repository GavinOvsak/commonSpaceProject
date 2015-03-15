var fs = require('fs');
var options = {
  key: fs.readFileSync('server.key'),
  cert: fs.readFileSync('server.crt')
};

// var static = require('node-static');
// var file = new(static.Server)();
var https = require('https');
var http = require('http');

var express = require('express');

var app = express();

//var server = http.createServer(app);

// var io = socketio.listen(server);
// server.listen(2015);

// var app = require('express')();
var server = https.createServer(options, app);
// var server = require('http').createServer(app);
var io = require('socket.io')(server);
// io.set('log level', 1);
// io.on('connection', function(){ /* … */ });
server.listen(2015);

app.use(express.static(__dirname + '/'));
//app.use(express.static(__dirname));



// var io = require('socket.io').listen(server); 

// server.sockets.on('connection', function (client){ 
//     // new client is here!
//     client.send ( 'Now connected!' );

//     client.on('message', function () {

//     }) ;

//     client.on('disconnect', function () {

//     });

// });

//var io = require('socket.io')(https, { serveClient: false });

// var Server = require('socket.io');
// console.log(Server);
// var io = new Server();
// io.listen(server.listen(2015))

// var server = require('http').createServer();
// var io = require('socket.io').listen(server);
// server.listen(1337);`

console.log('Server running at https://localhost:2015');


var rooms = {};

io.sockets.on('connection', function (socket){

	console.log('connected with ' + socket.id);
	var room = '';
	var username = '';
	var type = '';

	var roleDetermined = false;

	function log() {
		console.log.apply(console, arguments);
		var array = [">>> "];
		for (var i = 0; i < arguments.length; i++) {
			array.push(arguments[i]);
		}
		socket.emit('log', array);
	}

	socket.on('message', function (data) {
		//log('test message log');
		if (roleDetermined && data.to != null) {
			log('Sending message: ', data.label);
			data.fromUser = username;
			data.fromType = type;
			data.from = socket.id;
			io.to(data.to).emit('message', data);
		}
	});

	socket.on('broadcast', function (message) {
		if (roleDetermined) {
			log('Got broadcast: ', message);
			io.sockets.in('r:' + room).emit('broadcast', message); // should be room only
		}
	});

	socket.on('disconnect', function() {
		log('disconnect');
		if (roleDetermined) {
			if (type == 'controls') {
				delete rooms[room][username];
			} else if (type == 'viewer') {
				delete rooms[room][username][type];
			}
			io.sockets.in('r:' + room).emit('peer-removed', {
				username: username,
				type: type
			});
		}
	});

	socket.on('self-update', function(data) {
		if (roleDetermined && data.key != null && data.value != null) {
			rooms[room][username].state[data.key] = data.value;

			io.sockets.in('r:' + room).emit('peer-updated', {
				username: username,
				key: data.key,
				value: data.value
			});
		}
	});

	socket.on('enter', function(data) {
		// log('got enter ' + socket.id);
		socket.emit('message', {message: 'test 2'});
		if (!roleDetermined && data.username != null && data.room != null && data.type != null) {
			room = data.room;
			username = data.username;
			type = data.type;

			if (rooms[room] == null) {
				rooms[room] = {};
			}

			if ((type == 'controls' && rooms[room][username] == null) || (type == 'viewer' && rooms[room][username] != null && rooms[room][username].controls != null)) {
				log('valid')
				//add to room
				socket.join('r:' + room);

				//add to roomstate or create
				if (rooms[room] == null) {
					rooms[room] = {};
				}

				if (rooms[room][username] == null) {
					rooms[room][username] = {
						state: {}
					};
				}

				rooms[room][username][type] = {
					id: socket.id
				};

				socket.emit('enter-valid', rooms[room]);

				io.sockets.in('r:' + room).emit('peer-added', {
					username: username,
					type: type, 
					state: rooms[room][username].state, 
					id: socket.id
				})

				roleDetermined = true;
			} else {
				log('invalid')
				socket.emit('enter-invalid');
			}
		}
	});

});

