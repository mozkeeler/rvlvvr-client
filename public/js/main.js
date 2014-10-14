$(function () {
  var body = $('body');
  var me = body.data('me');
  var usersEl = $('#users');
  var messagesEl = $('#messages');
  var receiver = $('#receiver');
  var search = $('#search');
  var newMsg = $('#new');
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
    receiver.val(user);
    $.post('/join', { user: user });
    $(this).siblings().removeClass('selected');
    $(this).addClass('selected');
    messagesEl.find('h1').text(user);
    newMsg.show();
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

  newMsg.on('submit', function (ev) {
    ev.preventDefault();

    $.post('/message', $(this).serialize(), function () {
      console.log('posted message');
    });
  });
});