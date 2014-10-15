'use strict';

var nconf = require('nconf');
var child = require('child_process').exec;
var LevelDualMessage = require('level-dual-message');

nconf.argv().env().file({ file: 'local.json' });

var socket = require('socket.io-client')(nconf.get('outgoingServer'));
var me = nconf.get('me');
var users = [];

var dual = new LevelDualMessage(me, {
  db: './db/messages'
});

exports.recent = function (request, reply) {
  dual.getRecent(request.params.user, !!request.params.isPublic, false, function (err, m) {
    if (err) {
      console.error('Could not get recent ', err);
      return;
    }

    reply({
      messages: m.messages
    });
  });
};

exports.whoAmI = function () {
  return nconf.get('me');
};

exports.decrypt = function (request, reply) {
  var data = request.payload.data;

  child('keybase decrypt -m "' + data.text + '"', function (err, stdout, stderr) {
    if (stdout) {
      data.text = stdout;
    }

    if (!err && !stderr) {
      reply({
        data: data
      });
    }
  });
};

exports.addMessage = function (request, reply) {
  var message = request.payload.message;
  var sender = me;
  var receiver = request.payload.receiver;

  var sendMessage = function (msg) {
    socket.emit('message', msg);
  };

  var messageObj = {
    text: message,
    receiver: request.payload.receiver,
    receiverAvatar: request.payload.receiverAvatar,
    sender: me,
    senderAvatar: request.payload.senderAvatar,
    public: !!request.payload.public
  };

  dual.add(receiver, messageObj, messageObj.public, function (err) {
    if (err) {
      console.error('Could not save message to database');
    }
    console.log('saved message to db')
  });

  if (!request.payload.public) {
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