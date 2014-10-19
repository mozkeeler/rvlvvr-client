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
  },
  {
    method: 'GET',
    path: '/recent/{user}',
    config: {
      handler: services.recent
    }
  },
  {
    method: 'POST',
    path: '/remixed',
    config: {
      handler: services.remix
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
        path: './dist',
        listing: false,
        index: false
      }
    }
  }
});

server.start(function () {
  if (nconf.get('me').indexOf('<') > -1) {
    throw new Error('Please change the `me` value in local.json to your keybase username (not the email)');
    return;
  }
});

function home(request, reply) {
  reply.view('index', {
    me: nconf.get('me'),
    socketServer: nconf.get('incomingServer')
  });
}
