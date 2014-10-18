var $ = require('jquery');
var io = require('socket.io-client');
var moment = require('moment');

var body = $('body');
var me = body.data('me');
var usersEl = $('#users');
var messagesEl = $('#messages');
var receiver = $('#receiver');
var search = $('#search');
var newMsg = $('#new');
var feed = $('.feed');
var subheader = $('.subheader');
var users = [];
var avatars = {};

var socket = io(body.data('server'));

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

var generateMessageItem = function (data) {
  if (feed.find('li[data-created="' + data.created + '"]').length === 0) {
    $.post('/remixed', { content: data.text, created: data.created }, function (result) {
      feed.find('li[data-created="' + result.created + '"] .para').html(result.text);
    });

    var li = $('<li data-created="' + data.created + '"><div class="avatars"></div></li>');
    var senderAvatar = $('<div><img src="' + data.senderAvatar + '"></img></div>');
    var div = $('<div class="para"></div>');

    if (data.created) {
      var timeEl = $('<time></time>');
      timeEl.text(moment.unix(data.created).fromNow());
      li.append(timeEl);
    }

    li.find('.avatars').append(senderAvatar);
    li.append(div);
    feed.prepend(li);
  }
};

var getRecent = function () {
  feed.empty();
  $.get('/recent/' + subheader.find('h1').text(), function (data) {
    if (data.messages.length > 0) {
      data.messages.forEach(function (msg) {
        generateMessageItem(msg.value.message);
      });
    }
  });
};

$.getJSON('/users', function (data) {
  data.users.sort();
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
  var user = $(this).data('user');
  var keyName = [me, user].sort().join('-');
  receiver.val(user);
  $('#receiver-avatar').val(avatars[user]);
  socket.emit('join', keyName);
  socket.emit('dual', keyName);
  $(this).siblings().removeClass('selected');
  $(this).addClass('selected');
  messagesEl.find('h1').text(user);
  newMsg.show();
  subheader.show();
  getRecent();
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
  $('#sender-avatar').val(avatars[me]);
  console.log('posting message');
  $.post('/message', $(this).serialize(), function (d) {
    console.log('posted message ', d);
    newMsg.find('textarea').val('');
    generateMessageItem(d.data);
  });
});

socket.on('message', function (data) {
 // console.log('listening to incoming data ', data)
  if (!!data.public) {
    generateMessageItem(data);
  } else {
    console.log('decrypting')
   // console.log(data);
    $.post('/decrypt', { data: data }, function (d) {
    }).done(function () {
      console.log('decrypted ', d)
      generateMessageItem(d.data);
    }).fail(function () {
      console.log('Could not decrypt');
    });
  }
});