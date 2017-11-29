'use strict';

var os = require('os');
var nodeStatic = require('node-static');
var http = require('http');
var socketIO = require('socket.io');

var fileServer = new(nodeStatic.Server)();
var app = http.createServer(function(req, res) {
  fileServer.serve(req, res);
}).listen(8080);


var listOfUsers = {};

var io = socketIO.listen(app);
io.sockets.on('connection', function(socket) {

    var params = socket.handshake.query;
    var sessionid = params.sessionid;
    //var socketMessageEvent = params.msgEvent || '';
    var userId = params.userid ;

    appendUser(socket);

  // convenience function to log server messages on the client
  function log() {
    var array = ['Message from server:'];
    array.push.apply(array, arguments);
    socket.emit('log', array);
  }



  //append  user
  function appendUser(socket) {

      var params = socket.handshake.query;
      var sessionId = params.sessionid;
      var userId = params.userid;

      listOfUsers[userId] = {
          socket: socket,
          userid:userId,
          sesionId:sessionId
      };

      socket.userid = userId;
  }



  socket.on('message', function(message) {
    log('Client said: ', message);
    // for a real app, would be room-only (not broadcast)
    socket.broadcast.emit('message', message);
  });

  socket.on('call', function(userId) {

      var userTo = listOfUsers[userId];

      var userFrom = listOfUsers[socket.userid];

      if (userTo == undefined) {
          socket.leaveAll()
          return;
      } else{
          socket.join(userId);
          userFrom.socket.emit('outgoing-call', userId, socket.id);
          userTo.socket.emit('incoming-call', userId, socket.id);
          userFrom.otherUserId = userId;
          userTo.otherUserId = socket.userid;
      }


     // var numClients = io.sockets.clients(userId).length;

     // log(numClients);



  //   if (numClients === 1) {
            // socket.join(room);
            // log('Client ID ' + socket.id + ' created room ' + room);
            // socket.emit('created', room, socket.id);
   //   } else if (numClients === 2) {
            // log('Client ID ' + socket.id + ' joined room ' + room);
            // // io.sockets.in(room).emit('join', room);
            // socket.join(room);
            // socket.emit('joined', room, socket.id);
            // io.sockets.in(room).emit('ready', room);
            // socket.broadcast.emit('ready', room);
   //   } else { // max two clients
           //socket.emit('full', room);
   //   }
  });

    socket.on('answer-call', function() {

        var userTo = listOfUsers[userId];
        var userFrom = listOfUsers[socket.userid];


        if (userTo == undefined) {
            socket.leaveAll()
            return;
        } else{
            socket.join(socket.userid)
            socket.emit('answer-call-phone', userId, socket.id);
            userTo.socket.emit('answer-call-phone', userId, socket.id);
        }
    });


    socket.on('hang-up', function(userId,roomId) {
        var userTo = listOfUsers[userId];
        var userFrom = listOfUsers[socket.userid];

        if (userTo == undefined) {
            socket.leaveAll()
            return;
        } else{

             if (userFrom === userTo){
                 userTo.socket.emit('hang-up-call', userId, socket.id);
                 userFrom = listOfUsers[userTo.otherUserId];
                 userFrom.socket.emit('hang-up-call', userId, socket.id);

             }else{
                socket.emit('hang-up-call', userId, socket.id);
                userTo.socket.emit('hang-up-call', userId, socket.id);
             }

        }
    });


    socket.on('get-users-ids', function() {
        var userids =[];
        var currentUser = listOfUsers[socket.userid];
        for (var user in listOfUsers)
            if(currentUser.userid !== user)
                userids.push(user)
        socket.emit('users-ids',userids);
    });

  socket.on('ipaddr', function() {
    var ifaces = os.networkInterfaces();
    for (var dev in ifaces) {
      ifaces[dev].forEach(function(details) {
        if (details.family === 'IPv4' && details.address !== '127.0.0.1') {
          socket.emit('ipaddr', details.address);
        }
      });
    }
  });

  socket.on('bye', function(){
    console.log('received bye');
  });

    socket.on('disconnect', function() {
        console.log('Got disconnect!');
        var disconectedUser = listOfUsers[socket.userid];
        delete listOfUsers[socket.userid];
    });

});
