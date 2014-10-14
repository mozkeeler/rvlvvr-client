'use strict';

var nconf = require('nconf');
var child = require('child_process').exec;

nconf.argv().env().file({ file: '../local.json' });

var me = nconf.get('me');

exports.recent = function (socket) {

};

exports.whoAmI = function () {
  return nconf.get('me');
};

exports.addMessage = function (payload, io, next) {
  console.log(payload.message, payload.receiver)
};

exports.getUsers = function (request, reply) {

  child('keybase list-tracking', function (err, stdout, stderr) {
    var users = [];

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
};