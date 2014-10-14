'use strict';

var nconf = require('nconf');
var child = require('child_process').exec;

nconf.argv().env().file({ file: 'local.json' });

var socket = require('socket.io-client')(nconf.get('outgoingServer'));
var me = nconf.get('me');
var users = [];

exports.recent = function (socket) {

};

exports.whoAmI = function () {
  return nconf.get('me');
};

exports.join = function (request, reply) {
  socket.emit('join', me + '!' + request.payload.user);
};

exports.addMessage = function (request, reply) {
  console.log('encrypt message');

  var message = request.payload.message;

  var sendMessage = function (msg) {
    socket.emit('message', {
      text: msg,
      receiver: request.payload.receiver,
      sender: me,
      public: !!request.payload.public
    });
  };

  console.log('public status: ', request.payload.public, !!request.payload.public)
  if (!request.payload.public) {
    child('keybase encrypt ' + request.payload.receiver + ' -m "' +
      message + '"', function (err, stdout, stderr) {
      console.log('encrypted: ', stdout);
      sendMessage(stdout);
    });
  } else {
    sendMessage(message);
  }
  console.log('broadcast message');

};

exports.getUsers = function (request, reply) {
  if (!users.length) {
    child('keybase list-tracking', function (err, stdout, stderr) {
      if (stdout) {
        users = stdout.toString().split('\n');

        for (var i = 0; i < users.length; i ++) {
          if (!users[i]) {
            users.splice(i, 1);
          }
        }
      }

      reply({
        users: users
      });
    });
  } else {
    reply({
      users: users
    });
  }
};