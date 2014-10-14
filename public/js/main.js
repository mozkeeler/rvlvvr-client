$(function () {
  var socket = io();

  var body = $('body');
  var me = body.data('me');
  var usersEl = $('#users');
  var messagesEl = $('#messages');
  var search = $('#search');
  var users = [];
  var avatars = [];

  var addAvatar = function (user, p, span) {
    $.getJSON('https://keybase.io/_/api/1.0/user/lookup.json?usernames=' +
      user + '&fields=pictures', function (data) {
      var avatar = data.them[0].pictures.primary.url;
      avatars.push(avatar);
      var img = $('<img></img>');
      img.attr('src', avatar);
      p.append(img).append(span);
    });
  };

  socket.on('connect', function () {
    console.log('connecting');
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
  });

  usersEl.on('click', 'p', function (ev) {
    var user = $(this).data('user');
    socket.emit('join', user);
    messagesEl.find('h1').text(user);
  });

  usersEl.on('keyup', '#search', function (ev) {
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
});