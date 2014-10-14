'use strict';

var Hapi = require('hapi');
var nconf = require('nconf');
var SocketIO = require('socket.io');

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
  }
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

server.start(function () {
  var io = SocketIO.listen(server.listener);

  io.on('connection', function (socket) {
    socket.on('join', function (user) {
      console.log(me + '!' + user)
      socket.join(me + '!' + user);
      //services.recent(socket, format);
    });

    socket.on('message', function (data) {
      data = JSON.parse(data);

      var payload = {
        text: data.message,
        public: data.public || false
      };

      services.addMessage(payload, io, function (err, chat) {
        if (err) {
          console.log('error ', err);
        } else {
          console.log('added')
          //io.emit('message', chat);
        }
      });
    });
  });
});

function home(request, reply) {
  reply.view('index', {
    me: nconf.get('me')
  });
}
