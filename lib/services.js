'use strict';

var nconf = require('nconf');
var child = require('child_process').exec;
var webremix = require('webremix');

nconf.argv().env().file({ file: 'local.json' });

var sockets = {};

nconf.get('outgoingServers').forEach(function (server) {
  sockets[server] = require('socket.io-client')(server);
});

var me = nconf.get('me');
var users = [];

exports.whoAmI = function () {
  return nconf.get('me');
};

exports.decrypt = function (request, reply) {
  setTimeout(function () {
    var data = request.payload.data;

    if (data.text.trim().length === 0) {
      console.log('message empty, ignore');
      return;
    }

    child('echo "' + data.text + '" | gpg --decrypt', function (err, stdout, stderr) {
      if (!err) {
        webremix.generate(stdout, function (err, fmsg) {
          data.html = fmsg;

          reply({
            data: data
          });
        });
      } else {
        reply({
          error: 'could not decrypt'
        }).code(400);
      }
    });
  }, 1000);
};

exports.addMessage = function (request, reply) {
  var message = request.payload.message;

  if (message.trim().length === 0) {
    console.log('message empty, ignore');
    return;
  }

  var sender = me;
  var receiver = request.payload.receiver;

  var sendMessage = function (messageObj) {
    for (var socket in sockets) {
      sockets[socket].emit('message', messageObj);
    }
  };

  var messageObj = {
    text: message,
    receiver: receiver,
    receiverAvatar: request.payload.receiverAvatar,
    sender: me,
    senderAvatar: request.payload.senderAvatar,
    public: !!request.payload.public,
    created: Math.floor(Date.now() / 1000)
  };

  if (!messageObj.public) {
    child('keybase encrypt ' + receiver + ' -m "' +
      message + '"', function (err, stdout, stderr) {
      messageObj.text = stdout;
      sendMessage(messageObj);
    });
  } else {
    sendMessage(messageObj);
  }

  reply({
     data: messageObj
  });
};

exports.getUsers = function (request, reply) {
  if (!users.length) {
    child('keybase list-tracking', function (err, stdout, stderr) {
      if (stdout) {
        users = stdout.toString().split('\n');

        for (var i = 0; i < users.length; i ++) {
          // get rid of empty ones from untracked accounts
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