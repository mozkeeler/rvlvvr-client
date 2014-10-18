'use strict';

var nconf = require('nconf');
var child = require('child_process').exec;
var Publico = require('meatspace-publico');
var webremix = require('webremix');

nconf.argv().env().file({ file: 'local.json' });

var socket = require('socket.io-client')(nconf.get('outgoingServer'));
var me = nconf.get('me');
var users = [];
var dual = {};

var setDatabase = function (keyName) {
  if (!dual[keyName]) {
    dual[keyName] = new Publico('none', {
      db: './db/db-' + keyName,
      limit: 25
    });
  }
};

exports.remix = function (request, reply) {
  webremix.generate(request.payload.content, function (err, result) {
    if (err) {
      reply({
        text: request.payload.content
      });
      return;
    }

    reply({
      text: result,
      created: request.payload.created
    });
  });
};

exports.recent = function (request, reply) {
  var keyName = [me, request.params.user].sort().join('-');

  setDatabase(keyName);

  dual[keyName].getChats(false, function (err, c) {
    if (err) {
      console.log(err);
      return;
    }

    reply({
      messages: c.chats
    });
  });
};

exports.whoAmI = function () {
  return nconf.get('me');
};

exports.decrypt = function (request, reply) {
  var data = request.payload.data;
  var keyName = [data.receiver, data.sender].sort().join('-');
  console.log(keyName)
  setDatabase(keyName);

  child('keybase decrypt -m "' + data.text + '"', function (err, stdout, stderr) {
    if (stdout) {
      data.text = stdout;
      data.public = true;
      dual[keyName].addChat(data, {
        ttl: 3600000 // 1 hour
      }, function (err) {
        if (err) {
          console.error('Could not save message to database');
        }

        console.log('saved incoming message to db ', keyName);
      });

      socket.emit('message', data);
    }
  });
};

exports.addMessage = function (request, reply) {
  var message = request.payload.message;
  var sender = me;
  var receiver = request.payload.receiver;

  var keyName = [sender, receiver].sort().join('-');

  setDatabase(keyName);

  var sendMessage = function (messageObj) {
    socket.emit('message', messageObj);
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

  dual[keyName].addChat(messageObj, {
    ttl: 3600000 // 1 hour
  }, function (err) {
    if (err) {
      console.error('Could not save message to database');
    }

    console.log('saved message to db');
  });

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