'use strict';

var nconf = require('nconf');
var child = require('child_process').exec;
var spawn = require('child_process').spawn;
var webremix = require('webremix');
var Publico = require('meatspace-publico');

nconf.argv().env().file({ file: 'local.json' });

var sockets = {};
var dual = {};

var TTL = 1000 * 60 * 60; // 1 hour
var GPGMessageRegexp = /^-----BEGIN PGP MESSAGE-----[A-Za-z0-9\/\+\.=\s\(\):\-]*-----END PGP MESSAGE-----$/;
var newlineRegexp = /[\r\n]/g;

var isGPGMessage = function (message) {
  return message.replace(newlineRegexp, "").match(GPGMessageRegexp);
};

var setDatabase = function (keyName, next) {
  keyName = keyName.replace(/^w+/, '');

  if (keyName.length < 3) {
    next(new Error('invalid keyname, exiting'));
    return;
  }

  if (!dual[keyName]) {
    dual[keyName] = new Publico('none', {
      db: './db/db-' + keyName,
      limit: 25
    });
  }

  next(null, keyName);
};

nconf.get('outgoingServers').forEach(function (server) {
  sockets[server] = require('socket.io-client')(server);
});

var me = nconf.get('me');
var users = [];

exports.whoAmI = function () {
  return nconf.get('me');
};

exports.recent = function (user, socket) {
  var keyName = [me, user].sort().join('-');
  setDatabase(keyName, function (err, k) {
    if (!err) {
      dual[keyName].getChats(true, function (err, c) {
        if (err) {
          console.log(err);
          return;
        }

        c.chats.reverse();
        c.chats.forEach(function (chat) {
          socket.emit('local', chat.value.message);
        });
      });
    }
  });
};

exports.decrypt = function (request, reply) {
  var data = request.payload.data;

  if (data.text.trim().length === 0) {
    console.log('message empty, ignore');
    return;
  }

  if (data.sender !== me) {
    if (!isGPGMessage(data.text)) {
      console.log('Invalid pgp block');
      reply({
        error: 'invalid pgp block'
      }).code(400);
      return;
    }

    var proc = spawn('gpg', ['--use-agent', '--decrypt'], {stdin: 'pipe'});
    var stdout = '';

    proc.stdout.on('data', function (data) {
      stdout += data;
    });

    proc.on('close', function (exitCode) {
      if (exitCode === 0) {
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
    proc.stdin.write(data.text);
    proc.stdin.end();
  }
};

exports.addMessage = function (payload, localSocket) {
  payload = JSON.parse(payload);
  var message = payload.message;

  if (message.trim().length === 0) {
    console.log('message empty, ignore');
    return;
  }

  var sender = me;
  var receiver = payload.receiver;

  var saveMessage = function (messageObj, key, original) {
    var localObj = new Object(messageObj);

    webremix.generate(original || localObj.text, function (err, result) {
      if (!err) {
        if (messageObj.public) {
          messageObj.html = result;
        }

        for (var socket in sockets) {
          sockets[socket].emit('message', messageObj);
        }

        localObj.html = result;

        dual[key].addChat(localObj, {
          ttl: TTL
        }, function (err) {
          if (!err) {
            localSocket.emit('local', localObj);
          }
        });
      }
    });
  };

  var sendMessage = function (messageObj, original) {
    var keyName = [messageObj.sender, messageObj.receiver].sort().join('-');

    setDatabase(keyName, function (err, k) {
      if (err) {
        reply({
          error: 'invalid key name'
        }).status(400);
        return;
      }

      saveMessage(messageObj, keyName, original);
    });
  };

  var messageObj = {
    text: message,
    receiver: receiver,
    receiverAvatar: payload.receiverAvatar,
    sender: me,
    senderAvatar: payload.senderAvatar,
    public: payload.public,
    created: Math.floor(Date.now() / 1000),
    html: false
  };

  if (!messageObj.public) {
    var proc = spawn('keybase', ['encrypt', receiver, '-m', message]);
    var stdout = '';

    proc.stdout.on('data', function (data) {
      stdout += data;
    });

    proc.on('close', function (exitCode) {
      if (exitCode === 0) {
        messageObj.text = stdout;
        sendMessage(messageObj, message);
      }
    });
  } else {
    sendMessage(messageObj);
  }
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
