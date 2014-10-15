'use strict';

var Hapi = require('hapi');
var nconf = require('nconf');

var services = require('./lib/services');

nconf.argv().env().file({ file: 'local.json' });

var me = services.whoAmI();

var options = {
  views: {
    engines: {
      jade: require('jade')
    },
    isCached: process.env.node === 'production',
    path: __dirname + '/views',
    compileOptions: {
      pretty: true
    }
  },
  cors: true
};

var server = Hapi.createServer(nconf.get('domain'), nconf.get('port'), options);

var routes = [
  {
    method: 'GET',
    path: '/',
    config: {
      handler: home
    }
  },
  {
    method: 'GET',
    path: '/users',
    config: {
      handler: services.getUsers
    }
  },
  {
    method: 'POST',
    path: '/message',
    config: {
      handler: services.addMessage
    }
  },
  {
    method: 'POST',
    path: '/decrypt',
    config: {
      handler: services.decrypt
    }
  }
];

server.route(routes);

server.route({
  path: '/{path*}',
  method: "GET",
  config: {
    handler: {
      directory: {
        path: './public',
        listing: false,
        index: false
      }
    }
  }
});

server.start();

function home(request, reply) {
  reply.view('index', {
    me: nconf.get('me'),
    socketServer: nconf.get('outgoingServer')
  });
}
