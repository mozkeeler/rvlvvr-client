$(function () {
  var socket = io();

  var body = $('body');
  var me = body.data('me');
  var usersEl = $('#users');
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
      users.forEach(function (user) {
        socket.emit('join', user);

        var p = $('<p></p>');
        var span = $('<span></span>');
        p.attr('data-user', user);
        span.text(user);
        addAvatar(user, p, span);
        usersEl.append(p);
      });
    });
  });
});