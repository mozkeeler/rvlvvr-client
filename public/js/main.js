var $ = require('jquery');
var io = require('socket.io-client');
var moment = require('moment');
var r = require('./render');

var body = $('body');
var me = body.data('me');
var usersEl = $('#users');
var messagesEl = $('#messages');
var receiver = $('#receiver');
var search = $('#search');
var loading = $('.loading');
var info = $('.info');
var newMsg = $('#new');
var feed = $('#feed');
var subheader = $('.subheader');
var users = [];
var avatars = {};
var currentReceiver = '';

var socket = io(body.data('server'));

var sortItems = function (a, b) {
  return ($(b).data('created')) < ($(a).data('created')) ? 1 : -1;
}

var addAvatar = function (user, p, span) {
  $.getJSON('https://keybase.io/_/api/1.0/user/lookup.json?usernames=' +
    user + '&fields=pictures', function (data) {
    var avatar = '/images/avatar.jpg';

    if (data.them[0].pictures) {
      avatar = data.them[0].pictures.primary.url;
    }

    avatars[user] = avatar;
    var img = $('<img></img>');
    img.attr('src', avatar);
    p.append(img).append(span);
  });
};

$.getJSON('/users', function (data) {
  data.users.sort();
  loading.remove();
  users = data.users;
  users.unshift(me);
  users.forEach(function (user) {
    var p = $('<p></p>');
    var span = $('<span></span>');
    p.attr('data-user', user);
    span.text(user);
    addAvatar(user, p, span);
    usersEl.append(p);
  });
});

usersEl.on('click', 'p', function (ev) {
  var self = $(this);
  var user = $(this).data('user');
  var keyName = [me, user].sort().join('-');
  receiver.val(user);
  currentReceiver = user;
  socket.emit('join', keyName);
  socket.emit('dual', keyName);
  info.fadeOut(function () {
    $('#receiver-avatar').val(avatars[user]);
    self.siblings().removeClass('selected');
    self.addClass('selected');
    messagesEl.find('h1').text(user);
    newMsg.show();
    subheader.show();
  });
});

search.on('keyup', function (ev) {
  ev.preventDefault();
  var currKeys = $(this).val().toLowerCase();

  users.forEach(function (user) {
    if (user.indexOf(currKeys) === -1) {
      usersEl.find('p[data-user="' + user + '"]').hide();
    } else {
      usersEl.find('p[data-user="' + user + '"]').show();
    }
  });
});

newMsg.on('submit', function (ev) {
  ev.preventDefault();
  var keyName = [me, currentReceiver].sort().join('-');
  $('.empty').remove();
  $('#sender-avatar').val(avatars[me]);
  console.log('posting message');
  $.post('/message', $(this).serialize(), function (d) {
    console.log('posted message ', d);
    newMsg.find('textarea').val('');
    socket.emit('dual', keyName);
  });
});

socket.on('message', function (data) {
  if (feed.find('li[data-created="' + data.created + '"]').length === 0) {
    console.log('listening to incoming data ', data)
    if (data.public) {
      r.render(data);
    } else {
      $.post('/decrypt', { data: data }, function (d) {
      }).done(function (d) {
        r.render(d.data);
      }).fail(function () {
        console.log('Could not decrypt', data.created);
      });
    }
  }
});